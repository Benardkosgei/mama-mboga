import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

// Ensure env is loaded before client creation
config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) throw new Error('SUPABASE_URL is required in .env');
if (!supabaseServiceKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY is required in .env');

// Admin client with service role key (bypasses RLS)
export const supabaseAdmin: SupabaseClient = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});
