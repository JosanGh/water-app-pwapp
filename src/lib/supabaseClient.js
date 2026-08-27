import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "";
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

export const supabase = (SUPABASE_URL && SUPABASE_ANON_KEY)
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

const isSupabaseReady = () => supabase && navigator.onLine;

/**
 * Safely syncs locally persisted data to Supabase blob table.
 * Kept for backward compatibility with existing pureledger_store table.
 */
export async function syncToSupabase(data) {
  if (!isSupabaseReady()) {
    return { success: false, reason: "offline_or_no_client" };
  }

  if (!data || typeof data !== "object") {
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
      console.warn("Supabase blob sync error:", error.message);
      return { success: false, error };
    }

    return { success: true };
  } catch (err) {
    console.error("Network or unexpected error during Supabase blob sync:", err);
    return { success: false, err };
  }
}

/**
 * Upsert a single record into a normalized table.
 * Used for incremental sync to normalized tables alongside blob sync.
 */
export async function syncNormalizedRecord(table, record) {
  if (!isSupabaseReady()) return { success: false, reason: "offline" };
  if (!table || !record || !record.id) return { success: false, reason: "invalid_record" };

  try {
    const { error } = await supabase
      .from(table)
      .upsert(record, { onConflict: "id" });

    if (error) {
      console.warn(`Normalized sync error on ${table}:`, error.message);
      return { success: false, error };
    }

    return { success: true };
  } catch (err) {
    console.error(`Normalized sync exception on ${table}:`, err);
    return { success: false, err };
  }
}

/**
 * One-time backfill: migrates data from pureledger_store blob to normalized tables.
 * Called once after user logs in if normalized tables appear empty.
 */
export async function backfillNormalizedFromBlob(data) {
  if (!isSupabaseReady()) return { success: false, reason: "offline" };
  if (!data || typeof data !== "object") return { success: false, reason: "invalid_data" };

  try {
    const tables = {
      users: data.users || [],
      rollTypes: data.rollTypes || [],
      intake: data.intake || [],
      issuance: data.issuance || [],
      bagTypes: data.bagTypes || [],
      bagIntake: data.bagIntake || [],
      bagIssuance: data.bagIssuance || [],
      bagUsage: data.bagUsage || [],
      productionRuns: data.productionRuns || [],
      sales: data.sales || [],
      debtPayments: data.debtPayments || [],
      expenses: data.expenses || [],
      adminExpenses: data.adminExpenses || [],
      bankDeposits: data.bankDeposits || [],
      notifications: data.notifications || [],
      auditLog: data.auditLog || [],
    };

    // Upsert settings and business_details
    if (data.settings) {
      await syncNormalizedRecord("settings", {
        id: "main_data",
        ...data.settings,
        updated_at: new Date().toISOString(),
      });
    }

    if (data.businessDetails) {
      await syncNormalizedRecord("business_details", {
        id: "main_data",
        ...data.businessDetails,
        updated_at: new Date().toISOString(),
      });
    }

    // Upsert arrays
    for (const [tableName, records] of Object.entries(tables)) {
      if (!Array.isArray(records)) continue;
      for (const record of records) {
        if (record && record.id) {
          await syncNormalizedRecord(tableName, record);
        }
      }
    }

    return { success: true };
  } catch (err) {
    console.error("Backfill failed:", err);
    return { success: false, err };
  }
}