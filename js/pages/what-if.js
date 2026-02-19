// ============================================
// EasySlip 2026 — Page 6: What-If Simulator
// ============================================

import { REVENUE } from '../data/revenue.js';
import { EXPENSES, TOTAL_MONTHLY_COST, ANNUAL_TOTAL_COST } from '../data/expenses.js';
import { MONTHS_TH } from '../data/constants.js';
import { MetricCard } from '../components/cards.js';
import { createChart, destroyAllCharts } from '../components/charts.js';
import { setPageTitle, formatBaht, formatBahtCompact, formatPercent, formatPercentSigned, debounce } from '../utils.js';
import { t, getMonths } from '../i18n.js';

// ── Base scenario (from actual data) ──
const BASE = Object.freeze({
  systemCostRatio: 0.2427,
  apiGrowth: 0.015,      // 1.5% MoM
  crmGrowth: 0.33,       // 33% MoM
  smsGrowth: 0.585,      // 58.5% MoM
  marketingBudget: 5000000,
  collectionRate: 0.85,
  salaryGrowth: 0,
});

// Presets
const PRESETS = {
  conservative: {
    label: 'Conservative',
    values: { systemCostRatio: 0.25, apiGrowth: 0.01, crmGrowth: 0.2, smsGrowth: 0.3, marketingBudget: 3000000, collectionRate: 0.80, salaryGrowth: 0.02 },
  },
  moderate: {
    label: 'Moderate',
    values: { ...BASE },
  },
  aggressive: {
    label: 'Aggressive',
    values: { systemCostRatio: 0.20, apiGrowth: 0.025, crmGrowth: 0.45, smsGrowth: 0.70, marketingBudget: 7000000, collectionRate: 0.90, salaryGrowth: 0 },
  },
};

// ── Calculation Engine ──
function calculate(params) {
  const months = 12;
  const revenue = { bot: [], api: [], crm: [], sms: [], total: [] };
  const costs = { system: [], salary: [], marketing: [], fixed: [], total: [] };
  const profit = [];

  // API base = month 1 revenue
  const apiBase = 4800000;
  const crmBase = 150000;  // starts month 4
  const smsBase = 80000;   // starts month 5
  const monthlyMarketing = params.marketingBudget / 12;
  const baseSalary = 150000;

  for (let m = 0; m < months; m++) {
    // Revenue calculation
    revenue.bot[m] = REVENUE.bot[m]; // BOT stays fixed
    revenue.api[m] = Math.round(apiBase * Math.pow(1 + params.apiGrowth, m));
    revenue.crm[m] = m >= 3 ? Math.round(crmBase * Math.pow(1 + params.crmGrowth, m - 3)) : 0;
    revenue.sms[m] = m >= 4 ? Math.round(smsBase * Math.pow(1 + params.smsGrowth, m - 4)) : 0;
    revenue.total[m] = revenue.bot[m] + revenue.api[m] + revenue.crm[m] + revenue.sms[m];

    // Cost calculation
    costs.system[m] = Math.round(revenue.total[m] * params.systemCostRatio);
    costs.salary[m] = Math.round(baseSalary * Math.pow(1 + params.salaryGrowth, m));
    costs.marketing[m] = Math.round(monthlyMarketing);
    costs.fixed[m] = EXPENSES.admin?.[m] ?? 0; // admin overhead (social + acct + office + insurance + other)
    costs.total[m] = costs.system[m] + costs.salary[m] + costs.marketing[m] + costs.fixed[m]
                     + Math.round(EXPENSES.tax?.[m] ?? 0) + Math.round(revenue.total[m] * 0.02); // tax + contingency
    profit[m] = revenue.total[m] - costs.total[m];
  }

  const annualRevenue = revenue.total.reduce((a, b) => a + b, 0);
  const annualCost = costs.total.reduce((a, b) => a + b, 0);
  const annualProfit = annualRevenue - annualCost;
  const margin = annualRevenue > 0 ? (annualProfit / annualRevenue) * 100 : 0;

  return { revenue, costs, profit, annualRevenue, annualCost, annualProfit, margin };
}

export function render(container) {
  setPageTitle(t('page.whatif.title'));

  const months = getMonths();
  let params = { ...BASE };
  const baseResult = calculate(BASE);

  const SLIDERS = [
    { key: 'systemCostRatio', label: t('slider.systemCostRatio'), min: 0.15, max: 0.30, step: 0.01, format: v => `${(v*100).toFixed(0)}%` },
    { key: 'apiGrowth', label: t('slider.apiGrowth'), min: 0, max: 0.05, step: 0.005, format: v => `${(v*100).toFixed(1)}%` },
    { key: 'crmGrowth', label: t('slider.crmGrowth'), min: 0.10, max: 0.50, step: 0.01, format: v => `${(v*100).toFixed(0)}%` },
    { key: 'smsGrowth', label: t('slider.smsGrowth'), min: 0.20, max: 0.80, step: 0.01, format: v => `${(v*100).toFixed(1)}%` },
    { key: 'marketingBudget', label: t('slider.marketingBudget'), min: 1000000, max: 10000000, step: 500000, format: v => formatBahtCompact(v) },
    { key: 'collectionRate', label: t('slider.collectionRate'), min: 0.70, max: 1.00, step: 0.01, format: v => `${(v*100).toFixed(0)}%` },
    { key: 'salaryGrowth', label: t('slider.salaryGrowth'), min: 0, max: 0.05, step: 0.005, format: v => `${(v*100).toFixed(1)}%` },
  ];

  container.innerHTML = `
    <div class="fade-in">
      <!-- Presets -->
      <div class="flex gap-8" style="margin-bottom:24px">
        ${Object.entries(PRESETS).map(([key, p]) =>
          `<button class="btn ${key === 'moderate' ? 'btn-primary' : 'btn-secondary'} btn-sm preset-btn" data-preset="${key}">${p.label}</button>`
        ).join('')}
        <button class="btn btn-secondary btn-sm" id="reset-btn">
          <i data-lucide="rotate-ccw" style="width:14px;height:14px"></i> Reset
        </button>
      </div>

      <div class="grid grid-1-2">
        <!-- Sliders Panel -->
        <div class="card">
          <div class="card-header">
            <span class="card-title">${t('whatif.adjustParams')}</span>
          </div>
          ${SLIDERS.map(s => `
            <div class="slider-group">
              <div class="slider-label">
                <span>${s.label}</span>
                <span class="slider-value" id="val-${s.key}">${s.format(params[s.key])}</span>
              </div>
              <input type="range" id="slider-${s.key}" min="${s.min}" max="${s.max}" step="${s.step}" value="${params[s.key]}">
            </div>
          `).join('')}
        </div>

        <!-- Results -->
        <div>
          <!-- KPI Cards -->
          <div class="grid grid-2 stagger" style="margin-bottom:24px" id="whatif-kpis"></div>

          <!-- Comparison Chart -->
          <div class="card" style="margin-bottom:24px">
            <div class="card-header">
              <span class="card-title">${t('whatif.baseVsModified')}</span>
            </div>
            <div id="whatif-chart" class="chart-container"></div>
          </div>

          <!-- Delta Cards -->
          <div class="grid grid-3" id="whatif-deltas"></div>
        </div>
      </div>
    </div>
  `;

  if (typeof lucide !== 'undefined') lucide.createIcons();

  function updateResults() {
    const result = calculate(params);

    // KPI cards
    const kpiContainer = document.getElementById('whatif-kpis');
    kpiContainer.innerHTML = `
      ${MetricCard({ title: t('whatif.revenueModified'), value: formatBahtCompact(result.annualRevenue), icon: 'trending-up', iconBg: '#22c55e' })}
      ${MetricCard({ title: t('whatif.costModified'), value: formatBahtCompact(result.annualCost), icon: 'receipt', iconBg: '#ef4444' })}
      ${MetricCard({ title: t('whatif.profitModified'), value: formatBahtCompact(result.annualProfit), icon: 'wallet', iconBg: '#6366f1' })}
      ${MetricCard({ title: t('whatif.marginModified'), value: formatPercent(result.margin), icon: 'target', iconBg: '#eab308' })}
    `;

    // Delta cards
    const deltaContainer = document.getElementById('whatif-deltas');
    const revDelta = result.annualRevenue - baseResult.annualRevenue;
    const costDelta = result.annualCost - baseResult.annualCost;
    const profitDelta = result.annualProfit - baseResult.annualProfit;
    deltaContainer.innerHTML = `
      <div class="card card-sm" style="text-align:center">
        <div style="font-size:.75rem;color:var(--text-secondary)">${t('whatif.revenueDelta')}</div>
        <div style="font-size:1.25rem;font-weight:700;color:${revDelta >= 0 ? 'var(--color-success)' : 'var(--color-danger)'}">
          ${revDelta >= 0 ? '↑' : '↓'} ${formatBahtCompact(Math.abs(revDelta))}
        </div>
        <div style="font-size:.7rem;color:var(--text-muted)">${formatPercentSigned(baseResult.annualRevenue ? (revDelta/baseResult.annualRevenue)*100 : 0)}</div>
      </div>
      <div class="card card-sm" style="text-align:center">
        <div style="font-size:.75rem;color:var(--text-secondary)">${t('whatif.costDelta')}</div>
        <div style="font-size:1.25rem;font-weight:700;color:${costDelta <= 0 ? 'var(--color-success)' : 'var(--color-danger)'}">
          ${costDelta <= 0 ? '↓' : '↑'} ${formatBahtCompact(Math.abs(costDelta))}
        </div>
        <div style="font-size:.7rem;color:var(--text-muted)">${formatPercentSigned(baseResult.annualCost ? (costDelta/baseResult.annualCost)*100 : 0)}</div>
      </div>
      <div class="card card-sm" style="text-align:center">
        <div style="font-size:.75rem;color:var(--text-secondary)">${t('whatif.profitDelta')}</div>
        <div style="font-size:1.25rem;font-weight:700;color:${profitDelta >= 0 ? 'var(--color-success)' : 'var(--color-danger)'}">
          ${profitDelta >= 0 ? '↑' : '↓'} ${formatBahtCompact(Math.abs(profitDelta))}
        </div>
        <div style="font-size:.7rem;color:var(--text-muted)">${formatPercentSigned(baseResult.annualProfit ? (profitDelta/baseResult.annualProfit)*100 : 0)}</div>
      </div>
    `;

    if (typeof lucide !== 'undefined') lucide.createIcons();

    // Chart
    createChart('whatif-chart', {
      chart: { type: 'line', height: 340 },
      series: [
        { name: t('chart.baseRevenue'), data: [...REVENUE.total] },
        { name: t('chart.modifiedRevenue'), data: result.revenue.total },
        { name: t('chart.baseProfit'), data: REVENUE.total.map((r, i) => r - TOTAL_MONTHLY_COST[i]) },
        { name: t('chart.modifiedProfit'), data: result.profit },
      ],
      xaxis: { categories: months },
      colors: ['#94a3b8', '#22c55e', '#64748b', '#6366f1'],
      stroke: {
        width: [2, 3, 2, 3],
        dashArray: [5, 0, 5, 0],
      },
      yaxis: { labels: { formatter: v => `฿${(v/1000000).toFixed(1)}M`, style: { colors: '#94a3b8' } } },
    });
  }

  // Initial render
  updateResults();

  // Slider event handling
  const debouncedUpdate = debounce(updateResults, 150);

  SLIDERS.forEach(s => {
    const slider = document.getElementById(`slider-${s.key}`);
    slider?.addEventListener('input', () => {
      params[s.key] = parseFloat(slider.value);
      document.getElementById(`val-${s.key}`).textContent = s.format(params[s.key]);
      debouncedUpdate();
    });
  });

  // Preset buttons
  container.querySelectorAll('.preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const preset = PRESETS[btn.dataset.preset];
      if (!preset) return;
      params = { ...preset.values };
      SLIDERS.forEach(s => {
        const slider = document.getElementById(`slider-${s.key}`);
        if (slider) slider.value = params[s.key];
        const valEl = document.getElementById(`val-${s.key}`);
        if (valEl) valEl.textContent = s.format(params[s.key]);
      });
      updateResults();
    });
  });

  // Reset button
  document.getElementById('reset-btn')?.addEventListener('click', () => {
    params = { ...BASE };
    SLIDERS.forEach(s => {
      const slider = document.getElementById(`slider-${s.key}`);
      if (slider) slider.value = params[s.key];
      const valEl = document.getElementById(`val-${s.key}`);
      if (valEl) valEl.textContent = s.format(params[s.key]);
    });
    updateResults();
  });

  return () => destroyAllCharts();
}
