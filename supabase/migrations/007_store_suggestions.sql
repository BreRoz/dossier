CREATE TABLE IF NOT EXISTS store_suggestions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  subscriber_id uuid REFERENCES subscribers(id) ON DELETE SET NULL,
  store_name text NOT NULL,
  website text,
  category text,
  notes text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'added', 'declined')),
  created_at timestamptz DEFAULT now()
);
