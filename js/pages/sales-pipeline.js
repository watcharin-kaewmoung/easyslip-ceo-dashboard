// ============================================
// EasySlip 2026 — Sales Pipeline Page
// ============================================

import { SALES, PIPELINE_STAGES, recalcSales, saveSales, resetSales } from '../data/sales.js';
import { createChart, destroyAllCharts } from '../components/charts.js';
import { MetricCard, SectionHeader } from '../components/cards.js';
import { formatBaht, formatBahtCompact, formatNumber, formatPercent, setPageTitle, sum } from '../utils.js';
import { t, getMonths, getLang } from '../i18n.js';
import { createAutoSave, formatInputDisplay, parseInputValue, reformatInput } from '../shared/editable-page.js';

export function render(container) {
  setPageTitle(t('page.sales.title'));

  let undoBuffer = null;
  let isDirty = false;
  const TAB_KEY = 'sales_active_tab';
  let activeTab = sessionStorage.getItem(TAB_KEY) || 'overview';

  const months = getMonths();

  // ── Snapshot / Undo ──
  function snapshot() {
    return {
      monthlyRevenue: [...SALES.monthlyRevenue],
      targets: [...SALES.targets],
      monthlyDeals: [...SALES.monthlyDeals],
      monthlyWon: [...SALES.monthlyWon],
      monthlyLost: [...SALES.monthlyLost],
    };
  }

  function restore(snap) {
    ['monthlyRevenue', 'targets', 'monthlyDeals', 'monthlyWon', 'monthlyLost'].forEach(k => {
      for (let i = 0; i < 12; i++) SALES[k][i] = snap[k][i];
    });
    recalcSales();
  }

  // ── Auto-save ──
  const autoSave = createAutoSave({
    saveFn: () => { undoBuffer = snapshot(); saveSales(); },
    setDirty: v => isDirty = v,
    updateIndicator: () => updateSummaryBar(),
  });

  // ── Summary Bar ──
  function buildSummaryBar() {
    const achievePct = SALES.annualTarget > 0
      ? ((SALES.annualRevenue / SALES.annualTarget) * 100).toFixed(1)
      : '0.0';

    return `
      <div class="summary-bar" style="position:sticky;top:var(--header-height);z-index:40;background:var(--bg-surface);margin:0 -32px 24px;padding:12px 32px;border-bottom:1px solid var(--border-default);box-shadow:var(--shadow-sm)">
        <div class="flex gap-16" style="flex-wrap:wrap;align-items:center">
          <div style="flex:1;min-width:200px">
            <div class="grid grid-4 stagger" id="sales-kpis">
              ${MetricCard({ title: t('sales.totalRevenue'), value: formatBahtCompact(SALES.annualRevenue), icon: 'dollar-sign', iconBg: '#22c55e', subtitle: `${t('sales.target')}: ${formatBahtCompact(SALES.annualTarget)} (${achievePct}%)` })}
              ${MetricCard({ title: t('sales.conversionRate'), value: formatPercent(SALES.conversionRate), icon: 'percent', iconBg: '#3b82f6' })}
              ${MetricCard({ title: t('sales.avgDealSize'), value: formatBahtCompact(SALES.avgDealSize), icon: 'receipt', iconBg: '#f97316' })}
              ${MetricCard({ title: t('sales.totalDeals'), value: formatNumber(SALES.totalDeals), icon: 'handshake', iconBg: '#a855f7', subtitle: `${t('sales.won')}: ${SALES.totalWon} / ${t('sales.lost')}: ${SALES.totalLost}` })}
            </div>
          </div>
        </div>
      </div>`;
  }

  function updateSummaryBar() {
    const el = container.querySelector('#sales-kpis');
    if (!el) return;
    const achievePct = SALES.annualTarget > 0
      ? ((SALES.annualRevenue / SALES.annualTarget) * 100).toFixed(1)
      : '0.0';
    el.innerHTML = `
      ${MetricCard({ title: t('sales.totalRevenue'), value: formatBahtCompact(SALES.annualRevenue), icon: 'dollar-sign', iconBg: '#22c55e', subtitle: `${t('sales.target')}: ${formatBahtCompact(SALES.annualTarget)} (${achievePct}%)` })}
      ${MetricCard({ title: t('sales.conversionRate'), value: formatPercent(SALES.conversionRate), icon: 'percent', iconBg: '#3b82f6' })}
      ${MetricCard({ title: t('sales.avgDealSize'), value: formatBahtCompact(SALES.avgDealSize), icon: 'receipt', iconBg: '#f97316' })}
      ${MetricCard({ title: t('sales.totalDeals'), value: formatNumber(SALES.totalDeals), icon: 'handshake', iconBg: '#a855f7', subtitle: `${t('sales.won')}: ${SALES.totalWon} / ${t('sales.lost')}: ${SALES.totalLost}` })}
    `;
    if (typeof lucide !== 'undefined') lucide.createIcons({ nameAttr: 'data-lucide' });
  }

  // ── Tabs ──
  function buildTabs() {
    const tabs = [
      { key: 'overview', label: t('sales.tabOverview') },
      { key: 'pipeline', label: t('sales.tabPipeline') },
      { key: 'targets', label: t('sales.tabTargets') },
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
      <div id="sales-tab-content">${buildTabContent()}</div>`;
  }

  function buildTabContent() {
    switch (activeTab) {
      case 'overview': return buildOverviewTab();
      case 'pipeline': return buildPipelineTab();
      case 'targets': return buildTargetsTab();
      case 'charts': return buildChartsTab();
      default: return '';
    }
  }

  // ── Overview Tab ──
  function buildOverviewTab() {
    const lang = getLang();

    // Pipeline funnel
    const stages = PIPELINE_STAGES.filter(s => s.key !== 'closed_won' && s.key !== 'closed_lost');
    const maxPipeline = Math.max(...stages.map(s => SALES.pipeline[s.key] || 0), 1);

    // Top customers
    const topCust = SALES.topCustomers.slice(0, 10);

    // Loss reasons
    const losses = SALES.lossReasons;

    return `
      <div class="grid grid-2 stagger">
        <!-- Pipeline Funnel -->
        <div class="card">
          ${SectionHeader(t('sales.pipelineFunnel'))}
          <div style="display:flex;flex-direction:column;gap:12px">
            ${stages.map(s => {
              const val = SALES.pipeline[s.key] || 0;
              const pct = (val / maxPipeline) * 100;
              return `
                <div>
                  <div class="flex-between" style="margin-bottom:4px">
                    <span style="font-size:.85rem;font-weight:500">${s.key === 'lead' ? s.label : s.label}</span>
                    <span style="font-size:.85rem;font-weight:600">${val} ${t('sales.deals')}</span>
                  </div>
                  <div class="progress-bar">
                    <div class="progress-fill" style="width:${pct}%;background:${s.color}"></div>
                  </div>
                </div>`;
            }).join('')}
            <div class="flex-between" style="margin-top:8px;padding-top:8px;border-top:1px solid var(--border-default)">
              <span style="font-size:.85rem;color:var(--color-success);font-weight:600">${t('sales.closedWon')}: ${SALES.pipeline.closed_won || SALES.totalWon}</span>
              <span style="font-size:.85rem;color:var(--color-danger);font-weight:600">${t('sales.closedLost')}: ${SALES.pipeline.closed_lost || SALES.totalLost}</span>
            </div>
          </div>
        </div>

        <!-- Win/Loss Analysis -->
        <div class="card">
          ${SectionHeader(t('sales.winLoss'))}
          <div id="chart-win-loss" style="min-height:200px"></div>
          <div style="margin-top:16px">
            <div style="font-size:.8rem;font-weight:600;margin-bottom:8px;color:var(--text-secondary)">${t('sales.lossReasons')}</div>
            ${losses.map(r => `
              <div class="flex-between" style="margin-bottom:6px">
                <span style="font-size:.8rem">${lang === 'en' ? r.reasonEn : r.reason}</span>
                <div style="display:flex;align-items:center;gap:8px">
                  <div class="progress-bar" style="width:80px;height:6px">
                    <div class="progress-fill" style="width:${r.pct}%;background:var(--color-danger)"></div>
                  </div>
                  <span style="font-size:.75rem;color:var(--text-muted)">${r.pct}%</span>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>

      <!-- Top Customers -->
      <div class="card" style="margin-top:16px">
        ${SectionHeader(t('sales.topCustomers'))}
        <div style="overflow-x:auto">
          <table class="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>${t('sales.customer')}</th>
                <th>${t('sales.plan')}</th>
                <th style="text-align:right">${t('sales.revenue')}</th>
                <th style="text-align:right">${t('sales.share')}</th>
              </tr>
            </thead>
            <tbody>
              ${topCust.map((c, i) => {
                const share = SALES.annualRevenue > 0
                  ? ((c.revenue / SALES.annualRevenue) * 100).toFixed(1)
                  : '0.0';
                return `
                  <tr>
                    <td>${i + 1}</td>
                    <td style="font-weight:500">${c.name}</td>
                    <td><span class="badge" style="background:${c.plan === 'Enterprise' ? '#a855f720' : c.plan === 'Professional' ? '#22c55e20' : '#3b82f620'};color:${c.plan === 'Enterprise' ? '#a855f7' : c.plan === 'Professional' ? '#22c55e' : '#3b82f6'}">${c.plan}</span></td>
                    <td style="text-align:right">${formatBaht(c.revenue)}</td>
                    <td style="text-align:right">${share}%</td>
                  </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Sales Reps Performance -->
      <div class="card" style="margin-top:16px">
        ${SectionHeader(t('sales.repPerformance'))}
        <div class="grid grid-${SALES.reps.length}" style="gap:16px">
          ${SALES.reps.map(rep => {
            const pct = rep.target > 0 ? ((rep.actual / rep.target) * 100).toFixed(1) : '0.0';
            const status = pct >= 100 ? 'success' : pct >= 80 ? '' : 'danger';
            return `
              <div class="card card-sm" style="text-align:center">
                <div style="font-weight:600;margin-bottom:8px">${lang === 'en' ? rep.nameEn : rep.name}</div>
                <div style="font-size:1.5rem;font-weight:700;color:${pct >= 100 ? 'var(--color-success)' : pct >= 80 ? 'var(--color-warning)' : 'var(--color-danger)'}">${pct}%</div>
                <div style="font-size:.75rem;color:var(--text-muted);margin:4px 0">${formatBahtCompact(rep.actual)} / ${formatBahtCompact(rep.target)}</div>
                <div class="progress-bar" style="margin-top:8px">
                  <div class="progress-fill ${status}" style="width:${Math.min(pct, 100)}%"></div>
                </div>
              </div>`;
          }).join('')}
        </div>
      </div>`;
  }

  // ── Pipeline Tab ──
  function buildPipelineTab() {
    return `
      <div class="card">
        ${SectionHeader(t('sales.monthlyDeals'))}
        <div style="overflow-x:auto">
          <table class="data-table">
            <thead>
              <tr>
                <th>${t('th.month')}</th>
                <th style="text-align:right">${t('sales.newDeals')}</th>
                <th style="text-align:right">${t('sales.won')}</th>
                <th style="text-align:right">${t('sales.lost')}</th>
                <th style="text-align:right">${t('sales.convRate')}</th>
                <th style="text-align:right">${t('sales.revenue')}</th>
              </tr>
            </thead>
            <tbody>
              ${months.map((m, i) => {
                const rate = SALES.monthlyDeals[i] > 0
                  ? ((SALES.monthlyWon[i] / SALES.monthlyDeals[i]) * 100).toFixed(1)
                  : '0.0';
                return `
                  <tr>
                    <td>${m}</td>
                    <td style="text-align:right">${SALES.monthlyDeals[i]}</td>
                    <td style="text-align:right;color:var(--color-success)">${SALES.monthlyWon[i]}</td>
                    <td style="text-align:right;color:var(--color-danger)">${SALES.monthlyLost[i]}</td>
                    <td style="text-align:right">${rate}%</td>
                    <td style="text-align:right">${formatBaht(SALES.monthlyRevenue[i])}</td>
                  </tr>`;
              }).join('')}
            </tbody>
            <tfoot>
              <tr style="font-weight:700;border-top:2px solid var(--border-default)">
                <td>${t('th.total')}</td>
                <td style="text-align:right">${SALES.totalDeals}</td>
                <td style="text-align:right;color:var(--color-success)">${SALES.totalWon}</td>
                <td style="text-align:right;color:var(--color-danger)">${SALES.totalLost}</td>
                <td style="text-align:right">${formatPercent(SALES.conversionRate)}</td>
                <td style="text-align:right">${formatBaht(SALES.annualRevenue)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <div class="card" style="margin-top:16px">
        ${SectionHeader(t('sales.pipelineValue'))}
        <div id="chart-pipeline-value" style="min-height:300px"></div>
      </div>`;
  }

  // ── Targets Tab (Editable) ──
  function buildTargetsTab() {
    return `
      <div class="flex gap-8" style="margin-bottom:16px;flex-wrap:wrap">
        <button class="btn btn-primary btn-sm" id="btn-save-sales">
          <i data-lucide="save" style="width:14px;height:14px"></i> ${t('btn.save')}
        </button>
        <button class="btn btn-secondary btn-sm" id="btn-undo-sales" ${!undoBuffer ? 'disabled style="opacity:.5;cursor:not-allowed"' : ''}>
          <i data-lucide="undo-2" style="width:14px;height:14px"></i> ${t('btn.undo')}
        </button>
        <button class="btn btn-danger btn-sm" id="btn-reset-sales">
          <i data-lucide="trash-2" style="width:14px;height:14px"></i> ${t('btn.reset')}
        </button>
        <span id="sales-save-indicator" class="save-indicator" style="margin-left:auto"></span>
      </div>

      <div class="card">
        ${SectionHeader(t('sales.monthlyTargets'))}
        <div style="overflow-x:auto">
          <table class="data-table">
            <thead>
              <tr>
                <th>${t('th.month')}</th>
                <th style="text-align:right">${t('sales.targetRevenue')}</th>
                <th style="text-align:right">${t('sales.actualRevenue')}</th>
                <th style="text-align:right">${t('th.variance')}</th>
              </tr>
            </thead>
            <tbody>
              ${months.map((m, i) => {
                const variance = SALES.monthlyRevenue[i] - SALES.targets[i];
                const varPct = SALES.targets[i] > 0 ? ((variance / SALES.targets[i]) * 100).toFixed(1) : '0.0';
                return `
                  <tr>
                    <td>${m}</td>
                    <td style="text-align:right">
                      <input type="text" class="ba-input sales-input"
                        data-field="targets" data-month="${i}"
                        value="${formatInputDisplay(SALES.targets[i])}"
                        style="width:120px;text-align:right">
                    </td>
                    <td style="text-align:right">
                      <input type="text" class="ba-input sales-input"
                        data-field="monthlyRevenue" data-month="${i}"
                        value="${formatInputDisplay(SALES.monthlyRevenue[i])}"
                        style="width:120px;text-align:right">
                    </td>
                    <td style="text-align:right;color:${variance >= 0 ? 'var(--color-success)' : 'var(--color-danger)'}">
                      ${formatBaht(variance)} (${varPct}%)
                    </td>
                  </tr>`;
              }).join('')}
            </tbody>
            <tfoot>
              <tr style="font-weight:700;border-top:2px solid var(--border-default)">
                <td>${t('th.total')}</td>
                <td style="text-align:right">${formatBaht(SALES.annualTarget)}</td>
                <td style="text-align:right">${formatBaht(SALES.annualRevenue)}</td>
                <td style="text-align:right;color:${SALES.annualRevenue >= SALES.annualTarget ? 'var(--color-success)' : 'var(--color-danger)'}">
                  ${formatBaht(SALES.annualRevenue - SALES.annualTarget)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>`;
  }

  // ── Charts Tab ──
  function buildChartsTab() {
    return `
      <div class="grid grid-2 stagger">
        <div class="card">
          ${SectionHeader(t('sales.revenueVsTarget'))}
          <div id="chart-rev-target" style="min-height:300px"></div>
        </div>
        <div class="card">
          ${SectionHeader(t('sales.dealsTrend'))}
          <div id="chart-deals-trend" style="min-height:300px"></div>
        </div>
      </div>
      <div class="card" style="margin-top:16px">
        ${SectionHeader(t('sales.conversionTrend'))}
        <div id="chart-conversion" style="min-height:300px"></div>
      </div>`;
  }

  // ── Charts Init ──
  function initCharts() {
    if (typeof ApexCharts === 'undefined') return;

    if (activeTab === 'overview') {
      createChart('chart-win-loss', {
        chart: { type: 'donut', height: 200 },
        series: [SALES.totalWon, SALES.totalLost, SALES.totalDeals - SALES.totalWon - SALES.totalLost],
        labels: [t('sales.won'), t('sales.lost'), t('sales.inProgress')],
        colors: ['#22c55e', '#ef4444', '#94a3b8'],
        legend: { position: 'bottom' },
      });
    }

    if (activeTab === 'pipeline') {
      createChart('chart-pipeline-value', {
        chart: { type: 'bar', height: 300 },
        series: [
          { name: t('sales.revenue'), data: SALES.monthlyRevenue },
        ],
        xaxis: { categories: months },
        colors: ['#22c55e'],
        plotOptions: { bar: { borderRadius: 4, columnWidth: '50%' } },
      });
    }

    if (activeTab === 'charts') {
      createChart('chart-rev-target', {
        chart: { type: 'bar', height: 300 },
        series: [
          { name: t('sales.target'), data: SALES.targets },
          { name: t('sales.actual'), data: SALES.monthlyRevenue },
        ],
        xaxis: { categories: months },
        colors: ['#94a3b8', '#22c55e'],
        plotOptions: { bar: { borderRadius: 4, columnWidth: '60%' } },
      });

      createChart('chart-deals-trend', {
        chart: { type: 'area', height: 300 },
        series: [
          { name: t('sales.won'), data: SALES.monthlyWon },
          { name: t('sales.lost'), data: SALES.monthlyLost },
        ],
        xaxis: { categories: months },
        colors: ['#22c55e', '#ef4444'],
        fill: { type: 'gradient', gradient: { opacityFrom: 0.5, opacityTo: 0.05 } },
      });

      const convRates = SALES.monthlyDeals.map((d, i) => d > 0 ? +((SALES.monthlyWon[i] / d) * 100).toFixed(1) : 0);
      createChart('chart-conversion', {
        chart: { type: 'line', height: 300 },
        series: [{ name: t('sales.conversionRate'), data: convRates }],
        xaxis: { categories: months },
        colors: ['#3b82f6'],
        stroke: { width: 3, curve: 'smooth' },
        markers: { size: 4 },
        yaxis: { labels: { formatter: v => v + '%' } },
      });
    }
  }

  // ── Event Handlers ──
  function bindEvents() {
    // Tab switching
    container.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        activeTab = btn.dataset.tab;
        sessionStorage.setItem(TAB_KEY, activeTab);
        destroyAllCharts();
        renderPage();
      });
    });

    // Input handling (targets tab)
    container.addEventListener('input', e => {
      const input = e.target.closest('.sales-input');
      if (!input) return;
      reformatInput(input);
      const field = input.dataset.field;
      const month = parseInt(input.dataset.month);
      const value = parseInputValue(input.value);
      SALES[field][month] = value;
      recalcSales();
      isDirty = true;
      autoSave();
      updateSummaryBar();
    });

    // Save
    container.querySelector('#btn-save-sales')?.addEventListener('click', () => {
      undoBuffer = snapshot();
      saveSales();
      isDirty = false;
      renderPage();
    });

    // Undo
    container.querySelector('#btn-undo-sales')?.addEventListener('click', () => {
      if (!undoBuffer) return;
      restore(undoBuffer);
      undoBuffer = null;
      isDirty = false;
      renderPage();
    });

    // Reset
    container.querySelector('#btn-reset-sales')?.addEventListener('click', () => {
      if (!confirm(t('confirm.resetSales'))) return;
      resetSales();
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
