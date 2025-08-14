#!/bin/bash
# Auto-assign folder to new user

USER_ID=$1
PROJECT_ID=$2

# SSH connection details
SSH_HOST="service_r1w9ajv2l7ui@default-server-uu5nr7.sliplane.app"
SSH_PORT="22222"
SSH_KEY="/root/.ssh/id_rsa"
DB_PATH="/opt/n8n/database.sqlite"

# Get first available folder in project and assign to user
ssh -p $SSH_PORT -i $SSH_KEY $SSH_HOST << EOF
sqlite3 $DB_PATH "
-- Get available folder
SELECT folder_id FROM folder_assignments 
WHERE project_id = '$PROJECT_ID' AND is_assigned = 0 
LIMIT 1;

-- Assign folder to user
UPDATE folder_assignments 
SET user_id = '$USER_ID', 
    is_assigned = 1, 
    assigned_at = datetime('now') 
WHERE project_id = '$PROJECT_ID' 
  AND is_assigned = 0 
  AND folder_id = (
    SELECT folder_id FROM folder_assignments 
    WHERE project_id = '$PROJECT_ID' AND is_assigned = 0 
    LIMIT 1
  );

-- Return assigned folder
SELECT folder_id FROM folder_assignments 
WHERE user_id = '$USER_ID';
"
EOF
