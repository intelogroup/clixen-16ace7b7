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
