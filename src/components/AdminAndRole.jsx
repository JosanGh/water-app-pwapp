import { useState, useMemo } from 'react';
import { DEFAULT_EXPENSE_CATEGORIES } from '../lib/storage';
import { Droplets, Plus, Users, Settings2, Mail, Building, Trash2, Lock } from "lucide-react";

// Safe unique ID generator fallback if uid() isn't imported globally
const uid = () => Math.random().toString(36).substring(2, 9) + Date.now().toString(36);

export function AdminManagementModule({ data, mutate, showToast }) {
  const users = data?.users || [];
  const categories = data?.expenseCategories || DEFAULT_EXPENSE_CATEGORIES || [];

  const [selectedUserId, setSelectedUserId] = useState(data?.users?.[0]?.id || "");
  const [newPassword, setNewPassword] = useState("");
  const [unitPrice, setUnitPrice] = useState(data?.settings?.pricePerBag || 5.0);
  const [newCategory, setNewCategory] = useState("");

  const [bizName, setBizName] = useState(data?.businessDetails?.name || "");
  const [bizPhone, setBizPhone] = useState(data?.businessDetails?.phone || "");
  const [bizAddress, setBizAddress] = useState(data?.businessDetails?.address || "");
  const [bizTin, setBizTin] = useState(data?.businessDetails?.tin || "");

  const [userName, setUserName] = useState("");
  const [userRole, setUserRole] = useState("driver");
  const [userPassword, setUserPassword] = useState("123");
  const [truckNo, setTruckNo] = useState("");
  const [userEmail, setUserEmail] = useState("");

  const usersList = useMemo(() => data?.users || [], [data?.users]);

  const handleUpdatePrice = (e) => {
    e.preventDefault();
    if (Number(unitPrice) <= 0) return showToast("Price per bag must be positive!", "warn");

    mutate((prev) => ({
      ...prev,
      settings: {
        ...prev?.settings,
        pricePerBag: Number(unitPrice),
      },
    }), "Updated Price Per Bag", `GH₵ ${unitPrice} per bag`);

    showToast("Unit Price Updated!");
  };

  const handleUpdateBusiness = (e) => {
    e.preventDefault();
    mutate((prev) => ({
      ...prev,
      businessDetails: {
        name: bizName,
        phone: bizPhone,
        address: bizAddress,
        tin: bizTin,
        isRegistered: true,
      },
      settings: {
        ...prev?.settings,
        companyName: bizName || prev?.settings?.companyName,
      },
    }), "Updated Business Setup", bizName);

    showToast("Business Information Saved!");
  };

  const handleAddUser = (e) => {
    e.preventDefault();
    if (!userName.trim()) return showToast("User name is required!", "warn");

    const newUser = {
      id: uid(),
      name: userName.trim(),
      role: userRole,
      password: userPassword,
      ...(userRole === "driver" ? { truckNo: truckNo.trim() || "N/A" } : {}),
      ...(userRole === "owner" ? { email: userEmail.trim() } : {}),
    };

    mutate((prev) => ({
      ...prev,
      users: [...(prev?.users || []), newUser],
    }), "Created User Account", `${userName} (${userRole})`);

    setUserName("");
    setTruckNo("");
    setUserEmail("");
    setUserPassword("123");
    showToast("New User Account Created!");
  };

  const handleResetUserPassword = (e) => {
    e.preventDefault();
    if (!selectedUserId) return;
    if (!newPassword || newPassword.length < 3) return showToast("Password too short!", "warn");

    const usr = usersList.find((u) => u.id === selectedUserId);

    mutate((prev) => ({
      ...prev,
      users: (prev?.users || []).map((u) => u.id === selectedUserId ? { ...u, password: newPassword } : u),
    }), "Changed User Password", usr ? usr.name : selectedUserId);

    setNewPassword("");
    showToast("User Password Updated!");
  };

  const handleDeleteUser = (userId, name) => {
    if (usersList.length <= 1) return showToast("Cannot delete the only remaining user!", "warn");
    if (window.confirm(`Are you sure you want to delete user: ${name}?`)) {
      mutate((prev) => ({
        ...prev,
        users: (prev?.users || []).filter((u) => u.id !== userId),
      }), "Deleted User Account", name);
      showToast("User Deleted!");
    }
  }; // Fixed missing closing bracket here

  const handleAddCategory = (e) => {
    e.preventDefault();
    if (!newCategory.trim()) return;

    if (categories.includes(newCategory.trim())) {
      return showToast("Category already exists!", "warn");
    }

    mutate((prev) => ({
      ...prev,
      expenseCategories: [...(prev?.expenseCategories || DEFAULT_EXPENSE_CATEGORIES), newCategory.trim()],
    }), "Added Expense Category", newCategory.trim());

    setNewCategory("");
    showToast("Expense Category Added!");
  };

  const handleRemoveCategory = (cat) => {
    if (window.confirm(`Remove category "${cat}"?`)) {
      mutate((prev) => ({
        ...prev,
        expenseCategories: (prev?.expenseCategories || []).filter((c) => c !== cat),
      }), "Removed Expense Category", cat);
      showToast("Category removed.");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="font-display font-800 text-2xl text-[#0B3B45]">Admin Settings & User Accounts</p>
        <p className="text-sm text-[#5B6B68]">System parameters, sachet bag pricing, user credentials, and company details.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Price & Unit Setup */}
        <form onSubmit={handleUpdatePrice} className="bg-white p-5 rounded-2xl border border-[#DDE3DA] space-y-3">
          <div className="flex items-center gap-2 border-b pb-2">
            <Settings2 className="text-[#0B3B45]" size={18} />
            <p className="font-bold text-[#0B3B45]">Sachet Bag Pricing Setup</p>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500">Global Sales Price Per Sachet Bag (GH₵)</label>
            <input
              type="number"
              min="0.1"
              step="0.1"
              value={unitPrice}
              onChange={(e) => setUnitPrice(e.target.value)}
              className="inp mt-1"
              required
            />
          </div>
          <button type="submit" className="btn-primary w-full">Update Bag Price</button>
        </form>

        {/* Business Registration */}
        <form onSubmit={handleUpdateBusiness} className="bg-white p-5 rounded-2xl border border-[#DDE3DA] space-y-3">
          <div className="flex items-center gap-2 border-b pb-2">
            <Building className="text-[#0B3B45]" size={18} />
            <p className="font-bold text-[#0B3B45]">Company & GRA Details</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-semibold text-gray-500">Business Name</label>
              <input value={bizName} onChange={(e) => setBizName(e.target.value)} placeholder="Company Name" className="inp mt-1" required />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500">Phone</label>
              <input value={bizPhone} onChange={(e) => setBizPhone(e.target.value)} placeholder="Phone" className="inp mt-1" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-semibold text-gray-500">Address / City</label>
              <input value={bizAddress} onChange={(e) => setBizAddress(e.target.value)} placeholder="Location" className="inp mt-1" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500">TIN Number</label>
              <input value={bizTin} onChange={(e) => setBizTin(e.target.value)} placeholder="TIN" className="inp mt-1" />
            </div>
          </div>
          <button type="submit" className="btn-primary w-full">Save Business Info</button>
        </form>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Create User Account */}
        <form onSubmit={handleAddUser} className="bg-white p-5 rounded-2xl border border-[#DDE3DA] space-y-3">
          <div className="flex items-center gap-2 border-b pb-2">
            <Users className="text-[#0B3B45]" size={18} />
            <p className="font-bold text-[#0B3B45]">Create New User / Driver</p>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500">Full Name</label>
            <input value={userName} onChange={(e) => setUserName(e.target.value)} placeholder="e.g. Ama Serwaa" className="inp mt-1" required />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-semibold text-gray-500">System Role</label>
              <select value={userRole} onChange={(e) => setUserRole(e.target.value)} className="inp mt-1">
                <option value="driver">Delivery Driver</option>
                <option value="cashier">Plant Cashier</option>
                <option value="manager">Factory Manager</option>
                <option value="owner">Business Owner</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500">Password</label>
              <input type="text" value={userPassword} onChange={(e) => setUserPassword(e.target.value)} placeholder="123" className="inp mt-1" required />
            </div>
          </div>

          {userRole === "driver" && (
            <div>
              <label className="text-xs font-semibold text-gray-500">Truck Number / Reg Plate</label>
              <input value={truckNo} onChange={(e) => setTruckNo(e.target.value)} placeholder="e.g. GT-1022-22" className="inp mt-1" required />
            </div>
          )}

          {userRole === "owner" && (
            <div>
              <label className="text-xs font-semibold text-gray-500">Admin Recovery Email</label>
              <input type="email" value={userEmail} onChange={(e) => setUserEmail(e.target.value)} placeholder="admin@pureledger.com" className="inp mt-1" required />
            </div>
          )}

          <button type="submit" className="btn-primary w-full"><Plus size={15} /> Add User Account</button>
        </form>

        {/* Change Password */}
        <form onSubmit={handleResetUserPassword} className="bg-white p-5 rounded-2xl border border-[#DDE3DA] space-y-3">
          <div className="flex items-center gap-2 border-b pb-2">
            <Lock className="text-[#0B3B45]" size={18} />
            <p className="font-bold text-[#0B3B45]">Reset User Credentials</p>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500">Target User</label>
            <select value={selectedUserId} onChange={(e) => setSelectedUserId(e.target.value)} className="inp mt-1">
              {usersList.map((u) => (
                <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500">New Password</label>
            <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Enter new password" className="inp mt-1" required />
          </div>

          <button type="submit" className="btn-primary w-full">Update Password</button>
        </form>
      </div>

      {/* Expense Categories Section */}
      <div className="bg-white p-5 rounded-2xl border border-[#DDE3DA] space-y-3">
        <div className="flex items-center gap-2 border-b pb-2">
          <Settings2 className="text-[#0B3B45]" size={18} />
          <p className="font-bold text-[#0B3B45]">Expense Categories Config</p>
        </div>
        <form onSubmit={handleAddCategory} className="flex gap-2">
          <input value={newCategory} onChange={(e) => setNewCategory(e.target.value)} placeholder="New Expense Name" className="inp" />
          <button type="submit" className="btn-primary shrink-0 py-2">Add</button>
        </form>

        <div className="flex flex-wrap gap-1.5 pt-2 max-h-36 overflow-y-auto">
          {categories.map((c) => (
            <span key={c} className="px-2.5 py-1 bg-[#F7F8F5] border rounded-lg text-xs flex items-center gap-1.5">
              <span>{c}</span>
              <button type="button" onClick={() => handleRemoveCategory(c)} className="text-red-500 hover:text-red-700 font-bold text-xs">×</button>
            </span>
          ))}
        </div>
      </div>

      {/* User Accounts List */}
      <div className="bg-white p-5 rounded-2xl border border-[#DDE3DA] overflow-x-auto">
        <p className="font-bold text-[#0B3B45] mb-3">All System Accounts</p>
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-[#F7F8F5] text-left">
              <th className="p-2">Name</th>
              <th className="p-2">Role</th>
              <th className="p-2">Truck / Detail</th>
              <th className="p-2">Email</th>
              <th className="p-2 text-center">Action</th>
            </tr>
          </thead>
          <tbody>
            {usersList.map((u) => (
              <tr key={u.id} className="border-t">
                <td className="p-2 font-bold text-[#0B3B45]">{u.name}</td>
                <td className="p-2 uppercase font-mono text-[10px]">{u.role}</td>
                <td className="p-2 font-mono text-gray-600">{u.truckNo || "N/A"}</td>
                <td className="p-2 text-gray-500">{u.email || "N/A"}</td>
                <td className="p-2 text-center">
                  <button
                    onClick={() => handleDeleteUser(u.id, u.name)}
                    className="p-1 text-red-600 hover:bg-red-50 rounded"
                  >
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}