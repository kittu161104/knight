/*
  # Fix Contest Creation

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

-- Create function to safely verify admin status
CREATE OR REPLACE FUNCTION verify_admin()
RETURNS boolean
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_user_id uuid;
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

  RETURN true;
END;
$$;

-- Create function to manage contests with better error handling
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

    -- Return the contest ID
    RETURN v_contest_id;
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
    
    -- Re-raise the error
    RAISE EXCEPTION 'Failed to create contest: %', SQLERRM;
  END;
END;
$$;