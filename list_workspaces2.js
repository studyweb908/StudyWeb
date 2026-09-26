import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const client = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await client.from('workspaces').select('*').limit(1);
  console.log("WORKSPACES TABLE:", data, error);
}
run();
