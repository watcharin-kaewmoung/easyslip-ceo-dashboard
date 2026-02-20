// ============================================
// EasySlip 2026 — Card Components
// ============================================

import { t } from '../i18n.js';



/**
 * MetricCard — Big number with label and change indicator
 * @param {Object} opts
 * @param {string} opts.title - Card title
 * @param {string} opts.value - Formatted value
 * @param {string} [opts.change] - Change text (e.g. "+12.3%")
 * @param {string} [opts.direction] - 'up' | 'down' | 'neutral'
 * @param {string} [opts.icon] - Lucide icon name
 * @param {string} [opts.iconBg] - Icon background color
 * @param {string} [opts.subtitle] - Additional text
 */
export function MetricCard({ title, value, change, direction = 'neutral', icon, iconBg = 'var(--color-accent)', subtitle }) {
  const arrows = { up: '↑', down: '↓', neutral: '→' };
  const changeHtml = change
    ? `<span class="metric-change ${direction}">${arrows[direction] || ''} ${change}</span>`
    : '';
  const subtitleHtml = subtitle ? `<div style="font-size:.7rem;color:var(--text-muted);margin-top:4px">${subtitle}</div>` : '';

  return `
    <div class="card card-sm metric-card">
      <div class="flex-between">
        <span class="card-title">${title}</span>
        ${icon ? `<div class="metric-icon" style="background:${iconBg}20;color:${iconBg}">
          <i data-lucide="${icon}" style="width:20px;height:20px"></i>
        </div>` : ''}
      </div>
      <div class="metric-value">${value}</div>
      ${changeHtml}
      ${subtitleHtml}
    </div>
  `;
}

/**
 * KPICard — Gauge-style KPI with target
 */
export function KPICard({ title, value, target, unit = '%', status = 'good', description, lowerIsBetter = false }) {
  let pct = target ? Math.min((parseFloat(value) / parseFloat(target)) * 100, 100) : 0;
  if (lowerIsBetter && target) pct = Math.max(0, Math.min(((2 * parseFloat(target) - parseFloat(value)) / parseFloat(target)) * 100, 100));
  const statusLabels = { good: 'On Track', warning: 'Warning', danger: 'Critical' };

  return `
    <div class="card kpi-card">
      <div class="card-title" style="margin-bottom:12px">${title}</div>
      <div class="kpi-value" style="color:${status === 'good' ? 'var(--color-success)' : status === 'warning' ? 'var(--color-warning)' : 'var(--color-danger)'}">
        ${value}${unit}
      </div>
      ${target ? `<div class="kpi-target">${t('kpi.target')} ${target}${unit}</div>` : ''}
      <div class="progress-bar" style="margin:12px auto;max-width:180px">
        <div class="progress-fill ${status === 'good' ? 'success' : status === 'danger' ? 'danger' : ''}"
             style="width:${pct}%"></div>
      </div>
      <span class="kpi-status ${status}">${statusLabels[status]}</span>
      ${description ? `<div style="font-size:.7rem;color:var(--text-muted);margin-top:8px">${description}</div>` : ''}
    </div>
  `;
}

/**
 * AlertCard — Anomaly/risk alert
 */
export function AlertCard({ severity, title, description, action, month }) {
  const sev = severity.toLowerCase();
  return `
    <div class="card card-sm alert-card ${sev}">
      <div class="flex-between" style="margin-bottom:6px">
        <span class="alert-severity ${sev}">${severity}</span>
        ${month != null ? `<span style="font-size:.7rem;color:var(--text-muted)">${month}</span>` : ''}
      </div>
      ${title ? `<div style="font-size:.85rem;font-weight:600;margin-bottom:4px">${title}</div>` : ''}
      <div class="alert-description">${description}</div>
      ${action ? `<div class="alert-action">💡 ${action}</div>` : ''}
    </div>
  `;
}

/**
 * SectionHeader — Section divider with title
 */
export function SectionHeader(title, extra = '') {
  return `
    <div class="flex-between section" style="margin-bottom:16px">
      <h3 class="section-title" style="margin-bottom:0">${title}</h3>
      ${extra}
    </div>
  `;
}

/**
 * ChannelBadge — Colored channel label
 */
export function ChannelBadge(channel) {
  const colors = { bot: '#3b82f6', api: '#22c55e', crm: '#f97316', sms: '#a855f7' };
  const labels = { bot: 'BOT', api: 'API', crm: 'CRM', sms: 'SMS' };
  const color = colors[channel] || '#94a3b8';
  return `<span class="badge" style="background:${color}20;color:${color}">${labels[channel] || channel}</span>`;
}
