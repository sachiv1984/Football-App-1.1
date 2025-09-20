// src/services/supabaseClient.ts
import { createClient } from '@supabase/supabase-js';

// Type-safe environment variable access
function getSupabaseConfig() {
  let supabaseUrl: string | undefined;
  let supabaseKey: string | undefined;

  // Check if we're in a Vite environment with import.meta.env
  if (typeof import.meta !== 'undefined' && 'env' in import.meta) {
    const env = (import.meta as any).env;
    supabaseUrl = env.VITE_SUPABASE_URL;
    supabaseKey = env.VITE_SUPABASE_ANON_KEY;
  }

  // Fallback for Node.js environments (build time, server-side)
  if (!supabaseUrl && typeof process !== 'undefined' && process.env) {
    supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  }

  if (!supabaseKey && typeof process !== 'undefined' && process.env) {
    supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 
                  process.env.SUPABASE_ANON_KEY ||
                  process.env.VITE_SUPABASE_KEY ||
                  process.env.SUPABASE_KEY;
  }

  // Get environment mode safely
  let mode = 'unknown';
  if (typeof import.meta !== 'undefined' && 'env' in import.meta) {
    mode = ((import.meta as any).env.MODE) || 'development';
  }

  // Debug logging (remove in production)
  console.log('Supabase config check:', {
    hasUrl: !!supabaseUrl,
    hasKey: !!supabaseKey,
    environment: mode,
    // Show partial URL for debugging (don't show full URL in production)
    urlPreview: supabaseUrl ? supabaseUrl.substring(0, 20) + '...' : 'missing'
  });

  return { supabaseUrl, supabaseKey, mode };
}

const { supabaseUrl, supabaseKey, mode } = getSupabaseConfig();

if (!supabaseUrl) {
  throw new Error(`
    Missing Supabase URL. Please set one of:
    - VITE_SUPABASE_URL (for Vite)
    - SUPABASE_URL (for deployment)
    
    Current environment: ${mode}
  `);
}

if (!supabaseKey) {
  throw new Error(`
    Missing Supabase key. Please set one of:
    - VITE_SUPABASE_ANON_KEY (for Vite)
    - SUPABASE_ANON_KEY (for deployment)
    
    Current environment: ${mode}
  `);
}

// Validate URL format
try {
  new URL(supabaseUrl);
} catch (error) {
  throw new Error(`Invalid Supabase URL format: ${supabaseUrl}. Must be a valid HTTPS URL.`);
}

export const supabase = createClient(supabaseUrl, supabaseKey);
