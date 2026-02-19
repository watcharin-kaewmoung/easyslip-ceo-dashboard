// ============================================
// EasySlip 2026 — Page 8: Marketing Budget
// ============================================

import {
  QUARTERLY_BUDGET, ANNUAL_MARKETING_BUDGET, MONTHLY_MARKETING,
  CHANNEL_ALLOCATION, TAX_IMPACT, QUARTERLY_STRATEGY, getMarketingRevenueRatio
} from '../data/marketing.js';
import { REVENUE } from '../data/revenue.js';
import { MONTHS_TH, QUARTERS } from '../data/constants.js';
import { MetricCard } from '../components/cards.js';
import { createChart, destroyAllCharts } from '../components/charts.js';
import { DataTable } from '../components/tables.js';
import { setPageTitle, formatBaht, formatBahtCompact, formatPercent } from '../utils.js';
import { t, getMonths, localized } from '../i18n.js';

export function render(container) {
  setPageTitle(t('page.marketing.title'));

  const months = getMonths();
  const mktRevRatio = getMarketingRevenueRatio(REVENUE.total);
  const avgRatio = mktRevRatio.reduce((a, b) => a + b, 0) / 12;
  const allocEntries = Object.values(CHANNEL_ALLOCATION);

  container.innerHTML = `
    <div class="fade-in">
      <!-- Summary Cards -->
      <div class="grid grid-4 stagger" style="margin-bottom:24px">
        ${MetricCard({ title: t('marketing.annualBudget'), value: formatBahtCompact(ANNUAL_MARKETING_BUDGET), icon: 'megaphone', iconBg: '#3b82f6' })}
        ${MetricCard({ title: t('marketing.effectivePostVat'), value: formatBahtCompact(TAX_IMPACT.effectiveBudget), icon: 'receipt', iconBg: '#22c55e', subtitle: `VAT: ${formatBaht(TAX_IMPACT.vatAmount)}` })}
        ${MetricCard({ title: t('marketing.marketingRevenue'), value: formatPercent(avgRatio), icon: 'percent', iconBg: '#f97316', subtitle: t('marketing.avgMonthlyRatio') })}
        ${MetricCard({ title: t('marketing.q4Push'), value: formatBahtCompact(QUARTERLY_BUDGET[3]), icon: 'rocket', iconBg: '#a855f7', subtitle: t('marketing.ofAnnualBudget') })}
      </div>

      <!-- Charts Row -->
      <div class="grid grid-2" style="margin-bottom:24px">
        <div class="card">
          <div class="card-header">
            <span class="card-title">${t('marketing.quarterlyBudget')}</span>
          </div>
          <div id="mkt-quarterly-bar" class="chart-container"></div>
        </div>
        <div class="card">
          <div class="card-header">
            <span class="card-title">${t('marketing.channelAllocation')}</span>
          </div>
          <div id="mkt-channel-donut" class="chart-container"></div>
        </div>
      </div>

      <!-- Tax Impact & Trend -->
      <div class="grid grid-2" style="margin-bottom:24px">
        <div class="card">
          <div class="card-header">
            <span class="card-title">${t('marketing.taxImpact')}</span>
          </div>
          <div style="display:flex;flex-direction:column;gap:16px;padding:8px 0">
            <div class="flex-between">
              <span style="color:var(--text-secondary)">${t('marketing.preTaxBudget')}</span>
              <span style="font-weight:700">${formatBaht(TAX_IMPACT.preTaxBudget)}</span>
            </div>
            <div class="flex-between" style="padding:8px 12px;background:rgba(239,68,68,.06);border-radius:var(--radius-sm)">
              <span style="color:var(--color-danger)">VAT (7%)</span>
              <span style="font-weight:700;color:var(--color-danger)">- ${formatBaht(TAX_IMPACT.vatAmount)}</span>
            </div>
            <div class="flex-between" style="padding:8px 12px;background:rgba(234,179,8,.06);border-radius:var(--radius-sm)">
              <span style="color:var(--color-warning)">WHT (3%)</span>
              <span style="font-weight:700;color:var(--color-warning)">- ${formatBaht(TAX_IMPACT.withholdingAmount)}</span>
            </div>
            <hr style="border:none;border-top:1px solid var(--border-default)">
            <div class="flex-between">
              <span style="font-weight:700">${t('marketing.effectiveBudget')}</span>
              <span style="font-weight:800;font-size:1.1rem;color:var(--color-success)">${formatBaht(TAX_IMPACT.effectiveBudget)}</span>
            </div>
          </div>
        </div>
        <div class="card">
          <div class="card-header">
            <span class="card-title">${t('marketing.ratioChart')}</span>
          </div>
          <div id="mkt-ratio-line" class="chart-container"></div>
        </div>
      </div>

      <!-- Strategy Table -->
      <div class="card">
        <div class="card-header">
          <span class="card-title">${t('marketing.strategyTable')}</span>
        </div>
        <div id="mkt-strategy-table"></div>
      </div>
    </div>
  `;

  if (typeof lucide !== 'undefined') lucide.createIcons();

  // ── Quarterly Bar ──
  createChart('mkt-quarterly-bar', {
    chart: { type: 'bar', height: 320 },
    series: [{ name: t('th.budget'), data: [...QUARTERLY_BUDGET] }],
    xaxis: { categories: [...QUARTERS] },
    plotOptions: {
      bar: { borderRadius: 6, columnWidth: '50%', distributed: true },
    },
    colors: ['#3b82f6', '#22c55e', '#f97316', '#a855f7'],
    yaxis: { labels: { formatter: v => `฿${(v/1000000).toFixed(1)}M`, style: { colors: '#94a3b8' } } },
    legend: { show: false },
  });

  // ── Channel Donut ──
  createChart('mkt-channel-donut', {
    chart: { type: 'donut', height: 320 },
    series: allocEntries.map(a => a.pct),
    labels: allocEntries.map(a => a.label),
    colors: allocEntries.map(a => a.color),
    plotOptions: {
      pie: {
        donut: {
          size: '60%',
          labels: {
            show: true,
            total: {
              show: true,
              label: 'Total',
              color: '#94a3b8',
              formatter: () => '100%',
            },
          },
        },
      },
    },
    legend: { position: 'bottom' },
  });

  // ── Ratio Line ──
  createChart('mkt-ratio-line', {
    chart: { type: 'area', height: 260 },
    series: [{ name: t('chart.marketingRevenuePct'), data: mktRevRatio.map(v => parseFloat(v.toFixed(2))) }],
    xaxis: { categories: months },
    colors: ['#f97316'],
    fill: {
      type: 'gradient',
      gradient: { opacityFrom: 0.4, opacityTo: 0.05 },
    },
    yaxis: { labels: { formatter: v => `${v}%`, style: { colors: '#94a3b8' } } },
    tooltip: { y: { formatter: v => `${v.toFixed(2)}%` } },
  });

  // ── Strategy Table ──
  const tableEl = document.getElementById('mkt-strategy-table');
  tableEl.innerHTML = DataTable({
    headers: [t('th.quarter'), t('th.focus'), t('th.strategy'), t('th.channels'), t('th.budget')],
    rows: QUARTERLY_STRATEGY.map(s => [
      s.quarter,
      localized(s, 'focus'),
      localized(s, 'description'),
      s.channels.join(', '),
      formatBaht(s.budget),
    ]),
    alignments: ['center', 'left', 'left', 'center', 'right'],
  });

  return () => destroyAllCharts();
}
