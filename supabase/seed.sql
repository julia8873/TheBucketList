-- supabase/seed.sql
-- Dummy data for testing the app with existing profiles, buckets, feed events, etc.

-- We cannot insert auth.users easily without bypass RLS and hashing passwords, 
-- but in local dev, Supabase allows inserting directly into auth.users if we are superuser.
-- Let's create 3 test users. 
-- For simplicity, we just assume the frontend will create them, or we create them directly here.

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, recovery_sent_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token)
VALUES
('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'test1@example.com', crypt('password123', gen_salt('bf')), now(), now(), now(), '{"provider": "email", "providers": ["email"]}', '{"full_name": "Alice Wonderland"}', now(), now(), '', '', '', ''),
('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'test2@example.com', crypt('password123', gen_salt('bf')), now(), now(), now(), '{"provider": "email", "providers": ["email"]}', '{"full_name": "Bob Builder"}', now(), now(), '', '', '', ''),
('00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'test3@example.com', crypt('password123', gen_salt('bf')), now(), now(), now(), '{"provider": "email", "providers": ["email"]}', '{"full_name": "Charlie Chaplin"}', now(), now(), '', '', '', '');

-- Note: The auth.users INSERT trigger create_profile_on_signup() will automatically create the profiles for these 3 users!

DO $$
DECLARE
  travel_cat uuid;
  food_cat uuid;
  sport_cat uuid;
  alice uuid := '00000000-0000-0000-0000-000000000001';
  bob uuid := '00000000-0000-0000-0000-000000000002';
  charlie uuid := '00000000-0000-0000-0000-000000000003';
  bucket1_id uuid;
  bucket2_id uuid;
BEGIN
  -- Get category IDs
  SELECT id INTO travel_cat FROM categories WHERE slug = 'travel' LIMIT 1;
  SELECT id INTO food_cat FROM categories WHERE slug = 'food' LIMIT 1;
  SELECT id INTO sport_cat FROM categories WHERE slug = 'sport' LIMIT 1;

  -- Update profiles with bios (profiles were created by triggers)
  UPDATE profiles SET bio = 'I love traveling!', username = 'alice123' WHERE id = alice;
  UPDATE profiles SET bio = 'Foodie and builder', username = 'bob_builds' WHERE id = bob;
  UPDATE profiles SET bio = 'Silent movie actor', username = 'charlie_c' WHERE id = charlie;

  -- Follows: Alice follows Bob, Bob follows Alice, Charlie follows Alice
  INSERT INTO follows (follower_id, following_id, status) VALUES (alice, bob, 'accepted');
  INSERT INTO follows (follower_id, following_id, status) VALUES (bob, alice, 'accepted');
  INSERT INTO follows (follower_id, following_id, status) VALUES (charlie, alice, 'accepted');

  -- Create some buckets for Alice
  INSERT INTO buckets (user_id, category_id, title, description, visibility, status)
  VALUES (alice, travel_cat, 'Visit Japan', 'Go to Tokyo and Kyoto during cherry blossom season.', 'public', 'pending')
  RETURNING id INTO bucket1_id;

  INSERT INTO buckets (user_id, category_id, title, description, visibility, status)
  VALUES (alice, food_cat, 'Eat at a Michelin star restaurant', 'Preferably in Paris.', 'public', 'completed')
  RETURNING id INTO bucket2_id;

  -- Create some buckets for Bob
  INSERT INTO buckets (user_id, category_id, title, description, visibility, status)
  VALUES (bob, sport_cat, 'Run a marathon', 'Finish under 4 hours.', 'followers', 'in_progress');

  -- Subtasks for Bucket 1 (Alice)
  INSERT INTO item_subtasks (bucket_id, title, done) VALUES (bucket1_id, 'Buy tickets', true);
  INSERT INTO item_subtasks (bucket_id, title, done) VALUES (bucket1_id, 'Book hotels', false);
  INSERT INTO item_subtasks (bucket_id, title, done) VALUES (bucket1_id, 'Learn basic Japanese', false);

  -- Reactions & Comments
  INSERT INTO reactions (bucket_id, user_id, emoji) VALUES (bucket1_id, bob, '❤️');
  INSERT INTO reactions (bucket_id, user_id, emoji) VALUES (bucket2_id, charlie, '👏');

  INSERT INTO comments (bucket_id, user_id, body) VALUES (bucket1_id, bob, 'I want to go to Japan too!');
  INSERT INTO comments (bucket_id, user_id, body) VALUES (bucket2_id, charlie, 'Congrats on eating well!');

END $$;
