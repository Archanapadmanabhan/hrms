import React, { useState, useEffect, useCallback } from 'react';
import { AuthProvider } from './services/authContext';
import { Sidebar, NavTab } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { DashboardHub } from './components/dashboard/DashboardHub';
import { EmployeeDirectory } from './components/employees/EmployeeDirectory';
import { LeaveManagement } from './components/leave/LeaveManagement';
import { PayrollDashboard } from './components/payroll/PayrollDashboard';
import { ExpenseManagement } from './components/expenses/ExpenseManagement';
import { AssetManagement } from './components/assets/AssetManagement';
import { AttendanceManagement } from './components/attendance/AttendanceManagement';
import { ReportsHub } from './components/reports/ReportsHub';
import { CompanySettings } from './components/settings/CompanySettings';
import { OrganizationSetup } from './components/organization/OrganizationSetup';
import { ClientManagement } from './components/clients/ClientManagement';
import { PoliciesHub } from './components/policies/PoliciesHub';
import { ApplyLeaveModal } from './components/leave/ApplyLeaveModal';
import { NewExpenseModal } from './components/expenses/NewExpenseModal';
import { NavigationContext, PolicyModule } from './types/hrms';
import { ArrowLeft } from 'lucide-react';

function MainApp() {
  const [currentTab, setCurrentTab] = useState<NavTab>('dashboard');
  const [navContext, setNavContext] = useState<NavigationContext | undefined>(undefined);
  const [navVersion, setNavVersion] = useState(0);
  const [fromDashboard, setFromDashboard] = useState(false);
  const [isApplyLeaveOpen, setIsApplyLeaveOpen] = useState(false);
  const [isSubmitExpenseOpen, setIsSubmitExpenseOpen] = useState(false);

  const navigateTo = useCallback(
    (tab: NavTab, context?: NavigationContext, triggeredFromDashboard = false) => {
      setCurrentTab(tab);
      setNavContext(context);
      setNavVersion((v) => v + 1);
      setFromDashboard(triggeredFromDashboard);
      try {
        window.history.pushState(
          { tab, context, fromDashboard: triggeredFromDashboard },
          '',
          `#${tab}`
        );
      } catch {
        // ignore iframe history restrictions if any
      }
    },
    []
  );

  useEffect(() => {
    const onPopState = (e: PopStateEvent) => {
      if (e.state && e.state.tab) {
        setCurrentTab(e.state.tab);
        setNavContext(e.state.context);
        setFromDashboard(Boolean(e.state.fromDashboard));
        setNavVersion((v) => v + 1);
      } else {
        setCurrentTab('dashboard');
        setNavContext(undefined);
        setFromDashboard(false);
        setNavVersion((v) => v + 1);
      }
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const openPoliciesForCategory = (category: PolicyModule | 'ALL') => {
    navigateTo('policies', { policyCategory: category });
  };

  const renderContent = () => {
    switch (currentTab) {
      case 'dashboard':
        return (
          <DashboardHub
            onNavigate={(tab, context) => navigateTo(tab, context, true)}
            onOpenApplyLeave={() => setIsApplyLeaveOpen(true)}
            onOpenSubmitExpense={() => setIsSubmitExpenseOpen(true)}
          />
        );
      case 'organization':
        return (
          <OrganizationSetup
            key={`org-${navVersion}`}
            onOpenPolicies={() => openPoliciesForCategory('Organization')}
          />
        );
      case 'employees':
        return (
          <EmployeeDirectory
            key={`emp-${navVersion}`}
            navContext={navContext}
            onOpenPolicies={() => openPoliciesForCategory('Employee & Exit')}
          />
        );
      case 'clients':
        return (
          <ClientManagement
            key={`cli-${navVersion}`}
            navContext={navContext}
            onOpenPolicies={() => openPoliciesForCategory('Client')}
          />
        );
      case 'leave':
        return (
          <LeaveManagement
            key={`leave-${navVersion}`}
            navContext={navContext}
            onOpenPolicies={() => openPoliciesForCategory('Leave')}
          />
        );
      case 'payroll':
        return (
          <PayrollDashboard
            key={`pay-${navVersion}`}
            navContext={navContext}
            onOpenPolicies={() => openPoliciesForCategory('Payroll')}
          />
        );
      case 'expenses':
        return (
          <ExpenseManagement
            key={`exp-${navVersion}`}
            navContext={navContext}
            onOpenPolicies={() => openPoliciesForCategory('Expense')}
          />
        );
      case 'assets':
        return (
          <AssetManagement
            key={`ast-${navVersion}`}
            navContext={navContext}
            onOpenPolicies={() => openPoliciesForCategory('Asset')}
          />
        );
      case 'attendance':
        return (
          <AttendanceManagement
            key={`att-${navVersion}`}
            navContext={navContext}
            onOpenPolicies={() => openPoliciesForCategory('Attendance')}
          />
        );
      case 'policies':
        return (
          <PoliciesHub
            key={`pol-${navVersion}`}
            initialCategory={navContext?.policyCategory || 'ALL'}
          />
        );
      case 'reports':
        return <ReportsHub key={`rep-${navVersion}`} />;
      case 'settings':
        return <CompanySettings key={`set-${navVersion}`} navContext={navContext} />;
      default:
        return (
          <DashboardHub
            onNavigate={(tab, context) => navigateTo(tab, context, true)}
            onOpenApplyLeave={() => setIsApplyLeaveOpen(true)}
            onOpenSubmitExpense={() => setIsSubmitExpenseOpen(true)}
          />
        );
    }
  };

  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden font-sans text-slate-800 antialiased">
      {/* Sidebar Navigation */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={(tab) => navigateTo(tab, undefined, false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <Header
          currentTab={currentTab}
          onNavigate={(tab) => navigateTo(tab, undefined, false)}
        />

        {/* Viewport Content */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          <div className="max-w-7xl mx-auto space-y-4">
            {currentTab !== 'dashboard' && fromDashboard && (
              <div className="flex items-center justify-between bg-indigo-50/80 border border-indigo-200/80 px-3.5 py-2 rounded-xl text-xs">
                <button
                  type="button"
                  onClick={() => navigateTo('dashboard', undefined, false)}
                  className="inline-flex items-center gap-1.5 font-semibold text-indigo-700 hover:text-indigo-900"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span>Back to Overview Dashboard</span>
                </button>
                {navContext && (navContext.statusFilter || navContext.subTab) && (
                  <span className="text-[11px] text-indigo-700 font-medium">
                    Filtered View: {navContext.statusFilter || navContext.subTab}
                  </span>
                )}
              </div>
            )}
            {renderContent()}
          </div>
        </main>
      </div>

      {/* Global Modals for Quick Action Triggers */}
      <ApplyLeaveModal
        isOpen={isApplyLeaveOpen}
        onClose={() => setIsApplyLeaveOpen(false)}
      />
      <NewExpenseModal
        isOpen={isSubmitExpenseOpen}
        onClose={() => setIsSubmitExpenseOpen(false)}
      />
    </div>
  );
}

export function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}

export default App;
