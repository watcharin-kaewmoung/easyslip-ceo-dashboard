// ============================================
// EasySlip 2026 — System Budget Scenarios (Sheet 3)
// ============================================

import { REVENUE } from './revenue.js';

export const SCENARIOS = Object.freeze({
  conservative: { label: 'Conservative (18%)', ratio: 0.18 },
  moderate: { label: 'Moderate (20%)', ratio: 0.20 },
  current: { label: 'Current (22%)', ratio: 0.22 },
  actual: { label: 'Actual (24.27%)', ratio: 0.2427 },
});

export function getSystemCostByScenario(ratio) {
  return REVENUE.total.map(rev => Math.round(rev * ratio));
}

export function getScenarioComparison() {
  const result = {};
  for (const [key, scenario] of Object.entries(SCENARIOS)) {
    const monthly = getSystemCostByScenario(scenario.ratio);
    const annual = monthly.reduce((a, b) => a + b, 0);
    result[key] = { ...scenario, monthly, annual };
  }
  return result;
}

export function getSavingsVsActual(targetRatio) {
  const actualRatio = 0.2427;
  const savings = REVENUE.total.map(rev =>
    Math.round(rev * (actualRatio - targetRatio))
  );
  return {
    monthly: savings,
    annual: savings.reduce((a, b) => a + b, 0),
  };
}
