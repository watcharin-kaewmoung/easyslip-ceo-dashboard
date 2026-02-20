// ============================================
// EasySlip 2026 — Page: API Analytics
// (Real-time data from Google Sheets)
// ============================================

import { API_DATA, fetchAllSheets, getProductStats, getGrandTotal, hasData } from '../data/api-analytics.js';
import { MetricCard } from '../components/cards.js';
import { createChart, destroyAllCharts } from '../components/charts.js';
import { setPageTitle, formatNumber, formatPercent } from '../utils.js';
import { t, getLang } from '../i18n.js';
import { showToast } from '../components/toast.js';

let activeProduct = 'main';
let activeMonth = 0;

export function render(container) {
  setPageTitle(t('page.apiAnalytics.title'));

  renderPage(container);

  // Auto-fetch on first visit if no data
  if (!hasData() && !API_DATA.isLoading) {
    doSync(container);
  }

  return () => destroyAllCharts();
}

async function doSync(container) {
  const btn = document.getElementById('api-sync-btn');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<i data-lucide="loader-2" style="width:16px;height:16px;animation:spin 1s linear infinite"></i> Syncing...';
  }

  await fetchAllSheets();

  if (API_DATA.error) {
    showToast(`Sync Error: ${API_DATA.error}`, 'error');
  } else {
    showToast(t('apiAnalytics.syncSuccess'), 'success');
  }

  renderPage(container);
}

function renderPage(container) {
  const dataAvailable = hasData();
  const isEn = getLang() === 'en';

  container.innerHTML = `
    <div class="fade-in">
      <!-- Header -->
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;flex-wrap:wrap;gap:12px">
        <div>
          <div style="font-size:.7rem;color:var(--text-muted)">
            ${API_DATA.lastFetched
              ? `${t('apiAnalytics.lastSync')}: ${new Date(API_DATA.lastFetched).toLocaleString()}`
              : t('apiAnalytics.notSynced')}
          </div>
        </div>
        <button id="api-sync-btn" class="btn btn-accent" style="display:flex;align-items:center;gap:6px;font-size:.8rem;padding:8px 16px">
          <i data-lucide="refresh-cw" style="width:14px;height:14px"></i>
          ${t('apiAnalytics.syncBtn')}
        </button>
      </div>

      ${dataAvailable ? renderContent(isEn) : renderEmpty()}
    </div>
  `;

  // Icons
  if (typeof lucide !== 'undefined') lucide.createIcons();

  // Sync button
  document.getElementById('api-sync-btn')?.addEventListener('click', () => doSync(container));

  if (dataAvailable) {
    setupProductTabs(container);
    setupMonthTabs(container);
    renderCharts();
  }
}

function renderEmpty() {
  return `
    <div class="card" style="text-align:center;padding:60px 24px">
      <i data-lucide="database" style="width:48px;height:48px;color:var(--text-muted);margin-bottom:16px"></i>
      <h3 style="margin:0 0 8px;font-size:1rem">${t('apiAnalytics.noData')}</h3>
      <p style="margin:0;font-size:.8rem;color:var(--text-muted)">${t('apiAnalytics.noDataHint')}</p>
    </div>
  `;
}

function renderContent(isEn) {
  const grand = getGrandTotal();
  const mainStats = getProductStats('main');
  const altStats = getProductStats('alt');
  const mainJan = API_DATA.main.months[0];
  const mainFeb = API_DATA.main.months[1];

  return `
    <!-- Grand Total Cards -->
    <div class="grid grid-4 stagger" style="margin-bottom:24px">
      ${MetricCard({
        title: t('apiAnalytics.totalApiCalls'),
        value: formatNumber(grand.totalCalls),
        icon: 'zap',
        iconBg: '#6366f1',
        subtitle: `${t('apiAnalytics.allProducts')}`,
      })}
      ${MetricCard({
        title: t('apiAnalytics.mainProduct'),
        value: formatNumber(grand.mainTotal),
        icon: 'server',
        iconBg: '#3b82f6',
        subtitle: `${t('apiAnalytics.dailyAvg')}: ${formatNumber(mainStats?.avgDaily || 0)}`,
      })}
      ${MetricCard({
        title: t('apiAnalytics.altProduct'),
        value: formatNumber(grand.altTotal),
        icon: 'smartphone',
        iconBg: '#22c55e',
        subtitle: `${t('apiAnalytics.dailyAvg')}: ${formatNumber(altStats?.avgDaily || 0)}`,
      })}
      ${MetricCard({
        title: t('apiAnalytics.janGrowth'),
        value: mainJan.growthPct != null ? (mainJan.growthPct >= 0 ? '+' : '') + mainJan.growthPct.toFixed(2) + '%' : '—',
        icon: 'trending-up',
        iconBg: (mainJan.growthPct || 0) >= 0 ? '#22c55e' : '#ef4444',
        subtitle: `vs Dec 2025 (${isEn ? 'EasySlip API' : 'EasySlip API'})`,
        change: mainFeb.growthPct != null ? `Feb: ${(mainFeb.growthPct >= 0 ? '+' : '') + mainFeb.growthPct.toFixed(2)}%` : '',
        direction: (mainFeb.growthPct || 0) >= 0 ? 'up' : 'down',
      })}
    </div>

    <!-- Product Tabs -->
    <div class="card" style="margin-bottom:24px">
      <div style="display:flex;gap:0;border-bottom:1px solid var(--border-default);margin-bottom:20px">
        <button class="tab-btn product-tab ${activeProduct === 'main' ? 'active' : ''}" data-product="main" style="flex:1">
          <i data-lucide="server" style="width:14px;height:14px"></i>
          EasySlip API
        </button>
        <button class="tab-btn product-tab ${activeProduct === 'alt' ? 'active' : ''}" data-product="alt" style="flex:1">
          <i data-lucide="smartphone" style="width:14px;height:14px"></i>
          EasySlip Lite
        </button>
      </div>

      <!-- Month Tabs -->
      <div style="display:flex;gap:8px;margin-bottom:20px">
        <button class="btn btn-sm month-tab ${activeMonth === 0 ? 'btn-accent' : 'btn-ghost'}" data-month="0">
          ${isEn ? 'Jan 2026' : 'ม.ค. 2026'}
        </button>
        <button class="btn btn-sm month-tab ${activeMonth === 1 ? 'btn-accent' : 'btn-ghost'}" data-month="1">
          ${isEn ? 'Feb 2026' : 'ก.พ. 2026'}
        </button>
      </div>

      <!-- Month Summary Cards -->
      ${renderMonthSummary(isEn)}

      <!-- Daily Trend Chart -->
      <div style="margin-bottom:24px">
        <h4 style="font-size:.8rem;font-weight:600;margin:0 0 12px;color:var(--text-secondary)">
          ${t('apiAnalytics.dailyTrend')}
        </h4>
        <div id="api-daily-chart" class="chart-container" style="min-height:300px"></div>
      </div>

      <!-- Bank vs TrueWallet Breakdown -->
      <div class="grid grid-2" style="margin-bottom:24px">
        <div>
          <h4 style="font-size:.8rem;font-weight:600;margin:0 0 12px;color:var(--text-secondary)">
            ${t('apiAnalytics.channelBreakdown')}
          </h4>
          <div id="api-channel-donut" class="chart-container" style="min-height:260px"></div>
        </div>
        <div>
          <h4 style="font-size:.8rem;font-weight:600;margin:0 0 12px;color:var(--text-secondary)">
            ${t('apiAnalytics.vipBreakdown')}
          </h4>
          <div id="api-vip-donut" class="chart-container" style="min-height:260px"></div>
        </div>
      </div>

      <!-- Daily Data Table -->
      <h4 style="font-size:.8rem;font-weight:600;margin:0 0 12px;color:var(--text-secondary)">
        ${t('apiAnalytics.dailyData')}
      </h4>
      <div style="overflow-x:auto;margin-bottom:8px">
        ${renderDailyTable(isEn)}
      </div>
    </div>

    <!-- Cumulative Chart -->
    <div class="card" style="margin-bottom:24px">
      <div class="card-header">
        <span class="card-title">${t('apiAnalytics.cumulativeChart')}</span>
      </div>
      <div id="api-cumulative-chart" class="chart-container" style="min-height:300px"></div>
    </div>

    <!-- Products Comparison -->
    <div class="card">
      <div class="card-header">
        <span class="card-title">${t('apiAnalytics.productsComparison')}</span>
      </div>
      <div id="api-comparison-chart" class="chart-container" style="min-height:300px"></div>
    </div>
  `;
}

function renderMonthSummary(isEn) {
  const prod = API_DATA[activeProduct];
  const m = prod.months[activeMonth];

  if (m.days.length === 0) {
    return `<div style="text-align:center;padding:24px;color:var(--text-muted);font-size:.85rem">${t('apiAnalytics.noMonthData')}</div>`;
  }

  const maxDay = Math.max(...m.days.map(d => d.combined));
  const minDay = Math.min(...m.days.map(d => d.combined));
  const bankPct = m.total > 0 ? (m.bankTotal / (m.bankTotal + m.tmTotal) * 100) : 0;

  return `
    <div class="grid grid-4 stagger" style="margin-bottom:20px">
      <div class="card card-sm" style="border-left:3px solid #6366f1">
        <div style="font-size:.7rem;color:var(--text-muted);margin-bottom:4px">${t('apiAnalytics.monthTotal')}</div>
        <div style="font-size:1.2rem;font-weight:800">${formatNumber(m.total)}</div>
        <div style="font-size:.65rem;color:var(--text-muted)">${m.days.length} ${isEn ? 'days' : 'วัน'}</div>
      </div>
      <div class="card card-sm" style="border-left:3px solid #3b82f6">
        <div style="font-size:.7rem;color:var(--text-muted);margin-bottom:4px">${t('apiAnalytics.dailyAvg')}</div>
        <div style="font-size:1.2rem;font-weight:800">${formatNumber(m.avgDaily)}</div>
        <div style="font-size:.65rem;color:var(--text-muted)">
          ${t('apiAnalytics.maxMin')}: ${formatNumber(maxDay)} / ${formatNumber(minDay)}
        </div>
      </div>
      <div class="card card-sm" style="border-left:3px solid #22c55e">
        <div style="font-size:.7rem;color:var(--text-muted);margin-bottom:4px">Bank / True Wallet</div>
        <div style="font-size:1.2rem;font-weight:800">${bankPct.toFixed(1)}%</div>
        <div style="font-size:.65rem;color:var(--text-muted)">Bank: ${formatNumber(m.bankTotal)}</div>
      </div>
      <div class="card card-sm" style="border-left:3px solid ${(m.growthPct || 0) >= 0 ? '#22c55e' : '#ef4444'}">
        <div style="font-size:.7rem;color:var(--text-muted);margin-bottom:4px">${t('apiAnalytics.growth')}</div>
        <div style="font-size:1.2rem;font-weight:800;color:${(m.growthPct || 0) >= 0 ? 'var(--color-success)' : 'var(--color-danger)'}">
          ${m.growthPct != null ? (m.growthPct >= 0 ? '+' : '') + m.growthPct.toFixed(2) + '%' : '—'}
        </div>
        <div style="font-size:.65rem;color:var(--text-muted)">${isEn ? 'vs previous month' : 'เทียบเดือนก่อน'}</div>
      </div>
    </div>
  `;
}

function renderDailyTable(isEn) {
  const prod = API_DATA[activeProduct];
  const m = prod.months[activeMonth];

  if (m.days.length === 0) return '';

  const rows = m.days.map(d => `
    <tr>
      <td style="white-space:nowrap">${d.date}</td>
      <td style="text-align:right;color:#3b82f6;font-weight:600">${formatNumber(d.bankVip)}</td>
      <td style="text-align:right;color:var(--text-muted)">${formatNumber(d.bankTest)}</td>
      <td style="text-align:right">${formatNumber(d.bankPrivate)}</td>
      <td style="text-align:right;font-weight:700">${formatNumber(d.bankTotal)}</td>
      <td style="text-align:right;color:#22c55e;font-weight:600">${formatNumber(d.tmVip)}</td>
      <td style="text-align:right;color:var(--text-muted)">${formatNumber(d.tmTest)}</td>
      <td style="text-align:right">${formatNumber(d.tmPrivate)}</td>
      <td style="text-align:right;font-weight:700">${formatNumber(d.tmTotal)}</td>
      <td style="text-align:right;font-weight:800;color:var(--color-accent)">${formatNumber(d.combined)}</td>
      <td style="text-align:right;font-weight:600">${formatNumber(d.cumulative)}</td>
    </tr>
  `).join('');

  return `
    <table class="data-table" style="font-size:.75rem;width:100%">
      <thead>
        <tr>
          <th rowspan="2">${isEn ? 'Date' : 'วันที่'}</th>
          <th colspan="4" style="text-align:center;border-bottom:2px solid #3b82f6">Bank</th>
          <th colspan="4" style="text-align:center;border-bottom:2px solid #22c55e">True Wallet</th>
          <th rowspan="2">${isEn ? 'Combined' : 'รวม'}</th>
          <th rowspan="2">${isEn ? 'Cumulative' : 'สะสม'}</th>
        </tr>
        <tr>
          <th style="text-align:right">VIP</th>
          <th style="text-align:right">Test</th>
          <th style="text-align:right">Private</th>
          <th style="text-align:right">${isEn ? 'Total' : 'รวม'}</th>
          <th style="text-align:right">VIP</th>
          <th style="text-align:right">Test</th>
          <th style="text-align:right">Private</th>
          <th style="text-align:right">${isEn ? 'Total' : 'รวม'}</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

function setupProductTabs(container) {
  container.querySelectorAll('.product-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      activeProduct = btn.dataset.product;
      renderPage(container);
    });
  });
}

function setupMonthTabs(container) {
  container.querySelectorAll('.month-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      activeMonth = parseInt(btn.dataset.month);
      renderPage(container);
    });
  });
}

function renderCharts() {
  const prod = API_DATA[activeProduct];
  const m = prod.months[activeMonth];
  const isEn = getLang() === 'en';

  if (m.days.length === 0) return;

  // ── Daily Trend (Area chart) ──
  createChart('api-daily-chart', {
    chart: { type: 'area', height: 300 },
    series: [
      { name: 'Bank', data: m.days.map(d => d.bankTotal) },
      { name: 'True Wallet', data: m.days.map(d => d.tmTotal) },
    ],
    xaxis: { categories: m.days.map(d => d.day.toString()) },
    colors: ['#3b82f6', '#22c55e'],
    fill: { type: 'gradient', gradient: { opacityFrom: 0.5, opacityTo: 0.05 } },
    stroke: { width: 2, curve: 'smooth' },
    tooltip: {
      y: { formatter: v => formatNumber(v) },
    },
    yaxis: {
      labels: {
        formatter: v => {
          if (v >= 1000000) return (v / 1000000).toFixed(1) + 'M';
          if (v >= 1000) return (v / 1000).toFixed(0) + 'K';
          return v.toString();
        },
      },
    },
  });

  // ── Channel Breakdown (Donut) ──
  createChart('api-channel-donut', {
    chart: { type: 'donut', height: 260 },
    series: [m.bankTotal, m.tmTotal],
    labels: ['Bank', 'True Wallet'],
    colors: ['#3b82f6', '#22c55e'],
    plotOptions: {
      pie: {
        donut: {
          size: '55%',
          labels: {
            show: true,
            total: {
              show: true,
              label: isEn ? 'Total' : 'รวม',
              formatter: () => formatNumber(m.total),
            },
          },
        },
      },
    },
    legend: { position: 'bottom' },
  });

  // ── VIP/Private Breakdown (Donut) ──
  const bankVipTotal = m.days.reduce((s, d) => s + d.bankVip, 0);
  const bankPrivateTotal = m.days.reduce((s, d) => s + d.bankPrivate, 0);
  const bankTestTotal = m.days.reduce((s, d) => s + d.bankTest, 0);
  const tmVipTotal = m.days.reduce((s, d) => s + d.tmVip, 0);

  createChart('api-vip-donut', {
    chart: { type: 'donut', height: 260 },
    series: [bankVipTotal, bankPrivateTotal, tmVipTotal, bankTestTotal],
    labels: ['Bank VIP', 'Bank Private', 'TM VIP', 'Test'],
    colors: ['#3b82f6', '#60a5fa', '#22c55e', '#94a3b8'],
    plotOptions: { pie: { donut: { size: '55%' } } },
    legend: { position: 'bottom' },
  });

  // ── Cumulative Chart ──
  const mainJanDays = API_DATA.main.months[0].days;
  const mainFebDays = API_DATA.main.months[1].days;
  const maxDays = Math.max(mainJanDays.length, mainFebDays.length, 31);
  const labels = Array.from({ length: maxDays }, (_, i) => (i + 1).toString());

  const series = [];
  if (mainJanDays.length > 0) {
    series.push({ name: isEn ? 'Jan - EasySlip API' : 'ม.ค. - EasySlip API', data: mainJanDays.map(d => d.cumulative) });
  }
  if (mainFebDays.length > 0) {
    series.push({ name: isEn ? 'Feb - EasySlip API' : 'ก.พ. - EasySlip API', data: mainFebDays.map(d => d.cumulative) });
  }
  const altJanDays = API_DATA.alt.months[0].days;
  const altFebDays = API_DATA.alt.months[1].days;
  if (altJanDays.length > 0) {
    series.push({ name: isEn ? 'Jan - Lite' : 'ม.ค. - Lite', data: altJanDays.map(d => d.cumulative) });
  }
  if (altFebDays.length > 0) {
    series.push({ name: isEn ? 'Feb - Lite' : 'ก.พ. - Lite', data: altFebDays.map(d => d.cumulative) });
  }

  createChart('api-cumulative-chart', {
    chart: { type: 'line', height: 300 },
    series,
    xaxis: { categories: labels, title: { text: isEn ? 'Day of Month' : 'วันที่' } },
    colors: ['#3b82f6', '#6366f1', '#22c55e', '#10b981'],
    stroke: { width: 2, curve: 'smooth' },
    markers: { size: 2 },
    tooltip: { y: { formatter: v => formatNumber(v) } },
    yaxis: {
      labels: {
        formatter: v => {
          if (v >= 1000000) return (v / 1000000).toFixed(1) + 'M';
          if (v >= 1000) return (v / 1000).toFixed(0) + 'K';
          return v.toString();
        },
      },
    },
  });

  // ── Products Comparison (Bar) ──
  const compSeries = [
    {
      name: 'EasySlip API',
      data: API_DATA.main.months.map(m2 => m2.total),
    },
    {
      name: 'EasySlip Lite',
      data: API_DATA.alt.months.map(m2 => m2.total),
    },
  ];

  createChart('api-comparison-chart', {
    chart: { type: 'bar', height: 300 },
    series: compSeries,
    xaxis: { categories: [isEn ? 'Jan 2026' : 'ม.ค. 2026', isEn ? 'Feb 2026' : 'ก.พ. 2026'] },
    colors: ['#3b82f6', '#22c55e'],
    plotOptions: { bar: { borderRadius: 6, columnWidth: '50%' } },
    tooltip: { y: { formatter: v => formatNumber(v) } },
    yaxis: {
      labels: {
        formatter: v => {
          if (v >= 1000000) return (v / 1000000).toFixed(1) + 'M';
          return v.toString();
        },
      },
    },
  });
}
