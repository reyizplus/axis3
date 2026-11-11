-- ============================================
-- MIGRATION 050: GUEST SESSIONS TRACKING
-- Date: 2026-04-23
-- Description: Track guest user sessions and conversion metrics
-- Features:
--   - Session tracking
--   - Conversion tracking
--   - Activity monitoring
--   - Analytics data
-- ============================================

-- ============================================
-- TABLE: guest_sessions
-- ============================================
CREATE TABLE IF NOT EXISTS guest_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id VARCHAR(255) UNIQUE NOT NULL,
    
    -- Guest Information
    email VARCHAR(255),
    ip_address INET,
    user_agent TEXT,
    
    -- Activity Tracking
    files_uploaded INTEGER DEFAULT 0,
    last_activity TIMESTAMPTZ DEFAULT NOW(),
    
    -- Conversion Tracking
    converted_to_user_id UUID REFERENCES users(id),
    converted_at TIMESTAMPTZ,
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    
    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX idx_guest_sessions_session_id ON guest_sessions(session_id);
CREATE INDEX idx_guest_sessions_email ON guest_sessions(email) WHERE email IS NOT NULL;
CREATE INDEX idx_guest_sessions_converted ON guest_sessions(converted_to_user_id) WHERE converted_to_user_id IS NOT NULL;
CREATE INDEX idx_guest_sessions_last_activity ON guest_sessions(last_activity DESC);
CREATE INDEX idx_guest_sessions_created_at ON guest_sessions(created_at DESC);

-- ============================================
-- TRIGGER: Update updated_at
-- ============================================
CREATE TRIGGER update_guest_sessions_updated_at 
BEFORE UPDATE ON guest_sessions
FOR EACH ROW 
EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- FUNCTION: Create or update guest session
-- ============================================
CREATE OR REPLACE FUNCTION upsert_guest_session(
  p_session_id VARCHAR,
  p_email VARCHAR DEFAULT NULL,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_session_uuid UUID;
BEGIN
  INSERT INTO guest_sessions (
    session_id,
    email,
    ip_address,
    user_agent,
    last_activity
  )
  VALUES (
    p_session_id,
    p_email,
    p_ip_address,
    p_user_agent,
    NOW()
  )
  ON CONFLICT (session_id) 
  DO UPDATE SET
    email = COALESCE(EXCLUDED.email, guest_sessions.email),
    last_activity = NOW(),
    updated_at = NOW()
  RETURNING id INTO v_session_uuid;
  
  RETURN v_session_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FUNCTION: Increment guest upload count
-- ============================================
CREATE OR REPLACE FUNCTION increment_guest_upload_count(p_session_id VARCHAR)
RETURNS VOID AS $$
BEGIN
  UPDATE guest_sessions
  SET 
    files_uploaded = files_uploaded + 1,
    last_activity = NOW(),
    updated_at = NOW()
  WHERE session_id = p_session_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FUNCTION: Mark session as converted
-- ============================================
CREATE OR REPLACE FUNCTION mark_session_converted(
  p_session_id VARCHAR,
  p_user_id UUID
)
RETURNS VOID AS $$
BEGIN
  UPDATE guest_sessions
  SET 
    converted_to_user_id = p_user_id,
    converted_at = NOW(),
    updated_at = NOW()
  WHERE session_id = p_session_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FUNCTION: Get guest session stats
-- ============================================
CREATE OR REPLACE FUNCTION get_guest_session_stats()
RETURNS TABLE(
  total_sessions BIGINT,
  converted_sessions BIGINT,
  conversion_rate DECIMAL,
  total_files_uploaded BIGINT,
  avg_files_per_session DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT,
    COUNT(converted_to_user_id)::BIGINT,
    CASE 
      WHEN COUNT(*) > 0 THEN 
        ROUND((COUNT(converted_to_user_id)::DECIMAL / COUNT(*)::DECIMAL) * 100, 2)
      ELSE 0
    END,
    SUM(files_uploaded)::BIGINT,
    CASE 
      WHEN COUNT(*) > 0 THEN 
        ROUND(AVG(files_uploaded), 2)
      ELSE 0
    END
  FROM guest_sessions;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FUNCTION: Find inactive guest sessions
-- ============================================
CREATE OR REPLACE FUNCTION find_inactive_guest_sessions(p_hours_old INTEGER DEFAULT 48)
RETURNS TABLE(
  session_id VARCHAR,
  email VARCHAR,
  files_uploaded INTEGER,
  last_activity TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    gs.session_id,
    gs.email,
    gs.files_uploaded,
    gs.last_activity
  FROM guest_sessions gs
  WHERE gs.converted_to_user_id IS NULL
  AND gs.last_activity < NOW() - (p_hours_old || ' hours')::INTERVAL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- GRANT PERMISSIONS
-- ============================================
GRANT SELECT ON guest_sessions TO authenticated;
GRANT EXECUTE ON FUNCTION upsert_guest_session(VARCHAR, VARCHAR, INET, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION increment_guest_upload_count(VARCHAR) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION mark_session_converted(VARCHAR, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_guest_session_stats() TO service_role;
GRANT EXECUTE ON FUNCTION find_inactive_guest_sessions(INTEGER) TO service_role;

-- ============================================
-- COMMENTS
-- ============================================
COMMENT ON TABLE guest_sessions IS 'Track guest user sessions and conversion metrics';
COMMENT ON COLUMN guest_sessions.session_id IS 'Unique session identifier from cookie';
COMMENT ON COLUMN guest_sessions.files_uploaded IS 'Number of files uploaded in this session';
COMMENT ON COLUMN guest_sessions.converted_to_user_id IS 'User ID if guest converted to registered user';

COMMENT ON FUNCTION upsert_guest_session(VARCHAR, VARCHAR, INET, TEXT) IS 'Create or update guest session';
COMMENT ON FUNCTION increment_guest_upload_count(VARCHAR) IS 'Increment file upload count for session';
COMMENT ON FUNCTION mark_session_converted(VARCHAR, UUID) IS 'Mark guest session as converted to registered user';
COMMENT ON FUNCTION get_guest_session_stats() IS 'Get overall guest session statistics';
COMMENT ON FUNCTION find_inactive_guest_sessions(INTEGER) IS 'Find inactive sessions for cleanup/reminder';
