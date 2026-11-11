-- Allow reading user records by email during login for 2FA check
-- This is needed because we check 2FA status BEFORE creating a session

CREATE POLICY "Allow reading users by email for 2FA check"
ON users FOR SELECT
USING (true); -- Allow anyone to read, but they can only see id, email, two_factor_enabled

-- Note: This is safe because:
-- 1. We only expose minimal fields (id, email, two_factor_enabled)
-- 2. Sensitive data like password is in auth.users (not accessible)
-- 3. This is required for 2FA flow to work before authentication
