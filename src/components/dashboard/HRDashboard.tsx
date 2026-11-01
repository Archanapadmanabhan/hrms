import React, { useState, useEffect } from 'react';
import {
  Users,
  CalendarClock,
  Receipt,
  AlertTriangle,
  Laptop,
  CreditCard,
  ArrowRight,
  BriefcaseBusiness
} from 'lucide-react';
import { StatCard } from '../common/StatCard';
import { db, subscribeToDB } from '../../db/storage';
import { NavTab } from '../layout/Sidebar';
import { NavigationContext } from '../../types/hrms';
import { readAssignments } from '../clients/ClientManagement';

interface HRDashboardProps {
  onNavigate: (tab: NavTab, context?: NavigationContext) => void;
}

export const HRDashboard: React.FC<HRDashboardProps> = ({ onNavigate }) => {
  const [, setTick] = useState(0);
  useEffect(() => {
    return subscribeToDB(() => setTick((t) => t + 1));
  }, []);

  const employees = db.getEmployees();
  const activeCount = employees.filter((e) => e.status === 'Active' || e.status === 'Probation').length;
  const newJoiners = employees.filter((e) => {
    const joinDate = new Date(e.dateOfJoining);
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 12);
    return joinDate >= sixMonthsAgo;
  }).length;

  const todayStr = new Date().toISOString().split('T')[0];
  const todayAttendance = db.getAttendanceRecords().filter((r) => r.date === todayStr);
  const onLeaveToday = todayAttendance.filter((r) => r.status === 'On Leave').length;
  const attendanceExceptions = todayAttendance.filter((r) => r.isLate || r.status === 'Absent').length;

  const pendingLeaves = db.getLeaveApplications().filter((a) => a.status === 'Pending Approval').length;
  const pendingExpenses = db.getExpenseClaims().filter((c) => c.status === 'Pending Manager Approval' || c.status === 'Pending Reimbursement').length;

  const assets = db.getAssets();
  const allocatedAssets = assets.filter((a) => a.status === 'Allocated').length;

  const clientAssignments = readAssignments().filter((a) => a.status === 'Active');
  const pendingClientAtt = db.getAttendanceRecords().filter(
    (r) => (r.workMode === 'Client Site' || r.source === 'Client Timesheet') && r.approvalStatus !== 'Approved'
  ).length;

  const latestPayroll = db.getPayrollRuns()[0];
  const auditLogs = db.getAuditLogs().slice(0, 6);

  return (
    <div className="space-y-6">
      {/* KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          title="Total Workforce"
          value={employees.length}
          subtitle={`${activeCount} active · ${newJoiners} joined in 12m`}
          icon={Users}
          badge="100% Retained"
          badgeColor="emerald"
          onClick={() => onNavigate('employees', { subTab: 'directory', statusFilter: 'Active' })}
        />
        <StatCard
          title="On Leave Today"
          value={onLeaveToday}
          subtitle={`${pendingLeaves} pending approvals in queue`}
          icon={CalendarClock}
          badge={pendingLeaves > 0 ? `${pendingLeaves} Pending` : 'All Approved'}
          badgeColor={pendingLeaves > 0 ? 'amber' : 'emerald'}
          onClick={() =>
            onNavigate('leave', {
              subTab: pendingLeaves > 0 ? 'approvals' : 'applications',
              statusFilter: pendingLeaves > 0 ? 'Pending Approval' : 'Approved'
            })
          }
        />
        <StatCard
          title="Expense Approvals"
          value={pendingExpenses}
          subtitle="Awaiting manager / finance audit"
          icon={Receipt}
          badge={pendingExpenses > 0 ? 'Action Needed' : 'Cleared'}
          badgeColor={pendingExpenses > 0 ? 'amber' : 'slate'}
          onClick={() =>
            onNavigate('expenses', {
              subTab: 'approvals',
              statusFilter: 'Pending Manager Approval'
            })
          }
        />
        <StatCard
          title="Client Deployments"
          value={clientAssignments.length}
          subtitle={
            pendingClientAtt > 0
              ? `${pendingClientAtt} site attendance awaiting approval`
              : 'Client-site attendance verified'
          }
          icon={BriefcaseBusiness}
          badge={pendingClientAtt > 0 ? `${pendingClientAtt} Pending` : 'Active'}
          badgeColor={pendingClientAtt > 0 ? 'amber' : 'indigo'}
          onClick={() =>
            onNavigate('clients', {
              subTab: pendingClientAtt > 0 ? 'attendance' : 'assignments'
            })
          }
        />
        <StatCard
          title="Hardware Assets"
          value={allocatedAssets}
          subtitle={`${assets.length - allocatedAssets} available in inventory`}
          icon={Laptop}
          badge={`${assets.length} Total Registered`}
          badgeColor="blue"
          onClick={() => onNavigate('assets', { subTab: 'all', statusFilter: 'Allocated' })}
        />
      </div>

      {/* Secondary Row: Payroll Status & Today's Attendance exceptions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Payroll Card */}
        <div
          onClick={() => onNavigate('payroll', { subTab: 'runs' })}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onNavigate('payroll', { subTab: 'runs' })}
          className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs hover:border-indigo-300 transition-all cursor-pointer flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <span className="text-xs font-semibold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-indigo-600" />
                Payroll Status
              </span>
              <span className={`px-2 py-0.5 text-xs font-medium rounded ${
                latestPayroll?.status === 'Finalized' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
              }`}>
                {latestPayroll?.status || 'Draft'}
              </span>
            </div>
            <div className="mt-4">
              <p className="text-xs text-slate-500">Latest Active Period</p>
              <p className="text-lg font-bold text-slate-900 mt-0.5">{latestPayroll?.periodLabel || 'October 2026'}</p>
              <div className="mt-3 space-y-1.5 text-xs text-slate-600">
                <div className="flex justify-between">
                  <span>Total Net Disbursement:</span>
                  <span className="font-semibold text-slate-900">₹{latestPayroll?.totalNetPay.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Eligible Employees:</span>
                  <span className="font-semibold text-slate-900">{latestPayroll?.totalEmployees}</span>
                </div>
                <div className="flex justify-between">
                  <span>Payment Reference:</span>
                  <span className="font-mono text-slate-700">{latestPayroll?.paymentReference || 'Pending Batch'}</span>
                </div>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onNavigate('payroll', { subTab: 'runs' });
            }}
            className="mt-5 w-full flex items-center justify-center gap-1.5 py-2 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
          >
            <span>Open Payroll Console</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Attendance & Exceptions */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <button
                type="button"
                onClick={() => onNavigate('attendance', { subTab: 'logs', dateFilter: todayStr })}
                className="text-xs font-semibold text-slate-900 hover:text-indigo-600 uppercase tracking-wider flex items-center gap-2"
              >
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <span>Today's Attendance Exceptions ({attendanceExceptions})</span>
              </button>
              <span className="text-xs text-slate-500">{todayAttendance.length} check-ins</span>
            </div>
            <div className="mt-4 space-y-2.5">
              {todayAttendance.filter((r) => r.isLate).length === 0 ? (
                <p className="text-xs text-slate-500 py-4 text-center">No lateness or irregular check-ins recorded today.</p>
              ) : (
                todayAttendance
                  .filter((r) => r.isLate)
                  .map((rec) => {
                    const emp = employees.find((e) => e.id === rec.employeeId);
                    return (
                      <div
                        key={rec.id}
                        role="button"
                        tabIndex={0}
                        onClick={() =>
                          onNavigate('attendance', {
                            subTab: 'logs',
                            dateFilter: todayStr,
                            employeeId: rec.employeeId
                          })
                        }
                        onKeyDown={(e) =>
                          (e.key === 'Enter' || e.key === ' ') &&
                          onNavigate('attendance', {
                            subTab: 'logs',
                            dateFilter: todayStr,
                            employeeId: rec.employeeId
                          })
                        }
                        className="p-2.5 bg-amber-50/50 hover:bg-amber-100/70 rounded-lg border border-amber-100 text-xs flex items-center justify-between cursor-pointer transition-colors"
                      >
                        <div>
                          <p className="font-semibold text-slate-900">{emp ? `${emp.firstName} ${emp.lastName}` : rec.employeeId}</p>
                          <p className="text-[11px] text-amber-700 mt-0.5">Checked in at {rec.checkInTime} (+{rec.lateMinutes}m late)</p>
                        </div>
                        <span className="text-[10px] text-indigo-700 font-semibold">Inspect &rarr;</span>
                      </div>
                    );
                  })
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('attendance', { subTab: 'logs', dateFilter: todayStr })}
            className="mt-5 w-full flex items-center justify-center gap-1.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
          >
            <span>View Timesheets</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Recent Audit Log */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <button
                type="button"
                onClick={() => onNavigate('settings', { subTab: 'audit' })}
                className="text-xs font-semibold text-slate-900 hover:text-indigo-600 uppercase tracking-wider"
              >
                System Audit Stream
              </button>
              <span className="text-[11px] text-slate-400">Append-only</span>
            </div>
            <div className="mt-3 space-y-2">
              {auditLogs.map((log) => (
                <div
                  key={log.id}
                  onClick={() => onNavigate('settings', { subTab: 'audit' })}
                  className="text-xs p-1.5 -mx-1.5 rounded hover:bg-slate-50 cursor-pointer transition-colors"
                >
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-semibold text-slate-800">{log.actorName}</span>
                    <span className="text-slate-400">{new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <p className="text-slate-600 text-[11px] leading-tight mt-0.5 truncate">{log.description}</p>
                </div>
              ))}
            </div>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('settings', { subTab: 'audit' })}
            className="mt-4 text-center text-xs font-medium text-indigo-600 hover:text-indigo-800"
          >
            View Complete Audit Log &rarr;
          </button>
        </div>
      </div>
    </div>
  );
};

