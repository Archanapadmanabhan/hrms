import React from 'react';
import {
  Users,
  CalendarDays,
  CreditCard,
  Receipt,
  Laptop,
  Clock,
  BarChart3,
  Settings,
  LayoutDashboard,
  ShieldCheck,
  Building2,
  BriefcaseBusiness,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { useAuth } from '../../services/authContext';
import { db, subscribeToDB } from '../../db/storage';

export type NavTab = 
  | 'dashboard'
  | 'organization'
  | 'employees'
  | 'clients'
  | 'leave'
  | 'payroll'
  | 'expenses'
  | 'assets'
  | 'attendance'
  | 'policies'
  | 'reports'
  | 'settings';

interface SidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  collapsed?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentTab, onSelectTab }) => {
  const [collapsed, setCollapsed] = React.useState(false);
  const [, setDbTick] = React.useState(0);
  const { currentUser, canAccessModule } = useAuth();

  React.useEffect(() => {
    return subscribeToDB(() => setDbTick((t) => t + 1));
  }, []);

  // Role-scoped pending counts for badges
  const pendingLeaves = currentUser.role === 'hr_admin'
    ? db.getLeaveApplications().filter((a) => a.status === 'Pending Approval').length
    : db.getLeaveApplications().filter((a) => a.approverId === currentUser.employeeId && a.status === 'Pending Approval').length;

  const pendingExpenses = currentUser.role === 'hr_admin'
    ? db.getExpenseClaims().filter((c) => c.status === 'Pending Manager Approval' || c.status === 'Pending Reimbursement').length
    : db.getExpenseClaims().filter((c) => c.approverId === currentUser.employeeId && c.status === 'Pending Manager Approval').length;

  const pendingCorrections = currentUser.role === 'hr_admin'
    ? db.getCorrectionRequests().filter((r) => r.status === 'Pending').length
    : db.getCorrectionRequests().filter((r) => r.approverId === currentUser.employeeId && r.status === 'Pending').length;

  const navItems: { id: NavTab; label: string; icon: React.ElementType; badge?: number; access: boolean }[] = [
    {
      id: 'dashboard',
      label: 'Overview',
      icon: LayoutDashboard,
      access: true
    },
    {
      id: 'organization',
      label: 'Organization Setup',
      icon: Building2,
      access: canAccessModule('organization')
    },
    {
      id: 'employees',
      label: 'Employee Setup',
      icon: Users,
      access: canAccessModule('hr')
    },
    {
      id: 'clients',
      label: 'Client Management',
      icon: BriefcaseBusiness,
      access: canAccessModule('clients')
    },
    {
      id: 'leave',
      label: 'Leave & Holidays',
      icon: CalendarDays,
      badge: currentUser.role !== 'employee' ? pendingLeaves : undefined,
      access: canAccessModule('leave')
    },
    {
      id: 'attendance',
      label: 'Attendance & Shifts',
      icon: Clock,
      badge: currentUser.role !== 'employee' ? pendingCorrections : undefined,
      access: canAccessModule('attendance')
    },
    {
      id: 'expenses',
      label: 'Expense Claims',
      icon: Receipt,
      badge: currentUser.role !== 'employee' ? pendingExpenses : undefined,
      access: canAccessModule('expenses')
    },
    {
      id: 'payroll',
      label: 'Payroll & Payslips',
      icon: CreditCard,
      access: canAccessModule('payroll')
    },
    {
      id: 'assets',
      label: 'Asset Inventory',
      icon: Laptop,
      access: canAccessModule('assets')
    },
    {
      id: 'policies',
      label: 'Policies',
      icon: ShieldCheck,
      access: true
    },
    {
      id: 'reports',
      label: 'Reports & Analytics',
      icon: BarChart3,
      access: canAccessModule('reports')
    },
    {
      id: 'settings',
      label: 'System Settings',
      icon: Settings,
      access: canAccessModule('settings')
    }
  ];

  return (
    <aside className={`relative ${collapsed ? 'w-[76px]' : 'w-64'} transition-[width] duration-200 bg-slate-900 text-slate-300 flex flex-col shrink-0 border-r border-slate-800 select-none`}>
      {/* Side-mounted Collapse Toggle Button */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        className="absolute -right-3 top-5 z-30 flex h-6 w-6 items-center justify-center rounded-full border border-slate-700 bg-slate-800 text-slate-300 shadow-md hover:border-indigo-500 hover:bg-indigo-600 hover:text-white transition-colors"
      >
        {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>

      {/* Brand Header */}
      <div className={`h-16 flex items-center ${collapsed ? 'justify-center px-2' : 'px-6'} border-b border-slate-800 gap-3`}>
        <div className="h-9 w-9 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-sm shrink-0">
          O
        </div>
        {!collapsed && (
          <div>
            <div className="text-base font-semibold text-white tracking-tight flex items-center gap-1.5">
              <span>Orbyx</span>
              <span className="text-[10px] font-mono uppercase bg-slate-800 text-indigo-400 px-1.5 py-0.5 rounded">HRMS</span>
            </div>
            <p className="text-[11px] text-slate-400">Human Resources</p>
          </div>
        )}
      </div>

      {/* Role Pill Banner */}
      <div className={`px-4 py-2.5 bg-slate-950/60 border-b border-slate-800/80 text-[11px] flex items-center ${collapsed ? 'justify-center' : 'justify-between'}`}>
        {collapsed ? (
          <ShieldCheck className="h-4 w-4 text-indigo-400" />
        ) : (
          <>
            <span className="text-slate-400 flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-indigo-400" />
              <span>Active Role:</span>
            </span>
            <span className="font-medium capitalize text-slate-200">
              {currentUser.role === 'hr_admin'
                ? 'HR'
                : currentUser.role === 'senior_manager'
                ? 'Senior Management'
                : currentUser.role === 'reporting_manager'
                ? 'Reporting Manager'
                : 'Employee'}
            </span>
          </>
        )}
      </div>

      {/* Nav List */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems
          .filter((item) => item.access)
          .map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                title={collapsed ? item.label : undefined}
                className={`w-full flex items-center ${collapsed ? 'justify-center' : 'justify-between'} px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                }`}
              >
                <div className={`flex items-center ${collapsed ? '' : 'gap-3'}`}>
                  <Icon className={`h-4 w-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  {!collapsed && <span>{item.label}</span>}
                </div>
                {item.badge !== undefined && item.badge > 0 && (
                  <span
                    className={`px-1.5 py-0.2 text-[10px] font-semibold rounded-full ${
                      isActive ? 'bg-white text-indigo-700' : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
      </nav>

      {/* Footer Profile card */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/40">
        <div className={`flex items-center ${collapsed ? 'justify-center' : 'gap-3 px-2'} py-2`}>
          <img
            src={currentUser.avatarUrl}
            alt={currentUser.name}
            className="h-8 w-8 rounded-full object-cover ring-1 ring-slate-700 shrink-0"
          />
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-white truncate">{currentUser.name}</p>
              <p className="text-[11px] text-slate-400 truncate">{currentUser.designationTitle}</p>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};
