// ============================================
// EasySlip 2026 — HR & People Page
// ============================================

import { HR, DEPARTMENTS, recalcHR, saveHR, resetHR } from '../data/hr.js';
import { createChart, destroyAllCharts } from '../components/charts.js';
import { MetricCard, SectionHeader } from '../components/cards.js';
import { formatBaht, formatBahtCompact, formatNumber, formatPercent, setPageTitle } from '../utils.js';
import { t, getMonths, getLang } from '../i18n.js';
import { createAutoSave, formatInputDisplay, parseInputValue, reformatInput } from '../shared/editable-page.js';

export function render(container) {
  setPageTitle(t('page.hr.title'));

  let undoBuffer = null;
  let isDirty = false;
  const TAB_KEY = 'hr_active_tab';
  let activeTab = sessionStorage.getItem(TAB_KEY) || 'overview';
  const months = getMonths();

  // ── Snapshot / Undo ──
  function snapshot() {
    return {
      headcount: { ...HR.headcount },
      payroll: [...HR.payroll],
      bonus: [...HR.bonus],
      socialSecurity: [...HR.socialSecurity],
      hiringPlan: [...HR.hiringPlan],
      hiringActual: [...HR.hiringActual],
      resignations: [...HR.resignations],
      trainingBudget: [...HR.trainingBudget],
    };
  }

  function restore(snap) {
    Object.assign(HR.headcount, snap.headcount);
    ['payroll', 'bonus', 'socialSecurity', 'hiringPlan', 'hiringActual', 'resignations', 'trainingBudget'].forEach(k => {
      for (let i = 0; i < 12; i++) HR[k][i] = snap[k][i];
    });
    recalcHR();
  }

  const autoSave = createAutoSave({
    saveFn: () => { undoBuffer = snapshot(); saveHR(); },
    setDirty: v => isDirty = v,
    updateIndicator: () => {},
  });

  // ── Summary KPIs ──
  function buildSummaryBar() {
    const turnoverColor = HR.turnoverRate <= 5 ? '#22c55e' : HR.turnoverRate <= 10 ? '#eab308' : '#ef4444';

    return `
      <div class="summary-bar" style="position:sticky;top:var(--header-height);z-index:40;background:var(--bg-surface);margin:0 -32px 24px;padding:12px 32px;border-bottom:1px solid var(--border-default);box-shadow:var(--shadow-sm)">
        <div class="grid grid-4 stagger" id="hr-kpis">
          ${MetricCard({ title: t('hr.headcount'), value: formatNumber(HR.totalHeadcount), icon: 'users', iconBg: '#3b82f6', subtitle: `${DEPARTMENTS.length} ${t('hr.departments')}` })}
          ${MetricCard({ title: t('hr.annualPayroll'), value: formatBahtCompact(HR.annualTotalCost), icon: 'wallet', iconBg: '#22c55e', subtitle: `${t('hr.avgSalary')}: ${formatBahtCompact(HR.avgSalary)}` })}
          ${MetricCard({ title: t('hr.turnoverRate'), value: formatPercent(HR.turnoverRate), icon: 'user-minus', iconBg: turnoverColor, subtitle: `${HR.totalResignations} ${t('hr.resignations')}` })}
          ${MetricCard({ title: t('hr.hiringProgress'), value: `${HR.totalActualHires}/${HR.totalPlannedHires}`, icon: 'user-plus', iconBg: '#a855f7', subtitle: t('hr.hiringPlan') })}
        </div>
      </div>`;
  }

  // ── Tabs ──
  function buildTabs() {
    const tabs = [
      { key: 'overview', label: t('hr.tabOverview') },
      { key: 'payroll', label: t('hr.tabPayroll') },
      { key: 'hiring', label: t('hr.tabHiring') },
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
      <div id="hr-tab-content">${buildTabContent()}</div>`;
  }

  function buildTabContent() {
    switch (activeTab) {
      case 'overview': return buildOverviewTab();
      case 'payroll': return buildPayrollTab();
      case 'hiring': return buildHiringTab();
      case 'charts': return buildChartsTab();
      default: return '';
    }
  }

  // ── Overview Tab ──
  function buildOverviewTab() {
    const lang = getLang();
    return `
      <div class="grid grid-2 stagger">
        <!-- Org Chart / Department Breakdown -->
        <div class="card">
          ${SectionHeader(t('hr.orgStructure'))}
          <div id="chart-org" style="min-height:280px"></div>
        </div>

        <!-- Headcount by Department -->
        <div class="card">
          ${SectionHeader(t('hr.byDepartment'))}
          <div style="display:flex;flex-direction:column;gap:12px">
            ${DEPARTMENTS.map(dept => {
              const count = HR.headcount[dept.key] || 0;
              const pct = HR.totalHeadcount > 0 ? ((count / HR.totalHeadcount) * 100).toFixed(0) : 0;
              return `
                <div>
                  <div class="flex-between" style="margin-bottom:4px">
                    <div style="display:flex;align-items:center;gap:8px">
                      <i data-lucide="${dept.icon}" style="width:16px;height:16px;color:${dept.color}"></i>
                      <span style="font-size:.85rem;font-weight:500">${lang === 'en' ? dept.labelEn : dept.label}</span>
                    </div>
                    <span style="font-size:.85rem;font-weight:600">${count} (${pct}%)</span>
                  </div>
                  <div class="progress-bar">
                    <div class="progress-fill" style="width:${pct}%;background:${dept.color}"></div>
                  </div>
                </div>`;
            }).join('')}
          </div>
        </div>
      </div>

      <!-- Headcount Trend -->
      <div class="card" style="margin-top:16px">
        ${SectionHeader(t('hr.headcountTrend'))}
        <div id="chart-headcount-trend" style="min-height:280px"></div>
      </div>

      <!-- Training Budget -->
      <div class="card" style="margin-top:16px">
        ${SectionHeader(t('hr.trainingBudget'))}
        <div class="grid grid-3" style="margin-bottom:16px">
          <div style="text-align:center;padding:12px">
            <div style="font-size:1.5rem;font-weight:700;color:var(--color-accent)">${formatBahtCompact(HR.annualTrainingBudget)}</div>
            <div style="font-size:.75rem;color:var(--text-muted)">${t('hr.annualTraining')}</div>
          </div>
          <div style="text-align:center;padding:12px">
            <div style="font-size:1.5rem;font-weight:700;color:var(--color-success)">${formatBahtCompact(HR.trainingPerHead)}</div>
            <div style="font-size:.75rem;color:var(--text-muted)">${t('hr.perHead')}</div>
          </div>
          <div style="text-align:center;padding:12px">
            <div style="font-size:1.5rem;font-weight:700;color:var(--color-warning)">${formatBahtCompact(HR.annualTrainingBudget / 12)}</div>
            <div style="font-size:.75rem;color:var(--text-muted)">${t('th.avgMo')}</div>
          </div>
        </div>
      </div>`;
  }

  // ── Payroll Tab (Editable) ──
  function buildPayrollTab() {
    return `
      <div class="flex gap-8" style="margin-bottom:16px;flex-wrap:wrap">
        <button class="btn btn-primary btn-sm" id="btn-save-hr">
          <i data-lucide="save" style="width:14px;height:14px"></i> ${t('btn.save')}
        </button>
        <button class="btn btn-secondary btn-sm" id="btn-undo-hr" ${!undoBuffer ? 'disabled style="opacity:.5;cursor:not-allowed"' : ''}>
          <i data-lucide="undo-2" style="width:14px;height:14px"></i> ${t('btn.undo')}
        </button>
        <button class="btn btn-danger btn-sm" id="btn-reset-hr">
          <i data-lucide="trash-2" style="width:14px;height:14px"></i> ${t('btn.reset')}
        </button>
      </div>

      <div class="card">
        ${SectionHeader(t('hr.payrollDetail'))}
        <div style="overflow-x:auto">
          <table class="data-table">
            <thead>
              <tr>
                <th>${t('th.month')}</th>
                <th style="text-align:right">${t('hr.baseSalary')}</th>
                <th style="text-align:right">${t('hr.bonus')}</th>
                <th style="text-align:right">${t('hr.socialSec')}</th>
                <th style="text-align:right">${t('th.total')}</th>
              </tr>
            </thead>
            <tbody>
              ${months.map((m, i) => {
                const total = HR.payroll[i] + HR.bonus[i] + HR.socialSecurity[i];
                return `
                  <tr>
                    <td>${m}</td>
                    <td style="text-align:right">
                      <input type="text" class="ba-input hr-input"
                        data-field="payroll" data-month="${i}"
                        value="${formatInputDisplay(HR.payroll[i])}"
                        style="width:120px;text-align:right">
                    </td>
                    <td style="text-align:right">
                      <input type="text" class="ba-input hr-input"
                        data-field="bonus" data-month="${i}"
                        value="${formatInputDisplay(HR.bonus[i])}"
                        style="width:100px;text-align:right">
                    </td>
                    <td style="text-align:right">
                      <input type="text" class="ba-input hr-input"
                        data-field="socialSecurity" data-month="${i}"
                        value="${formatInputDisplay(HR.socialSecurity[i])}"
                        style="width:100px;text-align:right">
                    </td>
                    <td style="text-align:right;font-weight:600">${formatBaht(total)}</td>
                  </tr>`;
              }).join('')}
            </tbody>
            <tfoot>
              <tr style="font-weight:700;border-top:2px solid var(--border-default)">
                <td>${t('th.total')}</td>
                <td style="text-align:right">${formatBaht(HR.annualPayroll)}</td>
                <td style="text-align:right">${formatBaht(HR.annualBonus)}</td>
                <td style="text-align:right">${formatBaht(HR.annualSocialSecurity)}</td>
                <td style="text-align:right">${formatBaht(HR.annualTotalCost)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>`;
  }

  // ── Hiring Tab ──
  function buildHiringTab() {
    return `
      <div class="card">
        ${SectionHeader(t('hr.hiringPlanVsActual'))}
        <div style="overflow-x:auto">
          <table class="data-table">
            <thead>
              <tr>
                <th>${t('th.month')}</th>
                <th style="text-align:right">${t('hr.planned')}</th>
                <th style="text-align:right">${t('hr.actualHires')}</th>
                <th style="text-align:right">${t('hr.resignations')}</th>
                <th style="text-align:right">${t('hr.netChange')}</th>
                <th style="text-align:right">${t('hr.headcount')}</th>
              </tr>
            </thead>
            <tbody>
              ${months.map((m, i) => {
                const net = HR.hiringActual[i] - HR.resignations[i];
                return `
                  <tr>
                    <td>${m}</td>
                    <td style="text-align:right">${HR.hiringPlan[i]}</td>
                    <td style="text-align:right;color:var(--color-success)">${HR.hiringActual[i]}</td>
                    <td style="text-align:right;color:var(--color-danger)">${HR.resignations[i]}</td>
                    <td style="text-align:right;color:${net >= 0 ? 'var(--color-success)' : 'var(--color-danger)'}">${net >= 0 ? '+' : ''}${net}</td>
                    <td style="text-align:right;font-weight:600">${HR.monthlyHeadcount[i]}</td>
                  </tr>`;
              }).join('')}
            </tbody>
            <tfoot>
              <tr style="font-weight:700;border-top:2px solid var(--border-default)">
                <td>${t('th.total')}</td>
                <td style="text-align:right">${HR.totalPlannedHires}</td>
                <td style="text-align:right;color:var(--color-success)">${HR.totalActualHires}</td>
                <td style="text-align:right;color:var(--color-danger)">${HR.totalResignations}</td>
                <td style="text-align:right">${HR.totalActualHires - HR.totalResignations}</td>
                <td style="text-align:right">${HR.monthlyHeadcount[11]}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <div class="card" style="margin-top:16px">
        ${SectionHeader(t('hr.hiringChart'))}
        <div id="chart-hiring" style="min-height:300px"></div>
      </div>`;
  }

  // ── Charts Tab ──
  function buildChartsTab() {
    return `
      <div class="grid grid-2 stagger">
        <div class="card">
          ${SectionHeader(t('hr.payrollTrend'))}
          <div id="chart-payroll" style="min-height:300px"></div>
        </div>
        <div class="card">
          ${SectionHeader(t('hr.costBreakdown'))}
          <div id="chart-cost-breakdown" style="min-height:300px"></div>
        </div>
      </div>
      <div class="card" style="margin-top:16px">
        ${SectionHeader(t('hr.trainingTrend'))}
        <div id="chart-training" style="min-height:300px"></div>
      </div>`;
  }

  // ── Init Charts ──
  function initCharts() {
    if (typeof ApexCharts === 'undefined') return;

    if (activeTab === 'overview') {
      createChart('chart-org', {
        chart: { type: 'donut', height: 280 },
        series: DEPARTMENTS.map(d => HR.headcount[d.key] || 0),
        labels: DEPARTMENTS.map(d => getLang() === 'en' ? d.labelEn : d.label),
        colors: DEPARTMENTS.map(d => d.color),
        legend: { position: 'bottom' },
      });

      createChart('chart-headcount-trend', {
        chart: { type: 'area', height: 280 },
        series: [{ name: t('hr.headcount'), data: HR.monthlyHeadcount }],
        xaxis: { categories: months },
        colors: ['#3b82f6'],
        fill: { type: 'gradient', gradient: { opacityFrom: 0.5, opacityTo: 0.05 } },
      });
    }

    if (activeTab === 'hiring') {
      createChart('chart-hiring', {
        chart: { type: 'bar', height: 300 },
        series: [
          { name: t('hr.planned'), data: HR.hiringPlan },
          { name: t('hr.actualHires'), data: HR.hiringActual },
          { name: t('hr.resignations'), data: HR.resignations.map(v => -v) },
        ],
        xaxis: { categories: months },
        colors: ['#94a3b8', '#22c55e', '#ef4444'],
        plotOptions: { bar: { borderRadius: 4, columnWidth: '60%' } },
      });
    }

    if (activeTab === 'charts') {
      const totalPayroll = months.map((_, i) => HR.payroll[i] + HR.bonus[i] + HR.socialSecurity[i]);
      createChart('chart-payroll', {
        chart: { type: 'area', height: 300, stacked: true },
        series: [
          { name: t('hr.baseSalary'), data: HR.payroll },
          { name: t('hr.bonus'), data: HR.bonus },
          { name: t('hr.socialSec'), data: HR.socialSecurity },
        ],
        xaxis: { categories: months },
        colors: ['#3b82f6', '#22c55e', '#f97316'],
        fill: { type: 'gradient', gradient: { opacityFrom: 0.6, opacityTo: 0.1 } },
      });

      createChart('chart-cost-breakdown', {
        chart: { type: 'donut', height: 300 },
        series: [HR.annualPayroll, HR.annualBonus, HR.annualSocialSecurity],
        labels: [t('hr.baseSalary'), t('hr.bonus'), t('hr.socialSec')],
        colors: ['#3b82f6', '#22c55e', '#f97316'],
        legend: { position: 'bottom' },
      });

      createChart('chart-training', {
        chart: { type: 'bar', height: 300 },
        series: [{ name: t('hr.trainingBudget'), data: HR.trainingBudget }],
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
      const input = e.target.closest('.hr-input');
      if (!input) return;
      reformatInput(input);
      const field = input.dataset.field;
      const month = parseInt(input.dataset.month);
      HR[field][month] = parseInputValue(input.value);
      recalcHR();
      isDirty = true;
      autoSave();
    });

    container.querySelector('#btn-save-hr')?.addEventListener('click', () => {
      undoBuffer = snapshot();
      saveHR();
      isDirty = false;
      renderPage();
    });

    container.querySelector('#btn-undo-hr')?.addEventListener('click', () => {
      if (!undoBuffer) return;
      restore(undoBuffer);
      undoBuffer = null;
      isDirty = false;
      renderPage();
    });

    container.querySelector('#btn-reset-hr')?.addEventListener('click', () => {
      if (!confirm(t('confirm.resetHR'))) return;
      resetHR();
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
