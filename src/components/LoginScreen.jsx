import React, { useState } from "react";
import { Droplets, Mail } from "lucide-react";
import { RedeemTokenModal } from "../components/subscriptions/RedeemTokenModal";
import { getSupabaseStatus, supabase } from "../lib/supabaseClient";
import { isValidOfflinePin } from "../lib/storage";
import { TermsAndPolicy } from "./water-factory/TermsAndPolicy";
import { PRODUCT_OPTIONS, PRODUCTS } from "../config/products";

function WorkspaceProductSelect({ value, onChange }) {
  return (
    <label className="block text-xs font-semibold text-[#5B6B68] uppercase">
      Workspace
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="inp mt-1"
        required
      >
        {PRODUCT_OPTIONS.map((product) => (
          <option key={product.id} value={product.id}>
            {product.name}
          </option>
        ))}
      </select>
      <span className="mt-1 block normal-case font-normal">
        Each workspace is separate and needs its own subscription.
      </span>
    </label>
  );
}

export function LoginScreen({
  error = "",
  workspaceRequired = false,
  passwordRecovery = false,
  companyName = "",
  organizationId = null,
  organizationRole = null,
  subscriptionStatus = null,
  graceUntil = null,
  onLogin,
  onSignUp,
  onResetPassword,
  onCreateOrganization,
  onJoinOrganization,
  onUpdatePassword,
  offlineAccessAvailable = false,
  offlineRecoveryRequired = false,
  offlineCompanyName = "",
  onUnlockOffline,
  workspaceProductId = PRODUCTS.water.id,
  onWorkspaceProductChange = () => {},
  showToast = (msg) => alert(msg),
}) {
  const [view, setView] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [offlinePin, setOfflinePin] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [newCompanyName, setNewCompanyName] = useState("");
  const [selectedWorkspaceProduct, setSelectedWorkspaceProduct] =
    useState(workspaceProductId);
  const [inviteCode, setInviteCode] = useState("");
  const [fullName, setFullName] = useState("");
  const [workspaceMode, setWorkspaceMode] = useState("create");
  const [message, setMessage] = useState("");
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);
  
  // Fixed: Hook moved to top level
  const [isTokenModalOpen, setIsTokenModalOpen] = useState(false);
  const configured = getSupabaseStatus().configured;

  const run = async (action) => {
    setBusy(true);
    setFormError("");
    setMessage("");
    try {
      await action();
    } catch (err) {
      setFormError(err.message || "The request could not be completed.");
    } finally {
      setBusy(false);
    }
  };

  const handleLogin = (event) => {
    event.preventDefault();
    run(() => onLogin(email, password));
  };

  const handleSignUp = (event) => {
    event.preventDefault();
    if (password.length < 6) {
      setFormError("Use a password with at least 6 characters.");
      return;
    }
    run(async () => {
      const signedIn = await onSignUp(
        email,
        password,
        selectedWorkspaceProduct,
      );
      setMessage(
        signedIn
          ? `Account created. Register your ${PRODUCT_OPTIONS.find((p) => p.id === selectedWorkspaceProduct)?.name || "selected"} workspace to continue.`
          : "Check your email to verify your account, then sign in.",
      );
    });
  };

  const handleReset = (event) => {
    event.preventDefault();
    run(async () => {
      await onResetPassword(email);
      setMessage("If the account exists, a password reset link has been sent.");
    });
  };

  const handleUpdatePassword = (event) => {
    event.preventDefault();
    if (newPassword.length < 6) {
      setFormError("Use a password with at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setFormError("The passwords do not match.");
      return;
    }
    run(() => onUpdatePassword(newPassword));
  };

  const handleCreateOrganization = (event) => {
    event.preventDefault();
    run(() =>
      onCreateOrganization(newCompanyName, selectedWorkspaceProduct),
    );
  };

  const handleWorkspaceProductChange = (productId) => {
    setSelectedWorkspaceProduct(productId);
    onWorkspaceProductChange(productId);
  };

  return (
    <div className="auth-screen min-h-screen bg-[#0B3B45] flex items-center justify-center p-6">
      <div
        className={`relative w-full ${view === "terms" ? "max-w-3xl" : "max-w-md"} bg-[#F2F4EF] rounded-2xl p-6 shadow-2xl`}
      >
        <div className="flex items-center gap-2.5 justify-center mb-6">
          <div className="w-10 h-10 rounded-lg bg-[#1C8C9E] flex items-center justify-center">
            <Droplets size={20} className="text-[#0B3B45]" />
          </div>
          <div className="text-left">
            <p className="font-display font-800 text-[#0B3B45] text-xl leading-none">
              {companyName || "Company workspace"}
            </p>
            <p className="font-mono text-[10px] text-[#5B6B68] uppercase tracking-widest mt-0.5">
              Business operations platform
            </p>
          </div>
        </div>

        {view === "terms" ? (
          <TermsAndPolicy
            companyName={companyName}
            onBack={() => setView("login")}
          />
        ) : passwordRecovery ? (
          <form onSubmit={handleUpdatePassword} className="space-y-4">
            <h1 className="font-bold text-[#0B3B45] text-lg">
              Choose a new password
            </h1>
            <label className="block text-xs font-semibold text-[#5B6B68] uppercase">
              New password
              <input
                type="password"
                autoComplete="new-password"
                minLength={6}
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                className="inp mt-1"
                required
              />
            </label>
            <label className="block text-xs font-semibold text-[#5B6B68] uppercase">
              Confirm new password
              <input
                type="password"
                autoComplete="new-password"
                minLength={6}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className="inp mt-1"
                required
              />
            </label>
            {(error || formError) && (
              <p className="text-xs font-semibold text-[#C4472F]">
                {formError || error}
              </p>
            )}
            <button
              type="submit"
              className="btn-primary w-full py-2.5"
              disabled={busy}
            >
              {busy ? "Updating…" : "Update password"}
            </button>
          </form>
        ) : workspaceRequired && workspaceMode === "join" ? (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              run(() => onJoinOrganization(inviteCode, fullName));
            }}
            className="space-y-4"
          >
            <h1 className="font-bold text-[#0B3B45] text-lg">
              Join a company workspace
            </h1>
            <label className="block text-xs font-semibold text-[#5B6B68] uppercase">
              Your full name
              <input
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                className="inp mt-1"
                maxLength={160}
                required
              />
            </label>
            <label className="block text-xs font-semibold text-[#5B6B68] uppercase">
              Company invite code
              <input
                value={inviteCode}
                onChange={(event) => setInviteCode(event.target.value)}
                className="inp mt-1"
                required
              />
            </label>
            {(error || formError) && (
              <p className="text-xs font-semibold text-[#C4472F]">
                {formError || error}
              </p>
            )}
            <button
              type="submit"
              className="btn-primary w-full py-2.5"
              disabled={busy || !configured}
            >
              {busy ? "Joining…" : "Join company"}
            </button>
            <button
              type="button"
              onClick={() => setWorkspaceMode("create")}
              className="w-full text-xs text-[#0B3B45] hover:underline"
            >
              Create a new company instead
            </button>
          </form>
        ) : workspaceRequired ? (
          <div className="space-y-4">
            {/* Subscription Required & WhatsApp/Call Support Box */}
            <div className="bg-white dark:bg-[#18262C] p-6 rounded-2xl border border-[#EDEFEA] dark:border-[#263A42] text-center space-y-4">
              <div className="w-16 h-16 mx-auto rounded-xl bg-[#1C8C9E] flex items-center justify-center shadow-md">
                <img src="./assets/images/ManasXplorer-logo.jpg" alt="ManasXplorer Logo" className="w-10 h-10 object-contain" />
              </div>

              <h2 className="text-base font-bold text-[#0B3B45] dark:text-cyan-200">
                {organizationId ? "Workspace Subscription Required" : "Subscription Required"}
              </h2>

              <p className="text-xs text-gray-600 dark:text-gray-300">
                {organizationId
                  ? `${companyName} cannot access operations while its subscription is ${subscriptionStatus || "inactive"}.`
                  : "A subscription is required before a new workspace can access operations."}
                {subscriptionStatus === "grace_period" && graceUntil
                  ? ` Grace access ends ${new Date(graceUntil).toLocaleDateString()}.`
                  : " Contact support to acquire an activation token."}
              </p>

              <div className="flex flex-col gap-2 pt-2">
                <a
                  href="https://wa.me/233542804240?text=Hello,%20I%20need%20a%20subscription%20token%20for%20my%20ERP%20workspace."
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2.5 rounded-xl bg-emerald-600 text-white font-semibold text-xs flex items-center justify-center gap-2 hover:bg-emerald-700 transition-colors"
                >
                  💬 Chat on WhatsApp for Token
                </a>

                <a
                  href="tel:+233542804240"
                  className="w-full py-2.5 rounded-xl border border-[#DDE3DA] text-[#0B3B45] dark:text-cyan-300 font-semibold text-xs flex items-center justify-center gap-2 hover:bg-gray-50 dark:hover:bg-[#1C2C33]"
                >
                  📞 Call Support: +233 542 804 240
                </a>

                {organizationId && organizationRole === "owner" && (
                  <button
                    type="button"
                    onClick={() => setIsTokenModalOpen(true)}
                    className="btn-primary w-full py-2.5 text-xs mt-1"
                  >
                    I have a Subscription Token
                  </button>
                )}
                {organizationId && organizationRole !== "owner" && (
                  <p className="text-xs text-gray-600 dark:text-gray-300">
                    Ask the company owner to redeem the subscription token.
                  </p>
                )}
              </div>
            </div>

            {/* Create Company Form */}
            {!organizationId && (
              <form onSubmit={handleCreateOrganization} className="space-y-4 pt-3 border-t border-[#DDE3DA]">
                  <h1 className="font-bold text-[#0B3B45] text-lg">
                    Create your company workspace
                  </h1>
                  <p className="text-sm text-[#5B6B68]">
                    This creates an isolated tenant. Your records are not copied
                    from legacy data automatically.
                  </p>
                  <WorkspaceProductSelect
                    value={selectedWorkspaceProduct}
                    onChange={handleWorkspaceProductChange}
                  />
                  <label className="block text-xs font-semibold text-[#5B6B68] uppercase">
                    Company name
                    <input
                      value={newCompanyName}
                      onChange={(event) => setNewCompanyName(event.target.value)}
                      className="inp mt-1"
                      maxLength={160}
                      required
                    />
                  </label>
                  {(error || formError) && (
                    <p className="text-xs font-semibold text-[#C4472F]">
                      {formError || error}
                    </p>
                  )}
                  {message && (
                    <p className="text-xs font-semibold text-green-700">
                      {message}
                    </p>
                  )}
                  <button
                    type="submit"
                    className="btn-primary w-full py-2.5"
                    disabled={busy || !configured}
                  >
                    {busy ? "Creating…" : "Create company"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setWorkspaceMode("join")}
                    className="w-full text-xs text-[#0B3B45] hover:underline"
                  >
                    Join an existing company with an invite code
                  </button>
                </form>
            )}
          </div>
        ) : view === "reset" ? (
          <form onSubmit={handleReset} className="space-y-4">
            <h1 className="font-bold text-[#0B3B45] text-lg">
              Reset password
            </h1>
            <label className="block text-xs font-semibold text-[#5B6B68] uppercase">
              Account email
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="inp mt-1"
                required
              />
            </label>
            {(error || formError) && (
              <p className="text-xs font-semibold text-[#C4472F]">
                {formError || error}
              </p>
            )}
            {message && (
              <p className="text-xs font-semibold text-green-700">{message}</p>
            )}
            <button
              type="submit"
              className="btn-primary w-full py-2.5"
              disabled={busy || !configured}
            >
              {busy ? "Sending…" : "Send secure reset link"}
            </button>
            <button
              type="button"
              onClick={() => setView("login")}
              className="w-full text-xs text-[#0B3B45] hover:underline"
            >
              Back to sign in
            </button>
          </form>
        ) : (
          <form
            onSubmit={view === "signup" ? handleSignUp : handleLogin}
            className="space-y-4"
          >
            <WorkspaceProductSelect
              value={selectedWorkspaceProduct}
              onChange={handleWorkspaceProductChange}
            />
            {!configured && (
              <p className="text-xs font-semibold text-[#C4472F]">
                Cloud authentication is not configured. Sign-in is disabled.
              </p>
            )}
            {message && (
              <p className="text-xs font-semibold text-green-700 bg-green-100 p-2 rounded">
                {message}
              </p>
            )}
            <label className="block text-xs font-semibold text-[#5B6B68] uppercase">
              Email
              <input
                type="email"
                autoComplete="username"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="inp mt-1"
                required
              />
            </label>
            <label className="block text-xs font-semibold text-[#5B6B68] uppercase">
              Password
              <input
                type="password"
                autoComplete={
                  view === "signup" ? "new-password" : "current-password"
                }
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="inp mt-1"
                minLength={view === "signup" ? 6 : undefined}
                required
              />
            </label>
            {(error || formError) && (
              <p className="text-xs font-semibold text-[#C4472F]">
                {formError || error}
              </p>
            )}
            <button
              type="submit"
              className="btn-primary w-full py-2.5"
              disabled={busy || !configured}
            >
              {busy
                ? "Please wait…"
                : view === "signup"
                  ? "Create verified account"
                  : "Sign in"}
            </button>
            <div className="pt-3 border-t border-[#DDE3DA] flex flex-col gap-2 text-center">
              {view === "login" ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setView("reset");
                      setMessage("");
                      setFormError("");
                    }}
                    className="text-xs text-gray-600 hover:underline flex items-center justify-center gap-1"
                  >
                    <Mail size={13} /> Send password reset email
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setView("signup");
                      setMessage("");
                      setFormError("");
                    }}
                    className="text-xs text-[#0B3B45] hover:underline"
                  >
                    Create a new company account
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setView("login");
                    setMessage("");
                    setFormError("");
                  }}
                  className="text-xs text-[#0B3B45] hover:underline"
                >
                  Already registered? Sign in
                </button>
              )}
              <button
                type="button"
                onClick={() => setView("terms")}
                className="text-xs text-[#0B3B45] hover:underline"
              >
                Read Terms & Policy
              </button>
            </div>
          </form>
        )}

        {(offlineAccessAvailable || offlineRecoveryRequired) &&
          !passwordRecovery && (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (
                !isValidOfflinePin(offlinePin) &&
                !/^\d{8,12}$/.test(offlinePin)
              ) {
                setFormError("Enter your 6-character device PIN.");
                return;
              }
              run(() => onUnlockOffline(offlinePin));
            }}
            className="mt-6 space-y-3 border-t border-[#DDE3DA] pt-4"
          >
            <h2 className="text-sm font-bold text-[#0B3B45]">
              {offlineRecoveryRequired
                ? "Restore pending offline changes"
                : `Offline access${offlineCompanyName ? ` · ${offlineCompanyName}` : ""}`}
            </h2>
            <p className="text-xs text-[#5B6B68]">
              {offlineRecoveryRequired
                ? "Unlock the encrypted data saved while offline. The app will attempt a revision-checked sync and preserve the local copy if the cloud has changed."
                : "Unlock this device’s encrypted company data. New PINs are 6 characters; previously configured 8–12 digit PINs still work. Changes stay on this device until you sign in online."}
            </p>
            <label className="block text-xs font-semibold uppercase text-[#5B6B68]">
              Device PIN
              <input
                type="password"
                inputMode="text"
                autoComplete="current-password"
                minLength={6}
                maxLength={12}
                pattern="(?:[A-Za-z0-9]{6}|[0-9]{8,12})"
                value={offlinePin}
                onChange={(event) =>
                  setOfflinePin(event.target.value.replace(/[^A-Za-z0-9]/g, "").slice(0, 12))
                }
                className="inp mt-1"
                required
              />
            </label>
            {(error || formError) && (
              <p role="alert" className="text-xs font-semibold text-[#C4472F]">
                {formError || error}
              </p>
            )}
            <button
              type="submit"
              className="btn-primary w-full py-2.5"
              disabled={busy}
            >
              {busy
                ? "Unlocking…"
                : offlineRecoveryRequired
                  ? "Restore offline changes"
                  : "Unlock offline workspace"}
            </button>
          </form>
        )}

        {/* Token Redemption Modal Overlay */}
        <RedeemTokenModal
          isOpen={isTokenModalOpen}
          onClose={() => setIsTokenModalOpen(false)}
          organizationId={organizationId}
          supabase={supabase}
          showToast={showToast}
          onSuccess={() => window.location.reload()}
        />
      </div>
    </div>
  );
}