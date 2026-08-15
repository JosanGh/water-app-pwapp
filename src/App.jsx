import React, { useState, useEffect, useMemo, useCallback } from 'react'
import viteLogo from './assets/vite.svg'
import { openDB } from 'https://unpkg.com';

import { createClient } from '@supabase/supabase-js'

import {
  Droplets, Warehouse, PackageOpen, Factory, Wallet, FileBarChart, ShieldCheck,
  LogOut, Plus, ChevronRight, AlertTriangle, CheckCircle2, Wifi, WifiOff,
  Users, Settings2, Scale, TrendingUp, TrendingDown, ClipboardList, X, Lock,
  Printer, Calendar, Menu, Bell, Pencil, Truck, Check, KeyRound, Mail, Receipt, Building, DollarSign, RotateCcw, Trash2, Sun, Moon, AlertCircle
} from "lucide-react";

/* ---------------------------------------------------------------------- */
/*  SUPABASE CLIENT & SYNC ENGINE                                          */
/* ---------------------------------------------------------------------- */
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "";
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

export const supabase = (SUPABASE_URL && SUPABASE_ANON_KEY)
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

async function syncToSupabase(data) {
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

/* ---------------------------------------------------------------------- */
/*  PWA SERVICE WORKER REGISTRATION                                       */
/* ---------------------------------------------------------------------- */
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/service-worker.js").catch((err) => {
      console.log("SW registration failed: ", err);
    });
  });
}

/* ---------------------------------------------------------------------- */
/*  INDEXEDDB DATABASE SETUP                                              */
/* ---------------------------------------------------------------------- */
const DB_NAME = "pureledger_store";
const STORE_NAME = "sync-queue";
const BATCH_SIZE = 50;

const dbPromise = openDB(DB_NAME, 1, {
  upgrade(db) {
    if (!db.objectStoreNames.contains(STORE_NAME)) {
      db.createObjectStore(STORE_NAME, { keyPath: "id", autoIncrement: true });
    }
  },
});

/* ---------------------------------------------------------------------- */
/*  AUTHENTICATION HELPERS                                                */
/* ---------------------------------------------------------------------- */
async function refreshAccessToken() {
  const response = await fetch("/.netlify/functions/refresh-token-endpoint", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });

  if (!response.ok) {
    localStorage.removeItem("user_access_jwt");
    throw new Error("User refresh session fully expired. Redirecting to sign-in.");
  }

  const data = await response.json();
  localStorage.setItem("user_access_jwt", data.accessToken);
  return data.accessToken;
}

/* ---------------------------------------------------------------------- */
/*  NETWORK & BATCH HELPERS                                               */
/* ---------------------------------------------------------------------- */
async function sendBatchRecords(batch, token) {
  return fetch("/.netlify/functions/sync-records-batch", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ records: batch }),
  });
}

/* ---------------------------------------------------------------------- */
/*  BATCH SYNCHRONIZATION ENGINE                                          */
/* ---------------------------------------------------------------------- */
let isSyncing = false;

async function secureUploadLocalQueue() {
  if (!navigator.onLine || isSyncing) return;

  let userToken = localStorage.getItem("user_access_jwt");
  if (!userToken) return;

  isSyncing = true;

  try {
    const db = await dbPromise;
    const records = await db.getAll(STORE_NAME);

    if (!records.length) return;

    for (let i = 0; i < records.length; i += BATCH_SIZE) {
      const batch = records.slice(i, i + BATCH_SIZE);
      let response = await sendBatchRecords(batch, userToken);

      if (response.status === 401) {
        const errorData = await response.json().catch(() => ({}));

        if (errorData.error === "TokenExpired") {
          console.log("Access token expired. Refreshing session...");
          try {
            userToken = await refreshAccessToken();
            response = await sendBatchRecords(batch, userToken);
          } catch (refreshErr) {
            console.error("Critical: Session lost entirely.", refreshErr);
            break;
          }
        }
      }

      if (response.ok || response.status === 202) {
        const responseData = await response.json().catch(() => ({}));
        const syncedIds = responseData.syncedIds || batch.map((item) => item.id);

        const tx = db.transaction(STORE_NAME, "readwrite");
        for (const id of syncedIds) {
          await tx.store.delete(id);
        }
        await tx.done;

        console.log(`Batch sync successful: removed ${syncedIds.length} items from queue.`);
      } else {
        console.warn(`Batch sync failed with status ${response.status}. Retaining queue.`);
        break;
      }
    }
  } catch (err) {
    console.error("Network error during batch sync:", err);
  } finally {
    isSyncing = false;
  }
}

/* ---------------------------------------------------------------------- */
/*  LOCAL STORAGE & DEBOUNCED EVENT LISTENERS                              */
/* ---------------------------------------------------------------------- */
let syncDebounceTimer = null;

function triggerDebouncedSync(delay = 2500) {
  clearTimeout(syncDebounceTimer);
  syncDebounceTimer = setTimeout(() => {
    secureUploadLocalQueue();
  }, delay);
}

async function saveToLocalQueue(data) {
  const db = await dbPromise;
  await db.add(STORE_NAME, {
    ...data,
    timestamp: Date.now(),
  });

  triggerDebouncedSync(500);
}

window.addEventListener("online", () => triggerDebouncedSync(2500));

/* ---------------------------------------------------------------------- */
/*  STORAGE ENGINE & DATA STRUCTURE                                        */
/* ---------------------------------------------------------------------- */
const STORAGE_KEY = "pureledger-ghana-erp-db";

const emptyData = {
  users: [
    { id: "u1", name: "Super Admin", role: "owner", password: "123", email: "admin@pureledger.com" },
    { id: "u2", name: "Factory Manager", role: "manager", password: "123" },
    { id: "u3", name: "Plant Cashier", role: "cashier", password: "123" },
    { id: "d1", name: "Kwame (Truck GT-1022-22)", role: "driver", password: "123", truckNo: "GT-1022-22" },
    { id: "d2", name: "Kofi (Truck WR-5541-21)", role: "driver", password: "123", truckNo: "WR-5541-21" },
  ],
  businessDetails: {
    name: "",
    address: "",
    phone: "",
    tin: "",
    isRegistered: false,
  },
  rollTypes: [],
  intake: [],
  issuance: [],
  bagTypes: [],
  bagIntake: [],
  bagIssuance: [],
  bagUsage: [],
  bagCounts: [],
  productionRuns: [],
  sales: [],
  debtPayments: [],
  expenses: [],
  adminExpenses: [],
  expenseCategories: ["Raw Material", "Utilities", "Maintenance", "Transport & Fuel", "Salaries & Wages", "Tax & GRA", "General Admin", "Miscellaneous"],
  bankDeposits: [],
  notifications: [],
  settings: {
    pricePerBag: 5.0,
    companyName: "Ghana Pure Water Ltd",
    lowStockRollKg: 50,
    lowStockBagQty: 200,
    lowStockFinishedBags: 500,
  },
  auditLog: [],
  superAdminRegistered: false,
};

async function loadData() {
  if (supabase && navigator.onLine) {
    try {
      const { data: remote, error } = await supabase.from("pureledger_store").select("data").eq("id", "main_data").single();
      if (!error && remote && remote.data) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(remote.data));
        return {
          ...emptyData,
          ...remote.data,
          settings: { ...emptyData.settings, ...(remote.data.settings || {}) },
          businessDetails: { ...emptyData.businessDetails, ...(remote.data.businessDetails || {}) },
          expenseCategories: remote.data.expenseCategories || emptyData.expenseCategories
        };
      }
    } catch (e) {
      console.warn("Supabase load failed, falling back to local storage", e);
    }
  }

  try {
    const res = localStorage.getItem(STORAGE_KEY);
    if (!res) return emptyData;
    const parsed = JSON.parse(res);
    return {
      ...emptyData,
      ...parsed,
      settings: { ...emptyData.settings, ...(parsed.settings || {}) },
      businessDetails: { ...emptyData.businessDetails, ...(parsed.businessDetails || {}) },
      expenseCategories: parsed.expenseCategories || emptyData.expenseCategories
    };
  } catch {
    return emptyData;
  }
}

async function saveData(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    syncToSupabase(data);
  } catch (e) {
    console.error("Storage save failed", e);
  }
}

/* ---------------------------------------------------------------------- */
/*  HELPERS & FORMATTERS                                                    */
/* ---------------------------------------------------------------------- */
const uid = () => Math.random().toString(36).slice(2, 10);
const todayISO = () => new Date().toISOString().slice(0, 10);
const fmt = (n, d = 1) => Number(n || 0).toLocaleString("en-GH", { maximumFractionDigits: d, minimumFractionDigits: 0 });
const fmtGHS = (n) => `GH₵ ${fmt(n, 2)}`;

const DEFAULT_ROLES = {
  owner: { label: "Business Owner", desc: "Full control · Financials · Price setup · Transfers", icon: ShieldCheck },
  manager: { label: "Manager", desc: "Operations · Production · Stock Acceptance", icon: Users },
  cashier: { label: "Cashier", desc: "Driver & Customer Sales Entry", icon: Wallet },
  driver: { label: "Delivery Driver", desc: "Delivery Operations", icon: Truck },
};

/* ---------------------------------------------------------------------- */
/*  TOAST COMPONENT                                                        */
/* ---------------------------------------------------------------------- */
function Toast({ msg, tone = "ok" }) {
  const isWarn = tone === "warn";
  return (
    <div className={`fixed bottom-5 right-5 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-2xl text-xs font-bold text-white transition-all ${isWarn ? "bg-[#C4472F]" : "bg-[#2A6E4A]"}`}>
      {isWarn ? <AlertTriangle size={16} /> : <CheckCircle2 size={16} />}
      <span>{msg}</span>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/*  MAIN ENTRY APP                                                         */
/* ---------------------------------------------------------------------- */
export default function App() {
  const [session, setSession] = useState(null);
  const [data, setData] = useState(emptyData);
  const [loaded, setLoaded] = useState(false);
  const [page, setPage] = useState("dashboard");
  const [online, setOnline] = useState(navigator.onLine);
  const [toast, setToast] = useState(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [showBusinessModal, setShowBusinessModal] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    loadData().then((d) => {
      setData(d);
      setLoaded(true);
    });
  }, []);

  useEffect(() => {
    const on = () => {
      setOnline(true);
      if (loaded) syncToSupabase(data);
    };
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, [loaded, data]);

  const showToast = useCallback((msg, tone = "ok") => {
    setToast({ msg, tone });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const mutate = useCallback((updater, auditAction, auditDetail) => {
    setData((prev) => {
      const draft = updater(prev);
      const withAudit = session
        ? {
            ...draft,
            auditLog: [
              { id: uid(), ts: new Date().toISOString(), user: session.name, role: session.role, action: auditAction, detail: auditDetail },
              ...(draft.auditLog || []),
            ].slice(0, 999),
          }
        : draft;

      setTimeout(() => saveData(withAudit), 0);
      return withAudit;
    });
  }, [session]);

  const handleLogin = (s) => {
    setSession(s);
    setPage(s.role === "cashier" ? "sales" : s.role === "driver" ? "reports" : "dashboard");
    showToast(`Welcome, ${s.name}`);

    if (s.role === "owner" && !data.businessDetails?.isRegistered) {
      setShowBusinessModal(true);
    }
  };

  const handleRegisterSuperAdmin = (email, fullName, password) => {
    const newAdmin = {
      id: "u1",
      name: fullName,
      role: "owner",
      password: password,
      email: email.toLowerCase(),
    };

    setData((prev) => {
      const updatedUsers = (prev.users || []).filter((u) => u.id !== "u1" && u.role !== "owner");
      const nextData = {
        ...prev,
        superAdminRegistered: true,
        users: [newAdmin, ...updatedUsers],
      };
      saveData(nextData);
      return nextData;
    });

    showToast("Super Admin registered successfully! You can now log in.");
  };

  const handleResetAdminPassword = (emailInput, newPass) => {
    const adminUser = (data.users || []).find(
      (u) => u.email && u.email.toLowerCase() === emailInput.trim().toLowerCase() && u.role === "owner"
    );

    if (!adminUser) return false;

    mutate((prev) => ({
      ...prev,
      users: (prev.users || []).map((u) => u.id === adminUser.id ? { ...u, password: newPass } : u),
    }), "Admin Password Reset", adminUser.email);

    return true;
  };

  const handleSaveBusinessDetails = (details) => {
    mutate((prev) => ({
      ...prev,
      businessDetails: {
        ...details,
        isRegistered: true,
      },
      settings: {
        ...prev.settings,
        companyName: details.name || prev.settings.companyName,
      },
    }), "Updated Business Details", details.name);

    setShowBusinessModal(false);
    showToast("Business Details Saved Successfully!");
  };

  if (!loaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0B3B45]">
        <div className="flex items-center gap-3 text-[#EAF3F1]">
          <Droplets className="animate-pulse" size={28} />
          <span className="font-mono text-sm tracking-widest uppercase">Loading PureLedger ERP…</span>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <LoginScreen
        data={data}
        onLogin={handleLogin}
        onRegisterSuperAdmin={handleRegisterSuperAdmin}
        onResetAdminPassword={handleResetAdminPassword}
      />
    );
  }

  return (
    <div className={`min-h-screen ${darkMode ? "bg-gray-900 text-gray-100 dark-mode" : "bg-[#F2F4EF] text-[#16211F]"} font-body transition-colors duration-200`}>
      <style dangerouslySetInnerHTML={{ __html: CSS_TOOLKIT }} />
      <div className="flex">
        <Sidebar
          page={page}
          setPage={(p) => { setPage(p); setMobileNavOpen(false); }}
          role={session.role}
          onLogout={() => setSession(null)}
          open={mobileNavOpen}
          onClose={() => setMobileNavOpen(false)}
          darkMode={darkMode}
        />
        <div className="flex-1 min-w-0">
          <TopBar 
            session={session} 
            online={online} 
            onMenuClick={() => setMobileNavOpen(true)} 
            onLogout={() => setSession(null)} 
            data={data} 
            mutate={mutate} 
            darkMode={darkMode} 
            setDarkMode={setDarkMode} 
          />
          <main className="p-4 sm:p-6 max-w-6xl mx-auto">
            {page === "dashboard" && (session.role === "owner" || session.role === "manager") && (
              <Dashboard data={data} mutate={mutate} session={session} showToast={showToast} darkMode={darkMode} />
            )}
            {page === "warehouse" && (session.role === "owner" || session.role === "manager") && (
              <WarehouseModule data={data} mutate={mutate} session={session} showToast={showToast} darkMode={darkMode} />
            )}
            {page === "packing" && (session.role === "owner" || session.role === "manager") && (
              <PackingModule data={data} mutate={mutate} session={session} showToast={showToast} darkMode={darkMode} />
            )}
            {page === "production" && (session.role === "owner" || session.role === "manager") && (
              <ProductionModule data={data} mutate={mutate} session={session} showToast={showToast} darkMode={darkMode} />
            )}
            {page === "sales" && (session.role !== "driver") && (
              <SalesModule data={data} mutate={mutate} session={session} showToast={showToast} darkMode={darkMode} />
            )}
            {page === "reports" && (
              <ReportsModule data={data} session={session} darkMode={darkMode} />
            )}
            {page === "admin" && session.role === "owner" && (
              <AdminManagementModule data={data} mutate={mutate} showToast={showToast} darkMode={darkMode} />
            )}
            {page === "audit" && session.role === "owner" && <AuditLog data={data} mutate={mutate} showToast={showToast} darkMode={darkMode} />}
          </main>
        </div>
      </div>

      {showBusinessModal && (
        <BusinessDetailsModal
          initialDetails={data.businessDetails}
          onSave={handleSaveBusinessDetails}
          onSkip={() => setShowBusinessModal(false)}
        />
      )}

      {toast && <Toast msg={toast.msg} tone={toast.tone} />}
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/*  STYLING TOOLKIT & CSS INJECT                                            */
/* ---------------------------------------------------------------------- */
const CSS_TOOLKIT = `
@import url('https://fonts.googleapis.com/css2?family=Archivo:wght@600;700;800&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@500;600&display=swap');
.font-display { font-family: 'Archivo', sans-serif; }
.font-body { font-family: 'IBM Plex Sans', sans-serif; }
.font-mono { font-family: 'IBM Plex Mono', monospace; }

.inp { width:100%; padding:0.55rem 0.75rem; border-radius:0.5rem; border:1px solid #DDE3DA; font-size:0.875rem; font-family:'IBM Plex Sans',sans-serif; outline:none; background:#FFFFFF; color:#16211F; }
.inp:focus { border-color:#1C8C9E; box-shadow:0 0 0 3px rgba(28,140,158,0.15); }
.inp:disabled { background:#E9ECE6; cursor:not-allowed; }

.dark-mode .inp { background:#1F2937; border-color:#374151; color:#F9FAFB; }
.dark-mode .inp:disabled { background:#111827; }
.dark-mode .bg-white { background-color:#1F2937 !important; border-color:#374151 !important; color:#F9FAFB !important; }
.dark-mode .bg-\[\#F2F4EF\] { background-color:#111827 !important; }
.dark-mode .bg-\[\#F7F8F5\] { background-color:#374151 !important; color:#F9FAFB !important; }
.dark-mode .text-\[\#0B3B45\] { color:#6EE7B7 !important; }
.dark-mode .text-\[\#16211F\] { color:#F9FAFB !important; }
.dark-mode .text-\[\#5B6B68\] { color:#9CA3AF !important; }
.dark-mode .border-\[\#DDE3DA\] { border-color:#374151 !important; }

.btn-primary { display:flex; align-items:center; justify-content:center; gap:0.4rem; background:#0B3B45; color:#F2F4EF; font-weight:600; font-size:0.875rem; padding:0.6rem 1rem; border-radius:0.5rem; transition:filter 0.15s; border:none; cursor:pointer; }
.btn-primary:hover { filter:brightness(1.15); }
.btn-primary:disabled { opacity:0.5; cursor:not-allowed; }
.btn-success { display:flex; align-items:center; justify-content:center; gap:0.4rem; background:#2A6E4A; color:#FFFFFF; font-weight:600; font-size:0.875rem; padding:0.5rem 0.8rem; border-radius:0.5rem; border:none; cursor:pointer; }
.btn-success:hover { filter:brightness(1.1); }

.pw-sidebar { background-color:#0B3B45 !important; }
.pw-sidebar, .pw-sidebar * { color:#F2F4EF; }
.pw-sidebar .pw-nav-item { color:#B9CFCE; }
.pw-sidebar .pw-nav-item:hover { background-color:#12505C; }
.pw-sidebar .pw-nav-item-active { background-color:#1C8C9E !important; color:#FFFFFF !important; font-weight:600; }

@media print {
  body * { visibility: hidden; }
  #printable-area, #printable-area *, #printable-receipt, #printable-receipt * { visibility: visible; }
  #printable-area { position: absolute; left: 0; top: 0; width: 100%; color: black !important; background: white !important; }
  #printable-receipt { position: absolute; left: 0; top: 0; width: 100%; max-width: 320px; margin: 0 auto; padding: 10px; background: white; color: black; }
  .no-print { display: none !important; }
}
`;

/* ---------------------------------------------------------------------- */
/*  LOGIN SCREEN                                                           */
/* ---------------------------------------------------------------------- */
function LoginScreen({ data, onLogin, onRegisterSuperAdmin, onResetAdminPassword }) {
  const users = data.users || [];
  const superAdminRegistered = data.superAdminRegistered;

  const [view, setView] = useState(!superAdminRegistered ? "register" : "login");
  const [selectedUser, setSelectedUser] = useState(users[0] || null);
  const [password, setPassword] = useState("");
  const [fullNameInput, setFullNameInput] = useState("");
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const [regEmail, setRegEmail] = useState("");
  const [regFullName, setRegFullName] = useState("");
  const [regPassword, setRegPassword] = useState("");

  const [resetEmail, setResetEmail] = useState("");
  const [resetPassword, setResetPassword] = useState("");

  useEffect(() => {
    if (users.length > 0 && !selectedUser) {
      setSelectedUser(users[0]);
    }
  }, [users, selectedUser]);

  const handleRegisterSubmit = (e) => {
    e.preventDefault();
    if (regPassword.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }
    if (!regEmail.includes("@")) {
      setError("Please provide a valid email address.");
      return;
    }
    onRegisterSuperAdmin(regEmail, regFullName, regPassword);
    setView("login");
    setError("");
  };

  const handleLoginSubmit = (e) => {
    e.preventDefault();
    if (!selectedUser) return;

    if (selectedUser.password && password !== selectedUser.password) {
      setError("Incorrect password! Access denied.");
      return;
    }

    if (!fullNameInput || fullNameInput.trim().toLowerCase() !== selectedUser.name.trim().toLowerCase()) {
      setError("Full Name mismatch! Please type the exact full name for this role.");
      return;
    }

    onLogin({
      id: selectedUser.id,
      name: selectedUser.name,
      role: selectedUser.role,
    });
  };

  const handleForgot = (e) => {
    e.preventDefault();
    if (resetPassword.length < 6) {
      setError("New password must be at least 6 characters long.");
      return;
    }
    const ok = onResetAdminPassword(resetEmail, resetPassword);
    if (ok) {
      setSuccessMsg("Admin password updated successfully! Please log in.");
      setView("login");
      setResetEmail("");
      setResetPassword("");
      setError("");
    } else {
      setError("No admin account found matching that email address.");
    }
  };

  return (
    <div className="min-h-screen bg-[#0B3B45] flex items-center justify-center p-6">
      <div className="relative w-full max-w-md bg-[#F2F4EF] rounded-2xl p-6 shadow-2xl">
        <div className="flex items-center gap-2.5 justify-center mb-6">
          <div className="w-10 h-10 rounded-lg bg-[#1C8C9E] flex items-center justify-center">
            <Droplets size={20} className="text-[#0B3B45]" />
          </div>
          <div className="text-left">
            <p className="font-display font-800 text-[#0B3B45] text-xl leading-none">Mattbees Water Services</p>
            <p className="font-mono text-[10px] text-[#5B6B68] uppercase tracking-widest mt-0.5">Offline-First Sachet ERP</p>
          </div>
        </div>

        {view === "register" && (
          <form onSubmit={handleRegisterSubmit} className="space-y-3">
            <div className="bg-[#EAF3F1] p-3 rounded-lg border border-[#BFDCD6] mb-2">
              <p className="text-xs font-bold text-[#0B3B45]">One-Time Super Admin Registration</p>
              <p className="text-[11px] text-[#5B6B68]">Set up your primary owner account to manage system roles, expenses, and operations.</p>
            </div>

            <div>
              <label className="text-xs font-semibold text-[#5B6B68] uppercase">Full Name</label>
              <input
                type="text"
                value={regFullName}
                onChange={(e) => { setRegFullName(e.target.value); setError(""); }}
                placeholder="e.g. Emmanuel Mensah"
                className="inp mt-1"
                required
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-[#5B6B68] uppercase">Email Address</label>
              <input
                type="email"
                value={regEmail}
                onChange={(e) => { setRegEmail(e.target.value); setError(""); }}
                placeholder="admin@mattbeeswater.com"
                className="inp mt-1"
                required
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-[#5B6B68] uppercase">Password (min 6 characters)</label>
              <input
                type="password"
                value={regPassword}
                onChange={(e) => { setRegPassword(e.target.value); setError(""); }}
                placeholder="••••••••"
                className="inp mt-1"
                required
              />
            </div>

            {error && <p className="text-xs font-semibold text-[#C4472F]">{error}</p>}

            <button type="submit" className="btn-primary w-full py-2.5 mt-2">
              Register Super Admin Account
            </button>
          </form>
        )}

        {view === "login" && (
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            {successMsg && <p className="text-xs font-semibold text-green-700 bg-green-100 p-2 rounded">{successMsg}</p>}

            <div>
              <label className="text-xs font-semibold text-[#5B6B68] uppercase">Select Role Account</label>
              <select
                value={selectedUser?.id || ""}
                onChange={(e) => {
                  const u = users.find((x) => x.id === e.target.value);
                  setSelectedUser(u);
                  setFullNameInput("");
                  setError("");
                }}
                className="inp mt-1"
              >
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {DEFAULT_ROLES[u.role]?.label || u.role} ({u.name})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-[#5B6B68] uppercase">Verify Full Name</label>
              <input
                type="text"
                value={fullNameInput}
                onChange={(e) => { setFullNameInput(e.target.value); setError(""); }}
                placeholder="Type exact full name assigned to role"
                className="inp mt-1"
                required
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-[#5B6B68] uppercase">Password Security Verification</label>
              <input
                type="password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(""); }}
                placeholder="••••••••"
                className="inp mt-1"
                required
              />
            </div>

            {error && <p className="text-xs font-semibold text-[#C4472F]">{error}</p>}

            <button type="submit" className="btn-primary w-full py-2.5 mt-2">
              Authenticate & Sign In
            </button>

            <div className="pt-3 border-t border-[#DDE3DA] flex flex-col gap-2 text-center">
              <button
                type="button"
                onClick={() => { setView("forgot"); setError(""); setSuccessMsg(""); }}
                className="text-xs text-gray-600 hover:underline flex items-center justify-center gap-1"
              >
                <Mail size={13} /> Admin Password Reset (Email Auth)
              </button>
            </div>
          </form>
        )}

        {view === "forgot" && (
          <form onSubmit={handleForgot} className="space-y-3">
            {successMsg && <p className="text-xs font-semibold text-green-700 bg-green-100 p-2 rounded">{successMsg}</p>}
            <div className="bg-[#EAF3F1] p-3 rounded-lg border border-[#BFDCD6] mb-2">
              <p className="text-xs font-bold text-[#0B3B45]">Admin Password Recovery</p>
              <p className="text-[11px] text-[#5B6B68]">Authenticate using registered Admin email address to set a new password.</p>
            </div>

            <div>
              <label className="text-xs font-semibold text-[#5B6B68] uppercase">Admin Email</label>
              <input
                type="email"
                value={resetEmail}
                onChange={(e) => { setResetEmail(e.target.value); setError(""); }}
                placeholder="admin@pureledger.com"
                className="inp mt-1"
                required
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-[#5B6B68] uppercase">New Secure Password</label>
              <input
                type="password"
                value={resetPassword}
                onChange={(e) => setResetPassword(e.target.value)}
                placeholder="Set new password (min 6 chars)"
                className="inp mt-1"
                required
              />
            </div>

            {error && <p className="text-xs font-semibold text-[#C4472F]">{error}</p>}

            <button type="submit" className="btn-primary w-full py-2.5 mt-2">
              Authenticate Email & Reset Password
            </button>

            <button
              type="button"
              onClick={() => { setView("login"); setError(""); }}
              className="w-full text-center text-xs text-gray-500 hover:underline mt-2"
            >
              Back to Login
            </button>
          </form>
        )}

        <p className="text-center text-[11px] font-mono text-[#5B6B68] mt-4">PWA ACTIVE · SUPABASE SYNC ENABLED</p>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/*  BUSINESS DETAILS ONBOARDING / SETUP MODAL                              */
/* ---------------------------------------------------------------------- */
function BusinessDetailsModal({ initialDetails, onSave, onSkip }) {
  const [name, setName] = useState(initialDetails?.name || "");
  const [address, setAddress] = useState(initialDetails?.address || "");
  const [phone, setPhone] = useState(initialDetails?.phone || "");
  const [tin, setTin] = useState(initialDetails?.tin || "");

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({ name, address, phone, tin });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl relative space-y-4">
        <div className="flex items-center gap-2 border-b pb-3">
          <Building className="text-[#0B3B45]" size={22} />
          <div>
            <h3 className="font-bold text-[#0B3B45] text-base">Register Business Details</h3>
            <p className="text-xs text-gray-500">Provide company information for invoices and receipts.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-gray-500">Business / Company Name *</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Ghana Pure Water Ltd" className="inp mt-1" required />
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500">Business Phone Number</label>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="e.g. +233 24 123 4567" className="inp mt-1" />
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500">Business Address / Location</label>
            <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="e.g. Plot 12 Industrial Area, Accra" className="inp mt-1" />
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500">Tax Identification Number (TIN / GRA)</label>
            <input value={tin} onChange={(e) => setTin(e.target.value)} placeholder="e.g. C0001234567" className="inp mt-1" />
          </div>

          <div className="pt-2 flex flex-col gap-2">
            <button type="submit" className="btn-primary w-full py-2.5">
              Save Business Details
            </button>
            <button type="button" onClick={onSkip} className="text-xs text-gray-500 hover:underline text-center">
              Register Business Details Later
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/*  NAVIGATION / SIDEBAR & TOPBAR                                           */
/* ---------------------------------------------------------------------- */
function Sidebar({ page, setPage, role, onLogout, open, onClose, darkMode }) {
  const items = [
    { id: "dashboard", label: "Dashboard", icon: Factory, roles: ["owner", "manager"] },
    { id: "warehouse", label: "Warehouse & Rolls", icon: Warehouse, roles: ["owner", "manager"] },
    { id: "packing", label: "Packing Bags", icon: PackageOpen, roles: ["owner", "manager"] },
    { id: "production", label: "Production", icon: Droplets, roles: ["owner", "manager"] },
    { id: "sales", label: "Sales & Cash", icon: Wallet, roles: ["owner", "manager", "cashier"] },
    { id: "reports", label: "Reports & Drivers", icon: FileBarChart, roles: ["owner", "manager", "driver"] },
    { id: "admin", label: "Admin & Users", icon: KeyRound, roles: ["owner"] },
    { id: "audit", label: "Audit Trail", icon: ShieldCheck, roles: ["owner"] },
  ];
  return (
    <>
      {open && <div className="fixed inset-0 z-30 sm:hidden bg-black/50" onClick={onClose} />}
      <aside className={`pw-sidebar fixed sm:static inset-y-0 left-0 z-40 flex flex-col w-64 sm:w-60 shrink-0 min-h-screen px-3 py-4 transition-transform ${open ? "translate-x-0" : "-translate-x-full sm:translate-x-0"}`}>
        <div className="flex items-center justify-between px-2 mb-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#1C8C9E] flex items-center justify-center">
              <Droplets size={16} className="text-[#0B3B45]" />
            </div>
            <p className="font-display font-800 text-[15px] text-[#F2F4EF]">Mattbees Water Services</p>
          </div>
          <button onClick={onClose} className="sm:hidden p-1 text-[#B9CFCE]"><X size={18} /></button>
        </div>
        <nav className="flex-1 space-y-1">
          {items.filter((i) => i.roles.includes(role)).map((i) => {
            const Icon = i.icon;
            const active = page === i.id;
            return (
              <button key={i.id} onClick={() => setPage(i.id)} className={`pw-nav-item w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition ${active ? "pw-nav-item-active" : ""}`}>
                <Icon size={16} />
                <span className="flex-1 text-left">{i.label}</span>
              </button>
            );
          })}
        </nav>
        <button onClick={onLogout} className="pw-nav-item flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm text-[#B9CFCE] hover:text-white">
          <LogOut size={16} /> Sign out
        </button>
      </aside>
    </>
  );
}

function TopBar({ session, online, onMenuClick, onLogout, data, mutate, darkMode, setDarkMode }) {
  const Icon = DEFAULT_ROLES[session.role]?.icon || ShieldCheck;
  const [notifOpen, setNotifOpen] = useState(false);
  const notifications = data.notifications || [];
  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleOpenNotifications = () => {
    if (!notifOpen && unreadCount > 0) {
      mutate((prev) => ({
        ...prev,
        notifications: (prev.notifications || []).map((n) => ({ ...n, read: true })),
      }), "Read Notifications", "Marked all system notifications as read");
    }
    setNotifOpen(!notifOpen);
  };

  return (
    <div className={`sticky top-0 z-20 ${darkMode ? "bg-gray-800 border-gray-700" : "bg-[#F2F4EF] border-[#DDE3DA]"} border-b px-4 sm:px-6 py-3 flex items-center justify-between`}>
      <div className="flex items-center gap-2.5">
        <button onClick={onMenuClick} className={`sm:hidden w-8 h-8 rounded-lg border ${darkMode ? "border-gray-700 bg-gray-800 text-gray-200" : "border-[#DDE3DA] bg-white text-[#0B3B45]"} flex items-center justify-center`}>
          <Menu size={16} />
        </button>
        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono font-semibold ${online ? "bg-[#DCEEE4] text-[#2A6E4A]" : "bg-[#F5E3D9] text-[#A85A2A]"}`}>
          {online ? <Wifi size={12} /> : <WifiOff size={12} />}
          <span>{online ? "ONLINE SYNCED" : "OFFLINE READY"}</span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button 
          onClick={() => setDarkMode(!darkMode)} 
          className={`w-8 h-8 rounded-lg border ${darkMode ? "border-gray-700 bg-gray-800 text-yellow-400" : "border-[#DDE3DA] bg-white text-gray-600"} flex items-center justify-center transition`}
          title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
        >
          {darkMode ? <Sun size={15} /> : <Moon size={15} />}
        </button>

        <div className="text-right hidden sm:block">
          <p className="text-sm font-semibold">{session.name}</p>
          <p className="text-[11px] text-[#5B6B68]">{DEFAULT_ROLES[session.role]?.label || session.role}</p>
        </div>
        <div className="w-8 h-8 rounded-full bg-[#0B3B45] flex items-center justify-center text-white">
          <Icon size={14} />
        </div>
        <div className="relative">
          <button onClick={handleOpenNotifications} className={`relative w-8 h-8 rounded-lg border ${darkMode ? "border-gray-700 bg-gray-800 text-gray-200" : "border-[#DDE3DA] bg-white text-[#0B3B45]"} flex items-center justify-center`}>
            <Bell size={15} />
            {unreadCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 rounded-full text-[10px] font-bold bg-[#C4472F] text-white flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>
          {notifOpen && (
            <div className={`absolute right-0 mt-2 w-80 ${darkMode ? "bg-gray-800 border-gray-700" : "bg-white border-[#DDE3DA]"} rounded-xl border shadow-xl z-50 p-3`}>
              <div className="flex items-center justify-between pb-2 border-b border-gray-200 dark:border-gray-700">
                <p className="font-bold text-xs text-[#0B3B45]">System Notifications</p>
                <button onClick={() => mutate((prev) => ({ ...prev, notifications: [] }), "Cleared Notifications", "")} className="text-[10px] text-[#C4472F]">Clear All</button>
              </div>
              <div className="max-h-60 overflow-y-auto space-y-2 mt-2">
                {notifications.length === 0 ? <p className="text-xs text-gray-400 text-center py-4">No notifications</p> : (
                  notifications.map((n) => (
                    <div key={n.id} className={`p-2 ${darkMode ? "bg-gray-700 border-gray-600" : "bg-[#F7F8F5] border-[#EDEFEA]"} rounded text-xs border relative`}>
                      <div className="flex justify-between items-center">
                        <p className="font-semibold text-[#0B3B45]">{n.title}</p>
                        <span className="text-[9px] text-green-700 font-bold bg-green-100 px-1.5 py-0.5 rounded">Read</span>
                      </div>
                      <p className="text-gray-600 dark:text-gray-300 mt-1">{n.msg}</p>
                      <span className="text-[9px] text-gray-400 font-mono mt-1 block">{n.ts}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
        <button onClick={onLogout} className={`w-8 h-8 rounded-lg border ${darkMode ? "border-gray-700 bg-gray-800" : "border-[#DDE3DA] bg-white"} flex items-center justify-center text-[#C4472F]`}>
          <LogOut size={15} />
        </button>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/*  BUSINESS LOGIC COMPUTATION HELPERS                                      */
/* ---------------------------------------------------------------------- */
function computeFinishedGoods(data) {
  const produced = (data.productionRuns || []).reduce((s, r) => s + (r.netAvailableBags || 0), 0);
  const sold = (data.sales || []).reduce((s, r) => s + (r.bagsSold || 0), 0);
  const freeGiveaway = (data.sales || []).reduce((s, r) => s + (r.freeBags || 0), 0);
  return {
    totalProduced: produced,
    totalSold: sold,
    totalFree: freeGiveaway,
    availableForSale: Math.max(0, produced - sold - freeGiveaway),
  };
}

function computeManagerAcceptedRolls(data) {
  const acceptedRolls = (data.issuance || []).filter((i) => i.status === "ACCEPTED").reduce((s, i) => s + (i.physicalCount || i.qty || 0), 0);
  const usedRolls = (data.productionRuns || []).reduce((s, p) => s + (p.rollsUsed || 0), 0);
  return Math.max(0, acceptedRolls - usedRolls);
}

function computeManagerAcceptedBags(data) {
  const accepted = (data.bagIssuance || []).filter((i) => i.status === "ACCEPTED").reduce((s, i) => s + (i.qty || 0), 0);
  const used = (data.bagUsage || []).reduce((s, u) => s + (u.qty || 0), 0);
  return Math.max(0, accepted - used);
}

function computeCashBalance(data) {
  const cashSales = (data.sales || []).filter((s) => s.method === "cash").reduce((s, r) => s + (r.amountPaid || 0), 0);
  const debtCash = (data.debtPayments || []).filter((p) => p.method === "cash").reduce((s, r) => s + (r.amount || 0), 0);
  const managerExpenses = (data.expenses || []).reduce((s, e) => s + (e.amount || 0), 0);
  const adminExpenses = (data.adminExpenses || []).reduce((s, e) => s + (e.amount || 0), 0);
  const deposits = (data.bankDeposits || []).reduce((s, d) => s + (d.amount || 0), 0);
  return cashSales + debtCash - managerExpenses - adminExpenses - deposits;
}

/* ---------------------------------------------------------------------- */
/*  ADMIN MANAGEMENT & ROLE CREATION MODULE                               */
/* ---------------------------------------------------------------------- */
function AdminManagementModule({ data, mutate, showToast, darkMode }) {
  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserRole, setNewUserRole] = useState("manager");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [customRoleLabel, setCustomRoleLabel] = useState("");
  
  const [newCategoryName, setNewCategoryName] = useState("");

  const handleAddUser = (e) => {
    e.preventDefault();
    if (!newUserName.trim() || !newUserPassword) {
      return showToast("Name and Password are required!", "warn");
    }
    if (newUserPassword.length < 6) {
      return showToast("Password must be at least 6 characters!", "warn");
    }

    const newUser = {
      id: uid(),
      name: newUserName.trim(),
      role: newUserRole,
      password: newUserPassword,
      email: newUserEmail.trim().toLowerCase(),
    };

    mutate((prev) => ({
      ...prev,
      users: [...(prev.users || []), newUser],
    }), "Added User", `Added ${newUserName} as ${newUserRole}`);

    setNewUserName(""); setNewUserEmail(""); setNewUserPassword("");
    showToast("User Account Created Successfully!");
  };

  const handleAddExpenseCategory = (e) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;

    if ((data.expenseCategories || []).includes(newCategoryName.trim())) {
      return showToast("Category already exists!", "warn");
    }

    mutate((prev) => ({
      ...prev,
      expenseCategories: [...(prev.expenseCategories || []), newCategoryName.trim()],
    }), "Added Expense Category", newCategoryName.trim());

    setNewCategoryName("");
    showToast("Expense Category Added!");
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="font-display font-800 text-2xl text-[#0B3B45]">Admin & User Management</p>
        <p className="text-sm text-[#5B6B68]">Add system users, assign roles manually, and configure expense categories.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white p-5 rounded-2xl border border-[#DDE3DA] space-y-4">
          <p className="font-bold text-[#0B3B45] text-base">Add New User / Manual Role Assignment</p>
          <form onSubmit={handleAddUser} className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-gray-500">Full Name *</label>
              <input value={newUserName} onChange={(e) => setNewUserName(e.target.value)} placeholder="e.g. John Doe" className="inp mt-1" required />
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-500">Email Address (Optional)</label>
              <input type="email" value={newUserEmail} onChange={(e) => setNewUserEmail(e.target.value)} placeholder="john@pureledger.com" className="inp mt-1" />
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-500">Assign System Role *</label>
              <select value={newUserRole} onChange={(e) => setNewUserRole(e.target.value)} className="inp mt-1">
                <option value="owner">Business Owner (Super Admin)</option>
                <option value="manager">Manager</option>
                <option value="cashier">Cashier</option>
                <option value="driver">Delivery Driver</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-500">Password (min 6 characters) *</label>
              <input type="password" value={newUserPassword} onChange={(e) => setNewUserPassword(e.target.value)} placeholder="••••••••" className="inp mt-1" required />
            </div>

            <button type="submit" className="btn-primary w-full py-2.5">
              <Plus size={16} /> Create User Account
            </button>
          </form>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#DDE3DA] space-y-4">
          <p className="font-bold text-[#0B3B45] text-base">Expense Categories Management</p>
          <form onSubmit={handleAddExpenseCategory} className="flex gap-2">
            <input value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} placeholder="e.g. Electricity & Water" className="inp" required />
            <button type="submit" className="btn-primary shrink-0 py-2">Add Category</button>
          </form>

          <div className="mt-3 space-y-1.5 max-h-56 overflow-y-auto">
            {(data.expenseCategories || []).map((cat, idx) => (
              <div key={idx} className="flex justify-between items-center p-2 bg-[#F7F8F5] dark:bg-gray-700 rounded text-xs">
                <span className="font-semibold text-gray-700 dark:text-gray-200">{cat}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white p-5 rounded-2xl border border-[#DDE3DA] overflow-x-auto">
        <p className="font-bold text-[#0B3B45] mb-3 text-base">Registered System Users</p>
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-[#F7F8F5] text-left">
              <th className="p-2">Name</th>
              <th className="p-2">Email</th>
              <th className="p-2">Assigned Role</th>
              <th className="p-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {(data.users || []).map((u) => (
              <tr key={u.id} className="border-t">
                <td className="p-2 font-bold text-[#0B3B45]">{u.name}</td>
                <td className="p-2 font-mono text-gray-500">{u.email || "N/A"}</td>
                <td className="p-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-100 text-blue-800">
                    {DEFAULT_ROLES[u.role]?.label || u.role}
                  </span>
                </td>
                <td className="p-2 text-right">
                  {u.id !== "u1" && (
                    <button 
                      onClick={() => {
                        if (window.confirm(`Delete user ${u.name}?`)) {
                          mutate((prev) => ({ ...prev, users: (prev.users || []).filter((x) => x.id !== u.id) }), "Deleted User", u.name);
                          showToast("User removed!");
                        }
                      }} 
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/*  AUDIT LOG COMPONENT                                                   */
/* ---------------------------------------------------------------------- */
function AuditLog({ data, mutate, showToast, darkMode }) {
  const logs = data.auditLog || [];

  const handleResetAuditLog = () => {
    if (window.confirm("Are you sure you want to reset and clear the entire Audit Log?")) {
      mutate((prev) => ({
        ...prev,
        auditLog: [],
      }), "Reset Audit Log", "Cleared all system audit log entries");
      showToast("Audit log cleared successfully!");
    }
  };

  const handlePrintAuditLog = () => {
    window.print();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <p className="font-display font-800 text-2xl text-[#0B3B45]">System Audit Trail</p>
          <p className="text-sm text-[#5B6B68]">Track all operational actions, data updates, and security events.</p>
        </div>

        <div className="flex gap-2 no-print">
          <button onClick={handlePrintAuditLog} className="btn-primary py-1.5 px-3 text-xs bg-[#1C8C9E]">
            <Printer size={14} /> Print Audit Log
          </button>
          <button onClick={handleResetAuditLog} className="btn-primary py-1.5 px-3 text-xs bg-[#C4472F] hover:bg-red-800">
            <RotateCcw size={14} /> Reset Audit Log
          </button>
        </div>
      </div>

      <div id="printable-area" className="bg-white p-5 rounded-2xl border border-[#DDE3DA] overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-[#F7F8F5] text-left">
              <th className="p-2">Timestamp</th>
              <th className="p-2">User</th>
              <th className="p-2">Role</th>
              <th className="p-2">Action</th>
              <th className="p-2">Details</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 ? (
              <tr>
                <td colSpan="5" className="p-4 text-center text-gray-400">No audit logs recorded yet.</td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id} className="border-t">
                  <td className="p-2 font-mono text-gray-500">{new Date(log.ts).toLocaleString()}</td>
                  <td className="p-2 font-semibold text-[#0B3B45]">{log.user}</td>
                  <td className="p-2 uppercase text-[10px] font-mono">{log.role}</td>
                  <td className="p-2 font-bold text-blue-900">{log.action}</td>
                  <td className="p-2 text-gray-600 dark:text-gray-300">{log.detail}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/*  DASHBOARD MODULE                                                        */
/* ---------------------------------------------------------------------- */
function Dashboard({ data, mutate, session, showToast, darkMode }) {
  const isOwner = session.role === "owner";
  const finished = useMemo(() => computeFinishedGoods(data), [data]);
  const managerRollsCount = useMemo(() => computeManagerAcceptedRolls(data), [data]);
  const managerBagsQty = useMemo(() => computeManagerAcceptedBags(data), [data]);
  const cashOnHand = useMemo(() => computeCashBalance(data), [data]);

  const managersList = useMemo(() => (data.users || []).filter((u) => u.role === "manager"), [data.users]);
  const categories = data.expenseCategories || ["Raw Material", "Utilities", "Maintenance", "Transport & Fuel", "Salaries & Wages", "Tax & GRA", "General Admin", "Miscellaneous"];

  const [expenseDesc, setExpenseDesc] = useState("");
  const [expenseCategory, setExpenseCategory] = useState(categories[0] || "General Admin");
  const [expenseAmt, setExpenseAmt] = useState("");

  const [adminExpenseDesc, setAdminExpenseDesc] = useState("");
  const [adminExpenseCategory, setAdminExpenseCategory] = useState(categories[0] || "General Admin");
  const [adminExpenseAmt, setAdminExpenseAmt] = useState("");

  const handleLogExpense = (e) => {
    e.preventDefault();
    if (Number(expenseAmt) <= 0) return showToast("Enter a positive expense amount!", "warn");

    mutate((prev) => ({
      ...prev,
      expenses: [
        {
          id: uid(),
          date: todayISO(),
          category: expenseCategory,
          description: expenseDesc,
          amount: Number(expenseAmt),
          recordedBy: session.name,
        },
        ...(prev.expenses || []),
      ],
    }), "Logged Expense", `GH₵ ${expenseAmt} for ${expenseDesc} (${expenseCategory})`);

    setExpenseDesc(""); setExpenseAmt("");
    showToast("Manager Expense Recorded!");
  };

  const handleLogAdminExpense = (e) => {
    e.preventDefault();
    if (Number(adminExpenseAmt) <= 0) return showToast("Enter a positive expense amount!", "warn");

    mutate((prev) => ({
      ...prev,
      adminExpenses: [
        {
          id: uid(),
          date: todayISO(),
          category: adminExpenseCategory,
          description: adminExpenseDesc,
          amount: Number(adminExpenseAmt),
          recordedBy: session.name,
        },
        ...(prev.adminExpenses || []),
      ],
    }), "Logged Admin Expense", `GH₵ ${adminExpenseAmt} for ${adminExpenseDesc} (${adminExpenseCategory})`);

    setAdminExpenseDesc(""); setAdminExpenseAmt("");
    showToast("Admin Expense Recorded & Balanced!");
  };

  const allTimeRollIntakePcs = useMemo(() => (data.intake || []).reduce((s, i) => s + (i.qty || 0), 0), [data.intake]);
  const allTimeRollIssuancePcs = useMemo(() => (data.issuance || []).reduce((s, i) => s + (i.qty || 0), 0), [data.issuance]);
  const ownerRollBalancePcs = Math.max(0, allTimeRollIntakePcs - allTimeRollIssuancePcs);

  const allTimeRollIntakeKg = useMemo(() => (data.intake || []).reduce((s, i) => s + (i.weightKg || 0), 0), [data.intake]);
  const allTimeRollIssuanceKg = useMemo(() => (data.issuance || []).reduce((s, i) => s + (i.weightKg || 0), 0), [data.issuance]);
  const ownerRollBalanceKg = Math.max(0, allTimeRollIntakeKg - allTimeRollIssuanceKg);

  const allTimeBagIntakeQty = useMemo(() => (data.bagIntake || []).reduce((s, i) => s + (i.qty || 0), 0), [data.bagIntake]);
  const allTimeBagIssuanceQty = useMemo(() => (data.bagIssuance || []).reduce((s, i) => s + (i.qty || 0), 0), [data.bagIssuance]);
  const ownerBagBalanceQty = Math.max(0, allTimeBagIntakeQty - allTimeBagIssuanceQty);

  const totalManagerExpensesGHS = useMemo(() => (data.expenses || []).reduce((s, e) => s + (e.amount || 0), 0), [data.expenses]);
  const totalAdminExpensesGHS = useMemo(() => (data.adminExpenses || []).reduce((s, e) => s + (e.amount || 0), 0), [data.adminExpenses]);
  const totalAllExpensesGHS = totalManagerExpensesGHS + totalAdminExpensesGHS;

  const expensesByCategory = useMemo(() => {
    const combined = [
      ...(data.expenses || []),
      ...(data.adminExpenses || []),
    ];
    const grouped = {};
    combined.forEach((e) => {
      const cat = e.category || "General Admin";
      grouped[cat] = (grouped[cat] || 0) + (e.amount || 0);
    });
    return grouped;
  }, [data.expenses, data.adminExpenses]);

  const managerMetrics = useMemo(() => {
    return managersList.map((mgr) => {
      const runs = (data.productionRuns || []).filter((r) => r.recordedBy === mgr.name);
      const rollsCountUsed = runs.reduce((s, r) => s + (r.rollsUsed || 0), 0);
      const rollKgUsed = runs.reduce((s, r) => s + (r.weightUsedKg || 0), 0);

      const bagUsages = (data.bagUsage || []).filter((u) => u.usedBy === mgr.name);
      const bagsUsedQty = bagUsages.reduce((s, u) => s + (u.qty || 0), 0);

      const factorySales = (data.sales || []).filter((s) => s.recordedBy === mgr.name);
      const factorySalesBags = factorySales.reduce((s, f) => s + f.bagsSold, 0);
      const factorySalesGHS = factorySales.reduce((s, f) => s + f.totalAmount, 0);

      const mgrExpenses = (data.expenses || []).filter((e) => e.recordedBy === mgr.name);
      const totalExpensesGHS = mgrExpenses.reduce((s, e) => s + e.amount, 0);

      return {
        managerName: mgr.name,
        rollsCountUsed,
        rollKgUsed,
        bagsUsedQty,
        factorySalesBags,
        factorySalesGHS,
        totalExpensesGHS,
      };
    });
  }, [managersList, data.productionRuns, data.bagUsage, data.sales, data.expenses]);

  return (
    <div className="space-y-6">
      <div>
        <p className="font-display font-800 text-2xl text-[#0B3B45]">Welcome back, {session.name}</p>
        <p className="text-sm text-[#5B6B68]">Sachet Water Operational Overview · {isOwner ? "Super Admin Dashboard" : "Manager Dashboard"}</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={Droplets} label="Sachet Bags Produce (Available)" value={`${fmt(finished.availableForSale, 0)} bags`} accent="#2A6E4A" />
        <StatCard icon={Warehouse} label="Manager Floor Rolls" value={`${fmt(managerRollsCount, 0)} rolls`} accent="#1C8C9E" />
        <StatCard icon={PackageOpen} label="Manager Packing Bags" value={`${fmt(managerBagsQty, 0)} pcs`} accent="#E8A23D" />
        <StatCard icon={Wallet} label="Cash On Hand Balance" value={fmtGHS(cashOnHand)} accent={cashOnHand < 0 ? "#C4472F" : "#0B3B45"} />
      </div>

      {isOwner ? (
        <div className="space-y-6">
          <div className="grid lg:grid-cols-3 gap-4">
            <div className="lg:col-span-1 bg-white p-5 rounded-2xl border border-[#DDE3DA] space-y-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="text-[#0B3B45]" size={20} />
                <p className="font-bold text-[#0B3B45]">Log Admin Expense</p>
              </div>
              <form onSubmit={handleLogAdminExpense} className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-gray-500">Expense Category</label>
                  <select value={adminExpenseCategory} onChange={(e) => setAdminExpenseCategory(e.target.value)} className="inp">
                    {categories.map((c, i) => (
                      <option key={i} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500">Expense Description</label>
                  <input value={adminExpenseDesc} onChange={(e) => setAdminExpenseDesc(e.target.value)} placeholder="e.g. Executive travel / GRA Tax" className="inp" required />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500">Amount (GH₵)</label>
                  <input type="number" min="0.01" step="0.01" value={adminExpenseAmt} onChange={(e) => setAdminExpenseAmt(e.target.value)} placeholder="e.g. 500" className="inp" required />
                </div>
                <button type="submit" className="btn-primary w-full">Record Admin Expense</button>
              </form>
            </div>

            <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-[#DDE3DA] space-y-3">
              <p className="font-bold text-[#0B3B45] text-base">Grouped Expenses by Category</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {Object.entries(expensesByCategory).map(([cat, amount], idx) => (
                  <div key={idx} className="p-2.5 bg-[#F7F8F5] dark:bg-gray-700 rounded-xl border border-[#EDEFEA] dark:border-gray-600">
                    <p className="text-[10px] font-bold text-gray-500 dark:text-gray-300 uppercase truncate">{cat}</p>
                    <p className="text-sm font-mono font-bold text-[#0B3B45] mt-0.5">{fmtGHS(amount)}</p>
                  </div>
                ))}
              </div>

              <div className="pt-2 border-t flex justify-between items-center text-xs font-bold">
                <span>Total Expenses (Manager + Admin):</span>
                <span className="text-red-600 font-mono text-sm">{fmtGHS(totalAllExpensesGHS)}</span>
              </div>

              <div className="overflow-x-auto max-h-36 mt-2">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-[#F7F8F5] text-left">
                      <th className="p-2">Date</th>
                      <th className="p-2">Category</th>
                      <th className="p-2">Type</th>
                      <th className="p-2">Description</th>
                      <th className="p-2 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ...(data.adminExpenses || []).map((e) => ({ ...e, type: "Admin" })),
                      ...(data.expenses || []).map((e) => ({ ...e, type: "Manager" })),
                    ].sort((a, b) => new Date(b.date) - new Date(a.date)).map((e) => (
                      <tr key={e.id} className="border-t">
                        <td className="p-2 font-mono">{e.date}</td>
                        <td className="p-2 font-semibold">{e.category || "General Admin"}</td>
                        <td className="p-2">
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${e.type === "Admin" ? "bg-cyan-100 text-cyan-800" : "bg-gray-100 text-gray-800"}`}>
                            {e.type}
                          </span>
                        </td>
                        <td className="p-2">{e.description}</td>
                        <td className="p-2 text-right font-mono font-bold text-red-700">{fmtGHS(e.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-[#DDE3DA] space-y-3">
            <p className="font-bold text-[#0B3B45] text-base">All-Time Intake Automation, Issuance & Warehouse Balances</p>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="p-4 bg-[#F7F8F5] rounded-xl border space-y-2">
                <p className="font-bold text-xs text-[#0B3B45] uppercase">Film Rolls Inventory Ledger</p>
                <div className="flex justify-between text-xs"><span>All-time Intake (Roll Count):</span><span className="font-mono font-bold">{fmt(allTimeRollIntakePcs, 0)} rolls</span></div>
                <div className="flex justify-between text-xs text-blue-800"><span>Issued to Manager (Roll Count):</span><span className="font-mono font-bold">{fmt(allTimeRollIssuancePcs, 0)} rolls</span></div>
                <div className="flex justify-between text-xs text-green-800 pt-1 border-t font-bold"><span>Owner Warehouse Roll Count Balance:</span><span className="font-mono">{fmt(ownerRollBalancePcs, 0)} rolls</span></div>
                <div className="flex justify-between text-xs text-gray-500 pt-1 border-t"><span>All-time Intake Weight:</span><span className="font-mono">{fmt(allTimeRollIntakeKg)} kg</span></div>
                <div className="flex justify-between text-xs text-gray-500"><span>Issued Weight to Manager:</span><span className="font-mono">{fmt(allTimeRollIssuanceKg)} kg</span></div>
                <div className="flex justify-between text-xs text-gray-700 font-semibold"><span>Owner Warehouse Weight Balance:</span><span className="font-mono">{fmt(ownerRollBalanceKg)} kg</span></div>
              </div>

              <div className="p-4 bg-[#F7F8F5] rounded-xl border space-y-2">
                <p className="font-bold text-xs text-[#0B3B45] uppercase">Packing Bags Inventory Ledger</p>
                <div className="flex justify-between text-xs"><span>All-time Intake (Owner):</span><span className="font-mono font-bold">{fmt(allTimeBagIntakeQty, 0)} pcs</span></div>
                <div className="flex justify-between text-xs text-blue-800"><span>Issued to Manager:</span><span className="font-mono font-bold">{fmt(allTimeBagIssuanceQty, 0)} pcs</span></div>
                <div className="flex justify-between text-xs text-green-800 pt-1 border-t font-bold"><span>Owner Warehouse Balance:</span><span className="font-mono">{fmt(ownerBagBalanceQty, 0)} pcs</span></div>
              </div>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-[#DDE3DA] space-y-3">
            <p className="font-bold text-[#0B3B45] text-base">Manager Operational Metrics & Factory Direct Sales</p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-[#F7F8F5] text-left">
                    <th className="p-2">Manager Name</th>
                    <th className="p-2 text-right">Rolls Used (pcs)</th>
                    <th className="p-2 text-right">Rolls Used (kg)</th>
                    <th className="p-2 text-right">Packing Bags Used (pcs)</th>
                    <th className="p-2 text-right">Factory Direct Sales (Bags)</th>
                    <th className="p-2 text-right">Factory Sales Revenue</th>
                    <th className="p-2 text-right">Logged Expenses</th>
                  </tr>
                </thead>
                <tbody>
                  {managerMetrics.map((m, idx) => (
                    <tr key={idx} className="border-t">
                      <td className="p-2 font-bold text-[#0B3B45]">{m.managerName}</td>
                      <td className="p-2 text-right font-mono font-bold">{m.rollsCountUsed} rolls</td>
                      <td className="p-2 text-right font-mono">{m.rollKgUsed} kg</td>
                      <td className="p-2 text-right font-mono">{m.bagsUsedQty} pcs</td>
                      <td className="p-2 text-right font-mono font-bold text-blue-900">{m.factorySalesBags} bags</td>
                      <td className="p-2 text-right font-mono font-bold text-green-800">{fmtGHS(m.factorySalesGHS)}</td>
                      <td className="p-2 text-right font-mono font-bold text-red-700">{fmtGHS(m.totalExpensesGHS)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <form onSubmit={handleLogExpense} className="bg-white p-5 rounded-2xl border border-[#DDE3DA] space-y-3 max-w-lg">
            <div className="flex items-center gap-2">
              <DollarSign className="text-[#0B3B45]" size={18} />
              <p className="font-bold text-[#0B3B45]">Record Operational Expense (Manager Entry)</p>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500">Expense Category</label>
              <select value={expenseCategory} onChange={(e) => setExpenseCategory(e.target.value)} className="inp">
                {categories.map((c, i) => (
                  <option key={i} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500">Expense Description</label>
              <input value={expenseDesc} onChange={(e) => setExpenseDesc(e.target.value)} placeholder="e.g. Factory fuel / generator maintenance" className="inp" required />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500">Amount (GH₵)</label>
              <input type="number" min="0.01" step="0.01" value={expenseAmt} onChange={(e) => setExpenseAmt(e.target.value)} placeholder="e.g. 150" className="inp" required />
            </div>
            <button type="submit" className="btn-primary w-full">Log Expense to Admin</button>
          </form>

          <div className="bg-[#EAF3F1] dark:bg-gray-800 p-4 rounded-xl border border-[#BFDCD6] dark:border-gray-700">
            <p className="font-bold text-sm text-[#0B3B45]">Notice to Manager:</p>
            <p className="text-xs text-[#5B6B68] mt-1">Raw material intake is controlled by the Owner. Rolls and Packing Bags issued to you require explicit physical count acceptance before being available for production.</p>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, accent }) {
  return (
    <div className="bg-white rounded-2xl border border-[#DDE3DA] p-4">
      <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-3" style={{ background: `${accent}1A` }}>
        <Icon size={16} style={{ color: accent }} />
      </div>
      <p className="font-mono font-semibold text-xl text-[#16211F] leading-none">{value}</p>
      <p className="text-xs text-[#5B6B68] mt-1.5">{label}</p>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/*  WAREHOUSE & ROLLS MODULE                                               */
/* ---------------------------------------------------------------------- */
function WarehouseModule({ data, mutate, session, showToast, darkMode }) {
  const isOwner = session.role === "owner";
  const [tab, setTab] = useState(isOwner ? "intake" : "accept");

  return (
    <div className="space-y-5">
      <div>
        <p className="font-display font-800 text-2xl text-[#0B3B45]">Warehouse & Film Rolls</p>
        <p className="text-sm text-[#5B6B68]">Manage raw rolls intake, transfers, and manager roll acceptance in number of rolls.</p>
      </div>

      <div className="flex gap-1 bg-white rounded-xl border border-[#DDE3DA] p-1 w-fit overflow-x-auto">
        {isOwner && <button onClick={() => setTab("intake")} className={`px-3 py-1.5 rounded-lg text-sm ${tab === "intake" ? "bg-[#0B3B45] text-white font-bold" : "text-gray-600"}`}>Owner Roll Intake</button>}
        {isOwner && <button onClick={() => setTab("issue")} className={`px-3 py-1.5 rounded-lg text-sm ${tab === "issue" ? "bg-[#0B3B45] text-white font-bold" : "text-gray-600"}`}>Issue Rolls to Manager</button>}
        <button onClick={() => setTab("accept")} className={`px-3 py-1.5 rounded-lg text-sm ${tab === "accept" ? "bg-[#0B3B45] text-white font-bold" : "text-gray-600"}`}>Manager Roll Acceptance</button>
      </div>

      {tab === "intake" && isOwner && <OwnerRollIntakeTab data={data} mutate={mutate} showToast={showToast} />}
      {tab === "issue" && isOwner && <IssueRollsTab data={data} mutate={mutate} session={session} showToast={showToast} />}
      {tab === "accept" && <ManagerRollAcceptanceTab data={data} mutate={mutate} session={session} showToast={showToast} />}
    </div>
  );
}

function OwnerRollIntakeTab({ data, mutate, showToast }) {
  const [selectedTypeId, setSelectedTypeId] = useState("new");
  const [rollTypeName, setRollTypeName] = useState("");
  const [kgPerRoll, setKgPerRoll] = useState("");
  const [supplier, setSupplier] = useState("");
  const [qty, setQty] = useState("");

  const handleCreateTypeAndIntake = (e) => {
    e.preventDefault();
    if (Number(qty) <= 0) return showToast("Quantity must be positive!", "warn");

    let typeId = selectedTypeId;
    let typeName = rollTypeName;
    let weightPerRoll = Number(kgPerRoll);

    if (selectedTypeId === "new") {
      if (!rollTypeName.trim() || weightPerRoll <= 0) {
        return showToast("Provide a valid Roll Type Name and Weight per roll!", "warn");
      }
      const existing = (data.rollTypes || []).find(
        (t) => t.name.trim().toLowerCase() === rollTypeName.trim().toLowerCase()
      );
      if (existing) {
        typeId = existing.id;
        typeName = existing.name;
        weightPerRoll = existing.standardWeightKg;
      } else {
        typeId = uid();
      }
    } else {
      const existing = (data.rollTypes || []).find((t) => t.id === selectedTypeId);
      if (existing) {
        typeName = existing.name;
        weightPerRoll = existing.standardWeightKg;
      }
    }

    mutate((prev) => {
      const rollTypeExists = (prev.rollTypes || []).some((t) => t.id === typeId);
      const nextRollTypes = rollTypeExists
        ? prev.rollTypes
        : [...(prev.rollTypes || []), { id: typeId, name: typeName.trim(), standardWeightKg: weightPerRoll, yieldValue: 900 }];

      return {
        ...prev,
        rollTypes: nextRollTypes,
        intake: [
          { id: uid(), date: todayISO(), rollTypeId: typeId, supplier, qty: Number(qty), weightKg: Number(qty) * weightPerRoll },
          ...(prev.intake || []),
        ],
      };
    }, "Recorded Roll Intake", `${qty} rolls of ${typeName}`);

    setRollTypeName(""); setKgPerRoll(""); setSupplier(""); setQty(""); setSelectedTypeId("new");
    showToast("Roll Intake Recorded!");
  };

  return (
    <div className="grid lg:grid-cols-2 gap-4">
      <form onSubmit={handleCreateTypeAndIntake} className="bg-white p-5 rounded-2xl border border-[#DDE3DA] space-y-3">
        <p className="font-bold text-[#0B3B45]">Owner Raw Roll Intake</p>

        <div>
          <label className="text-xs font-semibold text-gray-500">Roll Category</label>
          <select
            value={selectedTypeId}
            onChange={(e) => {
              setSelectedTypeId(e.target.value);
              if (e.target.value !== "new") {
                const existing = (data.rollTypes || []).find((t) => t.id === e.target.value);
                if (existing) setKgPerRoll(String(existing.standardWeightKg));
              }
            }}
            className="inp"
          >
            <option value="new">+ Create New Roll Type</option>
            {(data.rollTypes || []).map((t) => (
              <option key={t.id} value={t.id}>{t.name} ({t.standardWeightKg} kg)</option>
            ))}
          </select>
        </div>

        {selectedTypeId === "new" && (
          <div>
            <label className="text-xs font-semibold text-gray-500">New Roll Type Name</label>
            <input value={rollTypeName} onChange={(e) => setRollTypeName(e.target.value)} placeholder="e.g. Standard 25kg Film" className="inp" required={selectedTypeId === "new"} />
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs font-semibold text-gray-500">Weight per Roll (kg)</label>
            <input
              type="number"
              min="0.1"
              step="0.1"
              value={kgPerRoll}
              onChange={(e) => setKgPerRoll(e.target.value)}
              placeholder="25"
              className="inp"
              disabled={selectedTypeId !== "new"}
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500">Quantity Rolls (Roll Count)</label>
            <input type="number" min="1" value={qty} onChange={(e) => setQty(e.target.value)} placeholder="10" className="inp" required />
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-gray-500">Supplier Name (Hidden from Manager)</label>
          <input value={supplier} onChange={(e) => setSupplier(e.target.value)} placeholder="e.g. Polytank Ghana" className="inp" />
        </div>
        <button type="submit" className="btn-primary w-full"><Plus size={15} /> Save Intake</button>
      </form>

      <div className="bg-white p-5 rounded-2xl border border-[#DDE3DA] overflow-x-auto">
        <p className="font-bold text-[#0B3B45] mb-3">Owner Stock Ledger (Includes Suppliers)</p>
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-[#F7F8F5] text-left">
              <th className="p-2">Date</th>
              <th className="p-2">Roll Type</th>
              <th className="p-2">Supplier</th>
              <th className="p-2 text-right">Roll Count</th>
              <th className="p-2 text-right">Weight (kg)</th>
            </tr>
          </thead>
          <tbody>
            {(data.intake || []).map((r) => (
              <tr key={r.id} className="border-t">
                <td className="p-2 font-mono">{r.date}</td>
                <td className="p-2 font-semibold">{(data.rollTypes || []).find((t) => t.id === r.rollTypeId)?.name || "Film"}</td>
                <td className="p-2 text-blue-800 font-semibold">{r.supplier || "N/A"}</td>
                <td className="p-2 text-right font-mono font-bold">{r.qty} rolls</td>
                <td className="p-2 text-right font-mono">{r.weightKg} kg</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function IssueRollsTab({ data, mutate, session, showToast }) {
  const [rollTypeId, setRollTypeId] = useState(data.rollTypes[0]?.id || "");
  const [qty, setQty] = useState("");

  useEffect(() => {
    if ((data.rollTypes || []).length > 0 && !rollTypeId) {
      setRollTypeId(data.rollTypes[0].id);
    }
  }, [data.rollTypes, rollTypeId]);

  const handleIssue = (e) => {
    e.preventDefault();
    if (Number(qty) <= 0) return showToast("Enter a positive quantity!", "warn");

    const rType = (data.rollTypes || []).find((t) => t.id === rollTypeId);
    if (!rType) return showToast("Select a valid roll type", "warn");

    const weightKg = Number(qty) * rType.standardWeightKg;

    mutate((prev) => ({
      ...prev,
      issuance: [
        {
          id: uid(),
          date: todayISO(),
          rollTypeId,
          qty: Number(qty),
          weightKg,
          status: "PENDING",
          issuedBy: session.name,
          confirmedBy: null,
          physicalCount: null,
        },
        ...(prev.issuance || []),
      ],
    }), "Issued Rolls to Manager", `${qty} rolls issued to Manager`);

    setQty("");
    showToast("Rolls Issued! Pending Manager Confirmation.");
  };

  return (
    <div className="bg-white p-5 rounded-2xl border border-[#DDE3DA] max-w-lg space-y-4">
      <p className="font-bold text-[#0B3B45]">Issue Film Rolls to Manager</p>
      <form onSubmit={handleIssue} className="space-y-3">
        <div>
          <label className="text-xs font-semibold text-gray-500">Select Roll Type</label>
          <select value={rollTypeId} onChange={(e) => setRollTypeId(e.target.value)} className="inp" required>
            {(data.rollTypes || []).map((t) => (
              <option key={t.id} value={t.id}>{t.name} ({t.standardWeightKg} kg/roll)</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-500">Number of Rolls to Issue (Roll Count)</label>
          <input type="number" min="1" value={qty} onChange={(e) => setQty(e.target.value)} placeholder="5" className="inp" required />
        </div>
        <button type="submit" className="btn-primary w-full">Transfer Rolls to Production Floor</button>
      </form>
    </div>
  );
}

function ManagerRollAcceptanceTab({ data, mutate, session, showToast }) {
  const managerAcceptedRolls = useMemo(() => computeManagerAcceptedRolls(data), [data]);

  const handleAccept = (issuanceId, physicalCountInput) => {
    if (Number(physicalCountInput) < 0) return showToast("Count cannot be negative!", "warn");

    mutate((prev) => {
      const nextIssuance = (prev.issuance || []).map((item) =>
        item.id === issuanceId
          ? { ...item, status: "ACCEPTED", confirmedBy: session.name, physicalCount: Number(physicalCountInput) }
          : item
      );

      const notif = {
        id: uid(),
        ts: new Date().toLocaleTimeString(),
        read: false,
        title: "Manager Roll Stock Acceptance",
        msg: `Manager ${session.name} accepted roll transfer ID #${issuanceId.slice(0,5)} with physical count: ${physicalCountInput} rolls`,
      };

      return {
        ...prev,
        issuance: nextIssuance,
        notifications: [notif, ...(prev.notifications || [])],
      };
    }, "Accepted Roll Stock", `Confirmed ${physicalCountInput} rolls`);

    showToast("Roll Stock Accepted in Rolls Count!");
  };

  return (
    <div className="space-y-4">
      <div className="bg-white p-4 rounded-xl border border-[#DDE3DA] flex justify-between items-center">
        <div>
          <p className="font-bold text-sm text-[#0B3B45]">Manager Available Floor Roll Balance (in Rolls)</p>
          <p className="text-xs text-gray-500">Accepted roll counts available for water production.</p>
        </div>
        <p className="text-2xl font-mono font-bold text-[#1C8C9E]">{fmt(managerAcceptedRolls, 0)} rolls</p>
      </div>

      <div className="bg-white p-5 rounded-2xl border border-[#DDE3DA] overflow-x-auto">
        <p className="font-bold text-[#0B3B45] mb-3">Custody Transfers & Manager Roll Acceptance</p>
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-[#F7F8F5] text-left">
              <th className="p-2">Date</th>
              <th className="p-2">Roll Type</th>
              <th className="p-2 text-right">Issued Roll Count</th>
              <th className="p-2 text-right">Est. Weight (kg)</th>
              <th className="p-2">Status</th>
              <th className="p-2">Accepted Roll Count & Confirm</th>
            </tr>
          </thead>
          <tbody>
            {(data.issuance || []).map((item) => {
              const rType = (data.rollTypes || []).find((t) => t.id === item.rollTypeId);
              return (
                <tr key={item.id} className="border-t">
                  <td className="p-2 font-mono">{item.date}</td>
                  <td className="p-2 font-semibold">{rType?.name || "Roll"}</td>
                  <td className="p-2 text-right font-mono font-bold">{item.qty} rolls</td>
                  <td className="p-2 text-right font-mono">{item.weightKg} kg</td>
                  <td className="p-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${item.status === "ACCEPTED" ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"}`}>
                      {item.status}
                    </span>
                  </td>
                  <td className="p-2">
                    {item.status === "PENDING" ? (
                      <AcceptForm session={session} onAccept={(count) => handleAccept(item.id, count)} placeholder="Rolls Count" />
                    ) : (
                      <span className="text-gray-500 font-mono font-bold">{item.physicalCount} rolls confirmed by {item.confirmedBy}</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AcceptForm({ session, onAccept, placeholder = "Physical Count" }) {
  const isManager = session?.role === "manager" || session?.role === "owner";
  const [cnt, setCnt] = useState("");

  if (!isManager) return null;

  return (
    <div className="flex gap-1 items-center">
      <input
        type="number"
        min="1"
        value={cnt}
        onChange={(e) => setCnt(e.target.value)}
        placeholder={placeholder}
        className="inp py-1 text-xs w-28"
        required
      />
      <button
        type="button"
        onClick={() => {
          if (Number(cnt) > 0) {
            onAccept(cnt);
          }
        }}
        className="btn-success text-xs py-1 px-2"
      >
        Accept
      </button>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/*  PACKING BAGS MODULE                                                    */
/* ---------------------------------------------------------------------- */
function PackingModule({ data, mutate, session, showToast, darkMode }) {
  const isOwner = session.role === "owner";
  const [tab, setTab] = useState(isOwner ? "intake" : "accept");

  return (
    <div className="space-y-5">
      <div>
        <p className="font-display font-800 text-2xl text-[#0B3B45]">Packing Bags Custody</p>
        <p className="text-sm text-[#5B6B68]">Manage carrier/packing bags intake, transfers, and manager physical counts.</p>
      </div>

      <div className="flex gap-1 bg-white rounded-xl border border-[#DDE3DA] p-1 w-fit overflow-x-auto">
        {isOwner && <button onClick={() => setTab("intake")} className={`px-3 py-1.5 rounded-lg text-sm ${tab === "intake" ? "bg-[#0B3B45] text-white font-bold" : "text-gray-600"}`}>Owner Bag Intake</button>}
        {isOwner && <button onClick={() => setTab("issue")} className={`px-3 py-1.5 rounded-lg text-sm ${tab === "issue" ? "bg-[#0B3B45] text-white font-bold" : "text-gray-600"}`}>Issue Bags to Manager</button>}
        <button onClick={() => setTab("accept")} className={`px-3 py-1.5 rounded-lg text-sm ${tab === "accept" ? "bg-[#0B3B45] text-white font-bold" : "text-gray-600"}`}>Manager Bag Acceptance</button>
      </div>

      {tab === "intake" && isOwner && <OwnerBagIntakeTab data={data} mutate={mutate} showToast={showToast} />}
      {tab === "issue" && isOwner && <IssueBagsTab data={data} mutate={mutate} session={session} showToast={showToast} />}
      {tab === "accept" && <ManagerBagAcceptanceTab data={data} mutate={mutate} session={session} showToast={showToast} />}
    </div>
  );
}

function OwnerBagIntakeTab({ data, mutate, showToast }) {
  const [selectedBagTypeId, setSelectedBagTypeId] = useState("new");
  const [typeName, setTypeName] = useState("");
  const [supplier, setSupplier] = useState("");
  const [qty, setQty] = useState("");

  const handleIntake = (e) => {
    e.preventDefault();
    if (Number(qty) <= 0) return showToast("Quantity must be positive!", "warn");

    let bId = selectedBagTypeId;
    let nameToSave = typeName;

    if (selectedBagTypeId === "new") {
      if (!typeName.trim()) return showToast("Enter a Bag Type Name!", "warn");
      const existing = (data.bagTypes || []).find(
        (t) => t.name.trim().toLowerCase() === typeName.trim().toLowerCase()
      );
      if (existing) {
        bId = existing.id;
        nameToSave = existing.name;
      } else {
        bId = uid();
      }
    } else {
      const existing = (data.bagTypes || []).find((t) => t.id === selectedBagTypeId);
      if (existing) nameToSave = existing.name;
    }

    mutate((prev) => {
      const bagTypeExists = (prev.bagTypes || []).some((t) => t.id === bId);
      const nextBagTypes = bagTypeExists
        ? prev.bagTypes
        : [...(prev.bagTypes || []), { id: bId, name: nameToSave.trim(), capacity: 30 }];

      return {
        ...prev,
        bagTypes: nextBagTypes,
        bagIntake: [{ id: uid(), date: todayISO(), bagTypeId: bId, supplier, qty: Number(qty) }, ...(prev.bagIntake || [])],
      };
    }, "Bag Intake Recorded", `${qty} pcs ${nameToSave}`);

    setTypeName(""); setSupplier(""); setQty(""); setSelectedBagTypeId("new");
    showToast("Bag Intake Recorded!");
  };

  return (
    <div className="grid lg:grid-cols-2 gap-4">
      <form onSubmit={handleIntake} className="bg-white p-5 rounded-2xl border border-[#DDE3DA] space-y-3">
        <p className="font-bold text-[#0B3B45]">Owner Packing Bags Intake</p>

        <div>
          <label className="text-xs font-semibold text-gray-500">Bag Category</label>
          <select value={selectedBagTypeId} onChange={(e) => setSelectedBagTypeId(e.target.value)} className="inp">
            <option value="new">+ Create New Bag Type</option>
            {(data.bagTypes || []).map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>

        {selectedBagTypeId === "new" && (
          <div>
            <label className="text-xs font-semibold text-gray-500">New Bag Type / Name</label>
            <input value={typeName} onChange={(e) => setTypeName(e.target.value)} placeholder="e.g. 30-Sachet Outer Bag" className="inp" required={selectedBagTypeId === "new"} />
          </div>
        )}

        <div>
          <label className="text-xs font-semibold text-gray-500">Quantity (Bags/Bundles)</label>
          <input type="number" min="1" value={qty} onChange={(e) => setQty(e.target.value)} placeholder="500" className="inp" required />
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-500">Supplier (Hidden from Manager)</label>
          <input value={supplier} onChange={(e) => setSupplier(e.target.value)} placeholder="e.g. Ghana Pack Ltd" className="inp" />
        </div>
        <button type="submit" className="btn-primary w-full">Save Bag Intake</button>
      </form>

      <div className="bg-white p-5 rounded-2xl border border-[#DDE3DA] overflow-x-auto">
        <p className="font-bold text-[#0B3B45] mb-3">Owner Stock Ledger (Includes Suppliers)</p>
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-[#F7F8F5] text-left">
              <th className="p-2">Date</th>
              <th className="p-2">Bag Type</th>
              <th className="p-2">Supplier</th>
              <th className="p-2 text-right">Qty</th>
            </tr>
          </thead>
          <tbody>
            {(data.bagIntake || []).map((r) => (
              <tr key={r.id} className="border-t">
                <td className="p-2 font-mono">{r.date}</td>
                <td className="p-2 font-semibold">{(data.bagTypes || []).find((t) => t.id === r.bagTypeId)?.name || "Bags"}</td>
                <td className="p-2 text-blue-800 font-semibold">{r.supplier || "N/A"}</td>
                <td className="p-2 text-right font-mono">{r.qty}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function IssueBagsTab({ data, mutate, session, showToast }) {
  const [bagTypeId, setBagTypeId] = useState(data.bagTypes[0]?.id || "");
  const [qty, setQty] = useState("");

  useEffect(() => {
    if ((data.bagTypes || []).length > 0 && !bagTypeId) {
      setBagTypeId(data.bagTypes[0].id);
    }
  }, [data.bagTypes, bagTypeId]);

  const handleIssue = (e) => {
    e.preventDefault();
    if (Number(qty) <= 0) return showToast("Quantity must be positive!", "warn");

    mutate((prev) => ({
      ...prev,
      bagIssuance: [
        {
          id: uid(),
          date: todayISO(),
          bagTypeId,
          qty: Number(qty),
          status: "PENDING",
          issuedBy: session.name,
          confirmedBy: null,
          physicalCount: null,
        },
        ...(prev.bagIssuance || []),
      ],
    }), "Issued Bags to Manager", `${qty} pcs issued`);

    setQty("");
    showToast("Packing Bags Issued to Manager!");
  };

  return (
    <div className="bg-white p-5 rounded-2xl border border-[#DDE3DA] max-w-lg space-y-4">
      <p className="font-bold text-[#0B3B45]">Issue Packing Bags to Manager</p>
      <form onSubmit={handleIssue} className="space-y-3">
        <div>
          <label className="text-xs font-semibold text-gray-500">Select Bag Type</label>
          <select value={bagTypeId} onChange={(e) => setBagTypeId(e.target.value)} className="inp" required>
            {(data.bagTypes || []).map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-500">Quantity to Issue</label>
          <input type="number" min="1" value={qty} onChange={(e) => setQty(e.target.value)} placeholder="200" className="inp" required />
        </div>
        <button type="submit" className="btn-primary w-full">Transfer Bags to Manager</button>
      </form>
    </div>
  );
}

function ManagerBagAcceptanceTab({ data, mutate, session, showToast }) {
  const managerAcceptedQty = useMemo(() => computeManagerAcceptedBags(data), [data]);

  const handleAccept = (issuanceId, physicalCountInput) => {
    if (Number(physicalCountInput) < 0) return showToast("Count cannot be negative!", "warn");

    mutate((prev) => {
      const nextIssuance = (prev.bagIssuance || []).map((item) =>
        item.id === issuanceId
          ? { ...item, status: "ACCEPTED", confirmedBy: session.name, physicalCount: Number(physicalCountInput) }
          : item
      );

      const notif = {
        id: uid(),
        ts: new Date().toLocaleTimeString(),
        read: false,
        title: "Manager Bag Acceptance",
        msg: `Manager ${session.name} accepted bag transfer ID #${issuanceId.slice(0,5)} with physical count: ${physicalCountInput}`,
      };

      return {
        ...prev,
        bagIssuance: nextIssuance,
        notifications: [notif, ...(prev.notifications || [])],
      };
    }, "Accepted Bag Stock", `Confirmed ${physicalCountInput} bags`);

    showToast("Packing Bags Accepted!");
  };

  return (
    <div className="space-y-4">
      <div className="p-4 rounded-xl border border-[#DDE3DA] flex justify-between items-center bg-white">
        <div>
          <p className="font-bold text-sm text-[#0B3B45]">Manager Accepted Packing Bags Balance</p>
          <p className="text-xs text-gray-500">Required to run production.</p>
        </div>
        <p className="text-2xl font-mono font-bold text-[#E8A23D]">{fmt(managerAcceptedQty, 0)} pcs</p>
      </div>

      <div className="bg-white p-5 rounded-2xl border border-[#DDE3DA] overflow-x-auto">
        <p className="font-bold text-[#0B3B45] mb-3">Bag Issuance Transfers</p>
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-[#F7F8F5] text-left">
              <th className="p-2">Date</th>
              <th className="p-2">Bag Type</th>
              <th className="p-2 text-right">Qty</th>
              <th className="p-2">Status</th>
              <th className="p-2">Physical Count & Confirm</th>
            </tr>
          </thead>
          <tbody>
            {(data.bagIssuance || []).map((item) => {
              const bType = (data.bagTypes || []).find((t) => t.id === item.bagTypeId);
              return (
                <tr key={item.id} className="border-t">
                  <td className="p-2 font-mono">{item.date}</td>
                  <td className="p-2 font-semibold">{bType?.name || "Bags"}</td>
                  <td className="p-2 text-right font-mono">{item.qty}</td>
                  <td className="p-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${item.status === "ACCEPTED" ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"}`}>
                      {item.status}
                    </span>
                  </td>
                  <td className="p-2">
                    {item.status === "PENDING" ? (
                      <AcceptForm session={session} onAccept={(count) => handleAccept(item.id, count)} />
                    ) : (
                      <span className="text-gray-500 font-mono">Confirmed: {item.physicalCount} pcs by {item.confirmedBy}</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/*  PRODUCTION MODULE                                                     */
/* ---------------------------------------------------------------------- */
function ProductionModule({ data, mutate, session, showToast, darkMode }) {
  const managerRollsCount = useMemo(() => computeManagerAcceptedRolls(data), [data]);
  const managerBagsQty = useMemo(() => computeManagerAcceptedBags(data), [data]);

  const [rollTypeId, setRollTypeId] = useState(data.rollTypes[0]?.id || "");
  const [bagTypeId, setBagTypeId] = useState(data.bagTypes[0]?.id || "");
  const [operatorName, setOperatorName] = useState("");
  const [rollsUsed, setRollsUsed] = useState("1");
  const [weightUsed, setWeightUsed] = useState("");
  const [actualBags, setActualBags] = useState("");
  const [bagsUsedQty, setBagsUsedQty] = useState("");
  const [leakage, setLeakage] = useState("0");

  useEffect(() => {
    if ((data.rollTypes || []).length > 0 && !rollTypeId) {
      setRollTypeId(data.rollTypes[0].id);
    }
  }, [data.rollTypes, rollTypeId]);

  useEffect(() => {
    if ((data.bagTypes || []).length > 0 && !bagTypeId) {
      setBagTypeId(data.bagTypes[0].id);
    }
  }, [data.bagTypes, bagTypeId]);

  const canProduce = managerRollsCount > 0 && managerBagsQty > 0;

  const handleRunProduction = (e) => {
    e.preventDefault();
    if (!canProduce) {
      showToast("PRODUCTION BLOCKED: Rolls or Packing Bags not available/accepted by manager!", "warn");
      return;
    }

    if (!operatorName.trim()) {
      showToast("Please specify the Water Cutting Machine Operator name!", "warn");
      return;
    }

    if (Number(rollsUsed) <= 0 || Number(weightUsed) <= 0 || Number(actualBags) <= 0 || Number(bagsUsedQty) <= 0) {
      showToast("Negative or zero values are strict violation!", "warn");
      return;
    }

    if (Number(rollsUsed) > managerRollsCount) {
      showToast(`Cannot use more rolls than available (${managerRollsCount} rolls)`, "warn");
      return;
    }

    if (Number(bagsUsedQty) > managerBagsQty) {
      showToast(`Cannot use more packing bags than available (${managerBagsQty} pcs)`, "warn");
      return;
    }

    const netProduced = Math.max(0, Number(actualBags) - Number(leakage || 0));

    mutate((prev) => ({
      ...prev,
      productionRuns: [
        {
          id: uid(),
          date: todayISO(),
          operatorName: operatorName.trim(),
          rollTypeId,
          bagTypeId,
          rollsUsed: Number(rollsUsed),
          weightUsedKg: Number(weightUsed),
          actualBags: Number(actualBags),
          leakageBags: Number(leakage || 0),
          netAvailableBags: netProduced,
          recordedBy: session.name,
        },
        ...(prev.productionRuns || []),
      ],
      bagUsage: [
        {
          id: uid(),
          date: todayISO(),
          qty: Number(bagsUsedQty),
          reason: "Production Run",
          usedBy: session.name,
        },
        ...(prev.bagUsage || []),
      ],
    }), "Recorded Production Run", `${netProduced} sachet bags produced by ${operatorName}`);

    setOperatorName(""); setRollsUsed("1"); setWeightUsed(""); setActualBags(""); setLeakage("0"); setBagsUsedQty("");
    showToast("Production Run Logged Successfully!");
  };

  return (
    <div className="space-y-5">
      <div>
        <p className="font-display font-800 text-2xl text-[#0B3B45]">Production Floor Execution</p>
        <p className="text-sm text-[#5B6B68]">Convert accepted rolls & packing bags into finished sellable sachet water bags.</p>
      </div>

      {!canProduce ? (
        <div className="bg-[#FBEAE5] border border-[#EFC3B7] p-5 rounded-2xl flex items-center gap-3 text-[#C4472F]">
          <AlertTriangle size={24} className="shrink-0" />
          <div>
            <p className="font-bold text-sm">PRODUCTION RUN BLOCKED</p>
            <p className="text-xs">You cannot initiate a production run because there are 0 accepted Film Rolls or 0 accepted Packing Bags in Manager stock. Please accept pending transfers first.</p>
          </div>
        </div>
      ) : (
        <form onSubmit={handleRunProduction} className="bg-[#FFFFFF] p-5 rounded-2xl border border-[#DDE3DA] space-y-4 max-w-2xl">
          <p className="font-bold text-[#0B3B45]">Record New Production Run & Machine Assignment</p>
          
          <div>
            <label className="text-xs font-semibold text-gray-500">Water Cutting Machine Operator Name *</label>
            <input value={operatorName} onChange={(e) => setOperatorName(e.target.value)} placeholder="e.g. Samuel Boateng (Machine 1 Operator)" className="inp mt-1" required />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-500">Film Roll Type</label>
              <select value={rollTypeId} onChange={(e) => setRollTypeId(e.target.value)} className="inp" required>
                {(data.rollTypes || []).map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500">Packing Bag Used</label>
              <select value={bagTypeId} onChange={(e) => setBagTypeId(e.target.value)} className="inp" required>
                {(data.bagTypes || []).map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-500">Number of Rolls Used</label>
              <input type="number" min="1" value={rollsUsed} onChange={(e) => setRollsUsed(e.target.value)} placeholder="1" className="inp" required />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500">Weight Roll Used (kg)</label>
              <input type="number" min="0.1" step="0.1" value={weightUsed} onChange={(e) => setWeightUsed(e.target.value)} placeholder="e.g. 25" className="inp" required />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500">Packing Bags Quantity (pcs)</label>
              <input type="number" min="1" value={bagsUsedQty} onChange={(e) => setBagsUsedQty(e.target.value)} placeholder="e.g. 30" className="inp" required />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-500">Total Bags Produced (Gross)</label>
              <input type="number" min="1" value={actualBags} onChange={(e) => setActualBags(e.target.value)} placeholder="e.g. 900" className="inp" required />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500">Production Leakages / Burst Bags</label>
              <input type="number" min="0" value={leakage} onChange={(e) => setLeakage(e.target.value)} className="inp" required />
            </div>
          </div>

          <button type="submit" className="btn-primary w-full py-2.5">Record Finished Sachet Goods & Operator Entry</button>
        </form>
      )}

      <div className="bg-white p-5 rounded-2xl border border-[#DDE3DA] overflow-x-auto">
        <p className="font-bold text-[#0B3B45] mb-3">Production Log & Machine Operator Assignments</p>
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-[#F7F8F5] text-left">
              <th className="p-2">Date</th>
              <th className="p-2">Operator Name</th>
              <th className="p-2 text-right">Rolls Used</th>
              <th className="p-2 text-right">Weight (kg)</th>
              <th className="p-2 text-right">Gross Bags</th>
              <th className="p-2 text-right">Leakage Bags</th>
              <th className="p-2 text-right">Net Sellable Bags</th>
            </tr>
          </thead>
          <tbody>
            {(data.productionRuns || []).map((r) => (
              <tr key={r.id} className="border-t">
                <td className="p-2 font-mono">{r.date}</td>
                <td className="p-2 font-semibold text-blue-900">{r.operatorName || "N/A"}</td>
                <td className="p-2 text-right font-mono font-bold">{r.rollsUsed || 1} rolls</td>
                <td className="p-2 text-right font-mono">{r.weightUsedKg} kg</td>
                <td className="p-2 text-right font-mono">{r.actualBags}</td>
                <td className="p-2 text-right font-mono text-red-600">{r.leakageBags}</td>
                <td className="p-2 text-right font-mono font-bold text-green-700">{r.netAvailableBags}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/*  REPORTS & DRIVERS MODULE WITH PDF EXPORT                              */
/* ---------------------------------------------------------------------- */
function ReportsModule({ data, session, darkMode }) {
  const isOwnerOrManager = session.role === "owner" || session.role === "manager";
  const finished = useMemo(() => computeFinishedGoods(data), [data]);

  const handlePrintPDFReport = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <p className="font-display font-800 text-2xl text-[#0B3B45]">Reports & Analytics</p>
          <p className="text-sm text-[#5B6B68]">Operational summary, sales history, leakages, and giveaways.</p>
        </div>

        <button onClick={handlePrintPDFReport} className="btn-primary py-2 px-4 no-print">
          <Printer size={16} /> Export PDF Report / Print
        </button>
      </div>

      <div id="printable-area" className="space-y-6">
        <div className="bg-white p-5 rounded-2xl border border-[#DDE3DA] space-y-4">
          <p className="font-bold text-[#0B3B45] text-base">Executive Operations Summary</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-3 bg-[#F7F8F5] rounded-xl border">
              <p className="text-[11px] font-semibold text-gray-500">Total Sachet Bags Produced</p>
              <p className="text-lg font-mono font-bold text-[#0B3B45] mt-1">{fmt(finished.totalProduced, 0)} bags</p>
            </div>
            <div className="p-3 bg-[#F7F8F5] rounded-xl border">
              <p className="text-[11px] font-semibold text-gray-500">Total Bags Sold</p>
              <p className="text-lg font-mono font-bold text-blue-900 mt-1">{fmt(finished.totalSold, 0)} bags</p>
            </div>
            <div className="p-3 bg-[#FBEAE5] rounded-xl border">
              <p className="text-[11px] font-semibold text-[#C4472F]">Free Giveaways / Promo Bags</p>
              <p className="text-lg font-mono font-bold text-[#C4472F] mt-1">{fmt(finished.totalFree, 0)} bags</p>
            </div>
            <div className="p-3 bg-[#EAF3F1] rounded-xl border">
              <p className="text-[11px] font-semibold text-[#2A6E4A]">Net Available Stock</p>
              <p className="text-lg font-mono font-bold text-[#2A6E4A] mt-1">{fmt(finished.availableForSale, 0)} bags</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#DDE3DA] overflow-x-auto">
          <p className="font-bold text-[#0B3B45] mb-3 text-base">Sales, Leakages & Free Bags Audit Ledger</p>
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-[#F7F8F5] text-left">
                <th className="p-2">Date</th>
                <th className="p-2">Customer / Recipient</th>
                <th className="p-2 text-right">Bags Sold</th>
                <th className="p-2 text-right">Free Bags Given</th>
                <th className="p-2 text-right">Leakages/Damaged</th>
                <th className="p-2 text-right">Total Revenue</th>
                <th className="p-2">Channel</th>
              </tr>
            </thead>
            <tbody>
              {(data.sales || []).map((s) => (
                <tr key={s.id} className="border-t">
                  <td className="p-2 font-mono">{s.date}</td>
                  <td className="p-2 font-semibold">{s.customer}</td>
                  <td className="p-2 text-right font-mono font-bold">{s.bagsSold}</td>
                  <td className="p-2 text-right font-mono font-bold text-amber-600">{s.freeBags || 0}</td>
                  <td className="p-2 text-right font-mono text-red-600">{s.leakages || 0}</td>
                  <td className="p-2 text-right font-mono font-bold text-green-700">{fmtGHS(s.totalAmount)}</td>
                  <td className="p-2 uppercase font-mono text-[10px]">{s.method}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/*  PRINTABLE RECEIPT MODAL                                                */
/* ---------------------------------------------------------------------- */
function ReceiptModal({ sale, companyName, driversList, onClose }) {
  if (!sale) return null;
  const driver = driversList.find((d) => d.id === sale.driverId);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl relative">
        <button onClick={onClose} className="absolute top-3 right-3 text-gray-400 hover:text-black">
          <X size={18} />
        </button>

        <div id="printable-receipt" className="text-center font-mono text-xs space-y-3">
          <div className="border-b border-dashed border-gray-300 pb-3">
            <div className="flex justify-center items-center gap-1 text-[#0B3B45] font-bold text-base">
              <Droplets size={18} />
              <span>{companyName || "PureLedger Water"}</span>
            </div>
            <p className="text-[10px] text-gray-500 uppercase mt-0.5">Sachet Water Purchase Receipt</p>
            <p className="text-[9px] text-gray-400">Ref ID: #{sale.id.toUpperCase()}</p>
          </div>

          <div className="text-left text-[11px] space-y-1 py-1">
            <div className="flex justify-between"><span className="text-gray-500">Date/Time:</span><span>{new Date(sale.timestamp || Date.now()).toLocaleString()}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Customer:</span><span className="font-bold">{sale.customer}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Driver / Truck:</span><span>{driver ? driver.name : "Direct Factory Sale"}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Payment Channel:</span><span className="uppercase font-semibold text-blue-800">{sale.method}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Cashier / Manager:</span><span>{sale.recordedBy}</span></div>
          </div>

          <div className="border-t border-b border-dashed border-gray-300 py-2 space-y-1.5">
            <div className="flex justify-between text-left font-bold border-b pb-1">
              <span>Item Description</span>
              <span>Total</span>
            </div>
            <div className="flex justify-between text-left">
              <span>Sachet Water ({sale.bagsSold} bags @ {fmtGHS(sale.pricePerBag)})</span>
              <span className="font-bold">{fmtGHS(sale.totalAmount)}</span>
            </div>
            {sale.freeBags > 0 && (
              <div className="flex justify-between text-left text-amber-700">
                <span>Free Giveaway / Promo Bags</span>
                <span className="font-bold">{sale.freeBags} bags</span>
              </div>
            )}
            {sale.leakages > 0 && (
              <div className="flex justify-between text-left text-red-600">
                <span>Recorded Leakages/Damaged</span>
                <span className="font-bold">{sale.leakages} bags</span>
              </div>
            )}
          </div>

          <div className="pt-1 flex justify-between items-center text-sm font-bold">
            <span>TOTAL PAID:</span>
            <span className="text-base text-green-700">{fmtGHS(sale.amountPaid)}</span>
          </div>

          <div className="border-t border-dashed border-gray-300 pt-3 text-[10px] text-gray-500">
            <p>Thank you for your business!</p>
            <p className="text-[9px] text-gray-400 mt-0.5">PureLedger ERP · Verified Offline Transaction</p>
          </div>
        </div>

        <div className="mt-5 flex gap-2">
          <button onClick={handlePrint} className="btn-primary flex-1 py-2">
            <Printer size={15} /> Print Receipt
          </button>
          <button onClick={onClose} className="px-3 py-2 border rounded-lg text-xs font-bold text-gray-600 hover:bg-gray-100">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/*  SALES & BANK DEPOSIT MODULE                                           */
/* ---------------------------------------------------------------------- */
function SalesModule({ data, mutate, session, showToast, darkMode }) {
  const driversList = useMemo(() => (data.users || []).filter((u) => u.role === "driver"), [data.users]);
  const finished = useMemo(() => computeFinishedGoods(data), [data]);
  const cashAvailable = useMemo(() => computeCashBalance(data), [data]);

  const [driverId, setDriverId] = useState(driversList[0]?.id || "factory");
  const [customer, setCustomer] = useState("");
  const [bagsSold, setBagsSold] = useState("");
  const [freeBags, setFreeBags] = useState("0");
  const [leakages, setLeakages] = useState("0");
  const [paymentMethod, setPaymentMethod] = useState("cash");

  const [depositAmount, setDepositAmount] = useState("");
  const [bankName, setBankName] = useState("");

  const [activeReceiptSale, setActiveReceiptSale] = useState(null);

  const handleSale = (e) => {
    e.preventDefault();

    const totalDeduction = Number(bagsSold || 0) + Number(freeBags || 0) + Number(leakages || 0);

    if (finished.availableForSale <= 0) {
      showToast("SALES DISALLOWED: Zero sachet bags produce available!", "warn");
      return;
    }

    if (Number(bagsSold) <= 0 && Number(freeBags) <= 0) return showToast("Quantity sold or free bags must be greater than zero!", "warn");

    if (totalDeduction > finished.availableForSale) {
      showToast(`Cannot release more than available finished stock (${finished.availableForSale} bags)`, "warn");
      return;
    }

    const pricePerBag = data.settings.pricePerBag || 5.0;
    const totalAmount = Number(bagsSold) * pricePerBag;

    const newSale = {
      id: uid(),
      date: todayISO(),
      timestamp: new Date().toISOString(),
      driverId: driverId === "factory" ? null : driverId,
      customer: customer || "Direct Customer",
      bagsSold: Number(bagsSold),
      freeBags: Number(freeBags || 0),
      leakages: Number(leakages || 0),
      pricePerBag,
      totalAmount,
      amountPaid: totalAmount,
      method: paymentMethod,
      recordedBy: session.name,
    };

    mutate((prev) => ({
      ...prev,
      sales: [newSale, ...(prev.sales || [])],
    }), "Recorded Sale", `${bagsSold} bags sold, ${freeBags} free bags to ${customer || "Direct Customer"}`);

    setBagsSold(""); setFreeBags("0"); setLeakages("0"); setCustomer("");
    showToast("Sale & Supply Recorded Successfully!");
    setActiveReceiptSale(newSale);
  };

  const handleBankDeposit = (e) => {
    e.preventDefault();
    const depVal = Number(depositAmount);

    if (depVal <= 0) return showToast("Invalid deposit amount!", "warn");

    if (depVal > cashAvailable) {
      showToast(`DEPOSIT REJECTED: Deposit (${fmtGHS(depVal)}) exceeds cash on hand available (${fmtGHS(cashAvailable)})!`, "warn");
      return;
    }

    mutate((prev) => ({
      ...prev,
      bankDeposits: [
        {
          id: uid(),
          date: todayISO(),
          amount: depVal,
          bankName,
          recordedBy: session.name,
        },
        ...(prev.bankDeposits || []),
      ],
    }), "Bank Deposit Made", `${fmtGHS(depVal)} deposited to ${bankName}`);

    setDepositAmount(""); setBankName("");
    showToast("Bank Deposit Reconciled!");
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="font-display font-800 text-2xl text-[#0B3B45]">Sales, Drivers & Free Supply</p>
        <p className="text-sm text-[#5B6B68]">Record sales against trucks or direct factory sales, log free promo bags, leakages, print receipts, and reconcile cash.</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-[#DDE3DA] space-y-4">
          <div className="flex justify-between items-center">
            <p className="font-bold text-[#0B3B45]">Record Sachet Water Sale & Free Supply</p>
            <span className="text-xs font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded">
              Stock: {fmt(finished.availableForSale, 0)} bags
            </span>
          </div>

          {finished.availableForSale <= 0 ? (
            <div className="bg-[#FBEAE5] text-[#C4472F] p-3 rounded-lg text-xs font-semibold">
              Sales locked! Zero sachet bags produce available in inventory.
            </div>
          ) : (
            <form onSubmit={handleSale} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-gray-500">Sales Channel / Driver</label>
                <select value={driverId} onChange={(e) => setDriverId(e.target.value)} className="inp" required>
                  <option value="factory">Direct Factory Sale (Manager Gate Sale)</option>
                  {driversList.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-500">Customer Name / Retailer</label>
                <input value={customer} onChange={(e) => setCustomer(e.target.value)} placeholder="e.g. Abena Trading" className="inp" required />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-gray-500">Bags Sold Quantity</label>
                  <input type="number" min="0" max={finished.availableForSale} value={bagsSold} onChange={(e) => setBagsSold(e.target.value)} className="inp" required />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500">Fixed Unit Price</label>
                  <input value={fmtGHS(data.settings.pricePerBag)} disabled className="inp" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-gray-500">Free Bags Given (Promo)</label>
                  <input type="number" min="0" value={freeBags} onChange={(e) => setFreeBags(e.target.value)} placeholder="0" className="inp" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500">Sales Leakages / Damaged</label>
                  <input type="number" min="0" value={leakages} onChange={(e) => setLeakages(e.target.value)} placeholder="0" className="inp" />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-500">Payment Channel</label>
                <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="inp">
                  <option value="cash">Cash Received</option>
                  <option value="momo">MTN Mobile Money / Telecel</option>
                  <option value="bank">Bank Transfer</option>
                </select>
              </div>

              <button type="submit" className="btn-primary w-full py-2.5">
                <Receipt size={16} /> Complete Sale & Print Receipt
              </button>
            </form>
          )}
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#DDE3DA] space-y-4">
          <div className="flex justify-between items-center">
            <p className="font-bold text-[#0B3B45]">Matched Bank Deposit</p>
            <span className="text-xs font-bold text-blue-800 bg-blue-100 px-2 py-0.5 rounded">
              Cash Available: {fmtGHS(cashAvailable)}
            </span>
          </div>

          <form onSubmit={handleBankDeposit} className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-gray-500">Bank Name / Account</label>
              <input value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="e.g. GCB Bank - Adabraka Branch" className="inp" required />
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-500">Deposit Amount (GH₵)</label>
              <input type="number" min="0.01" step="0.01" value={depositAmount} onChange={(e) => setDepositAmount(e.target.value)} placeholder="e.g. 1000" className="inp" required />
            </div>

            <button type="submit" className="btn-primary w-full py-2.5">Reconcile Bank Deposit</button>
          </form>
        </div>
      </div>

      {activeReceiptSale && (
        <ReceiptModal
          sale={activeReceiptSale}
          companyName={data.settings.companyName}
          driversList={driversList}
          onClose={() => setActiveReceiptSale(null)}
        />
      )}
    </div>
  );
}