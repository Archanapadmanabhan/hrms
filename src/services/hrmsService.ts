import {
  Employee,
  LeaveApplication,
  LeaveBalance,
  AttendanceRecord,
  AttendanceCorrectionRequest,
  ExpenseClaim,
  Asset,
  PayrollRun,
  PayrollLineItem,
  AuditLog,
  ClientEmailConfirmation,
  ClientVerificationStatus,
  CompanyApprovalStatus,
  PayrollEligibilityStatus,
  DisputeResolutionDecision
} from '../types/hrms';
import { db } from '../db/storage';
import { permissionService } from './permissionService';

export const hrmsService = {
  // ---------------- MODULE 1: EMPLOYEES ----------------
  generateNextEmployeeId(): string {
    const employees = db.getEmployees();
    const numbers = employees
      .map((e) => {
        const match = e.id.match(/\d+/);
        return match ? parseInt(match[0], 10) : 0;
      })
      .filter((n) => !isNaN(n));
    const max = numbers.length > 0 ? Math.max(...numbers) : 0;
    return `EMP-${String(max + 1).padStart(3, '0')}`;
  },

  createEmployee(employeeData: Omit<Employee, 'id' | 'createdAt' | 'updatedAt'>, actorUserId: string, actorName: string): Employee {
    const id = this.generateNextEmployeeId();
    const now = new Date().toISOString();
    const newEmp: Employee = {
      ...employeeData,
      id,
      createdAt: now,
      updatedAt: now
    };
    db.saveEmployee(newEmp);

    db.logAudit({
      actorUserId,
      actorName,
      actorRole: 'hr_admin',
      action: 'CREATE',
      module: 'EMPLOYEE',
      entityId: id,
      entityName: `${newEmp.firstName} ${newEmp.lastName}`,
      description: `Created new employee profile ${id} in ${newEmp.departmentId}`
    });

    db.addNotification({
      targetUserId: 'all',
      title: 'New Team Member',
      message: `${newEmp.firstName} ${newEmp.lastName} has joined Orbyx!`,
      module: 'employee'
    });

    return newEmp;
  },

  updateEmployee(employee: Employee, actorUserId: string, actorName: string): void {
    const updated = { ...employee, updatedAt: new Date().toISOString() };
    db.saveEmployee(updated);

    db.logAudit({
      actorUserId,
      actorName,
      actorRole: 'hr_admin',
      action: 'UPDATE',
      module: 'EMPLOYEE',
      entityId: employee.id,
      entityName: `${employee.firstName} ${employee.lastName}`,
      description: `Updated employee profile attributes for ${employee.id}`
    });
  },

  // ---------------- MODULE 2: LEAVE ----------------
  calculateWorkingDays(startDateStr: string, endDateStr: string, isHalfDay: boolean): number {
    if (isHalfDay) return 0.5;

    const start = new Date(startDateStr);
    const end = new Date(endDateStr);
    if (start > end) return 0;

    const holidays = db.getHolidays().map((h) => h.date);
    let count = 0;
    const current = new Date(start);

    while (current <= end) {
      const dayOfWeek = current.getDay(); // 0 is Sunday, 6 is Saturday
      const dateString = current.toISOString().split('T')[0];
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const isHoliday = holidays.includes(dateString);

      if (!isWeekend && !isHoliday) {
        count++;
      }
      current.setDate(current.getDate() + 1);
    }

    return Math.max(count, 1); // Minimum 1 working day if within range
  },

  getLeaveBalance(employeeId: string, leaveTypeId: string): LeaveBalance {
    const leaveType = db.getLeaveTypes().find((lt) => lt.id === leaveTypeId);
    const totalEntitled = leaveType ? leaveType.annualEntitlement : 0;

    const apps = db.getLeaveApplications().filter(
      (a) => a.employeeId === employeeId && a.leaveTypeId === leaveTypeId
    );

    let taken = 0;
    let pending = 0;

    apps.forEach((a) => {
      if (a.status === 'Approved') taken += a.totalDays;
      else if (a.status === 'Pending Approval') pending += a.totalDays;
    });

    return {
      employeeId,
      leaveTypeId,
      totalEntitled,
      taken,
      pending,
      remaining: Math.max(0, totalEntitled - taken - pending)
    };
  },

  applyLeave(
    data: {
      employeeId: string;
      leaveTypeId: string;
      startDate: string;
      endDate: string;
      isHalfDay: boolean;
      halfDayPeriod?: 'First Half' | 'Second Half';
      reason: string;
      attachmentName?: string;
    },
    actorUserId: string,
    actorName: string
  ): { success: boolean; error?: string; application?: LeaveApplication } {
    const emp = db.getEmployeeById(data.employeeId);
    if (!emp) return { success: false, error: 'Employee not found' };

    const leaveType = db.getLeaveTypes().find((l) => l.id === data.leaveTypeId);
    if (!leaveType || leaveType.isActive === false) {
      return { success: false, error: 'Selected leave type is inactive or unavailable under current policy.' };
    }

    // Check overlapping approved/pending leaves
    const existingApps = db.getLeaveApplications().filter(
      (a) =>
        a.employeeId === data.employeeId &&
        (a.status === 'Approved' || a.status === 'Pending Approval')
    );

    for (const app of existingApps) {
      if (data.startDate <= app.endDate && data.endDate >= app.startDate) {
        return {
          success: false,
          error: `Dates overlap with existing application (${app.startDate} to ${app.endDate}, status: ${app.status})`
        };
      }
    }

    const totalDays = this.calculateWorkingDays(data.startDate, data.endDate, data.isHalfDay);
    if (leaveType.maxConsecutiveDays && totalDays > leaveType.maxConsecutiveDays) {
      return {
        success: false,
        error: `Policy limit exceeded: Maximum ${leaveType.maxConsecutiveDays} consecutive working days allowed for ${leaveType.name}.`
      };
    }

    const balance = this.getLeaveBalance(data.employeeId, data.leaveTypeId);

    if (leaveType.isPaid && !leaveType.allowNegativeBalance && totalDays > balance.remaining) {
      return {
        success: false,
        error: `Insufficient leave balance. Requested ${totalDays} days, but only ${balance.remaining} days available.`
      };
    }

    const approverId = emp.reportingManagerId || 'EMP-001'; // Fallback to HR lead
    const approver = db.getEmployeeById(approverId);

    const newApp: LeaveApplication = {
      id: `LV-APP-${Date.now()}`,
      employeeId: data.employeeId,
      leaveTypeId: data.leaveTypeId,
      startDate: data.startDate,
      endDate: data.endDate,
      isHalfDay: data.isHalfDay,
      halfDayPeriod: data.halfDayPeriod,
      totalDays,
      reason: data.reason,
      attachmentName: data.attachmentName,
      status: 'Pending Approval',
      approverId,
      appliedAt: new Date().toISOString()
    };

    db.saveLeaveApplication(newApp);

    // Notify Approver
    if (approver) {
      db.addNotification({
        targetUserId: approver.userId,
        title: 'Leave Approval Requested',
        message: `${emp.firstName} ${emp.lastName} requested ${totalDays} day(s) of ${leaveType.name} from ${data.startDate}`,
        module: 'leave'
      });
    }

    db.logAudit({
      actorUserId,
      actorName,
      actorRole: 'employee',
      action: 'CREATE',
      module: 'LEAVE',
      entityId: newApp.id,
      entityName: `${emp.firstName} ${emp.lastName}`,
      description: `Applied for ${totalDays} day(s) of ${leaveType.name} (${data.startDate} to ${data.endDate})`
    });

    return { success: true, application: newApp };
  },

  decideLeave(
    applicationId: string,
    decision: 'Approved' | 'Rejected',
    comments: string,
    actorUserId: string,
    actorName: string
  ): { success: boolean; error?: string } {
    const apps = db.getLeaveApplications();
    const app = apps.find((a) => a.id === applicationId);
    if (!app) return { success: false, error: 'Application not found' };

    // Prevent prohibited self-approval per Section 9.3
    const actorEmployee = db.getEmployeeByUserId(actorUserId);
    if (actorEmployee && actorEmployee.id === app.employeeId) {
      return { success: false, error: 'Unauthorized: Self-approval is strictly prohibited by organizational policy.' };
    }

    app.status = decision;
    app.approvalComments = comments;
    app.decidedAt = new Date().toISOString();
    db.saveLeaveApplication(app);

    const emp = db.getEmployeeById(app.employeeId);
    if (emp) {
      db.addNotification({
        targetUserId: emp.userId,
        title: `Leave Application ${decision}`,
        message: `Your leave request for ${app.startDate} has been ${decision.toLowerCase()} by ${actorName}.`,
        module: 'leave'
      });
    }

    db.logAudit({
      actorUserId,
      actorName,
      actorRole: 'senior_manager',
      action: decision === 'Approved' ? 'APPROVE' : 'REJECT',
      module: 'LEAVE',
      entityId: app.id,
      entityName: `${emp ? emp.firstName + ' ' + emp.lastName : app.employeeId}`,
      description: `${decision} leave request (${app.totalDays} days) with note: "${comments || 'No comments'}"`
    });

    return { success: true };
  },

  // ---------------- MODULE 4: EXPENSES ----------------
  submitExpenseClaim(
    data: {
      employeeId: string;
      categoryId: string;
      title: string;
      amount: number;
      currency: string;
      expenseDate: string;
      businessPurpose: string;
      receiptFileName?: string;
    },
    actorUserId: string,
    actorName: string
  ): { success: boolean; error?: string; claim?: ExpenseClaim } {
    const emp = db.getEmployeeById(data.employeeId);
    if (!emp) return { success: false, error: 'Employee not found' };

    const category = db.getExpenseCategories().find((c) => c.id === data.categoryId);
    if (!category) return { success: false, error: 'Invalid expense category' };

    if (category.maxLimitPerClaim && data.amount > category.maxLimitPerClaim) {
      return {
        success: false,
        error: `Amount exceeds maximum limit of ₹${category.maxLimitPerClaim.toLocaleString()} for category ${category.name}`
      };
    }

    // Check duplicate claim warning
    const duplicates = db.getExpenseClaims().filter(
      (c) =>
        c.employeeId === data.employeeId &&
        c.expenseDate === data.expenseDate &&
        c.amount === data.amount &&
        c.categoryId === data.categoryId &&
        c.status !== 'Rejected'
    );

    if (duplicates.length > 0) {
      return {
        success: false,
        error: `A matching expense claim (${duplicates[0].claimNumber}) with the same amount and date is already pending or approved.`
      };
    }

    const approverId = emp.reportingManagerId || 'EMP-001';
    const approver = db.getEmployeeById(approverId);
    const claimNumber = `EXP-2026-${String(db.getExpenseClaims().length + 1).padStart(3, '0')}`;

    const newClaim: ExpenseClaim = {
      id: `EXP-ID-${Date.now()}`,
      claimNumber,
      employeeId: data.employeeId,
      categoryId: data.categoryId,
      title: data.title,
      amount: data.amount,
      currency: data.currency || 'INR',
      expenseDate: data.expenseDate,
      businessPurpose: data.businessPurpose,
      receiptFileName: data.receiptFileName,
      status: 'Pending Manager Approval',
      approverId,
      submittedAt: new Date().toISOString()
    };

    db.saveExpenseClaim(newClaim);

    if (approver) {
      db.addNotification({
        targetUserId: approver.userId,
        title: 'Expense Claim Submitted',
        message: `${emp.firstName} ${emp.lastName} submitted claim ${claimNumber} (₹${data.amount.toLocaleString()}) for approval.`,
        module: 'expense'
      });
    }

    db.logAudit({
      actorUserId,
      actorName,
      actorRole: 'employee',
      action: 'CREATE',
      module: 'EXPENSE',
      entityId: newClaim.id,
      entityName: claimNumber,
      description: `Submitted claim for ₹${data.amount} (${category.name})`
    });

    return { success: true, claim: newClaim };
  },

  decideExpenseClaim(
    claimId: string,
    decision: 'Approved' | 'Rejected',
    comments: string,
    actorUserId: string,
    actorName: string
  ): { success: boolean; error?: string } {
    const claims = db.getExpenseClaims();
    const claim = claims.find((c) => c.id === claimId);
    if (!claim) return { success: false, error: 'Claim not found' };

    // Prevent prohibited self-approval per Section 9.3
    const actorEmployee = db.getEmployeeByUserId(actorUserId);
    if (actorEmployee && actorEmployee.id === claim.employeeId) {
      return { success: false, error: 'Unauthorized: Self-approval is strictly prohibited by organizational policy.' };
    }

    claim.status = decision === 'Approved' ? 'Pending Reimbursement' : 'Rejected';
    claim.approvalComments = comments;
    claim.decidedAt = new Date().toISOString();
    db.saveExpenseClaim(claim);

    const emp = db.getEmployeeById(claim.employeeId);
    if (emp) {
      db.addNotification({
        targetUserId: emp.userId,
        title: `Expense Claim ${decision}`,
        message: `Your claim ${claim.claimNumber} (₹${claim.amount.toLocaleString()}) was ${decision.toLowerCase()}.`,
        module: 'expense'
      });
    }

    db.logAudit({
      actorUserId,
      actorName,
      actorRole: 'senior_manager',
      action: decision === 'Approved' ? 'APPROVE' : 'REJECT',
      module: 'EXPENSE',
      entityId: claim.id,
      entityName: claim.claimNumber,
      description: `${decision} expense claim for ₹${claim.amount}. Note: "${comments || 'None'}"`
    });

    return { success: true };
  },

  reimburseExpenseClaim(
    claimId: string,
    paymentReference: string,
    actorUserId: string,
    actorName: string
  ): void {
    const claims = db.getExpenseClaims();
    const claim = claims.find((c) => c.id === claimId);
    if (!claim) return;

    claim.status = 'Reimbursed';
    claim.reimbursementReference = paymentReference;
    claim.reimbursedAt = new Date().toISOString();
    db.saveExpenseClaim(claim);

    const emp = db.getEmployeeById(claim.employeeId);
    if (emp) {
      db.addNotification({
        targetUserId: emp.userId,
        title: 'Expense Claim Reimbursed',
        message: `Reimbursement for claim ${claim.claimNumber} (₹${claim.amount.toLocaleString()}) processed via Ref #${paymentReference}.`,
        module: 'expense'
      });
    }

    db.logAudit({
      actorUserId,
      actorName,
      actorRole: 'hr_admin',
      action: 'REIMBURSE',
      module: 'EXPENSE',
      entityId: claim.id,
      entityName: claim.claimNumber,
      description: `Reimbursed ₹${claim.amount} via reference ${paymentReference}`
    });
  },

  // ---------------- MODULE 5: ASSETS ----------------
  getAssetLifecycleActions(
    asset: Asset,
    isHR: boolean,
    currentEmployeeId: string
  ): {
    canView: boolean;
    canEdit: boolean;
    canAllocate: boolean;
    canReturn: boolean;
    canMarkAvailable: boolean;
    canRetire: boolean;
    canUnretire: boolean;
    canDeactivate: boolean;
    deactivateBlockedReason?: string;
    canActivate: boolean;
    canAcknowledge: boolean;
  } {
    const isActiveRecord = asset.isActive !== false && asset.status !== 'Inactive';
    const isAllocated = asset.status === 'Allocated' || asset.status === 'In Use';
    const isAvailableOrReturned = asset.status === 'Available' || asset.status === 'Returned';
    const isUnderMaintenance = asset.status === 'Under Maintenance';
    const isRetired = asset.status === 'Retired';
    const isAssignedToMe = asset.currentEmployeeId === currentEmployeeId;

    return {
      canView: true,
      canEdit: isHR,
      canAllocate: isHR && isActiveRecord && isAvailableOrReturned,
      canReturn: isHR && isActiveRecord && isAllocated,
      canMarkAvailable: isHR && isActiveRecord && (isUnderMaintenance || asset.status === 'Returned'),
      canRetire: isHR && isActiveRecord && !isAllocated && !isRetired,
      canUnretire: isHR && isActiveRecord && isRetired,
      canDeactivate: isHR && isActiveRecord,
      deactivateBlockedReason:
        isHR && isActiveRecord && isAllocated
          ? `Asset ${asset.assetTag} is currently allocated to ${asset.currentEmployeeId}. Please return or unassign the asset before deactivating it.`
          : undefined,
      canActivate: isHR && !isActiveRecord,
      canAcknowledge: isAssignedToMe && isAllocated && !asset.acknowledgedByEmployee
    };
  },

  allocateAsset(
    assetId: string,
    employeeId: string,
    condition: any,
    actorUserId: string,
    actorName: string
  ): { success: boolean; error?: string } {
    const asset = db.getAssetById(assetId);
    if (!asset) return { success: false, error: 'Asset not found' };
    if (asset.isActive === false || asset.status === 'Inactive') {
      return { success: false, error: 'Cannot allocate an inactive asset. Activate the asset first.' };
    }
    if (asset.status === 'Allocated' || asset.status === 'In Use') {
      return { success: false, error: `Asset is already allocated to employee ${asset.currentEmployeeId}` };
    }

    const emp = db.getEmployeeById(employeeId);
    if (!emp) return { success: false, error: 'Employee not found' };

    asset.status = 'Allocated';
    asset.isActive = true;
    asset.currentEmployeeId = employeeId;
    asset.allocatedDate = new Date().toISOString().split('T')[0];
    asset.condition = condition;
    asset.acknowledgedByEmployee = false;
    db.saveAsset(asset);

    db.addNotification({
      targetUserId: emp.userId,
      title: 'New Asset Assigned',
      message: `${asset.name} (${asset.assetTag}) has been allocated to you. Please acknowledge receipt.`,
      module: 'asset'
    });

    db.logAudit({
      actorUserId,
      actorName,
      actorRole: 'hr_admin',
      action: 'ALLOCATE',
      module: 'ASSET',
      entityId: asset.id,
      entityName: asset.assetTag,
      description: `Allocated ${asset.name} to ${emp.firstName} ${emp.lastName}`
    });

    return { success: true };
  },

  acknowledgeAssetReceipt(assetId: string, actorUserId: string, actorName: string): void {
    const asset = db.getAssetById(assetId);
    if (!asset) return;

    asset.acknowledgedByEmployee = true;
    asset.acknowledgedAt = new Date().toISOString();
    db.saveAsset(asset);

    db.logAudit({
      actorUserId,
      actorName,
      actorRole: 'employee',
      action: 'UPDATE',
      module: 'ASSET',
      entityId: asset.id,
      entityName: asset.assetTag,
      description: `Employee acknowledged receipt of asset ${asset.assetTag}`
    });
  },

  returnAsset(
    assetId: string,
    returnCondition: any,
    notes: string,
    actorUserId: string,
    actorName: string
  ): void {
    const asset = db.getAssetById(assetId);
    if (!asset) return;

    const previousEmpId = asset.currentEmployeeId;
    asset.status = 'Available';
    asset.isActive = true;
    asset.condition = returnCondition;
    asset.currentEmployeeId = undefined;
    asset.allocatedDate = undefined;
    asset.acknowledgedByEmployee = false;
    asset.notes = notes ? `${asset.notes || ''} | Returned: ${notes}` : asset.notes;
    db.saveAsset(asset);

    db.logAudit({
      actorUserId,
      actorName,
      actorRole: 'hr_admin',
      action: 'UPDATE',
      module: 'ASSET',
      entityId: asset.id,
      entityName: asset.assetTag,
      description: `Asset returned from ${previousEmpId || 'employee'} in condition: ${returnCondition} and marked Available`
    });
  },

  deactivateAsset(
    assetId: string,
    reason: string,
    actorUserId: string,
    actorName: string
  ): { success: boolean; error?: string } {
    const asset = db.getAssetById(assetId);
    if (!asset) return { success: false, error: 'Asset not found' };
    if (asset.status === 'Allocated' || asset.status === 'In Use') {
      return {
        success: false,
        error: `Asset ${asset.assetTag} is currently allocated to ${asset.currentEmployeeId}. Return the asset before deactivating.`
      };
    }

    asset.status = 'Inactive';
    asset.isActive = false;
    asset.deactivatedReason = reason || 'Administrative deactivation';
    asset.deactivatedAt = new Date().toISOString();
    asset.deactivatedBy = actorName;
    db.saveAsset(asset);

    db.logAudit({
      actorUserId,
      actorName,
      actorRole: 'hr_admin',
      action: 'UPDATE',
      module: 'ASSET',
      entityId: asset.id,
      entityName: asset.assetTag,
      description: `Deactivated asset ${asset.assetTag}. Reason: ${asset.deactivatedReason}`
    });

    return { success: true };
  },

  activateAsset(
    assetId: string,
    actorUserId: string,
    actorName: string
  ): { success: boolean; error?: string } {
    const asset = db.getAssetById(assetId);
    if (!asset) return { success: false, error: 'Asset not found' };

    asset.status = 'Available';
    asset.isActive = true;
    asset.deactivatedReason = undefined;
    db.saveAsset(asset);

    db.logAudit({
      actorUserId,
      actorName,
      actorRole: 'hr_admin',
      action: 'UPDATE',
      module: 'ASSET',
      entityId: asset.id,
      entityName: asset.assetTag,
      description: `Activated asset ${asset.assetTag} and restored status to Available`
    });

    return { success: true };
  },

  // ---------------- MODULE 6: SHIFTS, CLIENT-SITE ATTENDANCE & VERIFICATION ----------------
  getClientDeploymentsFromStorage(): Array<{
    id: string;
    clientId: string;
    employeeId: string;
    project: string;
    projectName: string;
    location: string;
    workMode: 'Onsite' | 'Remote' | 'Hybrid';
    startDate: string;
    plannedEndDate: string;
    actualEndDate?: string;
    allocation: number;
    allowanceMonthly?: number;
    reportingManagerId?: string;
    clientSupervisorName?: string;
    clientSupervisorEmail?: string;
    shiftId?: string;
    attendanceRules?: string;
    requiresClientVerification?: boolean;
    status: 'Planned' | 'Active' | 'Completed' | 'Cancelled';
  }> {
    try {
      const raw = localStorage.getItem('orbyx_hrms_client_assignments_v1');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((d: any) => ({
            ...d,
            project: d.project || d.projectName || 'Client Engagement',
            projectName: d.projectName || d.project || 'Client Engagement'
          }));
        }
      }
    } catch {
      // fallback below
    }
    return [
      {
        id: 'CAS-201',
        clientId: 'CLI-101',
        employeeId: 'EMP-003',
        project: 'Core Banking Ledger Modernization',
        projectName: 'Core Banking Ledger Modernization',
        location: 'Mumbai BKC Client Site',
        workMode: 'Onsite',
        startDate: '2026-06-01',
        plannedEndDate: '2026-12-31',
        allocation: 100,
        allowanceMonthly: 6500,
        reportingManagerId: 'EMP-002',
        clientSupervisorName: 'Vikramaditya Rao',
        clientSupervisorEmail: 'v.rao@apexfintech.example.com',
        shiftId: 'SHIFT-GEN',
        attendanceRules: 'External Client Email Verification + Internal Manager/HR Approval Required',
        requiresClientVerification: true,
        status: 'Active'
      },
      {
        id: 'CAS-202',
        clientId: 'CLI-102',
        employeeId: 'EMP-004',
        project: 'Omnichannel Checkout Microservices',
        projectName: 'Omnichannel Checkout Microservices',
        location: 'Bengaluru Whitefield Campus',
        workMode: 'Hybrid',
        startDate: '2026-07-15',
        plannedEndDate: '2026-11-30',
        allocation: 100,
        allowanceMonthly: 4500,
        reportingManagerId: 'EMP-002',
        clientSupervisorName: 'Meera Krishnan',
        clientSupervisorEmail: 'meera.k@horizonretail.example.com',
        shiftId: 'SHIFT-GEN',
        attendanceRules: 'External Client Email Verification + Internal Manager/HR Approval Required',
        requiresClientVerification: true,
        status: 'Active'
      },
      {
        id: 'CAS-203',
        clientId: 'CLI-101',
        employeeId: 'EMP-006',
        project: 'Treasury Risk Audit Module',
        projectName: 'Treasury Risk Audit Module',
        location: 'Remote',
        workMode: 'Remote',
        startDate: '2026-01-10',
        plannedEndDate: '2026-05-31',
        actualEndDate: '2026-05-31',
        allocation: 50,
        allowanceMonthly: 2500,
        reportingManagerId: 'EMP-001',
        clientSupervisorName: 'Vikramaditya Rao',
        clientSupervisorEmail: 'v.rao@apexfintech.example.com',
        shiftId: 'SHIFT-GEN',
        attendanceRules: 'External Client Email Verification + Internal Manager/HR Approval Required',
        requiresClientVerification: true,
        status: 'Completed'
      }
    ];
  },

  getClientsFromStorage(): Array<{
    id: string;
    name: string;
    contactName: string;
    email: string;
    phone: string;
    address: string;
    status: string;
  }> {
    try {
      const raw = localStorage.getItem('orbyx_hrms_clients_v1');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // fallback
    }
    return [
      {
        id: 'CLI-101',
        name: 'Apex FinTech Global',
        contactName: 'Vikramaditya Rao',
        email: 'v.rao@apexfintech.example.com',
        phone: '+91 22 4890 1122',
        address: 'Bandra Kurla Complex, Mumbai, MH',
        status: 'Active'
      },
      {
        id: 'CLI-102',
        name: 'Horizon Retail Systems',
        contactName: 'Meera Krishnan',
        email: 'meera.k@horizonretail.example.com',
        phone: '+91 80 4120 8899',
        address: 'Whitefield Tech Park, Bengaluru, KA',
        status: 'Active'
      }
    ];
  },

  getActiveEmployeeDeploymentForDate(employeeId: string, dateStr: string, allowHistoricalClosed = false) {
    const deployments = this.getClientDeploymentsFromStorage();
    return deployments.find((d) => {
      if (d.employeeId !== employeeId) return false;
      if (d.status === 'Cancelled' || d.status === 'Planned') return false;
      if (!allowHistoricalClosed && d.status !== 'Active') return false;
      if (dateStr < d.startDate) return false;
      const effectiveEnd = d.actualEndDate || d.plannedEndDate;
      if (effectiveEnd && dateStr > effectiveEnd) return false;
      return true;
    });
  },

  punchAttendance(
    employeeId: string,
    punchType: 'check-in' | 'check-out',
    actorUserId: string,
    actorName: string,
    options?: {
      date?: string;
      time?: string;
      assignmentId?: string;
      clientId?: string;
      projectName?: string;
      workMode?: 'Office' | 'Client Site' | 'Remote';
    }
  ): { success: boolean; error?: string; message: string; record?: AttendanceRecord } {
    const emp = db.getEmployeeById(employeeId);
    if (!emp) {
      const msg = 'Employee record not found in internal HRMS.';
      return { success: false, error: msg, message: msg };
    }
    const today = options?.date || new Date().toISOString().split('T')[0];
    const nowHours =
      options?.time ||
      new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });

    // Check if employee is punching against a client deployment
    const allDeployments = this.getClientDeploymentsFromStorage();
    let targetDeployment = options?.assignmentId
      ? allDeployments.find((d) => d.id === options.assignmentId)
      : this.getActiveEmployeeDeploymentForDate(employeeId, today, false);

    if (options?.assignmentId && !targetDeployment) {
      const msg = 'Selected client deployment does not exist.';
      return { success: false, error: msg, message: msg };
    }

    if (targetDeployment) {
      if (targetDeployment.employeeId !== employeeId) {
        const msg = 'Unauthorized: Employee cannot record attendance against another employee’s client deployment.';
        return { success: false, error: msg, message: msg };
      }
      if (targetDeployment.status === 'Completed' || targetDeployment.status === 'Cancelled') {
        const msg = `Cannot record new live attendance against closed/cancelled deployment ${targetDeployment.id} (${targetDeployment.project}). Use Historical Correction if adjusting a past date within the deployment window.`;
        return { success: false, error: msg, message: msg };
      }
      if (today < targetDeployment.startDate) {
        const msg = `Attendance date (${today}) is prior to deployment start date (${targetDeployment.startDate}).`;
        return { success: false, error: msg, message: msg };
      }
      const effectiveEnd = targetDeployment.actualEndDate || targetDeployment.plannedEndDate;
      if (effectiveEnd && today > effectiveEnd) {
        const msg = `Attendance date (${today}) is after deployment end date (${effectiveEnd}).`;
        return { success: false, error: msg, message: msg };
      }
    }

    // If caller explicitly asked for 'Office' mode, do not bind to client deployment
    if (options?.workMode === 'Office') {
      targetDeployment = undefined;
    }

    const shiftIdToUse = targetDeployment?.shiftId || emp.shiftId || 'SHIFT-GEN';
    const shift = db.getShifts().find((s) => s.id === shiftIdToUse) || db.getShifts()[0];
    const clients = this.getClientsFromStorage();
    const clientObj = targetDeployment ? clients.find((c) => c.id === targetDeployment?.clientId) : undefined;

    let record = db.getAttendanceRecords().find(
      (r) => r.employeeId === employeeId && r.date === today
    );

    const isClientSite = Boolean(targetDeployment || options?.workMode === 'Client Site');

    if (punchType === 'check-in') {
      if (record && record.checkInTime) {
        const msg = `Duplicate check-in prevented: ${emp.firstName} already checked in at ${record.checkInTime} on ${today}.`;
        return { success: false, error: msg, message: msg };
      }

      const [shiftH, shiftM] = shift.startTime.split(':').map(Number);
      const shiftGraceMinutes = shiftH * 60 + shiftM + shift.gracePeriodMinutes;
      const [nowH, nowM] = nowHours.split(':').map(Number);
      const currentMinutes = nowH * 60 + nowM;

      const isLate = currentMinutes > shiftGraceMinutes;
      const lateMinutes = isLate ? Math.max(0, currentMinutes - (shiftH * 60 + shiftM)) : 0;

      record = {
        id: record?.id || `ATT-${today.replace(/-/g, '')}-${employeeId}`,
        employeeId,
        date: today,
        entryDate: new Date().toISOString().split('T')[0],
        shiftId: shift.id,
        checkInTime: nowHours,
        totalHoursWorked: 0,
        regularHours: 0,
        overtimeHours: 0,
        status: isLate ? 'Late' : 'Present',
        isLate,
        isEarlyDeparture: false,
        lateMinutes,
        source: 'Web Punch',
        workMode: isClientSite ? 'Client Site' : 'Office',
        assignmentId: targetDeployment?.id,
        clientId: targetDeployment?.clientId || options?.clientId,
        projectName: targetDeployment?.project || options?.projectName,
        clientSupervisorName: targetDeployment?.clientSupervisorName || clientObj?.contactName,
        clientSupervisorEmail: targetDeployment?.clientSupervisorEmail || clientObj?.email,
        verificationMethod: isClientSite ? 'Client Email Confirmation' : undefined,
        clientVerificationStatus: isClientSite ? 'Pending' : 'Not Required',
        companyApprovalStatus: isClientSite ? 'Pending' : 'Approved',
        payrollEligibilityStatus: isClientSite ? 'Not Eligible' : 'Eligible for Draft Payroll',
        approvalStatus: isClientSite ? 'Pending Client Verification' : 'Approved',
        approvalHistory: [
          {
            stage: isClientSite ? 'Client-Site Check-In Recorded' : 'Office Check-In Recorded',
            actorName,
            actorRole: 'Employee',
            timestamp: new Date().toISOString(),
            comments: isClientSite
              ? `Checked in at ${nowHours} for ${targetDeployment?.project || 'Client Site'} (${clientObj?.name || targetDeployment?.clientId}). Pending external client email verification.`
              : `Checked in at ${nowHours}`
          }
        ]
      };
    } else {
      // Check-out: Strictly require a valid prior check-in per Section 5 ("Prevent invalid check-outs without a valid check-in unless handled through an attendance correction request")
      if (!record || !record.checkInTime) {
        const msg =
          'Invalid check-out blocked: No check-in timestamp exists for today. Please submit an Attendance Correction Request (Scenario A: Forgot Check-In) with your actual check-in time and reason.';
        return { success: false, error: msg, message: msg };
      }
      if (record.checkOutTime) {
        const msg = `Duplicate check-out prevented: Check-out was already recorded at ${record.checkOutTime} on ${today}.`;
        return { success: false, error: msg, message: msg };
      }

      record.checkOutTime = nowHours;
      const [inH, inM] = record.checkInTime.split(':').map(Number);
      const [outH, outM] = nowHours.split(':').map(Number);
      let rawMinutes = outH * 60 + outM - (inH * 60 + inM);
      if (rawMinutes < 0) {
        // Overnight shift support
        rawMinutes += 24 * 60;
      }
      const breakDeduction = rawMinutes > shift.breakDurationMinutes ? shift.breakDurationMinutes : 0;
      const totalMinutes = Math.max(0, rawMinutes - breakDeduction);
      const hours = Number((totalMinutes / 60).toFixed(2));
      const standardHours = shift.totalWorkingHours || 8.0;

      record.totalHoursWorked = hours;
      record.regularHours = Math.min(hours, standardHours);
      record.overtimeHours = Math.max(0, Number((hours - standardHours).toFixed(2)));
      if (hours > 0 && hours < 4.5 && record.status !== 'Late') {
        record.status = 'Half Day';
      }
      record.approvalHistory = [
        ...(record.approvalHistory || []),
        {
          stage: 'Check-Out Recorded',
          actorName,
          actorRole: 'Employee',
          timestamp: new Date().toISOString(),
          comments: `Checked out at ${nowHours} (Net Worked: ${hours}h)`
        }
      ];
    }

    db.saveAttendanceRecord(record);

    db.logAudit({
      actorUserId,
      actorName,
      actorRole: 'employee',
      action: 'UPDATE',
      module: 'ATTENDANCE',
      entityId: record.id,
      entityName: `${emp.firstName} ${emp.lastName} (${punchType})`,
      description: `${record.workMode === 'Client Site' ? 'Client-site' : 'Office'} web punch ${punchType} recorded at ${nowHours}${record.projectName ? ` [${record.projectName}]` : ''}`
    });

    const successMsg =
      punchType === 'check-in'
        ? `Check-in recorded at ${nowHours}${record.workMode === 'Client Site' ? ` (${record.projectName} — Pending Client Email Verification)` : ''}.`
        : `Check-out recorded at ${nowHours} (${record.totalHoursWorked}h worked).`;

    return { success: true, message: successMsg, record };
  },

  // ---------------- SCENARIO A (FORGOT CHECK-IN/OUT) & SCENARIO C (MACHINE / SERVER OUTAGE MANUAL ENTRY) ----------------
  submitAttendanceCorrection(
    data: {
      employeeId: string;
      date: string;
      requestedCheckIn: string;
      requestedCheckOut: string;
      reason: string;
      entryType?: 'Manual Entry' | 'Correction';
      exceptionType?:
        | 'Machine Failure'
        | 'Server Downtime'
        | 'Application Unavailable'
        | 'Missed Punch'
        | 'Timestamp Error'
        | 'Client Site Exception'
        | 'Authorized Exception';
      outageIncidentRef?: string;
      assignmentId?: string;
      clientId?: string;
      shiftId?: string;
      breakDurationMinutes?: number;
      requestedOutcome?: 'Present' | 'Late' | 'Half Day' | 'Absent' | 'On Leave';
      supportingEvidence?: string;
    },
    actorUserId: string,
    actorName: string
  ): AttendanceCorrectionRequest {
    const emp = db.getEmployeeById(data.employeeId);
    const approverId = emp?.reportingManagerId || 'EMP-001';
    const shifts = db.getShifts();

    // Check if employee was deployed to a client on data.date (allows historical closed deployments for past dates within deployment window)
    const allDeployments = this.getClientDeploymentsFromStorage();
    const matchedDeployment = data.assignmentId
      ? allDeployments.find((d) => d.id === data.assignmentId)
      : this.getActiveEmployeeDeploymentForDate(data.employeeId, data.date, true);

    const clients = this.getClientsFromStorage();
    const clientObj = matchedDeployment
      ? clients.find((c) => c.id === matchedDeployment.clientId)
      : data.clientId
      ? clients.find((c) => c.id === data.clientId)
      : undefined;

    const shift =
      shifts.find((s) => s.id === (data.shiftId || matchedDeployment?.shiftId || emp?.shiftId || 'SHIFT-GEN')) ||
      shifts[0];
    const breakMins =
      data.breakDurationMinutes !== undefined
        ? Number(data.breakDurationMinutes)
        : shift?.breakDurationMinutes ?? 60;

    const [inH, inM] = (data.requestedCheckIn || '09:30').split(':').map(Number);
    const [outH, outM] = (data.requestedCheckOut || '18:30').split(':').map(Number);
    let rawMins = outH * 60 + outM - (inH * 60 + inM);
    if (rawMins < 0) rawMins += 24 * 60; // overnight shift support
    const workedMins = Math.max(0, rawMins - breakMins);
    const calculatedHours = Number((workedMins / 60).toFixed(2));
    const standardHours = shift?.totalWorkingHours || 8;

    const existing = db.getAttendanceRecords().find(
      (r) => r.employeeId === data.employeeId && r.date === data.date
    );

    const conflictWarning = existing
      ? data.entryType === 'Manual Entry'
        ? `Conflict Detected: Existing attendance record on ${data.date} (${existing.checkInTime || '--:--'} to ${existing.checkOutTime || '--:--'}, ${existing.source}). Original values are preserved for audit.`
        : `Correcting existing ${existing.source} record (${existing.checkInTime || '--:--'} - ${existing.checkOutTime || '--:--'}, ${existing.totalHoursWorked}h). Original values preserved.`
      : undefined;

    const nowIso = new Date().toISOString();
    const entryDateStr = nowIso.split('T')[0];
    const isClientSite = Boolean(matchedDeployment || data.clientId || existing?.workMode === 'Client Site');
    const supervisorName =
      matchedDeployment?.clientSupervisorName ||
      existing?.clientSupervisorName ||
      clientObj?.contactName;
    const supervisorEmail =
      matchedDeployment?.clientSupervisorEmail ||
      existing?.clientSupervisorEmail ||
      clientObj?.email;

    // Ensure an underlying AttendanceRecord exists or is updated in Pending state so it is tracked in the single attendance record for (employeeId, date) without duplicates
    const attId = existing?.id || `ATT-${data.date.replace(/-/g, '')}-${data.employeeId}`;
    const [shiftH, shiftM] = (shift?.startTime || '09:30').split(':').map(Number);
    const graceMins = shift?.gracePeriodMinutes ?? 15;
    const isLate = inH * 60 + inM > shiftH * 60 + shiftM + graceMins;
    const lateMinutes = isLate ? Math.max(0, inH * 60 + inM - (shiftH * 60 + shiftM)) : 0;

    const pendingRecord: AttendanceRecord = {
      id: attId,
      employeeId: data.employeeId,
      date: data.date, // Actual historical attendance date
      entryDate: entryDateStr, // Date entry was recorded
      shiftId: shift?.id || 'SHIFT-GEN',
      checkInTime: data.requestedCheckIn,
      checkOutTime: data.requestedCheckOut,
      breakDurationMinutes: breakMins,
      totalHoursWorked: calculatedHours,
      regularHours: Math.min(standardHours, calculatedHours),
      overtimeHours: Math.max(0, Number((calculatedHours - standardHours).toFixed(2))),
      status: data.requestedOutcome || (isLate ? 'Late' : calculatedHours < 4.5 ? 'Half Day' : 'Present'),
      isLate,
      isEarlyDeparture: false,
      lateMinutes,
      source: data.entryType === 'Manual Entry' ? 'Manual HR Entry' : 'Attendance Correction',
      workMode: isClientSite ? 'Client Site' : existing?.workMode || 'Office',
      assignmentId: matchedDeployment?.id || existing?.assignmentId,
      clientId: matchedDeployment?.clientId || data.clientId || existing?.clientId,
      projectName: matchedDeployment?.project || existing?.projectName,
      clientSupervisorName: supervisorName,
      clientSupervisorEmail: supervisorEmail,
      verificationMethod: isClientSite ? 'Client Email Confirmation' : undefined,
      clientVerificationStatus: isClientSite ? 'Pending' : 'Not Required',
      companyApprovalStatus: 'Pending',
      payrollEligibilityStatus: 'Not Eligible',
      approvalStatus: isClientSite ? 'Pending Client Verification' : 'Pending Manager Approval',
      entryType: data.entryType || 'Correction',
      exceptionType: data.exceptionType || 'Missed Punch',
      outageIncidentRef: data.outageIncidentRef?.trim() || undefined,
      reason: data.reason,
      supportingEvidence: data.supportingEvidence?.trim() || undefined,
      submittedBy: actorName,
      submittedAt: nowIso,
      originalCheckIn: existing?.originalCheckIn ?? existing?.checkInTime,
      originalCheckOut: existing?.originalCheckOut ?? existing?.checkOutTime,
      originalHours: existing?.originalHours ?? existing?.totalHoursWorked,
      originalStatus: existing?.originalStatus ?? existing?.status,
      originalSource: existing?.originalSource ?? existing?.source,
      notes: `${data.entryType || 'Correction'} (${data.exceptionType || 'Missed Punch'})${data.outageIncidentRef ? ` [Incident: ${data.outageIncidentRef}]` : ''}: ${data.reason}`,
      approvalHistory: [
        ...(existing?.approvalHistory || []),
        {
          stage:
            data.entryType === 'Manual Entry'
              ? `Historical Manual Entry Submitted (${data.exceptionType || 'Outage'})`
              : `Attendance Correction Submitted (${data.exceptionType || 'Missed Punch'})`,
          actorName,
          actorRole: 'Internal User',
          timestamp: nowIso,
          comments: `Requested ${data.requestedCheckIn}-${data.requestedCheckOut} (${calculatedHours}h) for attendance date ${data.date} (entered on ${entryDateStr}). Reason: ${data.reason}${isClientSite ? ' · Flagged for External Client Supervisor Email Verification.' : ''}`
        }
      ]
    };
    db.saveAttendanceRecord(pendingRecord);

    const req: AttendanceCorrectionRequest = {
      id: `CORR-${Date.now()}`,
      attendanceId: attId,
      employeeId: data.employeeId,
      date: data.date,
      entryDate: entryDateStr,
      entryType: data.entryType || 'Correction',
      exceptionType: data.exceptionType || 'Missed Punch',
      outageIncidentRef: data.outageIncidentRef?.trim() || undefined,
      assignmentId: matchedDeployment?.id || existing?.assignmentId,
      clientId: matchedDeployment?.clientId || data.clientId || existing?.clientId,
      projectName: matchedDeployment?.project || existing?.projectName,
      clientSupervisorName: supervisorName,
      clientSupervisorEmail: supervisorEmail,
      requiresClientEmailVerification: isClientSite,
      clientVerificationStatus: isClientSite ? 'Pending' : 'Not Required',
      companyApprovalStatus: 'Pending',
      shiftId: shift?.id || 'SHIFT-GEN',
      requestedCheckIn: data.requestedCheckIn,
      requestedCheckOut: data.requestedCheckOut,
      breakDurationMinutes: breakMins,
      calculatedHours,
      requestedOutcome: data.requestedOutcome || (calculatedHours < 4.5 ? 'Half Day' : 'Present'),
      originalCheckIn: existing?.originalCheckIn ?? existing?.checkInTime,
      originalCheckOut: existing?.originalCheckOut ?? existing?.checkOutTime,
      originalHours: existing?.originalHours ?? existing?.totalHoursWorked,
      originalStatus: existing?.originalStatus ?? existing?.status,
      originalSource: existing?.originalSource ?? existing?.source,
      reason: data.reason,
      supportingEvidence: data.supportingEvidence?.trim() || undefined,
      conflictWarning,
      status: 'Pending',
      approverId,
      submittedBy: actorName,
      submittedAt: nowIso
    };

    db.saveCorrectionRequest(req);

    const approver = db.getEmployeeById(approverId);
    if (approver) {
      db.addNotification({
        targetUserId: approver.userId,
        title: `${req.entryType === 'Manual Entry' ? 'Manual Attendance Entry' : 'Attendance Correction'} Pending`,
        message: `${emp?.firstName} ${emp?.lastName} submitted a ${req.entryType?.toLowerCase()} for ${data.date} (${calculatedHours}h)${isClientSite ? ' — requires Client Email Verification & Company Approval' : ''}.`,
        module: 'attendance'
      });
    }

    db.logAudit({
      actorUserId,
      actorName,
      actorRole: 'employee',
      action: 'CREATE',
      module: 'ATTENDANCE',
      entityId: req.id,
      entityName: `${emp?.firstName || data.employeeId} (${data.date})`,
      description: `Submitted ${req.entryType} (${req.exceptionType}) for attendance date ${data.date} on ${entryDateStr}: ${data.requestedCheckIn}-${data.requestedCheckOut} (${calculatedHours}h). Reason: ${data.reason}`
    });

    return req;
  },

  // ---------------- SCENARIO B: PREPARE EXTERNAL CLIENT SUPERVISOR EMAIL VERIFICATION REQUEST ----------------
  prepareClientVerificationRequest(
    params: {
      employeeId?: string;
      attendanceRecordIds?: string[];
      correctionRequestId?: string;
      assignmentId?: string;
      clientId?: string;
      coverageType: 'Single Date' | 'Multiple Dates' | 'Weekly Timesheet' | 'Date Range';
      dateFrom?: string;
      dateTo?: string;
      selectedDates?: string[];
      clientSupervisorName?: string;
      clientSupervisorEmail?: string;
      notes?: string;
      actorUserId?: string;
      actorName?: string;
    },
    actorUserIdArg?: string,
    actorNameArg?: string
  ): {
    success: boolean;
    error?: string;
    message?: string;
    referenceId: string;
    supervisorName: string;
    supervisorEmail: string;
    subject: string;
    body: string;
    deliveryNote: string;
    recordsUpdated?: number;
  } {
    const actorUserId = params.actorUserId || actorUserIdArg || 'usr_hr';
    const actorName = params.actorName || actorNameArg || 'HR Operations';
    const deliveryNote =
      'External email server / authenticated inbox integration (SMTP/IMAP) is not configured in this local-storage MVP. Open the prepared draft in your email client or copy the message below, and log the client supervisor’s email reply once received.';

    const allRecords = db.getAttendanceRecords();
    const allCorrs = db.getCorrectionRequests();
    const matchedCorr = params.correctionRequestId
      ? allCorrs.find((c) => c.id === params.correctionRequestId)
      : undefined;

    let resolvedEmpId = params.employeeId || matchedCorr?.employeeId;
    if (!resolvedEmpId && params.attendanceRecordIds && params.attendanceRecordIds.length > 0) {
      const firstRec = allRecords.find((r) => params.attendanceRecordIds!.includes(r.id));
      resolvedEmpId = firstRec?.employeeId;
    }

    const emp = resolvedEmpId ? db.getEmployeeById(resolvedEmpId) : undefined;
    if (!emp || !resolvedEmpId) {
      const msg = 'Employee not found';
      return {
        success: false,
        error: msg,
        message: msg,
        referenceId: '',
        supervisorName: '',
        supervisorEmail: '',
        subject: '',
        body: '',
        deliveryNote
      };
    }

    let allAtt: AttendanceRecord[] = [];
    if (params.attendanceRecordIds && params.attendanceRecordIds.length > 0) {
      allAtt = allRecords.filter((r) => params.attendanceRecordIds!.includes(r.id));
    } else if (matchedCorr) {
      allAtt = allRecords.filter(
        (r) =>
          (matchedCorr.attendanceId && r.id === matchedCorr.attendanceId) ||
          (r.employeeId === matchedCorr.employeeId && r.date === matchedCorr.date)
      );
    } else {
      const dFrom = params.dateFrom || new Date().toISOString().slice(0, 10);
      const dTo = params.dateTo || dFrom;
      allAtt = allRecords.filter((r) => {
        if (r.employeeId !== resolvedEmpId) return false;
        if (params.selectedDates && params.selectedDates.length > 0) {
          return params.selectedDates.includes(r.date);
        }
        return r.date >= dFrom && r.date <= dTo;
      });
    }

    const datesSorted = allAtt.map((r) => r.date).sort();
    const resolvedFrom = params.dateFrom || datesSorted[0] || matchedCorr?.date || new Date().toISOString().slice(0, 10);
    const resolvedTo = params.dateTo || datesSorted[datesSorted.length - 1] || resolvedFrom;

    const deployments = this.getClientDeploymentsFromStorage();
    const deployment =
      deployments.find((d) => d.id === (params.assignmentId || matchedCorr?.assignmentId || allAtt[0]?.assignmentId)) ||
      this.getActiveEmployeeDeploymentForDate(resolvedEmpId, resolvedFrom, true);
    const clients = this.getClientsFromStorage();
    const clientObj = clients.find(
      (c) => c.id === (params.clientId || matchedCorr?.clientId || allAtt[0]?.clientId || deployment?.clientId)
    );

    const supervisorName =
      params.clientSupervisorName?.trim() ||
      matchedCorr?.clientSupervisorName ||
      allAtt[0]?.clientSupervisorName ||
      deployment?.clientSupervisorName ||
      clientObj?.contactName ||
      'Client Supervisor';
    const supervisorEmail =
      params.clientSupervisorEmail?.trim() ||
      matchedCorr?.clientSupervisorEmail ||
      allAtt[0]?.clientSupervisorEmail ||
      deployment?.clientSupervisorEmail ||
      clientObj?.email ||
      'supervisor@client.example.com';
    const clientName = clientObj?.name || 'External Client Organization';
    const projectName = deployment?.project || matchedCorr?.projectName || allAtt[0]?.projectName || 'Client-Site Engagement';

    if (allAtt.length === 0 && !matchedCorr) {
      const msg = `No attendance records found for ${emp.firstName} ${emp.lastName} between ${resolvedFrom} and ${resolvedTo}.`;
      return {
        success: false,
        error: msg,
        message: msg,
        referenceId: '',
        supervisorName,
        supervisorEmail,
        subject: '',
        body: '',
        deliveryNote
      };
    }

    const referenceId = `VREQ-2026-${String(Date.now()).slice(-5)}`;
    const nowIso = new Date().toISOString();

    allAtt.forEach((rec) => {
      rec.clientVerificationStatus = 'Verification Requested';
      rec.verificationRefId = referenceId;
      rec.clientSupervisorName = supervisorName;
      rec.clientSupervisorEmail = supervisorEmail;
      rec.workMode = 'Client Site';
      rec.assignmentId = rec.assignmentId || deployment?.id;
      rec.clientId = rec.clientId || deployment?.clientId || clientObj?.id;
      rec.projectName = rec.projectName || projectName;
      rec.approvalHistory = [
        ...(rec.approvalHistory || []),
        {
          stage: 'External Email Verification Request Prepared',
          actorName,
          actorRole: 'Internal User',
          timestamp: nowIso,
          comments: `Verification Ref ${referenceId} prepared for ${supervisorName} <${supervisorEmail}> (${params.coverageType}). External email server not configured — manual email dispatch/record.`
        }
      ];
      db.saveAttendanceRecord(rec);
    });

    // Sync any linked correction requests
    const matchingCorrs = allCorrs.filter(
      (c) =>
        (params.correctionRequestId && c.id === params.correctionRequestId) ||
        (c.employeeId === resolvedEmpId && c.date >= resolvedFrom && c.date <= resolvedTo && c.status === 'Pending')
    );
    matchingCorrs.forEach((c) => {
      c.clientVerificationStatus = 'Verification Requested';
      c.verificationRefId = referenceId;
      db.saveCorrectionRequest(c);
    });

    const totalHours =
      allAtt.length > 0
        ? Number(allAtt.reduce((s, r) => s + (r.totalHoursWorked || 0), 0).toFixed(2))
        : matchedCorr?.calculatedHours || 8;
    const linesSummary =
      allAtt.length > 0
        ? allAtt
            .sort((a, b) => a.date.localeCompare(b.date))
            .map(
              (r) =>
                `  • Date: ${r.date} | In: ${r.checkInTime || '--:--'} | Out: ${r.checkOutTime || '--:--'} | Worked: ${r.totalHoursWorked}h | Entry: ${r.entryType || 'Regular'}${r.reason ? ` (${r.reason})` : ''}`
            )
            .join('\n')
        : `  • Date: ${matchedCorr?.date} | In: ${matchedCorr?.requestedCheckIn} | Out: ${matchedCorr?.requestedCheckOut} | Worked: ${matchedCorr?.calculatedHours || 8}h | Reason: ${matchedCorr?.reason}`;

    // Strictly omit confidential employee fields (no salary, bank details, PAN, home address, or personal phone)
    const subject = `[Orbyx HRMS Verification ${referenceId}] Attendance Confirmation Request — ${emp.firstName} ${emp.lastName} (${emp.id}) | ${projectName}`;
    const body = [
      `Dear ${supervisorName},`,
      ``,
      `Please review and confirm by email reply the client-site attendance recorded for our deployed team member:`,
      ``,
      `Verification Reference ID : ${referenceId}`,
      `Client Organization       : ${clientName}`,
      `Project / Engagement      : ${projectName}`,
      `Employee Name & ID        : ${emp.firstName} ${emp.lastName} (${emp.id})`,
      `Coverage Period (${params.coverageType}) : ${resolvedFrom} to ${resolvedTo} (${Math.max(1, allAtt.length)} day(s), ${totalHours} total hrs)`,
      ``,
      `Attendance Breakdown:`,
      linesSummary,
      params.notes ? `\nAdditional Context: ${params.notes}` : '',
      ``,
      `INSTRUCTIONS FOR EXTERNAL EMAIL CONFIRMATION (NO ORBYX LOGIN REQUIRED):`,
      `Please reply directly to this email quoting Reference ID [${referenceId}] with one of the following:`,
      `  1. "CONFIRMED / VERIFIED" — if the recorded dates, check-in/check-out times, and working hours are accurate.`,
      `  2. "DISPUTED / CORRECTION REQUESTED" — if any date, timestamp, or working hour is inaccurate (please specify the actual hours/times observed at the client site).`,
      ``,
      `Thank you,`,
      `${actorName}`,
      `Orbyx Human Resources & Delivery Operations`
    ]
      .filter(Boolean)
      .join('\n');

    db.logAudit({
      actorUserId,
      actorName,
      actorRole: 'hr_admin',
      action: 'CREATE',
      module: 'ATTENDANCE',
      entityId: referenceId,
      entityName: `${emp.firstName} ${emp.lastName} (${referenceId})`,
      description: `Prepared external client supervisor email verification request ${referenceId} for ${supervisorName} <${supervisorEmail}> covering ${Math.max(1, allAtt.length)} day(s) (${resolvedFrom} to ${resolvedTo}).`
    });

    return {
      success: true,
      message: `Prepared external verification draft ${referenceId}`,
      referenceId,
      supervisorName,
      supervisorEmail,
      subject,
      body,
      deliveryNote,
      recordsUpdated: allAtt.length
    };
  },

  // ---------------- SCENARIOS B & D: RECORD EXTERNAL CLIENT SUPERVISOR EMAIL RESPONSE ----------------
  recordClientSupervisorEmailResponse(
    data: {
      referenceId?: string;
      assignmentId?: string;
      clientId?: string;
      employeeId?: string;
      attendanceRecordIds?: string[];
      correctionRequestId?: string;
      coverageType: 'Single Date' | 'Multiple Dates' | 'Weekly Timesheet' | 'Date Range';
      attendanceStartDate?: string;
      attendanceEndDate?: string;
      coveredDates?: string[];
      selectedDates?: string[];
      senderName: string;
      senderEmail: string;
      emailSubject?: string;
      emailReceivedAt: string;
      messageIdReference?: string;
      messageReference?: string;
      attachmentFileName?: string;
      supportingAttachmentRef?: string;
      decision: 'Verified' | 'Disputed' | 'Correction Requested' | 'Absent';
      summary: string;
      disputeDetails?: string;
      claimedCheckIn?: string;
      claimedCheckOut?: string;
      claimedHours?: number;
      comments?: string;
      actorUserId?: string;
      actorName?: string;
      actorRole?: any;
    },
    actorArg?: { id: string; employeeId?: string; name: string; role: any; email?: string }
  ): {
    success: boolean;
    error?: string;
    message: string;
    confirmationId?: string;
    confirmationRecord?: ClientEmailConfirmation;
    updatedAttendanceCount?: number;
  } {
    const allRecords = db.getAttendanceRecords();
    const allCorrs = db.getCorrectionRequests();
    const matchedCorr = data.correctionRequestId
      ? allCorrs.find((c) => c.id === data.correctionRequestId)
      : undefined;

    let resolvedEmpId = data.employeeId || matchedCorr?.employeeId;
    if (!resolvedEmpId && data.attendanceRecordIds && data.attendanceRecordIds.length > 0) {
      const firstRec = allRecords.find((r) => data.attendanceRecordIds!.includes(r.id));
      resolvedEmpId = firstRec?.employeeId;
    }

    const actorEmp = actorArg?.id
      ? db.getEmployeeByUserId(actorArg.id)
      : data.actorUserId
      ? db.getEmployeeByUserId(data.actorUserId)
      : undefined;

    const actor = {
      id: actorArg?.id || data.actorUserId || 'usr_hr',
      employeeId: actorArg?.employeeId || actorEmp?.id || 'EMP-005',
      name: actorArg?.name || data.actorName || actorEmp?.firstName || 'HR Admin',
      role: actorArg?.role || data.actorRole || 'hr_admin',
      email: actorArg?.email || actorEmp?.email || 'hr@orbyx.com'
    };

    if (!resolvedEmpId) {
      const msg = 'Employee ID could not be resolved for client email verification.';
      return { success: false, error: msg, message: msg };
    }

    // Enforce Section 3: Only authorized internal users can record client email confirmations; no external client logins, no self-verification by employee
    if (!permissionService.canRecordClientEmailVerification(actor as any, resolvedEmpId)) {
      const msg =
        'Unauthorized: Only authorized internal Orbyx HR Administrators, Reporting Managers, or Senior Management may record external client email verification responses. Employees cannot self-verify their own attendance.';
      return { success: false, error: msg, message: msg };
    }

    if (!data.senderEmail?.trim() || !data.senderName?.trim()) {
      const msg = 'Client Supervisor Name and Sender Email Address are mandatory to record email verification.';
      return { success: false, error: msg, message: msg };
    }
    if (!data.summary?.trim()) {
      const msg = 'A confirmation or dispute summary from the client supervisor email is mandatory.';
      return { success: false, error: msg, message: msg };
    }
    if (
      (data.decision === 'Disputed' || data.decision === 'Correction Requested') &&
      !data.disputeDetails?.trim() &&
      data.claimedHours === undefined
    ) {
      const msg =
        'When recording a client dispute or correction request, please provide the client’s dispute details or claimed hours.';
      return { success: false, error: msg, message: msg };
    }

    const emp = db.getEmployeeById(resolvedEmpId);
    if (!emp) {
      const msg = 'Employee not found in internal HRMS.';
      return { success: false, error: msg, message: msg };
    }

    const datesList = data.coveredDates || data.selectedDates || [];
    const sortedDates = [...datesList].sort();
    const startDate =
      data.attendanceStartDate ||
      sortedDates[0] ||
      matchedCorr?.date ||
      new Date().toISOString().slice(0, 10);
    const endDate =
      data.attendanceEndDate ||
      sortedDates[sortedDates.length - 1] ||
      startDate;

    const deployments = this.getClientDeploymentsFromStorage();
    const deployment =
      deployments.find((d) => d.id === (data.assignmentId || matchedCorr?.assignmentId)) ||
      this.getActiveEmployeeDeploymentForDate(resolvedEmpId, startDate, true);
    const clients = this.getClientsFromStorage();
    const clientObj = clients.find(
      (c) => c.id === (data.clientId || matchedCorr?.clientId || deployment?.clientId)
    );

    // Match existing attendance records in range/dates without creating duplicates
    const matchingRecords = allRecords.filter((r) => {
      if (data.attendanceRecordIds && data.attendanceRecordIds.length > 0 && data.attendanceRecordIds.includes(r.id)) {
        return true;
      }
      if (r.employeeId !== resolvedEmpId) return false;
      if (datesList.length > 0) {
        return datesList.includes(r.date);
      }
      return r.date >= startDate && r.date <= endDate;
    });

    const nowIso = new Date().toISOString();
    const todayStr = nowIso.slice(0, 10);
    const confirmationId = data.referenceId?.trim() || `CEC-2026-${String(Date.now()).slice(-4)}`;
    const resolvedMsgRef = data.messageIdReference || data.messageReference || `MSG-${Date.now()}`;
    const resolvedAttachment = data.attachmentFileName || data.supportingAttachmentRef;

    // If no attendance record exists yet on a Single Date confirmation, create the single record for that date without duplicates
    if (matchingRecords.length === 0 && startDate === endDate) {
      const shift = db.getShifts().find((s) => s.id === (deployment?.shiftId || emp.shiftId || 'SHIFT-GEN')) || db.getShifts()[0];
      const hrs = data.claimedHours !== undefined ? Number(data.claimedHours) : 8.0;
      const newRec: AttendanceRecord = {
        id: `ATT-${startDate.replace(/-/g, '')}-${resolvedEmpId}`,
        employeeId: resolvedEmpId,
        date: startDate,
        entryDate: todayStr,
        shiftId: shift.id,
        checkInTime: data.claimedCheckIn || '09:30',
        checkOutTime: data.claimedCheckOut || '18:30',
        totalHoursWorked: data.decision === 'Absent' ? 0 : hrs,
        regularHours: data.decision === 'Absent' ? 0 : Math.min(8, hrs),
        overtimeHours: data.decision === 'Absent' ? 0 : Math.max(0, Number((hrs - 8).toFixed(2))),
        status: data.decision === 'Absent' ? 'Absent' : 'Present',
        isLate: false,
        isEarlyDeparture: false,
        lateMinutes: 0,
        source: 'Client Timesheet',
        workMode: 'Client Site',
        assignmentId: deployment?.id || data.assignmentId,
        clientId: clientObj?.id || data.clientId,
        projectName: deployment?.project || 'Client Engagement',
        clientSupervisorName: data.senderName,
        clientSupervisorEmail: data.senderEmail,
        verificationMethod: 'Client Email Confirmation'
      };
      matchingRecords.push(newRec);
    }

    let totalHoursConfirmed = 0;

    matchingRecords.forEach((rec) => {
      rec.workMode = 'Client Site';
      rec.assignmentId = rec.assignmentId || deployment?.id || data.assignmentId;
      rec.clientId = rec.clientId || clientObj?.id || data.clientId;
      rec.projectName = rec.projectName || deployment?.project || 'Client Engagement';
      rec.clientSupervisorName = data.senderName;
      rec.clientSupervisorEmail = data.senderEmail;
      rec.clientVerifiedAt = data.emailReceivedAt.slice(0, 10) || todayStr;
      rec.verificationMethod = 'Client Email Confirmation';
      rec.verificationRefId = confirmationId;
      rec.evidenceRef = resolvedMsgRef || confirmationId;

      if (data.decision === 'Verified') {
        // CRITICAL RULE (Section 6 & 8): Client verification NEVER automatically sets Company Approval to Approved or finalizes payroll!
        rec.clientVerificationStatus = 'Verified';
        rec.companyApprovalStatus = 'Pending';
        rec.payrollEligibilityStatus = 'Not Eligible';
        rec.approvalStatus = 'Pending Manager Approval';
        totalHoursConfirmed += rec.totalHoursWorked || 8;
        rec.approvalHistory = [
          ...(rec.approvalHistory || []),
          {
            stage: 'Stage 1: External Client Supervisor Email Verified',
            actorName: `${actor.name} (recorded email from ${data.senderName} <${data.senderEmail}>)`,
            actorRole: actor.role,
            timestamp: nowIso,
            decision: 'Verified',
            comments: `Ref ${confirmationId} (${resolvedMsgRef}): ${data.summary}. Forwarded to internal Manager/HR for Stage 2 Final Company Approval.`
          }
        ];
      } else if (data.decision === 'Disputed' || data.decision === 'Correction Requested') {
        // SCENARIO D: Client Supervisor Disputes Recorded Working Hours
        rec.clientVerificationStatus =
          data.decision === 'Disputed' ? 'Disputed' : 'Correction Requested';
        rec.companyApprovalStatus = 'Pending';
        rec.payrollEligibilityStatus = 'Not Eligible';
        rec.approvalStatus = 'Disputed';
        rec.disputeDetails = data.disputeDetails || data.summary;
        if (data.claimedCheckIn) rec.clientClaimedCheckIn = data.claimedCheckIn;
        if (data.claimedCheckOut) rec.clientClaimedCheckOut = data.claimedCheckOut;
        if (data.claimedHours !== undefined) rec.clientClaimedHours = Number(data.claimedHours);
        // Preserve original employee timestamps if not already saved
        if (!rec.originalCheckIn && rec.checkInTime) rec.originalCheckIn = rec.checkInTime;
        if (!rec.originalCheckOut && rec.checkOutTime) rec.originalCheckOut = rec.checkOutTime;
        if (rec.originalHours === undefined) rec.originalHours = rec.totalHoursWorked;

        rec.approvalHistory = [
          ...(rec.approvalHistory || []),
          {
            stage: `Client Supervisor Email ${data.decision}`,
            actorName: `${actor.name} (recorded email from ${data.senderName} <${data.senderEmail}>)`,
            actorRole: actor.role,
            timestamp: nowIso,
            decision: 'Disputed',
            comments: `Dispute Ref ${confirmationId}: ${data.disputeDetails || data.summary}${data.claimedHours !== undefined ? ` | Client Claimed: ${data.claimedHours}h (${data.claimedCheckIn || '--:--'}-${data.claimedCheckOut || '--:--'}) vs Recorded: ${rec.totalHoursWorked}h` : ''}. Flagged for internal review; blocked from finalized payroll.`
          }
        ];
      } else if (data.decision === 'Absent') {
        rec.status = 'Absent';
        rec.totalHoursWorked = 0;
        rec.regularHours = 0;
        rec.overtimeHours = 0;
        rec.clientVerificationStatus = 'Verified';
        rec.companyApprovalStatus = 'Pending';
        rec.payrollEligibilityStatus = 'Not Eligible';
        rec.approvalStatus = 'Pending Manager Approval';
        rec.approvalHistory = [
          ...(rec.approvalHistory || []),
          {
            stage: 'Client Email Reported Employee Absent',
            actorName: `${actor.name} (from ${data.senderName})`,
            actorRole: actor.role,
            timestamp: nowIso,
            decision: 'Verified',
            comments: `Client supervisor reported employee absent on ${rec.date}: ${data.summary}`
          }
        ];
      }

      db.saveAttendanceRecord(rec);
    });

    // Update any matching AttendanceCorrectionRequests
    const matchingCorrs = allCorrs.filter(
      (c) =>
        (data.correctionRequestId && c.id === data.correctionRequestId) ||
        (c.employeeId === resolvedEmpId && c.date >= startDate && c.date <= endDate)
    );
    matchingCorrs.forEach((c) => {
      c.clientVerificationStatus =
        data.decision === 'Verified'
          ? 'Verified'
          : data.decision === 'Disputed'
          ? 'Disputed'
          : 'Correction Requested';
      c.verificationRefId = confirmationId;
      db.saveCorrectionRequest(c);
    });

    const confirmationRecord: ClientEmailConfirmation = {
      id: confirmationId,
      assignmentId: deployment?.id || data.assignmentId || 'CAS-GENERAL',
      clientId: clientObj?.id || data.clientId || 'CLI-101',
      clientName: clientObj?.name || 'External Client',
      employeeId: resolvedEmpId,
      employeeName: `${emp.firstName} ${emp.lastName}`.trim(),
      project: deployment?.project || 'Client Engagement',
      projectName: deployment?.project || 'Client Engagement',
      coverageType: data.coverageType,
      coveredDates: matchingRecords.map((r) => r.date),
      attendanceDate: startDate,
      attendanceRecordIds: matchingRecords.map((r) => r.id),
      correctionRequestId: data.correctionRequestId,
      clientSupervisorName: data.senderName,
      clientSupervisorEmail: data.senderEmail,
      emailDeliveryNote:
        'External Email Confirmation Manually Logged by Internal User (No Live SMTP/IMAP Server Configured)',
      senderName: data.senderName,
      senderEmail: data.senderEmail,
      confirmedByEmail: data.senderEmail,
      emailSubject:
        data.emailSubject ||
        `RE: [Orbyx HRMS] Attendance Verification (${emp.firstName} ${emp.lastName} - ${startDate})`,
      confirmationDate: data.emailReceivedAt.slice(0, 10) || todayStr,
      confirmedAt: data.emailReceivedAt.slice(0, 10) || todayStr,
      emailReceivedAt: data.emailReceivedAt,
      attendanceStartDate: startDate,
      attendanceEndDate: endDate,
      confirmedDaysCount: matchingRecords.length,
      confirmedHoursTotal: Number(totalHoursConfirmed.toFixed(2)),
      decision: data.decision,
      summary: data.summary,
      disputeDetails: data.disputeDetails,
      claimedCheckIn: data.claimedCheckIn,
      claimedCheckOut: data.claimedCheckOut,
      claimedHours: data.claimedHours,
      messageIdReference: resolvedMsgRef,
      messageReference: resolvedMsgRef,
      attachmentFileName: resolvedAttachment,
      authenticityStatus:
        'Manually Recorded by Authorized Internal User (Unauthenticated External Email Record)',
      recordedByUserId: actor.id,
      recordedByName: actor.name,
      recordedBy: actor.name,
      recordedAt: nowIso,
      verificationOutcome:
        data.decision === 'Verified'
          ? 'Verified by Client'
          : data.decision === 'Disputed'
          ? 'Disputed by Client Supervisor'
          : data.decision === 'Correction Requested'
          ? 'Correction Requested by Client'
          : 'Reported Absent by Client',
      companyApprovalStatus:
        data.decision === 'Verified'
          ? 'Pending HR/Manager Final Approval'
          : 'Disputed — Under Internal Review',
      reviewComments: data.comments
    };

    db.saveClientEmailConfirmation(confirmationRecord);

    // Notify employee & manager if disputed
    if (data.decision === 'Disputed' || data.decision === 'Correction Requested') {
      db.addNotification({
        targetUserId: emp.userId,
        title: `Client Attendance ${data.decision} (${startDate})`,
        message: `Client supervisor ${data.senderName} disputed recorded hours (${data.disputeDetails || data.summary}). Please submit your clarification in Attendance.`,
        module: 'attendance'
      });
      const mgr = emp.reportingManagerId ? db.getEmployeeById(emp.reportingManagerId) : undefined;
      if (mgr) {
        db.addNotification({
          targetUserId: mgr.userId,
          title: `Client Attendance Dispute Flagged — ${emp.firstName}`,
          message: `${data.senderName} (${clientObj?.name}) disputed ${emp.firstName}'s hours on ${startDate}. Internal review required.`,
          module: 'attendance'
        });
      }
    }

    db.logAudit({
      actorUserId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
      action: 'UPDATE',
      module: 'ATTENDANCE',
      entityId: confirmationRecord.id,
      entityName: `${emp.firstName} ${emp.lastName} (${data.decision})`,
      description: `Recorded external client email response (${data.decision}) from ${data.senderName} <${data.senderEmail}> [Ref: ${confirmationRecord.messageIdReference}] for ${matchingRecords.length} attendance record(s) (${startDate} to ${endDate}).`
    });

    const msg = `Recorded external client email response (${data.decision}) [Ref: ${confirmationId}] for ${matchingRecords.length} attendance record(s).`;

    return {
      success: true,
      message: msg,
      confirmationId,
      confirmationRecord,
      updatedAttendanceCount: matchingRecords.length
    };
  },

  // ---------------- SCENARIO D: SUBMIT EMPLOYEE / MANAGER CLARIFICATION ON DISPUTED ATTENDANCE ----------------
  submitDisputeClarification(
    attendanceIdOrObj:
      | string
      | {
          attendanceRecordId: string;
          clarification: string;
          evidence?: string;
          actorUserId: string;
          actorName: string;
        },
    clarificationTextArg?: string,
    supportingEvidenceArg?: string,
    actorArg?: { id: string; employeeId: string; name: string; role: any }
  ): { success: boolean; error?: string; message: string; record?: AttendanceRecord } {
    const isObj = typeof attendanceIdOrObj === 'object' && attendanceIdOrObj !== null;
    const attendanceId = isObj ? attendanceIdOrObj.attendanceRecordId : attendanceIdOrObj;
    const clarificationText = (isObj ? attendanceIdOrObj.clarification : clarificationTextArg) || '';
    const supportingEvidence = isObj ? attendanceIdOrObj.evidence : supportingEvidenceArg;

    const actorEmp =
      !actorArg && isObj && attendanceIdOrObj.actorUserId
        ? db.getEmployeeByUserId(attendanceIdOrObj.actorUserId)
        : undefined;
    const actor = actorArg || {
      id: isObj ? attendanceIdOrObj.actorUserId : 'usr_emp',
      employeeId: actorEmp?.id || 'EMP-003',
      name: isObj ? attendanceIdOrObj.actorName : 'Employee',
      role: 'employee'
    };

    if (!clarificationText.trim()) {
      const msg = 'Please provide an explanation or clarification for the disputed attendance.';
      return { success: false, error: msg, message: msg };
    }
    const rec = db.getAttendanceRecords().find((r) => r.id === attendanceId);
    if (!rec) {
      const msg = 'Attendance record not found.';
      return { success: false, error: msg, message: msg };
    }

    const nowIso = new Date().toISOString();
    rec.employeeClarification = clarificationText.trim();
    rec.employeeClarificationBy = `${actor.name} (${actor.employeeId})`;
    rec.employeeClarificationAt = nowIso;
    if (supportingEvidence?.trim()) {
      rec.employeeClarificationEvidence = supportingEvidence.trim();
    }
    rec.approvalHistory = [
      ...(rec.approvalHistory || []),
      {
        stage: 'Employee / Manager Dispute Clarification Submitted',
        actorName: actor.name,
        actorRole: actor.role,
        timestamp: nowIso,
        comments: `Clarification: "${clarificationText.trim()}"${supportingEvidence ? ` [Evidence: ${supportingEvidence}]` : ''}`
      }
    ];

    db.saveAttendanceRecord(rec);

    db.logAudit({
      actorUserId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
      action: 'UPDATE',
      module: 'ATTENDANCE',
      entityId: rec.id,
      entityName: `${rec.employeeId} (${rec.date})`,
      description: `Submitted clarification for disputed client-site attendance on ${rec.date}: "${clarificationText.trim()}"`
    });

    return {
      success: true,
      message: 'Dispute clarification submitted for internal Manager/HR review.',
      record: rec
    };
  },

  // ---------------- SCENARIO D: INTERNAL MANAGER / HR RESOLVES DISPUTED ATTENDANCE ----------------
  resolveAttendanceDispute(
    params: {
      attendanceId?: string;
      attendanceRecordId?: string;
      resolutionDecision?: DisputeResolutionDecision;
      decision?: DisputeResolutionDecision;
      resolutionReason?: string;
      reason?: string;
      correctedCheckIn?: string;
      correctedCheckOut?: string;
      correctedHours?: number;
      actorUserId?: string;
      actorName?: string;
      actorRole?: any;
    },
    actorArg?: { id: string; employeeId?: string; name: string; role: any; email?: string }
  ): { success: boolean; error?: string; message: string; record?: AttendanceRecord } {
    const targetId = params.attendanceId || params.attendanceRecordId || '';
    const decision = (params.resolutionDecision || params.decision || 'Approve Original Attendance') as DisputeResolutionDecision;
    const reason = params.resolutionReason ?? params.reason ?? '';

    const actorEmp = actorArg?.id
      ? db.getEmployeeByUserId(actorArg.id)
      : params.actorUserId
      ? db.getEmployeeByUserId(params.actorUserId)
      : undefined;

    const actor = {
      id: actorArg?.id || params.actorUserId || 'usr_hr',
      employeeId: actorArg?.employeeId || actorEmp?.id || 'EMP-005',
      name: actorArg?.name || params.actorName || actorEmp?.firstName || 'HR Admin',
      role: actorArg?.role || params.actorRole || 'hr_admin',
      email: actorArg?.email || actorEmp?.email || 'hr@orbyx.com'
    };

    const rec = db.getAttendanceRecords().find((r) => r.id === targetId);
    if (!rec) {
      const msg = 'Attendance record not found.';
      return { success: false, error: msg, message: msg };
    }

    if (!permissionService.canApproveCompanyAttendance(actor as any, rec.employeeId)) {
      const msg =
        'Unauthorized: Only an authorized internal Reporting Manager, HR Administrator, or Senior Manager (excluding self-approval) can resolve a client attendance dispute.';
      return { success: false, error: msg, message: msg };
    }

    if (!reason.trim()) {
      const msg = 'A mandatory resolution reason is required to resolve disputed client-site attendance.';
      return { success: false, error: msg, message: msg };
    }

    const nowIso = new Date().toISOString();
    const todayStr = nowIso.slice(0, 10);

    // Preserve original recorded values before any modification
    if (!rec.originalCheckIn && rec.checkInTime) rec.originalCheckIn = rec.checkInTime;
    if (!rec.originalCheckOut && rec.checkOutTime) rec.originalCheckOut = rec.checkOutTime;
    if (rec.originalHours === undefined) rec.originalHours = rec.totalHoursWorked;
    if (!rec.originalStatus) rec.originalStatus = rec.status;

    rec.disputeResolutionDecision = decision;
    rec.disputeResolutionReason = reason.trim();
    rec.disputeResolvedBy = `${actor.name} (${actor.role})`;
    rec.disputeResolvedAt = nowIso;

    if (decision === 'Approve Original Attendance') {
      // Keep original employee timestamps and hours, mark Company Approved & Eligible for Payroll
      rec.checkInTime = rec.originalCheckIn || rec.checkInTime;
      rec.checkOutTime = rec.originalCheckOut || rec.checkOutTime;
      rec.totalHoursWorked = rec.originalHours ?? rec.totalHoursWorked;
      rec.regularHours = Math.min(8, rec.totalHoursWorked);
      rec.overtimeHours = Math.max(0, Number((rec.totalHoursWorked - 8).toFixed(2)));
      rec.clientVerificationStatus = 'Verified';
      rec.companyApprovalStatus = 'Approved';
      rec.payrollEligibilityStatus = 'Eligible for Draft Payroll';
      rec.approvalStatus = 'Approved';
      rec.approvedBy = `${actor.name} (${actor.role})`;
      rec.approvedAt = todayStr;
    } else if (decision === 'Approve Corrected Attendance') {
      const newIn = params.correctedCheckIn || rec.clientClaimedCheckIn || rec.checkInTime || '09:30';
      const newOut = params.correctedCheckOut || rec.clientClaimedCheckOut || rec.checkOutTime || '17:30';
      let hrs = params.correctedHours !== undefined ? Number(params.correctedHours) : rec.clientClaimedHours;
      if (hrs === undefined || isNaN(hrs)) {
        const [inH, inM] = newIn.split(':').map(Number);
        const [outH, outM] = newOut.split(':').map(Number);
        let rawMins = outH * 60 + outM - (inH * 60 + inM);
        if (rawMins < 0) rawMins += 24 * 60;
        hrs = Number((Math.max(0, rawMins - 60) / 60).toFixed(2));
      }
      rec.checkInTime = newIn;
      rec.checkOutTime = newOut;
      rec.totalHoursWorked = hrs;
      rec.regularHours = Math.min(8, hrs);
      rec.overtimeHours = Math.max(0, Number((hrs - 8).toFixed(2)));
      rec.status = hrs < 4.5 ? 'Half Day' : 'Present';
      rec.clientVerificationStatus = 'Verified';
      rec.companyApprovalStatus = 'Approved';
      rec.payrollEligibilityStatus = 'Eligible for Draft Payroll';
      rec.approvalStatus = 'Approved';
      rec.approvedBy = `${actor.name} (${actor.role})`;
      rec.approvedAt = todayStr;
    } else if (decision === 'Return for Additional Information') {
      rec.companyApprovalStatus = 'Returned for Correction';
      rec.payrollEligibilityStatus = 'Not Eligible';
      rec.approvalStatus = 'Disputed';
    } else if (decision === 'Reject Attendance Correction') {
      rec.companyApprovalStatus = 'Rejected';
      rec.payrollEligibilityStatus = 'Not Eligible';
      rec.approvalStatus = 'Disputed';
      rec.status = 'Absent';
      rec.totalHoursWorked = 0;
      rec.regularHours = 0;
      rec.overtimeHours = 0;
    }

    rec.approvalHistory = [
      ...(rec.approvalHistory || []),
      {
        stage: `Dispute Resolution: ${decision}`,
        actorName: actor.name,
        actorRole: actor.role,
        timestamp: nowIso,
        decision:
          decision === 'Approve Original Attendance' ||
          decision === 'Approve Corrected Attendance'
            ? 'Approved'
            : decision === 'Return for Additional Information'
            ? 'Returned for Correction'
            : 'Rejected',
        comments: `Reason: ${reason.trim()} (Original: ${rec.originalCheckIn || '--:--'}-${rec.originalCheckOut || '--:--'} [${rec.originalHours ?? 0}h] | Final: ${rec.checkInTime || '--:--'}-${rec.checkOutTime || '--:--'} [${rec.totalHoursWorked}h])`
      }
    ];

    db.saveAttendanceRecord(rec);

    // Check if finalized payroll exists for this month and flag post-finalization adjustment note if approved
    if (rec.companyApprovalStatus === 'Approved') {
      const [attYear, attMonth] = rec.date.split('-').map(Number);
      const finalizedRun = db
        .getPayrollRuns()
        .find((r) => r.year === attYear && r.month === attMonth && (r.status === 'Finalized' || r.status === 'Paid'));
      if (finalizedRun) {
        finalizedRun.hasPostFinalizationAttendanceChange = true;
        finalizedRun.postFinalizationChangeNote = `Dispute resolved (${decision}) for ${rec.employeeId} on ${rec.date} (${rec.totalHoursWorked}h) by ${actor.name}. Reopen run with audit reason if recalculation is required.`;
        db.savePayrollRun(finalizedRun);
      }
    }

    const emp = db.getEmployeeById(rec.employeeId);
    if (emp) {
      db.addNotification({
        targetUserId: emp.userId,
        title: `Attendance Dispute Resolved (${rec.date})`,
        message: `${actor.name} resolved your client-site attendance dispute on ${rec.date}: ${decision}.`,
        module: 'attendance'
      });
    }

    db.logAudit({
      actorUserId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
      action: rec.companyApprovalStatus === 'Approved' ? 'APPROVE' : 'REJECT',
      module: 'ATTENDANCE',
      entityId: rec.id,
      entityName: `${rec.employeeId} (${rec.date})`,
      description: `Resolved client attendance dispute for ${rec.employeeId} on ${rec.date} with decision "${decision}". Reason: ${reason}`
    });

    return {
      success: true,
      message: `Dispute resolved with decision: ${decision}`,
      record: rec
    };
  },

  // ---------------- SECTION 8: INTERNAL COMPANY FINAL APPROVAL FOR ATTENDANCE ----------------
  decideCompanyAttendanceApproval(
    attendanceIdOrObj:
      | string
      | {
          attendanceRecordId: string;
          decision: 'Approved' | 'Rejected' | 'Returned for Correction';
          comments: string;
          actorUserId: string;
          actorName: string;
          actorRole: any;
        },
    decisionArg?: 'Approved' | 'Rejected' | 'Returned for Correction',
    commentsArg?: string,
    actorArg?: { id: string; employeeId?: string; name: string; role: any; email?: string }
  ): { success: boolean; error?: string; message: string; record?: AttendanceRecord } {
    const isObj = typeof attendanceIdOrObj === 'object' && attendanceIdOrObj !== null;
    const attendanceId = isObj ? attendanceIdOrObj.attendanceRecordId : attendanceIdOrObj;
    const decision = (isObj ? attendanceIdOrObj.decision : decisionArg) || 'Approved';
    const comments = (isObj ? attendanceIdOrObj.comments : commentsArg) || '';

    const actorEmp = actorArg?.id
      ? db.getEmployeeByUserId(actorArg.id)
      : isObj && attendanceIdOrObj.actorUserId
      ? db.getEmployeeByUserId(attendanceIdOrObj.actorUserId)
      : undefined;

    const actor = {
      id: actorArg?.id || (isObj ? attendanceIdOrObj.actorUserId : 'usr_hr'),
      employeeId: actorArg?.employeeId || actorEmp?.id || 'EMP-005',
      name: actorArg?.name || (isObj ? attendanceIdOrObj.actorName : 'HR Admin'),
      role: actorArg?.role || (isObj ? attendanceIdOrObj.actorRole : 'hr_admin'),
      email: actorArg?.email || actorEmp?.email || 'hr@orbyx.com'
    };

    const rec = db.getAttendanceRecords().find((r) => r.id === attendanceId);
    if (!rec) {
      const msg = 'Attendance record not found.';
      return { success: false, error: msg, message: msg };
    }

    if (!permissionService.canApproveCompanyAttendance(actor as any, rec.employeeId)) {
      const msg =
        'Unauthorized: Self-approval is prohibited and only authorized internal Reporting Managers, HR Administrators, or Senior Management can grant final company approval.';
      return { success: false, error: msg, message: msg };
    }

    const isClientSite = Boolean(rec.workMode === 'Client Site' || rec.assignmentId || rec.clientId);
    if (
      decision === 'Approved' &&
      isClientSite &&
      rec.clientVerificationStatus !== 'Verified' &&
      rec.clientVerificationStatus !== 'Not Required'
    ) {
      const msg = `Stage 1 Prerequisite Not Met: Client-site attendance for ${rec.employeeId} on ${rec.date} currently has Client Verification Status "${rec.clientVerificationStatus || 'Pending'}". Record the external client supervisor's email confirmation (or resolve the dispute) before granting final Company Approval for Payroll.`;
      return { success: false, error: msg, message: msg };
    }

    const nowIso = new Date().toISOString();
    const todayStr = nowIso.slice(0, 10);

    rec.companyApprovalStatus = decision;
    if (decision === 'Approved') {
      rec.payrollEligibilityStatus = 'Eligible for Draft Payroll';
      rec.approvalStatus = 'Approved';
      rec.approvedBy = `${actor.name} (${actor.role})`;
      rec.approvedAt = todayStr;
    } else if (decision === 'Returned for Correction') {
      rec.payrollEligibilityStatus = 'Not Eligible';
      rec.approvalStatus = 'Pending Client Verification';
    } else {
      rec.payrollEligibilityStatus = 'Not Eligible';
      rec.approvalStatus = 'Disputed';
    }

    rec.approvalHistory = [
      ...(rec.approvalHistory || []),
      {
        stage: `Stage 2: Internal Company Approval (${decision})`,
        actorName: actor.name,
        actorRole: actor.role,
        timestamp: nowIso,
        decision: decision === 'Approved' ? 'Approved' : decision === 'Rejected' ? 'Rejected' : 'Returned for Correction',
        comments: comments || `Company decision: ${decision}`
      }
    ];

    db.saveAttendanceRecord(rec);

    // Sync any linked ClientEmailConfirmation records
    if (rec.verificationRefId) {
      const confirmations = db.getClientEmailConfirmations();
      const linkedConf = confirmations.find((c) => c.id === rec.verificationRefId);
      if (linkedConf) {
        linkedConf.companyApprovalStatus =
          decision === 'Approved' ? 'Approved for Payroll' : decision;
        linkedConf.companyApprovedBy = actor.name;
        linkedConf.companyApprovedAt = todayStr;
        if (comments) linkedConf.reviewComments = comments;
        db.saveClientEmailConfirmation(linkedConf);
      }
    }

    // Sync any linked AttendanceCorrectionRequest
    const linkedCorr = db
      .getCorrectionRequests()
      .find((c) => c.employeeId === rec.employeeId && c.date === rec.date && c.status === 'Pending');
    if (linkedCorr) {
      linkedCorr.status = decision === 'Approved' ? 'Approved' : decision === 'Rejected' ? 'Rejected' : 'Returned for Correction';
      linkedCorr.companyApprovalStatus = decision;
      linkedCorr.approverComments = comments;
      linkedCorr.decidedAt = nowIso;
      db.saveCorrectionRequest(linkedCorr);
    }

    db.logAudit({
      actorUserId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
      action: decision === 'Approved' ? 'APPROVE' : 'REJECT',
      module: 'ATTENDANCE',
      entityId: rec.id,
      entityName: `${rec.employeeId} (${rec.date})`,
      description: `Stage 2 Company Attendance ${decision} by ${actor.name} for ${rec.employeeId} on ${rec.date}. Payroll Eligibility: ${rec.payrollEligibilityStatus}.`
    });

    return {
      success: true,
      message: `Stage 2 Company Attendance ${decision} recorded.`,
      record: rec
    };
  },

  decideAttendanceCorrection(
    requestId: string,
    decision: 'Approved' | 'Rejected',
    comments: string,
    actorUserId: string,
    actorName: string
  ): { success: boolean; error?: string; message: string } {
    const requests = db.getCorrectionRequests();
    const req = requests.find((r) => r.id === requestId);
    if (!req) {
      const msg = 'Request not found';
      return { success: false, error: msg, message: msg };
    }

    // Prevent prohibited self-approval per Separation of Duties
    const actorEmployee = db.getEmployeeByUserId(actorUserId);
    if (actorEmployee && actorEmployee.id === req.employeeId) {
      const msg = 'Unauthorized: Self-approval is strictly prohibited by organizational policy.';
      return { success: false, error: msg, message: msg };
    }

    const existing = db.getAttendanceRecords().find(
      (r) => r.employeeId === req.employeeId && r.date === req.date
    );
    const isClientSite = Boolean(
      req.requiresClientEmailVerification ||
        req.assignmentId ||
        req.clientId ||
        existing?.workMode === 'Client Site' ||
        existing?.assignmentId
    );
    const clientVerStatus = existing?.clientVerificationStatus || req.clientVerificationStatus;

    // Enforce Section 7 Scenario A & C: If deployed to client site, client supervisor email verification must be recorded before final company approval!
    if (
      decision === 'Approved' &&
      isClientSite &&
      clientVerStatus !== 'Verified' &&
      clientVerStatus !== 'Not Required'
    ) {
      const msg = `Client Email Verification Required: ${req.employeeId} is deployed to a client site on ${req.date} (Client Verification Status: ${clientVerStatus || 'Pending'}). Please record the external client supervisor's email confirmation before granting final Company Approval.`;
      return {
        success: false,
        error: msg,
        message: msg
      };
    }

    const nowIso = new Date().toISOString();
    req.status = decision;
    req.companyApprovalStatus = decision;
    req.approverComments = comments;
    req.decidedAt = nowIso;
    db.saveCorrectionRequest(req);

    if (decision === 'Approved') {
      const shifts = db.getShifts();
      const shift = shifts.find((s) => s.id === (req.shiftId || existing?.shiftId || 'SHIFT-GEN')) || shifts[0];
      const breakMins = req.breakDurationMinutes !== undefined ? req.breakDurationMinutes : (shift?.breakDurationMinutes ?? 60);

      const [inH, inM] = (req.requestedCheckIn || '09:30').split(':').map(Number);
      const [outH, outM] = (req.requestedCheckOut || '18:30').split(':').map(Number);
      let rawMins = (outH * 60 + outM) - (inH * 60 + inM);
      if (rawMins < 0) rawMins += 24 * 60;
      const workedMins = Math.max(0, rawMins - breakMins);
      const totalHoursWorked = req.calculatedHours !== undefined ? req.calculatedHours : Number((workedMins / 60).toFixed(2));
      const standardHours = shift?.totalWorkingHours || 8;
      const regularHours = Math.min(standardHours, totalHoursWorked);
      const overtimeHours = Math.max(0, Number((totalHoursWorked - standardHours).toFixed(2)));

      const [shiftH, shiftM] = (shift?.startTime || '09:30').split(':').map(Number);
      const graceMins = shift?.gracePeriodMinutes ?? 15;
      const isLate = (inH * 60 + inM) > (shiftH * 60 + shiftM + graceMins);
      const lateMinutes = isLate ? Math.max(0, (inH * 60 + inM) - (shiftH * 60 + shiftM)) : 0;

      const historyEntry = {
        stage: req.entryType === 'Manual Entry' ? 'Manual Entry Approved' : 'Correction Approved',
        actorName,
        actorRole: actorEmployee ? 'Approving Authority' : 'HR / Manager',
        timestamp: nowIso,
        decision: 'Approved' as const,
        comments: comments || undefined
      };

      const record: AttendanceRecord = {
        ...existing,
        id: existing?.id || `ATT-${req.date.replace(/-/g, '')}-${req.employeeId}`,
        employeeId: req.employeeId,
        date: req.date,
        entryDate: req.entryDate || existing?.entryDate || nowIso.slice(0, 10),
        shiftId: shift?.id || 'SHIFT-GEN',
        checkInTime: req.requestedCheckIn,
        checkOutTime: req.requestedCheckOut,
        breakDurationMinutes: breakMins,
        totalHoursWorked,
        regularHours,
        overtimeHours,
        status: req.requestedOutcome || (isLate ? 'Late' : totalHoursWorked < 4.5 ? 'Half Day' : 'Present'),
        isLate,
        isEarlyDeparture: false,
        lateMinutes,
        source: req.entryType === 'Manual Entry' ? 'Manual HR Entry' : 'Attendance Correction',
        workMode: isClientSite ? 'Client Site' : existing?.workMode || 'Office',
        assignmentId: req.assignmentId || existing?.assignmentId,
        clientId: req.clientId || existing?.clientId,
        projectName: req.projectName || existing?.projectName,
        clientSupervisorName: req.clientSupervisorName || existing?.clientSupervisorName,
        clientSupervisorEmail: req.clientSupervisorEmail || existing?.clientSupervisorEmail,
        clientVerificationStatus: isClientSite ? 'Verified' : 'Not Required',
        companyApprovalStatus: 'Approved',
        payrollEligibilityStatus: 'Eligible for Draft Payroll',
        entryType: req.entryType || 'Correction',
        exceptionType: req.exceptionType,
        outageIncidentRef: req.outageIncidentRef || existing?.outageIncidentRef,
        reason: req.reason,
        supportingEvidence: req.supportingEvidence,
        submittedBy: req.submittedBy || req.employeeId,
        submittedAt: req.submittedAt,
        originalCheckIn: existing?.originalCheckIn ?? existing?.checkInTime ?? req.originalCheckIn,
        originalCheckOut: existing?.originalCheckOut ?? existing?.checkOutTime ?? req.originalCheckOut,
        originalHours: existing?.originalHours ?? existing?.totalHoursWorked ?? req.originalHours,
        originalStatus: existing?.originalStatus ?? existing?.status ?? req.originalStatus,
        originalSource: existing?.originalSource ?? existing?.source,
        notes: `${req.entryType || 'Correction'} (${req.exceptionType || 'Exception'}): ${req.reason}${req.supportingEvidence ? ` [Ref: ${req.supportingEvidence}]` : ''}`,
        approvalStatus: 'Approved',
        approvedBy: actorName,
        approvedAt: nowIso.slice(0, 10),
        approvalHistory: [...(existing?.approvalHistory || []), historyEntry]
      };
      db.saveAttendanceRecord(record);

      // Post-Finalization Payroll Guard: If a payroll run for this attendance month is already Finalized or Paid,
      // flag it for controlled HR review/reopening without silently mutating finalized payslips.
      const [attYear, attMonth] = req.date.split('-').map(Number);
      const finalizedRun = db
        .getPayrollRuns()
        .find((r) => r.year === attYear && r.month === attMonth && (r.status === 'Finalized' || r.status === 'Paid'));
      if (finalizedRun) {
        finalizedRun.hasPostFinalizationAttendanceChange = true;
        finalizedRun.postFinalizationChangeNote = `Approved ${req.entryType || 'Attendance Correction'} for ${req.employeeId} on ${req.date} (${totalHoursWorked}h) by ${actorName}. Reopen run with audit reason if recalculation is required.`;
        db.savePayrollRun(finalizedRun);
      }
    } else if (existing) {
      existing.companyApprovalStatus = 'Rejected';
      existing.payrollEligibilityStatus = 'Not Eligible';
      existing.approvalStatus = 'Disputed';
      db.saveAttendanceRecord(existing);
    }

    const emp = db.getEmployeeById(req.employeeId);
    if (emp) {
      db.addNotification({
        targetUserId: emp.userId,
        title: `Attendance ${req.entryType || 'Correction'} ${decision}`,
        message: `Your ${req.entryType?.toLowerCase() || 'attendance correction'} for ${req.date} was ${decision.toLowerCase()} by ${actorName}.`,
        module: 'attendance'
      });
    }

    db.logAudit({
      actorUserId,
      actorName,
      actorRole: 'senior_manager',
      action: decision === 'Approved' ? 'APPROVE' : 'REJECT',
      module: 'ATTENDANCE',
      entityId: req.id,
      entityName: req.employeeId,
      description: `${decision} ${req.entryType || 'attendance correction'} for ${req.employeeId} on ${req.date}. Note: "${comments || 'None'}"`
    });

    return {
      success: true,
      message: `Attendance correction ${decision.toLowerCase()} successfully.`
    };
  },

  // ---------------- MODULE 3: PAYROLL ----------------
  generatePayrollPreview(
    month: number,
    year: number,
    actorUserId: string,
    actorName: string,
    options?: {
      branchId?: string;
      includeReimbursementsInPayroll?: boolean;
    }
  ): { run: PayrollRun; items: PayrollLineItem[] } {
    const periodLabel = new Date(year, month - 1, 1).toLocaleString('default', {
      month: 'long',
      year: 'numeric'
    });
    const runId = `PR-${year}-${String(month).padStart(2, '0')}`;
    const daysInMonth = new Date(year, month, 0).getDate();
    const monthPrefix = `${year}-${String(month).padStart(2, '0')}`;
    const startDate = `${monthPrefix}-01`;
    const endDate = `${monthPrefix}-${daysInMonth}`;

    const company = db.getCompanyProfile();
    const statConfig = company.statutoryConfig || {
      epfApplicable: true,
      epfEmployeeRatePercent: 12,
      epfEmployerRatePercent: 12,
      epfWageCeilingMonthly: 15000,
      epfRestrictToWageCeiling: false,
      epfEffectiveFrom: '2026-04-01',
      esiApplicable: true,
      esiGrossThresholdMonthly: 21000,
      esiEmployeeRatePercent: 0.75,
      esiEmployerRatePercent: 3.25,
      esiEffectiveFrom: '2026-04-01',
      ptApplicable: true,
      ptStateJurisdiction: company.state || 'Karnataka',
      ptMonthlySlabAmount: 200,
      ptMinGrossThreshold: 15000,
      ptEffectiveFrom: '2026-04-01',
      tdsApplicable: true,
      tdsFinancialYear: 'FY 2026-27',
      tdsDefaultRegime: 'New Regime (FY 2026-27)' as const,
      tdsEffectiveFrom: '2026-04-01'
    };

    const allActiveEmployees = db
      .getEmployees()
      .filter(
        (e) =>
          (e.status === 'Active' || e.status === 'Probation' || e.status === 'Notice Period') &&
          (!options?.branchId || options.branchId === 'ALL' || e.branchId === options.branchId)
      );
    const departments = db.getDepartments();
    const designations = db.getDesignations();
    const structures = db.getSalaryStructures();
    const leaveTypes = db.getLeaveTypes();
    const allLeaves = db.getLeaveApplications();
    const allAttendance = db.getAttendanceRecords();
    const allExpenses = db.getExpenseClaims();

    const clientAssignments = this.getClientDeploymentsFromStorage();

    const items: PayrollLineItem[] = [];
    let runTotalGross = 0;
    let runTotalDeductions = 0;
    let runTotalNet = 0;

    allActiveEmployees.forEach((emp) => {
      const dept = departments.find((d) => d.id === emp.departmentId)?.name || 'General';
      const desig = designations.find((d) => d.id === emp.designationId)?.title || 'Associate';
      const struct = structures.find((s) => s.id === emp.salaryStructureId) || structures[1] || structures[0];

      const complianceWarnings: string[] = [];
      const blockingErrors: string[] = [];

      // 1. Attendance & Leaves in this month
      const empMonthLeaves = allLeaves.filter(
        (a) =>
          a.employeeId === emp.id &&
          a.status === 'Approved' &&
          a.startDate.startsWith(monthPrefix)
      );

      let paidLeaves = 0;
      let unpaidDays = 0;
      empMonthLeaves.forEach((lv) => {
        const lt = leaveTypes.find((t) => t.id === lv.leaveTypeId);
        if (lv.leaveTypeId === 'LT-LOP' || (lt && !lt.isPaid)) {
          unpaidDays += lv.totalDays;
        } else {
          paidLeaves += lv.totalDays;
        }
      });

      // Section 9 Strict Payroll Eligibility Rule:
      // Only attendance records with companyApprovalStatus === 'Approved' (or legacy office records without pending/disputed status)
      // are eligible for payroll. Unapproved or Disputed client-site attendance records are excluded from payable days & overtime!
      const allEmpMonthAtt = allAttendance.filter(
        (r) => r.employeeId === emp.id && r.date.startsWith(monthPrefix)
      );

      const unapprovedOrDisputedAtt = allEmpMonthAtt.filter((r) => {
        if (r.clientVerificationStatus === 'Disputed' || r.clientVerificationStatus === 'Correction Requested') {
          return true;
        }
        if (r.companyApprovalStatus && r.companyApprovalStatus !== 'Approved') {
          return true;
        }
        if (r.approvalStatus && r.approvalStatus !== 'Approved') {
          return true;
        }
        return false;
      });

      if (unapprovedOrDisputedAtt.length > 0) {
        const nonPayableDates = Array.from(new Set(unapprovedOrDisputedAtt.map((r) => r.date)));
        unpaidDays += nonPayableDates.length;
        complianceWarnings.push(
          `Excluded ${nonPayableDates.length} unapproved/disputed attendance day(s) (${nonPayableDates.join(', ')}) from payable days — requires Client Email Verification & Company HR/Manager Approval.`
        );
      }

      const empMonthAtt = allEmpMonthAtt.filter((r) => {
        if (r.clientVerificationStatus === 'Disputed' || r.clientVerificationStatus === 'Correction Requested') {
          return false;
        }
        if (r.companyApprovalStatus && r.companyApprovalStatus !== 'Approved') {
          return false;
        }
        if (r.approvalStatus && r.approvalStatus !== 'Approved') {
          return false;
        }
        if (r.status === 'Absent') {
          return false;
        }
        return true;
      });

      const uniqueAttByDate = new Map<string, AttendanceRecord>();
      empMonthAtt.forEach((r) => {
        const existing = uniqueAttByDate.get(r.date);
        // Prefer approved or higher hours record if multiple entries exist for same date
        if (!existing || r.totalHoursWorked > existing.totalHoursWorked) {
          uniqueAttByDate.set(r.date, r);
        }
      });

      let approvedOvertimeHours = 0;
      uniqueAttByDate.forEach((r) => {
        if (r.overtimeHours > 0) {
          approvedOvertimeHours += r.overtimeHours;
        }
        if (r.payrollEligibilityStatus !== 'Finalized') {
          r.payrollEligibilityStatus = 'Included in Draft Payroll';
          db.saveAttendanceRecord(r);
        }
      });
      approvedOvertimeHours = Number(approvedOvertimeHours.toFixed(1));

      const workingDays = 30; // Standard commercial monthly denominator
      const scheduledWorkingDays = 22;
      const weeklyOffsAndHolidays = daysInMonth - scheduledWorkingDays;
      const payableDays = Math.max(0, workingDays - unpaidDays);
      const daysPresent = Math.max(0, payableDays - paidLeaves);
      const payableDaysFormula = `${workingDays} Standard Days - ${unpaidDays} Non-Payable/LOP Day(s) = ${payableDays} Payable Days (inc. ${paidLeaves} Paid Leave & Weekly Offs)`;

      // 2. Earnings Breakdown
      const basicItem = struct.items.find((i) => i.componentCode === 'BASIC');
      const hraItem = struct.items.find((i) => i.componentCode === 'HRA');
      const fullMonthlyGross = emp.baseSalaryAnnual
        ? Math.round(emp.baseSalaryAnnual / 12)
        : struct.grossMonthly;

      const perDayGross = fullMonthlyGross / workingDays;
      const lopDeduction = Math.round(unpaidDays * perDayGross);

      const baseAfterLop = Math.max(0, fullMonthlyGross - lopDeduction);
      const basicFull = basicItem ? basicItem.amountMonthly : Math.round(fullMonthlyGross * 0.5);
      const hraFull = hraItem ? hraItem.amountMonthly : Math.round(fullMonthlyGross * 0.25);

      const basicEarnings = Math.round(basicFull * (payableDays / workingDays));
      const hraEarnings = Math.round(hraFull * (payableDays / workingDays));
      const conveyanceEarnings = Math.round(1600 * (payableDays / workingDays));
      const specialAllowanceEarnings = Math.max(
        0,
        baseAfterLop - basicEarnings - hraEarnings - conveyanceEarnings
      );

      // Active Client Assignment Allowance (prorated by payable days)
      const activeClientAssignment = clientAssignments.find(
        (ca) =>
          ca.employeeId === emp.id &&
          (ca.status === 'Active' ||
            (ca.status === 'Completed' && ca.actualEndDate && ca.actualEndDate >= startDate)) &&
          ca.startDate <= endDate
      );
      const clientSiteAllowance =
        activeClientAssignment && activeClientAssignment.allowanceMonthly
          ? Math.round(activeClientAssignment.allowanceMonthly * (payableDays / workingDays))
          : 0;

      // Overtime Pay: Hourly rate = Basic / (30 * 8) * 1.5x multiplier
      const hourlyBasicRate = basicFull / (workingDays * 8);
      const overtimeEarnings =
        approvedOvertimeHours > 0 ? Math.round(approvedOvertimeHours * hourlyBasicRate * 1.5) : 0;

      const grossEarnings =
        basicEarnings +
        hraEarnings +
        conveyanceEarnings +
        specialAllowanceEarnings +
        clientSiteAllowance +
        overtimeEarnings;

      // 3. Configurable Statutory Deductions (EPF, ESI, PT, TDS)
      // EPF
      const isEmpEpfEligible = emp.epfApplicable !== false; // default true unless exempted
      let pfEmployee = 0;
      let pfEmployer = 0;
      let pfApplicabilityNote = '';

      if (!statConfig.epfApplicable) {
        pfApplicabilityNote = `Exempt at Organization Level (${statConfig.epfExemptionReason || 'EPF disabled in Org Statutory Settings'})`;
      } else if (!isEmpEpfEligible) {
        pfApplicabilityNote = `Exempt at Employee Level (${emp.statutoryExemptionReason || 'Opted out / Contractor'})`;
      } else {
        const useCeiling =
          emp.epfWageCeilingApplied !== undefined
            ? emp.epfWageCeilingApplied
            : statConfig.epfRestrictToWageCeiling;
        const pfWageBase = useCeiling
          ? Math.min(basicEarnings, statConfig.epfWageCeilingMonthly || 15000)
          : basicEarnings;
        const empRate = (statConfig.epfEmployeeRatePercent || 12) / 100;
        const emprRate = (statConfig.epfEmployerRatePercent || 12) / 100;
        pfEmployee = Math.round(pfWageBase * empRate);
        pfEmployer = Math.round(pfWageBase * emprRate);
        pfApplicabilityNote = useCeiling
          ? `${statConfig.epfEmployeeRatePercent}% on Basic capped at ₹${(statConfig.epfWageCeilingMonthly || 15000).toLocaleString()} ceiling`
          : `${statConfig.epfEmployeeRatePercent}% on actual Basic (₹${basicEarnings.toLocaleString()})`;

        if (!company.pfRegistrationNumber?.trim()) {
          complianceWarnings.push('Organization EPF registration number is missing in Organization Setup.');
        }
        if (!emp.pfUan?.trim()) {
          complianceWarnings.push(`EPF is enabled for ${emp.firstName}, but Employee PF UAN is not recorded.`);
        }
      }

      // ESI
      const isEmpEsiEligible = emp.esiApplicable !== false;
      const esiCeiling = statConfig.esiGrossThresholdMonthly || 21000;
      let esiEmployee = 0;
      let esiEmployer = 0;
      let esiApplicabilityNote = '';

      if (!statConfig.esiApplicable) {
        esiApplicabilityNote = `Exempt at Organization Level (${statConfig.esiExemptionReason || 'ESI disabled in Org Statutory Settings'})`;
      } else if (!isEmpEsiEligible) {
        esiApplicabilityNote = `Exempt at Employee Level (${emp.statutoryExemptionReason || 'Exempted'})`;
      } else if (grossEarnings > esiCeiling) {
        esiApplicabilityNote = `Not Applicable: Monthly Gross (₹${grossEarnings.toLocaleString()}) exceeds ₹${esiCeiling.toLocaleString()} ESI threshold`;
      } else {
        esiEmployee = Math.round(grossEarnings * ((statConfig.esiEmployeeRatePercent || 0.75) / 100));
        esiEmployer = Math.round(grossEarnings * ((statConfig.esiEmployerRatePercent || 3.25) / 100));
        esiApplicabilityNote = `${statConfig.esiEmployeeRatePercent}% Employee / ${statConfig.esiEmployerRatePercent}% Employer on Gross ≤ ₹${esiCeiling.toLocaleString()}`;
        if (!emp.esiNumber?.trim()) {
          complianceWarnings.push(`ESI is applicable for ${emp.firstName} (Gross ≤ ₹${esiCeiling.toLocaleString()}), but ESI IP Number is missing.`);
        }
      }

      // Professional Tax (PT)
      const isEmpPtEligible = emp.ptApplicable !== false && emp.employmentType !== 'Intern';
      let professionalTax = 0;
      let ptApplicabilityNote = '';
      if (!statConfig.ptApplicable) {
        ptApplicabilityNote = 'Professional Tax disabled for organization jurisdiction';
      } else if (!isEmpPtEligible) {
        ptApplicabilityNote = 'Exempt for employee classification';
      } else if (grossEarnings < (statConfig.ptMinGrossThreshold || 15000)) {
        ptApplicabilityNote = `Exempt: Gross below ₹${(statConfig.ptMinGrossThreshold || 15000).toLocaleString()} slab`;
      } else {
        professionalTax = statConfig.ptMonthlySlabAmount ?? 200;
        ptApplicabilityNote = `${statConfig.ptStateJurisdiction || 'State'} Slab: ₹${professionalTax}/month`;
      }

      // TDS / Income Tax Withholding
      const tdsItem = struct.items.find((i) => i.componentCode === 'TDS');
      let tdsWithholding = 0;
      let tdsApplicabilityNote = '';
      if (!statConfig.tdsApplicable) {
        tdsApplicabilityNote = 'TDS withholding disabled in Statutory Settings';
      } else if (emp.tdsRatePercent !== undefined && emp.tdsRatePercent > 0) {
        tdsWithholding = Math.round(grossEarnings * (emp.tdsRatePercent / 100));
        tdsApplicabilityNote = `Employee custom TDS rate: ${emp.tdsRatePercent}% of Gross`;
      } else if (tdsItem) {
        tdsWithholding = Math.round(tdsItem.amountMonthly * (payableDays / workingDays));
        tdsApplicabilityNote = `Structure projected TDS (${statConfig.tdsDefaultRegime})`;
      } else if (emp.baseSalaryAnnual > 1200000) {
        tdsWithholding = Math.round((grossEarnings - 75000) * 0.1);
        tdsApplicabilityNote = `Estimated slab withholding (${statConfig.tdsDefaultRegime})`;
      } else {
        tdsApplicabilityNote = 'Nil tax liability under ₹12L standard rebate threshold';
      }

      if (!emp.panOrTaxNumber?.trim()) {
        blockingErrors.push(`Missing PAN / Tax ID for ${emp.firstName} ${emp.lastName}`);
      }
      if (!emp.bankDetails?.accountNumber?.trim()) {
        blockingErrors.push(`Missing Bank Account Number for ${emp.firstName} ${emp.lastName}`);
      }

      // 4. Salary Advance Recovery
      let advanceIssued = 0;
      let advanceRecovery = 0;
      let advanceRemainingBalance = 0;
      try {
        const rawAdvances = localStorage.getItem('orbyx_hrms_advance_petty_cash_v1');
        if (rawAdvances) {
          const advances = JSON.parse(rawAdvances) as Array<{
            id: string;
            employeeId: string;
            type: string;
            amount: number;
            approvedAmount?: number;
            recoveredAmount?: number;
            status: string;
          }>;
          const empAdvances = advances.filter(
            (a) => a.employeeId === emp.id && a.type === 'Salary Advance' && a.status === 'Disbursed'
          );
          empAdvances.forEach((adv) => {
            const approved = adv.approvedAmount ?? adv.amount;
            const recovered = adv.recoveredAmount ?? 0;
            const outstanding = Math.max(0, approved - recovered);
            advanceIssued += approved;
            if (outstanding > 0) {
              const recoveryThisMonth = Math.min(outstanding, Math.round(grossEarnings * 0.25));
              advanceRecovery += recoveryThisMonth;
              advanceRemainingBalance += Math.max(0, outstanding - recoveryThisMonth);
            }
          });
        }
      } catch {
        advanceRecovery = 0;
      }

      // 5. Approved Expense Reimbursements (Pending Reimbursement, never double-counting already Reimbursed claims)
      const includeReimbursements = options?.includeReimbursementsInPayroll !== false;
      const pendingReimbursementClaims = includeReimbursements
        ? allExpenses.filter(
            (c) => c.employeeId === emp.id && c.status === 'Pending Reimbursement'
          )
        : [];
      const reimbursementsPayable = pendingReimbursementClaims.reduce((sum, c) => sum + c.amount, 0);

      // 6. Totals & Net Payable Formula
      // Note: LOP is already prorated out of Basic/HRA/Special Allowance above, so we display LOP for transparency without subtracting it twice from prorated Gross.
      const totalStatutoryDeductions = pfEmployee + esiEmployee + professionalTax + tdsWithholding;
      const totalOtherDeductions = advanceRecovery;
      const totalDeductions = totalStatutoryDeductions + totalOtherDeductions;
      const netPayable = Math.max(0, grossEarnings - totalDeductions + reimbursementsPayable);

      // Employer Cost
      const totalEmployerCost = grossEarnings + pfEmployer + esiEmployer + reimbursementsPayable;

      runTotalGross += grossEarnings;
      runTotalDeductions += totalDeductions;
      runTotalNet += netPayable;

      items.push({
        id: `ITEM-${runId}-${emp.id}`,
        payrollRunId: runId,
        periodLabel,
        employeeId: emp.id,
        employeeName: `${emp.firstName} ${emp.lastName}`,
        departmentName: dept,
        designationTitle: desig,
        bankAccountNumber: emp.bankDetails.accountNumber,
        panNumber: emp.panOrTaxNumber,
        workingDaysInMonth: workingDays,
        calendarDays: daysInMonth,
        scheduledWorkingDays,
        weeklyOffsAndHolidays,
        daysPresent,
        paidLeaves,
        unpaidLeaves: unpaidDays,
        approvedOvertimeHours,
        payableDays,
        payableDaysFormula,
        basicEarnings,
        hraEarnings,
        daEarnings: 0,
        conveyanceEarnings,
        specialAllowanceEarnings,
        clientSiteAllowance,
        overtimeEarnings,
        grossEarnings,
        pfEmployee,
        pfApplicabilityNote,
        esiEmployee,
        esiApplicabilityNote,
        professionalTax,
        ptApplicabilityNote,
        tdsWithholding,
        tdsApplicabilityNote,
        unpaidLeaveDeduction: lopDeduction,
        advanceRecovery,
        otherDeductions: advanceRecovery,
        totalStatutoryDeductions,
        totalOtherDeductions,
        totalDeductions,
        reimbursementsPayable,
        advanceIssued,
        advanceRecoveredThisMonth: advanceRecovery,
        advanceRemainingBalance,
        netPayable,
        pfEmployer,
        esiEmployer,
        totalEmployerCost,
        status: 'Calculated',
        complianceWarnings,
        blockingErrors
      });
    });

    const run: PayrollRun = {
      id: runId,
      month,
      year,
      periodLabel,
      startDate,
      endDate,
      totalEmployees: items.length,
      totalGrossPay: runTotalGross,
      totalDeductions: runTotalDeductions,
      totalNetPay: runTotalNet,
      status: 'Preview',
      processedBy: actorName
    };

    return { run, items };
  },

  finalizePayrollRun(
    run: PayrollRun,
    items: PayrollLineItem[],
    actorUserId: string,
    actorName: string
  ): void {
    const finalizedRun: PayrollRun = {
      ...run,
      status: 'Finalized',
      approvedBy: actorName,
      finalizedAt: new Date().toISOString()
    };

    const finalizedItems = items.map((i) => ({
      ...i,
      status: 'Finalized' as const
    }));

    db.savePayrollRun(finalizedRun);
    db.savePayrollLineItems(finalizedItems);

    // Transition approved attendance records in this month to Payroll Processing Status = 'Finalized'
    const monthPrefix = `${run.year}-${String(run.month).padStart(2, '0')}`;
    const allAtt = db.getAttendanceRecords();
    allAtt.forEach((rec) => {
      if (
        rec.date.startsWith(monthPrefix) &&
        (!rec.companyApprovalStatus || rec.companyApprovalStatus === 'Approved') &&
        rec.clientVerificationStatus !== 'Disputed'
      ) {
        rec.payrollEligibilityStatus = 'Finalized';
        db.saveAttendanceRecord(rec);
      }
    });

    // Broadcast notification to all employees that payslips are generated
    finalizedItems.forEach((item) => {
      const emp = db.getEmployeeById(item.employeeId);
      if (emp) {
        db.addNotification({
          targetUserId: emp.userId,
          title: `Payslip Available (${run.periodLabel})`,
          message: `Your payslip for ${run.periodLabel} is ready. Net Pay: ₹${item.netPayable.toLocaleString()}.`,
          module: 'payroll'
        });
      }
    });

    db.logAudit({
      actorUserId,
      actorName,
      actorRole: 'hr_admin',
      action: 'FINALIZE',
      module: 'PAYROLL',
      entityId: finalizedRun.id,
      entityName: finalizedRun.periodLabel,
      description: `Finalized and locked payroll for ${finalizedRun.periodLabel} (Net: ₹${finalizedRun.totalNetPay.toLocaleString()})`
    });
  },

  reopenPayrollRun(
    runId: string,
    reason: string,
    actorUserId: string,
    actorName: string
  ): { success: boolean; error?: string } {
    const run = db.getPayrollRuns().find((r) => r.id === runId);
    if (!run) return { success: false, error: 'Payroll run not found' };
    if (!reason.trim()) {
      return { success: false, error: 'An explicit audit reason is required to reopen a finalized payroll run.' };
    }

    run.status = 'Under Review';
    run.hasPostFinalizationAttendanceChange = false;
    run.postFinalizationChangeNote = undefined;
    run.notes = `Reopened by ${actorName} on ${new Date().toLocaleDateString()}: ${reason}`;
    db.savePayrollRun(run);

    const items = db.getPayrollLineItems(runId).map((i) => ({
      ...i,
      status: 'Calculated' as const
    }));
    db.savePayrollLineItems(items);

    db.logAudit({
      actorUserId,
      actorName,
      actorRole: 'hr_admin',
      action: 'UPDATE',
      module: 'PAYROLL',
      entityId: run.id,
      entityName: run.periodLabel,
      description: `Reopened finalized payroll run for ${run.periodLabel}. Reason: ${reason}`
    });

    return { success: true };
  },

  recordPayrollDisbursement(
    runId: string,
    paymentReference: string,
    actorUserId: string,
    actorName: string
  ): void {
    const run = db.getPayrollRuns().find((r) => r.id === runId);
    if (!run) return;

    run.status = 'Paid';
    run.paymentReference = paymentReference;
    run.paymentDate = new Date().toISOString().split('T')[0];
    db.savePayrollRun(run);

    const items = db.getPayrollLineItems(runId).map((i) => ({
      ...i,
      status: 'Paid' as const
    }));
    db.savePayrollLineItems(items);

    db.logAudit({
      actorUserId,
      actorName,
      actorRole: 'hr_admin',
      action: 'UPDATE',
      module: 'PAYROLL',
      entityId: run.id,
      entityName: run.periodLabel,
      description: `Disbursed salaries for ${run.periodLabel} via bank ref ${paymentReference}`
    });
  }
};
