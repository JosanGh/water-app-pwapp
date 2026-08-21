import React, { useState, useMemo } from 'react';
import { Printer } from "lucide-react";
import { ReceiptModal } from './ReceiptModal';
import { uid, todayISO, fmt, fmtGHS, computeFinishedGoods, computeCashBalance } from '../lib/helpers';

export function SalesModule({ data, mutate, session, showToast }) {
  const driversList = useMemo(() => (data.users || []).filter((u) => u.role === "driver"), [data.users]);
  const finished = useMemo(() => computeFinishedGoods(data), [data]);
  const cashAvailable = useMemo(() => computeCashBalance(data), [data]);

  const [driverId, setDriverId] = useState(driversList[0]?.id || "factory");
  const [customer, setCustomer] = useState("");
  const [bagsSold, setBagsSold] = useState("");
  const [freeBagsGiven, setFreeBagsGiven] = useState("0");
  const [leakageBagsGiven, setLeakageBagsGiven] = useState("0");
  const [paymentMethod, setPaymentMethod] = useState("cash");

  const [depositAmount, setDepositAmount] = useState("");
  const [bankName, setBankName] = useState("");

  const [activeReceiptSale, setActiveReceiptSale] = useState(null);

  const handleSale = (e, shouldPrintReceipt = true) => {
    if (e) e.preventDefault();

    const totalBagsDeducted = Number(bagsSold || 0) + Number(freeBagsGiven || 0) + Number(leakageBagsGiven || 0);

    if (finished.availableForSale <= 0) {
      showToast("SALES DISALLOWED: Zero sachet bags available in inventory!", "warn");
      return;
    }

    if (totalBagsDeducted <= 0) return showToast("Enter a valid quantity of sold, free, or leakage bags!", "warn");

    if (totalBagsDeducted > finished.availableForSale) {
      showToast(`Cannot issue/deduct more bags than available in stock (${finished.availableForSale} bags)`, "warn");
      return;
    }

    const pricePerBag = data.settings.pricePerBag || 5.0;
    const totalAmount = Number(bagsSold || 0) * pricePerBag;

    const newSale = {
      id: uid(),
      date: todayISO(),
      timestamp: new Date().toISOString(),
      driverId: driverId === "factory" ? null : driverId,
      customer: customer || "Direct Customer",
      bagsSold: Number(bagsSold || 0),
      freeBags: Number(freeBagsGiven || 0),
      leakageBags: Number(leakageBagsGiven || 0),
      pricePerBag,
      totalAmount,
      amountPaid: totalAmount,
      method: paymentMethod,
      recordedBy: session.name,
    };

    mutate((prev) => ({
      ...prev,
      sales: [newSale, ...(prev.sales || [])],
    }), "Recorded Sale", `${bagsSold} sold + ${freeBagsGiven} free + ${leakageBagsGiven} leakage bags to ${customer || "Direct Customer"}`);

    setBagsSold(""); setFreeBagsGiven("0"); setLeakageBagsGiven("0"); setCustomer("");
    showToast("Sale Recorded Successfully!");

    if (shouldPrintReceipt) {
      setActiveReceiptSale(newSale);
    }
  };

  const handleBankDeposit = (e) => {
    e.preventDefault();
    const depVal = Number(depositAmount);

    if (depVal <= 0) return showToast("Invalid deposit amount!", "warn");

    if (depVal > cashAvailable) {
      showToast(`DEPOSIT REJECTED: Deposit (${fmtGHS(depVal)}) exceeds cash on hand (${fmtGHS(cashAvailable)})!`, "warn");
      return;
    }

    mutate((prev) => ({
      ...prev,
      bankDeposits: [
        {
          id: uid(),
          date: todayISO(),
          amount: depVal,
          bankName,
          recordedBy: session.name,
        },
        ...(prev.bankDeposits || []),
      ],
    }), "Bank Deposit Made", `${fmtGHS(depVal)} deposited to ${bankName}`);

    setDepositAmount(""); setBankName("");
    showToast("Bank Deposit Reconciled!");
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="font-display font-800 text-2xl text-[#0B3B45]">Sales, Drivers & Cash</p>
        <p className="text-sm text-[#5B6B68]">Record paid sales, supply leakages, and free promotional bags, manage receipts, and reconcile cash deposits.</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-[#DDE3DA] space-y-4">
          <div className="flex justify-between items-center border-b pb-2">
            <p className="font-bold text-[#0B3B45]">Record Sachet Water Sale, Supply Leakage & Free Bags</p>
            <span className="text-xs font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded">
              Stock: {fmt(finished.availableForSale, 0)} bags
            </span>
          </div>

          {finished.availableForSale <= 0 ? (
            <div className="bg-[#FBEAE5] text-[#C4472F] p-3 rounded-lg text-xs font-semibold">
              Sales locked! Zero sachet bags available in inventory.
            </div>
          ) : (
            <form onSubmit={(e) => e.preventDefault()} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-gray-500">Sales Channel / Driver</label>
                <select value={driverId} onChange={(e) => setDriverId(e.target.value)} className="inp" required>
                  <option value="factory">Direct Factory Sale (Manager Gate Sale)</option>
                  {driversList.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-500">Customer Name / Retailer</label>
                <input value={customer} onChange={(e) => setCustomer(e.target.value)} placeholder="e.g. Abena Trading" className="inp" required />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div>
                  <label className="text-xs font-semibold text-gray-500">Paid Bags</label>
                  <input type="number" min="0" value={bagsSold} onChange={(e) => setBagsSold(e.target.value)} placeholder="100" className="inp" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-amber-700">Free Bags</label>
                  <input type="number" min="0" value={freeBagsGiven} onChange={(e) => setFreeBagsGiven(e.target.value)} placeholder="0" className="inp" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-red-700">Supply Leakage</label>
                  <input type="number" min="0" value={leakageBagsGiven} onChange={(e) => setLeakageBagsGiven(e.target.value)} placeholder="0" className="inp" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500">Unit Price</label>
                  <input value={fmtGHS(data.settings.pricePerBag)} disabled className="inp" />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-500">Payment Channel</label>
                <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="inp">
                  <option value="cash">Cash Received</option>
                  <option value="momo">MTN Mobile Money / Telecel</option>
                  <option value="bank">Bank Transfer</option>
                </select>
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={(e) => handleSale(e, true)}
                  className="btn-primary flex-1 py-2.5"
                >
                  <Printer size={15} /> Save & Print Receipt
                </button>
                <button
                  type="button"
                  onClick={(e) => handleSale(e, false)}
                  className="btn-success flex-1 py-2.5"
                >
                  Save Sale Only
                </button>
              </div>
            </form>
          )}
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#DDE3DA] space-y-4">
          <div className="flex justify-between items-center border-b pb-2">
            <p className="font-bold text-[#0B3B45]">Reconcile Bank Cash Deposit</p>
            <span className="text-xs font-bold text-blue-900 bg-blue-100 px-2 py-0.5 rounded">
              Cash on Hand: {fmtGHS(cashAvailable)}
            </span>
          </div>

          <form onSubmit={handleBankDeposit} className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-gray-500">Bank / Account Details</label>
              <input value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="e.g. GCB Bank / EcoBank Branch" className="inp" required />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500">Deposit Amount (GH₵)</label>
              <input type="number" min="0.01" step="0.01" value={depositAmount} onChange={(e) => setDepositAmount(e.target.value)} placeholder="e.g. 1000" className="inp" required />
            </div>
            <button type="submit" className="btn-primary w-full py-2.5">Record Cash Bank Deposit</button>
          </form>
        </div>
      </div>

      <div className="bg-white p-5 rounded-2xl border border-[#DDE3DA] overflow-x-auto">
        <p className="font-bold text-[#0B3B45] mb-3">Sales & Customer Receipts Log</p>
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-[#F7F8F5] text-left">
              <th className="p-2">Date</th>
              <th className="p-2">Customer</th>
              <th className="p-2">Driver / Sales Channel</th>
              <th className="p-2 text-right">Paid Bags</th>
              <th className="p-2 text-right">Free</th>
              <th className="p-2 text-right">Leakages</th>
              <th className="p-2 text-right">Total Amount</th>
              <th className="p-2">Method</th>
              <th className="p-2 text-center">Receipt</th>
            </tr>
          </thead>
          <tbody>
            {(data.sales || []).map((s) => {
              const d = driversList.find((dr) => dr.id === s.driverId);
              return (
                <tr key={s.id} className="border-t">
                  <td className="p-2 font-mono">{s.date}</td>
                  <td className="p-2 font-semibold text-[#0B3B45]">{s.customer}</td>
                  <td className="p-2 text-gray-600">{d ? d.name : "Direct Gate Sale"}</td>
                  <td className="p-2 text-right font-mono font-bold">{s.bagsSold}</td>
                  <td className="p-2 text-right font-mono text-amber-700">{s.freeBags || 0}</td>
                  <td className="p-2 text-right font-mono text-red-700">{s.leakageBags || 0}</td>
                  <td className="p-2 text-right font-mono font-bold text-green-700">{fmtGHS(s.totalAmount)}</td>
                  <td className="p-2 uppercase font-semibold text-blue-900">{s.method}</td>
                  <td className="p-2 text-center">
                    <button onClick={() => setActiveReceiptSale(s)} className="p-1 rounded bg-gray-100 hover:bg-gray-200 text-[#0B3B45]">
                      <Printer size={14} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {activeReceiptSale && (
        <ReceiptModal
          sale={activeReceiptSale}
          companyName={data.settings?.companyName}
          driversList={driversList}
          onClose={() => setActiveReceiptSale(null)}
        />
      )}
    </div>
  );
}