// ============================================================
// EasySlip CEO Dashboard 2026 — Google Sheets Database Setup
// ============================================================
//
// วิธีใช้:
//   1. สร้าง Google Sheets ใหม่
//   2. ไปที่ Extensions > Apps Script
//   3. วาง code ทั้งหมดนี้ทับ Code.gs
//   4. กด ▶ Run > setupEasySlipDatabase
//   5. อนุญาตสิทธิ์เข้าถึง Spreadsheet
//   6. รอ ~10 วิ แล้วจะได้ 5 sheets พร้อมข้อมูลครบ
//
// ============================================================

// ── Month Headers ──

const MONTHS_TH = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.',
                    'ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];

// ── Revenue Data ──

const REV_PROJECTION = {
  bot: [22000,22000,22500,22500,23000,23000,23000,23500,23500,24000,24000,24500],
  api: [4800000,4872000,4945080,5019256,5094555,5170993,5248558,5327286,5407206,5488314,5570639,5654199],
  crm: [0,0,0,150000,199500,265335,352896,469431,624323,830350,1104365,1468806],
  sms: [0,0,0,0,80000,126800,200978,318550,504901,800268,1268425,2010434],
};

const REV_BUDGET = {
  bot: [22000,22000,22500,22500,23000,23000,23000,23500,23500,24000,24000,24500],
  api: [4800000,4872000,4945080,5019256,5094555,5170993,5248558,5327286,5407206,5488314,5570639,5654199],
  crm: [0,0,0,150000,199500,265335,352896,469431,624323,830350,1104365,1468806],
  sms: [0,0,0,0,80000,126800,200978,318550,504901,800268,1268425,2010434],
};

// ── Expense / Cost Data ──

const EXPENSE_DEFAULTS = {
  system_cost: [1170096,1187569,1205325,1259641,1310124,1357403,1414232,1467680,1524143,1583284,1645177,1734378],
  salary:      [150000,150000,150000,150000,150000,150000,150000,150000,150000,150000,150000,150000],
  marketing:   [333333,333333,333334,373333,373333,373334,340000,340000,340000,620000,620000,620000],
  tax:         [120000,120000,185000,130000,457000,135000,140000,371000,536000,148000,155000,680000],
  contingency: [96440,97880,99350,103835,107919,111707,116489,121075,125890,130896,139369,151559],
  admin:       [34000,34000,34000,34000,34000,34000,34000,34000,34000,34000,34000,34000],
};

// ── Category Schema ──

const CATEGORIES = [
  { key:'system_cost', th:'ค่าระบบ (Cloud & Infra)',       en:'System Cost (Cloud & Infra)', color:'#ef4444', type:'detailed', subType:'pct' },
  { key:'salary',      th:'เงินเดือน (Payroll)',            en:'Payroll',                     color:'#f97316', type:'detailed', subType:'fixed' },
  { key:'marketing',   th:'การตลาด (Marketing)',            en:'Marketing',                   color:'#3b82f6', type:'detailed', subType:'pct' },
  { key:'tax',         th:'ภาษี (Tax)',                     en:'Tax',                         color:'#ec4899', type:'simple' },
  { key:'contingency', th:'สำรองฉุกเฉิน (Reserve)',         en:'Contingency Reserve',         color:'#64748b', type:'simple' },
  { key:'admin',       th:'ค่าบริหาร (Admin & Overhead)',   en:'Admin & Overhead',            color:'#06b6d4', type:'detailed', subType:'fixed' },
];

// ── Sub-item Definitions ──

const SUB_ITEMS = {
  system_cost: { type:'pct', items:[
    { key:'cloud',      th:'Cloud Infrastructure',    en:'Cloud Infrastructure',  pct:0.50 },
    { key:'server',     th:'API Server & Hosting',    en:'API Server & Hosting',  pct:0.25 },
    { key:'database',   th:'Database & Storage',      en:'Database & Storage',    pct:0.12 },
    { key:'cdn',        th:'CDN & Network',           en:'CDN & Network',         pct:0.05 },
    { key:'monitoring', th:'Monitoring & Tools',       en:'Monitoring & Tools',    pct:0.05 },
    { key:'license',    th:'SaaS License',            en:'SaaS License',          pct:0.03 },
  ]},
  salary: { type:'fixed', items:[
    { key:'base',   th:'เงินเดือนพื้นฐาน',       en:'Base Salary',       amt:140000 },
    { key:'social', th:'ประกันสังคม (นายจ้าง)',   en:'Social Security',   amt:7500 },
    { key:'bonus',  th:'โบนัส/เบี้ยเลี้ยง',       en:'Bonus / Incentive', amt:2500 },
  ]},
  marketing: { type:'pct', items:[
    { key:'api_growth',  th:'API Growth',       en:'API Growth',       pct:0.25 },
    { key:'crm_acq',     th:'CRM Acquisition',  en:'CRM Acquisition',  pct:0.30 },
    { key:'sms_launch',  th:'SMS Launch',       en:'SMS Launch',       pct:0.20 },
    { key:'brand',       th:'Brand Awareness',  en:'Brand Awareness',  pct:0.15 },
    { key:'mkt_reserve', th:'สำรอง',            en:'Reserve',          pct:0.10 },
  ]},
  admin: { type:'fixed', items:[
    { key:'social_security', th:'ประกันสังคม', en:'Social Security', amt:2250 },
    { key:'accounting',      th:'ค่าบัญชี',    en:'Accounting',      amt:5000 },
    { key:'insurance',       th:'ประกันภัย',   en:'Insurance',       amt:3750 },
    { key:'office',          th:'สำนักงาน',    en:'Office',          amt:8000 },
    { key:'other_admin',     th:'อื่นๆ',       en:'Other',           amt:15000 },
  ]},
};

// ── Channel Schema ──

const CHANNELS = [
  { key:'bot', label:'LINE BOT', color:'#3b82f6', icon:'bot' },
  { key:'api', label:'API',      color:'#22c55e', icon:'code-2' },
  { key:'crm', label:'CRM',      color:'#f97316', icon:'users' },
  { key:'sms', label:'SMS',      color:'#a855f7', icon:'message-square' },
];

// ── Colors ──

const C = {
  hdrBg:  '#0f172a', hdrTx: '#ffffff',
  secBg:  '#1e293b', secTx: '#f1f5f9',
  totBg:  '#e2e8f0',
  subBg:  '#f8fafc',
  projBg: '#eff6ff',
  budgBg: '#f0fdf4',
  actBg:  '#fef2f2',
};

// ============================================================
//  MAIN — Run this function
// ============================================================

function setupEasySlipDatabase() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  ss.rename('EasySlip CEO Dashboard 2026 — Database');

  const sheets = [
    buildRevenueSheet(getSheet(ss, 'Revenue')),
    buildExpensesSheet(getSheet(ss, 'Expenses')),
    buildCostBudgetSheet(getSheet(ss, 'Cost Budget')),
    buildCostActualSheet(getSheet(ss, 'Cost Actual')),
    buildConfigSheet(getSheet(ss, 'Config')),
  ];

  // Remove default sheet
  const def = ss.getSheetByName('Sheet1') || ss.getSheetByName('แผ่นงาน1');
  if (def && ss.getSheets().length > 1) ss.deleteSheet(def);

  // Set named ranges
  setupNamedRanges(ss);

  ss.setActiveSheet(ss.getSheetByName('Revenue'));
  SpreadsheetApp.flush();

  SpreadsheetApp.getUi().alert(
    '✅ สร้าง EasySlip Database เรียบร้อย!\n\n' +
    '• Revenue — รายได้ (Projection / Budget / Actual)\n' +
    '• Expenses — ค่าใช้จ่ายประมาณการ\n' +
    '• Cost Budget — เป้าหมายต้นทุน\n' +
    '• Cost Actual — ต้นทุนจริง\n' +
    '• Config — ตั้งค่า & Schema'
  );
}

// ============================================================
//  Helpers
// ============================================================

function getSheet(ss, name) {
  let s = ss.getSheetByName(name);
  if (!s) s = ss.insertSheet(name);
  s.clear();
  return s;
}

/** Column number → letter (1=A … 26=Z) */
function L(n) { return String.fromCharCode(64 + n); }

function hdr(sheet, row, cols) {
  sheet.getRange(row, 1, 1, cols)
    .setBackground(C.hdrBg).setFontColor(C.hdrTx)
    .setFontWeight('bold').setHorizontalAlignment('center');
}

function secRow(sheet, row, cols, bg) {
  const r = sheet.getRange(row, 1, 1, cols);
  r.setBackground(bg || C.secBg)
   .setFontColor(bg ? '#0f172a' : C.secTx)
   .setFontWeight('bold');
}

function numFmt(sheet, r1, r2, c1, c2) {
  sheet.getRange(r1, c1, r2 - r1 + 1, c2 - c1 + 1).setNumberFormat('#,##0');
}

function colW(sheet, map) {
  for (const [c, w] of Object.entries(map)) sheet.setColumnWidth(+c, w);
}

function monthColWidths(sheet, startCol, endCol) {
  for (let c = startCol; c <= endCol; c++) sheet.setColumnWidth(c, 110);
}

function subItemData(catKey, catData) {
  const def = SUB_ITEMS[catKey];
  if (!def) return [];
  return def.items.map(item => {
    const vals = def.type === 'pct'
      ? catData.map(v => Math.round(v * item.pct))
      : new Array(12).fill(item.amt);
    return { key: item.key, label: item.th, data: vals };
  });
}

// ============================================================
//  Sheet 1: Revenue (รายได้)
// ============================================================

function buildRevenueSheet(sheet) {
  const H = ['type', 'channel', ...MONTHS_TH, 'รวมปี'];
  const NC = H.length; // 15

  sheet.getRange(1, 1, 1, NC).setValues([H]);
  hdr(sheet, 1, NC);

  let row = 2;

  // ── Projection ──
  const pStart = row;
  row = writeRevSection(sheet, row, NC, 'projection', REV_PROJECTION, C.projBg);
  // Total row
  row = writeRevTotal(sheet, row, NC, 'projection', pStart, pStart + 3, C.projBg);
  row++; // blank separator

  // ── Budget ──
  const bStart = row;
  row = writeRevSection(sheet, row, NC, 'budget', REV_BUDGET, C.budgBg);
  row = writeRevTotal(sheet, row, NC, 'budget', bStart, bStart + 3, C.budgBg);
  row++;

  // ── Actual ──
  const aStart = row;
  row = writeRevSection(sheet, row, NC, 'actual', null, C.actBg);
  row = writeRevTotal(sheet, row, NC, 'actual', aStart, aStart + 3, C.actBg);

  // Formatting
  numFmt(sheet, 2, row - 1, 3, NC);
  colW(sheet, { 1: 100, 2: 130 });
  monthColWidths(sheet, 3, NC);
  sheet.setFrozenRows(1);
  sheet.setFrozenColumns(2);

  // Conditional format: highlight actual cells > 0
  const actRange = sheet.getRange(aStart, 3, 4, 12);
  const rule = SpreadsheetApp.newConditionalFormatRule()
    .whenNumberGreaterThan(0)
    .setBackground('#dcfce7')
    .setRanges([actRange])
    .build();
  sheet.setConditionalFormatRules([rule]);

  return sheet;
}

function writeRevSection(sheet, row, nc, type, data, bg) {
  for (const ch of CHANNELS) {
    const vals = data ? data[ch.key] : new Array(12).fill(0);
    sheet.getRange(row, 1, 1, nc).setValues([[type, ch.label, ...vals, null]]);
    sheet.getRange(row, nc).setFormula(`=SUM(C${row}:N${row})`);
    sheet.getRange(row, 1, 1, 2).setBackground(bg);
    row++;
  }
  return row;
}

function writeRevTotal(sheet, row, nc, type, startR, endR, bg) {
  sheet.getRange(row, 1, 1, 2).setValues([[type, 'รวม (Total)']]);
  for (let c = 3; c <= nc; c++) {
    sheet.getRange(row, c).setFormula(`=SUM(${L(c)}${startR}:${L(c)}${endR})`);
  }
  secRow(sheet, row, nc, bg);
  return row + 1;
}

// ============================================================
//  Sheet 2: Expenses (ค่าใช้จ่ายประมาณการ)
// ============================================================

function buildExpensesSheet(sheet) {
  return buildCostSheet(sheet, EXPENSE_DEFAULTS, 'expense');
}

// ============================================================
//  Sheet 3: Cost Budget (เป้าหมายต้นทุน)
// ============================================================

function buildCostBudgetSheet(sheet) {
  // Budget defaults are identical to expense defaults
  return buildCostSheet(sheet, EXPENSE_DEFAULTS, 'budget');
}

/** Shared builder for Expenses & Cost Budget (same structure) */
function buildCostSheet(sheet, sourceData, label) {
  const H = ['category', 'sub_item', ...MONTHS_TH, 'รวมปี'];
  const NC = H.length; // 15

  sheet.getRange(1, 1, 1, NC).setValues([H]);
  hdr(sheet, 1, NC);

  let row = 2;
  const totalRows = []; // track _total row numbers for grand total

  for (const cat of CATEGORIES) {
    const catData = sourceData[cat.key];
    const isDetailed = cat.type === 'detailed' && SUB_ITEMS[cat.key];

    // ── Category _total row ──
    const totalRow = row;
    totalRows.push(totalRow);
    sheet.getRange(row, 1, 1, 2).setValues([[cat.th, '_total']]);

    if (isDetailed) {
      // Placeholder values — will be replaced by SUM formulas
      sheet.getRange(row, 3, 1, 12).setValues([catData]);
    } else {
      // Simple category: just the data
      sheet.getRange(row, 3, 1, 12).setValues([catData]);
    }
    sheet.getRange(row, NC).setFormula(`=SUM(C${row}:N${row})`);
    secRow(sheet, row, NC, C.totBg);
    row++;

    // ── Sub-items (if detailed) ──
    if (isDetailed) {
      const subs = subItemData(cat.key, catData);
      const subStart = row;

      for (const sub of subs) {
        sheet.getRange(row, 1, 1, 2).setValues([[cat.key, sub.label]]);
        sheet.getRange(row, 3, 1, 12).setValues([sub.data]);
        sheet.getRange(row, NC).setFormula(`=SUM(C${row}:N${row})`);
        sheet.getRange(row, 1, 1, NC).setBackground(C.subBg);
        row++;
      }

      // Override _total row with SUM formulas
      for (let c = 3; c <= NC - 1; c++) {
        sheet.getRange(totalRow, c).setFormula(
          `=SUM(${L(c)}${subStart}:${L(c)}${row - 1})`
        );
      }
    }
  }

  // ── Grand Total ──
  sheet.getRange(row, 1, 1, 2).setValues([['GRAND_TOTAL', '']]);
  for (let c = 3; c <= NC; c++) {
    // Sum only the _total rows using SUMIF
    sheet.getRange(row, c).setFormula(
      `=SUMIF(B:B,"_total",${L(c)}:${L(c)})`
    );
  }
  secRow(sheet, row, NC);
  sheet.getRange(row, 1, 1, NC).setFontColor('#ffffff');

  // Formatting
  numFmt(sheet, 2, row, 3, NC);
  colW(sheet, { 1: 220, 2: 190 });
  monthColWidths(sheet, 3, NC);
  sheet.setFrozenRows(1);
  sheet.setFrozenColumns(2);

  return sheet;
}

// ============================================================
//  Sheet 4: Cost Actual (ต้นทุนจริง)
// ============================================================

function buildCostActualSheet(sheet) {
  const H = ['category', ...MONTHS_TH, 'รวมปี'];
  const NC = H.length; // 14

  sheet.getRange(1, 1, 1, NC).setValues([H]);
  hdr(sheet, 1, NC);

  let row = 2;
  const startR = row;

  for (const cat of CATEGORIES) {
    sheet.getRange(row, 1, 1, NC).setValues([
      [cat.th, ...new Array(12).fill(0), null]
    ]);
    sheet.getRange(row, NC).setFormula(`=SUM(B${row}:M${row})`);
    row++;
  }

  // Grand total
  sheet.getRange(row, 1).setValue('GRAND_TOTAL');
  for (let c = 2; c <= NC; c++) {
    sheet.getRange(row, c).setFormula(
      `=SUM(${L(c)}${startR}:${L(c)}${row - 1})`
    );
  }
  secRow(sheet, row, NC);
  sheet.getRange(row, 1, 1, NC).setFontColor('#ffffff');

  // Formatting
  numFmt(sheet, 2, row, 2, NC);
  colW(sheet, { 1: 220 });
  monthColWidths(sheet, 2, NC);
  sheet.setFrozenRows(1);
  sheet.setFrozenColumns(1);

  // Conditional format: highlight cells > 0 (data entered)
  const dataRange = sheet.getRange(startR, 2, CATEGORIES.length, 12);
  const rule = SpreadsheetApp.newConditionalFormatRule()
    .whenNumberGreaterThan(0)
    .setBackground('#dcfce7')
    .setRanges([dataRange])
    .build();
  sheet.setConditionalFormatRules([rule]);

  return sheet;
}

// ============================================================
//  Sheet 5: Config (ตั้งค่า & Schema)
// ============================================================

function buildConfigSheet(sheet) {
  let row = 1;

  // ── Section A: Metadata ──
  sheet.getRange(row, 1, 1, 2).setValues([['Key', 'Value']]);
  hdr(sheet, row, 2);
  row++;

  const meta = [
    ['version', 4],
    ['year', 2026],
    ['last_updated', new Date().toISOString()],
    ['language', 'th'],
    ['app_name', 'EasySlip CEO Dashboard'],
    ['storage_prefix', 'easyslip_'],
  ];
  sheet.getRange(row, 1, meta.length, 2).setValues(meta);
  row += meta.length + 2;

  // ── Section B: Category Schema ──
  const catH = ['key', 'label_th', 'label_en', 'color', 'type', 'sub_item_type'];
  sheet.getRange(row, 1, 1, 6).setValues([catH]);
  hdr(sheet, row, 6);
  row++;

  for (const cat of CATEGORIES) {
    sheet.getRange(row, 1, 1, 6).setValues([
      [cat.key, cat.th, cat.en, cat.color, cat.type, cat.subType || '']
    ]);
    // Color swatch in column D
    sheet.getRange(row, 4).setBackground(cat.color).setFontColor('#ffffff');
    row++;
  }
  row += 2;

  // ── Section C: Channel Schema ──
  const chH = ['key', 'label', 'color', 'icon'];
  sheet.getRange(row, 1, 1, 4).setValues([chH]);
  hdr(sheet, row, 4);
  row++;

  for (const ch of CHANNELS) {
    sheet.getRange(row, 1, 1, 4).setValues([
      [ch.key, ch.label, ch.color, ch.icon]
    ]);
    sheet.getRange(row, 3).setBackground(ch.color).setFontColor('#ffffff');
    row++;
  }
  row += 2;

  // ── Section D: Sub-item Schema ──
  const subH = ['category', 'key', 'label_th', 'label_en', 'default_pct', 'default_amount'];
  sheet.getRange(row, 1, 1, 6).setValues([subH]);
  hdr(sheet, row, 6);
  row++;

  for (const cat of CATEGORIES) {
    const def = SUB_ITEMS[cat.key];
    if (!def) continue;
    for (const item of def.items) {
      sheet.getRange(row, 1, 1, 6).setValues([
        [
          cat.key,
          item.key,
          item.th,
          item.en,
          def.type === 'pct' ? item.pct : '',
          def.type === 'fixed' ? item.amt : '',
        ]
      ]);
      row++;
    }
  }
  row += 2;

  // ── Section E: localStorage Key Mapping ──
  sheet.getRange(row, 1, 1, 3).setValues([['localStorage_key', 'sheet', 'description']]);
  hdr(sheet, row, 3);
  row++;

  const mapping = [
    ['easyslip_revenue_2026',        'Revenue (projection rows)',  'Revenue projection by channel × 12 months'],
    ['easyslip_budget_targets_2026', 'Revenue (budget) + Cost Budget', 'Budget targets for revenue & cost'],
    ['easyslip_actual_2026',         'Revenue (actual) + Cost Actual', 'Actual revenue & cost data'],
    ['easyslip_expenses_2026',       'Expenses',                   'Expense projections + category schema'],
  ];
  sheet.getRange(row, 1, mapping.length, 3).setValues(mapping);

  // Column widths
  colW(sheet, { 1: 200, 2: 200, 3: 200, 4: 100, 5: 120, 6: 130 });

  return sheet;
}

// ============================================================
//  Named Ranges
// ============================================================

function setupNamedRanges(ss) {
  // Remove existing named ranges first
  ss.getNamedRanges().forEach(nr => nr.remove());

  const rev = ss.getSheetByName('Revenue');
  const exp = ss.getSheetByName('Expenses');
  const cb  = ss.getSheetByName('Cost Budget');
  const ca  = ss.getSheetByName('Cost Actual');
  const cfg = ss.getSheetByName('Config');

  // Revenue ranges (data rows only, no totals/blanks)
  ss.setNamedRange('rev_projection',  rev.getRange('A2:O5'));
  ss.setNamedRange('rev_budget',      rev.getRange('A8:O11'));
  ss.setNamedRange('rev_actual',      rev.getRange('A14:O17'));

  // Cost Actual (6 category rows)
  ss.setNamedRange('cost_actual_data', ca.getRange('A2:N7'));

  // Config sections
  ss.setNamedRange('cfg_metadata',    cfg.getRange('A2:B7'));
  ss.setNamedRange('cfg_categories',  cfg.getRange('A10:F15'));
  ss.setNamedRange('cfg_channels',    cfg.getRange('A18:D21'));
}
