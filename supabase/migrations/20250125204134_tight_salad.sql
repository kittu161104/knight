-- Drop existing check constraints if they exist
DO $$ 
BEGIN
  -- Drop contest_submissions constraint if exists
  IF EXISTS (
    SELECT 1 FROM information_schema.check_constraints 
    WHERE constraint_name = 'contest_submissions_score_check'
  ) THEN
    ALTER TABLE contest_submissions DROP CONSTRAINT contest_submissions_score_check;
  END IF;

  -- Drop judge_scores constraint if exists
  IF EXISTS (
    SELECT 1 FROM information_schema.check_constraints 
    WHERE constraint_name = 'judge_scores_score_check'
  ) THEN
    ALTER TABLE judge_scores DROP CONSTRAINT judge_scores_score_check;
  END IF;
END $$;

-- Modify score fields to use numeric(5,2) for values up to 999.99
ALTER TABLE contest_submissions
  ALTER COLUMN score TYPE numeric(5,2);

ALTER TABLE judge_scores
  ALTER COLUMN score TYPE numeric(5,2);

-- Add new check constraints
ALTER TABLE contest_submissions
  ADD CONSTRAINT contest_submissions_score_check 
  CHECK (score IS NULL OR (score >= 0 AND score <= 100));

ALTER TABLE judge_scores
  ADD CONSTRAINT judge_scores_score_check 
  CHECK (score IS NULL OR (score >= 0 AND score <= 100));

-- Update any existing scores to ensure they're within valid range
UPDATE contest_submissions
SET score = LEAST(100, GREATEST(0, score))
WHERE score IS NOT NULL;

UPDATE judge_scores
SET score = LEAST(100, GREATEST(0, score))
WHERE score IS NOT NULL;