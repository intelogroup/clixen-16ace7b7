export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      ai_agent_states: {
        Row: {
          agent_type: string
          id: string
          session_id: string
          state: Json | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          agent_type: string
          id?: string
          session_id: string
          state?: Json | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          agent_type?: string
          id?: string
          session_id?: string
          state?: Json | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_agent_states_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "ai_chat_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_chat_config: {
        Row: {
          config_type: string
          created_at: string | null
          daily_cost_limit_cents: number | null
          default_model: string | null
          id: string
          max_cost_per_request_cents: number | null
          max_tokens: number | null
          openai_api_key: string | null
          requests_per_hour: number | null
          requests_per_minute: number | null
          temperature: number | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          config_type?: string
          created_at?: string | null
          daily_cost_limit_cents?: number | null
          default_model?: string | null
          id?: string
          max_cost_per_request_cents?: number | null
          max_tokens?: number | null
          openai_api_key?: string | null
          requests_per_hour?: number | null
          requests_per_minute?: number | null
          temperature?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          config_type?: string
          created_at?: string | null
          daily_cost_limit_cents?: number | null
          default_model?: string | null
          id?: string
          max_cost_per_request_cents?: number | null
          max_tokens?: number | null
          openai_api_key?: string | null
          requests_per_hour?: number | null
          requests_per_minute?: number | null
          temperature?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      ai_chat_messages: {
        Row: {
          agent_metadata: Json | null
          agent_status: string | null
          agent_type: string | null
          content: string
          cost_cents: number | null
          created_at: string | null
          id: string
          metadata: Json | null
          model: string | null
          processing_time_ms: number | null
          role: string
          session_id: string
          token_count: number | null
          user_id: string
        }
        Insert: {
          agent_metadata?: Json | null
          agent_status?: string | null
          agent_type?: string | null
          content: string
          cost_cents?: number | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          model?: string | null
          processing_time_ms?: number | null
          role: string
          session_id: string
          token_count?: number | null
          user_id: string
        }
        Update: {
          agent_metadata?: Json | null
          agent_status?: string | null
          agent_type?: string | null
          content?: string
          cost_cents?: number | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          model?: string | null
          processing_time_ms?: number | null
          role?: string
          session_id?: string
          token_count?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_chat_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "ai_chat_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_chat_rate_limits: {
        Row: {
          cost_this_day_cents: number | null
          day_window: string | null
          hour_window: string | null
          id: string
          minute_window: string | null
          request_type: string
          requests_this_day: number | null
          requests_this_hour: number | null
          requests_this_minute: number | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          cost_this_day_cents?: number | null
          day_window?: string | null
          hour_window?: string | null
          id?: string
          minute_window?: string | null
          request_type?: string
          requests_this_day?: number | null
          requests_this_hour?: number | null
          requests_this_minute?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          cost_this_day_cents?: number | null
          day_window?: string | null
          hour_window?: string | null
          id?: string
          minute_window?: string | null
          request_type?: string
          requests_this_day?: number | null
          requests_this_hour?: number | null
          requests_this_minute?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      ai_chat_sessions: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          metadata: Json | null
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          metadata?: Json | null
          title?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          metadata?: Json | null
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      api_configurations: {
        Row: {
          api_key: string
          created_at: string | null
          id: string
          is_active: boolean | null
          service_name: string
          updated_at: string | null
        }
        Insert: {
          api_key: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          service_name: string
          updated_at?: string | null
        }
        Update: {
          api_key?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          service_name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      api_quotas: {
        Row: {
          api_name: string
          cost_per_unit: number | null
          created_at: string | null
          daily_limit: number | null
          features: Json | null
          id: string
          monthly_limit: number | null
          rate_limit_per_minute: number | null
          tier: string | null
          updated_at: string | null
        }
        Insert: {
          api_name: string
          cost_per_unit?: number | null
          created_at?: string | null
          daily_limit?: number | null
          features?: Json | null
          id?: string
          monthly_limit?: number | null
          rate_limit_per_minute?: number | null
          tier?: string | null
          updated_at?: string | null
        }
        Update: {
          api_name?: string
          cost_per_unit?: number | null
          created_at?: string | null
          daily_limit?: number | null
          features?: Json | null
          id?: string
          monthly_limit?: number | null
          rate_limit_per_minute?: number | null
          tier?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      api_usage: {
        Row: {
          api_name: string
          cost_units: number | null
          created_at: string | null
          endpoint: string | null
          id: string
          metadata: Json | null
          period_end: string | null
          period_start: string | null
          tokens_used: number | null
          usage_count: number | null
          user_id: string | null
        }
        Insert: {
          api_name: string
          cost_units?: number | null
          created_at?: string | null
          endpoint?: string | null
          id?: string
          metadata?: Json | null
          period_end?: string | null
          period_start?: string | null
          tokens_used?: number | null
          usage_count?: number | null
          user_id?: string | null
        }
        Update: {
          api_name?: string
          cost_units?: number | null
          created_at?: string | null
          endpoint?: string | null
          id?: string
          metadata?: Json | null
          period_end?: string | null
          period_start?: string | null
          tokens_used?: number | null
          usage_count?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      conversations: {
        Row: {
          created_at: string
          id: string
          last_message_at: string | null
          messages: Json | null
          status: string | null
          title: string | null
          updated_at: string
          user_id: string
          workflow_confirmed: boolean | null
          workflow_summary: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          last_message_at?: string | null
          messages?: Json | null
          status?: string | null
          title?: string | null
          updated_at?: string
          user_id: string
          workflow_confirmed?: boolean | null
          workflow_summary?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          last_message_at?: string | null
          messages?: Json | null
          status?: string | null
          title?: string | null
          updated_at?: string
          user_id?: string
          workflow_confirmed?: boolean | null
          workflow_summary?: string | null
        }
        Relationships: []
      }
      customer_billing: {
        Row: {
          address: Json | null
          created_at: string | null
          email: string
          id: string
          name: string | null
          phone: string | null
          stripe_customer_id: string
          tax_ids: Json | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          address?: Json | null
          created_at?: string | null
          email: string
          id?: string
          name?: string | null
          phone?: string | null
          stripe_customer_id: string
          tax_ids?: Json | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          address?: Json | null
          created_at?: string | null
          email?: string
          id?: string
          name?: string | null
          phone?: string | null
          stripe_customer_id?: string
          tax_ids?: Json | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      execution_logs: {
        Row: {
          created_at: string
          duration: number | null
          error_message: string | null
          execution_id: string
          id: number
          mode: string
          node_count: number | null
          retry_of: string | null
          started_at: string
          status: string
          stopped_at: string | null
          updated_at: string
          workflow_id: string
          workflow_name: string
        }
        Insert: {
          created_at?: string
          duration?: number | null
          error_message?: string | null
          execution_id: string
          id?: number
          mode?: string
          node_count?: number | null
          retry_of?: string | null
          started_at: string
          status: string
          stopped_at?: string | null
          updated_at?: string
          workflow_id: string
          workflow_name: string
        }
        Update: {
          created_at?: string
          duration?: number | null
          error_message?: string | null
          execution_id?: string
          id?: number
          mode?: string
          node_count?: number | null
          retry_of?: string | null
          started_at?: string
          status?: string
          stopped_at?: string | null
          updated_at?: string
          workflow_id?: string
          workflow_name?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          metadata: Json | null
          role: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          metadata?: Json | null
          role: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      monitoring_alerts: {
        Row: {
          acknowledged: boolean
          acknowledged_at: string | null
          acknowledged_by: string | null
          alert_type: string
          created_at: string
          execution_id: string | null
          id: number
          message: string
          metadata: Json | null
          resolved: boolean
          resolved_at: string | null
          severity: string
          title: string
          workflow_id: string | null
        }
        Insert: {
          acknowledged?: boolean
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          alert_type: string
          created_at?: string
          execution_id?: string | null
          id?: number
          message: string
          metadata?: Json | null
          resolved?: boolean
          resolved_at?: string | null
          severity?: string
          title: string
          workflow_id?: string | null
        }
        Update: {
          acknowledged?: boolean
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          alert_type?: string
          created_at?: string
          execution_id?: string | null
          id?: number
          message?: string
          metadata?: Json | null
          resolved?: boolean
          resolved_at?: string | null
          severity?: string
          title?: string
          workflow_id?: string | null
        }
        Relationships: []
      }
      monitoring_metrics: {
        Row: {
          active_workflows: number
          avg_execution_time: number
          created_at: string
          failed_executions_24h: number
          id: number
          running_executions: number
          successful_executions_24h: number
          system_health: string
          timestamp: string
          total_workflows: number
          updated_at: string
        }
        Insert: {
          active_workflows?: number
          avg_execution_time?: number
          created_at?: string
          failed_executions_24h?: number
          id?: number
          running_executions?: number
          successful_executions_24h?: number
          system_health?: string
          timestamp?: string
          total_workflows?: number
          updated_at?: string
        }
        Update: {
          active_workflows?: number
          avg_execution_time?: number
          created_at?: string
          failed_executions_24h?: number
          id?: number
          running_executions?: number
          successful_executions_24h?: number
          system_health?: string
          timestamp?: string
          total_workflows?: number
          updated_at?: string
        }
        Relationships: []
      }
      n8n_cloud_config: {
        Row: {
          api_key_name: string | null
          base_url_name: string | null
          created_at: string | null
          current_execution_count: number | null
          current_workflow_count: number | null
          execution_limit: number | null
          id: string
          instance_url: string
          is_active: boolean | null
          last_reset: string | null
          max_workflows: number | null
        }
        Insert: {
          api_key_name?: string | null
          base_url_name?: string | null
          created_at?: string | null
          current_execution_count?: number | null
          current_workflow_count?: number | null
          execution_limit?: number | null
          id?: string
          instance_url: string
          is_active?: boolean | null
          last_reset?: string | null
          max_workflows?: number | null
        }
        Update: {
          api_key_name?: string | null
          base_url_name?: string | null
          created_at?: string | null
          current_execution_count?: number | null
          current_workflow_count?: number | null
          execution_limit?: number | null
          id?: string
          instance_url?: string
          is_active?: boolean | null
          last_reset?: string | null
          max_workflows?: number | null
        }
        Relationships: []
      }
      oauth_audit_log: {
        Row: {
          action: string
          created_at: string | null
          id: string
          ip_address: unknown | null
          metadata: Json | null
          service: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          id?: string
          ip_address?: unknown | null
          metadata?: Json | null
          service: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          id?: string
          ip_address?: unknown | null
          metadata?: Json | null
          service?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      oauth_flow_states: {
        Row: {
          created_at: string | null
          expires_at: string | null
          id: string
          redirect_url: string | null
          requested_scopes: string[] | null
          service: string
          state_code: string
          user_id: string | null
          workflow_context: Json | null
        }
        Insert: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          redirect_url?: string | null
          requested_scopes?: string[] | null
          service: string
          state_code: string
          user_id?: string | null
          workflow_context?: Json | null
        }
        Update: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          redirect_url?: string | null
          requested_scopes?: string[] | null
          service?: string
          state_code?: string
          user_id?: string | null
          workflow_context?: Json | null
        }
        Relationships: []
      }
      openai_configurations: {
        Row: {
          config_type: string
          created_at: string | null
          daily_cost_limit_cents: number | null
          default_model: string
          id: string
          max_tokens: number | null
          requests_per_hour: number | null
          requests_per_minute: number | null
          temperature: number | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          config_type?: string
          created_at?: string | null
          daily_cost_limit_cents?: number | null
          default_model?: string
          id?: string
          max_tokens?: number | null
          requests_per_hour?: number | null
          requests_per_minute?: number | null
          temperature?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          config_type?: string
          created_at?: string | null
          daily_cost_limit_cents?: number | null
          default_model?: string
          id?: string
          max_tokens?: number | null
          requests_per_hour?: number | null
          requests_per_minute?: number | null
          temperature?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      plan_limits: {
        Row: {
          features: string[] | null
          max_credentials: number
          max_executions: number
          max_workflows: number
          plan_type: string
          price_monthly: number | null
        }
        Insert: {
          features?: string[] | null
          max_credentials: number
          max_executions: number
          max_workflows: number
          plan_type: string
          price_monthly?: number | null
        }
        Update: {
          features?: string[] | null
          max_credentials?: number
          max_executions?: number
          max_workflows?: number
          plan_type?: string
          price_monthly?: number | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string
          execution_count: number | null
          full_name: string | null
          id: string
          last_execution_reset: string | null
          plan_type: string | null
          preferences: Json | null
          subscription_tier: string | null
          updated_at: string | null
          usage_stats: Json | null
          workflow_count: number | null
        }
        Insert: {
          created_at?: string | null
          email: string
          execution_count?: number | null
          full_name?: string | null
          id: string
          last_execution_reset?: string | null
          plan_type?: string | null
          preferences?: Json | null
          subscription_tier?: string | null
          updated_at?: string | null
          usage_stats?: Json | null
          workflow_count?: number | null
        }
        Update: {
          created_at?: string | null
          email?: string
          execution_count?: number | null
          full_name?: string | null
          id?: string
          last_execution_reset?: string | null
          plan_type?: string | null
          preferences?: Json | null
          subscription_tier?: string | null
          updated_at?: string | null
          usage_stats?: Json | null
          workflow_count?: number | null
        }
        Relationships: []
      }
      queue_errors: {
        Row: {
          created_at: string | null
          error_message: string
          id: string
          queue_name: string
        }
        Insert: {
          created_at?: string | null
          error_message: string
          id?: string
          queue_name: string
        }
        Update: {
          created_at?: string | null
          error_message?: string
          id?: string
          queue_name?: string
        }
        Relationships: []
      }
      subscription_plans: {
        Row: {
          amount: number
          api_calls_limit: number | null
          created_at: string | null
          currency: string | null
          description: string | null
          execution_limit: number | null
          features: Json | null
          id: string
          interval_count: number | null
          interval_type: string
          is_active: boolean | null
          is_popular: boolean | null
          name: string
          sort_order: number | null
          stripe_price_id: string
          stripe_product_id: string
          team_members_limit: number | null
          token_limit: number | null
          trial_period_days: number | null
          updated_at: string | null
          workflow_limit: number | null
        }
        Insert: {
          amount: number
          api_calls_limit?: number | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          execution_limit?: number | null
          features?: Json | null
          id?: string
          interval_count?: number | null
          interval_type: string
          is_active?: boolean | null
          is_popular?: boolean | null
          name: string
          sort_order?: number | null
          stripe_price_id: string
          stripe_product_id: string
          team_members_limit?: number | null
          token_limit?: number | null
          trial_period_days?: number | null
          updated_at?: string | null
          workflow_limit?: number | null
        }
        Update: {
          amount?: number
          api_calls_limit?: number | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          execution_limit?: number | null
          features?: Json | null
          id?: string
          interval_count?: number | null
          interval_type?: string
          is_active?: boolean | null
          is_popular?: boolean | null
          name?: string
          sort_order?: number | null
          stripe_price_id?: string
          stripe_product_id?: string
          team_members_limit?: number | null
          token_limit?: number | null
          trial_period_days?: number | null
          updated_at?: string | null
          workflow_limit?: number | null
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          amount: number
          cancel_at_period_end: boolean | null
          canceled_at: string | null
          created_at: string | null
          currency: string | null
          current_period_end: string
          current_period_start: string
          id: string
          metadata: Json | null
          plan_id: string
          status: string
          stripe_customer_id: string
          stripe_subscription_id: string
          trial_end: string | null
          trial_start: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          amount: number
          cancel_at_period_end?: boolean | null
          canceled_at?: string | null
          created_at?: string | null
          currency?: string | null
          current_period_end: string
          current_period_start: string
          id?: string
          metadata?: Json | null
          plan_id: string
          status: string
          stripe_customer_id: string
          stripe_subscription_id: string
          trial_end?: string | null
          trial_start?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          cancel_at_period_end?: boolean | null
          canceled_at?: string | null
          created_at?: string | null
          currency?: string | null
          current_period_end?: string
          current_period_start?: string
          id?: string
          metadata?: Json | null
          plan_id?: string
          status?: string
          stripe_customer_id?: string
          stripe_subscription_id?: string
          trial_end?: string | null
          trial_start?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      usage_tracking: {
        Row: {
          event_type: string
          id: string
          metadata: Json | null
          timestamp: string | null
          user_id: string | null
          workflow_id: string | null
        }
        Insert: {
          event_type: string
          id?: string
          metadata?: Json | null
          timestamp?: string | null
          user_id?: string | null
          workflow_id?: string | null
        }
        Update: {
          event_type?: string
          id?: string
          metadata?: Json | null
          timestamp?: string | null
          user_id?: string | null
          workflow_id?: string | null
        }
        Relationships: []
      }
      user_credentials: {
        Row: {
          created_at: string | null
          credential_type: string
          encrypted_credentials: Json
          expires_at: string | null
          id: string
          scopes: string[] | null
          service_name: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          credential_type: string
          encrypted_credentials: Json
          expires_at?: string | null
          id?: string
          scopes?: string[] | null
          service_name: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          credential_type?: string
          encrypted_credentials?: Json
          expires_at?: string | null
          id?: string
          scopes?: string[] | null
          service_name?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_oauth_tokens: {
        Row: {
          access_token: string
          created_at: string | null
          expires_at: string | null
          id: string
          metadata: Json | null
          refresh_token: string | null
          scopes: string[] | null
          service: string
          token_type: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          access_token: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          metadata?: Json | null
          refresh_token?: string | null
          scopes?: string[] | null
          service: string
          token_type?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          access_token?: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          metadata?: Json | null
          refresh_token?: string | null
          scopes?: string[] | null
          service?: string
          token_type?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      user_rate_limits: {
        Row: {
          action_type: string
          count: number | null
          created_at: string | null
          expires_at: string
          id: string
          user_id: string
          window_start: string | null
        }
        Insert: {
          action_type: string
          count?: number | null
          created_at?: string | null
          expires_at: string
          id?: string
          user_id: string
          window_start?: string | null
        }
        Update: {
          action_type?: string
          count?: number | null
          created_at?: string | null
          expires_at?: string
          id?: string
          user_id?: string
          window_start?: string | null
        }
        Relationships: []
      }
      user_workflows: {
        Row: {
          created_at: string | null
          execution_count: number | null
          id: string
          last_executed: string | null
          n8n_workflow_id: string
          status: string | null
          tags: string[] | null
          user_id: string | null
          workflow_name: string
          workflow_short_id: string | null
          workflow_type: string | null
        }
        Insert: {
          created_at?: string | null
          execution_count?: number | null
          id?: string
          last_executed?: string | null
          n8n_workflow_id: string
          status?: string | null
          tags?: string[] | null
          user_id?: string | null
          workflow_name: string
          workflow_short_id?: string | null
          workflow_type?: string | null
        }
        Update: {
          created_at?: string | null
          execution_count?: number | null
          id?: string
          last_executed?: string | null
          n8n_workflow_id?: string
          status?: string | null
          tags?: string[] | null
          user_id?: string | null
          workflow_name?: string
          workflow_short_id?: string | null
          workflow_type?: string | null
        }
        Relationships: []
      }
      workflow_analytics: {
        Row: {
          avg_duration: number
          created_at: string
          date: string
          failed_executions: number
          id: number
          max_duration: number | null
          min_duration: number | null
          success_rate: number
          successful_executions: number
          total_duration: number
          total_executions: number
          updated_at: string
          workflow_id: string
          workflow_name: string
        }
        Insert: {
          avg_duration?: number
          created_at?: string
          date?: string
          failed_executions?: number
          id?: number
          max_duration?: number | null
          min_duration?: number | null
          success_rate?: number
          successful_executions?: number
          total_duration?: number
          total_executions?: number
          updated_at?: string
          workflow_id: string
          workflow_name: string
        }
        Update: {
          avg_duration?: number
          created_at?: string
          date?: string
          failed_executions?: number
          id?: number
          max_duration?: number | null
          min_duration?: number | null
          success_rate?: number
          successful_executions?: number
          total_duration?: number
          total_executions?: number
          updated_at?: string
          workflow_id?: string
          workflow_name?: string
        }
        Relationships: []
      }
      workflow_execution_steps: {
        Row: {
          completed_at: string | null
          duration_ms: number | null
          error_details: Json | null
          execution_id: string
          id: string
          result: Json | null
          started_at: string | null
          status: Database["public"]["Enums"]["execution_status"]
          step_name: string
        }
        Insert: {
          completed_at?: string | null
          duration_ms?: number | null
          error_details?: Json | null
          execution_id: string
          id?: string
          result?: Json | null
          started_at?: string | null
          status: Database["public"]["Enums"]["execution_status"]
          step_name: string
        }
        Update: {
          completed_at?: string | null
          duration_ms?: number | null
          error_details?: Json | null
          execution_id?: string
          id?: string
          result?: Json | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["execution_status"]
          step_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_execution_steps_execution_id_fkey"
            columns: ["execution_id"]
            isOneToOne: false
            referencedRelation: "workflow_executions"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_executions: {
        Row: {
          completed_at: string | null
          created_at: string | null
          error_details: Json | null
          execution_time: number | null
          id: string
          metadata: Json | null
          retry_count: number | null
          status: Database["public"]["Enums"]["execution_status"]
          updated_at: string | null
          user_id: string
          validation_progress: Json | null
          webhook_url: string | null
          workflow_json: Json
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          error_details?: Json | null
          execution_time?: number | null
          id?: string
          metadata?: Json | null
          retry_count?: number | null
          status?: Database["public"]["Enums"]["execution_status"]
          updated_at?: string | null
          user_id: string
          validation_progress?: Json | null
          webhook_url?: string | null
          workflow_json: Json
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          error_details?: Json | null
          execution_time?: number | null
          id?: string
          metadata?: Json | null
          retry_count?: number | null
          status?: Database["public"]["Enums"]["execution_status"]
          updated_at?: string | null
          user_id?: string
          validation_progress?: Json | null
          webhook_url?: string | null
          workflow_json?: Json
        }
        Relationships: []
      }
      workflow_requests: {
        Row: {
          created_at: string | null
          id: string
          metadata: Json | null
          priority: number | null
          processing_time_ms: number | null
          status: string | null
          updated_at: string | null
          user_id: string
          user_intent: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          metadata?: Json | null
          priority?: number | null
          processing_time_ms?: number | null
          status?: string | null
          updated_at?: string | null
          user_id: string
          user_intent: string
        }
        Update: {
          created_at?: string | null
          id?: string
          metadata?: Json | null
          priority?: number | null
          processing_time_ms?: number | null
          status?: string | null
          updated_at?: string | null
          user_id?: string
          user_intent?: string
        }
        Relationships: []
      }
      workflow_status: {
        Row: {
          active: boolean
          avg_duration: number
          created_at: string
          id: number
          last_execution_at: string | null
          last_execution_duration: number | null
          last_execution_status: string | null
          node_count: number
          success_rate: number
          tags: string[] | null
          total_executions: number
          updated_at: string
          workflow_id: string
          workflow_name: string
        }
        Insert: {
          active?: boolean
          avg_duration?: number
          created_at?: string
          id?: number
          last_execution_at?: string | null
          last_execution_duration?: number | null
          last_execution_status?: string | null
          node_count?: number
          success_rate?: number
          tags?: string[] | null
          total_executions?: number
          updated_at?: string
          workflow_id: string
          workflow_name: string
        }
        Update: {
          active?: boolean
          avg_duration?: number
          created_at?: string
          id?: number
          last_execution_at?: string | null
          last_execution_duration?: number | null
          last_execution_status?: string | null
          node_count?: number
          success_rate?: number
          tags?: string[] | null
          total_executions?: number
          updated_at?: string
          workflow_id?: string
          workflow_name?: string
        }
        Relationships: []
      }
      workflows: {
        Row: {
          created_at: string | null
          description: string | null
          execution_count: number | null
          generation_time_ms: number | null
          id: number
          json_config: Json
          last_executed_at: string | null
          name: string
          status: string
          updated_at: string | null
          user_id: string
          user_intent: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          execution_count?: number | null
          generation_time_ms?: number | null
          id?: number
          json_config: Json
          last_executed_at?: string | null
          name: string
          status?: string
          updated_at?: string | null
          user_id: string
          user_intent?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          execution_count?: number | null
          generation_time_ms?: number | null
          id?: number
          json_config?: Json
          last_executed_at?: string | null
          name?: string
          status?: string
          updated_at?: string | null
          user_id?: string
          user_intent?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      ai_chat_analytics: {
        Row: {
          avg_processing_time_ms: number | null
          date: string | null
          total_cost_cents: number | null
          total_messages: number | null
          total_tokens: number | null
          unique_sessions: number | null
          unique_users: number | null
        }
        Relationships: []
      }
      api_usage_analytics: {
        Row: {
          api_name: string | null
          avg_tokens_per_request: number | null
          last_used: string | null
          request_count: number | null
          total_cost: number | null
          total_tokens: number | null
          usage_date: string | null
          user_id: string | null
        }
        Relationships: []
      }
      workflow_analytics_mv: {
        Row: {
          avg_execution_time: number | null
          execution_count: number | null
          failure_count: number | null
          hour: string | null
          max_execution_time: number | null
          median_execution_time: number | null
          min_execution_time: number | null
          p95_execution_time: number | null
          p99_execution_time: number | null
          status: Database["public"]["Enums"]["execution_status"] | null
          success_count: number | null
          success_rate: number | null
          user_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      add_user_message: {
        Args: { p_user_id: string; p_session_id: string; p_content: string }
        Returns: string
      }
      call_openai_api: {
        Args: {
          p_user_id: string
          p_session_id: string
          p_messages: Json
          p_model?: string
          p_max_tokens?: number
          p_temperature?: number
        }
        Returns: Json
      }
      check_rate_limit: {
        Args:
          | {
              p_user_id: string
              p_action_type: string
              p_limit: number
              p_window_minutes?: number
            }
          | { p_user_id: string; p_api_name: string; p_window_minutes?: number }
        Returns: boolean
      }
      check_rate_limits: {
        Args: { p_user_id: string; p_request_type?: string }
        Returns: boolean
      }
      cleanup_expired_oauth_states: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      cleanup_old_monitoring_data: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      create_chat_session: {
        Args: { p_user_id: string; p_title?: string }
        Returns: string
      }
      detect_workflow_type: {
        Args: { workflow_json: Json }
        Returns: string
      }
      generate_user_short_id: {
        Args: { user_uuid: string }
        Returns: string
      }
      get_chat_history: {
        Args: { p_user_id: string; p_session_id: string; p_limit?: number }
        Returns: Json
      }
      get_user_plan_limits: {
        Args: { p_user_id: string }
        Returns: Json
      }
      get_user_usage_summary: {
        Args: { p_user_id: string }
        Returns: {
          api_name: string
          monthly_usage: number
          daily_usage: number
          last_used: string
        }[]
      }
      increment_user_execution_count: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      increment_user_workflow_count: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      notify_workflow_completion: {
        Args: { p_workflow_id: string; p_webhook_url: string; p_payload: Json }
        Returns: string
      }
      pgmq_create_queue: {
        Args: { queue_name: string }
        Returns: boolean
      }
      pgmq_metrics: {
        Args: { queue_name: string }
        Returns: {
          queue_length: number
          oldest_msg_age_sec: number
          total_messages: number
        }[]
      }
      pgmq_purge_queue: {
        Args: { queue_name: string }
        Returns: boolean
      }
      pgmq_read_batch: {
        Args: { queue_name: string; vt_seconds?: number; qty?: number }
        Returns: {
          msg_id: number
          read_ct: number
          enqueued_at: string
          vt: string
          message: Json
        }[]
      }
      pgmq_send_with_delay: {
        Args: { queue_name: string; msg: Json; delay_seconds?: number }
        Returns: {
          msg_id: number
        }[]
      }
      process_multi_agent_chat: {
        Args:
          | {
              p_user_id: string
              p_session_id: string
              p_user_message: string
              p_agent_type?: string
            }
          | {
              p_user_id: string
              p_session_id: string
              p_user_message: string
              p_agent_type?: string
              p_model?: string
              p_max_tokens?: number
              p_temperature?: number
            }
        Returns: Json
      }
      recommend_workflows: {
        Args: { p_embedding: string; p_limit?: number }
        Returns: {
          workflow_id: string
          similarity: number
          content: string
          metadata: Json
        }[]
      }
      reset_user_execution_count: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      sanitize_workflow_name: {
        Args: { input_name: string }
        Returns: string
      }
      update_rate_limits: {
        Args: {
          p_user_id: string
          p_request_type?: string
          p_cost_cents?: number
        }
        Returns: undefined
      }
      validate_user_limits: {
        Args: { p_user_id: string; p_action_type: string }
        Returns: Json
      }
    }
    Enums: {
      execution_status:
        | "pending"
        | "validating"
        | "structure_validated"
        | "business_validated"
        | "compatibility_validated"
        | "auto_healing"
        | "testing"
        | "deploying"
        | "completed"
        | "failed"
        | "cancelled"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      execution_status: [
        "pending",
        "validating",
        "structure_validated",
        "business_validated",
        "compatibility_validated",
        "auto_healing",
        "testing",
        "deploying",
        "completed",
        "failed",
        "cancelled",
      ],
    },
  },
} as const
