/*
  # Update specialty type enum
  
  1. Changes
    - Temporarily change specialty column type to text
    - Drop and recreate specialty_type enum with correct values
    - Convert specialty column back to enum type
    
  2. Security
    - Maintains existing RLS policies
*/

-- Temporarily change specialty column to text
ALTER TABLE profiles 
  ALTER COLUMN specialty TYPE text;

-- Drop and recreate the enum
DROP TYPE specialty_type;
CREATE TYPE specialty_type AS ENUM (
  'directing',
  'cinematography',
  'editing',
  'sound',
  'vfx'
);

-- Convert existing values to lowercase
UPDATE profiles 
SET specialty = LOWER(specialty)
WHERE specialty IS NOT NULL;

-- Change specialty column back to enum type
ALTER TABLE profiles 
  ALTER COLUMN specialty TYPE specialty_type 
  USING specialty::specialty_type;