-- 20261018232000_collections_is_deleted.sql
-- Añadir columna is_deleted y asegurar políticas completas para upsert de colecciones por admins

ALTER TABLE public.collections ADD COLUMN IF NOT EXISTS is_deleted boolean DEFAULT false;

-- Asegurar políticas de INSERT y UPDATE para que upsert funcione sin problemas
DROP POLICY IF EXISTS "Admins pueden insertar colecciones" ON public.collections;
CREATE POLICY "Admins pueden insertar colecciones" 
ON public.collections FOR INSERT 
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

DROP POLICY IF EXISTS "Admins pueden actualizar colecciones" ON public.collections;
CREATE POLICY "Admins pueden actualizar colecciones" 
ON public.collections FOR UPDATE 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);
