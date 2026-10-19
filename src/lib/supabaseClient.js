import { createClient } from "@supabase/supabase-js";
import { getProduct, PRODUCTS } from "../config/products";

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

export async function isPlatformSubscriptionAdmin() {
  const client = requireClient();
  const { data, error } = await client.rpc("is_platform_subscription_admin");
  if (error) throw error;
  return data === true;
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

export async function getOrganization(userId, productId = PRODUCTS.water.id) {
  const client = requireClient();
  if (!getProduct(productId)) {
    throw new Error("Choose a supported workspace.");
  }
  const { data: memberships, error: membershipError } = await client
    .from("organization_memberships")
    .select("organization_id, full_name, role")
    .eq("user_id", userId)
    .limit(2);

  if (membershipError) throw membershipError;
  if (!memberships?.length) return null;

  const organizationIds = memberships.map(
    (membership) => membership.organization_id,
  );
  const { data: products, error: productError } = await client
    .from("organization_products")
    .select("organization_id, product_id")
    .in("organization_id", organizationIds)
    .eq("product_id", productId);
  if (productError) throw productError;
  const matchingMemberships = memberships.filter((membership) =>
    products?.some(
      (product) => product.organization_id === membership.organization_id,
    ),
  );
  if (!matchingMemberships.length) return null;
  if (matchingMemberships.length > 1) {
    throw new Error(
      `This account belongs to multiple ${getProduct(productId).name} workspaces. Contact support to select the correct company.`,
    );
  }

  const membership = matchingMemberships[0];
  const { data: organizationProducts, error: organizationProductsError } =
    await client
      .from("organization_products")
      .select("product_id")
      .eq("organization_id", membership.organization_id);
  if (organizationProductsError) throw organizationProductsError;
  if (
    organizationProducts?.length !== 1 ||
    organizationProducts[0].product_id !== productId
  ) {
    throw new Error(
      "This company has multiple product entitlements. Contact support to separate its workspaces before continuing.",
    );
  }
  const { data: organization, error: organizationError } = await client
    .from("organizations")
    .select(
      "id, name, subscription_status, subscription_plan, expires_at, grace_until",
    )
    .eq("id", membership.organization_id)
    .single();

  if (organizationError) throw organizationError;
  const hasSubscriptionAccess = organizationHasSubscriptionAccess(organization);
  return {
    id: organization.id,
    name: organization.name,
    productId,
    userId,
    userName: membership.full_name,
    role: membership.role,
    subscriptionStatus: organization.subscription_status,
    subscriptionPlan: organization.subscription_plan,
    expiresAt: organization.expires_at,
    graceUntil: organization.grace_until,
    hasSubscriptionAccess,
  };
}

export function organizationHasSubscriptionAccess(
  organization,
  now = Date.now(),
) {
  if (organization?.subscriptionStatus === "active") {
    return (
      (organization.subscriptionPlan === "one-time" &&
        !organization.expiresAt) ||
      (Boolean(organization.expiresAt) &&
        new Date(organization.expiresAt).getTime() > now) ||
      (Boolean(organization.graceUntil) &&
        new Date(organization.graceUntil).getTime() > now)
    );
  }
  if (organization?.subscriptionStatus === "grace_period") {
    return (
      Boolean(organization.graceUntil) &&
      new Date(organization.graceUntil).getTime() > now
    );
  }
  return false;
}

export async function createOrganization(
  name,
  userId,
  productId = PRODUCTS.water.id,
) {
  const client = requireClient();
  if (!getProduct(productId)) {
    throw new Error("Choose a supported workspace.");
  }
  const { error } = await client.rpc("create_organization", {
    p_name: name.trim(),
    p_product_id: productId,
  });
  if (error) throw error;
  return getOrganization(userId, productId);
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

const MAX_TENANT_SYNC_CHANGES = 10000;
const TENANT_SYNC_BATCH_SIZE = 1000;
const MAX_TENANT_SYNC_PAYLOAD_BYTES = 7 * 1024 * 1024;

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
  tenantData.tenantRecordBaselineVersion = 1;
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
  if (authData.user.id !== organization.userId) {
    return {
      success: false,
      reason: "tenant_session_mismatch",
      error: new Error("The signed-in user does not match this company session."),
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
  if (previousData.tenantRecordBaselineVersion !== 1) {
    return {
      success: false,
      conflict: true,
      reason: "legacy_baseline",
      error: new Error(
        "Local data was saved before tenant-record sync and has no safe record-level baseline.",
      ),
    };
  }
  const changes = buildOrganizationRecordChanges(previousData, data, {
    isOwner: organization.role === "owner",
  });
  if (!changes.length) return { success: true, revision: 0 };
  if (changes.length > MAX_TENANT_SYNC_CHANGES) {
    return {
      success: false,
      reason: "sync_limit_exceeded",
      error: new Error(
        `This sync contains ${changes.length} changes; the limit is ${MAX_TENANT_SYNC_CHANGES}.`,
      ),
    };
  }
  const serializedChanges = JSON.stringify(changes);
  const payloadBytes = new TextEncoder().encode(serializedChanges).byteLength;
  if (payloadBytes > MAX_TENANT_SYNC_PAYLOAD_BYTES) {
    return {
      success: false,
      reason: "sync_payload_too_large",
      error: new Error(
        "This sync exceeds the safe 7 MiB request limit. Your local data is preserved, but this backlog needs support before it can be uploaded.",
      ),
    };
  }

  const { error } = await supabase.rpc(
    "apply_organization_record_changes_batched",
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

export async function runTenantSyncSmokeTest(organization) {
  if (!supabase || !navigator.onLine) {
    throw new Error("Connect to the internet before running the tenant sync test.");
  }
  if (!organization?.id || !organization?.productId || !organization?.userId) {
    throw new Error("A signed-in company session is required for the tenant sync test.");
  }

  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError) throw authError;
  if (!authData.user || authData.user.id !== organization.userId) {
    throw new Error("The signed-in user does not match this company session.");
  }

  const baseline = await fetchFromSupabase(organization);
  if (!baseline.success) {
    throw baseline.error || new Error("Could not read the tenant cloud baseline.");
  }
  if (baseline.migrationRequired) {
    throw new Error(
      "This company still has a legacy document awaiting owner-approved migration.",
    );
  }

  const batchProbePrefix = `sync-smoke-batch-${crypto.randomUUID()}`;
  const batchProbeChanges = Array.from(
    { length: TENANT_SYNC_BATCH_SIZE + 1 },
    (_, index) => ({
      operation: "delete",
      collection: "notifications",
      id: `${batchProbePrefix}-${index}`,
      expectedUpdatedAt: null,
    }),
  );
  const { data: batchProbeCount, error: batchProbeError } = await supabase.rpc(
    "apply_organization_record_changes_batched",
    {
      p_organization_id: organization.id,
      p_product_id: organization.productId,
      p_changes: batchProbeChanges,
    },
  );
  if (batchProbeError) throw batchProbeError;
  if (Number(batchProbeCount) !== TENANT_SYNC_BATCH_SIZE + 1) {
    throw new Error(
      "The tenant sync batch-boundary check did not process all 1,001 changes.",
    );
  }

  const recordId = `sync-smoke-${crypto.randomUUID()}`;
  const readProbe = () =>
    supabase
      .from("organization_records")
      .select("record_id, data, created_by, updated_at")
      .eq("organization_id", organization.id)
      .eq("product_id", organization.productId)
      .eq("collection", "notifications")
      .eq("record_id", recordId)
      .maybeSingle();
  const applyProbeChange = (change) =>
    supabase.rpc("apply_organization_record_changes_batched", {
      p_organization_id: organization.id,
      p_product_id: organization.productId,
      p_changes: [change],
    });

  let probeMayExist = true;
  try {
    const { error: insertError } = await applyProbeChange({
      operation: "upsert",
      collection: "notifications",
      id: recordId,
      data: {
        id: recordId,
        title: "Temporary tenant sync check",
        message: "Temporary verification record; safe to remove.",
        syncSmokeTest: true,
      },
      expectedUpdatedAt: null,
    });
    if (insertError) throw insertError;

    const { data: saved, error: readError } = await readProbe();
    if (readError) throw readError;
    if (
      !saved ||
      saved.created_by !== authData.user.id ||
      saved.data?.id !== recordId
    ) {
      throw new Error(
        "The test record was not visible through the signed-in tenant read policy.",
      );
    }

    const { error: deleteError } = await applyProbeChange({
      operation: "delete",
      collection: "notifications",
      id: recordId,
      expectedUpdatedAt: saved.updated_at,
    });
    if (deleteError) throw deleteError;

    const { data: remaining, error: verifyDeleteError } = await readProbe();
    if (verifyDeleteError) throw verifyDeleteError;
    if (remaining) {
      throw new Error("The temporary test record could not be confirmed deleted.");
    }
    probeMayExist = false;

    return {
      success: true,
      organizationId: organization.id,
      batchBoundaryVerified: true,
      recordRoundTrip: true,
      cleanupConfirmed: true,
    };
  } catch (error) {
    if (probeMayExist) {
      const { data: existing, error: cleanupReadError } = await readProbe();
      if (cleanupReadError) {
        throw new Error(
          `Tenant sync test failed (${error.message}); cleanup lookup also failed (${cleanupReadError.message}). Probe ID: ${recordId}`,
        );
      }
      if (existing) {
        const { error: cleanupError } = await applyProbeChange({
          operation: "delete",
          collection: "notifications",
          id: recordId,
          expectedUpdatedAt: existing.updated_at,
        });
        if (cleanupError) {
          throw new Error(
            `Tenant sync test failed (${error.message}); temporary probe cleanup failed (${cleanupError.message}). Probe ID: ${recordId}`,
          );
        }
      }
    }
    throw error;
  }
}
