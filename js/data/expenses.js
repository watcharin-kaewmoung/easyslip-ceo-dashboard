// ============================================
// EasySlip 2026 — Expense Data (Sheet 4)
// Monthly costs by category in THB
// Dynamic category schema with CRUD operations
// ============================================

import { storage } from '../storage.js';
import { syncExpenseCategories } from './constants.js';
import { registerDynamicLabel, clearDynamicLabels } from '../i18n.js';

const STORAGE_KEY = 'expenses_2026';

// ── Frozen defaults (for Reset) ──

const DEFAULT_SYSTEM_COST = Object.freeze([
  1170096, 1187569, 1205325, 1259641, 1310124, 1357403,
  1414232, 1467680, 1524143, 1583284, 1645177, 1734378
]);

const DEFAULT_SALARY = Object.freeze([
  150000, 150000, 150000, 150000, 150000, 150000,
  150000, 150000, 150000, 150000, 150000, 150000
]);

const DEFAULT_MARKETING = Object.freeze([
  333333, 333333, 333334, 373333, 373333, 373334,
  340000, 340000, 340000, 620000, 620000, 620000
]);

const DEFAULT_TAX = Object.freeze([
  120000, 120000, 185000, 130000, 457000, 135000,
  140000, 371000, 536000, 148000, 155000, 680000
]);

const DEFAULT_CONTINGENCY = Object.freeze([
  96440, 97880, 99350, 103835, 107919, 111707,
  116489, 121075, 125890, 130896, 139369, 151559
]);

// Admin = social_security(2250) + accounting(5000) + insurance(3750) + office(8000) + other(15000)
const DEFAULT_ADMIN = Object.freeze([
  34000, 34000, 34000, 34000, 34000, 34000,
  34000, 34000, 34000, 34000, 34000, 34000
]);

const DEFAULT_DATA = {
  system_cost: DEFAULT_SYSTEM_COST,
  salary: DEFAULT_SALARY,
  marketing: DEFAULT_MARKETING,
  tax: DEFAULT_TAX,
  contingency: DEFAULT_CONTINGENCY,
  admin: DEFAULT_ADMIN,
};

// ── Dynamic Category Schema (single source of truth) ──

function buildDefaultSchema() {
  return [
    {
      key: 'system_cost',
      label: { th: 'ค่าระบบ (Cloud & Infra)', en: 'System Cost (Cloud & Infra)' },
      type: 'detailed',
      color: '#ef4444',
      subItemType: 'pct',
      subItems: [
        { key: 'cloud',      label: { th: 'Cloud Infrastructure', en: 'Cloud Infrastructure' }, defaultPct: 0.50 },
        { key: 'server',     label: { th: 'API Server & Hosting', en: 'API Server & Hosting' }, defaultPct: 0.25 },
        { key: 'database',   label: { th: 'Database & Storage', en: 'Database & Storage' }, defaultPct: 0.12 },
        { key: 'cdn',        label: { th: 'CDN & Network', en: 'CDN & Network' }, defaultPct: 0.05 },
        { key: 'monitoring', label: { th: 'Monitoring & Tools', en: 'Monitoring & Tools' }, defaultPct: 0.05 },
        { key: 'license',    label: { th: 'SaaS License', en: 'SaaS License' }, defaultPct: 0.03 },
      ],
    },
    {
      key: 'salary',
      label: { th: 'เงินเดือน (Payroll)', en: 'Payroll' },
      type: 'detailed',
      color: '#f97316',
      subItemType: 'fixed',
      subItems: [
        { key: 'base',   label: { th: 'เงินเดือนพื้นฐาน', en: 'Base Salary' }, defaultAmount: 140000 },
        { key: 'social', label: { th: 'ประกันสังคม (นายจ้าง)', en: 'Social Security' }, defaultAmount: 7500 },
        { key: 'bonus',  label: { th: 'โบนัส/เบี้ยเลี้ยง', en: 'Bonus / Incentive' }, defaultAmount: 2500 },
      ],
    },
    {
      key: 'marketing',
      label: { th: 'การตลาด (Marketing)', en: 'Marketing' },
      type: 'detailed',
      color: '#3b82f6',
      subItemType: 'pct',
      subItems: [
        { key: 'api_growth',  label: { th: 'API Growth', en: 'API Growth' }, defaultPct: 0.25 },
        { key: 'crm_acq',     label: { th: 'CRM Acquisition', en: 'CRM Acquisition' }, defaultPct: 0.30 },
        { key: 'sms_launch',  label: { th: 'SMS Launch', en: 'SMS Launch' }, defaultPct: 0.20 },
        { key: 'brand',       label: { th: 'Brand Awareness', en: 'Brand Awareness' }, defaultPct: 0.15 },
        { key: 'mkt_reserve', label: { th: 'สำรอง', en: 'Reserve' }, defaultPct: 0.10 },
      ],
    },
    {
      key: 'tax',
      label: { th: 'ภาษี (Tax)', en: 'Tax' },
      type: 'simple',
      color: '#ec4899',
    },
    {
      key: 'contingency',
      label: { th: 'สำรองฉุกเฉิน (Reserve)', en: 'Contingency Reserve' },
      type: 'simple',
      color: '#64748b',
    },
    {
      key: 'admin',
      label: { th: 'ค่าบริหาร (Admin & Overhead)', en: 'Admin & Overhead' },
      type: 'detailed',
      color: '#06b6d4',
      subItemType: 'fixed',
      subItems: [
        { key: 'social_security', label: { th: 'ประกันสังคม', en: 'Social Security' }, defaultAmount: 2250 },
        { key: 'accounting',      label: { th: 'ค่าบัญชี', en: 'Accounting' }, defaultAmount: 5000 },
        { key: 'insurance',       label: { th: 'ประกันภัย', en: 'Insurance' }, defaultAmount: 3750 },
        { key: 'office',          label: { th: 'สำนักงาน', en: 'Office' }, defaultAmount: 8000 },
        { key: 'other_admin',     label: { th: 'อื่นๆ', en: 'Other' }, defaultAmount: 15000 },
      ],
    },
  ];
}

let categorySchema = buildDefaultSchema();

// ── Exports: mutable arrays/objects, mutated in-place ──

export const DETAILED_CATEGORIES = [];
export const SIMPLE_CATEGORIES = [];
export const SUB_ITEM_DEFS = {};
export const CATEGORY_LABELS = {};
export const CATEGORY_KEYS = [];
export const EXPENSES = {};
export const EXPENSE_DETAILS = {};

// Total cost per month (mutable — mutated in-place so held refs stay valid)
export const TOTAL_MONTHLY_COST = new Array(12).fill(0);

// Annual total cost (reassignable)
export let ANNUAL_TOTAL_COST = 0;

// ── Rebuild all exports from categorySchema ──

function rebuildExportsFromSchema() {
  // Clear arrays in-place
  DETAILED_CATEGORIES.length = 0;
  SIMPLE_CATEGORIES.length = 0;
  CATEGORY_KEYS.length = 0;

  // Clear objects
  for (const k in SUB_ITEM_DEFS) delete SUB_ITEM_DEFS[k];
  for (const k in CATEGORY_LABELS) delete CATEGORY_LABELS[k];

  for (const cat of categorySchema) {
    CATEGORY_KEYS.push(cat.key);
    CATEGORY_LABELS[cat.key] = cat.label.th;

    if (cat.type === 'detailed') {
      DETAILED_CATEGORIES.push(cat.key);
      SUB_ITEM_DEFS[cat.key] = {
        type: cat.subItemType,
        items: (cat.subItems || []).map(sub => {
          const item = { key: sub.key };
          if (cat.subItemType === 'pct') item.defaultPct = sub.defaultPct ?? 0;
          else item.defaultAmount = sub.defaultAmount ?? 0;
          return item;
        }),
      };
    } else {
      SIMPLE_CATEGORIES.push(cat.key);
    }

    // Ensure EXPENSES array exists
    if (!EXPENSES[cat.key]) {
      EXPENSES[cat.key] = new Array(12).fill(0);
    }

    // Ensure EXPENSE_DETAILS exist for detailed categories
    if (cat.type === 'detailed') {
      if (!EXPENSE_DETAILS[cat.key]) EXPENSE_DETAILS[cat.key] = {};
      for (const sub of (cat.subItems || [])) {
        if (!EXPENSE_DETAILS[cat.key][sub.key]) {
          EXPENSE_DETAILS[cat.key][sub.key] = new Array(12).fill(0);
        }
      }
      // Remove deleted sub-items from details
      const validSubKeys = new Set((cat.subItems || []).map(s => s.key));
      for (const subKey of Object.keys(EXPENSE_DETAILS[cat.key])) {
        if (!validSubKeys.has(subKey)) {
          delete EXPENSE_DETAILS[cat.key][subKey];
        }
      }
    }
  }

  // Clean up deleted categories from EXPENSES / EXPENSE_DETAILS
  const validKeys = new Set(CATEGORY_KEYS);
  for (const key of Object.keys(EXPENSES)) {
    if (!validKeys.has(key)) {
      delete EXPENSES[key];
      delete EXPENSE_DETAILS[key];
    }
  }
  for (const key of Object.keys(EXPENSE_DETAILS)) {
    if (!validKeys.has(key)) {
      delete EXPENSE_DETAILS[key];
    }
  }

  // Sync EXPENSE_CATEGORIES in constants.js
  syncExpenseCategories(categorySchema);

  // Sync i18n dynamic labels
  syncLabelsToI18n();
}

// ── Sync labels to i18n ──

function syncLabelsToI18n() {
  clearDynamicLabels();
  for (const cat of categorySchema) {
    registerDynamicLabel('cat.' + cat.key, cat.label);
    registerDynamicLabel('cat.' + cat.key + '.full', cat.label);
    if (cat.subItems) {
      for (const sub of cat.subItems) {
        registerDynamicLabel('sub.' + cat.key + '.' + sub.key, sub.label);
      }
    }
  }
}

// ── Initialize from schema + defaults ──

function initFromDefaults() {
  categorySchema = buildDefaultSchema();
  rebuildExportsFromSchema();

  // Set default data
  for (const key of CATEGORY_KEYS) {
    const defaults = DEFAULT_DATA[key];
    if (defaults) {
      for (let i = 0; i < 12; i++) {
        EXPENSES[key][i] = defaults[i];
      }
    }
  }

  // Build default details
  for (const cat of categorySchema) {
    if (cat.type === 'detailed' && cat.subItems) {
      const parentData = EXPENSES[cat.key];
      for (const sub of cat.subItems) {
        if (cat.subItemType === 'pct') {
          EXPENSE_DETAILS[cat.key][sub.key] = parentData.map(v => Math.round(v * (sub.defaultPct ?? 0)));
        } else {
          EXPENSE_DETAILS[cat.key][sub.key] = Array(12).fill(sub.defaultAmount ?? 0);
        }
      }
    }
  }

  recalcExpenses();
}

initFromDefaults();

// ── Key generation helper ──

function slugify(text) {
  const ascii = text.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, '_').trim();
  return ascii || `custom_${Date.now().toString(36)}`;
}

// ── Sum sub-items → write to EXPENSES[category] in-place ──

export function recalcFromDetails(category) {
  const subs = EXPENSE_DETAILS[category];
  if (!subs) return;
  for (let i = 0; i < 12; i++) {
    EXPENSES[category][i] = Object.values(subs).reduce((sum, arr) => sum + arr[i], 0);
  }
}

// ── Recompute TOTAL_MONTHLY_COST[i] in-place + reassign ANNUAL_TOTAL_COST ──

export function recalcExpenses() {
  for (let i = 0; i < 12; i++) {
    TOTAL_MONTHLY_COST[i] = Object.values(EXPENSES).reduce((sum, cat) => sum + cat[i], 0);
  }
  ANNUAL_TOTAL_COST = TOTAL_MONTHLY_COST.reduce((a, b) => a + b, 0);
}

// ── CRUD Functions ──

export function addCategory({ key, label, type, color, subItemType, subItems }) {
  const finalKey = key || slugify(label.en || label.th);
  // Prevent duplicate keys
  if (categorySchema.some(c => c.key === finalKey)) return false;

  const entry = { key: finalKey, label, type, color: color || '#64748b' };
  if (type === 'detailed') {
    entry.subItemType = subItemType || 'fixed';
    entry.subItems = subItems || [];
  }
  categorySchema.push(entry);
  EXPENSES[finalKey] = new Array(12).fill(0);
  if (type === 'detailed') {
    EXPENSE_DETAILS[finalKey] = {};
    for (const sub of (entry.subItems || [])) {
      EXPENSE_DETAILS[finalKey][sub.key] = new Array(12).fill(0);
    }
  }
  rebuildExportsFromSchema();
  recalcExpenses();
  saveExpenses();
  return finalKey;
}

export function removeCategory(key) {
  const idx = categorySchema.findIndex(c => c.key === key);
  if (idx < 0) return false;
  categorySchema.splice(idx, 1);
  delete EXPENSES[key];
  delete EXPENSE_DETAILS[key];
  rebuildExportsFromSchema();
  recalcExpenses();
  saveExpenses();
  return true;
}

export function renameCategory(key, newLabel) {
  const cat = categorySchema.find(c => c.key === key);
  if (!cat) return false;
  cat.label = { ...cat.label, ...newLabel };
  rebuildExportsFromSchema();
  saveExpenses();
  return true;
}

export function setCategoryColor(key, color) {
  const cat = categorySchema.find(c => c.key === key);
  if (!cat) return false;
  cat.color = color;
  rebuildExportsFromSchema();
  saveExpenses();
  return true;
}

export function addSubItem(catKey, { key, label, defaultPct, defaultAmount }) {
  const cat = categorySchema.find(c => c.key === catKey);
  if (!cat || cat.type !== 'detailed') return false;
  if (!cat.subItems) cat.subItems = [];

  const finalKey = key || slugify(label.en || label.th);
  if (cat.subItems.some(s => s.key === finalKey)) return false;

  const sub = { key: finalKey, label };
  if (cat.subItemType === 'pct') sub.defaultPct = defaultPct ?? 0;
  else sub.defaultAmount = defaultAmount ?? 0;

  cat.subItems.push(sub);
  if (!EXPENSE_DETAILS[catKey]) EXPENSE_DETAILS[catKey] = {};
  EXPENSE_DETAILS[catKey][finalKey] = new Array(12).fill(0);

  rebuildExportsFromSchema();
  recalcFromDetails(catKey);
  recalcExpenses();
  saveExpenses();
  return finalKey;
}

export function removeSubItem(catKey, subKey) {
  const cat = categorySchema.find(c => c.key === catKey);
  if (!cat || !cat.subItems) return false;
  const idx = cat.subItems.findIndex(s => s.key === subKey);
  if (idx < 0) return false;
  cat.subItems.splice(idx, 1);
  if (EXPENSE_DETAILS[catKey]) delete EXPENSE_DETAILS[catKey][subKey];

  rebuildExportsFromSchema();
  recalcFromDetails(catKey);
  recalcExpenses();
  saveExpenses();
  return true;
}

export function renameSubItem(catKey, subKey, newLabel) {
  const cat = categorySchema.find(c => c.key === catKey);
  if (!cat || !cat.subItems) return false;
  const sub = cat.subItems.find(s => s.key === subKey);
  if (!sub) return false;
  sub.label = { ...sub.label, ...newLabel };
  rebuildExportsFromSchema();
  saveExpenses();
  return true;
}

export function getCategorySchema() {
  return categorySchema;
}

export function getCategoryColor(catKey) {
  const cat = categorySchema.find(c => c.key === catKey);
  return cat?.color || '#64748b';
}

// ── Persistence (v2 format) ──

export function saveExpenses() {
  const schemaOut = categorySchema.map(cat => {
    const entry = { key: cat.key, label: cat.label, type: cat.type, color: cat.color };
    if (cat.type === 'detailed') {
      entry.subItemType = cat.subItemType;
      entry.subItems = (cat.subItems || []).map(s => {
        const sub = { key: s.key, label: s.label };
        if (cat.subItemType === 'pct') sub.defaultPct = s.defaultPct;
        else sub.defaultAmount = s.defaultAmount;
        return sub;
      });
    }
    return entry;
  });

  const data = {};
  for (const key of CATEGORY_KEYS) {
    data[key] = [...EXPENSES[key]];
  }

  const details = {};
  for (const cat of DETAILED_CATEGORIES) {
    details[cat] = {};
    if (EXPENSE_DETAILS[cat]) {
      for (const subKey of Object.keys(EXPENSE_DETAILS[cat])) {
        details[cat][subKey] = [...EXPENSE_DETAILS[cat][subKey]];
      }
    }
  }

  storage.set(STORAGE_KEY, {
    version: 2,
    lastUpdated: new Date().toISOString(),
    schema: { categories: schemaOut },
    data,
    details,
  });
}

export function loadSavedExpenses() {
  const saved = storage.get(STORAGE_KEY);
  if (!saved) return false;

  // ── v2 format: schema + data + details ──
  if (saved.version === 2 && saved.schema?.categories) {
    categorySchema = saved.schema.categories;
    rebuildExportsFromSchema();

    // Restore data
    for (const key of CATEGORY_KEYS) {
      if (saved.data?.[key]?.length === 12) {
        for (let i = 0; i < 12; i++) {
          EXPENSES[key][i] = Number(saved.data[key][i]) || 0;
        }
      }
    }

    // Restore details
    for (const cat of DETAILED_CATEGORIES) {
      if (saved.details?.[cat]) {
        for (const subKey of Object.keys(saved.details[cat])) {
          if (EXPENSE_DETAILS[cat]?.[subKey] && saved.details[cat][subKey]?.length === 12) {
            for (let i = 0; i < 12; i++) {
              EXPENSE_DETAILS[cat][subKey][i] = Number(saved.details[cat][subKey][i]) || 0;
            }
          }
        }
      }
    }

    recalcExpenses();
    return true;
  }

  // ── v1 format (legacy): flat category arrays ──

  // Migrate old 10-key format: merge 5 small categories into admin
  const OLD_ADMIN_KEYS = ['social_security', 'accounting', 'insurance', 'office', 'other'];
  if (saved.social_security && !saved.admin) {
    saved.admin = Array.from({ length: 12 }, (_, i) =>
      OLD_ADMIN_KEYS.reduce((sum, k) => sum + (Number(saved[k]?.[i]) || 0), 0)
    );
    OLD_ADMIN_KEYS.forEach(k => delete saved[k]);
  }

  // Use default schema for v1
  categorySchema = buildDefaultSchema();
  rebuildExportsFromSchema();

  // Validate: all default keys present with length 12
  const defaultKeys = Object.keys(DEFAULT_DATA);
  for (const key of defaultKeys) {
    if (!saved[key] || saved[key].length !== 12) return false;
  }

  for (const key of defaultKeys) {
    for (let i = 0; i < 12; i++) {
      EXPENSES[key][i] = Number(saved[key][i]) || 0;
    }
  }

  // Restore sub-item details (or migrate from parent using default percentages)
  if (saved.details) {
    for (const cat of DETAILED_CATEGORIES) {
      if (saved.details[cat] && SUB_ITEM_DEFS[cat]) {
        for (const item of SUB_ITEM_DEFS[cat].items) {
          if (saved.details[cat][item.key]?.length === 12) {
            for (let i = 0; i < 12; i++) {
              EXPENSE_DETAILS[cat][item.key][i] = Number(saved.details[cat][item.key][i]) || 0;
            }
          }
        }
      }
    }
  } else {
    // Migration: no details saved — compute sub-items from parent using default percentages
    for (const cat of DETAILED_CATEGORIES) {
      const def = SUB_ITEM_DEFS[cat];
      if (!def) continue;
      for (const item of def.items) {
        if (def.type === 'pct') {
          for (let i = 0; i < 12; i++) {
            EXPENSE_DETAILS[cat][item.key][i] = Math.round(EXPENSES[cat][i] * item.defaultPct);
          }
        } else {
          for (let i = 0; i < 12; i++) {
            EXPENSE_DETAILS[cat][item.key][i] = item.defaultAmount;
          }
        }
      }
    }
  }

  recalcExpenses();
  // Re-save as v2 to upgrade format
  saveExpenses();
  return true;
}

/** Set all expenses and details to zero */
export function zeroExpenses() {
  for (const key of CATEGORY_KEYS) {
    if (EXPENSES[key]) EXPENSES[key].fill(0);
  }
  for (const cat of CATEGORY_KEYS) {
    if (EXPENSE_DETAILS[cat]) {
      for (const subKey of Object.keys(EXPENSE_DETAILS[cat])) {
        EXPENSE_DETAILS[cat][subKey].fill(0);
      }
    }
  }
  recalcExpenses();
}

/** Restore defaults, remove storage key */
export function resetExpenses() {
  storage.remove(STORAGE_KEY);
  initFromDefaults();
}

/** Return lastUpdated ISO string or null */
export function getLastSavedExpenses() {
  const saved = storage.get(STORAGE_KEY);
  return saved?.lastUpdated || null;
}

// ── Auto-load saved data on init ──
loadSavedExpenses();

// ── Existing utility functions (unchanged) ──

// Annual by category
export function getAnnualByCategory() {
  const result = {};
  for (const [key, data] of Object.entries(EXPENSES)) {
    result[key] = data.reduce((a, b) => a + b, 0);
  }
  return result;
}

// ── Known Anomalies (Sheet 6) ──
export const ANOMALIES = Object.freeze([
  {
    id: 1,
    month: 4,  // May (0-indexed)
    category: 'tax',
    severity: 'HIGH',
    amount: 457000,
    expected: 135000,
    description: 'ภาษีพ.ค. สูงผิดปกติ — ครบกำหนดชำระ CIT กลางปี + ภาษีหัก ณ ที่จ่ายสะสม',
    descriptionEn: 'May tax abnormally high — mid-year CIT payment + accumulated withholding tax',
    action: 'วางแผนกันเงินสำรองภาษีล่วงหน้าอย่างน้อย 2 เดือน',
    actionEn: 'Plan tax reserves at least 2 months in advance',
  },
  {
    id: 2,
    month: 7,  // Aug
    category: 'tax',
    severity: 'HIGH',
    amount: 371000,
    expected: 140000,
    description: 'ภาษีส.ค. สูง — ภาษีกลางปี CIT (PND.51) + VAT สะสม Q3',
    descriptionEn: 'Aug tax high — mid-year CIT (PND.51) + accumulated Q3 VAT',
    action: 'ตั้งสำรองภาษี PND.51 ไว้ตั้งแต่ต้น Q3',
    actionEn: 'Set aside PND.51 tax reserve from start of Q3',
  },
  {
    id: 3,
    month: 8,  // Sep
    category: 'tax',
    severity: 'HIGH',
    amount: 536000,
    expected: 145000,
    description: 'ภาษีก.ย. สูงที่สุดในปี — สิ้นสุด Q3 + การปรับปรุงรายการภาษี',
    descriptionEn: 'Sep tax highest in year — end of Q3 + tax adjustments',
    action: 'เตรียมสภาพคล่องเพิ่ม ฿400K ก่อนสิ้น Q3',
    actionEn: 'Prepare additional ฿400K liquidity before end of Q3',
  },
  {
    id: 4,
    month: 11,  // Dec
    category: 'tax',
    severity: 'HIGH',
    amount: 680000,
    expected: 155000,
    description: 'ภาษีธ.ค. สูงสุด — ปิดงบปลายปี + CIT ประจำปี',
    descriptionEn: 'Dec tax highest — year-end closing + annual CIT',
    action: 'วางแผนภาษีสิ้นปีร่วมกับสำนักงานบัญชีตั้งแต่ ต.ค.',
    actionEn: 'Plan year-end tax with accounting firm from Oct',
  },
  {
    id: 5,
    month: 9,  // Oct
    category: 'marketing',
    severity: 'MEDIUM',
    amount: 620000,
    expected: 340000,
    description: 'งบการตลาด Q4 เพิ่มขึ้น 82% — แคมเปญ Year-end + SMS Push',
    descriptionEn: 'Q4 marketing budget up 82% — Year-end campaign + SMS Push',
    action: 'ติดตาม ROI ทุก 2 สัปดาห์ ยกเลิกแคมเปญที่ ROAS < 2x',
    actionEn: 'Track ROI biweekly, cancel campaigns with ROAS < 2x',
  },
  {
    id: 6,
    month: 11,  // Dec
    category: 'contingency',
    severity: 'MEDIUM',
    amount: 151559,
    expected: 100000,
    description: 'สำรองฉุกเฉินธ.ค.สูง — เนื่องจาก Revenue เติบโตต่อเนื่อง',
    descriptionEn: 'Dec contingency reserve high — due to continuous revenue growth',
    action: 'ทบทวนอัตราสำรอง 2% อาจลดเหลือ 1.5% หาก cash reserve เพียงพอ',
    actionEn: 'Review 2% reserve rate, may reduce to 1.5% if cash reserve is sufficient',
  },
]);

// Statistics per category
export function getCategoryStats() {
  const stats = {};
  for (const [key, data] of Object.entries(EXPENSES)) {
    const sum = data.reduce((a, b) => a + b, 0);
    const avg = sum / 12;
    const min = Math.min(...data);
    const max = Math.max(...data);
    const variance = data.reduce((s, v) => s + (v - avg) ** 2, 0) / 12;
    const stddev = Math.sqrt(variance);
    stats[key] = { sum, avg, min, max, stddev };
  }
  return stats;
}
