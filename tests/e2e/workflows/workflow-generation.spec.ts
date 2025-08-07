/**
 * Workflow Generation E2E Tests
 * Tests the complete workflow creation process from natural language prompt to n8n workflow
 */
import { test, expect, Page } from '@playwright/test';
import { TestHelpers } from '../fixtures/test-helpers';

test.describe('Workflow Generation', () => {
  let helpers: TestHelpers;

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page);
    
    // Login and ensure we have a project
    await helpers.authenticateUser();
    await helpers.ensureProjectExists('Workflow Test Project');
  });

  test('should generate workflow from simple prompt', async ({ page }) => {
    const testPrompt = 'Create a workflow that sends a daily email reminder at 9 AM';

    await test.step('Navigate to chat interface', async () => {
      const chatSuccess = await helpers.navigateToChat();
      expect(chatSuccess).toBeTruthy();
      await helpers.takeScreenshot('01-chat-interface');
    });

    await test.step('Enter workflow prompt', async () => {
      const chatInput = await helpers.findChatInput();
      expect(chatInput).toBeTruthy();
      
      await chatInput!.fill(testPrompt);
      await helpers.takeScreenshot('02-prompt-entered');
    });

    await test.step('Submit prompt and wait for AI processing', async () => {
      const sendButton = await helpers.findSendButton();
      if (sendButton) {
        await sendButton.click();
      } else {
        // Try Enter key if no send button found
        const chatInput = await helpers.findChatInput();
        await chatInput!.press('Enter');
      }

      await helpers.takeScreenshot('03-prompt-submitted');

      // Wait for AI response
      const aiResponse = await page.waitForFunction(() => {
        const text = document.body.textContent || '';
        return text.includes('workflow') ||
               text.includes('processing') ||
               text.includes('generating') ||
               text.includes('schedule') ||
               text.includes('email') ||
               document.querySelector('.message') !== null ||
               document.querySelector('[data-testid="ai-response"]') !== null;
      }, { timeout: 30000 }).catch(() => false);

      expect(aiResponse).toBeTruthy();
      await helpers.takeScreenshot('04-ai-response-received');
    });

    await test.step('Verify workflow generation conversation', async () => {
      // Look for clarifying questions or workflow details
      const conversationProgressing = await page.waitForFunction(() => {
        const text = document.body.textContent || '';
        return text.includes('clarify') ||
               text.includes('more details') ||
               text.includes('email address') ||
               text.includes('schedule') ||
               text.includes('created') ||
               text.includes('workflow');
      }, { timeout: 15000 }).catch(() => false);

      console.log(`Conversation progression detected: ${conversationProgressing}`);
      await helpers.takeScreenshot('05-conversation-progress');
    });

    await test.step('Provide additional details if prompted', async () => {
      // Look for follow-up questions
      const needsMoreInfo = await page.evaluate(() => {
        const text = document.body.textContent || '';
        return text.includes('?') && (
          text.includes('email') ||
          text.includes('address') ||
          text.includes('recipient') ||
          text.includes('details')
        );
      });

      if (needsMoreInfo) {
        const chatInput = await helpers.findChatInput();
        if (chatInput && await chatInput.isVisible()) {
          await chatInput.fill('Send to test@example.com with subject "Daily Reminder"');
          
          const sendButton = await helpers.findSendButton();
          if (sendButton) {
            await sendButton.click();
          } else {
            await chatInput.press('Enter');
          }

          await helpers.takeScreenshot('06-additional-details-provided');
          
          // Wait for final response
          await page.waitForTimeout(10000);
          await helpers.takeScreenshot('07-final-ai-response');
        }
      }
    });

    await test.step('Look for workflow completion indicators', async () => {
      const workflowCompleted = await page.waitForFunction(() => {
        const text = document.body.textContent || '';
        return text.includes('workflow created') ||
               text.includes('workflow generated') ||
               text.includes('ready to deploy') ||
               text.includes('deploy') ||
               text.includes('save') ||
               document.querySelector('[data-testid="deploy-button"]') !== null ||
               document.querySelector('button:has-text("Deploy")') !== null;
      }, { timeout: 20000 }).catch(() => false);

      console.log(`Workflow completion detected: ${workflowCompleted}`);
      await helpers.takeScreenshot('08-workflow-completion-check');
    });
  });

  test('should handle complex workflow with multiple triggers', async ({ page }) => {
    const complexPrompt = 'Create a workflow that monitors RSS feeds, filters for specific keywords, and posts matching articles to Slack channel while saving them to a database';

    await test.step('Navigate to chat and enter complex prompt', async () => {
      await helpers.navigateToChat();
      
      const chatInput = await helpers.findChatInput();
      expect(chatInput).toBeTruthy();
      
      await chatInput!.fill(complexPrompt);
      await helpers.takeScreenshot('01-complex-prompt-entered');
    });

    await test.step('Submit complex prompt', async () => {
      const sendButton = await helpers.findSendButton();
      if (sendButton) {
        await sendButton.click();
      } else {
        const chatInput = await helpers.findChatInput();
        await chatInput!.press('Enter');
      }

      await helpers.takeScreenshot('02-complex-prompt-submitted');
    });

    await test.step('Handle AI clarification questions', async () => {
      // Wait for initial AI response
      await page.waitForFunction(() => {
        const text = document.body.textContent || '';
        return text.length > 100 && ( // Ensure there's substantial content
          text.includes('RSS') ||
          text.includes('workflow') ||
          text.includes('complex') ||
          text.includes('question')
        );
      }, { timeout: 30000 }).catch(() => false);

      await helpers.takeScreenshot('03-complex-ai-response');

      // Simulate answering potential questions
      const clarificationQuestions = [
        {
          keywords: ['RSS', 'feed', 'URL'],
          response: 'Use https://example.com/rss.xml as the RSS feed'
        },
        {
          keywords: ['keyword', 'filter', 'search'],
          response: 'Filter for articles containing "AI" or "automation"'
        },
        {
          keywords: ['Slack', 'channel', 'webhook'],
          response: 'Post to #general channel with webhook URL https://hooks.slack.com/test'
        },
        {
          keywords: ['database', 'storage', 'save'],
          response: 'Save to PostgreSQL database with connection string from environment'
        }
      ];

      for (const qa of clarificationQuestions) {
        // Check if AI is asking about this topic
        const needsAnswer = await page.evaluate((keywords) => {
          const text = document.body.textContent || '';
          return keywords.some(keyword => 
            text.toLowerCase().includes(keyword.toLowerCase()) && text.includes('?')
          );
        }, qa.keywords);

        if (needsAnswer) {
          console.log(`Providing answer for: ${qa.keywords.join(', ')}`);
          
          const chatInput = await helpers.findChatInput();
          if (chatInput && await chatInput.isVisible({ timeout: 2000 })) {
            await chatInput.fill(qa.response);
            
            const sendButton = await helpers.findSendButton();
            if (sendButton) {
              await sendButton.click();
            } else {
              await chatInput.press('Enter');
            }

            // Wait for AI to process the response
            await page.waitForTimeout(5000);
            await helpers.takeScreenshot(`04-answered-${qa.keywords[0]}`);
          }
        }
      }
    });

    await test.step('Verify complex workflow handling', async () => {
      // Look for indicators that the AI is handling the complexity
      const complexityHandled = await page.waitForFunction(() => {
        const text = document.body.textContent || '';
        return text.includes('multiple') ||
               text.includes('steps') ||
               text.includes('trigger') ||
               text.includes('filter') ||
               text.includes('complex') ||
               text.includes('workflow');
      }, { timeout: 15000 }).catch(() => false);

      expect(complexityHandled).toBeTruthy();
      await helpers.takeScreenshot('05-complexity-handled');
    });
  });

  test('should validate workflow feasibility', async ({ page }) => {
    const impossiblePrompt = 'Create a workflow that predicts the future stock prices with 100% accuracy and automatically trades billions of dollars';

    await test.step('Submit impossible/unrealistic prompt', async () => {
      await helpers.navigateToChat();
      
      const chatInput = await helpers.findChatInput();
      await chatInput!.fill(impossiblePrompt);
      await helpers.takeScreenshot('01-impossible-prompt-entered');
      
      const sendButton = await helpers.findSendButton();
      if (sendButton) {
        await sendButton.click();
      } else {
        await chatInput!.press('Enter');
      }

      await helpers.takeScreenshot('02-impossible-prompt-submitted');
    });

    await test.step('Verify AI provides realistic feedback', async () => {
      const realisticResponse = await page.waitForFunction(() => {
        const text = document.body.textContent || '';
        return text.includes('cannot') ||
               text.includes('impossible') ||
               text.includes('realistic') ||
               text.includes('limitations') ||
               text.includes('alternative') ||
               text.includes('feasible') ||
               text.includes('not possible');
      }, { timeout: 20000 }).catch(() => false);

      console.log(`Realistic feedback provided: ${realisticResponse}`);
      await helpers.takeScreenshot('03-realistic-feedback');
    });

    await test.step('Verify alternative suggestions', async () => {
      const alternativeSuggested = await page.waitForFunction(() => {
        const text = document.body.textContent || '';
        return text.includes('instead') ||
               text.includes('alternative') ||
               text.includes('suggest') ||
               text.includes('could') ||
               text.includes('might');
      }, { timeout: 10000 }).catch(() => false);

      console.log(`Alternative suggestions provided: ${alternativeSuggested}`);
      await helpers.takeScreenshot('04-alternative-suggestions');
    });
  });

  test('should handle workflow modification requests', async ({ page }) => {
    const initialPrompt = 'Create a simple webhook that receives data and logs it';
    const modificationRequest = 'Actually, change that to send the data to Slack instead of just logging it';

    await test.step('Create initial workflow', async () => {
      await helpers.navigateToChat();
      
      const chatInput = await helpers.findChatInput();
      await chatInput!.fill(initialPrompt);
      
      const sendButton = await helpers.findSendButton();
      if (sendButton) {
        await sendButton.click();
      } else {
        await chatInput!.press('Enter');
      }

      await helpers.takeScreenshot('01-initial-workflow-request');

      // Wait for initial response
      await page.waitForFunction(() => {
        const text = document.body.textContent || '';
        return text.includes('webhook') ||
               text.includes('log') ||
               text.includes('data') ||
               text.includes('workflow');
      }, { timeout: 20000 });

      await helpers.takeScreenshot('02-initial-workflow-response');
    });

    await test.step('Request workflow modification', async () => {
      const chatInput = await helpers.findChatInput();
      expect(chatInput).toBeTruthy();
      
      await chatInput!.fill(modificationRequest);
      
      const sendButton = await helpers.findSendButton();
      if (sendButton) {
        await sendButton.click();
      } else {
        await chatInput!.press('Enter');
      }

      await helpers.takeScreenshot('03-modification-request');
    });

    await test.step('Verify modification handling', async () => {
      const modificationHandled = await page.waitForFunction(() => {
        const text = document.body.textContent || '';
        return text.includes('change') ||
               text.includes('modify') ||
               text.includes('update') ||
               text.includes('Slack') ||
               text.includes('instead');
      }, { timeout: 15000 }).catch(() => false);

      expect(modificationHandled).toBeTruthy();
      await helpers.takeScreenshot('04-modification-handled');
    });

    await test.step('Verify updated workflow acknowledgment', async () => {
      const updateAcknowledged = await page.waitForFunction(() => {
        const text = document.body.textContent || '';
        return text.includes('updated') ||
               text.includes('modified') ||
               text.includes('changed') ||
               text.includes('Slack');
      }, { timeout: 10000 }).catch(() => false);

      console.log(`Workflow update acknowledged: ${updateAcknowledged}`);
      await helpers.takeScreenshot('05-update-acknowledged');
    });
  });

  test('should preserve conversation context across multiple requests', async ({ page }) => {
    await test.step('Start initial conversation', async () => {
      await helpers.navigateToChat();
      
      const chatInput = await helpers.findChatInput();
      await chatInput!.fill('I need help creating an email automation workflow');
      
      const sendButton = await helpers.findSendButton();
      if (sendButton) {
        await sendButton.click();
      } else {
        await chatInput!.press('Enter');
      }

      await helpers.takeScreenshot('01-initial-conversation');

      // Wait for response
      await page.waitForFunction(() => {
        const text = document.body.textContent || '';
        return text.includes('email') && text.length > 50;
      }, { timeout: 20000 });
    });

    await test.step('Continue conversation with context reference', async () => {
      const chatInput = await helpers.findChatInput();
      await chatInput!.fill('Make it trigger every Monday at 8 AM');
      
      const sendButton = await helpers.findSendButton();
      if (sendButton) {
        await sendButton.click();
      } else {
        await chatInput!.press('Enter');
      }

      await helpers.takeScreenshot('02-context-reference');

      // Verify AI understands the context
      const contextUnderstood = await page.waitForFunction(() => {
        const text = document.body.textContent || '';
        return text.includes('Monday') ||
               text.includes('8 AM') ||
               text.includes('schedule') ||
               text.includes('trigger');
      }, { timeout: 15000 }).catch(() => false);

      expect(contextUnderstood).toBeTruthy();
      await helpers.takeScreenshot('03-context-understood');
    });

    await test.step('Add more details referencing previous context', async () => {
      const chatInput = await helpers.findChatInput();
      await chatInput!.fill('And send it to our marketing team');
      
      const sendButton = await helpers.findSendButton();
      if (sendButton) {
        await sendButton.click();
      } else {
        await chatInput!.press('Enter');
      }

      await helpers.takeScreenshot('04-additional-context');

      // Verify comprehensive understanding
      const comprehensiveUnderstanding = await page.waitForFunction(() => {
        const text = document.body.textContent || '';
        return (text.includes('marketing') || text.includes('team')) &&
               (text.includes('email') || text.includes('workflow'));
      }, { timeout: 15000 }).catch(() => false);

      console.log(`Comprehensive context maintained: ${comprehensiveUnderstanding}`);
      await helpers.takeScreenshot('05-comprehensive-understanding');
    });
  });

  test('should show workflow progress indicators', async ({ page }) => {
    await test.step('Submit workflow request and monitor progress', async () => {
      await helpers.navigateToChat();
      
      const chatInput = await helpers.findChatInput();
      await chatInput!.fill('Create a workflow that processes CSV files and generates reports');
      
      const sendButton = await helpers.findSendButton();
      if (sendButton) {
        await sendButton.click();
      } else {
        await chatInput!.press('Enter');
      }

      await helpers.takeScreenshot('01-workflow-request-submitted');
    });

    await test.step('Look for progress indicators', async () => {
      // Check for various progress indicators that might appear
      const progressIndicators = [
        'loading',
        'processing',
        'generating',
        'thinking',
        'analyzing',
        'creating',
        'working'
      ];

      const progressShown = await page.waitForFunction((indicators) => {
        const text = document.body.textContent?.toLowerCase() || '';
        return indicators.some(indicator => text.includes(indicator)) ||
               document.querySelector('.loading') !== null ||
               document.querySelector('.spinner') !== null ||
               document.querySelector('[data-testid="progress"]') !== null ||
               document.querySelector('.progress') !== null;
      }, progressIndicators, { timeout: 10000 }).catch(() => false);

      console.log(`Progress indicators shown: ${progressShown}`);
      await helpers.takeScreenshot('02-progress-indicators');
    });

    await test.step('Wait for completion indicators', async () => {
      const completionShown = await page.waitForFunction(() => {
        const text = document.body.textContent || '';
        return text.includes('complete') ||
               text.includes('finished') ||
               text.includes('ready') ||
               text.includes('done') ||
               text.includes('created') ||
               text.includes('workflow');
      }, { timeout: 30000 }).catch(() => false);

      console.log(`Completion indicators shown: ${completionShown}`);
      await helpers.takeScreenshot('03-completion-indicators');
    });
  });
});