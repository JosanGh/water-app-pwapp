import React, { useCallback, useState, useEffect } from "react";

export function SubscriptionAdminPortal({ supabase, showToast }) {
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState("monthly");
  const [issuedToken, setIssuedToken] = useState("");

  const fetchTenants = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc(
        "admin_list_subscription_organizations",
      );
      if (error) throw error;
      setOrganizations(data || []);
    } catch (error) {
      showToast(error.message || "Failed to load company subscriptions.", "warn");
    } finally {
      setLoading(false);
    }
  }, [showToast, supabase]);

  useEffect(() => {
    fetchTenants();
  }, [fetchTenants]);

  const generateToken = async (orgId) => {
    try {
      if (!globalThis.crypto?.getRandomValues) {
        throw new Error("Secure token generation is unavailable in this browser.");
      }
      const bytes = globalThis.crypto.getRandomValues(new Uint8Array(24));
      const token = `SUB-${Array.from(bytes, (byte) =>
        byte.toString(16).padStart(2, "0"),
      ).join("")}`;
      const { error } = await supabase.rpc("admin_issue_subscription_token", {
        p_organization_id: orgId,
        p_plan_type: selectedPlan,
        p_token: token,
      });
      if (error) throw error;
      setIssuedToken(token);
      showToast("Subscription token created. Copy it now; it will not be shown again.");
      await fetchTenants();
    } catch (error) {
      showToast(error.message || "Failed to generate subscription token.", "warn");
    }
  };

  const terminateSubscription = async (orgId) => {
    if (!confirm("Are you sure you want to terminate this tenant's subscription?")) return;

    try {
      const { error } = await supabase.rpc("admin_terminate_subscription", {
        p_organization_id: orgId,
      });
      if (error) throw error;
      showToast("Subscription terminated successfully.");
      setIssuedToken("");
      await fetchTenants();
    } catch (error) {
      showToast(error.message || "Failed to terminate subscription.", "warn");
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center bg-white dark:bg-[#18262C] p-5 rounded-2xl shadow-sm border border-[#EDEFEA] dark:border-[#263A42]">
        <div>
          <h2 className="text-lg font-bold text-[#0B3B45] dark:text-cyan-200">Tenant Subscription Management</h2>
          <p className="text-xs text-gray-500">Issue one-time activation tokens and manage subscription access.</p>
        </div>
        <div className="flex items-center gap-2">
          <select 
            value={selectedPlan} 
            onChange={(e) => setSelectedPlan(e.target.value)}
            className="inp text-xs py-2"
          >
            <option value="monthly">Monthly Subscription</option>
            <option value="yearly">Yearly Subscription</option>
            <option value="one-time">One-Time / Lifetime</option>
          </select>
        </div>
      </div>

      {issuedToken && (
        <section className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-950">
          <p className="text-sm font-semibold">
            Copy this token now. It is shown only once and expires in 30 days.
          </p>
          <code className="mt-2 block break-all rounded-lg bg-white p-3 font-mono text-sm">
            {issuedToken}
          </code>
          <button
            type="button"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(issuedToken);
                showToast("Token copied.");
              } catch (error) {
                showToast(`Could not copy token: ${error.message}`, "warn");
              }
            }}
            className="mt-3 rounded-lg border border-amber-700 px-3 py-2 text-xs font-semibold"
          >
            Copy token
          </button>
        </section>
      )}

      <div className="bg-white dark:bg-[#18262C] rounded-2xl shadow-sm border border-[#EDEFEA] dark:border-[#263A42] overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="bg-[#F7F8F5] dark:bg-[#121E23] text-gray-500 uppercase border-b border-[#EDEFEA] dark:border-[#263A42]">
              <th className="p-4">Workspace Name</th>
              <th className="p-4">Status</th>
              <th className="p-4">Plan</th>
              <th className="p-4">Expires At</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#EDEFEA] dark:divide-[#263A42]">
            {loading ? (
              <tr>
                <td colSpan={5} className="p-6 text-center text-gray-500">
                  Loading subscriptions…
                </td>
              </tr>
            ) : organizations.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-6 text-center text-gray-500">
                  No company workspaces found.
                </td>
              </tr>
            ) : organizations.map((org) => (
              <tr key={org.id} className="hover:bg-gray-50 dark:hover:bg-[#1C2C33]/40">
                <td className="p-4 font-bold text-[#0B3B45] dark:text-cyan-300">{org.name}</td>
                <td className="p-4">
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase ${
                    org.subscription_status === 'active' ? 'bg-emerald-100 text-emerald-800' :
                    org.subscription_status === 'grace_period' ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {org.subscription_status}
                  </span>
                </td>
                <td className="p-4 uppercase font-mono">{org.subscription_plan || 'N/A'}</td>
                <td className="p-4 font-mono">
                  {org.subscription_plan === "one-time"
                    ? "Lifetime"
                    : org.expires_at
                      ? new Date(org.expires_at).toLocaleDateString()
                      : "—"}
                </td>
                <td className="p-4 text-right space-x-2">
                  <button 
                    onClick={() => generateToken(org.id)}
                    className="px-3 py-1.5 rounded-lg bg-[#1C8C9E] text-white font-semibold hover:bg-[#156d7a] transition-colors"
                  >
                    Generate Token
                  </button>
                  <button 
                    onClick={() => terminateSubscription(org.id)}
                    className="px-3 py-1.5 rounded-lg bg-red-100 text-red-700 hover:bg-red-200 transition-colors"
                  >
                    Terminate
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}