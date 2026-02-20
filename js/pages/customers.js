// ============================================
// EasySlip 2026 — Customer & Subscription Page
// ============================================

import { CUSTOMERS, PLANS, recalcCustomers, saveCustomers, resetCustomers } from '../data/customers.js';
import { createChart, destroyAllCharts } from '../components/charts.js';
import { MetricCard, SectionHeader } from '../components/cards.js';
import { formatBaht, formatBahtCompact, formatNumber, formatPercent, setPageTitle } from '../utils.js';
import { t, getMonths, getLang } from '../i18n.js';
import { createAutoSave, formatInputDisplay, parseInputValue, reformatInput } from '../shared/editable-page.js';

export function render(container) {
  setPageTitle(t('page.customers.title'));

  let undoBuffer = null;
  let isDirty = false;
  const TAB_KEY = 'customers_active_tab';
  let activeTab = sessionStorage.getItem(TAB_KEY) || 'overview';
  const months = getMonths();

  // ── Snapshot / Undo ──
  function snapshot() {
    return {
      free: [...CUSTOMERS.free],
      starter: [...CUSTOMERS.starter],
      professional: [...CUSTOMERS.professional],
      enterprise: [...CUSTOMERS.enterprise],
      churnRate: [...CUSTOMERS.churnRate],
      mrr: [...CUSTOMERS.mrr],
      cac: [...CUSTOMERS.cac],
      newCustomers: [...CUSTOMERS.newCustomers],
    };
  }

  function restore(snap) {
    Object.keys(snap).forEach(k => {
      for (let i = 0; i < 12; i++) CUSTOMERS[k][i] = snap[k][i];
    });
    recalcCustomers();
  }

  const autoSave = createAutoSave({
    saveFn: () => { undoBuffer = snapshot(); saveCustomers(); },
    setDirty: v => isDirty = v,
    updateIndicator: () => {},
  });

  // ── Summary KPIs ──
  function buildSummaryBar() {
    const latestTotal = CUSTOMERS.totalByMonth[11] || 0;
    const latestPaid = CUSTOMERS.paidByMonth[11] || 0;
    const ltvStatus = CUSTOMERS.ltvCacRatio >= 3 ? '#22c55e' : CUSTOMERS.ltvCacRatio >= 2 ? '#eab308' : '#ef4444';

    return `
      <div class="summary-bar" style="position:sticky;top:var(--header-height);z-index:40;background:var(--bg-surface);margin:0 -32px 24px;padding:12px 32px;border-bottom:1px solid var(--border-default);box-shadow:var(--shadow-sm)">
        <div class="grid grid-4 stagger" id="cust-kpis">
          ${MetricCard({ title: t('customers.totalCustomers'), value: formatNumber(latestTotal), icon: 'users', iconBg: '#3b82f6', subtitle: `${t('customers.paid')}: ${formatNumber(latestPaid)}` })}
          ${MetricCard({ title: 'MRR', value: formatBahtCompact(CUSTOMERS.mrr[11]), icon: 'repeat', iconBg: '#22c55e', subtitle: `ARR: ${formatBahtCompact(CUSTOMERS.arr)}` })}
          ${MetricCard({ title: t('customers.churnRate'), value: formatPercent(CUSTOMERS.avgChurn), icon: 'user-minus', iconBg: '#ef4444', subtitle: `${t('customers.latest')}: ${formatPercent(CUSTOMERS.churnRate[11])}` })}
          ${MetricCard({ title: 'LTV/CAC', value: CUSTOMERS.ltvCacRatio.toFixed(1) + 'x', icon: 'scale', iconBg: ltvStatus, subtitle: `LTV: ${formatBahtCompact(CUSTOMERS.ltv)} / CAC: ${formatBahtCompact(CUSTOMERS.avgCAC)}` })}
        </div>
      </div>`;
  }

  // ── Tabs ──
  function buildTabs() {
    const tabs = [
      { key: 'overview', label: t('customers.tabOverview') },
      { key: 'metrics', label: t('customers.tabMetrics') },
      { key: 'cohort', label: t('customers.tabCohort') },
      { key: 'charts', label: t('tab.charts') },
    ];
    return `
      <div class="tab-bar" style="margin-bottom:24px">
        ${tabs.map(tb => `
          <button class="tab-btn ${activeTab === tb.key ? 'active' : ''}" data-tab="${tb.key}">
            ${tb.label}
          </button>
        `).join('')}
      </div>
      <div id="cust-tab-content">${buildTabContent()}</div>`;
  }

  function buildTabContent() {
    switch (activeTab) {
      case 'overview': return buildOverviewTab();
      case 'metrics': return buildMetricsTab();
      case 'cohort': return buildCohortTab();
      case 'charts': return buildChartsTab();
      default: return '';
    }
  }

  // ── Overview Tab ──
  function buildOverviewTab() {
    return `
      <div class="grid grid-2 stagger">
        <div class="card">
          ${SectionHeader(t('customers.byPlan'))}
          <div id="chart-plan-dist" style="min-height:280px"></div>
        </div>
        <div class="card">
          ${SectionHeader(t('customers.growth'))}
          <div id="chart-growth" style="min-height:280px"></div>
        </div>
      </div>

      <div class="card" style="margin-top:16px">
        ${SectionHeader(t('customers.monthlyBreakdown'))}
        <div style="overflow-x:auto">
          <table class="data-table">
            <thead>
              <tr>
                <th>${t('th.month')}</th>
                <th style="text-align:right">Free</th>
                <th style="text-align:right">Starter</th>
                <th style="text-align:right">Professional</th>
                <th style="text-align:right">Enterprise</th>
                <th style="text-align:right">${t('th.total')}</th>
                <th style="text-align:right">${t('customers.newCust')}</th>
                <th style="text-align:right">${t('customers.churn')}</th>
              </tr>
            </thead>
            <tbody>
              ${months.map((m, i) => `
                <tr>
                  <td>${m}</td>
                  <td style="text-align:right">${formatNumber(CUSTOMERS.free[i])}</td>
                  <td style="text-align:right">${formatNumber(CUSTOMERS.starter[i])}</td>
                  <td style="text-align:right">${formatNumber(CUSTOMERS.professional[i])}</td>
                  <td style="text-align:right">${formatNumber(CUSTOMERS.enterprise[i])}</td>
                  <td style="text-align:right;font-weight:600">${formatNumber(CUSTOMERS.totalByMonth[i])}</td>
                  <td style="text-align:right;color:var(--color-success)">+${CUSTOMERS.newCustomers[i]}</td>
                  <td style="text-align:right;color:var(--color-danger)">${formatPercent(CUSTOMERS.churnRate[i])}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>`;
  }

  // ── Metrics Tab (Editable) ──
  function buildMetricsTab() {
    return `
      <div class="flex gap-8" style="margin-bottom:16px;flex-wrap:wrap">
        <button class="btn btn-primary btn-sm" id="btn-save-cust">
          <i data-lucide="save" style="width:14px;height:14px"></i> ${t('btn.save')}
        </button>
        <button class="btn btn-secondary btn-sm" id="btn-undo-cust" ${!undoBuffer ? 'disabled style="opacity:.5;cursor:not-allowed"' : ''}>
          <i data-lucide="undo-2" style="width:14px;height:14px"></i> ${t('btn.undo')}
        </button>
        <button class="btn btn-danger btn-sm" id="btn-reset-cust">
          <i data-lucide="trash-2" style="width:14px;height:14px"></i> ${t('btn.reset')}
        </button>
      </div>

      <div class="card">
        ${SectionHeader(t('customers.mrrCac'))}
        <div style="overflow-x:auto">
          <table class="data-table">
            <thead>
              <tr>
                <th>${t('th.month')}</th>
                <th style="text-align:right">MRR</th>
                <th style="text-align:right">CAC</th>
                <th style="text-align:right">${t('customers.newCust')}</th>
                <th style="text-align:right">${t('customers.churn')} %</th>
              </tr>
            </thead>
            <tbody>
              ${months.map((m, i) => `
                <tr>
                  <td>${m}</td>
                  <td style="text-align:right">
                    <input type="text" class="ba-input cust-input"
                      data-field="mrr" data-month="${i}"
                      value="${formatInputDisplay(CUSTOMERS.mrr[i])}"
                      style="width:110px;text-align:right">
                  </td>
                  <td style="text-align:right">
                    <input type="text" class="ba-input cust-input"
                      data-field="cac" data-month="${i}"
                      value="${formatInputDisplay(CUSTOMERS.cac[i])}"
                      style="width:90px;text-align:right">
                  </td>
                  <td style="text-align:right">
                    <input type="text" class="ba-input cust-input"
                      data-field="newCustomers" data-month="${i}"
                      value="${formatInputDisplay(CUSTOMERS.newCustomers[i])}"
                      style="width:70px;text-align:right">
                  </td>
                  <td style="text-align:right">
                    <input type="text" class="ba-input cust-input"
                      data-field="churnRate" data-month="${i}"
                      value="${CUSTOMERS.churnRate[i]}"
                      style="width:60px;text-align:right">
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>`;
  }

  // ── Cohort Tab ──
  function buildCohortTab() {
    const cohorts = CUSTOMERS.cohorts;
    return `
      <div class="card">
        ${SectionHeader(t('customers.cohortAnalysis'))}
        <div style="overflow-x:auto">
          <table class="data-table">
            <thead>
              <tr>
                <th>${t('customers.cohort')}</th>
                <th style="text-align:center">M0</th>
                <th style="text-align:center">M1</th>
                <th style="text-align:center">M2</th>
                <th style="text-align:center">M3</th>
                <th style="text-align:center">M4</th>
                <th style="text-align:center">M5</th>
                <th style="text-align:center">M6</th>
              </tr>
            </thead>
            <tbody>
              ${cohorts.map(c => `
                <tr>
                  <td style="font-weight:500">${c.label}</td>
                  ${c.data.map(val => {
                    if (val === 0) return '<td style="text-align:center;color:var(--text-muted)">—</td>';
                    const bg = val >= 80 ? 'rgba(34,197,94,.15)' : val >= 60 ? 'rgba(234,179,8,.15)' : 'rgba(239,68,68,.15)';
                    const color = val >= 80 ? 'var(--color-success)' : val >= 60 ? 'var(--color-warning)' : 'var(--color-danger)';
                    return `<td style="text-align:center;background:${bg};color:${color};font-weight:600">${val}%</td>`;
                  }).join('')}
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        <div style="margin-top:12px;font-size:.75rem;color:var(--text-muted)">
          ${t('customers.cohortNote')}
        </div>
      </div>

      <div class="card" style="margin-top:16px">
        ${SectionHeader(t('customers.retentionCurve'))}
        <div id="chart-retention" style="min-height:300px"></div>
      </div>`;
  }

  // ── Charts Tab ──
  function buildChartsTab() {
    return `
      <div class="grid grid-2 stagger">
        <div class="card">
          ${SectionHeader(t('customers.mrrTrend'))}
          <div id="chart-mrr-trend" style="min-height:300px"></div>
        </div>
        <div class="card">
          ${SectionHeader(t('customers.cacTrend'))}
          <div id="chart-cac-trend" style="min-height:300px"></div>
        </div>
      </div>
      <div class="grid grid-2 stagger" style="margin-top:16px">
        <div class="card">
          ${SectionHeader(t('customers.churnTrend'))}
          <div id="chart-churn-trend" style="min-height:300px"></div>
        </div>
        <div class="card">
          ${SectionHeader(t('customers.newCustTrend'))}
          <div id="chart-new-cust" style="min-height:300px"></div>
        </div>
      </div>`;
  }

  // ── Init Charts ──
  function initCharts() {
    if (typeof ApexCharts === 'undefined') return;

    if (activeTab === 'overview') {
      const latest = [CUSTOMERS.free[11], CUSTOMERS.starter[11], CUSTOMERS.professional[11], CUSTOMERS.enterprise[11]];
      createChart('chart-plan-dist', {
        chart: { type: 'donut', height: 280 },
        series: latest,
        labels: PLANS.map(p => p.labelEn),
        colors: PLANS.map(p => p.color),
        legend: { position: 'bottom' },
      });

      createChart('chart-growth', {
        chart: { type: 'area', height: 280 },
        series: [
          { name: 'Total', data: CUSTOMERS.totalByMonth },
          { name: 'Paid', data: CUSTOMERS.paidByMonth },
        ],
        xaxis: { categories: months },
        colors: ['#3b82f6', '#22c55e'],
        fill: { type: 'gradient', gradient: { opacityFrom: 0.5, opacityTo: 0.05 } },
      });
    }

    if (activeTab === 'cohort') {
      const cohorts = CUSTOMERS.cohorts.filter(c => c.data.filter(v => v > 0).length >= 3);
      createChart('chart-retention', {
        chart: { type: 'line', height: 300 },
        series: cohorts.map(c => ({
          name: c.label,
          data: c.data.filter(v => v > 0),
        })),
        xaxis: { categories: ['M0', 'M1', 'M2', 'M3', 'M4', 'M5', 'M6'].slice(0, Math.max(...cohorts.map(c => c.data.filter(v => v > 0).length))) },
        stroke: { width: 2, curve: 'smooth' },
        markers: { size: 4 },
        yaxis: { min: 0, max: 100, labels: { formatter: v => v + '%' } },
        tooltip: { y: { formatter: v => v + '%' } },
      });
    }

    if (activeTab === 'charts') {
      createChart('chart-mrr-trend', {
        chart: { type: 'area', height: 300 },
        series: [{ name: 'MRR', data: CUSTOMERS.mrr }],
        xaxis: { categories: months },
        colors: ['#22c55e'],
        fill: { type: 'gradient', gradient: { opacityFrom: 0.5, opacityTo: 0.05 } },
      });

      createChart('chart-cac-trend', {
        chart: { type: 'line', height: 300 },
        series: [{ name: 'CAC', data: CUSTOMERS.cac }],
        xaxis: { categories: months },
        colors: ['#f97316'],
        stroke: { width: 3, curve: 'smooth' },
        markers: { size: 4 },
      });

      createChart('chart-churn-trend', {
        chart: { type: 'line', height: 300 },
        series: [{ name: t('customers.churnRate'), data: CUSTOMERS.churnRate }],
        xaxis: { categories: months },
        colors: ['#ef4444'],
        stroke: { width: 3, curve: 'smooth' },
        markers: { size: 4 },
        yaxis: { labels: { formatter: v => v + '%' } },
      });

      createChart('chart-new-cust', {
        chart: { type: 'bar', height: 300 },
        series: [{ name: t('customers.newCust'), data: CUSTOMERS.newCustomers }],
        xaxis: { categories: months },
        colors: ['#3b82f6'],
        plotOptions: { bar: { borderRadius: 4, columnWidth: '50%' } },
      });
    }
  }

  // ── Events ──
  function bindEvents() {
    container.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        activeTab = btn.dataset.tab;
        sessionStorage.setItem(TAB_KEY, activeTab);
        destroyAllCharts();
        renderPage();
      });
    });

    container.addEventListener('input', e => {
      const input = e.target.closest('.cust-input');
      if (!input) return;
      const field = input.dataset.field;
      const month = parseInt(input.dataset.month);
      if (field === 'churnRate') {
        CUSTOMERS.churnRate[month] = parseFloat(input.value) || 0;
      } else {
        reformatInput(input);
        CUSTOMERS[field][month] = parseInputValue(input.value);
      }
      recalcCustomers();
      isDirty = true;
      autoSave();
    });

    container.querySelector('#btn-save-cust')?.addEventListener('click', () => {
      undoBuffer = snapshot();
      saveCustomers();
      isDirty = false;
      renderPage();
    });

    container.querySelector('#btn-undo-cust')?.addEventListener('click', () => {
      if (!undoBuffer) return;
      restore(undoBuffer);
      undoBuffer = null;
      isDirty = false;
      renderPage();
    });

    container.querySelector('#btn-reset-cust')?.addEventListener('click', () => {
      if (!confirm(t('confirm.resetCustomers'))) return;
      resetCustomers();
      undoBuffer = null;
      isDirty = false;
      renderPage();
    });
  }

  // ── Main Render ──
  function renderPage() {
    container.innerHTML = `
      <div class="fade-in">
        ${buildSummaryBar()}
        ${buildTabs()}
      </div>`;
    if (typeof lucide !== 'undefined') lucide.createIcons();
    bindEvents();
    initCharts();
  }

  renderPage();
  return () => { destroyAllCharts(); };
}
