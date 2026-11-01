import React, { useState, useEffect } from 'react';
import {
  Users,
  CalendarCheck,
  Receipt,
  Check,
  X,
  AlertCircle,
  Laptop,
  ArrowRight,
  ShieldCheck,
  CreditCard,
  BarChart3
} from 'lucide-react';
import { StatCard } from '../common/StatCard';
import { useAuth } from '../../services/authContext';
import { db, subscribeToDB } from '../../db/storage';
import { hrmsService } from '../../services/hrmsService';
import { NavTab } from '../layout/Sidebar';
import { NavigationContext } from '../../types/hrms';

interface ManagerDashboardProps {
  onNavigate: (tab: NavTab, context?: NavigationContext) => void;
}

export const ManagerDashboard: React.FC<ManagerDashboardProps> = ({ onNavigate }) => {
  const { currentUser } = useAuth();
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [, setTick] = useState(0);

  useEffect(() => {
    return subscribeToDB(() => setTick((t) => t + 1));
  }, []);

  const isMD = currentUser.role === 'senior_manager';
  const allEmployees = db.getEmployees().filter((e) => e.status !== 'Inactive' && e.status !== 'Separated');

  // My direct reports (active only)
  const teamMembers = allEmployees.filter(
    (e) => e.reportingManagerId === currentUser.employeeId
  );
  const teamIds = teamMembers.map((e) => e.id);

  // Pending Leave requests routed to this manager/senior manager
  const pendingLeaves = db
    .getLeaveApplications()
    .filter((a) =>
      isMD
        ? a.status === 'Pending Approval' && (a.approverId === currentUser.employeeId || teamIds.includes(a.employeeId))
        : a.approverId === currentUser.employeeId && a.status === 'Pending Approval'
    );

  // Pending Expense claims routed to this manager/senior manager
  const pendingExpenses = db
    .getExpenseClaims()
    .filter((c) =>
      isMD
        ? c.status === 'Pending Manager Approval' && (c.approverId === currentUser.employeeId || teamIds.includes(c.employeeId))
        : c.approverId === currentUser.employeeId && c.status === 'Pending Manager Approval'
    );

  // Pending Attendance corrections routed to this manager/senior manager
  const pendingCorrections = db
    .getCorrectionRequests()
    .filter((r) => r.approverId === currentUser.employeeId && r.status === 'Pending');

  // Team members on leave today
  const todayStr = new Date().toISOString().split('T')[0];
  const teamOnLeave = db.getLeaveApplications().filter(
    (a) =>
      (isMD ? true : teamIds.includes(a.employeeId)) &&
      a.status === 'Approved' &&
      a.startDate <= todayStr &&
      a.endDate >= todayStr
  );

  // Team assets
  const teamAssets = db.getAssets().filter(
    (a) => a.currentEmployeeId && (isMD ? true : teamIds.includes(a.currentEmployeeId))
  );

  const payrollRuns = db.getPayrollRuns();
  const latestRun = payrollRuns[0];

  const handleApproveLeave = (id: string) => {
    hrmsService.decideLeave(id, 'Approved', `Approved by ${currentUser.name}`, currentUser.id, currentUser.name);
    setActionMessage('Leave application approved.');
    setTimeout(() => setActionMessage(null), 3000);
  };

  const handleRejectLeave = (id: string) => {
    hrmsService.decideLeave(id, 'Rejected', `Rejected by ${currentUser.name} due to coverage`, currentUser.id, currentUser.name);
    setActionMessage('Leave application rejected.');
    setTimeout(() => setActionMessage(null), 3000);
  };

  const handleApproveExpense = (id: string) => {
    hrmsService.decideExpenseClaim(id, 'Approved', `Approved by ${currentUser.name}`, currentUser.id, currentUser.name);
    setActionMessage('Expense claim approved and forwarded to finance.');
    setTimeout(() => setActionMessage(null), 3000);
  };

  const handleRejectExpense = (id: string) => {
    hrmsService.decideExpenseClaim(id, 'Rejected', 'Receipt or business purpose needs revision', currentUser.id, currentUser.name);
    setActionMessage('Expense claim rejected.');
    setTimeout(() => setActionMessage(null), 3000);
  };

  return (
    <div className="space-y-6">
      {actionMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs font-medium flex items-center gap-2">
          <Check className="h-4 w-4" />
          <span>{actionMessage}</span>
        </div>
      )}

      {/* Managing Director (Senior Management) Executive Governance Banner */}
      {isMD && (
        <div className="bg-slate-900 text-white rounded-xl p-5 border border-slate-800 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[11px] font-semibold">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Managing Director · Executive Governance Console</span>
            </div>
            <h2 className="text-base font-bold text-white">
              Organization-Wide Oversight & Payroll Sign-Off ({allEmployees.length} Active Staff)
            </h2>
            <p className="text-xs text-slate-400">
              Latest Payroll Run ({latestRun?.periodLabel || 'October 2026'}):{' '}
              <strong className="text-emerald-400">
                ₹{latestRun ? latestRun.totalNetPay.toLocaleString('en-IN') : '0'}
              </strong>{' '}
              ({latestRun?.status || 'Draft'})
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => onNavigate('payroll', { subTab: 'runs' })}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg transition-colors"
            >
              <CreditCard className="h-3.5 w-3.5" />
              <span>Review & Approve Payroll</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigate('reports')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold rounded-lg transition-colors"
            >
              <BarChart3 className="h-3.5 w-3.5" />
              <span>Executive Reports</span>
            </button>
          </div>
        </div>
      )}

      {/* Team / Executive Metric Cards — Every Card Navigates with Deep Context */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Direct Reports"
          value={teamMembers.length}
          subtitle={isMD ? `${allEmployees.length} total org staff · ${teamMembers.length} direct` : 'Engineering & Delivery team members'}
          icon={Users}
          badge="Reporting to You"
          badgeColor="indigo"
          onClick={() => onNavigate('employees', { subTab: 'reportees', managerId: currentUser.employeeId })}
        />
        <StatCard
          title="Team on Leave Today"
          value={teamOnLeave.length}
          subtitle={teamOnLeave.length > 0 ? 'Review project bandwidth' : 'Full team available'}
          icon={CalendarCheck}
          badge={teamOnLeave.length > 0 ? 'Active Absence' : 'Optimal'}
          badgeColor={teamOnLeave.length > 0 ? 'amber' : 'emerald'}
          onClick={() => onNavigate('leave', { subTab: 'approvals', statusFilter: 'Approved', dateFilter: todayStr })}
        />
        <StatCard
          title="Pending Approvals"
          value={pendingLeaves.length + pendingExpenses.length + pendingCorrections.length}
          subtitle={`${pendingLeaves.length} leaves · ${pendingExpenses.length} claims · ${pendingCorrections.length} punches`}
          icon={AlertCircle}
          badge={pendingLeaves.length + pendingExpenses.length + pendingCorrections.length > 0 ? 'Action Required' : 'Up to Date'}
          badgeColor={pendingLeaves.length + pendingExpenses.length + pendingCorrections.length > 0 ? 'rose' : 'emerald'}
          onClick={() =>
            pendingLeaves.length > 0
              ? onNavigate('leave', { subTab: 'approvals', statusFilter: 'Pending Approval' })
              : pendingExpenses.length > 0
              ? onNavigate('expenses', { subTab: 'approvals', statusFilter: 'Pending Manager Approval' })
              : onNavigate('attendance', { subTab: 'corrections', statusFilter: 'Pending' })
          }
        />
        <StatCard
          title="Team Assets"
          value={teamAssets.length}
          subtitle="Laptops and workstations deployed"
          icon={Laptop}
          badge="Allocated"
          badgeColor="slate"
          onClick={() => onNavigate('assets', { subTab: 'hardware', statusFilter: 'Allocated' })}
        />
      </div>

      {/* Approval Queues */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending Leave Applications */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <button
                type="button"
                onClick={() => onNavigate('leave', { subTab: 'approvals', statusFilter: 'Pending Approval' })}
                className="text-xs font-semibold text-slate-900 hover:text-indigo-600 uppercase tracking-wider flex items-center gap-2 transition-colors"
              >
                <CalendarCheck className="h-4 w-4 text-indigo-600" />
                <span>Pending Team Leave Requests</span>
              </button>
              <button
                type="button"
                onClick={() => onNavigate('leave', { subTab: 'approvals', statusFilter: 'Pending Approval' })}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
              >
                <span>{pendingLeaves.length} waiting</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              {pendingLeaves.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  No pending leave requests from your reporting hierarchy.
                </div>
              ) : (
                pendingLeaves.map((app) => {
                  const emp = db.getEmployeeById(app.employeeId);
                  const lt = db.getLeaveTypes().find((l) => l.id === app.leaveTypeId);
                  return (
                    <div key={app.id} className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-semibold text-slate-900">
                            {emp ? `${emp.firstName} ${emp.lastName}` : app.employeeId}
                          </p>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            {lt?.name} · {app.totalDays} day(s) ({app.startDate} to {app.endDate})
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleApproveLeave(app.id)}
                            className="px-2.5 py-1 rounded-md bg-emerald-600 text-white hover:bg-emerald-700 transition-colors text-[11px] font-semibold flex items-center gap-1"
                            title="Approve"
                          >
                            <Check className="h-3.5 w-3.5" />
                            <span>Approve</span>
                          </button>
                          <button
                            onClick={() => handleRejectLeave(app.id)}
                            className="px-2.5 py-1 rounded-md bg-rose-600 text-white hover:bg-rose-700 transition-colors text-[11px] font-semibold flex items-center gap-1"
                            title="Reject"
                          >
                            <X className="h-3.5 w-3.5" />
                            <span>Reject</span>
                          </button>
                        </div>
                      </div>
                      <p className="text-slate-600 mt-2 text-[11px] bg-white p-2 rounded border border-slate-100">
                        Reason: "{app.reason}"
                      </p>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={() => onNavigate('leave', { subTab: 'approvals', statusFilter: 'Pending Approval' })}
            className="mt-4 w-full py-2 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors flex items-center justify-center gap-1.5"
          >
            <span>Open Full Leave Approval Queue</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Pending Expense Claims */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <button
                type="button"
                onClick={() => onNavigate('expenses', { subTab: 'approvals', statusFilter: 'Pending Manager Approval' })}
                className="text-xs font-semibold text-slate-900 hover:text-emerald-700 uppercase tracking-wider flex items-center gap-2 transition-colors"
              >
                <Receipt className="h-4 w-4 text-emerald-600" />
                <span>Pending Team Expense Claims</span>
              </button>
              <button
                type="button"
                onClick={() => onNavigate('expenses', { subTab: 'approvals', statusFilter: 'Pending Manager Approval' })}
                className="text-xs font-semibold text-emerald-700 hover:text-emerald-900 flex items-center gap-1"
              >
                <span>{pendingExpenses.length} waiting</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              {pendingExpenses.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  No pending expense claims from your reporting team.
                </div>
              ) : (
                pendingExpenses.map((claim) => {
                  const emp = db.getEmployeeById(claim.employeeId);
                  const cat = db.getExpenseCategories().find((c) => c.id === claim.categoryId);
                  return (
                    <div key={claim.id} className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-slate-900">
                              {emp ? `${emp.firstName} ${emp.lastName}` : claim.employeeId}
                            </p>
                            <span className="font-mono text-indigo-600 font-bold">
                              ₹{claim.amount.toLocaleString()}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            {cat?.name} · Claim {claim.claimNumber} · Date: {claim.expenseDate}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleApproveExpense(claim.id)}
                            className="px-2.5 py-1 rounded-md bg-emerald-600 text-white hover:bg-emerald-700 transition-colors text-[11px] font-semibold flex items-center gap-1"
                            title="Approve"
                          >
                            <Check className="h-3.5 w-3.5" />
                            <span>Approve</span>
                          </button>
                          <button
                            onClick={() => handleRejectExpense(claim.id)}
                            className="px-2.5 py-1 rounded-md bg-rose-600 text-white hover:bg-rose-700 transition-colors text-[11px] font-semibold flex items-center gap-1"
                            title="Reject"
                          >
                            <X className="h-3.5 w-3.5" />
                            <span>Reject</span>
                          </button>
                        </div>
                      </div>
                      <p className="text-slate-600 mt-2 text-[11px] bg-white p-2 rounded border border-slate-100">
                        Title: {claim.title} | Purpose: "{claim.businessPurpose}"
                      </p>
                      {claim.receiptFileName && (
                        <p className="mt-1 text-[10px] text-indigo-600">Attachment: {claim.receiptFileName}</p>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={() => onNavigate('expenses', { subTab: 'approvals', statusFilter: 'Pending Manager Approval' })}
            className="mt-4 w-full py-2 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors flex items-center justify-center gap-1.5"
          >
            <span>Open Full Expense Approval Queue</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};

