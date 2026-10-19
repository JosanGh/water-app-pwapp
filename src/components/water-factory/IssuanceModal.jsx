import React, { useState } from "react";
import { X, ShoppingBag, CheckCircle2 } from "lucide-react";

export function IssuanceModal({
  isOpen,
  onClose,
  data = {},
  mutate,
  showToast,
  session = {},
}) {
  const [recipient, setRecipient] = useState("");
  const [itemCategory, setItemCategory] = useState("rolls"); // 'rolls' or 'bags'
  const [selectedTypeId, setSelectedTypeId] = useState("");
  const [qty, setQty] = useState("");
  const [distributionType, setDistributionType] = useState("sold"); // 'sold' or 'free'
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  if (!isOpen) return null;

  const handleIssuanceSubmit = (e) => {
    e.preventDefault();
    const parsedQty = Number(qty) || 0;
    if (parsedQty <= 0) return showToast("Quantity must be positive!", "warn");
    if (!recipient.trim()) return showToast("Recipient name is required!", "warn");
    if (!selectedTypeId) return showToast("Please select an item type!", "warn");

    setBusy(true);
    try {
      const isRolls = itemCategory === "rolls";
      const collectionKey = isRolls ? "issuance" : "bagIssuance";
      const sourceTypes = isRolls
        ? data.rollTypes || []
        : data.bagTypes || [];

      const targetItem = sourceTypes.find((t) => t.id === selectedTypeId);
      const itemName = targetItem ? targetItem.name : "Unknown Item";

      // 1. Calculate current available stock to prevent over-issuance
      const totalIntake = (isRolls ? data.intake || [] : data.bagIntake || [])
        .filter((i) =>
          (isRolls ? i.rollTypeId : i.bagTypeId) === selectedTypeId,
        )
        .reduce((sum, i) => sum + Number(i.qty || 0), 0);

      const totalPreviousIssuance = (data?.[collectionKey] || [])
        .filter((i) =>
          (isRolls ? i.rollTypeId || i.itemId : i.bagTypeId || i.itemId) ===
          selectedTypeId,
        )
        .reduce((sum, i) => sum + Number(i.qty || 0), 0);

      const availableStock = totalIntake - totalPreviousIssuance;

      if (parsedQty > availableStock) {
        setBusy(false);
        return showToast(`Insufficient stock! Only ${availableStock} ${itemName} available for issuance.`, "warn");
      }

      const timestampISO = new Date().toISOString();
      const issuanceId = crypto.randomUUID();
      const auditLogId = crypto.randomUUID();

      const newIssuanceRecord = {
        id: issuanceId,
        date: timestampISO.split("T")[0],
        recipient: recipient.trim(),
        itemId: selectedTypeId,
        itemName,
        itemCategory,
        qty: parsedQty,
        distributionType, // 'sold' or 'free'
        notes: notes.trim(),
        createdAt: timestampISO,
        issuedBy: session.name || "Manager",
        issuedByUserId: session.id || null,
      };

      // 2. Create corresponding audit log entry for the owner
      const auditEntry = {
        id: auditLogId,
        date: timestampISO,
        action: `ITEM_ISSUED_${itemCategory.toUpperCase()}`,
        description: `Manager issued ${parsedQty} units of ${itemName} to ${recipient} [Type: ${distributionType.toUpperCase()}]`,
        details: {
          itemId: selectedTypeId,
          itemName,
          qty: parsedQty,
          recipient: recipient.trim(),
          distributionType,
          notes: notes.trim(),
        },
      };

      // 3. Mutate state: Add to issuance collection AND log to audit trail
      mutate(
        (prev) => ({
          ...prev,
          [collectionKey]: [newIssuanceRecord, ...(prev?.[collectionKey] || [])],
          auditLog: [auditEntry, ...(prev?.auditLog || [])],
        }),
        `Recorded ${itemCategory} Issuance`,
        `${parsedQty} ${itemName} given to ${recipient} (${distributionType})`
      );

      showToast(`Successfully issued and logged to owner audit trail!`);
      setRecipient("");
      setQty("");
      setNotes("");
      onClose();
    } catch (err) {
      showToast(err.message || "Failed to record issuance.", "warn");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-[#F2F4EF] rounded-2xl w-full max-w-lg p-6 shadow-2xl relative border border-[#DDE3DA]">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[#5B6B68] hover:text-[#0B3B45]"
        >
          <X size={20} />
        </button>

        <div className="flex items-center gap-2 mb-4">
          <div className="w-9 h-9 rounded-lg bg-[#1C8C9E] flex items-center justify-center text-white">
            <ShoppingBag size={18} />
          </div>
          <div>
            <h2 className="font-bold text-[#0B3B45] text-lg">Record Item Issuance</h2>
            <p className="text-xs text-[#5B6B68]">Track rolls or bags given out (Sold or Free)</p>
          </div>
        </div>

        <form onSubmit={handleIssuanceSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-xs font-semibold text-[#5B6B68] uppercase">
              Category
              <select
                value={itemCategory}
                onChange={(e) => {
                  setItemCategory(e.target.value);
                  setSelectedTypeId("");
                }}
                className="inp mt-1 w-full"
              >
                <option value="rolls">Rolls</option>
                <option value="bags">Packing Bags</option>
              </select>
            </label>

            <label className="block text-xs font-semibold text-[#5B6B68] uppercase">
              Distribution Status
              <select
                value={distributionType}
                onChange={(e) => setDistributionType(e.target.value)}
                className="inp mt-1 w-full"
              >
                <option value="sold">Sold</option>
                <option value="free">Free of Charge (Giveaway)</option>
              </select>
            </label>
          </div>

          <label className="block text-xs font-semibold text-[#5B6B68] uppercase">
            Recipient / Member Name
            <input
              type="text"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="e.g. John Doe / Team Member"
              className="inp mt-1 w-full"
              required
            />
          </label>

          <label className="block text-xs font-semibold text-[#5B6B68] uppercase">
            Select {itemCategory === "rolls" ? "Roll Type" : "Bag Type"}
            <select
              value={selectedTypeId}
              onChange={(e) => setSelectedTypeId(e.target.value)}
              className="inp mt-1 w-full"
              required
            >
              <option value="">-- Choose item type --</option>
              {(itemCategory === "rolls"
                ? data?.rollTypes || []
                : data?.bagTypes || []
              ).map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} {t.standardWeightKg ? `(${t.standardWeightKg}kg)` : ""}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-xs font-semibold text-[#5B6B68] uppercase">
            Quantity
            <input
              type="number"
              min="1"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              placeholder="e.g. 10"
              className="inp mt-1 w-full"
              required
            />
          </label>

          <label className="block text-xs font-semibold text-[#5B6B68] uppercase">
            Notes / Reference (Optional)
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add reason for free issuance or sale details..."
              className="inp mt-1 w-full h-20 resize-none"
            />
          </label>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="w-1/2 py-2.5 rounded-xl border border-[#DDE3DA] text-[#5B6B68] font-semibold text-sm hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy}
              className="w-1/2 btn-primary py-2.5 text-sm flex items-center justify-center gap-2"
            >
              <CheckCircle2 size={16} /> {busy ? "Saving..." : "Save Record"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}