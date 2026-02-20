// ============================================
// EasySlip 2026 — Executive Report Page
// ============================================

import { REVENUE } from '../data/revenue.js';
import { TOTAL_MONTHLY_COST, ANNUAL_TOTAL_COST } from '../data/expenses.js';
import { SALES } from '../data/sales.js';
import { CUSTOMERS } from '../data/customers.js';
import { PRODUCT } from '../data/product.js';
import { HR } from '../data/hr.js';
import { OKR } from '../data/okr.js';
import { createChart, destroyAllCharts } from '../components/charts.js';
import { MetricCard, SectionHeader } from '../components/cards.js';
import { formatBaht, formatBahtCompact, formatNumber, formatPercent, setPageTitle, downloadCSV } from '../utils.js';
import { t, getMonths, getLang } from '../i18n.js';
import { QUARTERS, QUARTER_MONTHS } from '../data/constants.js';

export function render(container) {
  setPageTitle(t('page.report.title'));

  const TAB_KEY = 'report_active_tab';
  let activeTab = sessionStorage.getItem(TAB_KEY) || 'monthly';
  const months = getMonths();
  const lang = getLang();

  // ── Computed Data ──
  const totalRevenue = REVENUE.annualTotal;
  const totalCost = ANNUAL_TOTAL_COST;
  const netProfit = totalRevenue - totalCost;
  const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

  // Quarterly data
  function getQuarterlyData() {
    return QUARTERS.map((q, qi) => {
      const qMonths = QUARTER_MONTHS[qi];
      const rev = qMonths.reduce((s, m) => s + (REVENUE.total?.[m] || 0), 0);
      const cost = qMonths.reduce((s, m) => s + (TOTAL_MONTHLY_COST[m] || 0), 0);
      const profit = rev - cost;
      const margin = rev > 0 ? (profit / rev) * 100 : 0;
      return { quarter: q, revenue: rev, cost, profit, margin };
    });
  }

  // ── Summary KPIs ──
  function buildSummaryBar() {
    return `
      <div class="summary-bar" style="position:sticky;top:var(--header-height);z-index:40;background:var(--bg-surface);margin:0 -32px 24px;padding:12px 32px;border-bottom:1px solid var(--border-default);box-shadow:var(--shadow-sm)">
        <div class="grid grid-4 stagger" id="report-kpis">
          ${MetricCard({ title: t('report.annualRevenue'), value: formatBahtCompact(totalRevenue), icon: 'trending-up', iconBg: '#22c55e' })}
          ${MetricCard({ title: t('report.annualCost'), value: formatBahtCompact(totalCost), icon: 'wallet', iconBg: '#ef4444' })}
          ${MetricCard({ title: t('report.netProfit'), value: formatBahtCompact(netProfit), icon: 'piggy-bank', iconBg: netProfit >= 0 ? '#22c55e' : '#ef4444' })}
          ${MetricCard({ title: t('report.profitMargin'), value: formatPercent(profitMargin), icon: 'percent', iconBg: profitMargin >= 35 ? '#22c55e' : '#eab308' })}
        </div>
      </div>`;
  }

  // ── Tabs ──
  function buildTabs() {
    const tabs = [
      { key: 'monthly', label: t('report.tabMonthly') },
      { key: 'quarterly', label: t('report.tabQuarterly') },
      { key: 'highlights', label: t('report.tabHighlights') },
      { key: 'yoy', label: t('report.tabYoY') },
    ];
    return `
      <div class="tab-bar" style="margin-bottom:24px">
        ${tabs.map(tb => `
          <button class="tab-btn ${activeTab === tb.key ? 'active' : ''}" data-tab="${tb.key}">
            ${tb.label}
          </button>
        `).join('')}
      </div>
      <div id="report-tab-content">${buildTabContent()}</div>`;
  }

  function buildTabContent() {
    switch (activeTab) {
      case 'monthly': return buildMonthlyTab();
      case 'quarterly': return buildQuarterlyTab();
      case 'highlights': return buildHighlightsTab();
      case 'yoy': return buildYoYTab();
      default: return '';
    }
  }

  // ── Monthly Report ──
  function buildMonthlyTab() {
    return `
      <div class="flex gap-8" style="margin-bottom:16px">
        <button class="btn btn-primary btn-sm" id="btn-export-report">
          <i data-lucide="download" style="width:14px;height:14px"></i> ${t('report.exportCSV')}
        </button>
      </div>

      <div class="card">
        ${SectionHeader(t('report.monthlySummary'))}
        <div style="overflow-x:auto">
          <table class="data-table">
            <thead>
              <tr>
                <th>${t('th.month')}</th>
                <th style="text-align:right">${t('report.revenue')}</th>
                <th style="text-align:right">${t('report.cost')}</th>
                <th style="text-align:right">${t('report.profit')}</th>
                <th style="text-align:right">${t('report.margin')}</th>
                <th style="text-align:right">${t('report.customers')}</th>
                <th style="text-align:right">MRR</th>
              </tr>
            </thead>
            <tbody>
              ${months.map((m, i) => {
                const rev = REVENUE.total?.[i] || 0;
                const cost = TOTAL_MONTHLY_COST[i] || 0;
                const profit = rev - cost;
                const margin = rev > 0 ? (profit / rev) * 100 : 0;
                return `
                  <tr>
                    <td>${m}</td>
                    <td style="text-align:right">${formatBaht(rev)}</td>
                    <td style="text-align:right">${formatBaht(cost)}</td>
                    <td style="text-align:right;color:${profit >= 0 ? 'var(--color-success)' : 'var(--color-danger)'}">
                      ${formatBaht(profit)}
                    </td>
                    <td style="text-align:right">${formatPercent(margin)}</td>
                    <td style="text-align:right">${formatNumber(CUSTOMERS.totalByMonth[i] || 0)}</td>
                    <td style="text-align:right">${formatBaht(CUSTOMERS.mrr[i] || 0)}</td>
                  </tr>`;
              }).join('')}
            </tbody>
            <tfoot>
              <tr style="font-weight:700;border-top:2px solid var(--border-default)">
                <td>${t('th.total')}</td>
                <td style="text-align:right">${formatBaht(totalRevenue)}</td>
                <td style="text-align:right">${formatBaht(totalCost)}</td>
                <td style="text-align:right;color:${netProfit >= 0 ? 'var(--color-success)' : 'var(--color-danger)'}">${formatBaht(netProfit)}</td>
                <td style="text-align:right">${formatPercent(profitMargin)}</td>
                <td style="text-align:right">${formatNumber(CUSTOMERS.totalByMonth[11] || 0)}</td>
                <td style="text-align:right">${formatBaht(CUSTOMERS.mrr[11] || 0)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <div class="grid grid-2 stagger" style="margin-top:16px">
        <div class="card">
          ${SectionHeader(t('report.revenueCostTrend'))}
          <div id="chart-rev-cost" style="min-height:300px"></div>
        </div>
        <div class="card">
          ${SectionHeader(t('report.profitTrend'))}
          <div id="chart-profit-trend" style="min-height:300px"></div>
        </div>
      </div>`;
  }

  // ── Quarterly Report ──
  function buildQuarterlyTab() {
    const qData = getQuarterlyData();

    return `
      <div class="card">
        ${SectionHeader(t('report.quarterlySummary'))}
        <div style="overflow-x:auto">
          <table class="data-table">
            <thead>
              <tr>
                <th>${t('th.quarter')}</th>
                <th style="text-align:right">${t('report.revenue')}</th>
                <th style="text-align:right">${t('report.cost')}</th>
                <th style="text-align:right">${t('report.profit')}</th>
                <th style="text-align:right">${t('report.margin')}</th>
                <th>${t('th.status')}</th>
              </tr>
            </thead>
            <tbody>
              ${qData.map(q => `
                <tr>
                  <td style="font-weight:600">${q.quarter}</td>
                  <td style="text-align:right">${formatBaht(q.revenue)}</td>
                  <td style="text-align:right">${formatBaht(q.cost)}</td>
                  <td style="text-align:right;color:${q.profit >= 0 ? 'var(--color-success)' : 'var(--color-danger)'}">${formatBaht(q.profit)}</td>
                  <td style="text-align:right">${formatPercent(q.margin)}</td>
                  <td>
                    <span class="badge" style="background:${q.margin >= 35 ? '#22c55e20' : q.margin >= 25 ? '#eab30820' : '#ef444420'};color:${q.margin >= 35 ? '#22c55e' : q.margin >= 25 ? '#eab308' : '#ef4444'}">
                      ${q.margin >= 35 ? t('status.onTrack') : q.margin >= 25 ? t('status.warning') : t('status.critical')}
                    </span>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <!-- OKR Progress Summary -->
      <div class="card" style="margin-top:16px">
        ${SectionHeader(t('report.okrProgress'))}
        <div class="grid grid-4" style="gap:16px">
          ${OKR.quarterly.map(q => {
            const color = q.progress >= 70 ? 'var(--color-success)' : q.progress >= 50 ? 'var(--color-warning)' : 'var(--text-muted)';
            return `
              <div style="text-align:center;padding:16px;background:var(--bg-base);border-radius:var(--radius-md)">
                <div style="font-size:1.25rem;font-weight:700;color:${color}">${q.quarter}</div>
                <div style="font-size:2rem;font-weight:700;color:${color};margin:8px 0">${q.progress}%</div>
                <div class="progress-bar">
                  <div class="progress-fill" style="width:${q.progress}%;background:${color}"></div>
                </div>
              </div>`;
          }).join('')}
        </div>
      </div>

      <div class="card" style="margin-top:16px">
        ${SectionHeader(t('report.quarterlyChart'))}
        <div id="chart-quarterly-rev" style="min-height:300px"></div>
      </div>`;
  }

  // ── Highlights Tab ──
  function buildHighlightsTab() {
    // Auto-generated insights
    const insights = [];

    // Revenue insight
    if (totalRevenue > 0) {
      const revGrowth = REVENUE.total && REVENUE.total[11] > 0 && REVENUE.total[0] > 0
        ? ((REVENUE.total[11] - REVENUE.total[0]) / REVENUE.total[0]) * 100 : 0;
      insights.push({
        icon: 'trending-up',
        color: revGrowth > 0 ? '#22c55e' : '#ef4444',
        title: lang === 'en' ? 'Revenue Trend' : 'แนวโน้มรายได้',
        text: lang === 'en'
          ? `Revenue ${revGrowth > 0 ? 'grew' : 'declined'} ${Math.abs(revGrowth).toFixed(1)}% from Jan to Dec.`
          : `รายได้${revGrowth > 0 ? 'เติบโต' : 'ลดลง'} ${Math.abs(revGrowth).toFixed(1)}% จาก ม.ค. ถึง ธ.ค.`,
      });
    }

    // Profit margin insight
    insights.push({
      icon: profitMargin >= 35 ? 'check-circle' : 'alert-triangle',
      color: profitMargin >= 35 ? '#22c55e' : '#eab308',
      title: lang === 'en' ? 'Profit Margin' : 'อัตรากำไร',
      text: lang === 'en'
        ? `Profit margin at ${profitMargin.toFixed(1)}% ${profitMargin >= 35 ? '— above 35% target' : '— below 35% target'}.`
        : `อัตรากำไร ${profitMargin.toFixed(1)}% ${profitMargin >= 35 ? '— เกินเป้า 35%' : '— ต่ำกว่าเป้า 35%'}`,
    });

    // Customer growth
    if (CUSTOMERS.totalByMonth[11] > 0) {
      const custGrowth = CUSTOMERS.totalByMonth[0] > 0
        ? ((CUSTOMERS.totalByMonth[11] - CUSTOMERS.totalByMonth[0]) / CUSTOMERS.totalByMonth[0]) * 100 : 0;
      insights.push({
        icon: 'users',
        color: '#3b82f6',
        title: lang === 'en' ? 'Customer Growth' : 'การเติบโตลูกค้า',
        text: lang === 'en'
          ? `Customer base grew ${custGrowth.toFixed(1)}% to ${formatNumber(CUSTOMERS.totalByMonth[11])} customers.`
          : `ฐานลูกค้าเติบโต ${custGrowth.toFixed(1)}% เป็น ${formatNumber(CUSTOMERS.totalByMonth[11])} ราย`,
      });
    }

    // Churn insight
    if (CUSTOMERS.avgChurn > 0) {
      insights.push({
        icon: CUSTOMERS.avgChurn < 3 ? 'shield-check' : 'alert-circle',
        color: CUSTOMERS.avgChurn < 3 ? '#22c55e' : '#ef4444',
        title: lang === 'en' ? 'Churn Rate' : 'อัตรายกเลิก',
        text: lang === 'en'
          ? `Average churn rate at ${CUSTOMERS.avgChurn.toFixed(1)}% — ${CUSTOMERS.avgChurn < 3 ? 'healthy level' : 'needs attention'}.`
          : `อัตราการยกเลิกเฉลี่ย ${CUSTOMERS.avgChurn.toFixed(1)}% — ${CUSTOMERS.avgChurn < 3 ? 'อยู่ในเกณฑ์ดี' : 'ต้องปรับปรุง'}`,
      });
    }

    // Product reliability
    if (PRODUCT.avgUptime > 0) {
      insights.push({
        icon: 'server',
        color: PRODUCT.avgUptime >= 99.95 ? '#22c55e' : '#eab308',
        title: lang === 'en' ? 'System Reliability' : 'ความเสถียรระบบ',
        text: lang === 'en'
          ? `Average uptime ${PRODUCT.avgUptime.toFixed(2)}% with ${PRODUCT.avgResponseTime.toFixed(0)}ms avg response.`
          : `Uptime เฉลี่ย ${PRODUCT.avgUptime.toFixed(2)}% ตอบสนองเฉลี่ย ${PRODUCT.avgResponseTime.toFixed(0)}ms`,
      });
    }

    // HR insight
    if (HR.totalHeadcount > 0) {
      insights.push({
        icon: 'building-2',
        color: '#a855f7',
        title: lang === 'en' ? 'Team Growth' : 'การเติบโตทีม',
        text: lang === 'en'
          ? `Team size: ${HR.totalHeadcount} people. Hired ${HR.totalActualHires}/${HR.totalPlannedHires} planned. Turnover: ${HR.turnoverRate.toFixed(1)}%.`
          : `ทีม ${HR.totalHeadcount} คน รับเพิ่ม ${HR.totalActualHires}/${HR.totalPlannedHires} ตามแผน อัตราลาออก: ${HR.turnoverRate.toFixed(1)}%`,
      });
    }

    // OKR insight
    insights.push({
      icon: 'target',
      color: OKR.overallProgress >= 70 ? '#22c55e' : '#eab308',
      title: lang === 'en' ? 'OKR Progress' : 'ความคืบหน้า OKR',
      text: lang === 'en'
        ? `Overall OKR progress at ${OKR.overallProgress}%.`
        : `ความคืบหน้า OKR รวม ${OKR.overallProgress}%`,
    });

    return `
      <div class="card" style="margin-bottom:16px">
        ${SectionHeader(t('report.keyInsights'))}
        <div style="display:flex;flex-direction:column;gap:16px">
          ${insights.map(ins => `
            <div style="display:flex;gap:12px;padding:16px;background:var(--bg-base);border-radius:var(--radius-md);border-left:4px solid ${ins.color}">
              <div style="width:40px;height:40px;border-radius:10px;background:${ins.color}20;display:flex;align-items:center;justify-content:center;flex-shrink:0">
                <i data-lucide="${ins.icon}" style="width:20px;height:20px;color:${ins.color}"></i>
              </div>
              <div>
                <div style="font-weight:600;margin-bottom:4px">${ins.title}</div>
                <div style="font-size:.85rem;color:var(--text-secondary)">${ins.text}</div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Scorecard Summary -->
      <div class="card">
        ${SectionHeader(t('report.scorecard'))}
        <div class="grid grid-3 stagger">
          <div style="text-align:center;padding:20px;background:var(--bg-base);border-radius:var(--radius-md)">
            <div style="font-size:.8rem;color:var(--text-muted);margin-bottom:8px">${t('report.financialHealth')}</div>
            <div style="font-size:2.5rem;font-weight:700;color:${profitMargin >= 30 ? 'var(--color-success)' : 'var(--color-warning)'}">
              ${profitMargin >= 35 ? 'A' : profitMargin >= 25 ? 'B' : profitMargin >= 15 ? 'C' : 'D'}
            </div>
          </div>
          <div style="text-align:center;padding:20px;background:var(--bg-base);border-radius:var(--radius-md)">
            <div style="font-size:.8rem;color:var(--text-muted);margin-bottom:8px">${t('report.growthHealth')}</div>
            <div style="font-size:2.5rem;font-weight:700;color:${CUSTOMERS.ltvCacRatio >= 3 ? 'var(--color-success)' : 'var(--color-warning)'}">
              ${CUSTOMERS.ltvCacRatio >= 3 ? 'A' : CUSTOMERS.ltvCacRatio >= 2 ? 'B' : 'C'}
            </div>
          </div>
          <div style="text-align:center;padding:20px;background:var(--bg-base);border-radius:var(--radius-md)">
            <div style="font-size:.8rem;color:var(--text-muted);margin-bottom:8px">${t('report.operationalHealth')}</div>
            <div style="font-size:2.5rem;font-weight:700;color:${PRODUCT.avgUptime >= 99.95 ? 'var(--color-success)' : 'var(--color-warning)'}">
              ${PRODUCT.avgUptime >= 99.95 ? 'A' : PRODUCT.avgUptime >= 99.9 ? 'B' : 'C'}
            </div>
          </div>
        </div>
      </div>`;
  }

  // ── YoY Tab ──
  function buildYoYTab() {
    // Simulated prior year (80% of current for demo)
    const priorRevenue = totalRevenue * 0.65;
    const priorCost = totalCost * 0.72;
    const priorProfit = priorRevenue - priorCost;
    const priorMargin = priorRevenue > 0 ? (priorProfit / priorRevenue) * 100 : 0;

    const revChange = priorRevenue > 0 ? ((totalRevenue - priorRevenue) / priorRevenue) * 100 : 0;
    const costChange = priorCost > 0 ? ((totalCost - priorCost) / priorCost) * 100 : 0;
    const profitChange = priorProfit > 0 ? ((netProfit - priorProfit) / priorProfit) * 100 : 0;

    const comparisons = [
      { label: t('report.revenue'), current: totalRevenue, prior: priorRevenue, change: revChange, goodUp: true },
      { label: t('report.cost'), current: totalCost, prior: priorCost, change: costChange, goodUp: false },
      { label: t('report.profit'), current: netProfit, prior: priorProfit, change: profitChange, goodUp: true },
      { label: t('report.margin'), current: profitMargin, prior: priorMargin, change: profitMargin - priorMargin, goodUp: true, isPercent: true },
    ];

    return `
      <div class="card" style="margin-bottom:16px">
        ${SectionHeader(t('report.yoyComparison'))}
        <div style="font-size:.8rem;color:var(--text-muted);margin-bottom:16px">
          ${t('report.yoyNote')}
        </div>

        <div class="grid grid-2 stagger" style="gap:16px">
          ${comparisons.map(c => {
            const isGood = c.goodUp ? c.change > 0 : c.change < 0;
            const color = isGood ? 'var(--color-success)' : 'var(--color-danger)';
            const arrow = c.change > 0 ? '↑' : c.change < 0 ? '↓' : '→';
            return `
              <div style="padding:20px;background:var(--bg-base);border-radius:var(--radius-md);border-left:4px solid ${color}">
                <div style="font-size:.85rem;color:var(--text-muted);margin-bottom:8px">${c.label}</div>
                <div class="flex-between" style="margin-bottom:8px">
                  <div>
                    <div style="font-size:.7rem;color:var(--text-muted)">FY 2026</div>
                    <div style="font-size:1.25rem;font-weight:700">${c.isPercent ? formatPercent(c.current) : formatBahtCompact(c.current)}</div>
                  </div>
                  <div style="font-size:1.5rem;font-weight:700;color:${color}">${arrow} ${Math.abs(c.change).toFixed(1)}%</div>
                  <div style="text-align:right">
                    <div style="font-size:.7rem;color:var(--text-muted)">FY 2025</div>
                    <div style="font-size:1.25rem;font-weight:700;color:var(--text-secondary)">${c.isPercent ? formatPercent(c.prior) : formatBahtCompact(c.prior)}</div>
                  </div>
                </div>
              </div>`;
          }).join('')}
        </div>
      </div>

      <div class="card">
        ${SectionHeader(t('report.yoyChart'))}
        <div id="chart-yoy" style="min-height:300px"></div>
      </div>`;
  }

  // ── Init Charts ──
  function initCharts() {
    if (typeof ApexCharts === 'undefined') return;

    if (activeTab === 'monthly') {
      const revData = REVENUE.total || new Array(12).fill(0);
      const costData = TOTAL_MONTHLY_COST;
      const profitData = revData.map((r, i) => r - (costData[i] || 0));

      createChart('chart-rev-cost', {
        chart: { type: 'area', height: 300 },
        series: [
          { name: t('report.revenue'), data: revData },
          { name: t('report.cost'), data: costData },
        ],
        xaxis: { categories: months },
        colors: ['#22c55e', '#ef4444'],
        fill: { type: 'gradient', gradient: { opacityFrom: 0.5, opacityTo: 0.05 } },
      });

      createChart('chart-profit-trend', {
        chart: { type: 'bar', height: 300 },
        series: [{ name: t('report.profit'), data: profitData }],
        xaxis: { categories: months },
        colors: ['#6366f1'],
        plotOptions: { bar: { borderRadius: 4, columnWidth: '50%' } },
      });
    }

    if (activeTab === 'quarterly') {
      const qData = getQuarterlyData();
      createChart('chart-quarterly-rev', {
        chart: { type: 'bar', height: 300 },
        series: [
          { name: t('report.revenue'), data: qData.map(q => q.revenue) },
          { name: t('report.cost'), data: qData.map(q => q.cost) },
          { name: t('report.profit'), data: qData.map(q => q.profit) },
        ],
        xaxis: { categories: QUARTERS },
        colors: ['#22c55e', '#ef4444', '#6366f1'],
        plotOptions: { bar: { borderRadius: 4, columnWidth: '60%' } },
      });
    }

    if (activeTab === 'yoy') {
      const priorRevenue = totalRevenue * 0.65;
      const priorCost = totalCost * 0.72;
      createChart('chart-yoy', {
        chart: { type: 'bar', height: 300 },
        series: [
          { name: 'FY 2026', data: [totalRevenue, totalCost, netProfit] },
          { name: 'FY 2025', data: [priorRevenue, priorCost, priorRevenue - priorCost] },
        ],
        xaxis: { categories: [t('report.revenue'), t('report.cost'), t('report.profit')] },
        colors: ['#3b82f6', '#94a3b8'],
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

    // Export CSV
    container.querySelector('#btn-export-report')?.addEventListener('click', () => {
      const headers = ['Month', 'Revenue', 'Cost', 'Profit', 'Margin %', 'Customers', 'MRR'];
      const rows = months.map((m, i) => {
        const rev = REVENUE.total?.[i] || 0;
        const cost = TOTAL_MONTHLY_COST[i] || 0;
        const profit = rev - cost;
        const margin = rev > 0 ? ((profit / rev) * 100).toFixed(1) : '0.0';
        return [m, rev, cost, profit, margin, CUSTOMERS.totalByMonth[i] || 0, CUSTOMERS.mrr[i] || 0];
      });
      downloadCSV('easyslip-executive-report-2026.csv', headers, rows);
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
