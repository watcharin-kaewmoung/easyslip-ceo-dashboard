// ============================================
// EasySlip 2026 — Hash-based SPA Router
// ============================================

const routes = new Map();
let currentCleanup = null;
let currentRoute = null;

export function registerRoute(hash, loader) {
  routes.set(hash, loader);
}

export function navigate(path) {
  // Ensure path starts with / not #
  const cleanPath = path.replace(/^#*/, '') || '/';
  if (window.location.hash !== '#' + cleanPath) {
    window.location.hash = cleanPath;
  }
}

export function getCurrentRoute() {
  return currentRoute;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

async function handleRoute() {
  const hash = window.location.hash || '#/';
  const path = hash.replace(/^#+/, '') || '/';

  // Clean up previous page
  if (typeof currentCleanup === 'function') {
    try { currentCleanup(); } catch(e) { console.error('Cleanup error:', e); }
    currentCleanup = null;
  }

  const container = document.getElementById('page-content');
  if (!container) return;

  // Find matching route
  let loader = routes.get(path);
  if (!loader) {
    loader = routes.get('/'); // fallback to overview
  }

  if (!loader) {
    const p404 = document.createElement('div');
    p404.style.cssText = 'padding:40px;text-align:center;color:var(--text-secondary)';
    p404.innerHTML = '<h2>404 — Page not found</h2>';
    const pathEl = document.createElement('p');
    pathEl.textContent = path;
    p404.appendChild(pathEl);
    container.innerHTML = '';
    container.appendChild(p404);
    return;
  }

  // Show loading state
  container.innerHTML = '<div class="page-loading"><div class="loading-spinner"></div></div>';

  try {
    const module = await loader();
    const render = module.render || module.default;
    if (typeof render === 'function') {
      currentCleanup = await render(container);
      currentRoute = path;
    }
  } catch (err) {
    console.error('Route load error:', err);
    const errDiv = document.createElement('div');
    errDiv.style.cssText = 'padding:40px;text-align:center;color:var(--color-danger)';
    errDiv.innerHTML = '<h2>Error loading page</h2>';
    const errP = document.createElement('p');
    errP.textContent = err.message;
    errDiv.appendChild(errP);
    container.innerHTML = '';
    container.appendChild(errDiv);
  }

  // Update active nav (resolve aliases)
  const ROUTE_ALIASES = { '/expenses': '/cost-management', '/budget-actual': '/cost-management', '/cost-control': '/cost-management' };
  const activePath = ROUTE_ALIASES[path] || path;
  document.querySelectorAll('.nav-item').forEach(el => {
    const href = el.getAttribute('data-route');
    el.classList.toggle('active', href === activePath);
  });
}

export function initRouter() {
  window.addEventListener('hashchange', handleRoute);
  // Initial route
  handleRoute();
}
