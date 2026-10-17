import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Service-role client for server-only code that has no user session to act
// as -- the public /display pages and their polling endpoint. This bypasses
// Row Level Security entirely, so every query here must be scoped by hand
// (by screen_id, never "the current user" -- there isn't one). Never import
// this from a client component or anywhere the key could reach the browser.
export function createServiceClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}
