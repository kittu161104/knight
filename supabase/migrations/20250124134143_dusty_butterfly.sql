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

  -- Create new policies
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Contest submissions are publicly accessible'
  ) THEN
    CREATE POLICY "Contest submissions are publicly accessible"
      ON storage.objects FOR SELECT
      USING (bucket_id = 'contest-submissions');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Authenticated users can upload contest submissions'
  ) THEN
    CREATE POLICY "Authenticated users can upload contest submissions"
      ON storage.objects FOR INSERT
      WITH CHECK (
        bucket_id = 'contest-submissions' AND
        auth.role() = 'authenticated'
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Users can update their own submissions'
  ) THEN
    CREATE POLICY "Users can update their own submissions"
      ON storage.objects FOR UPDATE
      USING (
        bucket_id = 'contest-submissions' AND
        auth.uid() = owner
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Users can delete their own submissions'
  ) THEN
    CREATE POLICY "Users can delete their own submissions"
      ON storage.objects FOR DELETE
      USING (
        bucket_id = 'contest-submissions' AND
        auth.uid() = owner
      );
  END IF;
END $$;