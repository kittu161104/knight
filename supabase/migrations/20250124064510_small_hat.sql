/*
  # Admin System Tables

  1. New Tables
    - `contests`
      - Contest management table
      - Stores contest details, rules, and status
    - `contest_submissions`
      - Submissions from users for contests
      - Links users, contests, and their work
    - `contest_judges`
      - Judges assigned to contests
      - Links users as judges to specific contests
    - `judge_scores`
      - Scoring table for contest submissions
      - Stores judge evaluations and feedback

  2. Updates
    - Add `is_admin` column to profiles table
    - Add necessary indexes for performance
    
  3. Security
    - Enable RLS on all new tables
    - Create policies for admin access
    - Create policies for judge access
*/

-- Add is_admin column to profiles if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' 
    AND column_name = 'is_admin'
  ) THEN
    ALTER TABLE profiles ADD COLUMN is_admin boolean DEFAULT false;
  END IF;
END $$;

-- Create contest status enum
CREATE TYPE contest_status AS ENUM ('draft', 'active', 'paused', 'completed');

-- Create submission status enum
CREATE TYPE submission_status AS ENUM ('pending', 'approved', 'rejected');

-- Create contests table
CREATE TABLE IF NOT EXISTS contests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL,
  prize text NOT NULL,
  entry_fee text NOT NULL,
  deadline timestamptz NOT NULL,
  status contest_status DEFAULT 'draft',
  guidelines jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES profiles(id) ON DELETE CASCADE
);

-- Create contest submissions table
CREATE TABLE IF NOT EXISTS contest_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contest_id uuid REFERENCES contests(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  file_url text NOT NULL,
  status submission_status DEFAULT 'pending',
  score numeric(4,2) CHECK (score >= 0 AND score <= 100),
  feedback text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create contest judges table
CREATE TABLE IF NOT EXISTS contest_judges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contest_id uuid REFERENCES contests(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(contest_id, user_id)
);

-- Create judge scores table
CREATE TABLE IF NOT EXISTS judge_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid REFERENCES contest_submissions(id) ON DELETE CASCADE,
  judge_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  score numeric(4,2) CHECK (score >= 0 AND score <= 100),
  feedback text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(submission_id, judge_id)
);

-- Enable RLS
ALTER TABLE contests ENABLE ROW LEVEL SECURITY;
ALTER TABLE contest_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE contest_judges ENABLE ROW LEVEL SECURITY;
ALTER TABLE judge_scores ENABLE ROW LEVEL SECURITY;

-- Contests policies
CREATE POLICY "Public contests are viewable by everyone"
  ON contests FOR SELECT
  USING (status = 'active' OR EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true
  ));

CREATE POLICY "Admins can insert contests"
  ON contests FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true
  ));

CREATE POLICY "Admins can update contests"
  ON contests FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true
  ));

CREATE POLICY "Admins can delete contests"
  ON contests FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true
  ));

-- Contest submissions policies
CREATE POLICY "Users can view their own submissions"
  ON contest_submissions FOR SELECT
  USING (
    user_id = auth.uid() OR 
    EXISTS (
      SELECT 1 FROM contest_judges 
      WHERE contest_id = contest_submissions.contest_id 
      AND user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true
    )
  );

CREATE POLICY "Users can submit to active contests"
  ON contest_submissions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM contests 
      WHERE id = contest_id 
      AND status = 'active'
    )
  );

CREATE POLICY "Admins and judges can update submissions"
  ON contest_submissions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM contest_judges 
      WHERE contest_id = contest_submissions.contest_id 
      AND user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Contest judges policies
CREATE POLICY "Contest judges are viewable by everyone"
  ON contest_judges FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage judges"
  ON contest_judges FOR ALL
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true
  ));

-- Judge scores policies
CREATE POLICY "Scores are viewable by admins and relevant users"
  ON judge_scores FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM contest_submissions 
      WHERE id = submission_id 
      AND user_id = auth.uid()
    ) OR
    judge_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true
    )
  );

CREATE POLICY "Judges can score their assigned contests"
  ON judge_scores FOR INSERT
  WITH CHECK (
    auth.uid() = judge_id AND
    EXISTS (
      SELECT 1 FROM contest_judges cj
      JOIN contest_submissions cs ON cs.contest_id = cj.contest_id
      WHERE cj.user_id = auth.uid()
      AND cs.id = submission_id
    )
  );

CREATE POLICY "Judges can update their own scores"
  ON judge_scores FOR UPDATE
  USING (auth.uid() = judge_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS contests_status_idx ON contests(status);
CREATE INDEX IF NOT EXISTS contest_submissions_status_idx ON contest_submissions(status);
CREATE INDEX IF NOT EXISTS contest_submissions_contest_id_idx ON contest_submissions(contest_id);
CREATE INDEX IF NOT EXISTS contest_judges_contest_id_idx ON contest_judges(contest_id);
CREATE INDEX IF NOT EXISTS judge_scores_submission_id_idx ON judge_scores(submission_id);

-- Create updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_contests_updated_at
  BEFORE UPDATE ON contests
  FOR EACH ROW
  EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_contest_submissions_updated_at
  BEFORE UPDATE ON contest_submissions
  FOR EACH ROW
  EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_judge_scores_updated_at
  BEFORE UPDATE ON judge_scores
  FOR EACH ROW
  EXECUTE PROCEDURE update_updated_at_column();