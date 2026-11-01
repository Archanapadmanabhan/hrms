import {
  Employee,
  CurrentUser,
  Permission,
  BasicDirectoryEmployee,
  AccessScope,
  ProfileViewResult
} from '../types/hrms';
import { db } from '../db/storage';

export const ROLE_PERMISSIONS: Record<string, Permission[]> = {
  hr_admin: [
    'employee.profile.read_self',
    'employee.profile.update_self',
    'employee.directory.read_basic',
    'employee.profile.read_team',
    'employee.profile.read_all',
    'employee.profile.read_org',
    'employee.profile.read_sensitive',
    'employee.documents.read_team',
    'employee.documents.read_all',
    'employee.salary.read',
    'employee.bank_details.read',
    'employee.identity_documents.read',
    'employee.leave.read_team',
    'employee.attendance.read_team',
    'employee.expenses.read_team',
    'employee.assets.read_team',
    'employee.assets.read_all',
    'employee.assets.administer',
    'reports.organization.read',
    'leave.approve_team',
    'expenses.approve_team',
    'attendance.approve_team',
    'payroll.process'
  ],
  senior_manager: [
    'employee.profile.read_self',
    'employee.profile.update_self',
    'employee.directory.read_basic',
    'employee.profile.read_team',
    'employee.profile.read_org',
    'employee.assets.read_all',
    'reports.organization.read',
    'leave.approve_team',
    'expenses.approve_team',
    'attendance.approve_team'
  ],
  reporting_manager: [
    'employee.profile.read_self',
    'employee.profile.update_self',
    'employee.directory.read_basic',
    'employee.profile.read_team',
    'employee.documents.read_team',
    'employee.leave.read_team',
    'employee.attendance.read_team',
    'employee.expenses.read_team',
    'employee.assets.read_team',
    'leave.approve_team',
    'expenses.approve_team',
    'attendance.approve_team'
  ],
  employee: [
    'employee.profile.read_self',
    'employee.profile.update_self',
    'employee.directory.read_basic'
  ]
};

const ALLOWED_INTERNAL_ROLES = new Set(['employee', 'reporting_manager', 'hr_admin', 'senior_manager']);

export const permissionService = {
  /**
   * Section 3 Strict Access Control:
   * Orbyx HRMS is strictly an internal company HRMS.
   * Rejects any external client supervisor, client manager, client HR, or non-company account.
   */
  isInternalCompanyUser(user: Partial<CurrentUser> | null | undefined): boolean {
    if (!user || !user.id || !user.role || !user.employeeId) return false;
    const roleLower = String(user.role).toLowerCase();
    if (roleLower.includes('client') || roleLower.includes('external') || roleLower.includes('vendor')) {
      return false;
    }
    if (!ALLOWED_INTERNAL_ROLES.has(user.role)) return false;
    // Must map to an actual internal company employee record
    const emp = db.getEmployeeById(user.employeeId);
    if (!emp) return false;
    return true;
  },

  validateLoginAttempt(candidate: Partial<CurrentUser> & { organizationType?: string }): {
    allowed: boolean;
    reason?: string;
  } {
    if (!candidate) {
      return { allowed: false, reason: 'Invalid user credentials.' };
    }
    const roleStr = String(candidate.role || '').toLowerCase();
    const emailStr = String(candidate.email || '').toLowerCase();
    if (
      candidate.organizationType === 'external_client' ||
      roleStr.includes('client') ||
      roleStr.includes('external') ||
      (!emailStr.endsWith('@orbyx.internal') && !emailStr.endsWith('@orbyx.com'))
    ) {
      return {
        allowed: false,
        reason:
          'Access Denied: Orbyx HRMS is strictly restricted to internal company personnel. External client supervisors and client staff do not have login accounts and must verify attendance via external email confirmation.'
      };
    }
    if (!this.isInternalCompanyUser(candidate)) {
      return {
        allowed: false,
        reason: 'Access Denied: User does not match an active internal Orbyx employee record or permitted internal role.'
      };
    }
    return { allowed: true };
  },

  canRecordClientEmailVerification(actor: CurrentUser, targetEmployeeId?: string): boolean {
    if (!this.isInternalCompanyUser(actor)) return false;
    if (targetEmployeeId && actor.employeeId === targetEmployeeId && actor.role === 'employee') {
      return false; // Employees cannot record their own client supervisor verification
    }
    return (
      actor.role === 'hr_admin' ||
      actor.role === 'reporting_manager' ||
      actor.role === 'senior_manager'
    );
  },

  canApproveCompanyAttendance(actor: CurrentUser, targetEmployeeId: string): boolean {
    if (!this.isInternalCompanyUser(actor)) return false;
    if (actor.employeeId === targetEmployeeId) return false; // Strict no self-approval
    if (actor.role === 'hr_admin' || actor.role === 'senior_manager') return true;
    if (actor.role === 'reporting_manager') {
      const target = db.getEmployeeById(targetEmployeeId);
      return Boolean(target && target.reportingManagerId === actor.employeeId);
    }
    return false;
  },

  hasPermission(role: string, permission: Permission): boolean {
    if (!ALLOWED_INTERNAL_ROLES.has(role)) return false;
    const list = ROLE_PERMISSIONS[role] || [];
    return list.includes(permission);
  },

  isSelf(targetEmployeeId: string, currentUser: CurrentUser): boolean {
    return targetEmployeeId === currentUser.employeeId;
  },

  isDirectReport(targetEmployeeId: string, currentUser: CurrentUser): boolean {
    const target = db.getEmployeeById(targetEmployeeId);
    if (!target) return false;
    return target.reportingManagerId === currentUser.employeeId;
  },

  resolveAccessScope(targetEmployeeId: string, currentUser: CurrentUser): AccessScope {
    if (!this.isInternalCompanyUser(currentUser)) {
      return 'colleague_basic';
    }
    if (this.isSelf(targetEmployeeId, currentUser)) {
      return 'self';
    }
    if (currentUser.role === 'hr_admin') {
      return 'organization_admin';
    }
    if (this.isDirectReport(targetEmployeeId, currentUser)) {
      return 'direct_report';
    }
    if (currentUser.role === 'senior_manager') {
      return 'senior_management';
    }
    return 'colleague_basic';
  },

  /**
   * Field Filtering & Authorization Enforcement:
   * Returns ONLY the fields permitted for that relationship and role.
   * Strips out all confidential fields when viewed by a colleague.
   * Pure read function — safe to call during React render without side-effects.
   */
  getAuthorizedProfile(targetEmployeeId: string, currentUser: CurrentUser): ProfileViewResult | null {
    const raw = db.getEmployeeById(targetEmployeeId);
    if (!raw) return null;

    const scope = this.resolveAccessScope(targetEmployeeId, currentUser);

    if (scope === 'colleague_basic') {
      // Regular employee viewing a colleague, or manager viewing an unrelated employee outside hierarchy
      const basicProfile: BasicDirectoryEmployee = {
        id: raw.id,
        firstName: raw.firstName,
        lastName: raw.lastName,
        officialEmail: raw.officialEmail || raw.email,
        officialPhone: raw.officialPhone || raw.phone,
        avatarUrl: raw.avatarUrl,
        viewScope: 'colleague_basic'
      };
      return basicProfile;
    }

    if (scope === 'direct_report' || scope === 'senior_management') {
      // Reporting Manager or Senior Manager viewing authorized employee
      // Salary and sensitive bank details are masked unless explicit permission exists
      const sanitized: Employee = {
        ...raw,
        officialEmail: raw.officialEmail || raw.email,
        officialPhone: raw.officialPhone || raw.phone,
        // Mask confidential financial details
        baseSalaryAnnual: 0,
        bankDetails: {
          accountNumber: '••••••••••••',
          bankName: raw.bankDetails.bankName,
          ifscOrRouting: '••••••••',
          accountType: raw.bankDetails.accountType
        },
        panOrTaxNumber: '••••••••••'
      };

      return {
        ...sanitized,
        viewScope: scope,
        canViewSalary: false
      };
    }

    if (scope === 'self') {
      return {
        ...raw,
        officialEmail: raw.officialEmail || raw.email,
        officialPhone: raw.officialPhone || raw.phone,
        viewScope: 'self',
        canViewSalary: true
      };
    }

    // Organization Admin (HR)
    return {
      ...raw,
      officialEmail: raw.officialEmail || raw.email,
      officialPhone: raw.officialPhone || raw.phone,
      viewScope: 'organization_admin',
      canViewSalary: true
    };
  },

  /**
   * Logs an audit trail entry when an authorized manager, senior manager, or HR admin opens an employee profile.
   * Must be invoked in an effect or event handler (never during component render).
   */
  logProfileAccessAudit(targetEmployeeId: string, currentUser: CurrentUser): void {
    const raw = db.getEmployeeById(targetEmployeeId);
    if (!raw) return;
    const scope = this.resolveAccessScope(targetEmployeeId, currentUser);
    if (scope === 'direct_report' || scope === 'senior_management' || scope === 'organization_admin') {
      db.logAudit({
        actorUserId: currentUser.id,
        actorName: currentUser.name,
        actorRole: currentUser.role,
        action: 'UPDATE',
        module: 'EMPLOYEE',
        entityId: raw.id,
        entityName: `${raw.firstName} ${raw.lastName}`,
        description:
          scope === 'organization_admin'
            ? `HR Admin accessed employee record ${raw.id} (org admin scope)`
            : `${currentUser.role} accessed profile ${raw.id} (${scope} scope)`
      });
    }
  },

  /**
   * Enforces document download and read access:
   * Only HR Admin, Self, Direct Reporting Manager, or Senior Manager can access documents.
   */
  canAccessEmployeeDocuments(targetEmployeeId: string, currentUser: CurrentUser): boolean {
    const scope = this.resolveAccessScope(targetEmployeeId, currentUser);
    return scope === 'self' || scope === 'direct_report' || scope === 'senior_management' || scope === 'organization_admin';
  },

  /**
   * Serializes directory rows for the requesting user.
   * Deactivated / Inactive employees are removed from regular active directory listings.
   */
  getAuthorizedDirectoryRows(currentUser: CurrentUser): (BasicDirectoryEmployee | (Employee & { isDirectReport?: boolean }))[] {
    const all = db.getEmployees();
    const activeEmployees = all.filter((e) => e.status !== 'Inactive' && e.status !== 'Separated');

    if (currentUser.role === 'employee') {
      // Regular Employees see ONLY the permitted basic directory fields of active colleagues
      return activeEmployees.map((e) => ({
        id: e.id,
        firstName: e.firstName,
        lastName: e.lastName,
        officialEmail: e.officialEmail || e.email,
        officialPhone: e.officialPhone || e.phone,
        avatarUrl: e.avatarUrl,
        viewScope: 'colleague_basic' as const
      }));
    }

    if (currentUser.role === 'reporting_manager') {
      // Reporting Manager (Krishnaraj) sees detailed rows for their 8 direct reports, basic directory for other active employees
      return activeEmployees.map((e) => {
        const isReport = e.reportingManagerId === currentUser.employeeId;
        if (isReport || e.id === currentUser.employeeId) {
          return {
            ...e,
            officialEmail: e.officialEmail || e.email,
            officialPhone: e.officialPhone || e.phone,
            isDirectReport: isReport
          };
        }
        return {
          id: e.id,
          firstName: e.firstName,
          lastName: e.lastName,
          officialEmail: e.officialEmail || e.email,
          officialPhone: e.officialPhone || e.phone,
          avatarUrl: e.avatarUrl,
          viewScope: 'colleague_basic' as const
        };
      });
    }

    if (currentUser.role === 'senior_manager') {
      // Senior Manager (Dr. Selvakumar) sees authorized organizational profiles (with sensitive fields masked)
      return activeEmployees.map((e) => ({
        ...e,
        officialEmail: e.officialEmail || e.email,
        officialPhone: e.officialPhone || e.phone,
        isDirectReport: e.reportingManagerId === currentUser.employeeId
      }));
    }

    // HR Admin: complete directory (both active and inactive)
    return all.map((e) => ({
      ...e,
      officialEmail: e.officialEmail || e.email,
      officialPhone: e.officialPhone || e.phone
    }));
  },

  /**
   * Generates sanitized CSV export records according to user authorization.
   */
  getAuthorizedDirectoryExport(currentUser: CurrentUser): Record<string, any>[] {
    const rows = this.getAuthorizedDirectoryRows(currentUser);
    const departments = db.getDepartments();
    const designations = db.getDesignations();
    const branches = db.getBranches();

    if (currentUser.role === 'employee') {
      // Regular employees: ONLY Name, Official Mobile, Official Email
      return rows.map((r) => ({
        Name: `${r.firstName} ${r.lastName}`.trim(),
        'Official Mobile Number': (r as BasicDirectoryEmployee).officialPhone,
        'Official Email Address': (r as BasicDirectoryEmployee).officialEmail
      }));
    }

    if (currentUser.role === 'reporting_manager') {
      // Manager export: detailed for team, basic for others
      return rows.map((r) => {
        if ('viewScope' in r && r.viewScope === 'colleague_basic') {
          return {
            Name: `${r.firstName} ${r.lastName}`.trim(),
            'Official Mobile Number': r.officialPhone,
            'Official Email Address': r.officialEmail,
            Scope: 'Organization Colleague'
          };
        }
        const emp = r as Employee;
        return {
          Name: `${emp.firstName} ${emp.lastName}`.trim(),
          'Official Mobile Number': emp.officialPhone || emp.phone,
          'Official Email Address': emp.officialEmail || emp.email,
          Department: departments.find((d) => d.id === emp.departmentId)?.name || '',
          Designation: designations.find((d) => d.id === emp.designationId)?.title || '',
          Branch: branches.find((b) => b.id === emp.branchId)?.name || '',
          Status: emp.status,
          Scope: emp.reportingManagerId === currentUser.employeeId ? 'Direct Report' : 'Self'
        };
      });
    }

    // HR Admin & Senior Manager full export
    return (rows as Employee[]).map((e) => ({
      EmployeeID: e.id,
      Name: `${e.firstName} ${e.lastName}`.trim(),
      OfficialEmail: e.officialEmail || e.email,
      OfficialPhone: e.officialPhone || e.phone,
      Department: departments.find((d) => d.id === e.departmentId)?.name || '',
      Designation: designations.find((d) => d.id === e.designationId)?.title || '',
      Branch: branches.find((b) => b.id === e.branchId)?.name || '',
      Status: e.status,
      EmploymentType: e.employmentType,
      DateOfJoining: e.dateOfJoining
    }));
  }
};
