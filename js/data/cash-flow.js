// ============================================
// EasySlip 2026 — Cash Flow Data (Sheet 10)
// ============================================

import { REVENUE } from './revenue.js';
import { TOTAL_MONTHLY_COST } from './expenses.js';

// Opening balance (start of FY2026)
export const OPENING_BALANCE = 3500000; // ฿3.5M

// Collection rate assumptions
export const COLLECTION_RATE = 0.85; // 85% collected in same month
export const DELAYED_RATE = 0.15;    // 15% collected next month

// Calculate inflows (with delayed collection)
export function calculateInflows(collectionRate = COLLECTION_RATE) {
  const delayed = 1 - collectionRate;
  const inflows = REVENUE.total.map((rev, i) => {
    const immediate = Math.round(rev * collectionRate);
    const delayedPrev = i > 0 ? Math.round(REVENUE.total[i-1] * delayed) : 0;
    return immediate + delayedPrev;
  });
  return inflows;
}

// Outflows = total costs
export function calculateOutflows() {
  return [...TOTAL_MONTHLY_COST];
}

// Net cash flow per month
export function calculateNetCashFlow(collectionRate = COLLECTION_RATE) {
  const inflows = calculateInflows(collectionRate);
  const outflows = calculateOutflows();
  return inflows.map((inf, i) => inf - outflows[i]);
}

// Cumulative cash balance
export function calculateCumulativeBalance(collectionRate = COLLECTION_RATE) {
  const netFlow = calculateNetCashFlow(collectionRate);
  let balance = OPENING_BALANCE;
  return netFlow.map(nf => {
    balance += nf;
    return balance;
  });
}

// Closing balance
export function getClosingBalance(collectionRate = COLLECTION_RATE) {
  const balances = calculateCumulativeBalance(collectionRate);
  return balances[11];
}

// Reserve months calculation
export function getReserveMonths(collectionRate = COLLECTION_RATE) {
  const closing = getClosingBalance(collectionRate);
  const avgMonthlyExpense = TOTAL_MONTHLY_COST.reduce((a, b) => a + b, 0) / 12;
  if (!avgMonthlyExpense) return closing > 0 ? 99 : 0;
  return closing / avgMonthlyExpense;
}

// Tax heavy months
export const TAX_HEAVY_MONTHS = Object.freeze([
  { month: 4, label: 'พ.ค.', labelEn: 'May', amount: 457000, description: 'CIT กลางปี', descriptionEn: 'Mid-year CIT' },
  { month: 7, label: 'ส.ค.', labelEn: 'Aug', amount: 371000, description: 'PND.51', descriptionEn: 'PND.51' },
  { month: 8, label: 'ก.ย.', labelEn: 'Sep', amount: 536000, description: 'สิ้นสุด Q3', descriptionEn: 'End of Q3' },
  { month: 11, label: 'ธ.ค.', labelEn: 'Dec', amount: 680000, description: 'ปิดงบปลายปี', descriptionEn: 'Year-end closing' },
]);

// Pre-computed default values
export const DEFAULT_INFLOWS = Object.freeze(calculateInflows());
export const DEFAULT_OUTFLOWS = Object.freeze(calculateOutflows());
export const DEFAULT_NET_FLOW = Object.freeze(calculateNetCashFlow());
export const DEFAULT_BALANCE = Object.freeze(calculateCumulativeBalance());
