import { useState } from 'react';
import {
  Droplets, Warehouse, Factory, Wallet, FileBarChart, ShieldCheck,
  LogOut, Wifi, WifiOff, Menu, Bell, X, KeyRound
} from "lucide-react";
import { getRoleMeta, hasPermission } from '../config/roles';

export function Sidebar({ page, setPage, role, onLogout, open, onClose }) {
  const items = [
    { id: "dashboard", label: "Dashboard", icon: Factory },
    { id: "warehouse", label: "Warehouse & Packing", icon: Warehouse },
    { id: "production", label: "Production Logs", icon: Droplets },
    { id: "sales", label: "Sales & Cash", icon: Wallet },
    { id: "reports", label: "Reports & Drivers", icon: FileBarChart },
    { id: "admin", label: "Admin & Roles", icon: KeyRound },
    { id: "audit", label: "Audit Trail", icon: ShieldCheck },
  ];

  // Filter navigation items using central hasPermission utility
  const visibleItems = items.filter((item) => hasPermission(role, item.id));

  return (
    <>
      {open && <div className="fixed inset-0 z-30 sm:hidden bg-black/50" onClick={onClose} />}
      <aside className={`pw-sidebar fixed sm:static inset-y-0 left-0 z-40 flex flex-col w-64 sm:w-60 shrink-0 min-h-screen px-3 py-4 transition-transform ${open ? "translate-x-0" : "-translate-x-full sm:translate-x-0"}`}>
        <div className="flex items-center justify-between px-2 mb-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#1C8C9E] flex items-center justify-center">
              <Droplets size={16} className="text-[#0B3B45]" />
            </div>
            <p className="font-display font-800 text-[15px] text-[#F2F4EF]">Mattbees Water Services</p>
          </div>
          <button onClick={onClose} className="sm:hidden p-1 text-[#B9CFCE]"><X size={18} /></button>
        </div>
        <nav className="flex-1 space-y-1">
          {visibleItems.map((i) => {
            const Icon = i.icon;
            const active = page === i.id;
            return (
              <button 
                key={i.id} 
                onClick={() => {
                  setPage(i.id);
                  if (onClose) onClose();
                }} 
                className={`pw-nav-item w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition ${active ? "pw-nav-item-active" : ""}`}
              >
                <Icon size={16} />
                <span className="flex-1 text-left">{i.label}</span>
              </button>
            );
          })}
        </nav>
        <button onClick={onLogout} className="pw-nav-item flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm text-[#B9CFCE] hover:text-white">
          <LogOut size={16} /> Sign out
        </button>
      </aside>
    </>
  );
}

export function TopBar({ session = {}, online, onMenuClick, onLogout, data = {}, mutate }) {
  // Dynamically resolve role label & badge styles using getRoleMeta
  const roleMeta = getRoleMeta(session?.role);
  const [notifOpen, setNotifOpen] = useState(false);
  const notifications = data.notifications || [];
  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleOpenNotifications = () => {
    if (!notifOpen && unreadCount > 0) {
      mutate((prev) => ({
        ...prev,
        notifications: (prev.notifications || []).map((n) => ({ ...n, read: true })),
      }), "Read Notifications", "Marked all system notifications as read");
    }
    setNotifOpen(!notifOpen);
  };

  return (
    <div className="sticky top-0 z-20 bg-[#F2F4EF] border-b border-[#DDE3DA] px-4 sm:px-6 py-3 flex items-center justify-between">
      <div className="flex items-center gap-2.5">
        <button onClick={onMenuClick} className="sm:hidden w-8 h-8 rounded-lg border border-[#DDE3DA] bg-white flex items-center justify-center text-[#0B3B45]">
          <Menu size={16} />
        </button>
        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono font-semibold ${online ? "bg-[#DCEEE4] text-[#2A6E4A]" : "bg-[#F5E3D9] text-[#A85A2A]"}`}>
          {online ? <Wifi size={12} /> : <WifiOff size={12} />}
          <span>{online ? "ONLINE SYNCED" : "OFFLINE READY"}</span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <div className="text-right hidden sm:block">
          <p className="text-sm font-semibold">{session.name || "User"}</p>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border inline-block mt-0.5 ${roleMeta.badgeColor || "bg-gray-100 text-gray-700 border-gray-200"}`}>
            {roleMeta.label}
          </span>
        </div>
        <div className="w-8 h-8 rounded-full bg-[#0B3B45] flex items-center justify-center text-white ml-1">
          <ShieldCheck size={14} />
        </div>
        <div className="relative">
          <button onClick={handleOpenNotifications} className="relative w-8 h-8 rounded-lg border border-[#DDE3DA] bg-white flex items-center justify-center text-[#0B3B45]">
            <Bell size={15} />
            {unreadCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 rounded-full text-[10px] font-bold bg-[#C4472F] text-white flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>
          {notifOpen && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl border border-[#DDE3DA] shadow-xl z-50 p-3">
              <div className="flex items-center justify-between pb-2 border-b border-[#EDEFEA]">
                <p className="font-bold text-xs text-[#0B3B45]">System Notifications</p>
                <button onClick={() => mutate((prev) => ({ ...prev, notifications: [] }), "Cleared Notifications", "")} className="text-[10px] text-[#C4472F]">Clear All</button>
              </div>
              <div className="max-h-60 overflow-y-auto space-y-2 mt-2">
                {notifications.length === 0 ? <p className="text-xs text-gray-400 text-center py-4">No notifications</p> : (
                  notifications.map((n) => (
                    <div key={n.id} className="p-2 bg-[#F7F8F5] rounded text-xs border border-[#EDEFEA] relative">
                      <div className="flex justify-between items-center">
                        <p className="font-semibold text-[#0B3B45]">{n.title}</p>
                        <span className="text-[9px] text-green-700 font-bold bg-green-100 px-1.5 py-0.5 rounded">Read</span>
                      </div>
                      <p className="text-gray-600 mt-1">{n.msg}</p>
                      <span className="text-[9px] text-gray-400 font-mono mt-1 block">{n.ts}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
        <button onClick={onLogout} className="w-8 h-8 rounded-lg border border-[#DDE3DA] bg-white flex items-center justify-center text-[#C4472F]">
          <LogOut size={15} />
        </button>
      </div>
    </div>
  );
}