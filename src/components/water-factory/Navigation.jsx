import { useState } from "react";
import {
  Droplets,
  Warehouse,
  Factory,
  Wallet,
  FileBarChart,
  ShieldCheck,
  LogOut,
  Wifi,
  WifiOff,
  Menu,
  Bell,
  X,
  KeyRound,
  FileText,
  ClipboardList,
} from "lucide-react";
import { getRoleMeta, hasPermission } from "../../config/roles";
import { getProduct, PRODUCTS } from "../../config/products";
import { isValidOfflinePin } from "../../lib/storage";

export function Sidebar({
  page,
  setPage,
  role,
  productId,
  companyName,
  onLogout,
  open,
  onClose,
  offlineAccessEnabled = false,
}) {
  const items = [
    { id: "dashboard", label: "Dashboard", icon: Factory },
    { id: "warehouse", label: "Warehouse & Packing", icon: Warehouse },
    { id: "production", label: "Production Logs", icon: Droplets },
    { id: "sales", label: "Sales & Cash", icon: Wallet },
    { id: "reports", label: "Reports & Drivers", icon: FileBarChart },
    { id: "admin", label: "Admin & Users", icon: KeyRound },
    { id: "audit", label: "Audit Trail", icon: ShieldCheck },
    {
      id: "overall-report",
      label: "Overall General Report",
      icon: ClipboardList,
    },
    { id: "terms", label: "Terms & Policy", icon: FileText },
  ];

  // Filter navigation items using central hasPermission utility
  const visibleItems =
    productId === PRODUCTS.water.id
      ? items.filter((item) => hasPermission(role, item.id))
      : [];
  const currentProduct = getProduct(productId);

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-30 sm:hidden bg-black/50"
          onClick={onClose}
        />
      )}
      <aside
        className={`pw-sidebar fixed sm:static inset-y-0 left-0 z-40 flex flex-col w-64 sm:w-60 shrink-0 min-h-screen px-3 py-4 transition-transform ${open ? "translate-x-0" : "-translate-x-full sm:translate-x-0"}`}
      >
        <div className="flex items-center justify-between px-2 mb-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#1C8C9E] flex items-center justify-center">
              <Droplets size={16} className="text-[#0B3B45]" />
            </div>
            <p className="font-display font-800 text-[15px] text-[#F2F4EF]">
              {companyName || "Company"}
            </p>
          </div>
          <button onClick={onClose} className="sm:hidden p-1 text-[#B9CFCE]">
            <X size={18} />
          </button>
        </div>
        <nav className="flex-1 space-y-1">
          {currentProduct && productId !== PRODUCTS.water.id && (
            <p className="px-3 py-2 text-xs font-semibold text-[#B9CFCE]">
              {currentProduct.name} workspace
            </p>
          )}
          {visibleItems.map((i) => {
            const Icon = i.icon;
            const active = page === i.id;
            return (
              <button
                key={i.id}
                onClick={() => {
                  setPage(i.id);
                  if (onClose) onClose();
                }}
                className={`pw-nav-item w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition ${active ? "pw-nav-item-active" : ""}`}
              >
                <Icon size={16} />
                <span className="flex-1 text-left">{i.label}</span>
              </button>
            );
          })}
        </nav>
        {!offlineAccessEnabled && (
          <button
            onClick={onLogout}
            className="pw-nav-item flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm text-[#B9CFCE] hover:text-white"
          >
            <LogOut size={16} /> Sign out
          </button>
        )}
      </aside>
    </>
  );
}

export function TopBar({
  session = {},
  online,
  supabaseConfigured,
  syncStatus = "idle",
  onMenuClick,
  onLogout,
  data = {},
  mutate,
  offlineAccessEnabled = false,
  offlineOnly = false,
  onEnableOfflineAccess,
  onRemoveOfflineAccess,
}) {
  // Dynamically resolve role label & badge styles using getRoleMeta
  const roleMeta = getRoleMeta(session?.role);
  const [notifOpen, setNotifOpen] = useState(false);
  const [offlineDialog, setOfflineDialog] = useState("");
  const [offlinePin, setOfflinePin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [offlineError, setOfflineError] = useState("");
  const [offlineBusy, setOfflineBusy] = useState(false);
  const notifications = data.notifications || [];
  const unreadCount = notifications.filter((n) => !n.read).length;
  const syncConfirmed =
    !offlineOnly && supabaseConfigured && online && syncStatus === "synced";

  const handleOpenNotifications = () => {
    if (!notifOpen && unreadCount > 0) {
      mutate(
        (prev) => ({
          ...prev,
          notifications: (prev.notifications || []).map((n) => ({
            ...n,
            read: true,
          })),
        }),
        "Read Notifications",
        "Marked all system notifications as read",
      );
    }
    setNotifOpen(!notifOpen);
  };

  const openOfflineDialog = (mode) => {
    setOfflineDialog(mode);
    setOfflinePin("");
    setConfirmPin("");
    setOfflineError("");
  };

  const handleOfflineSubmit = async (event) => {
    event.preventDefault();
    if (offlineDialog !== "logout" && !isValidOfflinePin(offlinePin)) {
      setOfflineError(
        "Choose a 6-character PIN using letters and/or numbers. Avoid repeated or sequential characters.",
      );
      return;
    }
    if (
      offlineDialog === "logout" &&
      !/^(?:[a-z\d]{6}|\d{8,12})$/i.test(offlinePin)
    ) {
      setOfflineError("Enter your 6-character PIN.");
      return;
    }
    if (offlineDialog !== "logout" && offlinePin !== confirmPin) {
      setOfflineError("The PINs do not match.");
      return;
    }
    setOfflineBusy(true);
    setOfflineError("");
    try {
      if (offlineDialog !== "logout") {
        await onEnableOfflineAccess(offlinePin);
      } else {
        const signedOut = await onLogout(offlinePin);
        if (signedOut === false) return;
      }
      setOfflineDialog("");
    } catch (error) {
      setOfflineError(error.message || "The request could not be completed.");
    } finally {
      setOfflineBusy(false);
    }
  };

  return (
    <>
      <div className="sticky top-0 z-20 bg-[#F2F4EF] border-b border-[#DDE3DA] px-4 sm:px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <button
            onClick={onMenuClick}
            className="sm:hidden w-8 h-8 rounded-lg border border-[#DDE3DA] bg-white flex items-center justify-center text-[#0B3B45]"
          >
            <Menu size={16} />
          </button>
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono font-semibold ${syncConfirmed ? "bg-[#DCEEE4] text-[#2A6E4A]" : "bg-[#F5E3D9] text-[#A85A2A]"}`}
          >
            {online ? <Wifi size={12} /> : <WifiOff size={12} />}
            <span>
              {offlineOnly
                ? "OFFLINE ACCESS · LOCAL ONLY"
                : !supabaseConfigured
                  ? "LOCAL ONLY"
                  : !online
                    ? "OFFLINE · SYNC PENDING"
                    : syncStatus === "synced"
                      ? "SYNCED"
                      : syncStatus === "saving"
                        ? "SYNCING"
                        : syncStatus === "conflict"
                          ? "SYNC CONFLICT"
                          : syncStatus === "migration_required"
                            ? "MIGRATION REQUIRED"
                            : syncStatus === "legacy_conflict"
                              ? "LEGACY DATA NEEDS REVIEW"
                              : syncStatus === "error"
                                ? "LOCAL SAVE FAILED"
                                : "NOT SYNCED"}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-semibold">{session.name || "User"}</p>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border inline-block mt-0.5 ${roleMeta.badgeColor || "bg-gray-100 text-gray-700 border-gray-200"}`}
            >
              {roleMeta.label}
            </span>
          </div>
          <div className="w-8 h-8 rounded-full bg-[#0B3B45] flex items-center justify-center text-white ml-1">
            <ShieldCheck size={14} />
          </div>
          <div className="relative">
            <button
              onClick={handleOpenNotifications}
              className="relative w-8 h-8 rounded-lg border border-[#DDE3DA] bg-white flex items-center justify-center text-[#0B3B45]"
            >
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
                  <p className="font-bold text-xs text-[#0B3B45]">
                    System Notifications
                  </p>
                  <button
                    onClick={() =>
                      mutate(
                        (prev) => ({ ...prev, notifications: [] }),
                        "Cleared Notifications",
                        "",
                      )
                    }
                    className="text-[10px] text-[#C4472F]"
                  >
                    Clear All
                  </button>
                </div>
                <div className="max-h-60 overflow-y-auto space-y-2 mt-2">
                  {notifications.length === 0 ? (
                    <p className="text-xs text-gray-400 text-center py-4">
                      No notifications
                    </p>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        className="p-2 bg-[#F7F8F5] rounded text-xs border border-[#EDEFEA] relative"
                      >
                        <div className="flex justify-between items-center">
                          <p className="font-semibold text-[#0B3B45]">
                            {n.title}
                          </p>
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${n.read ? "text-green-700 bg-green-100" : "text-amber-800 bg-amber-100"}`}
                          >
                            {n.read ? "Read" : "New"}
                          </span>
                        </div>
                        <p className="text-gray-600 mt-1">{n.msg}</p>
                        <span className="text-[9px] text-gray-400 font-mono mt-1 block">
                          {n.ts}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() =>
              openOfflineDialog(offlineAccessEnabled ? "manage" : "enable")
            }
            aria-label="Manage encrypted offline access"
            title="Manage encrypted offline access"
            className="w-8 h-8 rounded-lg border border-[#DDE3DA] bg-white flex items-center justify-center text-[#0B3B45]"
          >
            <KeyRound size={15} />
          </button>
          {offlineAccessEnabled ? (
            <button
              type="button"
              onClick={() => openOfflineDialog("logout")}
              aria-label="Sign out and protect offline data"
              title="Sign out and keep encrypted offline access"
              className="w-8 h-8 rounded-lg border border-[#DDE3DA] bg-white flex items-center justify-center text-[#C4472F]"
            >
              <LogOut size={15} />
            </button>
          ) : (
            <button
              onClick={onLogout}
              className="w-8 h-8 rounded-lg border border-[#DDE3DA] bg-white flex items-center justify-center text-[#C4472F]"
            >
              <LogOut size={15} />
            </button>
          )}
        </div>
      </div>
      {offlineDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <form
            onSubmit={handleOfflineSubmit}
            className="auth-screen w-full max-w-md space-y-4 rounded-2xl bg-[#F2F4EF] p-6 shadow-2xl"
          >
            <h2 className="text-lg font-bold text-[#0B3B45]">
              {offlineDialog !== "logout"
                ? "Set up encrypted offline access"
                : "Secure offline access and sign out"}
            </h2>
            <p className="text-sm text-[#5B6B68]">
              {offlineDialog !== "logout"
                ? "Choose a 6-character PIN using letters and/or numbers. Avoid obvious repeated or sequential characters. It encrypts this company’s offline snapshot; it is not your account password."
                : "Enter your device PIN to encrypt your latest company data before signing out. You can unlock it later while offline."}
            </p>
            <label className="block text-xs font-semibold uppercase text-[#5B6B68]">
              Device PIN
              <input
                type="password"
                inputMode="text"
                autoComplete={
                  offlineDialog === "logout"
                    ? "current-password"
                    : "new-password"
                }
                minLength={6}
                maxLength={offlineDialog === "logout" ? 12 : 6}
                pattern={
                  offlineDialog === "logout"
                    ? "(?:[A-Za-z0-9]{6}|[0-9]{8,12})"
                    : "[A-Za-z0-9]{6}"
                }
                value={offlinePin}
                onChange={(event) =>
                  setOfflinePin(
                    event.target.value
                      .replace(/[^A-Za-z0-9]/g, "")
                      .slice(0, 12),
                  )
                }
                className="inp mt-1"
                required
              />
            </label>
            {offlineDialog !== "logout" && (
              <label className="block text-xs font-semibold uppercase text-[#5B6B68]">
                Confirm device PIN
                <input
                  type="password"
                  inputMode="text"
                  autoComplete="new-password"
                  minLength={6}
                  maxLength={6}
                  pattern="[A-Za-z0-9]{6}"
                  value={confirmPin}
                  onChange={(event) =>
                    setConfirmPin(
                      event.target.value
                        .replace(/[^A-Za-z0-9]/g, "")
                        .slice(0, 6),
                    )
                  }
                  className="inp mt-1"
                  required
                />
              </label>
            )}
            {offlineError && (
              <p role="alert" className="text-sm font-semibold text-[#C4472F]">
                {offlineError}
              </p>
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setOfflineDialog("")}
                className="btn-secondary flex-1 py-2"
                disabled={offlineBusy}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-primary flex-1 py-2"
                disabled={offlineBusy}
              >
                {offlineBusy
                  ? "Please wait…"
                  : offlineDialog !== "logout"
                    ? "Enable offline access"
                    : "Encrypt and sign out"}
              </button>
            </div>
            {offlineDialog !== "logout" && offlineAccessEnabled && (
              <button
                type="button"
                onClick={async () => {
                  setOfflineBusy(true);
                  try {
                    await onRemoveOfflineAccess();
                    setOfflineDialog("");
                  } catch (error) {
                    setOfflineError(
                      error.message || "Could not remove offline access.",
                    );
                  } finally {
                    setOfflineBusy(false);
                  }
                }}
                className="w-full text-xs font-semibold text-[#C4472F] hover:underline"
                disabled={offlineBusy}
              >
                Remove encrypted offline access from this device
              </button>
            )}
          </form>
        </div>
      )}
    </>
  );
}
