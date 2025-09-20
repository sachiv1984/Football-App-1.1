// src/services/supabaseClient.ts
import { createClient } from '@supabase/supabase-js';

// Use process.env for Node.js environments or provide fallbacks
const supabaseUrl = process.env.VITE_SUPABASE_URL || 
                   (typeof window !== 'undefined' && (window as any).env?.VITE_SUPABASE_URL) || 
                   'your-fallback-url';

const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 
                   (typeof window !== 'undefined' && (window as any).env?.VITE_SUPABASE_ANON_KEY) || 
                   'your-fallback-key';

// Alternative approach - check if import.meta is available
// const supabaseUrl = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) || 
//                    process.env.VITE_SUPABASE_URL || 
//                    'your-fallback-url';

// const supabaseKey = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY) || 
//                    process.env.VITE_SUPABASE_ANON_KEY || 
//                    'your-fallback-key';

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseKey);
