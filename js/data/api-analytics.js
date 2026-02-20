// ============================================
// EasySlip 2026 — API Analytics Data (Google Sheets)
// ============================================

import { storage } from '../storage.js';

// ── Google Sheets Config ──
const SHEET_ID = '1nU2Yyw3ilOeCPP7ZYjJD0BFLNTrp8arXxSdnR_BPjC0';
const GVIZ_BASE = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv`;

const SHEET_CONFIG = [
  { key: 'main_jan', gid: 262898847,  product: 'main', monthIdx: 0 },
  { key: 'main_feb', gid: 543168725,  product: 'main', monthIdx: 1 },
  { key: 'alt_jan',  gid: 1763922984, product: 'alt',  monthIdx: 0 },
  { key: 'alt_feb',  gid: 1098537339, product: 'alt',  monthIdx: 1 },
];

// ── Data Structure ──

export const API_DATA = {
  main: {
    label: 'EasySlip API',
    labelEn: 'EasySlip API',
    months: [
      { label: 'ม.ค. 2026', labelEn: 'Jan 2026', days: [], total: 0, bankTotal: 0, tmTotal: 0, avgDaily: 0, growthPct: null },
      { label: 'ก.พ. 2026', labelEn: 'Feb 2026', days: [], total: 0, bankTotal: 0, tmTotal: 0, avgDaily: 0, growthPct: null },
    ],
  },
  alt: {
    label: 'EasySlip Lite',
    labelEn: 'EasySlip Lite',
    months: [
      { label: 'ม.ค. 2026', labelEn: 'Jan 2026', days: [], total: 0, bankTotal: 0, tmTotal: 0, avgDaily: 0, growthPct: null },
      { label: 'ก.พ. 2026', labelEn: 'Feb 2026', days: [], total: 0, bankTotal: 0, tmTotal: 0, avgDaily: 0, growthPct: null },
    ],
  },
  lastFetched: null,
  isLoading: false,
  error: null,
};

const STORAGE_KEY = 'api_analytics_2026';

// ── CSV Parser ──

function parseNum(str) {
  if (!str) return 0;
  return Number(str.replace(/,/g, '').replace(/"/g, '')) || 0;
}

function parseCSVRow(line) {
  const fields = [];
  let current = '';
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') { inQ = !inQ; }
    else if (ch === ',' && !inQ) { fields.push(current); current = ''; }
    else { current += ch; }
  }
  fields.push(current);
  return fields;
}

function parseSheetCSV(csvText) {
  const lines = csvText.split('\n').filter(l => l.trim());
  const days = [];
  let sheetGrowthPct = null;

  for (let i = 1; i < lines.length; i++) {
    const f = parseCSVRow(lines[i]);
    const dateStr = (f[0] || '').trim();

    // Check for growth percentage row (last summary row)
    if (!dateStr && f[12]) {
      const gStr = f[12].trim();
      if (gStr.endsWith('%')) {
        sheetGrowthPct = parseFloat(gStr.replace(/%/g, '').replace(/,/g, ''));
      }
      continue;
    }

    // Skip non-date rows
    if (!/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) continue;

    const combined = parseNum(f[11]);
    if (combined === 0) continue; // Future days not yet filled

    days.push({
      date: dateStr,
      day: parseInt(dateStr.split('/')[0]),
      bankVip: parseNum(f[1]),
      bankTest: parseNum(f[2]),
      bankPrivate: parseNum(f[3]),
      bankTotal: parseNum(f[4]),
      tmVip: parseNum(f[6]),
      tmTest: parseNum(f[7]),
      tmPrivate: parseNum(f[8]),
      tmTotal: parseNum(f[9]),
      combined,
      cumulative: parseNum(f[12]),
    });
  }

  return { days, growthPct: sheetGrowthPct };
}

// ── Recalculate month stats ──

function recalcMonth(monthData) {
  const { days } = monthData;
  if (days.length === 0) {
    monthData.total = 0;
    monthData.bankTotal = 0;
    monthData.tmTotal = 0;
    monthData.avgDaily = 0;
    return;
  }
  const lastDay = days[days.length - 1];
  monthData.total = lastDay.cumulative;
  monthData.bankTotal = days.reduce((s, d) => s + d.bankTotal, 0);
  monthData.tmTotal = days.reduce((s, d) => s + d.tmTotal, 0);
  monthData.avgDaily = Math.round(monthData.total / days.length);
}

// ── Fetch from Google Sheets ──

export async function fetchAllSheets() {
  API_DATA.isLoading = true;
  API_DATA.error = null;

  try {
    const results = await Promise.allSettled(
      SHEET_CONFIG.map(async (sheet) => {
        const url = `${GVIZ_BASE}&gid=${sheet.gid}`;
        const resp = await fetch(url);
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const csv = await resp.text();
        return { ...sheet, csv };
      })
    );

    let fetchedCount = 0;
    for (const result of results) {
      if (result.status === 'fulfilled') {
        const { product, monthIdx, csv } = result.value;
        const parsed = parseSheetCSV(csv);
        const monthData = API_DATA[product].months[monthIdx];
        monthData.days = parsed.days;
        monthData.growthPct = parsed.growthPct;
        recalcMonth(monthData);
        fetchedCount++;
      }
    }

    if (fetchedCount === 0) {
      API_DATA.error = 'Could not fetch any sheets. Check if the sheet is shared publicly.';
    } else {
      API_DATA.lastFetched = new Date().toISOString();
      saveApiData();
    }

  } catch (err) {
    API_DATA.error = err.message;
    console.error('[api-analytics] Fetch error:', err);
  } finally {
    API_DATA.isLoading = false;
  }

  return API_DATA;
}

// ── Persistence ──

export function saveApiData() {
  const serialize = (prod) => ({
    months: prod.months.map(m => ({
      days: m.days,
      total: m.total,
      bankTotal: m.bankTotal,
      tmTotal: m.tmTotal,
      avgDaily: m.avgDaily,
      growthPct: m.growthPct,
    })),
  });

  storage.set(STORAGE_KEY, {
    main: serialize(API_DATA.main),
    alt: serialize(API_DATA.alt),
    lastFetched: API_DATA.lastFetched,
  });
}

export function loadApiData() {
  const saved = storage.get(STORAGE_KEY);
  if (!saved) return false;

  for (const prod of ['main', 'alt']) {
    if (saved[prod]?.months) {
      saved[prod].months.forEach((m, i) => {
        if (m && API_DATA[prod].months[i]) {
          API_DATA[prod].months[i].days = m.days || [];
          API_DATA[prod].months[i].total = m.total || 0;
          API_DATA[prod].months[i].bankTotal = m.bankTotal || 0;
          API_DATA[prod].months[i].tmTotal = m.tmTotal || 0;
          API_DATA[prod].months[i].avgDaily = m.avgDaily || 0;
          API_DATA[prod].months[i].growthPct = m.growthPct ?? null;
        }
      });
    }
  }
  API_DATA.lastFetched = saved.lastFetched || null;
  return true;
}

export function resetApiData() {
  for (const prod of ['main', 'alt']) {
    API_DATA[prod].months.forEach(m => {
      m.days = [];
      m.total = 0;
      m.bankTotal = 0;
      m.tmTotal = 0;
      m.avgDaily = 0;
      m.growthPct = null;
    });
  }
  API_DATA.lastFetched = null;
  API_DATA.error = null;
  storage.remove(STORAGE_KEY);
}

// ── Aggregation helpers ──

export function getProductStats(productKey) {
  const prod = API_DATA[productKey];
  if (!prod) return null;

  const allDays = prod.months.flatMap(m => m.days);
  const totalCalls = prod.months.reduce((s, m) => s + m.total, 0);
  const avgDaily = allDays.length > 0 ? Math.round(totalCalls / allDays.length) : 0;

  return {
    totalCalls,
    avgDaily,
    maxDay: allDays.length > 0 ? Math.max(...allDays.map(d => d.combined)) : 0,
    minDay: allDays.length > 0 ? Math.min(...allDays.map(d => d.combined)) : 0,
    totalDays: allDays.length,
    bankTotal: prod.months.reduce((s, m) => s + m.bankTotal, 0),
    tmTotal: prod.months.reduce((s, m) => s + m.tmTotal, 0),
    bankPct: 0, // computed below
    tmPct: 0,
  };
}

export function getGrandTotal() {
  const mainStats = getProductStats('main');
  const altStats = getProductStats('alt');
  return {
    totalCalls: (mainStats?.totalCalls || 0) + (altStats?.totalCalls || 0),
    mainTotal: mainStats?.totalCalls || 0,
    altTotal: altStats?.totalCalls || 0,
  };
}

export function hasData() {
  return API_DATA.main.months.some(m => m.days.length > 0)
      || API_DATA.alt.months.some(m => m.days.length > 0);
}

// ── Init ──
loadApiData();
