// ============================================
// EasySlip 2026 — Product Metrics Data
// ============================================

import { storage } from '../storage.js';

// ── Default Data ──

const DEFAULT_API_CALLS = Object.freeze([
  1200000, 1350000, 1500000, 1620000, 1800000, 1950000,
  2100000, 2250000, 2400000, 2600000, 2800000, 3100000,
]);
const DEFAULT_ERROR_RATE = Object.freeze([0.8, 0.7, 0.6, 0.65, 0.5, 0.55, 0.45, 0.4, 0.42, 0.38, 0.35, 0.3]); // %
const DEFAULT_DAU = Object.freeze([850, 920, 980, 1050, 1120, 1200, 1280, 1350, 1430, 1520, 1600, 1700]);
const DEFAULT_MAU = Object.freeze([3200, 3500, 3800, 4100, 4400, 4700, 5000, 5300, 5600, 6000, 6400, 6900]);
const DEFAULT_WAU = Object.freeze([1800, 1950, 2100, 2250, 2400, 2550, 2700, 2850, 3000, 3200, 3400, 3650]);

const DEFAULT_UPTIME = Object.freeze([99.95, 99.98, 99.97, 99.92, 99.99, 99.96, 99.98, 99.94, 99.97, 99.99, 99.98, 99.99]); // %
const DEFAULT_RESPONSE_TIME = Object.freeze([145, 138, 132, 128, 125, 120, 118, 115, 112, 110, 108, 105]); // ms

const DEFAULT_SUPPORT_TICKETS = Object.freeze([42, 38, 35, 40, 32, 30, 28, 33, 26, 24, 22, 20]);
const DEFAULT_RESOLUTION_TIME = Object.freeze([4.2, 3.8, 3.5, 3.9, 3.2, 3.0, 2.8, 3.1, 2.6, 2.4, 2.2, 2.0]); // hours

// Feature adoption rates (%)
const DEFAULT_FEATURES = Object.freeze([
  { key: 'slip_verify', label: 'Slip Verification', labelEn: 'Slip Verification', adoption: 95, color: '#3b82f6' },
  { key: 'batch_api', label: 'Batch API', labelEn: 'Batch API', adoption: 62, color: '#22c55e' },
  { key: 'webhook', label: 'Webhook Notifications', labelEn: 'Webhook Notifications', adoption: 48, color: '#f97316' },
  { key: 'crm_integration', label: 'CRM Integration', labelEn: 'CRM Integration', adoption: 35, color: '#a855f7' },
  { key: 'analytics', label: 'Analytics Dashboard', labelEn: 'Analytics Dashboard', adoption: 28, color: '#ec4899' },
  { key: 'sms_verify', label: 'SMS Verification', labelEn: 'SMS Verification', adoption: 15, color: '#eab308' },
]);

// ── Mutable Working Data ──

export const PRODUCT = {
  apiCalls: [...DEFAULT_API_CALLS],
  errorRate: [...DEFAULT_ERROR_RATE],
  dau: [...DEFAULT_DAU],
  mau: [...DEFAULT_MAU],
  wau: [...DEFAULT_WAU],
  uptime: [...DEFAULT_UPTIME],
  responseTime: [...DEFAULT_RESPONSE_TIME],
  supportTickets: [...DEFAULT_SUPPORT_TICKETS],
  resolutionTime: [...DEFAULT_RESOLUTION_TIME],
  features: DEFAULT_FEATURES.map(f => ({ ...f })),

  // Computed
  totalApiCalls: 0,
  avgErrorRate: 0,
  latestDAU: 0,
  latestMAU: 0,
  dauMauRatio: 0,
  avgUptime: 0,
  avgResponseTime: 0,
  totalTickets: 0,
  avgResolutionTime: 0,
  lastUpdated: null,
};

// ── Recalculate ──

export function recalcProduct() {
  PRODUCT.totalApiCalls = PRODUCT.apiCalls.reduce((a, b) => a + b, 0);
  PRODUCT.avgErrorRate = PRODUCT.errorRate.reduce((a, b) => a + b, 0) / 12;
  PRODUCT.latestDAU = PRODUCT.dau[PRODUCT.dau.length - 1] || 0;
  PRODUCT.latestMAU = PRODUCT.mau[PRODUCT.mau.length - 1] || 0;
  PRODUCT.dauMauRatio = PRODUCT.latestMAU > 0
    ? (PRODUCT.latestDAU / PRODUCT.latestMAU) * 100 : 0;
  PRODUCT.avgUptime = PRODUCT.uptime.reduce((a, b) => a + b, 0) / 12;
  PRODUCT.avgResponseTime = PRODUCT.responseTime.reduce((a, b) => a + b, 0) / 12;
  PRODUCT.totalTickets = PRODUCT.supportTickets.reduce((a, b) => a + b, 0);
  PRODUCT.avgResolutionTime = PRODUCT.resolutionTime.reduce((a, b) => a + b, 0) / 12;
}

// ── Persistence ──

const STORAGE_KEY = 'product_2026';

export function saveProduct() {
  PRODUCT.lastUpdated = new Date().toISOString();
  storage.set(STORAGE_KEY, {
    apiCalls: [...PRODUCT.apiCalls],
    errorRate: [...PRODUCT.errorRate],
    dau: [...PRODUCT.dau],
    mau: [...PRODUCT.mau],
    wau: [...PRODUCT.wau],
    uptime: [...PRODUCT.uptime],
    responseTime: [...PRODUCT.responseTime],
    supportTickets: [...PRODUCT.supportTickets],
    resolutionTime: [...PRODUCT.resolutionTime],
    lastUpdated: PRODUCT.lastUpdated,
  });
}

export function loadProduct() {
  const saved = storage.get(STORAGE_KEY);
  if (!saved) { recalcProduct(); return false; }

  const arrays = ['apiCalls', 'errorRate', 'dau', 'mau', 'wau', 'uptime', 'responseTime', 'supportTickets', 'resolutionTime'];
  arrays.forEach(key => {
    if (saved[key]) {
      for (let i = 0; i < 12; i++) PRODUCT[key][i] = Number(saved[key][i]) || 0;
    }
  });
  PRODUCT.lastUpdated = saved.lastUpdated || null;

  recalcProduct();
  return true;
}

export function resetProduct() {
  PRODUCT.apiCalls.splice(0, 12, ...DEFAULT_API_CALLS);
  PRODUCT.errorRate.splice(0, 12, ...DEFAULT_ERROR_RATE);
  PRODUCT.dau.splice(0, 12, ...DEFAULT_DAU);
  PRODUCT.mau.splice(0, 12, ...DEFAULT_MAU);
  PRODUCT.wau.splice(0, 12, ...DEFAULT_WAU);
  PRODUCT.uptime.splice(0, 12, ...DEFAULT_UPTIME);
  PRODUCT.responseTime.splice(0, 12, ...DEFAULT_RESPONSE_TIME);
  PRODUCT.supportTickets.splice(0, 12, ...DEFAULT_SUPPORT_TICKETS);
  PRODUCT.resolutionTime.splice(0, 12, ...DEFAULT_RESOLUTION_TIME);
  PRODUCT.features = DEFAULT_FEATURES.map(f => ({ ...f }));
  recalcProduct();
  storage.remove(STORAGE_KEY);
}

// Init
loadProduct();
