export const ROLES = {
  OWNER: "owner",
  MANAGER: "manager",
  CASHIER: "cashier",
  DRIVER: "driver",
};

export const rolesConfig = {
  [ROLES.OWNER]: {
    id: ROLES.OWNER,
    label: "Business Owner",
    badgeColor: "bg-purple-100 text-purple-800 border-purple-200",
    accentColor: "#0B3B45",
    allowedPages: ["dashboard", "warehouse", "production", "sales", "reports", "admin", "audit"],
    defaultLandingPage: "dashboard",
  },
  [ROLES.MANAGER]: {
    id: ROLES.MANAGER,
    label: "Plant Manager",
    badgeColor: "bg-blue-100 text-blue-800 border-blue-200",
    accentColor: "#1C8C9E",
    allowedPages: ["dashboard", "warehouse", "production", "sales", "reports"],
    defaultLandingPage: "dashboard",
  },
  [ROLES.CASHIER]: {
    id: ROLES.CASHIER,
    label: "Sales Cashier",
    badgeColor: "bg-emerald-100 text-emerald-800 border-emerald-200",
    accentColor: "#2A6E4A",
    allowedPages: ["sales"],
    defaultLandingPage: "sales",
  },
  [ROLES.DRIVER]: {
    id: ROLES.DRIVER,
    label: "Delivery Driver",
    badgeColor: "bg-amber-100 text-amber-800 border-amber-200",
    accentColor: "#E8A23D",
    allowedPages: ["reports"],
    defaultLandingPage: "reports",
  },
};

/**
 * Safely resolves role metadata with a fallback for undefined/unknown roles
 */
export const getRoleMeta = (role) => {
  const normalizedRole = String(role || '').toLowerCase();
  return (
    rolesConfig[normalizedRole] || {
      id: "unknown",
      label: "Guest User",
      badgeColor: "bg-gray-100 text-gray-700 border-gray-200",
      accentColor: "#5B6B68",
      allowedPages: [],
      defaultLandingPage: "login",
    }
  );
};

/**
 * Checks if a user has permission to view a page
 */
export const hasPermission = (userRole, pageId) => {
  const roleMeta = getRoleMeta(userRole);
  return roleMeta.allowedPages.includes(pageId);
};