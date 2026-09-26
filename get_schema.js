import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import https from 'https';
dotenv.config();

const client = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function run() {
  // Sign up a test user
  const email = 'test' + Date.now() + '@example.com';
  const { data: authData, error: authError } = await client.auth.signUp({
    email,
    password: 'password123'
  });
  
  if (authError) {
    console.log("Auth Error:", authError);
    return;
  }
  
  const token = authData.session.access_token;
  
  const options = {
    hostname: new URL(process.env.VITE_SUPABASE_URL).hostname,
    path: '/rest/v1/',
    headers: { 
      'apikey': process.env.VITE_SUPABASE_ANON_KEY,
      'Authorization': 'Bearer ' + token
    }
  };
  
  https.get(options, (res) => {
    let body = '';
    res.on('data', d => body += d);
    res.on('end', () => {
      const json = JSON.parse(body);
      console.log('Workspaces properties:', Object.keys(json.definitions?.workspaces?.properties || {}));
      console.log('All tables:', Object.keys(json.definitions || {}));
    });
  });
}
run();
