import { useState, useEffect, useCallback } from 'react';
import { Droplets } from "lucide-react";
import { supabase, syncToSupabase } from './lib/supabaseClient';
import { emptyData, loadData, saveData } from './lib/storage';
import { uid } from './lib/helpers';
import { CSS_TOOLKIT } from './styles/styles';
import { rolesConfig, getRoleMeta, hasPermission } from './config/roles';
import { Toast } from './components/Toast';
import { LoginScreen } from './components/LoginScreen';
import { BusinessDetailsModal } from './components/BusinessDetailsModal';
import { Sidebar, TopBar } from './components/Navigation';
import { Dashboard } from './components/Dashboard';
import { WarehouseModule } from './components/WarehouseAndPackingModule';
import { ProductionModule } from './components/ProductionModule';
import { SalesModule } from './components/SalesModule';
import { ReportsModule } from './components/ReportsAndDrivers';
import { AdminManagementModule } from './components/AdminAndRole';
import { AuditLog } from './components/AuditLog';

const SESSION_STORAGE_KEY = "pureledger_active_session";
const ACTIVE_PAGE_KEY = "pureledger_active_page";

// PWA Service Worker Registration
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/service-worker.js").catch((err) => {
      console.log("SW registration failed: ", err);
    });
  });
}

export default function App() {
  // Restore session & page from sessionStorage on app mount
  const [session, setSession] = useState(() => {
    try {
      const savedSession = sessionStorage.getItem(SESSION_STORAGE_KEY);
      return savedSession ? JSON.parse(savedSession) : null;
    } catch {
      return null;
    }
  });

  const [page, setPage] = useState(() => {
    return sessionStorage.getItem(ACTIVE_PAGE_KEY) || "dashboard";
  });

  const [data, setData] = useState(emptyData);
  const [loaded, setLoaded] = useState(false);
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

  // Persist current page to sessionStorage when changed
  const handlePageChange = useCallback((newPage) => {
    setPage(newPage);
    sessionStorage.setItem(ACTIVE_PAGE_KEY, newPage);
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
              ...(draft.auditLog || []),
            ].slice(0, 999),
          }
        : draft;

      // Persist entries immediately to local storage
      saveData(withAudit);
      return withAudit;
    });
  }, [session]);

  const handleLogin = (s) => {
    setSession(s);
    sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(s));

    const roleMeta = getRoleMeta(s.role);
    const initialPage = roleMeta.defaultLandingPage || "dashboard";
    handlePageChange(initialPage);

    showToast(`Welcome, ${s.name}`);

    if (s.role === "owner" && !data.businessDetails?.isRegistered) {
      setShowBusinessModal(true);
    }
  };

  const handleLogout = async () => {
    // 1. Force flush current local storage entries
    await saveData(data);

    // 2. Clear tab session memory
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
    sessionStorage.removeItem(ACTIVE_PAGE_KEY);

    // 3. Reset React state
    setSession(null);
    setPage("dashboard");
    showToast("Signed out successfully");
  };

  const handleResetAdminPassword = (fullNameInput, emailInput, newPass) => {
    const adminUser = (data.users || []).find(
      (u) =>
        u.role === "owner" &&
        u.email && u.email.toLowerCase() === emailInput.trim().toLowerCase() &&
        u.name && u.name.toLowerCase() === fullNameInput.trim().toLowerCase()
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
        rolesConfig={rolesConfig}
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
          setPage={(p) => { handlePageChange(p); setMobileNavOpen(false); }}
          role={session.role}
          onLogout={handleLogout}
          open={mobileNavOpen}
          onClose={() => setMobileNavOpen(false)}
        />
        <div className="flex-1 min-w-0">
          <TopBar 
            session={session} 
            online={online} 
            onMenuClick={() => setMobileNavOpen(true)} 
            onLogout={handleLogout} 
            data={data} 
            mutate={mutate} 
          />
          <main className="p-4 sm:p-6 max-w-6xl mx-auto">
            {page === "dashboard" && hasPermission(session.role, "dashboard") && (
              <Dashboard data={data} mutate={mutate} session={session} showToast={showToast} />
            )}
            {page === "warehouse" && hasPermission(session.role, "warehouse") && (
              <WarehouseModule data={data} mutate={mutate} session={session} showToast={showToast} />
            )}
            {page === "production" && hasPermission(session.role, "production") && (
              <ProductionModule data={data} mutate={mutate} session={session} showToast={showToast} />
            )}
            {page === "sales" && hasPermission(session.role, "sales") && (
              <SalesModule data={data} mutate={mutate} session={session} showToast={showToast} />
            )}
            {page === "reports" && hasPermission(session.role, "reports") && (
              <ReportsModule data={data} mutate={mutate} session={session} showToast={showToast} />
            )}
            {page === "admin" && hasPermission(session.role, "admin") && (
              <AdminManagementModule data={data} mutate={mutate} showToast={showToast} />
            )}
            {page === "audit" && hasPermission(session.role, "audit") && (
              <AuditLog data={data} mutate={mutate} showToast={showToast} />
            )}
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