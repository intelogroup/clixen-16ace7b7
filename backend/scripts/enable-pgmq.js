import pg from 'pg';
import { config } from 'dotenv';

const { Client } = pg;
config();

async function enablePGMQ() {
  const connectionString = `postgresql://postgres.zfbgdixbzezpxllkoyfc:${encodeURIComponent('Jimkali90#')}@aws-0-us-east-2.pooler.supabase.com:5432/postgres`;
  
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('🚀 Connected to Supabase PostgreSQL...');

    // Try to access pgmq schema
    const schemaResult = await client.query(`
      SELECT schema_name 
      FROM information_schema.schemata 
      WHERE schema_name = 'pgmq'
    `);
    
    if (schemaResult.rows.length === 0) {
      console.log('⚠️  pgmq schema not found. Trying to initialize...');
      
      // Try to initialize pgmq
      await client.query(`SELECT pgmq.create('test_init_queue')`);
      console.log('✅ pgmq initialized successfully');
      
      // Clean up test queue
      await client.query(`SELECT pgmq.drop_queue('test_init_queue')`);
      
    } else {
      console.log('✅ pgmq schema exists');
    }

    // Now run our custom functions from the full migration
    console.log('📝 Creating custom pgmq functions...');
    
    const customFunctions = `
    -- Create queue with error handling
    CREATE OR REPLACE FUNCTION pgmq_create_queue(queue_name TEXT)
    RETURNS BOOLEAN
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $$
    BEGIN
      -- Check if queue already exists
      IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'pgmq_' || queue_name
      ) THEN
        RETURN TRUE; -- Queue already exists
      END IF;
      
      -- Create the queue
      PERFORM pgmq.create(queue_name);
      
      RETURN TRUE;
    EXCEPTION WHEN OTHERS THEN
      -- Log error and return false
      INSERT INTO queue_errors (queue_name, error_message, created_at)
      VALUES (queue_name, SQLERRM, NOW());
      
      RETURN FALSE;
    END;
    $$;

    -- Send message with delay support
    CREATE OR REPLACE FUNCTION pgmq_send_with_delay(
      queue_name TEXT,
      msg JSONB,
      delay_seconds INTEGER DEFAULT 0
    )
    RETURNS TABLE(msg_id BIGINT)
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $$
    DECLARE
      result_id BIGINT;
    BEGIN
      IF delay_seconds > 0 THEN
        SELECT pgmq.send_at(queue_name, msg, NOW() + (delay_seconds || ' seconds')::INTERVAL) INTO result_id;
      ELSE
        SELECT pgmq.send(queue_name, msg) INTO result_id;
      END IF;
      
      RETURN QUERY SELECT result_id;
    END;
    $$;

    -- Read batch of messages
    CREATE OR REPLACE FUNCTION pgmq_read_batch(
      queue_name TEXT,
      vt_seconds INTEGER DEFAULT 30,
      qty INTEGER DEFAULT 10
    )
    RETURNS TABLE(msg_id BIGINT, read_ct INTEGER, enqueued_at TIMESTAMPTZ, vt TIMESTAMPTZ, message JSONB)
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $$
    BEGIN
      RETURN QUERY 
      SELECT * FROM pgmq.read(queue_name, vt_seconds, qty);
    END;
    $$;

    -- Get queue metrics
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
        (SELECT COUNT(*) FROM pgmq.metrics_all() WHERE queue_name_text = queue_name),
        (SELECT EXTRACT(EPOCH FROM (NOW() - MIN(enqueued_at)))::INTEGER 
         FROM pgmq.read(queue_name, 0, 1)),
        (SELECT COUNT(*) FROM pgmq.metrics_all() WHERE queue_name_text = queue_name);
    END;
    $$;

    -- Purge queue
    CREATE OR REPLACE FUNCTION pgmq_purge_queue(queue_name TEXT)
    RETURNS BOOLEAN
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $$
    BEGIN
      PERFORM pgmq.purge_queue(queue_name);
      RETURN TRUE;
    EXCEPTION WHEN OTHERS THEN
      RETURN FALSE;
    END;
    $$;
    `;

    await client.query(customFunctions);
    console.log('✅ Custom pgmq functions created');

    // Create the initial queues
    console.log('📬 Creating initial queues...');
    const queues = ['workflow_validation', 'auto_heal', 'deployment_test', 'webhook_delivery', 'analytics_processing'];
    
    for (const queue of queues) {
      const result = await client.query(`SELECT pgmq_create_queue($1)`, [queue]);
      console.log(`✅ Queue '${queue}' created: ${result.rows[0].pgmq_create_queue}`);
    }

    // Test queue functionality
    console.log('🧪 Testing queue functionality...');
    
    // Send a test message
    const sendResult = await client.query(`
      SELECT pgmq_send_with_delay('workflow_validation', '{"test": "message", "timestamp": "${new Date().toISOString()}"}', 0)
    `);
    
    const messageId = sendResult.rows[0].msg_id;
    console.log(`✅ Test message sent with ID: ${messageId}`);

    // Read the message back
    const readResult = await client.query(`
      SELECT pgmq_read_batch('workflow_validation', 30, 1)
    `);
    
    if (readResult.rows.length > 0) {
      console.log('✅ Test message received:', readResult.rows[0]);
      
      // Archive the message
      await client.query(`SELECT pgmq.archive('workflow_validation', $1)`, [messageId]);
      console.log('✅ Test message archived');
    }

    // Get queue metrics
    const metricsResult = await client.query(`SELECT pgmq_metrics('workflow_validation')`);
    console.log('📊 Queue metrics:', metricsResult.rows[0]);

    console.log('\n🎉 pgmq setup and testing completed successfully!');

  } catch (error) {
    console.error('💥 pgmq setup failed:', error.message);
    
    if (error.message.includes('pgmq')) {
      console.log('\n💡 pgmq Extension Troubleshooting:');
      console.log('1. The pgmq extension might not be fully enabled');
      console.log('2. Try running: SELECT pgmq.create(\'test_queue\'); in the SQL editor');
      console.log('3. If that fails, contact Supabase support for pgmq enablement');
    }
  } finally {
    await client.end();
  }
}

enablePGMQ();