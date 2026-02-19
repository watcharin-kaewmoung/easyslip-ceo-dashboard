// ============================================
// EasySlip 2026 — Risk & Audit Data (Sheet 6)
// ============================================

export const RISK_ITEMS = Object.freeze([
  {
    id: 'R1',
    category: 'Revenue Concentration',
    severity: 'HIGH',
    description: 'API channel คิดเป็น ~93% ของรายได้ทั้งหมด — หากสูญเสียลูกค้า API รายใหญ่ จะกระทบรุนแรง',
    descriptionEn: 'API channel accounts for ~93% of total revenue — losing a major API client would cause severe impact',
    mitigation: 'เร่งกระจายรายได้ไป CRM/SMS ให้ API < 80% ภายใน Q4',
    mitigationEn: 'Accelerate revenue diversification to CRM/SMS, target API < 80% by Q4',
    status: 'monitoring',
    kpiLink: 'revenue_diversification',
  },
  {
    id: 'R2',
    category: 'System Cost Dependency',
    severity: 'HIGH',
    description: 'ค่าระบบ 24.27% ของรายได้ สูงกว่าเป้า 20% — หาก revenue ลด, margin จะติดลบเร็ว',
    descriptionEn: 'System cost at 24.27% of revenue, above 20% target — if revenue drops, margin turns negative quickly',
    mitigation: 'เจรจาลดค่า system cost ให้เหลือ <22% ภายใน H2',
    mitigationEn: 'Negotiate system cost reduction to <22% by H2',
    status: 'action_required',
    kpiLink: 'cost_revenue_ratio',
  },
  {
    id: 'R3',
    category: 'Tax Cash Flow',
    severity: 'HIGH',
    description: 'ภาษี 4 เดือนหนัก (พ.ค./ส.ค./ก.ย./ธ.ค.) รวม ฿2.04M — อาจกระทบสภาพคล่อง',
    descriptionEn: '4 heavy tax months (May/Aug/Sep/Dec) totaling ฿2.04M — may impact liquidity',
    mitigation: 'ตั้งสำรองภาษีรายเดือน ฿170K + เตรียม credit line สำรอง',
    mitigationEn: 'Set monthly tax reserve ฿170K + prepare backup credit line',
    status: 'planned',
    kpiLink: 'cash_reserve',
  },
  {
    id: 'R4',
    category: 'New Channel Risk',
    severity: 'MEDIUM',
    description: 'CRM และ SMS เป็นช่องทางใหม่ — อาจไม่ถึงเป้า growth หากตลาดไม่ตอบรับ',
    descriptionEn: 'CRM and SMS are new channels — may miss growth targets if market reception is weak',
    mitigation: 'ตั้ง milestone check ทุกไตรมาส ถ้าต่ำกว่าเป้า 20% ให้ pivot แผน',
    mitigationEn: 'Set quarterly milestone checks; if below target by 20%, pivot the plan',
    status: 'monitoring',
    kpiLink: null,
  },
  {
    id: 'R5',
    category: 'Single Point of Failure',
    severity: 'MEDIUM',
    description: 'ทีมมีแค่ 3 คน — หาก key person ลาออก จะกระทบการทำงานอย่างมาก',
    descriptionEn: 'Team of only 3 — if a key person leaves, operations would be severely impacted',
    mitigation: 'จัดทำ documentation + cross-training ให้แต่ละคนทำงานแทนกันได้',
    mitigationEn: 'Create documentation + cross-training so each person can cover for others',
    status: 'planned',
    kpiLink: null,
  },
  {
    id: 'R6',
    category: 'Regulatory',
    severity: 'LOW',
    description: 'กฎหมาย PDPA / FinTech regulation อาจมีข้อกำหนดใหม่ที่กระทบ slip verification',
    descriptionEn: 'PDPA / FinTech regulations may introduce new requirements affecting slip verification',
    mitigation: 'ติดตาม BOT/PDPC announcements รายเดือน + ปรึกษาที่ปรึกษากฎหมาย Q2',
    mitigationEn: 'Monitor BOT/PDPC announcements monthly + consult legal advisor in Q2',
    status: 'monitoring',
    kpiLink: null,
  },
]);

// Audit checklist
export const AUDIT_CHECKLIST = Object.freeze([
  { id: 'A1', item: 'ตรวจสอบรายรับ-รายจ่ายรายเดือน', itemEn: 'Monthly income & expense review', frequency: 'Monthly', status: 'active' },
  { id: 'A2', item: 'Reconcile bank statement vs บัญชี', itemEn: 'Reconcile bank statement vs books', frequency: 'Monthly', status: 'active' },
  { id: 'A3', item: 'ตรวจสอบ VAT filing', itemEn: 'Verify VAT filing', frequency: 'Monthly', status: 'active' },
  { id: 'A4', item: 'Review system cost invoice vs contract', itemEn: 'Review system cost invoice vs contract', frequency: 'Monthly', status: 'active' },
  { id: 'A5', item: 'ตรวจสอบ Withholding Tax (PND.3/53)', itemEn: 'Verify Withholding Tax (PND.3/53)', frequency: 'Monthly', status: 'active' },
  { id: 'A6', item: 'Budget vs Actual variance review', itemEn: 'Budget vs Actual variance review', frequency: 'Quarterly', status: 'active' },
  { id: 'A7', item: 'Cash flow forecast update', itemEn: 'Cash flow forecast update', frequency: 'Quarterly', status: 'active' },
  { id: 'A8', item: 'KPI scorecard review with team', itemEn: 'KPI scorecard review with team', frequency: 'Quarterly', status: 'active' },
  { id: 'A9', item: 'Annual financial statement audit', itemEn: 'Annual financial statement audit', frequency: 'Annual', status: 'planned' },
  { id: 'A10', item: 'Tax planning review with accountant', itemEn: 'Tax planning review with accountant', frequency: 'Semi-annual', status: 'active' },
]);

// Risk score helper
export function getRiskScore() {
  let score = 0;
  const weights = { HIGH: 3, MEDIUM: 2, LOW: 1 };
  const statusMod = { action_required: 1.5, monitoring: 1.0, planned: 0.7, resolved: 0.3 };
  RISK_ITEMS.forEach(r => {
    score += weights[r.severity] * (statusMod[r.status] || 1);
  });
  const maxScore = RISK_ITEMS.length * 3 * 1.5;
  return Math.round((1 - score / maxScore) * 100); // Higher = better (less risk)
}
