#!/bin/bash

# Folder Assignment Reconciliation Script
# Detects and fixes inconsistencies in folder assignments

echo "🔍 Starting Folder Assignment Reconciliation..."

# SSH connection details
SSH_HOST="service_r1w9ajv2l7ui@default-server-uu5nr7.sliplane.app"
SSH_PORT="22222"
SSH_KEY="/root/.ssh/id_rsa"
DB_PATH="/opt/n8n/database.sqlite"

# Function to execute SQL via SSH
execute_sql() {
    local sql_command="$1"
    echo "📝 SQL: ${sql_command:0:100}..."
    
    ssh -p $SSH_PORT -i $SSH_KEY $SSH_HOST << SQLEOF
sqlite3 $DB_PATH "$sql_command"
SQLEOF
}

echo "=== PHASE 1: DETECTION ==="

# 1. Find folders with workflows but marked as unassigned
echo "🔍 Checking for folders with workflows but marked as unassigned..."

SUSPICIOUS_FOLDERS=$(ssh -p $SSH_PORT -i $SSH_KEY $SSH_HOST "sqlite3 $DB_PATH \"
SELECT fa.folder_id || '|' || COUNT(w.id) as data
FROM folder_assignments fa
JOIN workflow_entity w ON json_extract(w.tags, '$[0]') = fa.folder_id
WHERE fa.is_assigned = 0
GROUP BY fa.folder_id;\"" 2>/dev/null)

if [ -n "$SUSPICIOUS_FOLDERS" ] && [ "$SUSPICIOUS_FOLDERS" != "You are now connected to service_r1w9ajv2l7ui running in shell /bin/sh" ]; then
    echo "⚠️ Found suspicious folders:"
    echo "$SUSPICIOUS_FOLDERS"
    
    # Fix these folders
    while IFS='|' read -r folder_id workflow_count; do
        if [ -n "$folder_id" ] && [ "$folder_id" != "You are now connected to service_r1w9ajv2l7ui running in shell /bin/sh" ]; then
            echo "🔧 Fixing: $folder_id (contains $workflow_count workflows)"
            
            # Mark as assigned and create audit entry
            execute_sql "UPDATE folder_assignments SET is_assigned = 1, assigned_at = datetime('now') WHERE folder_id = '$folder_id';"
            
            execute_sql "INSERT INTO folder_assignment_audit (folder_id, action, details) VALUES ('$folder_id', 'warning', 'Auto-corrected: contains $workflow_count workflows but was marked unassigned');"
        fi
    done <<< "$SUSPICIOUS_FOLDERS"
else
    echo "✅ No suspicious folders found"
fi

# 2. Find folders with metadata but marked as unassigned
echo "🔍 Checking for metadata mismatches..."

METADATA_MISMATCH=$(ssh -p $SSH_PORT -i $SSH_KEY $SSH_HOST "sqlite3 $DB_PATH \"
SELECT fa.folder_id
FROM folder_assignments fa
JOIN folder_metadata fm ON fa.folder_id = fm.folder_id
WHERE fa.is_assigned = 0;\"" 2>/dev/null)

if [ -n "$METADATA_MISMATCH" ] && [ "$METADATA_MISMATCH" != "You are now connected to service_r1w9ajv2l7ui running in shell /bin/sh" ]; then
    echo "⚠️ Found folders with metadata but marked unassigned:"
    echo "$METADATA_MISMATCH"
    
    for folder_id in $METADATA_MISMATCH; do
        if [ -n "$folder_id" ] && [ "$folder_id" != "You are now connected to service_r1w9ajv2l7ui running in shell /bin/sh" ]; then
            echo "🔧 Fixing metadata mismatch for: $folder_id"
            
            # Get user from metadata
            USER_ID=$(ssh -p $SSH_PORT -i $SSH_KEY $SSH_HOST "sqlite3 $DB_PATH \"SELECT json_extract(metadata_json, '$.assigned_to.user_id') FROM folder_metadata WHERE folder_id = '$folder_id';\"" 2>/dev/null)
            
            if [ -n "$USER_ID" ]; then
                execute_sql "UPDATE folder_assignments SET is_assigned = 1, user_id = '$USER_ID' WHERE folder_id = '$folder_id';"
                
                execute_sql "INSERT INTO folder_assignment_audit (folder_id, user_id, action, details) VALUES ('$folder_id', '$USER_ID', 'warning', 'Auto-corrected: had metadata but was marked unassigned');"
            fi
        fi
    done
else
    echo "✅ No metadata mismatches found"
fi

# 3. Find orphaned workflows (not in any folder)
echo "🔍 Checking for orphaned workflows..."

execute_sql "SELECT id, name FROM workflow_entity WHERE (tags IS NULL OR tags = '[]') AND name LIKE '[USR-%';"

# 4. Find folders marked as assigned but empty
echo "🔍 Checking for empty assigned folders..."

EMPTY_ASSIGNED=$(ssh -p $SSH_PORT -i $SSH_KEY $SSH_HOST "sqlite3 $DB_PATH \"
SELECT fa.folder_id, fa.user_id
FROM folder_assignments fa
LEFT JOIN workflow_entity w ON json_extract(w.tags, '$[0]') = fa.folder_id
WHERE fa.is_assigned = 1
GROUP BY fa.folder_id, fa.user_id
HAVING COUNT(w.id) = 0;\"" 2>/dev/null)

if [ -n "$EMPTY_ASSIGNED" ] && [ "$EMPTY_ASSIGNED" != "You are now connected to service_r1w9ajv2l7ui running in shell /bin/sh" ]; then
    echo "⚠️ Found empty assigned folders (may be normal for new users):"
    echo "$EMPTY_ASSIGNED"
    
    # Just log these, don't auto-fix (user might be new)
    while IFS=' ' read -r folder_id user_id; do
        if [ -n "$folder_id" ] && [ "$folder_id" != "You" ]; then
            execute_sql "INSERT INTO folder_assignment_audit (folder_id, user_id, action, details) VALUES ('$folder_id', '$user_id', 'verified', 'Assigned but empty - likely new user');"
        fi
    done <<< "$EMPTY_ASSIGNED"
fi

echo "=== PHASE 2: VERIFICATION ==="

# Rebuild safe_available_folders view
echo "🔄 Rebuilding safe folders view..."

execute_sql "DROP VIEW IF EXISTS safe_available_folders;"

execute_sql "CREATE VIEW safe_available_folders AS
SELECT fa.folder_id, fa.project_id
FROM folder_assignments fa
LEFT JOIN workflow_entity w ON json_extract(w.tags, '\$[0]') = fa.folder_id
LEFT JOIN folder_metadata fm ON fa.folder_id = fm.folder_id
WHERE fa.is_assigned = 0
  AND w.id IS NULL
  AND fm.folder_id IS NULL
GROUP BY fa.folder_id, fa.project_id;"

echo "=== PHASE 3: REPORTING ==="

echo "📊 System Status After Reconciliation:"

echo "Total folders:"
execute_sql "SELECT COUNT(*) as total FROM folder_assignments;"

echo "Assigned folders:"
execute_sql "SELECT COUNT(*) as assigned FROM folder_assignments WHERE is_assigned = 1;"

echo "Safe available folders:"
execute_sql "SELECT COUNT(*) as safe_available FROM safe_available_folders;"

echo "Folders with metadata:"
execute_sql "SELECT COUNT(*) as with_metadata FROM folder_metadata;"

echo "Audit log summary:"
execute_sql "SELECT action, COUNT(*) as count FROM folder_assignment_audit WHERE date(created_at) = date('now') GROUP BY action;"

echo "Project distribution:"
execute_sql "SELECT 
    project_id,
    SUM(CASE WHEN is_assigned = 1 THEN 1 ELSE 0 END) as assigned,
    SUM(CASE WHEN is_assigned = 0 THEN 1 ELSE 0 END) as available
FROM folder_assignments
GROUP BY project_id
ORDER BY project_id;"

echo "✅ Reconciliation Complete!"
echo ""
echo "📋 Actions Taken:"
echo "- Fixed folders with workflows but marked unassigned"
echo "- Corrected metadata mismatches"
echo "- Logged empty assigned folders"
echo "- Rebuilt safe folders view"
echo ""
echo "🎯 Recommendations:"
echo "1. Review audit log for 'warning' entries"
echo "2. Investigate any orphaned workflows"
echo "3. Consider running this daily via cron"
echo "4. Monitor empty assigned folders for inactive users"