-- ============================================
-- AXIS3 - FEEDBACK SYSTEM
-- Version: 1.0
-- Date: 2026-04-22
-- Description: User feedback, bug reports, and feature requests system
-- ============================================

-- Feedback Categories Enum
CREATE TYPE feedback_category AS ENUM (
    'bug_report',
    'feature_request',
    'ui_ux',
    'performance',
    'pricing',
    'support',
    'other'
);

-- Feedback Status Enum
CREATE TYPE feedback_status AS ENUM (
    'new',
    'in_review',
    'planned',
    'in_progress',
    'completed',
    'rejected',
    'duplicate'
);

-- Feedback Priority Enum
CREATE TYPE feedback_priority AS ENUM (
    'low',
    'medium',
    'high',
    'critical'
);

-- Feedback Table
CREATE TABLE feedback (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Feedback Content
    category feedback_category NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    
    -- Status & Priority
    status feedback_status DEFAULT 'new',
    priority feedback_priority DEFAULT 'medium',
    
    -- Admin Response
    admin_response TEXT,
    admin_id UUID REFERENCES users(id),
    responded_at TIMESTAMPTZ,
    
    -- Metadata
    user_agent TEXT,
    page_url TEXT,
    screenshot_url TEXT,
    metadata JSONB DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_feedback_user_id ON feedback(user_id);
CREATE INDEX idx_feedback_status ON feedback(status);
CREATE INDEX idx_feedback_category ON feedback(category);
CREATE INDEX idx_feedback_priority ON feedback(priority);
CREATE INDEX idx_feedback_created_at ON feedback(created_at DESC);
CREATE INDEX idx_feedback_deleted_at ON feedback(deleted_at) WHERE deleted_at IS NULL;

-- Updated_at Trigger
CREATE TRIGGER update_feedback_updated_at 
BEFORE UPDATE ON feedback
FOR EACH ROW 
EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- RLS POLICIES
-- ============================================
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

-- Users can view their own feedback
CREATE POLICY "Users can view own feedback"
ON feedback FOR SELECT
USING (auth.uid() = user_id);

-- Users can create feedback
CREATE POLICY "Users can create feedback"
ON feedback FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own pending feedback
CREATE POLICY "Users can update own pending feedback"
ON feedback FOR UPDATE
USING (auth.uid() = user_id AND status = 'new');

-- Admins can view all feedback
CREATE POLICY "Admins can view all feedback"
ON feedback FOR SELECT
USING (is_admin());

-- Admins can update all feedback
CREATE POLICY "Admins can update all feedback"
ON feedback FOR UPDATE
USING (is_admin());

-- Admins can delete feedback
CREATE POLICY "Admins can delete feedback"
ON feedback FOR DELETE
USING (is_admin());

-- ============================================
-- COMMENTS
-- ============================================
COMMENT ON TABLE feedback IS 'User feedback, bug reports, and feature requests';
COMMENT ON COLUMN feedback.category IS 'Type of feedback: bug_report, feature_request, ui_ux, performance, pricing, support, other';
COMMENT ON COLUMN feedback.status IS 'Current status: new, in_review, planned, in_progress, completed, rejected, duplicate';
COMMENT ON COLUMN feedback.priority IS 'Priority level: low, medium, high, critical';
COMMENT ON COLUMN feedback.admin_response IS 'Admin response to the feedback';
COMMENT ON COLUMN feedback.user_agent IS 'Browser user agent for debugging';
COMMENT ON COLUMN feedback.page_url IS 'Page URL where feedback was submitted';

-- ============================================
-- MIGRATION COMPLETE
-- ============================================
-- Tables Created: 1 (feedback)
-- Enums Created: 3 (feedback_category, feedback_status, feedback_priority)
-- Indexes Created: 6
-- RLS Policies: 6 (3 user + 3 admin)
-- ============================================
