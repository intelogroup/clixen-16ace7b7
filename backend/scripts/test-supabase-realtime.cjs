#!/usr/bin/env node

// Supabase Real-time Functionality Test
// Tests live database updates and real-time subscriptions

const { createClient } = require('@supabase/supabase-js');

// Configuration
const SUPABASE_URL = 'https://zfbgdixbzezpxllkoyfc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpmYmdkaXhiemV6cHhsbGtveWZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwNDYzOTcsImV4cCI6MjA2ODYyMjM5N30.RIDf8tMNfcrVJsA_AhobZBU_H4gUHp6imiIFmzOFapw';

// Test user ID for real-time demo
const TEST_USER_ID = '550e8400-e29b-41d4-a716-446655440099';

console.log('🚀 Supabase Real-time Test Starting...');
console.log('=====================================');

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
});

// Track statistics
let stats = {
  inserts: 0,
  updates: 0,
  deletes: 0,
  startTime: new Date(),
  latencies: []
};

// Real-time subscription handler
function setupRealtimeSubscription() {
  console.log('🎧 Setting up real-time subscription...');
  
  const subscription = supabase
    .channel('conversations-changes')
    .on('postgres_changes', 
      { 
        event: '*', 
        schema: 'public', 
        table: 'conversations',
        filter: `user_id=eq.${TEST_USER_ID}`
      }, 
      (payload) => {
        const receivedAt = new Date();
        const eventType = payload.eventType;
        const record = payload.new || payload.old;
        
        // Calculate latency if timestamp is available
        let latency = 'N/A';
        if (record && record.created_at) {
          const createdAt = new Date(record.created_at);
          latency = receivedAt - createdAt;
          stats.latencies.push(latency);
        }
        
        // Update statistics
        stats[eventType.toLowerCase() + 's']++;
        
        console.log(`\n📨 REAL-TIME EVENT RECEIVED:`);
        console.log(`   Event Type: ${eventType}`);
        console.log(`   Record ID: ${record?.id || 'N/A'}`);
        console.log(`   Title: ${record?.title || 'N/A'}`);
        console.log(`   Latency: ${latency}ms`);
        console.log(`   Timestamp: ${receivedAt.toISOString()}`);
        console.log(`   Raw Payload:`, JSON.stringify(payload, null, 2));
      }
    )
    .subscribe((status) => {
      console.log(`📡 Subscription status: ${status}`);
      if (status === 'SUBSCRIBED') {
        console.log('✅ Real-time subscription active!');
        console.log(`🎯 Listening for changes to user: ${TEST_USER_ID}`);
        console.log('\n⏳ Waiting for real-time events...');
        console.log('   (You can now trigger database changes from n8n or another terminal)');
      }
    });

  return subscription;
}

// Test data insertion function
async function insertTestRecord(message = 'Real-time test message') {
  console.log(`\n💾 Inserting test record: "${message}"`);
  
  const { data, error } = await supabase
    .from('conversations')
    .insert([
      {
        title: message,
        user_id: TEST_USER_ID,
        status: 'active',
        workflow_summary: `Real-time test at ${new Date().toISOString()}`
      }
    ])
    .select();

  if (error) {
    console.error('❌ Error inserting record:', error);
    return null;
  }

  console.log('✅ Record inserted successfully:', data[0]?.id);
  return data[0];
}

// Test data update function
async function updateTestRecord(id, newTitle) {
  console.log(`\n✏️  Updating record ${id}: "${newTitle}"`);
  
  const { data, error } = await supabase
    .from('conversations')
    .update({ 
      title: newTitle,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select();

  if (error) {
    console.error('❌ Error updating record:', error);
    return null;
  }

  console.log('✅ Record updated successfully');
  return data[0];
}

// Test data deletion function
async function deleteTestRecord(id) {
  console.log(`\n🗑️  Deleting record ${id}`);
  
  const { error } = await supabase
    .from('conversations')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('❌ Error deleting record:', error);
    return false;
  }

  console.log('✅ Record deleted successfully');
  return true;
}

// Print statistics
function printStats() {
  const duration = (new Date() - stats.startTime) / 1000;
  const avgLatency = stats.latencies.length > 0 
    ? Math.round(stats.latencies.reduce((a, b) => a + b, 0) / stats.latencies.length)
    : 0;

  console.log('\n📊 REAL-TIME STATISTICS:');
  console.log('========================');
  console.log(`⏱️  Duration: ${duration.toFixed(1)}s`);
  console.log(`📝 Inserts: ${stats.inserts}`);
  console.log(`✏️  Updates: ${stats.updates}`);
  console.log(`🗑️  Deletes: ${stats.deletes}`);
  console.log(`🚀 Average Latency: ${avgLatency}ms`);
  console.log(`📈 Total Events: ${stats.inserts + stats.updates + stats.deletes}`);
}

// Automated test sequence
async function runAutomatedTests() {
  console.log('\n🤖 Running automated real-time tests...');
  
  await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for subscription
  
  // Test 1: Insert
  const record1 = await insertTestRecord('Automated Test - Insert Event');
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Test 2: Update
  if (record1) {
    await updateTestRecord(record1.id, 'Automated Test - Update Event');
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Test 3: Delete
    await deleteTestRecord(record1.id);
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Test 4: Bulk operations
  console.log('\n🔄 Testing bulk operations...');
  const records = [];
  for (let i = 1; i <= 3; i++) {
    const record = await insertTestRecord(`Bulk Test Message #${i}`);
    if (record) records.push(record);
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Cleanup bulk records
  for (const record of records) {
    await deleteTestRecord(record.id);
    await new Promise(resolve => setTimeout(resolve, 300));
  }
}

// Main execution
async function main() {
  try {
    // Setup real-time subscription
    const subscription = setupRealtimeSubscription();
    
    // Handle cleanup on exit
    process.on('SIGINT', () => {
      console.log('\n\n🛑 Shutting down...');
      printStats();
      supabase.removeAllChannels();
      process.exit(0);
    });
    
    // Wait a moment for subscription to establish
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Check if we should run automated tests
    const runAuto = process.argv.includes('--auto');
    
    if (runAuto) {
      await runAutomatedTests();
      
      console.log('\n✅ Automated tests completed!');
      printStats();
      
      // Keep listening for a bit more
      console.log('\n⏳ Listening for 10 more seconds...');
      await new Promise(resolve => setTimeout(resolve, 10000));
      
      supabase.removeAllChannels();
      process.exit(0);
    } else {
      console.log('\n💡 Manual Mode: Subscription is active and listening.');
      console.log('   - Make changes in another terminal or through n8n');
      console.log('   - Press Ctrl+C to stop and see statistics');
      console.log('   - Use --auto flag for automated testing');
      
      // Keep the process alive
      setInterval(() => {
        // Just keep alive, real work is done by the subscription
      }, 1000);
    }
    
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

// Check if Supabase client library is available
try {
  require.resolve('@supabase/supabase-js');
  main();
} catch (error) {
  console.log('📦 Installing @supabase/supabase-js...');
  const { execSync } = require('child_process');
  
  try {
    execSync('npm install --no-save @supabase/supabase-js', { stdio: 'inherit' });
    console.log('✅ Package installed, restarting...\n');
    
    // Re-run the script
    delete require.cache[require.resolve('@supabase/supabase-js')];
    main();
  } catch (installError) {
    console.error('❌ Failed to install @supabase/supabase-js:', installError.message);
    console.log('\n💡 Please install manually: npm install @supabase/supabase-js');
    process.exit(1);
  }
}