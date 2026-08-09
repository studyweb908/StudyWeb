import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (supabaseUrl && supabaseKey) {
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  supabase.from('workspace_files').insert({
    id: uuidv4(),
    workspace_id: uuidv4(),
    name: 'test',
    type: 'pdf',
    url: 'http://test.com'
  }).then(res => {
    console.log(res);
  });
}
