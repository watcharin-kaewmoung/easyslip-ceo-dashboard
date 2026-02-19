// ============================================
// EasySlip 2026 — Page 2: Revenue Analysis
// Editable revenue table with live update
// ============================================

import { REVENUE, getQuarterlyRevenue, getMoMGrowth, getChannelShare, recalcRevenue, saveRevenue, resetRevenue, getLastSavedRevenue } from '../data/revenue.js';
import { BUDGET, getActual, saveActual, getVariance, getActualRevenueTotal, getLastSaved } from '../data/budget-actual.js';
import { MONTHS_TH, QUARTERS, CHANNEL_LIST } from '../data/constants.js';
import { createChart, updateChart, destroyAllCharts } from '../components/charts.js';
import { showToast } from '../components/toast.js';
import { setPageTitle, formatBaht, formatBahtCompact, formatPercent, formatPercentSigned, downloadCSV, debounce, sum } from '../utils.js';
import { t, getMonths } from '../i18n.js';

const BA_PRODUCTS = CHANNEL_LIST.map(c => ({ key: c.key, label: c.label, color: c.color }));

export function render(container) {
  setPageTitle(t('page.revenue.title'));

  const months = getMonths();
  let undoBuffer = null;
  let isDirty = false;

  // ── Budget vs Actual State ──
  let budgetActual = getActual();
  let baIsDirty = false;

  // ── Helpers ──

  function formatInputDisplay(value) {
    if (!value || value === 0) return '';
    return value.toLocaleString('en-US');
  }

  function parseInputValue(str) {
    return parseInt(String(str).replace(/[^0-9]/g, ''), 10) || 0;
  }

  function formatLastSaved(isoStr) {
    if (!isoStr) return null;
    const d = new Date(isoStr);
    return d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
  }

  function formatBaInput(value) {
    if (!value || value === 0) return '';
    return value.toLocaleString('en-US', { maximumFractionDigits: 2 });
  }

  function parseBaInput(str) {
    return parseFloat(String(str).replace(/[^0-9.]/g, '')) || 0;
  }

  function getStatusBadge(pct) {
    const abs = Math.abs(pct);
    if (abs <= 5) return `<span class="badge badge-success">${t('status.onTrack')}</span>`;
    if (abs <= 15) return `<span class="badge badge-warning">${t('status.warning')}</span>`;
    return `<span class="badge badge-danger">${t('status.critical')}</span>`;
  }

  function baRevTotal() { return getActualRevenueTotal(budgetActual); }

  // ── Core: update derived UI without re-rendering ──

  function updateDerivedUI() {
    recalcRevenue();
    updateTableTotals();
    updateMetricCards();
    updateSaveIndicator();
    updateUndoButton();
  }

  function updateTableTotals() {
    // Per-row totals
    for (let i = 0; i < 12; i++) {
      const totalCell = container.querySelector(`[data-total-month="${i}"]`);
      if (totalCell) totalCell.textContent = formatBaht(REVENUE.total[i]);
    }

    // Footer totals
    const el = (id) => container.querySelector(`#${id}`);
    const totalBot = el('total-bot');
    const totalApi = el('total-api');
    const totalCrm = el('total-crm');
    const totalSms = el('total-sms');
    const totalAll = el('total-all');

    if (totalBot) totalBot.textContent = formatBaht(REVENUE.annualBot);
    if (totalApi) totalApi.textContent = formatBaht(REVENUE.annualApi);
    if (totalCrm) totalCrm.textContent = formatBaht(REVENUE.annualCrm);
    if (totalSms) totalSms.textContent = formatBaht(REVENUE.annualSms);
    if (totalAll) totalAll.textContent = formatBaht(REVENUE.annualTotal);
  }

  function updateMetricCards() {
    const share = getChannelShare();

    const mcTotal = container.querySelector('#mc-annual-total');
    const mcApi = container.querySelector('#mc-annual-api');
    const mcCrm = container.querySelector('#mc-annual-crm');
    const mcSms = container.querySelector('#mc-annual-sms');
    const mcShareApi = container.querySelector('#mc-share-api');
    const mcShareCrm = container.querySelector('#mc-share-crm');
    const mcShareSms = container.querySelector('#mc-share-sms');

    if (mcTotal) mcTotal.textContent = formatBahtCompact(REVENUE.annualTotal);
    if (mcApi) mcApi.textContent = formatBahtCompact(REVENUE.annualApi);
    if (mcCrm) mcCrm.textContent = formatBahtCompact(REVENUE.annualCrm);
    if (mcSms) mcSms.textContent = formatBahtCompact(REVENUE.annualSms);
    if (mcShareApi) mcShareApi.textContent = `${formatPercent(share.api)} ${t('misc.share')}`;
    if (mcShareCrm) mcShareCrm.textContent = `${formatPercent(share.crm)} ${t('misc.share')}`;
    if (mcShareSms) mcShareSms.textContent = `${formatPercent(share.sms)} ${t('misc.share')}`;
  }

  function updateSaveIndicator() {
    const indicatorEl = container.querySelector('#rev-save-indicator');
    if (!indicatorEl) return;

    if (isDirty) {
      indicatorEl.innerHTML = `<span class="unsaved-dot"></span> ${t('status.unsaved')}`;
    } else {
      const lastSaved = formatLastSaved(getLastSavedRevenue());
      indicatorEl.textContent = lastSaved ? `${t('status.lastSaved')}: ${lastSaved}` : '';
    }
  }

  function updateUndoButton() {
    const btn = container.querySelector('#btn-undo');
    if (btn) {
      btn.disabled = !undoBuffer;
      btn.style.opacity = undoBuffer ? '1' : '0.5';
      btn.style.cursor = undoBuffer ? 'pointer' : 'not-allowed';
    }
  }

  function updateAllCharts() {
    const quarterly = getQuarterlyRevenue();

    // Stacked bar
    updateChart('rev-stacked-bar', [
      { name: 'BOT', data: [...REVENUE.bot] },
      { name: 'API', data: [...REVENUE.api] },
      { name: 'CRM', data: [...REVENUE.crm] },
      { name: 'SMS', data: [...REVENUE.sms] },
    ]);

    // Donut
    updateChart('rev-share-donut', [REVENUE.annualBot, REVENUE.annualApi, REVENUE.annualCrm, REVENUE.annualSms]);

    // Growth lines
    const apiGrowth = getMoMGrowth('api').map(v => v != null ? parseFloat(v.toFixed(2)) : null);
    const crmGrowth = getMoMGrowth('crm').map(v => v != null ? parseFloat(v.toFixed(2)) : null);
    const smsGrowth = getMoMGrowth('sms').map(v => v != null ? parseFloat(v.toFixed(2)) : null);
    updateChart('rev-growth-lines', [
      { name: 'API', data: apiGrowth },
      { name: 'CRM', data: crmGrowth },
      { name: 'SMS', data: smsGrowth },
    ]);

    // Quarterly bar
    updateChart('rev-quarterly-bar', [
      { name: 'BOT', data: quarterly.bot },
      { name: 'API', data: quarterly.api },
      { name: 'CRM', data: quarterly.crm },
      { name: 'SMS', data: quarterly.sms },
    ]);
  }

  // ── Budget vs Actual: update functions ──

  function updateBudgetActualUI() {
    const actualRevTotals = baRevTotal();
    const revVariance = getVariance(BUDGET.revenue, actualRevTotals);

    months.forEach((_, i) => {
      const revTotalCell = container.querySelector(`[data-ba-rev-total="${i}"]`);
      if (revTotalCell) revTotalCell.textContent = actualRevTotals[i] > 0 ? formatBaht(actualRevTotals[i]) : '—';

      const revVarCell = container.querySelector(`[data-ba-rev-var="${i}"]`);
      if (revVarCell) {
        revVarCell.className = 'text-right' + (revVariance[i].pct > 0 ? ' text-success' : revVariance[i].pct < 0 ? ' text-danger' : '');
        revVarCell.textContent = actualRevTotals[i] > 0 ? formatPercentSigned(revVariance[i].pct) : '—';
      }

      const revStatusCell = container.querySelector(`[data-ba-rev-status="${i}"]`);
      if (revStatusCell) {
        revStatusCell.innerHTML = actualRevTotals[i] > 0 ? getStatusBadge(revVariance[i].pct) : `<span class="badge badge-muted">${t('status.pending')}</span>`;
      }
    });

    updateBaTotals();
    updateBaSaveIndicator();
  }

  function updateBaTotals() {
    const actualRevTotals = baRevTotal();
    const actualRevTotal = sum(actualRevTotals);
    const budgetRevTotal = sum(BUDGET.revenue);
    const revVarPct = budgetRevTotal > 0 ? ((actualRevTotal - budgetRevTotal) / budgetRevTotal) * 100 : 0;

    const el = (id) => container.querySelector(`#${id}`);
    if (el('ba-total-budget-rev')) el('ba-total-budget-rev').textContent = formatBaht(budgetRevTotal);
    if (el('ba-total-actual-rev')) el('ba-total-actual-rev').textContent = formatBaht(actualRevTotal);
    if (el('ba-total-rev-var')) {
      el('ba-total-rev-var').className = 'text-right' + (revVarPct > 0 ? ' text-success' : revVarPct < 0 ? ' text-danger' : '');
      el('ba-total-rev-var').textContent = actualRevTotal > 0 ? formatPercentSigned(revVarPct) : '—';
    }
    if (el('ba-total-rev-status')) {
      el('ba-total-rev-status').innerHTML = actualRevTotal > 0 ? getStatusBadge(revVarPct) : `<span class="badge badge-muted">${t('status.pending')}</span>`;
    }

    BA_PRODUCTS.forEach(p => {
      const cell = el(`ba-total-rev-${p.key}`);
      if (cell) cell.textContent = formatBaht(sum(budgetActual.revenue[p.key]));
    });
  }

  function updateBaSaveIndicator() {
    const indicatorEl = container.querySelector('#ba-save-indicator');
    if (!indicatorEl) return;
    if (baIsDirty) {
      indicatorEl.innerHTML = `<span class="unsaved-dot"></span> ${t('status.unsaved')}`;
    } else {
      const lastSaved = formatLastSaved(getLastSaved());
      indicatorEl.textContent = lastSaved ? `${t('status.lastSaved')}: ${lastSaved}` : t('status.noData');
    }
  }

  function buildBaChartSeries() {
    const actualRevTotals = baRevTotal();
    const revVariance = getVariance(BUDGET.revenue, actualRevTotals);
    const variancePct = revVariance.map(v => v.status === 'pending' ? 0 : parseFloat(v.pct.toFixed(1)));

    return [
      { name: t('chart.budgetRevenue'), type: 'bar', data: [...BUDGET.revenue], group: 'budget' },
      { name: 'BOT', type: 'bar', data: [...budgetActual.revenue.bot], group: 'actual' },
      { name: 'API', type: 'bar', data: [...budgetActual.revenue.api], group: 'actual' },
      { name: 'CRM', type: 'bar', data: [...budgetActual.revenue.crm], group: 'actual' },
      { name: 'SMS', type: 'bar', data: [...budgetActual.revenue.sms], group: 'actual' },
      { name: t('chart.variancePct'), type: 'line', data: variancePct },
    ];
  }

  // ── Debounced actions ──

  const updateChartDebounced = debounce(() => updateAllCharts(), 2000);
  const autoSaveDebounced = debounce(() => {
    saveRevenue();
    isDirty = false;
    updateSaveIndicator();
  }, 1500);

  const baChartDebounced = debounce(() => {
    updateChart('ba-variance-chart', buildBaChartSeries());
  }, 2000);
  const baSaveDebounced = debounce(() => {
    saveActual(budgetActual);
    baIsDirty = false;
    updateBaSaveIndicator();
  }, 1500);

  // ── Build Page ──

  function renderPage() {
    const share = getChannelShare();
    const lastSavedStr = formatLastSaved(getLastSavedRevenue());

    // Budget vs Actual data
    budgetActual = getActual();
    const baActualRevTotals = baRevTotal();
    const baRevVariance = getVariance(BUDGET.revenue, baActualRevTotals);
    const baActualRevTotal = sum(baActualRevTotals);
    const baBudgetRevTotal = sum(BUDGET.revenue);
    const baRevVarPct = baBudgetRevTotal > 0 ? ((baActualRevTotal - baBudgetRevTotal) / baBudgetRevTotal) * 100 : 0;
    const baLastSavedStr = formatLastSaved(getLastSaved());

    const baProductHeaders = BA_PRODUCTS.map(p =>
      `<th class="text-right"><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${p.color};margin-right:4px"></span>${p.label}</th>`
    ).join('');

    container.innerHTML = `
      <div class="fade-in">
        <!-- Summary Cards -->
        <div class="grid grid-4 stagger" style="margin-bottom:24px">
          <div class="card card-sm">
            <div style="display:flex;align-items:center;gap:12px">
              <div class="icon-box" style="background:#22c55e20"><i data-lucide="trending-up" style="width:20px;height:20px;color:#22c55e"></i></div>
              <div>
                <div style="font-size:.75rem;color:var(--text-muted)">${t('revenue.annualTotal')}</div>
                <div id="mc-annual-total" style="font-size:1.25rem;font-weight:700">${formatBahtCompact(REVENUE.annualTotal)}</div>
              </div>
            </div>
          </div>
          <div class="card card-sm">
            <div style="display:flex;align-items:center;gap:12px">
              <div class="icon-box" style="background:#22c55e20"><i data-lucide="code-2" style="width:20px;height:20px;color:#22c55e"></i></div>
              <div>
                <div style="font-size:.75rem;color:var(--text-muted)">API Revenue</div>
                <div id="mc-annual-api" style="font-size:1.25rem;font-weight:700">${formatBahtCompact(REVENUE.annualApi)}</div>
                <div id="mc-share-api" style="font-size:.7rem;color:var(--text-muted)">${formatPercent(share.api)} ${t('misc.share')}</div>
              </div>
            </div>
          </div>
          <div class="card card-sm">
            <div style="display:flex;align-items:center;gap:12px">
              <div class="icon-box" style="background:#f9731620"><i data-lucide="users" style="width:20px;height:20px;color:#f97316"></i></div>
              <div>
                <div style="font-size:.75rem;color:var(--text-muted)">CRM Revenue</div>
                <div id="mc-annual-crm" style="font-size:1.25rem;font-weight:700">${formatBahtCompact(REVENUE.annualCrm)}</div>
                <div id="mc-share-crm" style="font-size:.7rem;color:var(--text-muted)">${formatPercent(share.crm)} ${t('misc.share')}</div>
              </div>
            </div>
          </div>
          <div class="card card-sm">
            <div style="display:flex;align-items:center;gap:12px">
              <div class="icon-box" style="background:#a855f720"><i data-lucide="message-square" style="width:20px;height:20px;color:#a855f7"></i></div>
              <div>
                <div style="font-size:.75rem;color:var(--text-muted)">SMS Revenue</div>
                <div id="mc-annual-sms" style="font-size:1.25rem;font-weight:700">${formatBahtCompact(REVENUE.annualSms)}</div>
                <div id="mc-share-sms" style="font-size:.7rem;color:var(--text-muted)">${formatPercent(share.sms)} ${t('misc.share')}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="flex gap-8" style="position:sticky;top:var(--header-height);z-index:40;background:var(--bg-surface);margin:0 -32px 24px;padding:12px 32px;border-bottom:1px solid var(--border-default);box-shadow:var(--shadow-sm);flex-wrap:wrap;align-items:center">
          <button class="btn btn-primary btn-sm" id="btn-save">
            <i data-lucide="save" style="width:14px;height:14px"></i> ${t('btn.save')}
          </button>
          <button class="btn btn-secondary btn-sm" id="btn-undo" disabled style="opacity:0.5;cursor:not-allowed">
            <i data-lucide="undo-2" style="width:14px;height:14px"></i> ${t('btn.undo')}
          </button>
          <div class="btn-group-separator"></div>
          <button class="btn btn-secondary btn-sm" id="btn-export-csv">
            <i data-lucide="file-spreadsheet" style="width:14px;height:14px"></i> ${t('btn.exportCsv')}
          </button>
          <div class="btn-group-separator"></div>
          <button class="btn btn-danger btn-sm" id="btn-reset">
            <i data-lucide="trash-2" style="width:14px;height:14px"></i> ${t('btn.reset')}
          </button>
        </div>

        <!-- Charts Row 1 -->
        <div class="grid grid-2" style="margin-bottom:24px">
          <div class="card">
            <div class="card-header">
              <span class="card-title">${t('revenue.monthlyByChannel')}</span>
            </div>
            <div id="rev-stacked-bar" class="chart-container"></div>
          </div>
          <div class="card">
            <div class="card-header">
              <span class="card-title">${t('revenue.share')}</span>
            </div>
            <div id="rev-share-donut" class="chart-container"></div>
          </div>
        </div>

        <!-- Charts Row 2 -->
        <div class="grid grid-2" style="margin-bottom:24px">
          <div class="card">
            <div class="card-header">
              <span class="card-title">${t('revenue.momGrowth')}</span>
            </div>
            <div id="rev-growth-lines" class="chart-container"></div>
          </div>
          <div class="card">
            <div class="card-header">
              <span class="card-title">${t('revenue.quarterly')}</span>
            </div>
            <div id="rev-quarterly-bar" class="chart-container"></div>
          </div>
        </div>

        <!-- Editable Data Table -->
        <div class="card">
          <div class="card-header">
            <span class="card-title">${t('revenue.monthlyBreakdown')}</span>
            <span id="rev-save-indicator" class="save-indicator">${lastSavedStr ? `${t('status.lastSaved')}: ${lastSavedStr}` : ''}</span>
          </div>
          <div class="data-table-wrapper">
            <table class="data-table" id="revenue-table">
              <thead>
                <tr>
                  <th>${t('th.month')}</th>
                  <th class="text-right"><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#3b82f6;margin-right:4px"></span>BOT</th>
                  <th class="text-right"><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#22c55e;margin-right:4px"></span>API</th>
                  <th class="text-right"><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#f97316;margin-right:4px"></span>CRM</th>
                  <th class="text-right"><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#a855f7;margin-right:4px"></span>SMS</th>
                  <th class="text-right">${t('th.total')}</th>
                </tr>
              </thead>
              <tbody>
                ${months.map((m, i) => `
                  <tr>
                    <td>${m}</td>
                    <td class="text-right">
                      <input type="text" inputmode="numeric" class="actual-input" data-channel="bot" data-month="${i}"
                             value="${formatInputDisplay(REVENUE.bot[i])}" placeholder="0">
                    </td>
                    <td class="text-right">
                      <input type="text" inputmode="numeric" class="actual-input" data-channel="api" data-month="${i}"
                             value="${formatInputDisplay(REVENUE.api[i])}" placeholder="0">
                    </td>
                    <td class="text-right">
                      <input type="text" inputmode="numeric" class="actual-input" data-channel="crm" data-month="${i}"
                             value="${formatInputDisplay(REVENUE.crm[i])}" placeholder="0">
                    </td>
                    <td class="text-right">
                      <input type="text" inputmode="numeric" class="actual-input" data-channel="sms" data-month="${i}"
                             value="${formatInputDisplay(REVENUE.sms[i])}" placeholder="0">
                    </td>
                    <td class="text-right" data-total-month="${i}">${formatBaht(REVENUE.total[i])}</td>
                  </tr>
                `).join('')}
              </tbody>
              <tfoot>
                <tr class="total-row">
                  <td><strong>${t('th.total')}</strong></td>
                  <td class="text-right" id="total-bot">${formatBaht(REVENUE.annualBot)}</td>
                  <td class="text-right" id="total-api">${formatBaht(REVENUE.annualApi)}</td>
                  <td class="text-right" id="total-crm">${formatBaht(REVENUE.annualCrm)}</td>
                  <td class="text-right" id="total-sms">${formatBaht(REVENUE.annualSms)}</td>
                  <td class="text-right" id="total-all">${formatBaht(REVENUE.annualTotal)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        <!-- Budget vs Actual Revenue -->
        <div class="card" style="margin-top:24px;margin-bottom:24px">
          <div class="card-header">
            <span class="card-title">${t('revenue.budgetVsActual')}</span>
            <span id="ba-save-indicator" class="save-indicator">${baLastSavedStr ? `${t('status.lastSaved')}: ${baLastSavedStr}` : t('status.noData')}</span>
          </div>
          <div class="data-table-wrapper">
            <table class="data-table data-table-dense" id="ba-revenue-table">
              <thead>
                <tr>
                  <th>${t('th.month')}</th>
                  <th class="text-right">${t('th.target')}</th>
                  ${baProductHeaders}
                  <th class="text-right">${t('th.actualTotal')}</th>
                  <th class="text-right">${t('th.variance')}</th>
                  <th class="text-center">${t('th.status')}</th>
                </tr>
              </thead>
              <tbody>
                ${months.map((m, i) => `
                  <tr>
                    <td>${m}</td>
                    <td class="text-right">${formatBaht(BUDGET.revenue[i])}</td>
                    ${BA_PRODUCTS.map(p => `
                      <td class="text-right">
                        <input type="text" inputmode="numeric" class="ba-input" data-channel="${p.key}" data-month="${i}"
                               value="${formatBaInput(budgetActual.revenue[p.key][i])}" placeholder="0">
                      </td>
                    `).join('')}
                    <td class="text-right" data-ba-rev-total="${i}">${baActualRevTotals[i] > 0 ? formatBaht(baActualRevTotals[i]) : '—'}</td>
                    <td class="text-right ${baRevVariance[i].pct > 0 ? 'text-success' : baRevVariance[i].pct < 0 ? 'text-danger' : ''}" data-ba-rev-var="${i}">
                      ${baActualRevTotals[i] > 0 ? formatPercentSigned(baRevVariance[i].pct) : '—'}
                    </td>
                    <td class="text-center" data-ba-rev-status="${i}">${baActualRevTotals[i] > 0 ? getStatusBadge(baRevVariance[i].pct) : `<span class="badge badge-muted">${t('status.pending')}</span>`}</td>
                  </tr>
                `).join('')}
              </tbody>
              <tfoot>
                <tr class="total-row">
                  <td><strong>${t('th.total')}</strong></td>
                  <td class="text-right" id="ba-total-budget-rev">${formatBaht(baBudgetRevTotal)}</td>
                  ${BA_PRODUCTS.map(p =>
                    `<td class="text-right" id="ba-total-rev-${p.key}">${formatBaht(sum(budgetActual.revenue[p.key]))}</td>`
                  ).join('')}
                  <td class="text-right" id="ba-total-actual-rev">${formatBaht(baActualRevTotal)}</td>
                  <td class="text-right ${baRevVarPct > 0 ? 'text-success' : baRevVarPct < 0 ? 'text-danger' : ''}" id="ba-total-rev-var">
                    ${baActualRevTotal > 0 ? formatPercentSigned(baRevVarPct) : '—'}
                  </td>
                  <td class="text-center" id="ba-total-rev-status">${baActualRevTotal > 0 ? getStatusBadge(baRevVarPct) : `<span class="badge badge-muted">${t('status.pending')}</span>`}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        <!-- Revenue Variance Chart -->
        <div class="card">
          <div class="card-header">
            <span class="card-title">${t('revenue.varianceChart')}</span>
          </div>
          <div id="ba-variance-chart" class="chart-container"></div>
        </div>
      </div>
    `;

    if (typeof lucide !== 'undefined') lucide.createIcons();

    // ── Charts ──

    // Stacked Bar
    createChart('rev-stacked-bar', {
      chart: { type: 'bar', height: 340, stacked: true },
      series: [
        { name: 'BOT', data: [...REVENUE.bot] },
        { name: 'API', data: [...REVENUE.api] },
        { name: 'CRM', data: [...REVENUE.crm] },
        { name: 'SMS', data: [...REVENUE.sms] },
      ],
      xaxis: { categories: months },
      colors: ['#3b82f6', '#22c55e', '#f97316', '#a855f7'],
      plotOptions: { bar: { borderRadius: 4, columnWidth: '55%' } },
      yaxis: { labels: { formatter: v => `฿${(v/1000000).toFixed(1)}M`, style: { colors: '#94a3b8' } } },
    });

    // Donut
    createChart('rev-share-donut', {
      chart: { type: 'donut', height: 340 },
      series: [REVENUE.annualBot, REVENUE.annualApi, REVENUE.annualCrm, REVENUE.annualSms],
      labels: ['BOT', 'API', 'CRM', 'SMS'],
      colors: ['#3b82f6', '#22c55e', '#f97316', '#a855f7'],
      plotOptions: {
        pie: {
          donut: {
            size: '60%',
            labels: {
              show: true,
              total: {
                show: true,
                label: t('th.total'),
                color: '#94a3b8',
                formatter: () => formatBahtCompact(REVENUE.annualTotal),
              },
            },
          },
        },
      },
      legend: { position: 'bottom' },
    });

    // Growth Lines
    const apiGrowth = getMoMGrowth('api').map(v => v != null ? parseFloat(v.toFixed(2)) : null);
    const crmGrowth = getMoMGrowth('crm').map(v => v != null ? parseFloat(v.toFixed(2)) : null);
    const smsGrowth = getMoMGrowth('sms').map(v => v != null ? parseFloat(v.toFixed(2)) : null);

    createChart('rev-growth-lines', {
      chart: { type: 'line', height: 340 },
      series: [
        { name: 'API', data: apiGrowth },
        { name: 'CRM', data: crmGrowth },
        { name: 'SMS', data: smsGrowth },
      ],
      xaxis: { categories: months },
      colors: ['#22c55e', '#f97316', '#a855f7'],
      yaxis: { labels: { formatter: v => `${v}%`, style: { colors: '#94a3b8' } } },
      tooltip: { y: { formatter: v => v != null ? `${v}%` : 'N/A' } },
      markers: { size: 4 },
    });

    // Quarterly Bar
    const quarterly = getQuarterlyRevenue();
    createChart('rev-quarterly-bar', {
      chart: { type: 'bar', height: 340 },
      series: [
        { name: 'BOT', data: quarterly.bot },
        { name: 'API', data: quarterly.api },
        { name: 'CRM', data: quarterly.crm },
        { name: 'SMS', data: quarterly.sms },
      ],
      xaxis: { categories: [...QUARTERS] },
      colors: ['#3b82f6', '#22c55e', '#f97316', '#a855f7'],
      plotOptions: { bar: { borderRadius: 4, columnWidth: '60%' } },
      yaxis: { labels: { formatter: v => `฿${(v/1000000).toFixed(1)}M`, style: { colors: '#94a3b8' } } },
    });

    // Budget-Actual Variance Chart
    const baVariancePct = baRevVariance.map(v => v.status === 'pending' ? 0 : parseFloat(v.pct.toFixed(1)));
    createChart('ba-variance-chart', {
      chart: { type: 'line', height: 380, stacked: true },
      series: [
        { name: t('chart.budgetRevenue'), type: 'bar', data: [...BUDGET.revenue], group: 'budget' },
        { name: 'BOT', type: 'bar', data: [...budgetActual.revenue.bot], group: 'actual' },
        { name: 'API', type: 'bar', data: [...budgetActual.revenue.api], group: 'actual' },
        { name: 'CRM', type: 'bar', data: [...budgetActual.revenue.crm], group: 'actual' },
        { name: 'SMS', type: 'bar', data: [...budgetActual.revenue.sms], group: 'actual' },
        { name: t('chart.variancePct'), type: 'line', data: baVariancePct },
      ],
      xaxis: { categories: months },
      colors: ['#6366f1', '#3b82f6', '#22c55e', '#f97316', '#a855f7', '#eab308'],
      plotOptions: { bar: { borderRadius: 4, columnWidth: '70%' } },
      stroke: { width: [0, 0, 0, 0, 0, 3], curve: 'smooth' },
      markers: { size: [0, 0, 0, 0, 0, 4] },
      yaxis: [
        {
          title: { text: t('chart.amountTHB'), style: { color: '#94a3b8' } },
          labels: { formatter: v => `฿${(v/1000000).toFixed(1)}M`, style: { colors: '#94a3b8' } },
        },
        {
          opposite: true,
          title: { text: t('chart.variancePct'), style: { color: '#eab308' } },
          labels: { formatter: v => `${v}%`, style: { colors: '#eab308' } },
        },
      ],
      tooltip: {
        shared: true,
        y: { formatter: (v, { seriesIndex }) => seriesIndex === 5 ? `${v}%` : formatBaht(v) },
      },
      legend: { position: 'top' },
    });

    // ── Bind handlers ──
    bindInputHandlers();
    bindBudgetActualInputHandlers();
    bindActionButtons();
  }

  function bindInputHandlers() {
    container.querySelectorAll('.actual-input').forEach(input => {
      // On input: parse, update REVENUE in-place, live recalc + debounced chart/save
      input.addEventListener('input', () => {
        const channel = input.dataset.channel;
        const month = parseInt(input.dataset.month);
        const raw = parseInputValue(input.value);

        // Reformat while typing — keep cursor position
        const cursorPos = input.selectionStart;
        const oldLen = input.value.length;
        const stripped = input.value.replace(/[^0-9]/g, '');
        input.value = stripped ? parseInt(stripped, 10).toLocaleString('en-US') : '';
        const newLen = input.value.length;
        const newPos = Math.max(0, cursorPos + (newLen - oldLen));
        input.setSelectionRange(newPos, newPos);

        REVENUE[channel][month] = raw;
        isDirty = true;

        updateDerivedUI();
        updateChartDebounced();
        autoSaveDebounced();
      });

      // On focus: show raw number for easier editing
      input.addEventListener('focus', () => {
        const channel = input.dataset.channel;
        const month = parseInt(input.dataset.month);
        const val = REVENUE[channel][month];
        input.value = val > 0 ? String(val) : '';
        input.select();
      });

      // On blur: reformat with commas + immediate chart update
      input.addEventListener('blur', () => {
        const channel = input.dataset.channel;
        const month = parseInt(input.dataset.month);
        const val = REVENUE[channel][month];
        input.value = formatInputDisplay(val);
        updateAllCharts();
      });
    });
  }

  function bindActionButtons() {
    // ── Save ──
    container.querySelector('#btn-save')?.addEventListener('click', () => {
      undoBuffer = {
        bot: [...REVENUE.bot],
        api: [...REVENUE.api],
        crm: [...REVENUE.crm],
        sms: [...REVENUE.sms],
      };
      saveRevenue();
      isDirty = false;
      updateSaveIndicator();
      updateUndoButton();
      showToast(t('toast.revenueSaved'), 'success', 2000);
    });

    // ── Undo ──
    container.querySelector('#btn-undo')?.addEventListener('click', () => {
      if (!undoBuffer) return;

      for (let i = 0; i < 12; i++) {
        REVENUE.bot[i] = undoBuffer.bot[i];
        REVENUE.api[i] = undoBuffer.api[i];
        REVENUE.crm[i] = undoBuffer.crm[i];
        REVENUE.sms[i] = undoBuffer.sms[i];
      }
      undoBuffer = null;
      isDirty = true;

      // Re-render input values
      container.querySelectorAll('.actual-input').forEach(input => {
        const channel = input.dataset.channel;
        const month = parseInt(input.dataset.month);
        input.value = formatInputDisplay(REVENUE[channel][month]);
      });

      updateDerivedUI();
      updateAllCharts();
      showToast(t('toast.undoSuccess'), 'info', 2000);
    });

    // ── Export CSV ──
    container.querySelector('#btn-export-csv')?.addEventListener('click', () => {
      downloadCSV('easyslip_revenue_2026.csv',
        ['Month', 'BOT', 'API', 'CRM', 'SMS', 'Total'],
        getMonths().map((m, i) => [m, REVENUE.bot[i], REVENUE.api[i], REVENUE.crm[i], REVENUE.sms[i], REVENUE.total[i]])
      );
      showToast(t('toast.exportCsvSuccess'), 'success');
    });

    // ── Reset to Defaults ──
    container.querySelector('#btn-reset')?.addEventListener('click', () => {
      if (confirm(t('confirm.resetRevenue'))) {
        undoBuffer = {
          bot: [...REVENUE.bot],
          api: [...REVENUE.api],
          crm: [...REVENUE.crm],
          sms: [...REVENUE.sms],
        };
        resetRevenue();
        isDirty = false;
        renderPage();
        showToast(t('toast.resetSuccess'), 'info');
      }
    });
  }

  function bindBudgetActualInputHandlers() {
    container.querySelectorAll('.ba-input').forEach(input => {
      input.addEventListener('input', () => {
        const channel = input.dataset.channel;
        const month = parseInt(input.dataset.month);
        const raw = parseBaInput(input.value);

        // Reformat while typing — keep cursor position
        const cursorPos = input.selectionStart;
        const oldLen = input.value.length;
        const stripped = input.value.replace(/[^0-9.]/g, '');
        const parts = stripped.split('.');
        const intPart = parts[0] ? parseInt(parts[0], 10).toLocaleString('en-US') : '';
        input.value = parts.length > 1 ? `${intPart}.${parts[1]}` : (intPart || '');
        const newLen = input.value.length;
        const newPos = Math.max(0, cursorPos + (newLen - oldLen));
        input.setSelectionRange(newPos, newPos);

        budgetActual.revenue[channel][month] = raw;
        baIsDirty = true;

        updateBudgetActualUI();
        baChartDebounced();
        baSaveDebounced();
      });

      input.addEventListener('focus', () => {
        const channel = input.dataset.channel;
        const month = parseInt(input.dataset.month);
        const val = budgetActual.revenue[channel][month];
        input.value = val > 0 ? String(val) : '';
        input.select();
      });

      input.addEventListener('blur', () => {
        const channel = input.dataset.channel;
        const month = parseInt(input.dataset.month);
        const val = budgetActual.revenue[channel][month];
        input.value = formatBaInput(val);
        updateChart('ba-variance-chart', buildBaChartSeries());
      });
    });
  }

  renderPage();

  return () => destroyAllCharts();
}
