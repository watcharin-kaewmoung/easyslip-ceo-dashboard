// ============================================
// EasySlip 2026 — Page 2: Revenue Analysis (Redesigned)
// Tab-based workflow: Budget → Revenue → Compare → Charts
// Channel cards instead of monolithic tables
// ============================================

import { REVENUE, getMoMGrowth, getChannelShare, recalcRevenue, saveRevenue, resetRevenue, getLastSavedRevenue } from '../data/revenue.js';
import { BUDGET, saveBudget, recalcBudgetRevenue, getLastSavedBudget } from '../data/budget-actual.js';
import { TOTAL_MONTHLY_COST } from '../data/expenses.js';
import { CHANNEL_LIST } from '../data/constants.js';
import { createChart, updateChart, destroyAllCharts } from '../components/charts.js';
import { showToast } from '../components/toast.js';
import { setPageTitle, formatBaht, formatBahtCompact, formatPercent, formatPercentSigned, downloadCSV, debounce, sum } from '../utils.js';
import { t, getMonths } from '../i18n.js';
import {
  formatInputDisplay as _formatInputDisplay,
  parseInputValue as _parseInputValue,
  formatLastSaved,
  updateUndoButton as _updateUndoButton,
  updateSaveIndicator as _updateSaveIndicator,
  reformatInput,
  createAutoSave,
} from '../shared/editable-page.js';

const CHANNELS = CHANNEL_LIST.map(c => ({ key: c.key, label: c.label, color: c.color, icon: c.icon }));

export function render(container) {
  setPageTitle(t('page.revenue.title'));

  const months = getMonths();
  let undoBuffer = null;
  let isDirty = false;

  // Active tab (persisted in sessionStorage)
  const TAB_KEY = 'revenue_active_tab';
  let activeMainTab = sessionStorage.getItem(TAB_KEY) || 'budget';

  function formatInputDisplay(v) { return _formatInputDisplay(v); }
  function parseInputValue(s) { return _parseInputValue(s); }

  // Overflow menu close handler
  function closeOverflowMenu() {
    const menu = container.querySelector('#rev-overflow-menu');
    if (menu) menu.style.display = 'none';
  }

  // ── Snapshot for undo ──

  function snapshotAll() {
    const rev = {};
    const budgetCh = {};
    for (const ch of ['bot', 'api', 'crm', 'sms']) {
      rev[ch] = [...REVENUE[ch]];
      budgetCh[ch] = [...BUDGET.revenueByChannel[ch]];
    }
    return { rev, budgetCh };
  }

  function restoreSnapshot(snap) {
    for (const ch of ['bot', 'api', 'crm', 'sms']) {
      for (let i = 0; i < 12; i++) {
        REVENUE[ch][i] = snap.rev[ch][i];
        BUDGET.revenueByChannel[ch][i] = snap.budgetCh[ch][i];
      }
    }
    recalcRevenue();
    recalcBudgetRevenue();
  }

  // ── Auto-save ──

  function saveAll() {
    saveRevenue();
    saveBudget();
  }

  const autoSaveDebounced = createAutoSave({
    saveFn: () => { undoBuffer = snapshotAll(); saveAll(); },
    setDirty: (v) => { isDirty = v; },
    updateIndicator: () => updateSummaryBar(),
  });

  const updateChartDebounced = debounce(() => updateAllCharts(), 2000);

  // ── Helpers ──

  function getStatusBadge(pct) {
    const abs = Math.abs(pct);
    if (abs <= 5) return `<span class="badge badge-success">${t('status.onTrack')}</span>`;
    if (abs <= 15) return `<span class="badge badge-warning">${t('status.warning')}</span>`;
    return `<span class="badge badge-danger">${t('status.critical')}</span>`;
  }

  // ── Summary Bar ──

  function buildSummaryBar() {
    const revTotal = REVENUE.annualTotal;
    const budgetTotal = sum(BUDGET.revenue);
    const varPct = budgetTotal > 0 ? ((revTotal - budgetTotal) / budgetTotal) * 100 : 0;
    const varColor = varPct >= 0 ? 'var(--color-success, #22c55e)' : varPct >= -15 ? 'var(--color-warning, #f59e0b)' : 'var(--color-danger, #ef4444)';
    const lastSavedStr = formatLastSaved(getLastSavedRevenue()) || formatLastSaved(getLastSavedBudget());

    return `
      <div id="rev-summary-bar" style="position:sticky;top:var(--header-height);z-index:40;background:var(--bg-surface);margin:0 -32px 24px;padding:14px 32px;border-bottom:1px solid var(--border-default);box-shadow:var(--shadow-sm)">
        <div style="display:flex;align-items:center;gap:24px;flex-wrap:wrap">
          <div style="display:flex;gap:24px;flex:1;min-width:0;flex-wrap:wrap">
            <div>
              <div style="font-size:.7rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px">${t('revenue.annualTotal')}</div>
              <div id="rev-summary-total" style="font-size:1.1rem;font-weight:700">${formatBahtCompact(revTotal)}</div>
            </div>
            <div>
              <div style="font-size:.7rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px">${t('card.target')}</div>
              <div id="rev-summary-budget" style="font-size:1.1rem;font-weight:700">${formatBahtCompact(budgetTotal)}</div>
            </div>
            <div>
              <div style="font-size:.7rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px">${t('summary.variance')}</div>
              <div id="rev-summary-variance" style="font-size:1.1rem;font-weight:700;color:${varColor}">
                ${revTotal > 0 ? formatPercentSigned(varPct) : '—'}
                ${revTotal > 0 && Math.abs(varPct) <= 5 ? ` <span style="font-size:.75rem">${t('status.onTrack')}</span>` : ''}
              </div>
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
            <button class="btn btn-primary btn-sm" id="btn-save-all">
              <i data-lucide="save" style="width:14px;height:14px"></i> ${t('btn.save')}
            </button>
            <button class="btn btn-secondary btn-sm" id="btn-undo" disabled style="opacity:0.5;cursor:not-allowed">
              <i data-lucide="undo-2" style="width:14px;height:14px"></i> ${t('btn.undo')}
            </button>
            <div style="position:relative;display:inline-block">
              <button class="btn btn-secondary btn-sm" id="btn-overflow" title="${t('btn.more')}">
                <i data-lucide="more-horizontal" style="width:14px;height:14px"></i>
              </button>
              <div id="rev-overflow-menu" style="display:none;position:absolute;right:0;top:100%;margin-top:4px;background:var(--bg-surface);border:1px solid var(--border-default);border-radius:var(--radius-md);box-shadow:var(--shadow-md);min-width:180px;z-index:50;padding:4px 0">
                <button class="overflow-item" id="btn-export-csv" style="display:flex;align-items:center;gap:8px;width:100%;padding:8px 16px;border:none;background:none;color:var(--text-primary);cursor:pointer;font-size:.85rem;text-align:left">
                  <i data-lucide="file-spreadsheet" style="width:14px;height:14px"></i> ${t('btn.exportCsv')}
                </button>
              </div>
            </div>
            <span id="rev-save-indicator" class="save-indicator" style="font-size:.7rem;color:var(--text-muted)">${isDirty ? t('status.unsaved') : (lastSavedStr ? `${t('status.lastSaved')}: ${lastSavedStr}` : '')}</span>
          </div>
        </div>
      </div>`;
  }

  function updateSummaryBar() {
    const revTotal = REVENUE.annualTotal;
    const budgetTotal = sum(BUDGET.revenue);
    const varPct = budgetTotal > 0 ? ((revTotal - budgetTotal) / budgetTotal) * 100 : 0;
    const varColor = varPct >= 0 ? 'var(--color-success, #22c55e)' : varPct >= -15 ? 'var(--color-warning, #f59e0b)' : 'var(--color-danger, #ef4444)';

    const tEl = container.querySelector('#rev-summary-total');
    if (tEl) tEl.textContent = formatBahtCompact(revTotal);
    const bEl = container.querySelector('#rev-summary-budget');
    if (bEl) bEl.textContent = formatBahtCompact(budgetTotal);
    const vEl = container.querySelector('#rev-summary-variance');
    if (vEl) {
      vEl.style.color = varColor;
      vEl.textContent = revTotal > 0 ? formatPercentSigned(varPct) + (Math.abs(varPct) <= 5 ? ` ${t('status.onTrack')}` : '') : '—';
    }

    _updateUndoButton(container, undoBuffer);
    _updateSaveIndicator(container, {
      selector: '#rev-save-indicator',
      isDirty,
      getLastSaved: () => getLastSavedRevenue() || getLastSavedBudget(),
    });
  }

  // ── Main Tabs ──

  function buildMainTabs() {
    const tabs = [
      { key: 'budget', label: `① ${t('tab.budget')}` },
      { key: 'revenue', label: `② ${t('tab.actual')}` },
      { key: 'compare', label: `③ ${t('tab.compare')}` },
      { key: 'charts', label: `④ ${t('tab.charts')}` },
    ];
    return `
      <div class="tab-group" id="rev-main-tabs" style="margin-bottom:24px">
        ${tabs.map(tab => `<button class="tab-btn${tab.key === activeMainTab ? ' active' : ''}" data-main-tab="${tab.key}">${tab.label}</button>`).join('')}
      </div>`;
  }

  function switchMainTab(tab) {
    activeMainTab = tab;
    sessionStorage.setItem(TAB_KEY, tab);
    container.querySelectorAll('#rev-main-tabs .tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.mainTab === tab);
    });
    destroyAllCharts();
    const tc = container.querySelector('#rev-tab-content');
    if (tc) {
      tc.innerHTML = buildTabContent();
      if (typeof lucide !== 'undefined') lucide.createIcons({ nodes: [tc] });
      if (tab === 'charts') initCharts();
    }
  }

  // ── Tab Content ──

  function buildTabContent() {
    switch (activeMainTab) {
      case 'budget': return buildBudgetCards();
      case 'revenue': return buildRevenueCards();
      case 'compare': return buildCompareCards();
      case 'charts': return buildChartsTab();
      default: return buildBudgetCards();
    }
  }

  // ── Budget Tab: Per-channel Target Cards ──

  function buildBudgetCards() {
    return `<div class="grid grid-2">${CHANNELS.map(ch => buildBudgetChannelCard(ch)).join('')}</div>`;
  }

  function buildBudgetChannelCard(ch) {
    const annual = sum(BUDGET.revenueByChannel[ch.key]);

    return `
      <div class="card" style="border-left:4px solid ${ch.color}">
        <div class="card-header" style="padding-bottom:12px">
          <span class="card-title" style="display:flex;align-items:center;gap:8px">
            <span style="width:10px;height:10px;border-radius:50%;background:${ch.color};display:inline-block"></span>
            ${ch.label}
          </span>
          <span style="font-size:.85rem;color:var(--text-muted)">${t('card.annualBudget')}: <strong>${formatBahtCompact(annual)}</strong></span>
        </div>
        <div class="data-table-wrapper">
          <table class="data-table data-table-dense">
            <thead><tr>
              <th>${t('th.month')}</th>
              <th class="text-right">${t('card.target')}</th>
            </tr></thead>
            <tbody>
              ${months.map((m, i) => `<tr>
                <td>${m}</td>
                <td class="text-right">
                  <input type="text" inputmode="numeric" class="ba-input"
                         data-input-type="budget" data-channel="${ch.key}" data-month="${i}"
                         value="${formatInputDisplay(BUDGET.revenueByChannel[ch.key][i])}" placeholder="0">
                </td>
              </tr>`).join('')}
            </tbody>
            <tfoot><tr class="total-row">
              <td><strong>${t('th.total')}</strong></td>
              <td class="text-right" data-card-cat-total="budget-${ch.key}"><strong>${formatBaht(annual)}</strong></td>
            </tr></tfoot>
          </table>
        </div>
      </div>`;
  }

  // ── Revenue Tab: Channel Cards ──

  function buildRevenueCards() {
    return `<div class="grid grid-2">${CHANNELS.map(ch => buildRevenueChannelCard(ch)).join('')}</div>`;
  }

  function buildRevenueChannelCard(ch) {
    const annual = sum(REVENUE[ch.key]);
    const share = getChannelShare();
    const sharePct = share[ch.key] || 0;
    const budgetTotal = sum(BUDGET.revenue);
    const revTotal = REVENUE.annualTotal;
    const varPct = budgetTotal > 0 ? ((revTotal - budgetTotal) / budgetTotal) * 100 : 0;
    const progressPct = budgetTotal > 0 ? Math.min(revTotal / budgetTotal * 100, 100) : 0;

    return `
      <div class="card" style="border-left:4px solid ${ch.color}">
        <div class="card-header" style="padding-bottom:12px">
          <span class="card-title" style="display:flex;align-items:center;gap:8px">
            <span style="width:10px;height:10px;border-radius:50%;background:${ch.color};display:inline-block"></span>
            ${ch.label}
          </span>
          <span style="font-size:.8rem;color:var(--text-muted);display:flex;align-items:center;gap:12px;flex-wrap:wrap">
            <span>${t('card.annualActual')}: <strong>${formatBahtCompact(annual)}</strong></span>
            <span>${formatPercent(sharePct)} ${t('misc.share')}</span>
          </span>
        </div>
        <div class="data-table-wrapper">
          <table class="data-table data-table-dense">
            <thead><tr>
              <th>${t('th.month')}</th>
              <th class="text-right">${t('card.actual')}</th>
            </tr></thead>
            <tbody>
              ${months.map((m, i) => `<tr>
                <td>${m}</td>
                <td class="text-right">
                  <input type="text" inputmode="numeric" class="ba-input"
                         data-input-type="revenue" data-channel="${ch.key}" data-month="${i}"
                         value="${formatInputDisplay(REVENUE[ch.key][i])}" placeholder="0">
                </td>
              </tr>`).join('')}
            </tbody>
            <tfoot><tr class="total-row">
              <td><strong>${t('th.total')}</strong></td>
              <td class="text-right" data-card-cat-total="rev-${ch.key}"><strong>${formatBaht(annual)}</strong></td>
            </tr></tfoot>
          </table>
        </div>
      </div>`;
  }

  // ── Compare Tab ──

  function buildCompareCards() {
    return buildGrandTotalCompareCard() + `<div class="grid grid-2">${CHANNELS.map(ch => buildCompareChannelCard(ch)).join('')}</div>`;
  }

  function buildGrandTotalCompareCard() {
    const budgetArr = BUDGET.revenue;
    const actualArr = REVENUE.total;
    const budgetTotal = sum(budgetArr);
    const actualTotal = REVENUE.annualTotal;
    const varPct = budgetTotal > 0 ? ((actualTotal - budgetTotal) / budgetTotal) * 100 : 0;

    return `
      <div class="card" style="margin-bottom:24px;border-left:4px solid var(--color-primary, #6366f1);background:var(--bg-base)">
        <div class="card-header" style="padding-bottom:12px">
          <span class="card-title" style="font-size:1rem">${t('revenue.annualTotal')}</span>
          <span style="font-size:.85rem;display:flex;align-items:center;gap:12px">
            <span>${t('card.target')}: <strong>${formatBahtCompact(budgetTotal)}</strong></span>
            <span>${t('card.actual')}: <strong>${formatBahtCompact(actualTotal)}</strong></span>
            ${actualTotal > 0 ? getStatusBadge(varPct) : ''}
          </span>
        </div>
        <div class="data-table-wrapper">
          <table class="data-table data-table-dense">
            <thead><tr>
              <th>${t('th.month')}</th>
              <th class="text-right">${t('card.target')}</th>
              <th class="text-right">${t('card.actual')}</th>
              <th class="text-right">${t('th.variance')}</th>
              <th class="text-center">${t('th.status')}</th>
            </tr></thead>
            <tbody>
              ${months.map((m, i) => {
                const b = budgetArr[i];
                const a = actualArr[i];
                const pct = b > 0 ? ((a - b) / b) * 100 : 0;
                return `<tr>
                  <td>${m}</td>
                  <td class="text-right">${formatBaht(b)}</td>
                  <td class="text-right">${a > 0 ? formatBaht(a) : '—'}</td>
                  <td class="text-right ${pct > 0 ? 'text-success' : pct < 0 ? 'text-danger' : ''}">${a > 0 ? formatPercentSigned(pct) : '—'}</td>
                  <td class="text-center">${a > 0 ? getStatusBadge(pct) : `<span class="badge badge-muted">${t('status.pending')}</span>`}</td>
                </tr>`;
              }).join('')}
            </tbody>
            <tfoot><tr class="total-row">
              <td><strong>${t('th.total')}</strong></td>
              <td class="text-right"><strong>${formatBaht(budgetTotal)}</strong></td>
              <td class="text-right"><strong>${formatBaht(actualTotal)}</strong></td>
              <td class="text-right ${varPct > 0 ? 'text-success' : varPct < 0 ? 'text-danger' : ''}"><strong>${actualTotal > 0 ? formatPercentSigned(varPct) : '—'}</strong></td>
              <td class="text-center">${actualTotal > 0 ? getStatusBadge(varPct) : `<span class="badge badge-muted">${t('status.pending')}</span>`}</td>
            </tr></tfoot>
          </table>
        </div>
      </div>`;
  }

  function buildCompareChannelCard(ch) {
    const budgetArr = BUDGET.revenueByChannel[ch.key];
    const actualArr = REVENUE[ch.key];
    const annualBudget = sum(budgetArr);
    const annualActual = sum(actualArr);
    const annualVarPct = annualBudget > 0 ? ((annualActual - annualBudget) / annualBudget) * 100 : 0;

    return `
      <div class="card" style="border-left:4px solid ${ch.color}">
        <div class="card-header" style="padding-bottom:12px">
          <span class="card-title" style="display:flex;align-items:center;gap:8px">
            <span style="width:10px;height:10px;border-radius:50%;background:${ch.color};display:inline-block"></span>
            ${ch.label}
          </span>
          <span style="font-size:.85rem;display:flex;align-items:center;gap:12px;flex-wrap:wrap">
            <span>${t('card.target')}: <strong>${formatBahtCompact(annualBudget)}</strong></span>
            <span>${t('card.actual')}: <strong>${formatBahtCompact(annualActual)}</strong></span>
            ${annualActual > 0 ? getStatusBadge(annualVarPct) : ''}
          </span>
        </div>
        <div class="data-table-wrapper">
          <table class="data-table data-table-dense">
            <thead><tr>
              <th>${t('th.month')}</th>
              <th class="text-right">${t('card.target')}</th>
              <th class="text-right">${t('card.actual')}</th>
              <th class="text-right">${t('th.variance')}</th>
              <th class="text-center">${t('th.status')}</th>
            </tr></thead>
            <tbody>
              ${months.map((m, i) => {
                const b = budgetArr[i];
                const a = actualArr[i];
                const pct = b > 0 ? ((a - b) / b) * 100 : 0;
                return `<tr>
                  <td>${m}</td>
                  <td class="text-right">${formatBaht(b)}</td>
                  <td class="text-right">${a > 0 ? formatBaht(a) : '—'}</td>
                  <td class="text-right ${pct > 0 ? 'text-success' : pct < 0 ? 'text-danger' : ''}">${a > 0 ? formatPercentSigned(pct) : '—'}</td>
                  <td class="text-center">${a > 0 ? getStatusBadge(pct) : `<span class="badge badge-muted">${t('status.pending')}</span>`}</td>
                </tr>`;
              }).join('')}
            </tbody>
            <tfoot><tr class="total-row">
              <td><strong>${t('th.total')}</strong></td>
              <td class="text-right"><strong>${formatBaht(annualBudget)}</strong></td>
              <td class="text-right"><strong>${formatBaht(annualActual)}</strong></td>
              <td class="text-right ${annualVarPct > 0 ? 'text-success' : annualVarPct < 0 ? 'text-danger' : ''}"><strong>${annualActual > 0 ? formatPercentSigned(annualVarPct) : '—'}</strong></td>
              <td class="text-center">${annualActual > 0 ? getStatusBadge(annualVarPct) : `<span class="badge badge-muted">${t('status.pending')}</span>`}</td>
            </tr></tfoot>
          </table>
        </div>
      </div>`;
  }

  // ── Charts Tab ──

  function buildChartsTab() {
    return `
      <div class="grid grid-2" style="margin-bottom:24px">
        <div class="card"><div class="card-header"><span class="card-title">${t('revenue.monthlyByChannel')} (%)</span></div><div id="rev-stacked-pct" class="chart-container"></div></div>
        <div class="card"><div class="card-header"><span class="card-title">${t('revenue.shareTrend')}</span></div><div id="rev-share-trend" class="chart-container"></div></div>
      </div>
      <div class="grid grid-2" style="margin-bottom:24px">
        <div class="card"><div class="card-header"><span class="card-title">${t('revenue.cumulativeVsTarget')}</span></div><div id="rev-cumulative" class="chart-container"></div></div>
        <div class="card"><div class="card-header"><span class="card-title">${t('revenue.profitMargin')}</span></div><div id="rev-profit-margin" class="chart-container"></div></div>
      </div>
      <div class="grid grid-2" style="margin-bottom:24px">
        <div class="card"><div class="card-header"><span class="card-title">${t('revenue.momGrowth')}</span></div><div id="rev-growth-lines" class="chart-container"></div></div>
        <div class="card"><div class="card-header"><span class="card-title">${t('revenue.emergingChannels')}</span></div><div id="rev-emerging" class="chart-container"></div></div>
      </div>
      <div class="card">
        <div class="card-header"><span class="card-title">${t('revenue.varianceChart')}</span></div>
        <div id="ba-variance-chart" class="chart-container"></div>
      </div>`;
  }

  function initCharts() {
    const chColors = CHANNELS.map(c => c.color);

    // 1. 100% Stacked Bar — shows channel proportion each month
    createChart('rev-stacked-pct', {
      chart: { type: 'bar', height: 340, stacked: true, stackType: '100%' },
      series: CHANNELS.map(ch => ({ name: ch.label, data: [...REVENUE[ch.key]] })),
      xaxis: { categories: months },
      colors: chColors,
      plotOptions: { bar: { borderRadius: 4, columnWidth: '55%' } },
      yaxis: { labels: { formatter: v => `${Math.round(v)}%`, style: { colors: '#94a3b8' } } },
      tooltip: { y: { formatter: v => formatBaht(v) } },
      legend: { position: 'top' },
    });

    // 2. Share Trend Area — replaces donut, shows how share changes over time
    createChart('rev-share-trend', {
      chart: { type: 'area', height: 340, stacked: true, stackType: '100%' },
      series: CHANNELS.map(ch => ({ name: ch.label, data: [...REVENUE[ch.key]] })),
      xaxis: { categories: months },
      colors: chColors,
      yaxis: { labels: { formatter: v => `${Math.round(v)}%`, style: { colors: '#94a3b8' } } },
      fill: { type: 'gradient', gradient: { opacityFrom: 0.7, opacityTo: 0.3 } },
      tooltip: { y: { formatter: v => formatBaht(v) } },
      legend: { position: 'top' },
    });

    // 3. Cumulative Revenue vs Target
    let cumRev = 0, cumTarget = 0;
    const cumRevData = months.map((_, i) => { cumRev += REVENUE.total[i]; return cumRev; });
    const cumTargetData = months.map((_, i) => { cumTarget += BUDGET.revenue[i]; return cumTarget; });
    createChart('rev-cumulative', {
      chart: { type: 'area', height: 340 },
      series: [
        { name: t('card.actual'), data: cumRevData },
        { name: t('card.target'), data: cumTargetData },
      ],
      xaxis: { categories: months },
      colors: ['#22c55e', '#6366f1'],
      stroke: { width: [3, 3], curve: 'smooth', dashArray: [0, 5] },
      markers: { size: 4 },
      yaxis: { labels: { formatter: v => `฿${(v / 1000000).toFixed(0)}M`, style: { colors: '#94a3b8' } } },
      fill: { type: 'gradient', gradient: { opacityFrom: 0.3, opacityTo: 0.05 } },
      legend: { position: 'top' },
    });

    // 4. Profit & Margin Trend (mixed bar/line)
    const profitData = months.map((_, i) => REVENUE.total[i] - TOTAL_MONTHLY_COST[i]);
    const marginData = months.map((_, i) => {
      const rev = REVENUE.total[i];
      return rev > 0 ? parseFloat(((rev - TOTAL_MONTHLY_COST[i]) / rev * 100).toFixed(1)) : 0;
    });
    createChart('rev-profit-margin', {
      chart: { type: 'line', height: 340 },
      series: [
        { name: t('overview.netProfit'), type: 'bar', data: profitData },
        { name: 'Margin %', type: 'line', data: marginData },
      ],
      xaxis: { categories: months },
      colors: ['#22c55e', '#eab308'],
      plotOptions: { bar: { borderRadius: 4, columnWidth: '55%' } },
      stroke: { width: [0, 3], curve: 'smooth' },
      markers: { size: [0, 4] },
      yaxis: [
        {
          title: { text: t('overview.netProfit'), style: { color: '#94a3b8' } },
          labels: { formatter: v => `฿${(v / 1000000).toFixed(1)}M`, style: { colors: '#94a3b8' } },
        },
        {
          opposite: true,
          title: { text: 'Margin %', style: { color: '#eab308' } },
          labels: { formatter: v => `${v}%`, style: { colors: '#eab308' } },
        },
      ],
      legend: { position: 'top' },
    });

    // 5. MoM Growth Lines
    createChart('rev-growth-lines', {
      chart: { type: 'line', height: 340 },
      series: ['api', 'crm', 'sms'].map(key => ({
        name: CHANNELS.find(c => c.key === key)?.label || key,
        data: getMoMGrowth(key).map(v => v != null ? parseFloat(v.toFixed(2)) : null),
      })),
      xaxis: { categories: months },
      colors: ['#22c55e', '#f97316', '#a855f7'],
      yaxis: { labels: { formatter: v => `${v}%`, style: { colors: '#94a3b8' } } },
      tooltip: { y: { formatter: v => v != null ? `${v}%` : 'N/A' } },
      markers: { size: 4 },
    });

    // 6. Emerging Channels (CRM + SMS) — focused view
    createChart('rev-emerging', {
      chart: { type: 'bar', height: 340 },
      series: [
        { name: 'CRM', data: [...REVENUE.crm] },
        { name: 'SMS', data: [...REVENUE.sms] },
      ],
      xaxis: { categories: months },
      colors: ['#f97316', '#a855f7'],
      plotOptions: { bar: { borderRadius: 4, columnWidth: '55%' } },
      yaxis: { labels: { formatter: v => v >= 1000000 ? `฿${(v / 1000000).toFixed(1)}M` : `฿${(v / 1000).toFixed(0)}K`, style: { colors: '#94a3b8' } } },
      legend: { position: 'top' },
    });

    // 7. Simplified Budget vs Actual (3 series: Target bar, Actual bar, Variance line)
    const budgetArr = BUDGET.revenue;
    const variancePct = months.map((_, i) => {
      if (REVENUE.total[i] === 0 || budgetArr[i] === 0) return 0;
      return parseFloat(((REVENUE.total[i] - budgetArr[i]) / budgetArr[i] * 100).toFixed(1));
    });
    createChart('ba-variance-chart', {
      chart: { type: 'line', height: 380 },
      series: [
        { name: t('card.target'), type: 'bar', data: [...budgetArr] },
        { name: t('card.actual'), type: 'bar', data: [...REVENUE.total] },
        { name: `${t('summary.variance')} %`, type: 'line', data: variancePct },
      ],
      xaxis: { categories: months },
      colors: ['#6366f1', '#22c55e', '#eab308'],
      plotOptions: { bar: { borderRadius: 4, columnWidth: '60%' } },
      stroke: { width: [0, 0, 3], curve: 'smooth' },
      markers: { size: [0, 0, 4] },
      yaxis: [
        {
          title: { text: t('chart.amountTHB'), style: { color: '#94a3b8' } },
          labels: { formatter: v => `฿${(v / 1000000).toFixed(1)}M`, style: { colors: '#94a3b8' } },
        },
        {
          opposite: true,
          title: { text: `${t('summary.variance')} %`, style: { color: '#eab308' } },
          labels: { formatter: v => `${v}%`, style: { colors: '#eab308' } },
        },
      ],
      tooltip: {
        shared: true,
        y: { formatter: (v, { seriesIndex }) => seriesIndex === 2 ? `${v}%` : formatBaht(v) },
      },
      legend: { position: 'top' },
    });
  }

  function updateAllCharts() {
    // 1 & 2. Stacked bar + share trend (same raw data, ApexCharts handles 100% calc)
    const channelSeries = CHANNELS.map(ch => ({ name: ch.label, data: [...REVENUE[ch.key]] }));
    updateChart('rev-stacked-pct', channelSeries);
    updateChart('rev-share-trend', channelSeries);

    // 3. Cumulative
    let cumRev = 0, cumTarget = 0;
    const cumRevData = months.map((_, i) => { cumRev += REVENUE.total[i]; return cumRev; });
    const cumTargetData = months.map((_, i) => { cumTarget += BUDGET.revenue[i]; return cumTarget; });
    updateChart('rev-cumulative', [
      { name: t('card.actual'), data: cumRevData },
      { name: t('card.target'), data: cumTargetData },
    ]);

    // 4. Profit & Margin
    const profitData = months.map((_, i) => REVENUE.total[i] - TOTAL_MONTHLY_COST[i]);
    const marginData = months.map((_, i) => {
      const rev = REVENUE.total[i];
      return rev > 0 ? parseFloat(((rev - TOTAL_MONTHLY_COST[i]) / rev * 100).toFixed(1)) : 0;
    });
    updateChart('rev-profit-margin', [
      { name: t('overview.netProfit'), type: 'bar', data: profitData },
      { name: 'Margin %', type: 'line', data: marginData },
    ]);

    // 5. MoM Growth
    updateChart('rev-growth-lines', ['api', 'crm', 'sms'].map(key => ({
      name: CHANNELS.find(c => c.key === key)?.label || key,
      data: getMoMGrowth(key).map(v => v != null ? parseFloat(v.toFixed(2)) : null),
    })));

    // 6. Emerging Channels
    updateChart('rev-emerging', [
      { name: 'CRM', data: [...REVENUE.crm] },
      { name: 'SMS', data: [...REVENUE.sms] },
    ]);

    // 7. Budget vs Actual
    const budgetArr = BUDGET.revenue;
    const variancePct = months.map((_, i) => {
      if (REVENUE.total[i] === 0 || budgetArr[i] === 0) return 0;
      return parseFloat(((REVENUE.total[i] - budgetArr[i]) / budgetArr[i] * 100).toFixed(1));
    });
    updateChart('ba-variance-chart', [
      { name: t('card.target'), type: 'bar', data: [...budgetArr] },
      { name: t('card.actual'), type: 'bar', data: [...REVENUE.total] },
      { name: `${t('summary.variance')} %`, type: 'line', data: variancePct },
    ]);
  }

  // ── Danger Zone ──

  function buildDangerZone() {
    return `
      <div class="card" style="margin-top:32px;border:1px solid var(--color-danger, #ef4444);border-left:4px solid var(--color-danger, #ef4444);background:rgba(239,68,68,0.03)">
        <div class="card-header" style="padding-bottom:12px">
          <span class="card-title" style="color:var(--color-danger, #ef4444);font-size:.9rem">${t('section.dangerZone')}</span>
        </div>
        <div style="display:flex;gap:12px;flex-wrap:wrap">
          <div style="flex:1;min-width:140px">
            <button class="btn btn-danger btn-sm" id="btn-reset" style="width:100%;margin-bottom:4px">
              <i data-lucide="trash-2" style="width:14px;height:14px"></i> ${t('btn.reset')}
            </button>
            <div style="font-size:.65rem;color:var(--text-muted);text-align:center">${t('revenue.annualTotal')}</div>
          </div>
        </div>
      </div>`;
  }

  // ── Unified Input Handler (Event Delegation) ──

  function bindInputHandlers() {
    const tabContent = container.querySelector('#rev-tab-content');
    if (!tabContent) return;

    tabContent.addEventListener('input', (e) => {
      const input = e.target.closest('.ba-input');
      if (!input) return;

      const type = input.dataset.inputType;
      const month = parseInt(input.dataset.month);
      reformatInput(input);
      const val = parseInputValue(input.value);

      switch (type) {
        case 'revenue': {
          const channel = input.dataset.channel;
          REVENUE[channel][month] = val;
          recalcRevenue();
          const totalEl = container.querySelector(`[data-card-cat-total="rev-${channel}"]`);
          if (totalEl) totalEl.innerHTML = `<strong>${formatBaht(sum(REVENUE[channel]))}</strong>`;
          updateChartDebounced();
          break;
        }
        case 'budget': {
          const channel = input.dataset.channel;
          BUDGET.revenueByChannel[channel][month] = val;
          recalcBudgetRevenue();
          const totalEl = container.querySelector(`[data-card-cat-total="budget-${channel}"]`);
          if (totalEl) totalEl.innerHTML = `<strong>${formatBaht(sum(BUDGET.revenueByChannel[channel]))}</strong>`;
          break;
        }
      }

      isDirty = true;
      updateSummaryBar();
      autoSaveDebounced();
    });

    // Focus / blur via delegation
    tabContent.addEventListener('focusin', (e) => {
      const input = e.target.closest('.ba-input');
      if (input) input.select();
    });

    tabContent.addEventListener('focusout', (e) => {
      const input = e.target.closest('.ba-input');
      if (!input) return;
      const type = input.dataset.inputType;
      const month = parseInt(input.dataset.month);

      let val = 0;
      switch (type) {
        case 'revenue': val = REVENUE[input.dataset.channel]?.[month] ?? 0; break;
        case 'budget': val = BUDGET.revenueByChannel[input.dataset.channel]?.[month] ?? 0; break;
      }
      input.value = formatInputDisplay(val);

      if (type === 'revenue') updateAllCharts();
    });
  }

  // ── Action Buttons ──

  function bindActionButtons() {
    // Save
    container.querySelector('#btn-save-all')?.addEventListener('click', () => {
      undoBuffer = snapshotAll();
      saveAll();
      isDirty = false;
      updateSummaryBar();
      showToast(t('toast.revenueSaved'), 'success', 2000);
    });

    // Undo
    container.querySelector('#btn-undo')?.addEventListener('click', () => {
      if (!undoBuffer) return;
      restoreSnapshot(undoBuffer);
      undoBuffer = null;
      isDirty = true;
      renderPage();
      showToast(t('toast.undoSuccess'), 'info', 2000);
    });

    // Overflow menu
    container.querySelector('#btn-overflow')?.addEventListener('click', (e) => {
      e.stopPropagation();
      const menu = container.querySelector('#rev-overflow-menu');
      if (menu) menu.style.display = menu.style.display === 'none' ? '' : 'none';
    });

    document.addEventListener('click', closeOverflowMenu);

    // Overflow hover
    container.querySelectorAll('.overflow-item').forEach(item => {
      item.addEventListener('mouseenter', () => { item.style.background = 'var(--bg-hover, rgba(255,255,255,0.05))'; });
      item.addEventListener('mouseleave', () => { item.style.background = 'none'; });
    });

    // Export CSV
    container.querySelector('#btn-export-csv')?.addEventListener('click', () => {
      downloadCSV('easyslip_revenue_2026.csv',
        ['Month', ...CHANNELS.map(ch => ch.label), 'Total'],
        getMonths().map((m, i) => [m, ...CHANNELS.map(ch => REVENUE[ch.key][i]), REVENUE.total[i]])
      );
      showToast(t('toast.exportCsvSuccess'), 'success');
    });

    // Reset
    container.querySelector('#btn-reset')?.addEventListener('click', () => {
      if (confirm(t('confirm.resetRevenue'))) {
        undoBuffer = snapshotAll();
        resetRevenue();
        isDirty = false;
        renderPage();
        showToast(t('toast.resetSuccess'), 'info');
      }
    });

    // Tab switching
    container.querySelector('#rev-main-tabs')?.addEventListener('click', (e) => {
      const btn = e.target.closest('.tab-btn');
      if (btn?.dataset.mainTab) switchMainTab(btn.dataset.mainTab);
    });
  }

  // ── Render Page ──

  function renderPage() {
    container.innerHTML = `
      <div class="fade-in">
        ${buildSummaryBar()}
        ${buildMainTabs()}
        <div id="rev-tab-content">
          ${buildTabContent()}
        </div>
        ${buildDangerZone()}
      </div>`;

    if (typeof lucide !== 'undefined') lucide.createIcons();
    if (activeMainTab === 'charts') initCharts();

    bindInputHandlers();
    bindActionButtons();
    updateSummaryBar();
  }

  renderPage();

  return () => { destroyAllCharts(); document.removeEventListener('click', closeOverflowMenu); };
}
