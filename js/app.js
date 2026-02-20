// ============================================
// EasySlip 2026 — App Initialization
// ============================================

import { registerRoute, initRouter } from './router.js';
import { initSidebar, refreshSidebar } from './components/sidebar.js';
import { toggleLang, updateLangToggle } from './i18n.js';
import { sheetsSync } from './sheets-sync.js?v=4';

// ── Register all routes ──
registerRoute('/', () => import('./pages/overview.js'));
registerRoute('/revenue', () => import('./pages/revenue.js'));
registerRoute('/cost-management', () => import('./pages/cost-management.js'));
// Aliases for old routes → redirect to merged page
registerRoute('/cost-control', () => import('./pages/cost-management.js'));
registerRoute('/expenses', () => import('./pages/cost-management.js'));
registerRoute('/budget-actual', () => import('./pages/cost-management.js'));
registerRoute('/cash-flow', () => import('./pages/cash-flow.js'));
registerRoute('/what-if', () => import('./pages/what-if.js'));
registerRoute('/kpi', () => import('./pages/kpi-scorecard.js'));
registerRoute('/marketing', () => import('./pages/marketing.js'));

// ── Theme Management ──
const THEME_KEY = 'easyslip_theme';

function getTheme() {
  return localStorage.getItem(THEME_KEY) || 'dark';
}

function applyTheme(theme) {
  if (theme === 'light') {
    document.documentElement.setAttribute('data-theme', 'light');
  } else {
    document.documentElement.removeAttribute('data-theme');
  }
  // Update icon visibility
  const sunIcon = document.getElementById('theme-icon-sun');
  const moonIcon = document.getElementById('theme-icon-moon');
  if (sunIcon) sunIcon.style.display = theme === 'light' ? 'none' : 'block';
  if (moonIcon) moonIcon.style.display = theme === 'light' ? 'block' : 'none';

  // Update ApexCharts theme mode
  updateApexTheme(theme);
}

function toggleTheme() {
  const current = getTheme();
  const next = current === 'dark' ? 'light' : 'dark';
  localStorage.setItem(THEME_KEY, next);
  applyTheme(next);

  // Re-navigate to re-render charts with new theme colors
  window.dispatchEvent(new HashChangeEvent('hashchange'));
}

function updateApexTheme(theme) {
  if (typeof ApexCharts === 'undefined') return;
  const isDark = theme === 'dark';
  const labelColor = isDark ? '#94a3b8' : '#64748b';
  const gridColor = isDark ? 'rgba(148,163,184,.1)' : 'rgba(15,23,42,.08)';

  window.Apex = {
    ...window.Apex,
    theme: { mode: isDark ? 'dark' : 'light' },
    grid: { ...window.Apex?.grid, borderColor: gridColor },
    xaxis: {
      labels: { style: { colors: labelColor, fontSize: '11px' } },
      axisBorder: { color: gridColor },
      axisTicks: { color: gridColor },
    },
    yaxis: {
      labels: { style: { colors: labelColor, fontSize: '11px' } },
    },
    tooltip: { ...window.Apex?.tooltip, theme: isDark ? 'dark' : 'light' },
    legend: { ...window.Apex?.legend, labels: { colors: labelColor } },
  };
}

// ── ApexCharts Global Defaults ──
function setupApexDefaults() {
  if (typeof ApexCharts === 'undefined') return;
  const isDark = getTheme() === 'dark';
  const labelColor = isDark ? '#94a3b8' : '#64748b';

  window.Apex = {
    chart: {
      background: 'transparent',
      fontFamily: "'Inter', 'Noto Sans Thai', sans-serif",
      toolbar: { show: false },
      animations: {
        enabled: true,
        easing: 'easeinout',
        speed: 600,
        dynamicAnimation: { speed: 400 }
      }
    },
    theme: { mode: isDark ? 'dark' : 'light' },
    grid: {
      borderColor: isDark ? 'rgba(148,163,184,.1)' : 'rgba(15,23,42,.08)',
      strokeDashArray: 3,
    },
    xaxis: {
      labels: { style: { colors: labelColor, fontSize: '11px' } },
      axisBorder: { color: 'rgba(148,163,184,.15)' },
      axisTicks: { color: 'rgba(148,163,184,.15)' },
    },
    yaxis: {
      labels: { style: { colors: labelColor, fontSize: '11px' } },
    },
    tooltip: {
      theme: isDark ? 'dark' : 'light',
      style: { fontSize: '12px' },
      y: {
        formatter: (val) => val != null ? `฿${val.toLocaleString()}` : ''
      }
    },
    legend: {
      labels: { colors: labelColor },
      fontSize: '12px',
      itemMargin: { horizontal: 12 }
    },
    dataLabels: { enabled: false },
    stroke: { curve: 'smooth', width: 2 },
    fill: { opacity: 1 },
    colors: ['#3b82f6', '#22c55e', '#f97316', '#a855f7', '#eab308', '#ec4899', '#06b6d4'],
  };
}

// ── Init ──
document.addEventListener('DOMContentLoaded', () => {
  // Apply saved theme immediately
  applyTheme(getTheme());

  setupApexDefaults();
  initSidebar();
  initRouter();

  // Theme toggle button
  document.getElementById('theme-toggle')?.addEventListener('click', toggleTheme);

  // Language toggle button
  document.getElementById('lang-toggle')?.addEventListener('click', () => {
    toggleLang();
    refreshSidebar();
  });
  updateLangToggle();

  // Sheets sync button
  initSyncButton();

  // Re-create icons (including theme toggle icons)
  if (typeof lucide !== 'undefined') lucide.createIcons();

  console.log('EasySlip CEO Dashboard initialized');
});

// ── Sheets Sync UI ──

function initSyncButton() {
  const btn = document.getElementById('sync-btn');
  if (!btn) return;

  // Update icon based on sync config
  updateSyncIcon();

  btn.addEventListener('click', async () => {
    btn.disabled = true;
    await sheetsSync.sync();
    btn.disabled = false;
    updateSyncIcon();
  });

  // Long-press to reconfigure URL
  let pressTimer;
  btn.addEventListener('pointerdown', () => {
    pressTimer = setTimeout(() => {
      sheetsSync.configure();
      updateSyncIcon();
    }, 800);
  });
  btn.addEventListener('pointerup', () => clearTimeout(pressTimer));
  btn.addEventListener('pointerleave', () => clearTimeout(pressTimer));

  // Status listener
  sheetsSync.onStatus(status => {
    btn.classList.toggle('syncing', status === 'syncing');
  });
}

function updateSyncIcon() {
  const btn = document.getElementById('sync-btn');
  if (!btn) return;
  const dot = btn.querySelector('.sync-dot');
  if (dot) {
    dot.style.background = sheetsSync.isConfigured ? '#22c55e' : '#64748b';
  }
}
