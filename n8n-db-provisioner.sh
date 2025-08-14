#!/bin/bash

# n8n Database Provisioner Script
# Following dev team's approach for true database-level user isolation
# Works with SQLite (default) or PostgreSQL

set -e  # Exit on error

# Configuration
N8N_DATA_PATH="/home/node/.n8n"
DB_FILE="$N8N_DATA_PATH/database.sqlite"
BACKUP_DIR="$N8N_DATA_PATH/backups"
TIMESTAMP=$(date +%F-%H%M%S)

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Function to check if we're in container or need SSH
check_access_method() {
    if [ -f "$DB_FILE" ]; then
        log_info "Direct database access available"
        ACCESS_METHOD="direct"
    else
        log_info "Using SSH access to Sliplane container"
        ACCESS_METHOD="ssh"
        SSH_CMD="ssh -p 22222 service_r1w9ajv2l7ui@default-server-uu5nr7.sliplane.app"
    fi
}

# Function to execute SQLite commands
exec_sqlite() {
    local sql_cmd="$1"
    if [ "$ACCESS_METHOD" = "direct" ]; then
        sqlite3 "$DB_FILE" "$sql_cmd"
    else
        $SSH_CMD "sqlite3 $DB_FILE '$sql_cmd'"
    fi
}

# Step 1: Backup database
backup_database() {
    log_info "Creating database backup..."
    
    if [ "$ACCESS_METHOD" = "direct" ]; then
        mkdir -p "$BACKUP_DIR"
        cp "$DB_FILE" "$BACKUP_DIR/database.sqlite.bak.$TIMESTAMP"
    else
        $SSH_CMD "mkdir -p $BACKUP_DIR && cp $DB_FILE $BACKUP_DIR/database.sqlite.bak.$TIMESTAMP"
    fi
    
    log_info "Backup created: database.sqlite.bak.$TIMESTAMP"
}

# Step 2: Inspect database schema
inspect_schema() {
    log_info "Inspecting database schema..."
    
    echo "=== All Tables ==="
    exec_sqlite ".tables"
    
    echo -e "\n=== Project/Folder/Workflow Tables ==="
    exec_sqlite "SELECT name, sql FROM sqlite_master WHERE type='table' AND (name LIKE '%project%' OR name LIKE '%folder%' OR name LIKE '%workflow%' OR name LIKE '%tag%');"
    
    echo -e "\n=== Workflow Entity Structure ==="
    exec_sqlite "PRAGMA table_info(workflow_entity);"
    
    echo -e "\n=== Project Entity Structure (if exists) ==="
    exec_sqlite "PRAGMA table_info(project_entity);" 2>/dev/null || echo "No project_entity table"
    
    echo -e "\n=== Tag Entity Structure (if exists) ==="
    exec_sqlite "PRAGMA table_info(tag_entity);" 2>/dev/null || echo "No tag_entity table"
}

# Step 3: Create user isolation structure
create_user_isolation() {
    local user_id="$1"
    local user_email="$2"
    
    log_info "Creating isolation structure for user: $user_id ($user_email)"
    
    # Check if project table exists
    local has_projects=$(exec_sqlite "SELECT count(*) FROM sqlite_master WHERE type='table' AND name='project_entity';")
    
    if [ "$has_projects" = "1" ]; then
        log_info "Creating project-based isolation..."
        
        # Create user project
        local project_id="clx_${user_id:0:8}_$(date +%s)"
        exec_sqlite "BEGIN TRANSACTION;
            INSERT INTO project_entity (id, name, type, createdAt, updatedAt)
            VALUES ('$project_id', 'clx_$user_id', 'personal', datetime('now'), datetime('now'));
            COMMIT;"
        
        log_info "Created project: $project_id"
        
        # Create folder if table exists
        local has_folders=$(exec_sqlite "SELECT count(*) FROM sqlite_master WHERE type='table' AND name='folder_entity';")
        if [ "$has_folders" = "1" ]; then
            local folder_id="clx_folder_${user_id:0:8}_$(date +%s)"
            exec_sqlite "BEGIN TRANSACTION;
                INSERT INTO folder_entity (id, projectId, name, createdAt, updatedAt)
                VALUES ('$folder_id', '$project_id', 'clx_${user_id}_default', datetime('now'), datetime('now'));
                COMMIT;"
            log_info "Created folder: $folder_id"
        fi
    else
        log_warn "No project table found, using tag-based isolation..."
    fi
    
    # Always create user tag for additional isolation
    local has_tags=$(exec_sqlite "SELECT count(*) FROM sqlite_master WHERE type='table' AND name='tag_entity';")
    
    if [ "$has_tags" = "1" ]; then
        log_info "Creating user tag..."
        
        # Create user tag if not exists
        exec_sqlite "BEGIN TRANSACTION;
            INSERT OR IGNORE INTO tag_entity (id, name, createdAt, updatedAt)
            VALUES (lower(hex(randomblob(16))), 'user:$user_id', datetime('now'), datetime('now'));
            COMMIT;"
        
        log_info "Created tag: user:$user_id"
    else
        log_warn "No tag table found, relying on naming convention only"
    fi
    
    # Store mapping in file (since we can't access Supabase from here)
    echo "{
        \"user_id\": \"$user_id\",
        \"user_email\": \"$user_email\",
        \"project_id\": \"${project_id:-none}\",
        \"folder_id\": \"${folder_id:-none}\",
        \"tag_name\": \"user:$user_id\",
        \"created_at\": \"$TIMESTAMP\"
    }" > "/tmp/user_mapping_$user_id.json"
    
    log_info "User mapping saved to /tmp/user_mapping_$user_id.json"
}

# Step 4: Assign workflow to user
assign_workflow_to_user() {
    local workflow_id="$1"
    local user_id="$2"
    
    log_info "Assigning workflow $workflow_id to user $user_id"
    
    # Get project ID for user
    local project_id=$(exec_sqlite "SELECT id FROM project_entity WHERE name='clx_$user_id' LIMIT 1;")
    
    if [ -n "$project_id" ]; then
        # Update workflow with project assignment
        exec_sqlite "UPDATE workflow_entity SET projectId='$project_id' WHERE id='$workflow_id';"
        log_info "Assigned workflow to project: $project_id"
    fi
    
    # Add user tag to workflow
    local tag_id=$(exec_sqlite "SELECT id FROM tag_entity WHERE name='user:$user_id' LIMIT 1;")
    
    if [ -n "$tag_id" ]; then
        # Check if workflows_tags table exists
        local has_workflow_tags=$(exec_sqlite "SELECT count(*) FROM sqlite_master WHERE type='table' AND name='workflows_tags';")
        
        if [ "$has_workflow_tags" = "1" ]; then
            exec_sqlite "INSERT OR IGNORE INTO workflows_tags (workflowId, tagId) VALUES ('$workflow_id', '$tag_id');"
            log_info "Added user tag to workflow"
        fi
    fi
}

# Step 5: Verify isolation
verify_isolation() {
    local user_id="$1"
    
    log_info "Verifying user isolation for: $user_id"
    
    echo -e "\n=== User Projects ==="
    exec_sqlite "SELECT id, name FROM project_entity WHERE name LIKE '%$user_id%';"
    
    echo -e "\n=== User Tags ==="
    exec_sqlite "SELECT id, name FROM tag_entity WHERE name='user:$user_id';"
    
    echo -e "\n=== User Workflows ==="
    exec_sqlite "SELECT w.id, w.name, w.projectId 
                 FROM workflow_entity w 
                 WHERE w.projectId IN (SELECT id FROM project_entity WHERE name LIKE '%$user_id%')
                 OR w.name LIKE '%USR-$user_id%';"
}

# Main execution
main() {
    local action="$1"
    local user_id="$2"
    local user_email="$3"
    
    if [ -z "$action" ]; then
        echo "Usage: $0 <action> [user_id] [user_email]"
        echo "Actions:"
        echo "  inspect              - Inspect database schema"
        echo "  create-user          - Create user isolation structure"
        echo "  assign-workflow      - Assign workflow to user"
        echo "  verify              - Verify user isolation"
        echo "  backup              - Create database backup"
        exit 1
    fi
    
    check_access_method
    
    case "$action" in
        inspect)
            inspect_schema
            ;;
        create-user)
            if [ -z "$user_id" ] || [ -z "$user_email" ]; then
                log_error "Usage: $0 create-user <user_id> <user_email>"
                exit 1
            fi
            backup_database
            create_user_isolation "$user_id" "$user_email"
            verify_isolation "$user_id"
            ;;
        assign-workflow)
            local workflow_id="$3"
            if [ -z "$user_id" ] || [ -z "$workflow_id" ]; then
                log_error "Usage: $0 assign-workflow <user_id> <workflow_id>"
                exit 1
            fi
            assign_workflow_to_user "$workflow_id" "$user_id"
            ;;
        verify)
            if [ -z "$user_id" ]; then
                log_error "Usage: $0 verify <user_id>"
                exit 1
            fi
            verify_isolation "$user_id"
            ;;
        backup)
            backup_database
            ;;
        *)
            log_error "Unknown action: $action"
            exit 1
            ;;
    esac
    
    log_info "Operation completed successfully!"
}

# Run main function
main "$@"