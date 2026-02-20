// ============================================
// EasySlip 2026 — Marketing Data (Sheet 5)
// ============================================

// Quarterly marketing budget
export const QUARTERLY_BUDGET = Object.freeze([0, 0, 0, 0]);

export const ANNUAL_MARKETING_BUDGET = 0;

// Monthly breakdown (from expenses)
export const MONTHLY_MARKETING = Object.freeze([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);

// Channel allocation percentages
export const CHANNEL_ALLOCATION = Object.freeze({
  api: { label: 'API Growth', pct: 25, color: '#22c55e' },
  crm: { label: 'CRM Acquisition', pct: 30, color: '#f97316' },
  sms: { label: 'SMS Launch', pct: 20, color: '#a855f7' },
  brand: { label: 'Brand Awareness', pct: 15, color: '#3b82f6' },
  contingency: { label: 'Contingency', pct: 10, color: '#64748b' },
});

// Tax impact on marketing
export const TAX_IMPACT = Object.freeze({
  preTaxBudget: ANNUAL_MARKETING_BUDGET,
  vatRate: 0.07,
  withholdingRate: 0.03,
  effectiveBudget: Math.round(ANNUAL_MARKETING_BUDGET * (1 - 0.07)),
  vatAmount: Math.round(ANNUAL_MARKETING_BUDGET * 0.07),
  withholdingAmount: Math.round(ANNUAL_MARKETING_BUDGET * 0.03),
});

// Quarterly strategy descriptions
export const QUARTERLY_STRATEGY = Object.freeze([
  {
    quarter: 'Q1',
    focus: 'Foundation & API Growth',
    focusEn: 'Foundation & API Growth',
    description: 'สร้างฐาน API ลูกค้าใหม่ + Content Marketing + SEO',
    descriptionEn: 'Build new API customer base + Content Marketing + SEO',
    channels: ['API', 'Brand'],
    budget: QUARTERLY_BUDGET[0],
  },
  {
    quarter: 'Q2',
    focus: 'CRM Launch Campaign',
    focusEn: 'CRM Launch Campaign',
    description: 'เปิดตัว CRM + Partnership deals + Webinar series',
    descriptionEn: 'Launch CRM + Partnership deals + Webinar series',
    channels: ['CRM', 'API'],
    budget: QUARTERLY_BUDGET[1],
  },
  {
    quarter: 'Q3',
    focus: 'SMS Scale-up',
    focusEn: 'SMS Scale-up',
    description: 'ขยาย SMS channel + A/B testing + Retargeting',
    descriptionEn: 'Scale SMS channel + A/B testing + Retargeting',
    channels: ['SMS', 'CRM'],
    budget: QUARTERLY_BUDGET[2],
  },
  {
    quarter: 'Q4',
    focus: 'Year-end Push',
    focusEn: 'Year-end Push',
    description: 'แคมเปญสิ้นปี + Upsell existing + Referral program',
    descriptionEn: 'Year-end campaign + Upsell existing + Referral program',
    channels: ['SMS', 'CRM', 'API', 'Brand'],
    budget: QUARTERLY_BUDGET[3],
  },
]);

// Marketing as % of revenue (monthly)
export function getMarketingRevenueRatio(revenueTotal) {
  return MONTHLY_MARKETING.map((mkt, i) =>
    revenueTotal[i] > 0 ? ((mkt / revenueTotal[i]) * 100) : 0
  );
}
