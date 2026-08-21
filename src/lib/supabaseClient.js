import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "";
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

export const supabase = (SUPABASE_URL && SUPABASE_ANON_KEY)
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

export async function syncToSupabase(data) {
  if (!supabase || !navigator.onLine) return;
  try {
    await supabase.from("pureledger_store").upsert({
      id: "main_data",
      data,
      updated_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Supabase sync failed:", err);
  }
}