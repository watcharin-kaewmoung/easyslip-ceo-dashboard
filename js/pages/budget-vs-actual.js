// ============================================
// EasySlip 2026 — Page 4: Budget vs Actual Tracker
// v8: Per-category budget cost targets (editable per category)
// ============================================

import {
  BUDGET, getActual, getVariance, getActualRevenueTotal, getLastSaved,
  exportBudgetData, importBudgetData,
  saveBudget, resetBudget, recalcBudget, getLastSavedBudget,
} from '../data/budget-actual.js';
import { EXPENSE_CATEGORIES } from '../data/constants.js';
import { destroyAllCharts } from '../components/charts.js';
import { showToast } from '../components/toast.js';
import { setPageTitle, formatBaht, formatBahtCompact, formatPercent, formatPercentSigned, downloadCSV, sum } from '../utils.js';
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
import {
  EXPENSES, EXPENSE_DETAILS, SUB_ITEM_DEFS,
  DETAILED_CATEGORIES, TOTAL_MONTHLY_COST,
  getLastSavedExpenses,
} from '../data/expenses.js';
import { navigate } from '../router.js';

function getCostCats() { return EXPENSE_CATEGORIES.map(c => ({ key: c.key, label: c.label, labelEn: c.labelEn, color: c.color })); }

export function render(container) {
  setPageTitle(t('page.budget.title'));

  const months = getMonths();
  const COST_CATS = getCostCats();
  const costKeys = COST_CATS.map(c => c.key);
  let activeDetailTab = DETAILED_CATEGORIES[0] || null;

  // ── Budget editing state ──
  let undoBuffer = null;
  let isDirty = false;

  function formatInputDisplay(value) {
    return _formatInputDisplay(value);
  }
  function parseInputValue(str) {
    return _parseInputValue(str);
  }
  function snapshotBudget() {
    const costSnap = {};
    for (const k of costKeys) costSnap[k] = [...BUDGET.cost[k]];
    return { cost: costSnap };
  }

  // Auto-save for budget targets
  const autoSaveDebounced = createAutoSave({
    saveFn: () => {
      undoBuffer = snapshotBudget();
      saveBudget();
    },
    setDirty: (v) => { isDirty = v; },
    updateIndicator: () => updateIndicators(),
  });

  // ── Helpers ──

  function getStatusBadge(pct) {
    const abs = Math.abs(pct);
    if (abs <= 5) return `<span class="badge badge-success">${t('status.onTrack')}</span>`;
    if (abs <= 15) return `<span class="badge badge-warning">${t('status.warning')}</span>`;
    return `<span class="badge badge-danger">${t('status.critical')}</span>`;
  }

  function getCostCatLabel(cat) {
    return localized(cat, 'label');
  }

  function updateIndicators() {
    _updateUndoButton(container, undoBuffer);
    _updateSaveIndicator(container, {
      selector: '#budget-save-indicator',
      isDirty,
      getLastSaved: getLastSavedBudget,
    });
    const syncEl = container.querySelector('#sync-indicator');
    if (syncEl) {
      const lastSavedStr = formatLastSaved(getLastSavedExpenses());
      syncEl.textContent = lastSavedStr ? `${t('budget.syncedFrom')}: ${lastSavedStr}` : '';
    }
  }

  // ── Build read-only detail table for a category ──

  function buildReadOnlyDetailTableHTML(cat) {
    const def = SUB_ITEM_DEFS[cat];
    const subs = EXPENSE_DETAILS[cat];
    if (!def || !subs) return `<p style="color:var(--text-muted);padding:12px">${t('budget.noSubItems')}</p>`;

    return `
      <table class="data-table data-table-dense" id="detail-table">
        <thead>
          <tr>
            <th>${t('th.month')}</th>
            ${def.items.map(item => `<th class="text-right">${t('sub.' + cat + '.' + item.key)}</th>`).join('')}
            <th class="text-right">${t('th.total')}</th>
          </tr>
        </thead>
        <tbody>
          ${months.map((m, i) => `
            <tr>
              <td>${m}</td>
              ${def.items.map(item => `
                <td class="text-right">${formatBaht(subs[item.key]?.[i] ?? 0)}</td>
              `).join('')}
              <td class="text-right"><strong>${formatBaht(EXPENSES[cat]?.[i] ?? 0)}</strong></td>
            </tr>
          `).join('')}
        </tbody>
        <tfoot>
          <tr class="total-row">
            <td><strong>${t('th.total')}</strong></td>
            ${def.items.map(item => `
              <td class="text-right">${formatBaht((subs[item.key] ?? []).reduce((a, b) => a + b, 0))}</td>
            `).join('')}
            <td class="text-right"><strong>${formatBaht((EXPENSES[cat] ?? []).reduce((a, b) => a + b, 0))}</strong></td>
          </tr>
        </tfoot>
      </table>
    `;
  }

  // ── Switch detail tab ──

  function switchDetailTab(cat) {
    activeDetailTab = cat;
    container.querySelectorAll('#detail-tabs .tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === cat);
    });
    const tableContainer = container.querySelector('#detail-table-container');
    if (tableContainer) {
      tableContainer.innerHTML = buildReadOnlyDetailTableHTML(cat);
    }
  }

  // ── Core: update all derived UI without re-rendering page ──

  function updateDerivedUI() {
    const costTotalVariance = getVariance(BUDGET.costTotal, TOTAL_MONTHLY_COST);

    for (let i = 0; i < 12; i++) {
      // Per-category actual cost cells
      COST_CATS.forEach(cat => {
        const cell = container.querySelector(`[data-cost-actual="${cat.key}"][data-cost-month="${i}"]`);
        if (cell) cell.textContent = formatBaht(EXPENSES[cat.key][i]);
      });

      // Budget total cell (sum of per-category budgets)
      const budgetTotalCell = container.querySelector(`[data-budget-total="${i}"]`);
      if (budgetTotalCell) budgetTotalCell.textContent = formatBaht(BUDGET.costTotal[i]);

      // Cost total cell
      const costTotalCell = container.querySelector(`[data-cost-total="${i}"]`);
      if (costTotalCell) costTotalCell.textContent = TOTAL_MONTHLY_COST[i] > 0 ? formatBaht(TOTAL_MONTHLY_COST[i]) : '—';

      // Cost variance cell (total)
      const costVarCell = container.querySelector(`[data-cost-var="${i}"]`);
      if (costVarCell) {
        costVarCell.className = 'text-right' + (costTotalVariance[i].pct < 0 ? ' text-success' : costTotalVariance[i].pct > 0 ? ' text-danger' : '');
        costVarCell.textContent = TOTAL_MONTHLY_COST[i] > 0 ? formatPercentSigned(costTotalVariance[i].pct) : '—';
      }

      // Cost status cell
      const costStatusCell = container.querySelector(`[data-cost-status="${i}"]`);
      if (costStatusCell) {
        costStatusCell.innerHTML = TOTAL_MONTHLY_COST[i] > 0 ? getStatusBadge(costTotalVariance[i].pct) : `<span class="badge badge-muted">${t('status.pending')}</span>`;
      }
    }

    updateTotals();
    updateProgressCards();
    updateIndicators();
  }

  function updateTotals() {
    const actualCostTotal = sum(TOTAL_MONTHLY_COST);
    const budgetCostTotal = BUDGET.annualCost;
    const costVarPct = budgetCostTotal > 0 ? ((actualCostTotal - budgetCostTotal) / budgetCostTotal) * 100 : 0;

    const totalBudgetCost = container.querySelector('#total-budget-cost');
    const totalActualCost = container.querySelector('#total-actual-cost');
    const totalCostVar = container.querySelector('#total-cost-var');
    const totalCostStatus = container.querySelector('#total-cost-status');

    if (totalBudgetCost) totalBudgetCost.textContent = formatBaht(budgetCostTotal);
    if (totalActualCost) totalActualCost.textContent = formatBaht(actualCostTotal);
    if (totalCostVar) {
      totalCostVar.className = 'text-right' + (costVarPct < 0 ? ' text-success' : costVarPct > 0 ? ' text-danger' : '');
      totalCostVar.textContent = actualCostTotal > 0 ? formatPercentSigned(costVarPct) : '—';
    }
    if (totalCostStatus) {
      totalCostStatus.innerHTML = actualCostTotal > 0 ? getStatusBadge(costVarPct) : `<span class="badge badge-muted">${t('status.pending')}</span>`;
    }

    // Per-category annual totals (actual)
    COST_CATS.forEach(cat => {
      const el = container.querySelector(`#total-actual-${cat.key}`);
      if (el) el.textContent = formatBaht(sum(EXPENSES[cat.key]));
    });

    // Per-category annual totals (budget)
    COST_CATS.forEach(cat => {
      const el = container.querySelector(`#total-budget-${cat.key}`);
      if (el) el.textContent = formatBaht(sum(BUDGET.cost[cat.key]));
    });
  }

  function updateProgressCards() {
    const actual = getActual();
    const actualRevTotal = sum(getActualRevenueTotal(actual));
    const actualCostTotal = sum(TOTAL_MONTHLY_COST);
    const actualProfitTotal = actualRevTotal - actualCostTotal;

    const revAchievement = BUDGET.annualRevenue > 0 ? (actualRevTotal / BUDGET.annualRevenue) * 100 : 0;
    const costAchievement = BUDGET.annualCost > 0 ? (actualCostTotal / BUDGET.annualCost) * 100 : 0;

    const revPctEl = container.querySelector('#rev-achievement-pct');
    const revBarEl = container.querySelector('#rev-achievement-bar');
    const revDetailEl = container.querySelector('#rev-achievement-detail');
    if (revPctEl) revPctEl.textContent = formatPercent(revAchievement);
    if (revBarEl) revBarEl.style.width = `${Math.min(revAchievement, 100)}%`;
    if (revDetailEl) revDetailEl.textContent = `${formatBahtCompact(actualRevTotal)} / ${formatBahtCompact(BUDGET.annualRevenue)}`;

    const costPctEl = container.querySelector('#cost-achievement-pct');
    const costBarEl = container.querySelector('#cost-achievement-bar');
    const costDetailEl = container.querySelector('#cost-achievement-detail');
    if (costPctEl) costPctEl.textContent = formatPercent(costAchievement);
    if (costBarEl) {
      costBarEl.style.width = `${Math.min(costAchievement, 100)}%`;
      costBarEl.className = `progress-fill ${costAchievement > 100 ? 'danger' : ''}`;
    }
    if (costDetailEl) costDetailEl.textContent = `${formatBahtCompact(actualCostTotal)} / ${formatBahtCompact(BUDGET.annualCost)}`;

    const profitValEl = container.querySelector('#profit-achievement-val');
    const profitBarEl = container.querySelector('#profit-achievement-bar');
    if (profitValEl) profitValEl.textContent = formatBahtCompact(actualProfitTotal);
    if (profitBarEl) {
      profitBarEl.className = `progress-fill ${actualProfitTotal >= BUDGET.annualProfit ? 'success' : 'danger'}`;
      profitBarEl.style.width = `${BUDGET.annualProfit > 0 ? Math.min(Math.max(actualProfitTotal / BUDGET.annualProfit * 100, 0), 100) : 0}%`;
    }

    const profitTargetEl = container.querySelector('#profit-target-label');
    if (profitTargetEl) profitTargetEl.textContent = `${t('th.budget')}: ${formatBahtCompact(BUDGET.annualProfit)}`;
  }

  // ── Build Page ──

  function renderPage() {
    const costTotalVariance = getVariance(BUDGET.costTotal, TOTAL_MONTHLY_COST);

    const actual = getActual();
    const actualRevTotal = sum(getActualRevenueTotal(actual));
    const actualCostTotal = sum(TOTAL_MONTHLY_COST);
    const actualProfitTotal = actualRevTotal - actualCostTotal;

    const revAchievement = BUDGET.annualRevenue > 0 ? (actualRevTotal / BUDGET.annualRevenue) * 100 : 0;
    const costAchievement = BUDGET.annualCost > 0 ? (actualCostTotal / BUDGET.annualCost) * 100 : 0;

    const budgetCostTotal = BUDGET.annualCost;
    const costVarPct = budgetCostTotal > 0 ? ((actualCostTotal - budgetCostTotal) / budgetCostTotal) * 100 : 0;

    const lastSavedExpStr = formatLastSaved(getLastSavedExpenses());
    const budgetSavedStr = formatLastSaved(getLastSavedBudget());

    // Guard activeDetailTab
    if (!DETAILED_CATEGORIES.includes(activeDetailTab)) {
      activeDetailTab = DETAILED_CATEGORIES[0] || null;
    }

    // Per-category column headers: each category gets 2 columns (Target + Actual)
    const costCatColHeaders = COST_CATS.map(cat =>
      `<th class="text-right" colspan="2" style="border-bottom:2px solid ${cat.color}"><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${cat.color};margin-right:4px"></span>${getCostCatLabel(cat)}</th>`
    ).join('');

    // Sub-headers for Target / Actual under each category
    const costCatSubHeaders = COST_CATS.map(() =>
      `<th class="text-right" style="font-size:.7rem;font-weight:500;color:var(--text-muted)">${t('budget.budgetTarget')}</th>` +
      `<th class="text-right" style="font-size:.7rem;font-weight:500;color:var(--text-muted)">${t('th.actualTotal')}</th>`
    ).join('');

    // Footer totals: per-category budget + actual
    const costCatFooterTotals = COST_CATS.map(cat =>
      `<td class="text-right" id="total-budget-${cat.key}">${formatBaht(sum(BUDGET.cost[cat.key]))}</td>` +
      `<td class="text-right" id="total-actual-${cat.key}">${formatBaht(sum(EXPENSES[cat.key]))}</td>`
    ).join('');

    container.innerHTML = `
      <div class="fade-in">
        <!-- YTD Progress -->
        <div class="grid grid-3 stagger" style="margin-bottom:24px">
          <div class="card card-sm">
            <div class="flex-between" style="margin-bottom:8px">
              <span class="card-title">${t('budget.revenueAchievement')}</span>
              <span id="rev-achievement-pct" style="font-size:.85rem;font-weight:700">${formatPercent(revAchievement)}</span>
            </div>
            <div class="progress-bar" style="height:10px;margin-bottom:8px">
              <div id="rev-achievement-bar" class="progress-fill success" style="width:${Math.min(revAchievement, 100)}%"></div>
            </div>
            <div id="rev-achievement-detail" style="font-size:.7rem;color:var(--text-muted)">${formatBahtCompact(actualRevTotal)} / ${formatBahtCompact(BUDGET.annualRevenue)}</div>
          </div>
          <div class="card card-sm">
            <div class="flex-between" style="margin-bottom:8px">
              <span class="card-title">${t('budget.costAchievement')}</span>
              <span id="cost-achievement-pct" style="font-size:.85rem;font-weight:700">${formatPercent(costAchievement)}</span>
            </div>
            <div class="progress-bar" style="height:10px;margin-bottom:8px">
              <div id="cost-achievement-bar" class="progress-fill ${costAchievement > 100 ? 'danger' : ''}" style="width:${Math.min(costAchievement, 100)}%"></div>
            </div>
            <div id="cost-achievement-detail" style="font-size:.7rem;color:var(--text-muted)">${formatBahtCompact(actualCostTotal)} / ${formatBahtCompact(BUDGET.annualCost)}</div>
          </div>
          <div class="card card-sm">
            <div class="flex-between" style="margin-bottom:8px">
              <span class="card-title">${t('budget.profitAchievement')}</span>
              <span id="profit-achievement-val" style="font-size:.85rem;font-weight:700">${formatBahtCompact(actualProfitTotal)}</span>
            </div>
            <div class="progress-bar" style="height:10px;margin-bottom:8px">
              <div id="profit-achievement-bar" class="progress-fill ${actualProfitTotal >= BUDGET.annualProfit ? 'success' : 'danger'}" style="width:${BUDGET.annualProfit > 0 ? Math.min(Math.max(actualProfitTotal / BUDGET.annualProfit * 100, 0), 100) : 0}%"></div>
            </div>
            <div id="profit-target-label" style="font-size:.7rem;color:var(--text-muted)">${t('th.budget')}: ${formatBahtCompact(BUDGET.annualProfit)}</div>
          </div>
        </div>

        <!-- Action Bar -->
        <div class="flex gap-8" style="position:sticky;top:var(--header-height);z-index:40;background:var(--bg-surface);margin:0 -32px 24px;padding:12px 32px;border-bottom:1px solid var(--border-default);box-shadow:var(--shadow-sm);flex-wrap:wrap;align-items:center">
          <button class="btn btn-primary btn-sm" id="btn-save">
            <i data-lucide="save" style="width:14px;height:14px"></i> ${t('btn.save')}
          </button>
          <button class="btn btn-secondary btn-sm" id="btn-undo" disabled style="opacity:0.5;cursor:not-allowed">
            <i data-lucide="undo-2" style="width:14px;height:14px"></i> ${t('btn.undo')}
          </button>
          <div class="btn-group-separator"></div>
          <button class="btn btn-secondary btn-sm" id="btn-export-csv">
            <i data-lucide="file-spreadsheet" style="width:14px;height:14px"></i> ${t('btn.exportCsv')}
          </button>
          <button class="btn btn-secondary btn-sm" id="btn-export">
            <i data-lucide="download" style="width:14px;height:14px"></i> ${t('btn.exportJson')}
          </button>
          <button class="btn btn-secondary btn-sm" id="btn-import">
            <i data-lucide="upload" style="width:14px;height:14px"></i> ${t('btn.importJson')}
          </button>
          <div class="btn-group-separator"></div>
          <button class="btn btn-danger btn-sm" id="btn-reset-budget">
            <i data-lucide="trash-2" style="width:14px;height:14px"></i> ${t('btn.resetShort')}
          </button>
          <div class="btn-group-separator"></div>
          <button class="btn btn-primary btn-sm" id="btn-go-expenses">
            <i data-lucide="external-link" style="width:14px;height:14px"></i> ${t('budget.editInExpenses')}
          </button>
          <span id="budget-save-indicator" class="save-indicator" style="margin-left:auto">${budgetSavedStr ? `${t('status.lastSaved')}: ${budgetSavedStr}` : ''}</span>
          <span id="sync-indicator" class="save-indicator">${lastSavedExpStr ? `${t('budget.syncedFrom')}: ${lastSavedExpStr}` : ''}</span>
        </div>
        <input type="file" id="import-file" accept=".json" style="display:none">

        <!-- Cost Budget vs Actual by Category (per-category targets) -->
        <div class="card" style="margin-bottom:24px">
          <div class="card-header">
            <span class="card-title">${t('budget.costByCategory')}</span>
            <span style="font-size:.7rem;color:var(--text-muted)">${t('budget.perCategory')}</span>
          </div>
          <div class="data-table-wrapper">
            <table class="data-table data-table-dense" id="cost-table">
              <thead>
                <tr>
                  <th rowspan="2">${t('th.month')}</th>
                  ${costCatColHeaders}
                  <th class="text-right" rowspan="2">${t('th.budget')}<br><small>${t('th.total')}</small></th>
                  <th class="text-right" rowspan="2">${t('th.actualTotal')}</th>
                  <th class="text-right" rowspan="2">${t('th.variance')}</th>
                  <th class="text-center" rowspan="2">${t('th.status')}</th>
                </tr>
                <tr>
                  ${costCatSubHeaders}
                </tr>
              </thead>
              <tbody>
                ${months.map((m, i) => `
                  <tr>
                    <td>${m}</td>
                    ${COST_CATS.map(cat => `
                      <td class="text-right">
                        <input type="text" inputmode="numeric" class="ba-input" data-cost-cat="${cat.key}" data-month="${i}"
                               value="${formatInputDisplay(BUDGET.cost[cat.key][i])}" placeholder="0">
                      </td>
                      <td class="text-right" data-cost-actual="${cat.key}" data-cost-month="${i}">${formatBaht(EXPENSES[cat.key][i])}</td>
                    `).join('')}
                    <td class="text-right" data-budget-total="${i}">${formatBaht(BUDGET.costTotal[i])}</td>
                    <td class="text-right" data-cost-total="${i}">${TOTAL_MONTHLY_COST[i] > 0 ? formatBaht(TOTAL_MONTHLY_COST[i]) : '—'}</td>
                    <td class="text-right ${costTotalVariance[i].pct < 0 ? 'text-success' : costTotalVariance[i].pct > 0 ? 'text-danger' : ''}" data-cost-var="${i}">
                      ${TOTAL_MONTHLY_COST[i] > 0 ? formatPercentSigned(costTotalVariance[i].pct) : '—'}
                    </td>
                    <td class="text-center" data-cost-status="${i}">${TOTAL_MONTHLY_COST[i] > 0 ? getStatusBadge(costTotalVariance[i].pct) : `<span class="badge badge-muted">${t('status.pending')}</span>`}</td>
                  </tr>
                `).join('')}
              </tbody>
              <tfoot>
                <tr class="total-row">
                  <td><strong>${t('th.total')}</strong></td>
                  ${costCatFooterTotals}
                  <td class="text-right" id="total-budget-cost">${formatBaht(budgetCostTotal)}</td>
                  <td class="text-right" id="total-actual-cost">${formatBaht(actualCostTotal)}</td>
                  <td class="text-right ${costVarPct < 0 ? 'text-success' : costVarPct > 0 ? 'text-danger' : ''}" id="total-cost-var">
                    ${actualCostTotal > 0 ? formatPercentSigned(costVarPct) : '—'}
                  </td>
                  <td class="text-center" id="total-cost-status">${actualCostTotal > 0 ? getStatusBadge(costVarPct) : `<span class="badge badge-muted">${t('status.pending')}</span>`}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        <!-- Cost Detail by Category (read-only) -->
        ${DETAILED_CATEGORIES.length > 0 ? `
        <div class="card">
          <div class="card-header">
            <span class="card-title">${t('budget.costDetailByCategory')}</span>
            <button class="btn btn-secondary btn-sm" id="btn-detail-go-expenses">
              <i data-lucide="external-link" style="width:14px;height:14px"></i> ${t('budget.editInExpenses')}
            </button>
          </div>
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:16px">
            <div class="tab-group" style="flex:1" id="detail-tabs">
              ${DETAILED_CATEGORIES.map(cat => `
                <button class="tab-btn${cat === activeDetailTab ? ' active' : ''}" data-tab="${cat}">${t('cat.' + cat)}</button>
              `).join('')}
            </div>
          </div>
          <div class="data-table-wrapper" id="detail-table-container">
            ${activeDetailTab ? buildReadOnlyDetailTableHTML(activeDetailTab) : ''}
          </div>
        </div>
        ` : ''}
      </div>
    `;

    if (typeof lucide !== 'undefined') lucide.createIcons();

    bindBudgetInputHandlers();
    bindActionButtons();
    updateIndicators();
  }

  function bindBudgetInputHandlers() {
    container.querySelectorAll('.ba-input').forEach(input => {
      input.addEventListener('input', () => {
        const cat = input.dataset.costCat;
        const month = parseInt(input.dataset.month);
        reformatInput(input);
        const raw = parseInputValue(input.value);
        BUDGET.cost[cat][month] = raw;
        recalcBudget();
        isDirty = true;
        updateDerivedUI();
        autoSaveDebounced();
      });

      input.addEventListener('focus', () => {
        input.select();
      });

      input.addEventListener('blur', () => {
        const cat = input.dataset.costCat;
        const month = parseInt(input.dataset.month);
        input.value = formatInputDisplay(BUDGET.cost[cat][month]);
      });
    });
  }

  function bindActionButtons() {
    // ── Save budget targets ──
    container.querySelector('#btn-save')?.addEventListener('click', () => {
      undoBuffer = snapshotBudget();
      saveBudget();
      isDirty = false;
      updateIndicators();
      showToast(t('budget.budgetSaved'), 'success');
    });

    // ── Undo ──
    container.querySelector('#btn-undo')?.addEventListener('click', () => {
      if (!undoBuffer) return;
      for (const k of costKeys) {
        for (let i = 0; i < 12; i++) {
          BUDGET.cost[k][i] = undoBuffer.cost[k][i];
        }
      }
      recalcBudget();
      undoBuffer = null;
      isDirty = true;
      container.querySelectorAll('.ba-input').forEach(input => {
        const cat = input.dataset.costCat;
        const month = parseInt(input.dataset.month);
        input.value = formatInputDisplay(BUDGET.cost[cat][month]);
      });
      updateDerivedUI();
      showToast(t('toast.undoSuccess'), 'success');
    });

    // ── Reset budget targets ──
    container.querySelector('#btn-reset-budget')?.addEventListener('click', () => {
      if (!confirm(t('budget.confirmReset'))) return;
      undoBuffer = snapshotBudget();
      resetBudget();
      isDirty = false;
      renderPage();
      showToast(t('budget.budgetReset'), 'success');
    });

    // ── Navigate to Expenses ──
    container.querySelector('#btn-go-expenses')?.addEventListener('click', () => {
      navigate('/expenses');
    });
    container.querySelector('#btn-detail-go-expenses')?.addEventListener('click', () => {
      navigate('/expenses');
    });

    // ── Tab click handler ──
    container.querySelector('#detail-tabs')?.addEventListener('click', (e) => {
      const btn = e.target.closest('.tab-btn');
      if (!btn) return;
      switchDetailTab(btn.dataset.tab);
    });

    // ── Export CSV ──
    container.querySelector('#btn-export-csv')?.addEventListener('click', () => {
      const costTotalVariance = getVariance(BUDGET.costTotal, TOTAL_MONTHLY_COST);
      const monthNames = getMonths();

      const headers = [
        'Month',
        ...COST_CATS.flatMap(cat => [`${getCostCatLabel(cat)} Budget`, `${getCostCatLabel(cat)} Actual`]),
        'Budget Total', 'Actual Total', 'Variance %',
      ];

      const rows = monthNames.map((m, i) => [
        m,
        ...COST_CATS.flatMap(cat => [BUDGET.cost[cat.key][i], EXPENSES[cat.key][i]]),
        BUDGET.costTotal[i],
        TOTAL_MONTHLY_COST[i],
        TOTAL_MONTHLY_COST[i] > 0 ? costTotalVariance[i].pct.toFixed(1) + '%' : '—',
      ]);

      // Totals row
      const costVarPctStr = BUDGET.annualCost > 0 ? ((sum(TOTAL_MONTHLY_COST) - BUDGET.annualCost) / BUDGET.annualCost * 100).toFixed(1) + '%' : '—';
      rows.push([
        'Total',
        ...COST_CATS.flatMap(cat => [sum(BUDGET.cost[cat.key]), sum(EXPENSES[cat.key])]),
        BUDGET.annualCost, sum(TOTAL_MONTHLY_COST), costVarPctStr,
      ]);

      // Sub-item detail sections
      rows.push([]);
      for (const cat of DETAILED_CATEGORIES) {
        const def = SUB_ITEM_DEFS[cat];
        if (!def) continue;
        rows.push([`--- ${t('cat.' + cat)} ---`]);
        const subHeaders = ['Month', ...def.items.map(item => t('sub.' + cat + '.' + item.key)), 'Total'];
        rows.push(subHeaders);
        for (let i = 0; i < 12; i++) {
          rows.push([
            monthNames[i],
            ...def.items.map(item => EXPENSE_DETAILS[cat]?.[item.key]?.[i] ?? 0),
            EXPENSES[cat]?.[i] ?? 0,
          ]);
        }
        rows.push([]);
      }

      downloadCSV('easyslip_budget_vs_actual_cost_2026.csv', headers, rows);
      showToast(t('toast.exportCsvSuccess'), 'success');
    });

    // ── Export JSON ──
    container.querySelector('#btn-export')?.addEventListener('click', () => {
      const json = exportBudgetData();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'easyslip_budget_2026.json';
      a.click();
      URL.revokeObjectURL(url);
      showToast(t('toast.exportJsonSuccess'), 'success');
    });

    // ── Import JSON ──
    container.querySelector('#btn-import')?.addEventListener('click', () => {
      container.querySelector('#import-file')?.click();
    });

    container.querySelector('#import-file')?.addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        if (importBudgetData(reader.result)) {
          isDirty = false;
          renderPage();
          showToast(t('toast.importSuccess'), 'success');
        } else {
          showToast(t('toast.importFailed'), 'error');
        }
      };
      reader.readAsText(file);
    });
  }

  renderPage();

  return () => destroyAllCharts();
}
