import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "@/lib/env";

let client: SupabaseClient | null = null;

// Service-role client: bypasses RLS. Server code only — never import from a client component.
export function adminDb(): SupabaseClient {
  if (!client) {
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!key) throw new Error("Missing env SUPABASE_SERVICE_ROLE_KEY (server only).");
    client = createClient(SUPABASE_URL(), key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return client;
}
