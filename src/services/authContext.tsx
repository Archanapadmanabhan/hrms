import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { CurrentUser, UserRole, Employee } from '../types/hrms';
import { personaUsers } from '../db/initialData';
import { db, initDatabase, subscribeToDB } from '../db/storage';

interface AuthContextType {
  currentUser: CurrentUser;
  currentEmployee?: Employee;
  switchPersona: (userId: string) => void;
  allPersonas: CurrentUser[];
  canAccessModule: (module: 'hr' | 'organization' | 'clients' | 'leave' | 'payroll' | 'expenses' | 'assets' | 'attendance' | 'reports' | 'settings') => boolean;
  canViewConfidentialSalary: (targetEmployeeId: string) => boolean;
  canManageOrganization: () => boolean;
  canProcessPayroll: () => boolean;
  canApproveRequestFor: (requesterEmployeeId: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function enrichPersonaWithLiveEmployee(persona: CurrentUser): CurrentUser {
  const emp = db.getEmployeeById(persona.employeeId);
  if (!emp) return persona;
  const desig = db.getDesignations().find((d) => d.id === emp.designationId);
  const fullName = `${emp.firstName} ${emp.lastName}`.trim();
  const fallbackAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(
    fullName || persona.name
  )}&background=4f46e5&color=fff&size=256`;
  return {
    ...persona,
    name: fullName || persona.name,
    email: emp.officialEmail || emp.email || persona.email,
    departmentId: emp.departmentId || persona.departmentId,
    designationTitle: desig?.title || persona.designationTitle,
    avatarUrl: emp.avatarUrl && emp.avatarUrl.trim() ? emp.avatarUrl : fallbackAvatar
  };
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selectedUserId, setSelectedUserId] = useState<string>(() => {
    initDatabase();
    const savedUserId = localStorage.getItem('orbyx_hrms_current_user_id');
    const found = personaUsers.find((p) => p.id === savedUserId);
    const defaultUser = personaUsers.find((p) => p.id === 'user_hr_admin') || personaUsers[0];
    return (found || defaultUser).id;
  });

  const [dbTick, setDbTick] = useState(0);

  useEffect(() => {
    return subscribeToDB(() => {
      setDbTick((t) => t + 1);
    });
  }, []);

  const allPersonas = useMemo(() => {
    void dbTick;
    return personaUsers.map(enrichPersonaWithLiveEmployee);
  }, [dbTick]);

  const currentUser = useMemo(() => {
    return allPersonas.find((p) => p.id === selectedUserId) || allPersonas[0];
  }, [allPersonas, selectedUserId]);

  const currentEmployee = useMemo(() => {
    void dbTick;
    return db.getEmployeeById(currentUser.employeeId);
  }, [currentUser.employeeId, dbTick]);

  const switchPersona = (userId: string) => {
    const target = personaUsers.find((p) => p.id === userId);
    if (!target) return;
    // Block any non-internal or client-related role/account per Section 3
    const roleLower = String(target.role).toLowerCase();
    if (roleLower.includes('client') || roleLower.includes('external')) {
      return;
    }
    setSelectedUserId(target.id);
    localStorage.setItem('orbyx_hrms_current_user_id', target.id);
    const enriched = enrichPersonaWithLiveEmployee(target);
    db.logAudit({
      actorUserId: enriched.id,
      actorName: enriched.name,
      actorRole: enriched.role,
      action: 'LOGIN',
      module: 'SYSTEM',
      entityId: enriched.id,
      entityName: enriched.name,
      description: `Switched active session to internal persona ${enriched.name} (${enriched.role})`
    });
  };

  // Module Access checks (Strictly internal Orbyx roles only)
  const canAccessModule = (module: 'hr' | 'organization' | 'clients' | 'leave' | 'payroll' | 'expenses' | 'assets' | 'attendance' | 'reports' | 'settings'): boolean => {
    const roleLower = String(currentUser.role).toLowerCase();
    if (roleLower.includes('client') || roleLower.includes('external')) return false;
    if (currentUser.role === 'hr_admin') return true;

    if (module === 'settings') return false;
    if (module === 'organization') return currentUser.role === 'senior_manager';
    if (module === 'clients') return true; // Employees see only their own client assignments in the module.

    if (module === 'reports') {
      // Organization-wide Reports and Analytics is strictly for HR Admin and Senior Management (Dr. Selvakumar)
      // Blocked for regular employees and reporting managers (Krishnaraj) per Section 7.2 and 7.3
      return currentUser.role === 'senior_manager';
    }

    if (currentUser.role === 'senior_manager') {
      return true;
    }

    if (currentUser.role === 'reporting_manager') {
      return true;
    }

    if (currentUser.role === 'employee') {
      // Employees access self-service views and directory
      return true;
    }

    return false;
  };

  // Field-level access: Salary, Bank info
  const canViewConfidentialSalary = (targetEmployeeId: string): boolean => {
    if (currentUser.role === 'hr_admin') return true;
    // Employees and managers can view only their own salary
    return currentUser.employeeId === targetEmployeeId;
  };

  const canManageOrganization = (): boolean => {
    return currentUser.role === 'hr_admin';
  };

  const canProcessPayroll = (): boolean => {
    return currentUser.role === 'hr_admin';
  };

  // Hierarchy check: Manager can approve if employee reports to them. Self-approval strictly forbidden!
  const canApproveRequestFor = (requesterEmployeeId: string): boolean => {
    if (requesterEmployeeId === currentUser.employeeId) return false; // Self-approval prohibited
    if (currentUser.role === 'hr_admin') return true;
    const requester = db.getEmployeeById(requesterEmployeeId);
    if (!requester) return false;
    // Direct report check
    return requester.reportingManagerId === currentUser.employeeId;
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        currentEmployee,
        switchPersona,
        allPersonas,
        canAccessModule,
        canViewConfidentialSalary,
        canManageOrganization,
        canProcessPayroll,
        canApproveRequestFor
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
