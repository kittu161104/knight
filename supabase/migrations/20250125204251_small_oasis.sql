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
BEGIN
  -- Only create notification when status changes to approved or rejected
  IF NEW.status IN ('approved', 'rejected') AND OLD.status != NEW.status THEN
    INSERT INTO notifications (
      user_id,      -- Set this to the submission owner's user_id
      actor_id,     -- Set this to the reviewer's ID (auth.uid())
      type,
      message,
      data,
      created_at,
      updated_at
    ) VALUES (
      NEW.user_id,  -- The submission owner will receive the notification
      auth.uid(),   -- The current user (reviewer) is the actor
      'review',
      CASE NEW.status
        WHEN 'approved' THEN 'Your submission has been approved with a score of ' || NEW.score || '/100'
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
  RETURN NEW;
END;
$$;

-- Recreate trigger
CREATE TRIGGER on_submission_reviewed
  AFTER UPDATE ON contest_submissions
  FOR EACH ROW
  EXECUTE FUNCTION on_submission_reviewed();