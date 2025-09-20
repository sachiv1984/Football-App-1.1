// src/services/supabaseClient.ts
import { createClient } from '@supabase/supabase-js';

function getSupabaseConfig() {
  let supabaseUrl: string | undefined;
  let supabaseKey: string | undefined;

  // For Vite environments - now properly typed
  if (import.meta.env) {
    supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  }

  // Fallback for Node.js build environments
  if (!supabaseUrl && typeof process !== 'undefined' && process.env) {
    supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  }

  if (!supabaseKey && typeof process !== 'undefined' && process.env) {
    supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 
                  process.env.SUPABASE_ANON_KEY ||
                  process.env.SUPABASE_KEY;
  }

  const mode = import.meta.env?.MODE || 'unknown';

  console.log('Supabase config:', {
    hasUrl: !!supabaseUrl,
    hasKey: !!supabaseKey,
    mode,
    urlPreview: supabaseUrl ? supabaseUrl.substring(0, 20) + '...' : 'missing'
  });

  return { supabaseUrl, supabaseKey, mode };
}

const { supabaseUrl, supabaseKey, mode } = getSupabaseConfig();

if (!supabaseUrl) {
  throw new Error(`
    Missing Supabase URL in ${mode} environment.
    Please set VITE_SUPABASE_URL in your environment variables.
  `);
}

if (!supabaseKey) {
  throw new Error(`
    Missing Supabase key in ${mode} environment.
    Please set VITE_SUPABASE_ANON_KEY in your environment variables.
  `);
}

// Validate URL format
if (!supabaseUrl.startsWith('https://')) {
  throw new Error(`Invalid Supabase URL: ${supabaseUrl}. Must be a valid HTTPS URL.`);
}

export const supabase = createClient(supabaseUrl, supabaseKey);
