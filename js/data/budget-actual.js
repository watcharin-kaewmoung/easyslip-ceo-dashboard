// ============================================
// EasySlip 2026 — Budget vs Actual (Sheet 8)
// Budget = mutable singleton (editable targets, persisted to localStorage), Actual = editable via localStorage
// Note: Budget diverges from revenue.js by ~3.3% annual (budget: ฿71.25M vs projection: ฿73.65M)
// This is intentional — budget uses conservative CRM/SMS growth assumptions
// v5: per-category budget cost targets — Feb 2026
// ============================================

import { storage } from '../storage.js';
import { showToast } from '../components/toast.js';
import { EXPENSE_CATEGORIES } from './constants.js';
import { SUB_ITEM_DEFS, DETAILED_CATEGORIES } from './expenses.js';

function getCostKeys() { return EXPENSE_CATEGORIES.map(c => c.key); }
const PRODUCT_KEYS = ['bot', 'api', 'crm', 'sms'];

// Budget defaults (for reset)
const DEFAULT_BUDGET_REVENUE = Object.freeze([
  4822000, 4894000, 4967580, 5191756, 5377055, 5585328,
  5824454, 6140317, 6455419, 6842614, 7290804, 7858939
]);
const DEFAULT_BUDGET_REVENUE_BY_CHANNEL = Object.freeze({
  bot: Object.freeze([22000, 22000, 22500, 22500, 23000, 23000, 23000, 23500, 23500, 24000, 24000, 24500]),
  api: Object.freeze([4800000, 4872000, 4945080, 5019256, 5094555, 5170993, 5248558, 5327286, 5407206, 5488314, 5570639, 5654199]),
  crm: Object.freeze([0, 0, 0, 150000, 199500, 265335, 352896, 469431, 624323, 830350, 1104365, 1468806]),
  sms: Object.freeze([0, 0, 0, 0, 80000, 126800, 200978, 318550, 504901, 800268, 1268425, 2010434]),
});

const DEFAULT_BUDGET_COST = Object.freeze([
  1903869, 1922782, 2007009, 2050809, 2505376, 2060437,
  2094721, 2383755, 2547283, 2165180, 2223546, 2884937
]);

// Per-category budget cost defaults (sums to DEFAULT_BUDGET_COST per month)
const DEFAULT_BUDGET_COST_BY_CAT = Object.freeze({
  system_cost:  Object.freeze([1170096, 1187569, 1205325, 1259641, 1310124, 1357403, 1414232, 1467680, 1524143, 1583284, 1645177, 1734378]),
  salary:       Object.freeze([150000, 150000, 150000, 150000, 150000, 150000, 150000, 150000, 150000, 150000, 150000, 150000]),
  marketing:    Object.freeze([333333, 333333, 333334, 373333, 373333, 373334, 340000, 340000, 340000, 620000, 620000, 620000]),
  tax:          Object.freeze([120000, 120000, 185000, 130000, 457000, 135000, 140000, 371000, 536000, 148000, 155000, 680000]),
  contingency:  Object.freeze([96440, 97880, 99350, 103835, 107919, 111707, 116489, 121075, 125890, 130896, 139369, 151559]),
  admin:        Object.freeze([34000, 34000, 34000, 34000, 34000, 34000, 34000, 34000, 34000, 34000, 34000, 34000]),
});

// Build default sub-item budget details from category defaults + sub-item proportions
function buildDefaultBudgetDetails() {
  const details = {};
  for (const cat of DETAILED_CATEGORIES) {
    const def = SUB_ITEM_DEFS[cat];
    if (!def) continue;
    details[cat] = {};
    for (const item of def.items) {
      if (def.type === 'pct') {
        details[cat][item.key] = DEFAULT_BUDGET_COST_BY_CAT[cat].map(v => Math.round(v * (item.defaultPct ?? 0)));
      } else {
        details[cat][item.key] = Array(12).fill(item.defaultAmount ?? 0);
      }
    }
  }
  return details;
}

// Mutable budget singleton — v5: per-category cost
export const BUDGET = {
  revenue: [...DEFAULT_BUDGET_REVENUE],
  revenueByChannel: {
    bot: [...DEFAULT_BUDGET_REVENUE_BY_CHANNEL.bot],
    api: [...DEFAULT_BUDGET_REVENUE_BY_CHANNEL.api],
    crm: [...DEFAULT_BUDGET_REVENUE_BY_CHANNEL.crm],
    sms: [...DEFAULT_BUDGET_REVENUE_BY_CHANNEL.sms],
  },
  cost: {
    system_cost: [...DEFAULT_BUDGET_COST_BY_CAT.system_cost],
    salary:      [...DEFAULT_BUDGET_COST_BY_CAT.salary],
    marketing:   [...DEFAULT_BUDGET_COST_BY_CAT.marketing],
    tax:         [...DEFAULT_BUDGET_COST_BY_CAT.tax],
    contingency: [...DEFAULT_BUDGET_COST_BY_CAT.contingency],
    admin:       [...DEFAULT_BUDGET_COST_BY_CAT.admin],
  },
  costDetails: buildDefaultBudgetDetails(),   // { system_cost: { cloud: [12], server: [12], ... }, ... }
  costTotal: [],       // computed [12] — sum of all categories per month
  profit: [],
  annualRevenue: 0,
  annualCost: 0,       // sum of costTotal — backward compat
  annualProfit: 0,
};

const BUDGET_KEY = 'budget_targets_2026';

/** Recompute BUDGET.revenue[i] from per-channel sums */
export function recalcBudgetRevenue() {
  for (let i = 0; i < 12; i++) {
    BUDGET.revenue[i] = PRODUCT_KEYS.reduce((s, k) => s + (BUDGET.revenueByChannel[k]?.[i] || 0), 0);
  }
}

export function recalcBudget() {
  recalcBudgetRevenue();
  BUDGET.annualRevenue = BUDGET.revenue.reduce((a, b) => a + b, 0);
  const keys = getCostKeys();
  BUDGET.costTotal = new Array(12).fill(0);
  for (let i = 0; i < 12; i++) {
    for (const k of keys) BUDGET.costTotal[i] += BUDGET.cost[k]?.[i] || 0;
  }
  BUDGET.annualCost = BUDGET.costTotal.reduce((a, b) => a + b, 0);
  BUDGET.profit = BUDGET.revenue.map((r, i) => r - BUDGET.costTotal[i]);
  BUDGET.annualProfit = BUDGET.annualRevenue - BUDGET.annualCost;
}

// Sum sub-item budget details → write to BUDGET.cost[cat]
export function recalcBudgetFromDetails(cat) {
  const subs = BUDGET.costDetails[cat];
  if (!subs) return;
  for (let i = 0; i < 12; i++) {
    BUDGET.cost[cat][i] = Object.values(subs).reduce((sum, arr) => sum + (arr[i] || 0), 0);
  }
}

export function saveBudget() {
  const costObj = {};
  for (const k of getCostKeys()) costObj[k] = [...BUDGET.cost[k]];
  const costDetailsObj = {};
  for (const cat of DETAILED_CATEGORIES) {
    if (BUDGET.costDetails[cat]) {
      costDetailsObj[cat] = {};
      for (const sub of Object.keys(BUDGET.costDetails[cat])) {
        costDetailsObj[cat][sub] = [...BUDGET.costDetails[cat][sub]];
      }
    }
  }
  const revByChannel = {};
  for (const k of PRODUCT_KEYS) revByChannel[k] = [...BUDGET.revenueByChannel[k]];
  storage.set(BUDGET_KEY, {
    version: 4,
    revenue: [...BUDGET.revenue],
    revenueByChannel: revByChannel,
    cost: costObj,
    costDetails: costDetailsObj,
    lastUpdated: new Date().toISOString(),
  });
}

// Helper: compute costDetails from category totals using default proportions
function computeCostDetailsFromCategoryTotals() {
  const defaults = buildDefaultBudgetDetails();
  for (const cat of DETAILED_CATEGORIES) {
    if (!defaults[cat]) continue;
    BUDGET.costDetails[cat] = {};
    const def = SUB_ITEM_DEFS[cat];
    if (!def) continue;
    for (const item of def.items) {
      if (def.type === 'pct') {
        BUDGET.costDetails[cat][item.key] = BUDGET.cost[cat].map(v => Math.round(v * (item.defaultPct ?? 0)));
      } else {
        BUDGET.costDetails[cat][item.key] = Array(12).fill(item.defaultAmount ?? 0);
      }
    }
  }
}

export function loadBudget() {
  const saved = storage.get(BUDGET_KEY);
  if (!saved) return false;

  // v4 or v3: per-category cost + costDetails (+ optional revenueByChannel)
  if ((saved.version === 4 || saved.version === 3) && saved.cost?.system_cost?.length === 12) {
    for (const k of getCostKeys()) {
      if (saved.cost[k]?.length === 12) {
        for (let i = 0; i < 12; i++) BUDGET.cost[k][i] = Number(saved.cost[k][i]) || 0;
      }
    }
    // Load per-channel revenue budget (v4) or migrate from total (v3)
    if (saved.revenueByChannel) {
      for (const k of PRODUCT_KEYS) {
        if (saved.revenueByChannel[k]?.length === 12) {
          for (let i = 0; i < 12; i++) BUDGET.revenueByChannel[k][i] = Number(saved.revenueByChannel[k][i]) || 0;
        }
      }
    } else if (saved.revenue?.length === 12) {
      // v3 migration: distribute saved total proportionally
      for (let i = 0; i < 12; i++) {
        const savedTotal = Number(saved.revenue[i]) || 0;
        const defTotal = DEFAULT_BUDGET_REVENUE[i];
        for (const k of PRODUCT_KEYS) {
          const defCh = DEFAULT_BUDGET_REVENUE_BY_CHANNEL[k][i];
          BUDGET.revenueByChannel[k][i] = defTotal > 0 ? Math.round(savedTotal * defCh / defTotal) : 0;
        }
      }
    }
    // Load costDetails
    if (saved.costDetails) {
      for (const cat of DETAILED_CATEGORIES) {
        if (saved.costDetails[cat]) {
          if (!BUDGET.costDetails[cat]) BUDGET.costDetails[cat] = {};
          const def = SUB_ITEM_DEFS[cat];
          if (def) {
            for (const item of def.items) {
              if (saved.costDetails[cat][item.key]?.length === 12) {
                BUDGET.costDetails[cat][item.key] = saved.costDetails[cat][item.key].map(v => Number(v) || 0);
              }
            }
          }
        }
      }
    }
    recalcBudget();
    return true;
  }

  // v2: per-category cost object → compute costDetails from proportions
  if (saved.version === 2 && saved.cost?.system_cost?.length === 12) {
    for (const k of getCostKeys()) {
      if (saved.cost[k]?.length === 12) {
        for (let i = 0; i < 12; i++) BUDGET.cost[k][i] = Number(saved.cost[k][i]) || 0;
      }
    }
    if (saved.revenue?.length === 12) {
      for (let i = 0; i < 12; i++) BUDGET.revenue[i] = Number(saved.revenue[i]) || 0;
    }
    computeCostDetailsFromCategoryTotals();
    recalcBudget();
    return true;
  }

  // v1: flat cost array → distribute to categories then to sub-items
  if (saved.cost?.length === 12) {
    if (saved.revenue?.length === 12) {
      for (let i = 0; i < 12; i++) BUDGET.revenue[i] = Number(saved.revenue[i]) || 0;
    }
    for (let i = 0; i < 12; i++) {
      const oldTotal = Number(saved.cost[i]) || 0;
      const defTotal = DEFAULT_BUDGET_COST[i];
      for (const k of getCostKeys()) {
        const defCat = DEFAULT_BUDGET_COST_BY_CAT[k]?.[i] || 0;
        BUDGET.cost[k][i] = defTotal > 0 ? Math.round(oldTotal * defCat / defTotal) : 0;
      }
    }
    computeCostDetailsFromCategoryTotals();
    recalcBudget();
    return true;
  }

  return false;
}

export function resetBudget() {
  for (const k of getCostKeys()) {
    if (BUDGET.cost[k]) BUDGET.cost[k].fill(0);
    else BUDGET.cost[k] = new Array(12).fill(0);
  }
  for (const cat of DETAILED_CATEGORIES) {
    if (BUDGET.costDetails[cat]) {
      for (const sub of Object.keys(BUDGET.costDetails[cat])) {
        BUDGET.costDetails[cat][sub].fill(0);
      }
    }
  }
  for (const k of PRODUCT_KEYS) {
    if (BUDGET.revenueByChannel[k]) BUDGET.revenueByChannel[k].fill(0);
  }
  recalcBudget();
  storage.remove(BUDGET_KEY);
}

export function getLastSavedBudget() {
  const saved = storage.get(BUDGET_KEY);
  return saved?.lastUpdated || null;
}

// Init: compute from defaults, then override with saved data if exists
recalcBudget();
loadBudget();

const STORAGE_KEY = 'actual_2026';

function zeroes() { return new Array(12).fill(0); }

// Default actual = all zeros (not entered yet)
function defaultActual() {
  const rev = {};
  PRODUCT_KEYS.forEach(k => { rev[k] = zeroes(); });
  const cost = {};
  getCostKeys().forEach(k => { cost[k] = zeroes(); });
  return { revenue: rev, cost };
}

// Sum per-product revenue into a flat [12] array
export function getActualRevenueTotal(actual) {
  return zeroes().map((_, i) =>
    PRODUCT_KEYS.reduce((s, k) => s + actual.revenue[k][i], 0)
  );
}

// Sum per-category cost into a flat [12] array
export function getActualCostTotal(actual) {
  return zeroes().map((_, i) =>
    getCostKeys().reduce((s, k) => s + actual.cost[k][i], 0)
  );
}

// Keys that were merged into 'admin' in v4
const OLD_ADMIN_KEYS = ['social_security', 'accounting', 'insurance', 'office', 'other'];

// Get actual data (from localStorage or defaults) — handles v1/v2/v3→v4 migration
export function getActual() {
  const saved = storage.get(STORAGE_KEY);
  if (!saved || !saved.revenue || !saved.cost) return defaultActual();

  // v4 format: 6 cost categories (with admin key)
  if (saved.version === 4 && saved.revenue.bot && saved.cost.system_cost) {
    const rev = {};
    PRODUCT_KEYS.forEach(k => { rev[k] = (saved.revenue[k] || zeroes()).map(Number); });
    const cost = {};
    getCostKeys().forEach(k => { cost[k] = (saved.cost[k] || zeroes()).map(Number); });
    return { revenue: rev, cost };
  }

  // v3 format: 10 cost categories → merge 5 into admin, save as v4
  if (saved.version === 3 && saved.revenue.bot && saved.cost.system_cost) {
    const rev = {};
    PRODUCT_KEYS.forEach(k => { rev[k] = (saved.revenue[k] || zeroes()).map(Number); });
    const cost = {};
    // Carry over keys that still exist
    ['system_cost', 'salary', 'marketing', 'tax', 'contingency'].forEach(k => {
      cost[k] = (saved.cost[k] || zeroes()).map(Number);
    });
    // Merge old 5 keys into admin
    cost.admin = zeroes().map((_, i) =>
      OLD_ADMIN_KEYS.reduce((sum, k) => sum + (Number(saved.cost[k]?.[i]) || 0), 0)
    );
    const migrated = { revenue: rev, cost };
    showToast('ข้อมูล Cost ถูก migrate เป็น v4 — รวม 5 หมวดย่อยเป็น "ค่าบริหาร"', 'warning', 5000);
    saveActual(migrated);
    return migrated;
  }

  // v2 format: revenue is per-product object, cost is flat array → migrate cost
  if (saved.version === 2 && saved.revenue.bot && Array.isArray(saved.cost)) {
    const migrated = defaultActual();
    PRODUCT_KEYS.forEach(k => {
      migrated.revenue[k] = (saved.revenue[k] || zeroes()).map(Number);
    });
    showToast('ข้อมูล Cost ถูก migrate เป็น v4 — กรุณากรอก Cost ตามหมวดใหม่', 'warning', 5000);
    saveActual(migrated);
    return migrated;
  }

  // v1 format: both revenue and cost are flat arrays → migrate all
  if (Array.isArray(saved.revenue)) {
    const migrated = defaultActual();
    showToast('ข้อมูลเดิมถูก migrate เป็น v4 — กรุณากรอก Revenue/Cost ตามหมวดใหม่', 'warning', 5000);
    saveActual(migrated);
    return migrated;
  }

  return defaultActual();
}

// Save actual data (v4 format)
export function saveActual(actual) {
  const rev = {};
  PRODUCT_KEYS.forEach(k => { rev[k] = [...actual.revenue[k]]; });
  const cost = {};
  getCostKeys().forEach(k => { cost[k] = [...actual.cost[k]]; });
  storage.set(STORAGE_KEY, {
    version: 4,
    revenue: rev,
    cost,
    lastUpdated: new Date().toISOString(),
  });
}

// Calculate variance
export function getVariance(budget, actual) {
  return budget.map((b, i) => {
    if (actual[i] === 0) return { abs: 0, pct: 0, status: 'pending' };
    const abs = actual[i] - b;
    const pct = b !== 0 ? ((abs / b) * 100) : 0;
    let status = 'on_track';
    const absPct = Math.abs(pct);
    if (absPct > 15) status = 'critical';
    else if (absPct > 5) status = 'warning';
    return { abs, pct, status };
  });
}

// Export data as JSON (v5: per-category budget cost + costDetails)
export function exportBudgetData() {
  const actual = getActual();
  const rev = {};
  PRODUCT_KEYS.forEach(k => { rev[k] = [...actual.revenue[k]]; });
  const cost = {};
  getCostKeys().forEach(k => { cost[k] = [...actual.cost[k]]; });

  // Export budget cost as per-category object
  const budgetCost = {};
  for (const k of getCostKeys()) budgetCost[k] = [...BUDGET.cost[k]];

  // Export budget costDetails
  const budgetCostDetails = {};
  for (const cat of DETAILED_CATEGORIES) {
    if (BUDGET.costDetails[cat]) {
      budgetCostDetails[cat] = {};
      for (const sub of Object.keys(BUDGET.costDetails[cat])) {
        budgetCostDetails[cat][sub] = [...BUDGET.costDetails[cat][sub]];
      }
    }
  }

  return JSON.stringify({
    version: 4,
    exported: new Date().toISOString(),
    budget: { revenue: [...BUDGET.revenue], cost: budgetCost, costDetails: budgetCostDetails },
    actual: { revenue: rev, cost },
  }, null, 2);
}

// Import data from JSON (accepts v1, v2, v3, v4)
export function importBudgetData(jsonStr) {
  try {
    const data = JSON.parse(jsonStr);
    if (!data.actual || !data.actual.revenue || !data.actual.cost) return false;

    let ok = false;

    // v4: 6 cost categories (with admin key)
    if (data.version === 4 && data.actual.revenue.bot && data.actual.cost.system_cost) {
      const rev = {};
      PRODUCT_KEYS.forEach(k => { rev[k] = (data.actual.revenue[k] || zeroes()).map(Number); });
      const cost = {};
      getCostKeys().forEach(k => { cost[k] = (data.actual.cost[k] || zeroes()).map(Number); });
      saveActual({ revenue: rev, cost });
      ok = true;
    }

    // v3: 10 cost categories → merge 5 into admin
    else if (data.version === 3 && data.actual.revenue.bot && data.actual.cost.system_cost) {
      const rev = {};
      PRODUCT_KEYS.forEach(k => { rev[k] = (data.actual.revenue[k] || zeroes()).map(Number); });
      const cost = {};
      ['system_cost', 'salary', 'marketing', 'tax', 'contingency'].forEach(k => {
        cost[k] = (data.actual.cost[k] || zeroes()).map(Number);
      });
      cost.admin = zeroes().map((_, i) =>
        OLD_ADMIN_KEYS.reduce((sum, k) => sum + (Number(data.actual.cost[k]?.[i]) || 0), 0)
      );
      saveActual({ revenue: rev, cost });
      showToast('Import v3 — รวม 5 หมวดย่อยเป็น "ค่าบริหาร"', 'warning', 5000);
      ok = true;
    }

    // v2: per-product revenue, flat cost → migrate cost
    else if (data.version === 2 && data.actual.revenue.bot && Array.isArray(data.actual.cost)) {
      const migrated = defaultActual();
      PRODUCT_KEYS.forEach(k => {
        migrated.revenue[k] = (data.actual.revenue[k] || zeroes()).map(Number);
      });
      saveActual(migrated);
      showToast('Import v2 — Cost ถูก reset ตามหมวดใหม่', 'warning', 5000);
      ok = true;
    }

    // v1: flat arrays → migrate all
    else if (Array.isArray(data.actual.revenue)) {
      const migrated = defaultActual();
      saveActual(migrated);
      showToast('Import v1 — Revenue/Cost ถูก reset ตามหมวดใหม่', 'warning', 5000);
      ok = true;
    }

    if (!ok) return false;

    // Import budget targets if present
    if (data.budget?.revenue?.length === 12) {
      for (let i = 0; i < 12; i++) {
        BUDGET.revenue[i] = Number(data.budget.revenue[i]) || 0;
      }

      // v2 budget cost: per-category object
      if (data.budget.cost && typeof data.budget.cost === 'object' && !Array.isArray(data.budget.cost)) {
        for (const k of getCostKeys()) {
          if (data.budget.cost[k]?.length === 12) {
            for (let i = 0; i < 12; i++) BUDGET.cost[k][i] = Number(data.budget.cost[k][i]) || 0;
          }
        }
      }
      // v1 budget cost: flat array → distribute proportionally
      else if (data.budget.cost?.length === 12) {
        for (let i = 0; i < 12; i++) {
          const oldTotal = Number(data.budget.cost[i]) || 0;
          const defTotal = DEFAULT_BUDGET_COST[i];
          for (const k of getCostKeys()) {
            const defCat = DEFAULT_BUDGET_COST_BY_CAT[k]?.[i] || 0;
            BUDGET.cost[k][i] = defTotal > 0 ? Math.round(oldTotal * defCat / defTotal) : 0;
          }
        }
      }

      // Import costDetails if present, otherwise compute from category totals
      if (data.budget.costDetails) {
        for (const cat of DETAILED_CATEGORIES) {
          if (data.budget.costDetails[cat]) {
            if (!BUDGET.costDetails[cat]) BUDGET.costDetails[cat] = {};
            const def = SUB_ITEM_DEFS[cat];
            if (def) {
              for (const item of def.items) {
                if (data.budget.costDetails[cat][item.key]?.length === 12) {
                  BUDGET.costDetails[cat][item.key] = data.budget.costDetails[cat][item.key].map(v => Number(v) || 0);
                }
              }
            }
          }
        }
      } else {
        computeCostDetailsFromCategoryTotals();
      }

      recalcBudget();
      saveBudget();
    }

    return true;
  } catch {
    return false;
  }
}

// Get last saved timestamp (ISO string or null)
export function getLastSaved() {
  const saved = storage.get(STORAGE_KEY);
  return saved?.lastUpdated || null;
}

// Reset actual data
export function resetActual() {
  storage.remove(STORAGE_KEY);
}
