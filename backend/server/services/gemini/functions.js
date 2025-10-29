/**
 * Gemini Function Calling Service
 * 
 * Handles function call processing, dependency analysis, and parallel execution logic.
 * 
 * @module backend/server/services/gemini/functions
 */

/**
 * Analyze function dependencies and group for parallel execution
 * Groups functions that can execute in parallel while respecting dependencies
 * @param {Array} functionCalls - Array of function calls from Gemini
 * @returns {Array<Array>} Array of groups - each group can execute in parallel
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
 * Execute multiple functions in parallel
 * @param {Array} functionCalls - Array of function calls to execute
 * @param {string} userEmail - User email for authentication
 * @param {Function} executeFunction - Function executor (e.g., executeCalendarFunction)
 * @returns {Promise<Array>} Array of execution results
 */
async function executeParallelFunctions(functionCalls, userEmail, executeFunction) {
    console.log(`\n   ⚡ PARALLEL EXECUTION: ${functionCalls.length} functions`);
    const startTime = Date.now();
    
    // Execute all functions in parallel
    const results = await Promise.all(
        functionCalls.map(async (call) => {
            const callStart = Date.now();
            console.log(`      🔧 Executing: ${call.name}(${JSON.stringify(call.args).substring(0, 100)}...)`);
            
            try {
                const result = await executeFunction(call.name, call.args, userEmail);
                const callDuration = Date.now() - callStart;
                console.log(`      ✅ ${call.name} completed in ${callDuration}ms`);
                
                return {
                    call,
                    result,
                    success: true
                };
            } catch (error) {
                const callDuration = Date.now() - callStart;
                console.error(`      ❌ ${call.name} failed in ${callDuration}ms:`, error.message);
                
                return {
                    call,
                    error: error.message,
                    success: false
                };
            }
        })
    );
    
    const totalDuration = Date.now() - startTime;
    console.log(`   ✅ Parallel execution completed in ${totalDuration}ms`);
    
    return results;
}

/**
 * Process function calls in groups with parallel execution
 * @param {Array<Array>} groups - Groups of function calls
 * @param {string} userEmail - User email for authentication
 * @param {Function} executeFunction - Function executor
 * @returns {Promise<Array>} Array of formatted function responses
 */
async function processGroupedFunctionCalls(groups, userEmail, executeFunction) {
    const functionResponses = [];
    let totalFunctionCalls = 0;
    
    console.log(`   ⚡ Executing in ${groups.length} parallel group(s)`);
    
    // Execute each group in sequence, but functions within group run in parallel
    for (let groupIndex = 0; groupIndex < groups.length; groupIndex++) {
        const group = groups[groupIndex];
        console.log(`   📦 Group ${groupIndex + 1}: ${group.map(c => c.name).join(', ')}`);
        
        const groupStartTime = Date.now();
        const groupResults = await executeParallelFunctions(group, userEmail, executeFunction);
        const groupDuration = Date.now() - groupStartTime;
        
        console.log(`   ✅ Group ${groupIndex + 1} completed in ${groupDuration}ms`);
        
        // Convert results to function responses and count calls
        for (const { call, result, error, success } of groupResults) {
            totalFunctionCalls++;
            functionResponses.push({
                functionResponse: {
                    name: call.name,
                    response: success ? { result } : { error }
                }
            });
        }
    }
    
    return { functionResponses, totalFunctionCalls };
}

/**
 * Handle function calling loop for non-streaming responses
 * @param {Object} chat - Active chat session
 * @param {Object} response - Initial response
 * @param {string} userEmail - User email for authentication
 * @param {Function} executeFunction - Function executor
 * @param {string} requestId - Request ID for logging
 * @returns {Promise<Object>} Final response and function call count
 */
async function handleFunctionCalls(chat, response, userEmail, executeFunction, requestId = '') {
    let functionCallCount = 0;
    let currentResponse = response;
    
    // Handle function calls in a loop
    while (currentResponse && currentResponse.functionCalls) {
        const functionCalls = currentResponse.functionCalls();
        if (!functionCalls || functionCalls.length === 0) {
            break;
        }
        
        console.log(`\n   🔧 [${requestId}] Gemini wants to call ${functionCalls.length} function(s):`);
        
        // Group functions for parallel execution
        const groups = analyzeFunctionDependencies(functionCalls);
        
        const { functionResponses, totalFunctionCalls } = await processGroupedFunctionCalls(
            groups, 
            userEmail, 
            executeFunction
        );
        
        functionCallCount += totalFunctionCalls;
        
        // Send function results back to Gemini
        console.log(`\n   📤 [${requestId}] Sending ${functionResponses.length} function results back to Gemini...`);
        const nextResponse = await chat.sendMessage(functionResponses);
        currentResponse = nextResponse.response;
    }
    
    return { response: currentResponse, functionCallCount };
}

module.exports = {
    analyzeFunctionDependencies,
    executeParallelFunctions,
    processGroupedFunctionCalls,
    handleFunctionCalls
};
