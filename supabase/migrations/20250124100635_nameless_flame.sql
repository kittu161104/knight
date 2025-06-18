/*
  # Fix Contest Management

  1. Changes
    - Add proper error handling
    - Improve admin verification
    - Add transaction support
    - Add audit logging

  2. Security
    - Strengthen RLS policies
    - Add proper role checks
    - Improve error messages
*/

-- Create audit log table
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action text NOT NULL,
  table_name text NOT NULL,
  record_id uuid NOT NULL,
  user_id uuid NOT NULL,
  changes jsonb NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on audit logs
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Create audit log policies
CREATE POLICY "Only admins can view audit logs"
  ON audit_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Create improved admin verification
CREATE OR REPLACE FUNCTION verify_admin()
RETURNS boolean
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND is_admin = true
  ) THEN
    RAISE EXCEPTION 'Permission denied: Admin access required';
  END IF;
  RETURN true;
END;
$$;

-- Create contest management function with better error handling
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
  v_user_id uuid;
  v_changes jsonb;
BEGIN
  -- Get current user ID
  v_user_id := auth.uid();
  
  -- Verify admin status
  PERFORM verify_admin();

  -- Validate input
  IF p_title IS NULL OR p_title = '' THEN
    RAISE EXCEPTION 'Title is required';
  END IF;

  IF p_description IS NULL OR p_description = '' THEN
    RAISE EXCEPTION 'Description is required';
  END IF;

  IF p_deadline <= now() THEN
    RAISE EXCEPTION 'Deadline must be in the future';
  END IF;

  -- Start transaction
  BEGIN
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
      v_user_id,
      now(),
      now()
    )
    RETURNING id INTO v_contest_id;

    -- Prepare audit log entry
    v_changes := jsonb_build_object(
      'title', p_title,
      'description', p_description,
      'prize', p_prize,
      'entry_fee', p_entry_fee,
      'deadline', p_deadline,
      'status', p_status,
      'guidelines', p_guidelines
    );

    -- Insert audit log
    INSERT INTO audit_logs (
      action,
      table_name,
      record_id,
      user_id,
      changes
    ) VALUES (
      'create',
      'contests',
      v_contest_id,
      v_user_id,
      v_changes
    );

    -- Commit transaction
    RETURN v_contest_id;
  EXCEPTION WHEN OTHERS THEN
    -- Rollback transaction
    RAISE EXCEPTION 'Failed to create contest: %', SQLERRM;
  END;
END;
$$;

-- Drop existing policies
DROP POLICY IF EXISTS "contests_select" ON contests;
DROP POLICY IF EXISTS "contests_insert" ON contests;
DROP POLICY IF EXISTS "contests_update" ON contests;
DROP POLICY IF EXISTS "contests_delete" ON contests;

-- Create improved RLS policies
CREATE POLICY "View contests"
  ON contests FOR SELECT
  USING (
    status = 'active' OR
    (auth.role() = 'authenticated' AND EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_admin = true
    ))
  );

CREATE POLICY "Create contests"
  ON contests FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated' AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

CREATE POLICY "Update contests"
  ON contests FOR UPDATE
  USING (
    auth.role() = 'authenticated' AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

CREATE POLICY "Delete contests"
  ON contests FOR DELETE
  USING (
    auth.role() = 'authenticated' AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Ensure RLS is enabled
ALTER TABLE contests FORCE ROW LEVEL SECURITY;
ALTER TABLE audit_logs FORCE ROW LEVEL SECURITY;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO anon;
GRANT SELECT ON contests TO authenticated;
GRANT SELECT ON contests TO anon;
GRANT ALL ON contests TO authenticated;
GRANT SELECT ON audit_logs TO authenticated;