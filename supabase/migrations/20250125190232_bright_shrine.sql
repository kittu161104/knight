-- Create notification type enum
CREATE TYPE notification_type AS ENUM (
  'like',
  'comment',
  'contest',
  'review'
);

-- Create notifications table
CREATE TABLE notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  actor_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  type notification_type NOT NULL,
  message text,
  read boolean DEFAULT false,
  data jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can create notifications"
  ON notifications FOR INSERT
  WITH CHECK (
    -- Allow system functions to create notifications
    (current_setting('role', true) = 'rls_restricted') OR
    -- Allow authenticated users to create notifications for others
    (auth.role() = 'authenticated')
  );

CREATE POLICY "Users can update their own notifications"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX notifications_user_id_idx ON notifications(user_id);
CREATE INDEX notifications_actor_id_idx ON notifications(actor_id);
CREATE INDEX notifications_created_at_idx ON notifications(created_at DESC);
CREATE INDEX notifications_read_idx ON notifications(read);

-- Create function to create notifications
CREATE OR REPLACE FUNCTION create_notification(
  p_user_id uuid,
  p_actor_id uuid,
  p_type notification_type,
  p_message text DEFAULT NULL,
  p_data jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_notification_id uuid;
BEGIN
  INSERT INTO notifications (
    user_id,
    actor_id,
    type,
    message,
    data,
    created_at,
    updated_at
  ) VALUES (
    p_user_id,
    p_actor_id,
    p_type,
    p_message,
    p_data,
    now(),
    now()
  )
  RETURNING id INTO v_notification_id;

  RETURN v_notification_id;
END;
$$;

-- Create trigger function for likes
CREATE OR REPLACE FUNCTION on_like_added()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Get the post owner's ID
  DECLARE
    post_owner_id uuid;
  BEGIN
    SELECT user_id INTO post_owner_id
    FROM user_works
    WHERE id = NEW.post_id;

    -- Only create notification if liking someone else's post
    IF post_owner_id != NEW.user_id THEN
      PERFORM create_notification(
        post_owner_id,
        NEW.user_id,
        'like',
        NULL,
        jsonb_build_object('post_id', NEW.post_id)
      );
    END IF;
  END;
  RETURN NEW;
END;
$$;

-- Create trigger function for comments
CREATE OR REPLACE FUNCTION on_comment_added()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Get the post owner's ID
  DECLARE
    post_owner_id uuid;
  BEGIN
    SELECT user_id INTO post_owner_id
    FROM user_works
    WHERE id = NEW.post_id;

    -- Only create notification if commenting on someone else's post
    IF post_owner_id != NEW.user_id THEN
      PERFORM create_notification(
        post_owner_id,
        NEW.user_id,
        'comment',
        NEW.content,
        jsonb_build_object('post_id', NEW.post_id)
      );
    END IF;
  END;
  RETURN NEW;
END;
$$;

-- Create trigger function for contests
CREATE OR REPLACE FUNCTION on_contest_created()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only create notifications for active contests
  IF NEW.status = 'active' THEN
    -- Notify all users except the creator
    INSERT INTO notifications (
      user_id,
      actor_id,
      type,
      message,
      data
    )
    SELECT
      id,
      NEW.created_by,
      'contest',
      'New contest available: ' || NEW.title,
      jsonb_build_object('contest_id', NEW.id)
    FROM profiles
    WHERE id != NEW.created_by;
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger function for submission reviews
CREATE OR REPLACE FUNCTION on_submission_reviewed()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only create notification when status changes to approved or rejected
  IF NEW.status IN ('approved', 'rejected') AND OLD.status != NEW.status THEN
    PERFORM create_notification(
      NEW.user_id,
      NULL,
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
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

-- Create triggers
CREATE TRIGGER on_like_added
  AFTER INSERT ON likes
  FOR EACH ROW
  EXECUTE FUNCTION on_like_added();

CREATE TRIGGER on_comment_added
  AFTER INSERT ON comments
  FOR EACH ROW
  EXECUTE FUNCTION on_comment_added();

CREATE TRIGGER on_contest_created
  AFTER INSERT OR UPDATE ON contests
  FOR EACH ROW
  EXECUTE FUNCTION on_contest_created();

CREATE TRIGGER on_submission_reviewed
  AFTER UPDATE ON contest_submissions
  FOR EACH ROW
  EXECUTE FUNCTION on_submission_reviewed();