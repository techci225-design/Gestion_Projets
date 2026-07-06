-- Ajout de la colonne notification_prefs pour stocker les préférences de l'utilisateur
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS notification_prefs jsonb DEFAULT '{}'::jsonb;
