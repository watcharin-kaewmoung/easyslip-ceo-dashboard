// ============================================
// EasySlip 2026 — ApexCharts Factory
// ============================================

// Instance registry for cleanup
const instances = new Map();

/**
 * Create and render an ApexChart
 * @param {string} containerId - DOM element ID
 * @param {Object} options - ApexCharts options
 * @returns {ApexCharts|null}
 */
export function createChart(containerId, options) {
  if (typeof ApexCharts === 'undefined') {
    console.error('ApexCharts not loaded — charts unavailable');
    return null;
  }
  const el = document.getElementById(containerId);
  if (!el) {
    console.warn(`Chart container #${containerId} not found`);
    return null;
  }

  // Destroy existing instance
  destroyChart(containerId);

  const chart = new ApexCharts(el, options);
  chart.render();
  instances.set(containerId, chart);
  return chart;
}

/**
 * Destroy a chart instance
 */
export function destroyChart(containerId) {
  const existing = instances.get(containerId);
  if (existing) {
    try { existing.destroy(); } catch(e) { /* ignore */ }
    instances.delete(containerId);
  }
}

/**
 * Destroy all chart instances
 */
export function destroyAllCharts() {
  instances.forEach((chart, id) => {
    try { chart.destroy(); } catch(e) { /* ignore */ }
  });
  instances.clear();
}

/**
 * Update chart data
 */
export function updateChart(containerId, newSeries) {
  const chart = instances.get(containerId);
  if (chart) {
    chart.updateSeries(newSeries);
  }
}

// ── Common chart option presets ──

export function areaChartOptions(series, categories, opts = {}) {
  return {
    chart: {
      type: 'area',
      height: opts.height || 350,
      stacked: opts.stacked || false,
    },
    series,
    xaxis: { categories },
    fill: {
      type: 'gradient',
      gradient: {
        opacityFrom: 0.5,
        opacityTo: 0.05,
      },
    },
    ...opts.extra,
  };
}

export function barChartOptions(series, categories, opts = {}) {
  return {
    chart: {
      type: 'bar',
      height: opts.height || 350,
      stacked: opts.stacked || false,
    },
    series,
    xaxis: { categories },
    plotOptions: {
      bar: {
        borderRadius: 4,
        columnWidth: opts.columnWidth || '60%',
        ...(opts.horizontal ? { horizontal: true } : {}),
      },
    },
    ...opts.extra,
  };
}

export function donutChartOptions(series, labels, opts = {}) {
  return {
    chart: {
      type: 'donut',
      height: opts.height || 300,
    },
    series,
    labels,
    plotOptions: {
      pie: {
        donut: {
          size: '60%',
          labels: {
            show: true,
            total: {
              show: true,
              label: opts.centerLabel || 'Total',
              color: '#94a3b8',
              formatter: (w) => {
                const total = w.globals.seriesTotals.reduce((a, b) => a + b, 0);
                return opts.centerFormatter ? opts.centerFormatter(total) : `฿${(total/1000000).toFixed(1)}M`;
              },
            },
          },
        },
      },
    },
    colors: opts.colors,
    legend: {
      position: 'bottom',
    },
    ...opts.extra,
  };
}

export function lineChartOptions(series, categories, opts = {}) {
  return {
    chart: {
      type: 'line',
      height: opts.height || 350,
    },
    series,
    xaxis: { categories },
    stroke: {
      width: opts.width || 2,
      curve: 'smooth',
    },
    markers: {
      size: opts.markers ? 4 : 0,
    },
    ...opts.extra,
  };
}

export function radialBarOptions(value, opts = {}) {
  return {
    chart: {
      type: 'radialBar',
      height: opts.height || 200,
    },
    series: [Math.min(value, 100)],
    plotOptions: {
      radialBar: {
        hollow: { size: '60%' },
        dataLabels: {
          name: {
            show: true,
            color: '#94a3b8',
            fontSize: '11px',
            offsetY: -10,
          },
          value: {
            show: true,
            color: '#f1f5f9',
            fontSize: '20px',
            fontWeight: 700,
            formatter: () => opts.label || `${value}%`,
          },
        },
        track: {
          background: 'rgba(148,163,184,.1)',
        },
      },
    },
    labels: [opts.name || ''],
    colors: [opts.color || '#6366f1'],
    ...opts.extra,
  };
}
