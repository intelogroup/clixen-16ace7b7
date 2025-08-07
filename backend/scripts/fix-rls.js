#!/usr/bin/env node

import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Client } = pg;

async function fixRLS() {
  const client = new Client({
    host: 'aws-0-us-east-2.pooler.supabase.com',
    port: 5432,
    database: 'postgres',
    user: 'postgres.zfbgdixbzezpxllkoyfc',
    password: 'Jimkali90#',
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('✅ Connected to database');
    
    // Enable RLS on api_quotas
    console.log('🔒 Enabling RLS on api_quotas...');
    await client.query('ALTER TABLE api_quotas ENABLE ROW LEVEL SECURITY');
    console.log('✅ RLS enabled on api_quotas');
    
    // Create policy for api_quotas
    console.log('📝 Creating policy for api_quotas...');
    try {
      await client.query(`
        CREATE POLICY "Everyone can view quotas" ON api_quotas
        FOR SELECT USING (true)
      `);
      console.log('✅ Policy created');
    } catch (err) {
      if (err.message.includes('already exists')) {
        console.log('⏭️  Policy already exists');
      } else {
        throw err;
      }
    }
    
    console.log('\n🎉 RLS configuration fixed!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

fixRLS();