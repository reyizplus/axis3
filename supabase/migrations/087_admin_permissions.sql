-- Admin Permissions Table
-- Tracks which admin sections each admin user can access

CREATE TABLE IF NOT EXISTS public.admin_permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    section_key TEXT NOT NULL,
    granted_by UUID REFERENCES public.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (user_id, section_key)
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_admin_permissions_user_id ON public.admin_permissions(user_id);

-- Enable RLS
ALTER TABLE public.admin_permissions ENABLE ROW LEVEL SECURITY;

-- Only super admins (axis3.com.tr) can manage permissions
CREATE POLICY "Super admins can manage admin_permissions"
    ON public.admin_permissions
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE id = auth.uid()
            AND email LIKE '%@axis3.com.tr'
        )
    );

-- Anyone can read their own permissions
CREATE POLICY "Users can read own permissions"
    ON public.admin_permissions
    FOR SELECT
    USING (user_id = auth.uid());

-- Function to check if user has specific admin permission
CREATE OR REPLACE FUNCTION public.has_admin_permission(section_key TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM auth.users
        WHERE id = auth.uid()
        AND (
            -- Super admin (axis3.com.tr) has all permissions
            email LIKE '%@axis3.com.tr'
            OR
            -- Check admin_permissions table
            EXISTS (
                SELECT 1 FROM public.admin_permissions
                WHERE user_id = auth.uid()
                AND admin_permissions.section_key = has_admin_permission.section_key
            )
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant all permissions to existing axis3.com.tr admins
-- They are super admins and get access via the email check above
