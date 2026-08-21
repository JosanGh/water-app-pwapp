export const uid = () => Math.random().toString(36).slice(2, 10);
export const todayISO = () => new Date().toISOString().slice(0, 10);
export const fmt = (n, d = 1) => Number(n || 0).toLocaleString("en-GH", { maximumFractionDigits: d, minimumFractionDigits: 0 });
export const fmtGHS = (n) => `GH₵ ${fmt(n, 2)}`;

export function computeFinishedGoods(data = {}) {
  const produced = (data.productionRuns || []).reduce((s, r) => s + (Number(r.netAvailableBags) || 0), 0);
  const sold = (data.sales || []).reduce((s, r) => s + (Number(r.bagsSold) || 0), 0);
  const freeDistributedSales = (data.sales || []).reduce((s, r) => s + (Number(r.freeBags) || 0), 0);
  const salesLeakage = (data.sales || []).reduce((s, r) => s + (Number(r.leakageBags) || 0), 0);

  return {
    totalProduced: produced,
    totalSold: sold,
    totalFreeDistributedSales: freeDistributedSales,
    totalSalesLeakage: salesLeakage,
    availableForSale: Math.max(0, produced - sold - freeDistributedSales - salesLeakage),
  };
}

export function computeManagerAcceptedRolls(data = {}) {
  // Support fallback array names in case data is stored under rollIssuance
  const issuanceList = data.issuance || data.rollIssuance || [];
  const productionList = data.productionRuns || data.productions || [];

  // Flexibly capture accepted transfers across all common status keywords
  const acceptedItems = issuanceList.filter((i) => {
    const s = String(i.status || i.managerStatus || i.acceptanceStatus || "").toLowerCase();
    if (s === "rejected" || s === "pending") return false;

    return (
      s === "accepted" ||
      s === "received" ||
      s === "approved" ||
      s === "confirmed" ||
      s === "completed" ||
      i.accepted === true ||
      i.accepted === "true" ||
      (!i.status && (i.physicalCount !== undefined || i.acceptedAt !== undefined))
    );
  });

  // Calculate total accepted rolls across all possible object key variations
  const acceptedRollsCount = acceptedItems.reduce((s, i) => {
    const val = i.physicalCount ?? i.acceptedQty ?? i.rollsCount ?? i.rolls ?? i.qty ?? i.quantity ?? i.noOfRolls ?? i.rollsIssued ?? 0;
    return s + (Number(val) || 0);
  }, 0);

  // Calculate total accepted weight (kg)
  const acceptedKg = acceptedItems.reduce((s, i) => {
    const val = i.physicalWeightKg ?? i.acceptedWeightKg ?? i.weightKg ?? i.weight ?? i.kg ?? 0;
    return s + (Number(val) || 0);
  }, 0);

  // Calculate total rolls used in production across all key variations
  const usedRollsCount = productionList.reduce((s, p) => {
    const val = p.rollsUsedCount ?? p.rollsUsed ?? p.rollsCount ?? p.rolls ?? p.rollCount ?? p.qty ?? p.quantity ?? p.noOfRolls ?? 0;
    return s + (Number(val) || 0);
  }, 0);

  // Calculate total weight (kg) used in production
  const usedKg = productionList.reduce((s, p) => {
    const val = p.weightUsedKg ?? p.weightUsed ?? p.kgUsed ?? p.usedKg ?? p.weightKg ?? p.weight ?? 0;
    return s + (Number(val) || 0);
  }, 0);

  return {
    acceptedRollsCount,
    acceptedKg,
    usedRollsCount,
    usedKg,
    rollsCount: Math.max(0, acceptedRollsCount - usedRollsCount),
    weightKg: Math.max(0, acceptedKg - usedKg),
  };
}

export function computeManagerAcceptedBags(data = {}) {
  const bagIssuanceList = data.bagIssuance || [];
  const bagUsageList = data.bagUsage || [];

  const accepted = bagIssuanceList
    .filter((i) => {
      const s = String(i.status || i.managerStatus || "").toLowerCase();
      if (s === "rejected" || s === "pending") return false;
      return s === "accepted" || s === "received" || s === "approved" || i.accepted === true || (!i.status && i.physicalCount !== undefined);
    })
    .reduce((s, i) => s + (Number(i.physicalCount ?? i.acceptedQty ?? i.qty ?? i.quantity) || 0), 0);

  const used = bagUsageList.reduce((s, u) => s + (Number(u.qty ?? u.usedQty ?? u.quantity) || 0), 0);

  return {
    acceptedBags: accepted,
    usedBags: used,
    remainingBags: Math.max(0, accepted - used),
  };
}

export function computeCashBalance(data = {}) {
  const cashSales = (data.sales || [])
    .filter((s) => (s.method || s.paymentMethod)?.toLowerCase() === "cash")
    .reduce((s, r) => s + (Number(r.amountPaid ?? r.amount) || 0), 0);

  const debtCash = (data.debtPayments || [])
    .filter((p) => (p.method || p.paymentMethod)?.toLowerCase() === "cash")
    .reduce((s, r) => s + (Number(r.amount) || 0), 0);

  const managerExpenses = (data.expenses || []).reduce((s, e) => s + (Number(e.amount) || 0), 0);
  const adminExpenses = (data.adminExpenses || []).reduce((s, e) => s + (Number(e.amount) || 0), 0);
  const deposits = (data.bankDeposits || []).reduce((s, e) => s + (Number(e.amount) || 0), 0);

  return cashSales + debtCash - managerExpenses - adminExpenses - deposits;
}
