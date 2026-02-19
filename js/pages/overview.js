// ============================================
// EasySlip 2026 — Page 1: Executive Overview
// ============================================

import { REVENUE, getChannelShare } from '../data/revenue.js';
import { TOTAL_MONTHLY_COST, ANNUAL_TOTAL_COST, ANOMALIES } from '../data/expenses.js';
import { MONTHS_TH } from '../data/constants.js';
import { MetricCard, AlertCard } from '../components/cards.js';
import { createChart, destroyAllCharts } from '../components/charts.js';
import { setPageTitle, formatBaht, formatBahtCompact, formatPercent, sum } from '../utils.js';
import { BUDGET, getActual, getActualRevenueTotal } from '../data/budget-actual.js';
import { t, getMonths, localized } from '../i18n.js';

export function render(container) {
  setPageTitle(t('page.overview.title'));

  const totalRevenue = REVENUE.annualTotal;
  const totalCost = ANNUAL_TOTAL_COST;
  const netProfit = totalRevenue - totalCost;
  const margin = (netProfit / totalRevenue) * 100;

  const share = getChannelShare();
  const months = getMonths();

  // Budget achievement
  const actual = getActual();
  const actualRevTotal = sum(getActualRevenueTotal(actual));
  const actualCostTotal = sum(TOTAL_MONTHLY_COST);
  const actualProfitTotal = actualRevTotal - actualCostTotal;
  const revAchievement = BUDGET.annualRevenue > 0 ? (actualRevTotal / BUDGET.annualRevenue) * 100 : 0;
  const costAchievement = BUDGET.annualCost > 0 ? (actualCostTotal / BUDGET.annualCost) * 100 : 0;

  container.innerHTML = `
    <div class="fade-in">
      <!-- KPI Cards -->
      <div class="grid grid-4 stagger" style="margin-bottom:24px">
        ${MetricCard({
          title: t('overview.totalRevenue'),
          value: formatBahtCompact(totalRevenue),
          icon: 'trending-up',
          iconBg: 'var(--color-success)',
          subtitle: t('overview.projected'),
        })}
        ${MetricCard({
          title: t('overview.totalCost'),
          value: formatBahtCompact(totalCost),
          icon: 'receipt',
          iconBg: 'var(--color-danger)',
          subtitle: `${formatPercent(totalCost/totalRevenue*100)} ${t('overview.ofRevenue')}`,
        })}
        ${MetricCard({
          title: t('overview.netProfit'),
          value: formatBahtCompact(netProfit),
          icon: 'wallet',
          iconBg: 'var(--color-accent)',
          change: formatPercent(margin),
          direction: 'up',
          subtitle: t('overview.netMargin'),
        })}
        ${MetricCard({
          title: t('overview.profitMargin'),
          value: formatPercent(margin),
          icon: 'target',
          iconBg: 'var(--color-warning)',
          subtitle: t('overview.target35'),
          change: t('overview.aboveTarget'),
          direction: 'up',
        })}
      </div>

      <!-- Budget Achievement -->
      <div class="grid grid-3 stagger" style="margin-bottom:24px">
        <div class="card card-sm">
          <div class="flex-between" style="margin-bottom:8px">
            <span class="card-title">${t('budget.revenueAchievement')}</span>
            <span style="font-size:.85rem;font-weight:700">${formatPercent(revAchievement)}</span>
          </div>
          <div class="progress-bar" style="height:10px;margin-bottom:8px">
            <div class="progress-fill success" style="width:${Math.min(revAchievement, 100)}%"></div>
          </div>
          <div style="font-size:.7rem;color:var(--text-muted)">${formatBahtCompact(actualRevTotal)} / ${formatBahtCompact(BUDGET.annualRevenue)}</div>
        </div>
        <div class="card card-sm">
          <div class="flex-between" style="margin-bottom:8px">
            <span class="card-title">${t('budget.costAchievement')}</span>
            <span style="font-size:.85rem;font-weight:700">${formatPercent(costAchievement)}</span>
          </div>
          <div class="progress-bar" style="height:10px;margin-bottom:8px">
            <div class="progress-fill ${costAchievement > 100 ? 'danger' : ''}" style="width:${Math.min(costAchievement, 100)}%"></div>
          </div>
          <div style="font-size:.7rem;color:var(--text-muted)">${formatBahtCompact(actualCostTotal)} / ${formatBahtCompact(BUDGET.annualCost)}</div>
        </div>
        <div class="card card-sm">
          <div class="flex-between" style="margin-bottom:8px">
            <span class="card-title">${t('budget.profitAchievement')}</span>
            <span style="font-size:.85rem;font-weight:700">${formatBahtCompact(actualProfitTotal)}</span>
          </div>
          <div class="progress-bar" style="height:10px;margin-bottom:8px">
            <div class="progress-fill ${actualProfitTotal >= BUDGET.annualProfit ? 'success' : 'danger'}" style="width:${BUDGET.annualProfit > 0 ? Math.min(Math.max(actualProfitTotal / BUDGET.annualProfit * 100, 0), 100) : 0}%"></div>
          </div>
          <div style="font-size:.7rem;color:var(--text-muted)">${t('th.budget')}: ${formatBahtCompact(BUDGET.annualProfit)}</div>
        </div>
      </div>

      <!-- Charts Row -->
      <div class="grid grid-2-1" style="margin-bottom:24px">
        <div class="card">
          <div class="card-header">
            <span class="card-title">${t('overview.revenueTrend')}</span>
          </div>
          <div id="overview-revenue-chart" class="chart-container"></div>
        </div>
        <div class="card">
          <div class="card-header">
            <span class="card-title">${t('overview.expenseBreakdown')}</span>
          </div>
          <div id="overview-expense-donut" class="chart-container"></div>
        </div>
      </div>

      <!-- Channel Cards -->
      <h3 class="section-title">${t('overview.revenueByChannel')}</h3>
      <div class="grid grid-4 stagger" style="margin-bottom:24px">
        ${channelCard('LINE BOT', REVENUE.annualBot, share.bot, '#3b82f6', 'bot', REVENUE.bot)}
        ${channelCard('API', REVENUE.annualApi, share.api, '#22c55e', 'code-2', REVENUE.api)}
        ${channelCard('CRM', REVENUE.annualCrm, share.crm, '#f97316', 'users', REVENUE.crm)}
        ${channelCard('SMS', REVENUE.annualSms, share.sms, '#a855f7', 'message-square', REVENUE.sms)}
      </div>

      <!-- Alerts -->
      <h3 class="section-title">${t('overview.anomalyAlerts')}</h3>
      <div class="grid grid-2 stagger">
        ${ANOMALIES.filter(a => a.severity === 'HIGH').slice(0, 4).map(a =>
          AlertCard({
            severity: a.severity,
            description: localized(a, 'description'),
            action: localized(a, 'action'),
            month: months[a.month],
          })
        ).join('')}
      </div>
    </div>
  `;

  // Initialize icons
  if (typeof lucide !== 'undefined') lucide.createIcons();

  // ── Revenue Trend Chart ──
  createChart('overview-revenue-chart', {
    chart: { type: 'area', height: 320, stacked: true },
    series: [
      { name: 'BOT', data: [...REVENUE.bot] },
      { name: 'API', data: [...REVENUE.api] },
      { name: 'CRM', data: [...REVENUE.crm] },
      { name: 'SMS', data: [...REVENUE.sms] },
    ],
    xaxis: { categories: months },
    colors: ['#3b82f6', '#22c55e', '#f97316', '#a855f7'],
    fill: {
      type: 'gradient',
      gradient: { opacityFrom: 0.6, opacityTo: 0.1 },
    },
    yaxis: {
      labels: {
        formatter: (v) => `฿${(v/1000000).toFixed(1)}M`,
        style: { colors: '#94a3b8' },
      },
    },
  });

  // ── Expense Donut ──
  const expCats = [
    { label: t('donut.system'), val: 16858948 },
    { label: t('donut.salary'), val: 1800000 },
    { label: t('donut.marketing'), val: 5000000 },
    { label: t('donut.tax'), val: 3177000 },
    { label: t('donut.reserve'), val: 1402409 },
    { label: t('donut.other'), val: 711000 },
  ];
  createChart('overview-expense-donut', {
    chart: { type: 'donut', height: 320 },
    series: expCats.map(c => c.val),
    labels: expCats.map(c => c.label),
    colors: ['#ef4444', '#f97316', '#3b82f6', '#ec4899', '#64748b', '#94a3b8'],
    plotOptions: {
      pie: {
        donut: {
          size: '60%',
          labels: {
            show: true,
            total: {
              show: true,
              label: t('overview.totalCostLabel'),
              color: '#94a3b8',
              formatter: () => formatBahtCompact(totalCost),
            },
          },
        },
      },
    },
    legend: { position: 'bottom' },
  });

  // Cleanup
  return () => destroyAllCharts();
}

function channelCard(name, annual, share, color, icon, monthly) {
  const lastMonth = monthly[11];
  const prevMonth = monthly[10];
  const growth = prevMonth > 0 ? ((lastMonth - prevMonth) / prevMonth * 100) : 0;
  const dir = growth > 0 ? 'up' : growth < 0 ? 'down' : 'neutral';

  // Simple sparkline using CSS
  const max = Math.max(...monthly.filter(v => v > 0));
  const sparkBars = monthly.map(v =>
    `<div style="width:6px;background:${color};opacity:0.7;border-radius:2px;height:${max > 0 ? Math.max(v/max*30, 2) : 2}px"></div>`
  ).join('');

  return `
    <div class="card card-sm" style="border-top:3px solid ${color}">
      <div class="flex-between" style="margin-bottom:8px">
        <span style="font-size:.75rem;font-weight:600;color:${color}">${name}</span>
        <i data-lucide="${icon}" style="width:16px;height:16px;color:${color}"></i>
      </div>
      <div style="font-size:1.25rem;font-weight:800">${formatBahtCompact(annual)}</div>
      <div style="font-size:.7rem;color:var(--text-muted);margin-bottom:8px">
        ${formatPercent(share)} ${t('overview.ofTotal')}
      </div>
      <div style="display:flex;align-items:flex-end;gap:2px;height:32px;margin-bottom:8px">
        ${sparkBars}
      </div>
      <span class="metric-change ${dir}" style="font-size:.65rem">
        ${dir === 'up' ? '↑' : dir === 'down' ? '↓' : '→'} ${t('misc.mom')} ${growth.toFixed(1)}%
      </span>
    </div>
  `;
}
