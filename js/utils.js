// ============================================
// EasySlip 2026 — Utility Functions
// ============================================

import { MONTHS_TH, MONTHS_EN } from './data/constants.js';

// ── Currency Formatting ──

/** Format as Thai Baht: ฿1,234,567 */
export function formatBaht(value) {
  if (value == null || isNaN(value)) return '—';
  const abs = Math.abs(value);
  const formatted = abs.toLocaleString('en-US', { maximumFractionDigits: 0 });
  if (value < 0) return `(฿${formatted})`;
  return `฿${formatted}`;
}

/** Compact format: ฿66.8M, ฿1.2K */
export function formatBahtCompact(value) {
  if (value == null || isNaN(value)) return '—';
  const abs = Math.abs(value);
  let result;
  if (abs >= 1_000_000) {
    result = `฿${(abs / 1_000_000).toFixed(1)}M`;
  } else if (abs >= 1_000) {
    result = `฿${(abs / 1_000).toFixed(0)}K`;
  } else {
    result = `฿${abs}`;
  }
  return value < 0 ? `(${result})` : result;
}

/** Format number with commas */
export function formatNumber(value, decimals = 0) {
  if (value == null || isNaN(value)) return '—';
  return value.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

// ── Percentage Formatting ──

export function formatPercent(value, decimals = 1) {
  if (value == null || isNaN(value)) return '—';
  return `${value.toFixed(decimals)}%`;
}

export function formatPercentSigned(value, decimals = 1) {
  if (value == null || isNaN(value)) return '—';
  const prefix = value > 0 ? '+' : '';
  return `${prefix}${value.toFixed(decimals)}%`;
}

// ── Month Helpers ──

export function getThaiMonth(index) {
  return MONTHS_TH[index] || '';
}

export function getEnMonth(index) {
  return MONTHS_EN[index] || '';
}

// ── Array Math ──

export function sum(arr) {
  return arr.reduce((a, b) => a + (b || 0), 0);
}

export function avg(arr) {
  const filtered = arr.filter(v => v != null && !isNaN(v));
  return filtered.length ? sum(filtered) / filtered.length : 0;
}

export function minMax(arr) {
  const filtered = arr.filter(v => v != null && !isNaN(v));
  if (!filtered.length) return { min: 0, max: 0 };
  return {
    min: Math.min(...filtered),
    max: Math.max(...filtered),
  };
}

// ── Change / Delta ──

export function calcChange(current, previous) {
  if (!previous || previous === 0) {
    const dir = current > 0 ? 'up' : current < 0 ? 'down' : 'neutral';
    return { abs: current, pct: current !== 0 ? 100 : 0, direction: dir };
  }
  const abs = current - previous;
  const pct = (abs / Math.abs(previous)) * 100;
  const direction = abs > 0 ? 'up' : abs < 0 ? 'down' : 'neutral';
  return { abs, pct, direction };
}

// ── Debounce ──

export function debounce(fn, delay = 150) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

// ── DOM Helpers ──

export function el(tag, attrs = {}, children = []) {
  const element = document.createElement(tag);
  for (const [key, val] of Object.entries(attrs)) {
    if (key === 'className') element.className = val;
    else if (key === 'innerHTML') element.innerHTML = val;
    else if (key === 'textContent') element.textContent = val;
    else if (key === 'style' && typeof val === 'object') {
      Object.assign(element.style, val);
    }
    else if (key.startsWith('on')) {
      element.addEventListener(key.slice(2).toLowerCase(), val);
    }
    else element.setAttribute(key, val);
  }
  children.forEach(child => {
    if (typeof child === 'string') element.appendChild(document.createTextNode(child));
    else if (child) element.appendChild(child);
  });
  return element;
}

export function setPageTitle(title) {
  const titleEl = document.getElementById('page-title');
  if (titleEl) titleEl.textContent = title;
  document.title = `${title} — EasySlip Dashboard`;
}

// ── Color helpers ──

export function getStatusColor(status) {
  switch (status) {
    case 'on_track': return 'var(--color-success)';
    case 'warning': return 'var(--color-warning)';
    case 'critical': return 'var(--color-danger)';
    default: return 'var(--text-muted)';
  }
}

export function getSeverityColor(severity) {
  switch (severity) {
    case 'HIGH': return 'var(--color-danger)';
    case 'MEDIUM': return 'var(--color-warning)';
    case 'LOW': return 'var(--color-info)';
    default: return 'var(--text-muted)';
  }
}

// ── CSV Export ──

export function downloadCSV(filename, headers, rows) {
  const csv = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
  ].join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
