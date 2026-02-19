// ============================================
// EasySlip 2026 — Cost Management (Redesigned)
// Tab-based workflow: Budget → Actual → Compare → Charts
// Category cards instead of monolithic tables
// ============================================

import {
  BUDGET, getActual, getVariance, getActualRevenueTotal, getLastSaved,
  exportBudgetData, importBudgetData,
  saveBudget, resetBudget, recalcBudget, recalcBudgetFromDetails, getLastSavedBudget,
} from '../data/budget-actual.js';
import {
  EXPENSES, CATEGORY_KEYS, TOTAL_MONTHLY_COST,
  recalcExpenses, saveExpenses, resetExpenses, zeroExpenses, getLastSavedExpenses, getAnnualByCategory,
  SUB_ITEM_DEFS, EXPENSE_DETAILS, recalcFromDetails, DETAILED_CATEGORIES, SIMPLE_CATEGORIES,
  getCategorySchema, getCategoryColor,
  addCategory, removeCategory, renameCategory, setCategoryColor,
  addSubItem, removeSubItem, renameSubItem,
  ANOMALIES, getCategoryStats,
} from '../data/expenses.js';
import { EXPENSE_CATEGORIES } from '../data/constants.js';
import { SCENARIOS, getScenarioComparison, getSavingsVsActual } from '../data/system-budget.js';
import { createChart, updateChart, destroyAllCharts } from '../components/charts.js';
import { AlertCard } from '../components/cards.js';
import { DataTable } from '../components/tables.js';
import { showToast } from '../components/toast.js';
import { openModal, closeModal } from '../components/modal.js';
import { setPageTitle, formatBaht, formatBahtCompact, formatPercent, formatPercentSigned, downloadCSV, sum, debounce } from '../utils.js';
import { t, getMonths, localized } from '../i18n.js';
import {
  formatInputDisplay as _formatInputDisplay,
  parseInputValue as _parseInputValue,
  formatLastSaved,
  updateUndoButton as _updateUndoButton,
  updateSaveIndicator as _updateSaveIndicator,
  reformatInput,
  createAutoSave,
} from '../shared/editable-page.js';

function getCostCats() { return EXPENSE_CATEGORIES.map(c => ({ key: c.key, label: c.label, labelEn: c.labelEn, color: c.color })); }
function getCatColors() { return CATEGORY_KEYS.map(key => getCategoryColor(key)); }

export function render(container) {
  setPageTitle(t('page.costMgmt.title'));

  const months = getMonths();
  const COST_CATS = getCostCats();
  const costKeys = COST_CATS.map(c => c.key);

  let undoBuffer = null;
  let isDirty = false;

  // Active main tab (persisted in sessionStorage)
  const TAB_KEY = 'costmgmt_active_tab';
  let activeMainTab = sessionStorage.getItem(TAB_KEY) || 'budget';
  let activeScenario = 'actual';

  function formatInputDisplay(v) { return _formatInputDisplay(v); }
  function parseInputValue(s) { return _parseInputValue(s); }

  function getCostCatLabel(cat) { return localized(cat, 'label'); }

  const detailedSet = new Set(DETAILED_CATEGORIES);

  // Overflow menu close handler (stored for cleanup)
  function closeOverflowMenu() {
    const menu = container.querySelector('#cm-overflow-menu');
    if (menu) menu.style.display = 'none';
  }

  // ── Unified snapshot for undo (budget + expenses + details) ──

  function snapshotAll() {
    const budgetCost = {};
    for (const k of costKeys) budgetCost[k] = [...BUDGET.cost[k]];
    const budgetDetails = {};
    for (const cat of DETAILED_CATEGORIES) {
      if (BUDGET.costDetails[cat]) {
        budgetDetails[cat] = {};
        for (const sub of Object.keys(BUDGET.costDetails[cat])) {
          budgetDetails[cat][sub] = [...BUDGET.costDetails[cat][sub]];
        }
      }
    }
    const expenses = {};
    for (const k of CATEGORY_KEYS) expenses[k] = [...EXPENSES[k]];
    const details = {};
    for (const cat of DETAILED_CATEGORIES) {
      details[cat] = {};
      if (SUB_ITEM_DEFS[cat]) {
        for (const item of SUB_ITEM_DEFS[cat].items) {
          if (EXPENSE_DETAILS[cat]?.[item.key]) details[cat][item.key] = [...EXPENSE_DETAILS[cat][item.key]];
        }
      }
    }
    return { budgetCost, budgetDetails, expenses, details };
  }

  function restoreSnapshot(snap) {
    for (const k of costKeys) {
      if (snap.budgetCost[k]) for (let i = 0; i < 12; i++) BUDGET.cost[k][i] = snap.budgetCost[k][i];
    }
    if (snap.budgetDetails) {
      for (const cat of Object.keys(snap.budgetDetails)) {
        if (!BUDGET.costDetails[cat]) BUDGET.costDetails[cat] = {};
        for (const sub of Object.keys(snap.budgetDetails[cat])) {
          BUDGET.costDetails[cat][sub] = [...snap.budgetDetails[cat][sub]];
        }
      }
    }
    for (const k of Object.keys(snap.expenses)) {
      if (EXPENSES[k]) for (let i = 0; i < 12; i++) EXPENSES[k][i] = snap.expenses[k][i];
    }
    for (const cat of Object.keys(snap.details)) {
      if (EXPENSE_DETAILS[cat]) {
        for (const sub of Object.keys(snap.details[cat])) {
          if (EXPENSE_DETAILS[cat][sub]) {
            for (let i = 0; i < 12; i++) EXPENSE_DETAILS[cat][sub][i] = snap.details[cat][sub][i];
          }
        }
      }
    }
    recalcBudget();
    recalcExpenses();
  }

  // ── Auto-save both ──

  function saveAll() {
    saveBudget();
    saveExpenses();
  }

  const autoSaveDebounced = createAutoSave({
    saveFn: () => { undoBuffer = snapshotAll(); saveAll(); },
    setDirty: (v) => { isDirty = v; },
    updateIndicator: () => updateSummaryBar(),
  });

  const updateChartDebounced = debounce(() => updateAllCharts(), 2000);

  // ── Helpers ──

  function getStatusBadge(pct) {
    const abs = Math.abs(pct);
    if (abs <= 5) return `<span class="badge badge-success">${t('status.onTrack')}</span>`;
    if (abs <= 15) return `<span class="badge badge-warning">${t('status.warning')}</span>`;
    return `<span class="badge badge-danger">${t('status.critical')}</span>`;
  }

  function getVarianceBadgeInline(budgetVal, actualVal) {
    if (actualVal === 0) return '';
    const pct = budgetVal > 0 ? ((actualVal - budgetVal) / budgetVal) * 100 : 0;
    const color = pct <= 0 ? 'var(--color-success, #22c55e)' : pct <= 15 ? 'var(--color-warning, #f59e0b)' : 'var(--color-danger, #ef4444)';
    return `<span style="font-size:.75rem;font-weight:600;color:${color};margin-left:8px">${formatPercentSigned(pct)}</span>`;
  }

  // ── Summary Bar ──

  function buildSummaryBar() {
    const budgetTotal = BUDGET.annualCost;
    const actualTotal = sum(TOTAL_MONTHLY_COST);
    const varPct = budgetTotal > 0 ? ((actualTotal - budgetTotal) / budgetTotal) * 100 : 0;
    const varColor = varPct <= 0 ? 'var(--color-success, #22c55e)' : varPct <= 15 ? 'var(--color-warning, #f59e0b)' : 'var(--color-danger, #ef4444)';
    const budgetSavedStr = formatLastSaved(getLastSavedBudget());
    const expSavedStr = formatLastSaved(getLastSavedExpenses());
    const lastSavedStr = budgetSavedStr || expSavedStr;

    return `
      <div id="cm-summary-bar" style="position:sticky;top:var(--header-height);z-index:40;background:var(--bg-surface);margin:0 -32px 24px;padding:14px 32px;border-bottom:1px solid var(--border-default);box-shadow:var(--shadow-sm)">
        <div style="display:flex;align-items:center;gap:24px;flex-wrap:wrap">
          <div style="display:flex;gap:24px;flex:1;min-width:0;flex-wrap:wrap">
            <div>
              <div style="font-size:.7rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px">${t('summary.budgetTotal')}</div>
              <div id="cm-summary-budget" style="font-size:1.1rem;font-weight:700">${formatBahtCompact(budgetTotal)}</div>
            </div>
            <div>
              <div style="font-size:.7rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px">${t('summary.actualTotal')}</div>
              <div id="cm-summary-actual" style="font-size:1.1rem;font-weight:700">${formatBahtCompact(actualTotal)}</div>
            </div>
            <div>
              <div style="font-size:.7rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px">${t('summary.variance')}</div>
              <div id="cm-summary-variance" style="font-size:1.1rem;font-weight:700;color:${varColor}">
                ${actualTotal > 0 ? formatPercentSigned(varPct) : '—'}
                ${actualTotal > 0 && Math.abs(varPct) <= 5 ? ` <span style="font-size:.75rem">${t('status.onTrack')}</span>` : ''}
              </div>
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
            <button class="btn btn-primary btn-sm" id="btn-save-all">
              <i data-lucide="save" style="width:14px;height:14px"></i> ${t('btn.saveAll')}
            </button>
            <button class="btn btn-secondary btn-sm" id="btn-undo" disabled style="opacity:0.5;cursor:not-allowed">
              <i data-lucide="undo-2" style="width:14px;height:14px"></i> ${t('btn.undo')}
            </button>
            <div style="position:relative;display:inline-block">
              <button class="btn btn-secondary btn-sm" id="btn-overflow" title="${t('btn.more')}">
                <i data-lucide="more-horizontal" style="width:14px;height:14px"></i>
              </button>
              <div id="cm-overflow-menu" style="display:none;position:absolute;right:0;top:100%;margin-top:4px;background:var(--bg-surface);border:1px solid var(--border-default);border-radius:var(--radius-md);box-shadow:var(--shadow-md);min-width:180px;z-index:50;padding:4px 0">
                <button class="overflow-item" id="btn-export-csv" style="display:flex;align-items:center;gap:8px;width:100%;padding:8px 16px;border:none;background:none;color:var(--text-primary);cursor:pointer;font-size:.85rem;text-align:left">
                  <i data-lucide="file-spreadsheet" style="width:14px;height:14px"></i> ${t('btn.exportCsv')}
                </button>
                <button class="overflow-item" id="btn-export-json" style="display:flex;align-items:center;gap:8px;width:100%;padding:8px 16px;border:none;background:none;color:var(--text-primary);cursor:pointer;font-size:.85rem;text-align:left">
                  <i data-lucide="download" style="width:14px;height:14px"></i> ${t('btn.exportJson')}
                </button>
                <button class="overflow-item" id="btn-import-json" style="display:flex;align-items:center;gap:8px;width:100%;padding:8px 16px;border:none;background:none;color:var(--text-primary);cursor:pointer;font-size:.85rem;text-align:left">
                  <i data-lucide="upload" style="width:14px;height:14px"></i> ${t('btn.importJson')}
                </button>
                <button class="overflow-item" id="btn-manage-categories" style="display:flex;align-items:center;gap:8px;width:100%;padding:8px 16px;border:none;background:none;color:var(--text-primary);cursor:pointer;font-size:.85rem;text-align:left">
                  <i data-lucide="settings" style="width:14px;height:14px"></i> ${t('modal.manageCategories')}
                </button>
              </div>
            </div>
            <span id="cm-save-indicator" class="save-indicator" style="font-size:.7rem;color:var(--text-muted)">${isDirty ? t('status.unsaved') : (lastSavedStr ? `${t('status.lastSaved')}: ${lastSavedStr}` : '')}</span>
          </div>
        </div>
      </div>
      <input type="file" id="import-file" accept=".json" style="display:none">`;
  }

  function updateSummaryBar() {
    const budgetTotal = BUDGET.annualCost;
    const actualTotal = sum(TOTAL_MONTHLY_COST);
    const varPct = budgetTotal > 0 ? ((actualTotal - budgetTotal) / budgetTotal) * 100 : 0;
    const varColor = varPct <= 0 ? 'var(--color-success, #22c55e)' : varPct <= 15 ? 'var(--color-warning, #f59e0b)' : 'var(--color-danger, #ef4444)';

    const bEl = container.querySelector('#cm-summary-budget');
    if (bEl) bEl.textContent = formatBahtCompact(budgetTotal);
    const aEl = container.querySelector('#cm-summary-actual');
    if (aEl) aEl.textContent = formatBahtCompact(actualTotal);
    const vEl = container.querySelector('#cm-summary-variance');
    if (vEl) {
      vEl.style.color = varColor;
      vEl.textContent = actualTotal > 0 ? formatPercentSigned(varPct) + (Math.abs(varPct) <= 5 ? ` ${t('status.onTrack')}` : '') : '—';
    }

    _updateUndoButton(container, undoBuffer);
    _updateSaveIndicator(container, {
      selector: '#cm-save-indicator',
      isDirty,
      getLastSaved: () => getLastSavedBudget() || getLastSavedExpenses(),
    });
  }

  // ── Main Tabs ──

  function buildMainTabs() {
    const tabs = [
      { key: 'budget', icon: 'target', label: `① ${t('tab.budget')}` },
      { key: 'actual', icon: 'pencil', label: `② ${t('tab.actual')}` },
      { key: 'compare', icon: 'bar-chart-3', label: `③ ${t('tab.compare')}` },
      { key: 'charts', icon: 'line-chart', label: `④ ${t('tab.charts')}` },
    ];
    return `
      <div class="tab-group" id="cm-main-tabs" style="margin-bottom:24px">
        ${tabs.map(tab => `<button class="tab-btn${tab.key === activeMainTab ? ' active' : ''}" data-main-tab="${tab.key}">${tab.label}</button>`).join('')}
      </div>`;
  }

  function switchMainTab(tab) {
    activeMainTab = tab;
    sessionStorage.setItem(TAB_KEY, tab);
    container.querySelectorAll('#cm-main-tabs .tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.mainTab === tab);
    });
    destroyAllCharts();
    const tc = container.querySelector('#cm-tab-content');
    if (tc) {
      tc.innerHTML = buildTabContent();
      if (typeof lucide !== 'undefined') lucide.createIcons({ nodes: [tc] });
      if (tab === 'charts') initCharts();
      if (tab === 'compare') initCompareCharts();
    }
  }

  // ── Tab Content Builders ──

  function buildTabContent() {
    switch (activeMainTab) {
      case 'budget': return buildBudgetCards();
      case 'actual': return buildActualCards();
      case 'compare': return buildCompareCards();
      case 'charts': return buildChartsTab();
      default: return buildBudgetCards();
    }
  }

  // ── Budget Tab: Category Cards ──

  function buildBudgetCards() {
    return COST_CATS.map(cat => buildBudgetCategoryCard(cat)).join('');
  }

  function buildBudgetCategoryCard(cat) {
    const isDetailed = detailedSet.has(cat.key);
    const annualBudget = sum(BUDGET.cost[cat.key]);

    if (isDetailed) {
      const def = SUB_ITEM_DEFS[cat.key];
      const subs = BUDGET.costDetails[cat.key];
      if (!def || !subs) return buildSimpleBudgetCard(cat, annualBudget);

      return `
        <div class="card" style="margin-bottom:16px;border-left:4px solid ${cat.color}">
          <div class="card-header" style="padding-bottom:12px">
            <span class="card-title" style="display:flex;align-items:center;gap:8px">
              <span style="width:10px;height:10px;border-radius:50%;background:${cat.color};display:inline-block"></span>
              ${t('cat.' + cat.key + '.full')}
              <button class="btn btn-secondary btn-sm" data-manage-sub="${cat.key}" title="${t('modal.manageSubItems')}" style="margin-left:4px;padding:2px 6px">
                <i data-lucide="list" style="width:12px;height:12px"></i>
              </button>
            </span>
            <span style="font-size:.85rem;color:var(--text-muted)">${t('card.annualBudget')}: <strong>${formatBahtCompact(annualBudget)}</strong></span>
          </div>
          <div class="data-table-wrapper">
            <table class="data-table data-table-dense">
              <thead><tr>
                <th>${t('th.month')}</th>
                ${def.items.map(item => `<th class="text-right">${t('sub.' + cat.key + '.' + item.key)}</th>`).join('')}
                <th class="text-right">${t('th.total')}</th>
              </tr></thead>
              <tbody>
                ${months.map((m, i) => `<tr>
                  <td>${m}</td>
                  ${def.items.map(item => `<td class="text-right">
                    <input type="text" inputmode="numeric" class="ba-input"
                           data-input-type="budget-detail" data-cat="${cat.key}" data-sub="${item.key}" data-month="${i}"
                           value="${formatInputDisplay(subs[item.key]?.[i] ?? 0)}" placeholder="0">
                  </td>`).join('')}
                  <td class="text-right" data-card-row-total="budget-${cat.key}-${i}"><strong>${formatBaht(BUDGET.cost[cat.key][i])}</strong></td>
                </tr>`).join('')}
              </tbody>
              <tfoot><tr class="total-row">
                <td><strong>${t('th.total')}</strong></td>
                ${def.items.map(item => `<td class="text-right" data-card-sub-total="budget-${cat.key}-${item.key}">${formatBaht((subs[item.key] ?? []).reduce((a, b) => a + b, 0))}</td>`).join('')}
                <td class="text-right" data-card-cat-total="budget-${cat.key}"><strong>${formatBaht(annualBudget)}</strong></td>
              </tr></tfoot>
            </table>
          </div>
        </div>`;
    }

    return buildSimpleBudgetCard(cat, annualBudget);
  }

  function buildSimpleBudgetCard(cat, annualBudget) {
    return `
      <div class="card" style="margin-bottom:16px;border-left:4px solid ${cat.color}">
        <div class="card-header" style="padding-bottom:12px">
          <span class="card-title" style="display:flex;align-items:center;gap:8px">
            <span style="width:10px;height:10px;border-radius:50%;background:${cat.color};display:inline-block"></span>
            ${t('cat.' + cat.key + '.full')}
          </span>
          <span style="font-size:.85rem;color:var(--text-muted)">${t('card.annualBudget')}: <strong>${formatBahtCompact(annualBudget)}</strong></span>
        </div>
        <div class="data-table-wrapper">
          <table class="data-table data-table-dense">
            <thead><tr>
              <th>${t('th.month')}</th>
              <th class="text-right">${t('card.target')}</th>
            </tr></thead>
            <tbody>
              ${months.map((m, i) => `<tr>
                <td>${m}</td>
                <td class="text-right">
                  <input type="text" inputmode="numeric" class="ba-input"
                         data-input-type="budget-simple" data-cat="${cat.key}" data-month="${i}"
                         value="${formatInputDisplay(BUDGET.cost[cat.key][i])}" placeholder="0">
                </td>
              </tr>`).join('')}
            </tbody>
            <tfoot><tr class="total-row">
              <td><strong>${t('th.total')}</strong></td>
              <td class="text-right" data-card-cat-total="budget-${cat.key}"><strong>${formatBaht(annualBudget)}</strong></td>
            </tr></tfoot>
          </table>
        </div>
      </div>`;
  }

  // ── Actual Tab: Category Cards ──

  function buildActualCards() {
    return COST_CATS.map(cat => buildActualCategoryCard(cat)).join('');
  }

  function buildActualCategoryCard(cat) {
    const isDetailed = detailedSet.has(cat.key);
    const annualBudget = sum(BUDGET.cost[cat.key]);
    const annualActual = sum(EXPENSES[cat.key]);

    const headerMeta = `
      <span style="font-size:.8rem;color:var(--text-muted);display:flex;align-items:center;gap:12px;flex-wrap:wrap">
        <span>${t('card.target')}: <strong>${formatBahtCompact(annualBudget)}</strong></span>
        <span>${t('card.actual')}: <strong>${formatBahtCompact(annualActual)}</strong></span>
        ${getVarianceBadgeInline(annualBudget, annualActual)}
        ${annualBudget > 0 ? `<span style="display:inline-flex;align-items:center;gap:4px"><span class="progress-bar" style="width:60px;height:6px;display:inline-block"><span class="progress-fill ${annualActual > annualBudget ? 'danger' : ''}" style="width:${Math.min(annualActual / annualBudget * 100, 100)}%"></span></span></span>` : ''}
      </span>`;

    if (isDetailed) {
      const def = SUB_ITEM_DEFS[cat.key];
      const subs = EXPENSE_DETAILS[cat.key];
      if (!def || !subs) return buildSimpleActualCard(cat, headerMeta);

      return `
        <div class="card" style="margin-bottom:16px;border-left:4px solid ${cat.color}">
          <div class="card-header" style="padding-bottom:12px">
            <span class="card-title" style="display:flex;align-items:center;gap:8px">
              <span style="width:10px;height:10px;border-radius:50%;background:${cat.color};display:inline-block"></span>
              ${t('cat.' + cat.key + '.full')}
            </span>
            ${headerMeta}
          </div>
          <div class="data-table-wrapper">
            <table class="data-table data-table-dense">
              <thead><tr>
                <th>${t('th.month')}</th>
                ${def.items.map(item => `<th class="text-right">${t('sub.' + cat.key + '.' + item.key)}</th>`).join('')}
                <th class="text-right">${t('th.total')}</th>
              </tr></thead>
              <tbody>
                ${months.map((m, i) => `<tr>
                  <td>${m}</td>
                  ${def.items.map(item => `<td class="text-right">
                    <input type="text" inputmode="numeric" class="ba-input"
                           data-input-type="actual-detail" data-cat="${cat.key}" data-sub="${item.key}" data-month="${i}"
                           value="${formatInputDisplay(subs[item.key]?.[i] ?? 0)}" placeholder="0">
                  </td>`).join('')}
                  <td class="text-right" data-card-row-total="actual-${cat.key}-${i}"><strong>${formatBaht(EXPENSES[cat.key][i])}</strong></td>
                </tr>`).join('')}
              </tbody>
              <tfoot><tr class="total-row">
                <td><strong>${t('th.total')}</strong></td>
                ${def.items.map(item => `<td class="text-right" data-card-sub-total="actual-${cat.key}-${item.key}">${formatBaht((subs[item.key] ?? []).reduce((a, b) => a + b, 0))}</td>`).join('')}
                <td class="text-right" data-card-cat-total="actual-${cat.key}"><strong>${formatBaht(annualActual)}</strong></td>
              </tr></tfoot>
            </table>
          </div>
        </div>`;
    }

    return buildSimpleActualCard(cat, headerMeta);
  }

  function buildSimpleActualCard(cat, headerMeta) {
    const annualActual = sum(EXPENSES[cat.key]);
    return `
      <div class="card" style="margin-bottom:16px;border-left:4px solid ${cat.color}">
        <div class="card-header" style="padding-bottom:12px">
          <span class="card-title" style="display:flex;align-items:center;gap:8px">
            <span style="width:10px;height:10px;border-radius:50%;background:${cat.color};display:inline-block"></span>
            ${t('cat.' + cat.key + '.full')}
          </span>
          ${headerMeta}
        </div>
        <div class="data-table-wrapper">
          <table class="data-table data-table-dense">
            <thead><tr>
              <th>${t('th.month')}</th>
              <th class="text-right">${t('card.actual')}</th>
            </tr></thead>
            <tbody>
              ${months.map((m, i) => `<tr>
                <td>${m}</td>
                <td class="text-right">
                  <input type="text" inputmode="numeric" class="ba-input"
                         data-input-type="actual-simple" data-cat="${cat.key}" data-month="${i}"
                         value="${formatInputDisplay(EXPENSES[cat.key][i])}" placeholder="0">
                </td>
              </tr>`).join('')}
            </tbody>
            <tfoot><tr class="total-row">
              <td><strong>${t('th.total')}</strong></td>
              <td class="text-right" data-card-cat-total="actual-${cat.key}"><strong>${formatBaht(annualActual)}</strong></td>
            </tr></tfoot>
          </table>
        </div>
      </div>`;
  }

  // ── Compare Tab ──

  function buildCompareCards() {
    const actualTotal = sum(TOTAL_MONTHLY_COST);
    const hasAnyData = actualTotal > 0;

    // Empty state: no actual data at all
    if (!hasAnyData) return buildCompareEmptyState();

    // Section 1: Category Overview Tiles
    let html = `<h3 class="section-title">${t('compare.categoryOverview')}</h3>`;
    html += `<div class="grid grid-3" style="margin-bottom:24px">${COST_CATS.map(cat => buildCompareTile(cat)).join('')}</div>`;

    // Section 2: Variance Heatmap
    html += `<h3 class="section-title">${t('compare.varianceHeatmap')}</h3>`;
    html += `
      <div class="card" style="margin-bottom:24px">
        <div class="card-header" style="padding-bottom:8px">
          <span class="card-title">${t('compare.heatmapTitle')}</span>
          <div style="display:flex;gap:12px;font-size:.6rem;color:var(--text-muted)">
            <span><span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:#22c55e;margin-right:3px;vertical-align:middle"></span>${t('compare.underBudget')}</span>
            <span><span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:#eab308;margin-right:3px;vertical-align:middle"></span>${t('compare.nearTarget')}</span>
            <span><span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:#ef4444;margin-right:3px;vertical-align:middle"></span>${t('compare.overBudget')}</span>
            <span><span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:rgba(148,163,184,.15);margin-right:3px;vertical-align:middle"></span>${t('compare.noData')}</span>
          </div>
        </div>
        <div id="cm-compare-heatmap" class="chart-container" style="min-height:260px"></div>
      </div>`;

    // Section 3: Collapsible Accordions
    html += `<h3 class="section-title">${t('compare.detailedBreakdown')}</h3>`;
    html += buildCompareAccordion('total', t('summary.allCategories'), 'var(--color-accent, #6366f1)', BUDGET.costTotal, TOTAL_MONTHLY_COST);
    html += COST_CATS.map(cat => buildCompareAccordion(cat.key, t('cat.' + cat.key + '.full'), cat.color, BUDGET.cost[cat.key], EXPENSES[cat.key])).join('');

    return html;
  }

  // ── Empty State ──

  function buildCompareEmptyState() {
    return `
      <div class="card" style="text-align:center;padding:48px 24px;margin:24px 0">
        <div style="margin-bottom:16px">
          <i data-lucide="bar-chart-3" style="width:48px;height:48px;color:var(--text-muted);opacity:0.4"></i>
        </div>
        <div style="font-size:1rem;font-weight:600;margin-bottom:8px;color:var(--text-primary)">${t('compare.noDataYet')}</div>
        <div style="font-size:.8rem;color:var(--text-muted);margin-bottom:20px;max-width:420px;margin-left:auto;margin-right:auto">${t('compare.noDataHint')}</div>
        <div style="display:flex;justify-content:center;gap:12px;flex-wrap:wrap;margin-bottom:24px">
          ${COST_CATS.map(cat => `
            <div style="text-align:center;padding:10px 14px;background:var(--bg-base);border-radius:var(--radius-md);border:1px solid var(--border-default);min-width:110px">
              <div style="display:flex;align-items:center;justify-content:center;gap:4px;margin-bottom:4px">
                <span style="width:6px;height:6px;border-radius:50%;background:${cat.color};display:inline-block"></span>
                <span style="font-size:.6rem;color:var(--text-muted);text-transform:uppercase">${getCostCatLabel(cat)}</span>
              </div>
              <div style="font-size:.85rem;font-weight:700">${formatBahtCompact(sum(BUDGET.cost[cat.key]))}</div>
              <div style="font-size:.55rem;color:var(--text-muted)">${t('compare.annualTarget')}</div>
            </div>
          `).join('')}
        </div>
        <button class="btn btn-primary btn-sm" data-main-tab="actual">
          <i data-lucide="pencil" style="width:14px;height:14px"></i> ${t('compare.goToActual')}
        </button>
      </div>`;
  }

  // ── Compare Tile (Section 1) ──

  function buildCompareTile(cat) {
    const annualBudget = sum(BUDGET.cost[cat.key]);
    const annualActual = sum(EXPENSES[cat.key]);
    const spendPct = annualBudget > 0 ? (annualActual / annualBudget) * 100 : 0;
    const varPct = annualBudget > 0 ? ((annualActual - annualBudget) / annualBudget) * 100 : 0;
    const varColor = varPct <= 0 ? 'var(--color-success, #22c55e)' : varPct <= 15 ? 'var(--color-warning, #f59e0b)' : 'var(--color-danger, #ef4444)';
    const hasData = annualActual > 0;

    return `
      <div class="card" style="border-left:4px solid ${cat.color};padding:14px 16px">
        <div style="display:flex;align-items:flex-start;gap:12px">
          <div style="flex:1;min-width:0">
            <div style="display:flex;align-items:center;gap:6px;margin-bottom:8px">
              <span style="width:8px;height:8px;border-radius:50%;background:${cat.color};display:inline-block;flex-shrink:0"></span>
              <span style="font-size:.7rem;font-weight:600;color:var(--text-secondary);text-transform:uppercase;letter-spacing:.04em;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${getCostCatLabel(cat)}</span>
            </div>
            <div style="font-size:.65rem;color:var(--text-muted);margin-bottom:2px">${t('card.target')}: <strong>${formatBahtCompact(annualBudget)}</strong></div>
            <div style="font-size:.65rem;color:var(--text-muted);margin-bottom:6px">${t('card.actual')}: <strong>${hasData ? formatBahtCompact(annualActual) : '—'}</strong></div>
            ${hasData ? `
              <div style="display:flex;align-items:center;gap:6px">
                <span style="font-size:.8rem;font-weight:700;color:${varColor}">${formatPercentSigned(varPct)}</span>
                ${getStatusBadge(varPct)}
              </div>
            ` : `<span class="badge badge-muted" style="font-size:.6rem">${t('status.pending')}</span>`}
          </div>
          <div id="cm-gauge-${cat.key}" style="width:76px;height:76px;flex-shrink:0"></div>
        </div>
      </div>`;
  }

  // ── Compare Accordion (Section 3) ──

  function buildCompareAccordion(key, label, color, budgetArr, actualArr) {
    const annualBudget = sum(budgetArr);
    const annualActual = sum(actualArr);
    const varPct = annualBudget > 0 ? ((annualActual - annualBudget) / annualBudget) * 100 : 0;
    const varColor = varPct <= 0 ? 'var(--color-success, #22c55e)' : varPct <= 15 ? 'var(--color-warning, #f59e0b)' : 'var(--color-danger, #ef4444)';
    const hasData = annualActual > 0;
    const catVar = getVariance(budgetArr, actualArr);

    // Count months with data
    const dataMonths = actualArr.filter(v => v > 0).length;
    const pendingMonths = 12 - dataMonths;

    return `
      <div class="collapsible-section collapsed">
        <div class="collapsible-header" style="border-left:4px solid ${color}">
          <i data-lucide="chevron-down" class="chevron"></i>
          <span class="section-title" style="margin-bottom:0;display:flex;align-items:center;gap:6px">
            ${key !== 'total' ? `<span style="width:8px;height:8px;border-radius:50%;background:${color};display:inline-block"></span>` : ''}
            ${label}
          </span>
          <span class="section-badge" style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
            <span>${t('card.target')}: <strong>${formatBahtCompact(annualBudget)}</strong></span>
            <span>${t('card.actual')}: <strong>${hasData ? formatBahtCompact(annualActual) : '—'}</strong></span>
            ${hasData
              ? `<span style="font-weight:700;color:${varColor}">${formatPercentSigned(varPct)}</span>${getStatusBadge(varPct)}`
              : `<span class="badge badge-muted">${t('status.pending')}</span>`}
          </span>
        </div>
        <div class="collapsible-body">
          <div class="data-table-wrapper">
            <table class="data-table data-table-dense">
              <thead><tr>
                <th>${t('th.month')}</th>
                <th class="text-right">${t('card.target')}</th>
                <th class="text-right">${t('card.actual')}</th>
                <th style="width:90px"></th>
                <th class="text-right">${t('th.variance')}</th>
                <th class="text-center">${t('th.status')}</th>
              </tr></thead>
              <tbody>
                ${months.map((m, i) => {
                  const v = catVar[i];
                  const hasMonthData = actualArr[i] > 0;
                  const fillPct = budgetArr[i] > 0 ? Math.min(actualArr[i] / budgetArr[i] * 100, 150) : 0;
                  const overBudget = actualArr[i] > budgetArr[i];
                  return `<tr>
                    <td>${m}</td>
                    <td class="text-right">${formatBaht(budgetArr[i])}</td>
                    <td class="text-right">${hasMonthData ? formatBaht(actualArr[i]) : '—'}</td>
                    <td>${hasMonthData ? `<div class="progress-bar" style="height:6px"><div class="progress-fill${overBudget ? ' danger' : ''}" style="width:${Math.min(fillPct, 100)}%"></div></div>` : ''}</td>
                    <td class="text-right ${v.pct < 0 ? 'text-success' : v.pct > 0 ? 'text-danger' : ''}">${hasMonthData ? formatPercentSigned(v.pct) : '—'}</td>
                    <td class="text-center">${hasMonthData ? getStatusBadge(v.pct) : `<span class="badge badge-muted" style="font-size:.55rem">${t('status.pending')}</span>`}</td>
                  </tr>`;
                }).join('')}
              </tbody>
              <tfoot><tr class="total-row">
                <td><strong>${t('th.total')}</strong></td>
                <td class="text-right"><strong>${formatBaht(annualBudget)}</strong></td>
                <td class="text-right"><strong>${hasData ? formatBaht(annualActual) : '—'}</strong></td>
                <td>${hasData ? `<div class="progress-bar" style="height:6px"><div class="progress-fill${annualActual > annualBudget ? ' danger' : ''}" style="width:${Math.min(annualActual / annualBudget * 100, 100)}%"></div></div>` : ''}</td>
                <td class="text-right ${varPct < 0 ? 'text-success' : varPct > 0 ? 'text-danger' : ''}"><strong>${hasData ? formatPercentSigned(varPct) : '—'}</strong></td>
                <td class="text-center">${hasData ? getStatusBadge(varPct) : `<span class="badge badge-muted">${t('status.pending')}</span>`}</td>
              </tr></tfoot>
            </table>
          </div>
        </div>
      </div>`;
  }

  // ── Compare Charts (Gauges + Heatmap) ──

  function initCompareCharts() {
    // Radial gauges for each category
    for (const cat of COST_CATS) {
      const annualBudget = sum(BUDGET.cost[cat.key]);
      const annualActual = sum(EXPENSES[cat.key]);
      const spendPct = annualBudget > 0 ? Math.round((annualActual / annualBudget) * 100) : 0;
      const varPct = annualBudget > 0 ? ((annualActual - annualBudget) / annualBudget) * 100 : 0;
      const gaugeColor = annualActual === 0 ? '#475569' : varPct <= 0 ? '#22c55e' : varPct <= 15 ? '#eab308' : '#ef4444';

      createChart(`cm-gauge-${cat.key}`, {
        chart: { type: 'radialBar', height: 76, sparkline: { enabled: true } },
        series: [Math.min(spendPct, 100)],
        plotOptions: {
          radialBar: {
            hollow: { size: '50%' },
            dataLabels: {
              name: { show: false },
              value: {
                show: true, fontSize: '11px', fontWeight: 700, color: gaugeColor, offsetY: 4,
                formatter: () => annualActual > 0 ? `${spendPct}%` : '—',
              },
            },
            track: { background: 'rgba(148,163,184,.1)' },
          },
        },
        colors: [gaugeColor],
      });
    }

    // Heatmap
    const heatmapSeries = [...COST_CATS].reverse().map(cat => {
      const budgetArr = BUDGET.cost[cat.key];
      const actualArr = EXPENSES[cat.key];
      const catVar = getVariance(budgetArr, actualArr);
      return {
        name: getCostCatLabel(cat),
        data: months.map((m, i) => ({
          x: m,
          y: actualArr[i] > 0 ? Math.round(catVar[i].pct) : null,
        })),
      };
    });

    createChart('cm-compare-heatmap', {
      chart: { type: 'heatmap', height: 260, toolbar: { show: false } },
      series: heatmapSeries,
      plotOptions: {
        heatmap: {
          radius: 4,
          enableShades: false,
          colorScale: {
            ranges: [
              { from: -100, to: -15, color: '#16a34a', name: t('compare.underBudget') },
              { from: -15, to: -5, color: '#22c55e', name: t('compare.underBudget') },
              { from: -5, to: 5, color: '#eab308', name: t('compare.nearTarget') },
              { from: 5, to: 15, color: '#f97316', name: t('compare.overBudget') },
              { from: 15, to: 200, color: '#ef4444', name: t('compare.overBudget') },
            ],
          },
        },
      },
      dataLabels: {
        enabled: true,
        style: { fontSize: '9px', fontWeight: 600, colors: ['#f1f5f9'] },
        formatter: (val) => val != null ? `${val > 0 ? '+' : ''}${val}%` : '',
      },
      tooltip: {
        custom: ({ seriesIndex, dataPointIndex, w }) => {
          const catName = w.config.series[seriesIndex].name;
          const monthName = months[dataPointIndex];
          const val = w.config.series[seriesIndex].data[dataPointIndex].y;
          const catIdx = COST_CATS.length - 1 - seriesIndex;
          const cat = COST_CATS[catIdx];
          const budget = BUDGET.cost[cat.key][dataPointIndex];
          const actual = EXPENSES[cat.key][dataPointIndex];
          if (val === null) {
            return `<div style="padding:8px 12px;font-size:.75rem;background:var(--bg-surface);border:1px solid var(--border-default);border-radius:6px">
              <strong>${catName}</strong> — ${monthName}<br>
              <span style="color:var(--text-muted)">${t('card.target')}: ${formatBaht(budget)}</span><br>
              <em style="color:var(--text-muted)">${t('compare.noData')}</em>
            </div>`;
          }
          const vColor = val <= 0 ? '#22c55e' : val <= 15 ? '#eab308' : '#ef4444';
          return `<div style="padding:8px 12px;font-size:.75rem;background:var(--bg-surface);border:1px solid var(--border-default);border-radius:6px">
            <strong>${catName}</strong> — ${monthName}<br>
            ${t('card.target')}: ${formatBaht(budget)}<br>
            ${t('card.actual')}: ${formatBaht(actual)}<br>
            ${t('th.variance')}: <strong style="color:${vColor}">${val > 0 ? '+' : ''}${val}%</strong>
          </div>`;
        },
      },
      xaxis: { position: 'top' },
      yaxis: { labels: { style: { fontSize: '10px' } } },
      stroke: { width: 2, colors: ['var(--bg-surface, #1e293b)'] },
      legend: { show: false },
    });
  }

  // ── Charts Tab ──

  function buildChartsTab() {
    const scenarios = getScenarioComparison();
    return `
      <!-- 1. Stacked Bar + Trend Lines -->
      <div class="grid grid-2" style="margin-bottom:24px">
        <div class="card"><div class="card-header"><span class="card-title">${t('expenses.monthlyCostBreakdown')}</span></div><div id="cm-stacked-bar" class="chart-container"></div></div>
        <div class="card"><div class="card-header"><span class="card-title">${t('expenses.categoriesTrend')}</span></div><div id="cm-trend-lines" class="chart-container"></div></div>
      </div>

      <!-- 2. Anomaly Alerts -->
      <h3 class="section-title">${t('cost.anomalyAlerts')}</h3>
      <div class="grid grid-2 stagger" style="margin-bottom:24px">
        ${ANOMALIES.map(a => AlertCard({
          severity: a.severity,
          title: `${months[a.month]} — ${t('cat.' + a.category)}`,
          description: `${localized(a, 'description')}<br><span style="color:var(--text-muted)">Actual: ${formatBaht(a.amount)} vs Expected: ${formatBaht(a.expected)}</span>`,
          action: localized(a, 'action'),
        })).join('')}
      </div>

      <!-- 3. Category Statistics -->
      <div class="card" style="margin-bottom:24px">
        <div class="card-header"><span class="card-title">${t('cost.categoryStats')}</span></div>
        <div id="cm-stats-table"></div>
      </div>

      <!-- 4. System Cost Scenarios -->
      <div class="card">
        <div class="card-header"><span class="card-title">${t('cost.systemCostScenarios')}</span></div>
        <div class="tab-group" style="margin-bottom:16px;max-width:500px" id="cm-scenario-tabs">
          ${Object.entries(SCENARIOS).map(([key, s]) =>
            `<button class="tab-btn ${key === activeScenario ? 'active' : ''}" data-scenario="${key}">${s.label}</button>`
          ).join('')}
        </div>
        <div class="grid grid-2">
          <div id="cm-scenario-chart" class="chart-container"></div>
          <div id="cm-scenario-summary" style="display:flex;flex-direction:column;justify-content:center;gap:12px;padding:20px"></div>
        </div>
      </div>`;
  }

  function initCharts() {
    const colors = getCatColors();
    createChart('cm-stacked-bar', {
      chart: { type: 'bar', height: 350, stacked: true },
      series: CATEGORY_KEYS.map(key => ({ name: t('cat.' + key), data: [...EXPENSES[key]] })),
      xaxis: { categories: months }, colors,
      plotOptions: { bar: { borderRadius: 2, columnWidth: '60%' } },
      yaxis: { labels: { formatter: v => `฿${(v / 1000000).toFixed(1)}M`, style: { colors: '#94a3b8' } } },
      legend: { position: 'bottom', fontSize: '10px' },
    });
    createChart('cm-trend-lines', {
      chart: { type: 'line', height: 350 },
      series: CATEGORY_KEYS.map(key => ({ name: t('cat.' + key), data: [...EXPENSES[key]] })),
      xaxis: { categories: months }, colors,
      yaxis: { labels: { formatter: v => `฿${(v / 1000).toFixed(0)}K`, style: { colors: '#94a3b8' } } },
      markers: { size: 3 },
    });

    // Stats table
    const statsEl = container.querySelector('#cm-stats-table');
    if (statsEl) {
      const stats = getCategoryStats();
      const statRows = Object.entries(stats).map(([key, s]) => [
        t('cat.' + key),
        formatBaht(s.sum),
        formatBaht(Math.round(s.avg)),
        formatBaht(s.min),
        formatBaht(s.max),
        formatBaht(Math.round(s.stddev)),
      ]);
      statsEl.innerHTML = DataTable({
        headers: [t('th.category'), t('th.annual'), t('th.avgMo'), t('th.min'), t('th.max'), t('th.stddev')],
        rows: statRows,
        alignments: ['left', 'right', 'right', 'right', 'right', 'right'],
      });
    }

    // Scenario chart
    updateScenario(activeScenario);

    // Scenario tab click handler
    container.querySelector('#cm-scenario-tabs')?.addEventListener('click', (e) => {
      const btn = e.target.closest('.tab-btn');
      if (!btn) return;
      container.querySelectorAll('#cm-scenario-tabs .tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeScenario = btn.dataset.scenario;
      updateScenario(activeScenario);
    });
  }

  function updateScenario(key) {
    const scenarios = getScenarioComparison();
    const sc = scenarios[key];
    createChart('cm-scenario-chart', {
      chart: { type: 'bar', height: 300 },
      series: [{ name: sc.label, data: sc.monthly }],
      xaxis: { categories: months },
      colors: [key === 'actual' ? '#ef4444' : key === 'current' ? '#eab308' : '#22c55e'],
      plotOptions: { bar: { borderRadius: 4, columnWidth: '50%' } },
      yaxis: { labels: { formatter: v => `฿${(v / 1000000).toFixed(1)}M`, style: { colors: '#94a3b8' } } },
    });

    const savings = getSavingsVsActual(sc.ratio);
    const summaryEl = container.querySelector('#cm-scenario-summary');
    if (summaryEl) {
      summaryEl.innerHTML = `
        <div style="font-size:1.1rem;font-weight:700">${sc.label}</div>
        <div>${t('cost.annualSystemCost')}: <strong>${formatBahtCompact(sc.annual)}</strong></div>
        ${key !== 'actual' ? `
          <div>${t('cost.savingsVsActual')}: <strong class="text-success">${formatBahtCompact(savings.annual)}</strong></div>
          <div style="font-size:.8rem;color:var(--text-muted)">${t('cost.reducedBy')} ${formatPercent((0.2427 - sc.ratio) * 100)} ${t('cost.points')}</div>
        ` : `
          <div style="font-size:.8rem;color:var(--text-muted)">${t('cost.currentRate')}</div>
        `}
      `;
    }
  }

  function updateAllCharts() {
    updateChart('cm-stacked-bar', CATEGORY_KEYS.map(key => ({ name: t('cat.' + key), data: [...EXPENSES[key]] })));
    updateChart('cm-trend-lines', CATEGORY_KEYS.map(key => ({ name: t('cat.' + key), data: [...EXPENSES[key]] })));
  }

  // ── Danger Zone ──

  function buildDangerZone() {
    return `
      <div class="card" style="margin-top:32px;border:1px solid var(--color-danger, #ef4444);border-left:4px solid var(--color-danger, #ef4444);background:rgba(239,68,68,0.03)">
        <div class="card-header" style="padding-bottom:12px">
          <span class="card-title" style="color:var(--color-danger, #ef4444);font-size:.9rem">${t('section.dangerZone')}</span>
        </div>
        <div style="display:flex;gap:12px;flex-wrap:wrap">
          <div style="flex:1;min-width:140px">
            <button class="btn btn-danger btn-sm" id="btn-zero" style="width:100%;margin-bottom:4px">
              <i data-lucide="eraser" style="width:14px;height:14px"></i> ${t('btn.zeroExpenses')}
            </button>
            <div style="font-size:.65rem;color:var(--text-muted);text-align:center">${t('section.actualExpenses')}</div>
          </div>
          <div style="flex:1;min-width:140px">
            <button class="btn btn-danger btn-sm" id="btn-reset-budget" style="width:100%;margin-bottom:4px">
              <i data-lucide="rotate-ccw" style="width:14px;height:14px"></i> ${t('btn.resetBudget')}
            </button>
            <div style="font-size:.65rem;color:var(--text-muted);text-align:center">${t('section.budgetTargets')}</div>
          </div>
          <div style="flex:1;min-width:140px">
            <button class="btn btn-danger btn-sm" id="btn-reset-expenses" style="width:100%;margin-bottom:4px">
              <i data-lucide="trash-2" style="width:14px;height:14px"></i> ${t('btn.resetExpenses')}
            </button>
            <div style="font-size:.65rem;color:var(--text-muted);text-align:center">${t('section.actualExpenses')}</div>
          </div>
        </div>
      </div>`;
  }

  // ── Category Manager Modal ──

  function openCategoryManager() {
    const schema = getCategorySchema();
    function buildCategoryListHTML() {
      return schema.map(cat => `
        <div class="modal-item-row">
          <div>
            <span class="item-label" style="display:inline-flex;align-items:center;gap:8px">
              <span style="width:12px;height:12px;border-radius:50%;background:${cat.color};display:inline-block;flex-shrink:0"></span>
              ${t('cat.' + cat.key)}
            </span>
            <div class="item-meta">${cat.type === 'detailed' ? t('modal.typeDetailed') : t('modal.typeSimple')}</div>
          </div>
          <div class="item-actions">
            <button class="btn btn-secondary btn-sm cat-rename-btn" data-key="${cat.key}">${t('modal.rename')}</button>
            ${cat.type === 'detailed' ? `<button class="btn btn-secondary btn-sm cat-sub-btn" data-key="${cat.key}">${t('modal.subItems')}</button>` : ''}
            <button class="btn btn-danger btn-sm cat-delete-btn" data-key="${cat.key}">${t('modal.delete')}</button>
          </div>
        </div>
      `).join('');
    }
    const modal = openModal({
      title: t('modal.manageCategories'),
      content: `
        <div id="cat-list">${buildCategoryListHTML()}</div>
        <div style="margin-top:16px">
          <button class="btn btn-primary btn-sm" id="cat-add-btn">+ ${t('modal.addCategory')}</button>
        </div>
        <div id="cat-add-form" style="display:none;margin-top:16px;padding:16px;background:var(--bg-base);border-radius:var(--radius-md);border:1px solid var(--border-default)">
          <div class="modal-form-group"><label>${t('modal.categoryNameTh')}</label><input type="text" id="cat-name-th" placeholder="e.g. ค่าเช่า"></div>
          <div class="modal-form-group"><label>${t('modal.categoryNameEn')}</label><input type="text" id="cat-name-en" placeholder="e.g. Rent"></div>
          <div class="modal-form-group"><label>${t('modal.type')}</label><div class="modal-radio-group"><label><input type="radio" name="cat-type" value="simple" checked> ${t('modal.typeSimple')}</label><label><input type="radio" name="cat-type" value="detailed"> ${t('modal.typeDetailed')}</label></div></div>
          <div class="modal-form-group" id="cat-subtype-group" style="display:none"><label>Sub-item type</label><div class="modal-radio-group"><label><input type="radio" name="cat-subtype" value="fixed" checked> ${t('modal.subItemTypeFixed')}</label><label><input type="radio" name="cat-subtype" value="pct"> ${t('modal.subItemTypePct')}</label></div></div>
          <div class="modal-form-group"><label>${t('modal.color')}</label><input type="color" class="modal-color-input" id="cat-color" value="#64748b"></div>
          <div class="flex gap-8" style="margin-top:12px"><button class="btn btn-primary btn-sm" id="cat-add-confirm">${t('modal.add')}</button><button class="btn btn-secondary btn-sm" id="cat-add-cancel">${t('modal.cancel')}</button></div>
        </div>`,
      width: '560px',
    });

    function refreshList() { const l = modal.querySelector('#cat-list'); if (l) l.innerHTML = buildCategoryListHTML(); bindListHandlers(); }
    function bindListHandlers() {
      modal.querySelectorAll('.cat-rename-btn').forEach(btn => { btn.addEventListener('click', () => { const cat = schema.find(c => c.key === btn.dataset.key); if (!cat) return; openRenameDialog(btn.dataset.key, cat.label, (newLabel) => { renameCategory(btn.dataset.key, newLabel); refreshList(); showToast(t('toast.categoryRenamed'), 'success', 2000); }); }); });
      modal.querySelectorAll('.cat-sub-btn').forEach(btn => { btn.addEventListener('click', () => { closeModal(modal); openSubItemManager(btn.dataset.key); }); });
      modal.querySelectorAll('.cat-delete-btn').forEach(btn => { btn.addEventListener('click', () => { if (confirm(t('modal.confirmDeleteCategory'))) { undoBuffer = snapshotAll(); removeCategory(btn.dataset.key); refreshList(); showToast(t('toast.categoryDeleted'), 'info', 2000); } }); });
    }
    bindListHandlers();
    modal.querySelector('#cat-add-btn')?.addEventListener('click', () => { modal.querySelector('#cat-add-form').style.display = ''; modal.querySelector('#cat-add-btn').style.display = 'none'; });
    modal.querySelector('#cat-add-cancel')?.addEventListener('click', () => { modal.querySelector('#cat-add-form').style.display = 'none'; modal.querySelector('#cat-add-btn').style.display = ''; });
    modal.querySelectorAll('input[name="cat-type"]').forEach(radio => { radio.addEventListener('change', () => { const sg = modal.querySelector('#cat-subtype-group'); if (sg) sg.style.display = radio.value === 'detailed' ? '' : 'none'; }); });
    modal.querySelector('#cat-add-confirm')?.addEventListener('click', () => {
      const nameTh = modal.querySelector('#cat-name-th')?.value?.trim(); const nameEn = modal.querySelector('#cat-name-en')?.value?.trim(); if (!nameTh && !nameEn) return;
      const type = modal.querySelector('input[name="cat-type"]:checked')?.value || 'simple'; const subItemType = modal.querySelector('input[name="cat-subtype"]:checked')?.value || 'fixed'; const color = modal.querySelector('#cat-color')?.value || '#64748b';
      undoBuffer = snapshotAll(); const result = addCategory({ label: { th: nameTh || nameEn, en: nameEn || nameTh }, type, color, subItemType: type === 'detailed' ? subItemType : undefined, subItems: [] });
      if (result) { modal.querySelector('#cat-name-th').value = ''; modal.querySelector('#cat-name-en').value = ''; modal.querySelector('#cat-add-form').style.display = 'none'; modal.querySelector('#cat-add-btn').style.display = ''; refreshList(); showToast(t('toast.categoryAdded'), 'success', 2000); }
    });
  }

  function openRenameDialog(key, currentLabel, onSave) {
    const modal = openModal({ title: t('modal.rename'), content: `<div class="modal-form-group"><label>${t('modal.categoryNameTh')}</label><input type="text" id="rename-th" value="${currentLabel.th || ''}"></div><div class="modal-form-group"><label>${t('modal.categoryNameEn')}</label><input type="text" id="rename-en" value="${currentLabel.en || ''}"></div><div class="flex gap-8" style="margin-top:12px"><button class="btn btn-primary btn-sm" id="rename-save">${t('modal.save')}</button><button class="btn btn-secondary btn-sm" id="rename-cancel">${t('modal.cancel')}</button></div>`, width: '380px' });
    modal.querySelector('#rename-save')?.addEventListener('click', () => { const th = modal.querySelector('#rename-th')?.value?.trim(); const en = modal.querySelector('#rename-en')?.value?.trim(); if (th || en) { onSave({ th: th || en, en: en || th }); closeModal(modal); } });
    modal.querySelector('#rename-cancel')?.addEventListener('click', () => closeModal(modal));
  }

  function openSubItemManager(catKey) {
    const cat = getCategorySchema().find(c => c.key === catKey); if (!cat) return;
    function buildSubListHTML() { if (!cat.subItems || cat.subItems.length === 0) return '<p style="color:var(--text-muted);font-size:.8rem;padding:8px 0">No sub-items yet</p>'; return cat.subItems.map(sub => `<div class="modal-item-row"><div><span class="item-label">${t('sub.' + catKey + '.' + sub.key)}</span></div><div class="item-actions"><button class="btn btn-secondary btn-sm sub-rename-btn" data-key="${sub.key}">${t('modal.rename')}</button><button class="btn btn-danger btn-sm sub-delete-btn" data-key="${sub.key}">${t('modal.delete')}</button></div></div>`).join(''); }
    const modal = openModal({ title: `${t('modal.manageSubItems')}: ${t('cat.' + catKey)}`, content: `<div id="sub-list">${buildSubListHTML()}</div><div style="margin-top:16px;display:flex;gap:8px;flex-wrap:wrap"><button class="btn btn-primary btn-sm" id="sub-add-btn">+ ${t('modal.addSubItem')}</button><button class="btn btn-secondary btn-sm" id="sub-back-btn">${t('modal.back')}</button></div><div id="sub-add-form" style="display:none;margin-top:16px;padding:16px;background:var(--bg-base);border-radius:var(--radius-md);border:1px solid var(--border-default)"><div class="modal-form-group"><label>${t('modal.categoryNameTh')}</label><input type="text" id="sub-name-th" placeholder="e.g. ค่าเซิร์ฟเวอร์"></div><div class="modal-form-group"><label>${t('modal.categoryNameEn')}</label><input type="text" id="sub-name-en" placeholder="e.g. Server"></div><div class="flex gap-8" style="margin-top:12px"><button class="btn btn-primary btn-sm" id="sub-add-confirm">${t('modal.add')}</button><button class="btn btn-secondary btn-sm" id="sub-add-cancel">${t('modal.cancel')}</button></div></div>`, width: '480px' });
    function refreshSubList() { const l = modal.querySelector('#sub-list'); if (l) l.innerHTML = buildSubListHTML(); bindSubListHandlers(); }
    function bindSubListHandlers() {
      modal.querySelectorAll('.sub-rename-btn').forEach(btn => { btn.addEventListener('click', () => { const sub = cat.subItems?.find(s => s.key === btn.dataset.key); if (!sub) return; openRenameDialog(btn.dataset.key, sub.label, (newLabel) => { renameSubItem(catKey, btn.dataset.key, newLabel); refreshSubList(); showToast(t('toast.subItemRenamed'), 'success', 2000); }); }); });
      modal.querySelectorAll('.sub-delete-btn').forEach(btn => { btn.addEventListener('click', () => { if (confirm(t('modal.confirmDeleteSubItem'))) { undoBuffer = snapshotAll(); removeSubItem(catKey, btn.dataset.key); refreshSubList(); showToast(t('toast.subItemDeleted'), 'info', 2000); } }); });
    }
    bindSubListHandlers();
    modal.querySelector('#sub-back-btn')?.addEventListener('click', () => { closeModal(modal); openCategoryManager(); });
    modal.querySelector('#sub-add-btn')?.addEventListener('click', () => { modal.querySelector('#sub-add-form').style.display = ''; modal.querySelector('#sub-add-btn').style.display = 'none'; });
    modal.querySelector('#sub-add-cancel')?.addEventListener('click', () => { modal.querySelector('#sub-add-form').style.display = 'none'; modal.querySelector('#sub-add-btn').style.display = ''; });
    modal.querySelector('#sub-add-confirm')?.addEventListener('click', () => {
      const nameTh = modal.querySelector('#sub-name-th')?.value?.trim(); const nameEn = modal.querySelector('#sub-name-en')?.value?.trim(); if (!nameTh && !nameEn) return;
      undoBuffer = snapshotAll(); const result = addSubItem(catKey, { label: { th: nameTh || nameEn, en: nameEn || nameTh } });
      if (result) { modal.querySelector('#sub-name-th').value = ''; modal.querySelector('#sub-name-en').value = ''; modal.querySelector('#sub-add-form').style.display = 'none'; modal.querySelector('#sub-add-btn').style.display = ''; refreshSubList(); showToast(t('toast.subItemAdded'), 'success', 2000); }
    });
  }

  // ── Unified Input Handler (Event Delegation) ──

  function bindInputHandlers() {
    const tabContent = container.querySelector('#cm-tab-content');
    if (!tabContent) return;

    tabContent.addEventListener('input', (e) => {
      const input = e.target.closest('.ba-input');
      if (!input) return;

      const type = input.dataset.inputType;
      const cat = input.dataset.cat;
      const month = parseInt(input.dataset.month);
      reformatInput(input);
      const val = parseInputValue(input.value);

      switch (type) {
        case 'budget-detail': {
          const sub = input.dataset.sub;
          if (BUDGET.costDetails[cat]?.[sub]) BUDGET.costDetails[cat][sub][month] = val;
          recalcBudgetFromDetails(cat);
          recalcBudget();
          updateCardTotals('budget', cat);
          break;
        }
        case 'budget-simple': {
          BUDGET.cost[cat][month] = val;
          recalcBudget();
          updateCardTotals('budget', cat);
          break;
        }
        case 'actual-detail': {
          const sub = input.dataset.sub;
          if (EXPENSE_DETAILS[cat]?.[sub]) EXPENSE_DETAILS[cat][sub][month] = val;
          recalcFromDetails(cat);
          recalcExpenses();
          updateCardTotals('actual', cat);
          updateChartDebounced();
          break;
        }
        case 'actual-simple': {
          if (EXPENSES[cat]) EXPENSES[cat][month] = val;
          recalcExpenses();
          updateCardTotals('actual', cat);
          updateChartDebounced();
          break;
        }
      }

      isDirty = true;
      updateSummaryBar();
      autoSaveDebounced();
    });

    // Focus / blur handlers via delegation
    tabContent.addEventListener('focusin', (e) => {
      const input = e.target.closest('.ba-input');
      if (!input) return;
      input.select();
    });

    tabContent.addEventListener('focusout', (e) => {
      const input = e.target.closest('.ba-input');
      if (!input) return;
      const type = input.dataset.inputType;
      const cat = input.dataset.cat;
      const month = parseInt(input.dataset.month);

      let val = 0;
      switch (type) {
        case 'budget-detail': val = BUDGET.costDetails[cat]?.[input.dataset.sub]?.[month] ?? 0; break;
        case 'budget-simple': val = BUDGET.cost[cat]?.[month] ?? 0; break;
        case 'actual-detail': val = EXPENSE_DETAILS[cat]?.[input.dataset.sub]?.[month] ?? 0; break;
        case 'actual-simple': val = EXPENSES[cat]?.[month] ?? 0; break;
      }
      input.value = formatInputDisplay(val);

      if (type?.startsWith('actual')) updateAllCharts();
    });

    // Sub-item manage buttons
    tabContent.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-manage-sub]');
      if (btn) openSubItemManager(btn.dataset.manageSub);
    });

    // Collapsible accordion toggle
    tabContent.addEventListener('click', (e) => {
      const header = e.target.closest('.collapsible-header');
      if (!header) return;
      const section = header.closest('.collapsible-section');
      if (section) section.classList.toggle('collapsed');
    });
  }

  function updateCardTotals(mode, catKey) {
    // Update row totals
    for (let i = 0; i < 12; i++) {
      const val = mode === 'budget' ? BUDGET.cost[catKey][i] : EXPENSES[catKey][i];
      const el = container.querySelector(`[data-card-row-total="${mode}-${catKey}-${i}"]`);
      if (el) el.innerHTML = `<strong>${formatBaht(val)}</strong>`;
    }

    // Update sub-item totals
    const subs = mode === 'budget' ? BUDGET.costDetails[catKey] : EXPENSE_DETAILS[catKey];
    if (subs) {
      for (const subKey of Object.keys(subs)) {
        const el = container.querySelector(`[data-card-sub-total="${mode}-${catKey}-${subKey}"]`);
        if (el) el.textContent = formatBaht(subs[subKey].reduce((a, b) => a + b, 0));
      }
    }

    // Update category total
    const totalVal = mode === 'budget' ? sum(BUDGET.cost[catKey]) : sum(EXPENSES[catKey]);
    const el = container.querySelector(`[data-card-cat-total="${mode}-${catKey}"]`);
    if (el) el.innerHTML = `<strong>${formatBaht(totalVal)}</strong>`;
  }

  // ── Action Button Handlers ──

  function bindActionButtons() {
    // Save All
    container.querySelector('#btn-save-all')?.addEventListener('click', () => {
      undoBuffer = snapshotAll();
      saveAll();
      isDirty = false;
      updateSummaryBar();
      showToast(t('toast.saveAllSuccess'), 'success');
    });

    // Undo
    container.querySelector('#btn-undo')?.addEventListener('click', () => {
      if (!undoBuffer) return;
      restoreSnapshot(undoBuffer);
      undoBuffer = null;
      isDirty = true;
      renderPage();
      showToast(t('toast.undoSuccess'), 'success');
    });

    // Overflow menu toggle
    container.querySelector('#btn-overflow')?.addEventListener('click', (e) => {
      e.stopPropagation();
      const menu = container.querySelector('#cm-overflow-menu');
      if (menu) menu.style.display = menu.style.display === 'none' ? '' : 'none';
    });

    // Close overflow on outside click
    document.addEventListener('click', closeOverflowMenu);

    // Overflow menu: hover effect
    container.querySelectorAll('.overflow-item').forEach(item => {
      item.addEventListener('mouseenter', () => { item.style.background = 'var(--bg-hover, rgba(255,255,255,0.05))'; });
      item.addEventListener('mouseleave', () => { item.style.background = 'none'; });
    });

    // Zero All Expenses
    container.querySelector('#btn-zero')?.addEventListener('click', () => {
      if (!confirm(t('confirm.zeroExpenses'))) return;
      undoBuffer = snapshotAll();
      zeroExpenses();
      isDirty = true;
      renderPage();
      autoSaveDebounced();
      showToast(t('toast.zeroSuccess'), 'success');
    });

    // Reset Budget Targets
    container.querySelector('#btn-reset-budget')?.addEventListener('click', () => {
      if (!confirm(t('confirm.resetBudgetTargets'))) return;
      undoBuffer = snapshotAll();
      resetBudget();
      isDirty = false;
      renderPage();
      showToast(t('budget.budgetReset'), 'success');
    });

    // Reset Expenses
    container.querySelector('#btn-reset-expenses')?.addEventListener('click', () => {
      if (!confirm(t('confirm.resetExpenses'))) return;
      undoBuffer = snapshotAll();
      zeroExpenses();
      isDirty = true;
      renderPage();
      autoSaveDebounced();
      showToast(t('toast.zeroSuccess'), 'info');
    });

    // Export CSV
    container.querySelector('#btn-export-csv')?.addEventListener('click', () => {
      const costTotalVar = getVariance(BUDGET.costTotal, TOTAL_MONTHLY_COST);
      const monthNames = getMonths();
      const headers = ['Month', ...COST_CATS.flatMap(cat => [`${getCostCatLabel(cat)} Budget`, `${getCostCatLabel(cat)} Actual`]), 'Budget Total', 'Actual Total', 'Variance %'];
      const rows = monthNames.map((m, i) => [m, ...COST_CATS.flatMap(cat => [BUDGET.cost[cat.key][i], EXPENSES[cat.key][i]]), BUDGET.costTotal[i], TOTAL_MONTHLY_COST[i], TOTAL_MONTHLY_COST[i] > 0 ? costTotalVar[i].pct.toFixed(1) + '%' : '—']);
      const costVarPctStr = BUDGET.annualCost > 0 ? ((sum(TOTAL_MONTHLY_COST) - BUDGET.annualCost) / BUDGET.annualCost * 100).toFixed(1) + '%' : '—';
      rows.push(['Total', ...COST_CATS.flatMap(cat => [sum(BUDGET.cost[cat.key]), sum(EXPENSES[cat.key])]), BUDGET.annualCost, sum(TOTAL_MONTHLY_COST), costVarPctStr]);
      rows.push([]);
      for (const cat of DETAILED_CATEGORIES) {
        const def = SUB_ITEM_DEFS[cat]; if (!def) continue;
        const subs = BUDGET.costDetails[cat]; if (!subs) continue;
        rows.push([`--- ${t('section.budgetDetails')}: ${t('cat.' + cat)} ---`]);
        rows.push(['Month', ...def.items.map(item => t('sub.' + cat + '.' + item.key)), 'Total']);
        for (let i = 0; i < 12; i++) rows.push([monthNames[i], ...def.items.map(item => subs[item.key]?.[i] ?? 0), BUDGET.cost[cat]?.[i] ?? 0]);
        rows.push([]);
      }
      for (const cat of DETAILED_CATEGORIES) {
        const def = SUB_ITEM_DEFS[cat]; if (!def) continue;
        rows.push([`--- ${t('section.detail')}: ${t('cat.' + cat)} ---`]);
        rows.push(['Month', ...def.items.map(item => t('sub.' + cat + '.' + item.key)), 'Total']);
        for (let i = 0; i < 12; i++) rows.push([monthNames[i], ...def.items.map(item => EXPENSE_DETAILS[cat]?.[item.key]?.[i] ?? 0), EXPENSES[cat]?.[i] ?? 0]);
        rows.push([]);
      }
      downloadCSV('easyslip_cost_management_2026.csv', headers, rows);
      showToast(t('toast.exportCsvSuccess'), 'success');
    });

    // Export JSON
    container.querySelector('#btn-export-json')?.addEventListener('click', () => {
      const json = exportBudgetData();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = 'easyslip_budget_2026.json'; a.click();
      URL.revokeObjectURL(url);
      showToast(t('toast.exportJsonSuccess'), 'success');
    });

    // Import JSON
    container.querySelector('#btn-import-json')?.addEventListener('click', () => container.querySelector('#import-file')?.click());
    container.querySelector('#import-file')?.addEventListener('change', (e) => {
      const file = e.target.files?.[0]; if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        if (importBudgetData(reader.result)) { isDirty = false; renderPage(); showToast(t('toast.importSuccess'), 'success'); }
        else { showToast(t('toast.importFailed'), 'error'); }
      };
      reader.readAsText(file);
    });

    // Category Manager (from overflow)
    container.querySelector('#btn-manage-categories')?.addEventListener('click', () => openCategoryManager());

    // Main tab switching
    container.querySelector('#cm-main-tabs')?.addEventListener('click', (e) => {
      const btn = e.target.closest('.tab-btn');
      if (btn?.dataset.mainTab) switchMainTab(btn.dataset.mainTab);
    });
  }

  // ── Render Page ──

  function renderPage() {
    container.innerHTML = `
      <div class="fade-in">
        ${buildSummaryBar()}
        ${buildMainTabs()}
        <div id="cm-tab-content">
          ${buildTabContent()}
        </div>
        ${buildDangerZone()}
      </div>`;

    if (typeof lucide !== 'undefined') lucide.createIcons();
    if (activeMainTab === 'charts') initCharts();
    if (activeMainTab === 'compare') initCompareCharts();

    bindInputHandlers();
    bindActionButtons();
    updateSummaryBar();
  }

  // Re-render when modal closes (schema may have changed)
  const observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
      for (const node of m.removedNodes) {
        if (node.classList?.contains('modal-overlay')) { recalcExpenses(); recalcBudget(); renderPage(); return; }
      }
    }
  });
  observer.observe(document.body, { childList: true });

  renderPage();

  return () => { observer.disconnect(); destroyAllCharts(); document.removeEventListener('click', closeOverflowMenu); };
}
