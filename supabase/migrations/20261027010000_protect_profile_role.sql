-- Migration: impedir la escalada de privilegios vía profiles.role
--
-- Problema: la política "Users can update own profile" solo comprueba auth.uid() = id y el rol
-- `authenticated` tiene UPDATE sobre toda la tabla, así que cualquier usuario podía ejecutar
--   supabase.from('profiles').update({ role: 'admin' }).eq('id', miId)
-- y convertirse en administrador. Solo guard_profile_suspension protegía columnas sensibles
-- (suspended_at / suspension_reason); `role` quedó sin proteger al añadirse después.
--
-- Solución: mismo patrón que guard_profile_suspension. Si quien edita no es administrador,
-- el cambio en `role` se revierte en silencio. Siguen funcionando:
--   · add_admin / remove_admin (SECURITY DEFINER, pero auth.uid() sigue siendo el admin que llama)
--   · migraciones, SQL editor y service_role (auth.uid() IS NULL)

CREATE OR REPLACE FUNCTION public.guard_profile_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role
     AND auth.uid() IS NOT NULL
     AND NOT public.is_admin(auth.uid()) THEN
    NEW.role := OLD.role;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_guard_profile_role ON public.profiles;
CREATE TRIGGER trigger_guard_profile_role
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.guard_profile_role();

-- Defensa extra: la propia política también debe exigir en WITH CHECK que la fila siga siendo
-- del usuario (sin WITH CHECK Postgres reutiliza USING, así que esto solo lo hace explícito).
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Auditoría: lista de administradores actuales. Revísala tras aplicar la migración por si alguien
-- se promocionó antes del arreglo (SELECT id, username, role FROM public.profiles WHERE role = 'admin').
