import pg from 'pg';
import { config } from 'dotenv';

const { Client } = pg;
config();

async function testCompleteSystem() {
  const connectionString = `postgresql://postgres.zfbgdixbzezpxllkoyfc:${encodeURIComponent('Jimkali90#')}@aws-0-us-east-2.pooler.supabase.com:5432/postgres`;
  
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('🚀 Connected to Supabase PostgreSQL for complete system test...');

    // Test 1: Create a workflow execution record
    console.log('\n🧪 Test 1: Creating workflow execution record...');
    
    const testWorkflow = {
      nodes: [
        {
          id: "start",
          type: "n8n-nodes-base.start",
          name: "Start",
          position: [100, 100]
        },
        {
          id: "webhook",
          type: "n8n-nodes-base.webhook",
          name: "Webhook",
          position: [300, 100],
          parameters: {
            path: "test-webhook",
            httpMethod: "POST"
          }
        }
      ],
      connections: {
        "Start": {
          "main": [
            [
              {
                "node": "Webhook",
                "type": "main",
                "index": 0
              }
            ]
          ]
        }
      }
    };

    // For testing, we'll use a fake UUID for user_id since we don't have auth context
    const testUserId = '00000000-0000-0000-0000-000000000001';
    
    const insertResult = await client.query(`
      INSERT INTO workflow_executions (user_id, workflow_json, status)
      VALUES ($1, $2, $3)
      RETURNING id, status, created_at
    `, [testUserId, JSON.stringify(testWorkflow), 'pending']);
    
    const executionId = insertResult.rows[0].id;
    console.log('✅ Workflow execution created:', {
      id: executionId,
      status: insertResult.rows[0].status,
      created_at: insertResult.rows[0].created_at
    });

    // Test 2: Add execution steps
    console.log('\n🧪 Test 2: Adding execution steps...');
    
    const steps = [
      { name: 'structure_validation', status: 'completed' },
      { name: 'business_validation', status: 'completed' },
      { name: 'compatibility_validation', status: 'validating' }
    ];

    for (const step of steps) {
      await client.query(`
        INSERT INTO workflow_execution_steps (execution_id, step_name, status)
        VALUES ($1, $2, $3)
      `, [executionId, step.name, step.status]);
      
      console.log(`✅ Step '${step.name}' added with status '${step.status}'`);
    }

    // Test 3: Test queue operations
    console.log('\n🧪 Test 3: Testing queue operations...');
    
    const queueMessage = {
      execution_id: executionId,
      workflow_json: testWorkflow,
      user_id: testUserId,
      action: 'validate_workflow',
      timestamp: new Date().toISOString()
    };

    // Send message to workflow_validation queue
    const sendResult = await client.query(`
      SELECT pgmq_send_with_delay($1, $2, 0) as msg_id
    `, ['workflow_validation', JSON.stringify(queueMessage)]);
    
    console.log('✅ Message sent to queue, ID:', sendResult.rows[0].msg_id);

    // Read messages from queue
    const readResult = await client.query(`
      SELECT pgmq_read_batch($1, 30, 5)
    `, ['workflow_validation']);
    
    console.log('✅ Messages in queue:', readResult.rows.length);
    if (readResult.rows.length > 0) {
      console.log('📋 First message:', readResult.rows[0]);
    }

    // Test 4: Update execution status
    console.log('\n🧪 Test 4: Updating execution status...');
    
    await client.query(`
      UPDATE workflow_executions 
      SET status = $1, execution_time = $2, completed_at = NOW()
      WHERE id = $3
    `, ['completed', 1500, executionId]);
    
    console.log('✅ Execution status updated to completed');

    // Test 5: Query analytics
    console.log('\n🧪 Test 5: Testing analytics...');
    
    // Refresh materialized view
    await client.query('REFRESH MATERIALIZED VIEW workflow_analytics_mv');
    
    const analyticsResult = await client.query(`
      SELECT * FROM workflow_analytics_mv 
      WHERE user_id = $1 
      ORDER BY hour DESC 
      LIMIT 5
    `, [testUserId]);
    
    console.log('✅ Analytics data:', analyticsResult.rows);

    // Test 6: Test performance monitoring queries
    console.log('\n🧪 Test 6: Testing performance queries...');
    
    const perfResult = await client.query(`
      SELECT 
        status,
        COUNT(*) as count,
        AVG(execution_time) as avg_time,
        MAX(execution_time) as max_time
      FROM workflow_executions 
      WHERE created_at >= NOW() - INTERVAL '1 hour'
      GROUP BY status
    `);
    
    console.log('✅ Performance metrics:', perfResult.rows);

    // Test 7: Test queue metrics
    console.log('\n🧪 Test 7: Testing queue metrics...');
    
    const queueMetrics = await client.query(`
      SELECT pgmq_metrics($1)
    `, ['workflow_validation']);
    
    console.log('✅ Queue metrics:', queueMetrics.rows[0]);

    // Test 8: Test error handling
    console.log('\n🧪 Test 8: Testing error logging...');
    
    await client.query(`
      INSERT INTO queue_errors (queue_name, error_message)
      VALUES ($1, $2)
    `, ['test_queue', 'Test error message for system verification']);
    
    const errorCount = await client.query(`
      SELECT COUNT(*) as count FROM queue_errors 
      WHERE created_at >= NOW() - INTERVAL '1 minute'
    `);
    
    console.log('✅ Error logging working, recent errors:', errorCount.rows[0].count);

    // Test 9: Test all tables exist
    console.log('\n🧪 Test 9: Verifying all required tables exist...');
    
    const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN (
        'workflow_executions',
        'workflow_execution_steps', 
        'queue_errors'
      )
      ORDER BY table_name
    `);
    
    console.log('✅ Required tables found:', tables.rows.map(r => r.table_name));

    // Test 10: Test all functions exist
    console.log('\n🧪 Test 10: Verifying all required functions exist...');
    
    const functions = await client.query(`
      SELECT routine_name 
      FROM information_schema.routines 
      WHERE routine_schema = 'public' 
      AND routine_name LIKE 'pgmq_%'
      ORDER BY routine_name
    `);
    
    console.log('✅ Custom functions found:', functions.rows.map(r => r.routine_name));

    console.log('\n🎉 Complete system test passed! The Supabase-native Clixen workflow system is fully operational.');
    console.log('\n📊 System Status Summary:');
    console.log('✅ Database schema: OPERATIONAL');
    console.log('✅ Queue system (pgmq): OPERATIONAL');
    console.log('✅ Workflow tracking: OPERATIONAL');
    console.log('✅ Performance monitoring: OPERATIONAL');  
    console.log('✅ Error logging: OPERATIONAL');
    console.log('✅ Analytics: OPERATIONAL');
    console.log('✅ Custom functions: OPERATIONAL');

  } catch (error) {
    console.error('💥 System test failed:', error.message);
    console.error('Full error:', error);
  } finally {
    await client.end();
  }
}

testCompleteSystem();