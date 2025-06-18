/*
  # Fix Contest RLS Policies

  1. Changes
    - Drop existing policies and functions
    - Create new admin verification function
    - Create new contest management function
    - Create comprehensive RLS policies
    - Add proper grants

  2. Security
    - Ensure proper admin checks
    - Protect contest management
    - Enable proper public access
*/

-- Drop existing policies and functions
DROP POLICY IF EXISTS "contests_select_policy" ON contests;
DROP POLICY IF EXISTS "contests_insert_policy" ON contests;
DROP POLICY IF EXISTS "contests_update_policy" ON contests;
DROP POLICY IF EXISTS "contests_delete_policy" ON contests;
DROP FUNCTION IF EXISTS manage_contest(text, text, text, text, timestamptz, contest_status, jsonb);
DROP FUNCTION IF EXISTS is_admin();

-- Create admin verification function
CREATE OR REPLACE FUNCTION is_admin(user_id uuid DEFAULT auth.uid())
RETURNS boolean
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = user_id
    AND is_admin = true
  );
END;
$$;

-- Create contest management function
CREATE OR REPLACE FUNCTION manage_contest(
  p_title text,
  p_description text,
  p_prize text,
  p_entry_fee text,
  p_deadline timestamptz,
  p_status contest_status DEFAULT 'draft',
  p_guidelines jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_contest_id uuid;
BEGIN
  -- Verify admin status
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Permission denied: Only admins can manage contests';
  END IF;

  -- Insert contest
  INSERT INTO contests (
    title,
    description,
    prize,
    entry_fee,
    deadline,
    status,
    guidelines,
    created_by,
    created_at,
    updated_at
  ) VALUES (
    p_title,
    p_description,
    p_prize,
    p_entry_fee,
    p_deadline,
    p_status,
    p_guidelines,
    auth.uid(),
    now(),
    now()
  )
  RETURNING id INTO v_contest_id;

  RETURN v_contest_id;
END;
$$;

-- Create RLS policies
CREATE POLICY "contests_select"
  ON contests FOR SELECT
  USING (
    status = 'active' OR
    (auth.role() = 'authenticated' AND is_admin())
  );

CREATE POLICY "contests_insert"
  ON contests FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated' AND
    is_admin()
  );

CREATE POLICY "contests_update"
  ON contests FOR UPDATE
  USING (
    auth.role() = 'authenticated' AND
    is_admin()
  );

CREATE POLICY "contests_delete"
  ON contests FOR DELETE
  USING (
    auth.role() = 'authenticated' AND
    is_admin()
  );

-- Ensure RLS is enabled
ALTER TABLE contests FORCE ROW LEVEL SECURITY;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO anon;
GRANT SELECT ON contests TO authenticated;
GRANT SELECT ON contests TO anon;
GRANT ALL ON contests TO authenticated;