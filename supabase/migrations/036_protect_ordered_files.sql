-- Migration: Protect files that are used in orders
-- Purpose: Prevent deletion of files that are referenced in order_items
-- Date: 2026-04-22

-- Step 1: Add constraint to prevent hard delete of files used in orders
-- Change file_id foreign key to RESTRICT deletion
ALTER TABLE order_items
DROP CONSTRAINT IF EXISTS order_items_file_id_fkey;

ALTER TABLE order_items
ADD CONSTRAINT order_items_file_id_fkey
FOREIGN KEY (file_id)
REFERENCES files(id)
ON DELETE RESTRICT;

-- Step 2: Create function to check if file is used in orders
CREATE OR REPLACE FUNCTION check_file_in_orders(file_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM order_items WHERE file_id = file_uuid
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 3: Create function to safely delete file
-- Only allows storage deletion if file is NOT in any order
CREATE OR REPLACE FUNCTION can_delete_file_from_storage(file_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
  has_orders BOOLEAN;
BEGIN
  -- Check if file is used in any order
  SELECT EXISTS (
    SELECT 1 FROM order_items WHERE file_id = file_uuid
  ) INTO has_orders;
  
  -- Return false if file is in orders (cannot delete from storage)
  RETURN NOT has_orders;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 4: Add comment for documentation
COMMENT ON FUNCTION check_file_in_orders(UUID) IS 'Check if a file is referenced in any order_items';
COMMENT ON FUNCTION can_delete_file_from_storage(UUID) IS 'Check if a file can be safely deleted from storage (returns false if file is in orders)';

-- Step 5: Grant execute permissions
GRANT EXECUTE ON FUNCTION check_file_in_orders(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION can_delete_file_from_storage(UUID) TO authenticated;
