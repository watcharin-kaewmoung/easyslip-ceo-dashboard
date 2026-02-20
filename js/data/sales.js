// ============================================
// EasySlip 2026 — Sales Pipeline Data
// ============================================

import { storage } from '../storage.js';

// ── Pipeline Stage Definitions ──

export const PIPELINE_STAGES = [
  { key: 'lead', label: 'Lead', labelEn: 'Lead', color: '#94a3b8' },
  { key: 'qualified', label: 'Qualified', labelEn: 'Qualified', color: '#3b82f6' },
  { key: 'proposal', label: 'Proposal', labelEn: 'Proposal', color: '#f97316' },
  { key: 'negotiation', label: 'Negotiation', labelEn: 'Negotiation', color: '#eab308' },
  { key: 'closed_won', label: 'Closed Won', labelEn: 'Closed Won', color: '#22c55e' },
  { key: 'closed_lost', label: 'Closed Lost', labelEn: 'Closed Lost', color: '#ef4444' },
];

// ── Default Data ──

const DEFAULT_MONTHLY_DEALS = Object.freeze([15, 18, 22, 20, 25, 28, 30, 27, 32, 35, 38, 40]);
const DEFAULT_MONTHLY_WON = Object.freeze([8, 10, 12, 11, 14, 16, 17, 15, 18, 20, 22, 24]);
const DEFAULT_MONTHLY_LOST = Object.freeze([4, 5, 6, 5, 7, 7, 8, 7, 8, 9, 10, 10]);
const DEFAULT_MONTHLY_REVENUE = Object.freeze([
  320000, 400000, 480000, 440000, 560000, 640000,
  680000, 600000, 720000, 800000, 880000, 960000,
]);
const DEFAULT_TARGETS = Object.freeze([
  350000, 380000, 420000, 450000, 500000, 550000,
  600000, 650000, 700000, 750000, 800000, 900000,
]);

// Pipeline snapshot (current stage counts)
const DEFAULT_PIPELINE = Object.freeze({
  lead: 45,
  qualified: 28,
  proposal: 15,
  negotiation: 8,
  closed_won: 0,
  closed_lost: 0,
});

// Sales reps
const DEFAULT_REPS = Object.freeze([
  { name: 'สมชาย', nameEn: 'Somchai', target: 2400000, actual: 2100000 },
  { name: 'สุดา', nameEn: 'Suda', target: 2400000, actual: 2650000 },
  { name: 'วิชัย', nameEn: 'Wichai', target: 2000000, actual: 1800000 },
  { name: 'นภา', nameEn: 'Napa', target: 1800000, actual: 1930000 },
]);

// Top customers
const DEFAULT_TOP_CUSTOMERS = Object.freeze([
  { name: 'Bangkok Bank', revenue: 960000, plan: 'Enterprise' },
  { name: 'SCB', revenue: 840000, plan: 'Enterprise' },
  { name: 'Kasikorn Bank', revenue: 720000, plan: 'Enterprise' },
  { name: 'Krungthai Bank', revenue: 600000, plan: 'Professional' },
  { name: 'TMBThanachart', revenue: 480000, plan: 'Professional' },
  { name: 'Central Group', revenue: 360000, plan: 'Professional' },
  { name: 'CP All', revenue: 300000, plan: 'Professional' },
  { name: 'PTT', revenue: 240000, plan: 'Standard' },
  { name: 'True Corp', revenue: 200000, plan: 'Standard' },
  { name: 'AIS', revenue: 180000, plan: 'Standard' },
]);

// Loss reasons
const DEFAULT_LOSS_REASONS = Object.freeze([
  { reason: 'ราคาสูงเกินไป', reasonEn: 'Price too high', count: 28, pct: 33 },
  { reason: 'เลือกคู่แข่ง', reasonEn: 'Chose competitor', count: 22, pct: 26 },
  { reason: 'ยังไม่พร้อม', reasonEn: 'Not ready yet', count: 15, pct: 18 },
  { reason: 'ไม่ตรงความต้องการ', reasonEn: 'Doesn\'t fit needs', count: 12, pct: 14 },
  { reason: 'อื่นๆ', reasonEn: 'Other', count: 8, pct: 9 },
]);

// ── Mutable Working Data ──

export const SALES = {
  monthlyDeals: [...DEFAULT_MONTHLY_DEALS],
  monthlyWon: [...DEFAULT_MONTHLY_WON],
  monthlyLost: [...DEFAULT_MONTHLY_LOST],
  monthlyRevenue: [...DEFAULT_MONTHLY_REVENUE],
  targets: [...DEFAULT_TARGETS],
  pipeline: { ...DEFAULT_PIPELINE },
  reps: DEFAULT_REPS.map(r => ({ ...r })),
  topCustomers: DEFAULT_TOP_CUSTOMERS.map(c => ({ ...c })),
  lossReasons: DEFAULT_LOSS_REASONS.map(r => ({ ...r })),

  // Computed
  annualRevenue: 0,
  annualTarget: 0,
  totalDeals: 0,
  totalWon: 0,
  totalLost: 0,
  conversionRate: 0,
  avgDealSize: 0,
  lastUpdated: null,
};

// ── Recalculate ──

export function recalcSales() {
  SALES.annualRevenue = SALES.monthlyRevenue.reduce((a, b) => a + b, 0);
  SALES.annualTarget = SALES.targets.reduce((a, b) => a + b, 0);
  SALES.totalDeals = SALES.monthlyDeals.reduce((a, b) => a + b, 0);
  SALES.totalWon = SALES.monthlyWon.reduce((a, b) => a + b, 0);
  SALES.totalLost = SALES.monthlyLost.reduce((a, b) => a + b, 0);
  SALES.conversionRate = SALES.totalDeals > 0
    ? (SALES.totalWon / SALES.totalDeals) * 100 : 0;
  SALES.avgDealSize = SALES.totalWon > 0
    ? SALES.annualRevenue / SALES.totalWon : 0;
}

// ── Persistence ──

const STORAGE_KEY = 'sales_2026';

export function saveSales() {
  SALES.lastUpdated = new Date().toISOString();
  storage.set(STORAGE_KEY, {
    monthlyDeals: [...SALES.monthlyDeals],
    monthlyWon: [...SALES.monthlyWon],
    monthlyLost: [...SALES.monthlyLost],
    monthlyRevenue: [...SALES.monthlyRevenue],
    targets: [...SALES.targets],
    pipeline: { ...SALES.pipeline },
    reps: SALES.reps.map(r => ({ ...r })),
    lastUpdated: SALES.lastUpdated,
  });
}

export function loadSales() {
  const saved = storage.get(STORAGE_KEY);
  if (!saved) { recalcSales(); return false; }

  const arrays = ['monthlyDeals', 'monthlyWon', 'monthlyLost', 'monthlyRevenue', 'targets'];
  arrays.forEach(key => {
    if (saved[key]) {
      for (let i = 0; i < 12; i++) SALES[key][i] = Number(saved[key][i]) || 0;
    }
  });
  if (saved.pipeline) Object.assign(SALES.pipeline, saved.pipeline);
  if (saved.reps) SALES.reps = saved.reps.map(r => ({ ...r }));
  SALES.lastUpdated = saved.lastUpdated || null;

  recalcSales();
  return true;
}

export function resetSales() {
  SALES.monthlyDeals.splice(0, 12, ...DEFAULT_MONTHLY_DEALS);
  SALES.monthlyWon.splice(0, 12, ...DEFAULT_MONTHLY_WON);
  SALES.monthlyLost.splice(0, 12, ...DEFAULT_MONTHLY_LOST);
  SALES.monthlyRevenue.splice(0, 12, ...DEFAULT_MONTHLY_REVENUE);
  SALES.targets.splice(0, 12, ...DEFAULT_TARGETS);
  Object.assign(SALES.pipeline, DEFAULT_PIPELINE);
  SALES.reps = DEFAULT_REPS.map(r => ({ ...r }));
  SALES.topCustomers = DEFAULT_TOP_CUSTOMERS.map(c => ({ ...c }));
  SALES.lossReasons = DEFAULT_LOSS_REASONS.map(r => ({ ...r }));
  recalcSales();
  storage.remove(STORAGE_KEY);
}

// Init
loadSales();
