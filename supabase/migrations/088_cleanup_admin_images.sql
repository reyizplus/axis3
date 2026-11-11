-- Cleanup admin-uploaded image files from files table
-- Admin blog/store images don't need STL-style tracking and shouldn't count against quota

-- 1. Delete image files uploaded by admin users (images used for blog/store content)
DELETE FROM public.files
WHERE mime_type LIKE 'image/%'
  AND user_id IN (
    SELECT id FROM auth.users
    WHERE raw_user_meta_data->>'role' = 'admin'
       OR email LIKE '%@axis3.com.tr'
  );

-- 2. Update calculate_upload_quota_used to exclude image files for admin users
CREATE OR REPLACE FUNCTION public.calculate_upload_quota_used(user_uuid UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::INTEGER
    FROM files
    WHERE user_id = user_uuid
      AND deleted_at IS NULL
      AND NOT (
        mime_type LIKE 'image/%'
        AND EXISTS (
          SELECT 1 FROM auth.users
          WHERE id = user_uuid
            AND (raw_user_meta_data->>'role' = 'admin' OR email LIKE '%@axis3.com.tr')
        )
      )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
