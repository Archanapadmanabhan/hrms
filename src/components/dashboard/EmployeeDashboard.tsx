import React, { useState, useEffect } from 'react';
import {
  Clock,
  CreditCard,
  Laptop,
  CheckCircle2,
  ArrowRight,
  Plus
} from 'lucide-react';
import { useAuth } from '../../services/authContext';
import { db, subscribeToDB } from '../../db/storage';
import { hrmsService } from '../../services/hrmsService';
import { NavTab } from '../layout/Sidebar';
import { NavigationContext } from '../../types/hrms';

interface EmployeeDashboardProps {
  onNavigate: (tab: NavTab, context?: NavigationContext) => void;
  onOpenApplyLeave?: () => void;
  onOpenSubmitExpense?: () => void;
}

export const EmployeeDashboard: React.FC<EmployeeDashboardProps> = ({
  onNavigate,
  onOpenApplyLeave,
  onOpenSubmitExpense
}) => {
  const { currentUser, currentEmployee } = useAuth();
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [, setTick] = useState(0);

  useEffect(() => {
    return subscribeToDB(() => setTick((t) => t + 1));
  }, []);

  const empId = currentUser.employeeId;
  const leaveTypes = db.getLeaveTypes().filter((l) => l.isPaid && l.isActive !== false);

  // Leave balances
  const balances = leaveTypes.map((lt) => ({
    type: lt,
    balance: hrmsService.getLeaveBalance(empId, lt.id)
  }));

  // Today's attendance
  const todayStr = new Date().toISOString().split('T')[0];
  const todayRecord = db.getAttendanceRecords().find(
    (r) => r.employeeId === empId && r.date === todayStr
  );

  // Latest payslip
  const latestPayslips = db.getPayrollLineItems().filter((item) => item.employeeId === empId);
  const latestPayslip = latestPayslips[latestPayslips.length - 1];

  // My assigned assets
  const myAssets = db.getAssets().filter((a) => a.currentEmployeeId === empId);

  const handleAcknowledgeAsset = (assetId: string) => {
    hrmsService.acknowledgeAssetReceipt(assetId, currentUser.id, currentUser.name);
    setActionNotice('Asset receipt successfully acknowledged.');
    setTimeout(() => setActionNotice(null), 3000);
  };

  return (
    <div className="space-y-6">
      {actionNotice && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs font-medium flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4" />
          <span>{actionNotice}</span>
        </div>
      )}

      {/* Top Banner: Welcome & Quick Punch Status */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <img
            src={currentUser.avatarUrl}
            alt={currentUser.name}
            className="h-14 w-14 rounded-full object-cover ring-2 ring-indigo-100"
          />
          <div>
            <h2 className="text-lg font-bold text-slate-900">Welcome, {currentUser.name}!</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {currentUser.designationTitle} · {currentEmployee?.employmentType || 'Permanent'} · ID: {empId}
            </p>
            <div className="mt-2 flex items-center gap-2 text-xs text-slate-600">
              <span className="inline-flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                Status: {currentEmployee?.status || 'Active'}
              </span>
              <span>·</span>
              <span>Joined: {currentEmployee?.dateOfJoining || '2023'}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {onOpenApplyLeave && (
            <button
              onClick={onOpenApplyLeave}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-2xs transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Apply for Leave</span>
            </button>
          )}
          {onOpenSubmitExpense && (
            <button
              onClick={onOpenSubmitExpense}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs font-semibold rounded-lg transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Submit Expense</span>
            </button>
          )}
        </div>
      </div>

      {/* Leave Balances Grid */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            My Paid Leave Balances
          </h3>
          <button
            onClick={() => onNavigate('leave', { subTab: 'applications' })}
            className="text-xs font-medium text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
          >
            <span>Leave History & Apply</span>
            <ArrowRight className="h-3 w-3" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {balances.map(({ type, balance }) => {
            const pct = Math.min(100, Math.round((balance.remaining / (balance.totalEntitled || 1)) * 100));
            return (
              <div
                key={type.id}
                role="button"
                tabIndex={0}
                onClick={() => onNavigate('leave', { subTab: 'applications' })}
                onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onNavigate('leave', { subTab: 'applications' })}
                className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs hover:border-indigo-400 hover:shadow-sm transition-all cursor-pointer"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-800">{type.name}</span>
                  <span className="font-mono text-xs text-slate-500">{type.code}</span>
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-slate-900">{balance.remaining}</span>
                  <span className="text-xs text-slate-500">/ {balance.totalEntitled} days remaining</span>
                </div>
                {/* Progress bar */}
                <div className="mt-3 w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                  <div className="bg-indigo-600 h-full rounded-full" style={{ width: `${pct}%` }} />
                </div>
                <div className="mt-2 text-[11px] text-slate-400 flex justify-between">
                  <span>{balance.taken} used</span>
                  <span>{balance.pending} pending</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Today's Shift & Payslip row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today's Shift & Punch */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <span className="text-xs font-semibold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Clock className="h-4 w-4 text-indigo-600" />
                Shift & Attendance
              </span>
              <span className="text-xs text-slate-500">{todayStr}</span>
            </div>
            <div className="mt-4 space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">Scheduled Shift:</span>
                <span className="font-medium text-slate-800">General Day Shift (09:30 - 18:30)</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">Today Check-In:</span>
                <span className="font-medium text-slate-800 font-mono">
                  {todayRecord?.checkInTime || 'Not Punched Yet'}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">Today Check-Out:</span>
                <span className="font-medium text-slate-800 font-mono">
                  {todayRecord?.checkOutTime || 'Active In-Office'}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Working Duration:</span>
                <span className="font-semibold text-slate-900 font-mono">
                  {todayRecord?.totalHoursWorked ? `${todayRecord.totalHoursWorked} hrs` : '--'}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={() => onNavigate('attendance', { subTab: 'logs', dateFilter: todayStr })}
            className="mt-4 w-full py-2 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors text-center"
          >
            Open Attendance Log & Check-In/Out
          </button>
        </div>

        {/* Latest Payslip */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <span className="text-xs font-semibold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-emerald-600" />
                Latest Payslip
              </span>
              <span className="text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                {latestPayslip?.status || 'Finalized'}
              </span>
            </div>
            {latestPayslip ? (
              <div className="mt-4">
                <p className="text-xs text-slate-500">Disbursed for {latestPayslip.periodLabel || 'September 2026'}</p>
                <div className="mt-2 text-2xl font-bold text-slate-900 font-mono">
                  ₹{latestPayslip.netPayable.toLocaleString()}
                </div>
                <div className="mt-3 space-y-1.5 text-xs text-slate-600">
                  <div className="flex justify-between">
                    <span>Gross Earnings:</span>
                    <span className="font-semibold text-slate-800">₹{latestPayslip.grossEarnings.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Deductions (PF/PT/Tax):</span>
                    <span className="text-rose-600">-₹{latestPayslip.totalDeductions.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Bank Account:</span>
                    <span className="font-mono text-slate-700">••••{latestPayslip.bankAccountNumber.slice(-4)}</span>
                  </div>
                </div>
              </div>
            ) : (
              <p className="py-6 text-center text-xs text-slate-400">No payslips generated yet</p>
            )}
          </div>
          <button
            onClick={() => onNavigate('payroll', { subTab: 'payslips' })}
            className="mt-4 w-full py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors text-center"
          >
            View Payslip Breakdown
          </button>
        </div>

        {/* Assigned Assets & Acknowledgement */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <span className="text-xs font-semibold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Laptop className="h-4 w-4 text-indigo-600" />
                Assigned Assets
              </span>
              <span className="text-xs text-slate-500">{myAssets.length} items</span>
            </div>
            <div className="mt-3 space-y-2">
              {myAssets.length === 0 ? (
                <p className="py-6 text-center text-xs text-slate-400">No hardware currently allocated.</p>
              ) : (
                myAssets.map((asset) => (
                  <div key={asset.id} className="p-2.5 rounded-lg border border-slate-200 bg-slate-50 text-xs">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold text-slate-900">{asset.name}</p>
                        <p className="text-[11px] text-slate-500">{asset.assetTag} · SN: {asset.serialNumber}</p>
                      </div>
                      {!asset.acknowledgedByEmployee ? (
                        <button
                          onClick={() => handleAcknowledgeAsset(asset.id)}
                          className="px-2 py-1 text-[11px] font-semibold bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors"
                        >
                          Acknowledge
                        </button>
                      ) : (
                        <span className="text-[10px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          Acknowledged
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
          <button
            onClick={() => onNavigate('assets', { subTab: 'myAssets' })}
            className="mt-4 text-center text-xs font-medium text-indigo-600 hover:text-indigo-800"
          >
            View All Equipment &rarr;
          </button>
        </div>
      </div>
    </div>
  );
};
