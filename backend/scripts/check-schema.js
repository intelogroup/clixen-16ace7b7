import pg from 'pg';
const { Client } = pg;

const client = new Client({
  host: 'aws-0-us-east-2.pooler.supabase.com',
  port: 5432,
  database: 'postgres',
  user: 'postgres.zfbgdixbzezpxllkoyfc',
  password: 'Goldyear2023#',
  ssl: { rejectUnauthorized: false }
});

async function checkSchema() {
  try {
    await client.connect();
    console.log('Connected to database');
    
    // Check existing workflow-related tables
    const result = await client.query(`
      SELECT table_name, column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND (table_name LIKE '%workflow%' OR table_name LIKE '%chat%')
      ORDER BY table_name, ordinal_position
    `);
    
    console.log('Existing workflow and chat tables:');
    let currentTable = '';
    result.rows.forEach(row => {
      if (row.table_name !== currentTable) {
        console.log(`\n📋 ${row.table_name}:`);
        currentTable = row.table_name;
      }
      console.log(`  - ${row.column_name}: ${row.data_type} ${row.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'}`);
    });
    
    // Check foreign key constraints
    const fkResult = await client.query(`
      SELECT 
        tc.table_name, 
        kcu.column_name, 
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name 
      FROM 
        information_schema.table_constraints AS tc 
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY' 
      AND tc.table_schema='public'
      AND (tc.table_name LIKE '%workflow%' OR tc.table_name LIKE '%chat%')
    `);
    
    console.log('\nExisting Foreign Keys:');
    fkResult.rows.forEach(row => {
      console.log(`${row.table_name}.${row.column_name} -> ${row.foreign_table_name}.${row.foreign_column_name}`);
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.end();
  }
}

checkSchema();