export const uid = () => Math.random().toString(36).slice(2, 10);

export const todayISO = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const fmt = (n, d = 2) =>
  Number(n || 0).toLocaleString("en-US", {
    maximumFractionDigits: d,
    minimumFractionDigits: 0,
  });

export const fmtGHS = (n) => `GH₵ ${fmt(n, 2)}`;

export function formatDayAndDate(isoDate) {
  try {
    const parts = isoDate.split("-");
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const d = new Date(year, month, day, 12, 0, 0);
      const dayName = d.toLocaleDateString("en-US", { weekday: "long" });
      const dateFormatted = d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
      return {
        day: dayName,
        date: dateFormatted,
        full: `${dayName}, ${dateFormatted}`,
      };
    }
  } catch {
    // fallback
  }
  return { day: "Today", date: isoDate, full: isoDate };
}

export function computeFinishedGoods(data = {}) {
  const produced = (data.productionRuns || []).reduce(
    (s, r) => s + (Number(r.netAvailableBags ?? r.bagsProduced) || 0),
    0,
  );
  const sold = (data.sales || []).reduce(
    (s, r) => s + (Number(r.bagsSold) || 0),
    0,
  );
  const freeDistributedSales = (data.sales || []).reduce(
    (s, r) => s + (Number(r.freeBags) || 0),
    0,
  );
  const salesLeakage = (data.sales || []).reduce(
    (s, r) => s + (Number(r.leakageBags) || 0),
    0,
  );
  const prodLeakages = (data.productionRuns || []).reduce(
    (sum, p) => sum + (Number(p.leakageBags) || 0),
    0,
  );
  const prodFree = (data.productionRuns || []).reduce(
    (sum, p) => sum + (Number(p.freeBags) || 0),
    0,
  );

  return {
    totalProduced: produced,
    totalSold: sold,
    totalFreeDistributedSales: freeDistributedSales,
    totalSalesLeakage: salesLeakage,
    totalLeakages: prodLeakages + salesLeakage,
    totalFree: prodFree + freeDistributedSales,
    availableForSale: Math.max(
      0,
      produced - sold - freeDistributedSales - salesLeakage,
    ),
  };
}

export function computeManagerAcceptedRolls(data = {}) {
  // Support fallback array names in case data is stored under rollIssuance
  const issuanceList = data.issuance || data.rollIssuance || [];
  const productionList = data.productionRuns || data.productions || [];

  // Flexibly capture accepted transfers across all common status keywords
  const acceptedItems = issuanceList.filter((i) => {
    const s = String(
      i.status || i.managerStatus || i.acceptanceStatus || "",
    ).toLowerCase();
    if (
      s === "rejected" ||
      s === "pending" ||
      i.accepted === false ||
      i.accepted === "false"
    ) {
      return false;
    }

    return (
      s === "accepted" ||
      s === "received" ||
      s === "approved" ||
      s === "confirmed" ||
      s === "completed" ||
      i.accepted === true ||
      i.accepted === "true" ||
      (!i.status &&
        (i.physicalCount !== undefined || i.acceptedAt !== undefined))
    );
  });

  // Calculate total accepted rolls across all possible object key variations
  const acceptedRollsCount = acceptedItems.reduce((s, i) => {
    const val =
      i.physicalCount ??
      i.acceptedQty ??
      i.rollsCount ??
      i.rolls ??
      i.qty ??
      i.quantity ??
      i.noOfRolls ??
      i.rollsIssued ??
      0;
    return s + (Number(val) || 0);
  }, 0);

  // Calculate total accepted weight (kg)
  const acceptedKg = acceptedItems.reduce((s, i) => {
    const val =
      i.physicalWeightKg ??
      i.acceptedWeightKg ??
      i.weightKg ??
      i.weight ??
      i.kg ??
      0;
    return s + (Number(val) || 0);
  }, 0);

  // Calculate total rolls used in production across all key variations
  const usedRollsCount = productionList.reduce((s, p) => {
    const val =
      p.rollsUsedCount ??
      p.rollsUsed ??
      p.rollsCount ??
      p.rolls ??
      p.rollCount ??
      p.qty ??
      p.quantity ??
      p.noOfRolls ??
      0;
    return s + (Number(val) || 0);
  }, 0);

  // Calculate total weight (kg) used in production
  const usedKg = productionList.reduce((s, p) => {
    const val =
      p.weightUsedKg ??
      p.weightUsed ??
      p.kgUsed ??
      p.usedKg ??
      p.weightKg ??
      p.weight ??
      0;
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
  const bagUsageList = data.bagUsage || data.productionRuns || [];

  const accepted = bagIssuanceList
    .filter((i) => {
      const s = String(i.status || i.managerStatus || "").toLowerCase();
      if (
        s === "rejected" ||
        s === "pending" ||
        i.accepted === false ||
        i.accepted === "false"
      ) {
        return false;
      }
      return (
        s === "accepted" ||
        s === "received" ||
        s === "approved" ||
        i.accepted === true ||
        (!i.status && i.physicalCount !== undefined)
      );
    })
    .reduce(
      (s, i) =>
        s +
        (Number(i.physicalCount ?? i.acceptedQty ?? i.qty ?? i.quantity) || 0),
      0,
    );

  const used = bagUsageList.reduce(
    (s, u) =>
      s + (Number(u.qty ?? u.usedQty ?? u.quantity ?? u.packingBagsUsed) || 0),
    0,
  );

  return {
    acceptedBags: accepted,
    usedBags: used,
    remainingBags: Math.max(0, accepted - used),
  };
}

export function computeCashBalance(data = {}) {
  const cashSales = (data.sales || [])
    .filter((s) => {
      const method = (s.method || s.paymentMethod)?.toLowerCase();
      return (
        method === "cash" ||
        (s.cashAmount !== undefined && Number(s.cashAmount) > 0)
      );
    })
    .reduce(
      (s, r) =>
        s +
        (Number(r.cashAmount ?? r.amountPaid ?? r.amount ?? r.totalAmount) ||
          0),
      0,
    );

  const debtCash = (data.debtPayments || [])
    .filter((p) => (p.method || p.paymentMethod)?.toLowerCase() === "cash")
    .reduce((s, r) => s + (Number(r.amount) || 0), 0);

  const managerExpenses = (data.expenses || []).reduce(
    (s, e) => s + (Number(e.amount) || 0),
    0,
  );
  const adminExpenses = (data.adminExpenses || []).reduce(
    (s, e) => s + (Number(e.amount) || 0),
    0,
  );
  const deposits = (data.bankDeposits || []).reduce(
    (s, e) => s + (Number(e.amount) || 0),
    0,
  );

  return cashSales + debtCash - managerExpenses - adminExpenses - deposits;
}

export function computeDailyMetrics(data = {}, targetDate) {
  const info = formatDayAndDate(targetDate);
  const isToday = targetDate === todayISO();

  const runs = (data.productionRuns || []).filter(
    (p) => p.date === targetDate && !p.isInitialBalance,
  );
  const rollsProduced = runs.reduce(
    (sum, r) =>
      sum +
      (Number(
        r.rollsUsedCount ?? r.rollsUsed ?? r.rollsCount ?? r.qty,
      ) || 0),
    0,
  );
  const materialKg = runs.reduce(
    (sum, r) =>
      sum +
      (Number(r.weightUsedKg ?? r.weightKg ?? r.weightUsed ?? r.weight) || 0),
    0,
  );
  const packingBagsUsed = runs.reduce(
    (sum, r) =>
      sum + (Number(r.packingBagsUsed ?? r.bagsUsedQty) || 0),
    0,
  );
  const bagsProduced = runs.reduce(
    (sum, r) => sum + (Number(r.bagsProduced ?? r.netAvailableBags) || 0),
    0,
  );
  const prodLeakages = runs.reduce(
    (sum, r) => sum + (Number(r.leakageBags) || 0),
    0,
  );
  const prodFree = runs.reduce((sum, r) => sum + (Number(r.freeBags) || 0), 0);

  const sales = (data.sales || []).filter((s) => s.date === targetDate);
  const totalSoldBags = sales.reduce(
    (sum, s) => sum + (Number(s.bagsSold ?? s.qty) || 0),
    0,
  );
  const salesLeakages = sales.reduce(
    (sum, s) => sum + (Number(s.leakageBags) || 0),
    0,
  );
  const salesFree = sales.reduce(
    (sum, s) => sum + (Number(s.freeBags) || 0),
    0,
  );

  const cashSales = sales.reduce((sum, s) => {
    if (s.cashAmount !== undefined && s.cashAmount !== null) {
      return sum + Number(s.cashAmount);
    }
    const method = (s.method || s.paymentMethod)?.toLowerCase();
    return method === "cash"
      ? sum + Number(s.totalAmount ?? s.amount ?? 0)
      : sum;
  }, 0);

  const momoPayments = sales.reduce((sum, s) => {
    if (s.momoAmount !== undefined && s.momoAmount !== null) {
      return sum + Number(s.momoAmount);
    }
    const method = (s.method || s.paymentMethod)?.toLowerCase();
    return method === "mobile money" || method === "momo"
      ? sum + Number(s.totalAmount ?? s.amount ?? 0)
      : sum;
  }, 0);

  const bankDepositsTotal = [
    ...(data.bankDeposits || []),
    ...(data.adminbankDeposits || []),
  ]
    .filter((d) => d.date === targetDate)
    .reduce((sum, d) => sum + (Number(d.amount) || 0), 0);

  const managerExp = (data.expenses || [])
    .filter((e) => e.date === targetDate)
    .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

  const adminExp = (data.adminExpenses || [])
    .filter((e) => e.date === targetDate)
    .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

  return {
    date: targetDate,
    dayName: info.day,
    formattedDate: info.date,
    isToday,
    rollsProduced,
    materialKg,
    packingBagsUsed,
    bagsProduced,
    leakages: prodLeakages + salesLeakages,
    freeGiveaways: prodFree + salesFree,
    totalSoldBags,
    cashSales,
    bankDeposits: bankDepositsTotal,
    momoPayments,
    expenditure: managerExp + adminExp,
  };
}

export function computeWeeklyMetrics(data = {}, referenceDate = todayISO()) {
  const parts = referenceDate.split("-");
  const refYear = parseInt(parts[0], 10);
  const refMonth = parseInt(parts[1], 10) - 1;
  const refDay = parseInt(parts[2], 10);
  const current = new Date(refYear, refMonth, refDay, 12, 0, 0);

  const dayOfWeek = current.getDay();
  const distanceToMonday = (dayOfWeek + 6) % 7;
  const monday = new Date(current);
  monday.setDate(current.getDate() - distanceToMonday);

  const days = [];

  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const dayStr = String(d.getDate()).padStart(2, "0");
    const dateISO = `${y}-${m}-${dayStr}`;

    days.push(computeDailyMetrics(data, dateISO));
  }

  const totals = days.reduce(
    (acc, day) => {
      acc.rollsProduced += day.rollsProduced;
      acc.materialKg += day.materialKg;
      acc.packingBagsUsed += day.packingBagsUsed;
      acc.bagsProduced += day.bagsProduced;
      acc.leakages += day.leakages;
      acc.freeGiveaways += day.freeGiveaways;
      acc.totalSoldBags += day.totalSoldBags;
      acc.cashSales += day.cashSales;
      acc.bankDeposits += day.bankDeposits;
      acc.momoPayments += day.momoPayments;
      acc.expenditure += day.expenditure;
      return acc;
    },
    {
      rollsProduced: 0,
      materialKg: 0,
      packingBagsUsed: 0,
      bagsProduced: 0,
      leakages: 0,
      freeGiveaways: 0,
      totalSoldBags: 0,
      cashSales: 0,
      bankDeposits: 0,
      momoPayments: 0,
      expenditure: 0,
    },
  );

  const startFormatted = formatDayAndDate(days[0].date).date;
  const endFormatted = formatDayAndDate(days[6].date).date;

  return {
    weekLabel: `Week of ${startFormatted} – ${endFormatted}`,
    startDate: days[0].date,
    endDate: days[6].date,
    days,
    totals,
  };
}

export function getTimeUntilMidnight() {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);

  const diffMs = midnight.getTime() - now.getTime();
  const totalSeconds = Math.max(0, Math.floor(diffMs / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const text = `${hours}h ${String(minutes).padStart(2, "0")}m ${String(seconds).padStart(2, "0")}s`;
  return { hours, minutes, seconds, text };
}
