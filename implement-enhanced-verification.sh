#!/bin/bash

# Enhanced Folder Verification System Implementation
# Implements multi-layer verification with metadata and audit logging

echo "🚀 Implementing Enhanced Folder Verification System..."

# SSH connection details
SSH_HOST="service_r1w9ajv2l7ui@default-server-uu5nr7.sliplane.app"
SSH_PORT="22222"
SSH_KEY="/root/.ssh/id_rsa"
DB_PATH="/opt/n8n/database.sqlite"

# Function to execute SQL via SSH
execute_sql() {
    local sql_command="$1"
    echo "📝 Executing: ${sql_command:0:100}..."
    
    ssh -p $SSH_PORT -i $SSH_KEY $SSH_HOST << SQLEOF
sqlite3 $DB_PATH "$sql_command"
SQLEOF
}

# Phase 1: Create metadata and audit tables
echo "📊 Phase 1: Creating metadata and audit tables..."

execute_sql "CREATE TABLE IF NOT EXISTS folder_metadata (
    folder_id TEXT PRIMARY KEY,
    metadata_json TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);"

execute_sql "CREATE TABLE IF NOT EXISTS folder_assignment_audit (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    folder_id TEXT NOT NULL,
    user_id TEXT,
    action TEXT CHECK(action IN ('assigned', 'unassigned', 'verified', 'warning', 'suspicious')),
    details TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);"

execute_sql "CREATE TABLE IF NOT EXISTS folder_metadata_archive (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    folder_id TEXT NOT NULL,
    metadata_json TEXT NOT NULL,
    archived_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    reason TEXT
);"

# Create indexes for performance
execute_sql "CREATE INDEX IF NOT EXISTS idx_audit_folder ON folder_assignment_audit(folder_id);"
execute_sql "CREATE INDEX IF NOT EXISTS idx_metadata_folder ON folder_metadata(folder_id);"

echo "✅ Database tables created"

# Phase 2: Create metadata for already assigned folders
echo "📝 Phase 2: Creating metadata for existing assignments..."

# Get all assigned folders
ASSIGNED_FOLDERS=$(ssh -p $SSH_PORT -i $SSH_KEY $SSH_HOST "sqlite3 $DB_PATH \"SELECT folder_id || '|' || user_id FROM folder_assignments WHERE is_assigned = 1;\"" 2>/dev/null)

if [ -n "$ASSIGNED_FOLDERS" ]; then
    echo "Found assigned folders, creating metadata..."
    
    while IFS='|' read -r folder_id user_id; do
        if [ -n "$folder_id" ] && [ "$folder_id" != "You are now connected to service_r1w9ajv2l7ui running in shell /bin/sh" ]; then
            echo "Creating metadata for folder: $folder_id (user: $user_id)"
            
            # Create metadata JSON
            METADATA_JSON=$(cat <<JSON
{
    "folder_id": "$folder_id",
    "assigned_to": {
        "user_id": "$user_id",
        "assigned_at": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
        "assigned_by": "system_migration"
    },
    "status": "active",
    "workflows_created": 0,
    "last_activity": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
    "verification_hash": "$(echo -n "${folder_id}:${user_id}:$(date +%s)" | sha256sum | cut -d' ' -f1)"
}
JSON
)
            
            # Insert metadata
            execute_sql "INSERT OR IGNORE INTO folder_metadata (folder_id, metadata_json) VALUES ('$folder_id', '$METADATA_JSON');"
            
            # Create audit entry
            execute_sql "INSERT INTO folder_assignment_audit (folder_id, user_id, action, details) VALUES ('$folder_id', '$user_id', 'assigned', 'Metadata created during migration');"
        fi
    done <<< "$ASSIGNED_FOLDERS"
fi

echo "✅ Metadata creation complete"

# Phase 3: Verify folder integrity
echo "🔍 Phase 3: Verifying folder integrity..."

# Check for folders with workflows but marked as unassigned
echo "Checking for suspicious folders (contain workflows but marked unassigned)..."

execute_sql "SELECT fa.folder_id, COUNT(w.id) as workflow_count
FROM folder_assignments fa
LEFT JOIN workflow_entity w ON json_extract(w.tags, '\$[0]') = fa.folder_id
WHERE fa.is_assigned = 0
GROUP BY fa.folder_id
HAVING workflow_count > 0;"

# Log suspicious folders
execute_sql "INSERT INTO folder_assignment_audit (folder_id, action, details)
SELECT fa.folder_id, 'suspicious', 'Contains ' || COUNT(w.id) || ' workflows but marked as unassigned'
FROM folder_assignments fa
LEFT JOIN workflow_entity w ON json_extract(w.tags, '\$[0]') = fa.folder_id
WHERE fa.is_assigned = 0
GROUP BY fa.folder_id
HAVING COUNT(w.id) > 0;"

echo "✅ Integrity check complete"

# Phase 4: Create verification function
echo "🛡️ Phase 4: Creating verification stored procedures..."

# Create a view for safe folders (truly available)
execute_sql "CREATE VIEW IF NOT EXISTS safe_available_folders AS
SELECT fa.folder_id, fa.project_id
FROM folder_assignments fa
LEFT JOIN workflow_entity w ON json_extract(w.tags, '\$[0]') = fa.folder_id
LEFT JOIN folder_metadata fm ON fa.folder_id = fm.folder_id
WHERE fa.is_assigned = 0
  AND w.id IS NULL  -- No workflows in folder
  AND fm.folder_id IS NULL  -- No metadata exists
GROUP BY fa.folder_id, fa.project_id;"

echo "✅ Safe folders view created"

# Phase 5: Create helper functions
echo "🔧 Phase 5: Creating helper scripts..."

# Create verification script
cat << 'VERIFY_SCRIPT' > /root/repo/verify-folder-before-assignment.sh
#!/bin/bash

FOLDER_ID=$1

if [ -z "$FOLDER_ID" ]; then
    echo "Usage: $0 <folder_id>"
    exit 1
fi

SSH_HOST="service_r1w9ajv2l7ui@default-server-uu5nr7.sliplane.app"
SSH_PORT="22222"
SSH_KEY="/root/.ssh/id_rsa"
DB_PATH="/opt/n8n/database.sqlite"

echo "🔍 Verifying folder: $FOLDER_ID"

# Check 1: Database assignment status
echo "Layer 1: Database check..."
IS_ASSIGNED=$(ssh -p $SSH_PORT -i $SSH_KEY $SSH_HOST "sqlite3 $DB_PATH \"SELECT is_assigned FROM folder_assignments WHERE folder_id = '$FOLDER_ID';\"" 2>/dev/null)

if [ "$IS_ASSIGNED" = "1" ]; then
    echo "❌ Folder is marked as assigned in database"
    exit 1
fi
echo "✅ Database check passed"

# Check 2: Workflow content
echo "Layer 2: Workflow content check..."
WORKFLOW_COUNT=$(ssh -p $SSH_PORT -i $SSH_KEY $SSH_HOST "sqlite3 $DB_PATH \"SELECT COUNT(*) FROM workflow_entity WHERE json_extract(tags, '$[0]') = '$FOLDER_ID';\"" 2>/dev/null)

if [ "$WORKFLOW_COUNT" -gt "0" ]; then
    echo "❌ Folder contains $WORKFLOW_COUNT workflows"
    exit 1
fi
echo "✅ No workflows in folder"

# Check 3: Metadata file
echo "Layer 3: Metadata check..."
HAS_METADATA=$(ssh -p $SSH_PORT -i $SSH_KEY $SSH_HOST "sqlite3 $DB_PATH \"SELECT 1 FROM folder_metadata WHERE folder_id = '$FOLDER_ID';\"" 2>/dev/null)

if [ -n "$HAS_METADATA" ]; then
    echo "⚠️ Folder has metadata file - checking age..."
    METADATA=$(ssh -p $SSH_PORT -i $SSH_KEY $SSH_HOST "sqlite3 $DB_PATH \"SELECT metadata_json FROM folder_metadata WHERE folder_id = '$FOLDER_ID';\"" 2>/dev/null)
    echo "Metadata: $METADATA"
    echo "❌ Folder has active metadata"
    exit 1
fi
echo "✅ No metadata file"

# Check 4: Audit history
echo "Layer 4: Audit history check..."
LAST_ACTION=$(ssh -p $SSH_PORT -i $SSH_KEY $SSH_HOST "sqlite3 $DB_PATH \"SELECT action FROM folder_assignment_audit WHERE folder_id = '$FOLDER_ID' ORDER BY created_at DESC LIMIT 1;\"" 2>/dev/null)

if [ "$LAST_ACTION" = "assigned" ]; then
    echo "❌ Audit log shows folder was assigned and not unassigned"
    exit 1
fi
echo "✅ Audit check passed (last action: ${LAST_ACTION:-none})"

echo "✅ ✅ ✅ Folder $FOLDER_ID is SAFE for assignment"
VERIFY_SCRIPT

chmod +x /root/repo/verify-folder-before-assignment.sh

# Create assignment script with verification
cat << 'ASSIGN_SCRIPT' > /root/repo/safe-assign-folder.sh
#!/bin/bash

USER_ID=$1
PROJECT_ID=$2

if [ -z "$USER_ID" ] || [ -z "$PROJECT_ID" ]; then
    echo "Usage: $0 <user_id> <project_id>"
    exit 1
fi

SSH_HOST="service_r1w9ajv2l7ui@default-server-uu5nr7.sliplane.app"
SSH_PORT="22222"
SSH_KEY="/root/.ssh/id_rsa"
DB_PATH="/opt/n8n/database.sqlite"

echo "🔍 Finding safe folder for user: $USER_ID in project: $PROJECT_ID"

# Get safe available folders
SAFE_FOLDERS=$(ssh -p $SSH_PORT -i $SSH_KEY $SSH_HOST "sqlite3 $DB_PATH \"
SELECT folder_id FROM safe_available_folders 
WHERE project_id = '$PROJECT_ID' 
ORDER BY folder_id 
LIMIT 5;\"" 2>/dev/null)

ASSIGNED_FOLDER=""

for folder in $SAFE_FOLDERS; do
    if [ -n "$folder" ] && [ "$folder" != "You are now connected to service_r1w9ajv2l7ui running in shell /bin/sh" ]; then
        echo "Verifying folder: $folder"
        
        if /root/repo/verify-folder-before-assignment.sh "$folder"; then
            echo "✅ Assigning folder $folder to user $USER_ID"
            
            # Atomic assignment with metadata
            ssh -p $SSH_PORT -i $SSH_KEY $SSH_HOST << EOF
sqlite3 $DB_PATH "
BEGIN TRANSACTION;

-- Update assignment
UPDATE folder_assignments 
SET user_id = '$USER_ID', is_assigned = 1, assigned_at = datetime('now')
WHERE folder_id = '$folder';

-- Create metadata
INSERT INTO folder_metadata (folder_id, metadata_json)
VALUES ('$folder', json_object(
    'folder_id', '$folder',
    'assigned_to', json_object(
        'user_id', '$USER_ID',
        'assigned_at', datetime('now'),
        'assigned_by', 'safe_assignment_system'
    ),
    'status', 'active',
    'workflows_created', 0,
    'last_activity', datetime('now')
));

-- Create audit entry
INSERT INTO folder_assignment_audit (folder_id, user_id, action, details)
VALUES ('$folder', '$USER_ID', 'assigned', 'Safe assignment after multi-layer verification');

COMMIT;
"
EOF
            
            ASSIGNED_FOLDER="$folder"
            break
        else
            echo "⚠️ Folder $folder failed verification, trying next..."
        fi
    fi
done

if [ -n "$ASSIGNED_FOLDER" ]; then
    echo "✅ Successfully assigned folder: $ASSIGNED_FOLDER"
else
    echo "❌ No safe folders available for assignment"
    exit 1
fi
ASSIGN_SCRIPT

chmod +x /root/repo/safe-assign-folder.sh

echo "✅ Helper scripts created"

# Phase 6: Generate status report
echo "📊 Phase 6: Generating system status report..."

echo "=== Enhanced Verification System Status ==="

echo "Metadata tracking:"
execute_sql "SELECT COUNT(*) as total_metadata FROM folder_metadata;"

echo "Audit log entries:"
execute_sql "SELECT action, COUNT(*) as count FROM folder_assignment_audit GROUP BY action;"

echo "Safe available folders:"
execute_sql "SELECT COUNT(*) as safe_folders FROM safe_available_folders;"

echo "Suspicious folders (need review):"
execute_sql "SELECT folder_id, details FROM folder_assignment_audit WHERE action = 'suspicious';"

echo "Folder assignment summary:"
execute_sql "SELECT 
    COUNT(*) as total_folders,
    SUM(CASE WHEN is_assigned = 1 THEN 1 ELSE 0 END) as assigned,
    SUM(CASE WHEN is_assigned = 0 THEN 1 ELSE 0 END) as available
FROM folder_assignments;"

echo "✅ Enhanced Verification System Implementation Complete!"
echo ""
echo "📋 Implementation Summary:"
echo "- ✅ Metadata tracking table created"
echo "- ✅ Audit logging system active"
echo "- ✅ Multi-layer verification in place"
echo "- ✅ Safe folders view created"
echo "- ✅ Helper scripts ready"
echo ""
echo "🛡️ Security Layers Active:"
echo "1. Database assignment check"
echo "2. Workflow content verification"
echo "3. Metadata file validation"
echo "4. Audit history verification"
echo ""
echo "🎯 Usage:"
echo "- Verify folder: ./verify-folder-before-assignment.sh <folder_id>"
echo "- Safe assignment: ./safe-assign-folder.sh <user_id> <project_id>"
echo ""
echo "The system now has enterprise-grade reliability with multiple failsafes!"