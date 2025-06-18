/*
  # Create user works table and storage

  1. New Tables
    - `user_works`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key)
      - `title` (text)
      - `description` (text)
      - `file_path` (text)
      - `work_type` (enum)
      - `upload_date` (timestamptz)
      - `status` (enum)

  2. Security
    - Enable RLS on `user_works` table
    - Add policies for CRUD operations
*/

-- Create work type enum
CREATE TYPE work_type AS ENUM (
  'image',
  'video',
  'document'
);

-- Create status enum
CREATE TYPE work_status AS ENUM (
  'public',
  'private'
);

-- Create user works table
CREATE TABLE user_works (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  description text,
  file_path text NOT NULL,
  work_type work_type NOT NULL,
  upload_date timestamptz DEFAULT now(),
  status work_status DEFAULT 'public',
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE user_works ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view public works"
  ON user_works
  FOR SELECT
  USING (status = 'public' OR auth.uid() = user_id);

CREATE POLICY "Users can insert own works"
  ON user_works
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own works"
  ON user_works
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own works"
  ON user_works
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_works_updated_at
  BEFORE UPDATE ON user_works
  FOR EACH ROW
  EXECUTE PROCEDURE update_updated_at_column();