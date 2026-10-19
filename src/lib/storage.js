import {
  syncToSupabase,
  fetchFromSupabase,
} from "./supabaseClient.js";

export const DEFAULT_EXPENSE_CATEGORIES = [
  "Utilities & Fuel",
  "Machine Maintenance & Repairs",
  "Raw Materials & Factory Supplies",
  "Salaries & Staff Wages",
  "Transport & Delivery Logistics",
  "Administrative & Office",
  "Taxes, GRA & Regulatory Fees",
  "Marketing & Promotional",
  "Miscellaneous Expenses",
];

export const STORAGE_KEY = "pureledger-ghana-erp-db";
const DARK_MODE_KEY = "aquaflow_dark_mode_active";
const TENANT_CONTEXT_KEY = "water-app-tenant-context";
const OFFLINE_VAULT_KEY = "water-app-offline-vault";
const OFFLINE_USER_KEY = "water-app-offline-user";
const OFFLINE_PIN_ITERATIONS = 310000;
const LEGACY_EXPORT_KEY = "water-app-legacy-exported";

export function isValidOfflinePin(pin) {
  if (!/^[a-z\d]{6}$/i.test(pin)) return false;
  const normalized = pin.toLowerCase();
  if (/(.)\1{3}/.test(normalized)) return false;

  for (let index = 0; index <= normalized.length - 4; index += 1) {
    const sequence = normalized.slice(index, index + 4);
    const codes = [...sequence].map((character) => character.charCodeAt(0));
    const isNumeric = codes.every((code) => code >= 48 && code <= 57);
    const isAlphabetic = codes.every((code) => code >= 97 && code <= 122);
    if (
      (isNumeric || isAlphabetic) &&
      (codes.every((code, offset) => offset === 0 || code === codes[offset - 1] + 1) ||
        codes.every((code, offset) => offset === 0 || code === codes[offset - 1] - 1))
    ) {
      return false;
    }
  }
  return true;
}

function isSupportedOfflinePin(pin) {
  return (
    isValidOfflinePin(pin) ||
    // Keep existing 8–12 digit vaults unlockable after the PIN policy update.
    /^\d{8,12}$/.test(pin)
  );
}

function base64FromBytes(bytes) {
  const chunkSize = 0x8000;
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(
      ...bytes.subarray(offset, offset + chunkSize),
    );
  }
  return btoa(binary);
}

function bytesFromBase64(value) {
  return Uint8Array.from(atob(value), (character) => character.charCodeAt(0));
}

async function deriveOfflinePinKey(pin, salt) {
  if (!isSupportedOfflinePin(pin)) {
    throw new Error("Enter a valid 6-character offline PIN.");
  }
  const material = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(pin),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt,
      iterations: OFFLINE_PIN_ITERATIONS,
      hash: "SHA-256",
    },
    material,
    256,
  );
  const rawKey = new Uint8Array(bits);
  const verifier = await crypto.subtle.digest("SHA-256", rawKey);
  const key = await crypto.subtle.importKey(
    "raw",
    rawKey,
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"],
  );
  return { key, verifier: base64FromBytes(new Uint8Array(verifier)) };
}

async function encryptOfflineSnapshot(snapshot, key) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    new TextEncoder().encode(JSON.stringify(snapshot)),
  );
  return {
    iv: base64FromBytes(iv),
    ciphertext: base64FromBytes(new Uint8Array(ciphertext)),
  };
}

export function getOfflineAccessProfile() {
  const userId = localStorage.getItem(OFFLINE_USER_KEY);
  if (!userId) return null;
  const organization = getCachedOrganizationContext(userId);
  const rawVault = localStorage.getItem(`${OFFLINE_VAULT_KEY}:${userId}`);
  const vault = rawVault ? JSON.parse(rawVault) : null;
  return organization && vault?.version === 1
    ? { userId, organization, pending: Boolean(vault.pending) }
    : null;
}

export async function enableOfflineAccess(
  userId,
  organization,
  data,
  revision,
  pin,
  cloudData = data,
) {
  if (!userId || organization?.userId !== userId) {
    throw new Error("Sign in to the selected company before enabling offline access.");
  }
  if (!isValidOfflinePin(pin)) {
    throw new Error(
      "Choose a 6-character PIN using letters and/or numbers. Avoid repeated or sequential characters.",
    );
  }
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const { key, verifier } = await deriveOfflinePinKey(pin, salt);
  const encrypted = await encryptOfflineSnapshot(
    {
      userId,
      organization,
      data: normalizeData(data),
      cloudData: cloudData ? normalizeData(cloudData) : null,
      revision,
    },
    key,
  );
  localStorage.setItem(
    `${OFFLINE_VAULT_KEY}:${userId}`,
    JSON.stringify({
      version: 1,
      userId,
      organizationId: organization.id,
      salt: base64FromBytes(salt),
      verifier,
      ...encrypted,
    }),
  );
  cacheOrganizationContext(userId, organization);
  localStorage.setItem(OFFLINE_USER_KEY, userId);
  return key;
}

export async function unlockOfflineAccess(pin) {
  const userId = localStorage.getItem(OFFLINE_USER_KEY);
  if (!userId) throw new Error("Offline access has not been enabled on this device.");
  const rawVault = localStorage.getItem(`${OFFLINE_VAULT_KEY}:${userId}`);
  if (!rawVault) throw new Error("The encrypted offline company data is missing.");
  const vault = JSON.parse(rawVault);
  if (vault?.version !== 1 || vault.userId !== userId) {
    throw new Error("The offline vault is invalid. Sign in online to restore access.");
  }
  const { key, verifier } = await deriveOfflinePinKey(
    pin,
    bytesFromBase64(vault.salt),
  );
  if (verifier !== vault.verifier) {
    throw new Error("Incorrect offline PIN.");
  }
  try {
    const plaintext = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: bytesFromBase64(vault.iv) },
      key,
      bytesFromBase64(vault.ciphertext),
    );
    const snapshot = JSON.parse(new TextDecoder().decode(plaintext));
    if (
      snapshot?.userId !== userId ||
      snapshot?.organization?.userId !== userId ||
      snapshot?.organization?.id !== vault.organizationId ||
      !snapshot.data
    ) {
      throw new Error("The offline snapshot does not match this account.");
    }
    return {
      userId,
      organization: snapshot.organization,
      data: normalizeData(snapshot.data),
      cloudData: snapshot.cloudData
        ? normalizeData(snapshot.cloudData)
        : vault.pending
          ? null
          : normalizeData(snapshot.data),
      revision: Number(snapshot.revision) || 0,
      pending: Boolean(vault.pending),
      key,
    };
  } catch (error) {
    if (error instanceof SyntaxError) throw error;
    throw new Error("Could not decrypt offline data. Check the PIN and try again.");
  }
}

export async function updateOfflineSnapshot(
  userId,
  organization,
  data,
  revision,
  key,
  pending = true,
  cloudData = null,
) {
  const vaultStorageKey = `${OFFLINE_VAULT_KEY}:${userId}`;
  const rawVault = localStorage.getItem(vaultStorageKey);
  if (!rawVault || !key) throw new Error("Offline access is not unlocked.");
  const vault = JSON.parse(rawVault);
  const encrypted = await encryptOfflineSnapshot(
    {
      userId,
      organization,
      data: normalizeData(data),
      cloudData: cloudData ? normalizeData(cloudData) : null,
      revision,
    },
    key,
  );
  localStorage.setItem(
    vaultStorageKey,
    JSON.stringify({ ...vault, ...encrypted, pending }),
  );
}

export function clearOfflineAccess(userId) {
  if (!userId) return;
  localStorage.removeItem(`${OFFLINE_VAULT_KEY}:${userId}`);
  if (localStorage.getItem(OFFLINE_USER_KEY) === userId) {
    localStorage.removeItem(OFFLINE_USER_KEY);
  }
}

export function clearTenantCache(organizationId) {
  localStorage.removeItem(getTenantStorageKey(organizationId));
}

export function cacheOrganizationContext(userId, organization) {
  if (!userId || organization?.userId !== userId) {
    throw new Error("The cached company must belong to the signed-in account.");
  }
  localStorage.setItem(
    `${TENANT_CONTEXT_KEY}:${userId}`,
    JSON.stringify(organization),
  );
}

export function getCachedOrganizationContext(userId) {
  if (!userId) return null;
  const raw = localStorage.getItem(`${TENANT_CONTEXT_KEY}:${userId}`);
  if (!raw) return null;

  const organization = JSON.parse(raw);
  const validRoles = ["owner", "manager", "cashier", "driver"];
  if (
    organization?.userId !== userId ||
    typeof organization.id !== "string" ||
    typeof organization.name !== "string" ||
    organization.productId !== "water" ||
    typeof organization.userName !== "string" ||
    !validRoles.includes(organization.role)
  ) {
    throw new Error("The saved company session is invalid. Connect online to sign in again.");
  }
  return organization;
}

export function getStoredDarkMode() {
  if (typeof window === "undefined") return false;
  const stored = localStorage.getItem(DARK_MODE_KEY);
  if (stored !== null) return stored === "true";
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function setStoredDarkMode(enabled) {
  if (typeof window === "undefined") return;
  localStorage.setItem(DARK_MODE_KEY, String(enabled));
  if (enabled) {
    document.documentElement.classList.add("dark");
  } else {
    document.documentElement.classList.remove("dark");
  }
}

export const emptyData = {
  rolesConfig: {
    owner: {
      label: "Business Owner",
      desc: "Full control · Financials · Price setup · Transfers",
      icon: "ShieldCheck",
    },
    manager: {
      label: "Manager",
      desc: "Operations · Production · Stock Acceptance",
      icon: "Users",
    },
    cashier: {
      label: "Cashier",
      desc: "Driver & Customer Sales Entry",
      icon: "Wallet",
    },
    driver: {
      label: "Delivery Driver",
      desc: "Delivery Operations",
      icon: "Truck",
    },
  },
  users: [],
  businessDetails: {
    name: "",
    address: "",
    phone: "",
    tin: "",
    isRegistered: false,
  },
  expenseCategories: DEFAULT_EXPENSE_CATEGORIES,
  rollTypes: [],
  machines: [],
  intake: [],
  issuance: [],
  bagTypes: [],
  bagIntake: [],
  bagIssuance: [],
  bagUsage: [],
  productionRuns: [],
  sales: [],
  debtPayments: [],
  expenses: [],
  adminExpenses: [],
  bankDeposits: [],
  adminbankDeposits: [],
  notifications: [],
  settings: {
    pricePerBag: 0,
    companyName: "",
    lowStockRollKg: 50,
    lowStockBagQty: 200,
    lowStockFinishedBags: 500,
  },
  auditLog: [],
};

export function normalizeData(data = {}) {
  return {
    ...emptyData,
    ...data,
    rolesConfig: { ...emptyData.rolesConfig, ...(data?.rolesConfig || {}) },
    expenseCategories: data?.expenseCategories || DEFAULT_EXPENSE_CATEGORIES,
    machines: data?.machines || emptyData.machines,
    settings: { ...emptyData.settings, ...(data?.settings || {}) },
    businessDetails: {
      ...emptyData.businessDetails,
      ...(data?.businessDetails || {}),
    },
    users: Array.isArray(data?.users)
      ? data.users.map(({ password: _password, ...user }) => user)
      : [],
    rollTypes: data?.rollTypes || [],
    intake: data?.intake || [],
    issuance: data?.issuance || [],
    bagTypes: data?.bagTypes || [],
    bagIntake: data?.bagIntake || [],
    bagIssuance: data?.bagIssuance || [],
    bagUsage: data?.bagUsage || [],
    productionRuns: data?.productionRuns || [],
    sales: data?.sales || [],
    debtPayments: data?.debtPayments || [],
    expenses: data?.expenses || [],
    adminExpenses: data?.adminExpenses || [],
    bankDeposits: data?.bankDeposits || [],
    adminbankDeposits: data?.adminbankDeposits || [],
    notifications: data?.notifications || [],
    auditLog: data?.auditLog || [],
  };
}

function getTenantStorageKey(organizationId) {
  if (!organizationId) throw new Error("A company is required to load data.");
  return `${STORAGE_KEY}:${organizationId}`;
}

function getTenantCache(organizationId) {
  const raw = localStorage.getItem(getTenantStorageKey(organizationId));
  if (!raw) return null;
  const parsed = JSON.parse(raw);
  if (parsed?.cacheVersion === 1 && parsed.data) return parsed;
  return {
    cacheVersion: 0,
    data: parsed,
    pending: true,
    cloudData: null,
  };
}

export function hasPendingTenantCache(organizationId) {
  const cache = getTenantCache(organizationId);
  return Boolean(cache?.pending);
}

export function downloadPendingTenantCache(organizationId) {
  const cache = getTenantCache(organizationId);
  if (!cache?.pending) return false;

  const backup = {
    exportedAt: new Date().toISOString(),
    organizationId,
    note: "Unconfirmed local data. Reconcile with the owner before importing.",
    cache,
  };
  const blob = new Blob([JSON.stringify(backup, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `water-app-pending-${organizationId}.json`;
  link.click();
  URL.revokeObjectURL(url);
  localStorage.setItem(`${LEGACY_EXPORT_KEY}:${organizationId}`, "true");
  return true;
}

export function hasDownloadedPendingTenantCache(organizationId) {
  return localStorage.getItem(`${LEGACY_EXPORT_KEY}:${organizationId}`) === "true";
}

function readTenantCache(storageKey) {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed?.cacheVersion === 1 && parsed.data) {
      return {
        data: normalizeData(parsed.data),
        revision: Number(parsed.revision) || 0,
        pending: Boolean(parsed.pending),
        cloudData: Object.hasOwn(parsed, "cloudData")
          ? parsed.cloudData
            ? normalizeData(parsed.cloudData)
            : null
          : parsed.pending
            ? null
            : normalizeData(parsed.data),
      };
    }
    return {
      data: normalizeData(parsed),
      revision: 0,
      pending: true,
      cloudData: null,
    };
  } catch (error) {
    console.error("Error reading this company's local data:", error);
    return null;
  }
}

function writeTenantCache(storageKey, data, revision, pending, cloudData = data) {
  localStorage.setItem(
    storageKey,
    JSON.stringify({
      cacheVersion: 1,
      data,
      revision,
      pending,
      cloudData: cloudData ? normalizeData(cloudData) : null,
    }),
  );
}

export async function loadData(organization) {
  const tenantStorageKey = getTenantStorageKey(organization?.id);
  const localCache = readTenantCache(tenantStorageKey);

  if (navigator.onLine) {
    const remoteResult = await fetchFromSupabase(organization);
    if (remoteResult.success) {
      if (remoteResult.migrationRequired) {
        return {
          data: localCache?.data || normalizeData(remoteResult.data),
          revision: localCache?.revision || remoteResult.revision,
          syncStatus: "migration_required",
          cloudData: null,
        };
      }
      if (localCache?.pending) {
        if (
          localCache.cloudData?.tenantRecordBaselineVersion !== 1
        ) {
          return {
            data: localCache.data,
            revision: localCache.revision,
            syncStatus: "legacy_conflict",
            cloudData: remoteResult.data,
          };
        }
        const syncResult = await syncToSupabase(
          localCache.data,
          organization,
          localCache.revision,
          localCache.cloudData,
        );
        if (!syncResult.success) {
          return {
            data: localCache.data,
            revision: localCache.revision,
            syncStatus: syncResult.conflict ? "conflict" : "pending",
            cloudData: localCache.cloudData,
          };
        }
        writeTenantCache(
          tenantStorageKey,
          localCache.data,
          syncResult.revision,
          false,
          localCache.data,
        );
        const refreshed = await fetchFromSupabase(organization);
        const syncedData = refreshed.success
          ? normalizeData(refreshed.data)
          : localCache.data;
        writeTenantCache(
          tenantStorageKey,
          syncedData,
          syncResult.revision,
          false,
          syncedData,
        );
        return {
          data: syncedData,
          revision: syncResult.revision,
          syncStatus: "synced",
          cloudData: syncedData,
        };
      }
      if (localCache && !remoteResult.data) {
        return {
          data: localCache.data,
          revision: localCache.revision,
          syncStatus: "conflict",
          cloudData: localCache.cloudData,
        };
      }
      if (remoteResult.data) {
        const remoteData = normalizeData(remoteResult.data);
        writeTenantCache(
          tenantStorageKey,
          remoteData,
          remoteResult.revision,
          false,
          remoteData,
        );
        return {
          data: remoteData,
          revision: remoteResult.revision,
          syncStatus: "synced",
          cloudData: remoteData,
        };
      }
      return {
        data: normalizeData(emptyData),
        revision: remoteResult.revision,
        syncStatus: "synced",
        cloudData: normalizeData(emptyData),
      };
    }
  }

  if (localCache) {
    return {
      data: localCache.data,
      revision: localCache.revision,
      syncStatus: localCache.pending ? "pending" : "offline",
      cloudData: localCache.cloudData,
    };
  }

  return {
    data: normalizeData(emptyData),
    revision: 0,
    syncStatus: "offline",
    cloudData: null,
  };
}

export async function refreshData(organization) {
  const result = await fetchFromSupabase(organization);
  if (!result.success) return { success: false, error: result.error };
  if (result.migrationRequired) {
    return {
      success: false,
      error: new Error(
        "The owner must import the verified legacy company document before cloud data can be refreshed.",
      ),
    };
  }
  if (!result.data) {
    return {
      success: true,
      data: normalizeData(emptyData),
      revision: result.revision,
      cloudData: normalizeData(emptyData),
    };
  }

  const normalized = normalizeData(result.data);
  writeTenantCache(
    getTenantStorageKey(organization.id),
    normalized,
    result.revision,
    false,
    normalized,
  );
  return {
    success: true,
    data: normalized,
    revision: result.revision,
    cloudData: normalized,
  };
}

export async function saveData(
  data = {},
  organization,
  expectedRevision = 0,
  { offlineKey = null, localOnly = false, cloudData = null } = {},
) {
  const tenantStorageKey = getTenantStorageKey(organization?.id);
  const normalized = normalizeData(data);
  const localCache = readTenantCache(tenantStorageKey);
  const cloudBaseline =
    localCache?.cloudData ??
    (!localCache?.pending ? localCache?.data : null) ??
    cloudData;
  let localSuccess = false;
  let localError = null;

  try {
    if (offlineKey) {
      await updateOfflineSnapshot(
        organization.userId,
        organization,
        normalized,
        expectedRevision,
        offlineKey,
        true,
        cloudBaseline,
      );
      if (localOnly) {
        clearTenantCache(organization.id);
      } else {
        writeTenantCache(
          tenantStorageKey,
          normalized,
          expectedRevision,
          true,
          cloudBaseline,
        );
      }
    } else {
      writeTenantCache(
        tenantStorageKey,
        normalized,
        expectedRevision,
        true,
        cloudBaseline,
      );
    }
    localSuccess = true;
  } catch (e) {
    localError = e;
    if (e.name === "QuotaExceededError" || e.code === 22) {
      console.error(
        "LocalStorage quota exceeded! Free up space or archive audit logs.",
      );
    } else {
      console.error("LocalStorage write failed:", e);
    }
  }

  let syncResult = { success: false, reason: "local_only" };
  if (localSuccess && navigator.onLine && !localOnly) {
    syncResult = await syncToSupabase(
      normalized,
      organization,
      expectedRevision,
      cloudBaseline,
    );
    if (syncResult.success) {
      writeTenantCache(
        tenantStorageKey,
        normalized,
        syncResult.revision,
        false,
        normalized,
      );
      if (offlineKey) {
        await updateOfflineSnapshot(
          organization.userId,
          organization,
          normalized,
          syncResult.revision,
          offlineKey,
          false,
          normalized,
        );
      }
    }
  }

  return {
    localSuccess,
    localError,
    syncResult,
    revision: syncResult.success ? syncResult.revision : expectedRevision,
  };
}