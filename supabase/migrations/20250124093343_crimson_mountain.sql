/*
  # Fix Profile Creation and RLS

  1. Changes
    - Create stored procedure for profile creation
    - Update RLS policies
    - Add trigger for profile creation
    
  2. Security
    - Enable RLS
    - Add comprehensive policies
    - Use stored procedure for secure profile creation
*/

-- Create a stored procedure for profile creation
CREATE OR REPLACE FUNCTION create_profile(
  user_id uuid,
  user_email text,
  user_specialty text,
  user_bio text
) RETURNS void AS $$
BEGIN
  INSERT INTO profiles (
    id,
    username,
    specialty,
    bio,
    created_at,
    updated_at
  ) VALUES (
    user_id,
    split_part(user_email, '@', 1),
    user_specialty::specialty_type,
    user_bio,
    now(),
    now()
  )
  ON CONFLICT (id) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing policies
DROP POLICY IF EXISTS "Anyone can view profiles" ON profiles;
DROP POLICY IF EXISTS "Users can create their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile or admins can update any" ON profiles;
DROP POLICY IF EXISTS "Only admins can delete profiles" ON profiles;

-- Create new policies
CREATE POLICY "profiles_select"
  ON profiles FOR SELECT
  USING (true);

CREATE POLICY "profiles_insert"
  ON profiles FOR INSERT
  WITH CHECK (
    auth.uid() = id OR
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.uid() = profiles.id
    )
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

-- Create trigger for automatic profile creation
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO profiles (id, username, specialty, bio)
  VALUES (
    new.id,
    split_part(new.email, '@', 1),
    'editing',
    'Filmmaker • Director • Editor'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();