-- Drop existing trigger and function
DROP TRIGGER IF EXISTS on_submission_reviewed ON contest_submissions;
DROP FUNCTION IF EXISTS on_submission_reviewed();

-- Create improved trigger function for submission reviews
CREATE OR REPLACE FUNCTION on_submission_reviewed()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_user_id uuid;
  v_actor_id uuid;
BEGIN
  -- Get the current user ID (reviewer)
  v_actor_id := auth.uid();
  
  -- Get the submission owner's ID
  v_user_id := NEW.user_id;

  -- Only create notification when status changes to approved or rejected
  IF NEW.status IN ('approved', 'rejected') AND OLD.status != NEW.status THEN
    -- Validate user IDs
    IF v_user_id IS NULL THEN
      RAISE EXCEPTION 'Cannot create notification: submission user_id is null';
    END IF;

    -- Create notification
    INSERT INTO notifications (
      user_id,
      actor_id,
      type,
      message,
      data,
      created_at,
      updated_at
    ) VALUES (
      v_user_id,
      v_actor_id,
      'review',
      CASE NEW.status
        WHEN 'approved' THEN 'Your submission has been approved with a score of ' || COALESCE(NEW.score::text, '0') || '/100'
        ELSE 'Your submission has been rejected'
      END,
      jsonb_build_object(
        'submission_id', NEW.id,
        'contest_id', NEW.contest_id,
        'status', NEW.status,
        'score', NEW.score,
        'feedback', NEW.feedback
      ),
      now(),
      now()
    );
  END IF;

  -- Ensure score is within valid range
  IF NEW.score IS NOT NULL THEN
    IF NEW.score < 0 OR NEW.score > 100 THEN
      RAISE EXCEPTION 'Score must be between 0 and 100';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Recreate trigger
CREATE TRIGGER on_submission_reviewed
  AFTER UPDATE ON contest_submissions
  FOR EACH ROW
  EXECUTE FUNCTION on_submission_reviewed();

-- Create function to safely update submission status
CREATE OR REPLACE FUNCTION update_submission_status(
  p_submission_id uuid,
  p_status submission_status,
  p_score numeric DEFAULT NULL,
  p_feedback text DEFAULT NULL
)
RETURNS void
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Validate score
  IF p_score IS NOT NULL AND (p_score < 0 OR p_score > 100) THEN
    RAISE EXCEPTION 'Score must be between 0 and 100';
  END IF;

  -- Update submission
  UPDATE contest_submissions
  SET
    status = p_status,
    score = p_score,
    feedback = p_feedback,
    updated_at = now()
  WHERE id = p_submission_id;

  -- Handle errors
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Submission not found';
  END IF;
END;
$$;