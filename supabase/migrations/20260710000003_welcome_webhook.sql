-- Trigger HTTP via pg_net to call the welcome-email Edge Function
-- Requirements: pg_net extension must be enabled.

CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE OR REPLACE FUNCTION public.handle_new_organization()
RETURNS TRIGGER AS $$
DECLARE
  webhook_url text := 'https://[VOTRE_PROJECT_REF].supabase.co/functions/v1/welcome-email';
  payload json;
BEGIN
  payload := json_build_object(
    'type', 'INSERT',
    'table', 'organizations',
    'record', row_to_json(NEW)
  );

  -- Perform the async HTTP POST request using pg_net
  PERFORM net.http_post(
    url := webhook_url,
    body := payload::jsonb,
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer [ANON_KEY]"}'::jsonb
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop the trigger if it exists
DROP TRIGGER IF EXISTS on_organization_created ON public.organizations;

-- Create the trigger
CREATE TRIGGER on_organization_created
  AFTER INSERT ON public.organizations
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_organization();
