import React from 'react';
import { Printer, RotateCcw } from "lucide-react";

export function AuditLog({ data, mutate, showToast }) {
  const logs = data.auditLog || [];

  const handleResetAuditLog = () => {
    if (window.confirm("Are you sure you want to reset and clear the entire Audit Log?")) {
      mutate((prev) => ({
        ...prev,
        auditLog: [],
      }), "Reset Audit Log", "Cleared all system audit log entries");
      showToast("Audit log cleared successfully!");
    }
  };

  const handlePrintAuditLog = () => {
    window.print();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <p className="font-display font-800 text-2xl text-[#0B3B45]">System Audit Trail</p>
          <p className="text-sm text-[#5B6B68]">Track all operational actions, data updates, and security events.</p>
        </div>

        <div className="flex gap-2 no-print">
          <button onClick={handlePrintAuditLog} className="btn-primary py-1.5 px-3 text-xs bg-[#1C8C9E]">
            <Printer size={14} /> Print Audit Log
          </button>
          <button onClick={handleResetAuditLog} className="btn-primary py-1.5 px-3 text-xs bg-[#C4472F] hover:bg-red-800">
            <RotateCcw size={14} /> Reset Audit Log
          </button>
        </div>
      </div>

      <div id="printable-area" className="bg-white p-5 rounded-2xl border border-[#DDE3DA] overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-[#F7F8F5] text-left">
              <th className="p-2">Timestamp</th>
              <th className="p-2">User</th>
              <th className="p-2">Role</th>
              <th className="p-2">Action</th>
              <th className="p-2">Details</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 ? (
              <tr>
                <td colSpan="5" className="p-4 text-center text-gray-400">No audit logs recorded yet.</td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id} className="border-t">
                  <td className="p-2 font-mono text-gray-500">{new Date(log.ts).toLocaleString()}</td>
                  <td className="p-2 font-semibold text-[#0B3B45]">{log.user}</td>
                  <td className="p-2 uppercase text-[10px] font-mono">{log.role}</td>
                  <td className="p-2 font-bold text-blue-900">{log.action}</td>
                  <td className="p-2 text-gray-600">{log.detail}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}