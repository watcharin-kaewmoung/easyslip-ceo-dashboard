// ============================================
// EasySlip 2026 — Page 5: Cash Flow
// ============================================

import {
  OPENING_BALANCE,
  calculateInflows, calculateOutflows, calculateNetCashFlow, calculateCumulativeBalance,
  TAX_HEAVY_MONTHS, getReserveMonths, getClosingBalance
} from '../data/cash-flow.js';
import { MetricCard } from '../components/cards.js';
import { createChart, destroyAllCharts } from '../components/charts.js';
import { DataTable } from '../components/tables.js';
import { setPageTitle, formatBaht, formatBahtCompact, formatPercent } from '../utils.js';
import { t, getMonths, localized } from '../i18n.js';

export function render(container) {
  setPageTitle(t('page.cashflow.title'));

  const months = getMonths();
  const closing = getClosingBalance();
  const reserveMonths = getReserveMonths();

  // Compute live data (reflects user edits to revenue/expenses)
  const INFLOWS = calculateInflows();
  const OUTFLOWS = calculateOutflows();
  const NET_FLOW = calculateNetCashFlow();
  const BALANCE = calculateCumulativeBalance();
  const totalNetFlow = NET_FLOW.reduce((a, b) => a + b, 0);

  container.innerHTML = `
    <div class="fade-in">
      <!-- KPI Cards -->
      <div class="grid grid-4 stagger" style="margin-bottom:24px">
        ${MetricCard({ title: t('cashflow.openingBalance'), value: formatBahtCompact(OPENING_BALANCE), icon: 'landmark', iconBg: '#3b82f6', subtitle: t('cashflow.startYear') })}
        ${MetricCard({ title: t('cashflow.closingBalance'), value: formatBahtCompact(closing), icon: 'wallet', iconBg: '#22c55e', subtitle: t('cashflow.endYear') })}
        ${MetricCard({ title: t('cashflow.netCashFlow'), value: formatBahtCompact(totalNetFlow), icon: 'arrow-up-down', iconBg: '#6366f1', change: t('cashflow.positive'), direction: 'up' })}
        ${MetricCard({ title: t('cashflow.reserveMonths'), value: `${reserveMonths.toFixed(1)}`, icon: 'shield-check', iconBg: reserveMonths >= 3 ? '#22c55e' : '#eab308', subtitle: t('cashflow.targetMonths') })}
      </div>

      <!-- Charts -->
      <div class="grid grid-2" style="margin-bottom:24px">
        <div class="card">
          <div class="card-header">
            <span class="card-title">${t('cashflow.monthlyInOut')}</span>
          </div>
          <div id="cf-inout-bar" class="chart-container"></div>
        </div>
        <div class="card">
          <div class="card-header">
            <span class="card-title">${t('cashflow.cumulativeBalance')}</span>
          </div>
          <div id="cf-balance-line" class="chart-container"></div>
        </div>
      </div>

      <!-- Tax Calendar & Reserve Gauge -->
      <div class="grid grid-2" style="margin-bottom:24px">
        <div class="card">
          <div class="card-header">
            <span class="card-title">${t('cashflow.taxHeavyMonths')}</span>
          </div>
          <div style="display:flex;flex-direction:column;gap:12px">
            ${TAX_HEAVY_MONTHS.map(tx => `
              <div style="display:flex;align-items:center;gap:12px;padding:12px;background:var(--bg-base);border-radius:var(--radius-md);border-left:4px solid var(--color-danger)">
                <div>
                  <div style="font-weight:700;font-size:.9rem">${localized(tx, 'label')}</div>
                  <div style="font-size:.7rem;color:var(--text-muted)">${localized(tx, 'description')}</div>
                </div>
                <div style="margin-left:auto;font-weight:800;color:var(--color-danger)">${formatBaht(tx.amount)}</div>
              </div>
            `).join('')}
            <div style="padding:10px;background:rgba(239,68,68,.08);border-radius:var(--radius-md);font-size:.8rem;color:var(--text-secondary)">
              <strong>${t('cashflow.totalHeavyTax')}:</strong> ${formatBaht(TAX_HEAVY_MONTHS.reduce((s, tx) => s + tx.amount, 0))}
            </div>
          </div>
        </div>
        <div class="card">
          <div class="card-header">
            <span class="card-title">${t('cashflow.reserveHealth')}</span>
          </div>
          <div id="cf-reserve-gauge" style="display:flex;justify-content:center"></div>
          <div style="text-align:center;margin-top:16px">
            <div style="font-size:.8rem;color:var(--text-secondary)">
              ${reserveMonths >= 6 ? t('cashflow.excellent') :
                reserveMonths >= 3 ? t('cashflow.good') :
                t('cashflow.belowTarget')}
            </div>
          </div>
        </div>
      </div>

      <!-- Cash Flow Table -->
      <div class="card">
        <div class="card-header">
          <span class="card-title">${t('cashflow.monthlyDetails')}</span>
        </div>
        <div id="cf-table"></div>
      </div>
    </div>
  `;

  if (typeof lucide !== 'undefined') lucide.createIcons();

  // ── Inflow vs Outflow Bar ──
  createChart('cf-inout-bar', {
    chart: { type: 'bar', height: 340 },
    series: [
      { name: t('chart.inflow'), data: [...INFLOWS] },
      { name: t('chart.outflow'), data: OUTFLOWS.map(v => -v) },
    ],
    xaxis: { categories: months },
    colors: ['#22c55e', '#ef4444'],
    plotOptions: { bar: { borderRadius: 4, columnWidth: '55%' } },
    yaxis: { labels: { formatter: v => `฿${(Math.abs(v)/1000000).toFixed(1)}M`, style: { colors: '#94a3b8' } } },
    tooltip: { y: { formatter: v => formatBaht(Math.abs(v)) } },
  });

  // ── Cumulative Balance Line ──
  createChart('cf-balance-line', {
    chart: { type: 'area', height: 340 },
    series: [{ name: t('chart.cashBalance'), data: [...BALANCE] }],
    xaxis: { categories: months },
    colors: ['#6366f1'],
    fill: {
      type: 'gradient',
      gradient: { opacityFrom: 0.5, opacityTo: 0.05 },
    },
    yaxis: { labels: { formatter: v => `฿${(v/1000000).toFixed(1)}M`, style: { colors: '#94a3b8' } } },
    annotations: {
      yaxis: [{
        y: OPENING_BALANCE,
        borderColor: '#eab308',
        label: { text: t('chart.openingBalance'), style: { color: '#eab308', background: 'transparent' } },
      }],
    },
  });

  // ── Reserve Gauge ──
  const gaugeValue = Math.min((reserveMonths / 6) * 100, 100);
  createChart('cf-reserve-gauge', {
    chart: { type: 'radialBar', height: 250 },
    series: [Math.round(gaugeValue)],
    plotOptions: {
      radialBar: {
        startAngle: -135,
        endAngle: 135,
        hollow: { size: '60%' },
        dataLabels: {
          name: { show: true, color: '#94a3b8', fontSize: '12px', offsetY: -10 },
          value: {
            show: true,
            color: '#f1f5f9',
            fontSize: '24px',
            fontWeight: 700,
            formatter: () => `${reserveMonths.toFixed(1)} mo`,
          },
        },
        track: { background: 'rgba(148,163,184,.1)' },
      },
    },
    labels: [t('chart.reserve')],
    colors: [reserveMonths >= 3 ? '#22c55e' : '#eab308'],
  });

  // ── Table ──
  const tableEl = document.getElementById('cf-table');
  const rows = months.map((m, i) => [
    m,
    formatBaht(INFLOWS[i]),
    formatBaht(OUTFLOWS[i]),
    formatBaht(NET_FLOW[i]),
    formatBaht(BALANCE[i]),
  ]);
  tableEl.innerHTML = DataTable({
    headers: [t('th.month'), t('th.inflow'), t('th.outflow'), t('th.netFlow'), t('th.balance')],
    rows,
    alignments: ['left', 'right', 'right', 'right', 'right'],
  });

  return () => destroyAllCharts();
}
