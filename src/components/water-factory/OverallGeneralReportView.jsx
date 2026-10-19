import { useMemo, useState } from "react";
import { FileText, Printer, RotateCcw } from "lucide-react";
import { fmtGHS } from "../../lib/helpers";

const REPORT_STYLE = `
  .overall-report { color: #172321; }
  .overall-report-card { background: #fff; border: 1px solid #d7e0dc; border-radius: 0.75rem; }
  .overall-report table { width: 100%; border-collapse: collapse; color: #172321; font-size: 0.75rem; }
  .overall-report th { background: #eaf1ee; color: #173c3c; font-weight: 700; text-align: left; }
  .overall-report th, .overall-report td { border: 1px solid #d8e0dd; padding: 0.45rem 0.55rem; vertical-align: top; }
  .overall-report td { overflow-wrap: anywhere; }
  .overall-report .report-muted { color: #465652; }
  @media (prefers-color-scheme: dark) {
    .overall-report { color: #f2f7f5; }
    .overall-report-card { background: #14242a; border-color: #385058; }
    .overall-report table { color: #f2f7f5; }
    .overall-report th { background: #20383e; color: #e5fbf5; }
    .overall-report td { border-color: #385058; }
    .overall-report .report-muted { color: #c1d0cc; }
    .overall-report label { color: #e5f1ed !important; }
    .overall-report input { background: #20383e !important; border-color: #527078 !important; color: #fff !important; color-scheme: dark; }
    .overall-report button:not(.btn-primary) { border-color: #88aaa3 !important; color: #f2f7f5 !important; }
  }
  @page { size: landscape; margin: 12mm; }
  @media print {
    .overall-report { color: #111 !important; background: #fff !important; font-size: 9pt; }
    .overall-report-card { background: #fff !important; border-color: #777 !important; }
    .overall-report h1, .overall-report h2, .overall-report h3,
    .overall-report p, .overall-report span { color: #111 !important; }
    .overall-report label { color: #111 !important; }
    .overall-report table { color: #111 !important; font-size: 8pt; }
    .overall-report th { background: #e8ecea !important; color: #111 !important; }
    .overall-report td, .overall-report th { border-color: #888 !important; }
    .overall-report .report-muted { color: #333 !important; }
    .overall-report .report-table-wrap { overflow: visible !important; }
    .overall-report tr { break-inside: avoid; }
    .overall-report thead { display: table-header-group; }
    .overall-report .report-section { break-before: auto; }
  }
`;

const entries = (data, key) => (Array.isArray(data?.[key]) ? data[key] : []);
const number = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};
const text = (value) =>
  value === null || value === undefined || value === "" ? "—" : String(value);
const dateOf = (record) =>
  String(record?.date || record?.ts || record?.timestamp || "").slice(0, 10);
const money = (value) => fmtGHS(number(value));
const paymentMethod = (record) =>
  String(record?.paymentMethod || record?.method || "").toLowerCase();

function paymentAmounts(sale) {
  const total = number(sale.totalAmount ?? sale.amountPaid ?? sale.amount);
  const method = paymentMethod(sale);
  return {
    cash:
      sale.cashAmount != null
        ? number(sale.cashAmount)
        : method === "cash"
          ? total
          : 0,
    mobileMoney:
      sale.momoAmount != null
        ? number(sale.momoAmount)
        : method === "momo" || method === "mobile money"
          ? total
          : 0,
    bank:
      sale.bankAmount != null
        ? number(sale.bankAmount)
        : method === "bank" || method === "bank deposit"
          ? total
          : 0,
  };
}

function ReportSection({ title, count, columns, rows, emptyMessage }) {
  return (
    <section className="report-section overall-report-card overflow-hidden">
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-[#d7e0dc] px-4 py-3">
        <h2 className="text-base font-bold text-[#123b3d]">{title}</h2>
        <span className="report-muted text-xs font-semibold">
          {count.toLocaleString()} {count === 1 ? "entry" : "entries"}
        </span>
      </div>
      {rows.length === 0 ? (
        <p className="report-muted px-4 py-5 text-sm">{emptyMessage}</p>
      ) : (
        <div className="report-table-wrap overflow-x-auto">
          <table>
            <thead>
              <tr>
                {columns.map((column) => (
                  <th key={column.label}>{column.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={row.id || `${title}-${index}`}>
                  {columns.map((column) => (
                    <td key={column.label}>
                      {column.render
                        ? column.render(row)
                        : text(row[column.key])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export function OverallGeneralReportView({
  data = {},
  organization = {},
  session = {},
}) {
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [dateError, setDateError] = useState("");

  const isOwner = String(session?.role || "").toLowerCase() === "owner";

  const filtered = useMemo(() => {
    const inPeriod = (row) => {
      const date = dateOf(row);
      if (!fromDate && !toDate) return true;
      if (!date) return false;
      return (!fromDate || date >= fromDate) && (!toDate || date <= toDate);
    };
    return {
      sales: entries(data, "sales").filter(inPeriod),
      debtPayments: entries(data, "debtPayments").filter(inPeriod),
      expenses: entries(data, "expenses").filter(inPeriod),
      adminExpenses: entries(data, "adminExpenses").filter(inPeriod),
      bankDeposits: entries(data, "bankDeposits").filter(inPeriod),
      adminbankDeposits: entries(data, "adminbankDeposits").filter(inPeriod),
      productionRuns: entries(data, "productionRuns").filter(inPeriod),
      intake: entries(data, "intake").filter(inPeriod),
      issuance: entries(data, "issuance").filter(inPeriod),
      bagIntake: entries(data, "bagIntake").filter(inPeriod),
      bagIssuance: entries(data, "bagIssuance").filter(inPeriod),
      bagUsage: entries(data, "bagUsage").filter(inPeriod),
      auditLog: entries(data, "auditLog").filter(inPeriod),
    };
  }, [data, fromDate, toDate]);

  const totals = useMemo(() => {
    const salesAmount = filtered.sales.reduce(
      (sum, row) =>
        sum + number(row.totalAmount ?? row.amountPaid ?? row.amount),
      0,
    );
    const payments = filtered.sales.reduce(
      (sum, row) => {
        const amount = paymentAmounts(row);
        sum.cash += amount.cash;
        sum.mobileMoney += amount.mobileMoney;
        sum.bank += amount.bank;
        return sum;
      },
      { cash: 0, mobileMoney: 0, bank: 0 },
    );
    const debtReceipts = filtered.debtPayments.reduce(
      (sum, row) => sum + number(row.amount),
      0,
    );
    const debtCash = filtered.debtPayments.reduce((sum, row) => {
      const method = paymentMethod(row);
      return !method || method === "cash" ? sum + number(row.amount) : sum;
    }, 0);
    const expenses = [...filtered.expenses, ...filtered.adminExpenses].reduce(
      (sum, row) => sum + number(row.amount),
      0,
    );
    const deposits = [
      ...filtered.bankDeposits,
      ...filtered.adminbankDeposits,
    ].reduce((sum, row) => sum + number(row.amount), 0);
    const production = filtered.productionRuns.reduce(
      (sum, row) => {
        if (!row.isInitialBalance) {
          sum.rolls += number(
            row.rollsUsedCount ?? row.rollsUsed ?? row.rollsCount,
          );
          sum.kg += number(row.weightUsedKg ?? row.weightKg ?? row.weightUsed);
          sum.bags += number(
            row.netAvailableBags ?? row.bagsProduced ?? row.actualBags,
          );
          sum.leakages += number(row.leakageBags);
          sum.giveaways += number(row.freeBags);
        }
        return sum;
      },
      { rolls: 0, kg: 0, bags: 0, leakages: 0, giveaways: 0 },
    );
    return {
      salesAmount,
      payments,
      debtReceipts,
      expenses,
      deposits,
      netCashMovement: payments.cash + debtCash - expenses - deposits,
      production,
      bagsSold: filtered.sales.reduce(
        (sum, row) => sum + number(row.bagsSold ?? row.qty),
        0,
      ),
    };
  }, [filtered]);

  const rollName = (id) =>
    entries(data, "rollTypes").find((item) => item.id === id)?.name || id;
  const bagName = (id) =>
    entries(data, "bagTypes").find((item) => item.id === id)?.name || id;

  const datedColumns = [{ label: "Date", render: (row) => text(dateOf(row)) }];
  const salesColumns = [
    ...datedColumns,
    { label: "Time", render: (row) => text(row.time) },
    {
      label: "Customer",
      render: (row) => text(row.customer ?? row.customerName),
    },
    { label: "Driver", render: (row) => text(row.driverName ?? row.driverId) },
    {
      label: "Bags sold",
      render: (row) => number(row.bagsSold ?? row.qty).toLocaleString(),
    },
    {
      label: "Free bags",
      render: (row) => number(row.freeBags).toLocaleString(),
    },
    {
      label: "Leakages",
      render: (row) => number(row.leakageBags).toLocaleString(),
    },
    {
      label: "Unit price",
      render: (row) => money(row.unitPrice ?? row.pricePerBag),
    },
    {
      label: "Total",
      render: (row) => money(row.totalAmount ?? row.amountPaid ?? row.amount),
    },
    { label: "Cash", render: (row) => money(paymentAmounts(row).cash) },
    {
      label: "Mobile money",
      render: (row) => money(paymentAmounts(row).mobileMoney),
    },
    { label: "Bank", render: (row) => money(paymentAmounts(row).bank) },
    { label: "Method", render: (row) => text(row.paymentMethod ?? row.method) },
    { label: "Recorded by", render: (row) => text(row.recordedBy) },
  ];

  const expenseColumns = [
    ...datedColumns,
    { label: "Category", render: (row) => text(row.category) },
    { label: "Description", render: (row) => text(row.description) },
    { label: "Amount", render: (row) => money(row.amount) },
    { label: "Recorded by", render: (row) => text(row.recordedBy) },
  ];

  const deposits = [
    ...filtered.bankDeposits.map((row) => ({
      ...row,
      accountSource: "Operations",
    })),
    ...filtered.adminbankDeposits.map((row) => ({
      ...row,
      accountSource: "Administration",
    })),
  ].sort((a, b) => dateOf(b).localeCompare(dateOf(a)));

  if (!isOwner) {
    return (
      <section
        role="alert"
        className="rounded-xl border border-red-300 bg-red-50 p-5 text-red-950"
      >
        <h1 className="font-bold">Access restricted</h1>
        <p className="mt-1 text-sm">
          The overall accounting report is available to the business owner only.
        </p>
      </section>
    );
  }

  const handlePrint = () => {
    if (fromDate && toDate && fromDate > toDate) {
      setDateError("The start date must be on or before the end date.");
      return;
    }
    setDateError("");
    document.body.classList.add("printing-overall-report");
    window.addEventListener(
      "afterprint",
      () => document.body.classList.remove("printing-overall-report"),
      { once: true },
    );
    window.print();
  };

  const handleDateChange = (setter) => (event) => {
    setter(event.target.value);
    setDateError("");
  };

  return (
    <div
      id="printable-area"
      className="overall-report space-y-5 rounded-xl bg-[#f5f8f6] p-3 sm:p-5"
    >
      <style>{REPORT_STYLE}</style>
      <header className="overall-report-card p-4 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <FileText
                aria-hidden="true"
                size={22}
                className="shrink-0 text-[#12636a]"
              />
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#365651]">
                Owner accounting statement
              </p>
            </div>
            <h1 className="mt-2 text-2xl font-extrabold text-[#123b3d] sm:text-3xl">
              {text(
                organization.name || data.businessDetails?.name || "Company",
              )}
            </h1>
            <p className="report-muted mt-1 text-sm">
              Overall General Report · Generated {new Date().toLocaleString()}
            </p>
            <p className="report-muted mt-1 text-sm">
              Period: {fromDate || "Earliest available"} through{" "}
              {toDate || "Latest available"}
            </p>
          </div>
          <div className="no-print flex flex-col gap-3 sm:flex-row sm:items-end">
            <label className="min-w-36 text-sm font-semibold text-[#213c39]">
              From date
              <input
                className="inp mt-1"
                type="date"
                value={fromDate}
                onChange={handleDateChange(setFromDate)}
                aria-label="Report start date"
              />
            </label>
            <label className="min-w-36 text-sm font-semibold text-[#213c39]">
              To date
              <input
                className="inp mt-1"
                type="date"
                value={toDate}
                onChange={handleDateChange(setToDate)}
                aria-label="Report end date"
              />
            </label>
            <button
              type="button"
              className="btn-primary min-h-10 whitespace-nowrap"
              onClick={handlePrint}
            >
              <Printer size={16} aria-hidden="true" />
              Print report
            </button>
            <button
              type="button"
              className="min-h-10 rounded-lg border border-[#48615b] px-3 py-2 text-sm font-semibold text-[#203d38] hover:bg-[#eaf1ee]"
              onClick={() => {
                setFromDate("");
                setToDate("");
                setDateError("");
              }}
            >
              <RotateCcw className="mr-1 inline" size={14} aria-hidden="true" />
              Clear dates
            </button>
          </div>
        </div>
        {dateError && (
          <p
            role="alert"
            className="no-print mt-3 rounded-lg bg-red-100 px-3 py-2 text-sm font-semibold text-red-900"
          >
            {dateError}
          </p>
        )}
      </header>

      <section
        aria-label="Accounting summary"
        className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5"
      >
        {[
          [
            "Sales recorded",
            money(totals.salesAmount),
            `${totals.bagsSold.toLocaleString()} bags sold`,
          ],
          ["Cash received", money(totals.payments.cash), "Sales paid in cash"],
          [
            "Mobile money",
            money(totals.payments.mobileMoney),
            "Sales paid by mobile money",
          ],
          [
            "Bank payments on sales",
            money(totals.payments.bank),
            "Sales paid directly to bank",
          ],
          [
            "Debt payments received",
            money(totals.debtReceipts),
            `${filtered.debtPayments.length} payments`,
          ],
          [
            "Expenses",
            money(totals.expenses),
            `${filtered.expenses.length + filtered.adminExpenses.length} entries`,
          ],
          [
            "Bank deposits",
            money(totals.deposits),
            `${deposits.length} deposits`,
          ],
          [
            "Net cash movement",
            money(totals.netCashMovement),
            "Cash sales + debt receipts − expenses − deposits",
          ],
          [
            "Roll material used",
            `${totals.production.rolls.toLocaleString()} rolls`,
            `${totals.production.kg.toLocaleString()} kg`,
          ],
          [
            "Finished bags produced",
            totals.production.bags.toLocaleString(),
            `${totals.production.leakages.toLocaleString()} leakages · ${totals.production.giveaways.toLocaleString()} giveaways`,
          ],
          [
            "Entries in period",
            Object.values(filtered)
              .reduce((sum, list) => sum + list.length, 0)
              .toLocaleString(),
            "Across all report sections",
          ],
        ].map(([label, value, detail]) => (
          <article key={label} className="overall-report-card min-w-0 p-4">
            <h2 className="text-xs font-bold uppercase tracking-wide text-[#365651]">
              {label}
            </h2>
            <p className="mt-2 break-words text-xl font-extrabold text-[#123b3d]">
              {value}
            </p>
            <p className="report-muted mt-1 text-xs">{detail}</p>
          </article>
        ))}
      </section>

      <ReportSection
        title="Sales and payment allocation"
        count={filtered.sales.length}
        rows={filtered.sales}
        columns={salesColumns}
        emptyMessage="No sales entries were recorded in this date range."
      />
      <ReportSection
        title="Debt payments received"
        count={filtered.debtPayments.length}
        rows={filtered.debtPayments}
        columns={[
          ...datedColumns,
          {
            label: "Customer",
            render: (row) => text(row.customerName ?? row.customer),
          },
          { label: "Amount received", render: (row) => money(row.amount) },
          {
            label: "Payment method",
            render: (row) => text(row.paymentMethod ?? row.method),
          },
          {
            label: "Reference / note",
            render: (row) => text(row.reference ?? row.notes),
          },
          { label: "Recorded by", render: (row) => text(row.recordedBy) },
        ]}
        emptyMessage="No debt payments were recorded in this date range."
      />
      <ReportSection
        title="Manager and owner expenses"
        count={filtered.expenses.length + filtered.adminExpenses.length}
        rows={[
          ...filtered.expenses.map((row) => ({
            ...row,
            accountSource: "Operations",
          })),
          ...filtered.adminExpenses.map((row) => ({
            ...row,
            accountSource: "Administration",
          })),
        ].sort((a, b) => dateOf(b).localeCompare(dateOf(a)))}
        columns={[
          ...datedColumns,
          { label: "Account", render: (row) => row.accountSource },
          ...expenseColumns.slice(1),
        ]}
        emptyMessage="No expenses were recorded in this date range."
      />
      <ReportSection
        title="Bank deposits"
        count={deposits.length}
        rows={deposits}
        columns={[
          ...datedColumns,
          { label: "Account", render: (row) => row.accountSource },
          { label: "Bank", render: (row) => text(row.bankName) },
          { label: "Reference", render: (row) => text(row.reference) },
          { label: "Amount", render: (row) => money(row.amount) },
          {
            label: "Deposited by",
            render: (row) => text(row.depositedBy ?? row.recordedBy),
          },
        ]}
        emptyMessage="No bank deposits were recorded in this date range."
      />
      <ReportSection
        title="Production runs"
        count={filtered.productionRuns.length}
        rows={filtered.productionRuns}
        columns={[
          ...datedColumns,
          {
            label: "Machine / shift",
            render: (row) => `${text(row.machineUnit)} / ${text(row.shift)}`,
          },
          {
            label: "Operator",
            render: (row) => text(row.operatorName ?? row.operator),
          },
          {
            label: "Rolls used",
            render: (row) =>
              number(
                row.rollsUsedCount ?? row.rollsUsed ?? row.rollsCount,
              ).toLocaleString(),
          },
          {
            label: "Material kg",
            render: (row) =>
              number(
                row.weightUsedKg ?? row.weightKg ?? row.weightUsed,
              ).toLocaleString(),
          },
          {
            label: "Packing bags used",
            render: (row) =>
              number(row.bagsUsedQty ?? row.packingBagsUsed).toLocaleString(),
          },
          {
            label: "Bags produced",
            render: (row) =>
              number(
                row.netAvailableBags ?? row.bagsProduced ?? row.actualBags,
              ).toLocaleString(),
          },
          {
            label: "Leakages",
            render: (row) => number(row.leakageBags).toLocaleString(),
          },
          {
            label: "Giveaways",
            render: (row) => number(row.freeBags).toLocaleString(),
          },
          { label: "Recorded by", render: (row) => text(row.recordedBy) },
          { label: "Notes", render: (row) => text(row.notes) },
        ]}
        emptyMessage="No production runs were recorded in this date range."
      />
      <ReportSection
        title="Film roll receipts"
        count={filtered.intake.length}
        rows={filtered.intake}
        columns={[
          ...datedColumns,
          {
            label: "Roll type",
            render: (row) => text(rollName(row.rollTypeId)),
          },
          { label: "Supplier", render: (row) => text(row.supplier) },
          {
            label: "Rolls received",
            render: (row) => number(row.qty ?? row.rollsCount).toLocaleString(),
          },
          {
            label: "Weight kg",
            render: (row) => number(row.weightKg).toLocaleString(),
          },
          {
            label: "Batch / reference",
            render: (row) => text(row.batchNo ?? row.reference),
          },
          { label: "Recorded by", render: (row) => text(row.recordedBy) },
        ]}
        emptyMessage="No film roll receipts were recorded in this date range."
      />
      <ReportSection
        title="Film roll transfers to managers"
        count={filtered.issuance.length}
        rows={filtered.issuance}
        columns={[
          ...datedColumns,
          {
            label: "Roll type",
            render: (row) => text(rollName(row.rollTypeId)),
          },
          {
            label: "Rolls issued",
            render: (row) => number(row.qty ?? row.rollsCount).toLocaleString(),
          },
          {
            label: "Weight kg",
            render: (row) => number(row.weightKg).toLocaleString(),
          },
          {
            label: "Acceptance",
            render: (row) =>
              text(row.status ?? (row.accepted ? "Accepted" : "Pending")),
          },
          { label: "Physical count", render: (row) => text(row.physicalCount) },
          { label: "Confirmed by", render: (row) => text(row.confirmedBy) },
          {
            label: "Issued by",
            render: (row) => text(row.issuedBy ?? row.recordedBy),
          },
        ]}
        emptyMessage="No film roll transfers were recorded in this date range."
      />
      <ReportSection
        title="Packing bag receipts"
        count={filtered.bagIntake.length}
        rows={filtered.bagIntake}
        columns={[
          ...datedColumns,
          { label: "Bag type", render: (row) => text(bagName(row.bagTypeId)) },
          { label: "Supplier", render: (row) => text(row.supplier) },
          {
            label: "Quantity received",
            render: (row) => number(row.qty).toLocaleString(),
          },
          { label: "Recorded by", render: (row) => text(row.recordedBy) },
        ]}
        emptyMessage="No packing bag receipts were recorded in this date range."
      />
      <ReportSection
        title="Packing bag transfers"
        count={filtered.bagIssuance.length}
        rows={filtered.bagIssuance}
        columns={[
          ...datedColumns,
          { label: "Bag type", render: (row) => text(bagName(row.bagTypeId)) },
          {
            label: "Quantity issued",
            render: (row) => number(row.qty).toLocaleString(),
          },
          {
            label: "Acceptance",
            render: (row) =>
              text(row.status ?? (row.accepted ? "Accepted" : "Pending")),
          },
          { label: "Physical count", render: (row) => text(row.physicalCount) },
          { label: "Confirmed by", render: (row) => text(row.confirmedBy) },
          {
            label: "Issued by",
            render: (row) => text(row.issuedBy ?? row.recordedBy),
          },
        ]}
        emptyMessage="No packing bag transfers were recorded in this date range."
      />
      <ReportSection
        title="Packing bag usage"
        count={filtered.bagUsage.length}
        rows={filtered.bagUsage}
        columns={[
          ...datedColumns,
          {
            label: "Quantity used",
            render: (row) =>
              number(
                row.qty ?? row.usedQty ?? row.packingBagsUsed,
              ).toLocaleString(),
          },
          { label: "Reason", render: (row) => text(row.reason) },
          {
            label: "Used by",
            render: (row) => text(row.usedBy ?? row.recordedBy),
          },
        ]}
        emptyMessage="No packing bag usage was recorded in this date range."
      />
      <ReportSection
        title="Audit trail"
        count={filtered.auditLog.length}
        rows={filtered.auditLog}
        columns={[
          { label: "Timestamp", render: (row) => text(row.ts) },
          { label: "User", render: (row) => text(row.user) },
          { label: "Role", render: (row) => text(row.role) },
          { label: "Action", render: (row) => text(row.action) },
          { label: "Details", render: (row) => text(row.detail) },
        ]}
        emptyMessage="No audit entries were recorded in this date range."
      />
    </div>
  );
}
