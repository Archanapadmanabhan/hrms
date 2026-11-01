import React, { useState, useEffect } from 'react';
import { PersonaSwitcher } from './PersonaSwitcher';
import { NotificationDropdown } from './NotificationDropdown';
import { useAuth } from '../../services/authContext';
import { db, subscribeToDB } from '../../db/storage';
import { CheckCircle2, Clock, ShieldCheck } from 'lucide-react';
import { NavTab } from './Sidebar';

interface HeaderProps {
  currentTab: NavTab;
  onNavigate?: (tab: NavTab) => void;
}

export const Header: React.FC<HeaderProps> = ({ currentTab, onNavigate }) => {
  const { currentUser } = useAuth();
  const [todayRecord, setTodayRecord] = useState(() => {
    const today = new Date().toISOString().split('T')[0];
    return db.getAttendanceRecords().find(
      (r) => r.employeeId === currentUser.employeeId && r.date === today
    );
  });

  useEffect(() => {
    const update = () => {
      const today = new Date().toISOString().split('T')[0];
      setTodayRecord(
        db.getAttendanceRecords().find(
          (r) => r.employeeId === currentUser.employeeId && r.date === today
        )
      );
    };
    const unsubscribe = subscribeToDB(update);
    update();
    return unsubscribe;
  }, [currentUser]);

  const titles: Record<NavTab, { title: string; subtitle: string }> = {
    dashboard: { title: 'Executive Overview', subtitle: 'Workforce operational metrics and daily status' },
    organization: { title: 'Organization Setup', subtitle: 'Legal entity, branches, departments, designations & governance structure' },
    employees: { title: 'Employee Setup', subtitle: 'Employee directory, my reportees & reporting hierarchy' },
    clients: { title: 'Client Management', subtitle: 'Client organizations, employee deployments, assignment lifecycle & 2-stage attendance verification' },
    leave: { title: 'Leave & Absence Management', subtitle: 'Leave applications, approvals, balance ledgers & calendar' },
    attendance: { title: 'Shifts & Attendance', subtitle: 'Check-in/check-out station, manual attendance entries, corrections & shift schedules' },
    expenses: { title: 'Expense Management', subtitle: 'Employee reimbursement claims, salary advances, travel petty cash & payouts' },
    payroll: { title: 'Payroll & Compensation', subtitle: 'Salary structures, monthly processing, MD approval, payslips & statutory compliance' },
    assets: { title: 'Asset Management', subtitle: 'Hardware, email accounts, software licenses, subscriptions & access lifecycle' },
    policies: { title: 'Enterprise Policies & Rules Hub', subtitle: 'Centralized HR, leave, attendance, payroll, statutory, expense & asset rules' },
    reports: { title: 'Operational Analytics & Reports', subtitle: 'Aggregated cross-module exports and statutory summaries' },
    settings: { title: 'System Settings & Governance', subtitle: 'User accounts, RBAC matrix, system preferences & audit logs' }
  };

  const currentMeta = titles[currentTab] || { title: 'Dashboard', subtitle: 'HRMS' };
  const isMD = currentUser.role === 'senior_manager';

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between shrink-0">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-base font-bold text-slate-900 tracking-tight">{currentMeta.title}</h1>
        </div>
        <p className="text-[11px] text-slate-500 hidden sm:block">{currentMeta.subtitle}</p>
      </div>

      <div className="flex items-center gap-3">
        {/* Non-duplicating Attendance Status Indicator (Single Check-In/Out control lives in Attendance & Shifts) */}
        <div className="hidden md:flex items-center gap-2 pr-3 border-r border-slate-200">
          {isMD ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs font-semibold">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>MD Executive Oversight</span>
            </span>
          ) : !todayRecord?.checkInTime ? (
            <button
              type="button"
              onClick={() => onNavigate?.('attendance')}
              title="Open Attendance & Shifts to Check In"
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-medium transition-colors"
            >
              <Clock className="h-3.5 w-3.5 text-amber-600" />
              <span>Status: Not Checked In</span>
            </button>
          ) : !todayRecord?.checkOutTime ? (
            <button
              type="button"
              onClick={() => onNavigate?.('attendance')}
              title="Open Attendance & Shifts to Check Out"
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-medium transition-colors"
            >
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Checked In ({todayRecord.checkInTime})</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onNavigate?.('attendance')}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-mono transition-colors"
            >
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
              <span>Shift Logged ({todayRecord.totalHoursWorked}h)</span>
            </button>
          )}
        </div>

        {/* Notifications Dropdown */}
        <NotificationDropdown />

        {/* Persona Switcher Dropdown */}
        <PersonaSwitcher />
      </div>
    </header>
  );
};

