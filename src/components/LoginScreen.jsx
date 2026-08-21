import React, { useState, useEffect } from 'react';
import { Droplets, Mail } from "lucide-react";

export function LoginScreen({ users = [], rolesConfig = {}, onLogin, onResetAdminPassword }) {
  const [view, setView] = useState("login");
  const [selectedUser, setSelectedUser] = useState(users[0] || null);
  const [password, setPassword] = useState("");
  const [fullNameInput, setFullNameInput] = useState("");
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const [resetFullNameInput, setResetFullNameInput] = useState("");
  const [resetEmail, setResetEmail] = useState("");
  const [resetPassword, setResetPassword] = useState("");

  useEffect(() => {
    if (users.length > 0 && !selectedUser) {
      setSelectedUser(users[0]);
    }
  }, [users, selectedUser]);

  const handleLoginSubmit = (e) => {
    e.preventDefault();
    if (!selectedUser) return;

    if (selectedUser.password && password !== selectedUser.password) {
      setError("Incorrect password! Access denied.");
      return;
    }

    if (!fullNameInput || fullNameInput.trim().toLowerCase() !== selectedUser.name.trim().toLowerCase()) {
      setError("Full Name mismatch! Please type the exact full name assigned to this user.");
      return;
    }

    onLogin({
      id: selectedUser.id,
      name: selectedUser.name,
      role: selectedUser.role,
    });
  };

  const handleForgot = (e) => {
    e.preventDefault();
    if (resetPassword.length < 6) {
      setError("New password must be at least 6 characters long.");
      return;
    }
    const ok = onResetAdminPassword(resetFullNameInput, resetEmail, resetPassword);
    if (ok) {
      setSuccessMsg("Admin password updated successfully! Please log in.");
      setView("login");
      setResetFullNameInput("");
      setResetEmail("");
      setResetPassword("");
      setError("");
    } else {
      setError("No admin account found matching that email address.");
    }
  };

  return (
    <div className="min-h-screen bg-[#0B3B45] flex items-center justify-center p-6">
      <div className="relative w-full max-w-md bg-[#F2F4EF] rounded-2xl p-6 shadow-2xl">
        <div className="flex items-center gap-2.5 justify-center mb-6">
          <div className="w-10 h-10 rounded-lg bg-[#1C8C9E] flex items-center justify-center">
            <Droplets size={20} className="text-[#0B3B45]" />
          </div>
          <div className="text-left">
            <p className="font-display font-800 text-[#0B3B45] text-xl leading-none">Mattbees Water Services</p>
            <p className="font-mono text-[10px] text-[#5B6B68] uppercase tracking-widest mt-0.5">Offline-First Sachet ERP</p>
          </div>
        </div>

        {view === "login" && (
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            {successMsg && <p className="text-xs font-semibold text-green-700 bg-green-100 p-2 rounded">{successMsg}</p>}

            <div>
              <label className="text-xs font-semibold text-[#5B6B68] uppercase">Select Account / User</label>
              <select
                value={selectedUser?.id || ""}
                onChange={(e) => {
                  const u = users.find((x) => x.id === e.target.value);
                  setSelectedUser(u);
                  setFullNameInput("");
                  setError("");
                }}
                className="inp mt-1"
              >
                {users.map((u) => {
                  const roleLabel = rolesConfig[u.role]?.label || u.role;
                  return (
                    <option key={u.id} value={u.id}>
                      {roleLabel} — {u.name}
                    </option>
                  );
                })}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-[#5B6B68] uppercase">Verify Full Name</label>
              <input
                type="text"
                value={fullNameInput}
                onChange={(e) => { setFullNameInput(e.target.value); setError(""); }}
                placeholder="Type exact full name assigned"
                className="inp mt-1"
                required
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-[#5B6B68] uppercase">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(""); }}
                placeholder="••••••••"
                className="inp mt-1"
                required
              />
            </div>

            {error && <p className="text-xs font-semibold text-[#C4472F]">{error}</p>}

            <button type="submit" className="btn-primary w-full py-2.5 mt-2">
              Authenticate & Sign In
            </button>

            <div className="pt-3 border-t border-[#DDE3DA] flex flex-col gap-2 text-center">
              <button
                type="button"
                onClick={() => { setView("forgot"); setError(""); setSuccessMsg(""); }}
                className="text-xs text-gray-600 hover:underline flex items-center justify-center gap-1"
              >
                <Mail size={13} /> Admin Password Reset (Email Auth)
              </button>
            </div>
          </form>
        )}

        {view === "forgot" && (
          <form onSubmit={handleForgot} className="space-y-3">
            {successMsg && <p className="text-xs font-semibold text-green-700 bg-green-100 p-2 rounded">{successMsg}</p>}
            <div className="bg-[#EAF3F1] p-3 rounded-lg border border-[#BFDCD6] mb-2">
              <p className="text-xs font-bold text-[#0B3B45]">Admin Password Recovery</p>
              <p className="text-[11px] text-[#5B6B68]">Authenticate using registered Admin email address to set a new password.</p>
            </div>

            <div>
              <label className="text-xs font-semibold text-[#5B6B68] uppercase">Admin Name</label>
              <input
                type="text"
                value={resetFullNameInput}
                onChange={(e) => { setResetFullNameInput(e.target.value); setError(""); }}
                placeholder="Enter your name"
                className="inp mt-1"
                required
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-[#5B6B68] uppercase">Admin Email</label>
              <input
                type="email"
                value={resetEmail}
                onChange={(e) => { setResetEmail(e.target.value); setError(""); }}
                placeholder="Enter your email"
                className="inp mt-1"
                required
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-[#5B6B68] uppercase">New Secure Password</label>
              <input
                type="password"
                value={resetPassword}
                onChange={(e) => setResetPassword(e.target.value)}
                placeholder="Set new password"
                className="inp mt-1"
                required
              />
            </div>

            {error && <p className="text-xs font-semibold text-[#C4472F]">{error}</p>}

            <button type="submit" className="btn-primary w-full py-2.5 mt-2">
              Authenticate Email & Reset Password
            </button>

            <button
              type="button"
              onClick={() => { setView("login"); setError(""); }}
              className="w-full text-center text-xs text-gray-500 hover:underline mt-2"
            >
              Back to Login
            </button>
          </form>
        )}

        <p className="text-center text-[11px] font-mono text-[#5B6B68] mt-4">PWA ACTIVE · SUPABASE SYNC ENABLED</p>
      </div>
    </div>
  );
}