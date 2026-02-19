// ============================================
// EasySlip 2026 — Sidebar Navigation
// ============================================

import { navigate } from '../router.js';
import { getLang } from '../i18n.js';

const NAV_ITEMS = [
  { route: '/', icon: 'layout-dashboard', label: 'ภาพรวม', labelEn: 'Overview' },
  { route: '/revenue', icon: 'trending-up', label: 'รายได้', labelEn: 'Revenue' },
  { route: '/cost-management', icon: 'wallet', label: 'บริหารต้นทุน', labelEn: 'Cost Management' },
  { route: '/cash-flow', icon: 'banknote', label: 'กระแสเงินสด', labelEn: 'Cash Flow' },
  { route: '/what-if', icon: 'sliders-horizontal', label: 'จำลองสถานการณ์', labelEn: 'What-If' },
  { route: '/kpi', icon: 'gauge', label: 'KPI', labelEn: 'KPI' },
  { route: '/marketing', icon: 'megaphone', label: 'การตลาด', labelEn: 'Marketing' },
];

function getNavLabel(item) {
  return getLang() === 'en' ? item.labelEn : item.label;
}

export function initSidebar() {
  renderSidebar();

  // Mobile toggle
  const menuBtn = document.getElementById('mobile-menu-btn');
  const overlay = document.getElementById('sidebar-overlay');

  if (menuBtn) {
    menuBtn.addEventListener('click', toggleSidebar);
  }
  if (overlay) {
    overlay.addEventListener('click', closeSidebar);
  }
}

export function refreshSidebar() {
  // Update nav labels without full re-render (preserves active state & event listeners)
  const navItems = document.querySelectorAll('#sidebar-nav .nav-item');
  navItems.forEach((a, i) => {
    if (NAV_ITEMS[i]) {
      const labelEl = a.querySelector('.nav-label');
      if (labelEl) labelEl.textContent = getNavLabel(NAV_ITEMS[i]);
    }
  });
}

function renderSidebar() {
  const sidebar = document.getElementById('sidebar');
  if (!sidebar) return;

  sidebar.innerHTML = `
    <div class="sidebar-header">
      <img src="assets/logo.svg" alt="EasySlip" class="sidebar-logo">
      <div class="sidebar-brand">
        <h1>EasySlip</h1>
        <span>CEO Dashboard 2026</span>
      </div>
    </div>
    <nav class="sidebar-nav" id="sidebar-nav"></nav>
    <div class="sidebar-footer">
      <div class="version">v1.0 · FY 2026</div>
    </div>
  `;

  const nav = document.getElementById('sidebar-nav');
  NAV_ITEMS.forEach(item => {
    const a = document.createElement('a');
    a.className = 'nav-item';
    a.setAttribute('data-route', item.route);
    a.href = `#${item.route}`;
    a.innerHTML = `
      <i data-lucide="${item.icon}" class="nav-icon"></i>
      <span class="nav-label">${getNavLabel(item)}</span>
    `;
    a.addEventListener('click', (e) => {
      e.preventDefault();
      navigate(item.route);
      closeSidebar();
    });
    nav.appendChild(a);
  });

  // Initialize icons
  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }
}

function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  sidebar?.classList.toggle('open');
  overlay?.classList.toggle('show');
}

function closeSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  sidebar?.classList.remove('open');
  overlay?.classList.remove('show');
}
