/**
 * Calendar Parallel Execution Module
 * Handles parallel execution of calendar functions with dependency analysis
 */

/**
 * Analyze function dependencies and group for parallel execution
 * @param {Array} functionCalls - Array of function calls from Gemini
 * @returns {Array} Array of groups - each group can execute in parallel
 */
function analyzeFunctionDependencies(functionCalls) {
    // Independent functions that can run in parallel
    const independentFunctions = [
        'getCurrentTime',
        'listEvents'
    ];
    
    // Dependent functions that must run after others
    const dependentFunctions = {
        'checkConflicts': [], // Can run in parallel with most
        'createEvent': ['checkConflicts'], // Should run after conflict check
        'createRecurringEvent': ['checkConflicts'], // Should run after conflict check
        'deleteEvent': ['listEvents'], // May need event list first
        'deleteRecurringEvent': ['listEvents'],
        'searchAndDeleteEvents': ['listEvents']
    };
    
    // Group functions for parallel execution
    const groups = [];
    const processed = new Set();
    
    // First pass: collect all independent functions
    const independentGroup = [];
    for (const call of functionCalls) {
        if (independentFunctions.includes(call.name) && !processed.has(call.name)) {
            independentGroup.push(call);
            processed.add(call.name);
        }
    }
    if (independentGroup.length > 0) {
        groups.push(independentGroup);
    }
    
    // Second pass: group remaining functions that can run in parallel
    const remainingCalls = functionCalls.filter(call => !processed.has(call.name));
    
    // Simple approach: functions with no dependencies can run together
    const noDepsGroup = [];
    const withDepsGroup = [];
    
    for (const call of remainingCalls) {
        const deps = dependentFunctions[call.name] || [];
        if (deps.length === 0 || deps.every(dep => processed.has(dep))) {
            noDepsGroup.push(call);
        } else {
            withDepsGroup.push(call);
        }
    }
    
    if (noDepsGroup.length > 0) {
        groups.push(noDepsGroup);
    }
    
    // Dependent functions run in final group
    if (withDepsGroup.length > 0) {
        groups.push(withDepsGroup);
    }
    
    return groups;
}

/**
 * Execute multiple calendar functions in parallel
 * @param {Array} functionCalls - Array of function calls to execute
 * @param {string} userEmail - User email for authentication
 * @param {Function} executeFunction - Function executor
 * @returns {Promise<Array>} Array of results
 */
async function executeParallelFunctions(functionCalls, userEmail, executeFunction) {
    console.log(`\n   ⚡ PARALLEL EXECUTION: ${functionCalls.length} functions`);
    const startTime = Date.now();
    
    // Execute all functions in parallel
    const promises = functionCalls.map(call => 
        executeFunction(call.name, call.args, userEmail)
            .then(result => ({ call, result, success: true }))
            .catch(error => ({ call, error: error.message, success: false }))
    );
    
    const results = await Promise.all(promises);
    const duration = Date.now() - startTime;
    
    const successCount = results.filter(r => r.success).length;
    console.log(`   ✅ Parallel execution complete: ${successCount}/${results.length} succeeded in ${duration}ms`);
    
    return results;
}

module.exports = {
    analyzeFunctionDependencies,
    executeParallelFunctions
};
