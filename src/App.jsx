import React, { useState, useEffect, useMemo, useCallback } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from './assets/vite.svg'
import heroImg from './assets/hero.png'

import {
  Droplets, Warehouse, PackageOpen, Factory, Wallet, FileBarChart, ShieldCheck,
  LogOut, Plus, ChevronRight, AlertTriangle, CheckCircle2, Wifi, WifiOff,
  Users, Settings2, Scale, TrendingUp, TrendingDown, ClipboardList, X, Lock,
  Printer, Calendar, Menu, Bell, Pencil, Truck, Check, KeyRound, Mail, Receipt, Building
} from "lucide-react";

/* ---------------------------------------------------------------------- */
/*  PWA SERVICE WORKER REGISTRATION                                        */
/* ---------------------------------------------------------------------- */
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/service-worker.js").catch((err) => {
      console.log("SW registration failed: ", err);
    });
  });
}

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
};

async function loadData() {
  try {
    const res = localStorage.getItem(STORAGE_KEY);
    return res ? { ...emptyData, ...JSON.parse(res), settings: { ...emptyData.settings, ...(JSON.parse(res).settings || {}) } } : emptyData;
  } catch {
    return emptyData;
  }
}

async function saveData(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
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

const ROLES = {
  owner: { label: "Business Owner (Admin)", desc: "Full control · Financials · Price setup · Transfers", icon: ShieldCheck },
  manager: { label: "Manager", desc: "Operations · Production · Stock Acceptance", icon: Users },
  cashier: { label: "Cashier", desc: "Driver & Customer Sales Entry", icon: Wallet },
  driver: { label: "Delivery Driver", desc: "Delivery Operations", icon: Truck },
};

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
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

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
              ...draft.auditLog,
            ].slice(0, 500),
          }
        : draft;
      saveData(withAudit);
      return withAudit;
    });
  }, [session]);

  const handleLogin = (s) => {
    setSession(s);
    setPage(s.role === "cashier" ? "sales" : s.role === "driver" ? "reports" : "dashboard");
    showToast(`Welcome, ${s.name}`);

    // Prompt Admin for business registration if not yet registered
    if (s.role === "owner" && !data.businessDetails?.isRegistered) {
      setShowBusinessModal(true);
    }
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
        users={data.users}
        onLogin={handleLogin}
        onResetAdminPassword={(email, newPass) => {
          let updated = false;
          setData((prev) => {
            const nextUsers = prev.users.map((u) => {
              if (u.role === "owner" && u.email === email) {
                updated = true;
                return { ...u, password: newPass };
              }
              return u;
            });
            const next = { ...prev, users: nextUsers };
            saveData(next);
            return next;
          });
          return updated;
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#F2F4EF] text-[#16211F] font-body">
      <style>{CSS_TOOLKIT}</style>
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
          <TopBar session={session} online={online} onMenuClick={() => setMobileNavOpen(true)} onLogout={() => setSession(null)} data={data} mutate={mutate} />
          <main className="p-4 sm:p-6 max-w-6xl mx-auto">
            {page === "dashboard" && (session.role === "owner" || session.role === "manager") && (
              <Dashboard data={data} session={session} />
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
            {page === "audit" && session.role === "owner" && <AuditLog data={data} />}
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
.pw-sidebar .pw-nav-item-active { background-color:#1C8C9E !important; color:#0B3B45 !important; font-weight:600; }

@media print {
  body * { visibility: hidden; }
  #printable-area, #printable-area *, #printable-receipt, #printable-receipt * { visibility: visible; }
  #printable-area { position: absolute; left: 0; top: 0; width: 100%; }
  #printable-receipt { position: absolute; left: 0; top: 0; width: 100%; max-width: 320px; margin: 0 auto; padding: 10px; background: white; color: black; }
}
`;

/* ---------------------------------------------------------------------- */
/*  LOGIN SCREEN                                                           */
/* ---------------------------------------------------------------------- */
function LoginScreen({ users, onLogin, onResetAdminPassword }) {
  const [view, setView] = useState("login");
  const [selectedUser, setSelectedUser] = useState(users[0] || null);
  const [password, setPassword] = useState("");
  const [fullNameInput, setFullNameInput] = useState("");
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const [resetEmail, setResetEmail] = useState("");
  const [resetPassword, setResetPassword] = useState("");

  const handleLogin = (e) => {
    e.preventDefault();
    if (!selectedUser) return;

    if (selectedUser.password && password !== selectedUser.password) {
      setError("Incorrect password! Access denied.");
      return;
    }

    if (fullNameInput && fullNameInput.trim().toLowerCase() !== selectedUser.name.trim().toLowerCase()) {
      setError("Full Name mismatch! Please type exact full name.");
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
            <p className="font-display font-800 text-[#0B3B45] text-xl leading-none">PureLedger</p>
            <p className="font-mono text-[10px] text-[#5B6B68] uppercase tracking-widest mt-0.5">Offline-First Sachet ERP</p>
          </div>
        </div>

        {view === "login" && (
          <form onSubmit={handleLogin} className="space-y-4">
            {successMsg && <p className="text-xs font-semibold text-green-700 bg-green-100 p-2 rounded">{successMsg}</p>}
            
            <div>
              <label className="text-xs font-semibold text-[#5B6B68] uppercase">Select User / Driver Account</label>
              <select
                value={selectedUser?.id || ""}
                onChange={(e) => {
                  const u = users.find((x) => x.id === e.target.value);
                  setSelectedUser(u);
                  setFullNameInput(u ? u.name : "");
                  setError("");
                }}
                className="inp mt-1"
              >
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({ROLES[u.role]?.label || u.role})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-[#5B6B68] uppercase">Verify Full Name</label>
              <input
                type="text"
                value={fullNameInput || (selectedUser ? selectedUser.name : "")}
                onChange={(e) => { setFullNameInput(e.target.value); setError(""); }}
                placeholder="Enter exact full name"
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
                placeholder="admin@company.com"
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

        <p className="text-center text-[11px] font-mono text-[#5B6B68] mt-4">PWA ACTIVE · LOCALSTORAGE OFFLINE SAFE</p>
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
      <div id="myStyle" className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl relative space-y-4">
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
function Sidebar({ page, setPage, role, onLogout, open, onClose }) {
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
            <p className="font-display font-800 text-[15px] text-[#F2F4EF]">PureLedger</p>
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

function TopBar({ session, online, onMenuClick, onLogout, data, mutate }) {
  const Icon = ROLES[session.role]?.icon || ShieldCheck;
  const [notifOpen, setNotifOpen] = useState(false);
  const notifications = data.notifications || [];

  return (
    <div className="sticky top-0 z-20 bg-[#F2F4EF] border-b border-[#DDE3DA] px-4 sm:px-6 py-3 flex items-center justify-between">
      <div className="flex items-center gap-2.5">
        <button onClick={onMenuClick} className="sm:hidden w-8 h-8 rounded-lg border border-[#DDE3DA] bg-white flex items-center justify-center text-[#0B3B45]">
          <Menu size={16} />
        </button>
        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono font-semibold ${online ? "bg-[#DCEEE4] text-[#2A6E4A]" : "bg-[#F5E3D9] text-[#A85A2A]"}`}>
          {online ? <Wifi size={12} /> : <WifiOff size={12} />}
          <span>{online ? "PWA ONLINE" : "OFFLINE READY"}</span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <div className="text-right hidden sm:block">
          <p className="text-sm font-semibold">{session.name}</p>
          <p className="text-[11px] text-[#5B6B68]">{ROLES[session.role]?.label || session.role}</p>
        </div>
        <div className="w-8 h-8 rounded-full bg-[#0B3B45] flex items-center justify-center text-white" id="bell">
          <Icon size={14} />
        </div>
        <div className="relative">
          <button onClick={() => setNotifOpen(!notifOpen)} className="relative w-8 h-8 rounded-lg border border-[#DDE3DA] bg-white flex items-center justify-center text-[#0B3B45]">
            <Bell size={15} />
            {notifications.length > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 rounded-full text-[10px] font-bold bg-[#C4472F] text-white flex items-center justify-center">
                {notifications.length}
              </span>
            )}
          </button>
          {notifOpen && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl border border-[#DDE3DA] shadow-xl z-50 p-3" id="notify">
              <div className="flex items-center justify-between pb-2 border-b border-[#EDEFEA]">
                <p className="font-bold text-xs text-[#0B3B45]">System Notifications</p>
                <button onClick={() => mutate((prev) => ({ ...prev, notifications: [] }), "Cleared Notifications", "")} className="text-[10px] text-[#C4472F]">Clear All</button>
              </div>
              <div className="max-h-60 overflow-y-auto space-y-2 mt-2">
                {notifications.length === 0 ? <p className="text-xs text-gray-400 text-center py-4">No unread notifications</p> : (
                  notifications.map((n) => (
                    <div key={n.id} className="p-2 bg-[#F7F8F5] rounded text-xs border border-[#EDEFEA]">
                      <p className="font-semibold text-[#0B3B45]">{n.title}</p>
                      <p className="text-gray-600">{n.msg}</p>
                      <span className="text-[9px] text-gray-400 font-mono">{n.ts}</span>
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
  const produced = data.productionRuns.reduce((s, r) => s + r.netAvailableBags, 0);
  const sold = data.sales.reduce((s, r) => s + r.bagsSold, 0);
  return {
    totalProduced: produced,
    totalSold: sold,
    availableForSale: Math.max(0, produced - sold),
  };
}

function computeManagerAcceptedRolls(data) {
  const accepted = data.issuance.filter((i) => i.status === "ACCEPTED").reduce((s, i) => s + i.weightKg, 0);
  const used = data.productionRuns.reduce((s, p) => s + p.weightUsedKg, 0);
  return Math.max(0, accepted - used);
}

function computeManagerAcceptedBags(data) {
  const accepted = data.bagIssuance.filter((i) => i.status === "ACCEPTED").reduce((s, i) => s + i.qty, 0);
  const used = data.bagUsage.reduce((s, u) => s + u.qty, 0);
  return Math.max(0, accepted - used);
}

function computeCashBalance(data) {
  const cashSales = data.sales.filter((s) => s.method === "cash").reduce((s, r) => s + r.amountPaid, 0);
  const debtCash = data.debtPayments.filter((p) => p.method === "cash").reduce((s, r) => s + r.amount, 0);
  const expenses = data.expenses.reduce((s, e) => s + e.amount, 0);
  const deposits = data.bankDeposits.reduce((s, d) => s + d.amount, 0);
  return cashSales + debtCash - expenses - deposits;
}

/* ---------------------------------------------------------------------- */
/*  DASHBOARD MODULE                                                        */
/* ---------------------------------------------------------------------- */
function Dashboard({ data, session }) {
  const isOwner = session.role === "owner";
  const finished = useMemo(() => computeFinishedGoods(data), [data]);
  const managerRollsKg = useMemo(() => computeManagerAcceptedRolls(data), [data]);
  const managerBagsQty = useMemo(() => computeManagerAcceptedBags(data), [data]);
  const cashOnHand = useMemo(() => computeCashBalance(data), [data]);

  return (
    <div className="space-y-6">
      <div>
        <p className="font-display font-800 text-2xl text-[#0B3B45]">Welcome back, {session.name}</p>
        <p className="text-sm text-[#5B6B68]">Sachet Water Operational Overview · {isOwner ? "Super Admin View" : "Manager View"}</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={Droplets} label="Sachet Bags Produce (Available)" value={`${fmt(finished.availableForSale, 0)} bags`} accent="#2A6E4A" />
        <StatCard icon={Warehouse} label="Manager Floor Rolls" value={`${fmt(managerRollsKg)} kg`} accent="#1C8C9E" />
        <StatCard icon={PackageOpen} label="Manager Packing Bags" value={`${fmt(managerBagsQty, 0)} pcs`} accent="#E8A23D" />
        <StatCard icon={Wallet} label="Cash On Hand Balance" value={fmtGHS(cashOnHand)} accent={cashOnHand < 0 ? "#C4472F" : "#0B3B45"} />
      </div>

      {!isOwner && (
        <div className="bg-[#EAF3F1] p-4 rounded-xl border border-[#BFDCD6]">
          <p className="font-bold text-sm text-[#0B3B45]">Notice to Manager:</p>
          <p className="text-xs text-[#5B6B68] mt-1">Raw material intake and direct supplier details are managed securely by the Business Owner. Rolls and Packing Bags must be issued by the Owner and explicitly accepted by you before production runs can be logged.</p>
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
function WarehouseModule({ data, mutate, session, showToast }) {
  const isOwner = session.role === "owner";
  const [tab, setTab] = useState(isOwner ? "intake" : "accept");

  return (
    <div className="space-y-5">
      <div>
        <p className="font-display font-800 text-2xl text-[#0B3B45]">Warehouse & Film Rolls</p>
        <p className="text-sm text-[#5B6B68]">Manage raw rolls intake, transfers, and manager stock acceptance.</p>
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
  const [rollTypeName, setRollTypeName] = useState("");
  const [kgPerRoll, setKgPerRoll] = useState("");
  const [supplier, setSupplier] = useState("");
  const [qty, setQty] = useState("");

  const handleCreateTypeAndIntake = (e) => {
    e.preventDefault();
    if (Number(kgPerRoll) <= 0 || Number(qty) <= 0) return showToast("Negative or zero values not allowed!", "warn");

    const typeId = uid();
    mutate((prev) => ({
      ...prev,
      rollTypes: [...prev.rollTypes, { id: typeId, name: rollTypeName, standardWeightKg: Number(kgPerRoll), yieldValue: 900 }],
      intake: [{ id: uid(), date: todayISO(), rollTypeId: typeId, supplier, qty: Number(qty), weightKg: Number(qty) * Number(kgPerRoll) }, ...prev.intake],
    }), "Recorded Roll Intake", `${qty} rolls of ${rollTypeName}`);

    setRollTypeName(""); setKgPerRoll(""); setSupplier(""); setQty("");
    showToast("Roll Intake Recorded!");
  };

  return (
    <div className="grid lg:grid-cols-2 gap-4">
      <form onSubmit={handleCreateTypeAndIntake} className="bg-white p-5 rounded-2xl border border-[#DDE3DA] space-y-3">
        <p className="font-bold text-[#0B3B45]">Owner Raw Roll Intake</p>
        <div>
          <label className="text-xs font-semibold text-gray-500">Roll Type Name</label>
          <input value={rollTypeName} onChange={(e) => setRollTypeName(e.target.value)} placeholder="e.g. Standard 25kg Film" className="inp" required />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs font-semibold text-gray-500">Weight per Roll (kg)</label>
            <input type="number" min="0.1" step="0.1" value={kgPerRoll} onChange={(e) => setKgPerRoll(e.target.value)} placeholder="25" className="inp" required />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500">Quantity Rolls</label>
            <input type="number" min="1" value={qty} onChange={(e) => setQty(e.target.value)} placeholder="10" className="inp" required />
          </div>
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-500">Supplier Name (Hidden from Manager)</label>
          <input value={supplier} onChange={(e) => setSupplier(e.target.value)} placeholder="e.g. Polytank Ghana" className="inp" required />
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
              <th className="p-2 text-right">Qty</th>
              <th className="p-2 text-right">Weight (kg)</th>
            </tr>
          </thead>
          <tbody>
            {data.intake.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="p-2 font-mono">{r.date}</td>
                <td className="p-2 font-semibold">{data.rollTypes.find((t) => t.id === r.rollTypeId)?.name || "Film"}</td>
                <td className="p-2 text-blue-800 font-semibold">{r.supplier}</td>
                <td className="p-2 text-right font-mono">{r.qty}</td>
                <td className="p-2 text-right font-mono">{r.weightKg}</td>
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
    if (Number(qty) <= 0) return showToast("Enter a positive quantity!", "warn");

    const rType = data.rollTypes.find((t) => t.id === rollTypeId);
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
        ...prev.issuance,
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
            {data.rollTypes.map((t) => (
              <option key={t.id} value={t.id}>{t.name} ({t.standardWeightKg} kg/roll)</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-500">Number of Rolls to Issue</label>
          <input type="number" min="1" value={qty} onChange={(e) => setQty(e.target.value)} placeholder="5" className="inp" required />
        </div>
        <button type="submit" className="btn-primary w-full">Transfer Rolls to Production Floor</button>
      </form>
    </div>
  );
}

function ManagerRollAcceptanceTab({ data, mutate, session, showToast }) {
  const managerAcceptedKg = useMemo(() => computeManagerAcceptedRolls(data), [data]);

  const handleAccept = (issuanceId, physicalCountInput) => {
    if (Number(physicalCountInput) < 0) return showToast("Count cannot be negative!", "warn");

    mutate((prev) => {
      const nextIssuance = prev.issuance.map((item) =>
        item.id === issuanceId
          ? { ...item, status: "ACCEPTED", confirmedBy: session.name, physicalCount: Number(physicalCountInput) }
          : item
      );

      const notif = {
        id: uid(),
        ts: new Date().toLocaleTimeString(),
        title: "Manager Material Acceptance",
        msg: `Manager ${session.name} accepted roll issuance ID #${issuanceId.slice(0,5)} with physical count: ${physicalCountInput}`,
      };

      return {
        ...prev,
        issuance: nextIssuance,
        notifications: [notif, ...(prev.notifications || [])],
      };
    }, "Accepted Roll Stock", `Confirmed ${physicalCountInput} rolls`);

    showToast("Stock Accepted & Confirmation sent to Admin!");
  };

  return (
    <div className="space-y-4">
      <div className="bg-white p-4 rounded-xl border border-[#DDE3DA] flex justify-between items-center">
        <div>
          <p className="font-bold text-sm text-[#0B3B45]">Manager Available Floor Roll Balance</p>
          <p className="text-xs text-gray-500">Only accepted rolls appear here and can be used in production.</p>
        </div>
        <p className="text-2xl font-mono font-bold text-[#1C8C9E]">{fmt(managerAcceptedKg)} kg</p>
      </div>

      <div className="bg-white p-5 rounded-2xl border border-[#DDE3DA] overflow-x-auto">
        <p className="font-bold text-[#0B3B45] mb-3">Custody Transfers & Acceptance Log</p>
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-[#F7F8F5] text-left">
              <th className="p-2">Date</th>
              <th className="p-2">Roll Type</th>
              <th className="p-2 text-right">Issued Qty</th>
              <th className="p-2 text-right">Weight (kg)</th>
              <th className="p-2">Status</th>
              <th className="p-2">Physical Count & Confirm</th>
            </tr>
          </thead>
          <tbody>
            {data.issuance.map((item) => {
              const rType = data.rollTypes.find((t) => t.id === item.rollTypeId);
              return (
                <tr key={item.id} className="border-t">
                  <td className="p-2 font-mono">{item.date}</td>
                  <td className="p-2 font-semibold">{rType?.name || "Roll"}</td>
                  <td className="p-2 text-right font-mono">{item.qty}</td>
                  <td className="p-2 text-right font-mono">{item.weightKg}</td>
                  <td className="p-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${item.status === "ACCEPTED" ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"}`}>
                      {item.status}
                    </span>
                  </td>
                  <td className="p-2">
                    {item.status === "PENDING" ? (
                      <AcceptForm onAccept={(count) => handleAccept(item.id, count)} />
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

function AcceptForm({ onAccept }) {
  const [cnt, setCnt] = useState("");
  return (
    <div className="flex gap-1 items-center">
      <input type="number" min="0" value={cnt} onChange={(e) => setCnt(e.target.value)} placeholder="Physical Count" className="inp py-1 text-xs w-28" required />
      <button onClick={() => cnt !== "" && onAccept(cnt)} className="btn-success text-xs py-1 px-2">Accept</button>
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
  const [typeName, setTypeName] = useState("");
  const [supplier, setSupplier] = useState("");
  const [qty, setQty] = useState("");

  const handleIntake = (e) => {
    e.preventDefault();
    if (Number(qty) <= 0) return showToast("Quantity must be positive!", "warn");

    const bId = uid();
    mutate((prev) => ({
      ...prev,
      bagTypes: [...prev.bagTypes, { id: bId, name: typeName, capacity: 30 }],
      bagIntake: [{ id: uid(), date: todayISO(), bagTypeId: bId, supplier, qty: Number(qty) }, ...prev.bagIntake],
    }), "Bag Intake Recorded", `${qty} pcs ${typeName}`);

    setTypeName(""); setSupplier(""); setQty("");
    showToast("Bag Intake Recorded!");
  };

  return (
    <div className="grid lg:grid-cols-2 gap-4">
      <form onSubmit={handleIntake} className="bg-white p-5 rounded-2xl border border-[#DDE3DA] space-y-3">
        <p className="font-bold text-[#0B3B45]">Owner Packing Bags Intake</p>
        <div>
          <label className="text-xs font-semibold text-gray-500">Bag Type / Name</label>
          <input value={typeName} onChange={(e) => setTypeName(e.target.value)} placeholder="e.g. 30-Sachet Outer Bag" className="inp" required />
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-500">Quantity (Bags/Bundles)</label>
          <input type="number" min="1" value={qty} onChange={(e) => setQty(e.target.value)} placeholder="500" className="inp" required />
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-500">Supplier (Hidden from Manager)</label>
          <input value={supplier} onChange={(e) => setSupplier(e.target.value)} placeholder="e.g. Ghana Pack Ltd" className="inp" required />
        </div>
        <button type="submit" className="btn-primary w-full">Save Bag Intake</button>
      </form>
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
            {data.bagTypes.map((t) => (
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
      <div className="bg-[#F2F4EF] p-4 rounded-xl border border-[#DDE3DA] flex justify-between items-center bg-white">
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
              const bType = data.bagTypes.find((t) => t.id === item.bagTypeId);
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
                      <AcceptForm onAccept={(count) => handleAccept(item.id, count)} />
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
  const managerRollsKg = useMemo(() => computeManagerAcceptedRolls(data), [data]);
  const managerBagsQty = useMemo(() => computeManagerAcceptedBags(data), [data]);

  const [rollTypeId, setRollTypeId] = useState(data.rollTypes[0]?.id || "");
  const [weightUsed, setWeightUsed] = useState("");
  const [actualBags, setActualBags] = useState("");
  const [leakage, setLeakage] = useState("0");
  const [bagsUsedQty, setBagsUsedQty] = useState("");

  const canProduce = managerRollsKg > 0 && managerBagsQty > 0;

  const handleRunProduction = (e) => {
    e.preventDefault();
    if (!canProduce) {
      showToast("PRODUCTION BLOCKED: Rolls or Packing Bags not available/accepted by manager!", "warn");
      return;
    }

    if (Number(weightUsed) <= 0 || Number(actualBags) <= 0 || Number(bagsUsedQty) <= 0) {
      showToast("Negative or zero values are strict violation!", "warn");
      return;
    }

    if (Number(weightUsed) > managerRollsKg) {
      showToast(`Cannot use more rolls than available (${managerRollsKg} kg)`, "warn");
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
          rollTypeId,
          weightUsedKg: Number(weightUsed),
          actualBags: Number(actualBags),
          leakageBags: Number(leakage || 0),
          netAvailableBags: netProduced,
          recordedBy: session.name,
        },
        ...prev.productionRuns,
      ],
      bagUsage: [
        {
          id: uid(),
          date: todayISO(),
          qty: Number(bagsUsedQty),
          reason: "Production Run",
          usedBy: session.name,
        },
        ...prev.bagUsage,
      ],
    }), "Recorded Production Run", `${netProduced} sachet bags produced`);

    setWeightUsed(""); setActualBags(""); setLeakage("0"); setBagsUsedQty("");
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
        <form onSubmit={handleRunProduction} className="bg-[#FFFFFF] p-5 rounded-2xl border border-[#DDE3DA] space-y-4 max-w-xl">
          <p className="font-bold text-[#0B3B45]">Record New Production Run</p>
          <div>
            <label className="text-xs font-semibold text-gray-500">Film Roll Type</label>
            <select value={rollTypeId} onChange={(e) => setRollTypeId(e.target.value)} className="inp" required>
              {data.rollTypes.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-500">Weight Roll Used (kg)</label>
              <input type="number" min="0.1" step="0.1" value={weightUsed} onChange={(e) => setWeightUsed(e.target.value)} placeholder="e.g. 25" className="inp" required />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500">Packing Bags Used (pcs)</label>
              <input type="number" min="1" value={bagsUsedQty} onChange={(e) => setBagsUsedQty(e.target.value)} placeholder="e.g. 30" className="inp" required />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-500">Gross Sachet Bags Produce</label>
              <input type="number" min="1" value={actualBags} onChange={(e) => setActualBags(e.target.value)} placeholder="e.g. 900" className="inp" required />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500">Burst / Leakages (Bags)</label>
              <input type="number" min="0" value={leakage} onChange={(e) => setLeakage(e.target.value)} className="inp" required />
            </div>
          </div>

          <button type="submit" className="btn-primary w-full">Record Finished Sachet Goods</button>
        </form>
      )}

      <div className="bg-white p-5 rounded-2xl border border-[#DDE3DA] overflow-x-auto">
        <p className="font-bold text-[#0B3B45] mb-3">Production History</p>
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-[#F7F8F5] text-left">
              <th className="p-2">Date</th>
              <th className="p-2">Operator</th>
              <th className="p-2 text-right">Roll Used (kg)</th>
              <th className="p-2 text-right">Gross Produce</th>
              <th className="p-2 text-right">Leakage</th>
              <th className="p-2 text-right">Net Sellable Bags</th>
            </tr>
          </thead>
          <tbody>
            {data.productionRuns.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="p-2 font-mono">{r.date}</td>
                <td className="p-2">{r.recordedBy}</td>
                <td className="p-2 text-right font-mono">{r.weightUsedKg}</td>
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
            <div className="flex justify-between"><span className="text-gray-500">Driver / Truck:</span><span>{driver ? driver.name : "Direct Sale"}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Payment Channel:</span><span className="uppercase font-semibold text-blue-800">{sale.method}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Cashier:</span><span>{sale.recordedBy}</span></div>
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
function SalesModule({ data, mutate, session, showToast }) {
  const driversList = useMemo(() => data.users.filter((u) => u.role === "driver"), [data.users]);
  const finished = useMemo(() => computeFinishedGoods(data), [data]);
  const cashAvailable = useMemo(() => computeCashBalance(data), [data]);

  const [driverId, setDriverId] = useState(driversList[0]?.id || "");
  const [customer, setCustomer] = useState("");
  const [bagsSold, setBagsSold] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");

  const [depositAmount, setDepositAmount] = useState("");
  const [bankName, setBankName] = useState("");

  const [activeReceiptSale, setActiveReceiptSale] = useState(null);

  const handleSale = (e) => {
    e.preventDefault();

    if (finished.availableForSale <= 0) {
      showToast("SALES DISALLOWED: Zero sachet bags produce available!", "warn");
      return;
    }

    if (Number(bagsSold) <= 0) return showToast("Quantity sold must be greater than zero!", "warn");

    if (Number(bagsSold) > finished.availableForSale) {
      showToast(`Cannot sell more than available finished stock (${finished.availableForSale} bags)`, "warn");
      return;
    }

    const pricePerBag = data.settings.pricePerBag || 5.0;
    const totalAmount = Number(bagsSold) * pricePerBag;

    const newSale = {
      id: uid(),
      date: todayISO(),
      timestamp: new Date().toISOString(),
      driverId,
      customer: customer || "Direct Customer",
      bagsSold: Number(bagsSold),
      pricePerBag,
      totalAmount,
      amountPaid: totalAmount,
      method: paymentMethod,
      recordedBy: session.name,
    };

    mutate((prev) => ({
      ...prev,
      sales: [newSale, ...prev.sales],
    }), "Recorded Sale", `${bagsSold} bags sold to ${customer || "Direct Customer"}`);

    setBagsSold(""); setCustomer("");
    showToast("Sale Recorded Successfully!");
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
        ...prev.bankDeposits,
      ],
    }), "Bank Deposit Made", `${fmtGHS(depVal)} deposited to ${bankName}`);

    setDepositAmount(""); setBankName("");
    showToast("Bank Deposit Reconciled!");
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="font-display font-800 text-2xl text-[#0B3B45]">Sales, Drivers & Cash</p>
        <p className="text-sm text-[#5B6B68]">Record sales against trucks, print customer receipts, and execute bank deposits.</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-[#DDE3DA] space-y-4">
          <div className="flex justify-between items-center">
            <p className="font-bold text-[#0B3B45]">Record Sachet Water Sale</p>
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
                <label className="text-xs font-semibold text-gray-500">Delivery Truck Driver</label>
                <select value={driverId} onChange={(e) => setDriverId(e.target.value)} className="inp" required>
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
                  <label className="text-xs font-semibold text-gray-500">Bags Quantity</label>
                  <input type="number" min="1" max={finished.availableForSale} value={bagsSold} onChange={(e) => setBagsSold(e.target.value)} className="inp" required />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500">Fixed Unit Price</label>
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
        <p className="font-bold text-[#0B3B45] mb-3">Recent Sales Transactions & Purchase Receipts</p>
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-[#F7F8F5] text-left">
              <th className="p-2">Date/Time</th>
              <th className="p-2">Customer</th>
              <th className="p-2">Driver</th>
              <th className="p-2 text-right">Bags Sold</th>
              <th className="p-2 text-right">Total Amount</th>
              <th className="p-2">Method</th>
              <th className="p-2 text-center">Receipt</th>
            </tr>
          </thead>
          <tbody>
            {data.sales.map((s) => {
              const drv = driversList.find((d) => d.id === s.driverId);
              return (
                <tr key={s.id} className="border-t">
                  <td className="p-2 font-mono">{s.date}</td>
                  <td className="p-2 font-semibold">{s.customer}</td>
                  <td className="p-2 text-blue-900">{drv?.name || "Direct Sale"}</td>
                  <td className="p-2 text-right font-mono">{s.bagsSold}</td>
                  <td className="p-2 text-right font-mono font-bold text-green-800">{fmtGHS(s.totalAmount)}</td>
                  <td className="p-2 uppercase font-mono text-[10px]">{s.method}</td>
                  <td className="p-2 text-center">
                    <button
                      onClick={() => setActiveReceiptSale(s)}
                      className="px-2 py-1 bg-[#EAF3F1] hover:bg-[#1C8C9E] hover:text-white rounded text-[#0B3B45] font-bold text-[10px] flex items-center justify-center gap-1 mx-auto"
                    >
                      <Receipt size={12} /> Print Receipt
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
          companyName={data.settings.companyName}
          driversList={driversList}
          onClose={() => setActiveReceiptSale(null)}
        />
      )}
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/*  REPORTS & DRIVER DASHBOARD MODULE                                     */
/* ---------------------------------------------------------------------- */
function ReportsModule({ data, session }) {
  const isDriver = session.role === "driver";
  const [activeTab, setActiveTab] = useState("drivers");
  const driversList = useMemo(() => data.users.filter((u) => u.role === "driver"), [data.users]);
  const [filterDriver, setFilterDriver] = useState(isDriver ? session.id : "all");

  const salesFiltered = useMemo(() => {
    if (filterDriver === "all") return data.sales;
    return data.sales.filter((s) => s.driverId === filterDriver);
  }, [data.sales, filterDriver]);

  const metrics = useMemo(() => {
    const now = new Date();
    const todayStr = todayISO();

    let daily = 0, weekly = 0, monthly = 0, annual = 0;

    salesFiltered.forEach((s) => {
      const d = new Date(s.date);
      const diffDays = (now - d) / (1000 * 3600 * 24);

      if (s.date === todayStr) daily += s.totalAmount;
      if (diffDays <= 7) weekly += s.totalAmount;
      if (d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()) monthly += s.totalAmount;
      if (d.getFullYear() === now.getFullYear()) annual += s.totalAmount;
    });

    return { daily, weekly, monthly, annual };
  }, [salesFiltered]);

  const driverStats = useMemo(() => {
    const visibleDrivers = isDriver ? driversList.filter((d) => d.id === session.id) : driversList;

    return visibleDrivers.map((driver) => {
      const driverSales = data.sales.filter((s) => s.driverId === driver.id);
      const totalBags = driverSales.reduce((acc, s) => acc + s.bagsSold, 0);
      const totalRevenue = driverSales.reduce((acc, s) => acc + s.totalAmount, 0);
      const todayBags = driverSales
        .filter((s) => s.date === todayISO())
        .reduce((acc, s) => acc + s.bagsSold, 0);

      return {
        ...driver,
        totalSalesCount: driverSales.length,
        totalBags,
        totalRevenue,
        todayBags,
      };
    });
  }, [driversList, data.sales, isDriver, session.id]);

  const handlePrintReport = () => {
    window.print();
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <p className="font-display font-800 text-2xl text-[#0B3B45]">{isDriver ? "Driver Delivery Portal" : "Reports & Delivery Drivers"}</p>
          <p className="text-sm text-[#5B6B68]">Delivery performance, truck logs, and periodic revenue analytics.</p>
        </div>

        <div className="flex gap-2">
          <button onClick={handlePrintReport} className="btn-primary py-1.5 px-3 text-xs bg-[#1C8C9E]">
            <Printer size={14} /> Print / Export PDF Report
          </button>
          {!isDriver && (
            <div className="flex gap-1 bg-white rounded-xl border border-[#DDE3DA] p-1 w-fit">
              <button
                onClick={() => setActiveTab("drivers")}
                className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition ${activeTab === "drivers" ? "bg-[#0B3B45] text-white" : "text-gray-600"}`}
              >
                Driver Dashboard
              </button>
              <button
                onClick={() => setActiveTab("ledger")}
                className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition ${activeTab === "ledger" ? "bg-[#0B3B45] text-white" : "text-gray-600"}`}
              >
                Periodic Sales Ledger
              </button>
            </div>
          )}
        </div>
      </div>

      <div id="printable-area" className="space-y-5">
        {activeTab === "drivers" && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {driverStats.map((driver) => (
                <div key={driver.id} className="bg-white p-5 rounded-2xl border border-[#DDE3DA] shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-[#EDEFEA] pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-[#0B3B45] flex items-center justify-center text-white">
                        <Truck size={18} />
                      </div>
                      <div>
                        <p className="font-bold text-[#0B3B45] text-sm">{driver.name}</p>
                        <p className="text-[11px] font-mono text-[#5B6B68]">Reg: {driver.truckNo || "N/A"}</p>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-green-100 text-green-800">
                      Active Truck
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-[#F7F8F5] p-2.5 rounded-lg">
                      <p className="text-gray-500 font-semibold text-[10px]">Today Dispatched</p>
                      <p className="font-mono font-bold text-sm text-[#0B3B45]">{fmt(driver.todayBags, 0)} bags</p>
                    </div>
                    <div className="bg-[#F7F8F5] p-2.5 rounded-lg">
                      <p className="text-gray-500 font-semibold text-[10px]">Total Sold Volume</p>
                      <p className="font-mono font-bold text-sm text-[#1C8C9E]">{fmt(driver.totalBags, 0)} bags</p>
                    </div>
                  </div>

                  <div className="bg-[#EAF3F1] p-3 rounded-xl border border-[#BFDCD6] flex justify-between items-center">
                    <span className="text-xs font-semibold text-[#0B3B45]">Lifetime Revenue</span>
                    <span className="font-mono font-extrabold text-sm text-[#2A6E4A]">{fmtGHS(driver.totalRevenue)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {(activeTab === "ledger" && !isDriver) && (
          <div className="space-y-5">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-[#0B3B45]">Filter Driver:</span>
              <select value={filterDriver} onChange={(e) => setFilterDriver(e.target.value)} className="inp w-60">
                <option value="all">All Delivery Truck Drivers</option>
                {driversList.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <StatCard icon={Truck} label="Daily Sales" value={fmtGHS(metrics.daily)} accent="#1C8C9E" />
              <StatCard icon={Calendar} label="Weekly Sales (7-Day)" value={fmtGHS(metrics.weekly)} accent="#2A6E4A" />
              <StatCard icon={TrendingUp} label="Monthly Sales" value={fmtGHS(metrics.monthly)} accent="#E8A23D" />
              <StatCard icon={Wallet} label="Annual Sales" value={fmtGHS(metrics.annual)} accent="#0B3B45" />
            </div>

            <div className="bg-white p-5 rounded-2xl border border-[#DDE3DA] overflow-x-auto">
              <p className="font-bold text-[#0B3B45] mb-3">Sales Ledger by Truck Driver</p>
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-[#F7F8F5] text-left">
                    <th className="p-2">Date</th>
                    <th className="p-2">Driver / Truck</th>
                    <th className="p-2">Customer</th>
                    <th className="p-2 text-right">Bags Sold</th>
                    <th className="p-2 text-right">Total Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {salesFiltered.map((s) => {
                    const drv = driversList.find((d) => d.id === s.driverId);
                    return (
                      <tr key={s.id} className="border-t">
                        <td className="p-2 font-mono">{s.date}</td>
                        <td className="p-2 font-semibold text-blue-900">{drv?.name || "Unassigned"}</td>
                        <td className="p-2">{s.customer}</td>
                        <td className="p-2 text-right font-mono">{s.bagsSold}</td>
                        <td className="p-2 text-right font-mono font-bold text-green-800">{fmtGHS(s.totalAmount)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/*  ADMIN MANAGEMENT MODULE & BUSINESS DETAILS REGISTRATION               */
/* ---------------------------------------------------------------------- */
function AdminManagementModule({ data, mutate, showToast }) {
  const [selectedUserId, setSelectedUserId] = useState(data.users[0]?.id || "");
  const [newPassword, setNewPassword] = useState("");
  const [unitPrice, setUnitPrice] = useState(data.settings.pricePerBag || 5.0);

  const [bizName, setBizName] = useState(data.businessDetails?.name || "");
  const [bizPhone, setBizPhone] = useState(data.businessDetails?.phone || "");
  const [bizAddress, setBizAddress] = useState(data.businessDetails?.address || "");
  const [bizTin, setBizTin] = useState(data.businessDetails?.tin || "");

  const [driverName, setDriverName] = useState("");
  const [truckNo, setTruckNo] = useState("");
  const [driverPassword, setDriverPassword] = useState("");

  const drivers = useMemo(() => data.users.filter((u) => u.role === "driver"), [data.users]);
  const [editDriverId, setEditDriverId] = useState(drivers[0]?.id || "");
  const [editDriverName, setEditDriverName] = useState("");
  const [editTruckNo, setEditTruckNo] = useState("");
  const [editDriverPassword, setEditDriverPassword] = useState("");

  useEffect(() => {
    const selected = drivers.find((d) => d.id === editDriverId);
    if (selected) {
      setEditDriverName(selected.name);
      setEditTruckNo(selected.truckNo || "");
      setEditDriverPassword(selected.password || "");
    }
  }, [editDriverId, drivers]);

  const handleSaveBusinessDetails = (e) => {
    e.preventDefault();
    mutate((prev) => ({
      ...prev,
      businessDetails: {
        name: bizName,
        phone: bizPhone,
        address: bizAddress,
        tin: bizTin,
        isRegistered: true,
      },
      settings: {
        ...prev.settings,
        companyName: bizName || prev.settings.companyName,
      },
    }), "Updated Business Details", bizName);

    showToast("Business Details Updated!");
  };

  const handleResetPassword = (e) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) return showToast("Password must be at least 6 characters long!", "warn");

    mutate((prev) => ({
      ...prev,
      users: prev.users.map((u) => (u.id === selectedUserId ? { ...u, password: newPassword } : u)),
    }), "Reset User Password", `Reset password for user ID ${selectedUserId}`);

    setNewPassword("");
    showToast("Password updated successfully!");
  };

  const handleUpdatePrice = (e) => {
    e.preventDefault();
    if (Number(unitPrice) <= 0) return showToast("Price must be positive!", "warn");

    mutate((prev) => ({
      ...prev,
      settings: { ...prev.settings, pricePerBag: Number(unitPrice) },
    }), "Updated Bag Unit Price", `GH₵ ${unitPrice} per bag`);

    showToast("Unit Selling Price Saved!");
  };

  const handleAddDriver = (e) => {
    e.preventDefault();
    if (!driverName || !truckNo || !driverPassword) return showToast("Fill all driver fields", "warn");
    if (driverPassword.length < 6) return showToast("Driver password must be at least 6 characters!", "warn");

    const newDriverUser = {
      id: uid(),
      name: driverName,
      role: "driver",
      password: driverPassword,
      truckNo,
    };

    mutate((prev) => ({
      ...prev,
      users: [...prev.users, newDriverUser],
    }), "Added Delivery Driver", driverName);

    setDriverName(""); setTruckNo(""); setDriverPassword("");
    showToast("Delivery Driver Created!");
  };

  const handleEditDriver = (e) => {
    e.preventDefault();
    if (!editDriverId) return;

    mutate((prev) => ({
      ...prev,
      users: prev.users.map((u) =>
        u.id === editDriverId
          ? { ...u, name: editDriverName, truckNo: editTruckNo, password: editDriverPassword }
          : u
      ),
    }), "Updated Driver Details", editDriverName);

    showToast("Driver details updated successfully!");
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="font-display font-800 text-2xl text-[#0B3B45]">Admin Settings & Security Controls</p>
        <p className="text-sm text-[#5B6B68]">Manage business details, role passwords, global selling price, and delivery drivers.</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* BUSINESS DETAILS EDIT FORM */}
        <form onSubmit={handleSaveBusinessDetails} className="bg-white p-5 rounded-2xl border border-[#DDE3DA] space-y-3">
          <div className="flex justify-between items-center">
            <p className="font-bold text-[#0B3B45]">Business Details & Branding</p>
            {data.businessDetails?.isRegistered ? (
              <span className="text-[10px] bg-green-100 text-green-800 font-bold px-2 py-0.5 rounded">Registered</span>
            ) : (
              <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded">Pending Setup</span>
            )}
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500">Business / Company Name</label>
            <input value={bizName} onChange={(e) => setBizName(e.target.value)} placeholder="e.g. Ghana Pure Water Ltd" className="inp" required />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500">Business Phone Number</label>
            <input value={bizPhone} onChange={(e) => setBizPhone(e.target.value)} placeholder="e.g. +233 24 123 4567" className="inp" />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500">Business Address</label>
            <input value={bizAddress} onChange={(e) => setBizAddress(e.target.value)} placeholder="e.g. Plot 12 Industrial Area, Accra" className="inp" />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500">Tax Identification Number (TIN)</label>
            <input value={bizTin} onChange={(e) => setBizTin(e.target.value)} placeholder="e.g. C0001234567" className="inp" />
          </div>
          <button type="submit" className="btn-primary w-full"><Pencil size={15} /> Save Business Profile</button>
        </form>

        <form onSubmit={handleUpdatePrice} className="bg-white p-5 rounded-2xl border border-[#DDE3DA] space-y-3">
          <p className="font-bold text-[#0B3B45]">Standard Selling Price Setup</p>
          <div>
            <label className="text-xs font-semibold text-gray-500">Sachet Bag Price (GH₵)</label>
            <input type="number" min="0.01" step="0.01" value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)} className="inp" required />
          </div>
          <button type="submit" className="btn-primary w-full">Save Selling Price</button>
        </form>

        <form onSubmit={handleResetPassword} className="bg-white p-5 rounded-2xl border border-[#DDE3DA] space-y-3">
          <p className="font-bold text-[#0B3B45]">System Account Password Reset</p>
          <div>
            <label className="text-xs font-semibold text-gray-500">Select Role Account</label>
            <select value={selectedUserId} onChange={(e) => setSelectedUserId(e.target.value)} className="inp">
              {data.users.map((u) => (
                <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500">New Password (Min 6 chars)</label>
            <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="inp" required />
          </div>
          <button type="submit" className="btn-primary w-full">Set Password</button>
        </form>

        <form onSubmit={handleAddDriver} className="bg-white p-5 rounded-2xl border border-[#DDE3DA] space-y-3">
          <p className="font-bold text-[#0B3B45]">Register Driver Account</p>
          <div>
            <label className="text-xs font-semibold text-gray-500">Driver Full Name</label>
            <input value={driverName} onChange={(e) => setDriverName(e.target.value)} placeholder="e.g. Yaw Mensah" className="inp" required />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500">Truck Reg. Number</label>
            <input value={truckNo} onChange={(e) => setTruckNo(e.target.value)} placeholder="e.g. GT-8819-23" className="inp" required />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500">Login Password</label>
            <input type="password" value={driverPassword} onChange={(e) => setDriverPassword(e.target.value)} placeholder="Assign password" className="inp" required />
          </div>
          <button type="submit" className="btn-primary w-full"><Plus size={15} /> Add Driver</button>
        </form>

        <form onSubmit={handleEditDriver} className="bg-white p-5 rounded-2xl border border-[#DDE3DA] space-y-3 lg:col-span-2">
          <p className="font-bold text-[#0B3B45]">Edit Driver Details</p>
          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-500">Select Driver</label>
              <select value={editDriverId} onChange={(e) => setEditDriverId(e.target.value)} className="inp" required>
                {drivers.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500">Name</label>
              <input value={editDriverName} onChange={(e) => setEditDriverName(e.target.value)} className="inp" required />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500">Truck Reg. Number</label>
              <input value={editTruckNo} onChange={(e) => setEditTruckNo(e.target.value)} className="inp" required />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500">Password</label>
              <input type="password" value={editDriverPassword} onChange={(e) => setEditDriverPassword(e.target.value)} className="inp" required />
            </div>
          </div>
          <button type="submit" className="btn-primary w-full"><Pencil size={15} /> Update Driver Details</button>
        </form>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/*  AUDIT LOG & TOAST COMPONENTS                                          */
/* ---------------------------------------------------------------------- */
function AuditLog({ data }) {
  const handlePrintAudit = () => {
    window.print();
  };

  return (
    <div className="bg-white p-5 rounded-2xl border border-[#DDE3DA] space-y-4">
      <div className="flex justify-between items-center">
        <p className="font-bold text-[#0B3B45]">System Security Audit Trail</p>
        <button onClick={handlePrintAudit} className="btn-primary py-1.5 px-3 text-xs bg-[#1C8C9E]">
          <Printer size={14} /> Print Audit Trail PDF
        </button>
      </div>

      <div id="printable-area" className="max-h-96 overflow-y-auto">
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
            {data.auditLog.map((a) => (
              <tr key={a.id} className="border-t">
                <td className="p-2 font-mono text-gray-400">{new Date(a.ts).toLocaleString()}</td>
                <td className="p-2 font-semibold">{a.user}</td>
                <td className="p-2 font-mono text-blue-800">{a.role}</td>
                <td className="p-2 font-bold">{a.action}</td>
                <td className="p-2 text-gray-600">{a.detail}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Toast({ msg, tone }) {
  return (
    <div className={`fixed bottom-5 right-5 z-50 px-4 py-3 rounded-xl shadow-2xl text-xs font-bold text-white flex items-center gap-2 ${tone === "warn" ? "bg-[#C4472F]" : "bg-[#2A6E4A]"}`}>
      <CheckCircle2 size={16} />
      <span>{msg}</span>
    </div>
  );
}