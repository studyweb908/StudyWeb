import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const client = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await client.from('workspaces').insert([{ id: '710b962e-041c-11e1-9234-0123456789ab', user_id: 'local-user', name: 'test' }]).select();
  console.log("INSERT WORKSPACE:", data, error);
}
run();
