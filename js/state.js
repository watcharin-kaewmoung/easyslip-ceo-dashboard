// ============================================
// EasySlip 2026 — Pub/Sub State Management
// ============================================

const listeners = new Map();
const state = {};

export function getState(key) {
  return state[key];
}

export function setState(key, value) {
  const old = state[key];
  state[key] = value;
  const subs = listeners.get(key);
  if (subs) {
    subs.forEach(fn => {
      try { fn(value, old); } catch(e) { console.error(`State listener error [${key}]:`, e); }
    });
  }
}

export function subscribe(key, fn) {
  if (!listeners.has(key)) listeners.set(key, new Set());
  listeners.get(key).add(fn);
  // Return unsubscribe function
  return () => listeners.get(key)?.delete(fn);
}

export function getFullState() {
  return { ...state };
}
