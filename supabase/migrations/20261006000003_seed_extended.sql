-- Seed extended data for the new redesign (albums, tasks with deadlines, album_items)

DO $$
DECLARE
  v_user_id uuid;
  v_album1_id uuid;
  v_album2_id uuid;
  v_bucket_id uuid;
BEGIN
  -- Get the first available user (if any exist locally)
  SELECT id INTO v_user_id FROM profiles LIMIT 1;
  
  IF v_user_id IS NOT NULL THEN
    
    -- 1. Create a couple of albums
    INSERT INTO albums (owner_id, title, visibility, is_shared) 
    VALUES (v_user_id, 'Lugares increíbles', 'public', true)
    RETURNING id INTO v_album1_id;

    INSERT INTO albums (owner_id, title, visibility, is_shared) 
    VALUES (v_user_id, 'Restaurantes Top', 'followers', false)
    RETURNING id INTO v_album2_id;

    -- 2. Insert Tasks (some expired, some today, some future)

    -- Expired task
    INSERT INTO buckets (user_id, title, description, status, visibility, deadline)
    VALUES (v_user_id, 'Subir al Teide (Caducado)', 'La reserva era ayer.', 'pending', 'public', now() - interval '3 days')
    RETURNING id INTO v_bucket_id;

    INSERT INTO album_items (album_id, bucket_id, position) VALUES (v_album1_id, v_bucket_id, 0);

    -- Task for today
    INSERT INTO buckets (user_id, title, description, status, visibility, deadline)
    VALUES (v_user_id, 'Comprar billetes a Japón (Hoy)', 'Último día de oferta.', 'in_progress', 'public', now() + interval '4 hours')
    RETURNING id INTO v_bucket_id;

    INSERT INTO album_items (album_id, bucket_id, position) VALUES (v_album1_id, v_bucket_id, 1);

    -- Future task (in 5 days - warning)
    INSERT INTO buckets (user_id, title, description, status, visibility, deadline)
    VALUES (v_user_id, 'Reserva en Asador Etxebarri', 'Conseguir mesa!', 'pending', 'followers', now() + interval '5 days')
    RETURNING id INTO v_bucket_id;

    INSERT INTO album_items (album_id, bucket_id, position) VALUES (v_album2_id, v_bucket_id, 0);

    -- Future task (in 20 days - normal)
    INSERT INTO buckets (user_id, title, description, status, visibility, deadline)
    VALUES (v_user_id, 'Auroras Boreales en Islandia', 'Viaje soñado.', 'pending', 'public', now() + interval '20 days')
    RETURNING id INTO v_bucket_id;

    INSERT INTO album_items (album_id, bucket_id, position) VALUES (v_album1_id, v_bucket_id, 2);

    -- Completed task
    INSERT INTO buckets (user_id, title, description, status, visibility, completed_at, deadline)
    VALUES (v_user_id, 'Cenar en DiverXO (Completado)', 'Increíble experiencia.', 'completed', 'followers', now() - interval '10 days', now() - interval '11 days')
    RETURNING id INTO v_bucket_id;

    INSERT INTO album_items (album_id, bucket_id, position) VALUES (v_album2_id, v_bucket_id, 1);

  END IF;
END $$;
