// ============================================
// EasySlip 2026 — Page 7: KPI Scorecard
// ============================================

import { REVENUE, getChannelShare } from '../data/revenue.js';
import { ANNUAL_TOTAL_COST, EXPENSES } from '../data/expenses.js';
import { getReserveMonths } from '../data/cash-flow.js';
import { getBreakEvenPoint, getGrossMargin } from '../data/unit-economics.js';
import { RISK_ITEMS, AUDIT_CHECKLIST, getRiskScore } from '../data/risk-audit.js';
import { KPICard } from '../components/cards.js';
import { createChart, destroyAllCharts } from '../components/charts.js';
import { setPageTitle, formatPercent } from '../utils.js';
import { t, getMonths, localized } from '../i18n.js';

export function render(container) {
  setPageTitle(t('page.kpi.title'));

  const months = getMonths();
  const totalRev = REVENUE.annualTotal;
  const totalCost = ANNUAL_TOTAL_COST;
  const margin = ((totalRev - totalCost) / totalRev) * 100;
  const costRevRatio = (totalCost / totalRev) * 100;
  const personnelCost = EXPENSES.salary?.reduce((a, b) => a + b, 0) ?? 0;
  const personnelRatio = (personnelCost / totalRev) * 100;
  const reserveMonths = getReserveMonths();
  const share = getChannelShare();
  const breakEven = getBreakEvenPoint();
  const avgSafetyMargin = breakEven.safetyMargin.reduce((a, b) => a + b, 0) / 12;
  const riskScore = getRiskScore();
  const grossMargins = getGrossMargin();

  // Calculate MoM revenue growth average
  let growthSum = 0, growthCount = 0;
  for (let i = 1; i < 12; i++) {
    if (REVENUE.total[i-1] > 0) {
      growthSum += ((REVENUE.total[i] - REVENUE.total[i-1]) / REVENUE.total[i-1]) * 100;
      growthCount++;
    }
  }
  const avgMoMGrowth = growthCount > 0 ? growthSum / growthCount : 0;

  const kpis = [
    { title: t('kpi.profitMargin'), value: margin.toFixed(1), target: '35', unit: '%', status: margin >= 35 ? 'good' : margin >= 25 ? 'warning' : 'danger', description: `${t('kpi.targetGe35')} — ${t('kpi.current')} ${margin.toFixed(1)}%` },
    { title: t('kpi.costRevenueRatio'), value: costRevRatio.toFixed(1), target: '65', unit: '%', status: costRevRatio <= 65 ? 'good' : costRevRatio <= 75 ? 'warning' : 'danger', description: `${t('kpi.targetLt65')} — ${t('kpi.current')} ${costRevRatio.toFixed(1)}%`, lowerIsBetter: true },
    { title: t('kpi.personnelRevenue'), value: personnelRatio.toFixed(2), target: '10', unit: '%', status: personnelRatio <= 10 ? 'good' : personnelRatio <= 15 ? 'warning' : 'danger', description: `${t('kpi.targetLt10')} — ${t('kpi.current')} ${personnelRatio.toFixed(2)}%`, lowerIsBetter: true },
    { title: t('kpi.revenueGrowth'), value: avgMoMGrowth.toFixed(1), target: '3', unit: '%', status: avgMoMGrowth >= 3 ? 'good' : avgMoMGrowth >= 1 ? 'warning' : 'danger', description: t('kpi.avgMoMGrowth') },
    { title: t('kpi.breakEvenSafety'), value: avgSafetyMargin.toFixed(1), target: '50', unit: '%', status: avgSafetyMargin >= 50 ? 'good' : avgSafetyMargin >= 30 ? 'warning' : 'danger', description: t('kpi.distFromBE') },
    { title: t('kpi.cashReserve'), value: reserveMonths.toFixed(1), target: '6', unit: ' mo', status: reserveMonths >= 3 ? 'good' : reserveMonths >= 2 ? 'warning' : 'danger', description: t('kpi.target36months') },
    { title: t('kpi.revenueDiversification'), value: (100 - share.api).toFixed(1), target: '20', unit: '%', status: (100 - share.api) >= 20 ? 'good' : (100 - share.api) >= 10 ? 'warning' : 'danger', description: `API ${share.api.toFixed(1)}% — ${t('kpi.apiNeedDiversify')}` },
  ];

  // Overall health score
  const healthScore = Math.round(
    kpis.filter(k => k.status === 'good').length / kpis.length * 100
  );

  container.innerHTML = `
    <div class="fade-in">
      <!-- Overall Health -->
      <div class="grid grid-3" style="margin-bottom:24px">
        <div class="card" style="grid-column:span 1;text-align:center">
          <div class="card-title" style="margin-bottom:16px">${t('kpi.overallHealth')}</div>
          <div id="health-gauge"></div>
        </div>
        <div class="card" style="grid-column:span 2">
          <div class="card-title" style="margin-bottom:16px">${t('kpi.marginTrend')}</div>
          <div id="margin-trend-chart" class="chart-container"></div>
        </div>
      </div>

      <!-- KPI Gauges -->
      <h3 class="section-title">${t('kpi.gauges')}</h3>
      <div class="grid grid-4 stagger" style="margin-bottom:24px">
        ${kpis.map(k => KPICard(k)).join('')}
      </div>

      <!-- Risk & Audit -->
      <div class="grid grid-2">
        <!-- Risk Register -->
        <div class="card">
          <div class="card-header">
            <span class="card-title">${t('kpi.riskRegister')}</span>
            <span class="badge ${riskScore >= 60 ? 'badge-success' : 'badge-warning'}">Score: ${riskScore}/100</span>
          </div>
          <div style="display:flex;flex-direction:column;gap:10px">
            ${RISK_ITEMS.map(r => `
              <div style="padding:10px;background:var(--bg-base);border-radius:var(--radius-sm);border-left:3px solid ${r.severity === 'HIGH' ? 'var(--color-danger)' : r.severity === 'MEDIUM' ? 'var(--color-warning)' : 'var(--color-info)'}">
                <div class="flex-between" style="margin-bottom:4px">
                  <span style="font-size:.75rem;font-weight:700">${r.id}: ${r.category}</span>
                  <span class="badge badge-${r.severity === 'HIGH' ? 'danger' : r.severity === 'MEDIUM' ? 'warning' : 'info'}" style="font-size:.6rem">${r.severity}</span>
                </div>
                <div style="font-size:.75rem;color:var(--text-secondary)">${localized(r, 'description')}</div>
                <div style="font-size:.7rem;color:var(--text-muted);margin-top:4px">↳ ${localized(r, 'mitigation')}</div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Audit Checklist -->
        <div class="card">
          <div class="card-header">
            <span class="card-title">${t('kpi.auditChecklist')}</span>
          </div>
          <div style="display:flex;flex-direction:column;gap:6px">
            ${AUDIT_CHECKLIST.map(a => `
              <div style="display:flex;align-items:center;gap:10px;padding:8px 10px;background:var(--bg-base);border-radius:var(--radius-sm)">
                <span style="color:${a.status === 'active' ? 'var(--color-success)' : 'var(--color-warning)'};font-size:1rem">
                  ${a.status === 'active' ? '✓' : '○'}
                </span>
                <div style="flex:1">
                  <div style="font-size:.8rem">${localized(a, 'item')}</div>
                  <div style="font-size:.65rem;color:var(--text-muted)">${a.frequency}</div>
                </div>
                <span class="badge ${a.status === 'active' ? 'badge-success' : 'badge-warning'}" style="font-size:.6rem">${a.status}</span>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    </div>
  `;

  if (typeof lucide !== 'undefined') lucide.createIcons();

  // ── Health Gauge ──
  createChart('health-gauge', {
    chart: { type: 'radialBar', height: 280 },
    series: [healthScore],
    plotOptions: {
      radialBar: {
        startAngle: -135,
        endAngle: 135,
        hollow: { size: '55%' },
        dataLabels: {
          name: { show: true, color: '#94a3b8', fontSize: '12px', offsetY: -10 },
          value: {
            show: true, color: '#f1f5f9', fontSize: '28px', fontWeight: 800,
            formatter: () => `${healthScore}%`,
          },
        },
        track: { background: 'rgba(148,163,184,.1)' },
      },
    },
    labels: [t('chart.health')],
    colors: [healthScore >= 70 ? '#22c55e' : healthScore >= 50 ? '#eab308' : '#ef4444'],
  });

  // ── Margin Trend ──
  createChart('margin-trend-chart', {
    chart: { type: 'area', height: 250 },
    series: [{ name: t('chart.grossMargin'), data: grossMargins.map(v => parseFloat(v.toFixed(1))) }],
    xaxis: { categories: months },
    colors: ['#6366f1'],
    fill: {
      type: 'gradient',
      gradient: { opacityFrom: 0.5, opacityTo: 0.05 },
    },
    yaxis: { labels: { formatter: v => `${v}%`, style: { colors: '#94a3b8' } }, min: 0, max: 100 },
    annotations: {
      yaxis: [{
        y: 35,
        borderColor: '#22c55e',
        label: { text: t('chart.target35'), style: { color: '#22c55e', background: 'transparent' } },
      }],
    },
  });

  return () => destroyAllCharts();
}
