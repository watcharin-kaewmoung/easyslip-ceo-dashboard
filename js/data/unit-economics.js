// ============================================
// EasySlip 2026 — Unit Economics Data (Sheet 9)
// ============================================

import { REVENUE } from './revenue.js';
import { TOTAL_MONTHLY_COST, ANNUAL_TOTAL_COST } from './expenses.js';

// Estimated transaction volumes per channel (monthly)
export const TRANSACTIONS = Object.freeze({
  bot: Object.freeze([4400, 4400, 4500, 4500, 4600, 4600, 4600, 4700, 4700, 4800, 4800, 4900]),
  api: Object.freeze([960000, 974400, 989016, 1003851, 1018909, 1034193, 1049712, 1065458, 1081441, 1097663, 1114128, 1130840]),
  crm: Object.freeze([0, 0, 0, 500, 665, 885, 1176, 1564, 2080, 2767, 3680, 4896]),
  sms: Object.freeze([0, 0, 0, 0, 1000, 1585, 2512, 3982, 6311, 10003, 15855, 25130]),
});

// Revenue per transaction
export function getRevenuePerTransaction() {
  return {
    bot: REVENUE.bot.map((r, i) => TRANSACTIONS.bot[i] > 0 ? r / TRANSACTIONS.bot[i] : 0),
    api: REVENUE.api.map((r, i) => TRANSACTIONS.api[i] > 0 ? r / TRANSACTIONS.api[i] : 0),
    crm: REVENUE.crm.map((r, i) => TRANSACTIONS.crm[i] > 0 ? r / TRANSACTIONS.crm[i] : 0),
    sms: REVENUE.sms.map((r, i) => TRANSACTIONS.sms[i] > 0 ? r / TRANSACTIONS.sms[i] : 0),
  };
}

// Gross margin per month
export function getGrossMargin() {
  return REVENUE.total.map((rev, i) => {
    const cost = TOTAL_MONTHLY_COST[i];
    return rev > 0 ? ((rev - cost) / rev) * 100 : 0;
  });
}

// Annual metrics
export function getAnnualMetrics() {
  const totalRev = REVENUE.annualTotal;
  const totalCost = ANNUAL_TOTAL_COST;
  const profit = totalRev - totalCost;
  const margin = (profit / totalRev) * 100;
  const totalTx = Object.values(TRANSACTIONS).reduce(
    (sum, ch) => sum + ch.reduce((a, b) => a + b, 0), 0
  );
  return {
    totalRevenue: totalRev,
    totalCost,
    netProfit: profit,
    margin,
    totalTransactions: totalTx,
    revenuePerTx: totalRev / totalTx,
    costPerTx: totalCost / totalTx,
    profitPerTx: profit / totalTx,
  };
}

// Break-even analysis
export function getBreakEvenPoint() {
  // Fixed costs (salary + social + accounting + office + insurance + other)
  const fixedMonthly = 150000 + 2250 + 5000 + 8000 + 3750 + 15000; // ฿184,000/mo
  const variableRatio = 0.2427 + 0.02; // system cost + contingency = ~26.27%
  const contributionMargin = 1 - variableRatio;
  const breakEvenRevenue = fixedMonthly / contributionMargin;
  return {
    fixedCostsMonthly: fixedMonthly,
    variableRatio,
    contributionMargin,
    breakEvenRevenue: Math.round(breakEvenRevenue),
    safetyMargin: REVENUE.total.map(rev =>
      ((rev - breakEvenRevenue) / rev) * 100
    ),
  };
}
