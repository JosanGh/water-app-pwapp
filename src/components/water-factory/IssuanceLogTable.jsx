import React from "react";

export function IssuanceLogTable({ data }) {
  // 1. Combine roll issuances and bag issuances into a unified ledger stream
  const rollIssuances = (data?.issuance || []).map((i) => ({ ...i, category: "Rolls" }));
  const bagIssuances = (data?.bagIssuance || []).map((i) => ({ ...i, category: "Packing Bags" }));
  
  const combinedIssuances = [...rollIssuances, ...bagIssuances].sort((a, b) => 
    new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt)
  );

  if (combinedIssuances.length === 0) {
    return (
      <div className="bg-white dark:bg-[#18262C] rounded-xl p-6 text-center border border-[#EDEFEA] dark:border-[#263A42]">
        <p className="text-xs text-gray-500 dark:text-gray-400">No inventory issuances or giveaways recorded yet.</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-[#18262C] rounded-xl shadow-sm border border-[#EDEFEA] dark:border-[#263A42] overflow-hidden">
      <div className="p-4 border-b border-[#EDEFEA] dark:border-[#263A42] flex justify-between items-center">
        <h3 className="text-sm font-bold text-[#0B3B45] dark:text-cyan-200 uppercase tracking-wider">
          Detailed Recipient Issuance Log (Sales & Free Giveaways)
        </h3>
        <span className="text-xs font-mono px-2.5 py-1 rounded-full bg-teal-50 text-teal-800 dark:bg-[#102B33] dark:text-teal-300">
          {combinedIssuances.length} Total Records
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-[#F7F8F5] dark:bg-[#121E23] text-gray-500 dark:text-gray-400 uppercase font-semibold border-b border-[#EDEFEA] dark:border-[#263A42]">
              <th className="p-3">Date</th>
              <th className="p-3">Recipient</th>
              <th className="p-3">Item & Category</th>
              <th className="p-3">Qty</th>
              <th className="p-3">Distribution Type</th>
              <th className="p-3">Notes / Reference</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#EDEFEA] dark:divide-[#263A42] text-gray-700 dark:text-gray-300">
            {combinedIssuances.map((item) => (
              <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-[#1C2C33]/50 transition-colors">
                <td className="p-3 font-mono whitespace-nowrap">{item.date}</td>
                <td className="p-3 font-semibold text-[#0B3B45] dark:text-cyan-300">{item.recipient}</td>
                <td className="p-3">
                  <span className="font-medium">{item.itemName}</span>
                  <span className="block text-[10px] text-gray-400">{item.category}</span>
                </td>
                <td className="p-3 font-mono font-bold">{item.qty}</td>
                <td className="p-3">
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                    item.distributionType === 'free' 
                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300' 
                      : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                  }`}>
                    {item.distributionType === 'free' ? '🎁 Free Giveaway' : '💰 Sold'}
                  </span>
                </td>
                <td className="p-3 text-gray-500 dark:text-gray-400 max-w-xs truncate">{item.notes || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}