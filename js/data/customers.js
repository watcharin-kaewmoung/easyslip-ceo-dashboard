// ============================================
// EasySlip 2026 — Customer & Subscription Data
// ============================================

import { storage } from '../storage.js';

// ── Plan Definitions ──

export const PLANS = [
  { key: 'free', label: 'Free', labelEn: 'Free', color: '#94a3b8' },
  { key: 'starter', label: 'Starter', labelEn: 'Starter', color: '#3b82f6' },
  { key: 'professional', label: 'Professional', labelEn: 'Professional', color: '#22c55e' },
  { key: 'enterprise', label: 'Enterprise', labelEn: 'Enterprise', color: '#a855f7' },
];

// ── Default Data ──

const DEFAULT_CUSTOMERS_FREE = Object.freeze([1200, 1280, 1350, 1420, 1500, 1580, 1650, 1720, 1800, 1880, 1950, 2050]);
const DEFAULT_CUSTOMERS_STARTER = Object.freeze([180, 195, 210, 225, 240, 260, 278, 295, 315, 335, 355, 380]);
const DEFAULT_CUSTOMERS_PRO = Object.freeze([45, 48, 52, 55, 58, 62, 66, 70, 75, 80, 85, 92]);
const DEFAULT_CUSTOMERS_ENT = Object.freeze([8, 8, 9, 9, 10, 10, 11, 11, 12, 12, 13, 14]);

const DEFAULT_CHURN_RATE = Object.freeze([3.2, 2.8, 3.0, 2.5, 2.9, 2.4, 2.6, 2.3, 2.1, 2.0, 1.8, 1.7]); // %
const DEFAULT_MRR = Object.freeze([
  245000, 268000, 292000, 310000, 335000, 362000,
  388000, 415000, 448000, 480000, 515000, 558000,
]);
const DEFAULT_CAC = Object.freeze([
  1200, 1150, 1100, 1080, 1050, 1020,
  980, 960, 940, 910, 890, 860,
]);
const DEFAULT_NEW_CUSTOMERS = Object.freeze([95, 102, 110, 115, 125, 135, 140, 148, 158, 168, 178, 195]);

// Cohort retention (month 0 = 100%, then retention % for months 1-6)
const DEFAULT_COHORTS = Object.freeze([
  { label: 'Jan', data: [100, 82, 75, 70, 68, 65, 63] },
  { label: 'Feb', data: [100, 84, 77, 72, 69, 67, 64] },
  { label: 'Mar', data: [100, 85, 78, 73, 70, 68, 0] },
  { label: 'Apr', data: [100, 83, 76, 71, 69, 0, 0] },
  { label: 'May', data: [100, 86, 79, 74, 0, 0, 0] },
  { label: 'Jun', data: [100, 87, 80, 0, 0, 0, 0] },
]);

// ── Mutable Working Data ──

export const CUSTOMERS = {
  free: [...DEFAULT_CUSTOMERS_FREE],
  starter: [...DEFAULT_CUSTOMERS_STARTER],
  professional: [...DEFAULT_CUSTOMERS_PRO],
  enterprise: [...DEFAULT_CUSTOMERS_ENT],
  churnRate: [...DEFAULT_CHURN_RATE],
  mrr: [...DEFAULT_MRR],
  cac: [...DEFAULT_CAC],
  newCustomers: [...DEFAULT_NEW_CUSTOMERS],
  cohorts: DEFAULT_COHORTS.map(c => ({ label: c.label, data: [...c.data] })),

  // Computed
  totalByMonth: new Array(12).fill(0),
  paidByMonth: new Array(12).fill(0),
  annualMRR: 0,
  arr: 0,
  avgChurn: 0,
  avgCAC: 0,
  ltv: 0,
  ltvCacRatio: 0,
  totalNewCustomers: 0,
  lastUpdated: null,
};

// ── Recalculate ──

export function recalcCustomers() {
  for (let i = 0; i < 12; i++) {
    CUSTOMERS.totalByMonth[i] = CUSTOMERS.free[i] + CUSTOMERS.starter[i] +
      CUSTOMERS.professional[i] + CUSTOMERS.enterprise[i];
    CUSTOMERS.paidByMonth[i] = CUSTOMERS.starter[i] +
      CUSTOMERS.professional[i] + CUSTOMERS.enterprise[i];
  }

  CUSTOMERS.annualMRR = CUSTOMERS.mrr.reduce((a, b) => a + b, 0);
  CUSTOMERS.arr = (CUSTOMERS.mrr[11] || CUSTOMERS.mrr[CUSTOMERS.mrr.length - 1]) * 12;
  CUSTOMERS.avgChurn = CUSTOMERS.churnRate.reduce((a, b) => a + b, 0) / 12;
  CUSTOMERS.avgCAC = CUSTOMERS.cac.reduce((a, b) => a + b, 0) / 12;
  CUSTOMERS.totalNewCustomers = CUSTOMERS.newCustomers.reduce((a, b) => a + b, 0);

  // LTV = ARPU / monthly churn rate
  const avgMRR = CUSTOMERS.annualMRR / 12;
  const avgPaidCustomers = CUSTOMERS.paidByMonth.reduce((a, b) => a + b, 0) / 12;
  const arpu = avgPaidCustomers > 0 ? avgMRR / avgPaidCustomers : 0;
  const monthlyChurn = CUSTOMERS.avgChurn / 100;
  CUSTOMERS.ltv = monthlyChurn > 0 ? arpu / monthlyChurn : 0;
  CUSTOMERS.ltvCacRatio = CUSTOMERS.avgCAC > 0 ? CUSTOMERS.ltv / CUSTOMERS.avgCAC : 0;
}

// ── Persistence ──

const STORAGE_KEY = 'customers_2026';

export function saveCustomers() {
  CUSTOMERS.lastUpdated = new Date().toISOString();
  storage.set(STORAGE_KEY, {
    free: [...CUSTOMERS.free],
    starter: [...CUSTOMERS.starter],
    professional: [...CUSTOMERS.professional],
    enterprise: [...CUSTOMERS.enterprise],
    churnRate: [...CUSTOMERS.churnRate],
    mrr: [...CUSTOMERS.mrr],
    cac: [...CUSTOMERS.cac],
    newCustomers: [...CUSTOMERS.newCustomers],
    lastUpdated: CUSTOMERS.lastUpdated,
  });
}

export function loadCustomers() {
  const saved = storage.get(STORAGE_KEY);
  if (!saved) { recalcCustomers(); return false; }

  const arrays = ['free', 'starter', 'professional', 'enterprise', 'churnRate', 'mrr', 'cac', 'newCustomers'];
  arrays.forEach(key => {
    if (saved[key]) {
      for (let i = 0; i < 12; i++) CUSTOMERS[key][i] = Number(saved[key][i]) || 0;
    }
  });
  CUSTOMERS.lastUpdated = saved.lastUpdated || null;

  recalcCustomers();
  return true;
}

export function resetCustomers() {
  CUSTOMERS.free.splice(0, 12, ...DEFAULT_CUSTOMERS_FREE);
  CUSTOMERS.starter.splice(0, 12, ...DEFAULT_CUSTOMERS_STARTER);
  CUSTOMERS.professional.splice(0, 12, ...DEFAULT_CUSTOMERS_PRO);
  CUSTOMERS.enterprise.splice(0, 12, ...DEFAULT_CUSTOMERS_ENT);
  CUSTOMERS.churnRate.splice(0, 12, ...DEFAULT_CHURN_RATE);
  CUSTOMERS.mrr.splice(0, 12, ...DEFAULT_MRR);
  CUSTOMERS.cac.splice(0, 12, ...DEFAULT_CAC);
  CUSTOMERS.newCustomers.splice(0, 12, ...DEFAULT_NEW_CUSTOMERS);
  CUSTOMERS.cohorts = DEFAULT_COHORTS.map(c => ({ label: c.label, data: [...c.data] }));
  recalcCustomers();
  storage.remove(STORAGE_KEY);
}

// Init
loadCustomers();
