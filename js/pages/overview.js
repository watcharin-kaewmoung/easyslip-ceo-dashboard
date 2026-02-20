// ============================================
// EasySlip 2026 — Page 1: Executive Overview
// ============================================

import { REVENUE, getChannelShare } from '../data/revenue.js';
import { EXPENSES, TOTAL_MONTHLY_COST, ANNUAL_TOTAL_COST, ANOMALIES } from '../data/expenses.js';
import { EXPENSE_CATEGORIES } from '../data/constants.js';
import { MetricCard, AlertCard } from '../components/cards.js';
import { createChart, destroyAllCharts } from '../components/charts.js';
import { setPageTitle, formatBaht, formatBahtCompact, formatPercent, formatNumber, sum } from '../utils.js';
import { BUDGET, getActual, getActualRevenueTotal } from '../data/budget-actual.js';
import { t, getMonths, localized, getLang } from '../i18n.js';
import { SALES } from '../data/sales.js';
import { CUSTOMERS } from '../data/customers.js';
import { PRODUCT } from '../data/product.js';
import { HR } from '../data/hr.js';
import { OKR } from '../data/okr.js';
import { API_DATA, hasData as hasApiData, getGrandTotal, getProductStats } from '../data/api-analytics.js';

export function render(container) {
  setPageTitle(t('page.overview.title'));

  const totalRevenue = REVENUE.annualTotal;
  const totalCost = ANNUAL_TOTAL_COST;
  const netProfit = totalRevenue - totalCost;
  const margin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

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
          subtitle: `${formatPercent(totalRevenue > 0 ? totalCost/totalRevenue*100 : 0)} ${t('overview.ofRevenue')}`,
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
          change: margin >= 35 ? t('overview.aboveTarget') : (totalRevenue > 0 ? t('overview.belowTarget') : '—'),
          direction: margin >= 35 ? 'up' : 'down',
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
      <div class="grid grid-2 stagger" style="margin-bottom:32px">
        ${ANOMALIES.filter(a => a.severity === 'HIGH').slice(0, 4).map(a =>
          AlertCard({
            severity: a.severity,
            description: localized(a, 'description'),
            action: localized(a, 'action'),
            month: months[a.month],
          })
        ).join('')}
      </div>

      <!-- ═══ Business Section ═══ -->
      <div class="overview-section-header" style="display:flex;align-items:center;gap:8px;margin-bottom:16px">
        <div style="width:4px;height:20px;border-radius:2px;background:var(--color-success)"></div>
        <h3 class="section-title" style="margin:0">${t('overview.businessSection')}</h3>
      </div>
      <div class="grid grid-4 stagger" style="margin-bottom:16px">
        ${MetricCard({
          title: t('sales.totalRevenue'),
          value: formatBahtCompact(SALES.annualRevenue),
          icon: 'handshake',
          iconBg: '#22c55e',
          subtitle: `${t('sales.conversionRate')}: ${formatPercent(SALES.conversionRate)}`,
        })}
        ${MetricCard({
          title: 'MRR',
          value: formatBahtCompact(CUSTOMERS.mrr[11] || 0),
          icon: 'repeat',
          iconBg: '#3b82f6',
          subtitle: `ARR: ${formatBahtCompact(CUSTOMERS.arr)}`,
        })}
        ${MetricCard({
          title: t('customers.churnRate'),
          value: formatPercent(CUSTOMERS.churnRate[11] || CUSTOMERS.avgChurn),
          icon: 'user-minus',
          iconBg: (CUSTOMERS.churnRate[11] || CUSTOMERS.avgChurn) < 3 ? '#22c55e' : '#ef4444',
          subtitle: `${t('customers.totalCustomers')}: ${formatNumber(CUSTOMERS.totalByMonth[11] || 0)}`,
        })}
        ${MetricCard({
          title: 'LTV / CAC',
          value: CUSTOMERS.ltvCacRatio.toFixed(1) + 'x',
          icon: 'scale',
          iconBg: CUSTOMERS.ltvCacRatio >= 3 ? '#22c55e' : '#eab308',
          subtitle: `LTV ${formatBahtCompact(CUSTOMERS.ltv)}`,
        })}
      </div>
      <div class="grid grid-2 stagger" style="margin-bottom:32px">
        <div class="card">
          <div class="card-header"><span class="card-title">${t('overview.salesVsTarget')}</span></div>
          <div id="overview-sales-chart" class="chart-container"></div>
        </div>
        <div class="card">
          <div class="card-header"><span class="card-title">${t('overview.mrrGrowth')}</span></div>
          <div id="overview-mrr-chart" class="chart-container"></div>
        </div>
      </div>

      <!-- ═══ Product Section ═══ -->
      <div class="overview-section-header" style="display:flex;align-items:center;gap:8px;margin-bottom:16px">
        <div style="width:4px;height:20px;border-radius:2px;background:var(--color-accent)"></div>
        <h3 class="section-title" style="margin:0">${t('overview.productSection')}</h3>
      </div>
      ${renderProductSection()}
      <div class="grid grid-2 stagger" style="margin-bottom:32px">
        <div class="card">
          <div class="card-header"><span class="card-title">${t('overview.apiUsageTrend')}</span></div>
          <div id="overview-api-chart" class="chart-container"></div>
        </div>
        <div class="card">
          <div class="card-header"><span class="card-title">${t('overview.usersTrend')}</span></div>
          <div id="overview-users-chart" class="chart-container"></div>
        </div>
      </div>

      <!-- ═══ Organization Section ═══ -->
      <div class="overview-section-header" style="display:flex;align-items:center;gap:8px;margin-bottom:16px">
        <div style="width:4px;height:20px;border-radius:2px;background:var(--color-warning)"></div>
        <h3 class="section-title" style="margin:0">${t('overview.orgSection')}</h3>
      </div>
      <div class="grid grid-4 stagger" style="margin-bottom:16px">
        ${MetricCard({
          title: t('hr.headcount'),
          value: formatNumber(HR.totalHeadcount),
          icon: 'building-2',
          iconBg: '#3b82f6',
          subtitle: `${t('hr.avgSalary')}: ${formatBahtCompact(HR.avgSalary)}`,
        })}
        ${MetricCard({
          title: t('okr.overallProgress'),
          value: OKR.overallProgress + '%',
          icon: 'target',
          iconBg: OKR.overallProgress >= 70 ? '#22c55e' : '#eab308',
          subtitle: `${OKR.companyOKRs.length} Objectives`,
        })}
        ${MetricCard({
          title: t('hr.turnoverRate'),
          value: formatPercent(HR.turnoverRate),
          icon: 'user-minus',
          iconBg: HR.turnoverRate <= 5 ? '#22c55e' : '#ef4444',
          subtitle: `${HR.totalActualHires}/${HR.totalPlannedHires} ${t('hr.hiringPlan')}`,
        })}
        ${MetricCard({
          title: t('hr.annualPayroll'),
          value: formatBahtCompact(HR.annualTotalCost),
          icon: 'wallet',
          iconBg: '#a855f7',
          subtitle: `${t('hr.trainingBudget')}: ${formatBahtCompact(HR.annualTrainingBudget)}`,
        })}
      </div>
      <div class="grid grid-2 stagger" style="margin-bottom:24px">
        <div class="card">
          <div class="card-header"><span class="card-title">${t('overview.okrProgress')}</span></div>
          <div id="overview-okr-chart" class="chart-container"></div>
        </div>
        <div class="card">
          <div class="card-header"><span class="card-title">${t('overview.headcountTrend')}</span></div>
          <div id="overview-headcount-chart" class="chart-container"></div>
        </div>
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

  // ── Expense Donut (dynamic from EXPENSES) ──
  const expCats = EXPENSE_CATEGORIES.map(cat => ({
    label: localized(cat, 'label'),
    val: EXPENSES[cat.key]?.reduce((a, b) => a + b, 0) || 0,
    color: cat.color,
  })).filter(c => c.val > 0);
  const donutData = expCats.length > 0 ? expCats : [{ label: t('overview.noData'), val: 1, color: '#475569' }];
  createChart('overview-expense-donut', {
    chart: { type: 'donut', height: 320 },
    series: donutData.map(c => c.val),
    labels: donutData.map(c => c.label),
    colors: donutData.map(c => c.color),
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

  // ── Business Charts ──
  createChart('overview-sales-chart', {
    chart: { type: 'bar', height: 260 },
    series: [
      { name: t('sales.target'), data: SALES.targets },
      { name: t('sales.actual'), data: SALES.monthlyRevenue },
    ],
    xaxis: { categories: months },
    colors: ['#94a3b8', '#22c55e'],
    plotOptions: { bar: { borderRadius: 4, columnWidth: '55%' } },
  });

  createChart('overview-mrr-chart', {
    chart: { type: 'area', height: 260 },
    series: [{ name: 'MRR', data: CUSTOMERS.mrr }],
    xaxis: { categories: months },
    colors: ['#3b82f6'],
    fill: { type: 'gradient', gradient: { opacityFrom: 0.5, opacityTo: 0.05 } },
  });

  // ── Product Charts (use real data if available) ──
  if (hasApiData()) {
    // Real API data from Google Sheets — show daily trend for latest month
    const mainFeb = API_DATA.main.months[1];
    const mainJan = API_DATA.main.months[0];
    const latestMonth = mainFeb.days.length > 0 ? mainFeb : mainJan;

    createChart('overview-api-chart', {
      chart: { type: 'area', height: 260 },
      series: [
        { name: 'Bank', data: latestMonth.days.map(d => d.bankTotal) },
        { name: 'True Wallet', data: latestMonth.days.map(d => d.tmTotal) },
      ],
      xaxis: { categories: latestMonth.days.map(d => d.day.toString()) },
      colors: ['#3b82f6', '#22c55e'],
      fill: { type: 'gradient', gradient: { opacityFrom: 0.4, opacityTo: 0.05 } },
      stroke: { width: 2, curve: 'smooth' },
      tooltip: { y: { formatter: v => formatNumber(v) } },
      yaxis: {
        labels: { formatter: v => v >= 1000000 ? (v/1000000).toFixed(1) + 'M' : v >= 1000 ? (v/1000).toFixed(0) + 'K' : v.toString() },
      },
    });

    // Cumulative comparison chart
    const janSeries = mainJan.days.length > 0 ? { name: 'Jan', data: mainJan.days.map(d => d.cumulative) } : null;
    const febSeries = mainFeb.days.length > 0 ? { name: 'Feb', data: mainFeb.days.map(d => d.cumulative) } : null;
    const cumulSeries = [janSeries, febSeries].filter(Boolean);
    const maxLen = Math.max(mainJan.days.length, mainFeb.days.length);

    createChart('overview-users-chart', {
      chart: { type: 'line', height: 260 },
      series: cumulSeries,
      xaxis: { categories: Array.from({ length: maxLen }, (_, i) => (i + 1).toString()) },
      colors: ['#3b82f6', '#6366f1'],
      stroke: { width: 2, curve: 'smooth' },
      markers: { size: 2 },
      tooltip: { y: { formatter: v => formatNumber(v) } },
      yaxis: {
        labels: { formatter: v => v >= 1000000 ? (v/1000000).toFixed(1) + 'M' : v >= 1000 ? (v/1000).toFixed(0) + 'K' : v.toString() },
      },
    });
  } else {
    // Fallback: projected product data
    createChart('overview-api-chart', {
      chart: { type: 'area', height: 260 },
      series: [{ name: t('product.apiCalls'), data: PRODUCT.apiCalls }],
      xaxis: { categories: months },
      colors: ['#6366f1'],
      fill: { type: 'gradient', gradient: { opacityFrom: 0.5, opacityTo: 0.05 } },
      tooltip: { y: { formatter: v => formatNumber(v) } },
    });

    createChart('overview-users-chart', {
      chart: { type: 'line', height: 260 },
      series: [
        { name: 'DAU', data: PRODUCT.dau },
        { name: 'MAU', data: PRODUCT.mau },
      ],
      xaxis: { categories: months },
      colors: ['#22c55e', '#3b82f6'],
      stroke: { width: 2, curve: 'smooth' },
      markers: { size: 3 },
    });
  }

  // ── Organization Charts ──
  const okrLabels = [];
  const okrValues = [];
  const okrColors = [];
  OKR.companyOKRs.forEach(o => {
    const avg = o.keyResults.length > 0
      ? Math.round(o.keyResults.reduce((s, kr) => s + kr.progress, 0) / o.keyResults.length) : 0;
    okrLabels.push(o.id);
    okrValues.push(avg);
    okrColors.push(avg >= 70 ? '#22c55e' : avg >= 50 ? '#eab308' : '#ef4444');
  });

  createChart('overview-okr-chart', {
    chart: { type: 'bar', height: 260 },
    series: [{ name: t('okr.progress'), data: okrValues }],
    xaxis: { categories: okrLabels },
    colors: okrColors,
    plotOptions: { bar: { borderRadius: 6, columnWidth: '40%', distributed: true } },
    legend: { show: false },
    yaxis: { max: 100, labels: { formatter: v => v + '%' } },
  });

  createChart('overview-headcount-chart', {
    chart: { type: 'area', height: 260 },
    series: [{ name: t('hr.headcount'), data: HR.monthlyHeadcount }],
    xaxis: { categories: months },
    colors: ['#f97316'],
    fill: { type: 'gradient', gradient: { opacityFrom: 0.5, opacityTo: 0.05 } },
  });

  // Cleanup
  return () => destroyAllCharts();
}

function renderProductSection() {
  const hasReal = hasApiData();

  if (hasReal) {
    const grand = getGrandTotal();
    const mainStats = getProductStats('main');
    const altStats = getProductStats('alt');
    const mainJan = API_DATA.main.months[0];

    return `
      <div class="grid grid-4 stagger" style="margin-bottom:16px">
        ${MetricCard({
          title: 'Total API Calls',
          value: formatNumber(grand.totalCalls),
          icon: 'zap',
          iconBg: '#6366f1',
          subtitle: 'Google Sheets (Real Data)',
        })}
        ${MetricCard({
          title: 'EasySlip API',
          value: formatNumber(grand.mainTotal),
          icon: 'server',
          iconBg: '#3b82f6',
          subtitle: `${t('apiAnalytics.dailyAvg')}: ${formatNumber(mainStats?.avgDaily || 0)}`,
        })}
        ${MetricCard({
          title: 'EasySlip Lite',
          value: formatNumber(grand.altTotal),
          icon: 'smartphone',
          iconBg: '#22c55e',
          subtitle: `${t('apiAnalytics.dailyAvg')}: ${formatNumber(altStats?.avgDaily || 0)}`,
        })}
        ${MetricCard({
          title: t('apiAnalytics.growth'),
          value: mainJan.growthPct != null ? (mainJan.growthPct >= 0 ? '+' : '') + mainJan.growthPct.toFixed(2) + '%' : '—',
          icon: 'trending-up',
          iconBg: (mainJan.growthPct || 0) >= 0 ? '#22c55e' : '#ef4444',
          subtitle: 'Jan vs Dec 2025',
        })}
      </div>
    `;
  }

  // Fallback: show projected product data
  return `
    <div class="grid grid-4 stagger" style="margin-bottom:16px">
      ${MetricCard({
        title: t('product.apiCalls'),
        value: formatNumber(PRODUCT.totalApiCalls),
        icon: 'zap',
        iconBg: '#3b82f6',
        subtitle: `${t('product.errorRate')}: ${formatPercent(PRODUCT.avgErrorRate)}`,
      })}
      ${MetricCard({
        title: 'DAU / MAU',
        value: `${formatNumber(PRODUCT.latestDAU)} / ${formatNumber(PRODUCT.latestMAU)}`,
        icon: 'users',
        iconBg: '#22c55e',
        subtitle: `${t('product.stickiness')}: ${formatPercent(PRODUCT.dauMauRatio)}`,
      })}
      ${MetricCard({
        title: t('product.uptime'),
        value: formatPercent(PRODUCT.avgUptime, 2),
        icon: 'shield-check',
        iconBg: PRODUCT.avgUptime >= 99.95 ? '#22c55e' : '#eab308',
      })}
      ${MetricCard({
        title: t('product.avgResponse'),
        value: PRODUCT.avgResponseTime.toFixed(0) + 'ms',
        icon: 'timer',
        iconBg: '#f97316',
        subtitle: `${t('product.tickets')}: ${PRODUCT.totalTickets}`,
      })}
    </div>
  `;
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
