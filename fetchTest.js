const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'apps/mobile/.env' });

const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);

async function run() {
  const { data: user } = await supabase.auth.signInWithPassword({
    email: 'test@example.com',
    password: 'password123'
  }); // I don't have the password, but maybe I don't need it if I just use service role? No, I don't have service role key in .env.
}
run();
