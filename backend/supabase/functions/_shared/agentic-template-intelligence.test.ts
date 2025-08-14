import { assertEquals, assertExists } from 'https://deno.land/std@0.196.0/testing/asserts.ts';
import { AgenticTemplateIntelligence } from './agentic-template-intelligence.ts';

Deno.test('AgenticTemplateIntelligence - Research Intent Analysis', () => {
  const intelligence = new AgenticTemplateIntelligence();
  
  const intent = 'Research the latest AI developments and summarize key findings';
  const analysis = intelligence.analyzeIntent(intent);
  
  assertEquals(analysis.category, 'research');
  assertEquals(analysis.confidence > 0.7, true, 'Should have high confidence for clear research intent');
  assertEquals(analysis.suggestedPattern, 'single', 'Research tasks typically use single agent');
  assertExists(analysis.tools);
  assertEquals(analysis.tools.includes('web_search'), true, 'Should include web search tool');
});

Deno.test('AgenticTemplateIntelligence - Multi-Step Analysis Intent', () => {
  const intelligence = new AgenticTemplateIntelligence();
  
  const intent = 'First analyze the data, then generate a report, and finally send it via email';
  const analysis = intelligence.analyzeIntent(intent);
  
  assertEquals(analysis.category, 'multi-step');
  assertEquals(analysis.suggestedPattern, 'chained', 'Multi-step tasks should use chained pattern');
  assertEquals(analysis.agents.length >= 2, true, 'Should suggest multiple agents for multi-step');
  assertEquals(analysis.confidence > 0.6, true, 'Should have reasonable confidence');
});

Deno.test('AgenticTemplateIntelligence - Content Generation Intent', () => {
  const intelligence = new AgenticTemplateIntelligence();
  
  const intent = 'Generate blog posts about technology trends';
  const analysis = intelligence.analyzeIntent(intent);
  
  assertEquals(analysis.category, 'content-generation');
  assertEquals(analysis.confidence > 0.7, true, 'Should have high confidence for content generation');
  assertExists(analysis.agents);
  assertEquals(analysis.agents[0].name.toLowerCase().includes('content'), true);
  assertEquals(analysis.agents[0].temperature >= 0.7, true, 'Content generation needs higher temperature');
});

Deno.test('AgenticTemplateIntelligence - Customer Support Intent', () => {
  const intelligence = new AgenticTemplateIntelligence();
  
  const intent = 'Handle customer support tickets and route them to appropriate departments';
  const analysis = intelligence.analyzeIntent(intent);
  
  assertEquals(analysis.category, 'customer-support');
  assertEquals(analysis.suggestedPattern, 'gatekeeper', 'Support routing should use gatekeeper pattern');
  assertEquals(analysis.agents.length >= 3, true, 'Should have gatekeeper and specialist agents');
  
  // Verify gatekeeper agent exists
  const gatekeeper = analysis.agents.find(a => a.name.includes('Router'));
  assertExists(gatekeeper, 'Should have a router/gatekeeper agent');
});

Deno.test('AgenticTemplateIntelligence - Data Processing Intent', () => {
  const intelligence = new AgenticTemplateIntelligence();
  
  const intent = 'Process CSV files and extract insights from the data';
  const analysis = intelligence.analyzeIntent(intent);
  
  assertEquals(analysis.category, 'data-processing');
  assertExists(analysis.tools);
  assertEquals(analysis.tools.includes('code'), true, 'Data processing should include code tool');
  assertEquals(analysis.agents[0].temperature <= 0.5, true, 'Data processing needs lower temperature');
});

Deno.test('AgenticTemplateIntelligence - Team Collaboration Intent', () => {
  const intelligence = new AgenticTemplateIntelligence();
  
  const intent = 'Coordinate multiple teams to research, analyze, and report on market trends';
  const analysis = intelligence.analyzeIntent(intent);
  
  assertEquals(analysis.suggestedPattern, 'team', 'Team coordination should use team pattern');
  assertEquals(analysis.agents.length >= 3, true, 'Should have multiple team agents');
  
  // Check for coordinator
  const coordinator = analysis.agents.find(a => 
    a.systemPrompt.toLowerCase().includes('coordinat')
  );
  assertExists(coordinator, 'Should have a coordinator agent');
});

Deno.test('AgenticTemplateIntelligence - Email Automation Intent', () => {
  const intelligence = new AgenticTemplateIntelligence();
  
  const intent = 'Send daily email reports with weather and news updates';
  const analysis = intelligence.analyzeIntent(intent);
  
  assertEquals(analysis.category, 'email-automation');
  assertExists(analysis.tools);
  assertEquals(analysis.tools.includes('http_request'), true, 'Email automation needs HTTP requests');
  assertEquals(analysis.requiresMemory, false, 'Simple email automation doesn\'t need memory');
});

Deno.test('AgenticTemplateIntelligence - AI Analysis Intent', () => {
  const intelligence = new AgenticTemplateIntelligence();
  
  const intent = 'Use AI to analyze sentiment in customer feedback';
  const analysis = intelligence.analyzeIntent(intent);
  
  assertEquals(analysis.category, 'ai-driven');
  assertEquals(analysis.confidence > 0.7, true, 'Should have high confidence for AI tasks');
  assertEquals(analysis.agents[0].model, 'gpt-4', 'AI analysis should use GPT-4');
});

Deno.test('AgenticTemplateIntelligence - Tool Selection', () => {
  const intelligence = new AgenticTemplateIntelligence();
  
  // Test web search tool selection
  const searchIntent = 'Search for information about quantum computing';
  const searchAnalysis = intelligence.analyzeIntent(searchIntent);
  assertEquals(searchAnalysis.tools.includes('web_search'), true);
  
  // Test code tool selection
  const codeIntent = 'Calculate the fibonacci sequence';
  const codeAnalysis = intelligence.analyzeIntent(codeIntent);
  assertEquals(codeAnalysis.tools.includes('code'), true);
  
  // Test HTTP tool selection
  const apiIntent = 'Fetch data from REST API endpoints';
  const apiAnalysis = intelligence.analyzeIntent(apiIntent);
  assertEquals(apiAnalysis.tools.includes('http_request'), true);
  
  // Test workflow tool selection
  const workflowIntent = 'Trigger another workflow when conditions are met';
  const workflowAnalysis = intelligence.analyzeIntent(workflowIntent);
  assertEquals(workflowAnalysis.tools.includes('workflow'), true);
});

Deno.test('AgenticTemplateIntelligence - Memory Requirements', () => {
  const intelligence = new AgenticTemplateIntelligence();
  
  // Conversational context requires memory
  const conversationIntent = 'Have a conversation and remember previous messages';
  const convAnalysis = intelligence.analyzeIntent(conversationIntent);
  assertEquals(convAnalysis.requiresMemory, true, 'Conversation should require memory');
  
  // Simple automation doesn't require memory
  const simpleIntent = 'Send a webhook notification';
  const simpleAnalysis = intelligence.analyzeIntent(simpleIntent);
  assertEquals(simpleAnalysis.requiresMemory, false, 'Simple tasks don\'t need memory');
  
  // Multi-session tasks require memory
  const sessionIntent = 'Track user preferences across multiple sessions';
  const sessionAnalysis = intelligence.analyzeIntent(sessionIntent);
  assertEquals(sessionAnalysis.requiresMemory, true, 'Multi-session needs memory');
});

Deno.test('AgenticTemplateIntelligence - Model Selection', () => {
  const intelligence = new AgenticTemplateIntelligence();
  
  // Complex tasks should use GPT-4
  const complexIntent = 'Analyze complex legal documents and provide detailed insights';
  const complexAnalysis = intelligence.analyzeIntent(complexIntent);
  assertEquals(complexAnalysis.agents[0].model, 'gpt-4', 'Complex tasks need GPT-4');
  
  // Simple tasks can use GPT-3.5
  const simpleIntent = 'Categorize incoming emails by subject';
  const simpleAnalysis = intelligence.analyzeIntent(simpleIntent);
  assertEquals(complexAnalysis.agents[0].model.includes('gpt'), true, 'Should use GPT model');
});

Deno.test('AgenticTemplateIntelligence - Temperature Settings', () => {
  const intelligence = new AgenticTemplateIntelligence();
  
  // Creative tasks need higher temperature
  const creativeIntent = 'Write creative stories about space exploration';
  const creativeAnalysis = intelligence.analyzeIntent(creativeIntent);
  assertEquals(creativeAnalysis.agents[0].temperature >= 0.7, true, 'Creative tasks need high temperature');
  
  // Analytical tasks need lower temperature
  const analyticalIntent = 'Analyze financial data and calculate metrics';
  const analyticalAnalysis = intelligence.analyzeIntent(analyticalIntent);
  assertEquals(analyticalAnalysis.agents[0].temperature <= 0.5, true, 'Analytical tasks need low temperature');
  
  // Routing tasks need very low temperature
  const routingIntent = 'Route support tickets to correct department';
  const routingAnalysis = intelligence.analyzeIntent(routingIntent);
  const router = routingAnalysis.agents.find(a => a.name.includes('Router'));
  assertEquals(router.temperature <= 0.3, true, 'Routing needs very low temperature');
});

Deno.test('AgenticTemplateIntelligence - Edge Cases', () => {
  const intelligence = new AgenticTemplateIntelligence();
  
  // Empty intent
  const emptyAnalysis = intelligence.analyzeIntent('');
  assertEquals(emptyAnalysis.category, 'general');
  assertEquals(emptyAnalysis.confidence < 0.5, true, 'Empty intent should have low confidence');
  
  // Very short intent
  const shortAnalysis = intelligence.analyzeIntent('email');
  assertExists(shortAnalysis.category);
  assertEquals(shortAnalysis.confidence < 0.7, true, 'Short intent should have lower confidence');
  
  // Mixed intent
  const mixedIntent = 'Research data, generate report, send email, and analyze feedback';
  const mixedAnalysis = intelligence.analyzeIntent(mixedIntent);
  assertEquals(mixedAnalysis.suggestedPattern, 'chained', 'Mixed complex tasks should chain');
  assertEquals(mixedAnalysis.agents.length >= 2, true, 'Should have multiple agents');
  
  // Non-English characters
  const unicodeIntent = 'Process data with 中文 characters and émojis 🚀';
  const unicodeAnalysis = intelligence.analyzeIntent(unicodeIntent);
  assertExists(unicodeAnalysis.category, 'Should handle unicode gracefully');
});

Deno.test('AgenticTemplateIntelligence - Pattern Confidence Scoring', () => {
  const intelligence = new AgenticTemplateIntelligence();
  
  // Very clear intent should have high confidence
  const clearIntent = 'Use AI agents to research web content and generate summary report';
  const clearAnalysis = intelligence.analyzeIntent(clearIntent);
  assertEquals(clearAnalysis.confidence >= 0.8, true, 'Clear intent should have high confidence');
  
  // Ambiguous intent should have lower confidence
  const ambiguousIntent = 'Do something with the data';
  const ambiguousAnalysis = intelligence.analyzeIntent(ambiguousIntent);
  assertEquals(ambiguousAnalysis.confidence < 0.6, true, 'Ambiguous intent should have low confidence');
  
  // Technical intent should have high confidence
  const technicalIntent = 'Implement REST API endpoint with authentication and rate limiting';
  const technicalAnalysis = intelligence.analyzeIntent(technicalIntent);
  assertEquals(technicalAnalysis.confidence > 0.7, true, 'Technical intent should be well understood');
});

// Run tests
if (import.meta.main) {
  console.log('Running Agentic Template Intelligence tests...');
}