-- Create storage buckets for works and avatars
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('works', 'works', true),
  ('avatars', 'avatars', true);

-- Set up storage policies for works bucket
CREATE POLICY "Works are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'works');

CREATE POLICY "Users can upload works"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'works' AND
    auth.role() = 'authenticated'
  );

CREATE POLICY "Users can update their works"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'works' AND
    auth.uid() = owner
  );

CREATE POLICY "Users can delete their works"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'works' AND
    auth.uid() = owner
  );

-- Set up storage policies for avatars bucket
CREATE POLICY "Avatars are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload avatars"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars' AND
    auth.role() = 'authenticated'
  );

CREATE POLICY "Users can update their avatars"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'avatars' AND
    auth.uid() = owner
  );

CREATE POLICY "Users can delete their avatars"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'avatars' AND
    auth.uid() = owner
  );