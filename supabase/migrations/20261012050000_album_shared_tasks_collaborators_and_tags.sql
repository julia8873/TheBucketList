-- 20261012050000_album_shared_tasks_collaborators_and_tags.sql
--
-- Tareas de álbumes compartidos:
--   1. Todos los participantes (dueño de la tarea, colaboradores aceptados, dueño del álbum y
--      miembros aceptados de los álbumes que la contienen) se ven como colaboradores de la tarea.
--   2. Las etiquetas de la tarea se copian a la cuenta de cada participante (tags es por usuario)
--      y se mantienen sincronizadas: añadir/quitar una etiqueta la añade/quita a los demás.
--   3. item_tags y tags entran en Realtime para que los cambios lleguen sin recargar.

-- ---------------------------------------------------------------------------------------------
-- 1. Participantes de una tarea
-- ---------------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.bucket_participant_ids(p_bucket_id uuid)
RETURNS SETOF uuid
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT b.user_id FROM public.buckets b WHERE b.id = p_bucket_id
  UNION
  SELECT c.user_id FROM public.bucket_collaborators c
   WHERE c.bucket_id = p_bucket_id AND c.status = 'accepted'
  UNION
  SELECT a.owner_id FROM public.album_items ai
    JOIN public.albums a ON a.id = ai.album_id
   WHERE ai.bucket_id = p_bucket_id
  UNION
  SELECT am.user_id FROM public.album_items ai
    JOIN public.album_members am ON am.album_id = ai.album_id AND am.status = 'accepted'
   WHERE ai.bucket_id = p_bucket_id;
$$;

-- Lista de participantes (con perfil) para la pantalla de la tarea.
-- Solo la ve quien participa en la tarea.
CREATE OR REPLACE FUNCTION public.get_bucket_participants(p_bucket_id uuid)
RETURNS TABLE (id uuid, username text, display_name text, avatar_url text, is_owner boolean)
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT p.id, p.username, p.display_name, p.avatar_url, (p.id = b.user_id) AS is_owner
    FROM public.buckets b
    JOIN public.bucket_participant_ids(b.id) AS x(uid) ON true
    JOIN public.profiles p ON p.id = x.uid
   WHERE b.id = p_bucket_id
     AND EXISTS (
       SELECT 1 FROM public.bucket_participant_ids(p_bucket_id) AS y(uid) WHERE y.uid = auth.uid()
     );
$$;

GRANT EXECUTE ON FUNCTION public.get_bucket_participants(uuid) TO authenticated;

-- ---------------------------------------------------------------------------------------------
-- 2. Sincronización de etiquetas
-- ---------------------------------------------------------------------------------------------
-- Para cada participante que no tenga una etiqueta (por nombre, sin distinguir mayúsculas) que
-- sí tenga la tarea, la crea en su cuenta (mismo nombre, color y emoji) y se la asigna.
CREATE OR REPLACE FUNCTION public.sync_bucket_tags(p_bucket_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  r record;
  v_tag uuid;
BEGIN
  FOR r IN
    SELECT p.uid, s.lname, s.name, s.color, s.emoji
      FROM public.bucket_participant_ids(p_bucket_id) AS p(uid)
     CROSS JOIN (
       SELECT DISTINCT ON (lower(t.name)) lower(t.name) AS lname, t.name, t.color, t.emoji
         FROM public.item_tags it
         JOIN public.tags t ON t.id = it.tag_id
        WHERE it.item_id = p_bucket_id
        ORDER BY lower(t.name), it.created_at
     ) s
     WHERE NOT EXISTS (
       SELECT 1 FROM public.item_tags it2
         JOIN public.tags t2 ON t2.id = it2.tag_id
        WHERE it2.item_id = p_bucket_id AND t2.user_id = p.uid AND lower(t2.name) = s.lname
     )
  LOOP
    SELECT t.id INTO v_tag FROM public.tags t
     WHERE t.user_id = r.uid AND lower(t.name) = r.lname;

    IF v_tag IS NULL THEN
      INSERT INTO public.tags (user_id, name, color, emoji)
      VALUES (r.uid, r.name, r.color, r.emoji)
      ON CONFLICT DO NOTHING
      RETURNING id INTO v_tag;

      IF v_tag IS NULL THEN
        SELECT t.id INTO v_tag FROM public.tags t
         WHERE t.user_id = r.uid AND lower(t.name) = r.lname;
      END IF;
    END IF;

    IF v_tag IS NOT NULL THEN
      INSERT INTO public.item_tags (item_id, tag_id) VALUES (p_bucket_id, v_tag)
      ON CONFLICT DO NOTHING;
    END IF;
    v_tag := NULL;
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.sync_bucket_tags(uuid) FROM PUBLIC, anon, authenticated;

-- Alguien añade una etiqueta a la tarea → se copia a los demás participantes.
CREATE OR REPLACE FUNCTION public.trg_item_tags_after_insert()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- Las inserciones que hace sync_bucket_tags no vuelven a disparar la sincronización.
  IF pg_trigger_depth() > 1 THEN RETURN NEW; END IF;
  PERFORM public.sync_bucket_tags(NEW.item_id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS item_tags_sync_insert ON public.item_tags;
CREATE TRIGGER item_tags_sync_insert
  AFTER INSERT ON public.item_tags
  FOR EACH ROW EXECUTE FUNCTION public.trg_item_tags_after_insert();

-- Alguien quita una etiqueta de la tarea → se quita la equivalente (mismo nombre) a los demás.
-- No actúa si la etiqueta o la tarea ya no existen (borrado de la etiqueta en «Mis etiquetas»
-- o de la tarea): eliminar una etiqueta de tu cuenta no la quita de las cuentas de los demás.
CREATE OR REPLACE FUNCTION public.trg_item_tags_after_delete()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_owner uuid;
  v_name text;
BEGIN
  IF pg_trigger_depth() > 1 THEN RETURN OLD; END IF;

  SELECT t.user_id, t.name INTO v_owner, v_name FROM public.tags t WHERE t.id = OLD.tag_id;
  IF NOT FOUND THEN RETURN OLD; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.buckets b WHERE b.id = OLD.item_id) THEN RETURN OLD; END IF;

  DELETE FROM public.item_tags it
   USING public.tags t
   WHERE it.item_id = OLD.item_id
     AND t.id = it.tag_id
     AND t.user_id <> v_owner
     AND lower(t.name) = lower(v_name)
     AND t.user_id IN (SELECT public.bucket_participant_ids(OLD.item_id));
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS item_tags_sync_delete ON public.item_tags;
CREATE TRIGGER item_tags_sync_delete
  AFTER DELETE ON public.item_tags
  FOR EACH ROW EXECUTE FUNCTION public.trg_item_tags_after_delete();

-- Una tarea entra en un álbum → los miembros del álbum reciben sus etiquetas.
CREATE OR REPLACE FUNCTION public.trg_album_items_sync_tags()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.sync_bucket_tags(NEW.bucket_id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS album_items_sync_tags ON public.album_items;
CREATE TRIGGER album_items_sync_tags
  AFTER INSERT ON public.album_items
  FOR EACH ROW EXECUTE FUNCTION public.trg_album_items_sync_tags();

-- Alguien acepta la invitación a un álbum → recibe las etiquetas de todas sus tareas.
CREATE OR REPLACE FUNCTION public.trg_album_members_sync_tags()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_bucket uuid;
BEGIN
  IF NEW.status = 'accepted' THEN
    FOR v_bucket IN SELECT ai.bucket_id FROM public.album_items ai WHERE ai.album_id = NEW.album_id LOOP
      PERFORM public.sync_bucket_tags(v_bucket);
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS album_members_sync_tags ON public.album_members;
CREATE TRIGGER album_members_sync_tags
  AFTER INSERT OR UPDATE OF status ON public.album_members
  FOR EACH ROW EXECUTE FUNCTION public.trg_album_members_sync_tags();

-- Alguien acepta colaborar en una tarea → recibe sus etiquetas.
CREATE OR REPLACE FUNCTION public.trg_bucket_collaborators_sync_tags()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'accepted' THEN
    PERFORM public.sync_bucket_tags(NEW.bucket_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS bucket_collaborators_sync_tags ON public.bucket_collaborators;
CREATE TRIGGER bucket_collaborators_sync_tags
  AFTER INSERT OR UPDATE OF status ON public.bucket_collaborators
  FOR EACH ROW EXECUTE FUNCTION public.trg_bucket_collaborators_sync_tags();

-- ---------------------------------------------------------------------------------------------
-- 3. Realtime
-- ---------------------------------------------------------------------------------------------
DO $$
BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.item_tags; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.tags; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;

ALTER TABLE public.item_tags REPLICA IDENTITY FULL;
ALTER TABLE public.tags REPLICA IDENTITY FULL;

-- ---------------------------------------------------------------------------------------------
-- 4. Datos existentes: reparte las etiquetas de las tareas que ya están en álbumes compartidos
--    o tienen colaboradores aceptados.
-- ---------------------------------------------------------------------------------------------
DO $$
DECLARE
  v_bucket uuid;
BEGIN
  FOR v_bucket IN
    SELECT DISTINCT it.item_id
      FROM public.item_tags it
     WHERE EXISTS (SELECT 1 FROM public.album_items ai WHERE ai.bucket_id = it.item_id)
        OR EXISTS (SELECT 1 FROM public.bucket_collaborators c WHERE c.bucket_id = it.item_id AND c.status = 'accepted')
  LOOP
    PERFORM public.sync_bucket_tags(v_bucket);
  END LOOP;
END $$;

NOTIFY pgrst, 'reload schema';
