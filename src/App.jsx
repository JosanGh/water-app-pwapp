import {
  Component,
  lazy,
  Suspense,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { Droplets } from "lucide-react";
import {
  createOrganization,
  acceptOrganizationInvite,
  backfillOrganizationDocument,
  getAuthenticatedUser,
  getPersistedSessionUser,
  getOrganization,
  getSupabaseStatus,
  isPlatformSubscriptionAdmin,
  organizationHasSubscriptionAccess,
  runTenantSyncSmokeTest,
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
  downloadPendingTenantCache,
  enableOfflineAccess,
  emptyData,
  hasDownloadedPendingTenantCache,
  getOfflineAccessProfile,
  getCachedOrganizationContext,
  hasPendingTenantCache,
  loadData,
  saveData,
  refreshData,
  unlockOfflineAccess,
  updateOfflineSnapshot,
} from "./lib/storage";
import { uid } from "./lib/helpers";
import { CSS_TOOLKIT } from "./styles/styles";
import { getRoleMeta, hasPermission } from "./config/roles";
import { isProductPage, PRODUCTS } from "./config/products";
import { Toast } from "./components/water-factory/Toast";
import { LoginScreen } from "./components/LoginScreen";
import { BusinessDetailsModal } from "./components/water-factory/BusinessDetailsModal";
import { Sidebar, TopBar } from "./components/water-factory/Navigation";
import { TermsAndPolicy } from "./components/water-factory/TermsAndPolicy";
const Dashboard = lazy(() =>
  import("./components/water-factory/Dashboard").then((module) => ({
    default: module.Dashboard,
  })),
);
const WarehouseModule = lazy(() =>
  import("./components/water-factory/WarehouseAndPackingModule").then(
    (module) => ({
      default: module.WarehouseModule,
    }),
  ),
);
const ProductionModule = lazy(() =>
  import("./components/water-factory/ProductionModule").then((module) => ({
    default: module.ProductionModule,
  })),
);
const SalesModule = lazy(() =>
  import("./components/water-factory/SalesModule").then((module) => ({
    default: module.SalesModule,
  })),
);
const ReportsModule = lazy(() =>
  import("./components/water-factory/ReportsAndDrivers").then((module) => ({
    default: module.ReportsModule,
  })),
);
const AdminManagementModule = lazy(() =>
  import("./components/water-factory/AdminAndRole").then((module) => ({
    default: module.AdminManagementModule,
  })),
);
const AuditLog = lazy(() =>
  import("./components/water-factory/AuditLog").then((module) => ({
    default: module.AuditLog,
  })),
);
const OverallGeneralReportView = lazy(() =>
  import("./components/water-factory/OverallGeneralReportView").then(
    (module) => ({
      default: module.OverallGeneralReportView,
    }),
  ),
);
const ElectricalShopDashboard = lazy(() =>
  import("./components/electrical/dashboard").then((module) => ({
    default: module.ElectricalShopDashboard,
  })),
);
const SupermarketDashboard = lazy(() =>
  import("./components/supermarket/dashboard").then((module) => ({
    default: module.SupermarketDashboard,
  })),
);
const SubscriptionAdminPortal = lazy(() =>
  import("./components/admin/SubscriptionAdminPortal").then((module) => ({
    default: module.SubscriptionAdminPortal,
  })),
);
const ACTIVE_PAGE_KEY = "pureledger_active_page";
const WORKSPACE_PRODUCT_KEY = "pureledger_workspace_product";

class WorkspacePageBoundary extends Component {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error) {
    console.error("Workspace page failed to render:", error);
  }

  render() {
    if (this.state.failed) {
      return (
        <section
          role="alert"
          className="rounded-2xl border border-amber-300 bg-amber-50 p-6 text-amber-950"
        >
          <h1 className="text-lg font-bold">This page could not be loaded</h1>
          <p className="mt-2 text-sm">
            Your saved company data has not been cleared. Check your connection,
            then reload the app to try again.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-4 rounded-lg bg-[#0B3B45] px-4 py-2 text-sm font-semibold text-white"
          >
            Reload app
          </button>
        </section>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  const [session, setSession] = useState(null);
  const [authUser, setAuthUser] = useState(null);
  const [organization, setOrganization] = useState(null);
  const [platformSubscriptionAdmin, setPlatformSubscriptionAdmin] =
    useState(false);
  const [offlineProfile, setOfflineProfile] = useState(null);
  const [offlineRecoveryRequired, setOfflineRecoveryRequired] = useState(false);

  const [page, setPage] = useState(() => {
    return sessionStorage.getItem(ACTIVE_PAGE_KEY) || "dashboard";
  });
  const [workspaceProductId, setWorkspaceProductId] = useState(() => {
    const savedProduct = sessionStorage.getItem(WORKSPACE_PRODUCT_KEY);
    return Object.values(PRODUCTS).some(
      (product) => product.id === savedProduct,
    )
      ? savedProduct
      : PRODUCTS.water.id;
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
  const expiryReminderRunRef = useRef("");

  useEffect(() => {
    document.title = organization?.name || "Water Operations";
  }, [organization?.name]);

  useEffect(() => {
    if (!import.meta.env.DEV || !organization) return undefined;
    const smokeTest = () => runTenantSyncSmokeTest(organization);
    window.runTenantSyncSmokeTest = smokeTest;
    return () => {
      if (window.runTenantSyncSmokeTest === smokeTest) {
        delete window.runTenantSyncSmokeTest;
      }
    };
  }, [organization]);

  const handleWorkspaceProductChange = useCallback((productId) => {
    if (!Object.values(PRODUCTS).some((product) => product.id === productId)) {
      return;
    }
    sessionStorage.setItem(WORKSPACE_PRODUCT_KEY, productId);
    setWorkspaceProductId(productId);
  }, []);

  const activateUser = useCallback(async (
    user,
    offlineOrganization = null,
    offlineSnapshot = null,
    offlineKey = null,
    selectedProductId = workspaceProductId,
  ) => {
    setAuthError("");
    const isPlatformAdmin =
      navigator.onLine && (await isPlatformSubscriptionAdmin());
    setPlatformSubscriptionAdmin(isPlatformAdmin);
    if (isPlatformAdmin) {
      setAuthUser(user);
      setOrganization(null);
      setSession(null);
      setData(emptyData);
      setLoaded(true);
      return;
    }

    const memberOrganization =
      offlineOrganization ||
      (await getOrganization(user.id, selectedProductId));
    if (!memberOrganization) {
      setAuthUser(user);
      setOrganization(null);
      setPlatformSubscriptionAdmin(false);
      setSession(null);
      setData(emptyData);
      setLoaded(true);
      return;
    }

    if (navigator.onLine) {
      try {
        cacheOrganizationContext(user.id, memberOrganization);
      } catch (error) {
        console.error("Could not cache the company session for offline use:", error);
      }
    }

    if (!organizationHasSubscriptionAccess(memberOrganization)) {
      setAuthUser(user);
      setOrganization(memberOrganization);
      setSession(null);
      setData(emptyData);
      setLoaded(true);
      setSyncStatus("idle");
      return;
    }

    const loadedTenant =
      offlineSnapshot || (await loadData(memberOrganization));
    revisionRef.current = loadedTenant.revision;
    cloudBaseDataRef.current = loadedTenant.cloudData || null;
    if (offlineKey) offlineKeyRef.current = offlineKey;
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
  }, [workspaceProductId]);

  useEffect(() => {
    if (!session || !organization) return undefined;
    const accessEndsAt =
      organization.subscriptionStatus === "active"
        ? organization.graceUntil || organization.expiresAt
        : organization.subscriptionStatus === "grace_period"
          ? organization.graceUntil
          : null;
    if (!accessEndsAt) return undefined;

    const remainingMs = new Date(accessEndsAt).getTime() - Date.now();
    if (!Number.isFinite(remainingMs)) return undefined;
    const timeout = window.setTimeout(() => {
      setSession(null);
      setData(emptyData);
      setSyncStatus("idle");
      setOrganization((current) =>
        current
          ? {
              ...current,
              subscriptionStatus: "expired",
              hasSubscriptionAccess: false,
            }
          : current,
      );
    }, Math.max(0, remainingMs));

    return () => window.clearTimeout(timeout);
  }, [organization, session]);

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
            handleWorkspaceProductChange(cachedOrganization.productId);
            await activateUser(
              user,
              cachedOrganization,
              null,
              null,
              cachedOrganization.productId,
            );
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
        setPlatformSubscriptionAdmin(false);
        setSession(null);
        setData(emptyData);
        setLoaded(false);
      }
    }).data.subscription;

    return () => {
      active = false;
      subscription?.unsubscribe();
    };
  }, [activateUser, handleWorkspaceProductChange, showToast]);

  // Persist current page to sessionStorage when changed
  const handlePageChange = useCallback((newPage) => {
    setPage(newPage);
    sessionStorage.setItem(ACTIVE_PAGE_KEY, newPage);
  }, []);

  useEffect(() => {
    if (!session || !organization) return;
    if (organization.productId !== PRODUCTS.water.id) {
      if (page !== organization.productId) {
        handlePageChange(organization.productId);
      }
      return;
    }
    if (
      isProductPage(page) ||
      !hasPermission(session.role, page)
    ) {
      const landingPage = getRoleMeta(session.role).defaultLandingPage;
      if (landingPage !== page) handlePageChange(landingPage);
    }
  }, [handlePageChange, organization, page, session]);

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
      if (syncStatus === "conflict" || syncStatus === "legacy_conflict") {
        showToast(
          syncStatus === "legacy_conflict"
            ? "Local data predates tenant-record sync. Export it before replacing this device copy with cloud data."
            : "Sync conflict: local entries are preserved. Ask the company owner to reconcile changes before continuing.",
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
      if (
        syncStatus === "migration_required" ||
        syncStatus === "legacy_conflict"
      ) {
        showToast(
          "Company records are locked until the pending data is reconciled.",
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
                  result.syncResult.error?.message
                    ? `Saved on this device, but cloud sync failed: ${result.syncResult.error.message}`
                    : "Saved on this device, but cloud sync is not confirmed.",
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

  useEffect(() => {
    if (
      !loaded ||
      !session ||
      !organization ||
      session.role !== "owner" ||
      !organization.expiresAt ||
      organization.subscriptionPlan === "one-time"
    ) {
      return undefined;
    }

    const checkForExpiryReminder = () => {
      const expiresAt = new Date(organization.expiresAt).getTime();
      const now = Date.now();
      const daysRemaining = Math.ceil((expiresAt - now) / 86_400_000);
      if (!Number.isFinite(expiresAt) || daysRemaining < 0 || daysRemaining > 14) {
        return;
      }

      const today = new Date(now).toISOString().slice(0, 10);
      const expiryDay = new Date(expiresAt).toISOString().slice(0, 10);
      const reminderId = `subscription-expiry-${organization.id}-${expiryDay}-${today}`;
      if (
        expiryReminderRunRef.current === reminderId ||
        data.notifications?.some((notification) => notification.id === reminderId)
      ) {
        return;
      }
      expiryReminderRunRef.current = reminderId;
      mutate(
        (previous) => ({
          ...previous,
          notifications: [
            {
              id: reminderId,
              title: "Subscription expiry reminder",
              msg:
                daysRemaining === 0
                  ? `${organization.name} subscription expires today. Renew to avoid interruption.`
                  : `${organization.name} subscription expires in ${daysRemaining} day${daysRemaining === 1 ? "" : "s"} (${new Date(expiresAt).toLocaleDateString()}). Renew to avoid interruption.`,
              ts: new Date(now).toISOString(),
              read: false,
            },
            ...(previous.notifications || []),
          ],
        }),
        "Subscription expiry reminder",
        `Owner notified with ${daysRemaining} days remaining`,
      );
    };

    checkForExpiryReminder();
    const interval = window.setInterval(
      checkForExpiryReminder,
      6 * 60 * 60 * 1000,
    );
    return () => window.clearInterval(interval);
  }, [data.notifications, loaded, mutate, organization, session]);

  const handleLogin = async (
    email,
    password,
    selectedProductId = workspaceProductId,
  ) => {
    try {
      const user = await signIn(email, password);
      handleWorkspaceProductChange(selectedProductId);
      const profile = getOfflineAccessProfile();
      offlineOnlyRef.current = false;
      offlineKeyRef.current = null;
      if (
        profile?.userId === user.id &&
        profile.organization?.productId === selectedProductId &&
        profile.pending
      ) {
        setAuthUser(user);
        setOfflineRecoveryRequired(true);
        setAuthError("");
        return;
      }
      await activateUser(user, null, null, null, selectedProductId);
      showToast(`Signed in as ${user.email}`);
    } catch (error) {
      setAuthError(error.message);
    }
  };

  const handleSignUp = async (
    email,
    password,
    selectedProductId = workspaceProductId,
  ) => {
    try {
      const result = await signUp(email, password);
      handleWorkspaceProductChange(selectedProductId);
      if (result.user && result.session) {
        offlineOnlyRef.current = false;
        offlineKeyRef.current = null;
        await activateUser(result.user, null, null, null, selectedProductId);
      }
      return Boolean(result.session);
    } catch (error) {
      setAuthError(error.message);
      return false;
    }
  };

  const handleCreateOrganization = async (
    name,
    selectedProductId = workspaceProductId,
  ) => {
    if (!authUser) {
      setAuthError("Sign in before creating a company workspace.");
      return;
    }
    try {
      setAuthError("");
      const memberOrganization =
        (await getOrganization(authUser.id, selectedProductId)) ||
        (await createOrganization(name, authUser.id, selectedProductId));
      handleWorkspaceProductChange(selectedProductId);
      await activateUser(authUser, memberOrganization);
      showToast(`${memberOrganization.name} workspace is ready for subscription.`);
    } catch (error) {
      setAuthError(error.message);
    }
  };

  const handleJoinOrganization = async (code, fullName) => {
    try {
      await acceptOrganizationInvite(code, fullName);
      offlineOnlyRef.current = false;
      await activateUser(authUser, null, null, null, workspaceProductId);
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
      if (
        offlineProfile?.userId === organization.userId &&
        offlineProfile.organization?.id === organization.id
      ) {
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
    setPlatformSubscriptionAdmin(false);
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
    if (
      syncStatus === "migration_required" ||
      syncStatus === "legacy_conflict"
    ) {
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
    if (
      hasPendingTenantCache(organization.id) &&
      !hasDownloadedPendingTenantCache(organization.id)
    ) {
      throw new Error(
        "This device has unsynced legacy entries without a cloud baseline. Download the device backup in Company Settings before importing, then reconcile it separately.",
      );
    }
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

  const handleDownloadPendingTenantCache = () => {
    try {
      if (!downloadPendingTenantCache(organization.id)) {
        showToast("There is no pending local backup on this device.", "warn");
        return;
      }
      showToast("Pending local data backup downloaded. Keep it for reconciliation.");
    } catch (error) {
      showToast(`Local backup could not be downloaded: ${error.message}`, "warn");
    }
  };

  const handleUseCloudAfterLegacyConflict = async () => {
    if (!hasDownloadedPendingTenantCache(organization.id)) {
      showToast("Download the pending device backup before continuing.", "warn");
      return;
    }
    if (
      !window.confirm(
        "Replace this device's unsynced legacy data with the current company cloud data? The downloaded backup will remain available for manual reconciliation.",
      )
    ) {
      return;
    }
    try {
      const remote = await refreshData(organization);
      if (!remote.success) {
        showToast(
          `Cloud data could not be loaded: ${remote.error?.message || "refresh failed"}`,
          "warn",
        );
        return;
      }
      revisionRef.current = remote.revision;
      cloudBaseDataRef.current = remote.cloudData;
      setData(remote.data);
      setSyncStatus("synced");
      showToast("This device now has the current cloud data.");
    } catch (error) {
      showToast(`Cloud data could not be loaded: ${error.message}`, "warn");
    }
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

  if (platformSubscriptionAdmin && authUser) {
    return (
      <div className="min-h-screen bg-[#F2F4EF] text-[#16211F] font-body">
        <style dangerouslySetInnerHTML={{ __html: CSS_TOOLKIT }} />
        <header className="flex items-center justify-between bg-[#0B3B45] px-4 py-4 text-white sm:px-6">
          <div>
            <h1 className="font-bold">Platform Subscription Administration</h1>
            <p className="text-xs text-[#B9CFCE]">{authUser.email}</p>
          </div>
          <button
            type="button"
            onClick={() => handleLogout()}
            className="rounded-lg border border-[#6D8888] px-3 py-2 text-sm font-semibold"
          >
            Sign out
          </button>
        </header>
        <main className="p-4 sm:p-6">
          <Suspense
            fallback={
              <div className="rounded-xl border border-[#DDE3DA] bg-white p-6 text-sm text-[#5B6B68]">
                Loading subscription administration…
              </div>
            }
          >
            <SubscriptionAdminPortal
              supabase={supabase}
              showToast={showToast}
            />
          </Suspense>
        </main>
        {toast && <Toast msg={toast.msg} tone={toast.tone} />}
      </div>
    );
  }

  if (!session) {
    return (
      <LoginScreen
        error={authError}
        workspaceRequired={Boolean(authUser) && !offlineRecoveryRequired}
        companyName={organization?.name || ""}
        organizationId={organization?.id || null}
        organizationRole={organization?.role || null}
        subscriptionStatus={organization?.subscriptionStatus || null}
        graceUntil={organization?.graceUntil || null}
        offlineAccessAvailable={Boolean(offlineProfile) && !online}
        offlineRecoveryRequired={offlineRecoveryRequired}
        offlineCompanyName={offlineProfile?.organization.name || ""}
        onLogin={handleLogin}
        onSignUp={handleSignUp}
        onResetPassword={requestPasswordReset}
        onCreateOrganization={handleCreateOrganization}
        onJoinOrganization={handleJoinOrganization}
        onUnlockOffline={handleOfflineUnlock}
        workspaceProductId={workspaceProductId}
        onWorkspaceProductChange={handleWorkspaceProductChange}
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

  const isCurrentProductPage =
    isProductPage(page) && page === organization.productId;
  const activePage =
    organization.productId !== PRODUCTS.water.id
      ? organization.productId
      : isCurrentProductPage
        ? page
        : hasPermission(session.role, page)
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
          productId={organization.productId}
          companyName={organization.name}
          onLogout={handleLogout}
          offlineAccessEnabled={
            offlineProfile?.userId === organization.userId &&
            offlineProfile.organization?.id === organization.id
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
              offlineProfile?.userId === organization.userId &&
              offlineProfile.organization?.id === organization.id
            }
            offlineOnly={offlineOnlyRef.current}
            onEnableOfflineAccess={handleEnableOfflineAccess}
            onRemoveOfflineAccess={handleRemoveOfflineAccess}
          />
          <main className="p-4 sm:p-6 max-w-6xl mx-auto">
            {(syncStatus === "migration_required" ||
              syncStatus === "legacy_conflict") && (
              <div className="mb-5 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
                {syncStatus === "migration_required"
                  ? "Legacy company data must be reviewed and imported by the owner before this workspace can be edited. Open Company Settings and use “Import verified legacy records” only after confirming the old document belongs to this company."
                  : "This device has pending data from the previous whole-document sync model. It cannot be safely merged automatically. Download a backup, then choose whether to keep the local copy for manual reconciliation or replace it with current cloud data."}
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={handleDownloadPendingTenantCache}
                    className="rounded-lg border border-amber-700 px-3 py-2 font-semibold"
                  >
                    Download pending device data
                  </button>
                  {syncStatus === "legacy_conflict" && (
                    <button
                      type="button"
                      onClick={handleUseCloudAfterLegacyConflict}
                      className="rounded-lg border border-amber-700 px-3 py-2 font-semibold"
                    >
                      Replace with cloud data
                    </button>
                  )}
                </div>
              </div>
            )}
            <WorkspacePageBoundary key={activePage}>
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
                    onDownloadPendingTenantCache={handleDownloadPendingTenantCache}
                  />
                )}
              {activePage === "audit" &&
                hasPermission(session.role, "audit") && (
                  <AuditLog data={data} mutate={mutate} showToast={showToast} />
                )}
              {activePage === "overall-report" &&
                session.role === "owner" && (
                  <OverallGeneralReportView
                    data={data}
                    organization={organization}
                    session={session}
                  />
                )}
              {activePage === "terms" && (
                <TermsAndPolicy companyName={organization.name} />
              )}
              {organization.productId === PRODUCTS.electricalShop.id &&
                activePage === PRODUCTS.electricalShop.id && (
                <ElectricalShopDashboard />
              )}
              {organization.productId === PRODUCTS.supermarket.id &&
                activePage === PRODUCTS.supermarket.id && (
                <SupermarketDashboard />
              )}
              </Suspense>
            </WorkspacePageBoundary>
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
