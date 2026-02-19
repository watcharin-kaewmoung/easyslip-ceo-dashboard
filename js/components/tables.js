// ============================================
// EasySlip 2026 — Data Table Builder
// ============================================

/**
 * Build a data table HTML string
 * @param {Object} opts
 * @param {string[]} opts.headers - Column headers
 * @param {Array[]} opts.rows - 2D array of cell values
 * @param {string[]} [opts.alignments] - 'left' | 'right' | 'center' per column
 * @param {number[]} [opts.totalRow] - Optional total row at bottom
 * @param {Function} [opts.cellRenderer] - (value, rowIdx, colIdx) => html string
 */
export function DataTable({ headers, rows, alignments, totalRow, cellRenderer }) {
  const aligns = alignments || headers.map(() => 'left');

  let html = '<div class="data-table-wrapper"><table class="data-table">';

  // Header
  html += '<thead><tr>';
  headers.forEach((h, i) => {
    html += `<th class="text-${aligns[i]}">${h}</th>`;
  });
  html += '</tr></thead>';

  // Body
  html += '<tbody>';
  rows.forEach((row, ri) => {
    html += '<tr>';
    row.forEach((cell, ci) => {
      const rendered = cellRenderer ? cellRenderer(cell, ri, ci) : cell;
      html += `<td class="text-${aligns[ci]}">${rendered}</td>`;
    });
    html += '</tr>';
  });

  // Total row
  if (totalRow) {
    html += '<tr class="total-row">';
    totalRow.forEach((cell, ci) => {
      const rendered = cellRenderer ? cellRenderer(cell, -1, ci) : cell;
      html += `<td class="text-${aligns[ci]}">${rendered}</td>`;
    });
    html += '</tr>';
  }

  html += '</tbody></table></div>';
  return html;
}

/**
 * Editable table with input fields
 */
export function EditableTable({ headers, budgetRows, actualRows, months, onCellChange, alignments }) {
  const aligns = alignments || headers.map(() => 'right');
  aligns[0] = 'left';

  let html = '<div class="data-table-wrapper"><table class="data-table">';

  html += '<thead><tr>';
  headers.forEach((h, i) => {
    html += `<th class="text-${aligns[i]}">${h}</th>`;
  });
  html += '</tr></thead>';

  html += '<tbody>';
  months.forEach((month, mi) => {
    html += '<tr>';
    html += `<td>${month}</td>`;
    // Budget Revenue
    html += `<td class="text-right">${budgetRows.revenue[mi]}</td>`;
    // Actual Revenue (editable)
    html += `<td class="text-right"><input type="number" data-field="revenue" data-month="${mi}" value="${actualRows.revenue[mi]}" min="0" step="1000"></td>`;
    // Budget Cost
    html += `<td class="text-right">${budgetRows.cost[mi]}</td>`;
    // Actual Cost (editable)
    html += `<td class="text-right"><input type="number" data-field="cost" data-month="${mi}" value="${actualRows.cost[mi]}" min="0" step="1000"></td>`;
    // Variance columns will be handled by the page
    html += '</tr>';
  });

  html += '</tbody></table></div>';
  return html;
}
