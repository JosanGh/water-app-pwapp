import { useState, useEffect, useMemo } from 'react';
import { AlertTriangle, Plus, X } from "lucide-react";
import { uid, todayISO, computeManagerAcceptedRolls, computeManagerAcceptedBags } from '../lib/helpers';

export function ProductionModule({ data = {}, mutate, session = {}, showToast }) {
  const isAdmin = session.role === "admin" || session.role === "owner";

  const managerRolls = useMemo(() => computeManagerAcceptedRolls(data), [data]);
  const managerBags = useMemo(() => computeManagerAcceptedBags(data), [data]);

  // Default fallback machines list if none registered in database
  const defaultMachines = [
    "Machine 1 - Koyo Cutting Line",
    "Machine 2 - High Speed Sachet Line",
    "Machine 3 - Secondary Line"
  ];
  const machinesList = data.machines || defaultMachines;

  const [operatorName, setOperatorName] = useState("");
  const [machineUnit, setMachineUnit] = useState(machinesList[0] || "");
  const [newMachineName, setNewMachineName] = useState("");
  const [isAddingMachine, setIsAddingMachine] = useState(false);

  const [rollTypeId, setRollTypeId] = useState(data.rollTypes?.[0]?.id || "");
  const [rollsUsedCount, setRollsUsedCount] = useState("1");
  const [weightUsed, setWeightUsed] = useState("");
  const [bagsUsedQty, setBagsUsedQty] = useState("");
  const [actualBags, setActualBags] = useState("");
  const [leakage, setLeakage] = useState("0");
  const [freeBags, setFreeBags] = useState("0");

  useEffect(() => {
    if ((data.rollTypes || []).length > 0 && !rollTypeId) {
      setRollTypeId(data.rollTypes[0].id);
    }
  }, [data.rollTypes, rollTypeId]);

  useEffect(() => {
    if (machinesList.length > 0 && !machineUnit) {
      setMachineUnit(machinesList[0]);
    }
  }, [machinesList, machineUnit]);

  const selectedType = (data.rollTypes || []).find(t => t.id === rollTypeId);
  const autoWeight = selectedType ? Number(rollsUsedCount || 0) * selectedType.standardWeightKg : 25;

  const canProduce = managerRolls.rollsCount > 0 && managerBags.remainingBags > 0;

  // Handle registering new machine unit
  const handleRegisterMachine = (e) => {
    e.preventDefault();
    if (!newMachineName.trim()) {
      showToast("Please enter a valid machine unit name!", "warn");
      return;
    }

    const formattedName = newMachineName.trim();
    if (machinesList.includes(formattedName)) {
      showToast("This machine is already registered!", "warn");
      return;
    }

    const updatedMachines = [...machinesList, formattedName];

    mutate((prev) => ({
      ...prev,
      machines: updatedMachines,
    }), "Registered Machine Unit", `Added new production unit: ${formattedName}`);

    setMachineUnit(formattedName);
    setNewMachineName("");
    setIsAddingMachine(false);
    showToast(`Machine "${formattedName}" registered successfully!`);
  };

  const handleRunProduction = (e) => {
    e.preventDefault();
    if (!canProduce) {
      showToast("PRODUCTION BLOCKED: Rolls or Packing Bags not available in manager floor inventory!", "warn");
      return;
    }

    if (!operatorName.trim()) {
      showToast("Please specify the Machine Operator Name!", "warn");
      return;
    }

    const rollCountNum = Number(rollsUsedCount);
    const weightUsedNum = weightUsed ? Number(weightUsed) : autoWeight;

    if (rollCountNum <= 0 || weightUsedNum <= 0 || Number(actualBags) <= 0 || Number(bagsUsedQty) <= 0) {
      showToast("Please enter positive valid operational figures!", "warn");
      return;
    }

    if (rollCountNum > managerRolls.rollsCount) {
      showToast(`Cannot use more rolls than available (${managerRolls.rollsCount} rolls)`, "warn");
      return;
    }

    if (Number(bagsUsedQty) > managerBags.remainingBags) {
      showToast(`Cannot use more packing bags than available (${managerBags.remainingBags} pcs)`, "warn");
      return;
    }

    const netProduced = Math.max(0, Number(actualBags) - Number(leakage || 0) - Number(freeBags || 0));

    mutate((prev) => ({
      ...prev,
      productionRuns: [
        {
          id: uid(),
          date: todayISO(),
          operatorName: operatorName.trim(),
          machineUnit,
          rollTypeId,
          rollsUsedCount: rollCountNum,
          weightUsedKg: weightUsedNum,
          bagsUsedQty: Number(bagsUsedQty),
          actualBags: Number(actualBags),
          leakageBags: Number(leakage || 0),
          freeBags: Number(freeBags || 0),
          netAvailableBags: netProduced,
          recordedBy: session.name,
        },
        ...(prev.productionRuns || []),
      ],
      bagUsage: [
        {
          id: uid(),
          date: todayISO(),
          qty: Number(bagsUsedQty),
          reason: `Production Run - ${machineUnit} (${operatorName})`,
          usedBy: session.name,
        },
        ...(prev.bagUsage || []),
      ],
    }), "Recorded Production Run", `${netProduced} sellable sachet bags produced by ${operatorName}`);

    setOperatorName(""); setWeightUsed(""); setActualBags(""); setLeakage("0"); setFreeBags("0"); setBagsUsedQty("");
    showToast("Production Machine Run Logged Successfully!");
  };

  return (
    <div className="space-y-5">
      <div>
        <p className="font-display font-800 text-2xl text-[#0B3B45]">Production Floor Execution</p>
        <p className="text-sm text-[#5B6B68]">Record water cutting machine operators, rolls used (count & weight), packing bags, burst leakages, and free bags.</p>
      </div>

      {/* Hide production logging form from Admin/Owner */}
      {!isAdmin && (
        <>
          {!canProduce ? (
            <div className="bg-[#FBEAE5] border border-[#EFC3B7] p-5 rounded-2xl flex items-center gap-3 text-[#C4472F]">
              <AlertTriangle size={24} className="shrink-0" />
              <div>
                <p className="font-bold text-sm">PRODUCTION RUN BLOCKED</p>
                <p className="text-xs">0 accepted Film Rolls or 0 accepted Packing Bags in Manager floor stock. Accept pending transfers first.</p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleRunProduction} className="bg-[#FFFFFF] p-5 rounded-2xl border border-[#DDE3DA] space-y-4 max-w-2xl">
              <p className="font-bold text-[#0B3B45] text-base border-b pb-2">Log Machine & Operator Production Run</p>

              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-500">Water Cutting Machine Operator Name *</label>
                  <input value={operatorName} onChange={(e) => setOperatorName(e.target.value)} placeholder="e.g. Emmanuel Addo" className="inp" required />
                </div>
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-semibold text-gray-500">Production Machine Unit</label>
                    <button
                      type="button"
                      onClick={() => setIsAddingMachine(!isAddingMachine)}
                      className="text-[11px] font-bold text-[#1C8C9E] hover:underline flex items-center gap-0.5"
                    >
                      {isAddingMachine ? <X size={12} /> : <Plus size={12} />}
                      {isAddingMachine ? "Cancel" : "Add Machine"}
                    </button>
                  </div>

                  {isAddingMachine ? (
                    <div className="flex gap-1">
                      <input
                        value={newMachineName}
                        onChange={(e) => setNewMachineName(e.target.value)}
                        placeholder="e.g. Machine 4 - High Speed"
                        className="inp text-xs"
                      />
                      <button
                        type="button"
                        onClick={handleRegisterMachine}
                        className="bg-[#0B3B45] text-white px-3 py-1 rounded-xl text-xs font-bold hover:bg-[#1C8C9E] transition"
                      >
                        Save
                      </button>
                    </div>
                  ) : (
                    <select value={machineUnit} onChange={(e) => setMachineUnit(e.target.value)} className="inp">
                      {machinesList.map((m) => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              <div className="grid sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-500">Film Roll Type</label>
                  <select value={rollTypeId} onChange={(e) => setRollTypeId(e.target.value)} className="inp" required>
                    {(data.rollTypes || []).map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500">Rolls Used (Roll Count) *</label>
                  <input type="number" min="1" max={managerRolls.rollsCount} value={rollsUsedCount} onChange={(e) => setRollsUsedCount(e.target.value)} placeholder="1" className="inp" required />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500">Total Roll Weight (kg)</label>
                  <input type="number" min="0.1" step="0.1" value={weightUsed || autoWeight} onChange={(e) => setWeightUsed(e.target.value)} placeholder={`${autoWeight} kg`} className="inp" required />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-500">Packing Bags Used (pcs) *</label>
                  <input type="number" min="1" max={managerBags.remainingBags} value={bagsUsedQty} onChange={(e) => setBagsUsedQty(e.target.value)} placeholder="e.g. 30" className="inp" required />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500">Gross Sachet Water Bags Produced *</label>
                  <input type="number" min="1" value={actualBags} onChange={(e) => setActualBags(e.target.value)} placeholder="e.g. 900" className="inp" required />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-3 bg-[#F7F8F5] p-3 rounded-xl border border-[#EDEFEA]">
                <div>
                  <label className="text-xs font-semibold text-red-700">Burst / Leakage Bags</label>
                  <input type="number" min="0" value={leakage} onChange={(e) => setLeakage(e.target.value)} className="inp" required />
                </div>
                <div>
                  <label className="text-xs font-semibold text-amber-700">Free / Promo / Sample Bags</label>
                  <input type="number" min="0" value={freeBags} onChange={(e) => setFreeBags(e.target.value)} className="inp" required />
                </div>
              </div>

              <button type="submit" className="btn-primary w-full py-2.5">Record Production Run & Update Stock</button>
            </form>
          )}
        </>
      )}

      {/* Production Logs Table visible to all roles including Admin */}
      <div className="bg-white p-5 rounded-2xl border border-[#DDE3DA] overflow-x-auto">
        <p className="font-bold text-[#0B3B45] mb-3">Comprehensive Production Logs</p>
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-[#F7F8F5] text-left">
              <th className="p-2">Date</th>
              <th className="p-2">Operator</th>
              <th className="p-2">Machine Unit</th>
              <th className="p-2 text-right">Rolls (Count & Weight)</th>
              <th className="p-2 text-right">Bags Used</th>
              <th className="p-2 text-right">Gross Bags</th>
              <th className="p-2 text-right">Leakages</th>
              <th className="p-2 text-right">Free Bags</th>
              <th className="p-2 text-right">Net Available Bags</th>
            </tr>
          </thead>
          <tbody>
            {(data.productionRuns || []).map((r) => (
              <tr key={r.id} className="border-t">
                <td className="p-2 font-mono">{r.date}</td>
                <td className="p-2 font-semibold text-[#0B3B45]">{r.operatorName || r.recordedBy}</td>
                <td className="p-2 text-gray-600">{r.machineUnit || "Main Machine"}</td>
                <td className="p-2 text-right font-mono font-bold">{r.rollsUsedCount || 0} rolls ({r.weightUsedKg} kg)</td>
                <td className="p-2 text-right font-mono">{r.bagsUsedQty || "N/A"} pcs</td>
                <td className="p-2 text-right font-mono">{r.actualBags}</td>
                <td className="p-2 text-right font-mono text-red-600 font-bold">{r.leakageBags || 0}</td>
                <td className="p-2 text-right font-mono text-amber-600 font-bold">{r.freeBags || 0}</td>
                <td className="p-2 text-right font-mono font-bold text-green-700">{r.netAvailableBags}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}