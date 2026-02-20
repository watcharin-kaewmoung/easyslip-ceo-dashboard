// ============================================
// EasySlip 2026 — Google Sheets Sync
// Two-way sync between localStorage and Google Sheets
// via Apps Script Web App
// ============================================

import { storage } from './storage.js';
import { showToast } from './components/toast.js';

const URL_KEY = 'sheets_web_app_url';
const SYNC_TS_KEY = 'sheets_last_sync';

// ── State ──

let _status = 'idle';       // idle | syncing | success | error
let _listeners = [];

function setStatus(s) {
  _status = s;
  _listeners.forEach(fn => fn(s));
}

// ── Public API ──

export const sheetsSync = {

  /** Get current sync status */
  get status() { return _status; },

  /** Register status change listener. Returns unsubscribe fn. */
  onStatus(fn) {
    _listeners.push(fn);
    return () => { _listeners = _listeners.filter(f => f !== fn); };
  },

  /** Get/set the Web App URL */
  get url() { return storage.get(URL_KEY) || ''; },
  set url(val) {
    if (val) storage.set(URL_KEY, val);
    else storage.remove(URL_KEY);
  },

  /** Is sync configured? */
  get isConfigured() { return !!this.url; },

  /** Last sync timestamp */
  get lastSync() { return storage.get(SYNC_TS_KEY) || null; },

  /** Prompt user for Web App URL if not set */
  configure() {
    const current = this.url;
    const url = prompt(
      'วาง Apps Script Web App URL ที่นี่\n' +
      '(Deploy > New deployment > Web app → copy URL)',
      current || 'https://script.google.com/macros/s/..../exec'
    );
    if (url && url.startsWith('https://script.google.com/')) {
      this.url = url;
      showToast('บันทึก Web App URL เรียบร้อย', 'success');
      return true;
    }
    if (url !== null) {
      showToast('URL ไม่ถูกต้อง — ต้องขึ้นต้นด้วย https://script.google.com/', 'error');
    }
    return false;
  },

  /** Pull: Sheets → localStorage */
  async pull() {
    if (!this.isConfigured) return false;
    setStatus('syncing');

    try {
      const res = await fetchGet(this.url, 'pull');
      if (!res.ok) throw new Error(res.error || 'Pull failed');

      applyPulledData(res);
      storage.set(SYNC_TS_KEY, new Date().toISOString());
      setStatus('success');
      return true;
    } catch (err) {
      console.error('[SheetsSync] Pull error:', err);
      setStatus('error');
      return false;
    }
  },

  /** Push: localStorage → Sheets */
  async push() {
    if (!this.isConfigured) return false;
    setStatus('syncing');

    try {
      const payload = buildPushPayload();
      const res = await fetchPost(this.url, { action: 'push', ...payload });
      if (!res.ok) throw new Error(res.error || 'Push failed');

      storage.set(SYNC_TS_KEY, new Date().toISOString());
      setStatus('success');
      return true;
    } catch (err) {
      console.error('[SheetsSync] Push error:', err);
      setStatus('error');
      return false;
    }
  },

  /** Full sync: push local → pull remote (push wins for now) */
  async sync() {
    if (!this.isConfigured) {
      if (!this.configure()) return false;
    }

    setStatus('syncing');
    showToast('กำลัง sync กับ Google Sheets...', 'info', 2000);

    // Push first (local data takes priority)
    const pushOk = await this.push();

    if (pushOk) {
      showToast('Sync สำเร็จ!', 'success', 2000);
      return true;
    } else {
      // Push failed — try pull instead
      const pullOk = await this.pull();
      if (pullOk) {
        showToast('ดึงข้อมูลจาก Sheets สำเร็จ (push ล้มเหลว)', 'warning', 3000);
        return true;
      }
      showToast('Sync ล้มเหลว — ตรวจสอบ URL และการ deploy', 'error', 4000);
      return false;
    }
  },

  /** Quick ping to verify URL works */
  async ping() {
    if (!this.isConfigured) return false;
    try {
      const res = await fetchGet(this.url, 'ping');
      return res && res.ok === true;
    } catch {
      return false;
    }
  },
};

// ============================================
//  JSONP transport (bypasses CORS entirely)
// ============================================

let _jsonpId = 0;

/**
 * Execute a request via JSONP (dynamic <script> injection).
 * Apps Script doGet returns: callback({...})
 */
function jsonp(url, timeoutMs = 30000) {
  return new Promise((resolve, reject) => {
    const cbName = '__esJsonp_' + (++_jsonpId) + '_' + Date.now();
    const script = document.createElement('script');
    let done = false;

    const cleanup = () => {
      done = true;
      delete window[cbName];
      if (script.parentNode) script.remove();
    };

    window[cbName] = (data) => {
      if (done) return;
      cleanup();
      resolve(data);
    };

    script.onerror = () => {
      if (done) return;
      cleanup();
      reject(new Error('Network error'));
    };

    const sep = url.includes('?') ? '&' : '?';
    script.src = url + sep + 'callback=' + cbName;
    document.head.appendChild(script);

    setTimeout(() => {
      if (done) return;
      cleanup();
      reject(new Error('Timeout (30s)'));
    }, timeoutMs);
  });
}

/** GET action via JSONP */
async function fetchGet(baseUrl, action) {
  const url = `${baseUrl}?action=${encodeURIComponent(action)}&t=${Date.now()}`;
  return jsonp(url);
}

/** Push via GET+JSONP (data as URL parameter) */
async function fetchPost(baseUrl, body) {
  const url = `${baseUrl}?action=push&t=${Date.now()}&data=${encodeURIComponent(JSON.stringify(body))}`;
  return jsonp(url);
}

// ============================================
//  Data translation: localStorage ↔ API format
// ============================================

/** Build push payload from localStorage */
function buildPushPayload() {
  const payload = {};

  // ── Revenue (projection + budget channels + actual channels) ──
  const revStore = storage.get('revenue_2026');
  const budgetStore = storage.get('budget_targets_2026');
  const actualStore = storage.get('actual_2026');

  payload.revenue = {
    projection: revStore
      ? { bot: revStore.bot, api: revStore.api, crm: revStore.crm, sms: revStore.sms }
      : null,
    budget: budgetStore?.revenueByChannel || null,
    actual: actualStore?.revenue || null,
  };

  // ── Expenses ──
  const expStore = storage.get('expenses_2026');
  if (expStore && expStore.data) {
    payload.expenses = {
      categories: expStore.data,
      details: expStore.details || {},
    };
  }

  // ── Cost Budget ──
  if (budgetStore) {
    payload.costBudget = {
      categories: budgetStore.cost || {},
      details: budgetStore.costDetails || {},
    };
  }

  // ── Cost Actual ──
  if (actualStore) {
    payload.costActual = actualStore.cost || {};
  }

  return payload;
}

/** Apply pulled data from API to localStorage */
function applyPulledData(res) {
  const keys = ['bot', 'api', 'crm', 'sms'];

  // ── Revenue projection → revenue_2026 ──
  if (res.revenue?.projection) {
    const proj = res.revenue.projection;
    const existing = storage.get('revenue_2026') || {};
    storage.set('revenue_2026', {
      ...existing,
      bot: proj.bot || existing.bot,
      api: proj.api || existing.api,
      crm: proj.crm || existing.crm,
      sms: proj.sms || existing.sms,
      lastUpdated: new Date().toISOString(),
    });
  }

  // ── Budget targets → budget_targets_2026 ──
  const budgetStore = storage.get('budget_targets_2026') || { version: 4 };
  let budgetChanged = false;

  if (res.revenue?.budget) {
    budgetStore.revenueByChannel = res.revenue.budget;
    // Recompute total revenue
    budgetStore.revenue = new Array(12).fill(0).map((_, i) =>
      keys.reduce((s, k) => s + ((res.revenue.budget[k] && res.revenue.budget[k][i]) || 0), 0)
    );
    budgetChanged = true;
  }
  if (res.costBudget) {
    if (res.costBudget.categories) {
      budgetStore.cost = res.costBudget.categories;
      budgetChanged = true;
    }
    if (res.costBudget.details) {
      budgetStore.costDetails = res.costBudget.details;
      budgetChanged = true;
    }
  }
  if (budgetChanged) {
    budgetStore.lastUpdated = new Date().toISOString();
    storage.set('budget_targets_2026', budgetStore);
  }

  // ── Actual → actual_2026 ──
  const actualStore = storage.get('actual_2026') || { version: 4 };
  let actualChanged = false;

  if (res.revenue?.actual) {
    actualStore.revenue = res.revenue.actual;
    actualChanged = true;
  }
  if (res.costActual) {
    actualStore.cost = res.costActual;
    actualChanged = true;
  }
  if (actualChanged) {
    actualStore.lastUpdated = new Date().toISOString();
    storage.set('actual_2026', actualStore);
  }

  // ── Expenses → expenses_2026 ──
  if (res.expenses) {
    const expStore = storage.get('expenses_2026') || { version: 2 };
    if (res.expenses.categories) expStore.data = res.expenses.categories;
    if (res.expenses.details) expStore.details = res.expenses.details;
    expStore.lastUpdated = new Date().toISOString();
    storage.set('expenses_2026', expStore);
  }
}
