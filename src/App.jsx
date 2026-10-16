import { lazy, Suspense, useState, useEffect, useCallback, useRef } from "react";
import { Droplets } from "lucide-react";
import {
  createOrganization,
  acceptOrganizationInvite,
  backfillOrganizationDocument,
  getAuthenticatedUser,
  getPersistedSessionUser,
  getOrganization,
  getSupabaseStatus,
  requestPasswordReset,
  signIn,
  signOut,
  signUp,
  supabase,
  syncToSupabase,
  updatePassword,
  updateOrganizationName,
} from "./lib/supabaseClient";
import {
  cacheOrganizationContext,
  clearOfflineAccess,
  clearTenantCache,
  enableOfflineAccess,
  emptyData,
  getOfflineAccessProfile,
  getCachedOrganizationContext,
  loadData,
  saveData,
  refreshData,
  unlockOfflineAccess,
  updateOfflineSnapshot,
} from "./lib/storage";
import { uid } from "./lib/helpers";
import { CSS_TOOLKIT } from "./styles/styles";
import { getRoleMeta, hasPermission } from "./config/roles";
import { Toast } from "./components/Toast";
import { LoginScreen } from "./components/LoginScreen";
import { BusinessDetailsModal } from "./components/BusinessDetailsModal";
import { Sidebar, TopBar } from "./components/Navigation";
import { TermsAndPolicy } from "./components/TermsAndPolicy";
const Dashboard = lazy(() =>
  import("./components/Dashboard").then((module) => ({
    default: module.Dashboard,
  })),
);
const WarehouseModule = lazy(() =>
  import("./components/WarehouseAndPackingModule").then((module) => ({
    default: module.WarehouseModule,
  })),
);
const ProductionModule = lazy(() =>
  import("./components/ProductionModule").then((module) => ({
    default: module.ProductionModule,
  })),
);
const SalesModule = lazy(() =>
  import("./components/SalesModule").then((module) => ({
    default: module.SalesModule,
  })),
);
const ReportsModule = lazy(() =>
  import("./components/ReportsAndDrivers").then((module) => ({
    default: module.ReportsModule,
  })),
);
const AdminManagementModule = lazy(() =>
  import("./components/AdminAndRole").then((module) => ({
    default: module.AdminManagementModule,
  })),
);
const AuditLog = lazy(() =>
  import("./components/AuditLog").then((module) => ({
    default: module.AuditLog,
  })),
);
const ACTIVE_PAGE_KEY = "pureledger_active_page";

export default function App() {
  const [session, setSession] = useState(null);
  const [authUser, setAuthUser] = useState(null);
  const [organization, setOrganization] = useState(null);
  const [offlineProfile, setOfflineProfile] = useState(null);
  const [offlineRecoveryRequired, setOfflineRecoveryRequired] = useState(false);

  const [page, setPage] = useState(() => {
    return sessionStorage.getItem(ACTIVE_PAGE_KEY) || "dashboard";
  });

  const [data, setData] = useState(emptyData);
  const [loaded, setLoaded] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState("");
  const [passwordRecovery, setPasswordRecovery] = useState(false);
  const [syncStatus, setSyncStatus] = useState("idle");
  const [online, setOnline] = useState(navigator.onLine);
  const [toast, setToast] = useState(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [showBusinessModal, setShowBusinessModal] = useState(false);
  const supabaseConfigured = getSupabaseStatus().configured;
  const revisionRef = useRef(0);
  const cloudBaseDataRef = useRef(null);
  const saveQueueRef = useRef(Promise.resolve());
  const offlineKeyRef = useRef(null);
  const offlineOnlyRef = useRef(false);

  useEffect(() => {
    document.title = organization?.name || "Water Operations";
  }, [organization?.name]);

  const activateUser = useCallback(async (
    user,
    offlineOrganization = null,
    offlineSnapshot = null,
    offlineKey = null,
  ) => {
    setAuthError("");
    const memberOrganization =
      offlineOrganization || (await getOrganization(user.id));
    if (!memberOrganization) {
      setAuthUser(user);
      setOrganization(null);
      setSession(null);
      setData(emptyData);
      setLoaded(true);
      return;
    }

    const loadedTenant =
      offlineSnapshot || (await loadData(memberOrganization));
    revisionRef.current = loadedTenant.revision;
    cloudBaseDataRef.current = loadedTenant.cloudData || null;
    if (offlineKey) offlineKeyRef.current = offlineKey;
    if (navigator.onLine) {
      try {
        cacheOrganizationContext(user.id, memberOrganization);
      } catch (error) {
        console.error("Could not cache the company session for offline use:", error);
      }
    }
    setAuthUser(user);
    setOrganization(memberOrganization);
    setSession({
      id: user.id,
      email: user.email,
      name: memberOrganization.userName,
      role: memberOrganization.role,
    });
    setSyncStatus(loadedTenant.syncStatus);
    setData({
      ...loadedTenant.data,
      businessDetails: {
        ...loadedTenant.data.businessDetails,
        name: memberOrganization.name,
      },
      settings: {
        ...loadedTenant.data.settings,
        companyName: memberOrganization.name,
      },
    });
    setLoaded(true);
  }, []);

  const showToast = useCallback((msg, tone = "ok") => {
    setToast({ msg, tone });
    setTimeout(() => setToast(null), 3000);
  }, []);

  useEffect(() => {
    let active = true;
    const restoreAuth = async () => {
      try {
        let profile = null;
        try {
          profile = getOfflineAccessProfile();
        } catch (error) {
          console.error("Saved offline access could not be read:", error);
          showToast(
            "Saved offline data could not be checked. Continuing with cloud sign-in.",
            "warn",
          );
        }
        setOfflineProfile(profile);
        if (navigator.onLine) {
          const user = await getAuthenticatedUser();
          if (active && user && profile?.userId === user.id && profile.pending) {
            setAuthUser(user);
            setOfflineRecoveryRequired(true);
          } else if (active && user) {
            await activateUser(user);
          }
        } else {
          const user = await getPersistedSessionUser();
          if (active && user) {
            const cachedOrganization = getCachedOrganizationContext(user.id);
            if (!cachedOrganization) {
              throw new Error(
                "No saved company session is available offline. Connect to the internet and sign in first.",
              );
            }
            await activateUser(user, cachedOrganization);
          }
        }
      } catch (error) {
        if (active) setAuthError(error.message);
      } finally {
        if (active) setAuthLoading(false);
      }
    };

    restoreAuth();
    const subscription = supabase?.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" && active) {
        setPasswordRecovery(true);
      }
      if (event === "SIGNED_OUT" && active) {
        setPasswordRecovery(false);
        setAuthUser(null);
        setOrganization(null);
        setSession(null);
        setData(emptyData);
        setLoaded(false);
      }
    }).data.subscription;

    return () => {
      active = false;
      subscription?.unsubscribe();
    };
  }, [activateUser, showToast]);

  // Persist current page to sessionStorage when changed
  const handlePageChange = useCallback((newPage) => {
    setPage(newPage);
    sessionStorage.setItem(ACTIVE_PAGE_KEY, newPage);
  }, []);

  useEffect(() => {
    if (!session || hasPermission(session.role, page)) return;
    const landingPage = getRoleMeta(session.role).defaultLandingPage;
    if (landingPage !== page) handlePageChange(landingPage);
  }, [handlePageChange, page, session]);

  const persistTenantData = useCallback(
    (nextData, tenant = organization) => {
      const save = saveQueueRef.current
        .catch(() => undefined)
        .then(() =>
          saveData(nextData, tenant, revisionRef.current, {
            offlineKey: offlineKeyRef.current,
            localOnly: offlineOnlyRef.current,
            cloudData: cloudBaseDataRef.current,
          }),
        )
        .then((result) => {
          if (result.syncResult.success) {
            revisionRef.current = result.revision;
            cloudBaseDataRef.current = nextData;
          }
          return result;
        });
      saveQueueRef.current = save.catch(() => undefined);
      return save;
    },
    [organization],
  );

  const syncOrRefresh = useCallback(async () => {
    if (
      !loaded ||
      !organization ||
      !navigator.onLine ||
      offlineOnlyRef.current
    )
      return;
    if (syncStatus === "migration_required") return;
    try {
      if (syncStatus === "conflict") {
        showToast(
          "Sync conflict: local entries are preserved. Ask the company owner to reconcile changes before continuing.",
          "warn",
        );
        return;
      }
      if (syncStatus === "pending") {
        const result = await persistTenantData(data);
        if (!result.localSuccess || !result.syncResult.success) {
          const conflict = result.syncResult.conflict;
          setSyncStatus(
            !result.localSuccess ? "error" : conflict ? "conflict" : "pending",
          );
          showToast(
            !result.localSuccess
              ? `Local save failed: ${result.localError?.message || "storage write failed"}`
              : conflict
              ? "Sync conflict: local entries are preserved and were not uploaded."
              : "Cloud sync failed. Your local entries are still saved on this device.",
            "warn",
          );
          return;
        }
        setSyncStatus("synced");
        return;
      }

      const remote = await refreshData(organization);
      if (!remote.success) {
        setSyncStatus("pending");
        showToast("Could not verify cloud data. Local data is unchanged.", "warn");
        return;
      }
      revisionRef.current = remote.revision;
      setData(remote.data);
      cloudBaseDataRef.current = remote.data;
      setSyncStatus("synced");
    } catch (error) {
      setSyncStatus("pending");
      showToast(`Cloud sync error: ${error.message}`, "warn");
    }
  }, [data, loaded, organization, persistTenantData, showToast, syncStatus]);

  useEffect(() => {
    const on = () => {
      setOnline(true);
      syncOrRefresh();
    };
    const off = () => setOnline(false);
    const onFocus = () => {
      if (navigator.onLine) syncOrRefresh();
    };
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    window.addEventListener("focus", onFocus);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
      window.removeEventListener("focus", onFocus);
    };
  }, [syncOrRefresh]);

  const mutate = useCallback(
    (updater, auditAction, auditDetail) => {
      if (syncStatus === "migration_required") {
        showToast(
          "Company records are locked until the owner imports the verified legacy document.",
          "warn",
        );
        return;
      }
      setData((prev) => {
        const draft = updater(prev);
        const withAudit = session
          ? {
              ...draft,
              auditLog: [
                {
                  id: uid(),
                  ts: new Date().toISOString(),
                  user: session.name,
                  userId: session.id,
                  role: session.role,
                  action: auditAction,
                  detail: auditDetail,
                },
                ...(draft.auditLog || []),
              ].slice(0, 999),
            }
          : draft;

        // Persist entries immediately to local storage
        setSyncStatus("saving");
        persistTenantData(withAudit)
          .then((result) => {
            if (!result.localSuccess) {
              setSyncStatus("error");
              showToast(
                `Could not save on this device: ${result.localError?.message || "storage write failed"}`,
                "warn",
              );
              return;
            }
            if (!result.syncResult.success) {
              setSyncStatus(
                result.syncResult.conflict ? "conflict" : "pending",
              );
              if (!result.syncResult.conflict) {
                showToast(
                  "Saved on this device, but cloud sync is not confirmed.",
                  "warn",
                );
              }
              return;
            }
            setSyncStatus("synced");
          })
          .catch((error) => {
            setSyncStatus("pending");
            showToast(`Save failed: ${error.message}`, "warn");
          });
        return withAudit;
      });
    },
    [session, persistTenantData, showToast, syncStatus],
  );

  const handleLogin = async (email, password) => {
    try {
      const user = await signIn(email, password);
      const profile = getOfflineAccessProfile();
      offlineOnlyRef.current = false;
      offlineKeyRef.current = null;
      if (profile?.userId === user.id && profile.pending) {
        setAuthUser(user);
        setOfflineRecoveryRequired(true);
        setAuthError("");
        return;
      }
      await activateUser(user);
      showToast(`Signed in as ${user.email}`);
    } catch (error) {
      setAuthError(error.message);
    }
  };

  const handleSignUp = async (email, password) => {
    try {
      const result = await signUp(email, password);
      if (result.user && result.session) {
        offlineOnlyRef.current = false;
        offlineKeyRef.current = null;
        await activateUser(result.user);
      }
      return Boolean(result.session);
    } catch (error) {
      setAuthError(error.message);
      return false;
    }
  };

  const handleCreateOrganization = async (name) => {
    if (!authUser) {
      setAuthError("Sign in before creating a company workspace.");
      return;
    }
    try {
      setAuthError("");
      const memberOrganization =
        (await getOrganization(authUser.id)) ||
        (await createOrganization(name, authUser.id));
      await activateUser(authUser, memberOrganization);
      showToast("Company workspace created.");
    } catch (error) {
      setAuthError(error.message);
    }
  };

  const handleJoinOrganization = async (code, fullName) => {
    try {
      await acceptOrganizationInvite(code, fullName);
      offlineOnlyRef.current = false;
      await activateUser(authUser);
    } catch (error) {
      setAuthError(error.message);
    }
  };

  const handleEnableOfflineAccess = async (pin) => {
    try {
      const key = await enableOfflineAccess(
        authUser.id,
        organization,
        data,
        revisionRef.current,
        pin,
        cloudBaseDataRef.current,
      );
      offlineKeyRef.current = key;
      let profile = null;
      try {
        profile = getOfflineAccessProfile();
      } catch (error) {
        console.error("Saved offline access could not be read:", error);
        setAuthError(
          "Saved offline access is damaged. You can still sign in online.",
        );
      }
      setOfflineProfile(profile);
      showToast("Encrypted offline access enabled for this device.");
    } catch (error) {
      showToast(`Offline access could not be enabled: ${error.message}`, "warn");
      throw error;
    }
  };

  const handleOfflineUnlock = async (pin) => {
    try {
      const snapshot = await unlockOfflineAccess(pin);
      offlineKeyRef.current = snapshot.key;
      const user = { id: snapshot.userId, email: "" };
      let loadedOffline = {
        data: snapshot.data,
        revision: snapshot.revision,
        syncStatus: snapshot.pending ? "pending" : "offline",
      };
      if (navigator.onLine && authUser?.id === snapshot.userId && snapshot.pending) {
        const syncResult = await syncToSupabase(
          snapshot.data,
          snapshot.organization,
          snapshot.revision,
          snapshot.cloudData,
        );
        if (syncResult.success) {
          await updateOfflineSnapshot(
            snapshot.userId,
            snapshot.organization,
            snapshot.data,
            syncResult.revision,
            snapshot.key,
            false,
            snapshot.data,
          );
          loadedOffline = {
            ...loadedOffline,
            revision: syncResult.revision,
            syncStatus: "synced",
            cloudData: snapshot.data,
          };
          offlineOnlyRef.current = false;
          setOfflineRecoveryRequired(false);
        } else {
          offlineOnlyRef.current = true;
          loadedOffline.syncStatus = syncResult.conflict ? "conflict" : "pending";
          loadedOffline.cloudData = snapshot.cloudData;
          setAuthError(
            syncResult.conflict
              ? "Offline data was not uploaded because the cloud copy changed. Your encrypted local entries are preserved."
              : "Offline data is restored locally but could not be synced. It remains on this device.",
          );
        }
      } else {
        offlineOnlyRef.current = true;
        loadedOffline.cloudData = snapshot.cloudData;
      }
      await activateUser(
        user,
        snapshot.organization,
        loadedOffline,
        snapshot.key,
      );
      clearTenantCache(snapshot.organization.id);
      setOfflineProfile(getOfflineAccessProfile());
      setSyncStatus(loadedOffline.syncStatus);
      if (loadedOffline.syncStatus === "conflict") {
        showToast(
          "Offline changes are preserved in the encrypted vault but conflict with newer cloud data.",
          "warn",
        );
      }
    } catch (error) {
      setAuthError(error.message);
      throw error;
    }
  };

  const handleRemoveOfflineAccess = async () => {
    if (!authUser || !organization) return;
    clearOfflineAccess(authUser.id);
    clearTenantCache(organization.id);
    offlineKeyRef.current = null;
    setOfflineProfile(null);
    const loadedTenant = await loadData(organization);
    revisionRef.current = loadedTenant.revision;
    setData(loadedTenant.data);
    setSyncStatus(loadedTenant.syncStatus);
    showToast("Encrypted offline access removed from this device.");
  };

  const handleLogout = async (offlinePin) => {
    let syncWarning = "";
    if (organization) {
      await saveQueueRef.current;
      let result;
      if (offlineProfile?.userId === organization.userId) {
        try {
          const key = offlinePin
            ? (await unlockOfflineAccess(offlinePin)).key
            : offlineKeyRef.current;
          if (!key) {
            throw new Error("Enter the device PIN to secure offline data before signing out.");
          }
          result = await saveData(data, organization, revisionRef.current, {
            offlineKey: key,
            localOnly: offlineOnlyRef.current,
            cloudData: cloudBaseDataRef.current,
          });
          if (result.localSuccess) {
            clearTenantCache(organization.id);
          }
        } catch (error) {
          showToast(`Offline data could not be secured: ${error.message}`, "warn");
              return false;
        }
      } else {
        result = await saveData(data, organization, revisionRef.current, {
          offlineKey: offlineKeyRef.current,
          localOnly: offlineOnlyRef.current,
          cloudData: cloudBaseDataRef.current,
        });
      }
      if (!result.localSuccess) {
        setSyncStatus("error");
        showToast(
          `Could not save before sign-out: ${result.localError?.message || "storage write failed"}`,
          "warn",
        );
        return false;
      } else if (!result.syncResult.success) {
        setSyncStatus(result.syncResult.conflict ? "conflict" : "pending");
        syncWarning =
          "Signed out; some changes are not confirmed in the cloud.";
      }
    }
    if (!offlineOnlyRef.current) {
      try {
        await signOut();
      } catch (error) {
        showToast(`Sign-out failed: ${error.message}`, "warn");
        return false;
      }
    }
    sessionStorage.removeItem(ACTIVE_PAGE_KEY);

    setAuthUser(null);
    setOrganization(null);
    setSession(null);
    setData(emptyData);
    setLoaded(false);
    revisionRef.current = 0;
    cloudBaseDataRef.current = null;
    offlineOnlyRef.current = false;
    offlineKeyRef.current = null;
    setPage("dashboard");
    showToast(syncWarning || "Signed out successfully", syncWarning ? "warn" : "ok");
    return true;
  };

  const handleSaveBusinessDetails = async (details) => {
    if (syncStatus === "migration_required") {
      showToast(
        "Company records are locked until the owner imports the verified legacy document.",
        "warn",
      );
      return;
    }
    if (organization) {
      try {
        await updateOrganizationName(organization.id, details.name);
        setOrganization({ ...organization, name: details.name });
      } catch (error) {
        showToast(`Company name could not be updated: ${error.message}`, "warn");
        return;
      }
    }
    mutate(
      (prev) => ({
        ...prev,
        businessDetails: {
          ...details,
          isRegistered: true,
        },
        settings: {
          ...prev.settings,
          companyName: details.name || prev.settings.companyName,
        },
      }),
      "Updated Business Details",
      details.name,
    );

    setShowBusinessModal(false);
    showToast("Business Details Saved Successfully!");
  };

  const handleLegacyBackfillComplete = async () => {
    const copied = await backfillOrganizationDocument(
      organization.id,
      organization.productId,
    );
    const refreshed = await refreshData(organization);
    if (!refreshed.success) {
      throw new Error(
        `The legacy import completed (${copied} records), but the new records could not be reloaded: ${refreshed.error?.message || "refresh failed"}`,
      );
    }
    revisionRef.current = refreshed.revision;
    cloudBaseDataRef.current = refreshed.cloudData;
    setData({
      ...refreshed.data,
      businessDetails: {
        ...refreshed.data.businessDetails,
        name: organization.name,
      },
      settings: {
        ...refreshed.data.settings,
        companyName: organization.name,
      },
    });
    setSyncStatus("synced");
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0B3B45]">
        <div className="flex items-center gap-3 text-[#EAF3F1]">
          <Droplets className="animate-pulse" size={28} />
          <span className="font-mono text-sm tracking-widest uppercase">
            Loading Water Operations…
          </span>
        </div>
      </div>
    );
  }

  if (passwordRecovery) {
    return (
      <LoginScreen
        passwordRecovery
        error={authError}
        onUpdatePassword={async (password) => {
          try {
            await updatePassword(password);
            setPasswordRecovery(false);
            await signOut();
          } catch (error) {
            setAuthError(error.message);
          }
        }}
      />
    );
  }

  if (!session) {
    return (
      <LoginScreen
        error={authError}
        workspaceRequired={Boolean(authUser) && !offlineRecoveryRequired}
        companyName={organization?.name || ""}
        offlineAccessAvailable={Boolean(offlineProfile) && !online}
        offlineRecoveryRequired={offlineRecoveryRequired}
        offlineCompanyName={offlineProfile?.organization.name || ""}
        onLogin={handleLogin}
        onSignUp={handleSignUp}
        onResetPassword={requestPasswordReset}
        onCreateOrganization={handleCreateOrganization}
        onJoinOrganization={handleJoinOrganization}
        onUnlockOffline={handleOfflineUnlock}
      />
    );
  }

  if (!loaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0B3B45] text-white">
        Loading company data…
      </div>
    );
  }

  const activePage = hasPermission(session.role, page)
    ? page
    : getRoleMeta(session.role).defaultLandingPage;

  return (
    <div className="min-h-screen bg-[#F2F4EF] text-[#16211F] font-body">
      <style dangerouslySetInnerHTML={{ __html: CSS_TOOLKIT }} />
      <div className="flex">
        <Sidebar
          page={activePage}
          setPage={(p) => {
            handlePageChange(p);
            setMobileNavOpen(false);
          }}
          role={session.role}
          companyName={organization.name}
          onLogout={handleLogout}
          offlineAccessEnabled={
            offlineProfile?.userId === organization.userId
          }
          open={mobileNavOpen}
          onClose={() => setMobileNavOpen(false)}
        />
        <div className="flex-1 min-w-0">
          <TopBar
            session={session}
            online={online}
            supabaseConfigured={supabaseConfigured}
            syncStatus={syncStatus}
            onMenuClick={() => setMobileNavOpen(true)}
            onLogout={handleLogout}
            data={data}
            mutate={mutate}
            offlineAccessEnabled={
              offlineProfile?.userId === organization.userId
            }
            offlineOnly={offlineOnlyRef.current}
            onEnableOfflineAccess={handleEnableOfflineAccess}
            onRemoveOfflineAccess={handleRemoveOfflineAccess}
          />
          <main className="p-4 sm:p-6 max-w-6xl mx-auto">
            {syncStatus === "migration_required" && (
              <div className="mb-5 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
                Legacy company data must be reviewed and imported by the owner
                before this workspace can be edited. Open Company Settings and
                use “Import verified legacy records” only after confirming the
                old document belongs to this company.
              </div>
            )}
            <Suspense
              fallback={
                <div className="rounded-xl border border-[#DDE3DA] bg-white p-6 text-sm text-[#5B6B68]">
                  Loading workspace...
                </div>
              }
            >
              {activePage === "dashboard" &&
                hasPermission(session.role, "dashboard") && (
                  <Dashboard
                    data={data}
                    mutate={mutate}
                    session={session}
                    showToast={showToast}
                  />
                )}
              {activePage === "warehouse" &&
                hasPermission(session.role, "warehouse") && (
                  <WarehouseModule
                    data={data}
                    mutate={mutate}
                    session={session}
                    showToast={showToast}
                  />
                )}
              {activePage === "production" &&
                hasPermission(session.role, "production") && (
                  <ProductionModule
                    data={data}
                    mutate={mutate}
                    session={session}
                    showToast={showToast}
                  />
                )}
              {activePage === "sales" &&
                hasPermission(session.role, "sales") && (
                  <SalesModule
                    data={data}
                    mutate={mutate}
                    session={session}
                    showToast={showToast}
                  />
                )}
              {activePage === "reports" &&
                hasPermission(session.role, "reports") && (
                  <ReportsModule
                    data={data}
                    mutate={mutate}
                    session={session}
                    showToast={showToast}
                  />
                )}
              {activePage === "admin" &&
                hasPermission(session.role, "admin") && (
                  <AdminManagementModule
                    data={data}
                    mutate={mutate}
                    showToast={showToast}
                    organization={organization}
                    syncStatus={syncStatus}
                    onSaveBusinessDetails={handleSaveBusinessDetails}
                    onLegacyBackfillComplete={handleLegacyBackfillComplete}
                  />
                )}
              {activePage === "audit" &&
                hasPermission(session.role, "audit") && (
                  <AuditLog data={data} mutate={mutate} showToast={showToast} />
                )}
              {activePage === "terms" && (
                <TermsAndPolicy companyName={organization.name} />
              )}
            </Suspense>
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
