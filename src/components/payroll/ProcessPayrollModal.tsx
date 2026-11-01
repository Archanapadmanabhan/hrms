import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { db } from '../../db/storage';
import { hrmsService } from '../../services/hrmsService';
import { useAuth } from '../../services/authContext';
import { PayrollRun, PayrollLineItem } from '../../types/hrms';
import {
  Calculator,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  Lock,
  Eye,
  ShieldCheck,
  FileSpreadsheet
} from 'lucide-react';

interface ProcessPayrollModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFinalized: () => void;
}

export const ProcessPayrollModal: React.FC<ProcessPayrollModalProps> = ({
  isOpen,
  onClose,
  onFinalized
}) => {
  const { currentUser } = useAuth();
  const [month, setMonth] = useState(10); // October
  const [year, setYear] = useState(2026);
  const [preview, setPreview] = useState<{ run: PayrollRun; items: PayrollLineItem[] } | null>(null);
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5 | 6>(1);
  const [inspectingItem, setInspectingItem] = useState<PayrollLineItem | null>(null);
  const [isFinalizing, setIsFinalizing] = useState(false);

  const company = db.getCompanyProfile();
  const statutory = company.statutoryConfig;

  useEffect(() => {
    if (isOpen) {
      const p = hrmsService.generatePayrollPreview(month, year, currentUser.id, currentUser.name);
      setPreview(p);
      setStep(1);
      setInspectingItem(null);
    }
  }, [isOpen, month, year]);

  const handleRecalculate = () => {
    const p = hrmsService.generatePayrollPreview(month, year, currentUser.id, currentUser.name);
    setPreview(p);
  };

  const handleFinalize = () => {
    if (!preview) return;
    setIsFinalizing(true);
    hrmsService.finalizePayrollRun(preview.run, preview.items, currentUser.id, currentUser.name);
    setIsFinalizing(false);
    setStep(6);
    onFinalized();
  };

  if (!preview) return null;

  const steps = [
    { num: 1, label: '1. Period & Rules' },
    { num: 2, label: '2. Gather Inputs' },
    { num: 3, label: '3. Calculate & Inspect' },
    { num: 4, label: '4. Review & Lock' },
    { num: 5, label: '5. Approve & Finalize' },
    { num: 6, label: '6. Payslips & Summary' }
  ];

  const itemsWithWarnings = preview.items.filter((i) => (i.complianceWarnings?.length || 0) > 0);
  const itemsWithAdvances = preview.items.filter((i) => (i.advanceRecovery || 0) > 0);
  const itemsWithReimbursements = preview.items.filter((i) => (i.reimbursementsPayable || 0) > 0);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="6-Step Enterprise Payroll Processing Engine"
      description={`Period: ${preview.run.periodLabel} · Transparent employee-level calculation & configurable statutory rules`}
      maxWidth="3xl"
    >
      <div className="space-y-4 text-xs">
        {/* 6-Step Progress Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-200">
          <div className="flex flex-wrap items-center gap-1.5">
            {steps.map((s) => (
              <button
                key={s.num}
                type="button"
                onClick={() => {
                  if (step < 6) setStep(s.num as any);
                }}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors ${
                  step === s.num
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : step > s.num
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-slate-100 text-slate-500'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>

          {step === 1 && (
            <div className="flex items-center gap-1.5">
              <select
                value={month}
                onChange={(e) => setMonth(Number(e.target.value))}
                className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded text-xs text-slate-700 font-semibold"
              >
                <option value={9}>September</option>
                <option value={10}>October</option>
                <option value={11}>November</option>
                <option value={12}>December</option>
              </select>
              <select
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="px-2 py-1 bg-slate-50 border border-slate-200 rounded text-xs text-slate-700 font-mono"
              >
                <option value={2026}>2026</option>
                <option value={2027}>2027</option>
              </select>
            </div>
          )}
        </div>

        {/* STEP 1: Select Payroll Period & Statutory Rule Snapshot */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-slate-900 text-sm">Step 1: Payroll Period & Active Statutory Rules</h4>
                <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded font-mono text-[11px]">
                  {preview.run.startDate} to {preview.run.endDate} ({preview.items[0]?.workingDaysInMonth || 30} Days)
                </span>
              </div>
              <p className="text-slate-600">
                Payroll will process <span className="font-bold text-slate-900">{preview.run.totalEmployees} eligible employees</span> using the organization’s configurable statutory settings and per-employee eligibility flags.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800">EPF (Provident Fund)</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${statutory?.epfApplicable !== false ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                    {statutory?.epfApplicable !== false ? 'Enabled in Org' : 'Not Applicable'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Employee: {statutory?.epfEmployeeRatePercent ?? 12}% · Employer: {statutory?.epfEmployerRatePercent ?? 12}% · Ceiling: ₹{(statutory?.epfWageCeilingMonthly ?? 15000).toLocaleString()}
                </p>
              </div>

              <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800">ESI (State Insurance)</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${statutory?.esiApplicable !== false ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                    {statutory?.esiApplicable !== false ? 'Enabled in Org' : 'Not Applicable'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Employee: {statutory?.esiEmployeeRatePercent ?? 0.75}% · Employer: {statutory?.esiEmployerRatePercent ?? 3.25}% (Gross ≤ ₹{(statutory?.esiGrossThresholdMonthly ?? 21000).toLocaleString()})
                </p>
              </div>

              <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800">Professional Tax (PT)</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${statutory?.ptApplicable !== false ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                    {statutory?.ptApplicable !== false ? 'Enabled in Org' : 'Not Applicable'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Monthly Slab: ₹{statutory?.ptMonthlySlabAmount ?? 200} if Gross ≥ ₹{(statutory?.ptMinGrossThreshold ?? 15000).toLocaleString()}
                </p>
              </div>

              <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800">TDS / Income Tax</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${statutory?.tdsApplicable !== false ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                    {statutory?.tdsApplicable !== false ? 'Enabled in Org' : 'Not Applicable'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Regime: {statutory?.tdsDefaultRegime || 'New Regime (FY 2026-27)'}
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold"
              >
                <span>Next: Gather Attendance & Inputs</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: Gather Inputs (Attendance, Leaves, Overtime, Client Allowances, Expenses, Advances) */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-slate-400 block text-[10px] uppercase">Deduplicated Attendance</span>
                <span className="text-base font-bold text-slate-900">{preview.run.totalEmployees} Staff Synced</span>
                <span className="text-[10px] text-emerald-700 block">Office + Client Site merged</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-slate-400 block text-[10px] uppercase">Client Allowances</span>
                <span className="text-base font-bold text-indigo-700 font-mono">
                  ₹{preview.items.reduce((s, i) => s + (i.clientSiteAllowance || 0), 0).toLocaleString()}
                </span>
                <span className="text-[10px] text-slate-500 block">Active deployments prorated</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-slate-400 block text-[10px] uppercase">Approved Reimbursements</span>
                <span className="text-base font-bold text-emerald-700 font-mono">
                  ₹{preview.items.reduce((s, i) => s + (i.reimbursementsPayable || 0), 0).toLocaleString()}
                </span>
                <span className="text-[10px] text-slate-500 block">{itemsWithReimbursements.length} employee(s)</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-slate-400 block text-[10px] uppercase">Advance Recoveries</span>
                <span className="text-base font-bold text-rose-700 font-mono">
                  -₹{preview.items.reduce((s, i) => s + (i.advanceRecovery || 0), 0).toLocaleString()}
                </span>
                <span className="text-[10px] text-slate-500 block">{itemsWithAdvances.length} active recovery</span>
              </div>
            </div>

            <div className="p-3 bg-indigo-50/60 border border-indigo-200 rounded-xl text-indigo-950 space-y-1">
              <p className="font-bold">Cross-Module Input Verification</p>
              <ul className="list-disc pl-4 text-[11px] text-indigo-900 space-y-0.5">
                <li><strong>Attendance & Client Punches:</strong> Office and Client-site punches are deduplicated by date so no employee is double-counted.</li>
                <li><strong>Leave & LOP:</strong> Approved paid leaves are counted as payable days; unpaid leaves reduce payable days and prorate earnings.</li>
                <li><strong>Overtime & Allowances:</strong> Approved overtime hours (1.5x hourly base) and active client deployment allowances are included in Gross Earnings.</li>
              </ul>
            </div>

            <div className="flex justify-between pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-700 font-medium"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Back
              </button>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleRecalculate}
                  className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg text-slate-700 font-medium"
                >
                  Refresh Inputs
                </button>
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold"
                >
                  <span>Calculate & Inspect Employee Breakdown</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: Calculate Payroll & Employee-Level Breakdown */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-slate-400 block text-[10px] uppercase">Employees Processed</span>
                <span className="text-lg font-bold text-slate-900">{preview.run.totalEmployees}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-slate-400 block text-[10px] uppercase">Gross Earnings</span>
                <span className="text-lg font-bold text-slate-900 font-mono">₹{preview.run.totalGrossPay.toLocaleString()}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-slate-400 block text-[10px] uppercase">Total Deductions</span>
                <span className="text-lg font-bold text-rose-600 font-mono">-₹{preview.run.totalDeductions.toLocaleString()}</span>
              </div>
              <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                <span className="text-emerald-700 block text-[10px] uppercase font-semibold">Net Payable</span>
                <span className="text-lg font-bold text-emerald-900 font-mono">₹{preview.run.totalNetPay.toLocaleString()}</span>
              </div>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden max-h-64 overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200 sticky top-0">
                  <tr>
                    <th className="px-3 py-2">Employee</th>
                    <th className="px-3 py-2">Payable Days</th>
                    <th className="px-3 py-2 text-right">Gross</th>
                    <th className="px-3 py-2 text-right">Deductions</th>
                    <th className="px-3 py-2 text-right">Reimb.</th>
                    <th className="px-3 py-2 text-right">Net Payable</th>
                    <th className="px-3 py-2 text-center">Breakdown</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {preview.items.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <td className="px-3 py-2 font-medium text-slate-900">
                        {item.employeeName}
                        <span className="block text-[10px] text-slate-400 font-mono">
                          {item.employeeId} · {item.departmentName}
                        </span>
                      </td>
                      <td className="px-3 py-2 font-mono text-slate-700">
                        {item.payableDays} / {item.workingDaysInMonth}
                        {item.unpaidLeaves > 0 && (
                          <span className="block text-[10px] text-rose-600 font-semibold">({item.unpaidLeaves}d LOP)</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-slate-800">₹{item.grossEarnings.toLocaleString()}</td>
                      <td className="px-3 py-2 text-right font-mono text-rose-600">-₹{item.totalDeductions.toLocaleString()}</td>
                      <td className="px-3 py-2 text-right font-mono text-emerald-700">
                        +₹{(item.reimbursementsPayable || 0).toLocaleString()}
                      </td>
                      <td className="px-3 py-2 text-right font-mono font-bold text-slate-900">₹{item.netPayable.toLocaleString()}</td>
                      <td className="px-3 py-2 text-center">
                        <button
                          type="button"
                          onClick={() => setInspectingItem(item)}
                          className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-md"
                        >
                          <Eye className="h-3 w-3" /> Inspect
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Inline Employee-Level Calculation Breakdown Panel */}
            {inspectingItem && (
              <div className="p-4 bg-slate-900 text-white rounded-xl space-y-3 border border-slate-700">
                <div className="flex items-center justify-between border-b border-slate-700 pb-2">
                  <div>
                    <h5 className="font-bold text-sm text-white">
                      Employee Calculation Breakdown — {inspectingItem.employeeName} ({inspectingItem.employeeId})
                    </h5>
                    <p className="text-[11px] text-slate-400">
                      Payable Days = {inspectingItem.payableDays}/{inspectingItem.workingDaysInMonth} (Days Present: {inspectingItem.daysPresent}d, Paid Leave: {inspectingItem.paidLeaves}d, LOP: {inspectingItem.unpaidLeaves}d · {inspectingItem.payableDaysFormula || 'Prorated'})
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setInspectingItem(null)}
                    className="px-2 py-1 text-xs bg-slate-800 hover:bg-slate-700 rounded text-slate-300"
                  >
                    Close Breakdown ✕
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-[11px]">
                  <div className="p-3 bg-slate-800/90 rounded-lg space-y-1">
                    <span className="text-indigo-300 font-bold uppercase text-[10px] block">1. Prorated Earnings</span>
                    <div className="flex justify-between"><span>Basic:</span><span className="font-mono">₹{inspectingItem.basicEarnings.toLocaleString()}</span></div>
                    <div className="flex justify-between"><span>HRA:</span><span className="font-mono">₹{inspectingItem.hraEarnings.toLocaleString()}</span></div>
                    <div className="flex justify-between"><span>Conveyance:</span><span className="font-mono">₹{(inspectingItem.conveyanceEarnings || 0).toLocaleString()}</span></div>
                    <div className="flex justify-between"><span>Special Allowance:</span><span className="font-mono">₹{inspectingItem.specialAllowanceEarnings.toLocaleString()}</span></div>
                    {(inspectingItem.clientSiteAllowance || 0) > 0 && (
                      <div className="flex justify-between text-emerald-300"><span>Client Allowance:</span><span className="font-mono">+₹{(inspectingItem.clientSiteAllowance || 0).toLocaleString()}</span></div>
                    )}
                    {(inspectingItem.overtimeEarnings || 0) > 0 && (
                      <div className="flex justify-between text-emerald-300"><span>Overtime ({inspectingItem.approvedOvertimeHours || 0}h):</span><span className="font-mono">+₹{(inspectingItem.overtimeEarnings || 0).toLocaleString()}</span></div>
                    )}
                    <div className="pt-1 border-t border-slate-700 flex justify-between font-bold text-white">
                      <span>Gross Earnings:</span>
                      <span className="font-mono">₹{inspectingItem.grossEarnings.toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-800/90 rounded-lg space-y-1">
                    <span className="text-rose-300 font-bold uppercase text-[10px] block">2. Statutory & Other Deductions</span>
                    <div className="flex justify-between">
                      <span>EPF Employee:</span>
                      <span className="font-mono">₹{inspectingItem.pfEmployee.toLocaleString()}</span>
                    </div>
                    <p className="text-[10px] text-slate-400">{inspectingItem.pfApplicabilityNote}</p>
                    <div className="flex justify-between">
                      <span>ESI Employee:</span>
                      <span className="font-mono">₹{inspectingItem.esiEmployee.toLocaleString()}</span>
                    </div>
                    <p className="text-[10px] text-slate-400">{inspectingItem.esiApplicabilityNote}</p>
                    <div className="flex justify-between">
                      <span>Prof. Tax (PT):</span>
                      <span className="font-mono">₹{inspectingItem.professionalTax.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>TDS / Tax:</span>
                      <span className="font-mono">₹{inspectingItem.tdsWithholding.toLocaleString()}</span>
                    </div>
                    {(inspectingItem.advanceRecovery || 0) > 0 && (
                      <div className="flex justify-between text-amber-300">
                        <span>Advance Recovery:</span>
                        <span className="font-mono">₹{inspectingItem.advanceRecovery?.toLocaleString()}</span>
                      </div>
                    )}
                    <div className="pt-1 border-t border-slate-700 flex justify-between font-bold text-rose-300">
                      <span>Total Deductions:</span>
                      <span className="font-mono">-₹{inspectingItem.totalDeductions.toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-800/90 rounded-lg space-y-1.5">
                    <span className="text-emerald-300 font-bold uppercase text-[10px] block">3. Net Formula & Employer Cost</span>
                    <div className="flex justify-between"><span>Gross Earnings:</span><span className="font-mono">₹{inspectingItem.grossEarnings.toLocaleString()}</span></div>
                    <div className="flex justify-between text-rose-300"><span>Less Deductions:</span><span className="font-mono">-₹{inspectingItem.totalDeductions.toLocaleString()}</span></div>
                    <div className="flex justify-between text-emerald-300"><span>Add Reimbursements:</span><span className="font-mono">+₹{(inspectingItem.reimbursementsPayable || 0).toLocaleString()}</span></div>
                    <div className="pt-1 border-t border-slate-700 flex justify-between font-bold text-sm text-emerald-400">
                      <span>Net Payable:</span>
                      <span className="font-mono">₹{inspectingItem.netPayable.toLocaleString()}</span>
                    </div>
                    <div className="pt-2 border-t border-slate-700 text-[10px] text-slate-400 space-y-0.5">
                      <div className="flex justify-between"><span>Employer PF + ESI:</span><span className="font-mono">₹{(inspectingItem.pfEmployer + inspectingItem.esiEmployer).toLocaleString()}</span></div>
                      <div className="flex justify-between text-slate-200 font-semibold"><span>Total CTC Cost:</span><span className="font-mono">₹{inspectingItem.totalEmployerCost.toLocaleString()}</span></div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-between items-center pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-700 font-medium"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Back
              </button>
              <button
                type="button"
                onClick={() => setStep(4)}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold"
              >
                <span>Next: Review Exceptions & Lock</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: Review Exceptions & Lock */}
        {step === 4 && (
          <div className="space-y-4">
            <div className="p-3.5 bg-amber-50/80 border border-amber-200 rounded-xl space-y-2 text-amber-950">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                <span className="font-bold">Step 4: Pre-Lock Compliance & Exception Check</span>
              </div>
              {itemsWithWarnings.length === 0 ? (
                <p className="text-[11px] text-emerald-800 font-medium">
                  ✓ Zero blocking errors or compliance warnings found across all {preview.run.totalEmployees} employee records.
                </p>
              ) : (
                <div className="space-y-1.5">
                  <p className="text-[11px] text-amber-800">
                    The following {itemsWithWarnings.length} record(s) have non-blocking advisory warnings (payroll can still be locked):
                  </p>
                  <ul className="list-disc pl-4 text-[11px] text-amber-900 space-y-1">
                    {itemsWithWarnings.map((item) => (
                      <li key={item.id}>
                        <strong>{item.employeeName} ({item.employeeId}):</strong> {item.complianceWarnings?.join(' · ')}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setStep(3)}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-700 font-medium"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Back to Calculation
              </button>
              <button
                type="button"
                onClick={() => setStep(5)}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold"
              >
                <span>Lock Calculation & Proceed to Approval</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 5: Approve & Finalize */}
        {step === 5 && (
          <div className="space-y-4">
            <div className="p-4 bg-slate-900 text-white rounded-xl space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="text-xs uppercase tracking-wider text-slate-400">Step 5: Final Authorization Ledger</span>
                <span className="text-xs font-mono font-bold text-indigo-400">{preview.run.periodLabel}</span>
              </div>
              <div className="grid grid-cols-3 gap-4 text-xs">
                <div>
                  <span className="text-slate-400 block text-[11px]">Total Net Bank Outflow</span>
                  <p className="text-xl font-bold font-mono mt-0.5 text-white">₹{preview.run.totalNetPay.toLocaleString()}</p>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Employer PF & ESI</span>
                  <p className="text-xl font-bold font-mono mt-0.5 text-indigo-300">
                    ₹{preview.items.reduce((acc, i) => acc + i.pfEmployer + i.esiEmployer, 0).toLocaleString()}
                  </p>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Total Company CTC Cost</span>
                  <p className="text-xl font-bold font-mono mt-0.5 text-emerald-400">
                    ₹{preview.items.reduce((acc, i) => acc + i.totalEmployerCost, 0).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 space-y-2">
              <p className="font-semibold text-slate-900">Locking Invariants & Security Enforcement</p>
              <ul className="list-disc pl-4 space-y-1 text-[11px] text-slate-600">
                <li>Finalizing locks this payroll run and generates itemized payslips for all {preview.run.totalEmployees} employees.</li>
                <li>Approved expense reimbursements and salary advance deductions are automatically settled against this run.</li>
                <li>Any subsequent modification requires an explicit audited "Reopen Payroll Run" action by HR Admin.</li>
              </ul>
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setStep(4)}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded text-slate-700 font-medium"
              >
                &larr; Back
              </button>
              <button
                type="button"
                onClick={handleFinalize}
                disabled={isFinalizing}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold shadow-2xs"
              >
                <Lock className="h-4 w-4" />
                <span>Approve, Finalize & Generate Payslips ({preview.run.periodLabel})</span>
              </button>
            </div>
          </div>
        )}

        {/* STEP 6: Generate Payslips & Summary */}
        {step === 6 && (
          <div className="space-y-4 text-center py-4">
            <div className="mx-auto h-12 w-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div>
              <h4 className="text-base font-bold text-slate-900">
                Payroll Finalized & Payslips Published ({preview.run.periodLabel})
              </h4>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                All {preview.run.totalEmployees} employee payslips have been generated with full earnings, statutory applicability notes, and net pay formulas.
              </p>
            </div>
            <div className="flex justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg"
              >
                Done & View Payroll Register
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
