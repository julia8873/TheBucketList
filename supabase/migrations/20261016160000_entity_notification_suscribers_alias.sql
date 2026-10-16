-- Migration: Add alias view entity_notification_suscribers to prevent typos
CREATE OR REPLACE VIEW public.entity_notification_suscribers AS
    SELECT * FROM public.entity_notification_subscribers;

GRANT ALL ON public.entity_notification_suscribers TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';
