import { useState } from "react";
import type { DayMetricSummary, WeekMetricSummary } from "../../lib/types";
import { fmt, fmtGHS } from "../../lib/helpers";
import { BarChart3, DollarSign, AlertCircle, PieChart } from "lucide-react";

interface VisualizationsProps {
  weeklyData: WeekMetricSummary;
  expenseCategoryTotals: Record<string, number>;
  totalExpenses: number;
}

export function Visualizations({
  weeklyData,
  expenseCategoryTotals,
  totalExpenses,
}: VisualizationsProps) {
  const [activeChart, setActiveChart] = useState<
    "production" | "finances" | "quality"
  >("production");
  const [hoveredDay, setHoveredDay] = useState<DayMetricSummary | null>(null);

  // Maximum values for scaling
  const maxBags = Math.max(
    ...weeklyData.days.map((d) => Math.max(d.bagsProduced, d.totalSoldBags)),
    500,
  );

  const maxFinance = Math.max(
    ...weeklyData.days.map((d) =>
      Math.max(d.cashSales + d.momoPayments, d.bankDeposits, d.expenditure),
    ),
    2000,
  );

  return (
    <div className="bg-white dark:bg-[#121E23] p-4 sm:p-5 rounded-2xl border border-[#DDE3DA] dark:border-[#233840] shadow-xs space-y-4 transition-colors">
      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 dark:border-gray-800 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <p className="font-bold text-[#0B3B45] dark:text-[#E2E8F0] text-base flex items-center gap-1.5">
              Real-Time Visual Analytics
            </p>
          </div>
          <p className="text-xs text-[#5B6B68] dark:text-gray-400">
            Interactive 7-day rolling trends & financial allocation
          </p>
        </div>

        {/* Chart Selector Pills */}
        <div className="inline-flex p-1 bg-gray-100 dark:bg-[#1A2A30] rounded-xl text-xs font-semibold self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveChart("production")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
              activeChart === "production"
                ? "bg-white dark:bg-[#0B3B45] text-[#0B3B45] dark:text-white shadow-xs font-bold"
                : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
            }`}
          >
            <BarChart3 size={14} />
            <span>Production & Sales</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveChart("finances")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
              activeChart === "finances"
                ? "bg-white dark:bg-[#0B3B45] text-[#0B3B45] dark:text-white shadow-xs font-bold"
                : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
            }`}
          >
            <DollarSign size={14} />
            <span>Revenue & Cashflow</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveChart("quality")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
              activeChart === "quality"
                ? "bg-white dark:bg-[#0B3B45] text-[#0B3B45] dark:text-white shadow-xs font-bold"
                : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
            }`}
          >
            <AlertCircle size={14} />
            <span>Waste & Giveaways</span>
          </button>
        </div>
      </div>

      {/* Dynamic Chart View */}
      {activeChart === "production" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between text-xs gap-3">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-[#1C8C9E]"></span>
                <span className="text-gray-600 dark:text-gray-300">
                  Bags Produced
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-[#2A6E4A]"></span>
                <span className="text-gray-600 dark:text-gray-300">
                  Bags Sold
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                <span className="text-gray-600 dark:text-gray-300">
                  Rolls Used
                </span>
              </div>
            </div>
            <div className="text-[11px] font-mono text-gray-500 dark:text-gray-400">
              Weekly Produced:{" "}
              <strong className="text-[#0B3B45] dark:text-emerald-400">
                {fmt(weeklyData.totals.bagsProduced, 0)} bags
              </strong>
            </div>
          </div>

          {/* SVG Bar & Trend Chart */}
          <div className="h-48 sm:h-56 w-full relative pt-4 pb-6">
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-20 dark:opacity-10">
              <div className="border-b border-gray-400 w-full"></div>
              <div className="border-b border-gray-400 w-full"></div>
              <div className="border-b border-gray-400 w-full"></div>
              <div className="border-b border-gray-400 w-full"></div>
            </div>

            <div className="h-full flex items-end justify-between gap-1 sm:gap-4 relative z-10">
              {weeklyData.days.map((day) => {
                const prodHeight = Math.max(
                  8,
                  (day.bagsProduced / maxBags) * 100,
                );
                const soldHeight = Math.max(
                  8,
                  (day.totalSoldBags / maxBags) * 100,
                );
                const isHovered = hoveredDay?.date === day.date;

                return (
                  <div
                    key={day.date}
                    onMouseEnter={() => setHoveredDay(day)}
                    onMouseLeave={() => setHoveredDay(null)}
                    className="flex-1 flex flex-col items-center h-full justify-end group cursor-pointer"
                  >
                    {/* Tooltip on hover */}
                    {isHovered && (
                      <div className="absolute top-0 z-30 bg-slate-900/95 text-white p-2 rounded-lg text-[11px] shadow-lg pointer-events-none transform -translate-y-2 whitespace-nowrap">
                        <p className="font-bold text-amber-300">
                          {day.dayName}, {day.formattedDate}
                        </p>
                        <p>
                          Produced:{" "}
                          <span className="font-mono font-bold text-cyan-300">
                            {fmt(day.bagsProduced, 0)} bags
                          </span>
                        </p>
                        <p>
                          Sold:{" "}
                          <span className="font-mono font-bold text-green-300">
                            {fmt(day.totalSoldBags, 0)} bags
                          </span>
                        </p>
                        <p>
                          Rolls: {day.rollsProduced} ({fmt(day.materialKg)} kg)
                          | Bags Used: {day.packingBagsUsed}
                        </p>
                      </div>
                    )}

                    <div className="w-full flex items-end justify-center gap-1 sm:gap-2 h-4/5">
                      {/* Produced Bar */}
                      <div
                        style={{ height: `${prodHeight}%` }}
                        className={`w-3 sm:w-5 bg-[#1C8C9E] rounded-t transition-all duration-300 ${
                          day.isToday ? "ring-2 ring-cyan-400" : ""
                        } group-hover:brightness-110`}
                      />
                      {/* Sold Bar */}
                      <div
                        style={{ height: `${soldHeight}%` }}
                        className="w-3 sm:w-5 bg-[#2A6E4A] rounded-t transition-all duration-300 group-hover:brightness-110"
                      />
                    </div>

                    <div className="mt-2 text-center">
                      <p
                        className={`text-[10px] sm:text-xs font-semibold truncate ${
                          day.isToday
                            ? "text-cyan-600 dark:text-cyan-400 font-bold"
                            : "text-gray-500 dark:text-gray-400"
                        }`}
                      >
                        {day.dayName.slice(0, 3)}
                      </p>
                      <p className="text-[9px] text-gray-400 font-mono hidden sm:block">
                        {day.date.slice(5)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {activeChart === "finances" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between text-xs gap-3">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-emerald-600"></span>
                <span className="text-gray-600 dark:text-gray-300">
                  Cash Sales
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-indigo-500"></span>
                <span className="text-gray-600 dark:text-gray-300">
                  Mobile Money (MoMo)
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-cyan-600"></span>
                <span className="text-gray-600 dark:text-gray-300">
                  Bank Deposits
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-rose-500"></span>
                <span className="text-gray-600 dark:text-gray-300">
                  Expenditure
                </span>
              </div>
            </div>
            <div className="text-[11px] font-mono text-gray-500 dark:text-gray-400">
              Weekly Revenue:{" "}
              <strong className="text-emerald-600 dark:text-emerald-400">
                {fmtGHS(
                  weeklyData.totals.cashSales + weeklyData.totals.momoPayments,
                )}
              </strong>
            </div>
          </div>

          <div className="h-48 sm:h-56 w-full relative pt-4 pb-6">
            <div className="h-full flex items-end justify-between gap-1 sm:gap-4 relative z-10">
              {weeklyData.days.map((day) => {
                const totalRevenue = day.cashSales + day.momoPayments;
                const revHeight = Math.max(
                  6,
                  (totalRevenue / maxFinance) * 100,
                );
                const depHeight = Math.max(
                  6,
                  (day.bankDeposits / maxFinance) * 100,
                );
                const expHeight = Math.max(
                  6,
                  (day.expenditure / maxFinance) * 100,
                );
                const isHovered = hoveredDay?.date === day.date;

                return (
                  <div
                    key={day.date}
                    onMouseEnter={() => setHoveredDay(day)}
                    onMouseLeave={() => setHoveredDay(null)}
                    className="flex-1 flex flex-col items-center h-full justify-end group cursor-pointer"
                  >
                    {isHovered && (
                      <div className="absolute top-0 z-30 bg-slate-900/95 text-white p-2 rounded-lg text-[11px] shadow-lg pointer-events-none transform -translate-y-2 whitespace-nowrap">
                        <p className="font-bold text-amber-300">
                          {day.dayName}, {day.formattedDate}
                        </p>
                        <p>
                          Cash Sales:{" "}
                          <span className="text-emerald-300 font-mono">
                            {fmtGHS(day.cashSales)}
                          </span>
                        </p>
                        <p>
                          Mobile Money:{" "}
                          <span className="text-indigo-300 font-mono">
                            {fmtGHS(day.momoPayments)}
                          </span>
                        </p>
                        <p>
                          Bank Deposits:{" "}
                          <span className="text-cyan-300 font-mono">
                            {fmtGHS(day.bankDeposits)}
                          </span>
                        </p>
                        <p>
                          Expenditure:{" "}
                          <span className="text-rose-300 font-mono">
                            {fmtGHS(day.expenditure)}
                          </span>
                        </p>
                      </div>
                    )}

                    <div className="w-full flex items-end justify-center gap-1 sm:gap-1.5 h-4/5">
                      {/* Cash bar */}
                      <div
                        style={{ height: `${revHeight}%` }}
                        className="w-2.5 sm:w-3.5 bg-emerald-600 rounded-t transition-all group-hover:brightness-110"
                      />
                      {/* MoMo bar */}
                      <div
                        style={{
                          height: `${Math.max(4, (day.momoPayments / maxFinance) * 100)}%`,
                        }}
                        className="w-2.5 sm:w-3.5 bg-indigo-500 rounded-t transition-all group-hover:brightness-110"
                      />
                      {/* Bank deposit bar */}
                      <div
                        style={{ height: `${depHeight}%` }}
                        className="w-2.5 sm:w-3.5 bg-cyan-600 rounded-t transition-all group-hover:brightness-110"
                      />
                      {/* Expenditure bar */}
                      <div
                        style={{ height: `${expHeight}%` }}
                        className="w-2.5 sm:w-3.5 bg-rose-500 rounded-t transition-all group-hover:brightness-110"
                      />
                    </div>

                    <div className="mt-2 text-center">
                      <p
                        className={`text-[10px] sm:text-xs font-semibold ${
                          day.isToday
                            ? "text-cyan-600 dark:text-cyan-400 font-bold"
                            : "text-gray-500 dark:text-gray-400"
                        }`}
                      >
                        {day.dayName.slice(0, 3)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {activeChart === "quality" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between text-xs gap-3">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-rose-500"></span>
                <span className="text-gray-600 dark:text-gray-300">
                  Leakages (Bags)
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-amber-500"></span>
                <span className="text-gray-600 dark:text-gray-300">
                  Free Giveaways (Promo)
                </span>
              </div>
            </div>
            <div className="text-[11px] font-mono text-gray-500 dark:text-gray-400">
              Weekly Leakages:{" "}
              <strong className="text-rose-600 dark:text-rose-400">
                {weeklyData.totals.leakages} bags
              </strong>{" "}
              (
              {(
                (weeklyData.totals.leakages /
                  (weeklyData.totals.bagsProduced || 1)) *
                100
              ).toFixed(1)}
              % of prod)
            </div>
          </div>

          <div className="h-48 sm:h-56 w-full relative pt-4 pb-6">
            <div className="h-full flex items-end justify-between gap-1 sm:gap-4 relative z-10">
              {weeklyData.days.map((day) => {
                const leakHeight = Math.max(8, (day.leakages / 15) * 100);
                const freeHeight = Math.max(8, (day.freeGiveaways / 15) * 100);
                const isHovered = hoveredDay?.date === day.date;

                return (
                  <div
                    key={day.date}
                    onMouseEnter={() => setHoveredDay(day)}
                    onMouseLeave={() => setHoveredDay(null)}
                    className="flex-1 flex flex-col items-center h-full justify-end group cursor-pointer"
                  >
                    {isHovered && (
                      <div className="absolute top-0 z-30 bg-slate-900/95 text-white p-2 rounded-lg text-[11px] shadow-lg pointer-events-none transform -translate-y-2 whitespace-nowrap">
                        <p className="font-bold text-amber-300">
                          {day.dayName}, {day.formattedDate}
                        </p>
                        <p>
                          Leakages:{" "}
                          <span className="text-rose-300 font-mono">
                            {day.leakages} bags
                          </span>
                        </p>
                        <p>
                          Giveaways:{" "}
                          <span className="text-amber-300 font-mono">
                            {day.freeGiveaways} bags
                          </span>
                        </p>
                        <p>Total bags produced: {day.bagsProduced}</p>
                      </div>
                    )}

                    <div className="w-full flex items-end justify-center gap-1 sm:gap-2 h-4/5">
                      <div
                        style={{ height: `${Math.min(100, leakHeight)}%` }}
                        className="w-3 sm:w-5 bg-rose-500 rounded-t transition-all group-hover:brightness-110"
                      />
                      <div
                        style={{ height: `${Math.min(100, freeHeight)}%` }}
                        className="w-3 sm:w-5 bg-amber-500 rounded-t transition-all group-hover:brightness-110"
                      />
                    </div>

                    <div className="mt-2 text-center">
                      <p
                        className={`text-[10px] sm:text-xs font-semibold ${
                          day.isToday
                            ? "text-cyan-600 dark:text-cyan-400 font-bold"
                            : "text-gray-500 dark:text-gray-400"
                        }`}
                      >
                        {day.dayName.slice(0, 3)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Expense Categories Bar Strip */}
      <div className="pt-3 border-t border-gray-100 dark:border-gray-800">
        <div className="flex items-center justify-between text-xs mb-2">
          <span className="font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1">
            <PieChart size={13} className="text-[#1C8C9E]" />
            Expense Allocation Overview
          </span>
          <span className="font-mono text-gray-500 dark:text-gray-400 text-[11px]">
            Total Incurred: <strong>{fmtGHS(totalExpenses)}</strong>
          </span>
        </div>
        <div className="h-3 w-full bg-gray-100 dark:bg-[#1A2A30] rounded-full overflow-hidden flex">
          {Object.entries(expenseCategoryTotals)
            .filter(([, val]) => val > 0)
            .map(([category, amt], idx) => {
              const pct = totalExpenses > 0 ? (amt / totalExpenses) * 100 : 0;
              const palette = [
                "bg-teal-500",
                "bg-blue-500",
                "bg-amber-500",
                "bg-purple-500",
                "bg-rose-500",
                "bg-emerald-500",
                "bg-cyan-500",
                "bg-orange-500",
              ];
              const color = palette[idx % palette.length];
              return (
                <div
                  key={category}
                  style={{ width: `${pct}%` }}
                  title={`${category}: ${fmtGHS(amt)} (${pct.toFixed(1)}%)`}
                  className={`${color} hover:opacity-80 transition-opacity`}
                />
              );
            })}
        </div>
      </div>
    </div>
  );
}
