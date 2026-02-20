// ============================================
// EasySlip 2026 — HR & People Data
// ============================================

import { storage } from '../storage.js';

// ── Department Definitions ──

export const DEPARTMENTS = [
  { key: 'engineering', label: 'Engineering', labelEn: 'Engineering', color: '#3b82f6', icon: 'code-2' },
  { key: 'product', label: 'Product', labelEn: 'Product', color: '#22c55e', icon: 'package' },
  { key: 'sales', label: 'Sales', labelEn: 'Sales', color: '#f97316', icon: 'trending-up' },
  { key: 'marketing', label: 'Marketing', labelEn: 'Marketing', color: '#a855f7', icon: 'megaphone' },
  { key: 'support', label: 'Support', labelEn: 'Support', color: '#ec4899', icon: 'headphones' },
  { key: 'admin', label: 'Admin/HR', labelEn: 'Admin/HR', color: '#06b6d4', icon: 'building-2' },
];

// ── Default Data ──

const DEFAULT_HEADCOUNT = Object.freeze({
  engineering: 12,
  product: 4,
  sales: 6,
  marketing: 4,
  support: 5,
  admin: 3,
});

const DEFAULT_MONTHLY_HEADCOUNT = Object.freeze([32, 32, 33, 33, 34, 34, 35, 35, 36, 36, 37, 38]);

const DEFAULT_PAYROLL = Object.freeze([
  1250000, 1250000, 1280000, 1280000, 1310000, 1310000,
  1340000, 1340000, 1370000, 1370000, 1400000, 1400000,
]);

const DEFAULT_BONUS = Object.freeze([0, 0, 0, 0, 0, 250000, 0, 0, 0, 0, 0, 500000]);
const DEFAULT_SOCIAL_SECURITY = Object.freeze([
  62500, 62500, 64000, 64000, 65500, 65500,
  67000, 67000, 68500, 68500, 70000, 70000,
]);

const DEFAULT_HIRING_PLAN = Object.freeze([1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 1]);
const DEFAULT_HIRING_ACTUAL = Object.freeze([1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 0, 0]);
const DEFAULT_RESIGNATIONS = Object.freeze([0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0]);

const DEFAULT_TRAINING_BUDGET = Object.freeze([
  30000, 25000, 35000, 20000, 40000, 30000,
  25000, 35000, 45000, 30000, 25000, 40000,
]);

// ── Mutable Working Data ──

export const HR = {
  headcount: { ...DEFAULT_HEADCOUNT },
  monthlyHeadcount: [...DEFAULT_MONTHLY_HEADCOUNT],
  payroll: [...DEFAULT_PAYROLL],
  bonus: [...DEFAULT_BONUS],
  socialSecurity: [...DEFAULT_SOCIAL_SECURITY],
  hiringPlan: [...DEFAULT_HIRING_PLAN],
  hiringActual: [...DEFAULT_HIRING_ACTUAL],
  resignations: [...DEFAULT_RESIGNATIONS],
  trainingBudget: [...DEFAULT_TRAINING_BUDGET],

  // Computed
  totalHeadcount: 0,
  annualPayroll: 0,
  annualBonus: 0,
  annualSocialSecurity: 0,
  annualTotalCost: 0,
  avgSalary: 0,
  totalPlannedHires: 0,
  totalActualHires: 0,
  totalResignations: 0,
  turnoverRate: 0,
  annualTrainingBudget: 0,
  trainingPerHead: 0,
  lastUpdated: null,
};

// ── Recalculate ──

export function recalcHR() {
  HR.totalHeadcount = Object.values(HR.headcount).reduce((a, b) => a + b, 0);
  HR.annualPayroll = HR.payroll.reduce((a, b) => a + b, 0);
  HR.annualBonus = HR.bonus.reduce((a, b) => a + b, 0);
  HR.annualSocialSecurity = HR.socialSecurity.reduce((a, b) => a + b, 0);
  HR.annualTotalCost = HR.annualPayroll + HR.annualBonus + HR.annualSocialSecurity;
  HR.avgSalary = HR.totalHeadcount > 0 ? HR.payroll[HR.payroll.length - 1] / HR.totalHeadcount : 0;
  HR.totalPlannedHires = HR.hiringPlan.reduce((a, b) => a + b, 0);
  HR.totalActualHires = HR.hiringActual.reduce((a, b) => a + b, 0);
  HR.totalResignations = HR.resignations.reduce((a, b) => a + b, 0);
  const avgHeadcount = HR.monthlyHeadcount.reduce((a, b) => a + b, 0) / 12;
  HR.turnoverRate = avgHeadcount > 0 ? (HR.totalResignations / avgHeadcount) * 100 : 0;
  HR.annualTrainingBudget = HR.trainingBudget.reduce((a, b) => a + b, 0);
  HR.trainingPerHead = HR.totalHeadcount > 0 ? HR.annualTrainingBudget / HR.totalHeadcount : 0;
}

// ── Persistence ──

const STORAGE_KEY = 'hr_2026';

export function saveHR() {
  HR.lastUpdated = new Date().toISOString();
  storage.set(STORAGE_KEY, {
    headcount: { ...HR.headcount },
    monthlyHeadcount: [...HR.monthlyHeadcount],
    payroll: [...HR.payroll],
    bonus: [...HR.bonus],
    socialSecurity: [...HR.socialSecurity],
    hiringPlan: [...HR.hiringPlan],
    hiringActual: [...HR.hiringActual],
    resignations: [...HR.resignations],
    trainingBudget: [...HR.trainingBudget],
    lastUpdated: HR.lastUpdated,
  });
}

export function loadHR() {
  const saved = storage.get(STORAGE_KEY);
  if (!saved) { recalcHR(); return false; }

  if (saved.headcount) Object.assign(HR.headcount, saved.headcount);
  const arrays = ['monthlyHeadcount', 'payroll', 'bonus', 'socialSecurity',
    'hiringPlan', 'hiringActual', 'resignations', 'trainingBudget'];
  arrays.forEach(key => {
    if (saved[key]) {
      for (let i = 0; i < 12; i++) HR[key][i] = Number(saved[key][i]) || 0;
    }
  });
  HR.lastUpdated = saved.lastUpdated || null;

  recalcHR();
  return true;
}

export function resetHR() {
  Object.assign(HR.headcount, DEFAULT_HEADCOUNT);
  HR.monthlyHeadcount.splice(0, 12, ...DEFAULT_MONTHLY_HEADCOUNT);
  HR.payroll.splice(0, 12, ...DEFAULT_PAYROLL);
  HR.bonus.splice(0, 12, ...DEFAULT_BONUS);
  HR.socialSecurity.splice(0, 12, ...DEFAULT_SOCIAL_SECURITY);
  HR.hiringPlan.splice(0, 12, ...DEFAULT_HIRING_PLAN);
  HR.hiringActual.splice(0, 12, ...DEFAULT_HIRING_ACTUAL);
  HR.resignations.splice(0, 12, ...DEFAULT_RESIGNATIONS);
  HR.trainingBudget.splice(0, 12, ...DEFAULT_TRAINING_BUDGET);
  recalcHR();
  storage.remove(STORAGE_KEY);
}

// Init
loadHR();
