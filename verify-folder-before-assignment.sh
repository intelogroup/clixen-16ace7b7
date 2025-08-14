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
