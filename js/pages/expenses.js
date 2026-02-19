// ============================================
// EasySlip 2026 — Page: Editable Expenses
// Edit monthly costs with live update
// Sub-item detail editing with category tabs
// Dynamic category/sub-item management
// ============================================

import {
  EXPENSES, CATEGORY_LABELS, CATEGORY_KEYS, TOTAL_MONTHLY_COST, ANNUAL_TOTAL_COST,
  recalcExpenses, saveExpenses, resetExpenses, zeroExpenses, getLastSavedExpenses, getAnnualByCategory,
  SUB_ITEM_DEFS, EXPENSE_DETAILS, recalcFromDetails, DETAILED_CATEGORIES, SIMPLE_CATEGORIES,
  getCategorySchema, getCategoryColor,
  addCategory, removeCategory, renameCategory, setCategoryColor,
  addSubItem, removeSubItem, renameSubItem,
} from '../data/expenses.js';
import { MONTHS_TH } from '../data/constants.js';
import { createChart, updateChart, destroyAllCharts } from '../components/charts.js';
import { showToast } from '../components/toast.js';
import { openModal, closeModal } from '../components/modal.js';
import { setPageTitle, formatBaht, formatBahtCompact, downloadCSV, debounce } from '../utils.js';
import { t, getMonths } from '../i18n.js';
import {
  formatInputDisplay as _formatInputDisplay,
  parseInputValue as _parseInputValue,
  formatLastSaved,
  updateUndoButton as _updateUndoButton,
  updateSaveIndicator as _updateSaveIndicator,
  reformatInput,
  createAutoSave,
  renderActionBar,
} from '../shared/editable-page.js';

// Dynamic category colors from schema
function getCatColors() {
  return CATEGORY_KEYS.map(key => getCategoryColor(key));
}

export function render(container) {
  setPageTitle(t('page.expenses.title'));

  const months = getMonths();
  let undoBuffer = null;
  let isDirty = false;
  let activeTab = DETAILED_CATEGORIES[0]; // default: first detailed category

  // ── Helpers ──

  function formatInputDisplay(value) {
    return _formatInputDisplay(value);
  }

  function parseInputValue(str) {
    return _parseInputValue(str);
  }

  // ── Core: update derived UI without re-rendering ──

  function updateDerivedUI() {
    recalcExpenses();
    updateSummaryTable();
    updateMetricCards();
    updateSaveIndicator();
    updateUndoButton();
  }

  function updateSummaryTable() {
    // Per-cell values in summary table (skip simple categories — they have inputs)
    const simpleSet = getSimpleSet();
    for (const key of CATEGORY_KEYS) {
      if (simpleSet.has(key)) continue;
      for (let i = 0; i < 12; i++) {
        const cell = container.querySelector(`[data-summary-cat="${key}"][data-summary-month="${i}"]`);
        if (cell) cell.textContent = formatBaht(EXPENSES[key][i]);
      }
    }

    // Per-row totals
    for (let i = 0; i < 12; i++) {
      const totalCell = container.querySelector(`[data-total-month="${i}"]`);
      if (totalCell) totalCell.textContent = formatBaht(TOTAL_MONTHLY_COST[i]);
    }

    // Footer per-category totals
    const annualByCat = getAnnualByCategory();
    for (const key of CATEGORY_KEYS) {
      const el = container.querySelector(`#total-${key}`);
      if (el) el.textContent = formatBaht(annualByCat[key]);
    }

    // Footer grand total
    const totalAllEl = container.querySelector('#total-all');
    if (totalAllEl) {
      const grandTotal = TOTAL_MONTHLY_COST.reduce((a, b) => a + b, 0);
      totalAllEl.textContent = formatBaht(grandTotal);
    }
  }

  function updateDetailTotals() {
    // Update per-row parent totals in the active detail table
    const cat = activeTab;
    for (let i = 0; i < 12; i++) {
      const el = container.querySelector(`[data-detail-total-month="${i}"]`);
      if (el) el.textContent = formatBaht(EXPENSES[cat]?.[i] ?? 0);
    }
    // Update annual sub-item totals
    const subs = EXPENSE_DETAILS[cat];
    if (subs) {
      for (const subKey of Object.keys(subs)) {
        const el = container.querySelector(`#detail-annual-${subKey}`);
        if (el) el.textContent = formatBaht(subs[subKey].reduce((a, b) => a + b, 0));
      }
    }
    // Update annual parent total in detail footer
    const annualEl = container.querySelector('#detail-annual-total');
    if (annualEl) annualEl.textContent = formatBaht((EXPENSES[cat] ?? []).reduce((a, b) => a + b, 0));
  }

  function updateMetricCards() {
    const annualByCat = getAnnualByCategory();
    const grandTotal = TOTAL_MONTHLY_COST.reduce((a, b) => a + b, 0);

    const mcTotal = container.querySelector('#mc-total-cost');
    const mcSystem = container.querySelector('#mc-system-cost');
    const mcSalary = container.querySelector('#mc-salary');
    const mcTax = container.querySelector('#mc-tax');

    if (mcTotal) mcTotal.textContent = formatBahtCompact(grandTotal);
    if (mcSystem) mcSystem.textContent = formatBahtCompact(annualByCat.system_cost ?? 0);
    if (mcSalary) mcSalary.textContent = formatBahtCompact(annualByCat.salary ?? 0);
    if (mcTax) mcTax.textContent = formatBahtCompact(annualByCat.tax ?? 0);
  }

  function updateSaveIndicator() {
    _updateSaveIndicator(container, {
      selector: '#exp-save-indicator',
      isDirty,
      getLastSaved: getLastSavedExpenses,
    });
  }

  function updateUndoButton() {
    _updateUndoButton(container, undoBuffer);
  }

  function updateAllCharts() {
    const colors = getCatColors();
    // Stacked bar — all categories
    updateChart('exp-stacked-bar', CATEGORY_KEYS.map(key => ({
      name: t('cat.' + key),
      data: [...EXPENSES[key]],
    })));

    // All categories trend lines
    updateChart('exp-trend-lines', CATEGORY_KEYS.map(key => ({
      name: t('cat.' + key),
      data: [...EXPENSES[key]],
    })));
  }

  // ── Debounced actions ──

  const updateChartDebounced = debounce(() => updateAllCharts(), 2000);
  const autoSaveDebounced = createAutoSave({
    saveFn: saveExpenses,
    setDirty: (v) => { isDirty = v; },
    updateIndicator: updateSaveIndicator,
  });

  // ── Build summary table HTML (simple categories are editable inline) ──

  function getSimpleSet() { return new Set(SIMPLE_CATEGORIES); }

  function buildSummaryTableHTML() {
    const simpleSet = getSimpleSet();
    const annualByCat = getAnnualByCategory();
    const grandTotal = TOTAL_MONTHLY_COST.reduce((a, b) => a + b, 0);

    return `
      <table class="data-table data-table-dense" id="summary-table">
        <thead>
          <tr>
            <th>${t('th.month')}</th>
            ${CATEGORY_KEYS.map(key => `<th class="text-right">${t('cat.' + key)}</th>`).join('')}
            <th class="text-right">${t('th.total')}</th>
          </tr>
        </thead>
        <tbody>
          ${months.map((m, i) => `
            <tr>
              <td>${m}</td>
              ${CATEGORY_KEYS.map(key => simpleSet.has(key) ? `
                <td class="text-right" data-summary-cat="${key}" data-summary-month="${i}">
                  <input type="text" inputmode="numeric" class="actual-input simple-input"
                         data-category="${key}" data-month="${i}"
                         value="${formatInputDisplay(EXPENSES[key][i])}" placeholder="0">
                </td>
              ` : `
                <td class="text-right" data-summary-cat="${key}" data-summary-month="${i}">${formatBaht(EXPENSES[key][i])}</td>
              `).join('')}
              <td class="text-right" data-total-month="${i}"><strong>${formatBaht(TOTAL_MONTHLY_COST[i])}</strong></td>
            </tr>
          `).join('')}
        </tbody>
        <tfoot>
          <tr class="total-row">
            <td><strong>${t('th.total')}</strong></td>
            ${CATEGORY_KEYS.map(key => `<td class="text-right" id="total-${key}"><strong>${formatBaht(annualByCat[key])}</strong></td>`).join('')}
            <td class="text-right" id="total-all"><strong>${formatBaht(grandTotal)}</strong></td>
          </tr>
        </tfoot>
      </table>
    `;
  }

  // ── Build detail table HTML for a category tab ──

  function buildDetailTableHTML(cat) {
    const def = SUB_ITEM_DEFS[cat];
    const subs = EXPENSE_DETAILS[cat];
    if (!def || !subs) return '<p style="color:var(--text-muted);padding:12px">No sub-items defined</p>';

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
                <td class="text-right">
                  <input type="text" inputmode="numeric" class="actual-input detail-input"
                         data-detail-cat="${cat}" data-detail-sub="${item.key}" data-month="${i}"
                         value="${formatInputDisplay(subs[item.key]?.[i] ?? 0)}" placeholder="0">
                </td>
              `).join('')}
              <td class="text-right" data-detail-total-month="${i}">${formatBaht(EXPENSES[cat]?.[i] ?? 0)}</td>
            </tr>
          `).join('')}
        </tbody>
        <tfoot>
          <tr class="total-row">
            <td><strong>${t('th.total')}</strong></td>
            ${def.items.map(item => `
              <td class="text-right" id="detail-annual-${item.key}">${formatBaht((subs[item.key] ?? []).reduce((a, b) => a + b, 0))}</td>
            `).join('')}
            <td class="text-right" id="detail-annual-total">${formatBaht((EXPENSES[cat] ?? []).reduce((a, b) => a + b, 0))}</td>
          </tr>
        </tfoot>
      </table>
    `;
  }

  // ── Switch active tab ──

  function switchTab(cat) {
    activeTab = cat;
    // Update tab buttons
    container.querySelectorAll('#detail-tabs .tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === cat);
    });
    // Re-render detail table
    const tableContainer = container.querySelector('#detail-table-container');
    if (tableContainer) {
      tableContainer.innerHTML = buildDetailTableHTML(cat);
      bindDetailInputHandlers();
    }
  }

  // ══════════════════════════════════════════════
  // Category Manager Modal
  // ══════════════════════════════════════════════

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

    function buildContent() {
      return `
        <div id="cat-list">${buildCategoryListHTML()}</div>
        <div style="margin-top:16px">
          <button class="btn btn-primary btn-sm" id="cat-add-btn">+ ${t('modal.addCategory')}</button>
        </div>
        <div id="cat-add-form" style="display:none;margin-top:16px;padding:16px;background:var(--bg-base);border-radius:var(--radius-md);border:1px solid var(--border-default)">
          <div class="modal-form-group">
            <label>${t('modal.categoryNameTh')}</label>
            <input type="text" id="cat-name-th" placeholder="e.g. ค่าเช่า">
          </div>
          <div class="modal-form-group">
            <label>${t('modal.categoryNameEn')}</label>
            <input type="text" id="cat-name-en" placeholder="e.g. Rent">
          </div>
          <div class="modal-form-group">
            <label>${t('modal.type')}</label>
            <div class="modal-radio-group">
              <label><input type="radio" name="cat-type" value="simple" checked> ${t('modal.typeSimple')}</label>
              <label><input type="radio" name="cat-type" value="detailed"> ${t('modal.typeDetailed')}</label>
            </div>
          </div>
          <div class="modal-form-group" id="cat-subtype-group" style="display:none">
            <label>Sub-item type</label>
            <div class="modal-radio-group">
              <label><input type="radio" name="cat-subtype" value="fixed" checked> ${t('modal.subItemTypeFixed')}</label>
              <label><input type="radio" name="cat-subtype" value="pct"> ${t('modal.subItemTypePct')}</label>
            </div>
          </div>
          <div class="modal-form-group">
            <label>${t('modal.color')}</label>
            <input type="color" class="modal-color-input" id="cat-color" value="#64748b">
          </div>
          <div class="flex gap-8" style="margin-top:12px">
            <button class="btn btn-primary btn-sm" id="cat-add-confirm">${t('modal.add')}</button>
            <button class="btn btn-secondary btn-sm" id="cat-add-cancel">${t('modal.cancel')}</button>
          </div>
        </div>
      `;
    }

    const modal = openModal({
      title: t('modal.manageCategories'),
      content: buildContent(),
      width: '560px',
    });

    function refreshList() {
      const list = modal.querySelector('#cat-list');
      if (list) list.innerHTML = buildCategoryListHTML();
      bindListHandlers();
    }

    function bindListHandlers() {
      // Rename
      modal.querySelectorAll('.cat-rename-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const key = btn.dataset.key;
          const cat = schema.find(c => c.key === key);
          if (!cat) return;
          openRenameDialog(key, cat.label, (newLabel) => {
            renameCategory(key, newLabel);
            refreshList();
            showToast(t('toast.categoryRenamed'), 'success', 2000);
          });
        });
      });

      // Sub-items
      modal.querySelectorAll('.cat-sub-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          closeModal(modal);
          openSubItemManager(btn.dataset.key);
        });
      });

      // Delete
      modal.querySelectorAll('.cat-delete-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          if (confirm(t('modal.confirmDeleteCategory'))) {
            snapshotForUndo();
            removeCategory(btn.dataset.key);
            // Fix activeTab if deleted
            if (activeTab === btn.dataset.key) {
              activeTab = DETAILED_CATEGORIES[0] || null;
            }
            refreshList();
            showToast(t('toast.categoryDeleted'), 'info', 2000);
          }
        });
      });
    }

    bindListHandlers();

    // Add button
    modal.querySelector('#cat-add-btn')?.addEventListener('click', () => {
      modal.querySelector('#cat-add-form').style.display = '';
      modal.querySelector('#cat-add-btn').style.display = 'none';
    });

    modal.querySelector('#cat-add-cancel')?.addEventListener('click', () => {
      modal.querySelector('#cat-add-form').style.display = 'none';
      modal.querySelector('#cat-add-btn').style.display = '';
    });

    // Type radio toggle sub-type group
    modal.querySelectorAll('input[name="cat-type"]').forEach(radio => {
      radio.addEventListener('change', () => {
        const subGroup = modal.querySelector('#cat-subtype-group');
        if (subGroup) subGroup.style.display = radio.value === 'detailed' ? '' : 'none';
      });
    });

    // Confirm add
    modal.querySelector('#cat-add-confirm')?.addEventListener('click', () => {
      const nameTh = modal.querySelector('#cat-name-th')?.value?.trim();
      const nameEn = modal.querySelector('#cat-name-en')?.value?.trim();
      if (!nameTh && !nameEn) return;

      const type = modal.querySelector('input[name="cat-type"]:checked')?.value || 'simple';
      const subItemType = modal.querySelector('input[name="cat-subtype"]:checked')?.value || 'fixed';
      const color = modal.querySelector('#cat-color')?.value || '#64748b';

      snapshotForUndo();
      const result = addCategory({
        label: { th: nameTh || nameEn, en: nameEn || nameTh },
        type,
        color,
        subItemType: type === 'detailed' ? subItemType : undefined,
        subItems: [],
      });

      if (result) {
        // Clear form
        modal.querySelector('#cat-name-th').value = '';
        modal.querySelector('#cat-name-en').value = '';
        modal.querySelector('#cat-add-form').style.display = 'none';
        modal.querySelector('#cat-add-btn').style.display = '';
        refreshList();
        showToast(t('toast.categoryAdded'), 'success', 2000);
      }
    });
  }

  // ══════════════════════════════════════════════
  // Rename Dialog (inline modal)
  // ══════════════════════════════════════════════

  function openRenameDialog(key, currentLabel, onSave) {
    const content = `
      <div class="modal-form-group">
        <label>${t('modal.categoryNameTh')}</label>
        <input type="text" id="rename-th" value="${currentLabel.th || ''}">
      </div>
      <div class="modal-form-group">
        <label>${t('modal.categoryNameEn')}</label>
        <input type="text" id="rename-en" value="${currentLabel.en || ''}">
      </div>
      <div class="flex gap-8" style="margin-top:12px">
        <button class="btn btn-primary btn-sm" id="rename-save">${t('modal.save')}</button>
        <button class="btn btn-secondary btn-sm" id="rename-cancel">${t('modal.cancel')}</button>
      </div>
    `;

    const modal = openModal({
      title: t('modal.rename'),
      content,
      width: '380px',
    });

    modal.querySelector('#rename-save')?.addEventListener('click', () => {
      const th = modal.querySelector('#rename-th')?.value?.trim();
      const en = modal.querySelector('#rename-en')?.value?.trim();
      if (th || en) {
        onSave({ th: th || en, en: en || th });
        closeModal(modal);
      }
    });

    modal.querySelector('#rename-cancel')?.addEventListener('click', () => {
      closeModal(modal);
    });
  }

  // ══════════════════════════════════════════════
  // Sub-Item Manager Modal
  // ══════════════════════════════════════════════

  function openSubItemManager(catKey) {
    const cat = getCategorySchema().find(c => c.key === catKey);
    if (!cat) return;

    function buildSubListHTML() {
      if (!cat.subItems || cat.subItems.length === 0) {
        return '<p style="color:var(--text-muted);font-size:.8rem;padding:8px 0">No sub-items yet</p>';
      }
      return cat.subItems.map(sub => `
        <div class="modal-item-row">
          <div>
            <span class="item-label">${t('sub.' + catKey + '.' + sub.key)}</span>
          </div>
          <div class="item-actions">
            <button class="btn btn-secondary btn-sm sub-rename-btn" data-key="${sub.key}">${t('modal.rename')}</button>
            <button class="btn btn-danger btn-sm sub-delete-btn" data-key="${sub.key}">${t('modal.delete')}</button>
          </div>
        </div>
      `).join('');
    }

    function buildContent() {
      return `
        <div id="sub-list">${buildSubListHTML()}</div>
        <div style="margin-top:16px;display:flex;gap:8px;flex-wrap:wrap">
          <button class="btn btn-primary btn-sm" id="sub-add-btn">+ ${t('modal.addSubItem')}</button>
          <button class="btn btn-secondary btn-sm" id="sub-back-btn">${t('modal.back')}</button>
        </div>
        <div id="sub-add-form" style="display:none;margin-top:16px;padding:16px;background:var(--bg-base);border-radius:var(--radius-md);border:1px solid var(--border-default)">
          <div class="modal-form-group">
            <label>${t('modal.categoryNameTh')}</label>
            <input type="text" id="sub-name-th" placeholder="e.g. ค่าเซิร์ฟเวอร์">
          </div>
          <div class="modal-form-group">
            <label>${t('modal.categoryNameEn')}</label>
            <input type="text" id="sub-name-en" placeholder="e.g. Server">
          </div>
          <div class="flex gap-8" style="margin-top:12px">
            <button class="btn btn-primary btn-sm" id="sub-add-confirm">${t('modal.add')}</button>
            <button class="btn btn-secondary btn-sm" id="sub-add-cancel">${t('modal.cancel')}</button>
          </div>
        </div>
      `;
    }

    const modal = openModal({
      title: `${t('modal.manageSubItems')}: ${t('cat.' + catKey)}`,
      content: buildContent(),
      width: '480px',
    });

    function refreshSubList() {
      const list = modal.querySelector('#sub-list');
      if (list) list.innerHTML = buildSubListHTML();
      bindSubListHandlers();
    }

    function bindSubListHandlers() {
      modal.querySelectorAll('.sub-rename-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const sub = cat.subItems?.find(s => s.key === btn.dataset.key);
          if (!sub) return;
          openRenameDialog(btn.dataset.key, sub.label, (newLabel) => {
            renameSubItem(catKey, btn.dataset.key, newLabel);
            refreshSubList();
            showToast(t('toast.subItemRenamed'), 'success', 2000);
          });
        });
      });

      modal.querySelectorAll('.sub-delete-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          if (confirm(t('modal.confirmDeleteSubItem'))) {
            snapshotForUndo();
            removeSubItem(catKey, btn.dataset.key);
            refreshSubList();
            showToast(t('toast.subItemDeleted'), 'info', 2000);
          }
        });
      });
    }

    bindSubListHandlers();

    // Back button → open category manager
    modal.querySelector('#sub-back-btn')?.addEventListener('click', () => {
      closeModal(modal);
      openCategoryManager();
    });

    // Add sub-item form toggle
    modal.querySelector('#sub-add-btn')?.addEventListener('click', () => {
      modal.querySelector('#sub-add-form').style.display = '';
      modal.querySelector('#sub-add-btn').style.display = 'none';
    });

    modal.querySelector('#sub-add-cancel')?.addEventListener('click', () => {
      modal.querySelector('#sub-add-form').style.display = 'none';
      modal.querySelector('#sub-add-btn').style.display = '';
    });

    // Confirm add sub-item
    modal.querySelector('#sub-add-confirm')?.addEventListener('click', () => {
      const nameTh = modal.querySelector('#sub-name-th')?.value?.trim();
      const nameEn = modal.querySelector('#sub-name-en')?.value?.trim();
      if (!nameTh && !nameEn) return;

      snapshotForUndo();
      const result = addSubItem(catKey, {
        label: { th: nameTh || nameEn, en: nameEn || nameTh },
      });

      if (result) {
        modal.querySelector('#sub-name-th').value = '';
        modal.querySelector('#sub-name-en').value = '';
        modal.querySelector('#sub-add-form').style.display = 'none';
        modal.querySelector('#sub-add-btn').style.display = '';
        refreshSubList();
        showToast(t('toast.subItemAdded'), 'success', 2000);
      }
    });
  }

  // ── Build Page ──

  function renderPage() {
    const lastSavedStr = formatLastSaved(getLastSavedExpenses());
    const colors = getCatColors();

    // Ensure activeTab is valid
    if (!DETAILED_CATEGORIES.includes(activeTab)) {
      activeTab = DETAILED_CATEGORIES[0] || null;
    }

    container.innerHTML = `
      <div class="fade-in">
        <!-- Summary Cards -->
        <div class="grid grid-4 stagger" style="margin-bottom:24px">
          <div class="card card-sm">
            <div style="display:flex;align-items:center;gap:12px">
              <div class="icon-box" style="background:#ef444420"><i data-lucide="receipt" style="width:20px;height:20px;color:#ef4444"></i></div>
              <div>
                <div style="font-size:.75rem;color:var(--text-muted)">${t('expenses.annualTotal')}</div>
                <div id="mc-total-cost" style="font-size:1.25rem;font-weight:700">${formatBahtCompact(TOTAL_MONTHLY_COST.reduce((a, b) => a + b, 0))}</div>
              </div>
            </div>
          </div>
          <div class="card card-sm">
            <div style="display:flex;align-items:center;gap:12px">
              <div class="icon-box" style="background:#ef444420"><i data-lucide="server" style="width:20px;height:20px;color:#ef4444"></i></div>
              <div>
                <div style="font-size:.75rem;color:var(--text-muted)">${t('expenses.systemCost')}</div>
                <div id="mc-system-cost" style="font-size:1.25rem;font-weight:700">${formatBahtCompact(getAnnualByCategory().system_cost ?? 0)}</div>
              </div>
            </div>
          </div>
          <div class="card card-sm">
            <div style="display:flex;align-items:center;gap:12px">
              <div class="icon-box" style="background:#f9731620"><i data-lucide="users" style="width:20px;height:20px;color:#f97316"></i></div>
              <div>
                <div style="font-size:.75rem;color:var(--text-muted)">${t('expenses.salary')}</div>
                <div id="mc-salary" style="font-size:1.25rem;font-weight:700">${formatBahtCompact(getAnnualByCategory().salary ?? 0)}</div>
              </div>
            </div>
          </div>
          <div class="card card-sm">
            <div style="display:flex;align-items:center;gap:12px">
              <div class="icon-box" style="background:#ec489920"><i data-lucide="landmark" style="width:20px;height:20px;color:#ec4899"></i></div>
              <div>
                <div style="font-size:.75rem;color:var(--text-muted)">${t('expenses.tax')}</div>
                <div id="mc-tax" style="font-size:1.25rem;font-weight:700">${formatBahtCompact(getAnnualByCategory().tax ?? 0)}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Action Buttons -->
        ${renderActionBar({
          indicatorId: 'exp-save-indicator',
          indicatorContent: lastSavedStr ? `${t('status.lastSaved')}: ${lastSavedStr}` : '',
          extraButtons: `<button class="btn btn-secondary btn-sm" id="btn-zero"><i data-lucide="eraser" style="width:14px;height:14px"></i> ${t('btn.zeroExpenses')}</button>`,
        })}

        <!-- Charts -->
        <div class="grid grid-2" style="margin-bottom:24px">
          <div class="card">
            <div class="card-header">
              <span class="card-title">${t('expenses.monthlyCostBreakdown')}</span>
            </div>
            <div id="exp-stacked-bar" class="chart-container"></div>
          </div>
          <div class="card">
            <div class="card-header">
              <span class="card-title">${t('expenses.categoriesTrend')}</span>
            </div>
            <div id="exp-trend-lines" class="chart-container"></div>
          </div>
        </div>

        <!-- Summary Table (read-only) -->
        <div class="card" style="margin-bottom:24px">
          <div class="card-header">
            <span class="card-title">${t('expenses.summaryTable')}</span>
            <button class="btn btn-secondary btn-sm" id="btn-manage-categories" title="${t('modal.manageCategories')}">
              <i data-lucide="settings" style="width:14px;height:14px"></i> ${t('modal.manageCategories')}
            </button>
          </div>
          <div class="data-table-wrapper">
            ${buildSummaryTableHTML()}
          </div>
        </div>

        <!-- Detail by Category (tabs) -->
        ${DETAILED_CATEGORIES.length > 0 ? `
        <div class="card" style="margin-bottom:24px">
          <div class="card-header">
            <span class="card-title">${t('expenses.detailByCategory')}</span>
          </div>
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:16px">
            <div class="tab-group" style="flex:1" id="detail-tabs">
              ${DETAILED_CATEGORIES.map(cat => `
                <button class="tab-btn${cat === activeTab ? ' active' : ''}" data-tab="${cat}">${t('cat.' + cat)}</button>
              `).join('')}
            </div>
            <button class="btn btn-secondary btn-sm" id="btn-manage-subitems" title="${t('modal.manageSubItems')}">
              <i data-lucide="list" style="width:14px;height:14px"></i>
            </button>
          </div>
          <div class="data-table-wrapper" id="detail-table-container">
            ${activeTab ? buildDetailTableHTML(activeTab) : ''}
          </div>
        </div>
        ` : ''}

      </div>
    `;

    if (typeof lucide !== 'undefined') lucide.createIcons();

    // ── Charts ──

    createChart('exp-stacked-bar', {
      chart: { type: 'bar', height: 350, stacked: true },
      series: CATEGORY_KEYS.map(key => ({
        name: t('cat.' + key),
        data: [...EXPENSES[key]],
      })),
      xaxis: { categories: months },
      colors: colors,
      plotOptions: { bar: { borderRadius: 2, columnWidth: '60%' } },
      yaxis: { labels: { formatter: v => `฿${(v / 1000000).toFixed(1)}M`, style: { colors: '#94a3b8' } } },
      legend: { position: 'bottom', fontSize: '10px' },
    });

    createChart('exp-trend-lines', {
      chart: { type: 'line', height: 350 },
      series: CATEGORY_KEYS.map(key => ({
        name: t('cat.' + key),
        data: [...EXPENSES[key]],
      })),
      xaxis: { categories: months },
      colors: colors,
      yaxis: { labels: { formatter: v => `฿${(v / 1000).toFixed(0)}K`, style: { colors: '#94a3b8' } } },
      markers: { size: 3 },
    });

    // ── Bind handlers ──
    bindTabHandlers();
    bindDetailInputHandlers();
    bindSimpleInputHandlers();
    bindActionButtons();
    bindManageButtons();
  }

  // ── Tab click handler ──

  function bindTabHandlers() {
    container.querySelector('#detail-tabs')?.addEventListener('click', (e) => {
      const btn = e.target.closest('.tab-btn');
      if (!btn) return;
      switchTab(btn.dataset.tab);
    });
  }

  // ── Detail sub-item input handlers ──

  function bindDetailInputHandlers() {
    container.querySelectorAll('.detail-input').forEach(input => {
      input.addEventListener('input', () => {
        const cat = input.dataset.detailCat;
        const sub = input.dataset.detailSub;
        const month = parseInt(input.dataset.month);
        const raw = parseInputValue(input.value);

        reformatInput(input);

        if (EXPENSE_DETAILS[cat]?.[sub]) {
          EXPENSE_DETAILS[cat][sub][month] = raw;
        }
        recalcFromDetails(cat);
        isDirty = true;

        updateDerivedUI();
        updateDetailTotals();
        updateChartDebounced();
        autoSaveDebounced();
      });

      input.addEventListener('focus', () => {
        const cat = input.dataset.detailCat;
        const sub = input.dataset.detailSub;
        const month = parseInt(input.dataset.month);
        const val = EXPENSE_DETAILS[cat]?.[sub]?.[month] ?? 0;
        input.value = val > 0 ? String(val) : '';
        input.select();
      });

      input.addEventListener('blur', () => {
        const cat = input.dataset.detailCat;
        const sub = input.dataset.detailSub;
        const month = parseInt(input.dataset.month);
        const val = EXPENSE_DETAILS[cat]?.[sub]?.[month] ?? 0;
        input.value = formatInputDisplay(val);
        updateAllCharts();
      });
    });
  }

  // ── Simple category input handlers ──

  function bindSimpleInputHandlers() {
    container.querySelectorAll('.simple-input').forEach(input => {
      input.addEventListener('input', () => {
        const category = input.dataset.category;
        const month = parseInt(input.dataset.month);
        const raw = parseInputValue(input.value);

        reformatInput(input);

        if (EXPENSES[category]) {
          EXPENSES[category][month] = raw;
        }
        isDirty = true;

        updateDerivedUI();
        updateChartDebounced();
        autoSaveDebounced();
      });

      input.addEventListener('focus', () => {
        const category = input.dataset.category;
        const month = parseInt(input.dataset.month);
        const val = EXPENSES[category]?.[month] ?? 0;
        input.value = val > 0 ? String(val) : '';
        input.select();
      });

      input.addEventListener('blur', () => {
        const category = input.dataset.category;
        const month = parseInt(input.dataset.month);
        const val = EXPENSES[category]?.[month] ?? 0;
        input.value = formatInputDisplay(val);
        updateAllCharts();
      });
    });
  }

  function snapshotForUndo() {
    undoBuffer = { expenses: {}, details: {}, schema: JSON.parse(JSON.stringify(getCategorySchema())) };
    for (const key of CATEGORY_KEYS) {
      undoBuffer.expenses[key] = [...EXPENSES[key]];
    }
    for (const cat of DETAILED_CATEGORIES) {
      undoBuffer.details[cat] = {};
      if (SUB_ITEM_DEFS[cat]) {
        for (const item of SUB_ITEM_DEFS[cat].items) {
          if (EXPENSE_DETAILS[cat]?.[item.key]) {
            undoBuffer.details[cat][item.key] = [...EXPENSE_DETAILS[cat][item.key]];
          }
        }
      }
    }
  }

  function bindManageButtons() {
    // Category manager button
    container.querySelector('#btn-manage-categories')?.addEventListener('click', () => {
      openCategoryManager();
    });

    // Sub-item manager button (for active tab)
    container.querySelector('#btn-manage-subitems')?.addEventListener('click', () => {
      if (activeTab) openSubItemManager(activeTab);
    });
  }

  function bindActionButtons() {
    // ── Save ──
    container.querySelector('#btn-save')?.addEventListener('click', () => {
      snapshotForUndo();
      saveExpenses();
      isDirty = false;
      updateSaveIndicator();
      updateUndoButton();
      showToast(t('toast.expensesSaved'), 'success', 2000);
    });

    // ── Undo ──
    container.querySelector('#btn-undo')?.addEventListener('click', () => {
      if (!undoBuffer) return;

      // Restore expenses
      for (const key of Object.keys(undoBuffer.expenses)) {
        if (EXPENSES[key]) {
          for (let i = 0; i < 12; i++) {
            EXPENSES[key][i] = undoBuffer.expenses[key][i];
          }
        }
      }
      // Restore details
      for (const cat of Object.keys(undoBuffer.details)) {
        if (EXPENSE_DETAILS[cat]) {
          for (const subKey of Object.keys(undoBuffer.details[cat])) {
            if (EXPENSE_DETAILS[cat][subKey]) {
              for (let i = 0; i < 12; i++) {
                EXPENSE_DETAILS[cat][subKey][i] = undoBuffer.details[cat][subKey][i];
              }
            }
          }
        }
      }

      undoBuffer = null;
      isDirty = true;

      // Re-render everything
      recalcExpenses();
      renderPage();
      showToast(t('toast.undoSuccess'), 'info', 2000);
    });

    // ── Export CSV ──
    container.querySelector('#btn-export-csv')?.addEventListener('click', () => {
      // Build headers: Month + all categories + Total, then sub-item detail rows
      const headerRow = ['Month', ...CATEGORY_KEYS.map(k => t('cat.' + k)), 'Total'];
      const rows = getMonths().map((m, i) => [
        m,
        ...CATEGORY_KEYS.map(k => EXPENSES[k][i]),
        TOTAL_MONTHLY_COST[i],
      ]);

      // Add blank row then sub-item detail sections
      rows.push([]);
      for (const cat of DETAILED_CATEGORIES) {
        const def = SUB_ITEM_DEFS[cat];
        if (!def) continue;
        rows.push([`--- ${t('cat.' + cat)} ---`]);
        const subHeaders = ['Month', ...def.items.map(item => t('sub.' + cat + '.' + item.key)), 'Total'];
        rows.push(subHeaders);
        for (let i = 0; i < 12; i++) {
          rows.push([
            getMonths()[i],
            ...def.items.map(item => EXPENSE_DETAILS[cat]?.[item.key]?.[i] ?? 0),
            EXPENSES[cat]?.[i] ?? 0,
          ]);
        }
        rows.push([]);
      }

      downloadCSV('easyslip_expenses_2026.csv', headerRow, rows);
      showToast(t('toast.exportCsvSuccess'), 'success');
    });

    // ── Zero All Expenses ──
    container.querySelector('#btn-zero')?.addEventListener('click', () => {
      if (!confirm(t('confirm.zeroExpenses'))) return;
      snapshotForUndo();
      zeroExpenses();
      isDirty = true;
      renderPage();
      autoSaveDebounced();
      showToast(t('toast.zeroSuccess'), 'success');
    });

    // ── Reset to Defaults ──
    container.querySelector('#btn-reset')?.addEventListener('click', () => {
      if (confirm(t('confirm.resetExpenses'))) {
        snapshotForUndo();
        resetExpenses();
        isDirty = false;
        activeTab = DETAILED_CATEGORIES[0] || null;
        renderPage();
        showToast(t('toast.resetSuccess'), 'info');
      }
    });
  }

  // Re-render page when any modal closes (schema may have changed)
  const observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
      for (const node of m.removedNodes) {
        if (node.classList?.contains('modal-overlay')) {
          recalcExpenses();
          renderPage();
          return;
        }
      }
    }
  });
  observer.observe(document.body, { childList: true });

  renderPage();

  return () => {
    observer.disconnect();
    destroyAllCharts();
  };
}
