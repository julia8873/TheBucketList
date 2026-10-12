-- 20261013010000_bucket_mentions.sql
-- Menciones entre tareas: una relación simétrica (sin distinguir "menciona" / "mencionada por").
-- Si tarea1 menciona a tarea2, ambas se ven la una a la otra. Se guarda UNA fila por pareja,
-- con los ids ordenados (bucket_a < bucket_b) para que no haya duplicados en ningún sentido.

-- 1. Permiso de edición sobre una tarea: dueño, colaborador aceptado o miembro de un álbum compartido que la contiene.
CREATE OR REPLACE FUNCTION public.can_edit_bucket(p_bucket_id uuid)
RETURNS boolean AS $$
  SELECT
    EXISTS (SELECT 1 FROM public.buckets b WHERE b.id = p_bucket_id AND b.user_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.bucket_collaborators c
      WHERE c.bucket_id = p_bucket_id AND c.user_id = auth.uid() AND c.status = 'accepted'
    )
    OR public.is_bucket_in_member_album(p_bucket_id);
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

-- 2. Tabla
CREATE TABLE IF NOT EXISTS public.bucket_mentions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket_a uuid NOT NULL REFERENCES public.buckets(id) ON DELETE CASCADE,
  bucket_b uuid NOT NULL REFERENCES public.buckets(id) ON DELETE CASCADE,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL DEFAULT auth.uid(),
  created_at timestamptz DEFAULT now(),
  CONSTRAINT bucket_mentions_ordered CHECK (bucket_a < bucket_b),
  CONSTRAINT bucket_mentions_unique UNIQUE (bucket_a, bucket_b)
);

CREATE INDEX IF NOT EXISTS idx_bucket_mentions_b ON public.bucket_mentions(bucket_b);

-- 3. Normaliza el orden de la pareja y evita que una tarea se mencione a sí misma.
CREATE OR REPLACE FUNCTION public.bucket_mentions_normalize()
RETURNS trigger AS $$
DECLARE
  tmp uuid;
BEGIN
  IF NEW.bucket_a = NEW.bucket_b THEN
    RAISE EXCEPTION 'Una tarea no puede mencionarse a sí misma';
  END IF;
  IF NEW.bucket_a > NEW.bucket_b THEN
    tmp := NEW.bucket_a;
    NEW.bucket_a := NEW.bucket_b;
    NEW.bucket_b := tmp;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS bucket_mentions_normalize_trg ON public.bucket_mentions;
CREATE TRIGGER bucket_mentions_normalize_trg
  BEFORE INSERT ON public.bucket_mentions
  FOR EACH ROW EXECUTE PROCEDURE public.bucket_mentions_normalize();

-- 4. RLS
ALTER TABLE public.bucket_mentions ENABLE ROW LEVEL SECURITY;

-- Ver: basta con poder ver alguna de las dos tareas (la tarea que no puedas ver no se devuelve al unir con buckets).
DROP POLICY IF EXISTS "Mentions are viewable with either bucket" ON public.bucket_mentions;
CREATE POLICY "Mentions are viewable with either bucket" ON public.bucket_mentions FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.buckets b WHERE b.id = bucket_a)
  OR EXISTS (SELECT 1 FROM public.buckets b WHERE b.id = bucket_b)
);

-- Crear: puedes editar una de las dos tareas y ver las dos.
DROP POLICY IF EXISTS "Editors can create mentions" ON public.bucket_mentions;
CREATE POLICY "Editors can create mentions" ON public.bucket_mentions FOR INSERT WITH CHECK (
  created_by = auth.uid()
  AND (public.can_edit_bucket(bucket_a) OR public.can_edit_bucket(bucket_b))
  AND EXISTS (SELECT 1 FROM public.buckets b WHERE b.id = bucket_a)
  AND EXISTS (SELECT 1 FROM public.buckets b WHERE b.id = bucket_b)
);

-- Quitar: quien pueda editar cualquiera de las dos tareas.
DROP POLICY IF EXISTS "Editors can delete mentions" ON public.bucket_mentions;
CREATE POLICY "Editors can delete mentions" ON public.bucket_mentions FOR DELETE USING (
  public.can_edit_bucket(bucket_a) OR public.can_edit_bucket(bucket_b)
);
