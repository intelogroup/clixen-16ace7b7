import pg from 'pg';
import { config } from 'dotenv';

const { Client } = pg;
config();

async function createProperMetrics() {
  const connectionString = `postgresql://postgres.zfbgdixbzezpxllkoyfc:${encodeURIComponent('Jimkali90#')}@aws-0-us-east-2.pooler.supabase.com:5432/postgres`;
  
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('🚀 Connected to create proper metrics function...');

    // Create the correct metrics function based on the actual schema
    const properMetricsFunction = `
    -- Proper queue metrics function based on actual pgmq schema
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
        COALESCE((SELECT m.queue_length::BIGINT FROM pgmq.metrics_all() m WHERE m.queue_name = pgmq_metrics.queue_name LIMIT 1), 0),
        COALESCE((SELECT m.oldest_msg_age_sec FROM pgmq.metrics_all() m WHERE m.queue_name = pgmq_metrics.queue_name LIMIT 1), 0),
        COALESCE((SELECT m.total_messages::BIGINT FROM pgmq.metrics_all() m WHERE m.queue_name = pgmq_metrics.queue_name LIMIT 1), 0);
    END;
    $$;
    `;

    await client.query(properMetricsFunction);
    console.log('✅ Proper metrics function created');

    // Test the function
    const testResult = await client.query(`SELECT * FROM pgmq_metrics('workflow_validation')`);
    console.log('✅ Metrics function test result:', testResult.rows[0]);

    console.log('🎉 Proper metrics function created and tested successfully!');

  } catch (error) {
    console.error('💥 Failed to create proper metrics function:', error.message);
  } finally {
    await client.end();
  }
}

createProperMetrics();