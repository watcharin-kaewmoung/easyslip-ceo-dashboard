// ============================================
// EasySlip 2026 — Revenue Data (Sheets 1-2)
// Monthly revenue by channel in THB
// ============================================

import { storage } from '../storage.js';

const STORAGE_KEY = 'revenue_2026';

// ── Frozen defaults (for Reset) ──

const DEFAULT_BOT = Object.freeze([
  22000, 22000, 22500, 22500, 23000, 23000,
  23000, 23500, 23500, 24000, 24000, 24500
]);

const DEFAULT_API = Object.freeze([
  4800000, 4872000, 4945080, 5019256, 5094555, 5170993,
  5248558, 5327286, 5407206, 5488314, 5570639, 5654199
]);

const DEFAULT_CRM = Object.freeze([
  0, 0, 0, 150000, 199500, 265335,
  352896, 469431, 624323, 830350, 1104365, 1468806
]);

const DEFAULT_SMS = Object.freeze([
  0, 0, 0, 0, 80000, 126800,
  200978, 318550, 504901, 800268, 1268425, 2010434
]);

// ── Mutable working arrays ──

const botMonthly = [...DEFAULT_BOT];
const apiMonthly = [...DEFAULT_API];
const crmMonthly = [...DEFAULT_CRM];
const smsMonthly = [...DEFAULT_SMS];

// Computed totals (mutable)
const totalMonthly = botMonthly.map((v, i) => v + apiMonthly[i] + crmMonthly[i] + smsMonthly[i]);

// Aggregated — NOT frozen, so we can mutate in-place
export const REVENUE = {
  bot: botMonthly,
  api: apiMonthly,
  crm: crmMonthly,
  sms: smsMonthly,
  total: totalMonthly,

  // Annual totals (will be recalculated)
  annualBot: botMonthly.reduce((a, b) => a + b, 0),
  annualApi: apiMonthly.reduce((a, b) => a + b, 0),
  annualCrm: crmMonthly.reduce((a, b) => a + b, 0),
  annualSms: smsMonthly.reduce((a, b) => a + b, 0),
  annualTotal: 0,
};
REVENUE.annualTotal = REVENUE.annualBot + REVENUE.annualApi + REVENUE.annualCrm + REVENUE.annualSms;

// ── Persistence functions ──

/** Recompute REVENUE.total[i] in-place + all annual scalars */
export function recalcRevenue() {
  for (let i = 0; i < 12; i++) {
    REVENUE.total[i] = REVENUE.bot[i] + REVENUE.api[i] + REVENUE.crm[i] + REVENUE.sms[i];
  }
  REVENUE.annualBot = REVENUE.bot.reduce((a, b) => a + b, 0);
  REVENUE.annualApi = REVENUE.api.reduce((a, b) => a + b, 0);
  REVENUE.annualCrm = REVENUE.crm.reduce((a, b) => a + b, 0);
  REVENUE.annualSms = REVENUE.sms.reduce((a, b) => a + b, 0);
  REVENUE.annualTotal = REVENUE.annualBot + REVENUE.annualApi + REVENUE.annualCrm + REVENUE.annualSms;
}

/** Save 4 channel arrays + timestamp to localStorage */
export function saveRevenue() {
  storage.set(STORAGE_KEY, {
    bot: [...REVENUE.bot],
    api: [...REVENUE.api],
    crm: [...REVENUE.crm],
    sms: [...REVENUE.sms],
    lastUpdated: new Date().toISOString(),
  });
}

/** Load from localStorage, apply to REVENUE arrays in-place, recalc */
export function loadSavedRevenue() {
  const saved = storage.get(STORAGE_KEY);
  if (!saved) return false;
  if (!saved.bot || !saved.api || !saved.crm || !saved.sms) return false;
  if (saved.bot.length !== 12 || saved.api.length !== 12 || saved.crm.length !== 12 || saved.sms.length !== 12) return false;

  for (let i = 0; i < 12; i++) {
    REVENUE.bot[i] = Number(saved.bot[i]) || 0;
    REVENUE.api[i] = Number(saved.api[i]) || 0;
    REVENUE.crm[i] = Number(saved.crm[i]) || 0;
    REVENUE.sms[i] = Number(saved.sms[i]) || 0;
  }
  recalcRevenue();
  return true;
}

/** Restore defaults, remove storage key */
export function resetRevenue() {
  for (let i = 0; i < 12; i++) {
    REVENUE.bot[i] = DEFAULT_BOT[i];
    REVENUE.api[i] = DEFAULT_API[i];
    REVENUE.crm[i] = DEFAULT_CRM[i];
    REVENUE.sms[i] = DEFAULT_SMS[i];
  }
  recalcRevenue();
  storage.remove(STORAGE_KEY);
}

/** Return lastUpdated ISO string or null */
export function getLastSavedRevenue() {
  const saved = storage.get(STORAGE_KEY);
  return saved?.lastUpdated || null;
}

/** Return fresh copy of default arrays (for undo reference) */
export function getDefaultRevenue() {
  return {
    bot: [...DEFAULT_BOT],
    api: [...DEFAULT_API],
    crm: [...DEFAULT_CRM],
    sms: [...DEFAULT_SMS],
  };
}

// ── Auto-load saved data on init ──
loadSavedRevenue();

// ── Existing utility functions (unchanged) ──

// Quarterly aggregation helper
export function getQuarterlyRevenue() {
  const quarters = [0, 0, 0, 0];
  const byChannel = { bot: [0,0,0,0], api: [0,0,0,0], crm: [0,0,0,0], sms: [0,0,0,0] };
  for (let m = 0; m < 12; m++) {
    const q = Math.floor(m / 3);
    quarters[q] += REVENUE.total[m];
    byChannel.bot[q] += REVENUE.bot[m];
    byChannel.api[q] += REVENUE.api[m];
    byChannel.crm[q] += REVENUE.crm[m];
    byChannel.sms[q] += REVENUE.sms[m];
  }
  return { total: quarters, ...byChannel };
}

// MoM growth per channel
export function getMoMGrowth(channel) {
  const data = REVENUE[channel];
  return data.map((val, i) => {
    if (i === 0 || data[i-1] === 0) return null;
    return ((val - data[i-1]) / data[i-1]) * 100;
  });
}

// Channel share
export function getChannelShare() {
  const total = REVENUE.annualTotal;
  return {
    bot: (REVENUE.annualBot / total) * 100,
    api: (REVENUE.annualApi / total) * 100,
    crm: (REVENUE.annualCrm / total) * 100,
    sms: (REVENUE.annualSms / total) * 100,
  };
}
