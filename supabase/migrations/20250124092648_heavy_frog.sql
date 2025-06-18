/*
  # Fix Profile RLS Policies

  1. Changes
    - Drop existing policies
    - Create new comprehensive policies for profiles table
    - Allow authenticated users to create their own profile
    - Allow users to update their own profile
    - Allow admins to update any profile
    - Allow public read access

  2. Security
    - Maintain data integrity with proper checks
    - Ensure users can only modify their own data
    - Grant admin users special privileges
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

-- Create new policies
CREATE POLICY "profiles_select"
ON profiles FOR SELECT
USING (true);

CREATE POLICY "profiles_insert"
ON profiles FOR INSERT
WITH CHECK (
  auth.uid() = id
);

CREATE POLICY "profiles_update"
ON profiles FOR UPDATE
USING (
  auth.uid() = id OR
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND is_admin = true
  )
);

CREATE POLICY "profiles_delete"
ON profiles FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND is_admin = true
  )
);