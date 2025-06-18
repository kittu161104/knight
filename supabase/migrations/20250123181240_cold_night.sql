/*
  # Fix Database Schema

  1. Changes
    - Add foreign key relationship between user_works and profiles
    - Update likes and comments to reference user_works instead of posts
    - Add missing indexes for performance

  2. Security
    - Drop existing policies first to avoid conflicts
    - Add new policies with unique names
*/

-- Drop existing policies first
DROP POLICY IF EXISTS "Anyone can view likes" ON likes;
DROP POLICY IF EXISTS "Authenticated users can like" ON likes;
DROP POLICY IF EXISTS "Users can unlike" ON likes;
DROP POLICY IF EXISTS "Anyone can view comments" ON comments;
DROP POLICY IF EXISTS "Authenticated users can comment" ON comments;
DROP POLICY IF EXISTS "Users can delete own comments" ON comments;

-- Drop existing foreign key constraints
ALTER TABLE likes DROP CONSTRAINT IF EXISTS likes_post_id_fkey;
ALTER TABLE comments DROP CONSTRAINT IF EXISTS comments_post_id_fkey;

-- Update user_works to reference profiles
ALTER TABLE user_works
  DROP CONSTRAINT IF EXISTS user_works_user_id_fkey,
  ADD CONSTRAINT user_works_user_id_fkey 
  FOREIGN KEY (user_id) 
  REFERENCES profiles(id) 
  ON DELETE CASCADE;

-- Update likes to reference user_works
ALTER TABLE likes
  ADD CONSTRAINT likes_post_id_fkey 
  FOREIGN KEY (post_id) 
  REFERENCES user_works(id) 
  ON DELETE CASCADE;

-- Update comments to reference user_works
ALTER TABLE comments
  ADD CONSTRAINT comments_post_id_fkey 
  FOREIGN KEY (post_id) 
  REFERENCES user_works(id) 
  ON DELETE CASCADE;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS user_works_user_id_idx ON user_works(user_id);
CREATE INDEX IF NOT EXISTS likes_post_id_idx ON likes(post_id);
CREATE INDEX IF NOT EXISTS likes_user_id_idx ON likes(user_id);
CREATE INDEX IF NOT EXISTS comments_post_id_idx ON comments(post_id);
CREATE INDEX IF NOT EXISTS comments_user_id_idx ON comments(user_id);

-- Enable RLS on all tables
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- Create policies for likes with unique names
CREATE POLICY "likes_select_policy"
  ON likes FOR SELECT
  USING (true);

CREATE POLICY "likes_insert_policy"
  ON likes FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "likes_delete_policy"
  ON likes FOR DELETE
  USING (auth.uid() = user_id);

-- Create policies for comments with unique names
CREATE POLICY "comments_select_policy"
  ON comments FOR SELECT
  USING (true);

CREATE POLICY "comments_insert_policy"
  ON comments FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "comments_delete_policy"
  ON comments FOR DELETE
  USING (auth.uid() = user_id);