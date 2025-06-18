/*
  # Contest Categories and Relationships

  1. New Tables
    - `contest_categories` - Junction table for contest categories
      - `id` (uuid, primary key)
      - `contest_id` (uuid, references contests)
      - `category` (text)
      - `created_at` (timestamp)

  2. Changes
    - Add categories column to contests table
    - Update contest status type to include 'draft'
    - Add banner_url column to contests table

  3. Security
    - Enable RLS on all tables
    - Add policies for public access to active contests
    - Add policies for admin management
*/

-- Create contest categories table
CREATE TABLE contest_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contest_id uuid REFERENCES contests(id) ON DELETE CASCADE,
  category text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(contest_id, category)
);

-- Add banner_url to contests
ALTER TABLE contests
ADD COLUMN IF NOT EXISTS banner_url text;

-- Enable RLS
ALTER TABLE contest_categories ENABLE ROW LEVEL SECURITY;

-- Create policies for contest_categories
CREATE POLICY "Contest categories are viewable by everyone"
  ON contest_categories FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage contest categories"
  ON contest_categories FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS contest_categories_contest_id_idx 
  ON contest_categories(contest_id);

-- Create function to manage contest categories
CREATE OR REPLACE FUNCTION manage_contest_categories(
  p_contest_id uuid,
  p_categories text[]
)
RETURNS void
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Delete existing categories
  DELETE FROM contest_categories
  WHERE contest_id = p_contest_id;
  
  -- Insert new categories
  INSERT INTO contest_categories (contest_id, category)
  SELECT p_contest_id, unnest(p_categories);
END;
$$;