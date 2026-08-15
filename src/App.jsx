import React, { useState, useEffect, useMemo, useCallback } from 'react';
import viteLogo from './assets/vite.svg';

import { createClient } from '@supabase/supabase-js';
import {
  Droplets, Warehouse, PackageOpen, Factory, Wallet, FileBarChart, ShieldCheck,
  LogOut, Plus, ChevronRight, AlertTriangle, CheckCircle2, Wifi, WifiOff,
  Users, Settings2, Scale, TrendingUp, TrendingDown, ClipboardList, X, Lock,
  Printer, Calendar, Menu, Bell, Pencil, Truck, Check, KeyRound, Mail, Receipt,
  Building, DollarSign, RotateCcw, Trash2, Tag, PieChart, UserPlus, Cpu, Save
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

function openDB(name, version, { upgrade }) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(name, version);
    request.onupgradeneeded = (e) => upgrade(e.target.result);
    request.onsuccess = (e) => resolve(e.target.result);
    request.onerror = (e) => reject(e.target.error);
  });
}

const dbPromise = openDB(DB_NAME, 1, {
  upgrade(db) {
    if (!db.objectStoreNames.contains(STORE_NAME)) {
      db.createObjectStore(STORE_NAME, { keyPath: "id", autoIncrement: true });
    }
  },
});

/* ---------------------------------------------------------------------- */
/*  EXPENSE CATEGORIES DEFAULT LIST                                      */
/* ---------------------------------------------------------------------- */
const DEFAULT_EXPENSE_CATEGORIES = [
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

/* ---------------------------------------------------------------------- */
/*  STORAGE ENGINE & DATA STRUCTURE                                        */
/* ---------------------------------------------------------------------- */
const STORAGE_KEY = "pureledger-ghana-erp-db";

const emptyData = {
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

function normalizeData(data) {
  return {
    ...emptyData,
    ...data,
    rolesConfig: { ...emptyData.rolesConfig, ...(data?.rolesConfig || {}) },
    expenseCategories: data?.expenseCategories || DEFAULT_EXPENSE_CATEGORIES,
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

async function loadData() {
  if (supabase && navigator.onLine) {
    try {
      const { data: remote, error } = await supabase.from("pureledger_store").select("data").eq("id", "main_data").single();
      if (!error && remote && remote.data) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(remote.data));
        return normalizeData(remote.data);
      }
    } catch (e) {
      console.warn("Supabase load failed, falling back to local storage", e);
    }
  }

  try {
    const res = localStorage.getItem(STORAGE_KEY);
    if (!res) return emptyData;
    const parsed = JSON.parse(res);
    return normalizeData(parsed);
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
        users={data.users || []}
        rolesConfig={data.rolesConfig || emptyData.rolesConfig}
        onLogin={handleLogin}
        onResetAdminPassword={handleResetAdminPassword}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#F2F4EF] text-[#16211F] font-body">
      <style dangerouslySetInnerHTML={{ __html: CSS_TOOLKIT }} />
      <div className="flex">
        <Sidebar
          page={page}
          setPage={(p) => { setPage(p); setMobileNavOpen(false); }}
          role={session.role}
          rolesConfig={data.rolesConfig || emptyData.rolesConfig}
          onLogout={() => setSession(null)}
          open={mobileNavOpen}
          onClose={() => setMobileNavOpen(false)}
        />
        <div className="flex-1 min-w-0">
          <TopBar session={session} rolesConfig={data.rolesConfig || emptyData.rolesConfig} online={online} onMenuClick={() => setMobileNavOpen(true)} onLogout={() => setSession(null)} data={data} mutate={mutate} />
          <main className="p-4 sm:p-6 max-w-6xl mx-auto">
            {page === "dashboard" && (session.role === "owner" || session.role === "manager") && (
              <Dashboard data={data} mutate={mutate} session={session} showToast={showToast} />
            )}
            {page === "warehouse" && (session.role === "owner" || session.role === "manager") && (
              <WarehouseModule data={data} mutate={mutate} session={session} showToast={showToast} />
            )}
            {page === "packing" && (session.role === "owner" || session.role === "manager") && (
              <PackingModule data={data} mutate={mutate} session={session} showToast={showToast} />
            )}
            {page === "production" && (session.role === "owner" || session.role === "manager") && (
              <ProductionModule data={data} mutate={mutate} session={session} showToast={showToast} />
            )}
            {page === "sales" && (session.role !== "driver") && (
              <SalesModule data={data} mutate={mutate} session={session} showToast={showToast} />
            )}
            {page === "reports" && (
              <ReportsModule data={data} session={session} />
            )}
            {page === "admin" && session.role === "owner" && (
              <AdminManagementModule data={data} mutate={mutate} showToast={showToast} />
            )}
            {page === "audit" && session.role === "owner" && <AuditLog data={data} mutate={mutate} showToast={showToast} />}
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
  #printable-area { position: absolute; left: 0; top: 0; width: 100%; }
  #printable-receipt { position: absolute; left: 0; top: 0; width: 100%; max-width: 320px; margin: 0 auto; padding: 10px; background: white; color: black; }
  .no-print { display: none !important; }
}
`;

/* ---------------------------------------------------------------------- */
/*  LOGIN SCREEN                                                           */
/* ---------------------------------------------------------------------- */
function LoginScreen({ users = [], rolesConfig = {}, onLogin, onResetAdminPassword }) {
  const [view, setView] = useState("login");
  const [selectedUser, setSelectedUser] = useState(users[0] || null);
  const [password, setPassword] = useState("");
  const [fullNameInput, setFullNameInput] = useState("");
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const [resetEmail, setResetEmail] = useState("");
  const [resetPassword, setResetPassword] = useState("");

  useEffect(() => {
    if (users.length > 0 && !selectedUser) {
      setSelectedUser(users[0]);
    }
  }, [users, selectedUser]);

  const handleLoginSubmit = (e) => {
    e.preventDefault();
    if (!selectedUser) return;

    if (selectedUser.password && password !== selectedUser.password) {
      setError("Incorrect password! Access denied.");
      return;
    }

    if (!fullNameInput || fullNameInput.trim().toLowerCase() !== selectedUser.name.trim().toLowerCase()) {
      setError("Full Name mismatch! Please type the exact full name assigned to this user.");
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

        {view === "login" && (
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            {successMsg && <p className="text-xs font-semibold text-green-700 bg-green-100 p-2 rounded">{successMsg}</p>}

            <div>
              <label className="text-xs font-semibold text-[#5B6B68] uppercase">Select Account / User</label>
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
                {users.map((u) => {
                  const roleLabel = rolesConfig[u.role]?.label || u.role;
                  return (
                    <option key={u.id} value={u.id}>
                      {roleLabel} — {u.name}
                    </option>
                  );
                })}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-[#5B6B68] uppercase">Verify Full Name</label>
              <input
                type="text"
                value={fullNameInput}
                onChange={(e) => { setFullNameInput(e.target.value); setError(""); }}
                placeholder="Type exact full name assigned"
                className="inp mt-1"
                required
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-[#5B6B68] uppercase">Password</label>
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
                placeholder="admin@gmail.com"
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
                placeholder="Set new password"
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
/*  BUSINESS DETAILS ONBOARDING MODAL                                     */
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
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Mattbees Water Services" className="inp mt-1" required />
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500">Business Phone Number</label>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="e.g. +233 24 123 4567" className="inp mt-1" />
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500">Business Address / Location</label>
            <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="e.g. Industrial Area, Accra" className="inp mt-1" />
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
function Sidebar({ page, setPage, role, rolesConfig, onLogout, open, onClose }) {
  const items = [
    { id: "dashboard", label: "Dashboard", icon: Factory, roles: ["owner", "manager"] },
    { id: "warehouse", label: "Warehouse & Rolls", icon: Warehouse, roles: ["owner", "manager"] },
    { id: "packing", label: "Packing Bags", icon: PackageOpen, roles: ["owner", "manager"] },
    { id: "production", label: "Production Logs", icon: Droplets, roles: ["owner", "manager"] },
    { id: "sales", label: "Sales & Cash", icon: Wallet, roles: ["owner", "manager", "cashier"] },
    { id: "reports", label: "Reports & Drivers", icon: FileBarChart, roles: ["owner", "manager", "driver"] },
    { id: "admin", label: "Admin & Roles", icon: KeyRound, roles: ["owner"] },
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
            <p className="font-display font-800 text-[15px] text-[#F2F4EF]">Mattbees Water</p>
          </div>
          <button onClick={onClose} className="sm:hidden p-1 text-[#B9CFCE]"><X size={18} /></button>
        </div>
        <nav className="flex-1 space-y-1">
          {items.filter((i) => i.roles.includes(role) || role === "owner").map((i) => {
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

function TopBar({ session, rolesConfig, online, onMenuClick, onLogout, data, mutate }) {
  const roleMeta = rolesConfig[session.role] || { label: session.role };
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
    <div className="sticky top-0 z-20 bg-[#F2F4EF] border-b border-[#DDE3DA] px-4 sm:px-6 py-3 flex items-center justify-between">
      <div className="flex items-center gap-2.5">
        <button onClick={onMenuClick} className="sm:hidden w-8 h-8 rounded-lg border border-[#DDE3DA] bg-white flex items-center justify-center text-[#0B3B45]">
          <Menu size={16} />
        </button>
        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono font-semibold ${online ? "bg-[#DCEEE4] text-[#2A6E4A]" : "bg-[#F5E3D9] text-[#A85A2A]"}`}>
          {online ? <Wifi size={12} /> : <WifiOff size={12} />}
          <span>{online ? "ONLINE SYNCED" : "OFFLINE READY"}</span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <div className="text-right hidden sm:block">
          <p className="text-sm font-semibold">{session.name}</p>
          <p className="text-[11px] text-[#5B6B68]">{roleMeta.label}</p>
        </div>
        <div className="w-8 h-8 rounded-full bg-[#0B3B45] flex items-center justify-center text-white">
          <ShieldCheck size={14} />
        </div>
        <div className="relative">
          <button onClick={handleOpenNotifications} className="relative w-8 h-8 rounded-lg border border-[#DDE3DA] bg-white flex items-center justify-center text-[#0B3B45]">
            <Bell size={15} />
            {unreadCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 rounded-full text-[10px] font-bold bg-[#C4472F] text-white flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>
          {notifOpen && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl border border-[#DDE3DA] shadow-xl z-50 p-3">
              <div className="flex items-center justify-between pb-2 border-b border-[#EDEFEA]">
                <p className="font-bold text-xs text-[#0B3B45]">System Notifications</p>
                <button onClick={() => mutate((prev) => ({ ...prev, notifications: [] }), "Cleared Notifications", "")} className="text-[10px] text-[#C4472F]">Clear All</button>
              </div>
              <div className="max-h-60 overflow-y-auto space-y-2 mt-2">
                {notifications.length === 0 ? <p className="text-xs text-gray-400 text-center py-4">No notifications</p> : (
                  notifications.map((n) => (
                    <div key={n.id} className="p-2 bg-[#F7F8F5] rounded text-xs border border-[#EDEFEA] relative">
                      <div className="flex justify-between items-center">
                        <p className="font-semibold text-[#0B3B45]">{n.title}</p>
                        <span className="text-[9px] text-green-700 font-bold bg-green-100 px-1.5 py-0.5 rounded">Read</span>
                      </div>
                      <p className="text-gray-600 mt-1">{n.msg}</p>
                      <span className="text-[9px] text-gray-400 font-mono mt-1 block">{n.ts}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
        <button onClick={onLogout} className="w-8 h-8 rounded-lg border border-[#DDE3DA] bg-white flex items-center justify-center text-[#C4472F]">
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
  const freeDistributedSales = (data.sales || []).reduce((s, r) => s + (r.freeBags || 0), 0);
  const salesLeakage = (data.sales || []).reduce((s, r) => s + (r.leakageBags || 0), 0);

  return {
    totalProduced: produced,
    totalSold: sold,
    totalFreeDistributedSales: freeDistributedSales,
    totalSalesLeakage: salesLeakage,
    availableForSale: Math.max(0, produced - sold - freeDistributedSales - salesLeakage),
  };
}

function computeManagerAcceptedRolls(data) {
  const acceptedItems = (data.issuance || []).filter((i) => i.status === "ACCEPTED");
  const acceptedRollsCount = acceptedItems.reduce((s, i) => s + (i.physicalCount || i.qty || 0), 0);
  const acceptedKg = acceptedItems.reduce((s, i) => s + (i.weightKg || 0), 0);

  const usedKg = (data.productionRuns || []).reduce((s, p) => s + (p.weightUsedKg || 0), 0);
  const usedRollsCount = (data.productionRuns || []).reduce((s, p) => s + (p.rollsUsedCount || 0), 0);

  return {
    acceptedRollsCount,
    acceptedKg,
    usedRollsCount,
    usedKg,
    rollsCount: Math.max(0, acceptedRollsCount - usedRollsCount),
    weightKg: Math.max(0, acceptedKg - usedKg),
  };
}

function computeManagerAcceptedBags(data) {
  const accepted = (data.bagIssuance || []).filter((i) => i.status === "ACCEPTED").reduce((s, i) => s + (i.physicalCount || i.qty || 0), 0);
  const used = (data.bagUsage || []).reduce((s, u) => s + (u.qty || 0), 0);
  return {
    acceptedBags: accepted,
    usedBags: used,
    remainingBags: Math.max(0, accepted - used),
  };
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
/*  AUDIT LOG COMPONENT                                                   */
/* ---------------------------------------------------------------------- */
function AuditLog({ data, mutate, showToast }) {
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
                  <td className="p-2 text-gray-600">{log.detail}</td>
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
function Dashboard({ data, mutate, session, showToast }) {
  const isOwner = session.role === "owner";
  const finished = useMemo(() => computeFinishedGoods(data), [data]);
  const managerRolls = useMemo(() => computeManagerAcceptedRolls(data), [data]);
  const managerBags = useMemo(() => computeManagerAcceptedBags(data), [data]);
  const cashOnHand = useMemo(() => computeCashBalance(data), [data]);

  const categories = data.expenseCategories || DEFAULT_EXPENSE_CATEGORIES;

  const [expenseDesc, setExpenseDesc] = useState("");
  const [expenseCategory, setExpenseCategory] = useState(categories[0] || "Utilities & Fuel");
  const [expenseAmt, setExpenseAmt] = useState("");

  const [adminExpenseDesc, setAdminExpenseDesc] = useState("");
  const [adminExpenseCategory, setAdminExpenseCategory] = useState(categories[0] || "Utilities & Fuel");
  const [adminExpenseAmt, setAdminExpenseAmt] = useState("");

  const totalManagerExpensesGHS = useMemo(() => (data.expenses || []).reduce((s, e) => s + (e.amount || 0), 0), [data.expenses]);
  const totalAdminExpensesGHS = useMemo(() => (data.adminExpenses || []).reduce((s, e) => s + (e.amount || 0), 0), [data.adminExpenses]);
  const totalAllExpensesGHS = totalManagerExpensesGHS + totalAdminExpensesGHS;

  const productionLeakages = useMemo(() => (data.productionRuns || []).reduce((s, p) => s + (p.leakageBags || 0), 0), [data.productionRuns]);
  const salesLeakages = useMemo(() => (data.sales || []).reduce((s, sl) => s + (sl.leakageBags || 0), 0), [data.sales]);
  const totalLeakages = productionLeakages + salesLeakages;

  const productionFreeBags = useMemo(() => (data.productionRuns || []).reduce((s, p) => s + (p.freeBags || 0), 0), [data.productionRuns]);
  const salesFreeBags = useMemo(() => (data.sales || []).reduce((s, sl) => s + (sl.freeBags || 0), 0), [data.sales]);
  const totalFreeGiveaways = productionFreeBags + salesFreeBags;

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
    }), "Logged Expense", `GH₵ ${expenseAmt} [${expenseCategory}] for ${expenseDesc}`);

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
    }), "Logged Admin Expense", `GH₵ ${adminExpenseAmt} [${adminExpenseCategory}] for ${adminExpenseDesc}`);

    setAdminExpenseDesc(""); setAdminExpenseAmt("");
    showToast("Admin Expense Recorded!");
  };

  const allExpensesCategorized = useMemo(() => {
    const list = [
      ...(data.expenses || []).map(e => ({ ...e, source: "Manager" })),
      ...(data.adminExpenses || []).map(e => ({ ...e, source: "Admin" })),
    ];

    const totals = {};
    categories.forEach(cat => totals[cat] = 0);

    list.forEach(e => {
      const cat = e.category || "Miscellaneous Expenses";
      totals[cat] = (totals[cat] || 0) + (e.amount || 0);
    });

    return totals;
  }, [data.expenses, data.adminExpenses, categories]);

  return (
    <div className="space-y-6">
      <div>
        <p className="font-display font-800 text-2xl text-[#0B3B45]">Welcome back, {session.name}</p>
        <p className="text-sm text-[#5B6B68]">Sachet Water Operational Overview · {isOwner ? "Super Admin Dashboard" : "Manager Dashboard"}</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={Droplets} label="Sellable Sachet Bags" value={`${fmt(finished.availableForSale, 0)} bags`} accent="#2A6E4A" />
        <StatCard icon={Warehouse} label="Manager Rolls Remaining" value={`${fmt(managerRolls.rollsCount, 0)} rolls (${fmt(managerRolls.weightKg)} kg)`} accent="#1C8C9E" />
        <StatCard icon={PackageOpen} label="Manager Bags Remaining" value={`${fmt(managerBags.remainingBags, 0)} pcs`} accent="#E8A23D" />
        <StatCard icon={Wallet} label="Cash On Hand Balance" value={fmtGHS(cashOnHand)} accent={cashOnHand < 0 ? "#C4472F" : "#0B3B45"} />
      </div>

      <div className="bg-white p-5 rounded-2xl border border-[#DDE3DA] space-y-4">
        <p className="font-bold text-[#0B3B45] text-base border-b pb-2">Manager Floor Operational Summary</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <div className="p-3 rounded-xl bg-[#F7F8F5] border border-[#EDEFEA]">
            <p className="text-[11px] font-semibold text-gray-500 uppercase">Rolls Used / Accepted</p>
            <p className="text-sm font-mono font-bold text-[#0B3B45] mt-1">{fmt(managerRolls.usedRollsCount, 0)} / {fmt(managerRolls.acceptedRollsCount, 0)} rolls</p>
            <p className="text-[10px] text-gray-400 font-mono">({fmt(managerRolls.usedKg)} kg used)</p>
          </div>

          <div className="p-3 rounded-xl bg-[#F7F8F5] border border-[#EDEFEA]">
            <p className="text-[11px] font-semibold text-gray-500 uppercase">Packing Bags Used</p>
            <p className="text-sm font-mono font-bold text-[#0B3B45] mt-1">{fmt(managerBags.usedBags, 0)} / {fmt(managerBags.acceptedBags, 0)} pcs</p>
            <p className="text-[10px] text-gray-400 font-mono">({fmt(managerBags.remainingBags, 0)} pcs remaining)</p>
          </div>

          <div className="p-3 rounded-xl bg-[#FBEAE5] border border-[#EFC3B7]">
            <p className="text-[11px] font-semibold text-[#C4472F] uppercase">Manager Total Expenses</p>
            <p className="text-sm font-mono font-bold text-[#C4472F] mt-1">{fmtGHS(totalManagerExpensesGHS)}</p>
            <p className="text-[10px] text-red-500 font-mono">Operational outlay</p>
          </div>

          <div className="p-3 rounded-xl bg-[#FFF6E5] border border-[#F3E1B9]">
            <p className="text-[11px] font-semibold text-amber-800 uppercase">Total Leakages</p>
            <p className="text-sm font-mono font-bold text-amber-800 mt-1">{fmt(totalLeakages, 0)} bags</p>
            <p className="text-[10px] text-amber-700 font-mono">({productionLeakages} prod + {salesLeakages} supply)</p>
          </div>

          <div className="p-3 rounded-xl bg-[#EAF3F1] border border-[#BFDCD6]">
            <p className="text-[11px] font-semibold text-[#0B3B45] uppercase">Total Free Giveaway</p>
            <p className="text-sm font-mono font-bold text-[#0B3B45] mt-1">{fmt(totalFreeGiveaways, 0)} bags</p>
            <p className="text-[10px] text-teal-700 font-mono">({productionFreeBags} prod + {salesFreeBags} sales)</p>
          </div>
        </div>
      </div>

      {isOwner ? (
        <div className="space-y-6">
          <div className="grid lg:grid-cols-3 gap-4">
            <div className="lg:col-span-1 bg-white p-5 rounded-2xl border border-[#DDE3DA] space-y-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="text-[#0B3B45]" size={20} />
                <p className="font-bold text-[#0B3B45]">Log Categorized Admin Expense</p>
              </div>
              <form onSubmit={handleLogAdminExpense} className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-gray-500">Expense Category</label>
                  <select value={adminExpenseCategory} onChange={(e) => setAdminExpenseCategory(e.target.value)} className="inp">
                    {categories.map((c) => <option key={c} value={c}>{c}</option>)}
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
              <div className="flex justify-between items-center border-b pb-2">
                <p className="font-bold text-[#0B3B45] text-base">Expense Totals & Category Breakdown</p>
                <span className="text-xs font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded">Total: {fmtGHS(totalAllExpensesGHS)}</span>
              </div>

              <div className="grid sm:grid-cols-3 gap-2">
                {Object.entries(allExpensesCategorized).map(([cat, total]) => (
                  <div key={cat} className="p-2.5 bg-[#F7F8F5] rounded-xl border border-[#EDEFEA]">
                    <p className="text-[10px] font-semibold text-gray-500 truncate">{cat}</p>
                    <p className="text-sm font-mono font-bold text-[#0B3B45] mt-0.5">{fmtGHS(total)}</p>
                  </div>
                ))}
              </div>

              <div className="overflow-x-auto max-h-44 mt-2">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-[#F7F8F5] text-left">
                      <th className="p-2">Date</th>
                      <th className="p-2">Category</th>
                      <th className="p-2">Recorded By</th>
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
                        <td className="p-2 font-semibold text-blue-900">{e.category || "General"}</td>
                        <td className="p-2 font-semibold text-gray-700">{e.recordedBy}</td>
                        <td className="p-2">{e.description}</td>
                        <td className="p-2 text-right font-mono font-bold text-red-700">{fmtGHS(e.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
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
              <label className="text-xs font-semibold text-gray-500">Select Expense Category</label>
              <select value={expenseCategory} onChange={(e) => setExpenseCategory(e.target.value)} className="inp">
                {categories.map((c) => <option key={c} value={c}>{c}</option>)}
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
            <button type="submit" className="btn-primary w-full">Log Categorized Expense</button>
          </form>
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
      <p className="font-mono font-semibold text-lg text-[#16211F] leading-none">{value}</p>
      <p className="text-xs text-[#5B6B68] mt-1.5">{label}</p>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/*  WAREHOUSE & ROLLS MODULE                                               */
/* ---------------------------------------------------------------------- */
function WarehouseModule({ data, mutate, session, showToast }) {
  const isOwner = session.role === "owner";
  const [tab, setTab] = useState(isOwner ? "intake" : "accept");

  return (
    <div className="space-y-5">
      <div>
        <p className="font-display font-800 text-2xl text-[#0B3B45]">Warehouse & Film Rolls</p>
        <p className="text-sm text-[#5B6B68]">Manage raw rolls intake, transfers, and manager roll count acceptance.</p>
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
              <option key={t.id} value={t.id}>{t.name} ({t.standardWeightKg} kg/roll)</option>
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
    if (Number(qty) <= 0) return showToast("Enter a positive quantity of rolls!", "warn");

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
  const managerAccepted = useMemo(() => computeManagerAcceptedRolls(data), [data]);

  const handleAccept = (issuanceId, physicalRollsCountInput) => {
    if (Number(physicalRollsCountInput) <= 0) return showToast("Enter a valid physical roll count!", "warn");

    const issuanceRecord = (data.issuance || []).find(i => i.id === issuanceId);
    const rType = (data.rollTypes || []).find(t => t.id === issuanceRecord?.rollTypeId);
    const weightKgCalculated = rType ? Number(physicalRollsCountInput) * rType.standardWeightKg : issuanceRecord?.weightKg || 0;

    mutate((prev) => {
      const nextIssuance = (prev.issuance || []).map((item) =>
        item.id === issuanceId
          ? {
              ...item,
              status: "ACCEPTED",
              confirmedBy: session.name,
              physicalCount: Number(physicalRollsCountInput),
              weightKg: weightKgCalculated
            }
          : item
      );

      const notif = {
        id: uid(),
        ts: new Date().toLocaleTimeString(),
        read: false,
        title: "Manager Roll Count Acceptance",
        msg: `Manager ${session.name} accepted ${physicalRollsCountInput} rolls (${weightKgCalculated} kg) for transfer ID #${issuanceId.slice(0,5)}`,
      };

      return {
        ...prev,
        issuance: nextIssuance,
        notifications: [notif, ...(prev.notifications || [])],
      };
    }, "Accepted Roll Stock", `Confirmed ${physicalRollsCountInput} rolls`);

    showToast("Roll Stock Accepted & Confirmation sent to Admin!");
  };

  return (
    <div className="space-y-4">
      <div className="bg-white p-4 rounded-xl border border-[#DDE3DA] flex justify-between items-center">
        <div>
          <p className="font-bold text-sm text-[#0B3B45]">Manager Accepted Rolls Balance</p>
          <p className="text-xs text-gray-500">Recorded as physical number of rolls received.</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-mono font-bold text-[#1C8C9E]">{fmt(managerAccepted.rollsCount, 0)} rolls</p>
          <p className="text-xs text-gray-500 font-mono">Weight equivalent: {fmt(managerAccepted.weightKg)} kg</p>
        </div>
      </div>

      <div className="bg-white p-5 rounded-2xl border border-[#DDE3DA] overflow-x-auto">
        <p className="font-bold text-[#0B3B45] mb-3">Roll Custody Transfers & Number of Rolls Acceptance</p>
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-[#F7F8F5] text-left">
              <th className="p-2">Date</th>
              <th className="p-2">Roll Type</th>
              <th className="p-2 text-right">Issued Rolls</th>
              <th className="p-2 text-right">Estimated Weight</th>
              <th className="p-2">Status</th>
              <th className="p-2">Physical Rolls Received & Confirm</th>
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
                      <AcceptForm session={session} label="Rolls Received" onAccept={(count) => handleAccept(item.id, count)} />
                    ) : (
                      <span className="text-gray-600 font-mono">Confirmed: <strong>{item.physicalCount} rolls</strong> by {item.confirmedBy}</span>
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

function AcceptForm({ session, label = "Physical Count", onAccept }) {
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
        placeholder={label}
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
function PackingModule({ data, mutate, session, showToast }) {
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
  const managerBags = useMemo(() => computeManagerAcceptedBags(data), [data]);

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
        <p className="text-2xl font-mono font-bold text-[#E8A23D]">{fmt(managerBags.remainingBags, 0)} pcs</p>
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
function ProductionModule({ data, mutate, session, showToast }) {
  const managerRolls = useMemo(() => computeManagerAcceptedRolls(data), [data]);
  const managerBags = useMemo(() => computeManagerAcceptedBags(data), [data]);

  const [operatorName, setOperatorName] = useState("");
  const [machineUnit, setMachineUnit] = useState("Machine 1 - Koyo Cutting Line");
  const [rollTypeId, setRollTypeId] = useState(data.rollTypes[0]?.id || "");
  const [rollsUsedCount, setRollsUsedCount] = useState("1");
  const [weightUsed, setWeightUsed] = useState("");
  const [bagsUsedQty, setBagsUsedQty] = useState("");
  const [actualBags, setActualBags] = useState("");
  const [leakage, setLeakage] = useState("0");
  const [freeBags, setFreeBags] = useState("0");

  useEffect(() => {
    if ((data.rollTypes || []).length > 0 && !rollTypeId) {
      setRollTypeId(data.rollTypes[0].id);
    }
  }, [data.rollTypes, rollTypeId]);

  const selectedType = (data.rollTypes || []).find(t => t.id === rollTypeId);
  const autoWeight = selectedType ? Number(rollsUsedCount || 0) * selectedType.standardWeightKg : 25;

  const canProduce = managerRolls.rollsCount > 0 && managerBags.remainingBags > 0;

  const handleRunProduction = (e) => {
    e.preventDefault();
    if (!canProduce) {
      showToast("PRODUCTION BLOCKED: Rolls or Packing Bags not available in manager floor inventory!", "warn");
      return;
    }

    if (!operatorName.trim()) {
      showToast("Please specify the Machine Operator Name!", "warn");
      return;
    }

    const rollCountNum = Number(rollsUsedCount);
    const weightUsedNum = weightUsed ? Number(weightUsed) : autoWeight;

    if (rollCountNum <= 0 || weightUsedNum <= 0 || Number(actualBags) <= 0 || Number(bagsUsedQty) <= 0) {
      showToast("Please enter positive valid operational figures!", "warn");
      return;
    }

    if (rollCountNum > managerRolls.rollsCount) {
      showToast(`Cannot use more rolls than available (${managerRolls.rollsCount} rolls)`, "warn");
      return;
    }

    if (Number(bagsUsedQty) > managerBags.remainingBags) {
      showToast(`Cannot use more packing bags than available (${managerBags.remainingBags} pcs)`, "warn");
      return;
    }

    const netProduced = Math.max(0, Number(actualBags) - Number(leakage || 0) - Number(freeBags || 0));

    mutate((prev) => ({
      ...prev,
      productionRuns: [
        {
          id: uid(),
          date: todayISO(),
          operatorName: operatorName.trim(),
          machineUnit,
          rollTypeId,
          rollsUsedCount: rollCountNum,
          weightUsedKg: weightUsedNum,
          bagsUsedQty: Number(bagsUsedQty),
          actualBags: Number(actualBags),
          leakageBags: Number(leakage || 0),
          freeBags: Number(freeBags || 0),
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
          reason: `Production Run - ${machineUnit} (${operatorName})`,
          usedBy: session.name,
        },
        ...(prev.bagUsage || []),
      ],
    }), "Recorded Production Run", `${netProduced} sellable sachet bags produced by ${operatorName}`);

    setOperatorName(""); setWeightUsed(""); setActualBags(""); setLeakage("0"); setFreeBags("0"); setBagsUsedQty("");
    showToast("Production Machine Run Logged Successfully!");
  };

  return (
    <div className="space-y-5">
      <div>
        <p className="font-display font-800 text-2xl text-[#0B3B45]">Production Floor Execution</p>
        <p className="text-sm text-[#5B6B68]">Record water cutting machine operators, rolls used (count & weight), packing bags, burst leakages, and free bags.</p>
      </div>

      {!canProduce ? (
        <div className="bg-[#FBEAE5] border border-[#EFC3B7] p-5 rounded-2xl flex items-center gap-3 text-[#C4472F]">
          <AlertTriangle size={24} className="shrink-0" />
          <div>
            <p className="font-bold text-sm">PRODUCTION RUN BLOCKED</p>
            <p className="text-xs">0 accepted Film Rolls or 0 accepted Packing Bags in Manager floor stock. Accept pending transfers first.</p>
          </div>
        </div>
      ) : (
        <form onSubmit={handleRunProduction} className="bg-[#FFFFFF] p-5 rounded-2xl border border-[#DDE3DA] space-y-4 max-w-2xl">
          <p className="font-bold text-[#0B3B45] text-base border-b pb-2">Log Machine & Operator Production Run</p>

          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-500">Water Cutting Machine Operator Name *</label>
              <input value={operatorName} onChange={(e) => setOperatorName(e.target.value)} placeholder="e.g. Emmanuel Addo" className="inp" required />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500">Production Machine Unit</label>
              <select value={machineUnit} onChange={(e) => setMachineUnit(e.target.value)} className="inp">
                <option value="Machine 1 - Koyo Cutting Line">Machine 1 - Koyo Cutting Line</option>
                <option value="Machine 2 - High Speed Sachet Line">Machine 2 - High Speed Sachet Line</option>
                <option value="Machine 3 - Secondary Line">Machine 3 - Secondary Line</option>
              </select>
            </div>
          </div>

          <div className="grid sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-500">Film Roll Type</label>
              <select value={rollTypeId} onChange={(e) => setRollTypeId(e.target.value)} className="inp" required>
                {(data.rollTypes || []).map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500">Rolls Used (Roll Count) *</label>
              <input type="number" min="1" max={managerRolls.rollsCount} value={rollsUsedCount} onChange={(e) => setRollsUsedCount(e.target.value)} placeholder="1" className="inp" required />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500">Total Roll Weight (kg)</label>
              <input type="number" min="0.1" step="0.1" value={weightUsed || autoWeight} onChange={(e) => setWeightUsed(e.target.value)} placeholder={`${autoWeight} kg`} className="inp" required />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-500">Packing Bags Used (pcs) *</label>
              <input type="number" min="1" max={managerBags.remainingBags} value={bagsUsedQty} onChange={(e) => setBagsUsedQty(e.target.value)} placeholder="e.g. 30" className="inp" required />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500">Gross Sachet Water Bags Produced *</label>
              <input type="number" min="1" value={actualBags} onChange={(e) => setActualBags(e.target.value)} placeholder="e.g. 900" className="inp" required />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-3 bg-[#F7F8F5] p-3 rounded-xl border border-[#EDEFEA]">
            <div>
              <label className="text-xs font-semibold text-red-700">Burst / Leakage Bags</label>
              <input type="number" min="0" value={leakage} onChange={(e) => setLeakage(e.target.value)} className="inp" required />
            </div>
            <div>
              <label className="text-xs font-semibold text-amber-700">Free / Promo / Sample Bags</label>
              <input type="number" min="0" value={freeBags} onChange={(e) => setFreeBags(e.target.value)} className="inp" required />
            </div>
          </div>

          <button type="submit" className="btn-primary w-full py-2.5">Record Production Run & Update Stock</button>
        </form>
      )}

      <div className="bg-white p-5 rounded-2xl border border-[#DDE3DA] overflow-x-auto">
        <p className="font-bold text-[#0B3B45] mb-3">Comprehensive Production Logs</p>
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-[#F7F8F5] text-left">
              <th className="p-2">Date</th>
              <th className="p-2">Operator</th>
              <th className="p-2">Machine Unit</th>
              <th className="p-2 text-right">Rolls (Count & Weight)</th>
              <th className="p-2 text-right">Bags Used</th>
              <th className="p-2 text-right">Gross Bags</th>
              <th className="p-2 text-right">Leakages</th>
              <th className="p-2 text-right">Free Bags</th>
              <th className="p-2 text-right">Net Available Bags</th>
            </tr>
          </thead>
          <tbody>
            {(data.productionRuns || []).map((r) => (
              <tr key={r.id} className="border-t">
                <td className="p-2 font-mono">{r.date}</td>
                <td className="p-2 font-semibold text-[#0B3B45]">{r.operatorName || r.recordedBy}</td>
                <td className="p-2 text-gray-600">{r.machineUnit || "Main Machine"}</td>
                <td className="p-2 text-right font-mono font-bold">{r.rollsUsedCount || 1} rolls ({r.weightUsedKg} kg)</td>
                <td className="p-2 text-right font-mono">{r.bagsUsedQty || "N/A"} pcs</td>
                <td className="p-2 text-right font-mono">{r.actualBags}</td>
                <td className="p-2 text-right font-mono text-red-600 font-bold">{r.leakageBags || 0}</td>
                <td className="p-2 text-right font-mono text-amber-600 font-bold">{r.freeBags || 0}</td>
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
/*  PRINTABLE RECEIPT MODAL                                                */
/* ---------------------------------------------------------------------- */
function ReceiptModal({ sale, companyName, driversList = [], onClose }) {
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
              <span>{companyName || "Mattbees Water Services"}</span>
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
              <div className="flex justify-between text-left text-amber-700 font-bold">
                <span>Free / Promo Bags (Courtesy)</span>
                <span>{sale.freeBags} bags</span>
              </div>
            )}
            {sale.leakageBags > 0 && (
              <div className="flex justify-between text-left text-red-700 font-bold">
                <span>Sales / Supply Leakages</span>
                <span>{sale.leakageBags} bags</span>
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
/*  SALES & BANK DEPOSIT MODULE WITH LEAKAGES & CASHIER RECEIPT CHOICE     */
/* ---------------------------------------------------------------------- */
function SalesModule({ data, mutate, session, showToast }) {
  const driversList = useMemo(() => (data.users || []).filter((u) => u.role === "driver"), [data.users]);
  const finished = useMemo(() => computeFinishedGoods(data), [data]);
  const cashAvailable = useMemo(() => computeCashBalance(data), [data]);

  const [driverId, setDriverId] = useState(driversList[0]?.id || "factory");
  const [customer, setCustomer] = useState("");
  const [bagsSold, setBagsSold] = useState("");
  const [freeBagsGiven, setFreeBagsGiven] = useState("0");
  const [leakageBagsGiven, setLeakageBagsGiven] = useState("0");
  const [paymentMethod, setPaymentMethod] = useState("cash");

  const [depositAmount, setDepositAmount] = useState("");
  const [bankName, setBankName] = useState("");

  const [activeReceiptSale, setActiveReceiptSale] = useState(null);

  const handleSale = (e, shouldPrintReceipt = true) => {
    if (e) e.preventDefault();

    const totalBagsDeducted = Number(bagsSold || 0) + Number(freeBagsGiven || 0) + Number(leakageBagsGiven || 0);

    if (finished.availableForSale <= 0) {
      showToast("SALES DISALLOWED: Zero sachet bags available in inventory!", "warn");
      return;
    }

    if (totalBagsDeducted <= 0) return showToast("Enter a valid quantity of sold, free, or leakage bags!", "warn");

    if (totalBagsDeducted > finished.availableForSale) {
      showToast(`Cannot issue/deduct more bags than available in stock (${finished.availableForSale} bags)`, "warn");
      return;
    }

    const pricePerBag = data.settings.pricePerBag || 5.0;
    const totalAmount = Number(bagsSold || 0) * pricePerBag;

    const newSale = {
      id: uid(),
      date: todayISO(),
      timestamp: new Date().toISOString(),
      driverId: driverId === "factory" ? null : driverId,
      customer: customer || "Direct Customer",
      bagsSold: Number(bagsSold || 0),
      freeBags: Number(freeBagsGiven || 0),
      leakageBags: Number(leakageBagsGiven || 0),
      pricePerBag,
      totalAmount,
      amountPaid: totalAmount,
      method: paymentMethod,
      recordedBy: session.name,
    };

    mutate((prev) => ({
      ...prev,
      sales: [newSale, ...(prev.sales || [])],
    }), "Recorded Sale", `${bagsSold} sold + ${freeBagsGiven} free + ${leakageBagsGiven} leakage bags to ${customer || "Direct Customer"}`);

    setBagsSold(""); setFreeBagsGiven("0"); setLeakageBagsGiven("0"); setCustomer("");
    showToast("Sale Recorded Successfully!");

    if (shouldPrintReceipt) {
      setActiveReceiptSale(newSale);
    }
  };

  const handleBankDeposit = (e) => {
    e.preventDefault();
    const depVal = Number(depositAmount);

    if (depVal <= 0) return showToast("Invalid deposit amount!", "warn");

    if (depVal > cashAvailable) {
      showToast(`DEPOSIT REJECTED: Deposit (${fmtGHS(depVal)}) exceeds cash on hand (${fmtGHS(cashAvailable)})!`, "warn");
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
        <p className="font-display font-800 text-2xl text-[#0B3B45]">Sales, Drivers & Cash</p>
        <p className="text-sm text-[#5B6B68]">Record paid sales, supply leakages, and free promotional bags, manage receipts, and reconcile cash deposits.</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-[#DDE3DA] space-y-4">
          <div className="flex justify-between items-center border-b pb-2">
            <p className="font-bold text-[#0B3B45]">Record Sachet Water Sale, Supply Leakage & Free Bags</p>
            <span className="text-xs font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded">
              Stock: {fmt(finished.availableForSale, 0)} bags
            </span>
          </div>

          {finished.availableForSale <= 0 ? (
            <div className="bg-[#FBEAE5] text-[#C4472F] p-3 rounded-lg text-xs font-semibold">
              Sales locked! Zero sachet bags available in inventory.
            </div>
          ) : (
            <form onSubmit={(e) => e.preventDefault()} className="space-y-3">
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

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div>
                  <label className="text-xs font-semibold text-gray-500">Paid Bags</label>
                  <input type="number" min="0" value={bagsSold} onChange={(e) => setBagsSold(e.target.value)} placeholder="100" className="inp" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-amber-700">Free Bags</label>
                  <input type="number" min="0" value={freeBagsGiven} onChange={(e) => setFreeBagsGiven(e.target.value)} placeholder="0" className="inp" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-red-700">Supply Leakage</label>
                  <input type="number" min="0" value={leakageBagsGiven} onChange={(e) => setLeakageBagsGiven(e.target.value)} placeholder="0" className="inp" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500">Unit Price</label>
                  <input value={fmtGHS(data.settings.pricePerBag)} disabled className="inp" />
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

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={(e) => handleSale(e, true)}
                  className="btn-primary flex-1 py-2.5"
                >
                  <Printer size={16} /> Save & Print Receipt
                </button>
                <button
                  type="button"
                  onClick={(e) => handleSale(e, false)}
                  className="btn-success flex-1 py-2.5"
                >
                  <Save size={16} /> Save Only (No Receipt)
                </button>
              </div>
            </form>
          )}
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#DDE3DA] space-y-4">
          <div className="flex justify-between items-center border-b pb-2">
            <p className="font-bold text-[#0B3B45]">Matched Bank Deposit</p>
            <span className="text-xs font-bold text-blue-800 bg-blue-100 px-2 py-0.5 rounded">
              Cash Available: {fmtGHS(cashAvailable)}
            </span>
          </div>

          <form onSubmit={handleBankDeposit} className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-gray-500">Deposit Amount (GH₵)</label>
              <input type="number" min="0.01" step="0.01" max={cashAvailable} value={depositAmount} onChange={(e) => setDepositAmount(e.target.value)} placeholder="e.g. 500" className="inp" required />
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-500">Destination Bank Name / Ref</label>
              <input value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="e.g. GCB Bank - Accra Branch" className="inp" required />
            </div>

            <button type="submit" className="btn-success w-full py-2.5">Deposit & Match Cash Balance</button>
          </form>
        </div>
      </div>

      <div className="bg-white p-5 rounded-2xl border border-[#DDE3DA] overflow-x-auto">
        <p className="font-bold text-[#0B3B45] mb-3">Recent Sales Transactions, Leakages & Free Bags</p>
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-[#F7F8F5] text-left">
              <th className="p-2">Date/Time</th>
              <th className="p-2">Customer</th>
              <th className="p-2">Channel / Driver</th>
              <th className="p-2 text-right">Bags Sold</th>
              <th className="p-2 text-right">Free Bags</th>
              <th className="p-2 text-right">Supply Leakage</th>
              <th className="p-2 text-right">Total Amount</th>
              <th className="p-2">Method</th>
              <th className="p-2 text-center">Receipt</th>
            </tr>
          </thead>
          <tbody>
            {(data.sales || []).map((s) => {
              const drv = driversList.find((d) => d.id === s.driverId);
              return (
                <tr key={s.id} className="border-t">
                  <td className="p-2 font-mono">{s.date}</td>
                  <td className="p-2 font-semibold">{s.customer}</td>
                  <td className="p-2 text-blue-900 font-semibold">{drv ? drv.name : "Direct Factory Sale"}</td>
                  <td className="p-2 text-right font-mono font-bold">{s.bagsSold}</td>
                  <td className="p-2 text-right font-mono text-amber-600 font-bold">{s.freeBags || 0}</td>
                  <td className="p-2 text-right font-mono text-red-600 font-bold">{s.leakageBags || 0}</td>
                  <td className="p-2 text-right font-mono font-bold text-green-800">{fmtGHS(s.totalAmount)}</td>
                  <td className="p-2 uppercase font-mono text-[10px]">{s.method}</td>
                  <td className="p-2 text-center">
                    <button
                      type="button"
                      onClick={() => setActiveReceiptSale(s)}
                      className="px-2 py-1 bg-[#EAF3F1] hover:bg-[#1C8C9E] hover:text-white rounded text-[#0B3B45] font-bold text-[10px] flex items-center justify-center gap-1 mx-auto"
                    >
                      <Receipt size={12} /> View
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {activeReceiptSale && (
        <ReceiptModal
          sale={activeReceiptSale}
          companyName={data.settings?.companyName}
          driversList={driversList}
          onClose={() => setActiveReceiptSale(null)}
        />
      )}
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/*  REPORTS MODULE                                                        */
/* ---------------------------------------------------------------------- */
function ReportsModule({ data, session }) {
  const driversList = useMemo(() => (data.users || []).filter((u) => u.role === "driver"), [data.users]);
  const [selectedDriverId, setSelectedDriverId] = useState("all");

  const isDriver = session.role === "driver";
  const effectiveDriverId = isDriver ? session.id : selectedDriverId;

  const filteredSales = useMemo(() => {
    const list = data.sales || [];
    if (effectiveDriverId === "all") return list;
    if (effectiveDriverId === "factory") return list.filter((s) => !s.driverId);
    return list.filter((s) => s.driverId === effectiveDriverId);
  }, [data.sales, effectiveDriverId]);

  const totalBagsSold = useMemo(() => filteredSales.reduce((s, r) => s + (r.bagsSold || 0), 0), [filteredSales]);
  const totalFreeBags = useMemo(() => filteredSales.reduce((s, r) => s + (r.freeBags || 0), 0), [filteredSales]);
  const totalLeakageBags = useMemo(() => filteredSales.reduce((s, r) => s + (r.leakageBags || 0), 0), [filteredSales]);
  const totalRevenue = useMemo(() => filteredSales.reduce((s, r) => s + (r.totalAmount || 0), 0), [filteredSales]);

  const totalExpenses = useMemo(() => {
    const m = (data.expenses || []).reduce((s, e) => s + (e.amount || 0), 0);
    const a = (data.adminExpenses || []).reduce((s, e) => s + (e.amount || 0), 0);
    return m + a;
  }, [data.expenses, data.adminExpenses]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <p className="font-display font-800 text-2xl text-[#0B3B45]">Operational & Sales Reports</p>
          <p className="text-sm text-[#5B6B68]">Driver delivery summaries, overall revenue metrics, and performance analytics.</p>
        </div>
        <button onClick={() => window.print()} className="btn-primary py-1.5 px-3 text-xs bg-[#1C8C9E] no-print">
          <Printer size={14} /> Print Report
        </button>
      </div>

      {!isDriver && (
        <div className="bg-white p-4 rounded-xl border border-[#DDE3DA] flex items-center gap-3">
          <Truck size={18} className="text-[#0B3B45]" />
          <div className="flex-1">
            <label className="text-xs font-semibold text-gray-500 uppercase">Filter Sales by Driver Channel</label>
            <select
              value={selectedDriverId}
              onChange={(e) => setSelectedDriverId(e.target.value)}
              className="inp mt-1 max-w-sm"
            >
              <option value="all">All Sales (Factory Gate + All Delivery Drivers)</option>
              <option value="factory">Direct Factory Gate Sales Only</option>
              {driversList.map((d) => (
                <option key={d.id} value={d.id}>{d.name} {d.truckNo ? `(${d.truckNo})` : ""}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={PieChart} label="Total Gross Revenue" value={fmtGHS(totalRevenue)} accent="#2A6E4A" />
        <StatCard icon={Droplets} label="Paid Sachet Bags Sold" value={`${fmt(totalBagsSold, 0)} bags`} accent="#0B3B45" />
        <StatCard icon={Tag} label="Free / Courtesy Bags" value={`${fmt(totalFreeBags, 0)} bags`} accent="#E8A23D" />
        <StatCard icon={AlertTriangle} label="Recorded Supply Leakages" value={`${fmt(totalLeakageBags, 0)} bags`} accent="#C4472F" />
      </div>

      <div id="printable-area" className="bg-white p-5 rounded-2xl border border-[#DDE3DA] space-y-4">
        <div className="flex justify-between items-center border-b pb-2">
          <p className="font-bold text-[#0B3B45] text-base">Driver & Channel Sales Ledger</p>
          <p className="text-xs text-gray-500 font-mono">Records Count: {filteredSales.length}</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-[#F7F8F5] text-left">
                <th className="p-2">Date</th>
                <th className="p-2">Customer</th>
                <th className="p-2">Driver / Truck</th>
                <th className="p-2 text-right">Bags Sold</th>
                <th className="p-2 text-right">Free Bags</th>
                <th className="p-2 text-right">Leakage</th>
                <th className="p-2 text-right">Gross Amount</th>
                <th className="p-2">Payment Method</th>
              </tr>
            </thead>
            <tbody>
              {filteredSales.length === 0 ? (
                <tr><td colSpan="8" className="p-4 text-center text-gray-400">No sales transactions matched this filter.</td></tr>
              ) : (
                filteredSales.map((s) => {
                  const drv = driversList.find((d) => d.id === s.driverId);
                  return (
                    <tr key={s.id} className="border-t">
                      <td className="p-2 font-mono">{s.date}</td>
                      <td className="p-2 font-semibold">{s.customer}</td>
                      <td className="p-2 text-blue-900 font-semibold">{drv ? drv.name : "Factory Gate"}</td>
                      <td className="p-2 text-right font-mono font-bold">{s.bagsSold}</td>
                      <td className="p-2 text-right font-mono text-amber-600">{s.freeBags || 0}</td>
                      <td className="p-2 text-right font-mono text-red-600">{s.leakageBags || 0}</td>
                      <td className="p-2 text-right font-mono font-bold text-green-800">{fmtGHS(s.totalAmount)}</td>
                      <td className="p-2 uppercase font-mono text-[10px]">{s.method}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/*  ADMIN MANAGEMENT MODULE                                                */
/* ---------------------------------------------------------------------- */
function AdminManagementModule({ data, mutate, showToast }) {
  const users = data.users || [];
  const categories = data.expenseCategories || DEFAULT_EXPENSE_CATEGORIES;

  const [userName, setUserName] = useState("");
  const [userRole, setUserRole] = useState("driver");
  const [userPassword, setUserPassword] = useState("123");
  const [userEmail, setUserEmail] = useState("");
  const [truckNo, setTruckNo] = useState("");

  const [unitPrice, setUnitPrice] = useState(data.settings?.pricePerBag || 5.0);
  const [newCategory, setNewCategory] = useState("");

  const handleCreateUser = (e) => {
    e.preventDefault();
    if (!userName.trim()) return showToast("User name required!", "warn");

    const newUser = {
      id: uid(),
      name: userName.trim(),
      role: userRole,
      password: userPassword || "123",
      email: userEmail.trim() || undefined,
      truckNo: userRole === "driver" ? truckNo.trim() : undefined,
    };

    mutate((prev) => ({
      ...prev,
      users: [...(prev.users || []), newUser],
    }), "Created System User", `${userName} (${userRole})`);

    setUserName(""); setUserEmail(""); setTruckNo(""); setUserPassword("123");
    showToast("System User Created Successfully!");
  };

  const handleDeleteUser = (userId) => {
    if (users.length <= 1) return showToast("Cannot delete the only system user!", "warn");
    if (window.confirm("Are you sure you want to remove this system account?")) {
      mutate((prev) => ({
        ...prev,
        users: (prev.users || []).filter((u) => u.id !== userId),
      }), "Deleted User", `User ID: ${userId}`);
      showToast("User removed successfully.");
    }
  };

  const handleSavePrice = (e) => {
    e.preventDefault();
    const val = Number(unitPrice);
    if (val <= 0) return showToast("Price must be greater than zero!", "warn");

    mutate((prev) => ({
      ...prev,
      settings: {
        ...(prev.settings || {}),
        pricePerBag: val,
      },
    }), "Updated Price Per Bag", `GH₵ ${val.toFixed(2)}`);

    showToast("Unit Selling Price Saved!");
  };

  const handleAddCategory = (e) => {
    e.preventDefault();
    if (!newCategory.trim()) return;

    if (categories.includes(newCategory.trim())) {
      return showToast("Category already exists!", "warn");
    }

    mutate((prev) => ({
      ...prev,
      expenseCategories: [...(prev.expenseCategories || DEFAULT_EXPENSE_CATEGORIES), newCategory.trim()],
    }), "Added Expense Category", newCategory.trim());

    setNewCategory("");
    showToast("Expense Category Added!");
  };

  const handleRemoveCategory = (cat) => {
    if (window.confirm(`Remove category "${cat}"?`)) {
      mutate((prev) => ({
        ...prev,
        expenseCategories: (prev.expenseCategories || []).filter((c) => c !== cat),
      }), "Removed Expense Category", cat);
      showToast("Category removed.");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="font-display font-800 text-2xl text-[#0B3B45]">Admin & Role Management</p>
        <p className="text-sm text-[#5B6B68]">Manage accounts, price settings, and system expense categories.</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <form onSubmit={handleCreateUser} className="bg-white p-5 rounded-2xl border border-[#DDE3DA] space-y-3">
          <div className="flex items-center gap-2 border-b pb-2">
            <UserPlus className="text-[#0B3B45]" size={18} />
            <p className="font-bold text-[#0B3B45]">Add New System Account</p>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500">Full Name *</label>
            <input value={userName} onChange={(e) => setUserName(e.target.value)} placeholder="e.g. Samuel Yaw" className="inp" required />
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500">Assign Role</label>
            <select value={userRole} onChange={(e) => setUserRole(e.target.value)} className="inp">
              <option value="owner">Business Owner (Super Admin)</option>
              <option value="manager">Manager</option>
              <option value="cashier">Plant Cashier</option>
              <option value="driver">Delivery Driver</option>
            </select>
          </div>

          {userRole === "driver" && (
            <div>
              <label className="text-xs font-semibold text-gray-500">Truck / Vehicle Reg No.</label>
              <input value={truckNo} onChange={(e) => setTruckNo(e.target.value)} placeholder="e.g. GT-1022-22" className="inp" />
            </div>
          )}

          <div>
            <label className="text-xs font-semibold text-gray-500">Email Address (Optional for Reset)</label>
            <input type="email" value={userEmail} onChange={(e) => setUserEmail(e.target.value)} placeholder="user@gmail.com" className="inp" />
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500">Password</label>
            <input type="text" value={userPassword} onChange={(e) => setUserPassword(e.target.value)} placeholder="123" className="inp" required />
          </div>

          <button type="submit" className="btn-primary w-full py-2"><Plus size={15} /> Create Account</button>
        </form>

        <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-[#DDE3DA] space-y-3">
          <p className="font-bold text-[#0B3B45] text-base border-b pb-2">Active Accounts & Access Control</p>
          <div className="overflow-x-auto max-h-72">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-[#F7F8F5] text-left">
                  <th className="p-2">Name</th>
                  <th className="p-2">Role</th>
                  <th className="p-2">Email / Truck</th>
                  <th className="p-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-t">
                    <td className="p-2 font-semibold text-[#0B3B45]">{u.name}</td>
                    <td className="p-2 uppercase font-mono text-[10px]"><span className="px-1.5 py-0.5 bg-gray-100 rounded">{u.role}</span></td>
                    <td className="p-2 text-gray-500">{u.truckNo ? `Truck: ${u.truckNo}` : u.email || "N/A"}</td>
                    <td className="p-2 text-right">
                      <button onClick={() => handleDeleteUser(u.id)} className="text-red-600 hover:text-red-800 font-bold text-[11px]">
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <form onSubmit={handleSavePrice} className="bg-white p-5 rounded-2xl border border-[#DDE3DA] space-y-3">
          <div className="flex items-center gap-2 border-b pb-2">
            <Tag className="text-[#0B3B45]" size={18} />
            <p className="font-bold text-[#0B3B45]">Global Price Configuration</p>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500">Unit Sale Price Per Sachet Bag (GH₵)</label>
            <input type="number" min="0.1" step="0.5" value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)} className="inp" required />
          </div>
          <button type="submit" className="btn-primary w-full py-2">Update Bag Selling Price</button>
        </form>

        <div className="bg-white p-5 rounded-2xl border border-[#DDE3DA] space-y-3">
          <div className="flex items-center gap-2 border-b pb-2">
            <Settings2 className="text-[#0B3B45]" size={18} />
            <p className="font-bold text-[#0B3B45]">Expense Categories Config</p>
          </div>
          <form onSubmit={handleAddCategory} className="flex gap-2">
            <input value={newCategory} onChange={(e) => setNewCategory(e.target.value)} placeholder="New Expense Name" className="inp" />
            <button type="submit" className="btn-primary shrink-0 py-2">Add</button>
          </form>

          <div className="flex flex-wrap gap-1.5 pt-2 max-h-36 overflow-y-auto">
            {categories.map((c) => (
              <span key={c} className="px-2.5 py-1 bg-[#F7F8F5] border rounded-lg text-xs flex items-center gap-1.5">
                <span>{c}</span>
                <button type="button" onClick={() => handleRemoveCategory(c)} className="text-red-500 hover:text-red-700 font-bold text-xs">×</button>
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}