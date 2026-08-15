import React, { useState, useEffect, useMemo, useCallback } from 'react'
import viteLogo from './assets/vite.svg'
import { openDB } from 'https://unpkg.com';

import { createClient } from '@supabase/supabase-js'
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { createClient } from '@supabase/supabase-[#2A6E4A]';
import {
  Droplets, Warehouse, PackageOpen, Factory, Wallet, FileBarChart, ShieldCheck,
  LogOut, Plus, ChevronRight, AlertTriangle, CheckCircle2, Wifi, WifiOff,
  Users, Settings2, Scale, TrendingUp, TrendingDown, ClipboardList, X, Lock,
  Printer, Calendar, Menu, Bell, Pencil, Truck, Check, KeyRound, Mail, Receipt, Building, DollarSign, RotateCcw, Trash2, Sun, Moon, AlertCircle
} from "lucide-react";

/* ---------------------------------------------------------------------- */
/*  SUPABASE CLIENT & SYNC ENGINE                                          */
/* ---------------------------------------------------------------------- */
const SUPABASE_URL = import.meta.env?.VITE_SUPABASE_URL || "";
const SUPABASE_ANON_KEY = import.meta.env?.VITE_SUPABASE_ANON_KEY || "";

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
/*  STORAGE ENGINE & DEFAULT DATA STRUCTURE                                */
/* ---------------------------------------------------------------------- */
const STORAGE_KEY = "pureledger-ghana-erp-db";

const emptyData = {
  users: [
    { id: "u1", name: "Super Admin", role: "owner", password: "123456", email: "admin@mattbeeswater.com" },
    { id: "u2", name: "Factory Manager", role: "manager", password: "123456" },
    { id: "u3", name: "Plant Cashier", role: "cashier", password: "123456" },
    { id: "d1", name: "Kwame (Truck GT-1022-22)", role: "driver", password: "123456", truckNo: "GT-1022-22" },
  ],
  businessDetails: {
    name: "Mattbees Water Services",
    address: "Accra, Ghana",
    phone: "+233 24 000 0000",
    tin: "C0000000000",
    isRegistered: true,
  },
  rollTypes: [{ id: "rt1", name: "Standard 25kg Film Roll", standardWeightKg: 25 }],
  intake: [],
  issuance: [],
  bagTypes: [{ id: "bt1", name: "Standard Outer Packing Bag", capacity: 30 }],
  bagIntake: [],
  bagIssuance: [],
  bagUsage: [],
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
    companyName: "Mattbees Water Services",
  },
  auditLog: [],
  superAdminRegistered: true,
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
      console.warn("Supabase load failed, using local storage fallback", e);
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
  owner: { label: "Business Owner / Super Admin", desc: "Full control · Financials · Roles · System Admin", icon: ShieldCheck },
  manager: { label: "Factory Manager", desc: "Operations · Production Floor · Roll & Bag Counts", icon: Users },
  cashier: { label: "Plant Cashier", desc: "Direct Sales & Payment Collections", icon: Wallet },
  driver: { label: "Delivery Driver", desc: "Distribution Operations", icon: Truck },
};

/* ---------------------------------------------------------------------- */
/*  TOAST NOTIFICATION COMPONENT                                           */
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
/*  MAIN APPLICATION COMPONENT                                            */
/* ---------------------------------------------------------------------- */
export default function App() {
  const [session, setSession] = useState(null);
  const [data, setData] = useState(emptyData);
  const [loaded, setLoaded] = useState(false);
  const [page, setPage] = useState("dashboard");
  const [online, setOnline] = useState(navigator.onLine);
  const [toast, setToast] = useState(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
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
    setTimeout(() => setToast(null), 3200);
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
    showToast(`Welcome back, ${s.name}`);
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

  if (!loaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0B3B45]">
        <div className="flex items-center gap-3 text-[#EAF3F1]">
          <Droplets className="animate-pulse" size={28} />
          <span className="font-mono text-sm tracking-widest uppercase">Loading Mattbees Water Services ERP…</span>
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
            {page === "audit" && session.role === "owner" && (
              <AuditLog data={data} mutate={mutate} showToast={showToast} darkMode={darkMode} />
            )}
          </main>
        </div>
      </div>

      {toast && <Toast msg={toast.msg} tone={toast.tone} />}
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/*  STYLING & CSS TOOLKIT                                                 */
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
/*  LOGIN SCREEN WITH REGISTRATION & PASSWORD RESET                        */
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
      setError("Please enter a valid email address.");
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
      setError("Full Name mismatch! Type exact full name for this role.");
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
            <p className="font-mono text-[10px] text-[#5B6B68] uppercase tracking-widest mt-0.5">Sachet Water Enterprise ERP</p>
          </div>
        </div>

        {view === "register" && (
          <form onSubmit={handleRegisterSubmit} className="space-y-3">
            <div className="bg-[#EAF3F1] p-3 rounded-lg border border-[#BFDCD6] mb-2">
              <p className="text-xs font-bold text-[#0B3B45]">One-Time Super Admin Registration</p>
              <p className="text-[11px] text-[#5B6B68]">Setup primary Super Admin account to manage factory roles and security.</p>
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
              <label className="text-xs font-semibold text-[#5B6B68] uppercase">Password Verification</label>
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
                <Mail size={13} /> Reset Admin Password via Registered Email
              </button>
            </div>
          </form>
        )}

        {view === "forgot" && (
          <form onSubmit={handleForgot} className="space-y-3">
            <div className="bg-[#EAF3F1] p-3 rounded-lg border border-[#BFDCD6] mb-2">
              <p className="text-xs font-bold text-[#0B3B45]">Admin Password Recovery</p>
              <p className="text-[11px] text-[#5B6B68]">Verify using registered Admin email to set a new password.</p>
            </div>

            <div>
              <label className="text-xs font-semibold text-[#5B6B68] uppercase">Admin Email</label>
              <input
                type="email"
                value={resetEmail}
                onChange={(e) => { setResetEmail(e.target.value); setError(""); }}
                placeholder="admin@mattbeeswater.com"
                className="inp mt-1"
                required
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-[#5B6B68] uppercase">New Password (min 6 characters)</label>
              <input
                type="password"
                value={resetPassword}
                onChange={(e) => setResetPassword(e.target.value)}
                placeholder="••••••••"
                className="inp mt-1"
                required
              />
            </div>

            {error && <p className="text-xs font-semibold text-[#C4472F]">{error}</p>}

            <button type="submit" className="btn-primary w-full py-2.5 mt-2">
              Verify Email & Set New Password
            </button>

            <button
              type="button"
              onClick={() => { setView("login"); setError(""); }}
              className="w-full text-center text-xs text-gray-500 hover:underline mt-2"
            >
              Back to Sign In
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/*  SIDEBAR & TOPBAR NAVIGATION                                            */
/* ---------------------------------------------------------------------- */
function Sidebar({ page, setPage, role, onLogout, open, onClose }) {
  const items = [
    { id: "dashboard", label: "Dashboard", icon: Factory, roles: ["owner", "manager"] },
    { id: "warehouse", label: "Warehouse & Rolls", icon: Warehouse, roles: ["owner", "manager"] },
    { id: "packing", label: "Packing Bags", icon: PackageOpen, roles: ["owner", "manager"] },
    { id: "production", label: "Production Floor", icon: Droplets, roles: ["owner", "manager"] },
    { id: "sales", label: "Sales & Receipts", icon: Wallet, roles: ["owner", "manager", "cashier"] },
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

  return (
    <div className={`sticky top-0 z-20 ${darkMode ? "bg-gray-800 border-gray-700" : "bg-[#F2F4EF] border-[#DDE3DA]"} border-b px-4 sm:px-6 py-3 flex items-center justify-between`}>
      <div className="flex items-center gap-2.5">
        <button onClick={onMenuClick} className={`sm:hidden w-8 h-8 rounded-lg border ${darkMode ? "border-gray-700 bg-gray-800 text-gray-200" : "border-[#DDE3DA] bg-white text-[#0B3B45]"} flex items-center justify-center`}>
          <Menu size={16} />
        </button>
        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono font-semibold ${online ? "bg-[#DCEEE4] text-[#2A6E4A]" : "bg-[#F5E3D9] text-[#A85A2A]"}`}>
          {online ? <Wifi size={12} /> : <WifiOff size={12} />}
          <span>{online ? "ONLINE SYNCED" : "OFFLINE MODE"}</span>
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
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/*  CALCULATIONS & COMPUTATIONS                                           */
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
  return cashSales + debtCash - managerExpenses - adminExpenses;
}

/* ---------------------------------------------------------------------- */
/*  ADMIN & MANUAL ROLE MANAGEMENT MODULE                                 */
/* ---------------------------------------------------------------------- */
function AdminManagementModule({ data, mutate, showToast }) {
  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserRole, setNewUserRole] = useState("manager");
  const [newUserPassword, setNewUserPassword] = useState("");
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
    }), "Added User Role", `Assigned ${newUserName} as ${newUserRole}`);

    setNewUserName(""); setNewUserEmail(""); setNewUserPassword("");
    showToast("Role Account Created Successfully!");
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
        <p className="font-display font-800 text-2xl text-[#0B3B45]">Admin & Role Management</p>
        <p className="text-sm text-[#5B6B68]">Add system users, assign roles manually, and configure expense categories.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white p-5 rounded-2xl border border-[#DDE3DA] space-y-4">
          <p className="font-bold text-[#0B3B45] text-base">Add User & Assign Role Manually</p>
          <form onSubmit={handleAddUser} className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-gray-500">Full Name *</label>
              <input value={newUserName} onChange={(e) => setNewUserName(e.target.value)} placeholder="e.g. John Mensah" className="inp mt-1" required />
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-500">Email Address (Optional)</label>
              <input type="email" value={newUserEmail} onChange={(e) => setNewUserEmail(e.target.value)} placeholder="john@mattbeeswater.com" className="inp mt-1" />
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-500">Assign System Role *</label>
              <select value={newUserRole} onChange={(e) => setNewUserRole(e.target.value)} className="inp mt-1">
                <option value="owner">Business Owner (Super Admin)</option>
                <option value="manager">Factory Manager</option>
                <option value="cashier">Plant Cashier</option>
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
          <p className="font-bold text-[#0B3B45] text-base">Expense Categories Configuration</p>
          <form onSubmit={handleAddExpenseCategory} className="flex gap-2">
            <input value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} placeholder="e.g. Electricity & Water" className="inp" required />
            <button type="submit" className="btn-primary shrink-0 py-2">Add Category</button>
          </form>

          <div className="mt-3 space-y-1.5 max-h-56 overflow-y-auto">
            {(data.expenseCategories || []).map((cat, idx) => (
              <div key={idx} className="flex justify-between items-center p-2 bg-[#F7F8F5] rounded text-xs font-semibold">
                <span>{cat}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white p-5 rounded-2xl border border-[#DDE3DA] overflow-x-auto">
        <p className="font-bold text-[#0B3B45] mb-3 text-base">Registered System Accounts & Roles</p>
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-[#F7F8F5] text-left">
              <th className="p-2">Name</th>
              <th className="p-2">Email</th>
              <th className="p-2">Role</th>
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
                        if (window.confirm(`Delete user account for ${u.name}?`)) {
                          mutate((prev) => ({ ...prev, users: (prev.users || []).filter((x) => x.id !== u.id) }), "Deleted User", u.name);
                          showToast("User account removed!");
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
/*  DASHBOARD MODULE WITH GROUPED EXPENSES                                */
/* ---------------------------------------------------------------------- */
function Dashboard({ data, mutate, session, showToast }) {
  const isOwner = session.role === "owner";
  const finished = useMemo(() => computeFinishedGoods(data), [data]);
  const managerRollsCount = useMemo(() => computeManagerAcceptedRolls(data), [data]);
  const managerBagsQty = useMemo(() => computeManagerAcceptedBags(data), [data]);
  const cashOnHand = useMemo(() => computeCashBalance(data), [data]);

  const categories = data.expenseCategories || ["Raw Material", "Utilities", "Maintenance", "Transport & Fuel", "Salaries & Wages", "Tax & GRA", "General Admin", "Miscellaneous"];

  const [expenseDesc, setExpenseDesc] = useState("");
  const [expenseCategory, setExpenseCategory] = useState(categories[0] || "General Admin");
  const [expenseAmt, setExpenseAmt] = useState("");

  const [adminExpenseDesc, setAdminExpenseDesc] = useState("");
  const [adminExpenseCategory, setAdminExpenseCategory] = useState(categories[0] || "General Admin");
  const [adminExpenseAmt, setAdminExpenseAmt] = useState("");

  const handleLogExpense = (e) => {
    e.preventDefault();
    if (Number(expenseAmt) <= 0) return showToast("Enter a valid expense amount!", "warn");

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
    }), "Logged Manager Expense", `GH₵ ${expenseAmt} for ${expenseDesc} (${expenseCategory})`);

    setExpenseDesc(""); setExpenseAmt("");
    showToast("Expense Recorded!");
  };

  const handleLogAdminExpense = (e) => {
    e.preventDefault();
    if (Number(adminExpenseAmt) <= 0) return showToast("Enter a valid expense amount!", "warn");

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
    showToast("Admin Expense Recorded!");
  };

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

  const totalExpensesGHS = useMemo(() => {
    return Object.values(expensesByCategory).reduce((s, a) => s + a, 0);
  }, [expensesByCategory]);

  return (
    <div className="space-y-6">
      <div>
        <p className="font-display font-800 text-2xl text-[#0B3B45]">Welcome back, {session.name}</p>
        <p className="text-sm text-[#5B6B68]">Mattbees Water Operations · {isOwner ? "Super Admin Control Center" : "Manager Overview"}</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={Droplets} label="Available Sachet Bags" value={`${fmt(finished.availableForSale, 0)} bags`} accent="#2A6E4A" />
        <StatCard icon={Warehouse} label="Manager Floor Rolls" value={`${fmt(managerRollsCount, 0)} rolls`} accent="#1C8C9E" />
        <StatCard icon={PackageOpen} label="Manager Packing Bags" value={`${fmt(managerBagsQty, 0)} pcs`} accent="#E8A23D" />
        <StatCard icon={Wallet} label="Cash On Hand Balance" value={fmtGHS(cashOnHand)} accent={cashOnHand < 0 ? "#C4472F" : "#0B3B45"} />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="bg-white p-5 rounded-2xl border border-[#DDE3DA] space-y-3">
          <p className="font-bold text-[#0B3B45]">Record Expense Entry</p>
          <form onSubmit={isOwner ? handleLogAdminExpense : handleLogExpense} className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-gray-500">Expense Category</label>
              <select value={isOwner ? adminExpenseCategory : expenseCategory} onChange={(e) => isOwner ? setAdminExpenseCategory(e.target.value) : setExpenseCategory(e.target.value)} className="inp">
                {categories.map((c, i) => (
                  <option key={i} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500">Description</label>
              <input value={isOwner ? adminExpenseDesc : expenseDesc} onChange={(e) => isOwner ? setAdminExpenseDesc(e.target.value) : setExpenseDesc(e.target.value)} placeholder="e.g. Fuel for generator" className="inp" required />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500">Amount (GH₵)</label>
              <input type="number" min="0.01" step="0.01" value={isOwner ? adminExpenseAmt : expenseAmt} onChange={(e) => isOwner ? setAdminExpenseAmt(e.target.value) : setExpenseAmt(e.target.value)} placeholder="e.g. 250" className="inp" required />
            </div>
            <button type="submit" className="btn-primary w-full">Record Expense</button>
          </form>
        </div>

        <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-[#DDE3DA] space-y-4">
          <div className="flex justify-between items-center border-b pb-2">
            <p className="font-bold text-[#0B3B45] text-base">Grouped Expenses by Category</p>
            <p className="text-sm font-mono font-bold text-red-600">Total: {fmtGHS(totalExpensesGHS)}</p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {Object.entries(expensesByCategory).map(([cat, amount], idx) => (
              <div key={idx} className="p-3 bg-[#F7F8F5] rounded-xl border border-[#EDEFEA]">
                <p className="text-[10px] font-bold text-gray-500 uppercase truncate">{cat}</p>
                <p className="text-sm font-mono font-bold text-[#0B3B45] mt-1">{fmtGHS(amount)}</p>
              </div>
            ))}
          </div>

          <div className="overflow-x-auto max-h-48 pt-2">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-[#F7F8F5] text-left">
                  <th className="p-2">Date</th>
                  <th className="p-2">Category</th>
                  <th className="p-2">Description</th>
                  <th className="p-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ...(data.adminExpenses || []),
                  ...(data.expenses || []),
                ].sort((a, b) => new Date(b.date) - new Date(a.date)).map((e) => (
                  <tr key={e.id} className="border-t">
                    <td className="p-2 font-mono">{e.date}</td>
                    <td className="p-2 font-semibold text-blue-900">{e.category || "General Admin"}</td>
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
/*  WAREHOUSE & FILM ROLLS MODULE                                         */
/* ---------------------------------------------------------------------- */
function WarehouseModule({ data, mutate, session, showToast }) {
  const isOwner = session.role === "owner";
  const [tab, setTab] = useState(isOwner ? "intake" : "accept");

  return (
    <div className="space-y-5">
      <div>
        <p className="font-display font-800 text-2xl text-[#0B3B45]">Warehouse & Film Rolls</p>
        <p className="text-sm text-[#5B6B68]">Manage raw rolls intake, transfers, and manager roll acceptance in unit roll counts.</p>
      </div>

      <div className="flex gap-1 bg-white rounded-xl border border-[#DDE3DA] p-1 w-fit">
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
      typeId = uid();
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
        : [...(prev.rollTypes || []), { id: typeId, name: typeName.trim(), standardWeightKg: weightPerRoll }];

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
    showToast("Roll Intake Saved!");
  };

  return (
    <div className="grid lg:grid-cols-2 gap-4">
      <form onSubmit={handleCreateTypeAndIntake} className="bg-white p-5 rounded-2xl border border-[#DDE3DA] space-y-3">
        <p className="font-bold text-[#0B3B45]">Owner Raw Roll Intake</p>

        <div>
          <label className="text-xs font-semibold text-gray-500">Roll Category</label>
          <select value={selectedTypeId} onChange={(e) => setSelectedTypeId(e.target.value)} className="inp">
            <option value="new">+ Create New Roll Type</option>
            {(data.rollTypes || []).map((t) => (
              <option key={t.id} value={t.id}>{t.name} ({t.standardWeightKg} kg/roll)</option>
            ))}
          </select>
        </div>

        {selectedTypeId === "new" && (
          <div>
            <label className="text-xs font-semibold text-gray-500">New Roll Type Name</label>
            <input value={rollTypeName} onChange={(e) => setRollTypeName(e.target.value)} placeholder="e.g. Standard 25kg Film" className="inp" required />
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs font-semibold text-gray-500">Weight per Roll (kg)</label>
            <input type="number" min="0.1" step="0.1" value={kgPerRoll} onChange={(e) => setKgPerRoll(e.target.value)} placeholder="25" className="inp" required={selectedTypeId === "new"} disabled={selectedTypeId !== "new"} />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500">Roll Count (Quantity)</label>
            <input type="number" min="1" value={qty} onChange={(e) => setQty(e.target.value)} placeholder="10" className="inp" required />
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-gray-500">Supplier Name</label>
          <input value={supplier} onChange={(e) => setSupplier(e.target.value)} placeholder="e.g. Polytank Ghana" className="inp" />
        </div>
        <button type="submit" className="btn-primary w-full"><Plus size={15} /> Save Intake</button>
      </form>

      <div className="bg-white p-5 rounded-2xl border border-[#DDE3DA] overflow-x-auto">
        <p className="font-bold text-[#0B3B45] mb-3">Roll Stock Intake Ledger</p>
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
                <td className="p-2 text-blue-800">{r.supplier || "N/A"}</td>
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

  const handleIssue = (e) => {
    e.preventDefault();
    if (Number(qty) <= 0) return showToast("Enter a valid roll count!", "warn");

    const rType = (data.rollTypes || []).find((t) => t.id === rollTypeId);
    const weightKg = Number(qty) * (rType?.standardWeightKg || 25);

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
        },
        ...(prev.issuance || []),
      ],
    }), "Issued Rolls", `${qty} rolls issued to Manager`);

    setQty("");
    showToast("Rolls Issued to Manager!");
  };

  return (
    <div className="bg-white p-5 rounded-2xl border border-[#DDE3DA] max-w-lg space-y-4">
      <p className="font-bold text-[#0B3B45]">Issue Film Rolls to Manager</p>
      <form onSubmit={handleIssue} className="space-y-3">
        <div>
          <label className="text-xs font-semibold text-gray-500">Roll Type</label>
          <select value={rollTypeId} onChange={(e) => setRollTypeId(e.target.value)} className="inp" required>
            {(data.rollTypes || []).map((t) => (
              <option key={t.id} value={t.id}>{t.name} ({t.standardWeightKg} kg/roll)</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-500">Roll Count to Issue</label>
          <input type="number" min="1" value={qty} onChange={(e) => setQty(e.target.value)} placeholder="e.g. 5" className="inp" required />
        </div>
        <button type="submit" className="btn-primary w-full">Transfer Rolls to Manager</button>
      </form>
    </div>
  );
}

function ManagerRollAcceptanceTab({ data, mutate, session, showToast }) {
  const managerAcceptedRolls = useMemo(() => computeManagerAcceptedRolls(data), [data]);

  const handleAccept = (issuanceId, physicalCountInput) => {
    if (Number(physicalCountInput) < 0) return showToast("Count cannot be negative!", "warn");

    mutate((prev) => ({
      ...prev,
      issuance: (prev.issuance || []).map((item) =>
        item.id === issuanceId
          ? { ...item, status: "ACCEPTED", confirmedBy: session.name, physicalCount: Number(physicalCountInput) }
          : item
      ),
    }), "Accepted Roll Stock", `Confirmed ${physicalCountInput} rolls`);

    showToast("Roll Stock Accepted in Roll Count!");
  };

  return (
    <div className="space-y-4">
      <div className="bg-white p-4 rounded-xl border border-[#DDE3DA] flex justify-between items-center">
        <div>
          <p className="font-bold text-sm text-[#0B3B45]">Manager Available Floor Rolls Balance (Roll Count)</p>
          <p className="text-xs text-gray-500">Accepted physical rolls available for water production.</p>
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
              <th className="p-2">Status</th>
              <th className="p-2">Acceptance (Roll Count)</th>
            </tr>
          </thead>
          <tbody>
            {(data.issuance || []).map((item) => {
              const rType = (data.rollTypes || []).find((t) => t.id === item.rollTypeId);
              return (
                <tr key={item.id} className="border-t">
                  <td className="p-2 font-mono">{item.date}</td>
                  <td className="p-2 font-semibold">{rType?.name || "Film Roll"}</td>
                  <td className="p-2 text-right font-mono font-bold">{item.qty} rolls</td>
                  <td className="p-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${item.status === "ACCEPTED" ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"}`}>
                      {item.status}
                    </span>
                  </td>
                  <td className="p-2">
                    {item.status === "PENDING" ? (
                      <AcceptForm session={session} onAccept={(count) => handleAccept(item.id, count)} placeholder="Rolls Count" />
                    ) : (
                      <span className="text-gray-500 font-mono font-bold">{item.physicalCount} rolls confirmed</span>
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
  const [cnt, setCnt] = useState("");
  return (
    <div className="flex gap-1 items-center">
      <input type="number" min="1" value={cnt} onChange={(e) => setCnt(e.target.value)} placeholder={placeholder} className="inp py-1 text-xs w-28" required />
      <button type="button" onClick={() => { if (Number(cnt) > 0) onAccept(cnt); }} className="btn-success text-xs py-1 px-2">Accept</button>
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

      <div className="flex gap-1 bg-white rounded-xl border border-[#DDE3DA] p-1 w-fit">
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
      bId = uid();
    } else {
      const existing = (data.bagTypes || []).find((t) => t.id === selectedBagTypeId);
      if (existing) nameToSave = existing.name;
    }

    mutate((prev) => ({
      ...prev,
      bagTypes: (prev.bagTypes || []).some((t) => t.id === bId) ? prev.bagTypes : [...(prev.bagTypes || []), { id: bId, name: nameToSave.trim() }],
      bagIntake: [{ id: uid(), date: todayISO(), bagTypeId: bId, supplier, qty: Number(qty) }, ...(prev.bagIntake || [])],
    }), "Bag Intake Recorded", `${qty} pcs ${nameToSave}`);

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
            <input value={typeName} onChange={(e) => setTypeName(e.target.value)} placeholder="e.g. 30-Sachet Outer Bag" className="inp" required />
          </div>
        )}

        <div>
          <label className="text-xs font-semibold text-gray-500">Quantity (pcs)</label>
          <input type="number" min="1" value={qty} onChange={(e) => setQty(e.target.value)} placeholder="500" className="inp" required />
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-500">Supplier Name</label>
          <input value={supplier} onChange={(e) => setSupplier(e.target.value)} placeholder="e.g. Ghana Pack Ltd" className="inp" />
        </div>
        <button type="submit" className="btn-primary w-full">Save Bag Intake</button>
      </form>

      <div className="bg-white p-5 rounded-2xl border border-[#DDE3DA] overflow-x-auto">
        <p className="font-bold text-[#0B3B45] mb-3">Packing Bags Intake Ledger</p>
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
                <td className="p-2 text-blue-800">{r.supplier || "N/A"}</td>
                <td className="p-2 text-right font-mono font-bold">{r.qty} pcs</td>
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
        },
        ...(prev.bagIssuance || []),
      ],
    }), "Issued Bags", `${qty} pcs issued to Manager`);

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
          <label className="text-xs font-semibold text-gray-500">Quantity to Issue (pcs)</label>
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

    mutate((prev) => ({
      ...prev,
      bagIssuance: (prev.bagIssuance || []).map((item) =>
        item.id === issuanceId
          ? { ...item, status: "ACCEPTED", confirmedBy: session.name, physicalCount: Number(physicalCountInput) }
          : item
      ),
    }), "Accepted Bag Stock", `Confirmed ${physicalCountInput} bags`);

    showToast("Packing Bags Accepted!");
  };

  return (
    <div className="space-y-4">
      <div className="p-4 rounded-xl border border-[#DDE3DA] flex justify-between items-center bg-white">
        <div>
          <p className="font-bold text-sm text-[#0B3B45]">Manager Accepted Packing Bags Balance</p>
          <p className="text-xs text-gray-500">Available pcs for production outer packaging.</p>
        </div>
        <p className="text-2xl font-mono font-bold text-[#E8A23D]">{fmt(managerAcceptedQty, 0)} pcs</p>
      </div>

      <div className="bg-white p-5 rounded-2xl border border-[#DDE3DA] overflow-x-auto">
        <p className="font-bold text-[#0B3B45] mb-3">Bag Transfers & Acceptance</p>
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-[#F7F8F5] text-left">
              <th className="p-2">Date</th>
              <th className="p-2">Bag Type</th>
              <th className="p-2 text-right">Issued Qty</th>
              <th className="p-2">Status</th>
              <th className="p-2">Physical Acceptance</th>
            </tr>
          </thead>
          <tbody>
            {(data.bagIssuance || []).map((item) => {
              const bType = (data.bagTypes || []).find((t) => t.id === item.bagTypeId);
              return (
                <tr key={item.id} className="border-t">
                  <td className="p-2 font-mono">{item.date}</td>
                  <td className="p-2 font-semibold">{bType?.name || "Bags"}</td>
                  <td className="p-2 text-right font-mono font-bold">{item.qty} pcs</td>
                  <td className="p-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${item.status === "ACCEPTED" ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"}`}>
                      {item.status}
                    </span>
                  </td>
                  <td className="p-2">
                    {item.status === "PENDING" ? (
                      <AcceptForm session={session} onAccept={(count) => handleAccept(item.id, count)} />
                    ) : (
                      <span className="text-gray-500 font-mono font-bold">{item.physicalCount} pcs confirmed</span>
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
/*  PRODUCTION MODULE WITH MACHINE OPERATOR LOGGING & LEAKAGES             */
/* ---------------------------------------------------------------------- */
function ProductionModule({ data, mutate, session, showToast }) {
  const managerRollsCount = useMemo(() => computeManagerAcceptedRolls(data), [data]);
  const managerBagsQty = useMemo(() => computeManagerAcceptedBags(data), [data]);

  const [rollTypeId, setRollTypeId] = useState(data.rollTypes[0]?.id || "");
  const [bagTypeId, setBagTypeId] = useState(data.bagTypes[0]?.id || "");
  const [operatorName, setOperatorName] = useState("");
  const [machineNo, setMachineNo] = useState("Water Cutting Machine #1");
  const [rollsUsed, setRollsUsed] = useState("1");
  const [weightUsed, setWeightUsed] = useState("");
  const [actualBags, setActualBags] = useState("");
  const [bagsUsedQty, setBagsUsedQty] = useState("");
  const [leakage, setLeakage] = useState("0");

  const canProduce = managerRollsCount > 0 && managerBagsQty > 0;

  const handleRunProduction = (e) => {
    e.preventDefault();
    if (!canProduce) {
      showToast("Cannot produce: Accepted Film Rolls or Packing Bags required!", "warn");
      return;
    }

    if (!operatorName.trim()) {
      showToast("Please enter the Machine Operator's full name!", "warn");
      return;
    }

    if (Number(rollsUsed) <= 0 || Number(weightUsed) <= 0 || Number(actualBags) <= 0 || Number(bagsUsedQty) <= 0) {
      showToast("Enter valid positive production figures!", "warn");
      return;
    }

    if (Number(rollsUsed) > managerRollsCount) {
      showToast(`Exceeds manager floor roll count balance (${managerRollsCount} rolls)!`, "warn");
      return;
    }

    if (Number(bagsUsedQty) > managerBagsQty) {
      showToast(`Exceeds manager packing bag balance (${managerBagsQty} pcs)!`, "warn");
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
          machineNo,
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
    }), "Recorded Production Run", `${netProduced} net bags produced by operator ${operatorName}`);

    setOperatorName(""); setRollsUsed("1"); setWeightUsed(""); setActualBags(""); setLeakage("0"); setBagsUsedQty("");
    showToast("Production Run Logged Successfully!");
  };

  return (
    <div className="space-y-5">
      <div>
        <p className="font-display font-800 text-2xl text-[#0B3B45]">Production Floor Execution</p>
        <p className="text-sm text-[#5B6B68]">Record water production runs, machine operator assignments, roll weight, packing bags, and leakages.</p>
      </div>

      {!canProduce ? (
        <div className="bg-[#FBEAE5] border border-[#EFC3B7] p-5 rounded-2xl flex items-center gap-3 text-[#C4472F]">
          <AlertTriangle size={24} className="shrink-0" />
          <div>
            <p className="font-bold text-sm">PRODUCTION BLOCKED</p>
            <p className="text-xs">Manager must accept at least 1 Film Roll and 1 Packing Bag transfer before running production.</p>
          </div>
        </div>
      ) : (
        <form onSubmit={handleRunProduction} className="bg-white p-5 rounded-2xl border border-[#DDE3DA] space-y-4 max-w-2xl">
          <p className="font-bold text-[#0B3B45]">Record New Production Run & Machine Operator</p>
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-500">Water Cutting Machine Operator *</label>
              <input value={operatorName} onChange={(e) => setOperatorName(e.target.value)} placeholder="e.g. Emmanuel Mensah" className="inp mt-1" required />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500">Machine Assignment</label>
              <select value={machineNo} onChange={(e) => setMachineNo(e.target.value)} className="inp mt-1">
                <option value="Water Cutting Machine #1">Water Cutting Machine #1</option>
                <option value="Water Cutting Machine #2">Water Cutting Machine #2</option>
                <option value="Water Cutting Machine #3">Water Cutting Machine #3</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-500">Film Roll Type</label>
              <select value={rollTypeId} onChange={(e) => setRollTypeId(e.target.value)} className="inp">
                {(data.rollTypes || []).map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500">Packing Bag Type Used</label>
              <select value={bagTypeId} onChange={(e) => setBagTypeId(e.target.value)} className="inp">
                {(data.bagTypes || []).map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-500">Rolls Used (Count)</label>
              <input type="number" min="1" value={rollsUsed} onChange={(e) => setRollsUsed(e.target.value)} placeholder="1" className="inp" required />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500">Weight Used (kg)</label>
              <input type="number" min="0.1" step="0.1" value={weightUsed} onChange={(e) => setWeightUsed(e.target.value)} placeholder="25" className="inp" required />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500">Packing Bags Used (pcs)</label>
              <input type="number" min="1" value={bagsUsedQty} onChange={(e) => setBagsUsedQty(e.target.value)} placeholder="30" className="inp" required />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-500">Gross Bags Produced</label>
              <input type="number" min="1" value={actualBags} onChange={(e) => setActualBags(e.target.value)} placeholder="100" className="inp" required />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500">Leakage / Defective Bags</label>
              <input type="number" min="0" value={leakage} onChange={(e) => setLeakage(e.target.value)} placeholder="0" className="inp" required />
            </div>
          </div>

          <button type="submit" className="btn-primary w-full py-2.5">
            <Plus size={16} /> Log Production Run
          </button>
        </form>
      )}

      <div className="bg-white p-5 rounded-2xl border border-[#DDE3DA] overflow-x-auto">
        <p className="font-bold text-[#0B3B45] mb-3">Production Log & Machine Operator History</p>
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-[#F7F8F5] text-left">
              <th className="p-2">Date</th>
              <th className="p-2">Machine & Operator</th>
              <th className="p-2 text-right">Rolls Used</th>
              <th className="p-2 text-right">Weight (kg)</th>
              <th className="p-2 text-right">Gross Produced</th>
              <th className="p-2 text-right">Leakages</th>
              <th className="p-2 text-right">Net Available Bags</th>
            </tr>
          </thead>
          <tbody>
            {(data.productionRuns || []).map((run) => (
              <tr key={run.id} className="border-t">
                <td className="p-2 font-mono">{run.date}</td>
                <td className="p-2 font-bold text-[#0B3B45]">
                  {run.machineNo || "Water Cutting Machine #1"}<br />
                  <span className="text-[11px] text-gray-500 font-normal">Operator: {run.operatorName}</span>
                </td>
                <td className="p-2 text-right font-mono font-bold">{run.rollsUsed} rolls</td>
                <td className="p-2 text-right font-mono">{run.weightUsedKg} kg</td>
                <td className="p-2 text-right font-mono">{run.actualBags} bags</td>
                <td className="p-2 text-right font-mono text-red-600 font-bold">{run.leakageBags || 0} bags</td>
                <td className="p-2 text-right font-mono font-bold text-green-700">{run.netAvailableBags} bags</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/*  SALES & FREE GIVEAWAY WATER BAGS MODULE WITH THERMAL RECEIPT PRINT    */
/* ---------------------------------------------------------------------- */
function SalesModule({ data, mutate, session, showToast }) {
  const finished = useMemo(() => computeFinishedGoods(data), [data]);
  const defaultPrice = data.settings?.pricePerBag || 5.0;

  const [customerName, setCustomerName] = useState("");
  const [bagsSold, setBagsSold] = useState("");
  const [freeBags, setFreeBags] = useState("0");
  const [pricePerBag, setPricePerBag] = useState(defaultPrice);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [lastReceipt, setLastReceipt] = useState(null);

  const handleRecordSale = (e) => {
    e.preventDefault();
    const qtySold = Number(bagsSold || 0);
    const qtyFree = Number(freeBags || 0);
    const totalOut = qtySold + qtyFree;

    if (totalOut <= 0) return showToast("Enter a valid number of bags!", "warn");

    if (totalOut > finished.availableForSale) {
      return showToast(`Insufficient inventory! Only ${finished.availableForSale} bags available.`, "warn");
    }

    const totalAmount = qtySold * Number(pricePerBag);

    const newSale = {
      id: uid(),
      receiptNo: `RCT-${Math.floor(100000 + Math.random() * 900000)}`,
      date: todayISO(),
      customerName: customerName.trim() || "Walk-in Customer",
      bagsSold: qtySold,
      freeBags: qtyFree,
      pricePerBag: Number(pricePerBag),
      totalAmount,
      amountPaid: totalAmount,
      method: paymentMethod,
      recordedBy: session.name,
    };

    mutate((prev) => ({
      ...prev,
      sales: [newSale, ...(prev.sales || [])],
    }), "Recorded Water Sale", `${qtySold} bags sold + ${qtyFree} free bags to ${newSale.customerName}`);

    setLastReceipt(newSale);
    setCustomerName(""); setBagsSold(""); setFreeBags("0");
    showToast("Sales Transaction Completed!");
  };

  const handlePrintReceipt = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="font-display font-800 text-2xl text-[#0B3B45]">Water Sales & Dispatch</p>
        <p className="text-sm text-[#5B6B68]">Record sachet water sales, free giveaway bags, and issue customer thermal receipts.</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <form onSubmit={handleRecordSale} className="bg-white p-5 rounded-2xl border border-[#DDE3DA] space-y-3">
          <p className="font-bold text-[#0B3B45] text-base">New Water Dispatch / Sale Entry</p>

          <div>
            <label className="text-xs font-semibold text-gray-500">Customer / Driver Name</label>
            <input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="e.g. Walk-in Customer / Driver Kwame" className="inp mt-1" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-500">Paid Bags Sold *</label>
              <input type="number" min="0" value={bagsSold} onChange={(e) => setBagsSold(e.target.value)} placeholder="e.g. 50" className="inp mt-1" required />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500">Free / Giveaway Bags</label>
              <input type="number" min="0" value={freeBags} onChange={(e) => setFreeBags(e.target.value)} placeholder="0" className="inp mt-1" required />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-500">Price per Bag (GH₵)</label>
              <input type="number" min="0.1" step="0.1" value={pricePerBag} onChange={(e) => setPricePerBag(e.target.value)} className="inp mt-1" required />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500">Payment Method</label>
              <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="inp mt-1">
                <option value="cash">Cash Payment</option>
                <option value="momo">Mobile Money (MoMo)</option>
                <option value="bank">Bank Transfer</option>
              </select>
            </div>
          </div>

          <div className="p-3 bg-[#F7F8F5] rounded-xl flex justify-between items-center text-xs font-bold text-[#0B3B45]">
            <span>Total Payable Amount:</span>
            <span className="text-base font-mono">{fmtGHS(Number(bagsSold || 0) * Number(pricePerBag))}</span>
          </div>

          <button type="submit" className="btn-primary w-full py-2.5">
            <Receipt size={16} /> Complete Sale & Generate Receipt
          </button>
        </form>

        {lastReceipt && (
          <div className="bg-white p-5 rounded-2xl border border-[#DDE3DA] space-y-4">
            <div className="flex justify-between items-center no-print border-b pb-2">
              <p className="font-bold text-[#0B3B45]">Thermal Receipt Preview</p>
              <button onClick={handlePrintReceipt} className="btn-primary py-1 px-3 text-xs bg-[#2A6E4A]">
                <Printer size={14} /> Print Receipt
              </button>
            </div>

            <div id="printable-receipt" className="p-4 bg-gray-50 font-mono text-xs border rounded-xl space-y-2 text-black">
              <div className="text-center font-bold">
                <p className="text-sm">MATTBEES WATER SERVICES</p>
                <p className="text-[10px]">Accra, Ghana · Tel: +233 24 000 0000</p>
                <p className="text-[10px]">Official Sachet Water Receipt</p>
              </div>
              <div className="border-b border-dashed my-2"></div>
              <div className="flex justify-between"><span>Receipt #:</span><span>{lastReceipt.receiptNo}</span></div>
              <div className="flex justify-between"><span>Date:</span><span>{lastReceipt.date}</span></div>
              <div className="flex justify-between"><span>Customer:</span><span>{lastReceipt.customerName}</span></div>
              <div className="border-b border-dashed my-2"></div>
              <div className="flex justify-between"><span>Paid Bags (@ {fmtGHS(lastReceipt.pricePerBag)}):</span><span>{lastReceipt.bagsSold} bags</span></div>
              {lastReceipt.freeBags > 0 && <div className="flex justify-between text-gray-700"><span>Free / Giveaway Bags:</span><span>{lastReceipt.freeBags} bags</span></div>}
              <div className="border-b border-dashed my-2"></div>
              <div className="flex justify-between font-bold text-sm"><span>TOTAL PAID:</span><span>{fmtGHS(lastReceipt.totalAmount)}</span></div>
              <div className="flex justify-between text-[10px]"><span>Payment Method:</span><span className="uppercase">{lastReceipt.method}</span></div>
              <div className="text-center pt-3 text-[9px]">Thank you for choosing Mattbees Water Services!</div>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white p-5 rounded-2xl border border-[#DDE3DA] overflow-x-auto">
        <p className="font-bold text-[#0B3B45] mb-3">Sales & Free Bags Distribution History</p>
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-[#F7F8F5] text-left">
              <th className="p-2">Receipt #</th>
              <th className="p-2">Date</th>
              <th className="p-2">Customer / Driver</th>
              <th className="p-2 text-right">Bags Sold</th>
              <th className="p-2 text-right">Free Bags</th>
              <th className="p-2 text-right">Amount Paid</th>
            </tr>
          </thead>
          <tbody>
            {(data.sales || []).map((sale) => (
              <tr key={sale.id} className="border-t">
                <td className="p-2 font-mono font-bold text-blue-900">{sale.receiptNo || "RCT-000"}</td>
                <td className="p-2 font-mono">{sale.date}</td>
                <td className="p-2 font-semibold">{sale.customerName}</td>
                <td className="p-2 text-right font-mono font-bold">{sale.bagsSold} bags</td>
                <td className="p-2 text-right font-mono text-amber-700 font-bold">{sale.freeBags || 0} bags</td>
                <td className="p-2 text-right font-mono font-bold text-green-700">{fmtGHS(sale.totalAmount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/*  REPORTS & PRINTABLE SUMMARY REPORT MODULE                             */
/* ---------------------------------------------------------------------- */
function ReportsModule({ data, session }) {
  const finished = computeFinishedGoods(data);
  const totalRev = (data.sales || []).reduce((s, r) => s + (r.totalAmount || 0), 0);
  const totalExp = [...(data.expenses || []), ...(data.adminExpenses || [])].reduce((s, e) => s + (e.amount || 0), 0);

  const handlePrintPDF = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center no-print">
        <div>
          <p className="font-display font-800 text-2xl text-[#0B3B45]">Operational Reports & PDF Exports</p>
          <p className="text-sm text-[#5B6B68]">Comprehensive executive report summary for production and revenue.</p>
        </div>
        <button onClick={handlePrintPDF} className="btn-primary bg-[#1C8C9E]">
          <Printer size={16} /> Print Report / Save PDF
        </button>
      </div>

      <div id="printable-area" className="bg-white p-6 rounded-2xl border border-[#DDE3DA] space-y-6">
        <div className="border-b pb-4 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-[#0B3B45]">Mattbees Water Services</h2>
            <p className="text-xs text-gray-500">Production, Inventory & Sales Executive Statement</p>
          </div>
          <div className="text-right text-xs font-mono">
            <p>Generated: {new Date().toLocaleDateString()}</p>
            <p>User: {session.name}</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="p-3 bg-gray-50 rounded-xl border">
            <p className="text-xs text-gray-500 font-bold">TOTAL WATER PRODUCED</p>
            <p className="text-lg font-mono font-bold text-blue-900">{fmt(finished.totalProduced, 0)} bags</p>
          </div>
          <div className="p-3 bg-gray-50 rounded-xl border">
            <p className="text-xs text-gray-500 font-bold">TOTAL REVENUE GENERATED</p>
            <p className="text-lg font-mono font-bold text-green-800">{fmtGHS(totalRev)}</p>
          </div>
          <div className="p-3 bg-gray-50 rounded-xl border">
            <p className="text-xs text-gray-500 font-bold">TOTAL OPERATIONAL EXPENSES</p>
            <p className="text-lg font-mono font-bold text-red-700">{fmtGHS(totalExp)}</p>
          </div>
        </div>

        <div>
          <p className="font-bold text-[#0B3B45] text-sm mb-2">Production Floor Summary</p>
          <table className="w-full text-xs border">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-2 text-left">Date</th>
                <th className="p-2 text-left">Operator</th>
                <th className="p-2 text-right">Rolls Used</th>
                <th className="p-2 text-right">Roll Weight (kg)</th>
                <th className="p-2 text-right">Leakage Bags</th>
                <th className="p-2 text-right">Net Bags Produced</th>
              </tr>
            </thead>
            <tbody>
              {(data.productionRuns || []).map((run) => (
                <tr key={run.id} className="border-t">
                  <td className="p-2 font-mono">{run.date}</td>
                  <td className="p-2">{run.operatorName}</td>
                  <td className="p-2 text-right font-mono">{run.rollsUsed} rolls</td>
                  <td className="p-2 text-right font-mono">{run.weightUsedKg} kg</td>
                  <td className="p-2 text-right font-mono text-red-600">{run.leakageBags || 0}</td>
                  <td className="p-2 text-right font-mono font-bold">{run.netAvailableBags}</td>
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
/*  AUDIT LOG COMPONENT                                                   */
/* ---------------------------------------------------------------------- */
function AuditLog({ data, mutate, showToast }) {
  const logs = data.auditLog || [];

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <p className="font-display font-800 text-2xl text-[#0B3B45]">System Audit Trail</p>
          <p className="text-sm text-[#5B6B68]">Immutable event log tracking system actions and user updates.</p>
        </div>
        <button onClick={() => window.print()} className="btn-primary bg-[#1C8C9E] text-xs py-1.5 no-print">
          <Printer size={14} /> Print Audit Log
        </button>
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
              <tr><td colSpan="5" className="p-4 text-center text-gray-400">No audit records logged.</td></tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id} className="border-t">
                  <td className="p-2 font-mono text-gray-500">{new Date(log.ts).toLocaleString()}</td>
                  <td className="p-2 font-bold text-[#0B3B45]">{log.user}</td>
                  <td className="p-2 uppercase font-mono text-[10px]">{log.role}</td>
                  <td className="p-2 font-semibold text-blue-900">{log.action}</td>
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