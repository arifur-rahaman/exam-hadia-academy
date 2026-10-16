function need(name: string, v: string | undefined): string {
  if (!v) throw new Error(`Missing env ${name}. Copy .env.example to .env.local and fill it in.`);
  return v;
}

// NEXT_PUBLIC_* must be referenced literally so Next can inline them.
export const SUPABASE_URL = () => need("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL);
export const SUPABASE_ANON_KEY = () =>
  need("NEXT_PUBLIC_SUPABASE_ANON_KEY", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
