// ============================================
// EasySlip 2026 — Product Metrics Page
// ============================================

import { PRODUCT, recalcProduct, saveProduct, resetProduct } from '../data/product.js';
import { createChart, destroyAllCharts } from '../components/charts.js';
import { MetricCard, SectionHeader } from '../components/cards.js';
import { formatBahtCompact, formatNumber, formatPercent, setPageTitle } from '../utils.js';
import { t, getMonths, getLang } from '../i18n.js';
import { createAutoSave, formatInputDisplay, parseInputValue, reformatInput } from '../shared/editable-page.js';

export function render(container) {
  setPageTitle(t('page.product.title'));

  let undoBuffer = null;
  let isDirty = false;
  const TAB_KEY = 'product_active_tab';
  let activeTab = sessionStorage.getItem(TAB_KEY) || 'overview';
  const months = getMonths();

  // ── Snapshot / Undo ──
  function snapshot() {
    return {
      apiCalls: [...PRODUCT.apiCalls],
      errorRate: [...PRODUCT.errorRate],
      dau: [...PRODUCT.dau],
      mau: [...PRODUCT.mau],
      uptime: [...PRODUCT.uptime],
      responseTime: [...PRODUCT.responseTime],
      supportTickets: [...PRODUCT.supportTickets],
      resolutionTime: [...PRODUCT.resolutionTime],
    };
  }

  function restore(snap) {
    Object.keys(snap).forEach(k => {
      for (let i = 0; i < 12; i++) PRODUCT[k][i] = snap[k][i];
    });
    recalcProduct();
  }

  const autoSave = createAutoSave({
    saveFn: () => { undoBuffer = snapshot(); saveProduct(); },
    setDirty: v => isDirty = v,
    updateIndicator: () => {},
  });

  // ── Summary KPIs ──
  function buildSummaryBar() {
    const uptimeStatus = PRODUCT.avgUptime >= 99.95 ? '#22c55e' : PRODUCT.avgUptime >= 99.9 ? '#eab308' : '#ef4444';
    const errStatus = PRODUCT.avgErrorRate <= 0.5 ? '#22c55e' : PRODUCT.avgErrorRate <= 1 ? '#eab308' : '#ef4444';

    return `
      <div class="summary-bar" style="position:sticky;top:var(--header-height);z-index:40;background:var(--bg-surface);margin:0 -32px 24px;padding:12px 32px;border-bottom:1px solid var(--border-default);box-shadow:var(--shadow-sm)">
        <div class="grid grid-4 stagger" id="prod-kpis">
          ${MetricCard({ title: t('product.apiCalls'), value: formatNumber(PRODUCT.totalApiCalls), icon: 'zap', iconBg: '#3b82f6', subtitle: `${t('product.errorRate')}: ${formatPercent(PRODUCT.avgErrorRate)}` })}
          ${MetricCard({ title: 'DAU / MAU', value: `${formatNumber(PRODUCT.latestDAU)} / ${formatNumber(PRODUCT.latestMAU)}`, icon: 'users', iconBg: '#22c55e', subtitle: `${t('product.stickiness')}: ${formatPercent(PRODUCT.dauMauRatio)}` })}
          ${MetricCard({ title: t('product.uptime'), value: formatPercent(PRODUCT.avgUptime, 2), icon: 'shield-check', iconBg: uptimeStatus })}
          ${MetricCard({ title: t('product.avgResponse'), value: `${PRODUCT.avgResponseTime.toFixed(0)}ms`, icon: 'timer', iconBg: '#f97316', subtitle: `${t('product.tickets')}: ${PRODUCT.totalTickets}` })}
        </div>
      </div>`;
  }

  // ── Tabs ──
  function buildTabs() {
    const tabs = [
      { key: 'overview', label: t('product.tabOverview') },
      { key: 'usage', label: t('product.tabUsage') },
      { key: 'reliability', label: t('product.tabReliability') },
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
      <div id="prod-tab-content">${buildTabContent()}</div>`;
  }

  function buildTabContent() {
    switch (activeTab) {
      case 'overview': return buildOverviewTab();
      case 'usage': return buildUsageTab();
      case 'reliability': return buildReliabilityTab();
      case 'charts': return buildChartsTab();
      default: return '';
    }
  }

  // ── Overview Tab ──
  function buildOverviewTab() {
    const lang = getLang();
    return `
      <div class="grid grid-2 stagger">
        <div class="card">
          ${SectionHeader(t('product.apiUsage'))}
          <div id="chart-api-usage" style="min-height:280px"></div>
        </div>
        <div class="card">
          ${SectionHeader(t('product.activeUsers'))}
          <div id="chart-active-users" style="min-height:280px"></div>
        </div>
      </div>

      <!-- Feature Adoption -->
      <div class="card" style="margin-top:16px">
        ${SectionHeader(t('product.featureAdoption'))}
        <div style="display:flex;flex-direction:column;gap:16px">
          ${PRODUCT.features.map(f => `
            <div>
              <div class="flex-between" style="margin-bottom:4px">
                <span style="font-size:.85rem;font-weight:500">${lang === 'en' ? f.labelEn : f.label}</span>
                <span style="font-size:.85rem;font-weight:600;color:${f.color}">${f.adoption}%</span>
              </div>
              <div class="progress-bar">
                <div class="progress-fill" style="width:${f.adoption}%;background:${f.color}"></div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Support Tickets Summary -->
      <div class="card" style="margin-top:16px">
        ${SectionHeader(t('product.supportSummary'))}
        <div class="grid grid-3">
          <div style="text-align:center;padding:16px">
            <div style="font-size:2rem;font-weight:700;color:var(--color-accent)">${PRODUCT.totalTickets}</div>
            <div style="font-size:.8rem;color:var(--text-muted)">${t('product.totalTickets')}</div>
          </div>
          <div style="text-align:center;padding:16px">
            <div style="font-size:2rem;font-weight:700;color:var(--color-success)">${PRODUCT.avgResolutionTime.toFixed(1)}h</div>
            <div style="font-size:.8rem;color:var(--text-muted)">${t('product.avgResolution')}</div>
          </div>
          <div style="text-align:center;padding:16px">
            <div style="font-size:2rem;font-weight:700;color:${PRODUCT.supportTickets[11] < PRODUCT.supportTickets[0] ? 'var(--color-success)' : 'var(--color-danger)'}">
              ${PRODUCT.supportTickets[11] < PRODUCT.supportTickets[0] ? '↓' : '↑'}
              ${Math.abs(((PRODUCT.supportTickets[11] - PRODUCT.supportTickets[0]) / PRODUCT.supportTickets[0]) * 100).toFixed(0)}%
            </div>
            <div style="font-size:.8rem;color:var(--text-muted)">${t('product.ticketsTrend')}</div>
          </div>
        </div>
      </div>`;
  }

  // ── Usage Tab (Editable) ──
  function buildUsageTab() {
    return `
      <div class="flex gap-8" style="margin-bottom:16px;flex-wrap:wrap">
        <button class="btn btn-primary btn-sm" id="btn-save-prod">
          <i data-lucide="save" style="width:14px;height:14px"></i> ${t('btn.save')}
        </button>
        <button class="btn btn-secondary btn-sm" id="btn-undo-prod" ${!undoBuffer ? 'disabled style="opacity:.5;cursor:not-allowed"' : ''}>
          <i data-lucide="undo-2" style="width:14px;height:14px"></i> ${t('btn.undo')}
        </button>
        <button class="btn btn-danger btn-sm" id="btn-reset-prod">
          <i data-lucide="trash-2" style="width:14px;height:14px"></i> ${t('btn.reset')}
        </button>
      </div>

      <div class="card">
        ${SectionHeader(t('product.monthlyData'))}
        <div style="overflow-x:auto">
          <table class="data-table">
            <thead>
              <tr>
                <th>${t('th.month')}</th>
                <th style="text-align:right">${t('product.apiCalls')}</th>
                <th style="text-align:right">${t('product.errorPct')}</th>
                <th style="text-align:right">DAU</th>
                <th style="text-align:right">MAU</th>
                <th style="text-align:right">${t('product.tickets')}</th>
              </tr>
            </thead>
            <tbody>
              ${months.map((m, i) => `
                <tr>
                  <td>${m}</td>
                  <td style="text-align:right">
                    <input type="text" class="ba-input prod-input"
                      data-field="apiCalls" data-month="${i}"
                      value="${formatInputDisplay(PRODUCT.apiCalls[i])}"
                      style="width:110px;text-align:right">
                  </td>
                  <td style="text-align:right">
                    <input type="text" class="ba-input prod-input prod-float"
                      data-field="errorRate" data-month="${i}"
                      value="${PRODUCT.errorRate[i]}"
                      style="width:60px;text-align:right">
                  </td>
                  <td style="text-align:right">
                    <input type="text" class="ba-input prod-input"
                      data-field="dau" data-month="${i}"
                      value="${formatInputDisplay(PRODUCT.dau[i])}"
                      style="width:80px;text-align:right">
                  </td>
                  <td style="text-align:right">
                    <input type="text" class="ba-input prod-input"
                      data-field="mau" data-month="${i}"
                      value="${formatInputDisplay(PRODUCT.mau[i])}"
                      style="width:80px;text-align:right">
                  </td>
                  <td style="text-align:right">
                    <input type="text" class="ba-input prod-input"
                      data-field="supportTickets" data-month="${i}"
                      value="${formatInputDisplay(PRODUCT.supportTickets[i])}"
                      style="width:60px;text-align:right">
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>`;
  }

  // ── Reliability Tab ──
  function buildReliabilityTab() {
    return `
      <div class="card">
        ${SectionHeader(t('product.uptimeSla'))}
        <div style="overflow-x:auto">
          <table class="data-table">
            <thead>
              <tr>
                <th>${t('th.month')}</th>
                <th style="text-align:right">${t('product.uptime')} %</th>
                <th style="text-align:right">${t('product.responseMs')}</th>
                <th style="text-align:right">${t('product.tickets')}</th>
                <th style="text-align:right">${t('product.resolution')} (h)</th>
                <th>${t('th.status')}</th>
              </tr>
            </thead>
            <tbody>
              ${months.map((m, i) => {
                const uStatus = PRODUCT.uptime[i] >= 99.95 ? 'success' : PRODUCT.uptime[i] >= 99.9 ? 'warning' : 'danger';
                return `
                  <tr>
                    <td>${m}</td>
                    <td style="text-align:right">${PRODUCT.uptime[i].toFixed(2)}%</td>
                    <td style="text-align:right">${PRODUCT.responseTime[i]}ms</td>
                    <td style="text-align:right">${PRODUCT.supportTickets[i]}</td>
                    <td style="text-align:right">${PRODUCT.resolutionTime[i].toFixed(1)}h</td>
                    <td>
                      <span class="badge ${uStatus}" style="background:${uStatus === 'success' ? '#22c55e20' : uStatus === 'warning' ? '#eab30820' : '#ef444420'};color:${uStatus === 'success' ? '#22c55e' : uStatus === 'warning' ? '#eab308' : '#ef4444'}">
                        ${uStatus === 'success' ? 'SLA Met' : uStatus === 'warning' ? 'At Risk' : 'SLA Breach'}
                      </span>
                    </td>
                  </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <div class="grid grid-2 stagger" style="margin-top:16px">
        <div class="card">
          ${SectionHeader(t('product.uptimeChart'))}
          <div id="chart-uptime" style="min-height:280px"></div>
        </div>
        <div class="card">
          ${SectionHeader(t('product.responseChart'))}
          <div id="chart-response" style="min-height:280px"></div>
        </div>
      </div>`;
  }

  // ── Charts Tab ──
  function buildChartsTab() {
    return `
      <div class="grid grid-2 stagger">
        <div class="card">
          ${SectionHeader(t('product.apiTrend'))}
          <div id="chart-api-trend" style="min-height:300px"></div>
        </div>
        <div class="card">
          ${SectionHeader(t('product.usersTrend'))}
          <div id="chart-users-trend" style="min-height:300px"></div>
        </div>
      </div>
      <div class="grid grid-2 stagger" style="margin-top:16px">
        <div class="card">
          ${SectionHeader(t('product.errorTrend'))}
          <div id="chart-error-trend" style="min-height:300px"></div>
        </div>
        <div class="card">
          ${SectionHeader(t('product.ticketsTrendChart'))}
          <div id="chart-tickets-trend" style="min-height:300px"></div>
        </div>
      </div>`;
  }

  // ── Init Charts ──
  function initCharts() {
    if (typeof ApexCharts === 'undefined') return;

    if (activeTab === 'overview') {
      createChart('chart-api-usage', {
        chart: { type: 'area', height: 280 },
        series: [{ name: t('product.apiCalls'), data: PRODUCT.apiCalls }],
        xaxis: { categories: months },
        colors: ['#3b82f6'],
        fill: { type: 'gradient', gradient: { opacityFrom: 0.5, opacityTo: 0.05 } },
        tooltip: { y: { formatter: v => formatNumber(v) } },
      });

      createChart('chart-active-users', {
        chart: { type: 'line', height: 280 },
        series: [
          { name: 'DAU', data: PRODUCT.dau },
          { name: 'WAU', data: PRODUCT.wau },
          { name: 'MAU', data: PRODUCT.mau },
        ],
        xaxis: { categories: months },
        colors: ['#22c55e', '#f97316', '#3b82f6'],
        stroke: { width: 2, curve: 'smooth' },
        markers: { size: 3 },
      });
    }

    if (activeTab === 'reliability') {
      createChart('chart-uptime', {
        chart: { type: 'line', height: 280 },
        series: [{ name: t('product.uptime'), data: PRODUCT.uptime }],
        xaxis: { categories: months },
        colors: ['#22c55e'],
        stroke: { width: 3, curve: 'smooth' },
        markers: { size: 4 },
        yaxis: { min: 99.8, max: 100, labels: { formatter: v => v.toFixed(2) + '%' } },
        annotations: { yaxis: [{ y: 99.95, borderColor: '#ef4444', strokeDashArray: 4, label: { text: 'SLA 99.95%', style: { color: '#ef4444' } } }] },
      });

      createChart('chart-response', {
        chart: { type: 'line', height: 280 },
        series: [{ name: t('product.responseMs'), data: PRODUCT.responseTime }],
        xaxis: { categories: months },
        colors: ['#f97316'],
        stroke: { width: 3, curve: 'smooth' },
        markers: { size: 4 },
        yaxis: { labels: { formatter: v => v + 'ms' } },
      });
    }

    if (activeTab === 'charts') {
      createChart('chart-api-trend', {
        chart: { type: 'bar', height: 300 },
        series: [{ name: t('product.apiCalls'), data: PRODUCT.apiCalls }],
        xaxis: { categories: months },
        colors: ['#3b82f6'],
        plotOptions: { bar: { borderRadius: 4, columnWidth: '50%' } },
        tooltip: { y: { formatter: v => formatNumber(v) } },
      });

      createChart('chart-users-trend', {
        chart: { type: 'area', height: 300 },
        series: [
          { name: 'DAU', data: PRODUCT.dau },
          { name: 'MAU', data: PRODUCT.mau },
        ],
        xaxis: { categories: months },
        colors: ['#22c55e', '#3b82f6'],
        fill: { type: 'gradient', gradient: { opacityFrom: 0.5, opacityTo: 0.05 } },
      });

      createChart('chart-error-trend', {
        chart: { type: 'line', height: 300 },
        series: [{ name: t('product.errorRate'), data: PRODUCT.errorRate }],
        xaxis: { categories: months },
        colors: ['#ef4444'],
        stroke: { width: 3, curve: 'smooth' },
        markers: { size: 4 },
        yaxis: { labels: { formatter: v => v + '%' } },
      });

      createChart('chart-tickets-trend', {
        chart: { type: 'bar', height: 300 },
        series: [
          { name: t('product.tickets'), data: PRODUCT.supportTickets },
        ],
        xaxis: { categories: months },
        colors: ['#a855f7'],
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
      const input = e.target.closest('.prod-input');
      if (!input) return;
      const field = input.dataset.field;
      const month = parseInt(input.dataset.month);
      if (input.classList.contains('prod-float')) {
        PRODUCT[field][month] = parseFloat(input.value) || 0;
      } else {
        reformatInput(input);
        PRODUCT[field][month] = parseInputValue(input.value);
      }
      recalcProduct();
      isDirty = true;
      autoSave();
    });

    container.querySelector('#btn-save-prod')?.addEventListener('click', () => {
      undoBuffer = snapshot();
      saveProduct();
      isDirty = false;
      renderPage();
    });

    container.querySelector('#btn-undo-prod')?.addEventListener('click', () => {
      if (!undoBuffer) return;
      restore(undoBuffer);
      undoBuffer = null;
      isDirty = false;
      renderPage();
    });

    container.querySelector('#btn-reset-prod')?.addEventListener('click', () => {
      if (!confirm(t('confirm.resetProduct'))) return;
      resetProduct();
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
