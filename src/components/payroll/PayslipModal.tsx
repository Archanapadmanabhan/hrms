import React from 'react';
import { Modal } from '../common/Modal';
import { PayrollLineItem } from '../../types/hrms';
import { db } from '../../db/storage';
import { Printer, FileCheck, ShieldCheck } from 'lucide-react';

interface PayslipModalProps {
  item: PayrollLineItem | null;
  periodLabel?: string;
  isOpen: boolean;
  onClose: () => void;
}

export const PayslipModal: React.FC<PayslipModalProps> = ({
  item,
  periodLabel = 'September 2026',
  isOpen,
  onClose
}) => {
  if (!item) return null;

  const company = db.getCompanyProfile();
  const emp = db.getEmployeeById(item.employeeId);
  const effectivePeriod = item.periodLabel || periodLabel;

  const handlePrint = () => {
    window.print();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Official Salary Payslip & Calculation Statement"
      description={`Period: ${effectivePeriod} · Employee ID: ${item.employeeId}`}
      maxWidth="3xl"
    >
      <div className="space-y-5 text-xs" id="printable-payslip">
        {/* Company Header */}
        <div className="flex items-start justify-between border-b-2 border-slate-900 pb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 tracking-tight">{company.legalEntity}</h2>
            <p className="text-slate-500 text-[11px] mt-0.5">
              {company.address}, {company.city}, {company.state} - {company.zipCode}
            </p>
            <p className="text-slate-500 text-[11px]">
              PAN/TAN: {company.taxId} · PF Reg: {company.pfRegistrationNumber || 'Configured'} · ESI Reg: {company.esiRegistrationNumber || 'Configured'}
            </p>
          </div>
          <div className="text-right">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded">
              Payslip · {effectivePeriod}
            </span>
            <span className="block text-[10px] text-slate-400 mt-1 font-mono">
              Status: {item.status}
            </span>
          </div>
        </div>

        {/* Employee & Attendance Summary Details */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200">
          <div>
            <span className="text-slate-400 block text-[10px] uppercase">Employee Name</span>
            <span className="font-bold text-slate-900">{item.employeeName}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase">Employee ID</span>
            <span className="font-mono font-bold text-slate-800">{item.employeeId}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase">Department & Role</span>
            <span className="font-semibold text-slate-800">{item.departmentName} · {item.designationTitle}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase">Bank Account & PAN</span>
            <span className="font-mono text-slate-700">{item.bankAccountNumber} · {item.panNumber}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase">Payable / Working Days</span>
            <span className="font-mono font-semibold text-slate-800">
              {item.payableDays} / {item.workingDaysInMonth} days
            </span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase">Days Present</span>
            <span className="font-mono text-slate-700">
              {item.daysPresent} days ({item.payableDaysFormula || 'Deduplicated'})
            </span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase">Paid Leaves / LOP</span>
            <span className="font-mono font-semibold text-slate-800">
              Paid: {item.paidLeaves}d · <span className="text-rose-600">LOP: {item.unpaidLeaves}d</span>
            </span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase">PF UAN / ESI IP</span>
            <span className="font-mono text-slate-700">
              {emp?.pfUan || 'Opted/Configured'}
            </span>
          </div>
        </div>

        {/* Earnings & Deductions Tables */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Earnings */}
          <div className="border border-slate-200 rounded-xl overflow-hidden flex flex-col justify-between">
            <div>
              <div className="bg-slate-100 px-3.5 py-2 font-bold text-slate-800 border-b border-slate-200 flex justify-between">
                <span>1. Prorated Earnings</span>
                <span>Amount (₹)</span>
              </div>
              <div className="p-3.5 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-600">Basic Salary</span>
                  <span className="font-mono font-medium text-slate-900">₹{item.basicEarnings.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">House Rent Allowance (HRA)</span>
                  <span className="font-mono font-medium text-slate-900">₹{item.hraEarnings.toLocaleString()}</span>
                </div>
                {(item.conveyanceEarnings || 0) > 0 && (
                  <div className="flex justify-between">
                    <span className="text-slate-600">Conveyance Allowance</span>
                    <span className="font-mono font-medium text-slate-900">₹{item.conveyanceEarnings?.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-600">Special & Flexi Allowance</span>
                  <span className="font-mono font-medium text-slate-900">₹{item.specialAllowanceEarnings.toLocaleString()}</span>
                </div>
                {(item.clientSiteAllowance || 0) > 0 && (
                  <div className="flex justify-between text-indigo-700">
                    <span>Client Site Deployment Allowance</span>
                    <span className="font-mono font-semibold">+₹{(item.clientSiteAllowance || 0).toLocaleString()}</span>
                  </div>
                )}
                {(item.overtimeEarnings || 0) > 0 && (
                  <div className="flex justify-between text-emerald-700">
                    <span>Approved Overtime Pay ({item.approvedOvertimeHours || 0} hrs)</span>
                    <span className="font-mono font-semibold">+₹{(item.overtimeEarnings || 0).toLocaleString()}</span>
                  </div>
                )}
              </div>
            </div>
            <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex justify-between font-bold text-slate-900">
              <span>Total Gross Earnings (A)</span>
              <span className="font-mono">₹{item.grossEarnings.toLocaleString()}</span>
            </div>
          </div>

          {/* Deductions */}
          <div className="border border-slate-200 rounded-xl overflow-hidden flex flex-col justify-between">
            <div>
              <div className="bg-slate-100 px-3.5 py-2 font-bold text-slate-800 border-b border-slate-200 flex justify-between">
                <span>2. Statutory & Other Deductions</span>
                <span>Amount (₹)</span>
              </div>
              <div className="p-3.5 space-y-2">
                <div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Provident Fund (EPF Employee)</span>
                    <span className="font-mono font-medium text-slate-900">₹{item.pfEmployee.toLocaleString()}</span>
                  </div>
                  {item.pfApplicabilityNote && (
                    <span className="text-[10px] text-slate-400 block">{item.pfApplicabilityNote}</span>
                  )}
                </div>

                <div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Employee State Insurance (ESI)</span>
                    <span className="font-mono font-medium text-slate-900">₹{item.esiEmployee.toLocaleString()}</span>
                  </div>
                  {item.esiApplicabilityNote && (
                    <span className="text-[10px] text-slate-400 block">{item.esiApplicabilityNote}</span>
                  )}
                </div>

                <div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Professional Tax (PT)</span>
                    <span className="font-mono font-medium text-slate-900">₹{item.professionalTax.toLocaleString()}</span>
                  </div>
                  {item.ptApplicabilityNote && (
                    <span className="text-[10px] text-slate-400 block">{item.ptApplicabilityNote}</span>
                  )}
                </div>

                <div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Income Tax Withholding (TDS)</span>
                    <span className="font-mono font-medium text-slate-900">₹{item.tdsWithholding.toLocaleString()}</span>
                  </div>
                  {item.tdsApplicabilityNote && (
                    <span className="text-[10px] text-slate-400 block">{item.tdsApplicabilityNote}</span>
                  )}
                </div>

                {(item.advanceRecovery || 0) > 0 && (
                  <div className="flex justify-between text-amber-700">
                    <span>Salary Advance Recovery (Rem: ₹{(item.advanceRemainingBalance || 0).toLocaleString()})</span>
                    <span className="font-mono font-semibold">₹{item.advanceRecovery?.toLocaleString()}</span>
                  </div>
                )}

                {item.unpaidLeaveDeduction > 0 && (
                  <div className="flex justify-between text-rose-600">
                    <span>Loss of Pay (Prorated LOP Impact)</span>
                    <span className="font-mono font-medium">₹{item.unpaidLeaveDeduction.toLocaleString()}</span>
                  </div>
                )}
              </div>
            </div>
            <div className="p-3.5 bg-rose-50/50 border-t border-slate-200 flex justify-between font-bold text-rose-700">
              <span>Total Deductions (B)</span>
              <span className="font-mono">-₹{item.totalDeductions.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Reimbursements & Employer Contributions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-3.5 rounded-xl bg-emerald-50/60 border border-emerald-200 flex items-center justify-between">
            <div>
              <span className="font-bold text-emerald-950 block">3. Approved Expense Reimbursements (C)</span>
              <span className="text-[11px] text-emerald-700">Non-taxable verified expense claims settled with salary</span>
            </div>
            <span className="font-mono font-bold text-sm text-emerald-900">
              +₹{(item.reimbursementsPayable || 0).toLocaleString()}
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
            <div>
              <span className="font-bold text-slate-800 block">Employer Statutory Contributions</span>
              <span className="text-[11px] text-slate-500">
                Employer PF: ₹{item.pfEmployer.toLocaleString()} · Employer ESI: ₹{item.esiEmployer.toLocaleString()}
              </span>
            </div>
            <span className="font-mono font-bold text-sm text-slate-800">
              CTC: ₹{item.totalEmployerCost.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Net Pay Banner */}
        <div className="p-4 rounded-xl bg-indigo-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="text-[11px] uppercase tracking-wider text-indigo-300">
              Net Take-Home Salary (A - B + C)
            </span>
            <p className="text-2xl font-bold font-mono mt-0.5">₹{item.netPayable.toLocaleString()}</p>
            <p className="text-[11px] text-indigo-200 mt-0.5 font-mono">
              Formula: ₹{item.grossEarnings.toLocaleString()} (Gross) - ₹{item.totalDeductions.toLocaleString()} (Deductions) + ₹{(item.reimbursementsPayable || 0).toLocaleString()} (Reimbursements)
            </p>
          </div>
          <div className="text-left sm:text-right text-xs text-indigo-200">
            <span className="inline-flex items-center gap-1 font-semibold text-emerald-300">
              <FileCheck className="h-4 w-4" />
              Direct Deposit Verified
            </span>
            <p className="text-[10px] text-indigo-300 mt-1">System-generated Orbyx HRMS statement.</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
          >
            Close
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <Printer className="h-3.5 w-3.5" />
            <span>Print Payslip</span>
          </button>
        </div>
      </div>
    </Modal>
  );
};
