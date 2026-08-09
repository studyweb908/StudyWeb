1. Added missing RLS policies in `supabase-schema-final.sql` for all generated tables.
2. Updated `OfflineNotice.tsx` to handle QuotaExceededError and avoid throwing exceptions.
3. Updated avatar upload in `Navigation.tsx` to correctly resize large images to 256x256 before sending them to Supabase (preventing the 1MB limit error).
