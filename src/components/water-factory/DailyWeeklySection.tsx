import { useState } from "react";
import type { DayMetricSummary, WeekMetricSummary } from "../../lib/types";
import type { LucideIcon } from "lucide-react";
import { fmt, fmtGHS } from "../../lib/helpers";
import {
  Calendar,
  Clock,
  Layers,
  Weight,
  Package,
  Droplet,
  AlertTriangle,
  Gift,
  ShoppingCart,
  Banknote,
  Building,
  Smartphone,
  Receipt,
  CheckCircle2,
} from "lucide-react";

interface DailyWeeklySectionProps {
  todayMetric: DayMetricSummary;
  weeklyData: WeekMetricSummary;
  midnightCountdown: string;
}

export function DailyWeeklySection({
  todayMetric,
  weeklyData,
  midnightCountdown,
}: DailyWeeklySectionProps) {
  const [viewMode, setViewMode] = useState<
    "today" | "weekly-table" | "daily-cards"
  >("today");
  const [selectedDate, setSelectedDate] = useState(todayMetric.date);
  const selectedDay =
    weeklyData.days.find((day) => day.date === selectedDate) ?? todayMetric;

  return (
    <div className="bg-white dark:bg-[#121E23] p-4 sm:p-5 rounded-2xl border border-[#DDE3DA] dark:border-[#233840] shadow-xs space-y-4 transition-colors">
      {/* Top Banner: Midnight auto-rollover indicator & Day & Date */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-gray-100 dark:border-gray-800 pb-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="p-1.5 rounded-lg bg-[#EAF3F1] dark:bg-[#1C3A40] text-[#0B3B45] dark:text-[#38BDF8]">
              <Calendar size={18} />
            </span>
            <h3 className="font-bold text-[#0B3B45] dark:text-[#E2E8F0] text-lg">
              Daily & Weekly Production and Sales
            </h3>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Auto-updates at local midnight
            </span>
          </div>
          <p className="text-xs text-[#5B6B68] dark:text-gray-400 mt-1">
            Daily and weekly totals are calculated from dated operation records.
          </p>
        </div>

        {/* Midnight timer badge */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gray-50 dark:bg-[#1A262B] border border-gray-200 dark:border-gray-700 text-xs">
            <Clock size={14} className="text-amber-500" />
            <span className="text-gray-500 dark:text-gray-400">
              Next Midnight:
            </span>
            <span className="font-mono font-bold text-[#0B3B45] dark:text-cyan-300">
              {midnightCountdown}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="inline-flex p-1 bg-gray-100 dark:bg-[#1A2A30] rounded-xl text-xs font-semibold">
          <button
            type="button"
            onClick={() => {
              setViewMode("today");
              setSelectedDate(todayMetric.date);
            }}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              viewMode === "today"
                ? "bg-white dark:bg-[#0B3B45] text-[#0B3B45] dark:text-white shadow-xs font-bold"
                : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
            }`}
          >
            Today's Live Record ({todayMetric.formattedDate})
          </button>
          <button
            type="button"
            onClick={() => setViewMode("weekly-table")}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              viewMode === "weekly-table"
                ? "bg-white dark:bg-[#0B3B45] text-[#0B3B45] dark:text-white shadow-xs font-bold"
                : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
            }`}
          >
            Weekly Breakdown Table
          </button>
          <button
            type="button"
            onClick={() => setViewMode("daily-cards")}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              viewMode === "daily-cards"
                ? "bg-white dark:bg-[#0B3B45] text-[#0B3B45] dark:text-white shadow-xs font-bold"
                : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
            }`}
          >
            Daily History Cards
          </button>
        </div>

        <div className="text-xs text-gray-500 dark:text-gray-400 font-mono">
          Showing:{" "}
          <strong className="text-gray-800 dark:text-gray-200">
            {weeklyData.weekLabel}
          </strong>
        </div>
      </div>

      {/* VIEW 1: TODAY'S LIVE RECORD (Comprehensive Grid of the 11 Required Fields) */}
      {viewMode === "today" && (
        <div className="space-y-4">
          <div className="p-3.5 rounded-xl bg-gradient-to-r from-[#F0F7F6] to-[#E6F0EE] dark:from-[#13282E] dark:to-[#172F36] border border-[#BFDCD6] dark:border-[#204A54] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-teal-800 dark:text-teal-300">
                Active Production & Sales Ledger
              </span>
              <p className="text-base sm:text-lg font-bold text-[#0B3B45] dark:text-teal-100 flex items-center gap-2">
                <span>
                  {todayMetric.dayName}, {todayMetric.formattedDate}
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-teal-200/80 dark:bg-teal-900 text-teal-900 dark:text-teal-200 font-semibold">
                  Live Today
                </span>
              </p>
            </div>
            <div className="text-xs text-teal-900 dark:text-teal-200 font-medium sm:text-right">
              <p>Will automatically seal to daily archive</p>
              <p className="font-mono text-teal-700 dark:text-teal-400">
                at midnight (00:00:00)
              </p>
            </div>
          </div>

          {/* 11 Required Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {/* 1. Rolls Produced / Used */}
            <MetricCard
              icon={Layers}
              title="1. Production Rolls Used"
              value={`${fmt(todayMetric.rollsProduced, 0)} rolls`}
              subtitle={`${fmt(todayMetric.materialKg)} kg processed`}
              color="text-teal-700 dark:text-teal-300"
              bg="bg-teal-50 dark:bg-[#122A30] border-teal-200 dark:border-[#1E414A]"
            />

            {/* 2. kg of Material */}
            <MetricCard
              icon={Weight}
              title="2. Kg of Material"
              value={`${fmt(todayMetric.materialKg, 2)} kg`}
              subtitle={`Average ${todayMetric.rollsProduced ? (todayMetric.materialKg / todayMetric.rollsProduced).toFixed(1) : 0} kg/roll`}
              color="text-cyan-700 dark:text-cyan-300"
              bg="bg-cyan-50 dark:bg-[#102933] border-cyan-200 dark:border-[#194352]"
            />

            {/* 3. Packing Bags Used */}
            <MetricCard
              icon={Package}
              title="3. Packing Bags Used"
              value={`${fmt(todayMetric.packingBagsUsed, 0)} pcs`}
              subtitle="Outer carrier packing bags"
              color="text-amber-700 dark:text-amber-300"
              bg="bg-amber-50 dark:bg-[#2B2312] border-amber-200 dark:border-[#4D3D1F]"
            />

            {/* 4. Number of Bags Produced */}
            <MetricCard
              icon={Droplet}
              title="4. Bags Produced"
              value={`${fmt(todayMetric.bagsProduced, 0)} bags`}
              subtitle="Sellable completed units"
              color="text-emerald-700 dark:text-emerald-300"
              bg="bg-emerald-50 dark:bg-[#122E23] border-emerald-200 dark:border-[#1A4B38]"
            />

            {/* 5. Leakages */}
            <MetricCard
              icon={AlertTriangle}
              title="5. Leakages"
              value={`${fmt(todayMetric.leakages, 0)} bags`}
              subtitle="Burst & defective sachets"
              color="text-rose-700 dark:text-rose-300"
              bg="bg-rose-50 dark:bg-[#2D1619] border-rose-200 dark:border-[#52242B]"
            />

            {/* 6. Other Bags / Free Giveaways */}
            <MetricCard
              icon={Gift}
              title="6. Free Giveaways / Promo"
              value={`${fmt(todayMetric.freeGiveaways, 0)} bags`}
              subtitle="Driver & dealer incentive"
              color="text-purple-700 dark:text-purple-300"
              bg="bg-purple-50 dark:bg-[#26162D] border-purple-200 dark:border-[#4B2459]"
            />

            {/* 7. Total Sold Bags */}
            <MetricCard
              icon={ShoppingCart}
              title="7. Total Sold Bags"
              value={`${fmt(todayMetric.totalSoldBags, 0)} bags`}
              subtitle="Delivered to customers"
              color="text-blue-700 dark:text-blue-300"
              bg="bg-blue-50 dark:bg-[#132238] border-blue-200 dark:border-[#1F395E]"
            />

            {/* 8. Cash Sales */}
            <MetricCard
              icon={Banknote}
              title="8. Cash Sales"
              value={fmtGHS(todayMetric.cashSales)}
              subtitle="Direct cash collected"
              color="text-green-700 dark:text-green-300"
              bg="bg-green-50 dark:bg-[#132A1D] border-green-200 dark:border-[#1F4C32]"
            />

            {/* 9. Deposit to Bank */}
            <MetricCard
              icon={Building}
              title="9. Deposit to Bank"
              value={fmtGHS(todayMetric.bankDeposits)}
              subtitle="Paid into bank account"
              color="text-sky-700 dark:text-sky-300"
              bg="bg-sky-50 dark:bg-[#122836] border-sky-200 dark:border-[#1C4158]"
            />

            {/* 10. Payment via Mobile Money */}
            <MetricCard
              icon={Smartphone}
              title="10. Mobile Money (MoMo)"
              value={fmtGHS(todayMetric.momoPayments)}
              subtitle="MTN / Telecel / AT merchant"
              color="text-indigo-700 dark:text-indigo-300"
              bg="bg-indigo-50 dark:bg-[#1D1B36] border-indigo-200 dark:border-[#353063]"
            />

            {/* 11. Expenditure Incurred */}
            <MetricCard
              icon={Receipt}
              title="11. Expenditure Incurred"
              value={fmtGHS(todayMetric.expenditure)}
              subtitle="Daily factory & admin outlay"
              color="text-red-700 dark:text-red-300"
              bg="bg-red-50 dark:bg-[#2E1618] border-red-200 dark:border-[#522529]"
            />

            {/* Daily Net Summary */}
            <MetricCard
              icon={CheckCircle2}
              title="Net Cash Generated (Today)"
              value={fmtGHS(
                todayMetric.cashSales -
                  todayMetric.bankDeposits -
                  todayMetric.expenditure,
              )}
              subtitle="Cash in drawer change"
              color="text-[#0B3B45] dark:text-cyan-300"
              bg="bg-[#F7F8F5] dark:bg-[#18262C] border-[#EDEFEA] dark:border-[#273B43]"
            />
          </div>
        </div>
      )}

      {/* VIEW 2: WEEKLY BREAKDOWN TABLE (Full 11 Fields across Mon-Sun + Weekly Totals) */}
      {viewMode === "weekly-table" && (
        <div className="space-y-3">
          <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
            <table className="w-full text-xs text-left whitespace-nowrap">
              <thead className="bg-gray-100 dark:bg-[#18262C] text-gray-700 dark:text-gray-300 uppercase text-[10px] tracking-wider font-semibold border-b border-gray-200 dark:border-gray-800">
                <tr>
                  <th className="p-3 sticky left-0 bg-gray-100 dark:bg-[#18262C] z-10">
                    Day & Date
                  </th>
                  <th className="p-3 text-right">1. Rolls Used</th>
                  <th className="p-3 text-right">2. Kg Material</th>
                  <th className="p-3 text-right">3. Bags Used</th>
                  <th className="p-3 text-right text-emerald-700 dark:text-emerald-400">
                    4. Bags Produced
                  </th>
                  <th className="p-3 text-right text-rose-600 dark:text-rose-400">
                    5. Leakages
                  </th>
                  <th className="p-3 text-right text-amber-600 dark:text-amber-400">
                    6. Free Bags
                  </th>
                  <th className="p-3 text-right text-blue-700 dark:text-blue-400">
                    7. Bags Sold
                  </th>
                  <th className="p-3 text-right text-emerald-700 dark:text-emerald-400">
                    8. Cash Sales
                  </th>
                  <th className="p-3 text-right text-sky-700 dark:text-sky-400">
                    9. Bank Deposit
                  </th>
                  <th className="p-3 text-right text-indigo-700 dark:text-indigo-400">
                    10. MoMo Sales
                  </th>
                  <th className="p-3 text-right text-red-700 dark:text-red-400">
                    11. Expenditure
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-gray-800 dark:text-gray-200">
                {weeklyData.days.map((day) => (
                  <tr
                    key={day.date}
                    className={`hover:bg-gray-50/80 dark:hover:bg-[#192A30] transition-colors ${
                      day.isToday
                        ? "bg-cyan-50/50 dark:bg-cyan-950/20 font-medium"
                        : ""
                    }`}
                  >
                    <td className="p-3 sticky left-0 bg-white dark:bg-[#121E23] z-10 flex items-center gap-1.5 font-semibold">
                      <span>
                        {day.dayName.slice(0, 3)}, {day.formattedDate}
                      </span>
                      {day.isToday && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-cyan-100 dark:bg-cyan-900 text-cyan-800 dark:text-cyan-200">
                          Today
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-right font-mono">
                      {fmt(day.rollsProduced, 0)}
                    </td>
                    <td className="p-3 text-right font-mono">
                      {fmt(day.materialKg, 1)} kg
                    </td>
                    <td className="p-3 text-right font-mono">
                      {fmt(day.packingBagsUsed, 0)}
                    </td>
                    <td className="p-3 text-right font-mono font-bold text-emerald-700 dark:text-emerald-400">
                      {fmt(day.bagsProduced, 0)}
                    </td>
                    <td className="p-3 text-right font-mono text-rose-600 dark:text-rose-400">
                      {day.leakages}
                    </td>
                    <td className="p-3 text-right font-mono text-amber-600 dark:text-amber-400">
                      {day.freeGiveaways}
                    </td>
                    <td className="p-3 text-right font-mono font-bold text-blue-700 dark:text-blue-400">
                      {fmt(day.totalSoldBags, 0)}
                    </td>
                    <td className="p-3 text-right font-mono text-emerald-700 dark:text-emerald-400">
                      {fmtGHS(day.cashSales)}
                    </td>
                    <td className="p-3 text-right font-mono text-sky-700 dark:text-sky-400">
                      {fmtGHS(day.bankDeposits)}
                    </td>
                    <td className="p-3 text-right font-mono text-indigo-700 dark:text-indigo-400">
                      {fmtGHS(day.momoPayments)}
                    </td>
                    <td className="p-3 text-right font-mono text-red-700 dark:text-red-400">
                      {fmtGHS(day.expenditure)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-[#EAF3F1] dark:bg-[#16333B] font-bold text-[#0B3B45] dark:text-teal-100 border-t-2 border-gray-300 dark:border-teal-700">
                <tr>
                  <td className="p-3 sticky left-0 bg-[#EAF3F1] dark:bg-[#16333B] z-10 uppercase text-[11px]">
                    WEEKLY TOTALS
                  </td>
                  <td className="p-3 text-right font-mono">
                    {fmt(weeklyData.totals.rollsProduced, 0)}
                  </td>
                  <td className="p-3 text-right font-mono">
                    {fmt(weeklyData.totals.materialKg, 1)} kg
                  </td>
                  <td className="p-3 text-right font-mono">
                    {fmt(weeklyData.totals.packingBagsUsed, 0)}
                  </td>
                  <td className="p-3 text-right font-mono text-emerald-800 dark:text-emerald-300">
                    {fmt(weeklyData.totals.bagsProduced, 0)}
                  </td>
                  <td className="p-3 text-right font-mono text-rose-700 dark:text-rose-300">
                    {weeklyData.totals.leakages}
                  </td>
                  <td className="p-3 text-right font-mono text-amber-700 dark:text-amber-300">
                    {weeklyData.totals.freeGiveaways}
                  </td>
                  <td className="p-3 text-right font-mono text-blue-800 dark:text-blue-300">
                    {fmt(weeklyData.totals.totalSoldBags, 0)}
                  </td>
                  <td className="p-3 text-right font-mono text-emerald-800 dark:text-emerald-300">
                    {fmtGHS(weeklyData.totals.cashSales)}
                  </td>
                  <td className="p-3 text-right font-mono text-sky-800 dark:text-sky-300">
                    {fmtGHS(weeklyData.totals.bankDeposits)}
                  </td>
                  <td className="p-3 text-right font-mono text-indigo-800 dark:text-indigo-300">
                    {fmtGHS(weeklyData.totals.momoPayments)}
                  </td>
                  <td className="p-3 text-right font-mono text-red-800 dark:text-red-300">
                    {fmtGHS(weeklyData.totals.expenditure)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 3: DAILY HISTORY CARDS (Selectable Day & Date Cards for Mobile / Detail Inspection) */}
      {viewMode === "daily-cards" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
            {weeklyData.days.map((day) => {
              const isSel = selectedDay.date === day.date;
              return (
                <button
                  key={day.date}
                  type="button"
                  onClick={() => setSelectedDate(day.date)}
                  className={`p-2.5 rounded-xl border text-left transition-all ${
                    isSel
                      ? "border-[#1C8C9E] bg-[#EAF3F1] dark:bg-[#16363E] ring-2 ring-[#1C8C9E]/30"
                      : "border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-[#18262C] hover:bg-gray-100 dark:hover:bg-[#1E3038]"
                  }`}
                >
                  <p className="text-[11px] font-bold text-gray-800 dark:text-gray-200">
                    {day.dayName.slice(0, 3)}
                  </p>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 font-mono">
                    {day.date.slice(5)}
                  </p>
                  <p className="text-xs font-mono font-bold text-[#1C8C9E] mt-1.5">
                    {fmt(day.bagsProduced, 0)} bags
                  </p>
                  <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono">
                    {fmtGHS(day.cashSales + day.momoPayments)}
                  </p>
                </button>
              );
            })}
          </div>

          {/* Selected Day Inspector */}
          <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#18262C] space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                  Details for Day & Date
                </p>
                <p className="font-bold text-base text-[#0B3B45] dark:text-[#E2E8F0]">
                  {selectedDay.dayName}, {selectedDay.formattedDate}
                </p>
              </div>
              <span className="text-xs font-mono px-2.5 py-1 rounded-lg bg-white dark:bg-[#121E23] border border-gray-200 dark:border-gray-700">
                Revenue:{" "}
                <strong className="text-emerald-600 dark:text-emerald-400">
                  {fmtGHS(selectedDay.cashSales + selectedDay.momoPayments)}
                </strong>
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 text-xs">
              <div className="p-2.5 bg-white dark:bg-[#121E23] rounded-lg border border-gray-100 dark:border-gray-800">
                <span className="text-gray-500 text-[10px]">
                  1. Rolls Produced:
                </span>
                <p className="font-mono font-bold text-sm text-[#0B3B45] dark:text-cyan-400">
                  {selectedDay.rollsProduced} rolls
                </p>
              </div>
              <div className="p-2.5 bg-white dark:bg-[#121E23] rounded-lg border border-gray-100 dark:border-gray-800">
                <span className="text-gray-500 text-[10px]">
                  2. Kg Material:
                </span>
                <p className="font-mono font-bold text-sm text-[#0B3B45] dark:text-cyan-400">
                  {fmt(selectedDay.materialKg)} kg
                </p>
              </div>
              <div className="p-2.5 bg-white dark:bg-[#121E23] rounded-lg border border-gray-100 dark:border-gray-800">
                <span className="text-gray-500 text-[10px]">
                  3. Packing Bags Used:
                </span>
                <p className="font-mono font-bold text-sm text-[#0B3B45] dark:text-cyan-400">
                  {fmt(selectedDay.packingBagsUsed, 0)} pcs
                </p>
              </div>
              <div className="p-2.5 bg-white dark:bg-[#121E23] rounded-lg border border-gray-100 dark:border-gray-800">
                <span className="text-gray-500 text-[10px]">
                  4. Bags Produced:
                </span>
                <p className="font-mono font-bold text-sm text-emerald-600 dark:text-emerald-400">
                  {fmt(selectedDay.bagsProduced, 0)} bags
                </p>
              </div>
              <div className="p-2.5 bg-white dark:bg-[#121E23] rounded-lg border border-gray-100 dark:border-gray-800">
                <span className="text-gray-500 text-[10px]">5. Leakages:</span>
                <p className="font-mono font-bold text-sm text-rose-600 dark:text-rose-400">
                  {selectedDay.leakages} bags
                </p>
              </div>
              <div className="p-2.5 bg-white dark:bg-[#121E23] rounded-lg border border-gray-100 dark:border-gray-800">
                <span className="text-gray-500 text-[10px]">
                  6. Free Giveaways:
                </span>
                <p className="font-mono font-bold text-sm text-amber-600 dark:text-amber-400">
                  {selectedDay.freeGiveaways} bags
                </p>
              </div>
              <div className="p-2.5 bg-white dark:bg-[#121E23] rounded-lg border border-gray-100 dark:border-gray-800">
                <span className="text-gray-500 text-[10px]">
                  7. Total Sold Bags:
                </span>
                <p className="font-mono font-bold text-sm text-blue-600 dark:text-blue-400">
                  {fmt(selectedDay.totalSoldBags, 0)} bags
                </p>
              </div>
              <div className="p-2.5 bg-white dark:bg-[#121E23] rounded-lg border border-gray-100 dark:border-gray-800">
                <span className="text-gray-500 text-[10px]">
                  8. Cash Sales:
                </span>
                <p className="font-mono font-bold text-sm text-emerald-600 dark:text-emerald-400">
                  {fmtGHS(selectedDay.cashSales)}
                </p>
              </div>
              <div className="p-2.5 bg-white dark:bg-[#121E23] rounded-lg border border-gray-100 dark:border-gray-800">
                <span className="text-gray-500 text-[10px]">
                  9. Bank Deposit:
                </span>
                <p className="font-mono font-bold text-sm text-sky-600 dark:text-sky-400">
                  {fmtGHS(selectedDay.bankDeposits)}
                </p>
              </div>
              <div className="p-2.5 bg-white dark:bg-[#121E23] rounded-lg border border-gray-100 dark:border-gray-800">
                <span className="text-gray-500 text-[10px]">
                  10. Mobile Money:
                </span>
                <p className="font-mono font-bold text-sm text-indigo-600 dark:text-indigo-400">
                  {fmtGHS(selectedDay.momoPayments)}
                </p>
              </div>
              <div className="p-2.5 bg-white dark:bg-[#121E23] rounded-lg border border-gray-100 dark:border-gray-800 col-span-2">
                <span className="text-gray-500 text-[10px]">
                  11. Expenditure Incurred:
                </span>
                <p className="font-mono font-bold text-sm text-red-600 dark:text-red-400">
                  {fmtGHS(selectedDay.expenditure)}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MetricCard({
  icon: Icon,
  title,
  value,
  subtitle,
  color,
  bg,
}: {
  icon: LucideIcon;
  title: string;
  value: string;
  subtitle: string;
  color: string;
  bg: string;
}) {
  return (
    <div className={`p-3 sm:p-3.5 rounded-xl border transition-all ${bg}`}>
      <div className="flex items-center gap-2 mb-1">
        <Icon size={14} className={color} />
        <p className="text-[11px] font-semibold text-gray-600 dark:text-gray-300 truncate">
          {title}
        </p>
      </div>
      <p
        className={`font-mono font-bold text-base sm:text-lg ${color} mt-1 leading-tight`}
      >
        {value}
      </p>
      <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1 truncate">
        {subtitle}
      </p>
    </div>
  );
}
