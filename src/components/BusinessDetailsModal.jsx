import React, { useState } from 'react';
import { Building } from "lucide-react";

export function BusinessDetailsModal({ initialDetails, onSave, onSkip }) {
  const [name, setName] = useState(initialDetails?.name || "");
  const [address, setAddress] = useState(initialDetails?.address || "");
  const [phone, setPhone] = useState(initialDetails?.phone || "");
  const [tin, setTin] = useState(initialDetails?.tin || "");

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({ name, address, phone, tin });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl relative space-y-4">
        <div className="flex items-center gap-2 border-b pb-3">
          <Building className="text-[#0B3B45]" size={22} />
          <div>
            <h3 className="font-bold text-[#0B3B45] text-base">Register Business Details</h3>
            <p className="text-xs text-gray-500">Provide company information for invoices and receipts.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-gray-500">Business / Company Name *</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Mattbees Water Services" className="inp mt-1" required />
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500">Business Phone Number</label>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="e.g. +233 24 123 4567" className="inp mt-1" />
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500">Business Address / Location</label>
            <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="e.g. Industrial Area, Accra" className="inp mt-1" />
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500">Tax Identification Number (TIN / GRA)</label>
            <input value={tin} onChange={(e) => setTin(e.target.value)} placeholder="e.g. C0001234567" className="inp mt-1" />
          </div>

          <div className="pt-2 flex flex-col gap-2">
            <button type="submit" className="btn-primary w-full py-2.5">
              Save Business Details
            </button>
            <button type="button" onClick={onSkip} className="text-xs text-gray-500 hover:underline text-center">
              Register Business Details Later
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}