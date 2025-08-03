export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      workflow_executions: {
        Row: {
          id: string
          user_id: string
          workflow_json: Json
          validation_progress: Json
          status: 'pending' | 'validating' | 'structure_validated' | 'business_validated' | 'compatibility_validated' | 'auto_healing' | 'testing' | 'deploying' | 'completed' | 'failed' | 'cancelled'
          retry_count: number
          execution_time: number | null
          error_details: Json | null
          webhook_url: string | null
          metadata: Json
          created_at: string
          updated_at: string
          completed_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          workflow_json: Json
          validation_progress?: Json
          status?: 'pending' | 'validating' | 'structure_validated' | 'business_validated' | 'compatibility_validated' | 'auto_healing' | 'testing' | 'deploying' | 'completed' | 'failed' | 'cancelled'
          retry_count?: number
          execution_time?: number | null
          error_details?: Json | null
          webhook_url?: string | null
          metadata?: Json
          created_at?: string
          updated_at?: string
          completed_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          workflow_json?: Json
          validation_progress?: Json
          status?: 'pending' | 'validating' | 'structure_validated' | 'business_validated' | 'compatibility_validated' | 'auto_healing' | 'testing' | 'deploying' | 'completed' | 'failed' | 'cancelled'
          retry_count?: number
          execution_time?: number | null
          error_details?: Json | null
          webhook_url?: string | null
          metadata?: Json
          created_at?: string
          updated_at?: string
          completed_at?: string | null
        }
        Relationships: []
      }
      workflow_execution_steps: {
        Row: {
          id: string
          execution_id: string
          step_name: string
          status: 'pending' | 'validating' | 'structure_validated' | 'business_validated' | 'compatibility_validated' | 'auto_healing' | 'testing' | 'deploying' | 'completed' | 'failed' | 'cancelled'
          started_at: string
          completed_at: string | null
          duration_ms: number | null
          result: Json | null
          error_details: Json | null
        }
        Insert: {
          id?: string
          execution_id: string
          step_name: string
          status: 'pending' | 'validating' | 'structure_validated' | 'business_validated' | 'compatibility_validated' | 'auto_healing' | 'testing' | 'deploying' | 'completed' | 'failed' | 'cancelled'
          started_at?: string
          completed_at?: string | null
          duration_ms?: number | null
          result?: Json | null
          error_details?: Json | null
        }
        Update: {
          id?: string
          execution_id?: string
          step_name?: string
          status?: 'pending' | 'validating' | 'structure_validated' | 'business_validated' | 'compatibility_validated' | 'auto_healing' | 'testing' | 'deploying' | 'completed' | 'failed' | 'cancelled'
          started_at?: string
          completed_at?: string | null
          duration_ms?: number | null
          result?: Json | null
          error_details?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "workflow_execution_steps_execution_id_fkey"
            columns: ["execution_id"]
            isOneToOne: false
            referencedRelation: "workflow_executions"
            referencedColumns: ["id"]
          }
        ]
      }
      performance_metrics: {
        Row: {
          id: string
          execution_id: string | null
          user_id: string | null
          timestamp: string
          validation_structure_ms: number | null
          validation_business_ms: number | null
          validation_compatibility_ms: number | null
          validation_total_ms: number | null
          queue_wait_ms: number | null
          queue_processing_ms: number | null
          database_query_ms: number | null
          database_connection_ms: number | null
          memory_heap_used: number | null
          memory_heap_total: number | null
          memory_external: number | null
          cpu_usage: number | null
          load_average: number[] | null
          node_count: number | null
          workflow_complexity: 'low' | 'medium' | 'high' | 'extreme' | null
          auto_healed: boolean | null
          retry_count: number | null
          metadata: Json
        }
        Insert: {
          id?: string
          execution_id?: string | null
          user_id?: string | null
          timestamp?: string
          validation_structure_ms?: number | null
          validation_business_ms?: number | null
          validation_compatibility_ms?: number | null
          validation_total_ms?: number | null
          queue_wait_ms?: number | null
          queue_processing_ms?: number | null
          database_query_ms?: number | null
          database_connection_ms?: number | null
          memory_heap_used?: number | null
          memory_heap_total?: number | null
          memory_external?: number | null
          cpu_usage?: number | null
          load_average?: number[] | null
          node_count?: number | null
          workflow_complexity?: 'low' | 'medium' | 'high' | 'extreme' | null
          auto_healed?: boolean | null
          retry_count?: number | null
          metadata?: Json
        }
        Update: {
          id?: string
          execution_id?: string | null
          user_id?: string | null
          timestamp?: string
          validation_structure_ms?: number | null
          validation_business_ms?: number | null
          validation_compatibility_ms?: number | null
          validation_total_ms?: number | null
          queue_wait_ms?: number | null
          queue_processing_ms?: number | null
          database_query_ms?: number | null
          database_connection_ms?: number | null
          memory_heap_used?: number | null
          memory_heap_total?: number | null
          memory_external?: number | null
          cpu_usage?: number | null
          load_average?: number[] | null
          node_count?: number | null
          workflow_complexity?: 'low' | 'medium' | 'high' | 'extreme' | null
          auto_healed?: boolean | null
          retry_count?: number | null
          metadata?: Json
        }
        Relationships: []
      }
      performance_alerts: {
        Row: {
          id: string
          alert_type: string
          severity: 'low' | 'medium' | 'high' | 'critical' | null
          message: string
          timestamp: string
          resolved: boolean | null
          resolved_at: string | null
          metadata: Json
        }
        Insert: {
          id?: string
          alert_type: string
          severity?: 'low' | 'medium' | 'high' | 'critical' | null
          message: string
          timestamp?: string
          resolved?: boolean | null
          resolved_at?: string | null
          metadata?: Json
        }
        Update: {
          id?: string
          alert_type?: string
          severity?: 'low' | 'medium' | 'high' | 'critical' | null
          message?: string
          timestamp?: string
          resolved?: boolean | null
          resolved_at?: string | null
          metadata?: Json
        }
        Relationships: []
      }
      system_health_snapshots: {
        Row: {
          id: string
          timestamp: string
          status: 'healthy' | 'degraded' | 'unhealthy' | null
          queue_depths: Json | null
          average_response_time: number | null
          error_rate: number | null
          throughput: number | null
          uptime_seconds: number | null
          active_alerts: number | null
          metadata: Json
        }
        Insert: {
          id?: string
          timestamp?: string
          status?: 'healthy' | 'degraded' | 'unhealthy' | null
          queue_depths?: Json | null
          average_response_time?: number | null
          error_rate?: number | null
          throughput?: number | null
          uptime_seconds?: number | null
          active_alerts?: number | null
          metadata?: Json
        }
        Update: {
          id?: string
          timestamp?: string
          status?: 'healthy' | 'degraded' | 'unhealthy' | null
          queue_depths?: Json | null
          average_response_time?: number | null
          error_rate?: number | null
          throughput?: number | null
          uptime_seconds?: number | null
          active_alerts?: number | null
          metadata?: Json
        }
        Relationships: []
      }
      queue_errors: {
        Row: {
          id: string
          queue_name: string
          error_message: string
          created_at: string
        }
        Insert: {
          id?: string
          queue_name: string
          error_message: string
          created_at?: string
        }
        Update: {
          id?: string
          queue_name?: string
          error_message?: string
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      workflow_analytics_mv: {
        Row: {
          hour: string | null
          user_id: string | null
          status: 'pending' | 'validating' | 'structure_validated' | 'business_validated' | 'compatibility_validated' | 'auto_healing' | 'testing' | 'deploying' | 'completed' | 'failed' | 'cancelled' | null
          execution_count: number | null
          avg_execution_time: number | null
          median_execution_time: number | null
          p95_execution_time: number | null
          p99_execution_time: number | null
          min_execution_time: number | null
          max_execution_time: number | null
          success_count: number | null
          failure_count: number | null
          success_rate: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      execution_status: 'pending' | 'validating' | 'structure_validated' | 'business_validated' | 'compatibility_validated' | 'auto_healing' | 'testing' | 'deploying' | 'completed' | 'failed' | 'cancelled'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (Database["public"]["Tables"] & Database["public"]["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (Database["public"]["Tables"] &
      Database["public"]["Views"])
  ? (Database["public"]["Tables"] &
      Database["public"]["Views"])[PublicTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof Database["public"]["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof Database["public"]["Tables"]
  ? Database["public"]["Tables"][PublicTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof Database["public"]["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof Database["public"]["Tables"]
  ? Database["public"]["Tables"][PublicTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof Database["public"]["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof Database["public"]["Enums"]
  ? Database["public"]["Enums"][PublicEnumNameOrOptions]
  : never