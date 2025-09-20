// src/services/supabaseClient.ts
import { createClient } from '@supabase/supabase-js';

// Function to get environment variable with fallbacks
function getEnvVar(name: string): string | undefined {
  // Try Vite's import.meta.env first (if available)
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    return import.meta.env[name];
  }
  
  // Try process.env for Node.js environments
  if (typeof process !== 'undefined' && process.env) {
    return process.env[name];
  }
  
  // Try window for browser environments (if you're setting them globally)
  if (typeof window !== 'undefined' && (window as any).env) {
    return (window as any).env[name];
  }
  
  return undefined;
}

const supabaseUrl = getEnvVar('VITE_SUPABASE_URL');
const supabaseKey = getEnvVar('VITE_SUPABASE_ANON_KEY');

// Debug logging (remove in production)
console.log('Environment check:', {
  supabaseUrl: supabaseUrl ? 'Found' : 'Missing',
  supabaseKey: supabaseKey ? 'Found' : 'Missing',
  env: typeof import.meta !== 'undefined' ? 'Vite' : typeof process !== 'undefined' ? 'Node' : 'Browser'
});

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables:', {
    VITE_SUPABASE_URL: supabaseUrl || 'MISSING',
    VITE_SUPABASE_ANON_KEY: supabaseKey ? 'Present' : 'MISSING'
  });
  throw new Error(
    'Missing Supabase environment variables. Please check your .env file and ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set.'
  );
}

// Validate URL format
try {
  new URL(supabaseUrl);
} catch (error) {
  throw new Error(`Invalid Supabase URL format: ${supabaseUrl}. Must be a valid HTTPS URL like https://your-project.supabase.co`);
}

export const supabase = createClient(supabaseUrl, supabaseKey);
