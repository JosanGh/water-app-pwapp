import React from "react";
import { ArrowLeft, FileText } from "lucide-react";

export function TermsAndPolicy({ onBack, standalone = false }) {
  return (
    <div className={standalone ? "min-h-screen bg-[#F2F4EF] p-4 sm:p-8" : "space-y-6"}>
      <div className={standalone ? "max-w-3xl mx-auto" : "max-w-3xl"}>
        <div className="flex items-center gap-3 mb-6">
          {onBack && (
            <button type="button" onClick={onBack} aria-label="Back" className="w-9 h-9 rounded-lg border border-[#DDE3DA] bg-white flex items-center justify-center text-[#0B3B45]">
              <ArrowLeft size={16} />
            </button>
          )}
          <div className="w-10 h-10 rounded-lg bg-[#DCEEE4] flex items-center justify-center">
            <FileText size={20} className="text-[#0B3B45]" />
          </div>
          <div>
            <h1 className="font-display font-800 text-2xl text-[#0B3B45]">Terms & Policy</h1>
            <p className="text-xs text-[#5B6B68]">Mattbees Water Services · Last updated September 2026</p>
          </div>
        </div>

        <div className="bg-white p-5 sm:p-7 rounded-2xl border border-[#DDE3DA] space-y-6 text-sm text-[#344542]">
          <section>
            <h2 className="font-bold text-[#0B3B45] text-base mb-2">Acceptable use</h2>
            <p>Use this application only for authorized Mattbees Water Services work. Keep your account credentials private and record operational, sales, inventory, and expense information accurately.</p>
          </section>
          <section>
            <h2 className="font-bold text-[#0B3B45] text-base mb-2">Data and synchronization</h2>
            <p>The application stores a working copy on your device so it can continue during network interruptions. When online, authorized changes are synchronized with the company Supabase database. Do not clear browser storage while offline if you need to preserve unsynchronized entries.</p>
          </section>
          <section>
            <h2 className="font-bold text-[#0B3B45] text-base mb-2">Privacy and access</h2>
            <p>Business records are intended for authorized users and may include financial, customer, staff, inventory, and audit information. Access is role-based. Report suspected unauthorized access or incorrect records to the business owner promptly.</p>
          </section>
          <section>
            <h2 className="font-bold text-[#0B3B45] text-base mb-2">Accuracy and responsibility</h2>
            <p>Users are responsible for reviewing entries before submission. Administrative settings, expense categories, user accounts, and business details may be changed only by authorized administrators.</p>
          </section>
          <section>
            <h2 className="font-bold text-[#0B3B45] text-base mb-2">Support</h2>
            <p>For access problems, data corrections, or policy questions, contact your business owner or system administrator.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
