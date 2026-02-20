// ============================================
// EasySlip 2026 — Modal Component
// Reusable vanilla JS modal with overlay
// ============================================

/**
 * Open a modal dialog
 * @param {Object} opts
 * @param {string} opts.title - Modal title
 * @param {string|HTMLElement} opts.content - HTML string or DOM element
 * @param {Function} [opts.onClose] - Callback when modal closes
 * @param {string} [opts.width='480px'] - Max width
 * @returns {HTMLElement} modalEl
 */
export function openModal({ title, content, onClose, width = '480px' }) {
  // Lock body scroll
  document.body.style.overflow = 'hidden';

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';

  const panel = document.createElement('div');
  panel.className = 'modal-panel';
  panel.style.maxWidth = width;

  // Header
  const header = document.createElement('div');
  header.className = 'modal-header';

  const titleEl = document.createElement('span');
  titleEl.className = 'modal-title';
  titleEl.textContent = title;

  const closeBtn = document.createElement('button');
  closeBtn.className = 'modal-close';
  closeBtn.setAttribute('aria-label', 'Close');
  closeBtn.innerHTML = '&times;';

  header.appendChild(titleEl);
  header.appendChild(closeBtn);

  // Body
  const body = document.createElement('div');
  body.className = 'modal-body';
  if (typeof content === 'string') {
    body.innerHTML = content;
  } else if (content instanceof HTMLElement) {
    body.appendChild(content);
  }

  panel.appendChild(header);
  panel.appendChild(body);
  overlay.appendChild(panel);
  document.body.appendChild(overlay);

  // Trigger animation on next frame
  requestAnimationFrame(() => {
    overlay.classList.add('modal-active');
  });

  // Close handlers
  function close() {
    closeModal(overlay, onClose);
  }

  closeBtn.addEventListener('click', close);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });

  function onKeyDown(e) {
    if (e.key === 'Escape') {
      close();
      document.removeEventListener('keydown', onKeyDown);
    }
  }
  document.addEventListener('keydown', onKeyDown);

  // Store cleanup ref
  overlay._cleanup = () => document.removeEventListener('keydown', onKeyDown);

  return overlay;
}

/**
 * Close a modal (animate out + remove)
 * @param {HTMLElement} modalEl
 * @param {Function} [onClose]
 */
export function closeModal(modalEl, onClose) {
  if (!modalEl || !modalEl.parentNode) return;

  modalEl.classList.remove('modal-active');
  modalEl.classList.add('modal-closing');

  let cleaned = false;
  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;
    if (modalEl._cleanup) modalEl._cleanup();
    modalEl.remove();
    // Restore body scroll only if no other modals
    if (!document.querySelector('.modal-overlay')) {
      document.body.style.overflow = '';
    }
    if (typeof onClose === 'function') onClose();
  };

  // Check prefers-reduced-motion
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReduced) {
    cleanup();
  } else {
    modalEl.addEventListener('animationend', cleanup, { once: true });
    // Fallback in case animationend doesn't fire
    setTimeout(cleanup, 350);
  }
}
