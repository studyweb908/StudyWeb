import { createClient } from '@supabase/supabase-js';

const getEnvVar = (key: string) => {
  if (typeof import.meta !== 'undefined' && (import.meta as any)?.env?.[key]) {
    return (import.meta as any).env[key];
  }
  if (typeof process !== 'undefined' && process?.env?.[key]) {
    return process.env[key];
  }
  return undefined;
};

const supabaseUrl = getEnvVar('VITE_SUPABASE_URL') || getEnvVar('SUPABASE_URL');
const supabaseAnonKey = getEnvVar('VITE_SUPABASE_ANON_KEY') || getEnvVar('SUPABASE_ANON_KEY');

export const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: 'studyweb-auth'
      },
      global: {
        fetch: (input: RequestInfo | URL, init?: RequestInit) => {
          // Prevent browser cookies from bloating request headers when Authorization bearer token is present
          const headers = new Headers(init?.headers);
          const hasAuth = headers.has('Authorization');
          return fetch(input, {
            ...init,
            credentials: hasAuth ? 'omit' : (init?.credentials || 'same-origin')
          });
        }
      }
    })
  : null;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase URL or Anon Key is missing. Please add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your environment variables.');
}
