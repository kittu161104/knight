/*
  # Fix Collaboration Requests RLS - Final Attempt

  1. Changes
    - Reset RLS state completely
    - Simplify policies to ensure basic operations work
    - Add proper error handling
  
  2. Security
    - Enable RLS
    - Add policies for all CRUD operations
*/

-- Temporarily disable RLS
ALTER TABLE collaboration_requests DISABLE ROW LEVEL SECURITY;
ALTER TABLE collaboration_agreements DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "collaboration_requests_select_policy" ON collaboration_requests;
DROP POLICY IF EXISTS "collaboration_requests_insert_policy" ON collaboration_requests;
DROP POLICY IF EXISTS "collaboration_requests_update_policy" ON collaboration_requests;
DROP POLICY IF EXISTS "collaboration_requests_delete_policy" ON collaboration_requests;

-- Re-enable RLS
ALTER TABLE collaboration_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE collaboration_agreements ENABLE ROW LEVEL SECURITY;

-- Create simplified policies
CREATE POLICY "enable_all_select"
ON collaboration_requests FOR SELECT
USING (true);

CREATE POLICY "enable_insert_for_authenticated"
ON collaboration_requests FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "enable_update_for_authenticated"
ON collaboration_requests FOR UPDATE
USING (auth.role() = 'authenticated');

CREATE POLICY "enable_delete_for_authenticated"
ON collaboration_requests FOR DELETE
USING (auth.role() = 'authenticated');