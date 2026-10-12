-- 20261012000000_album_members_edit_photos_and_items.sql
-- Los miembros de un álbum compartido (y su dueño) pueden editar las tareas del álbum "como cualquier otra":
--   * editar / borrar fotos de la tarea (antes solo el autor de la foto, el dueño o colaboradores de la tarea)
--   * mover la tarea entre álbumes (album_items)
-- buckets (UPDATE), item_subtasks, item_tags y bucket_photos (INSERT) ya lo permiten:
-- ver 20261011145000, 20261011130000 y 20261011120000.

-- 1. Fotos: actualizar y borrar
DROP POLICY IF EXISTS "Users can update own photos" ON public.bucket_photos;
CREATE POLICY "Users can update own photos" ON public.bucket_photos FOR UPDATE USING (
  auth.uid() = user_id OR
  EXISTS (
    SELECT 1 FROM public.buckets b WHERE b.id = bucket_photos.bucket_id AND (
      b.user_id = auth.uid() OR
      EXISTS (SELECT 1 FROM public.bucket_collaborators c WHERE c.bucket_id = b.id AND c.user_id = auth.uid() AND c.status = 'accepted') OR
      public.is_bucket_in_member_album(b.id)
    )
  )
);

DROP POLICY IF EXISTS "Users can delete own photos" ON public.bucket_photos;
CREATE POLICY "Users can delete own photos" ON public.bucket_photos FOR DELETE USING (
  auth.uid() = user_id OR
  EXISTS (
    SELECT 1 FROM public.buckets b WHERE b.id = bucket_photos.bucket_id AND (
      b.user_id = auth.uid() OR
      EXISTS (SELECT 1 FROM public.bucket_collaborators c WHERE c.bucket_id = b.id AND c.user_id = auth.uid() AND c.status = 'accepted') OR
      public.is_bucket_in_member_album(b.id)
    )
  )
);

-- 2. Album items: añadir / quitar la tarea de un álbum
DROP POLICY IF EXISTS "Album items insertable by bucket owner" ON public.album_items;
CREATE POLICY "Album items insertable by bucket owner" ON public.album_items FOR INSERT WITH CHECK (
  (EXISTS (
    SELECT 1 FROM public.buckets b WHERE b.id = album_items.bucket_id AND (
      b.user_id = auth.uid() OR
      EXISTS (SELECT 1 FROM public.bucket_collaborators c WHERE c.bucket_id = b.id AND c.user_id = auth.uid() AND c.status = 'accepted') OR
      public.is_bucket_in_member_album(b.id)
    )
  )) AND
  (EXISTS (
    SELECT 1 FROM public.albums a WHERE a.id = album_items.album_id AND (
      a.owner_id = auth.uid() OR
      EXISTS (SELECT 1 FROM public.album_members am WHERE am.album_id = a.id AND am.user_id = auth.uid() AND am.status = 'accepted')
    )
  ))
);

DROP POLICY IF EXISTS "Album items deletable by bucket owner" ON public.album_items;
CREATE POLICY "Album items deletable by bucket owner" ON public.album_items FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.buckets b WHERE b.id = album_items.bucket_id AND (
      b.user_id = auth.uid() OR
      EXISTS (SELECT 1 FROM public.bucket_collaborators c WHERE c.bucket_id = b.id AND c.user_id = auth.uid() AND c.status = 'accepted') OR
      public.is_bucket_in_member_album(b.id)
    )
  ) AND
  (EXISTS (
    SELECT 1 FROM public.albums a WHERE a.id = album_items.album_id AND (
      a.owner_id = auth.uid() OR
      EXISTS (SELECT 1 FROM public.album_members am WHERE am.album_id = a.id AND am.user_id = auth.uid() AND am.status = 'accepted')
    )
  ))
);
