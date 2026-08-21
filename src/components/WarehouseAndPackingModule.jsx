import React, { useState, useEffect, useMemo } from 'react';
import { Plus } from "lucide-react";
import { uid, todayISO, fmt, computeManagerAcceptedRolls, computeManagerAcceptedBags } from '../lib/helpers';

export function WarehouseModule({ data = {}, mutate, session = {}, showToast }) {
  const isOwner = session?.role === "owner";
  const [tab, setTab] = useState(isOwner ? "roll-intake" : "roll-accept");

  return (
    <div className="space-y-5">
      <div>
        <p className="font-display font-800 text-2xl text-[#0B3B45]">Warehouse, Film Rolls & Packing Custody</p>
        <p className="text-sm text-[#5B6B68]">Manage raw rolls, packing bags, transfers, and manager stock acceptances in a unified workspace.</p>
      </div>

      <div className="flex gap-1 bg-white rounded-xl border border-[#DDE3DA] p-1 w-fit overflow-x-auto">
        {isOwner && <button onClick={() => setTab("roll-intake")} className={`px-3 py-1.5 rounded-lg text-sm ${tab === "roll-intake" ? "bg-[#0B3B45] text-white font-bold" : "text-gray-600"}`}>Owner Roll Intake</button>}
        {isOwner && <button onClick={() => setTab("roll-issue")} className={`px-3 py-1.5 rounded-lg text-sm ${tab === "roll-issue" ? "bg-[#0B3B45] text-white font-bold" : "text-gray-600"}`}>Issue Rolls</button>}
        <button onClick={() => setTab("roll-accept")} className={`px-3 py-1.5 rounded-lg text-sm ${tab === "roll-accept" ? "bg-[#0B3B45] text-white font-bold" : "text-gray-600"}`}>Manager Roll Acceptance</button>

        <span className="border-r border-gray-300 mx-1"></span>

        {isOwner && <button onClick={() => setTab("bag-intake")} className={`px-3 py-1.5 rounded-lg text-sm ${tab === "bag-intake" ? "bg-[#0B3B45] text-white font-bold" : "text-gray-600"}`}>Owner Bag Intake</button>}
        {isOwner && <button onClick={() => setTab("bag-issue")} className={`px-3 py-1.5 rounded-lg text-sm ${tab === "bag-issue" ? "bg-[#0B3B45] text-white font-bold" : "text-gray-600"}`}>Issue Bags</button>}
        <button onClick={() => setTab("bag-accept")} className={`px-3 py-1.5 rounded-lg text-sm ${tab === "bag-accept" ? "bg-[#0B3B45] text-white font-bold" : "text-gray-600"}`}>Manager Bag Acceptance</button>
      </div>

      {tab === "roll-intake" && isOwner && <OwnerRollIntakeTab data={data} mutate={mutate} showToast={showToast} />}
      {tab === "roll-issue" && isOwner && <IssueRollsTab data={data} mutate={mutate} session={session} showToast={showToast} />}
      {tab === "roll-accept" && <ManagerRollAcceptanceTab data={data} mutate={mutate} session={session} showToast={showToast} />}

      {tab === "bag-intake" && isOwner && <OwnerBagIntakeTab data={data} mutate={mutate} showToast={showToast} />}
      {tab === "bag-issue" && isOwner && <IssueBagsTab data={data} mutate={mutate} session={session} showToast={showToast} />}
      {tab === "bag-accept" && <ManagerBagAcceptanceTab data={data} mutate={mutate} session={session} showToast={showToast} />}
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/*  ROLL SUB-COMPONENTS                                                   */
/* ---------------------------------------------------------------------- */
function OwnerRollIntakeTab({ data = {}, mutate, showToast }) {
  const [selectedTypeId, setSelectedTypeId] = useState("new");
  const [rollTypeName, setRollTypeName] = useState("");
  const [kgPerRoll, setKgPerRoll] = useState("");
  const [supplier, setSupplier] = useState("");
  const [qty, setQty] = useState("");

  const handleCreateTypeAndIntake = (e) => {
    e.preventDefault();
    const parsedQty = Number(qty) || 0;
    if (parsedQty <= 0) return showToast("Quantity must be positive!", "warn");

    let typeId = selectedTypeId;
    let typeName = rollTypeName;
    let weightPerRoll = Number(kgPerRoll) || 0;

    if (selectedTypeId === "new") {
      if (!rollTypeName.trim() || weightPerRoll <= 0) {
        return showToast("Provide a valid Roll Type Name and Weight per roll!", "warn");
      }
      const existing = (data?.rollTypes || []).find(
        (t) => t.name.trim().toLowerCase() === rollTypeName.trim().toLowerCase()
      );
      if (existing) {
        typeId = existing.id;
        typeName = existing.name;
        weightPerRoll = Number(existing.standardWeightKg) || 0;
      } else {
        typeId = uid();
      }
    } else {
      const existing = (data?.rollTypes || []).find((t) => t.id === selectedTypeId);
      if (existing) {
        typeName = existing.name;
        weightPerRoll = Number(existing.standardWeightKg) || 0;
      }
    }

    mutate((prev) => {
      const rollTypeExists = (prev?.rollTypes || []).some((t) => t.id === typeId);
      const nextRollTypes = rollTypeExists
        ? prev.rollTypes
        : [...(prev?.rollTypes || []), { id: typeId, name: typeName.trim(), standardWeightKg: weightPerRoll, yieldValue: 900 }];

      return {
        ...prev,
        rollTypes: nextRollTypes,
        intake: [
          { id: uid(), date: todayISO(), rollTypeId: typeId, supplier, qty: parsedQty, weightKg: parsedQty * weightPerRoll },
          ...(prev?.intake || []),
        ],
      };
    }, "Recorded Roll Intake", `${parsedQty} rolls of ${typeName}`);

    setRollTypeName(""); setKgPerRoll(""); setSupplier(""); setQty(""); setSelectedTypeId("new");
    showToast("Roll Intake Recorded!");
  };

  return (
    <div className="grid lg:grid-cols-2 gap-4">
      <form onSubmit={handleCreateTypeAndIntake} className="bg-white p-5 rounded-2xl border border-[#DDE3DA] space-y-3">
        <p className="font-bold text-[#0B3B45]">Owner Raw Roll Intake</p>

        <div>
          <label className="text-xs font-semibold text-gray-500">Roll Category</label>
          <select
            value={selectedTypeId}
            onChange={(e) => {
              setSelectedTypeId(e.target.value);
              if (e.target.value !== "new") {
                const existing = (data?.rollTypes || []).find((t) => t.id === e.target.value);
                if (existing) setKgPerRoll(String(existing.standardWeightKg));
              }
            }}
            className="inp"
          >
            <option value="new">+ Create New Roll Type</option>
            {(data?.rollTypes || []).map((t) => (
              <option key={t.id} value={t.id}>{t.name} ({t.standardWeightKg} kg/roll)</option>
            ))}
          </select>
        </div>

        {selectedTypeId === "new" && (
          <div>
            <label className="text-xs font-semibold text-gray-500">New Roll Type Name</label>
            <input value={rollTypeName} onChange={(e) => setRollTypeName(e.target.value)} placeholder="e.g. Standard 25kg Film" className="inp" required={selectedTypeId === "new"} />
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs font-semibold text-gray-500">Weight per Roll (kg)</label>
            <input
              type="number"
              min="0.1"
              step="0.1"
              value={kgPerRoll}
              onChange={(e) => setKgPerRoll(e.target.value)}
              placeholder="25"
              className="inp"
              disabled={selectedTypeId !== "new"}
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500">Quantity Rolls (Roll Count)</label>
            <input type="number" min="1" value={qty} onChange={(e) => setQty(e.target.value)} placeholder="10" className="inp" required />
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-gray-500">Supplier Name (Hidden from Manager)</label>
          <input value={supplier} onChange={(e) => setSupplier(e.target.value)} placeholder="e.g. Polytank Ghana" className="inp" />
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
              <th className="p-2 text-right">Roll Count</th>
              <th className="p-2 text-right">Weight (kg)</th>
            </tr>
          </thead>
          <tbody>
            {(data?.intake || []).map((r) => (
              <tr key={r.id} className="border-t">
                <td className="p-2 font-mono">{r.date}</td>
                <td className="p-2 font-semibold">{(data?.rollTypes || []).find((t) => t.id === r.rollTypeId)?.name || "Film"}</td>
                <td className="p-2 text-blue-800 font-semibold">{r.supplier || "N/A"}</td>
                <td className="p-2 text-right font-mono font-bold">{r.qty} rolls</td>
                <td className="p-2 text-right font-mono">{r.weightKg} kg</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function IssueRollsTab({ data = {}, mutate, session = {}, showToast }) {
  const [rollTypeId, setRollTypeId] = useState((data?.rollTypes || [])[0]?.id || "");
  const [qty, setQty] = useState("");

  useEffect(() => {
    if ((data?.rollTypes || []).length > 0 && !rollTypeId) {
      setRollTypeId(data.rollTypes[0].id);
    }
  }, [data?.rollTypes, rollTypeId]);

  const handleIssue = (e) => {
    e.preventDefault();
    const parsedQty = Number(qty) || 0;
    if (parsedQty <= 0) return showToast("Enter a positive quantity of rolls!", "warn");

    const rType = (data?.rollTypes || []).find((t) => t.id === rollTypeId);
    if (!rType) return showToast("Select a valid roll type", "warn");

    const weightKg = parsedQty * (Number(rType.standardWeightKg) || 0);

    mutate((prev) => ({
      ...prev,
      issuance: [
        {
          id: uid(),
          date: todayISO(),
          rollTypeId,
          qty: parsedQty,
          rollsCount: parsedQty,
          weightKg,
          status: "PENDING",
          issuedBy: session?.name || "Admin",
          confirmedBy: null,
          physicalCount: null,
        },
        ...(prev?.issuance || []),
      ],
    }), "Issued Rolls to Manager", `${parsedQty} rolls issued to Manager`);

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
            {(data?.rollTypes || []).map((t) => (
              <option key={t.id} value={t.id}>{t.name} ({t.standardWeightKg} kg/roll)</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-500">Number of Rolls to Issue (Roll Count)</label>
          <input type="number" min="1" value={qty} onChange={(e) => setQty(e.target.value)} placeholder="5" className="inp" required />
        </div>
        <button type="submit" className="btn-primary w-full">Transfer Rolls to Production Floor</button>
      </form>
    </div>
  );
}

function ManagerRollAcceptanceTab({ data = {}, mutate, session = {}, showToast }) {
  const managerAccepted = useMemo(() => computeManagerAcceptedRolls(data), [data]);

  const handleAccept = (issuanceId, physicalRollsCountInput) => {
    const parsedCount = Number(physicalRollsCountInput) || 0;
    if (parsedCount <= 0) return showToast("Enter a valid physical roll count!", "warn");

    const issuanceRecord = (data?.issuance || []).find(i => i.id === issuanceId);
    const rType = (data?.rollTypes || []).find(t => t.id === issuanceRecord?.rollTypeId);
    const weightKgCalculated = rType ? parsedCount * (Number(rType.standardWeightKg) || 0) : (Number(issuanceRecord?.weightKg) || 0);

    mutate((prev) => {
      const nextIssuance = (prev?.issuance || []).map((item) =>
        item.id === issuanceId
          ? {
              ...item,
              status: "ACCEPTED",
              accepted: true,
              confirmedBy: session?.name || "Manager",
              physicalCount: parsedCount,
              rollsCount: parsedCount,
              weightKg: weightKgCalculated
            }
          : item
      );

      const notif = {
        id: uid(),
        ts: new Date().toLocaleTimeString(),
        read: false,
        title: "Manager Roll Count Acceptance",
        msg: `Manager ${session?.name || "Manager"} accepted ${parsedCount} rolls (${weightKgCalculated} kg) for transfer ID #${issuanceId.slice(0,5)}`,
      };

      return {
        ...prev,
        issuance: nextIssuance,
        notifications: [notif, ...(prev?.notifications || [])],
      };
    }, "Accepted Roll Stock", `Confirmed ${parsedCount} rolls`);

    showToast("Roll Stock Accepted & Confirmation sent to Admin!");
  };

  return (
    <div className="space-y-4">
      <div className="bg-white p-4 rounded-xl border border-[#DDE3DA] flex justify-between items-center">
        <div>
          <p className="font-bold text-sm text-[#0B3B45]">Manager Accepted Rolls Balance</p>
          <p className="text-xs text-gray-500">Recorded as physical number of rolls received.</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-mono font-bold text-[#1C8C9E]">{fmt(managerAccepted?.rollsCount, 0)} rolls</p>
          <p className="text-xs text-gray-500 font-mono">Weight equivalent: {fmt(managerAccepted?.weightKg)} kg</p>
        </div>
      </div>

      <div className="bg-white p-5 rounded-2xl border border-[#DDE3DA] overflow-x-auto">
        <p className="font-bold text-[#0B3B45] mb-3">Roll Custody Transfers & Number of Rolls Acceptance</p>
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-[#F7F8F5] text-left">
              <th className="p-2">Date</th>
              <th className="p-2">Roll Type</th>
              <th className="p-2 text-right">Issued Rolls</th>
              <th className="p-2 text-right">Estimated Weight</th>
              <th className="p-2">Status</th>
              <th className="p-2">Physical Rolls Received & Confirm</th>
            </tr>
          </thead>
          <tbody>
            {(data?.issuance || []).map((item) => {
              const rType = (data?.rollTypes || []).find((t) => t.id === item.rollTypeId);
              return (
                <tr key={item.id} className="border-t">
                  <td className="p-2 font-mono">{item.date}</td>
                  <td className="p-2 font-semibold">{rType?.name || "Roll"}</td>
                  <td className="p-2 text-right font-mono font-bold">{item.qty ?? item.rollsCount} rolls</td>
                  <td className="p-2 text-right font-mono">{item.weightKg} kg</td>
                  <td className="p-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${item.status === "ACCEPTED" ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"}`}>
                      {item.status}
                    </span>
                  </td>
                  <td className="p-2">
                    {item.status === "PENDING" ? (
                      <AcceptForm session={session} label="Rolls Received" onAccept={(count) => handleAccept(item.id, count)} />
                    ) : (
                      <span className="text-gray-600 font-mono">Confirmed: <strong>{item.physicalCount} rolls</strong> by {item.confirmedBy}</span>
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
/*  PACKING BAG SUB-COMPONENTS                                            */
/* ---------------------------------------------------------------------- */
function OwnerBagIntakeTab({ data = {}, mutate, showToast }) {
  const [selectedBagTypeId, setSelectedBagTypeId] = useState("new");
  const [typeName, setTypeName] = useState("");
  const [supplier, setSupplier] = useState("");
  const [qty, setQty] = useState("");

  const handleIntake = (e) => {
    e.preventDefault();
    const parsedQty = Number(qty) || 0;
    if (parsedQty <= 0) return showToast("Quantity must be positive!", "warn");

    let bId = selectedBagTypeId;
    let nameToSave = typeName;

    if (selectedBagTypeId === "new") {
      if (!typeName.trim()) return showToast("Enter a Bag Type Name!", "warn");
      const existing = (data?.bagTypes || []).find(
        (t) => t.name.trim().toLowerCase() === typeName.trim().toLowerCase()
      );
      if (existing) {
        bId = existing.id;
        nameToSave = existing.name;
      } else {
        bId = uid();
      }
    } else {
      const existing = (data?.bagTypes || []).find((t) => t.id === selectedBagTypeId);
      if (existing) nameToSave = existing.name;
    }

    mutate((prev) => {
      const bagTypeExists = (prev?.bagTypes || []).some((t) => t.id === bId);
      const nextBagTypes = bagTypeExists
        ? prev.bagTypes
        : [...(prev?.bagTypes || []), { id: bId, name: nameToSave.trim(), capacity: 30 }];

      return {
        ...prev,
        bagTypes: nextBagTypes,
        bagIntake: [{ id: uid(), date: todayISO(), bagTypeId: bId, supplier, qty: parsedQty }, ...(prev?.bagIntake || [])],
      };
    }, "Bag Intake Recorded", `${parsedQty} pcs ${nameToSave}`);

    setTypeName(""); setSupplier(""); setQty(""); setSelectedBagTypeId("new");
    showToast("Bag Intake Recorded!");
  };

  return (
    <div className="grid lg:grid-cols-2 gap-4">
      <form onSubmit={handleIntake} className="bg-white p-5 rounded-2xl border border-[#DDE3DA] space-y-3">
        <p className="font-bold text-[#0B3B45]">Owner Packing Bags Intake</p>

        <div>
          <label className="text-xs font-semibold text-gray-500">Bag Category</label>
          <select value={selectedBagTypeId} onChange={(e) => setSelectedBagTypeId(e.target.value)} className="inp">
            <option value="new">+ Create New Bag Type</option>
            {(data?.bagTypes || []).map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>

        {selectedBagTypeId === "new" && (
          <div>
            <label className="text-xs font-semibold text-gray-500">New Bag Type / Name</label>
            <input value={typeName} onChange={(e) => setTypeName(e.target.value)} placeholder="e.g. 30-Sachet Outer Bag" className="inp" required={selectedBagTypeId === "new"} />
          </div>
        )}

        <div>
          <label className="text-xs font-semibold text-gray-500">Quantity (Bags/Bundles)</label>
          <input type="number" min="1" value={qty} onChange={(e) => setQty(e.target.value)} placeholder="500" className="inp" required />
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-500">Supplier (Hidden from Manager)</label>
          <input value={supplier} onChange={(e) => setSupplier(e.target.value)} placeholder="e.g. Ghana Pack Ltd" className="inp" />
        </div>
        <button type="submit" className="btn-primary w-full">Save Bag Intake</button>
      </form>

      <div className="bg-white p-5 rounded-2xl border border-[#DDE3DA] overflow-x-auto">
        <p className="font-bold text-[#0B3B45] mb-3">Owner Stock Ledger (Includes Suppliers)</p>
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-[#F7F8F5] text-left">
              <th className="p-2">Date</th>
              <th className="p-2">Bag Type</th>
              <th className="p-2">Supplier</th>
              <th className="p-2 text-right">Qty</th>
            </tr>
          </thead>
          <tbody>
            {(data?.bagIntake || []).map((r) => (
              <tr key={r.id} className="border-t">
                <td className="p-2 font-mono">{r.date}</td>
                <td className="p-2 font-semibold">{(data?.bagTypes || []).find((t) => t.id === r.bagTypeId)?.name || "Bags"}</td>
                <td className="p-2 text-blue-800 font-semibold">{r.supplier || "N/A"}</td>
                <td className="p-2 text-right font-mono">{r.qty}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function IssueBagsTab({ data = {}, mutate, session = {}, showToast }) {
  const [bagTypeId, setBagTypeId] = useState((data?.bagTypes || [])[0]?.id || "");
  const [qty, setQty] = useState("");

  useEffect(() => {
    if ((data?.bagTypes || []).length > 0 && !bagTypeId) {
      setBagTypeId(data.bagTypes[0].id);
    }
  }, [data?.bagTypes, bagTypeId]);

  const handleIssue = (e) => {
    e.preventDefault();
    const parsedQty = Number(qty) || 0;
    if (parsedQty <= 0) return showToast("Quantity must be positive!", "warn");

    mutate((prev) => ({
      ...prev,
      bagIssuance: [
        {
          id: uid(),
          date: todayISO(),
          bagTypeId,
          qty: parsedQty,
          status: "PENDING",
          issuedBy: session?.name || "Admin",
          confirmedBy: null,
          physicalCount: null,
        },
        ...(prev?.bagIssuance || []),
      ],
    }), "Issued Bags to Manager", `${parsedQty} pcs issued`);

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
            {(data?.bagTypes || []).map((t) => (
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

function ManagerBagAcceptanceTab({ data = {}, mutate, session = {}, showToast }) {
  const managerBags = useMemo(() => computeManagerAcceptedBags(data), [data]);

  const handleAccept = (issuanceId, physicalCountInput) => {
    const parsedCount = Number(physicalCountInput) || 0;
    if (parsedCount < 0) return showToast("Count cannot be negative!", "warn");

    mutate((prev) => {
      const nextIssuance = (prev?.bagIssuance || []).map((item) =>
        item.id === issuanceId
          ? { ...item, status: "ACCEPTED", accepted: true, confirmedBy: session?.name || "Manager", physicalCount: parsedCount }
          : item
      );

      const notif = {
        id: uid(),
        ts: new Date().toLocaleTimeString(),
        read: false,
        title: "Manager Bag Acceptance",
        msg: `Manager ${session?.name || "Manager"} accepted bag transfer ID #${issuanceId.slice(0,5)} with physical count: ${parsedCount}`,
      };

      return {
        ...prev,
        bagIssuance: nextIssuance,
        notifications: [notif, ...(prev?.notifications || [])],
      };
    }, "Accepted Bag Stock", `Confirmed ${parsedCount} bags`);

    showToast("Packing Bags Accepted!");
  };

  return (
    <div className="space-y-4">
      <div className="p-4 rounded-xl border border-[#DDE3DA] flex justify-between items-center bg-white">
        <div>
          <p className="font-bold text-sm text-[#0B3B45]">Manager Accepted Packing Bags Balance</p>
          <p className="text-xs text-gray-500">Required to run production.</p>
        </div>
        <p className="text-2xl font-mono font-bold text-[#E8A23D]">{fmt(managerBags?.remainingBags, 0)} pcs</p>
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
            {(data?.bagIssuance || []).map((item) => {
              const bType = (data?.bagTypes || []).find((t) => t.id === item.bagTypeId);
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
                      <AcceptForm session={session} onAccept={(count) => handleAccept(item.id, count)} />
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

function AcceptForm({ session = {}, label = "Physical Count", onAccept }) {
  const isManager = session?.role === "manager" || session?.role === "owner";
  const [cnt, setCnt] = useState("");

  if (!isManager) return null;

  return (
    <div className="flex gap-1 items-center">
      <input
        type="number"
        min="1"
        value={cnt}
        onChange={(e) => setCnt(e.target.value)}
        placeholder={label}
        className="inp py-1 text-xs w-28"
        required
      />
      <button
        type="button"
        onClick={() => {
          if (Number(cnt) > 0) {
            onAccept(cnt);
          }
        }}
        className="btn-success text-xs py-1 px-2"
      >
        Accept
      </button>
    </div>
  );
}