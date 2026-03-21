import { createClient } from '@supabase/supabase-js';
import { env } from './env';

// Cliente com service_role key - bypassa RLS, use apenas no backend
export const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

export type SupabaseClient = typeof supabase;
