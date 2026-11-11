-- Migration: Fix Phone Field Length
-- Problem: phone field is VARCHAR(20) but email addresses can be longer
-- Solution: Increase phone field length to VARCHAR(50)

-- Alter users table phone column
ALTER TABLE public.users 
ALTER COLUMN phone TYPE VARCHAR(50);

-- Comment
COMMENT ON COLUMN public.users.phone IS 'User phone number (max 50 characters)';

-- Verify the change
DO $$
DECLARE
  phone_length INTEGER;
BEGIN
  SELECT character_maximum_length INTO phone_length
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'users'
    AND column_name = 'phone';
  
  IF phone_length = 50 THEN
    RAISE LOG 'Phone field length updated to 50 characters';
  ELSE
    RAISE EXCEPTION 'Phone field length is %, expected 50', phone_length;
  END IF;
END $$;
