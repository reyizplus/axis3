-- Admin Revoke Role RPC
-- Directly removes admin role from auth.users.raw_user_meta_data at DB level
-- Bypasses GoTrue's merge-only behavior for user_metadata
CREATE OR REPLACE FUNCTION public.admin_revoke_admin_role(user_uuid UUID)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
    UPDATE auth.users
    SET raw_user_meta_data = raw_user_meta_data - 'role'
    WHERE id = user_uuid;

    DELETE FROM public.admin_permissions
    WHERE user_id = user_uuid;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_revoke_admin_role(UUID) TO service_role;
