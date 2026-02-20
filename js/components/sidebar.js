// ============================================
// EasySlip 2026 — Sidebar Navigation
// ============================================

import { navigate } from '../router.js';
import { getLang } from '../i18n.js';

const NAV_ITEMS = [
  // ── ภาพรวม ──
  { route: '/', icon: 'layout-dashboard', label: 'ภาพรวม', labelEn: 'Overview' },

  // ── การเงิน ──
  { type: 'section', label: 'การเงิน', labelEn: 'Finance' },
  { route: '/revenue', icon: 'trending-up', label: 'รายได้', labelEn: 'Revenue' },
  { route: '/cost-management', icon: 'wallet', label: 'บริหารต้นทุน', labelEn: 'Cost Mgmt' },
  { route: '/cash-flow', icon: 'banknote', label: 'กระแสเงินสด', labelEn: 'Cash Flow' },

  // ── วิเคราะห์ ──
  { type: 'section', label: 'วิเคราะห์', labelEn: 'Analytics' },
  { route: '/what-if', icon: 'sliders-horizontal', label: 'จำลองสถานการณ์', labelEn: 'What-If' },
  { route: '/kpi', icon: 'gauge', label: 'KPI', labelEn: 'KPI' },
  { route: '/marketing', icon: 'megaphone', label: 'การตลาด', labelEn: 'Marketing' },

  // ── ธุรกิจ ──
  { type: 'section', label: 'ธุรกิจ', labelEn: 'Business' },
  { route: '/sales', icon: 'handshake', label: 'ฝ่ายขาย', labelEn: 'Sales' },
  { route: '/customers', icon: 'users', label: 'ลูกค้า', labelEn: 'Customers' },
  { route: '/product', icon: 'box', label: 'ผลิตภัณฑ์', labelEn: 'Product' },
  { route: '/api-analytics', icon: 'activity', label: 'API Analytics', labelEn: 'API Analytics' },

  // ── องค์กร ──
  { type: 'section', label: 'องค์กร', labelEn: 'Organization' },
  { route: '/hr', icon: 'building-2', label: 'บุคลากร', labelEn: 'HR & People' },
  { route: '/okr', icon: 'target', label: 'OKR', labelEn: 'OKR & Goals' },
  { route: '/report', icon: 'file-text', label: 'รายงาน', labelEn: 'Report' },
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
  // Update nav link labels
  const navItems = document.querySelectorAll('#sidebar-nav .nav-item');
  const linkItems = NAV_ITEMS.filter(item => !item.type);
  navItems.forEach((a, i) => {
    if (linkItems[i]) {
      const labelEl = a.querySelector('.nav-label');
      if (labelEl) labelEl.textContent = getNavLabel(linkItems[i]);
    }
  });
  // Update section labels
  const sectionEls = document.querySelectorAll('#sidebar-nav .nav-section-label');
  const sectionItems = NAV_ITEMS.filter(item => item.type === 'section');
  sectionEls.forEach((el, i) => {
    if (sectionItems[i]) el.textContent = getNavLabel(sectionItems[i]);
  });
}

function renderSidebar() {
  const sidebar = document.getElementById('sidebar');
  if (!sidebar) return;

  sidebar.innerHTML = `
    <div class="sidebar-header">
      <img src="assets/logo.png" alt="EasySlip" class="sidebar-logo">
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
    // Section header with label
    if (item.type === 'section') {
      const section = document.createElement('div');
      section.className = 'nav-section';
      section.innerHTML = `<span class="nav-section-label">${getNavLabel(item)}</span>`;
      nav.appendChild(section);
      return;
    }
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
