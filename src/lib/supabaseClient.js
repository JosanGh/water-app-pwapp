import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "";
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

export const supabase = (SUPABASE_URL && SUPABASE_ANON_KEY)
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

/**
 * Safely syncs locally persisted data to Supabase.
 * Will abort early if offline or client is unconfigured without throwing runtime errors.
 */
export async function syncToSupabase(data) {
  // 1. Abort immediately if device is offline or Supabase credentials missing
  if (!navigator.onLine) {
    return { success: false, reason: "offline" };
  }

  if (!supabase) {
    console.warn("Supabase client not initialized (missing environment variables).");
    return { success: false, reason: "no_client" };
  }

  // 2. Validate local data payload prior to network push
  if (!data || typeof data !== "object") {
    console.error("Invalid local storage payload provided for Supabase sync.");
    return { success: false, reason: "invalid_data" };
  }

  try {
    const payload = {
      id: "main_data",
      data,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from("pureledger_store")
      .upsert(payload, { onConflict: "id" });

    if (error) {
      console.warn("Supabase background upsert error:", error.message);
      return { success: false, error };
    }

    return { success: true };
  } catch (err) {
    console.error("Network or unexpected error during Supabase sync:", err);
    return { success: false, err };
  }
}