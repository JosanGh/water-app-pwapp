import { useState, useMemo } from 'react';
import { Printer, ArrowDownLeft, ArrowUpRight, Scale, Truck, Calendar, TrendingUp, Wallet } from "lucide-react";


// Local fallback helper implementations
const todayISO = () => new Date().toISOString().split("T")[0];
const fmt = (val, decimals = 0) => Number(val || 0).toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
const fmtGHS = (val) => `GH₵ ${fmt(val, 2)}`;

export function ReportsModule({ data = {}, session = {} }) {
  // Normalize role checks and driver identity lookup
  const currentRoleId = String(session?.role || '').toLowerCase();
  const currentUserId = session?.id || session?.userId || session?.driverId || '';
  
  const isAdmin = currentRoleId === "owner" || currentRoleId === "admin";
  const isDriver = currentRoleId === "driver";

  const [activeTab, setActiveTab] = useState("drivers");
  
  const driversList = useMemo(() => {
    return (data?.users || []).filter((u) => String(u?.role || '').toLowerCase() === "driver");
  }, [data?.users]);

  const [filterDriver, setFilterDriver] = useState(isDriver ? currentUserId : "all");
  const [selectedDate, setSelectedDate] = useState("all");

  const salesFiltered = useMemo(() => {
    const activeDriverId = isDriver ? currentUserId : filterDriver;
    if (!activeDriverId || activeDriverId === "all") return data?.sales || [];
    return (data?.sales || []).filter((s) => s.driverId === activeDriverId);
  }, [data?.sales, filterDriver, isDriver, currentUserId]);

  const metrics = useMemo(() => {
    const now = new Date();
    const todayStr = todayISO();

    let daily = 0, weekly = 0, monthly = 0, annual = 0;

    salesFiltered.forEach((s) => {
      const d = new Date(s.date || s.timestamp || Date.now());
      const diffDays = (now - d) / (1000 * 3600 * 24);
      const amount = Number(s.totalAmount || s.amountPaid || s.amount || 0);

      if (s.date === todayStr) daily += amount;
      if (diffDays <= 7) weekly += amount;
      if (d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()) monthly += amount;
      if (d.getFullYear() === now.getFullYear()) annual += amount;
    });

    return { daily, weekly, monthly, annual };
  }, [salesFiltered]);

  const driverStats = useMemo(() => {
    let visibleDrivers = isDriver 
      ? driversList.filter((d) => d.id === currentUserId || d.userId === currentUserId)
      : driversList;

    // FIX: Populating both id and userId variants to prevent evaluation mismatches downstream
    if (isDriver && visibleDrivers.length === 0 && session?.name) {
      visibleDrivers = [{ 
        id: currentUserId, 
        userId: currentUserId, 
        name: session.name, 
        truckNo: session.truckNo || "Assigned Unit" 
      }];
    }

    return visibleDrivers.map((driver) => {
      const driverSales = (data?.sales || []).filter((s) => s.driverId === driver.id || s.driverId === driver.userId);
      const totalBags = driverSales.reduce((acc, s) => acc + Number(s.bagsSold || 0), 0);
      const totalRevenue = driverSales.reduce((acc, s) => acc + Number(s.totalAmount || s.amountPaid || 0), 0);
      const todayBags = driverSales
        .filter((s) => s.date === todayISO())
        .reduce((acc, s) => acc + Number(s.bagsSold || 0), 0);

      return {
        ...driver,
        totalSalesCount: driverSales.length,
        totalBags,
        totalRevenue,
        todayBags,
      };
    });
  }, [driversList, data?.sales, isDriver, currentUserId, session]);

  // Aggregate daily transactions matching intake and issuance by date
  const dailyAuditData = useMemo(() => {
    const intakeByDate = {};
    const issuanceByDate = {};

    // Roll Intakes
    (data?.intake || []).forEach((i) => {
      const d = i.date;
      if (!intakeByDate[d]) intakeByDate[d] = { rolls: 0, bags: 0 };
      intakeByDate[d].rolls += Number(i.qty || 0);
    });
    
    // Packing Bag Intakes
    (data?.bagIntake || []).forEach((bi) => {
      const d = bi.date;
      if (!intakeByDate[d]) intakeByDate[d] = { rolls: 0, bags: 0 };
      intakeByDate[d].bags += Number(bi.qty || 0);
    });

    // Roll Issuances
    (data?.issuance || []).forEach((iss) => {
      const d = iss.date;
      if (!issuanceByDate[d]) issuanceByDate[d] = { rolls: 0, bags: 0 };
      issuanceByDate[d].rolls += Number(iss.qty || 0);
    });

    // Packing Bag Issuances
    (data?.bagIssuance || []).forEach((biss) => {
      const d = biss.date;
      if (!issuanceByDate[d]) issuanceByDate[d] = { rolls: 0, bags: 0 };
      issuanceByDate[d].bags += Number(biss.qty || 0);
    });

    // Collect all unique dates across intake and issuance logs
    const allDates = Array.from(
      new Set([
        ...Object.keys(intakeByDate),
        ...Object.keys(issuanceByDate),
      ])
    ).sort((a, b) => new Date(b) - new Date(a));

    return allDates.map((date) => {
      const rIntake = intakeByDate[date]?.rolls || 0;
      const bIntake = intakeByDate[date]?.bags || 0;
      const rIssued = issuanceByDate[date]?.rolls || 0;
      const bIssued = issuanceByDate[date]?.bags || 0;

      return {
        date,
        rollsIntake: rIntake,
        bagsIntake: bIntake,
        rollsIssued: rIssued,
        bagsIssued: bIssued,
        balanceRolls: rIntake - rIssued,
        balanceBags: bIntake - bIssued,
      };
    });
  }, [data?.intake, data?.bagIntake, data?.issuance, data?.bagIssuance]);

  const uniqueDates = useMemo(
    () => dailyAuditData.map((d) => d.date),
    [dailyAuditData]
  );

  const filteredData = useMemo(() => {
    if (selectedDate === "all") return dailyAuditData;
    return dailyAuditData.filter((row) => row.date === selectedDate);
  }, [dailyAuditData, selectedDate]);

  const totals = useMemo(() => {
    return filteredData.reduce(
      (acc, r) => ({
        rollsIntake: acc.rollsIntake + r.rollsIntake,
        bagsIntake: acc.bagsIntake + r.bagsIntake,
        rollsIssued: acc.rollsIssued + r.rollsIssued,
        bagsIssued: acc.bagsIssued + r.bagsIssued,
        balanceRolls: acc.balanceRolls + r.balanceRolls,
        balanceBags: acc.balanceBags + r.balanceBags,
      }),
      { rollsIntake: 0, bagsIntake: 0, rollsIssued: 0, bagsIssued: 0, balanceRolls: 0, balanceBags: 0 }
    );
  }, [filteredData]);

  const handleGeneratePdf = () => {
    window.print();
  };

  return (
    <div className="space-y-5">
    {/* Header Bar */}
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div>
        <p className="font-display font-800 text-2xl text-[#0B3B45]">
          {isDriver ? "Driver Delivery Portal" : "Reports & Delivery Drivers"}
        </p>
        <p className="text-sm text-[#5B6B68]">
          Delivery performance, truck logs, and periodic revenue analytics.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2 no-print">
        <button onClick={handleGeneratePdf} className="btn-primary py-1.5 px-3 text-xs bg-[#1C8C9E] flex items-center gap-1.5">
          <Printer size={14} /> Generate PDF Report
        </button>

        <div className="flex gap-1 bg-white rounded-xl border border-[#DDE3DA] p-1">
            <button
              onClick={() => setActiveTab("drivers")}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition ${
                activeTab === "drivers" ? "bg-[#0B3B45] text-white" : "text-gray-600"
              }`}
            >
              Driver Dashboard
            </button>

            {!isDriver && (
              <button
                onClick={() => setActiveTab("ledger")}
                className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition ${
                  activeTab === "ledger" ? "bg-[#0B3B45] text-white" : "text-gray-600"
                }`}
              >
                Periodic Sales Ledger
              </button>
            )}

            {isAdmin && (
              <button
                onClick={() => setActiveTab("stock")}
                className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition ${
                  activeTab === "stock" ? "bg-[#0B3B45] text-white" : "text-gray-600"
                }`}
              >
                All Rolls & Packing
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Printable Area */}
      <div id="printable-area" className="space-y-5">
        {activeTab === "drivers" && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {driverStats.length === 0 ? (
                <div className="col-span-full bg-white p-8 rounded-2xl border border-[#DDE3DA] text-center text-gray-500">
                  No active driver profile or delivery history found for this session.
                </div>
              ) : (
                driverStats.map((driver) => (
                  <div key={driver.id || driver.name} className="bg-white p-5 rounded-2xl border border-[#DDE3DA] shadow-sm space-y-4">
                    <div className="flex items-center justify-between border-b border-[#EDEFEA] pb-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-[#0B3B45] flex items-center justify-center text-white">
                          <Truck size={18} />
                        </div>
                        <div>
                          <p className="font-bold text-[#0B3B45] text-sm">{driver.name}</p>
                          <p className="text-[11px] font-mono text-[#5B6B68]">Reg: {driver.truckNo || "N/A"}</p>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-green-100 text-green-800">
                        Active Truck
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-[#F7F8F5] p-2.5 rounded-lg">
                        <p className="text-gray-500 font-semibold text-[10px]">Today Dispatched</p>
                        <p className="font-mono font-bold text-sm text-[#0B3B45]">{fmt(driver.todayBags, 0)} bags</p>
                      </div>
                      <div className="bg-[#F7F8F5] p-2.5 rounded-lg">
                        <p className="text-gray-500 font-semibold text-[10px]">Total Sold Volume</p>
                        <p className="font-mono font-bold text-sm text-[#1C8C9E]">{fmt(driver.totalBags, 0)} bags</p>
                      </div>
                    </div>

                    <div className="bg-[#EAF3F1] p-3 rounded-xl border border-[#BFDCD6] flex justify-between items-center">
                      <span className="text-xs font-semibold text-[#0B3B45]">Lifetime Revenue</span>
                      <span className="font-mono font-extrabold text-sm text-[#2A6E4A]">{fmtGHS(driver.totalRevenue)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === "ledger" && !isDriver && (
          <div className="space-y-5">
            <div className="flex justify-between items-center no-print">
              <span className="text-xs font-bold text-[#0B3B45]">Filter Driver:</span>
              <select value={filterDriver} onChange={(e) => setFilterDriver(e.target.value)} className="inp w-60">
                <option value="all">All Delivery Truck Drivers</option>
                {driversList.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <StatCard icon={Truck} label="Daily Sales" value={fmtGHS(metrics.daily)} accent="#1C8C9E" />
              <StatCard icon={Calendar} label="Weekly Sales (7-Day)" value={fmtGHS(metrics.weekly)} accent="#2A6E4A" />
              <StatCard icon={TrendingUp} label="Monthly Sales" value={fmtGHS(metrics.monthly)} accent="#E8A23D" />
              <StatCard icon={Wallet} label="Annual Sales" value={fmtGHS(metrics.annual)} accent="#0B3B45" />
            </div>

            <div className="bg-white p-5 rounded-2xl border border-[#DDE3DA] overflow-x-auto">
              <p className="font-bold text-[#0B3B45] mb-3">Sales Ledger by Truck Driver</p>
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-[#F7F8F5] text-left">
                    <th className="p-2">Date</th>
                    <th className="p-2">Driver / Truck</th>
                    <th className="p-2">Customer</th>
                    <th className="p-2 text-right">Bags Sold</th>
                    <th className="p-2 text-right">Total Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {salesFiltered.map((s) => {
                    const drv = driversList.find((d) => d.id === s.driverId || d.userId === s.driverId);
                    return (
                      <tr key={s.id} className="border-t">
                        <td className="p-2 font-mono">{s.date}</td>
                        <td className="p-2 font-semibold text-blue-900">{drv?.name || "Direct Factory Sale"}</td>
                        <td className="p-2">{s.customer}</td>
                        <td className="p-2 text-right font-mono">{s.bagsSold}</td>
                        <td className="p-2 text-right font-mono font-bold text-green-800">{fmtGHS(s.totalAmount)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === "stock" && isAdmin && (
          <div className="space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#EDEFEA] pb-3">
              <div>
                <h3 className="font-bold text-lg text-[#0B3B45]">
                  Warehouse Rolls & Packing Bags Audit
                </h3>
                <p className="text-xs text-[#5B6B68]">
                  Date-matched intake, issuances to plant manager, and remaining balances.
                </p>
              </div>

              <select
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="inp text-xs w-48 no-print"
              >
                <option value="all">All Date Entries</option>
                {uniqueDates.map((dateStr) => (
                  <option key={dateStr} value={dateStr}>{dateStr}</option>
                ))}
              </select>
            </div>

            {/* Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-white p-4 rounded-2xl border border-[#DDE3DA] shadow-sm flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center shrink-0">
                  <ArrowDownLeft size={20} />
                </div>
                <div>
                  <p className="text-[11px] font-semibold text-gray-500 uppercase">Warehouse Intake</p>
                  <p className="font-mono font-extrabold text-sm text-[#0B3B45]">
                    {fmt(totals.rollsIntake, 0)} Rolls / {fmt(totals.bagsIntake, 0)} Bags
                  </p>
                </div>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-[#DDE3DA] shadow-sm flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                  <ArrowUpRight size={20} />
                </div>
                <div>
                  <p className="text-[11px] font-semibold text-gray-500 uppercase">Issued to Manager</p>
                  <p className="font-mono font-extrabold text-sm text-[#0B3B45]">
                    {fmt(totals.rollsIssued, 0)} Rolls / {fmt(totals.bagsIssued, 0)} Bags
                  </p>
                </div>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-[#DDE3DA] shadow-sm flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                  <Scale size={20} />
                </div>
                <div>
                  <p className="text-[11px] font-semibold text-gray-500 uppercase">Net Stock Balance</p>
                  <p className="font-mono font-extrabold text-sm text-[#2A6E4A]">
                    {fmt(totals.balanceRolls, 0)} Rolls / {fmt(totals.balanceBags, 0)} Bags
                  </p>
                </div>
              </div>
            </div>

            {/* Date Matching Table */}
            <div className="bg-white p-5 rounded-2xl border border-[#DDE3DA] overflow-x-auto">
              <div className="flex items-center justify-between mb-3">
                <p className="font-bold text-[#0B3B45]">Daily Intake vs Issuance Balance Summary</p>
                <span className="text-xs text-gray-400 font-mono">Entries: {filteredData.length}</span>
              </div>

              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-[#F7F8F5] text-left border-b border-[#DDE3DA]">
                    <th className="p-2.5 font-bold text-[#0B3B45]">Date</th>
                    <th className="p-2.5 text-center bg-blue-50/50" colSpan={2}>Warehouse Intake</th>
                    <th className="p-2.5 text-center bg-amber-50/50" colSpan={2}>Issued to Manager</th>
                    <th className="p-2.5 text-center bg-emerald-50/50" colSpan={2}>Closing Balance</th>
                  </tr>
                  <tr className="bg-[#F7F8F5] text-left border-b border-[#DDE3DA] text-[11px] text-gray-500">
                    <th className="p-2">YYYY-MM-DD</th>
                    <th className="p-2 text-right bg-blue-50/30">Rolls</th>
                    <th className="p-2 text-right bg-blue-50/30">Packing Bags</th>
                    <th className="p-2 text-right bg-amber-50/30">Rolls</th>
                    <th className="p-2 text-right bg-amber-50/30">Packing Bags</th>
                    <th className="p-2 text-right bg-emerald-50/30">Rolls</th>
                    <th className="p-2 text-right bg-emerald-50/30">Packing Bags</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredData.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-4 text-center text-gray-400 italic">
                        No matching intake or issuance records found.
                      </td>
                    </tr>
                  ) : (
                    filteredData.map((row) => (
                      <tr key={row.date} className="border-t border-[#EDEFEA] hover:bg-[#F9FAF8]">
                        <td className="p-2 font-mono font-bold text-[#0B3B45]">
                          <div className="flex items-center gap-1.5">
                            <Calendar size={13} className="text-[#1C8C9E]" />
                            {row.date}
                          </div>
                        </td>

                        <td className="p-2 text-right font-mono text-blue-900 bg-blue-50/10">{fmt(row.rollsIntake, 0)}</td>
                        <td className="p-2 text-right font-mono text-blue-900 bg-blue-50/10">{fmt(row.bagsIntake, 0)}</td>

                        <td className="p-2 text-right font-mono text-amber-900 bg-amber-50/10">{fmt(row.rollsIssued, 0)}</td>
                        <td className="p-2 text-right font-mono text-amber-900 bg-amber-50/10">{fmt(row.bagsIssued, 0)}</td>

                        <td className={`p-2 text-right font-mono font-bold bg-emerald-50/10 ${row.balanceRolls < 0 ? "text-red-600" : "text-emerald-800"}`}>
                          {fmt(row.balanceRolls, 0)}
                        </td>
                        <td className={`p-2 text-right font-mono font-bold bg-emerald-50/10 ${row.balanceBags < 0 ? "text-red-600" : "text-emerald-800"}`}>
                          {fmt(row.balanceBags, 0)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                {filteredData.length > 0 && (
                  <tfoot>
                    <tr className="border-t-2 border-[#0B3B45] bg-[#F7F8F5] font-bold">
                      <td className="p-2.5 text-[#0B3B45]">Total Sum</td>
                      <td className="p-2.5 text-right font-mono text-blue-900">{fmt(totals.rollsIntake, 0)}</td>
                      <td className="p-2.5 text-right font-mono text-blue-900">{fmt(totals.bagsIntake, 0)}</td>
                      <td className="p-2.5 text-right font-mono text-amber-900">{fmt(totals.rollsIssued, 0)}</td>
                      <td className="p-2.5 text-right font-mono text-amber-900">{fmt(totals.bagsIssued, 0)}</td>
                      <td className="p-2.5 text-right font-mono text-emerald-800">{fmt(totals.balanceRolls, 0)}</td>
                      <td className="p-2.5 text-right font-mono text-emerald-800">{fmt(totals.balanceBags, 0)}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Sub-component required for metric cards
function StatCard({ icon: Icon, label, value, accent }) {
  return (
    <div className="bg-white p-4 rounded-2xl border border-[#DDE3DA] shadow-sm flex items-center gap-3">
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0"
        style={{ backgroundColor: accent || '#0B3B45' }}
      >
        <Icon size={20} />
      </div>
      <div>
        <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">{label}</p>
        <p className="font-mono font-extrabold text-base text-[#0B3B45]">{value}</p>
      </div>
    </div>
  );
}
