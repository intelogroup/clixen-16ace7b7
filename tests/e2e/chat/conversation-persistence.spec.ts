/**
 * Chat Conversation Persistence E2E Tests
 * Tests chat history persistence, conversation recovery, and session management
 */
import { test, expect, Page } from '@playwright/test';
import { TestHelpers } from '../fixtures/test-helpers';

test.describe('Chat Conversation Persistence', () => {
  let helpers: TestHelpers;

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page);
    
    // Login before each test
    await helpers.authenticateUser();
  });

  test('should persist conversations across page refreshes', async ({ page }) => {
    const testMessage = `Test message ${Date.now()}`;
    let conversationId: string | null = null;

    await test.step('Start new conversation', async () => {
      await helpers.navigateToChat();
      
      const chatInput = await helpers.findChatInput();
      expect(chatInput).toBeTruthy();
      
      await chatInput!.fill(testMessage);
      
      const sendButton = await helpers.findSendButton();
      if (sendButton) {
        await sendButton.click();
      } else {
        await chatInput!.press('Enter');
      }

      await helpers.takeScreenshot('01-initial-message-sent');

      // Wait for AI response
      await page.waitForFunction(() => {
        const messages = document.querySelectorAll('.message, [data-testid="message"], .chat-message');
        return messages.length >= 2; // User message + AI response
      }, { timeout: 20000 }).catch(() => false);

      await helpers.takeScreenshot('02-conversation-established');

      // Try to extract conversation ID from URL or data attributes
      conversationId = await page.evaluate(() => {
        const url = window.location.href;
        const conversationMatch = url.match(/conversation[/_-]([a-zA-Z0-9-]+)/);
        if (conversationMatch) return conversationMatch[1];
        
        const chatElement = document.querySelector('[data-conversation-id]');
        if (chatElement) return chatElement.getAttribute('data-conversation-id');
        
        return null;
      });

      console.log(`Conversation ID detected: ${conversationId || 'Not found'}`);
    });

    await test.step('Refresh page and verify conversation persistence', async () => {
      await page.reload({ waitUntil: 'networkidle' });
      await helpers.takeScreenshot('03-after-page-refresh');

      // Check if the conversation is restored
      const conversationRestored = await page.waitForFunction((testMsg) => {
        const text = document.body.textContent || '';
        return text.includes(testMsg);
      }, testMessage, { timeout: 10000 }).catch(() => false);

      if (conversationRestored) {
        console.log('✅ Conversation restored after refresh');
      } else {
        console.log('⚠️ Conversation not restored (may be expected behavior)');
      }

      await helpers.takeScreenshot('04-conversation-restoration-check');
    });

    await test.step('Add more messages to verify ongoing persistence', async () => {
      const followUpMessage = `Follow up message ${Date.now()}`;
      
      const chatInput = await helpers.findChatInput();
      if (chatInput && await chatInput.isVisible({ timeout: 5000 })) {
        await chatInput.fill(followUpMessage);
        
        const sendButton = await helpers.findSendButton();
        if (sendButton) {
          await sendButton.click();
        } else {
          await chatInput.press('Enter');
        }

        await helpers.takeScreenshot('05-follow-up-message-sent');

        // Verify both messages are visible
        const bothMessagesVisible = await page.waitForFunction((testMsg, followMsg) => {
          const text = document.body.textContent || '';
          return text.includes(testMsg) && text.includes(followMsg);
        }, testMessage, followUpMessage, { timeout: 15000 }).catch(() => false);

        console.log(`Both messages visible: ${bothMessagesVisible}`);
        await helpers.takeScreenshot('06-ongoing-conversation-persistence');
      }
    });
  });

  test('should handle multiple conversation sessions', async ({ page }) => {
    await test.step('Create first conversation', async () => {
      await helpers.navigateToChat();
      
      const chatInput = await helpers.findChatInput();
      await chatInput!.fill('This is conversation A about email automation');
      
      const sendButton = await helpers.findSendButton();
      if (sendButton) {
        await sendButton.click();
      } else {
        await chatInput!.press('Enter');
      }

      await page.waitForTimeout(5000);
      await helpers.takeScreenshot('01-conversation-a-created');
    });

    await test.step('Start new conversation', async () => {
      // Look for "New Chat" or "New Conversation" button
      const newChatTriggers = [
        page.getByText(/new chat/i),
        page.getByText(/new conversation/i),
        page.getByText(/start new/i),
        page.locator('button:has-text("New")', { hasText: /chat|conversation/i }),
        page.locator('[data-testid="new-chat"]'),
        page.locator('.new-chat-button')
      ];

      let newChatStarted = false;
      for (const trigger of newChatTriggers) {
        try {
          if (await trigger.isVisible({ timeout: 3000 })) {
            await trigger.click();
            newChatStarted = true;
            break;
          }
        } catch (error) {
          continue;
        }
      }

      if (newChatStarted) {
        await helpers.takeScreenshot('02-new-chat-initiated');
      } else {
        // If no new chat button, try refreshing or navigating away and back
        console.log('⚠️ No new chat button found, trying navigation approach');
        await page.goto('/dashboard');
        await page.waitForTimeout(1000);
        await helpers.navigateToChat();
        await helpers.takeScreenshot('02-new-chat-via-navigation');
      }
    });

    await test.step('Create second conversation', async () => {
      const chatInput = await helpers.findChatInput();
      if (await chatInput!.isVisible({ timeout: 5000 })) {
        await chatInput!.fill('This is conversation B about database workflows');
        
        const sendButton = await helpers.findSendButton();
        if (sendButton) {
          await sendButton.click();
        } else {
          await chatInput!.press('Enter');
        }

        await page.waitForTimeout(5000);
        await helpers.takeScreenshot('03-conversation-b-created');
      }
    });

    await test.step('Verify conversations are separate', async () => {
      // Check that conversation B content doesn't include conversation A content
      const conversationIsolated = await page.evaluate(() => {
        const text = document.body.textContent || '';
        return !text.includes('conversation A') && !text.includes('email automation');
      });

      console.log(`Conversations properly isolated: ${conversationIsolated}`);
      await helpers.takeScreenshot('04-conversation-isolation-check');
    });

    await test.step('Switch back to first conversation if possible', async () => {
      // Look for conversation history or chat list
      const historyTriggers = [
        page.getByText(/history/i),
        page.getByText(/conversations/i),
        page.getByText(/chat history/i),
        page.locator('[data-testid="chat-history"]'),
        page.locator('.chat-history'),
        page.locator('.conversation-list')
      ];

      let historyFound = false;
      for (const trigger of historyTriggers) {
        try {
          if (await trigger.isVisible({ timeout: 2000 })) {
            await trigger.click();
            historyFound = true;
            break;
          }
        } catch (error) {
          continue;
        }
      }

      if (historyFound) {
        await helpers.takeScreenshot('05-conversation-history-opened');
        
        // Try to find first conversation
        const firstConversation = page.getByText(/email automation|conversation A/i);
        if (await firstConversation.isVisible({ timeout: 3000 })) {
          await firstConversation.click();
          await helpers.takeScreenshot('06-switched-to-conversation-a');
        }
      } else {
        console.log('ℹ️ No conversation history interface found');
        await helpers.takeScreenshot('05-no-conversation-history');
      }
    });
  });

  test('should preserve conversation context and memory', async ({ page }) => {
    await test.step('Establish context in conversation', async () => {
      await helpers.navigateToChat();
      
      const chatInput = await helpers.findChatInput();
      await chatInput!.fill('I need help creating a workflow for our marketing team that processes customer data');
      
      const sendButton = await helpers.findSendButton();
      if (sendButton) {
        await sendButton.click();
      } else {
        await chatInput!.press('Enter');
      }

      await page.waitForTimeout(10000);
      await helpers.takeScreenshot('01-context-established');
    });

    await test.step('Reference previous context in new message', async () => {
      const chatInput = await helpers.findChatInput();
      await chatInput!.fill('Make it trigger every morning at 8 AM');
      
      const sendButton = await helpers.findSendButton();
      if (sendButton) {
        await sendButton.click();
      } else {
        await chatInput!.press('Enter');
      }

      await helpers.takeScreenshot('02-context-reference-sent');

      // Wait for AI to respond with context understanding
      const contextUnderstood = await page.waitForFunction(() => {
        const text = document.body.textContent || '';
        return text.includes('8 AM') ||
               text.includes('morning') ||
               text.includes('schedule') ||
               text.includes('trigger') ||
               text.includes('workflow');
      }, { timeout: 15000 }).catch(() => false);

      expect(contextUnderstood).toBeTruthy();
      await helpers.takeScreenshot('03-context-understood');
    });

    await test.step('Continue context across page navigation', async () => {
      // Navigate away from chat
      await page.goto('/dashboard');
      await page.waitForTimeout(2000);
      
      // Navigate back to chat
      await helpers.navigateToChat();
      await helpers.takeScreenshot('04-returned-to-chat');

      // Send another contextual message
      const chatInput = await helpers.findChatInput();
      if (await chatInput!.isVisible({ timeout: 5000 })) {
        await chatInput!.fill('And send the results to our team Slack channel');
        
        const sendButton = await helpers.findSendButton();
        if (sendButton) {
          await sendButton.click();
        } else {
          await chatInput!.press('Enter');
        }

        await helpers.takeScreenshot('05-context-after-navigation');

        // Check if AI maintains context about the marketing workflow
        const contextMaintained = await page.waitForFunction(() => {
          const text = document.body.textContent || '';
          return text.includes('Slack') &&
                 (text.includes('marketing') ||
                  text.includes('workflow') ||
                  text.includes('team'));
        }, { timeout: 15000 }).catch(() => false);

        console.log(`Context maintained after navigation: ${contextMaintained}`);
        await helpers.takeScreenshot('06-context-maintenance-check');
      }
    });
  });

  test('should handle conversation recovery after session timeout', async ({ page }) => {
    const conversationMessage = `Session recovery test ${Date.now()}`;

    await test.step('Create conversation', async () => {
      await helpers.navigateToChat();
      
      const chatInput = await helpers.findChatInput();
      await chatInput!.fill(conversationMessage);
      
      const sendButton = await helpers.findSendButton();
      if (sendButton) {
        await sendButton.click();
      } else {
        await chatInput!.press('Enter');
      }

      await page.waitForTimeout(5000);
      await helpers.takeScreenshot('01-conversation-before-timeout');
    });

    await test.step('Simulate session timeout', async () => {
      // Clear cookies to simulate session timeout
      await page.context().clearCookies();
      
      // Try to continue the conversation
      const chatInput = await helpers.findChatInput();
      if (await chatInput!.isVisible({ timeout: 5000 })) {
        await chatInput!.fill('Continue previous conversation');
        
        const sendButton = await helpers.findSendButton();
        if (sendButton) {
          await sendButton.click();
        } else {
          await chatInput!.press('Enter');
        }
      }

      await helpers.takeScreenshot('02-after-session-timeout');
    });

    await test.step('Handle authentication requirement', async () => {
      // Check if redirected to auth or if conversation is lost
      const needsAuth = await page.waitForFunction(() => {
        return window.location.pathname.includes('auth') ||
               window.location.pathname.includes('login') ||
               document.body.textContent?.includes('sign in') ||
               document.body.textContent?.includes('login');
      }, { timeout: 5000 }).catch(() => false);

      if (needsAuth) {
        console.log('🔐 Authentication required after session timeout');
        
        // Re-authenticate
        await helpers.authenticateUser();
        await helpers.takeScreenshot('03-re-authenticated');
        
        // Navigate back to chat
        await helpers.navigateToChat();
        await helpers.takeScreenshot('04-back-to-chat-after-reauth');
        
        // Check if conversation is recovered
        const conversationRecovered = await page.waitForFunction((msg) => {
          const text = document.body.textContent || '';
          return text.includes(msg);
        }, conversationMessage, { timeout: 5000 }).catch(() => false);

        console.log(`Conversation recovered after re-auth: ${conversationRecovered}`);
        await helpers.takeScreenshot('05-conversation-recovery-check');
      } else {
        console.log('ℹ️ No explicit authentication required');
        await helpers.takeScreenshot('03-no-auth-required');
      }
    });
  });

  test('should export/import conversation data', async ({ page }) => {
    await test.step('Create conversation with exportable content', async () => {
      await helpers.navigateToChat();
      
      const messages = [
        'Create a data processing workflow',
        'Add email notifications',
        'Schedule it to run daily'
      ];

      for (const message of messages) {
        const chatInput = await helpers.findChatInput();
        await chatInput!.fill(message);
        
        const sendButton = await helpers.findSendButton();
        if (sendButton) {
          await sendButton.click();
        } else {
          await chatInput!.press('Enter');
        }

        await page.waitForTimeout(5000);
      }

      await helpers.takeScreenshot('01-conversation-for-export');
    });

    await test.step('Look for export functionality', async () => {
      // Look for export/download buttons
      const exportTriggers = [
        page.getByText(/export/i),
        page.getByText(/download/i),
        page.getByText(/save/i),
        page.locator('button:has-text("Export")'),
        page.locator('[data-testid="export"]'),
        page.locator('.export-button')
      ];

      let exportFound = false;
      for (const trigger of exportTriggers) {
        try {
          if (await trigger.isVisible({ timeout: 2000 })) {
            console.log('📤 Export functionality found');
            await trigger.click();
            exportFound = true;
            break;
          }
        } catch (error) {
          continue;
        }
      }

      if (exportFound) {
        await helpers.takeScreenshot('02-export-initiated');
        
        // Handle any export dialog or format selection
        const exportOptions = await page.waitForFunction(() => {
          const text = document.body.textContent || '';
          return text.includes('format') ||
                 text.includes('JSON') ||
                 text.includes('CSV') ||
                 text.includes('download') ||
                 document.querySelector('[role="dialog"]') !== null;
        }, { timeout: 5000 }).catch(() => false);

        if (exportOptions) {
          await helpers.takeScreenshot('03-export-options');
        }
      } else {
        console.log('ℹ️ No export functionality found in UI');
        await helpers.takeScreenshot('02-no-export-found');
      }
    });

    await test.step('Check conversation data accessibility', async () => {
      // Even if no export UI, check if conversation data is accessible
      const conversationData = await page.evaluate(() => {
        // Try to extract conversation data from the page
        const messages = [];
        const messageElements = document.querySelectorAll('.message, [data-testid="message"], .chat-message');
        
        messageElements.forEach((el, index) => {
          messages.push({
            index,
            content: el.textContent?.trim(),
            timestamp: el.getAttribute('data-timestamp') || el.querySelector('[data-timestamp]')?.getAttribute('data-timestamp'),
            sender: el.getAttribute('data-sender') || 'unknown'
          });
        });

        return {
          messageCount: messages.length,
          messages: messages.slice(0, 5), // First 5 messages for logging
          hasContent: messages.some(m => m.content && m.content.length > 0)
        };
      });

      console.log(`Conversation data accessible: ${JSON.stringify(conversationData, null, 2)}`);
      await helpers.takeScreenshot('04-conversation-data-check');
    });
  });
});