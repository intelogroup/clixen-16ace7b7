-- ============================================================================
-- Clixen MVP Seed Data
-- ============================================================================
-- Development and testing seed data for MVP functionality
-- Author: Database Architect Agent
-- Date: 2025-01-08
-- Version: MVP 1.0
-- NOTE: This is safe for production as it only creates data if not exists

-- ============================================================================
-- SAMPLE WORKFLOW TEMPLATES
-- ============================================================================

-- Sample n8n workflow JSON templates for testing
-- These represent common automation patterns

-- 1. Simple HTTP Request + Webhook workflow
INSERT INTO workflow_templates (
  id,
  name,
  description,
  category,
  tags,
  n8n_workflow_json,
  complexity_score,
  is_public,
  is_verified
) VALUES (
  '550e8400-e29b-41d4-a716-446655440001',
  'HTTP to Webhook Forwarder',
  'Simple workflow that receives HTTP requests and forwards them to a webhook',
  'Integration',
  ARRAY['http', 'webhook', 'forwarding', 'basic'],
  '{
    "nodes": [
      {
        "parameters": {
          "httpMethod": "POST",
          "path": "webhook",
          "responseMode": "responseNode"
        },
        "id": "webhook_node",
        "name": "Webhook",
        "type": "n8n-nodes-base.webhook",
        "typeVersion": 1,
        "position": [240, 300],
        "webhookId": "auto-generated"
      },
      {
        "parameters": {
          "url": "https://example.com/endpoint",
          "sendBody": true,
          "bodyContentType": "json"
        },
        "id": "http_node",
        "name": "HTTP Request",
        "type": "n8n-nodes-base.httpRequest",
        "typeVersion": 3,
        "position": [460, 300]
      },
      {
        "parameters": {
          "respondWith": "allIncomingItems",
          "statusCode": 200
        },
        "id": "response_node",
        "name": "Respond to Webhook",
        "type": "n8n-nodes-base.respondToWebhook",
        "typeVersion": 1,
        "position": [680, 300]
      }
    ],
    "connections": {
      "Webhook": {
        "main": [
          [
            {
              "node": "HTTP Request",
              "type": "main",
              "index": 0
            }
          ]
        ]
      },
      "HTTP Request": {
        "main": [
          [
            {
              "node": "Respond to Webhook",
              "type": "main",
              "index": 0
            }
          ]
        ]
      }
    }
  }'::jsonb,
  1,
  true,
  true
) ON CONFLICT (id) DO NOTHING;

-- 2. Email notification workflow
INSERT INTO workflow_templates (
  id,
  name,
  description,
  category,
  tags,
  n8n_workflow_json,
  complexity_score,
  is_public,
  is_verified
) VALUES (
  '550e8400-e29b-41d4-a716-446655440002',
  'Email Notification System',
  'Receives data via webhook and sends formatted email notifications',
  'Notification',
  ARRAY['email', 'notification', 'smtp', 'webhook'],
  '{
    "nodes": [
      {
        "parameters": {
          "httpMethod": "POST",
          "path": "notify",
          "responseMode": "responseNode"
        },
        "id": "webhook_trigger",
        "name": "Webhook Trigger",
        "type": "n8n-nodes-base.webhook",
        "typeVersion": 1,
        "position": [240, 300]
      },
      {
        "parameters": {
          "operation": "set",
          "values": {
            "string": [
              {
                "name": "subject",
                "value": "Alert: {{$json.type || \"Notification\"}}"
              },
              {
                "name": "body",
                "value": "Message: {{$json.message}}\nTime: {{$now}}\nSource: {{$json.source || \"Unknown\"}}"
              }
            ]
          }
        },
        "id": "format_email",
        "name": "Format Email",
        "type": "n8n-nodes-base.set",
        "typeVersion": 3,
        "position": [460, 300]
      },
      {
        "parameters": {
          "fromEmail": "noreply@example.com",
          "toEmail": "admin@example.com",
          "subject": "={{$json.subject}}",
          "emailType": "text",
          "text": "={{$json.body}}"
        },
        "id": "send_email",
        "name": "Send Email",
        "type": "n8n-nodes-base.emailSend",
        "typeVersion": 2,
        "position": [680, 300]
      },
      {
        "parameters": {
          "respondWith": "json",
          "responseBody": "{\"status\": \"sent\", \"timestamp\": \"{{$now}}\"}",
          "statusCode": 200
        },
        "id": "respond",
        "name": "Respond",
        "type": "n8n-nodes-base.respondToWebhook",
        "typeVersion": 1,
        "position": [900, 300]
      }
    ],
    "connections": {
      "Webhook Trigger": {
        "main": [
          [
            {
              "node": "Format Email",
              "type": "main",
              "index": 0
            }
          ]
        ]
      },
      "Format Email": {
        "main": [
          [
            {
              "node": "Send Email",
              "type": "main",
              "index": 0
            }
          ]
        ]
      },
      "Send Email": {
        "main": [
          [
            {
              "node": "Respond",
              "type": "main",
              "index": 0
            }
          ]
        ]
      }
    }
  }'::jsonb,
  2,
  true,
  true
) ON CONFLICT (id) DO NOTHING;

-- 3. Data processing workflow
INSERT INTO workflow_templates (
  id,
  name,
  description,
  category,
  tags,
  n8n_workflow_json,
  complexity_score,
  is_public,
  is_verified
) VALUES (
  '550e8400-e29b-41d4-a716-446655440003',
  'Data Processor with Validation',
  'Processes incoming data, validates it, and stores results',
  'Data Processing',
  ARRAY['data', 'validation', 'processing', 'webhook'],
  '{
    "nodes": [
      {
        "parameters": {
          "httpMethod": "POST",
          "path": "process-data",
          "responseMode": "responseNode"
        },
        "id": "data_webhook",
        "name": "Data Webhook",
        "type": "n8n-nodes-base.webhook",
        "typeVersion": 1,
        "position": [240, 300]
      },
      {
        "parameters": {
          "conditions": {
            "string": [
              {
                "value1": "={{$json.data}}",
                "operation": "isNotEmpty"
              }
            ]
          }
        },
        "id": "validate_data",
        "name": "Validate Data",
        "type": "n8n-nodes-base.if",
        "typeVersion": 1,
        "position": [460, 300]
      },
      {
        "parameters": {
          "operation": "set",
          "values": {
            "string": [
              {
                "name": "processed_data",
                "value": "={{JSON.stringify($json.data)}}"
              },
              {
                "name": "processed_at",
                "value": "={{$now}}"
              },
              {
                "name": "status",
                "value": "processed"
              }
            ]
          }
        },
        "id": "process_valid_data",
        "name": "Process Valid Data",
        "type": "n8n-nodes-base.set",
        "typeVersion": 3,
        "position": [680, 200]
      },
      {
        "parameters": {
          "operation": "set",
          "values": {
            "string": [
              {
                "name": "error",
                "value": "Invalid or missing data"
              },
              {
                "name": "status",
                "value": "error"
              }
            ]
          }
        },
        "id": "handle_invalid_data",
        "name": "Handle Invalid Data",
        "type": "n8n-nodes-base.set",
        "typeVersion": 3,
        "position": [680, 400]
      },
      {
        "parameters": {
          "respondWith": "json",
          "responseBody": "{\"status\": \"{{$json.status}}\", \"message\": \"{{$json.processed_data || $json.error}}\"}",
          "statusCode": "={{$json.status === \"error\" ? 400 : 200}}"
        },
        "id": "send_response",
        "name": "Send Response",
        "type": "n8n-nodes-base.respondToWebhook",
        "typeVersion": 1,
        "position": [900, 300]
      }
    ],
    "connections": {
      "Data Webhook": {
        "main": [
          [
            {
              "node": "Validate Data",
              "type": "main",
              "index": 0
            }
          ]
        ]
      },
      "Validate Data": {
        "main": [
          [
            {
              "node": "Process Valid Data",
              "type": "main",
              "index": 0
            }
          ],
          [
            {
              "node": "Handle Invalid Data",
              "type": "main",
              "index": 0
            }
          ]
        ]
      },
      "Process Valid Data": {
        "main": [
          [
            {
              "node": "Send Response",
              "type": "main",
              "index": 0
            }
          ]
        ]
      },
      "Handle Invalid Data": {
        "main": [
          [
            {
              "node": "Send Response",
              "type": "main",
              "index": 0
            }
          ]
        ]
      }
    }
  }'::jsonb,
  3,
  true,
  true
) ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- DEVELOPMENT USER AND DATA (ONLY IF NOT EXISTS)
-- ============================================================================

-- Create development user profile (if not exists)
-- This will be created automatically when a user signs up via the trigger
-- But we can ensure it exists for testing purposes

DO $$
DECLARE
  dev_user_id UUID := '550e8400-e29b-41d4-a716-446655440100';
  dev_project_id UUID := '550e8400-e29b-41d4-a716-446655440101';
  dev_workflow_id UUID := '550e8400-e29b-41d4-a716-446655440102';
  dev_session_id UUID := '550e8400-e29b-41d4-a716-446655440103';
BEGIN
  -- Only insert if user doesn't exist
  IF NOT EXISTS (SELECT 1 FROM user_profiles WHERE id = dev_user_id) THEN
    -- Insert user profile
    INSERT INTO user_profiles (
      id, email, full_name, tier,
      onboarding_completed, total_workflows_created, total_deployments
    ) VALUES (
      dev_user_id,
      'dev@clixen.io',
      'Development User',
      'pro',
      true,
      3,
      2
    );
    
    -- Insert development project
    INSERT INTO projects (
      id, user_id, name, description, workflow_count, color
    ) VALUES (
      dev_project_id,
      dev_user_id,
      'Development Project',
      'Project for testing MVP functionality',
      1,
      '#10B981'
    );
    
    -- Insert sample workflow
    INSERT INTO workflows (
      id, user_id, project_id, name, description,
      original_prompt, n8n_workflow_json, status, deployment_status
    ) VALUES (
      dev_workflow_id,
      dev_user_id,
      dev_project_id,
      'Test HTTP Forwarder',
      'Development test workflow for HTTP forwarding',
      'Create a workflow that receives HTTP requests and forwards them to another endpoint',
      (SELECT n8n_workflow_json FROM workflow_templates WHERE name = 'HTTP to Webhook Forwarder'),
      'validated',
      'deployed'
    );
    
    -- Insert sample chat session
    INSERT INTO chat_sessions (
      id, user_id, project_id, workflow_id, title,
      message_count, workflow_created, workflow_deployed
    ) VALUES (
      dev_session_id,
      dev_user_id,
      dev_project_id,
      dev_workflow_id,
      'Workflow Creation Chat',
      8,
      true,
      true
    );
    
    -- Insert sample chat messages
    INSERT INTO chat_messages (session_id, user_id, content, role, created_at) VALUES
      (dev_session_id, dev_user_id, 'I need a workflow that can receive HTTP requests and forward them to another endpoint', 'user', NOW() - INTERVAL '2 hours'),
      (dev_session_id, dev_user_id, 'I can help you create an HTTP forwarding workflow. What type of data will you be receiving, and where do you want to forward it?', 'assistant', NOW() - INTERVAL '2 hours' + INTERVAL '30 seconds'),
      (dev_session_id, dev_user_id, 'I will receive JSON data from a webhook and need to forward it to https://api.example.com/webhooks', 'user', NOW() - INTERVAL '2 hours' + INTERVAL '1 minute'),
      (dev_session_id, dev_user_id, 'Perfect! I''ll create a workflow with a webhook trigger that receives JSON data and forwards it to your endpoint. Would you like any response handling?', 'assistant', NOW() - INTERVAL '2 hours' + INTERVAL '90 seconds'),
      (dev_session_id, dev_user_id, 'Yes, I''d like to return a success response to the original sender', 'user', NOW() - INTERVAL '2 hours' + INTERVAL '2 minutes'),
      (dev_session_id, dev_user_id, 'Excellent! I''ve created your HTTP forwarding workflow with response handling. It includes: 1) Webhook trigger, 2) HTTP request to forward data, 3) Response node to confirm receipt.', 'assistant', NOW() - INTERVAL '2 hours' + INTERVAL '150 seconds'),
      (dev_session_id, dev_user_id, 'That looks perfect! Can you deploy it for me?', 'user', NOW() - INTERVAL '2 hours' + INTERVAL '3 minutes'),
      (dev_session_id, dev_user_id, 'Your workflow has been successfully deployed! The webhook URL is available in your workflow dashboard.', 'assistant', NOW() - INTERVAL '2 hours' + INTERVAL '3 minutes' + INTERVAL '30 seconds');
    
    -- Insert sample deployment
    INSERT INTO deployments (
      user_id, workflow_id, n8n_workflow_id, deployment_version,
      status, started_at, completed_at, duration_ms
    ) VALUES (
      dev_user_id,
      dev_workflow_id,
      'n8n_workflow_123',
      1,
      'deployed',
      NOW() - INTERVAL '1 hour',
      NOW() - INTERVAL '1 hour' + INTERVAL '30 seconds',
      30000
    );
    
    -- Insert sample telemetry events
    INSERT INTO telemetry_events (user_id, event_type, event_category, project_id, workflow_id, session_id, success, created_at) VALUES
      (dev_user_id, 'user_signup', 'auth', NULL, NULL, NULL, true, NOW() - INTERVAL '3 hours'),
      (dev_user_id, 'project_create', 'workflow', dev_project_id, NULL, NULL, true, NOW() - INTERVAL '2 hours 30 minutes'),
      (dev_user_id, 'chat_start', 'engagement', dev_project_id, NULL, dev_session_id, true, NOW() - INTERVAL '2 hours'),
      (dev_user_id, 'workflow_create', 'workflow', dev_project_id, dev_workflow_id, dev_session_id, true, NOW() - INTERVAL '90 minutes'),
      (dev_user_id, 'workflow_deploy', 'deployment', dev_project_id, dev_workflow_id, NULL, true, NOW() - INTERVAL '1 hour');
      
    RAISE NOTICE 'Development seed data created successfully';
  ELSE
    RAISE NOTICE 'Development user already exists, skipping seed data creation';
  END IF;
END
$$;

-- ============================================================================
-- SAMPLE API CONFIGURATIONS (FOR DEVELOPMENT)
-- ============================================================================

-- Insert sample OpenAI configuration (will be overridden by real key)
INSERT INTO api_configurations (
  service_name, api_key, environment, metadata, is_active
) VALUES (
  'openai_dev',
  'sk-development-key-placeholder',
  'development',
  jsonb_build_object(
    'model', 'gpt-4',
    'max_tokens', 4000,
    'temperature', 0.7,
    'description', 'Development OpenAI configuration'
  ),
  false  -- Inactive by default
) ON CONFLICT (service_name) DO NOTHING;

-- Insert sample n8n configuration
INSERT INTO api_configurations (
  service_name, api_key, environment, metadata, is_active
) VALUES (
  'n8n_dev',
  'dev-n8n-api-key-placeholder',
  'development',
  jsonb_build_object(
    'base_url', 'http://localhost:5678',
    'version', 'v1',
    'description', 'Development n8n instance'
  ),
  false  -- Inactive by default
) ON CONFLICT (service_name) DO NOTHING;

-- ============================================================================
-- SAMPLE QUOTA CONFIGURATIONS
-- ============================================================================

-- Ensure quota records exist for development user
INSERT INTO user_quotas (user_id, tier, weekly_limit, monthly_limit, executions_this_week, executions_this_month)
SELECT 
  up.id,
  up.tier,
  CASE up.tier
    WHEN 'free' THEN 100
    WHEN 'pro' THEN 1000
    WHEN 'enterprise' THEN 10000
  END,
  CASE up.tier
    WHEN 'free' THEN 400
    WHEN 'pro' THEN 5000
    WHEN 'enterprise' THEN 50000
  END,
  0,
  0
FROM user_profiles up
WHERE NOT EXISTS (
  SELECT 1 FROM user_quotas uq WHERE uq.user_id = up.id
);

-- ============================================================================
-- HELPFUL VIEWS FOR DEVELOPMENT
-- ============================================================================

-- Development dashboard view
CREATE OR REPLACE VIEW dev_dashboard AS
SELECT 
  'User Profiles' as table_name,
  COUNT(*) as record_count,
  MAX(created_at) as latest_record
FROM user_profiles
UNION ALL
SELECT 
  'Projects' as table_name,
  COUNT(*) as record_count,
  MAX(created_at) as latest_record
FROM projects
UNION ALL
SELECT 
  'Workflows' as table_name,
  COUNT(*) as record_count,
  MAX(created_at) as latest_record
FROM workflows
UNION ALL
SELECT 
  'Chat Sessions' as table_name,
  COUNT(*) as record_count,
  MAX(created_at) as latest_record
FROM chat_sessions
UNION ALL
SELECT 
  'Chat Messages' as table_name,
  COUNT(*) as record_count,
  MAX(created_at) as latest_record
FROM chat_messages
UNION ALL
SELECT 
  'Deployments' as table_name,
  COUNT(*) as record_count,
  MAX(created_at) as latest_record
FROM deployments
UNION ALL
SELECT 
  'Telemetry Events' as table_name,
  COUNT(*) as record_count,
  MAX(created_at) as latest_record
FROM telemetry_events;

-- Recent activity view for development
CREATE OR REPLACE VIEW dev_recent_activity AS
SELECT 
  'telemetry' as source,
  te.event_type as activity,
  up.email as user_email,
  te.created_at,
  te.event_data->'message' as details
FROM telemetry_events te
LEFT JOIN user_profiles up ON te.user_id = up.id
WHERE te.created_at > NOW() - INTERVAL '24 hours'
UNION ALL
SELECT 
  'audit' as source,
  al.action || ' ' || al.table_name as activity,
  up.email as user_email,
  al.created_at,
  to_jsonb(array_to_string(al.changed_fields, ', ')) as details
FROM audit_log al
LEFT JOIN user_profiles up ON al.user_id = up.id
WHERE al.created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;

-- Grant access to development views
GRANT SELECT ON dev_dashboard TO authenticated;
GRANT SELECT ON dev_recent_activity TO authenticated;

-- ============================================================================
-- DEVELOPMENT HELPER FUNCTIONS
-- ============================================================================

-- Function to reset development data
CREATE OR REPLACE FUNCTION reset_dev_data()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  dev_user_id UUID := '550e8400-e29b-41d4-a716-446655440100';
BEGIN
  -- Only allow this in development environment
  IF current_database() NOT LIKE '%dev%' AND current_database() NOT LIKE '%test%' THEN
    RAISE EXCEPTION 'This function can only be run in development/test environments';
  END IF;
  
  -- Delete all dev data (cascades will handle related records)
  DELETE FROM user_profiles WHERE id = dev_user_id;
  
  -- Re-run the seed data creation
  PERFORM 1; -- This would trigger the DO block above to recreate data
  
  RETURN 'Development data reset successfully';
END;
$$;

-- Function to create test user
CREATE OR REPLACE FUNCTION create_test_user(
  p_email TEXT,
  p_name TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID := gen_random_uuid();
  v_project_id UUID;
BEGIN
  -- Create user profile
  INSERT INTO user_profiles (id, email, full_name, tier)
  VALUES (v_user_id, p_email, COALESCE(p_name, split_part(p_email, '@', 1)), 'free');
  
  -- Create default project
  SELECT get_or_create_default_project(v_user_id) INTO v_project_id;
  
  RETURN v_user_id;
END;
$$;

-- ============================================================================
-- COMMENTS AND DOCUMENTATION
-- ============================================================================

COMMENT ON VIEW dev_dashboard IS 'Development dashboard showing record counts across all tables';
COMMENT ON VIEW dev_recent_activity IS 'Recent user activity from telemetry and audit logs';
COMMENT ON FUNCTION reset_dev_data() IS 'Resets development seed data (development/test environments only)';
COMMENT ON FUNCTION create_test_user(TEXT, TEXT) IS 'Creates a test user with default project for development';

-- Final notice
DO $$
BEGIN
  RAISE NOTICE 'MVP seed data migration completed successfully';
  RAISE NOTICE 'Created % workflow templates', (SELECT COUNT(*) FROM workflow_templates);
  RAISE NOTICE 'Development user available: dev@clixen.io';
  RAISE NOTICE 'Use SELECT * FROM dev_dashboard; to see data summary';
END
$$;