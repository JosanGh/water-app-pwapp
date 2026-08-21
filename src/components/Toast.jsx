import React from 'react';
import { AlertTriangle, CheckCircle2 } from "lucide-react";

export function Toast({ msg, tone = "ok" }) {
  const isWarn = tone === "warn";
  return (
    <div className={`fixed bottom-5 right-5 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-2xl text-xs font-bold text-white transition-all ${isWarn ? "bg-[#C4472F]" : "bg-[#2A6E4A]"}`}>
      {isWarn ? <AlertTriangle size={16} /> : <CheckCircle2 size={16} />}
      <span>{msg}</span>
    </div>
  );
}