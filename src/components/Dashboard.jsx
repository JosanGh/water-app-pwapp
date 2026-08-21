import React, { useState, useMemo } from 'react';
import { Droplets, Warehouse, PackageOpen, Wallet, ShieldCheck, DollarSign } from "lucide-react";
import { DEFAULT_EXPENSE_CATEGORIES } from '../lib/storage';
import { uid, todayISO, fmt, fmtGHS, computeFinishedGoods, computeManagerAcceptedRolls, computeManagerAcceptedBags, computeCashBalance } from '../lib/helpers';

export function Dashboard({ data = {}, mutate, session = {}, showToast }) {
  const isOwner = session?.role === "owner";
  const finished = useMemo(() => computeFinishedGoods(data), [data]);
  const managerRolls = useMemo(() => computeManagerAcceptedRolls(data), [data]);
  const managerBags = useMemo(() => computeManagerAcceptedBags(data), [data]);
  const cashOnHand = useMemo(() => computeCashBalance(data), [data]);

  const categories = data?.expenseCategories || DEFAULT_EXPENSE_CATEGORIES || [];

  const [expenseDesc, setExpenseDesc] = useState("");
  const [expenseCategory, setExpenseCategory] = useState(categories[0] || "Utilities & Fuel");
  const [expenseAmt, setExpenseAmt] = useState("");

  const [adminExpenseDesc, setAdminExpenseDesc] = useState("");
  const [adminExpenseCategory, setAdminExpenseCategory] = useState(categories[0] || "Utilities & Fuel");
  const [adminExpenseAmt, setAdminExpenseAmt] = useState("");

  const totalManagerExpensesGHS = useMemo(
    () => (data?.expenses || []).reduce((s, e) => s + (e.amount || 0), 0),
    [data?.expenses]
  );
  const totalAdminExpensesGHS = useMemo(
    () => (data?.adminExpenses || []).reduce((s, e) => s + (e.amount || 0), 0),
    [data?.adminExpenses]
  );
  const totalAllExpensesGHS = totalManagerExpensesGHS + totalAdminExpensesGHS;

  const productionLeakages = useMemo(
    () => (data?.productionRuns || []).reduce((s, p) => s + (p.leakageBags || 0), 0),
    [data?.productionRuns]
  );
  const salesLeakages = useMemo(
    () => (data?.sales || []).reduce((s, sl) => s + (sl.leakageBags || 0), 0),
    [data?.sales]
  );
  const totalLeakages = productionLeakages + salesLeakages;

  const productionFreeBags = useMemo(
    () => (data?.productionRuns || []).reduce((s, p) => s + (p.freeBags || 0), 0),
    [data?.productionRuns]
  );
  const salesFreeBags = useMemo(
    () => (data?.sales || []).reduce((s, sl) => s + (sl.freeBags || 0), 0),
    [data?.sales]
  );
  const totalFreeGiveaways = productionFreeBags + salesFreeBags;

  const handleLogExpense = (e) => {
    e.preventDefault();
    if (Number(expenseAmt) <= 0) return showToast("Enter a positive expense amount!", "warn");

    mutate((prev) => ({
      ...prev,
      expenses: [
        {
          id: uid(),
          date: todayISO(),
          category: expenseCategory,
          description: expenseDesc,
          amount: Number(expenseAmt),
          recordedBy: session?.name || "Manager",
        },
        ...(prev?.expenses || []),
      ],
    }), "Logged Expense", `GH₵ ${expenseAmt} [${expenseCategory}] for ${expenseDesc}`);

    setExpenseDesc("");
    setExpenseAmt("");
    showToast("Manager Expense Recorded!");
  };

  const handleLogAdminExpense = (e) => {
    e.preventDefault();
    if (Number(adminExpenseAmt) <= 0) return showToast("Enter a positive expense amount!", "warn");

    mutate((prev) => ({
      ...prev,
      adminExpenses: [
        {
          id: uid(),
          date: todayISO(),
          category: adminExpenseCategory,
          description: adminExpenseDesc,
          amount: Number(adminExpenseAmt),
          recordedBy: session?.name || "Admin",
        },
        ...(prev?.adminExpenses || []),
      ],
    }), "Logged Admin Expense", `GH₵ ${adminExpenseAmt} [${adminExpenseCategory}] for ${adminExpenseDesc}`);

    setAdminExpenseDesc("");
    setAdminExpenseAmt("");
    showToast("Admin Expense Recorded!");
  };

  const allTimeRollIntakePcs = useMemo(
    () => (data?.intake || []).reduce((s, i) => s + (i.qty || 0), 0),
    [data?.intake]
  );
  const allTimeRollIssuancePcs = useMemo(
    () => (data?.issuance || []).reduce((s, i) => s + (i.qty || 0), 0),
    [data?.issuance]
  );
  const ownerRollBalancePcs = Math.max(0, allTimeRollIntakePcs - allTimeRollIssuancePcs);

  const allTimeRollIntakeKg = useMemo(
    () => (data?.intake || []).reduce((s, i) => s + (i.weightKg || 0), 0),
    [data?.intake]
  );
  const allTimeRollIssuanceKg = useMemo(
    () => (data?.issuance || []).reduce((s, i) => s + (i.weightKg || 0), 0),
    [data?.issuance]
  );
  const ownerRollBalanceKg = Math.max(0, allTimeRollIntakeKg - allTimeRollIssuanceKg);

  const allTimeBagIntakeQty = useMemo(
    () => (data?.bagIntake || []).reduce((s, i) => s + (i.qty || 0), 0),
    [data?.bagIntake]
  );
  const allTimeBagIssuanceQty = useMemo(
    () => (data?.bagIssuance || []).reduce((s, i) => s + (i.qty || 0), 0),
    [data?.bagIssuance]
  );
  const ownerBagBalanceQty = Math.max(0, allTimeBagIntakeQty - allTimeBagIssuanceQty);

  const allExpensesCategorized = useMemo(() => {
    const list = [
      ...(data?.expenses || []).map((e) => ({ ...e, source: "Manager" })),
      ...(data?.adminExpenses || []).map((e) => ({ ...e, source: "Admin" })),
    ];

    const totals = {};
    categories.forEach((cat) => (totals[cat] = 0));

    list.forEach((e) => {
      const cat = e.category || "Miscellaneous Expenses";
      totals[cat] = (totals[cat] || 0) + (e.amount || 0);
    });

    return totals;
  }, [data?.expenses, data?.adminExpenses, categories]);

  return (
    <div className="space-y-6">
      <div>
        <p className="font-display font-800 text-2xl text-[#0B3B45]">
          Welcome back, {session?.name || "User"}
        </p>
        <p className="text-sm text-[#5B6B68]">
          Sachet Water Operational Overview · {isOwner ? "Super Admin Dashboard" : "Manager Dashboard"}
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={Droplets} label="Sellable Sachet Bags" value={`${fmt(finished?.availableForSale, 0)} bags`} accent="#2A6E4A" />
        <StatCard icon={Warehouse} label="Manager Rolls Remaining" value={`${fmt(managerRolls?.rollsCount, 0)} rolls (${fmt(managerRolls?.weightKg)} kg)`} accent="#1C8C9E" />
        <StatCard icon={PackageOpen} label="Manager Bags Remaining" value={`${fmt(managerBags?.remainingBags, 0)} pcs`} accent="#E8A23D" />
        <StatCard icon={Wallet} label="Cash On Hand Balance" value={fmtGHS(cashOnHand)} accent={cashOnHand < 0 ? "#C4472F" : "#0B3B45"} />
      </div>

      <div className="bg-white p-5 rounded-2xl border border-[#DDE3DA] space-y-4">
        <p className="font-bold text-[#0B3B45] text-base border-b pb-2">Manager Floor Operational Summary</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <div className="p-3 rounded-xl bg-[#F7F8F5] border border-[#EDEFEA]">
            <p className="text-[11px] font-semibold text-gray-500 uppercase">Rolls Used / Accepted</p>
            <p className="text-sm font-mono font-bold text-[#0B3B45] mt-1">{fmt(managerRolls?.usedRollsCount, 0)} / {fmt(managerRolls?.acceptedRollsCount, 0)} rolls</p>
            <p className="text-[10px] text-gray-400 font-mono">({fmt(managerRolls?.usedKg)} kg used)</p>
          </div>

          <div className="p-3 rounded-xl bg-[#F7F8F5] border border-[#EDEFEA]">
            <p className="text-[11px] font-semibold text-gray-500 uppercase">Packing Bags Used</p>
            <p className="text-sm font-mono font-bold text-[#0B3B45] mt-1">{fmt(managerBags?.usedBags, 0)} / {fmt(managerBags?.acceptedBags, 0)} pcs</p>
            <p className="text-[10px] text-gray-400 font-mono">({fmt(managerBags?.remainingBags, 0)} pcs remaining)</p>
          </div>

          <div className="p-3 rounded-xl bg-[#FBEAE5] border border-[#EFC3B7]">
            <p className="text-[11px] font-semibold text-[#C4472F] uppercase">Manager Total Expenses</p>
            <p className="text-sm font-mono font-bold text-[#C4472F] mt-1">{fmtGHS(totalManagerExpensesGHS)}</p>
            <p className="text-[10px] text-red-500 font-mono">Operational outlay</p>
          </div>

          <div className="p-3 rounded-xl bg-[#FFF6E5] border border-[#F3E1B9]">
            <p className="text-[11px] font-semibold text-amber-800 uppercase">Total Leakages</p>
            <p className="text-sm font-mono font-bold text-amber-800 mt-1">{fmt(totalLeakages, 0)} bags</p>
            <p className="text-[10px] text-amber-700 font-mono">({productionLeakages} prod + {salesLeakages} supply)</p>
          </div>

          <div className="p-3 rounded-xl bg-[#EAF3F1] border border-[#BFDCD6]">
            <p className="text-[11px] font-semibold text-[#0B3B45] uppercase">Total Free Giveaway</p>
            <p className="text-sm font-mono font-bold text-[#0B3B45] mt-1">{fmt(totalFreeGiveaways, 0)} bags</p>
            <p className="text-[10px] text-teal-700 font-mono">({productionFreeBags} prod + {salesFreeBags} sales)</p>
          </div>
        </div>
      </div>

      {isOwner ? (
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-2xl border border-[#DDE3DA] space-y-3">
        <p className="font-bold text-[#0B3B45] text-base">All-Time Intake Automation, Issuance & Warehouse Balances</p>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="p-4 bg-[#F7F8F5] rounded-xl border space-y-2">
            <p className="font-bold text-xs text-[#0B3B45] uppercase">Film Rolls Inventory Ledger</p>
            <div className="flex justify-between text-xs"><span>All-time Intake (Roll Count):</span><span className="font-mono font-bold">{fmt(allTimeRollIntakePcs, 0)} rolls</span></div>
            <div className="flex justify-between text-xs text-blue-800"><span>Issued to Manager (Roll Count):</span><span className="font-mono font-bold">{fmt(allTimeRollIssuancePcs, 0)} rolls</span></div>
            <div className="flex justify-between text-xs text-green-800 pt-1 border-t font-bold"><span>Owner Warehouse Roll Count Balance:</span><span className="font-mono">{fmt(ownerRollBalancePcs, 0)} rolls</span></div>
            <div className="flex justify-between text-xs text-gray-500 pt-1 border-t"><span>All-time Intake Weight:</span><span className="font-mono">{fmt(allTimeRollIntakeKg)} kg</span></div>
            <div className="flex justify-between text-xs text-gray-500"><span>Issued Weight to Manager:</span><span className="font-mono">{fmt(allTimeRollIssuanceKg)} kg</span></div>
            <div className="flex justify-between text-xs text-gray-700 font-semibold"><span>Owner Warehouse Weight Balance:</span><span className="font-mono">{fmt(ownerRollBalanceKg)} kg</span></div>
          </div>

          <div className="p-4 bg-[#F7F8F5] rounded-xl border space-y-2">
            <p className="font-bold text-xs text-[#0B3B45] uppercase">Packing Bags Inventory Ledger</p>
            <div className="flex justify-between text-xs"><span>All-time Intake (Owner):</span><span className="font-mono font-bold">{fmt(allTimeBagIntakeQty, 0)} pcs</span></div>
            <div className="flex justify-between text-xs text-blue-800"><span>Issued to Manager:</span><span className="font-mono font-bold">{fmt(allTimeBagIssuanceQty, 0)} pcs</span></div>
            <div className="flex justify-between text-xs text-green-800 pt-1 border-t font-bold"><span>Owner Warehouse Balance:</span><span className="font-mono">{fmt(ownerBagBalanceQty, 0)} pcs</span></div>
          </div>
        </div>
      </div>
          <div className="grid lg:grid-cols-3 gap-4">
            <div className="lg:col-span-1 bg-white p-5 rounded-2xl border border-[#DDE3DA] space-y-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="text-[#0B3B45]" size={20} />
                <p className="font-bold text-[#0B3B45]">Log Categorized Admin Expense</p>
              </div>
              <form onSubmit={handleLogAdminExpense} className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-gray-500">Expense Category</label>
                  <select value={adminExpenseCategory} onChange={(e) => setAdminExpenseCategory(e.target.value)} className="inp">
                    {categories.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500">Expense Description</label>
                  <input value={adminExpenseDesc} onChange={(e) => setAdminExpenseDesc(e.target.value)} placeholder="e.g. Executive travel / GRA Tax" className="inp" required />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500">Amount (GH₵)</label>
                  <input type="number" min="0.01" step="0.01" value={adminExpenseAmt} onChange={(e) => setAdminExpenseAmt(e.target.value)} placeholder="e.g. 500" className="inp" required />
                </div>
                <button type="submit" className="btn-primary w-full">Record Admin Expense</button>
              </form>
            </div>

            <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-[#DDE3DA] space-y-3">
              <div className="flex justify-between items-center border-b pb-2">
                <p className="font-bold text-[#0B3B45] text-base">Expense Totals & Category Breakdown</p>
                <span className="text-xs font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded">Total: {fmtGHS(totalAllExpensesGHS)}</span>
              </div>

              <div className="grid sm:grid-cols-3 gap-2">
                {Object.entries(allExpensesCategorized).map(([cat, total]) => (
                  <div key={cat} className="p-2.5 bg-[#F7F8F5] rounded-xl border border-[#EDEFEA]">
                    <p className="text-[10px] font-semibold text-gray-500 truncate">{cat}</p>
                    <p className="text-sm font-mono font-bold text-[#0B3B45] mt-0.5">{fmtGHS(total)}</p>
                  </div>
                ))}
              </div>

              <div className="overflow-x-auto max-h-44 mt-2">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-[#F7F8F5] text-left">
                      <th className="p-2">Date</th>
                      <th className="p-2">Category</th>
                      <th className="p-2">Recorded By</th>
                      <th className="p-2">Description</th>
                      <th className="p-2 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ...(data?.adminExpenses || []).map((e) => ({ ...e, type: "Admin" })),
                      ...(data?.expenses || []).map((e) => ({ ...e, type: "Manager" })),
                    ]
                      .sort((a, b) => new Date(b.date) - new Date(a.date))
                      .map((e) => (
                        <tr key={e.id} className="border-t">
                          <td className="p-2 font-mono">{e.date}</td>
                          <td className="p-2 font-semibold text-blue-900">{e.category || "General"}</td>
                          <td className="p-2 font-semibold text-gray-700">{e.recordedBy}</td>
                          <td className="p-2">{e.description}</td>
                          <td className="p-2 text-right font-mono font-bold text-red-700">{fmtGHS(e.amount)}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <form onSubmit={handleLogExpense} className="bg-white p-5 rounded-2xl border border-[#DDE3DA] space-y-3 max-w-lg">
            <div className="flex items-center gap-2">
              <DollarSign className="text-[#0B3B45]" size={18} />
              <p className="font-bold text-[#0B3B45]">Record Operational Expense (Manager Entry)</p>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500">Select Expense Category</label>
              <select value={expenseCategory} onChange={(e) => setExpenseCategory(e.target.value)} className="inp">
                {categories.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500">Expense Description</label>
              <input value={expenseDesc} onChange={(e) => setExpenseDesc(e.target.value)} placeholder="e.g. Factory fuel / generator maintenance" className="inp" required />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500">Amount (GH₵)</label>
              <input type="number" min="0.01" step="0.01" value={expenseAmt} onChange={(e) => setExpenseAmt(e.target.value)} placeholder="e.g. 150" className="inp" required />
            </div>
            <button type="submit" className="btn-primary w-full">Log Categorized Expense</button>
          </form>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, accent }) {
  return (
    <div className="bg-white rounded-2xl border border-[#DDE3DA] p-4">
      <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-3" style={{ background: `${accent}1A` }}>
        <Icon size={16} style={{ color: accent }} />
      </div>
      <p className="font-mono font-semibold text-lg text-[#16211F] leading-none">{value}</p>
      <p className="text-xs text-[#5B6B68] mt-1.5">{label}</p>
    </div>
  );
}