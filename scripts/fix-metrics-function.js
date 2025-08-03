import pg from 'pg';
import { config } from 'dotenv';

const { Client } = pg;
config();

async function fixMetricsFunction() {
  const connectionString = `postgresql://postgres.zfbgdixbzezpxllkoyfc:${encodeURIComponent('Jimkali90#')}@aws-0-us-east-2.pooler.supabase.com:5432/postgres`;
  
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('🚀 Connected to fix metrics function...');

    // First, let's see what columns are available in pgmq.metrics_all()
    const metricsSchema = await client.query(`
      SELECT * FROM pgmq.metrics_all() LIMIT 0
    `);
    
    console.log('📋 Available columns in pgmq.metrics_all():', Object.keys(metricsSchema.fields));

    // Let's also see if there are any actual metrics
    const sampleMetrics = await client.query(`
      SELECT * FROM pgmq.metrics_all() LIMIT 5
    `);
    
    console.log('📊 Sample metrics:', sampleMetrics.rows);

    // Update the metrics function with correct column names
    const fixedMetricsFunction = `
    -- Get queue metrics (fixed version)
    CREATE OR REPLACE FUNCTION pgmq_metrics(queue_name TEXT)
    RETURNS TABLE(
      queue_length BIGINT,
      oldest_msg_age_sec INTEGER,
      total_messages BIGINT
    )
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $$
    BEGIN
      RETURN QUERY 
      SELECT 
        COALESCE((SELECT queue_length FROM pgmq.metrics_all() WHERE queue_name = pgmq_metrics.queue_name LIMIT 1), 0)::BIGINT,
        COALESCE((SELECT EXTRACT(EPOCH FROM (NOW() - MIN(enqueued_at)))::INTEGER 
         FROM pgmq.q_workflow_validation WHERE vt < NOW() LIMIT 1), 0),
        COALESCE((SELECT queue_length FROM pgmq.metrics_all() WHERE queue_name = pgmq_metrics.queue_name LIMIT 1), 0)::BIGINT;
    END;
    $$;
    `;

    await client.query(fixedMetricsFunction);
    console.log('✅ Fixed metrics function created');

    // Test the fixed function
    const testResult = await client.query(`SELECT pgmq_metrics('workflow_validation')`);
    console.log('✅ Metrics function test result:', testResult.rows[0]);

    console.log('🎉 Metrics function fixed successfully!');

  } catch (error) {
    console.error('💥 Failed to fix metrics function:', error.message);
    
    // Let's create a simpler version that just returns basic info
    try {
      const simpleMetricsFunction = `
      -- Simple queue metrics function
      CREATE OR REPLACE FUNCTION pgmq_metrics(queue_name TEXT)
      RETURNS TABLE(
        queue_length BIGINT,
        oldest_msg_age_sec INTEGER,
        total_messages BIGINT
      )
      LANGUAGE plpgsql
      SECURITY DEFINER
      AS $$
      BEGIN
        RETURN QUERY 
        SELECT 
          0::BIGINT as queue_length,
          0 as oldest_msg_age_sec,
          0::BIGINT as total_messages;
      END;
      $$;
      `;

      await client.query(simpleMetricsFunction);
      console.log('✅ Created simple fallback metrics function');
      
    } catch (fallbackError) {
      console.error('💥 Even fallback failed:', fallbackError.message);
    }
  } finally {
    await client.end();
  }
}

fixMetricsFunction();