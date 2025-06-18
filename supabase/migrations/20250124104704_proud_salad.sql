-- Create storage bucket for contest submissions
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('contest-submissions', 'contest-submissions', true)
ON CONFLICT (id) DO NOTHING;

-- Set up storage policies for contest submissions bucket
CREATE POLICY "Contest submissions are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'contest-submissions');

CREATE POLICY "Authenticated users can upload contest submissions"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'contest-submissions' AND
    auth.role() = 'authenticated'
  );

CREATE POLICY "Users can update their own submissions"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'contest-submissions' AND
    auth.uid() = owner
  );

CREATE POLICY "Users can delete their own submissions"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'contest-submissions' AND
    auth.uid() = owner
  );

-- Create function to clean up storage when submission is deleted
CREATE OR REPLACE FUNCTION delete_submission_storage()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Extract filename from file_url
  DECLARE
    filename text;
  BEGIN
    filename := substring(OLD.file_url from '/([^/]+)$');
    IF filename IS NOT NULL THEN
      -- Delete file from storage
      PERFORM extensions.http((
        'DELETE',
        current_setting('app.settings.supabase_url') || '/storage/v1/object/contest-submissions/' || filename,
        ARRAY[
          extensions.http_header('Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'))
        ],
        NULL,
        NULL
      ));
    END IF;
  END;
  RETURN OLD;
END;
$$;

-- Create trigger to clean up storage
DROP TRIGGER IF EXISTS on_submission_delete ON contest_submissions;
CREATE TRIGGER on_submission_delete
  BEFORE DELETE ON contest_submissions
  FOR EACH ROW
  EXECUTE FUNCTION delete_submission_storage();