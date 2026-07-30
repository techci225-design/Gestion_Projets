-- Add user_sessions table
CREATE TABLE IF NOT EXISTS user_sessions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, organization_id)
);

ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "session_own" ON user_sessions
  FOR ALL USING (user_id = auth.uid());

-- Add WhatsApp integration fields to profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS whatsapp_number text,
  ADD COLUMN IF NOT EXISTS notif_whatsapp boolean DEFAULT false;

-- Add Platform Settings table for TSBC analytics configuration
CREATE TABLE IF NOT EXISTS platform_settings (
  id integer PRIMARY KEY,
  pro_price numeric DEFAULT 25000,
  inst_price numeric DEFAULT 100000,
  eur_rate numeric DEFAULT 655.957,
  usd_rate numeric DEFAULT 600.0,
  updated_at timestamptz DEFAULT now()
);

-- Insert the default configuration row (id = 1)
INSERT INTO platform_settings (id, pro_price, inst_price, eur_rate, usd_rate)
VALUES (1, 25000, 100000, 655.957, 600.0)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;

-- Read for all authenticated users (needed for UI formatting/info)
CREATE POLICY "platform_settings_read_all" ON platform_settings
  FOR SELECT TO authenticated USING (true);

-- Update only by super admin
CREATE POLICY "platform_settings_update_admin" ON platform_settings
  FOR UPDATE TO authenticated USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.is_super_admin = true
    )
  );
