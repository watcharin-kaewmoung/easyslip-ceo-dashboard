// ============================================
// EasySlip 2026 — OKR & Goals Data
// ============================================

import { storage } from '../storage.js';

// ── Default OKR Data ──

const DEFAULT_COMPANY_OKRS = [
  {
    id: 'O1',
    objective: 'เพิ่มรายได้ 2x จากปีก่อน',
    objectiveEn: 'Double revenue from previous year',
    owner: 'CEO',
    keyResults: [
      { id: 'KR1.1', text: 'ARR ถึง ฿8M', textEn: 'Reach ฿8M ARR', target: 8000000, current: 6700000, unit: '฿' },
      { id: 'KR1.2', text: 'ลูกค้า Enterprise 15 ราย', textEn: '15 Enterprise customers', target: 15, current: 14, unit: '' },
      { id: 'KR1.3', text: 'Profit Margin ≥ 35%', textEn: 'Profit Margin ≥ 35%', target: 35, current: 32, unit: '%' },
    ],
  },
  {
    id: 'O2',
    objective: 'สร้างผลิตภัณฑ์ที่ลูกค้ารัก',
    objectiveEn: 'Build a product customers love',
    owner: 'Product Owner',
    keyResults: [
      { id: 'KR2.1', text: 'NPS ≥ 50', textEn: 'NPS ≥ 50', target: 50, current: 42, unit: '' },
      { id: 'KR2.2', text: 'Uptime ≥ 99.95%', textEn: 'Uptime ≥ 99.95%', target: 99.95, current: 99.97, unit: '%' },
      { id: 'KR2.3', text: 'Response Time < 120ms', textEn: 'Response Time < 120ms', target: 120, current: 105, unit: 'ms' },
    ],
  },
  {
    id: 'O3',
    objective: 'ขยายตลาดและฐานลูกค้า',
    objectiveEn: 'Expand market and customer base',
    owner: 'Sales',
    keyResults: [
      { id: 'KR3.1', text: 'ลูกค้าใหม่ 200 ราย/เดือน', textEn: '200 new customers/month', target: 200, current: 195, unit: '' },
      { id: 'KR3.2', text: 'Conversion Rate ≥ 60%', textEn: 'Conversion Rate ≥ 60%', target: 60, current: 57, unit: '%' },
      { id: 'KR3.3', text: 'Churn Rate < 2%', textEn: 'Churn Rate < 2%', target: 2, current: 1.7, unit: '%' },
    ],
  },
  {
    id: 'O4',
    objective: 'สร้างแบรนด์ที่เป็นที่รู้จัก',
    objectiveEn: 'Build a recognized brand',
    owner: 'Marketing',
    keyResults: [
      { id: 'KR4.1', text: 'Social followers ≥ 50K', textEn: 'Social followers ≥ 50K', target: 50000, current: 42000, unit: '' },
      { id: 'KR4.2', text: 'CAC ลดเหลือ ≤ ฿800', textEn: 'Reduce CAC to ≤ ฿800', target: 800, current: 860, unit: '฿' },
      { id: 'KR4.3', text: 'Marketing ROI ≥ 5x', textEn: 'Marketing ROI ≥ 5x', target: 5, current: 4.2, unit: 'x' },
    ],
  },
];

// Team OKRs
const DEFAULT_TEAM_OKRS = [
  {
    team: 'Engineering',
    teamEn: 'Engineering',
    icon: 'code-2',
    color: '#3b82f6',
    objectives: [
      {
        text: 'ปรับปรุงประสิทธิภาพระบบ',
        textEn: 'Improve system performance',
        keyResults: [
          { text: 'API p99 < 200ms', textEn: 'API p99 < 200ms', progress: 85 },
          { text: 'Deploy frequency 2x/week', textEn: 'Deploy frequency 2x/week', progress: 70 },
          { text: 'Test coverage ≥ 80%', textEn: 'Test coverage ≥ 80%', progress: 75 },
        ],
      },
    ],
  },
  {
    team: 'Sales',
    teamEn: 'Sales',
    icon: 'trending-up',
    color: '#22c55e',
    objectives: [
      {
        text: 'ขยายฐานลูกค้า Enterprise',
        textEn: 'Expand Enterprise customer base',
        keyResults: [
          { text: 'ปิด Enterprise 5 ราย/ไตรมาส', textEn: 'Close 5 Enterprise/quarter', progress: 80 },
          { text: 'Pipeline value ≥ ฿5M', textEn: 'Pipeline value ≥ ฿5M', progress: 90 },
          { text: 'Win rate ≥ 55%', textEn: 'Win rate ≥ 55%', progress: 65 },
        ],
      },
    ],
  },
  {
    team: 'Marketing',
    teamEn: 'Marketing',
    icon: 'megaphone',
    color: '#f97316',
    objectives: [
      {
        text: 'เพิ่ม inbound leads',
        textEn: 'Increase inbound leads',
        keyResults: [
          { text: 'Inbound leads 300/เดือน', textEn: 'Inbound leads 300/month', progress: 72 },
          { text: 'Content engagement +40%', textEn: 'Content engagement +40%', progress: 60 },
          { text: 'Email open rate ≥ 25%', textEn: 'Email open rate ≥ 25%', progress: 88 },
        ],
      },
    ],
  },
  {
    team: 'Product',
    teamEn: 'Product',
    icon: 'package',
    color: '#a855f7',
    objectives: [
      {
        text: 'เปิดตัว features ใหม่',
        textEn: 'Launch new features',
        keyResults: [
          { text: 'Ship 3 features/ไตรมาส', textEn: 'Ship 3 features/quarter', progress: 78 },
          { text: 'Feature adoption ≥ 40%', textEn: 'Feature adoption ≥ 40%', progress: 55 },
          { text: 'Customer satisfaction ≥ 4.5/5', textEn: 'Customer satisfaction ≥ 4.5/5', progress: 82 },
        ],
      },
    ],
  },
];

// Quarterly summaries
const DEFAULT_QUARTERLY = [
  { quarter: 'Q1', progress: 68, status: 'on_track', highlights: 'Revenue ahead of plan, Product uptime excellent', highlightsTh: 'รายได้เกินแผน, ระบบเสถียรดีเยี่ยม' },
  { quarter: 'Q2', progress: 72, status: 'on_track', highlights: 'Sales team exceeded targets, CAC improving', highlightsTh: 'ทีม Sales ทำเกินเป้า, CAC ลดลงต่อเนื่อง' },
  { quarter: 'Q3', progress: 78, status: 'on_track', highlights: 'Feature adoption growing, Churn rate down', highlightsTh: 'Feature adoption เพิ่มขึ้น, Churn rate ลดลง' },
  { quarter: 'Q4', progress: 0, status: 'pending', highlights: 'In progress', highlightsTh: 'กำลังดำเนินการ' },
];

// ── Mutable Working Data ──

export const OKR = {
  companyOKRs: DEFAULT_COMPANY_OKRS.map(o => ({
    ...o,
    keyResults: o.keyResults.map(kr => ({ ...kr })),
  })),
  teamOKRs: DEFAULT_TEAM_OKRS.map(t => ({
    ...t,
    objectives: t.objectives.map(obj => ({
      ...obj,
      keyResults: obj.keyResults.map(kr => ({ ...kr })),
    })),
  })),
  quarterly: DEFAULT_QUARTERLY.map(q => ({ ...q })),

  // Computed
  overallProgress: 0,
  lastUpdated: null,
};

// ── Recalculate ──

export function recalcOKR() {
  let totalProgress = 0;
  let totalKRs = 0;

  OKR.companyOKRs.forEach(o => {
    o.keyResults.forEach(kr => {
      let pct = 0;
      if (kr.unit === 'ms' || kr.unit === '฿' && kr.id?.includes('4.2')) {
        // Lower is better for response time and CAC
        pct = kr.target > 0 ? Math.min(((2 * kr.target - kr.current) / kr.target) * 100, 100) : 0;
      } else {
        pct = kr.target > 0 ? Math.min((kr.current / kr.target) * 100, 100) : 0;
      }
      kr.progress = Math.max(0, Math.round(pct));
      totalProgress += kr.progress;
      totalKRs++;
    });
  });

  OKR.overallProgress = totalKRs > 0 ? Math.round(totalProgress / totalKRs) : 0;
}

// ── Persistence ──

const STORAGE_KEY = 'okr_2026';

export function saveOKR() {
  OKR.lastUpdated = new Date().toISOString();
  storage.set(STORAGE_KEY, {
    companyOKRs: OKR.companyOKRs.map(o => ({
      ...o,
      keyResults: o.keyResults.map(kr => ({ ...kr })),
    })),
    quarterly: OKR.quarterly.map(q => ({ ...q })),
    lastUpdated: OKR.lastUpdated,
  });
}

export function loadOKR() {
  const saved = storage.get(STORAGE_KEY);
  if (!saved) { recalcOKR(); return false; }

  if (saved.companyOKRs) {
    OKR.companyOKRs = saved.companyOKRs.map(o => ({
      ...o,
      keyResults: o.keyResults.map(kr => ({ ...kr })),
    }));
  }
  if (saved.quarterly) {
    OKR.quarterly = saved.quarterly.map(q => ({ ...q }));
  }
  OKR.lastUpdated = saved.lastUpdated || null;

  recalcOKR();
  return true;
}

export function resetOKR() {
  OKR.companyOKRs = DEFAULT_COMPANY_OKRS.map(o => ({
    ...o,
    keyResults: o.keyResults.map(kr => ({ ...kr })),
  }));
  OKR.teamOKRs = DEFAULT_TEAM_OKRS.map(t => ({
    ...t,
    objectives: t.objectives.map(obj => ({
      ...obj,
      keyResults: obj.keyResults.map(kr => ({ ...kr })),
    })),
  }));
  OKR.quarterly = DEFAULT_QUARTERLY.map(q => ({ ...q }));
  recalcOKR();
  storage.remove(STORAGE_KEY);
}

// Init
loadOKR();
