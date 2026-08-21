import React from 'react';
import { Droplets, Printer, X } from "lucide-react";
import { fmtGHS } from '../lib/helpers';

export function ReceiptModal({ sale, companyName, driversList = [], onClose }) {
  if (!sale) return null;

  const driver = (driversList || []).find((d) => d.id === sale.driverId);
  const receiptId = String(sale.id || sale._id || '').toUpperCase();

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 print:p-0 print:bg-white print:fixed print:inset-0">
      {/* Inject temporary print stylesheet to isolate receipt element during printing */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-receipt, #printable-receipt * {
            visibility: visible;
          }
          #printable-receipt {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 10px;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl relative print:shadow-none print:w-full print:max-w-full print:p-0">
        <button 
          onClick={onClose} 
          className="no-print absolute top-3 right-3 text-gray-400 hover:text-black"
          aria-label="Close modal"
        >
          <X size={18} />
        </button>

        <div id="printable-receipt" className="text-center font-mono text-xs space-y-3">
          <div className="border-b border-dashed border-gray-300 pb-3">
            <div className="flex justify-center items-center gap-1 text-[#0B3B45] font-bold text-base">
              <Droplets size={18} />
              <span>{companyName || "Mattbees Water Services"}</span>
            </div>
            <p className="text-[10px] text-gray-500 uppercase mt-0.5">Sachet Water Purchase Receipt</p>
            {receiptId && <p className="text-[9px] text-gray-400">Ref ID: #{receiptId}</p>}
          </div>

          <div className="text-left text-[11px] space-y-1 py-1">
            <div className="flex justify-between">
              <span className="text-gray-500">Date/Time:</span>
              <span>{new Date(sale.timestamp || Date.now()).toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Customer:</span>
              <span className="font-bold">{sale.customer || "Walk-in Customer"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Driver / Truck:</span>
              <span>{driver ? driver.name : "Direct Factory Sale"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Payment Channel:</span>
              <span className="uppercase font-semibold text-blue-800">{sale.method || "CASH"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Cashier / Manager:</span>
              <span>{sale.recordedBy || "System"}</span>
            </div>
          </div>

          <div className="border-t border-b border-dashed border-gray-300 py-2 space-y-1.5">
            <div className="flex justify-between text-left font-bold border-b pb-1">
              <span>Item Description</span>
              <span>Total</span>
            </div>
            <div className="flex justify-between text-left">
              <span>Sachet Water ({sale.bagsSold || 0} bags @ {fmtGHS(sale.pricePerBag || 0)})</span>
              <span className="font-bold">{fmtGHS(sale.totalAmount || 0)}</span>
            </div>
            {Number(sale.freeBags) > 0 && (
              <div className="flex justify-between text-left text-amber-700 font-bold">
                <span>Free / Promo Bags (Courtesy)</span>
                <span>{sale.freeBags} bags</span>
              </div>
            )}
            {Number(sale.leakageBags) > 0 && (
              <div className="flex justify-between text-left text-red-700 font-bold">
                <span>Sales / Supply Leakages</span>
                <span>{sale.leakageBags} bags</span>
              </div>
            )}
          </div>

          <div className="pt-1 flex justify-between items-center text-sm font-bold">
            <span>TOTAL PAID:</span>
            <span className="text-base text-green-700">{fmtGHS(sale.amountPaid || sale.totalAmount || 0)}</span>
          </div>

          <div className="border-t border-dashed border-gray-300 pt-3 text-[10px] text-gray-500">
            <p>Thank you for your business!</p>
            <p className="text-[9px] text-gray-400 mt-0.5">PureLedger ERP · Verified Offline Transaction</p>
          </div>
        </div>

        <div className="no-print mt-5 flex gap-2">
          <button onClick={handlePrint} className="btn-primary flex-1 py-2 flex items-center justify-center gap-1">
            <Printer size={15} /> Print Receipt
          </button>
          <button onClick={onClose} className="px-3 py-2 border rounded-lg text-xs font-bold text-gray-600 hover:bg-gray-100">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}