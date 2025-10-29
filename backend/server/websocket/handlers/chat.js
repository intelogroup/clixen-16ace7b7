/**
 * WebSocket Chat Handlers
 * 
 * Handles text-based chat messages via WebSocket with streaming responses
 */

/**
 * Handle text messages via WebSocket
 * Supports streaming text responses and function calling
 */
async function handleTextMessage(ws, message, userEmail, connectionId, dependencies) {
    const {
        getConversationHistory,
        addToHistory,
        model,
        analyzeFunctionDependencies,
        executeParallelFunctions
    } = dependencies;

    const requestId = Date.now();
    console.log(`\n💬 [WS-${connectionId}] Text message from ${userEmail}: "${message.text}"`);
    
    try {
        ws.send(JSON.stringify({
            type: 'processing_started',
            requestId,
            timestamp: Date.now()
        }));
        
        const history = getConversationHistory(userEmail);
        addToHistory(userEmail, 'user', message.text);
        
        console.log(`   📚 Raw history: ${history.length} messages`);
        
        // Format history excluding the just-added user message (will be sent separately)
        let formattedHistory = history.slice(0, -1).map(msg => ({
            role: msg.role === 'user' ? 'user' : 'model',
            parts: [{ text: msg.content }]
        }));
        
        // Debug: Show last 3 messages
        if (formattedHistory.length > 0) {
            console.log(`   🔍 Last messages in history (before new user message):`);
            formattedHistory.slice(-3).forEach((msg, i) => {
                console.log(`      ${formattedHistory.length - 3 + i + 1}. ${msg.role}: ${msg.parts[0].text.substring(0, 50)}...`);
            });
        }
        
        // CRITICAL: Clean history from both start and end
        let removedFromStart = 0;
        while (formattedHistory.length > 0 && formattedHistory[0].role === 'model') {
            console.log(`   ⚠️  History STARTS with 'model' role, removing first entry`);
            formattedHistory.shift();
            removedFromStart++;
        }
        
        let removedFromEnd = 0;
        while (formattedHistory.length > 0 && formattedHistory[formattedHistory.length - 1].role === 'model') {
            console.log(`   ⚠️  History ENDS with 'model' role, removing last entry`);
            formattedHistory.pop();
            removedFromEnd++;
        }
        
        if (removedFromStart > 0 || removedFromEnd > 0) {
            console.log(`   ✂️  Cleaned history: removed ${removedFromStart} from start, ${removedFromEnd} from end`);
        }
        console.log(`   ✅ Using ${formattedHistory.length} history messages for context`);
        
        const chat = model.startChat({
            history: formattedHistory
        });
        
        // Stream the response
        const result = await chat.sendMessageStream(message.text);
        
        // Stream text chunks
        for await (const chunk of result.stream) {
            const chunkText = chunk.text();
            
            ws.send(JSON.stringify({
                type: 'text_chunk',
                text: chunkText,
                timestamp: Date.now()
            }));
        }
        
        const response = await result.response;
        let fullResponse = response.text();
        
        // Handle function calls
        let currentResponse = response;
        while (currentResponse.functionCalls() && currentResponse.functionCalls().length > 0) {
            const functionCalls = currentResponse.functionCalls();
            
            ws.send(JSON.stringify({
                type: 'function_calls',
                functions: functionCalls.map(f => f.name),
                timestamp: Date.now()
            }));
            
            const groups = analyzeFunctionDependencies(functionCalls);
            const functionResponses = [];
            
            for (const group of groups) {
                const groupResults = await executeParallelFunctions(group, userEmail);
                
                for (const { call, result, error, success } of groupResults) {
                    functionResponses.push({
                        functionResponse: {
                            name: call.name,
                            response: success ? { result } : { error }
                        }
                    });
                }
            }
            
            const nextResult = await chat.sendMessageStream(functionResponses);
            
            fullResponse = '';
            for await (const chunk of nextResult.stream) {
                const chunkText = chunk.text();
                fullResponse += chunkText;
                
                ws.send(JSON.stringify({
                    type: 'text_chunk',
                    text: chunkText,
                    timestamp: Date.now()
                }));
            }
            
            currentResponse = await nextResult.response;
        }
        
        addToHistory(userEmail, 'model', fullResponse);
        
        ws.send(JSON.stringify({
            type: 'processing_complete',
            requestId,
            timestamp: Date.now()
        }));
        
        console.log(`✅ [WS-${connectionId}] Text message processed`);
        
    } catch (error) {
        console.error(`❌ [WS-${connectionId}] Text message error:`, error);
        ws.send(JSON.stringify({
            type: 'error',
            error: error.message,
            timestamp: Date.now()
        }));
    }
}

module.exports = {
    handleTextMessage
};
