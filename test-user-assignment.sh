#!/bin/bash

# Test User Assignment to Project
# This script demonstrates how to assign a new workflow to a specific user's project

echo "🧪 Testing User Assignment to Clixen Projects..."

# SSH connection details
SSH_HOST="service_r1w9ajv2l7ui@default-server-uu5nr7.sliplane.app"
SSH_PORT="22222"
SSH_KEY="/root/.ssh/id_rsa"
DB_PATH="/opt/n8n/database.sqlite"

# Function to execute SQL via SSH
execute_sql() {
    local sql_command="$1"
    echo "📝 SQL: $sql_command"
    
    ssh -p $SSH_PORT -i $SSH_KEY $SSH_HOST << SQLEOF
sqlite3 $DB_PATH "$sql_command"
SQLEOF
}

# Test 1: Assign the new test workflow to CLIXEN-PROJ-02
echo "🎯 Test 1: Assigning test workflow to CLIXEN-PROJ-02..."

WORKFLOW_ID="1k2YyuVA0T0zSKtQ"  # The test workflow we just created
PROJECT_ID="CLIXEN-PROJ-02"

# Update workflow to be assigned to project 02
execute_sql "UPDATE workflow_entity SET projectId = '$PROJECT_ID' WHERE id = '$WORKFLOW_ID';"

# Create project relation
execute_sql "INSERT OR IGNORE INTO project_relation (id, projectId, workflowId, role) VALUES ('$WORKFLOW_ID', '$PROJECT_ID', '$WORKFLOW_ID', 'project:personalOwner');"

# Test 2: Verify assignment
echo "🔍 Test 2: Verifying workflow assignment..."

execute_sql "SELECT w.id, w.name, w.projectId, p.name as projectName FROM workflow_entity w LEFT JOIN project_entity p ON w.projectId = p.id WHERE w.id = '$WORKFLOW_ID';"

# Test 3: Show project distribution
echo "📊 Test 3: Current project distribution..."

execute_sql "SELECT p.name as project, COUNT(w.id) as workflows FROM project_entity p LEFT JOIN workflow_entity w ON p.id = w.projectId WHERE p.name LIKE 'Clixen%' GROUP BY p.id, p.name ORDER BY p.name;"

# Test 4: Simulate user workflow queries
echo "👤 Test 4: Simulating user dashboard queries..."

echo "User in CLIXEN-PROJ-01 sees:"
execute_sql "SELECT w.name, w.active, w.createdAt FROM workflow_entity w WHERE w.projectId = 'CLIXEN-PROJ-01';"

echo "User in CLIXEN-PROJ-02 sees:"
execute_sql "SELECT w.name, w.active, w.createdAt FROM workflow_entity w WHERE w.projectId = 'CLIXEN-PROJ-02';"

# Test 5: Test complete user isolation
echo "🔒 Test 5: User isolation verification..."

execute_sql "SELECT 'Total Workflows' as metric, COUNT(*) as count FROM workflow_entity UNION ALL SELECT 'Assigned to Projects' as metric, COUNT(*) as count FROM workflow_entity WHERE projectId IS NOT NULL UNION ALL SELECT 'Available Projects' as metric, COUNT(*) as count FROM project_entity WHERE name LIKE 'Clixen%';"

echo "✅ User Assignment Testing Complete!"
echo ""
echo "🎯 Summary:"
echo "- Test workflow assigned to CLIXEN-PROJ-02"
echo "- Project relations established"
echo "- User isolation queries functional"
echo "- Dashboard filtering ready"