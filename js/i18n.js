// ============================================
// EasySlip 2026 — Internationalization (i18n)
// ============================================

import { storage } from './storage.js';
import { MONTHS_TH, MONTHS_EN } from './data/constants.js';

const LANG_KEY = 'lang';
const FALLBACK = 'th';

// ── Translation Dictionary ──

const dict = {
  // ── Page Titles ──
  'page.overview.title': { th: 'ภาพรวมผู้บริหาร', en: 'Executive Overview' },
  'page.revenue.title': { th: 'วิเคราะห์รายได้', en: 'Revenue Analysis' },
  'page.cost.title': { th: 'ควบคุมต้นทุน', en: 'Cost Control' },
  'page.expenses.title': { th: 'แก้ไขค่าใช้จ่าย', en: 'Edit Expenses' },
  'page.budget.title': { th: 'งบประมาณ vs จริง', en: 'Budget vs Actual' },
  'page.cashflow.title': { th: 'กระแสเงินสด', en: 'Cash Flow' },
  'page.whatif.title': { th: 'จำลองสถานการณ์', en: 'What-If Simulator' },
  'page.kpi.title': { th: 'KPI Scorecard', en: 'KPI Scorecard' },
  'page.marketing.title': { th: 'งบการตลาด', en: 'Marketing Budget' },

  // ── Nav Labels ──
  'nav.overview': { th: 'ภาพรวม', en: 'Overview' },
  'nav.revenue': { th: 'รายได้', en: 'Revenue' },
  'nav.cost': { th: 'ต้นทุน', en: 'Costs' },
  'nav.expenses': { th: 'ค่าใช้จ่ายจริง', en: 'Actual Expenses' },
  'nav.budget': { th: 'เป้าค่าใช้จ่าย', en: 'Expense Targets' },
  'nav.cashflow': { th: 'กระแสเงินสด', en: 'Cash Flow' },
  'nav.whatif': { th: 'จำลองสถานการณ์', en: 'What-If' },
  'nav.kpi': { th: 'KPI', en: 'KPI' },
  'nav.marketing': { th: 'การตลาด', en: 'Marketing' },

  // ── Overview Metrics ──
  'overview.totalRevenue': { th: 'รายได้รวม', en: 'Total Revenue' },
  'overview.totalCost': { th: 'ต้นทุนรวม', en: 'Total Cost' },
  'overview.netProfit': { th: 'กำไรสุทธิ', en: 'Net Profit' },
  'overview.profitMargin': { th: 'Profit Margin', en: 'Profit Margin' },
  'overview.projected': { th: 'FY 2026 Projected', en: 'FY 2026 Projected' },
  'overview.ofRevenue': { th: 'of Revenue', en: 'of Revenue' },
  'overview.netMargin': { th: 'Net Margin', en: 'Net Margin' },
  'overview.target35': { th: 'Target: 35%', en: 'Target: 35%' },
  'overview.aboveTarget': { th: 'Above Target', en: 'Above Target' },
  'overview.belowTarget': { th: 'Below Target', en: 'Below Target' },
  'overview.noData': { th: 'ยังไม่มีข้อมูล', en: 'No data' },
  'overview.revenueTrend': { th: 'Revenue Trend (Monthly)', en: 'Revenue Trend (Monthly)' },
  'overview.expenseBreakdown': { th: 'Expense Breakdown', en: 'Expense Breakdown' },
  'overview.revenueByChannel': { th: 'Revenue by Channel', en: 'Revenue by Channel' },
  'overview.anomalyAlerts': { th: 'Anomaly Alerts', en: 'Anomaly Alerts' },
  'overview.ofTotal': { th: 'of total', en: 'of total' },
  'overview.totalCostLabel': { th: 'Total Cost', en: 'Total Cost' },
  'overview.businessSection': { th: 'ธุรกิจ — Sales & Customers', en: 'Business — Sales & Customers' },
  'overview.productSection': { th: 'ผลิตภัณฑ์ — Product & Operations', en: 'Product & Operations' },
  'overview.orgSection': { th: 'องค์กร — People & Goals', en: 'Organization — People & Goals' },
  'overview.salesVsTarget': { th: 'ยอดขาย vs เป้า', en: 'Sales vs Target' },
  'overview.mrrGrowth': { th: 'MRR Growth', en: 'MRR Growth' },
  'overview.apiUsageTrend': { th: 'API Usage Trend', en: 'API Usage Trend' },
  'overview.usersTrend': { th: 'Active Users', en: 'Active Users' },
  'overview.okrProgress': { th: 'OKR Progress', en: 'OKR Progress' },
  'overview.headcountTrend': { th: 'Headcount Trend', en: 'Headcount Trend' },

  // ── Expense Categories ──
  'cat.system_cost': { th: 'ค่าระบบ', en: 'System Cost' },
  'cat.salary': { th: 'เงินเดือน', en: 'Payroll' },
  'cat.marketing': { th: 'การตลาด', en: 'Marketing' },
  'cat.tax': { th: 'ภาษี', en: 'Tax' },
  'cat.contingency': { th: 'สำรองฉุกเฉิน', en: 'Contingency' },
  'cat.admin': { th: 'ค่าบริหาร', en: 'Admin & Overhead' },

  // ── Expense Category Labels (with English in parens for Thai) ──
  'cat.system_cost.full': { th: 'ค่าระบบ (Cloud & Infra)', en: 'System Cost (Cloud & Infra)' },
  'cat.salary.full': { th: 'เงินเดือน (Payroll)', en: 'Payroll' },
  'cat.marketing.full': { th: 'การตลาด (Marketing)', en: 'Marketing' },
  'cat.tax.full': { th: 'ภาษี (Tax)', en: 'Tax' },
  'cat.contingency.full': { th: 'สำรองฉุกเฉิน (Reserve)', en: 'Contingency Reserve' },
  'cat.admin.full': { th: 'ค่าบริหาร (Admin & Overhead)', en: 'Admin & Overhead' },

  // ── Donut label categories (overview page) ──
  'donut.system': { th: 'ค่าระบบ', en: 'System' },
  'donut.salary': { th: 'เงินเดือน', en: 'Payroll' },
  'donut.marketing': { th: 'การตลาด', en: 'Marketing' },
  'donut.tax': { th: 'ภาษี', en: 'Tax' },
  'donut.reserve': { th: 'สำรอง', en: 'Reserve' },
  'donut.other': { th: 'อื่นๆ', en: 'Other' },

  // ── Revenue Page ──
  'revenue.annualTotal': { th: 'รายได้รวมทั้งปี', en: 'Annual Total Revenue' },
  'revenue.monthlyByChannel': { th: 'Monthly Revenue by Channel', en: 'Monthly Revenue by Channel' },
  'revenue.share': { th: 'Revenue Share', en: 'Revenue Share' },
  'revenue.momGrowth': { th: 'MoM Growth Rate (%)', en: 'MoM Growth Rate (%)' },
  'revenue.quarterly': { th: 'Quarterly Revenue', en: 'Quarterly Revenue' },
  'revenue.monthlyBreakdown': { th: 'Monthly Revenue Breakdown', en: 'Monthly Revenue Breakdown' },
  'revenue.budgetVsActual': { th: 'Revenue: Target vs Actual by Product', en: 'Revenue: Target vs Actual by Product' },
  'revenue.varianceChart': { th: 'Revenue: Target vs Actual Chart', en: 'Revenue: Target vs Actual Chart' },
  'revenue.shareTrend': { th: 'Revenue Share Trend (%)', en: 'Revenue Share Trend (%)' },
  'revenue.cumulativeVsTarget': { th: 'สะสมรายได้ vs เป้า', en: 'Cumulative Revenue vs Target' },
  'revenue.profitMargin': { th: 'กำไร & Margin Trend', en: 'Profit & Margin Trend' },
  'revenue.emergingChannels': { th: 'ช่องทางใหม่ (CRM & SMS)', en: 'Emerging Channels (CRM & SMS)' },

  // ── Cost Control Page ──
  'cost.totalCost': { th: 'ต้นทุนรวม', en: 'Total Cost' },
  'cost.systemCost': { th: 'ค่าระบบ', en: 'System Cost' },
  'cost.salary': { th: 'เงินเดือน', en: 'Payroll' },
  'cost.anomalies': { th: 'Anomalies', en: 'Anomalies' },
  'cost.anomalyAlerts': { th: 'Anomaly Alerts', en: 'Anomaly Alerts' },
  'cost.monthlyCostBreakdown': { th: 'Monthly Cost Breakdown', en: 'Monthly Cost Breakdown' },
  'cost.categoriesTrend': { th: 'Categories Trend', en: 'Categories Trend' },
  'cost.categoryStats': { th: 'Category Statistics', en: 'Category Statistics' },
  'cost.systemCostScenarios': { th: 'System Cost Scenarios', en: 'System Cost Scenarios' },
  'cost.highSeverity': { th: 'High Severity', en: 'High Severity' },
  'cost.ofRevenue': { th: 'of Revenue', en: 'of Revenue' },
  'cost.ofCost': { th: 'of cost', en: 'of cost' },
  'cost.annualSystemCost': { th: 'Annual System Cost', en: 'Annual System Cost' },
  'cost.savingsVsActual': { th: 'Savings vs Actual', en: 'Savings vs Actual' },
  'cost.currentRate': { th: 'อัตราปัจจุบัน — เป้าหมายลดเหลือ 20%', en: 'Current rate — target reduction to 20%' },
  'cost.reducedBy': { th: 'ลดลง', en: 'Reduced by' },
  'cost.points': { th: 'points', en: 'points' },

  // ── Expenses Page ──
  'expenses.annualTotal': { th: 'ต้นทุนรวมทั้งปี', en: 'Annual Total Cost' },
  'expenses.systemCost': { th: 'ค่าระบบ', en: 'System Cost' },
  'expenses.salary': { th: 'เงินเดือน', en: 'Payroll' },
  'expenses.tax': { th: 'ภาษี', en: 'Tax' },
  'expenses.monthlyCostBreakdown': { th: 'Monthly Cost Breakdown', en: 'Monthly Cost Breakdown' },
  'expenses.categoriesTrend': { th: 'Categories Trend', en: 'Categories Trend' },
  'expenses.monthlyBreakdown': { th: 'Monthly Expense Breakdown', en: 'Monthly Expense Breakdown' },
  'expenses.summaryTable': { th: 'สรุปค่าใช้จ่ายรายเดือน', en: 'Monthly Expense Summary' },
  'expenses.detailByCategory': { th: 'รายละเอียดตามหมวด', en: 'Detail by Category' },
  'expenses.simpleCosts': { th: 'ค่าใช้จ่ายที่ไม่มีรายละเอียดย่อย', en: 'Non-Detail Categories' },

  // ── Sub-item labels: System Cost ──
  'sub.system_cost.cloud': { th: 'Cloud Infrastructure', en: 'Cloud Infrastructure' },
  'sub.system_cost.server': { th: 'API Server & Hosting', en: 'API Server & Hosting' },
  'sub.system_cost.database': { th: 'Database & Storage', en: 'Database & Storage' },
  'sub.system_cost.cdn': { th: 'CDN & Network', en: 'CDN & Network' },
  'sub.system_cost.monitoring': { th: 'Monitoring & Tools', en: 'Monitoring & Tools' },
  'sub.system_cost.license': { th: 'SaaS License', en: 'SaaS License' },

  // ── Sub-item labels: Salary ──
  'sub.salary.base': { th: 'เงินเดือนพื้นฐาน', en: 'Base Salary' },
  'sub.salary.social': { th: 'ประกันสังคม (นายจ้าง)', en: 'Social Security' },
  'sub.salary.bonus': { th: 'โบนัส/เบี้ยเลี้ยง', en: 'Bonus / Incentive' },

  // ── Sub-item labels: Marketing ──
  'sub.marketing.api_growth': { th: 'API Growth', en: 'API Growth' },
  'sub.marketing.crm_acq': { th: 'CRM Acquisition', en: 'CRM Acquisition' },
  'sub.marketing.sms_launch': { th: 'SMS Launch', en: 'SMS Launch' },
  'sub.marketing.brand': { th: 'Brand Awareness', en: 'Brand Awareness' },
  'sub.marketing.mkt_reserve': { th: 'สำรอง', en: 'Reserve' },

  // ── Sub-item labels: Admin ──
  'sub.admin.social_security': { th: 'ประกันสังคม', en: 'Social Security' },
  'sub.admin.accounting': { th: 'ค่าบัญชี', en: 'Accounting' },
  'sub.admin.insurance': { th: 'ประกันภัย', en: 'Insurance' },
  'sub.admin.office': { th: 'สำนักงาน', en: 'Office' },
  'sub.admin.other_admin': { th: 'อื่นๆ', en: 'Other' },

  // ── Budget vs Actual Page ──
  'budget.revenueAchievement': { th: 'Revenue Achievement', en: 'Revenue Achievement' },
  'budget.costAchievement': { th: 'Cost Achievement', en: 'Cost Achievement' },
  'budget.profitAchievement': { th: 'Profit Achievement', en: 'Profit Achievement' },
  'budget.costByCategory': { th: 'Cost: Budget vs Actual by Category', en: 'Cost: Budget vs Actual by Category' },
  'budget.costDetailByCategory': { th: 'รายละเอียดต้นทุนตามหมวด', en: 'Cost Detail by Category' },
  'budget.revenueByMonth':       { th: 'Revenue: Budget vs Actual', en: 'Revenue: Budget vs Actual' },
  'budget.editBudgetTargets':    { th: 'แก้ไขเป้างบประมาณ', en: 'Edit Budget Targets' },
  'budget.budgetSaved':          { th: 'บันทึกเป้างบประมาณแล้ว', en: 'Budget targets saved' },
  'budget.budgetReset':          { th: 'รีเซ็ตเป้างบประมาณแล้ว', en: 'Budget targets reset' },
  'budget.confirmReset':         { th: 'รีเซ็ตเป้างบประมาณกลับค่า Default?', en: 'Reset budget targets to defaults?' },
  'budget.actualRevenue':        { th: 'รายได้จริง', en: 'Actual Revenue' },
  'budget.editInExpenses':       { th: 'แก้ไขในหน้าค่าใช้จ่าย', en: 'Edit in Expenses' },
  'budget.syncedFrom':           { th: 'ซิงค์จากค่าใช้จ่าย', en: 'Synced from Expenses' },
  'budget.noSubItems':           { th: 'ไม่มีรายการย่อย', en: 'No sub-items' },
  'budget.budgetTarget':         { th: 'เป้าหมาย', en: 'Target' },
  'budget.perCategory':          { th: 'ตั้งเป้าตามหมวด', en: 'Per Category' },

  // ── Cost Management (merged page) ──
  'page.costMgmt.title':         { th: 'บริหารต้นทุน', en: 'Cost Management' },
  'nav.costMgmt':                { th: 'บริหารต้นทุน', en: 'Cost Management' },
  'section.budgetTargets':       { th: 'เป้าค่าใช้จ่าย', en: 'Budget Targets' },
  'section.actualExpenses':      { th: 'ค่าใช้จ่ายจริง', en: 'Actual Expenses' },
  'section.varianceAnalysis':    { th: 'เปรียบเทียบเป้า vs จริง', en: 'Target vs Actual' },
  'compare.categoryOverview':    { th: 'ภาพรวมตามหมวด', en: 'Category Overview' },
  'compare.varianceHeatmap':     { th: 'Heatmap ผลต่างรายเดือน', en: 'Monthly Variance Heatmap' },
  'compare.detailedBreakdown':   { th: 'รายละเอียดตามหมวด', en: 'Detailed Breakdown' },
  'compare.noDataYet':           { th: 'ยังไม่มีข้อมูลค่าใช้จ่ายจริง', en: 'No actual expenses recorded yet' },
  'compare.noDataHint':          { th: 'ตั้งเป้าไว้แล้ว — ไปหน้า "บันทึกจริง" เพื่อกรอกค่าใช้จ่าย แล้วกลับมาเปรียบเทียบ', en: 'Budget targets are set. Go to the Record tab to enter expenses, then return here to compare.' },
  'compare.goToActual':          { th: 'ไปหน้าบันทึกจริง', en: 'Go to Record Tab' },
  'compare.annualTarget':        { th: 'เป้าทั้งปี', en: 'Annual Target' },
  'compare.spentPct':            { th: 'ใช้ไป', en: 'Spent' },
  'compare.underBudget':         { th: 'ต่ำกว่าเป้า', en: 'Under budget' },
  'compare.nearTarget':          { th: 'ใกล้เป้า', en: 'Near target' },
  'compare.overBudget':          { th: 'เกินเป้า', en: 'Over budget' },
  'compare.noData':              { th: 'ไม่มีข้อมูล', en: 'No data' },
  'compare.monthsPending':       { th: 'เดือนที่ยังไม่มีข้อมูล', en: 'months pending' },
  'compare.heatmapTitle':        { th: 'ผลต่างเป้า vs จริง (%)', en: 'Budget vs Actual Variance (%)' },
  'section.charts':              { th: 'กราฟ', en: 'Charts' },
  'section.detail':              { th: 'รายละเอียดตามหมวด', en: 'Detail by Category' },
  'section.budgetDetails':       { th: 'รายละเอียดเป้าหมาย', en: 'Budget Target Details' },
  'btn.saveAll':                 { th: 'Save All', en: 'Save All' },
  'btn.resetBudget':             { th: 'Reset เป้า', en: 'Reset Targets' },
  'btn.resetExpenses':           { th: 'Reset ค่าใช้จ่าย', en: 'Reset Expenses' },
  'toast.saveAllSuccess':        { th: 'บันทึกทั้งหมดแล้ว', en: 'All data saved' },
  'confirm.resetBudgetTargets':  { th: 'รีเซ็ตเป้าค่าใช้จ่ายกลับค่า Default?', en: 'Reset budget targets to defaults?' },

  // ── Cash Flow Page ──
  'cashflow.openingBalance': { th: 'Opening Balance', en: 'Opening Balance' },
  'cashflow.closingBalance': { th: 'Closing Balance', en: 'Closing Balance' },
  'cashflow.netCashFlow': { th: 'Net Cash Flow', en: 'Net Cash Flow' },
  'cashflow.reserveMonths': { th: 'Reserve Months', en: 'Reserve Months' },
  'cashflow.startYear': { th: 'ต้นปี 2026', en: 'Start of FY 2026' },
  'cashflow.endYear': { th: 'สิ้นปี 2026', en: 'End of FY 2026' },
  'cashflow.positive': { th: 'Positive', en: 'Positive' },
  'cashflow.targetMonths': { th: 'Target: 3-6 months', en: 'Target: 3-6 months' },
  'cashflow.monthlyInOut': { th: 'Monthly Inflow vs Outflow', en: 'Monthly Inflow vs Outflow' },
  'cashflow.cumulativeBalance': { th: 'Cumulative Cash Balance', en: 'Cumulative Cash Balance' },
  'cashflow.taxHeavyMonths': { th: 'Tax Heavy Months', en: 'Tax Heavy Months' },
  'cashflow.reserveHealth': { th: 'Cash Reserve Health', en: 'Cash Reserve Health' },
  'cashflow.excellent': { th: '✅ Excellent — มากกว่า 6 เดือน', en: '✅ Excellent — more than 6 months' },
  'cashflow.good': { th: '✅ Good — อยู่ในเป้าหมาย 3-6 เดือน', en: '✅ Good — within 3-6 months target' },
  'cashflow.belowTarget': { th: '⚠️ Below Target — ต่ำกว่าเป้า 3 เดือน', en: '⚠️ Below Target — under 3 months' },
  'cashflow.totalHeavyTax': { th: 'Total Heavy Tax', en: 'Total Heavy Tax' },
  'cashflow.monthlyDetails': { th: 'Monthly Cash Flow Details', en: 'Monthly Cash Flow Details' },

  // ── What-If Page ──
  'whatif.adjustParams': { th: 'Adjust Parameters', en: 'Adjust Parameters' },
  'whatif.baseVsModified': { th: 'Base vs Modified Scenario', en: 'Base vs Modified Scenario' },
  'whatif.revenueModified': { th: 'Revenue (Modified)', en: 'Revenue (Modified)' },
  'whatif.costModified': { th: 'Cost (Modified)', en: 'Cost (Modified)' },
  'whatif.profitModified': { th: 'Profit (Modified)', en: 'Profit (Modified)' },
  'whatif.marginModified': { th: 'Margin (Modified)', en: 'Margin (Modified)' },
  'whatif.revenueDelta': { th: 'Revenue Δ', en: 'Revenue Δ' },
  'whatif.costDelta': { th: 'Cost Δ', en: 'Cost Δ' },
  'whatif.profitDelta': { th: 'Profit Δ', en: 'Profit Δ' },

  // ── KPI Page ──
  'kpi.overallHealth': { th: 'Overall Health Score', en: 'Overall Health Score' },
  'kpi.marginTrend': { th: 'Monthly Margin Trend', en: 'Monthly Margin Trend' },
  'kpi.gauges': { th: 'KPI Gauges', en: 'KPI Gauges' },
  'kpi.target': { th: 'เป้าหมาย:', en: 'Target:' },
  'kpi.current': { th: 'ปัจจุบัน', en: 'Current' },
  'kpi.riskRegister': { th: 'Risk Register', en: 'Risk Register' },
  'kpi.auditChecklist': { th: 'Audit Checklist', en: 'Audit Checklist' },
  'kpi.profitMargin': { th: 'Profit Margin', en: 'Profit Margin' },
  'kpi.costRevenueRatio': { th: 'Cost/Revenue Ratio', en: 'Cost/Revenue Ratio' },
  'kpi.personnelRevenue': { th: 'Personnel/Revenue', en: 'Personnel/Revenue' },
  'kpi.revenueGrowth': { th: 'Revenue Growth (MoM)', en: 'Revenue Growth (MoM)' },
  'kpi.breakEvenSafety': { th: 'Break-Even Safety', en: 'Break-Even Safety' },
  'kpi.cashReserve': { th: 'Cash Reserve', en: 'Cash Reserve' },
  'kpi.revenueDiversification': { th: 'Revenue Diversification', en: 'Revenue Diversification' },
  'kpi.targetGe35': { th: 'เป้าหมาย ≥35%', en: 'Target ≥35%' },
  'kpi.targetLt65': { th: 'เป้าหมาย <65%', en: 'Target <65%' },
  'kpi.targetLt10': { th: 'เป้าหมาย <10%', en: 'Target <10%' },
  'kpi.avgMoMGrowth': { th: 'Average MoM growth', en: 'Average MoM growth' },
  'kpi.distFromBE': { th: 'ระยะห่างจาก Break-even', en: 'Distance from break-even' },
  'kpi.target36months': { th: 'เป้าหมาย 3-6 เดือน', en: 'Target 3-6 months' },
  'kpi.apiNeedDiversify': { th: 'ต้องการกระจาย', en: 'Needs diversification' },

  // ── Marketing Page ──
  'marketing.annualBudget': { th: 'Annual Budget', en: 'Annual Budget' },
  'marketing.effectivePostVat': { th: 'Effective (Post-VAT)', en: 'Effective (Post-VAT)' },
  'marketing.marketingRevenue': { th: 'Marketing/Revenue', en: 'Marketing/Revenue' },
  'marketing.q4Push': { th: 'Q4 Push', en: 'Q4 Push' },
  'marketing.avgMonthlyRatio': { th: 'Average monthly ratio', en: 'Average monthly ratio' },
  'marketing.ofAnnualBudget': { th: '37% of annual budget', en: '37% of annual budget' },
  'marketing.quarterlyBudget': { th: 'Quarterly Marketing Budget', en: 'Quarterly Marketing Budget' },
  'marketing.channelAllocation': { th: 'Channel Allocation', en: 'Channel Allocation' },
  'marketing.taxImpact': { th: 'Tax Impact on Marketing Budget', en: 'Tax Impact on Marketing Budget' },
  'marketing.preTaxBudget': { th: 'Pre-Tax Budget', en: 'Pre-Tax Budget' },
  'marketing.effectiveBudget': { th: 'Effective Budget', en: 'Effective Budget' },
  'marketing.ratioChart': { th: 'Marketing / Revenue Ratio (%)', en: 'Marketing / Revenue Ratio (%)' },
  'marketing.strategyTable': { th: 'Quarterly Marketing Strategy', en: 'Quarterly Marketing Strategy' },

  // ── Table Headers ──
  'th.month': { th: 'เดือน', en: 'Month' },
  'th.budget': { th: 'Budget', en: 'Budget' },
  'th.target': { th: 'Target', en: 'Target' },
  'th.actualTotal': { th: 'Actual Total', en: 'Actual Total' },
  'th.variance': { th: 'Variance', en: 'Variance' },
  'th.status': { th: 'Status', en: 'Status' },
  'th.total': { th: 'Total', en: 'Total' },
  'th.category': { th: 'Category', en: 'Category' },
  'th.annual': { th: 'Annual', en: 'Annual' },
  'th.avgMo': { th: 'Avg/Mo', en: 'Avg/Mo' },
  'th.min': { th: 'Min', en: 'Min' },
  'th.max': { th: 'Max', en: 'Max' },
  'th.stddev': { th: 'StdDev', en: 'StdDev' },
  'th.quarter': { th: 'Quarter', en: 'Quarter' },
  'th.focus': { th: 'Focus', en: 'Focus' },
  'th.strategy': { th: 'Strategy', en: 'Strategy' },
  'th.channels': { th: 'Channels', en: 'Channels' },
  'th.inflow': { th: 'Inflow', en: 'Inflow' },
  'th.outflow': { th: 'Outflow', en: 'Outflow' },
  'th.netFlow': { th: 'Net Flow', en: 'Net Flow' },
  'th.balance': { th: 'Balance', en: 'Balance' },

  // ── Buttons ──
  'btn.save': { th: 'Save', en: 'Save' },
  'btn.undo': { th: 'Undo', en: 'Undo' },
  'btn.exportCsv': { th: 'Export CSV', en: 'Export CSV' },
  'btn.exportJson': { th: 'Export JSON', en: 'Export JSON' },
  'btn.importJson': { th: 'Import JSON', en: 'Import JSON' },
  'btn.reset': { th: 'Reset to Defaults', en: 'Reset to Defaults' },
  'btn.resetShort': { th: 'Reset', en: 'Reset' },

  // ── Toast Messages ──
  'toast.revenueSaved': { th: 'บันทึกข้อมูลรายได้แล้ว', en: 'Revenue data saved' },
  'toast.expensesSaved': { th: 'บันทึกข้อมูลค่าใช้จ่ายแล้ว', en: 'Expense data saved' },
  'toast.budgetSaved': { th: 'บันทึกข้อมูลแล้ว', en: 'Data saved' },
  'toast.undoSuccess': { th: 'Undo สำเร็จ', en: 'Undo successful' },
  'toast.exportCsvSuccess': { th: 'Export CSV สำเร็จ', en: 'CSV exported successfully' },
  'toast.exportJsonSuccess': { th: 'Export JSON สำเร็จ', en: 'JSON exported successfully' },
  'toast.importSuccess': { th: 'Import สำเร็จ', en: 'Import successful' },
  'toast.importFailed': { th: 'Import ล้มเหลว — ไฟล์ไม่ถูกต้อง', en: 'Import failed — invalid file' },
  'toast.resetSuccess': { th: 'Reset สำเร็จ — กลับค่า Default', en: 'Reset successful — restored defaults' },
  'toast.resetBudgetSuccess': { th: 'Reset สำเร็จ', en: 'Reset successful' },
  'toast.migrateCostV4': { th: 'ข้อมูล Cost ถูก migrate เป็น v4 — รวม 5 หมวดย่อยเป็น "ค่าบริหาร"', en: 'Cost data migrated to v4 — merged 5 sub-categories into "Admin"' },
  'toast.migrateCostNew': { th: 'ข้อมูล Cost ถูก migrate เป็น v4 — กรุณากรอก Cost ตามหมวดใหม่', en: 'Cost data migrated to v4 — please enter costs by new category' },

  // ── Confirm Dialogs ──
  'confirm.resetRevenue': { th: 'รีเซ็ตรายได้กลับค่า Default ทั้งหมด?', en: 'Reset all revenue to defaults?' },
  'confirm.resetExpenses': { th: 'รีเซ็ตค่าใช้จ่ายกลับค่า Default ทั้งหมด?', en: 'Reset all expenses to defaults?' },
  'confirm.zeroExpenses': { th: 'ตั้งค่าค่าใช้จ่ายจริงทั้งหมดเป็น 0?', en: 'Set all actual expenses to zero?' },
  'btn.zeroExpenses': { th: 'ตั้งค่าเป็น 0', en: 'Zero All' },
  'toast.zeroSuccess': { th: 'ตั้งค่าค่าใช้จ่ายเป็น 0 แล้ว', en: 'All expenses set to zero' },
  'confirm.resetBudget': { th: 'ล้างข้อมูล Actual ทั้งหมด?', en: 'Clear all actual data?' },

  // ── Cost Management Tabs & Summary ──
  'tab.budget':            { th: 'ตั้งเป้า', en: 'Budget' },
  'tab.actual':            { th: 'บันทึกจริง', en: 'Record' },
  'tab.compare':           { th: 'เปรียบเทียบ', en: 'Compare' },
  'tab.charts':            { th: 'กราฟ', en: 'Charts' },
  'summary.budgetTotal':   { th: 'เป้ารายจ่ายรวม', en: 'Budget Total' },
  'summary.actualTotal':   { th: 'จ่ายจริงรวม', en: 'Actual Total' },
  'summary.variance':      { th: 'ผลต่าง', en: 'Variance' },
  'summary.remaining':     { th: 'คงเหลือ', en: 'Remaining' },
  'card.annualBudget':     { th: 'เป้าทั้งปี', en: 'Annual Target' },
  'card.annualActual':     { th: 'จริงทั้งปี', en: 'Annual Actual' },
  'card.target':           { th: 'เป้า', en: 'Target' },
  'card.actual':           { th: 'จริง', en: 'Actual' },
  'section.dangerZone':    { th: 'Danger Zone', en: 'Danger Zone' },
  'summary.allCategories': { th: 'รวมทุกหมวด', en: 'All Categories' },
  'btn.more':              { th: 'เพิ่มเติม', en: 'More' },

  // ── Status / Badge Labels ──
  'status.onTrack': { th: 'On Track', en: 'On Track' },
  'status.warning': { th: 'Warning', en: 'Warning' },
  'status.critical': { th: 'Critical', en: 'Critical' },
  'status.pending': { th: 'Pending', en: 'Pending' },
  'status.noData': { th: 'ยังไม่มีข้อมูล', en: 'No data yet' },
  'status.unsaved': { th: 'Unsaved changes', en: 'Unsaved changes' },
  'status.lastSaved': { th: 'Last saved', en: 'Last saved' },

  // ── Chart Labels ──
  'chart.amountTHB': { th: 'Amount (THB)', en: 'Amount (THB)' },
  'chart.variancePct': { th: 'Variance %', en: 'Variance %' },
  'chart.budgetRevenue': { th: 'Target Revenue', en: 'Target Revenue' },
  'chart.baseRevenue': { th: 'Base Revenue', en: 'Base Revenue' },
  'chart.modifiedRevenue': { th: 'Modified Revenue', en: 'Modified Revenue' },
  'chart.baseProfit': { th: 'Base Profit', en: 'Base Profit' },
  'chart.modifiedProfit': { th: 'Modified Profit', en: 'Modified Profit' },
  'chart.grossMargin': { th: 'Gross Margin %', en: 'Gross Margin %' },
  'chart.cashBalance': { th: 'Cash Balance', en: 'Cash Balance' },
  'chart.openingBalance': { th: 'Opening Balance', en: 'Opening Balance' },
  'chart.target35': { th: 'Target 35%', en: 'Target 35%' },
  'chart.health': { th: 'Health', en: 'Health' },
  'chart.reserve': { th: 'Reserve', en: 'Reserve' },
  'chart.inflow': { th: 'Inflow', en: 'Inflow' },
  'chart.outflow': { th: 'Outflow', en: 'Outflow' },
  'chart.marketingRevenuePct': { th: 'Marketing/Revenue %', en: 'Marketing/Revenue %' },

  // ── Slider Labels (What-If) ──
  'slider.systemCostRatio': { th: 'System Cost Ratio', en: 'System Cost Ratio' },
  'slider.apiGrowth': { th: 'API Growth Rate (MoM)', en: 'API Growth Rate (MoM)' },
  'slider.crmGrowth': { th: 'CRM Growth Rate (MoM)', en: 'CRM Growth Rate (MoM)' },
  'slider.smsGrowth': { th: 'SMS Growth Rate (MoM)', en: 'SMS Growth Rate (MoM)' },
  'slider.marketingBudget': { th: 'Marketing Budget (Annual)', en: 'Marketing Budget (Annual)' },
  'slider.collectionRate': { th: 'Collection Rate', en: 'Collection Rate' },
  'slider.salaryGrowth': { th: 'Salary Growth', en: 'Salary Growth' },

  // ── Misc ──
  'misc.share': { th: 'share', en: 'share' },
  'misc.mom': { th: 'MoM', en: 'MoM' },

  // ── Sales Pipeline Page ──
  'page.sales.title': { th: 'Sales Pipeline', en: 'Sales Pipeline' },
  'sales.totalRevenue': { th: 'ยอดขายรวม', en: 'Total Sales' },
  'sales.conversionRate': { th: 'อัตราปิดการขาย', en: 'Conversion Rate' },
  'sales.avgDealSize': { th: 'ยอดเฉลี่ยต่อดีล', en: 'Avg Deal Size' },
  'sales.totalDeals': { th: 'ดีลทั้งหมด', en: 'Total Deals' },
  'sales.won': { th: 'ปิดได้', en: 'Won' },
  'sales.lost': { th: 'เสียไป', en: 'Lost' },
  'sales.inProgress': { th: 'กำลังดำเนินการ', en: 'In Progress' },
  'sales.target': { th: 'เป้า', en: 'Target' },
  'sales.actual': { th: 'จริง', en: 'Actual' },
  'sales.deals': { th: 'ดีล', en: 'deals' },
  'sales.tabOverview': { th: 'ภาพรวม', en: 'Overview' },
  'sales.tabPipeline': { th: 'Pipeline', en: 'Pipeline' },
  'sales.tabTargets': { th: 'เป้าหมาย', en: 'Targets' },
  'sales.pipelineFunnel': { th: 'Sales Funnel', en: 'Sales Funnel' },
  'sales.winLoss': { th: 'วิเคราะห์ Win/Loss', en: 'Win/Loss Analysis' },
  'sales.lossReasons': { th: 'เหตุผลที่แพ้', en: 'Loss Reasons' },
  'sales.topCustomers': { th: 'ลูกค้า Top 10', en: 'Top 10 Customers' },
  'sales.customer': { th: 'ลูกค้า', en: 'Customer' },
  'sales.plan': { th: 'แผน', en: 'Plan' },
  'sales.revenue': { th: 'รายได้', en: 'Revenue' },
  'sales.share': { th: 'สัดส่วน', en: 'Share' },
  'sales.repPerformance': { th: 'ผลงาน Sales Rep', en: 'Sales Rep Performance' },
  'sales.monthlyDeals': { th: 'ดีลรายเดือน', en: 'Monthly Deals' },
  'sales.newDeals': { th: 'ดีลใหม่', en: 'New Deals' },
  'sales.convRate': { th: 'Conv %', en: 'Conv %' },
  'sales.pipelineValue': { th: 'มูลค่า Pipeline', en: 'Pipeline Value' },
  'sales.monthlyTargets': { th: 'เป้ารายเดือน', en: 'Monthly Targets' },
  'sales.targetRevenue': { th: 'เป้ารายได้', en: 'Target Revenue' },
  'sales.actualRevenue': { th: 'รายได้จริง', en: 'Actual Revenue' },
  'sales.revenueVsTarget': { th: 'รายได้ vs เป้า', en: 'Revenue vs Target' },
  'sales.dealsTrend': { th: 'แนวโน้มดีล', en: 'Deals Trend' },
  'sales.conversionTrend': { th: 'แนวโน้ม Conversion', en: 'Conversion Trend' },
  'sales.closedWon': { th: 'ปิดได้', en: 'Closed Won' },
  'sales.closedLost': { th: 'เสียไป', en: 'Closed Lost' },
  'confirm.resetSales': { th: 'รีเซ็ตข้อมูล Sales ทั้งหมด?', en: 'Reset all Sales data?' },

  // ── Customer & Subscription Page ──
  'page.customers.title': { th: 'ลูกค้า & สมาชิก', en: 'Customer & Subscription' },
  'customers.totalCustomers': { th: 'ลูกค้าทั้งหมด', en: 'Total Customers' },
  'customers.paid': { th: 'จ่ายเงิน', en: 'Paid' },
  'customers.churnRate': { th: 'อัตรายกเลิก', en: 'Churn Rate' },
  'customers.latest': { th: 'ล่าสุด', en: 'Latest' },
  'customers.tabOverview': { th: 'ภาพรวม', en: 'Overview' },
  'customers.tabMetrics': { th: 'ตัวเลข', en: 'Metrics' },
  'customers.tabCohort': { th: 'Cohort', en: 'Cohort' },
  'customers.byPlan': { th: 'ตามแผน', en: 'By Plan' },
  'customers.growth': { th: 'การเติบโต', en: 'Growth' },
  'customers.monthlyBreakdown': { th: 'รายเดือน', en: 'Monthly Breakdown' },
  'customers.newCust': { th: 'ใหม่', en: 'New' },
  'customers.churn': { th: 'ยกเลิก', en: 'Churn' },
  'customers.mrrCac': { th: 'MRR & CAC', en: 'MRR & CAC' },
  'customers.cohortAnalysis': { th: 'Cohort Analysis', en: 'Cohort Analysis' },
  'customers.cohort': { th: 'Cohort', en: 'Cohort' },
  'customers.cohortNote': { th: 'แสดง Retention rate (%) ของลูกค้าแต่ละ cohort ตามเดือน', en: 'Shows retention rate (%) for each customer cohort by month' },
  'customers.retentionCurve': { th: 'Retention Curve', en: 'Retention Curve' },
  'customers.mrrTrend': { th: 'MRR Trend', en: 'MRR Trend' },
  'customers.cacTrend': { th: 'CAC Trend', en: 'CAC Trend' },
  'customers.churnTrend': { th: 'Churn Trend', en: 'Churn Trend' },
  'customers.newCustTrend': { th: 'ลูกค้าใหม่', en: 'New Customers' },
  'confirm.resetCustomers': { th: 'รีเซ็ตข้อมูลลูกค้าทั้งหมด?', en: 'Reset all customer data?' },

  // ── Product Metrics Page ──
  'page.product.title': { th: 'Product Metrics', en: 'Product Metrics' },
  'product.apiCalls': { th: 'API Calls', en: 'API Calls' },
  'product.errorRate': { th: 'Error Rate', en: 'Error Rate' },
  'product.errorPct': { th: 'Error %', en: 'Error %' },
  'product.stickiness': { th: 'Stickiness', en: 'Stickiness' },
  'product.uptime': { th: 'Uptime', en: 'Uptime' },
  'product.avgResponse': { th: 'Avg Response', en: 'Avg Response' },
  'product.tickets': { th: 'Tickets', en: 'Tickets' },
  'product.tabOverview': { th: 'ภาพรวม', en: 'Overview' },
  'product.tabUsage': { th: 'การใช้งาน', en: 'Usage' },
  'product.tabReliability': { th: 'ความเสถียร', en: 'Reliability' },
  'product.apiUsage': { th: 'API Usage', en: 'API Usage' },
  'product.activeUsers': { th: 'Active Users', en: 'Active Users' },
  'product.featureAdoption': { th: 'Feature Adoption', en: 'Feature Adoption' },
  'product.supportSummary': { th: 'สรุป Support', en: 'Support Summary' },
  'product.totalTickets': { th: 'Tickets ทั้งหมด', en: 'Total Tickets' },
  'product.avgResolution': { th: 'แก้ไขเฉลี่ย', en: 'Avg Resolution' },
  'product.ticketsTrend': { th: 'แนวโน้ม', en: 'Trend' },
  'product.monthlyData': { th: 'ข้อมูลรายเดือน', en: 'Monthly Data' },
  'product.uptimeSla': { th: 'Uptime & SLA', en: 'Uptime & SLA' },
  'product.responseMs': { th: 'Response (ms)', en: 'Response (ms)' },
  'product.resolution': { th: 'Resolution', en: 'Resolution' },
  'product.uptimeChart': { th: 'Uptime Trend', en: 'Uptime Trend' },
  'product.responseChart': { th: 'Response Time', en: 'Response Time' },
  'product.apiTrend': { th: 'API Calls Trend', en: 'API Calls Trend' },
  'product.usersTrend': { th: 'Users Trend', en: 'Users Trend' },
  'product.errorTrend': { th: 'Error Rate Trend', en: 'Error Rate Trend' },
  'product.ticketsTrendChart': { th: 'Tickets Trend', en: 'Tickets Trend' },
  'confirm.resetProduct': { th: 'รีเซ็ตข้อมูล Product ทั้งหมด?', en: 'Reset all Product data?' },

  // ── HR & People Page ──
  'page.hr.title': { th: 'บุคลากร', en: 'HR & People' },
  'hr.headcount': { th: 'จำนวนพนักงาน', en: 'Headcount' },
  'hr.departments': { th: 'แผนก', en: 'departments' },
  'hr.annualPayroll': { th: 'ต้นทุนบุคลากร/ปี', en: 'Annual People Cost' },
  'hr.avgSalary': { th: 'เฉลี่ย/คน', en: 'Avg/person' },
  'hr.turnoverRate': { th: 'อัตราลาออก', en: 'Turnover Rate' },
  'hr.resignations': { th: 'ลาออก', en: 'resignations' },
  'hr.hiringProgress': { th: 'รับพนักงาน', en: 'Hiring Progress' },
  'hr.hiringPlan': { th: 'แผนรับพนักงาน', en: 'Hiring Plan' },
  'hr.tabOverview': { th: 'ภาพรวม', en: 'Overview' },
  'hr.tabPayroll': { th: 'เงินเดือน', en: 'Payroll' },
  'hr.tabHiring': { th: 'การรับคน', en: 'Hiring' },
  'hr.orgStructure': { th: 'โครงสร้างองค์กร', en: 'Organization Structure' },
  'hr.byDepartment': { th: 'ตามแผนก', en: 'By Department' },
  'hr.headcountTrend': { th: 'แนวโน้มจำนวนพนักงาน', en: 'Headcount Trend' },
  'hr.trainingBudget': { th: 'งบพัฒนาบุคลากร', en: 'Training Budget' },
  'hr.annualTraining': { th: 'งบทั้งปี', en: 'Annual Budget' },
  'hr.perHead': { th: 'ต่อคน', en: 'Per Head' },
  'hr.payrollDetail': { th: 'รายละเอียดเงินเดือน', en: 'Payroll Detail' },
  'hr.baseSalary': { th: 'เงินเดือน', en: 'Base Salary' },
  'hr.bonus': { th: 'โบนัส', en: 'Bonus' },
  'hr.socialSec': { th: 'ประกันสังคม', en: 'Social Security' },
  'hr.hiringPlanVsActual': { th: 'แผนรับ vs จริง', en: 'Hiring Plan vs Actual' },
  'hr.planned': { th: 'แผน', en: 'Planned' },
  'hr.actualHires': { th: 'รับจริง', en: 'Actual Hires' },
  'hr.netChange': { th: 'เปลี่ยนแปลง', en: 'Net Change' },
  'hr.hiringChart': { th: 'กราฟการรับคน', en: 'Hiring Chart' },
  'hr.payrollTrend': { th: 'Payroll Trend', en: 'Payroll Trend' },
  'hr.costBreakdown': { th: 'สัดส่วนต้นทุน', en: 'Cost Breakdown' },
  'hr.trainingTrend': { th: 'Training Budget Trend', en: 'Training Budget Trend' },
  'confirm.resetHR': { th: 'รีเซ็ตข้อมูล HR ทั้งหมด?', en: 'Reset all HR data?' },

  // ── OKR & Goals Page ──
  'page.okr.title': { th: 'OKR & Goals', en: 'OKR & Goals' },
  'okr.overallProgress': { th: 'ความคืบหน้ารวม', en: 'Overall Progress' },
  'okr.totalObjectives': { th: 'Objectives ทั้งหมด', en: 'Total Objectives' },
  'okr.completedKRs': { th: 'KRs สำเร็จ', en: 'Completed KRs' },
  'okr.atRisk': { th: 'เสี่ยง', en: 'At Risk' },
  'okr.tabCompany': { th: 'บริษัท', en: 'Company' },
  'okr.tabTeams': { th: 'ทีม', en: 'Teams' },
  'okr.tabQuarterly': { th: 'รายไตรมาส', en: 'Quarterly' },
  'okr.tabAlignment': { th: 'Alignment', en: 'Alignment' },
  'okr.current': { th: 'ปัจจุบัน', en: 'Current' },
  'okr.target': { th: 'เป้า', en: 'Target' },
  'okr.progress': { th: 'ความคืบหน้า', en: 'Progress' },
  'okr.progressChart': { th: 'กราฟ Key Results', en: 'Key Results Chart' },
  'okr.quarterlyChart': { th: 'กราฟรายไตรมาส', en: 'Quarterly Chart' },
  'okr.alignmentView': { th: 'มุมมอง Alignment', en: 'Alignment View' },
  'okr.alignmentDesc': { th: 'แสดงว่า OKR ระดับทีมสอดคล้องกับเป้าหมายบริษัทอย่างไร', en: 'Shows how team OKRs align with company objectives' },

  // ── Executive Report Page ──
  'page.report.title': { th: 'รายงานผู้บริหาร', en: 'Executive Report' },
  'report.annualRevenue': { th: 'รายได้ทั้งปี', en: 'Annual Revenue' },
  'report.annualCost': { th: 'ต้นทุนทั้งปี', en: 'Annual Cost' },
  'report.netProfit': { th: 'กำไรสุทธิ', en: 'Net Profit' },
  'report.profitMargin': { th: 'Profit Margin', en: 'Profit Margin' },
  'report.tabMonthly': { th: 'รายเดือน', en: 'Monthly' },
  'report.tabQuarterly': { th: 'รายไตรมาส', en: 'Quarterly' },
  'report.tabHighlights': { th: 'ไฮไลท์', en: 'Highlights' },
  'report.tabYoY': { th: 'เทียบปีต่อปี', en: 'Year-over-Year' },
  'report.exportCSV': { th: 'Export CSV', en: 'Export CSV' },
  'report.monthlySummary': { th: 'สรุปรายเดือน', en: 'Monthly Summary' },
  'report.revenue': { th: 'รายได้', en: 'Revenue' },
  'report.cost': { th: 'ต้นทุน', en: 'Cost' },
  'report.profit': { th: 'กำไร', en: 'Profit' },
  'report.margin': { th: 'Margin', en: 'Margin' },
  'report.customers': { th: 'ลูกค้า', en: 'Customers' },
  'report.revenueCostTrend': { th: 'รายได้ vs ต้นทุน', en: 'Revenue vs Cost' },
  'report.profitTrend': { th: 'แนวโน้มกำไร', en: 'Profit Trend' },
  'report.quarterlySummary': { th: 'สรุปรายไตรมาส', en: 'Quarterly Summary' },
  'report.okrProgress': { th: 'ความคืบหน้า OKR', en: 'OKR Progress' },
  'report.quarterlyChart': { th: 'กราฟรายไตรมาส', en: 'Quarterly Chart' },
  'report.keyInsights': { th: 'ข้อมูลสำคัญ', en: 'Key Insights' },
  'report.scorecard': { th: 'สุขภาพองค์กร', en: 'Organization Health Score' },
  'report.financialHealth': { th: 'สุขภาพการเงิน', en: 'Financial Health' },
  'report.growthHealth': { th: 'สุขภาพการเติบโต', en: 'Growth Health' },
  'report.operationalHealth': { th: 'สุขภาพดำเนินงาน', en: 'Operational Health' },
  'report.yoyComparison': { th: 'เทียบปีต่อปี', en: 'Year-over-Year Comparison' },
  'report.yoyNote': { th: 'เปรียบเทียบ FY 2026 vs FY 2025 (ข้อมูลปีก่อนเป็นค่าประมาณ)', en: 'Comparing FY 2026 vs FY 2025 (prior year data is estimated)' },
  'report.yoyChart': { th: 'กราฟเทียบปี', en: 'YoY Chart' },

  // ── API Analytics Page ──
  'page.apiAnalytics.title': { th: 'API Analytics', en: 'API Analytics' },
  'apiAnalytics.title': { th: 'API Analytics — ข้อมูลจาก Google Sheets', en: 'API Analytics — Live from Google Sheets' },
  'apiAnalytics.syncBtn': { th: 'ดึงข้อมูล', en: 'Sync Data' },
  'apiAnalytics.lastSync': { th: 'ซิงค์ล่าสุด', en: 'Last synced' },
  'apiAnalytics.notSynced': { th: 'ยังไม่ได้ซิงค์ — กดปุ่มด้านบนเพื่อดึงข้อมูล', en: 'Not synced yet — click Sync to fetch data' },
  'apiAnalytics.syncSuccess': { th: 'ดึงข้อมูลจาก Google Sheets สำเร็จ', en: 'Data synced from Google Sheets' },
  'apiAnalytics.syncError': { th: 'ดึงข้อมูลไม่สำเร็จ', en: 'Sync failed' },
  'apiAnalytics.noData': { th: 'ยังไม่มีข้อมูล', en: 'No Data Available' },
  'apiAnalytics.noDataHint': { th: 'กดปุ่ม "ดึงข้อมูล" เพื่อดาวน์โหลดข้อมูล API จาก Google Sheets', en: 'Click "Sync Data" to download API data from Google Sheets' },
  'apiAnalytics.noMonthData': { th: 'ไม่มีข้อมูลเดือนนี้', en: 'No data for this month' },
  'apiAnalytics.totalApiCalls': { th: 'API Calls ทั้งหมด', en: 'Total API Calls' },
  'apiAnalytics.allProducts': { th: 'ทุกผลิตภัณฑ์', en: 'All Products' },
  'apiAnalytics.mainProduct': { th: 'EasySlip API', en: 'EasySlip API' },
  'apiAnalytics.altProduct': { th: 'EasySlip Lite', en: 'EasySlip Lite' },
  'apiAnalytics.dailyAvg': { th: 'เฉลี่ย/วัน', en: 'Daily Avg' },
  'apiAnalytics.janGrowth': { th: 'การเติบโต ม.ค.', en: 'Jan Growth' },
  'apiAnalytics.monthTotal': { th: 'ยอดรวมเดือน', en: 'Month Total' },
  'apiAnalytics.maxMin': { th: 'สูงสุด/ต่ำสุด', en: 'Max/Min' },
  'apiAnalytics.growth': { th: 'การเติบโต', en: 'Growth' },
  'apiAnalytics.dailyTrend': { th: 'แนวโน้มรายวัน — Bank vs True Wallet', en: 'Daily Trend — Bank vs True Wallet' },
  'apiAnalytics.channelBreakdown': { th: 'สัดส่วน Bank / True Wallet', en: 'Bank / True Wallet Split' },
  'apiAnalytics.vipBreakdown': { th: 'สัดส่วน VIP / Private / Test', en: 'VIP / Private / Test Split' },
  'apiAnalytics.dailyData': { th: 'ข้อมูลรายวัน', en: 'Daily Data' },
  'apiAnalytics.cumulativeChart': { th: 'ยอดสะสม — เปรียบเทียบเดือนและผลิตภัณฑ์', en: 'Cumulative — Compare Months & Products' },
  'apiAnalytics.productsComparison': { th: 'เปรียบเทียบผลิตภัณฑ์', en: 'Products Comparison' },

  // ── Category Manager Modal ──
  'modal.manageCategories': { th: 'จัดการหมวดหมู่', en: 'Manage Categories' },
  'modal.addCategory': { th: 'เพิ่มหมวดหมู่', en: 'Add Category' },
  'modal.categoryNameTh': { th: 'ชื่อ (ไทย)', en: 'Name (Thai)' },
  'modal.categoryNameEn': { th: 'ชื่อ (English)', en: 'Name (English)' },
  'modal.typeDetailed': { th: 'มีรายการย่อย', en: 'Has Sub-Items' },
  'modal.typeSimple': { th: 'ไม่มีรายการย่อย', en: 'No Sub-Items' },
  'modal.subItemTypePct': { th: 'สัดส่วน (%)', en: 'Percentage (%)' },
  'modal.subItemTypeFixed': { th: 'จำนวนคงที่', en: 'Fixed Amount' },
  'modal.rename': { th: 'เปลี่ยนชื่อ', en: 'Rename' },
  'modal.delete': { th: 'ลบ', en: 'Delete' },
  'modal.subItems': { th: 'รายการย่อย', en: 'Sub-Items' },
  'modal.manageSubItems': { th: 'รายการย่อย', en: 'Sub-Items' },
  'modal.addSubItem': { th: 'เพิ่มรายการย่อย', en: 'Add Sub-Item' },
  'modal.back': { th: 'กลับ', en: 'Back' },
  'modal.add': { th: 'เพิ่ม', en: 'Add' },
  'modal.save': { th: 'บันทึก', en: 'Save' },
  'modal.cancel': { th: 'ยกเลิก', en: 'Cancel' },
  'modal.color': { th: 'สี', en: 'Color' },
  'modal.type': { th: 'ประเภท', en: 'Type' },
  'modal.confirmDeleteCategory': { th: 'ลบหมวดหมู่นี้? ข้อมูลทั้งหมดจะถูกลบ', en: 'Delete this category? All data will be removed.' },
  'modal.confirmDeleteSubItem': { th: 'ลบรายการย่อยนี้?', en: 'Delete this sub-item?' },
  'toast.categoryAdded': { th: 'เพิ่มหมวดหมู่แล้ว', en: 'Category added' },
  'toast.categoryRenamed': { th: 'เปลี่ยนชื่อหมวดหมู่แล้ว', en: 'Category renamed' },
  'toast.categoryDeleted': { th: 'ลบหมวดหมู่แล้ว', en: 'Category deleted' },
  'toast.subItemAdded': { th: 'เพิ่มรายการย่อยแล้ว', en: 'Sub-item added' },
  'toast.subItemRenamed': { th: 'เปลี่ยนชื่อรายการย่อยแล้ว', en: 'Sub-item renamed' },
  'toast.subItemDeleted': { th: 'ลบรายการย่อยแล้ว', en: 'Sub-item deleted' },
};

// ── Dynamic Label Registry ──

const dynamicDict = {};

export function registerDynamicLabel(key, { th, en }) {
  dynamicDict[key] = { th, en };
}

export function clearDynamicLabels() {
  for (const k in dynamicDict) delete dynamicDict[k];
}

// ── Core Functions ──

export function getLang() {
  return storage.get(LANG_KEY) || FALLBACK;
}

export function setLang(lang) {
  storage.set(LANG_KEY, lang);
}

export function toggleLang() {
  const next = getLang() === 'th' ? 'en' : 'th';
  setLang(next);
  // Update toggle button label
  const label = document.getElementById('lang-label');
  if (label) label.textContent = next.toUpperCase();
  // Re-render current page
  window.dispatchEvent(new HashChangeEvent('hashchange'));
}

/**
 * Translate a key to the current language
 * @param {string} key - dot-separated key
 * @returns {string}
 */
export function t(key) {
  // Check dynamic labels first (allows rename to override built-in)
  const dynEntry = dynamicDict[key];
  if (dynEntry) return dynEntry[getLang()] || dynEntry[FALLBACK] || key;

  const entry = dict[key];
  if (!entry) {
    console.warn(`[i18n] Missing key: ${key}`);
    return key;
  }
  return entry[getLang()] || entry[FALLBACK] || key;
}

/**
 * Get month names array for current language
 * @returns {string[]}
 */
export function getMonths() {
  return getLang() === 'en' ? [...MONTHS_EN] : [...MONTHS_TH];
}

/**
 * For data objects with field + fieldEn pairs
 * e.g. localized(item, 'description') returns item.descriptionEn or item.description
 * @param {Object} obj
 * @param {string} field
 * @returns {string}
 */
export function localized(obj, field) {
  if (getLang() === 'en') {
    const enField = field + 'En';
    if (obj[enField] != null) return obj[enField];
  }
  return obj[field] || '';
}

/**
 * Update the lang toggle button to reflect current language
 */
export function updateLangToggle() {
  const label = document.getElementById('lang-label');
  if (label) label.textContent = getLang().toUpperCase();
}
