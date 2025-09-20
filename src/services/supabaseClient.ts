// src/services/supabaseClient.ts
import { createClient } from '@supabase/supabase-js';

// Function to get environment variables with fallbacks for different environments
function getSupabaseConfig() {
  let supabaseUrl: string | undefined;
  let supabaseKey: string | undefined;

  // For Vite development (with VITE_ prefix)
  if (import.meta.env) {
    supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  }

  // Fallback for deployment environments (Vercel, etc.) where you might have different naming
  if (!supabaseUrl && typeof process !== 'undefined' && process.env) {
    supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  }

  if (!supabaseKey && typeof process !== 'undefined' && process.env) {
    supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 
                  process.env.SUPABASE_ANON_KEY ||
                  process.env.VITE_SUPABASE_KEY ||
                  process.env.SUPABASE_KEY;
  }

  // Debug logging (remove in production)
  console.log('Supabase config check:', {
    hasUrl: !!supabaseUrl,
    hasKey: !!supabaseKey,
    environment: import.meta.env?.MODE || 'unknown',
    // Show partial URL for debugging (don't show full URL in production)
    urlPreview: supabaseUrl ? supabaseUrl.substring(0, 20) + '...' : 'missing'
  });

  return { supabaseUrl, supabaseKey };
}

const { supabaseUrl, supabaseKey } = getSupabaseConfig();

if (!supabaseUrl) {
  throw new Error(`
    Missing Supabase URL. Please set one of:
    - VITE_SUPABASE_URL (for Vite)
    - SUPABASE_URL (for deployment)
    
    Current environment: ${import.meta.env?.MODE || 'unknown'}
  `);
}

if (!supabaseKey) {
  throw new Error(`
    Missing Supabase key. Please set one of:
    - VITE_SUPABASE_ANON_KEY (for Vite)
    - SUPABASE_ANON_KEY (for deployment)
    
    Current environment: ${import.meta.env?.MODE || 'unknown'}
  `);
}

// Validate URL format
try {
  new URL(supabaseUrl);
} catch (error) {
  throw new Error(`Invalid Supabase URL format: ${supabaseUrl}. Must be a valid HTTPS URL.`);
}

export const supabase = createClient(supabaseUrl, supabaseKey);
