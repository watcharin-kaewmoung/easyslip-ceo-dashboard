// ============================================
// EasySlip 2026 — OKR & Goals Page
// ============================================

import { OKR, recalcOKR, saveOKR, resetOKR } from '../data/okr.js';
import { createChart, destroyAllCharts } from '../components/charts.js';
import { MetricCard, SectionHeader } from '../components/cards.js';
import { formatPercent, formatNumber, setPageTitle } from '../utils.js';
import { t, getLang } from '../i18n.js';

export function render(container) {
  setPageTitle(t('page.okr.title'));

  const TAB_KEY = 'okr_active_tab';
  let activeTab = sessionStorage.getItem(TAB_KEY) || 'company';
  const lang = getLang();

  // ── Summary KPIs ──
  function buildSummaryBar() {
    const totalKRs = OKR.companyOKRs.reduce((sum, o) => sum + o.keyResults.length, 0);
    const completedKRs = OKR.companyOKRs.reduce((sum, o) => sum + o.keyResults.filter(kr => kr.progress >= 100).length, 0);
    const atRiskKRs = OKR.companyOKRs.reduce((sum, o) => sum + o.keyResults.filter(kr => kr.progress < 50).length, 0);

    return `
      <div class="summary-bar" style="position:sticky;top:var(--header-height);z-index:40;background:var(--bg-surface);margin:0 -32px 24px;padding:12px 32px;border-bottom:1px solid var(--border-default);box-shadow:var(--shadow-sm)">
        <div class="grid grid-4 stagger" id="okr-kpis">
          ${MetricCard({ title: t('okr.overallProgress'), value: OKR.overallProgress + '%', icon: 'target', iconBg: OKR.overallProgress >= 70 ? '#22c55e' : OKR.overallProgress >= 50 ? '#eab308' : '#ef4444' })}
          ${MetricCard({ title: t('okr.totalObjectives'), value: formatNumber(OKR.companyOKRs.length), icon: 'flag', iconBg: '#3b82f6' })}
          ${MetricCard({ title: t('okr.completedKRs'), value: `${completedKRs}/${totalKRs}`, icon: 'check-circle', iconBg: '#22c55e' })}
          ${MetricCard({ title: t('okr.atRisk'), value: formatNumber(atRiskKRs), icon: 'alert-triangle', iconBg: '#ef4444' })}
        </div>
      </div>`;
  }

  // ── Tabs ──
  function buildTabs() {
    const tabs = [
      { key: 'company', label: t('okr.tabCompany') },
      { key: 'teams', label: t('okr.tabTeams') },
      { key: 'quarterly', label: t('okr.tabQuarterly') },
      { key: 'alignment', label: t('okr.tabAlignment') },
    ];
    return `
      <div class="tab-bar" style="margin-bottom:24px">
        ${tabs.map(tb => `
          <button class="tab-btn ${activeTab === tb.key ? 'active' : ''}" data-tab="${tb.key}">
            ${tb.label}
          </button>
        `).join('')}
      </div>
      <div id="okr-tab-content">${buildTabContent()}</div>`;
  }

  function buildTabContent() {
    switch (activeTab) {
      case 'company': return buildCompanyTab();
      case 'teams': return buildTeamsTab();
      case 'quarterly': return buildQuarterlyTab();
      case 'alignment': return buildAlignmentTab();
      default: return '';
    }
  }

  // ── Company OKRs Tab ──
  function buildCompanyTab() {
    return `
      <div class="stagger">
        ${OKR.companyOKRs.map(okr => {
          const avgProgress = okr.keyResults.length > 0
            ? Math.round(okr.keyResults.reduce((s, kr) => s + kr.progress, 0) / okr.keyResults.length)
            : 0;
          const statusColor = avgProgress >= 70 ? 'var(--color-success)' : avgProgress >= 50 ? 'var(--color-warning)' : 'var(--color-danger)';

          return `
            <div class="card" style="margin-bottom:16px">
              <div class="flex-between" style="margin-bottom:16px">
                <div>
                  <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
                    <span class="badge" style="background:${statusColor}20;color:${statusColor};font-weight:700">${okr.id}</span>
                    <h3 style="margin:0;font-size:1rem">${lang === 'en' ? okr.objectiveEn : okr.objective}</h3>
                  </div>
                  <div style="font-size:.75rem;color:var(--text-muted)">Owner: ${okr.owner}</div>
                </div>
                <div style="text-align:right">
                  <div style="font-size:1.5rem;font-weight:700;color:${statusColor}">${avgProgress}%</div>
                </div>
              </div>

              <div style="display:flex;flex-direction:column;gap:12px">
                ${okr.keyResults.map(kr => {
                  const krColor = kr.progress >= 70 ? 'var(--color-success)' : kr.progress >= 50 ? 'var(--color-warning)' : 'var(--color-danger)';
                  const currentFormatted = kr.unit === '฿'
                    ? `฿${(kr.current / 1000000).toFixed(1)}M`
                    : kr.unit === '%' || kr.unit === 'ms' || kr.unit === 'x'
                      ? `${kr.current}${kr.unit}`
                      : formatNumber(kr.current);
                  const targetFormatted = kr.unit === '฿'
                    ? `฿${(kr.target / 1000000).toFixed(1)}M`
                    : kr.unit === '%' || kr.unit === 'ms' || kr.unit === 'x'
                      ? `${kr.target}${kr.unit}`
                      : formatNumber(kr.target);

                  return `
                    <div style="padding:12px;background:var(--bg-base);border-radius:var(--radius-md)">
                      <div class="flex-between" style="margin-bottom:6px">
                        <div style="display:flex;align-items:center;gap:8px">
                          <span style="font-size:.75rem;color:var(--text-muted);font-weight:600">${kr.id}</span>
                          <span style="font-size:.85rem">${lang === 'en' ? kr.textEn : kr.text}</span>
                        </div>
                        <span style="font-size:.85rem;font-weight:600;color:${krColor}">${kr.progress}%</span>
                      </div>
                      <div class="progress-bar" style="margin-bottom:4px">
                        <div class="progress-fill" style="width:${kr.progress}%;background:${krColor}"></div>
                      </div>
                      <div style="font-size:.7rem;color:var(--text-muted)">${t('okr.current')}: ${currentFormatted} / ${t('okr.target')}: ${targetFormatted}</div>
                    </div>`;
                }).join('')}
              </div>
            </div>`;
        }).join('')}
      </div>

      <div class="card" style="margin-top:16px">
        ${SectionHeader(t('okr.progressChart'))}
        <div id="chart-okr-progress" style="min-height:300px"></div>
      </div>`;
  }

  // ── Teams Tab ──
  function buildTeamsTab() {
    return `
      <div class="grid grid-2 stagger">
        ${OKR.teamOKRs.map(team => `
          <div class="card">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:16px">
              <div style="width:32px;height:32px;border-radius:8px;background:${team.color}20;display:flex;align-items:center;justify-content:center">
                <i data-lucide="${team.icon}" style="width:18px;height:18px;color:${team.color}"></i>
              </div>
              <h3 style="margin:0;font-size:1rem">${lang === 'en' ? team.teamEn : team.team}</h3>
            </div>

            ${team.objectives.map(obj => {
              const avgP = obj.keyResults.length > 0
                ? Math.round(obj.keyResults.reduce((s, kr) => s + kr.progress, 0) / obj.keyResults.length) : 0;
              return `
                <div style="margin-bottom:12px">
                  <div class="flex-between" style="margin-bottom:8px">
                    <span style="font-size:.85rem;font-weight:500">${lang === 'en' ? obj.textEn : obj.text}</span>
                    <span style="font-size:.85rem;font-weight:600;color:${avgP >= 70 ? 'var(--color-success)' : 'var(--color-warning)'}">${avgP}%</span>
                  </div>
                  ${obj.keyResults.map(kr => `
                    <div style="margin-bottom:8px;padding-left:12px">
                      <div class="flex-between" style="margin-bottom:4px">
                        <span style="font-size:.8rem;color:var(--text-secondary)">${lang === 'en' ? kr.textEn : kr.text}</span>
                        <span style="font-size:.75rem;font-weight:600">${kr.progress}%</span>
                      </div>
                      <div class="progress-bar" style="height:4px">
                        <div class="progress-fill" style="width:${kr.progress}%;background:${team.color}"></div>
                      </div>
                    </div>
                  `).join('')}
                </div>`;
            }).join('')}
          </div>
        `).join('')}
      </div>`;
  }

  // ── Quarterly Tab ──
  function buildQuarterlyTab() {
    return `
      <div class="stagger">
        ${OKR.quarterly.map(q => {
          const color = q.status === 'on_track' ? 'var(--color-success)' : q.status === 'pending' ? 'var(--text-muted)' : 'var(--color-warning)';
          return `
            <div class="card" style="margin-bottom:16px">
              <div class="flex-between" style="margin-bottom:12px">
                <div style="display:flex;align-items:center;gap:12px">
                  <span style="font-size:1.25rem;font-weight:700;color:${color}">${q.quarter}</span>
                  <span class="badge" style="background:${color}20;color:${color}">${q.status === 'on_track' ? 'On Track' : q.status === 'pending' ? 'Pending' : 'At Risk'}</span>
                </div>
                <div style="font-size:1.5rem;font-weight:700;color:${color}">${q.progress}%</div>
              </div>
              <div class="progress-bar" style="margin-bottom:12px">
                <div class="progress-fill" style="width:${q.progress}%;background:${color}"></div>
              </div>
              <div style="font-size:.85rem;color:var(--text-secondary)">
                ${lang === 'en' ? q.highlights : q.highlightsTh}
              </div>
            </div>`;
        }).join('')}
      </div>

      <div class="card" style="margin-top:16px">
        ${SectionHeader(t('okr.quarterlyChart'))}
        <div id="chart-quarterly" style="min-height:300px"></div>
      </div>`;
  }

  // ── Alignment Tab ──
  function buildAlignmentTab() {
    return `
      <div class="card">
        ${SectionHeader(t('okr.alignmentView'))}
        <div style="font-size:.85rem;color:var(--text-secondary);margin-bottom:16px">
          ${t('okr.alignmentDesc')}
        </div>

        ${OKR.companyOKRs.map(co => {
          // Find teams aligned to this objective
          const alignedTeams = OKR.teamOKRs.filter(team =>
            team.objectives.some(o => {
              // Simple alignment check by matching keywords
              return true;
            })
          );

          const avgProgress = co.keyResults.length > 0
            ? Math.round(co.keyResults.reduce((s, kr) => s + kr.progress, 0) / co.keyResults.length)
            : 0;
          const color = avgProgress >= 70 ? 'var(--color-success)' : avgProgress >= 50 ? 'var(--color-warning)' : 'var(--color-danger)';

          return `
            <div style="margin-bottom:24px;padding:16px;background:var(--bg-base);border-radius:var(--radius-md);border-left:4px solid ${color}">
              <div class="flex-between" style="margin-bottom:8px">
                <div>
                  <span class="badge" style="background:${color}20;color:${color};font-weight:700">${co.id}</span>
                  <span style="font-size:.9rem;font-weight:600;margin-left:8px">${lang === 'en' ? co.objectiveEn : co.objective}</span>
                </div>
                <span style="font-size:1rem;font-weight:700;color:${color}">${avgProgress}%</span>
              </div>

              <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:12px">
                ${OKR.teamOKRs.map(team => `
                  <div style="display:flex;align-items:center;gap:6px;padding:4px 10px;background:${team.color}15;border-radius:var(--radius-sm)">
                    <i data-lucide="${team.icon}" style="width:14px;height:14px;color:${team.color}"></i>
                    <span style="font-size:.75rem;font-weight:500;color:${team.color}">${lang === 'en' ? team.teamEn : team.team}</span>
                  </div>
                `).join('')}
              </div>
            </div>`;
        }).join('')}
      </div>`;
  }

  // ── Init Charts ──
  function initCharts() {
    if (typeof ApexCharts === 'undefined') return;

    if (activeTab === 'company') {
      const krLabels = [];
      const krValues = [];
      const krColors = [];
      OKR.companyOKRs.forEach(o => {
        o.keyResults.forEach(kr => {
          krLabels.push(kr.id);
          krValues.push(kr.progress);
          krColors.push(kr.progress >= 70 ? '#22c55e' : kr.progress >= 50 ? '#eab308' : '#ef4444');
        });
      });

      createChart('chart-okr-progress', {
        chart: { type: 'bar', height: 300 },
        series: [{ name: t('okr.progress'), data: krValues }],
        xaxis: { categories: krLabels },
        colors: krColors,
        plotOptions: {
          bar: {
            borderRadius: 4,
            columnWidth: '50%',
            distributed: true,
          },
        },
        legend: { show: false },
        yaxis: { max: 100, labels: { formatter: v => v + '%' } },
        annotations: {
          yaxis: [
            { y: 70, borderColor: '#22c55e', strokeDashArray: 4, label: { text: '70%', style: { color: '#22c55e' } } },
          ],
        },
      });
    }

    if (activeTab === 'quarterly') {
      createChart('chart-quarterly', {
        chart: { type: 'bar', height: 300 },
        series: [{ name: t('okr.progress'), data: OKR.quarterly.map(q => q.progress) }],
        xaxis: { categories: OKR.quarterly.map(q => q.quarter) },
        colors: ['#6366f1'],
        plotOptions: { bar: { borderRadius: 6, columnWidth: '40%' } },
        yaxis: { max: 100, labels: { formatter: v => v + '%' } },
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
