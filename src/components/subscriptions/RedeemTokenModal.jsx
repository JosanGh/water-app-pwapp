import React, { useState } from "react";
import { Key, ShieldCheck, X, MessageSquare, Phone } from "lucide-react";

export function RedeemTokenModal({ isOpen, onClose, organizationId, supabase, showToast, onSuccess }) {
  const [tokenInput, setTokenInput] = useState("");
  const [busy, setBusy] = useState(false);

  if (!isOpen) return null;

  const handleRedeem = async (e) => {
    e.preventDefault();
    const cleanToken = tokenInput.trim().toUpperCase();
    if (!organizationId) {
      return showToast("Sign in to the company before redeeming a token.", "warn");
    }
    if (!cleanToken) {
      return showToast("Please enter a valid subscription token.", "warn");
    }

    setBusy(true);
    try {
      const { error } = await supabase.rpc(
        "redeem_organization_subscription",
        {
          p_organization_id: organizationId,
          p_token: cleanToken,
        },
      );
      if (error) throw error;

      showToast("Workspace subscription activated successfully!");
      setTokenInput("");
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      showToast(err.message || "Failed to redeem token.", "warn");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-[#F2F4EF] dark:bg-[#18262C] rounded-2xl w-full max-w-md p-6 shadow-2xl relative border border-[#DDE3DA] dark:border-[#263A42] space-y-5">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[#5B6B68] hover:text-[#0B3B45] dark:text-gray-400 dark:hover:text-white"
        >
          <X size={20} />
        </button>

        {/* Header & Logo Icon */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 mx-auto rounded-xl bg-[#1C8C9E] flex items-center justify-center shadow-md text-white">
            <Key size={26} />
          </div>
          <h2 className="font-bold text-[#0B3B45] dark:text-cyan-200 text-lg">
            Activate Workspace Subscription
          </h2>
          <p className="text-xs text-[#5B6B68] dark:text-gray-400">
            Enter your manual activation token below to unlock your ERP workspace.
          </p>
        </div>

        {/* Redemption Form */}
        <form onSubmit={handleRedeem} className="space-y-4">
          <label className="block text-xs font-semibold text-[#5B6B68] dark:text-gray-400 uppercase">
            Subscription Token
            <input
              type="text"
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              placeholder="e.g. SUB-ABC123XYZ"
              className="inp mt-1 w-full font-mono uppercase tracking-wider text-center text-sm py-3"
              required
            />
          </label>

          <button
            type="submit"
            disabled={busy}
            className="btn-primary w-full py-3 text-sm flex items-center justify-center gap-2 shadow-md"
          >
            <ShieldCheck size={16} /> {busy ? "Verifying Token..." : "Redeem & Activate"}
          </button>
        </form>

        {/* Support Contact Section (WhatsApp / Call) */}
        <div className="pt-4 border-t border-[#DDE3DA] dark:border-[#263A42] text-center space-y-3">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Need a subscription token? Reach out to support:
          </p>
          <div className="flex gap-2">
            <a
              href="https://wa.me/233542804240?text=Hello,%20I%20need%20a%20subscription%20token%20for%20my%20workspace."
              target="_blank"
              rel="noopener noreferrer"
              className="w-1/2 py-2 rounded-xl bg-emerald-600 text-white font-semibold text-xs flex items-center justify-center gap-1.5 hover:bg-emerald-700 transition-colors shadow-sm"
            >
              <MessageSquare size={14} /> WhatsApp
            </a>
            <a
              href="tel:+233542804240"
              className="w-1/2 py-2 rounded-xl border border-[#DDE3DA] dark:border-[#263A42] text-[#0B3B45] dark:text-cyan-300 font-semibold text-xs flex items-center justify-center gap-1.5 hover:bg-gray-100 dark:hover:bg-[#1C2C33] transition-colors"
            >
              <Phone size={14} /> Call Support
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}