import { useState } from "react";
import { DEFAULT_EXPENSE_CATEGORIES } from "../../lib/storage";
import { Users, Settings2, Building } from "lucide-react";
import { createOrganizationInvite } from "../../lib/supabaseClient";

export function AdminManagementModule({
  data,
  mutate,
  showToast,
  organization,
  syncStatus,
  onSaveBusinessDetails,
  onLegacyBackfillComplete,
  onDownloadPendingTenantCache,
}) {
  const categories =
    data?.expenseCategories || DEFAULT_EXPENSE_CATEGORIES || [];

  const [unitPrice, setUnitPrice] = useState(data?.settings?.pricePerBag || "");
  const [newCategory, setNewCategory] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("manager");
  const [inviteCode, setInviteCode] = useState("");
  const [backfillBusy, setBackfillBusy] = useState(false);

  const [bizName, setBizName] = useState(data?.businessDetails?.name || "");
  const [bizPhone, setBizPhone] = useState(data?.businessDetails?.phone || "");
  const [bizAddress, setBizAddress] = useState(
    data?.businessDetails?.address || "",
  );
  const [bizTin, setBizTin] = useState(data?.businessDetails?.tin || "");

  const isMigrationLocked =
    syncStatus === "migration_required" || syncStatus === "legacy_conflict";

  const handleUpdatePrice = (e) => {
    e.preventDefault();
    if (isMigrationLocked) {
      showToast(
        "Import verified legacy records before changing company data.",
        "warn",
      );
      return;
    }
    const parsedPrice = Number(unitPrice);
    if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
      return showToast("Price per bag must be positive!", "warn");
    }

    mutate(
      (prev) => ({
        ...prev,
        settings: {
          ...prev?.settings,
          pricePerBag: parsedPrice,
        },
      }),
      "Updated Price Per Bag",
      `GH₵ ${unitPrice} per bag`,
    );

    showToast("Unit Price Updated!");
  };

  const handleUpdateBusiness = async (e) => {
    e.preventDefault();
    if (isMigrationLocked) {
      showToast(
        "Import verified legacy records before changing company data.",
        "warn",
      );
      return;
    }
    await onSaveBusinessDetails({
      name: bizName,
      phone: bizPhone,
      address: bizAddress,
      tin: bizTin,
    });
    showToast("Business Information Saved!");
  };

  const handleCreateInvite = async (e) => {
    e.preventDefault();
    setInviteCode("");
    try {
      const code = await createOrganizationInvite(
        organization.id,
        inviteEmail,
        inviteRole,
      );
      setInviteCode(code);
      setInviteEmail("");
      showToast("Invite created. Share the code with the invited user.");
    } catch (error) {
      showToast(`Invite could not be created: ${error.message}`, "warn");
    }
  };

  const handleLegacyBackfill = async () => {
    const approved = window.confirm(
      "Import this company's legacy cloud records into tenant-scoped storage? Verify first that the legacy document belongs to this company. Historic authors are unknown, so imported records will be owner-stewarded. The source document will be retained and this import can only run once.",
    );
    if (!approved) return;

    setBackfillBusy(true);
    try {
      await onLegacyBackfillComplete();
      showToast("Legacy records imported. The source document was retained.");
    } catch (error) {
      showToast(
        error.message.startsWith("The legacy import completed")
          ? error.message
          : `Legacy import did not complete: ${error.message}`,
        "warn",
      );
    } finally {
      setBackfillBusy(false);
    }
  };

  const handleAddCategory = (e) => {
    e.preventDefault();
    if (isMigrationLocked) {
      showToast(
        "Import verified legacy records before changing company data.",
        "warn",
      );
      return;
    }
    if (!newCategory.trim()) return;

    if (categories.includes(newCategory.trim())) {
      return showToast("Category already exists!", "warn");
    }

    mutate(
      (prev) => ({
        ...prev,
        expenseCategories: [
          ...(prev?.expenseCategories || DEFAULT_EXPENSE_CATEGORIES),
          newCategory.trim(),
        ],
      }),
      "Added Expense Category",
      newCategory.trim(),
    );

    setNewCategory("");
    showToast("Expense Category Added!");
  };

  const handleRemoveCategory = (cat) => {
    if (isMigrationLocked) {
      showToast(
        "Import verified legacy records before changing company data.",
        "warn",
      );
      return;
    }
    if (window.confirm(`Remove category "${cat}"?`)) {
      mutate(
        (prev) => ({
          ...prev,
          expenseCategories: (prev?.expenseCategories || []).filter(
            (c) => c !== cat,
          ),
        }),
        "Removed Expense Category",
        cat,
      );
      showToast("Category removed.");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="font-display font-800 text-2xl text-[#0B3B45]">
          Company Settings
        </p>
        <p className="text-sm text-[#5B6B68]">
          Sachet pricing, company details, and operating preferences.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Price & Unit Setup */}
        <form
          onSubmit={handleUpdatePrice}
          className="bg-white p-5 rounded-2xl border border-[#DDE3DA] space-y-3"
        >
          <div className="flex items-center gap-2 border-b pb-2">
            <Settings2 className="text-[#0B3B45]" size={18} />
            <p className="font-bold text-[#0B3B45]">Sachet Bag Pricing Setup</p>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500">
              Global Sales Price Per Sachet Bag (GH₵)
            </label>
            <input
              type="number"
              min="0.1"
              step="0.1"
              value={unitPrice}
              onChange={(e) => setUnitPrice(e.target.value)}
              className="inp mt-1"
              required
            />
          </div>
          <button type="submit" className="btn-primary w-full">
            Update Bag Price
          </button>
        </form>

        {/* Business Registration */}
        <form
          onSubmit={handleUpdateBusiness}
          className="bg-white p-5 rounded-2xl border border-[#DDE3DA] space-y-3"
        >
          <div className="flex items-center gap-2 border-b pb-2">
            <Building className="text-[#0B3B45]" size={18} />
            <p className="font-bold text-[#0B3B45]">Company & GRA Details</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-semibold text-gray-500">
                Business Name
              </label>
              <input
                value={bizName}
                onChange={(e) => setBizName(e.target.value)}
                placeholder="Company Name"
                className="inp mt-1"
                required
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500">
                Phone
              </label>
              <input
                value={bizPhone}
                onChange={(e) => setBizPhone(e.target.value)}
                placeholder="Phone"
                className="inp mt-1"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-semibold text-gray-500">
                Address / City
              </label>
              <input
                value={bizAddress}
                onChange={(e) => setBizAddress(e.target.value)}
                placeholder="Location"
                className="inp mt-1"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500">
                TIN Number
              </label>
              <input
                value={bizTin}
                onChange={(e) => setBizTin(e.target.value)}
                placeholder="TIN"
                className="inp mt-1"
              />
            </div>
          </div>
          <button type="submit" className="btn-primary w-full">
            Save Business Info
          </button>
        </form>
      </div>

      {organization.role === "owner" && (
        <section className="rounded-2xl border border-amber-300 bg-amber-50 p-5 space-y-3">
          <h2 className="font-bold text-amber-950">Legacy record migration</h2>
          <p className="text-sm text-amber-900">
            Use only after confirming that the old company document belongs to
            this organization. The original remains unchanged; imported records
            are attributed to the owner as stewards because historic authorship
            cannot be verified.
          </p>
          <p className="text-sm text-amber-950">
            If this device has unsynced entries, download and keep a copy before
            importing. Pending local data has no trusted baseline and will not
            be uploaded automatically.
          </p>
          <button
            type="button"
            onClick={onDownloadPendingTenantCache}
            className="rounded-lg border border-amber-700 px-3 py-2 text-sm font-semibold text-amber-950"
          >
            Download pending device data
          </button>
          {syncStatus !== "migration_required" && (
            <p className="text-sm font-semibold text-amber-950">
              Import is disabled while this device has pending local changes.
              Preserve and reconcile those changes before migrating.
            </p>
          )}
          <button
            type="button"
            onClick={handleLegacyBackfill}
            disabled={backfillBusy || syncStatus !== "migration_required"}
            className="btn-primary disabled:opacity-50"
          >
            {backfillBusy
              ? "Importing legacy records..."
              : "Import verified legacy records"}
          </button>
        </section>
      )}

      <div className="bg-white p-5 rounded-2xl border border-[#DDE3DA] space-y-2">
        <div className="flex items-center gap-2 border-b pb-2">
          <Users className="text-[#0B3B45]" size={18} />
          <p className="font-bold text-[#0B3B45]">Secure team access</p>
        </div>
        <p className="text-sm text-[#5B6B68]">
          Passwords and role assignments are no longer stored in company data.
          Use verified Supabase Auth accounts and tenant memberships; do not
          create local passwords here.
        </p>
      </div>

      <form
        onSubmit={handleCreateInvite}
        className="bg-white p-5 rounded-2xl border border-[#DDE3DA] space-y-3"
      >
        <div className="flex items-center gap-2 border-b pb-2">
          <Users className="text-[#0B3B45]" size={18} />
          <p className="font-bold text-[#0B3B45]">Invite a team member</p>
        </div>
        <p className="text-xs text-[#5B6B68]">
          The invite is email-bound, single-use, and expires after seven days.
          The recipient must verify their account with this email.
        </p>
        <div className="grid sm:grid-cols-2 gap-2">
          <input
            type="email"
            value={inviteEmail}
            onChange={(event) => setInviteEmail(event.target.value)}
            placeholder="Member email"
            className="inp"
            required
          />
          <select
            value={inviteRole}
            onChange={(event) => setInviteRole(event.target.value)}
            className="inp"
          >
            <option value="manager">Manager</option>
            <option value="cashier">Cashier</option>
            <option value="driver">Driver</option>
          </select>
        </div>
        <button type="submit" className="btn-primary w-full">
          Create secure invite
        </button>
        {inviteCode && (
          <p className="break-all rounded bg-[#F7F8F5] p-3 font-mono text-xs">
            Share this code privately: {inviteCode}
          </p>
        )}
      </form>

      {/* Expense Categories Section */}
      <div className="bg-white p-5 rounded-2xl border border-[#DDE3DA] space-y-3">
        <div className="flex items-center gap-2 border-b pb-2">
          <Settings2 className="text-[#0B3B45]" size={18} />
          <p className="font-bold text-[#0B3B45]">Expense Categories Config</p>
        </div>
        <form onSubmit={handleAddCategory} className="flex gap-2">
          <input
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            placeholder="New Expense Name"
            className="inp"
          />
          <button type="submit" className="btn-primary shrink-0 py-2">
            Add
          </button>
        </form>

        <div className="flex flex-wrap gap-1.5 pt-2 max-h-36 overflow-y-auto">
          {categories.map((c) => (
            <span
              key={c}
              className="px-2.5 py-1 bg-[#F7F8F5] border rounded-lg text-xs flex items-center gap-1.5"
            >
              <span>{c}</span>
              <button
                type="button"
                onClick={() => handleRemoveCategory(c)}
                className="text-red-500 hover:text-red-700 font-bold text-xs"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
