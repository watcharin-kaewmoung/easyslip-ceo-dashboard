// ============================================
// EasySlip 2026 — Constants
// ============================================

export const MONTHS_EN = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export const MONTHS_TH = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];

export const MONTHS_TH_FULL = [
  'มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน',
  'กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'
];

export const QUARTERS = ['Q1','Q2','Q3','Q4'];
export const QUARTER_MONTHS = [[0,1,2],[3,4,5],[6,7,8],[9,10,11]];

export const CHANNELS = Object.freeze({
  BOT: { key: 'bot', label: 'LINE BOT', color: '#3b82f6', icon: 'bot' },
  API: { key: 'api', label: 'API', color: '#22c55e', icon: 'code-2' },
  CRM: { key: 'crm', label: 'CRM', color: '#f97316', icon: 'users' },
  SMS: { key: 'sms', label: 'SMS', color: '#a855f7', icon: 'message-square' },
});

export const CHANNEL_LIST = Object.values(CHANNELS);
export const CHANNEL_COLORS = CHANNEL_LIST.map(c => c.color);

export const EXPENSE_CATEGORIES = [
  { key: 'system_cost', label: 'ค่าระบบ (Cloud & Infra)', labelEn: 'System Cost (Cloud & Infra)', color: '#ef4444' },
  { key: 'salary', label: 'เงินเดือน (Payroll)', labelEn: 'Payroll', color: '#f97316' },
  { key: 'marketing', label: 'การตลาด (Marketing)', labelEn: 'Marketing', color: '#3b82f6' },
  { key: 'tax', label: 'ภาษี (Tax)', labelEn: 'Tax', color: '#ec4899' },
  { key: 'contingency', label: 'สำรองฉุกเฉิน (Reserve)', labelEn: 'Contingency Reserve', color: '#64748b' },
  { key: 'admin', label: 'ค่าบริหาร (Admin & Overhead)', labelEn: 'Admin & Overhead', color: '#06b6d4' },
];

/** Sync EXPENSE_CATEGORIES array in-place from schema */
export function syncExpenseCategories(schema) {
  EXPENSE_CATEGORIES.length = 0;
  for (const cat of schema) {
    EXPENSE_CATEGORIES.push({
      key: cat.key,
      label: cat.label.th,
      labelEn: cat.label.en,
      color: cat.color,
    });
  }
}

export const SEVERITY_COLORS = Object.freeze({
  HIGH: '#ef4444',
  MEDIUM: '#eab308',
  LOW: '#3b82f6',
});

export const STATUS_THRESHOLDS = Object.freeze({
  ON_TRACK: 5,     // <= 5%
  WARNING: 15,     // 5-15%
  CRITICAL: Infinity // > 15%
});
