import { createClient } from "@supabase/supabase-js";

// Create a function to get the Supabase client
// This ensures environment variables are available when called
export const getSupabaseClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing Supabase environment variables");
  }

  return createClient(supabaseUrl, supabaseAnonKey);
};

// For backward compatibility, create a client instance
// But only if we're in the browser (client-side)
let supabaseClient = null;
if (typeof window !== "undefined") {
  supabaseClient = getSupabaseClient();
}

export const supabase = supabaseClient;
