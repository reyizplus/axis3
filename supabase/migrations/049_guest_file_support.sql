-- ============================================
-- MIGRATION 049: GUEST FILE SUPPORT
-- Date: 2026-04-23
-- Description: Enable guest users to upload files before registration
-- Features:
--   - Guest session tracking
--   - Temporary file ownership
--   - File claim mechanism
--   - Auto-cleanup after 24 hours
-- ============================================

-- ============================================
-- EXTEND FILES TABLE
-- ============================================
ALTER TABLE files ADD COLUMN IF NOT EXISTS is_guest_upload BOOLEAN DEFAULT FALSE;
ALTER TABLE files ADD COLUMN IF NOT EXISTS guest_session_id VARCHAR(255);
ALTER TABLE files ADD COLUMN IF NOT EXISTS guest_email VARCHAR(255);
ALTER TABLE files ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMPTZ;

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_files_guest_session 
ON files(guest_session_id) 
WHERE is_guest_upload = TRUE;

CREATE INDEX IF NOT EXISTS idx_files_guest_abandoned 
ON files(created_at) 
WHERE is_guest_upload = TRUE AND user_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_files_guest_email 
ON files(guest_email) 
WHERE is_guest_upload = TRUE;

-- ============================================
-- RLS POLICIES: Guest file access
-- ============================================

-- Allow guests to insert files with their session ID
CREATE POLICY "Guests can upload files"
ON files FOR INSERT
WITH CHECK (
  is_guest_upload = TRUE 
  AND guest_session_id IS NOT NULL
  AND user_id IS NULL
);

-- Allow guests to view their own files
CREATE POLICY "Guests can view their files"
ON files FOR SELECT
USING (
  (is_guest_upload = TRUE AND guest_session_id = current_setting('request.headers', true)::json->>'x-guest-session-id')
  OR
  (user_id = auth.uid())
);

-- Allow guests to update their own files (for analysis results)
CREATE POLICY "Guests can update their files"
ON files FOR UPDATE
USING (
  (is_guest_upload = TRUE AND guest_session_id = current_setting('request.headers', true)::json->>'x-guest-session-id')
  OR
  (user_id = auth.uid())
);

-- ============================================
-- FUNCTION: Claim guest files
-- ============================================
CREATE OR REPLACE FUNCTION claim_guest_files(
  p_user_id UUID,
  p_guest_session_id VARCHAR
)
RETURNS INTEGER AS $$
DECLARE
  v_claimed_count INTEGER;
BEGIN
  -- Transfer guest files to user
  UPDATE files
  SET 
    user_id = p_user_id,
    is_guest_upload = FALSE,
    claimed_at = NOW(),
    updated_at = NOW()
  WHERE guest_session_id = p_guest_session_id
  AND user_id IS NULL
  AND is_guest_upload = TRUE;
  
  GET DIAGNOSTICS v_claimed_count = ROW_COUNT;
  
  RETURN v_claimed_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FUNCTION: Get guest upload count
-- ============================================
CREATE OR REPLACE FUNCTION get_guest_upload_count(p_guest_session_id VARCHAR)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::INTEGER
    FROM files
    WHERE guest_session_id = p_guest_session_id
    AND is_guest_upload = TRUE
    AND deleted_at IS NULL
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FUNCTION: Find abandoned guest files
-- ============================================
CREATE OR REPLACE FUNCTION find_abandoned_guest_files(p_hours_old INTEGER DEFAULT 24)
RETURNS TABLE(
  file_id UUID,
  storage_path TEXT,
  guest_session_id VARCHAR,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    id,
    files.storage_path,
    files.guest_session_id,
    files.created_at
  FROM files
  WHERE is_guest_upload = TRUE
  AND user_id IS NULL
  AND deleted_at IS NULL
  AND created_at < NOW() - (p_hours_old || ' hours')::INTERVAL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- GRANT PERMISSIONS
-- ============================================
GRANT EXECUTE ON FUNCTION claim_guest_files(UUID, VARCHAR) TO authenticated;
GRANT EXECUTE ON FUNCTION get_guest_upload_count(VARCHAR) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION find_abandoned_guest_files(INTEGER) TO service_role;

-- ============================================
-- COMMENTS
-- ============================================
COMMENT ON COLUMN files.is_guest_upload IS 'TRUE if file was uploaded by guest user';
COMMENT ON COLUMN files.guest_session_id IS 'Guest session ID from cookie';
COMMENT ON COLUMN files.guest_email IS 'Optional email captured from guest';
COMMENT ON COLUMN files.claimed_at IS 'Timestamp when guest file was claimed by registered user';

COMMENT ON FUNCTION claim_guest_files(UUID, VARCHAR) IS 'Transfer guest files to registered user';
COMMENT ON FUNCTION get_guest_upload_count(VARCHAR) IS 'Count active uploads for guest session';
COMMENT ON FUNCTION find_abandoned_guest_files(INTEGER) IS 'Find guest files older than specified hours for cleanup';
