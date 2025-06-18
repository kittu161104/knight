/*
  # Add Collaboration System

  1. New Tables
    - `collaboration_requests`
      - `id` (uuid, primary key)
      - `sender_id` (uuid, references profiles)
      - `receiver_id` (uuid, references profiles)
      - `status` (request_status enum)
      - `message` (text)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `collaboration_agreements`
      - `id` (uuid, primary key)
      - `request_id` (uuid, references collaboration_requests)
      - `payment_amount` (numeric)
      - `currency` (currency_code enum)
      - `status` (agreement_status enum)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Add policies for viewing, creating, and updating records
*/

-- Create enums
CREATE TYPE request_status AS ENUM (
  'pending',
  'accepted',
  'declined'
);

CREATE TYPE agreement_status AS ENUM (
  'pending',
  'accepted',
  'declined'
);

CREATE TYPE currency_code AS ENUM (
  'USD',
  'EUR',
  'GBP'
);

-- Create collaboration_requests table
CREATE TABLE collaboration_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  receiver_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  status request_status DEFAULT 'pending' NOT NULL,
  message text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT different_users CHECK (sender_id != receiver_id)
);

-- Create collaboration_agreements table
CREATE TABLE collaboration_agreements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid REFERENCES collaboration_requests(id) ON DELETE CASCADE NOT NULL,
  payment_amount numeric(10,2) CHECK (payment_amount >= 0) NOT NULL,
  currency currency_code DEFAULT 'USD' NOT NULL,
  status agreement_status DEFAULT 'pending' NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE collaboration_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE collaboration_agreements ENABLE ROW LEVEL SECURITY;

-- Collaboration requests policies
CREATE POLICY "Users can view their own requests"
  ON collaboration_requests FOR SELECT
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can create requests"
  ON collaboration_requests FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can update their own requests"
  ON collaboration_requests FOR UPDATE
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- Collaboration agreements policies
CREATE POLICY "Users can view their own agreements"
  ON collaboration_agreements FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM collaboration_requests
      WHERE collaboration_requests.id = request_id
      AND (collaboration_requests.sender_id = auth.uid() 
        OR collaboration_requests.receiver_id = auth.uid())
    )
  );

CREATE POLICY "Users can create agreements"
  ON collaboration_agreements FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM collaboration_requests
      WHERE collaboration_requests.id = request_id
      AND collaboration_requests.receiver_id = auth.uid()
      AND collaboration_requests.status = 'accepted'
    )
  );

CREATE POLICY "Users can update their own agreements"
  ON collaboration_agreements FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM collaboration_requests
      WHERE collaboration_requests.id = request_id
      AND (collaboration_requests.sender_id = auth.uid() 
        OR collaboration_requests.receiver_id = auth.uid())
    )
  );

-- Create updated_at triggers
CREATE TRIGGER update_collaboration_requests_updated_at
  BEFORE UPDATE ON collaboration_requests
  FOR EACH ROW
  EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_collaboration_agreements_updated_at
  BEFORE UPDATE ON collaboration_agreements
  FOR EACH ROW
  EXECUTE PROCEDURE update_updated_at_column();