/*
  # Fix Contest Creation Function

  1. Changes
    - Consolidate manage_contest function
    - Add proper error handling
    - Improve input validation
    - Add audit logging

  2. Security
    - Strengthen admin verification
    - Add transaction support
    - Improve error messages
*/

-- Drop existing function variations
DROP FUNCTION IF EXISTS manage_contest(text, text, text, text, timestamptz, contest_status, jsonb);
DROP FUNCTION IF EXISTS manage_contest(text, text, text, text, timestamptz, contest_status, jsonb, text);

-- Create single, consolidated function
CREATE OR REPLACE FUNCTION manage_contest(
  p_title text DEFAULT NULL,
  p_description text DEFAULT NULL,
  p_prize text DEFAULT NULL,
  p_entry_fee text DEFAULT NULL,
  p_deadline timestamptz DEFAULT NULL,
  p_status contest_status DEFAULT 'draft',
  p_guidelines jsonb DEFAULT '{}'::jsonb
)
RETURNS SETOF contests
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_user_id uuid;
  v_changes jsonb;
BEGIN
  -- Get current user ID
  v_user_id := auth.uid();
  
  -- Check if user exists and is authenticated
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Check if user is admin
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = v_user_id AND is_admin = true
  ) THEN
    RAISE EXCEPTION 'Permission denied: Admin access required';
  END IF;

  -- If all parameters are null, return all contests for admin
  IF p_title IS NULL AND 
     p_description IS NULL AND 
     p_prize IS NULL AND 
     p_entry_fee IS NULL AND 
     p_deadline IS NULL THEN
    RETURN QUERY SELECT * FROM contests ORDER BY created_at DESC;
    RETURN;
  END IF;

  -- Validate input for creation
  IF p_title IS NULL OR p_title = '' THEN
    RAISE EXCEPTION 'Title is required';
  END IF;

  IF p_description IS NULL OR p_description = '' THEN
    RAISE EXCEPTION 'Description is required';
  END IF;

  IF p_deadline IS NULL OR p_deadline <= now() THEN
    RAISE EXCEPTION 'Deadline must be in the future';
  END IF;

  -- Start transaction
  BEGIN
    -- Insert contest and return the result
    RETURN QUERY
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
    RETURNING *;

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
      currval('contests_id_seq'),
      v_user_id,
      v_changes
    );

  EXCEPTION WHEN OTHERS THEN
    -- Log error details
    INSERT INTO audit_logs (
      action,
      table_name,
      record_id,
      user_id,
      changes
    ) VALUES (
      'error',
      'contests',
      NULL,
      v_user_id,
      jsonb_build_object(
        'error', SQLERRM,
        'context', jsonb_build_object(
          'title', p_title,
          'description', p_description
        )
      )
    );
    
    RAISE;
  END;
END;
$$;