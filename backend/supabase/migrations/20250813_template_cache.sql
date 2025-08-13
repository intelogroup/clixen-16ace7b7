-- =====================================================
-- Template Cache System Database Schema
-- High-performance caching for template discovery
-- =====================================================

-- Create template_cache table
CREATE TABLE IF NOT EXISTS template_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key TEXT NOT NULL,
  template_id TEXT NOT NULL,
  user_intent TEXT NOT NULL,
  template_data JSONB NOT NULL,
  confidence DECIMAL(5,4) NOT NULL DEFAULT 0.0,
  source TEXT NOT NULL CHECK (source IN ('battle-tested', 'n8n-community', 'firecrawl')),
  keywords TEXT[] DEFAULT '{}',
  expires_at TIMESTAMPTZ NOT NULL,
  hit_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_used TIMESTAMPTZ DEFAULT NOW(),
  
  -- Composite unique constraint to prevent duplicates
  CONSTRAINT unique_cache_template UNIQUE (cache_key, template_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_template_cache_key ON template_cache(cache_key);
CREATE INDEX IF NOT EXISTS idx_template_cache_expires ON template_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_template_cache_source ON template_cache(source);
CREATE INDEX IF NOT EXISTS idx_template_cache_confidence ON template_cache(confidence DESC);
CREATE INDEX IF NOT EXISTS idx_template_cache_intent ON template_cache USING GIN(to_tsvector('english', user_intent));
CREATE INDEX IF NOT EXISTS idx_template_cache_keywords ON template_cache USING GIN(keywords);

-- Function to increment hit count atomically
CREATE OR REPLACE FUNCTION increment_hit_count()
RETURNS INTEGER AS $$
BEGIN
  RETURN hit_count + 1;
END;
$$ LANGUAGE plpgsql;

-- Create template discovery analytics table
CREATE TABLE IF NOT EXISTS template_discovery_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_intent TEXT NOT NULL,
  search_keywords TEXT[] DEFAULT '{}',
  templates_found INTEGER DEFAULT 0,
  best_confidence DECIMAL(5,4) DEFAULT 0.0,
  source_breakdown JSONB DEFAULT '{}', -- {"battle-tested": 2, "n8n-community": 3}
  execution_time_ms INTEGER DEFAULT 0,
  cache_hit BOOLEAN DEFAULT false,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  project_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for analytics
CREATE INDEX IF NOT EXISTS idx_template_analytics_intent ON template_discovery_analytics USING GIN(to_tsvector('english', user_intent));
CREATE INDEX IF NOT EXISTS idx_template_analytics_keywords ON template_discovery_analytics USING GIN(search_keywords);
CREATE INDEX IF NOT EXISTS idx_template_analytics_user ON template_discovery_analytics(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_template_analytics_project ON template_discovery_analytics(project_id, created_at);

-- RLS policies
ALTER TABLE template_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_discovery_analytics ENABLE ROW LEVEL SECURITY;

-- Template cache policies (shared across users for efficiency)
CREATE POLICY "template_cache_read_all" ON template_cache FOR SELECT USING (true);
CREATE POLICY "template_cache_insert_all" ON template_cache FOR INSERT WITH CHECK (true);
CREATE POLICY "template_cache_update_all" ON template_cache FOR UPDATE USING (true);
CREATE POLICY "template_cache_delete_expired" ON template_cache FOR DELETE USING (expires_at < NOW());

-- Analytics policies (user-specific)
CREATE POLICY "template_analytics_read_own" ON template_discovery_analytics 
  FOR SELECT USING (auth.uid() = user_id OR auth.uid() IS NULL);
CREATE POLICY "template_analytics_insert_own" ON template_discovery_analytics 
  FOR INSERT WITH CHECK (auth.uid() = user_id OR auth.uid() IS NULL);

-- Function to clean expired cache entries
CREATE OR REPLACE FUNCTION cleanup_expired_template_cache()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM template_cache WHERE expires_at < NOW();
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Schedule cleanup job (requires pg_cron extension)
-- SELECT cron.schedule('cleanup-template-cache', '0 2 * * *', 'SELECT cleanup_expired_template_cache();');

-- Function to get cache statistics
CREATE OR REPLACE FUNCTION get_template_cache_stats()
RETURNS JSON AS $$
DECLARE
  stats JSON;
BEGIN
  SELECT json_build_object(
    'total_entries', COUNT(*),
    'expired_entries', COUNT(*) FILTER (WHERE expires_at < NOW()),
    'active_entries', COUNT(*) FILTER (WHERE expires_at >= NOW()),
    'battle_tested_count', COUNT(*) FILTER (WHERE source = 'battle-tested'),
    'n8n_community_count', COUNT(*) FILTER (WHERE source = 'n8n-community'),
    'firecrawl_count', COUNT(*) FILTER (WHERE source = 'firecrawl'),
    'avg_confidence', ROUND(AVG(confidence)::numeric, 4),
    'total_hits', SUM(hit_count),
    'most_popular_intent', (
      SELECT user_intent 
      FROM template_cache 
      WHERE expires_at >= NOW() 
      GROUP BY user_intent 
      ORDER BY SUM(hit_count) DESC 
      LIMIT 1
    )
  ) INTO stats
  FROM template_cache;
  
  RETURN stats;
END;
$$ LANGUAGE plpgsql;

-- Function to get discovery analytics summary
CREATE OR REPLACE FUNCTION get_discovery_analytics_summary(days_back INTEGER DEFAULT 7)
RETURNS JSON AS $$
DECLARE
  summary JSON;
BEGIN
  SELECT json_build_object(
    'total_searches', COUNT(*),
    'cache_hit_rate', ROUND((COUNT(*) FILTER (WHERE cache_hit = true)::DECIMAL / COUNT(*)) * 100, 2),
    'avg_execution_time_ms', ROUND(AVG(execution_time_ms), 2),
    'avg_templates_found', ROUND(AVG(templates_found), 2),
    'avg_confidence', ROUND(AVG(best_confidence)::numeric, 4),
    'top_intents', (
      SELECT json_agg(intent_stats ORDER BY search_count DESC)
      FROM (
        SELECT 
          user_intent as intent,
          COUNT(*) as search_count,
          ROUND(AVG(best_confidence)::numeric, 4) as avg_confidence
        FROM template_discovery_analytics
        WHERE created_at >= NOW() - INTERVAL '%s days'
        GROUP BY user_intent
        ORDER BY COUNT(*) DESC
        LIMIT 10
      ) intent_stats
    ),
    'source_performance', (
      SELECT json_object_agg(source, stats)
      FROM (
        SELECT 
          jsonb_object_keys(source_breakdown) as source,
          json_build_object(
            'usage_count', SUM((source_breakdown->>jsonb_object_keys(source_breakdown))::int),
            'avg_confidence', ROUND(AVG(best_confidence)::numeric, 4)
          ) as stats
        FROM template_discovery_analytics
        WHERE created_at >= NOW() - INTERVAL '%s days'
          AND source_breakdown IS NOT NULL
        GROUP BY jsonb_object_keys(source_breakdown)
      ) source_stats
    )
  ) INTO summary
  FROM template_discovery_analytics
  WHERE created_at >= NOW() - MAKE_INTERVAL(days := days_back);
  
  RETURN summary;
END;
$$ LANGUAGE plpgsql;

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON template_cache TO authenticated;
GRANT SELECT, INSERT ON template_discovery_analytics TO authenticated;
GRANT EXECUTE ON FUNCTION increment_hit_count() TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_expired_template_cache() TO authenticated;
GRANT EXECUTE ON FUNCTION get_template_cache_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION get_discovery_analytics_summary(INTEGER) TO authenticated;

-- Create initial indexes for performance
ANALYZE template_cache;
ANALYZE template_discovery_analytics;