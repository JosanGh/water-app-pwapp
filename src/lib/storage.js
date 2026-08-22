import { supabase, syncToSupabase } from './supabaseClient';

export const DEFAULT_EXPENSE_CATEGORIES = [
  "Utilities & Fuel",
  "Machine Maintenance & Repairs",
  "Raw Materials & Factory Supplies",
  "Salaries & Staff Wages",
  "Transport & Delivery Logistics",
  "Administrative & Office",
  "Taxes, GRA & Regulatory Fees",
  "Marketing & Promotional",
  "Miscellaneous Expenses"
];

export const STORAGE_KEY = "pureledger-ghana-erp-db";

export const emptyData = {
  rolesConfig: {
    owner: { label: "Business Owner", desc: "Full control · Financials · Price setup · Transfers", icon: "ShieldCheck" },
    manager: { label: "Manager", desc: "Operations · Production · Stock Acceptance", icon: "Users" },
    cashier: { label: "Cashier", desc: "Driver & Customer Sales Entry", icon: "Wallet" },
    driver: { label: "Delivery Driver", desc: "Delivery Operations", icon: "Truck" },
  },
  users: [
    { id: "u1", name: "Super Admin", role: "owner", password: "123", email: "admin@pureledger.com" },
    { id: "u2", name: "Factory Manager", role: "manager", password: "123" },
    { id: "u3", name: "Plant Cashier", role: "cashier", password: "123" },
    { id: "d1", name: "Kwame (Truck GT-1022-22)", role: "driver", password: "123", truckNo: "GT-1022-22" },
    { id: "d2", name: "Kofi (Truck WR-5541-21)", role: "driver", password: "123", truckNo: "WR-5541-21" },
  ],
  businessDetails: {
    name: "Mattbees Water Services",
    address: "Industrial Area, Accra",
    phone: "+233 24 000 0000",
    tin: "C0000000000",
    isRegistered: true,
  },
  expenseCategories: DEFAULT_EXPENSE_CATEGORIES,
  rollTypes: [],
  machines: [
    "Machine 1 - Koyo Cutting Line",
    "Machine 2 - High Speed Sachet Line",
    "Machine 3 - Secondary Line"
  ],
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
  notifications: [],
  settings: {
    pricePerBag: 5.0,
    companyName: "Mattbees Water Services",
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
    businessDetails: { ...emptyData.businessDetails, ...(data?.businessDetails || {}) },
    users: data?.users || emptyData.users,
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
    notifications: data?.notifications || [],
    auditLog: data?.auditLog || [],
  };
}

/**
 * Loads LocalStorage first. 
 * Only fetches remote if local storage is completely empty.
 */
export async function loadData() {
  let localData = null;

  // 1. Read from LocalStorage first
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      localData = JSON.parse(raw);
    }
  } catch (e) {
    console.error("Error reading LocalStorage:", e);
  }

  // 2. If local storage already has data, return it immediately (Offline-First)
  if (localData) {
    return normalizeData(localData);
  }

  // 3. Fallback: Fetch from Supabase ONLY if local storage was empty
  if (supabase && navigator.onLine) {
    try {
      const { data: remote, error } = await supabase
        .from("pureledger_store")
        .select("data")
        .eq("id", "main_data")
        .single();

      if (!error && remote?.data) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(remote.data));
        return normalizeData(remote.data);
      }
    } catch (e) {
      console.warn("Supabase initial load failed:", e);
    }
  }

  return emptyData;
}

/**
 * Saves to LocalStorage first, verifies write success, then syncs to Supabase.
 */
export async function saveData(data = {}) {
  const normalized = normalizeData(data);
  let localSuccess = false;

  // 1. Save strictly to LocalStorage first
  try {
    const serialized = JSON.stringify(normalized);
    localStorage.setItem(STORAGE_KEY, serialized);
    localSuccess = true;
  } catch (e) {
    if (e.name === "QuotaExceededError" || e.code === 22) {
      console.error("LocalStorage quota exceeded! Free up space or archive audit logs.");
    } else {
      console.error("LocalStorage write failed:", e);
    }
  }

  // 2. Sync to Supabase ONLY if local storage save succeeded and network is available
  if (localSuccess && navigator.onLine) {
    try {
      await syncToSupabase(normalized);
    } catch (err) {
      console.warn("Background sync failed; local data remains persisted.", err);
    }
  }

  return localSuccess;
}