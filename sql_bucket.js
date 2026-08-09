import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (supabaseUrl && supabaseKey) {
  const supabase = createClient(supabaseUrl, supabaseKey);
  supabase.rpc('execute_sql', { sql: `
    INSERT INTO storage.buckets (id, name, public) 
    VALUES ('workspace_materials', 'workspace_materials', true)
    ON CONFLICT (id) DO NOTHING;
    
    CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'workspace_materials');
    CREATE POLICY "Public Insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'workspace_materials');
  `}).then(res => {
    console.log(res);
  });
}
