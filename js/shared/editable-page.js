// ============================================
// EasySlip 2026 — Shared: Editable Page Utilities
// Common helpers for pages with editable inputs
// (expenses, budget-vs-actual)
// ============================================

import { debounce } from '../utils.js';
import { t } from '../i18n.js';

/**
 * Format a numeric value for display in an input field.
 * @param {number} value
 * @param {{ decimals?: number }} opts — decimals: 0 for integers (expenses), 2 for floats (budget)
 */
export function formatInputDisplay(value, { decimals = 0 } = {}) {
  if (!value || value === 0) return '';
  return value.toLocaleString('en-US', { maximumFractionDigits: decimals });
}

/**
 * Parse a formatted string back to a number.
 * @param {string} str
 * @param {{ float?: boolean }} opts — float: true to keep decimals (budget), false for integers (expenses)
 */
export function parseInputValue(str, { float = false } = {}) {
  if (float) {
    return parseFloat(String(str).replace(/[^0-9.]/g, '')) || 0;
  }
  return parseInt(String(str).replace(/[^0-9]/g, ''), 10) || 0;
}

/**
 * Format an ISO date string to HH:MM Thai locale.
 * @param {string|null} isoStr
 * @returns {string|null}
 */
export function formatLastSaved(isoStr) {
  if (!isoStr) return null;
  const d = new Date(isoStr);
  return d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
}

/**
 * Update the undo button's disabled/enabled state based on undoBuffer.
 * @param {HTMLElement} container
 * @param {*} undoBuffer — truthy = enabled, falsy = disabled
 */
export function updateUndoButton(container, undoBuffer) {
  const btn = container.querySelector('#btn-undo');
  if (btn) {
    btn.disabled = !undoBuffer;
    btn.style.opacity = undoBuffer ? '1' : '0.5';
    btn.style.cursor = undoBuffer ? 'pointer' : 'not-allowed';
  }
}

/**
 * Update the save indicator element.
 * @param {HTMLElement} container
 * @param {{ selector: string, isDirty: boolean, getLastSaved: () => string|null, emptyText?: string }} opts
 */
export function updateSaveIndicator(container, { selector, isDirty, getLastSaved, emptyText = '' }) {
  const indicatorEl = container.querySelector(selector);
  if (!indicatorEl) return;
  if (isDirty) {
    indicatorEl.innerHTML = `<span class="unsaved-dot"></span> ${t('status.unsaved')}`;
  } else {
    const lastSaved = formatLastSaved(getLastSaved());
    indicatorEl.textContent = lastSaved ? `${t('status.lastSaved')}: ${lastSaved}` : emptyText;
  }
}

/**
 * Reformat an input value in-place while preserving cursor position.
 * @param {HTMLInputElement} input
 * @param {{ float?: boolean }} opts — float: true to allow decimals
 */
export function reformatInput(input, { float = false } = {}) {
  const cursorPos = input.selectionStart;
  const oldLen = input.value.length;

  if (float) {
    const stripped = input.value.replace(/[^0-9.]/g, '');
    const parts = stripped.split('.');
    const intPart = parts[0] ? parseInt(parts[0], 10).toLocaleString('en-US') : '';
    input.value = parts.length > 1 ? `${intPart}.${parts[1]}` : (intPart || '');
  } else {
    const stripped = input.value.replace(/[^0-9]/g, '');
    input.value = stripped ? parseInt(stripped, 10).toLocaleString('en-US') : '';
  }

  const newLen = input.value.length;
  const newPos = Math.max(0, cursorPos + (newLen - oldLen));
  input.setSelectionRange(newPos, newPos);
}

/**
 * Create a debounced auto-save function.
 * @param {{ saveFn: () => void, setDirty: (v: boolean) => void, updateIndicator: () => void }} opts
 * @returns {Function} debounced auto-save function
 */
export function createAutoSave({ saveFn, setDirty, updateIndicator }) {
  return debounce(() => {
    saveFn();
    setDirty(false);
    updateIndicator();
  }, 1500);
}

/**
 * Render the sticky action bar HTML.
 * @param {{ indicatorId: string, indicatorContent: string, resetLabel?: string, extraButtons?: string }} opts
 * @returns {string} HTML string
 */
export function renderActionBar({ indicatorId, indicatorContent, resetLabel, extraButtons = '' }) {
  return `
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
      ${extraButtons}
      <div class="btn-group-separator"></div>
      <button class="btn btn-danger btn-sm" id="btn-reset">
        <i data-lucide="trash-2" style="width:14px;height:14px"></i> ${resetLabel || t('btn.reset')}
      </button>
      <span id="${indicatorId}" class="save-indicator" style="margin-left:auto">${indicatorContent}</span>
    </div>`;
}
