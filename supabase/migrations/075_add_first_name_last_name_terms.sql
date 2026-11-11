-- Migration 075: Add first_name, last_name, terms_accepted_at to users table

-- Add new columns to users table
ALTER TABLE public.users 
  ADD COLUMN IF NOT EXISTS first_name text,
  ADD COLUMN IF NOT EXISTS last_name text,
  ADD COLUMN IF NOT EXISTS terms_accepted_at timestamptz;

-- Backfill first_name/last_name from full_name for existing users
UPDATE public.users
SET 
  first_name = CASE 
    WHEN full_name ~ ' ' THEN SPLIT_PART(full_name, ' ', 1)
    ELSE full_name
  END,
  last_name = CASE 
    WHEN full_name ~ ' ' THEN SUBSTRING(full_name FROM POSITION(' ' IN full_name) + 1)
    ELSE ''
  END
WHERE first_name IS NULL;

-- Add NOT NULL constraint after backfill
ALTER TABLE public.users 
  ALTER COLUMN first_name SET NOT NULL,
  ALTER COLUMN last_name SET NOT NULL;

-- Update handle_new_user trigger to include new fields
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  raw_meta jsonb;
  v_first_name text;
  v_last_name text;
  v_full_name text;
BEGIN
  raw_meta := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
  v_first_name := NULLIF(TRIM(raw_meta->>'first_name'), '');
  v_last_name := NULLIF(TRIM(raw_meta->>'last_name'), '');
  v_full_name := NULLIF(TRIM(raw_meta->>'full_name'), '');

  -- If first_name/last_name provided but no full_name, construct it
  IF v_first_name IS NOT NULL AND v_last_name IS NOT NULL AND v_full_name IS NULL THEN
    v_full_name := v_first_name || ' ' || v_last_name;
  END IF;

  -- If full_name provided but no first_name/last_name, split it
  IF v_full_name IS NOT NULL AND v_first_name IS NULL AND v_last_name IS NULL THEN
    IF v_full_name ~ ' ' THEN
      v_first_name := SPLIT_PART(v_full_name, ' ', 1);
      v_last_name := SUBSTRING(v_full_name FROM POSITION(' ' IN v_full_name) + 1);
    ELSE
      v_first_name := v_full_name;
      v_last_name := '';
    END IF;
  END IF;

  -- Fallback to email if no name at all
  IF v_full_name IS NULL THEN
    v_full_name := SPLIT_PART(NEW.email, '@', 1);
  END IF;
  IF v_first_name IS NULL THEN
    v_first_name := SPLIT_PART(NEW.email, '@', 1);
    v_last_name := '';
  END IF;

  BEGIN
    INSERT INTO public.users (
      id, email, full_name, first_name, last_name,
      phone, company_name, is_corporate, tax_number, tax_office,
      terms_accepted_at, preferences
    )
    VALUES (
      NEW.id,
      NEW.email,
      v_full_name,
      v_first_name,
      v_last_name,
      NULLIF(TRIM(raw_meta->>'phone'), ''),
      NULLIF(TRIM(raw_meta->>'company_name'), ''),
      COALESCE((raw_meta->>'is_corporate')::boolean, false),
      NULLIF(TRIM(raw_meta->>'tax_number'), ''),
      NULLIF(TRIM(raw_meta->>'tax_office'), ''),
      (raw_meta->>'terms_accepted_at')::timestamptz,
      jsonb_build_object(
        'newsletter', COALESCE((raw_meta->>'newsletter_consent')::boolean, false)
      )
    )
    ON CONFLICT (id) DO UPDATE SET
      email = EXCLUDED.email,
      full_name = EXCLUDED.full_name,
      first_name = EXCLUDED.first_name,
      last_name = EXCLUDED.last_name,
      phone = EXCLUDED.phone,
      company_name = EXCLUDED.company_name,
      is_corporate = EXCLUDED.is_corporate,
      tax_number = EXCLUDED.tax_number,
      tax_office = EXCLUDED.tax_office,
      terms_accepted_at = EXCLUDED.terms_accepted_at,
      preferences = EXCLUDED.preferences;
  EXCEPTION WHEN OTHERS THEN
    RAISE LOG 'handle_new_user error for %: %', NEW.email, SQLERRM;
  END;

  -- Sync email_verified if confirmed
  IF NEW.email_confirmed_at IS NOT NULL THEN
    UPDATE public.users
    SET email_verified = true,
        email_verified_at = NEW.email_confirmed_at
    WHERE id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$;
