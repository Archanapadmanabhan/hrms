import React from 'react';
import { useAuth } from '../../services/authContext';
import { HRDashboard } from './HRDashboard';
import { ManagerDashboard } from './ManagerDashboard';
import { EmployeeDashboard } from './EmployeeDashboard';
import { NavTab } from '../layout/Sidebar';
import { NavigationContext } from '../../types/hrms';

interface DashboardHubProps {
  onNavigate: (tab: NavTab, context?: NavigationContext) => void;
  onOpenApplyLeave?: () => void;
  onOpenSubmitExpense?: () => void;
}

export const DashboardHub: React.FC<DashboardHubProps> = ({
  onNavigate,
  onOpenApplyLeave,
  onOpenSubmitExpense
}) => {
  const { currentUser } = useAuth();

  if (currentUser.role === 'hr_admin') {
    return <HRDashboard onNavigate={onNavigate} />;
  }

  if (currentUser.role === 'senior_manager' || currentUser.role === 'reporting_manager') {
    return <ManagerDashboard onNavigate={onNavigate} />;
  }

  return (
    <EmployeeDashboard
      onNavigate={onNavigate}
      onOpenApplyLeave={onOpenApplyLeave}
      onOpenSubmitExpense={onOpenSubmitExpense}
    />
  );
};

