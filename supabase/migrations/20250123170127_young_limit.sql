/*
  # Fix Collaboration Tables Policies

  1. Changes
    - Reset RLS state for both tables
    - Add comprehensive policies for both tables
    - Ensure proper authentication checks
  
  2. Security
    - Enable RLS for both tables
    - Add policies for all CRUD operations
    - Maintain proper access control
*/

-- Temporarily disable RLS
ALTER TABLE collaboration_requests DISABLE ROW LEVEL SECURITY;
ALTER TABLE collaboration_agreements DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "enable_all_select" ON collaboration_requests;
DROP POLICY IF EXISTS "enable_insert_for_authenticated" ON collaboration_requests;
DROP POLICY IF EXISTS "enable_update_for_authenticated" ON collaboration_requests;
DROP POLICY IF EXISTS "enable_delete_for_authenticated" ON collaboration_requests;

DROP POLICY IF EXISTS "Users can view their own agreements" ON collaboration_agreements;
DROP POLICY IF EXISTS "Users can create agreements" ON collaboration_agreements;
DROP POLICY IF EXISTS "Users can update their own agreements" ON collaboration_agreements;

-- Re-enable RLS
ALTER TABLE collaboration_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE collaboration_agreements ENABLE ROW LEVEL SECURITY;

-- Create policies for collaboration_requests
CREATE POLICY "collaboration_requests_select"
ON collaboration_requests FOR SELECT
USING (true);

CREATE POLICY "collaboration_requests_insert"
ON collaboration_requests FOR INSERT
WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "collaboration_requests_update"
ON collaboration_requests FOR UPDATE
USING (auth.uid() IN (sender_id, receiver_id));

CREATE POLICY "collaboration_requests_delete"
ON collaboration_requests FOR DELETE
USING (auth.uid() IN (sender_id, receiver_id));

-- Create policies for collaboration_agreements
CREATE POLICY "collaboration_agreements_select"
ON collaboration_agreements FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM collaboration_requests
    WHERE collaboration_requests.id = request_id
    AND (collaboration_requests.sender_id = auth.uid() 
      OR collaboration_requests.receiver_id = auth.uid())
  )
);

CREATE POLICY "collaboration_agreements_insert"
ON collaboration_agreements FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM collaboration_requests
    WHERE collaboration_requests.id = request_id
    AND (collaboration_requests.sender_id = auth.uid() 
      OR collaboration_requests.receiver_id = auth.uid())
  )
);

CREATE POLICY "collaboration_agreements_update"
ON collaboration_agreements FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM collaboration_requests
    WHERE collaboration_requests.id = request_id
    AND (collaboration_requests.sender_id = auth.uid() 
      OR collaboration_requests.receiver_id = auth.uid())
  )
);

CREATE POLICY "collaboration_agreements_delete"
ON collaboration_agreements FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM collaboration_requests
    WHERE collaboration_requests.id = request_id
    AND (collaboration_requests.sender_id = auth.uid() 
      OR collaboration_requests.receiver_id = auth.uid())
  )
);