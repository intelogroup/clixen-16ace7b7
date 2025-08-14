#!/bin/bash

# Test SSH connection and database access
echo "Testing SSH connection to n8n database..."

# Execute database query via SSH
ssh -p 22222 -i ~/.ssh/id_rsa service_r1w9ajv2l7ui@default-server-uu5nr7.sliplane.app << 'DBTEST'
echo "=== TESTING DATABASE ACCESS ==="

# Try common n8n database locations
DB_PATHS=(
    "/opt/n8n/database.sqlite"
    "/app/database.sqlite" 
    "/data/database.sqlite"
    "~/.n8n/database.sqlite"
    "/home/n8n/database.sqlite"
)

for db_path in "${DB_PATHS[@]}"; do
    if [ -f "$db_path" ]; then
        echo "✅ Found database at: $db_path"
        echo "Database size: $(ls -lh "$db_path" | awk '{print $5}')"
        
        # Test SQLite access
        echo "=== TESTING SQLITE ACCESS ==="
        sqlite3 "$db_path" "SELECT name FROM sqlite_master WHERE type='table';" 2>/dev/null || echo "SQLite access failed"
        break
    else
        echo "❌ No database at: $db_path"
    fi
done

echo "=== ENVIRONMENT CHECK ==="
which sqlite3 || echo "sqlite3 not found"
DBTEST