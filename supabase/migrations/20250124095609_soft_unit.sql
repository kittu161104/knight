-- Drop existing policies
DROP POLICY IF EXISTS "Public contests are viewable by everyone" ON contests;
DROP POLICY IF EXISTS "Admins can insert contests" ON contests;
DROP POLICY IF EXISTS "Admins can update contests" ON contests;
DROP POLICY IF EXISTS "Admins can delete contests" ON contests;

-- Create new policies with better security
CREATE POLICY "contests_select"
  ON contests FOR SELECT
  USING (
    status = 'active' OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

CREATE POLICY "contests_insert"
  ON contests FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

CREATE POLICY "contests_update"
  ON contests FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

CREATE POLICY "contests_delete"
  ON contests FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Create helper function for contest management
CREATE OR REPLACE FUNCTION manage_contest(
  p_title text,
  p_description text,
  p_prize text,
  p_entry_fee text,
  p_deadline timestamptz,
  p_status contest_status,
  p_guidelines jsonb DEFAULT '{}'::jsonb,
  p_banner_url text DEFAULT null
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
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND is_admin = true
  ) THEN
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
    banner_url,
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
    p_banner_url,
    auth.uid(),
    now(),
    now()
  )
  RETURNING id INTO v_contest_id;

  RETURN v_contest_id;
END;
$$;