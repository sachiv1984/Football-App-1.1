// src/services/supabaseClient.ts
import { createClient } from '@supabase/supabase-js';

// Make sure you have these environment variables set in Vercel or your .env file:
// VITE_SUPABASE_URL
// VITE_SUPABASE_ANON_KEY   (for frontend/public access)
// SUPABASE_SERVICE_ROLE_KEY (for server-side only access)

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// For server-side use (API routes, SSR), you can use service role key
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Public client (safe for frontend)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Optional: server-side client using service role key
export const supabaseAdmin = supabaseServiceRoleKey
  ? createClient(supabaseUrl, supabaseServiceRoleKey)
  : supabase;
