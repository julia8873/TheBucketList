-- 20261012010000_album_items_realtime.sql
-- album_items no estaba en la publicación de tiempo real. Sin esto, cuando alguien añade una
-- tarea a un álbum compartido, a los demás miembros no les llega el aviso y la tarea solo
-- aparece al recargar. (La fila de `buckets` no sirve de aviso: al crearse aún no está en el
-- álbum, así que RLS se la oculta a los demás.)

DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.album_items;
  EXCEPTION WHEN duplicate_object THEN
  END;
END $$;

ALTER TABLE public.album_items REPLICA IDENTITY FULL;
