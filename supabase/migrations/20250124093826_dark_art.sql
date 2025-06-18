/*
  # Fix Profile Creation and Permissions

  1. Changes
    - Drop existing policies and triggers
    - Create new RLS policies with proper permissions
    - Add function to safely create profiles
    - Add trigger for automatic profile creation
    - Add function to safely update admin status

  2. Security
    - Ensure proper RLS for all operations
    - Use security definer functions for privileged operations
    - Add proper checks and validations
*/

-- Drop existing policies and triggers
DROP POLICY IF EXISTS "profiles_select" ON profiles;
DROP POLICY IF EXISTS "profiles_insert" ON profiles;
DROP POLICY IF EXISTS "profiles_update" ON profiles;
DROP POLICY IF EXISTS "profiles_delete" ON profiles;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();
DROP FUNCTION IF EXISTS create_profile(uuid, text, text, text);

-- Create function to safely create profiles
CREATE OR REPLACE FUNCTION create_profile(
  user_id uuid,
  user_email text,
  user_specialty text DEFAULT 'editing',
  user_bio text DEFAULT 'Filmmaker • Director • Editor'
)
RETURNS void
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    username,
    specialty,
    bio,
    created_at,
    updated_at,
    is_admin
  ) VALUES (
    user_id,
    split_part(user_email, '@', 1),
    user_specialty::specialty_type,
    user_bio,
    now(),
    now(),
    false
  )
  ON CONFLICT (id) DO NOTHING;
END;
$$;

-- Create function to safely update admin status
CREATE OR REPLACE FUNCTION update_admin_status(
  target_user_id uuid,
  admin_status boolean
)
RETURNS void
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Check if the executing user is an admin
  IF EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND is_admin = true
  ) THEN
    UPDATE profiles
    SET 
      is_admin = admin_status,
      updated_at = now()
    WHERE id = target_user_id;
  ELSE
    RAISE EXCEPTION 'Permission denied: Only admins can update admin status';
  END IF;
END;
$$;

-- Create trigger function for automatic profile creation
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    username,
    specialty,
    bio,
    created_at,
    updated_at,
    is_admin
  ) VALUES (
    NEW.id,
    split_part(NEW.email, '@', 1),
    'editing',
    'Filmmaker • Director • Editor',
    now(),
    now(),
    false
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Create trigger for automatic profile creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Create RLS policies
CREATE POLICY "Profiles are viewable by everyone"
  ON profiles FOR SELECT
  USING (true);

-- Split update policy into two separate policies
CREATE POLICY "Users can update own non-admin profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id AND
    NOT EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

CREATE POLICY "Admins can update any profile"
  ON profiles FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

CREATE POLICY "System can create profiles"
  ON profiles FOR INSERT
  WITH CHECK (
    -- Allow system functions to create profiles
    (current_setting('role', true) = 'rls_restricted') OR
    -- Allow authenticated users to create their own profile
    (auth.uid() = id)
  );

CREATE POLICY "Only admins can delete profiles"
  ON profiles FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO anon;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
GRANT INSERT, UPDATE ON public.profiles TO authenticated;

-- Ensure RLS is enabled
ALTER TABLE profiles FORCE ROW LEVEL SECURITY;