-- Create contest-submissions bucket if it doesn't exist
DO $$ 
BEGIN
  -- Create bucket if it doesn't exist
  INSERT INTO storage.buckets (id, name, public)
  VALUES ('contest-submissions', 'contest-submissions', true)
  ON CONFLICT (id) DO NOTHING;

  -- Drop existing policies if they exist
  DROP POLICY IF EXISTS "Contest submissions are publicly accessible" ON storage.objects;
  DROP POLICY IF EXISTS "Authenticated users can upload contest submissions" ON storage.objects;
  DROP POLICY IF EXISTS "Users can update their own submissions" ON storage.objects;
  DROP POLICY IF EXISTS "Users can delete their own submissions" ON storage.objects;

  -- Create new policies with unique names
  CREATE POLICY "contest_submissions_select_policy"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'contest-submissions');

  CREATE POLICY "contest_submissions_insert_policy"
    ON storage.objects FOR INSERT
    WITH CHECK (
      bucket_id = 'contest-submissions' AND
      auth.role() = 'authenticated'
    );

  CREATE POLICY "contest_submissions_update_policy"
    ON storage.objects FOR UPDATE
    USING (
      bucket_id = 'contest-submissions' AND
      auth.uid() = owner
    );

  CREATE POLICY "contest_submissions_delete_policy"
    ON storage.objects FOR DELETE
    USING (
      bucket_id = 'contest-submissions' AND
      auth.uid() = owner
    );
END $$;