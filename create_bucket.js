import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (supabaseUrl && supabaseKey) {
  const supabase = createClient(supabaseUrl, supabaseKey);
  supabase.storage.createBucket('workspace_materials', {
    public: true,
    allowedMimeTypes: ['image/*', 'application/pdf', 'video/*', 'audio/*', 'text/*'],
    fileSizeLimit: 52428800 // 50MB
  }).then(res => {
    console.log("Bucket creation result:", res.data, res.error);
  }).catch(err => {
    console.error("Error creating bucket:", err.message);
  });
}
