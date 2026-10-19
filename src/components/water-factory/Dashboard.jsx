import React, { useState, useMemo, useEffect } from "react";
import {
  Droplets,
  Warehouse,
  PackageOpen,
  Wallet,
  ShieldCheck,
  DollarSign,
  Sun,
  Moon,
  PlusCircle,
  RotateCw,
  PackageCheck,
} from "lucide-react";
import { DEFAULT_EXPENSE_CATEGORIES } from "../../lib/storage";
import {
  uid,
  todayISO,
  fmt,
  fmtGHS,
  computeFinishedGoods,
  computeManagerAcceptedRolls,
  computeManagerAcceptedBags,
  computeCashBalance,
  computeDailyMetrics,
  computeWeeklyMetrics,
  getTimeUntilMidnight,
} from "../../lib/helpers";
import { Visualizations } from "./Visualizations";
import { DailyWeeklySection } from "./DailyWeeklySection";
import { QuickActionModals } from "./QuickActionModals";

export function Dashboard({
  data = {},
  mutate,
  session = { name: "User", role: "manager" },
  showToast,
  darkMode = false,
  toggleDarkMode,
  onSwitchRole,
}) {
  const isOwner = session?.role === "owner";
  const finished = useMemo(() => computeFinishedGoods(data), [data]);
  const managerRolls = useMemo(() => computeManagerAcceptedRolls(data), [data]);
  const managerBags = useMemo(() => computeManagerAcceptedBags(data), [data]);
  const cashOnHand = useMemo(() => computeCashBalance(data), [data]);

  const categories = useMemo(
    () => data?.expenseCategories || DEFAULT_EXPENSE_CATEGORIES || [],
    [data?.expenseCategories],
  );

  const [expenseDesc, setExpenseDesc] = useState("");
  const [expenseCategory, setExpenseCategory] = useState(
    categories[0] || "Utilities & Fuel",
  );
  const [expenseAmt, setExpenseAmt] = useState("");

  const [adminExpenseDesc, setAdminExpenseDesc] = useState("");
  const [adminExpenseCategory, setAdminExpenseCategory] = useState(
    categories[0] || "Utilities & Fuel",
  );
  const [adminExpenseAmt, setAdminExpenseAmt] = useState("");

  // Modal state for quick logging
  const [activeModal, setActiveModal] = useState(null);

  // Midnight timer & auto rollover tracker
  const [currentDateStr, setCurrentDateStr] = useState(todayISO());
  const [midnightCountdown, setMidnightCountdown] = useState(
    getTimeUntilMidnight().text,
  );

  useEffect(() => {
    const timer = setInterval(() => {
      const nowInfo = getTimeUntilMidnight();
      setMidnightCountdown(nowInfo.text);

      const realToday = todayISO();
      // Automatic midnight rollover check
      if (realToday !== currentDateStr) {
        setCurrentDateStr(realToday);
        if (showToast) {
          showToast(
            `Daily summary rolled over for ${currentDateStr}. Entries remain in history; now showing ${realToday}.`,
            "info",
          );
        }
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [currentDateStr, showToast]);

  useEffect(() => {
    if (!categories.includes(expenseCategory)) {
      setExpenseCategory(categories[0] || "Utilities & Fuel");
    }
    if (!categories.includes(adminExpenseCategory)) {
      setAdminExpenseCategory(categories[0] || "Utilities & Fuel");
    }
  }, [categories, expenseCategory, adminExpenseCategory]);

  const totalManagerExpensesGHS = useMemo(
    () => (data?.expenses || []).reduce((s, e) => s + (e.amount || 0), 0),
    [data?.expenses],
  );
  const totalAdminExpensesGHS = useMemo(
    () => (data?.adminExpenses || []).reduce((s, e) => s + (e.amount || 0), 0),
    [data?.adminExpenses],
  );
  const totalAllExpensesGHS = totalManagerExpensesGHS + totalAdminExpensesGHS;

  const totalManagerBankDepositsGHS = useMemo(
    () =>
      (data.bankDeposits || []).reduce(
        (s, e) => s + (Number(e.amount) || 0),
        0,
      ),
    [data?.bankDeposits],
  );
  const totalAdminBankDepositsGHS = useMemo(
    () =>
      (data.adminbankDeposits || []).reduce(
        (s, e) => s + (Number(e.amount) || 0),
        0,
      ),
    [data?.adminbankDeposits],
  );
  const totalAllBankDepositsGHS =
    totalManagerBankDepositsGHS + totalAdminBankDepositsGHS;

  const productionLeakages = useMemo(
    () =>
      (data?.productionRuns || []).reduce(
        (s, p) => s + (p.leakageBags || 0),
        0,
      ),
    [data?.productionRuns],
  );
  const salesLeakages = useMemo(
    () => (data?.sales || []).reduce((s, sl) => s + (sl.leakageBags || 0), 0),
    [data?.sales],
  );
  const totalLeakages = productionLeakages + salesLeakages;

  const productionFreeBags = useMemo(
    () =>
      (data?.productionRuns || []).reduce((s, p) => s + (p.freeBags || 0), 0),
    [data?.productionRuns],
  );
  const salesFreeBags = useMemo(
    () => (data?.sales || []).reduce((s, sl) => s + (sl.freeBags || 0), 0),
    [data?.sales],
  );
  const totalFreeGiveaways = productionFreeBags + salesFreeBags;

  // Daily & Weekly metrics calculation
  const todayMetric = useMemo(
    () => computeDailyMetrics(data, currentDateStr),
    [data, currentDateStr],
  );
  const weeklyData = useMemo(
    () => computeWeeklyMetrics(data, currentDateStr),
    [data, currentDateStr],
  );
  const myEntries = useMemo(() => {
    const isOwn = (entry) => {
      const actorId =
        entry.userId ||
        entry.recordedByUserId ||
        entry.depositedByUserId ||
        entry.issuedByUserId;
      return actorId
        ? actorId === session?.id
        : [
            entry.user,
            entry.recordedBy,
            entry.depositedBy,
            entry.issuedBy,
            entry.usedBy,
          ].includes(session?.name);
    };
    const activities = [
      ...(data?.auditLog || []).filter(isOwn).map((entry) => ({
        id: entry.id,
        date: entry.ts?.slice(0, 10) || "",
        kind: entry.action,
        detail: entry.detail,
      })),
      ...(data?.productionRuns || []).filter(isOwn).map((entry) => ({
        id: entry.id,
        date: entry.date,
        kind: "Production",
        detail: `${entry.netAvailableBags ?? entry.bagsProduced ?? entry.actualBags ?? 0} bags produced`,
      })),
      ...(data?.sales || []).filter(isOwn).map((entry) => ({
        id: entry.id,
        date: entry.date,
        kind: "Sale",
        detail: `${entry.bagsSold || 0} bags · ${fmtGHS(entry.totalAmount || entry.amountPaid || 0)}`,
      })),
      ...(data?.expenses || []).filter(isOwn).map((entry) => ({
        id: entry.id,
        date: entry.date,
        kind: "Expense",
        detail: `${entry.description} · ${fmtGHS(entry.amount)}`,
      })),
      ...(data?.bankDeposits || []).filter(isOwn).map((entry) => ({
        id: entry.id,
        date: entry.date,
        kind: "Bank deposit",
        detail: `${entry.bankName} · ${fmtGHS(entry.amount)}`,
      })),
    ];
    return activities
      .sort((a, b) => String(b.date).localeCompare(String(a.date)))
      .slice(0, 15);
  }, [
    data?.auditLog,
    data?.productionRuns,
    data?.sales,
    data?.expenses,
    data?.bankDeposits,
    session?.id,
    session?.name,
  ]);

  const handleLogExpense = (e) => {
    e.preventDefault();
    if (Number(expenseAmt) <= 0)
      return showToast("Enter a positive expense amount!", "warn");

    mutate(
      (prev) => ({
        ...prev,
        expenses: [
          {
            id: uid(),
            date: todayISO(),
            category: expenseCategory,
            description: expenseDesc,
            amount: Number(expenseAmt),
            recordedBy: session?.name || "Manager",
            recordedByUserId: session?.id,
          },
          ...(prev?.expenses || []),
        ],
      }),
      "Logged Expense",
      `GH₵ ${expenseAmt} [${expenseCategory}] for ${expenseDesc}`,
    );

    setExpenseDesc("");
    setExpenseAmt("");
    showToast("Manager Expense Recorded!");
  };

  const handleLogAdminExpense = (e) => {
    e.preventDefault();
    if (Number(adminExpenseAmt) <= 0)
      return showToast("Enter a positive expense amount!", "warn");

    mutate(
      (prev) => ({
        ...prev,
        adminExpenses: [
          {
            id: uid(),
            date: todayISO(),
            category: adminExpenseCategory,
            description: adminExpenseDesc,
            amount: Number(adminExpenseAmt),
            recordedBy: session?.name || "Admin",
            recordedByUserId: session?.id,
          },
          ...(prev?.adminExpenses || []),
        ],
      }),
      "Logged Admin Expense",
      `GH₵ ${adminExpenseAmt} [${adminExpenseCategory}] for ${adminExpenseDesc}`,
    );

    setAdminExpenseDesc("");
    setAdminExpenseAmt("");
    showToast("Admin Expense Recorded!");
  };

  const allTimeRollIntakePcs = useMemo(
    () => (data?.intake || []).reduce((s, i) => s + (i.qty || 0), 0),
    [data?.intake],
  );
  const allTimeRollIssuancePcs = useMemo(
    () => (data?.issuance || []).reduce((s, i) => s + (i.qty || 0), 0),
    [data?.issuance],
  );
  const ownerRollBalancePcs = Math.max(
    0,
    allTimeRollIntakePcs - allTimeRollIssuancePcs,
  );

  const allTimeRollIntakeKg = useMemo(
    () => (data?.intake || []).reduce((s, i) => s + (i.weightKg || 0), 0),
    [data?.intake],
  );
  const allTimeRollIssuanceKg = useMemo(
    () => (data?.issuance || []).reduce((s, i) => s + (i.weightKg || 0), 0),
    [data?.issuance],
  );
  const ownerRollBalanceKg = Math.max(
    0,
    allTimeRollIntakeKg - allTimeRollIssuanceKg,
  );

  const allTimeBagIntakeQty = useMemo(
    () => (data?.bagIntake || []).reduce((s, i) => s + (i.qty || 0), 0),
    [data?.bagIntake],
  );
  const allTimeBagIssuanceQty = useMemo(
    () => (data?.bagIssuance || []).reduce((s, i) => s + (i.qty || 0), 0),
    [data?.bagIssuance],
  );
  const ownerBagBalanceQty = Math.max(
    0,
    allTimeBagIntakeQty - allTimeBagIssuanceQty,
  );

  const issuanceActivity = useMemo(() => {
    const rollNames = new Map(
      (data?.rollTypes || []).map((type) => [type.id, type.name]),
    );
    const bagNames = new Map(
      (data?.bagTypes || []).map((type) => [type.id, type.name]),
    );
    const records = [
      ...(data?.issuance || []).map((entry) => ({
        ...entry,
        category: "Roll",
        itemName:
          entry.itemName ||
          rollNames.get(entry.rollTypeId || entry.itemId) ||
          "Roll",
      })),
      ...(data?.bagIssuance || []).map((entry) => ({
        ...entry,
        category: "Packing bag",
        itemName:
          entry.itemName ||
          bagNames.get(entry.bagTypeId || entry.itemId) ||
          "Packing bag",
      })),
    ];

    return records
      .sort((a, b) =>
        String(b.date || b.createdAt || "").localeCompare(
          String(a.date || a.createdAt || ""),
        ),
      )
      .slice(0, 10);
  }, [
    data?.bagIssuance,
    data?.bagTypes,
    data?.issuance,
    data?.rollTypes,
  ]);

  const allExpensesCategorized = useMemo(() => {
    const list = [
      ...(data?.expenses || []).map((e) => ({ ...e, source: "Manager" })),
      ...(data?.adminExpenses || []).map((e) => ({
        ...e,
        source: "Admin",
      })),
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
    <div className="space-y-6 text-[#16211F] dark:text-gray-100 transition-colors">
      {/* Top Header Bar with Welcome, Role Switcher, Quick Actions & Dark Mode Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#121E23] p-4 sm:p-5 rounded-2xl border border-[#DDE3DA] dark:border-[#233840] shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-bold text-2xl sm:text-3xl text-[#0B3B45] dark:text-[#E2E8F0] tracking-tight">
              Welcome back, {session?.name || "User"}
            </h1>
            <span
              className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                isOwner
                  ? "bg-purple-100 dark:bg-purple-950/80 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800"
                  : "bg-teal-100 dark:bg-teal-950/80 text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-800"
              }`}
            >
              {isOwner ? "Owner View" : "Manager View"}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-[#5B6B68] dark:text-gray-400 mt-1">
            Sachet Water Operational Overview ·{" "}
            {isOwner ? "Super Admin Dashboard" : "Manager Floor Dashboard"} ·{" "}
            <span className="font-mono text-cyan-700 dark:text-cyan-400 font-semibold">
              {todayMetric.dayName}, {todayMetric.formattedDate}
            </span>
          </p>
        </div>

        {/* Action Controls & Dark Mode Toggle */}
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          {/* Quick Action Buttons */}
          <button
            type="button"
            onClick={() => setActiveModal("production")}
            className="btn-primary text-xs py-2 px-3 bg-[#1C8C9E] hover:bg-[#157280] dark:bg-[#1C8C9E]"
          >
            <PlusCircle size={14} />
            <span>+ Production Run</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveModal("sale")}
            className="btn-primary text-xs py-2 px-3 bg-[#2A6E4A] hover:bg-[#205539] dark:bg-[#2A6E4A]"
          >
            <DollarSign size={14} />
            <span>+ Record Sale</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveModal("deposit")}
            className="btn-secondary text-xs py-2 px-3"
          >
            <span>+ Bank Deposit</span>
          </button>

          {/* Role Switcher */}
          {onSwitchRole && (
            <button
              type="button"
              onClick={onSwitchRole}
              title="Toggle between Owner & Floor Manager view"
              className="btn-secondary text-xs py-2 px-2.5"
            >
              <RotateCw size={13} />
              <span className="hidden md:inline">
                Switch to {isOwner ? "Manager" : "Owner"}
              </span>
            </button>
          )}

          {/* Dark Mode Toggle Button */}
          <button
            type="button"
            onClick={toggleDarkMode}
            aria-label="Toggle dark mode"
            title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
            className="p-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#1A262B] text-gray-700 dark:text-amber-400 hover:bg-gray-100 dark:hover:bg-[#23353D] transition-all cursor-pointer"
          >
            {darkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </div>

      {/* Top Level Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          icon={Droplets}
          label="Sellable Sachet Bags"
          value={`${fmt(finished?.availableForSale, 0)} bags`}
          accent="#2A6E4A"
        />
        <StatCard
          icon={Warehouse}
          label="Manager Rolls Remaining"
          value={`${fmt(managerRolls?.rollsCount, 0)} rolls (${fmt(managerRolls?.weightKg)} kg)`}
          accent="#1C8C9E"
        />
        <StatCard
          icon={PackageOpen}
          label="Manager Bags Remaining"
          value={`${fmt(managerBags?.remainingBags, 0)} pcs`}
          accent="#E8A23D"
        />
        <StatCard
          icon={Wallet}
          label="Cash On Hand Balance"
          value={fmtGHS(cashOnHand)}
          accent={cashOnHand < 0 ? "#C4472F" : "#0B3B45"}
        />
      </div>

      {/* MANAGER FLOOR OPERATIONAL SUMMARY (Directly fulfills user request) */}
      <div className="bg-white dark:bg-[#121E23] p-4 sm:p-5 rounded-2xl border border-[#DDE3DA] dark:border-[#233840] shadow-xs space-y-4 transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 dark:border-gray-800 pb-2.5">
          <div>
            <p className="font-bold text-[#0B3B45] dark:text-[#E2E8F0] text-base sm:text-lg flex items-center gap-2">
              <PackageCheck size={18} className="text-[#1C8C9E]" />
              Manager Floor Operational Summary
            </p>
            <p className="text-xs text-[#5B6B68] dark:text-gray-400">
              Complete floor accounting for rolls issued, rolls used, packing
              bags, and stock remaining
            </p>
          </div>
          <span className="text-[11px] font-mono font-semibold px-2.5 py-1 rounded-lg bg-teal-50 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-800 self-start sm:self-auto">
            Live Floor Balance Ledger
          </span>
        </div>

        {/* Floor Operation Accounting Grid: Explicitly displays:
            - Total rolls to manager
            - Total roll used
            - Total rolls remaining
            - Total packing bags to manager
            - Packing bags used
            - Total packing bags remaining
            - Plus expenses, leakages, giveaways, bank deposits */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* 1. Total rolls to manager */}
          <div className="p-3 rounded-xl bg-[#F7F8F5] dark:bg-[#18262C] border border-[#EDEFEA] dark:border-[#263A42]">
            <p className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase">
              Total Rolls to Manager
            </p>
            <p className="text-sm sm:text-base font-mono font-bold text-[#0B3B45] dark:text-cyan-300 mt-1">
              {fmt(managerRolls?.acceptedRollsCount, 0)} rolls
            </p>
            <p className="text-[10px] text-gray-400 dark:text-gray-400 font-mono">
              ({fmt(managerRolls?.acceptedKg)} kg received)
            </p>
          </div>

          {/* 2. Total roll used */}
          <div className="p-3 rounded-xl bg-[#F7F8F5] dark:bg-[#18262C] border border-[#EDEFEA] dark:border-[#263A42]">
            <p className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase">
              Total Roll Used
            </p>
            <p className="text-sm sm:text-base font-mono font-bold text-amber-700 dark:text-amber-400 mt-1">
              {fmt(managerRolls?.usedRollsCount, 0)} rolls
            </p>
            <p className="text-[10px] text-gray-400 dark:text-gray-400 font-mono">
              ({fmt(managerRolls?.usedKg)} kg processed)
            </p>
          </div>

          {/* 3. Total rolls remaining */}
          <div className="p-3 rounded-xl bg-teal-50 dark:bg-[#102B33] border border-teal-200 dark:border-[#1E434D]">
            <p className="text-[10px] font-semibold text-teal-800 dark:text-teal-300 uppercase">
              Rolls Remaining
            </p>
            <p className="text-sm sm:text-base font-mono font-bold text-[#1C8C9E] dark:text-teal-200 mt-1">
              {fmt(managerRolls?.rollsCount, 0)} rolls
            </p>
            <p className="text-[10px] text-teal-700 dark:text-teal-400 font-mono font-bold">
              ({fmt(managerRolls?.weightKg)} kg remaining)
            </p>
          </div>

          {/* 4. Total packing bags to manager */}
          <div className="p-3 rounded-xl bg-[#F7F8F5] dark:bg-[#18262C] border border-[#EDEFEA] dark:border-[#263A42]">
            <p className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase">
              Total Packing Bags
            </p>
            <p className="text-sm sm:text-base font-mono font-bold text-[#0B3B45] dark:text-cyan-300 mt-1">
              {fmt(managerBags?.acceptedBags, 0)} pcs
            </p>
            <p className="text-[10px] text-gray-400 dark:text-gray-400 font-mono">
              Received to floor
            </p>
          </div>

          {/* 5. Packing bags used */}
          <div className="p-3 rounded-xl bg-[#F7F8F5] dark:bg-[#18262C] border border-[#EDEFEA] dark:border-[#263A42]">
            <p className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase">
              Packing Bags Used
            </p>
            <p className="text-sm sm:text-base font-mono font-bold text-amber-700 dark:text-amber-400 mt-1">
              {fmt(managerBags?.usedBags, 0)} pcs
            </p>
            <p className="text-[10px] text-gray-400 dark:text-gray-400 font-mono">
              Packed on floor
            </p>
          </div>

          {/* 6. Packing bags remaining */}
          <div className="p-3 rounded-xl bg-amber-50 dark:bg-[#2B2312] border border-amber-200 dark:border-[#4B3B1E]">
            <p className="text-[10px] font-semibold text-amber-800 dark:text-amber-300 uppercase">
              Packing Bags Remaining
            </p>
            <p className="text-sm sm:text-base font-mono font-bold text-amber-600 dark:text-amber-400 mt-1">
              {fmt(managerBags?.remainingBags, 0)} pcs
            </p>
            <p className="text-[10px] text-amber-700 dark:text-amber-300 font-mono font-bold">
              Available to pack
            </p>
          </div>
        </div>

        {/* Secondary Operational Flow Row: Expenses, Leakages, Free Giveaways & Bank Deposits */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          <div className="p-3 rounded-xl bg-[#FBEAE5] dark:bg-[#2D1619] border border-[#EFC3B7] dark:border-[#54242A]">
            <p className="text-[11px] font-semibold text-[#C4472F] dark:text-rose-400 uppercase">
              Manager Total Expenses
            </p>
            <p className="text-sm font-mono font-bold text-[#C4472F] dark:text-rose-300 mt-1">
              {fmtGHS(totalManagerExpensesGHS)}
            </p>
            <p className="text-[10px] text-red-500 dark:text-red-400 font-mono">
              Operational outlay
            </p>
          </div>

          <div className="p-3 rounded-xl bg-[#FFF6E5] dark:bg-[#2C2114] border border-[#F3E1B9] dark:border-[#4E391F]">
            <p className="text-[11px] font-semibold text-amber-800 dark:text-amber-300 uppercase">
              Total Leakages
            </p>
            <p className="text-sm font-mono font-bold text-amber-800 dark:text-amber-300 mt-1">
              {fmt(totalLeakages, 0)} bags
            </p>
            <p className="text-[10px] text-amber-700 dark:text-amber-400 font-mono">
              ({productionLeakages} prod + {salesLeakages} supply)
            </p>
          </div>

          <div className="p-3 rounded-xl bg-[#EAF3F1] dark:bg-[#122A2F] border border-[#BFDCD6] dark:border-[#1E434B]">
            <p className="text-[11px] font-semibold text-[#0B3B45] dark:text-teal-300 uppercase">
              Total Free Giveaway
            </p>
            <p className="text-sm font-mono font-bold text-[#0B3B45] dark:text-teal-200 mt-1">
              {fmt(totalFreeGiveaways, 0)} bags
            </p>
            <p className="text-[10px] text-teal-700 dark:text-teal-400 font-mono">
              ({productionFreeBags} prod + {salesFreeBags} sales)
            </p>
          </div>

          <div className="p-3 rounded-xl bg-[#EAF3F1] dark:bg-[#122A2F] border border-[#BFDCD6] dark:border-[#1E434B]">
            <p className="text-[11px] font-semibold text-[#0B3B45] dark:text-teal-300 uppercase">
              Total Bank Deposit
            </p>
            <p className="text-sm font-mono font-bold text-[#0B3B45] dark:text-teal-200 mt-1">
              {fmtGHS(totalAllBankDepositsGHS, 0)}
            </p>
            <p className="text-[10px] text-teal-700 dark:text-teal-400 font-mono">
              Money to Bank
            </p>
          </div>
        </div>
      </div>

      <section className="overflow-hidden rounded-2xl border border-[#DDE3DA] bg-white shadow-xs transition-colors dark:border-[#233840] dark:bg-[#121E23]">
        <div className="flex flex-col gap-3 border-b border-gray-100 p-4 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div>
            <h2 className="font-bold text-[#0B3B45] dark:text-[#E2E8F0]">
              Manager Issuance
            </h2>
            <p className="mt-1 text-xs text-[#5B6B68] dark:text-gray-400">
              Issued roll and packing-bag quantities, visible to the owner and
              manager.
            </p>
          </div>
          <div className="flex gap-2 text-xs">
            <span className="rounded-lg bg-teal-50 px-3 py-2 font-semibold text-teal-800 dark:bg-teal-950/60 dark:text-teal-300">
              Rolls: {fmt(allTimeRollIssuancePcs, 0)}
            </span>
            <span className="rounded-lg bg-amber-50 px-3 py-2 font-semibold text-amber-800 dark:bg-amber-950/50 dark:text-amber-300">
              Bags: {fmt(allTimeBagIssuanceQty, 0)}
            </span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-left text-xs">
            <thead className="bg-[#F7F8F5] text-[10px] uppercase tracking-wide text-gray-500 dark:bg-[#18262C] dark:text-gray-400">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Item</th>
                <th className="px-4 py-3">Quantity</th>
                <th className="px-4 py-3">Recipient</th>
                <th className="px-4 py-3">Issued by</th>
                <th className="px-4 py-3">Status / confirmation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {issuanceActivity.length ? (
                issuanceActivity.map((entry, index) => (
                  <tr
                    key={entry.id || `${entry.category}-${entry.date}-${index}`}
                    className="text-[#16211F] dark:text-gray-200"
                  >
                    <td className="whitespace-nowrap px-4 py-3">
                      {entry.date || entry.createdAt?.slice(0, 10) || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-semibold">{entry.itemName}</span>
                      <span className="ml-2 text-gray-500 dark:text-gray-400">
                        {entry.category}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-mono font-semibold">
                      {fmt(Number(entry.qty) || 0, 0)}{" "}
                      {entry.category === "Roll" ? "rolls" : "pcs"}
                    </td>
                    <td className="px-4 py-3">
                      {entry.recipient || entry.issuedTo || "Manager"}
                    </td>
                    <td className="px-4 py-3">
                      {entry.issuedBy || entry.recordedBy || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-semibold">
                        {entry.status || entry.distributionType || "Recorded"}
                      </span>
                      {entry.confirmedBy && (
                        <span className="block text-[10px] text-gray-500 dark:text-gray-400">
                          Confirmed by {entry.confirmedBy}
                          {entry.physicalCount != null
                            ? ` · ${entry.physicalCount} counted`
                            : ""}
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400"
                  >
                    No roll or packing-bag issuance has been recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* REAL-TIME DATA VISUALIZATION SECTION */}
      <Visualizations
        weeklyData={weeklyData}
        expenseCategoryTotals={allExpensesCategorized}
        totalExpenses={totalAllExpensesGHS}
      />

      {/* DAILY AND WEEKLY PRODUCTION & SALES (Automated Midnight Rollover & Day & Date Tracking) */}
      <DailyWeeklySection
        todayMetric={todayMetric}
        weeklyData={weeklyData}
        midnightCountdown={midnightCountdown}
      />

      {/* ROLE SPECIFIC SECTIONS: OWNER OR MANAGER */}
      {isOwner ? (
        <div className="space-y-6">
          <div className="bg-white dark:bg-[#121E23] p-5 rounded-2xl border border-[#DDE3DA] dark:border-[#233840] space-y-3 transition-colors shadow-xs">
            <p className="font-bold text-[#0B3B45] dark:text-[#E2E8F0] text-base">
              All-Time Intake Automation, Issuance & Warehouse Balances
            </p>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="p-4 bg-[#F7F8F5] dark:bg-[#18262C] rounded-xl border border-gray-200 dark:border-gray-700 space-y-2">
                <p className="font-bold text-xs text-[#0B3B45] dark:text-cyan-300 uppercase">
                  Film Rolls Inventory Ledger
                </p>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-600 dark:text-gray-400">
                    All-time Intake (Roll Count):
                  </span>
                  <span className="font-mono font-bold">
                    {fmt(allTimeRollIntakePcs, 0)} rolls
                  </span>
                </div>
                <div className="flex justify-between text-xs text-blue-800 dark:text-blue-300">
                  <span>Issued to Manager (Roll Count):</span>
                  <span className="font-mono font-bold">
                    {fmt(allTimeRollIssuancePcs, 0)} rolls
                  </span>
                </div>
                <div className="flex justify-between text-xs text-green-800 dark:text-emerald-400 pt-1 border-t border-gray-200 dark:border-gray-700 font-bold">
                  <span>Owner Warehouse Roll Count Balance:</span>
                  <span className="font-mono">
                    {fmt(ownerRollBalancePcs, 0)} rolls
                  </span>
                </div>
                <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 pt-1 border-t border-gray-200 dark:border-gray-700">
                  <span>All-time Intake Weight:</span>
                  <span className="font-mono">
                    {fmt(allTimeRollIntakeKg)} kg
                  </span>
                </div>
                <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                  <span>Issued Weight to Manager:</span>
                  <span className="font-mono">
                    {fmt(allTimeRollIssuanceKg)} kg
                  </span>
                </div>
                <div className="flex justify-between text-xs text-gray-700 dark:text-gray-300 font-semibold">
                  <span>Owner Warehouse Weight Balance:</span>
                  <span className="font-mono">
                    {fmt(ownerRollBalanceKg)} kg
                  </span>
                </div>
              </div>

              <div className="p-4 bg-[#F7F8F5] dark:bg-[#18262C] rounded-xl border border-gray-200 dark:border-gray-700 space-y-2">
                <p className="font-bold text-xs text-[#0B3B45] dark:text-cyan-300 uppercase">
                  Packing Bags Inventory Ledger
                </p>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-600 dark:text-gray-400">
                    All-time Intake (Owner):
                  </span>
                  <span className="font-mono font-bold">
                    {fmt(allTimeBagIntakeQty, 0)} pcs
                  </span>
                </div>
                <div className="flex justify-between text-xs text-blue-800 dark:text-blue-300">
                  <span>Issued to Manager:</span>
                  <span className="font-mono font-bold">
                    {fmt(allTimeBagIssuanceQty, 0)} pcs
                  </span>
                </div>
                <div className="flex justify-between text-xs text-green-800 dark:text-emerald-400 pt-1 border-t border-gray-200 dark:border-gray-700 font-bold">
                  <span>Owner Warehouse Balance:</span>
                  <span className="font-mono">
                    {fmt(ownerBagBalanceQty, 0)} pcs
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-4">
            <div className="lg:col-span-1 bg-white dark:bg-[#121E23] p-5 rounded-2xl border border-[#DDE3DA] dark:border-[#233840] space-y-3 shadow-xs">
              <div className="flex items-center gap-2">
                <ShieldCheck
                  className="text-[#0B3B45] dark:text-cyan-400"
                  size={20}
                />
                <p className="font-bold text-[#0B3B45] dark:text-[#E2E8F0]">
                  Log Categorized Admin Expense
                </p>
              </div>
              <form onSubmit={handleLogAdminExpense} className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                    Expense Category
                  </label>
                  <select
                    value={adminExpenseCategory}
                    onChange={(e) => setAdminExpenseCategory(e.target.value)}
                    className="inp mt-1"
                  >
                    {categories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                    Expense Description
                  </label>
                  <input
                    value={adminExpenseDesc}
                    onChange={(e) => setAdminExpenseDesc(e.target.value)}
                    placeholder="e.g. Executive travel / GRA Tax"
                    className="inp mt-1"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                    Amount (GH₵)
                  </label>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={adminExpenseAmt}
                    onChange={(e) => setAdminExpenseAmt(e.target.value)}
                    placeholder="e.g. 500"
                    className="inp mt-1"
                    required
                  />
                </div>
                <button type="submit" className="btn-primary w-full">
                  Record Admin Expense
                </button>
              </form>
            </div>

            <div className="lg:col-span-2 bg-white dark:bg-[#121E23] p-5 rounded-2xl border border-[#DDE3DA] dark:border-[#233840] space-y-3 shadow-xs">
              <div className="flex justify-between items-center border-b border-gray-100 dark:border-gray-800 pb-2">
                <p className="font-bold text-[#0B3B45] dark:text-[#E2E8F0] text-base">
                  Expense Totals & Category Breakdown
                </p>
                <span className="text-xs font-bold text-red-700 dark:text-red-400 bg-red-100 dark:bg-red-950/60 px-2 py-0.5 rounded border border-red-200 dark:border-red-900">
                  Total: {fmtGHS(totalAllExpensesGHS)}
                </span>
              </div>

              <div className="grid sm:grid-cols-3 gap-2">
                {Object.entries(allExpensesCategorized).map(([cat, total]) => (
                  <div
                    key={cat}
                    className="p-2.5 bg-[#F7F8F5] dark:bg-[#18262C] rounded-xl border border-[#EDEFEA] dark:border-[#273B43]"
                  >
                    <p className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 truncate">
                      {cat}
                    </p>
                    <p className="text-sm font-mono font-bold text-[#0B3B45] dark:text-cyan-300 mt-0.5">
                      {fmtGHS(total)}
                    </p>
                  </div>
                ))}
              </div>

              <div className="overflow-x-auto max-h-44 mt-2 border border-gray-100 dark:border-gray-800 rounded-xl">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-[#F7F8F5] dark:bg-[#18262C] text-left text-gray-600 dark:text-gray-400">
                      <th className="p-2">Date</th>
                      <th className="p-2">Category</th>
                      <th className="p-2">Recorded By</th>
                      <th className="p-2">Description</th>
                      <th className="p-2 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {[
                      ...(data?.adminExpenses || []).map((e) => ({
                        ...e,
                        type: "Admin",
                      })),
                      ...(data?.expenses || []).map((e) => ({
                        ...e,
                        type: "Manager",
                      })),
                    ]
                      .sort(
                        (a, b) =>
                          new Date(b.date).getTime() -
                          new Date(a.date).getTime(),
                      )
                      .map((e) => (
                        <tr
                          key={e.id}
                          className="hover:bg-gray-50 dark:hover:bg-[#192A30] transition-colors"
                        >
                          <td className="p-2 font-mono">{e.date}</td>
                          <td className="p-2 font-semibold text-blue-900 dark:text-blue-300">
                            {e.category || "General"}
                          </td>
                          <td className="p-2 font-semibold text-gray-700 dark:text-gray-300">
                            {e.recordedBy}
                          </td>
                          <td className="p-2 text-gray-600 dark:text-gray-300">
                            {e.description}
                          </td>
                          <td className="p-2 text-right font-mono font-bold text-red-700 dark:text-red-400">
                            {fmtGHS(e.amount)}
                          </td>
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
          <form
            onSubmit={handleLogExpense}
            className="bg-white dark:bg-[#121E23] p-5 rounded-2xl border border-[#DDE3DA] dark:border-[#233840] space-y-3 max-w-lg shadow-xs"
          >
            <div className="flex items-center gap-2">
              <DollarSign
                className="text-[#0B3B45] dark:text-cyan-400"
                size={18}
              />
              <p className="font-bold text-[#0B3B45] dark:text-[#E2E8F0]">
                Record Operational Expense (Manager Entry)
              </p>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                Select Expense Category
              </label>
              <select
                value={expenseCategory}
                onChange={(e) => setExpenseCategory(e.target.value)}
                className="inp mt-1"
              >
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                Expense Description
              </label>
              <input
                value={expenseDesc}
                onChange={(e) => setExpenseDesc(e.target.value)}
                placeholder="e.g. Factory fuel / generator maintenance"
                className="inp mt-1"
                required
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                Amount (GH₵)
              </label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={expenseAmt}
                onChange={(e) => setExpenseAmt(e.target.value)}
                placeholder="e.g. 150"
                className="inp mt-1"
                required
              />
            </div>
            <button type="submit" className="btn-primary w-full">
              Log Categorized Expense
            </button>
          </form>
          <section className="bg-white dark:bg-[#121E23] p-5 rounded-2xl border border-[#DDE3DA] dark:border-[#233840] max-w-lg">
            <h2 className="font-bold text-[#0B3B45] dark:text-[#E2E8F0] mb-3">
              My recent entries
            </h2>
            {myEntries.length === 0 ? (
              <p className="text-sm text-[#5B6B68] dark:text-gray-400">
                Your recorded activity will appear here.
              </p>
            ) : (
              <ul className="space-y-2">
                {myEntries.map((entry) => (
                  <li
                    key={`${entry.kind}-${entry.id}`}
                    className="border-b border-gray-100 dark:border-gray-800 pb-2 last:border-0"
                  >
                    <div className="flex justify-between gap-3 text-xs">
                      <strong className="text-[#0B3B45] dark:text-cyan-300">
                        {entry.kind}
                      </strong>
                      <span className="font-mono text-gray-500">
                        {entry.date}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">
                      {entry.detail}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}

      {/* Quick Action Modal Portal */}
      <QuickActionModals
        modalType={activeModal}
        onClose={() => setActiveModal(null)}
        mutate={mutate}
        showToast={showToast}
        sessionName={session?.name}
        sessionId={session?.id}
      />
    </div>
  );
}

function StatCard({ icon: Icon, label, value, accent }) {
  return (
    <div className="bg-white dark:bg-[#121E23] rounded-2xl border border-[#DDE3DA] dark:border-[#233840] p-4 shadow-xs hover:border-[#1C8C9E] dark:hover:border-cyan-500 transition-all">
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center mb-3"
        style={{ background: `${accent}1A` }}
      >
        <Icon size={16} style={{ color: accent }} />
      </div>
      <p className="font-mono font-semibold text-lg text-[#16211F] dark:text-[#F1F5F9] leading-none">
        {value}
      </p>
      <p className="text-xs text-[#5B6B68] dark:text-gray-400 mt-1.5">
        {label}
      </p>
    </div>
  );
}
