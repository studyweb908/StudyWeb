import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const client = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function run() {
  const { data, error } = await client.from('workspaces').select('*').limit(1);
  console.log("WORKSPACES TABLE DATA:", data);
  console.log("WORKSPACES TABLE ERROR:", error);
}
run();
