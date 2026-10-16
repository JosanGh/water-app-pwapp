import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env?.VITE_SUPABASE_URL || "";
const SUPABASE_ANON_KEY = import.meta.env?.VITE_SUPABASE_ANON_KEY || "";

export const supabase =
  SUPABASE_URL && SUPABASE_ANON_KEY
    ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: {
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: true,
        },
      })
    : null;

export function getSupabaseStatus() {
  return {
    configured: Boolean(supabase),
    online: typeof navigator !== "undefined" && navigator.onLine,
  };
}

function requireClient() {
  if (!supabase) {
    throw new Error("Cloud authentication is not configured for this deployment.");
  }
  return supabase;
}

export async function getAuthenticatedUser() {
  const client = requireClient();
  const { data: sessionData, error: sessionError } = await client.auth.getSession();
  if (sessionError) throw sessionError;
  if (!sessionData.session) return null;

  const { data, error } = await client.auth.getUser();
  if (error) throw error;
  return data.user;
}

export async function getPersistedSessionUser() {
  const client = requireClient();
  const { data, error } = await client.auth.getSession();
  if (error) throw error;
  return data.session?.user || null;
}

export async function signIn(email, password) {
  const client = requireClient();
  const { data, error } = await client.auth.signInWithPassword({
    email: email.trim(),
    password,
  });
  if (error) throw error;
  return data.user;
}

export async function signUp(email, password) {
  const client = requireClient();
  const { data, error } = await client.auth.signUp({
    email: email.trim(),
    password,
  });
  if (error) throw error;
  return data;
}

export async function requestPasswordReset(email) {
  const client = requireClient();
  const { error } = await client.auth.resetPasswordForEmail(email.trim(), {
    redirectTo: window.location.origin,
  });
  if (error) throw error;
}

export async function updatePassword(password) {
  const client = requireClient();
  const { error } = await client.auth.updateUser({ password });
  if (error) throw error;
}

export async function signOut() {
  const client = requireClient();
  const { error } = await client.auth.signOut();
  if (error) throw error;
}

export async function getOrganization(userId) {
  const client = requireClient();
  const { data: memberships, error: membershipError } = await client
    .from("organization_memberships")
    .select("organization_id, full_name, role")
    .eq("user_id", userId)
    .limit(2);

  if (membershipError) throw membershipError;
  if (!memberships?.length) return null;
  if (memberships.length > 1) {
    throw new Error(
      "This account belongs to multiple companies. Company selection must be configured before access.",
    );
  }

  const membership = memberships[0];
  const { data: organization, error: organizationError } = await client
    .from("organizations")
    .select("id, name")
    .eq("id", membership.organization_id)
    .single();

  if (organizationError) throw organizationError;
  const { data: product, error: productError } = await client
    .from("organization_products")
    .select("product_id")
    .eq("organization_id", organization.id)
    .eq("product_id", "water")
    .maybeSingle();
  if (productError) throw productError;
  if (!product) {
    throw new Error("The water operations module is not enabled for this company.");
  }
  return {
    id: organization.id,
    name: organization.name,
    productId: product.product_id,
    userId,
    userName: membership.full_name,
    role: membership.role,
  };
}

export async function createOrganization(name, userId) {
  const client = requireClient();
  const { error } = await client.rpc("create_organization", {
    p_name: name.trim(),
    p_product_id: "water",
  });
  if (error) throw error;
  return getOrganization(userId);
}

export async function createOrganizationInvite(organizationId, email, role) {
  const client = requireClient();
  const { data, error } = await client.rpc("create_organization_invite", {
    p_organization_id: organizationId,
    p_email: email.trim(),
    p_role: role,
  });
  if (error) throw error;
  return data;
}

export async function acceptOrganizationInvite(code, fullName) {
  const client = requireClient();
  const { error } = await client.rpc("accept_organization_invite", {
    p_code: code.trim(),
    p_full_name: fullName.trim(),
  });
  if (error) throw error;
}

export async function updateOrganizationName(organizationId, name) {
  const client = requireClient();
  const { error } = await client
    .from("organizations")
    .update({ name: name.trim(), updated_at: new Date().toISOString() })
    .eq("id", organizationId);
  if (error) throw error;
}

export async function backfillOrganizationDocument(organizationId, productId) {
  const client = requireClient();
  const { data, error } = await client.rpc("backfill_organization_document", {
    p_organization_id: organizationId,
    p_product_id: productId,
  });
  if (error) throw error;
  return Number(data) || 0;
}

const RECORD_COLLECTIONS = [
  "productionRuns",
  "sales",
  "debtPayments",
  "expenses",
  "adminExpenses",
  "bankDeposits",
  "adminbankDeposits",
  "intake",
  "issuance",
  "bagIntake",
  "bagIssuance",
  "bagUsage",
  "auditLog",
  "notifications",
  "machines",
];

const emptyRecordData = {
  businessDetails: {},
  settings: {},
  expenseCategories: [],
  rollTypes: [],
  machines: [],
  ...Object.fromEntries(
    RECORD_COLLECTIONS.filter((collection) => collection !== "machines").map(
      (collection) => [collection, []],
    ),
  ),
  users: [],
};

function recordCollectionItems(data, collection) {
  if (collection === "machines") {
    return (data?.machines || []).map((name) => ({
      id: data?.machineRecordMetadata?.[String(name)]?.id || String(name),
      name: String(name),
      ...(data?.machineRecordMetadata?.[String(name)] || {}),
    }));
  }
  return Array.isArray(data?.[collection]) ? data[collection] : [];
}

export function buildOrganizationRecordChanges(
  previousData,
  nextData,
  { includeSettings = false, isOwner = false } = {},
) {
  const previous = previousData || {};
  const changes = [];
  for (const collection of RECORD_COLLECTIONS) {
    const oldItems = recordCollectionItems(previous, collection);
    const newItems = recordCollectionItems(nextData, collection);
    for (const item of [...oldItems, ...newItems]) {
      if (!item || typeof item !== "object" || item.id == null || String(item.id) === "") {
        throw new Error(`Cannot sync ${collection}: every record must have an ID.`);
      }
    }
    const oldById = new Map(
      oldItems.map((item) => [String(item.id), item]),
    );
    const newById = new Map(
      newItems.map((item) => [String(item.id), item]),
    );
    if (oldById.size !== oldItems.length || newById.size !== newItems.length) {
      throw new Error(`Cannot sync ${collection}: record IDs must be unique.`);
    }

    for (const [id, item] of newById) {
      if (JSON.stringify(oldById.get(id)) !== JSON.stringify(item)) {
        const recordData = { ...item };
        delete recordData.createdByUserId;
        delete recordData.recordUpdatedAt;
        delete recordData.organizationSettingsRecordUpdatedAt;
        changes.push({
          operation: "upsert",
          collection,
          id,
          data: recordData,
          expectedUpdatedAt: oldById.get(id)?.recordUpdatedAt || null,
        });
      }
    }
    for (const id of oldById.keys()) {
      if (!newById.has(id) && (collection !== "auditLog" || isOwner)) {
        changes.push({
          operation: "delete",
          collection,
          id,
          expectedUpdatedAt: oldById.get(id)?.recordUpdatedAt || null,
        });
      }
    }
  }

  const previousSettings = {
    businessDetails: previous.businessDetails || {},
    settings: previous.settings || {},
    expenseCategories: previous.expenseCategories || [],
    rollTypes: previous.rollTypes || [],
  };
  const nextSettings = {
    businessDetails: nextData?.businessDetails || {},
    settings: nextData?.settings || {},
    expenseCategories: nextData?.expenseCategories || [],
    rollTypes: nextData?.rollTypes || [],
  };
  if (
    includeSettings ||
    JSON.stringify(previousSettings) !== JSON.stringify(nextSettings)
  ) {
    changes.push({
      operation: "upsert",
      collection: "organizationSettings",
      id: "main",
      data: nextSettings,
      expectedUpdatedAt:
        previous.organizationSettingsRecordUpdatedAt || null,
    });
  }
  return changes;
}

export async function fetchFromSupabase(organization) {
  if (!supabase || !navigator.onLine) {
    return { success: false, reason: "offline_or_no_client" };
  }

  const { data: migrationStatus, error: migrationError } = await supabase.rpc(
    "get_organization_record_migration_status",
    {
      p_organization_id: organization.id,
      p_product_id: organization.productId,
    },
  );
  if (migrationError) {
    console.error("Tenant migration status check failed:", migrationError.message);
    return { success: false, error: migrationError };
  }

  const tenantData = { ...emptyRecordData };
  tenantData.machineRecordMetadata = {};
  const users = [];
  let offset = 0;
  const pageSize = 1000;
  while (true) {
    const { data: rows, error } = await supabase
      .from("organization_records")
      .select("collection, record_id, data, created_by, updated_at")
      .eq("organization_id", organization.id)
      .eq("product_id", organization.productId)
      .order("collection")
      .order("record_id")
      .range(offset, offset + pageSize - 1);
    if (error) {
      console.error("Tenant record load failed:", error.message);
      return { success: false, error };
    }
    for (const row of rows || []) {
      if (row.collection === "organizationSettings") {
        Object.assign(tenantData, row.data);
        tenantData.organizationSettingsRecordUpdatedAt = row.updated_at;
      } else if (row.collection === "machines") {
        tenantData.machines.push(row.data.name || row.record_id);
        tenantData.machineRecordMetadata[row.data.name || row.record_id] = {
          id: row.record_id,
          createdByUserId: row.created_by,
          recordUpdatedAt: row.updated_at,
        };
      } else if (RECORD_COLLECTIONS.includes(row.collection)) {
        tenantData[row.collection].push({
          ...row.data,
          createdByUserId: row.created_by,
          recordUpdatedAt: row.updated_at,
        });
      }
    }
    if (!rows || rows.length < pageSize) break;
    offset += pageSize;
  }

  const { data: memberships, error: membershipError } = await supabase
    .from("organization_memberships")
    .select("user_id, full_name, role")
    .eq("organization_id", organization.id)
    .order("full_name");
  if (membershipError) {
    console.error("Company member list load failed:", membershipError.message);
    return { success: false, error: membershipError };
  }
  for (const member of memberships || []) {
    users.push({
      id: member.user_id,
      userId: member.user_id,
      name: member.full_name,
      role: member.role,
    });
  }
  tenantData.users = users;

  return {
    success: true,
    data: tenantData,
    revision: 0,
    updatedAt: null,
    migrationRequired: migrationStatus === "legacy_pending",
  };
}

export async function syncToSupabase(
  data,
  organization,
  _expectedRevision = 0,
  previousData = null,
) {
  if (!supabase || !navigator.onLine) {
    return { success: false, reason: "offline_or_no_client" };
  }
  if (!data || typeof data !== "object" || !organization?.id) {
    return { success: false, reason: "invalid_data_or_tenant" };
  }

  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) {
    return {
      success: false,
      reason: "not_authenticated",
      error: authError || new Error("A verified sign-in is required."),
    };
  }

  if (!previousData) {
    return {
      success: false,
      reason: "missing_baseline",
      error: new Error(
        "Cannot safely synchronize records without a verified cloud baseline.",
      ),
    };
  }
  const changes = buildOrganizationRecordChanges(previousData, data, {
    isOwner: organization.role === "owner",
  });
  if (!changes.length) return { success: true, revision: 0 };

  const { error } = await supabase.rpc(
    "apply_organization_record_changes",
    {
      p_organization_id: organization.id,
      p_product_id: organization.productId,
      p_changes: changes,
    },
  );

  if (error) {
    console.error("Tenant data sync failed:", error.message);
    return {
      success: false,
      conflict: error.message.includes("SYNC_CONFLICT"),
      error,
    };
  }

  return { success: true, revision: 0 };
}
