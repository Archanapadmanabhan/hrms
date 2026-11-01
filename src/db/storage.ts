import {
  CompanyProfile,
  Branch,
  Department,
  Designation,
  Employee,
  LeaveType,
  LeaveApplication,
  Holiday,
  SalaryComponent,
  SalaryStructure,
  PayrollRun,
  PayrollLineItem,
  ExpenseCategory,
  ExpenseClaim,
  Asset,
  ShiftDefinition,
  AttendanceRecord,
  AttendanceCorrectionRequest,
  AuditLog,
  AppNotification,
  PolicyRule,
  GovernanceMember,
  GovernanceHistoryEntry,
  ClientEmailConfirmation,
  PolicyAcknowledgement,
  DelegationRecord
} from '../types/hrms';
import {
  initialCompanyProfile,
  initialBranches,
  initialDepartments,
  initialDesignations,
  initialShifts,
  initialLeaveTypes,
  initialHolidays,
  initialSalaryComponents,
  initialSalaryStructures,
  initialEmployees,
  initialLeaveApplications,
  initialExpenseCategories,
  initialExpenseClaims,
  initialAssets,
  initialAttendanceRecords,
  initialCorrectionRequests,
  initialPayrollRuns,
  initialPayrollLineItems,
  initialAuditLogs,
  initialNotifications
} from './initialData';
import { seedRealisticDemoRequests } from './demoDataSeeder';

const DB_PREFIX = 'orbyx_hrms_v3_';

export const initialGovernanceMembers: GovernanceMember[] = [
  {
    id: 'GOV-001',
    name: 'Vikramaditya Sen',
    role: 'Chairman',
    email: 'v.sen.founder@orbyx.board',
    phone: '+91 80 4092 1001',
    avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
    oversightTargetEmployeeId: 'EMP-000',
    effectiveFrom: '2020-01-01',
    isActive: true,
    isPayrollEmployee: false,
    committeeRole: 'Board Chairman & Founder Promoter',
    notes: 'Presides over Board of Directors; provides strategic governance oversight to the Managing Director (EMP-000). Non-payroll governance position.',
    updatedAt: '2026-10-01',
    updatedBy: 'Rajeshwari Nair (Super Admin)'
  },
  {
    id: 'GOV-002',
    name: 'Justice (Retd.) Arundhati Deshmukh',
    role: 'Independent Director',
    email: 'a.deshmukh@orbyx.board',
    phone: '+91 22 4091 9002',
    avatarUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop=80',
    oversightTargetEmployeeId: 'EMP-000',
    effectiveFrom: '2022-04-01',
    isActive: true,
    isPayrollEmployee: false,
    committeeRole: 'Chairperson — Audit, Risk & Remuneration Committee',
    notes: 'Independent non-executive Board Member overseeing statutory compliance and executive governance.',
    updatedAt: '2026-10-01',
    updatedBy: 'Rajeshwari Nair (Super Admin)'
  }
];

export const initialGovernanceHistory: GovernanceHistoryEntry[] = [
  {
    id: 'GOV-HIST-001',
    timestamp: '2026-04-01T09:00:00Z',
    memberId: 'GOV-001',
    memberName: 'Vikramaditya Sen',
    role: 'Chairman',
    action: 'OVERSIGHT_LINKED',
    effectiveDate: '2020-01-01',
    actorUserId: 'user_super_admin',
    actorName: 'Rajeshwari Nair',
    details: 'Confirmed Chairman of the Board governance oversight over Managing Director Dr. Selvakumar (EMP-000)'
  },
  {
    id: 'GOV-HIST-002',
    timestamp: '2026-04-01T09:15:00Z',
    memberId: 'GOV-002',
    memberName: 'Justice (Retd.) Arundhati Deshmukh',
    role: 'Independent Director',
    action: 'CREATED',
    effectiveDate: '2022-04-01',
    actorUserId: 'user_super_admin',
    actorName: 'Rajeshwari Nair',
    details: 'Appointed Independent Director to Board Audit & Remuneration Committee above MD'
  }
];

export const initialClientEmailConfirmations: ClientEmailConfirmation[] = [
  {
    id: 'CEC-2026-001',
    assignmentId: 'CAS-201',
    clientId: 'CLI-101',
    clientName: 'Apex FinTech Global',
    employeeId: 'EMP-003',
    project: 'Core Banking Ledger Modernization',
    senderName: 'Vikramaditya Rao',
    senderEmail: 'v.rao@apexfintech.example.com',
    confirmationDate: '2026-10-22',
    attendanceStartDate: '2026-10-01',
    attendanceEndDate: '2026-10-22',
    confirmedDaysCount: 16,
    confirmedHoursTotal: 128,
    summary: 'Client Delivery Director email confirming 16 onsite billing days (128 hrs) for Archana at Mumbai BKC site with zero absences.',
    messageIdReference: 'MSG-APEX-20261022-9941',
    attachmentFileName: 'ApexFinTech_Signed_Timesheet_Oct2026_EMP003.pdf',
    authenticityStatus: 'Verified Supporting Document Attached',
    recordedByUserId: 'user_hr_admin',
    recordedByName: 'Anamika',
    recordedAt: '2026-10-22T17:30:00Z',
    verificationOutcome: 'Verified by Client',
    companyApprovalStatus: 'Approved for Payroll',
    companyApprovedBy: 'Krishnaraj',
    companyApprovedAt: '2026-10-23',
    reviewComments: 'Cross-checked against signed client PDF attachment and approved for October payroll.'
  },
  {
    id: 'CEC-2026-002',
    assignmentId: 'CAS-202',
    clientId: 'CLI-102',
    clientName: 'Horizon Retail Systems',
    employeeId: 'EMP-004',
    project: 'Omnichannel Checkout Microservices',
    senderName: 'Meera Krishnan',
    senderEmail: 'meera.k@horizonretail.example.com',
    confirmationDate: '2026-10-24',
    attendanceStartDate: '2026-10-01',
    attendanceEndDate: '2026-10-24',
    confirmedDaysCount: 17,
    confirmedHoursTotal: 136.5,
    summary: 'Weekly client supervisor email verification for Mahalakshmi (17 days present, including 0.5h sprint deployment overtime on Oct 21).',
    messageIdReference: 'MSG-HRZN-20261024-3318',
    attachmentFileName: 'Horizon_Email_Confirmation_Oct24.eml',
    authenticityStatus: 'Manually Recorded by Authorized User',
    recordedByUserId: 'user_manager',
    recordedByName: 'Krishnaraj',
    recordedAt: '2026-10-24T15:10:00Z',
    verificationOutcome: 'Verified by Client',
    companyApprovalStatus: 'Pending HR/Manager Final Approval',
    reviewComments: 'Client supervisor verified email logged; awaiting final HR/Manager sign-off for payroll.'
  }
];

export const initialDelegations: DelegationRecord[] = [
  {
    id: 'DEL-2026-001',
    delegatorUserId: 'user_md_selvakumar',
    delegatorEmployeeId: 'EMP-000',
    delegatorName: 'Dr. Selvakumar',
    delegatorRole: 'senior_manager',
    delegateUserId: 'user_hr_admin',
    delegateEmployeeId: 'EMP-001',
    delegateName: 'Anamika',
    delegateRole: 'hr_admin',
    permittedActions: ['APPROVE_LEAVE', 'APPROVE_ATTENDANCE', 'APPROVE_EXPENSE', 'APPROVE_POLICY'],
    applicableModules: ['Leave', 'Attendance', 'Expense', 'Policies'],
    effectiveFrom: '2026-10-01',
    effectiveTo: '2026-12-31',
    reason: 'Delegated executive operational approvals during Q4 international client roadshow.',
    status: 'Active',
    grantedByUserId: 'user_md_selvakumar',
    grantedByName: 'Dr. Selvakumar (MD)',
    createdAt: '2026-10-01T09:00:00Z'
  },
  {
    id: 'DEL-2026-002',
    delegatorUserId: 'user_founder',
    delegatorEmployeeId: 'GOV-001',
    delegatorName: 'Vikramaditya Sen',
    delegatorRole: 'founder',
    delegateUserId: 'user_md_selvakumar',
    delegateEmployeeId: 'EMP-000',
    delegateName: 'Dr. Selvakumar',
    delegateRole: 'senior_manager',
    permittedActions: ['APPROVE_POLICY', 'CONFIGURE_GOVERNANCE', 'APPROVE_PAYROLL'],
    applicableModules: ['Policies', 'Organization', 'Payroll'],
    effectiveFrom: '2026-04-01',
    effectiveTo: '2027-03-31',
    reason: 'Annual Board resolution authorizing Managing Director to execute Founder policy & payroll sign-offs.',
    status: 'Active',
    grantedByUserId: 'user_founder',
    grantedByName: 'Vikramaditya Sen (Founder & Chairman)',
    createdAt: '2026-04-01T10:00:00Z'
  },
  {
    id: 'DEL-2026-003',
    delegatorUserId: 'user_md_selvakumar',
    delegatorEmployeeId: 'EMP-000',
    delegatorName: 'Dr. Selvakumar',
    delegatorRole: 'senior_manager',
    delegateUserId: 'user_manager',
    delegateEmployeeId: 'EMP-002',
    delegateName: 'Krishnaraj',
    delegateRole: 'reporting_manager',
    permittedActions: ['APPROVE_EXPENSE', 'MANAGE_CLIENT_DEPLOYMENTS'],
    applicableModules: ['Expense', 'Clients'],
    effectiveFrom: '2026-08-01',
    effectiveTo: '2026-09-30',
    reason: 'Temporary Q3 delivery budget delegation (now expired).',
    status: 'Expired',
    grantedByUserId: 'user_md_selvakumar',
    grantedByName: 'Dr. Selvakumar (MD)',
    createdAt: '2026-08-01T09:00:00Z'
  }
];

export const initialPolicies: PolicyRule[] = [
  {
    id: 'POL-ORG-001',
    code: 'ORG-PROB-60',
    name: 'Standard Probation & Notice Period Policy',
    module: 'Organization',
    description: 'Defines standard 90-day probation duration and 60-day notice period for permanent staff.',
    rulesSummary: 'Probation: 90 days · Notice Period: 60 days · Circular reporting strictly blocked.',
    parameters: { probationDays: 90, noticePeriodDays: 60, allowCircularHierarchy: false },
    effectiveFrom: '2026-01-01',
    reviewExpiryDate: '2026-12-31',
    ownerDepartment: 'People & Culture (HR)',
    applicableTo: 'All Permanent Employees',
    isActive: true,
    versionNumber: '1.0',
    lifecycleStatus: 'Published',
    requiresAcknowledgement: true,
    approvedBy: 'Dr. Selvakumar (MD)',
    approvedAt: '2026-01-01',
    publishedBy: 'Anamika (HR)',
    publishedAt: '2026-01-01',
    updatedAt: '2026-10-01',
    updatedBy: 'Anamika (HR)'
  },
  {
    id: 'POL-LV-001',
    code: 'LV-ACCRUAL-2026',
    name: 'Annual Leave Accrual & Carry-Forward Rule',
    module: 'Leave',
    description: 'Governs annual paid leave quota, carry-forward cap at fiscal year-end, and LOP fallback.',
    rulesSummary: 'Carry-forward cap: 10 days · Half-day allowed on AL/CL/SL · Negative balance blocked for paid leaves.',
    parameters: { maxCarryForward: 10, allowHalfDay: true, excludeWeekendsAndHolidays: true },
    effectiveFrom: '2026-01-01',
    reviewExpiryDate: '2026-12-31',
    ownerDepartment: 'People & Culture (HR)',
    applicableTo: 'All Active Employees',
    isActive: true,
    versionNumber: '1.0',
    lifecycleStatus: 'Published',
    requiresAcknowledgement: true,
    approvedBy: 'Dr. Selvakumar (MD)',
    approvedAt: '2026-01-01',
    publishedBy: 'Anamika (HR)',
    publishedAt: '2026-01-01',
    updatedAt: '2026-10-05',
    updatedBy: 'Anamika (HR)'
  },
  {
    id: 'POL-ATT-001',
    code: 'ATT-GRACE-OT',
    name: 'Shift Grace Window, Outage Recovery & Overtime Policy',
    module: 'Attendance',
    description: 'Sets 15-minute grace window, controlled manual attendance entry during biometric/server outages, and overtime calculation beyond 8 regular hours.',
    rulesSummary: 'Grace period: 15 mins · Regular shift: 8.0 hrs · Manual outage entries require incident reference & manager/HR approval.',
    parameters: { graceMinutes: 15, standardHours: 8, overtimeRateMultiplier: 1.5, requireOutageEvidence: true },
    effectiveFrom: '2026-01-01',
    reviewExpiryDate: '2026-12-31',
    ownerDepartment: 'People & Culture (HR)',
    applicableTo: 'All Shift-Assigned Staff',
    isActive: true,
    versionNumber: '1.0',
    lifecycleStatus: 'Published',
    requiresAcknowledgement: true,
    approvedBy: 'Dr. Selvakumar (MD)',
    approvedAt: '2026-01-01',
    publishedBy: 'Anamika (HR)',
    publishedAt: '2026-01-01',
    updatedAt: '2026-10-10',
    updatedBy: 'Anamika (HR)'
  },
  {
    id: 'POL-PAY-001',
    code: 'PAY-STAT-REC',
    name: 'Statutory Deductions & Advance Recovery Cap',
    module: 'Payroll',
    description: 'Configures PF (12% of Basic), PT slab (₹200), LOP 30-day denominator, and max 25% gross cap on monthly salary advance recovery.',
    rulesSummary: 'PF: 12% Basic · PT: ₹200/mo · Max Advance Recovery: 25% of Monthly Gross · Locked after Finalize.',
    parameters: { pfRatePercent: 12, ptMonthly: 200, maxAdvanceRecoveryPercent: 25, lopDenominatorDays: 30 },
    effectiveFrom: '2026-04-01',
    reviewExpiryDate: '2027-03-31',
    ownerDepartment: 'Finance & Accounts',
    applicableTo: 'All Payroll Eligible Employees',
    isActive: true,
    versionNumber: '1.0',
    lifecycleStatus: 'Published',
    requiresAcknowledgement: true,
    approvedBy: 'Dr. Selvakumar (MD)',
    approvedAt: '2026-04-01',
    publishedBy: 'Anamika (HR)',
    publishedAt: '2026-04-01',
    updatedAt: '2026-10-12',
    updatedBy: 'Anamika (HR)'
  },
  {
    id: 'POL-EXP-001',
    code: 'EXP-REIMB-SETTLE',
    name: 'Business Expense & Travel Petty Cash Settlement Rule',
    module: 'Expense',
    description: 'Enforces category claim limits, mandatory tax invoices above ₹500, and separate approval vs UTR disbursement.',
    rulesSummary: 'Duplicate date+amount claims blocked · Travel advance settled via Actual minus Disbursed balance.',
    parameters: { receiptMandatoryThreshold: 500, blockDuplicateClaims: true, settlementWindowDays: 14 },
    effectiveFrom: '2026-01-01',
    reviewExpiryDate: '2026-12-31',
    ownerDepartment: 'Finance & Accounts',
    applicableTo: 'All Employees',
    isActive: true,
    versionNumber: '1.0',
    lifecycleStatus: 'Published',
    requiresAcknowledgement: true,
    approvedBy: 'Dr. Selvakumar (MD)',
    approvedAt: '2026-01-01',
    publishedBy: 'Anamika (HR)',
    publishedAt: '2026-01-01',
    updatedAt: '2026-10-14',
    updatedBy: 'Anamika (HR)'
  },
  {
    id: 'POL-AST-001',
    code: 'AST-CUSTODY-REV',
    name: 'IT Hardware Custody & Offboarding Access Revocation',
    module: 'Asset',
    description: 'Mandates employee receipt acknowledgement upon allocation and mandatory hardware/license recovery prior to exit clearance.',
    rulesSummary: 'Unique active custodian per hardware serial · Mandatory digital access revocation on offboarding.',
    parameters: { acknowledgementSlaDays: 3, renewalAlertDays: 30, blockExitWithoutAssetReturn: true },
    effectiveFrom: '2026-01-01',
    reviewExpiryDate: '2026-12-31',
    ownerDepartment: 'IT & Security Operations',
    applicableTo: 'All Employees & Custodians',
    isActive: true,
    versionNumber: '1.0',
    lifecycleStatus: 'Published',
    requiresAcknowledgement: true,
    approvedBy: 'Dr. Selvakumar (MD)',
    approvedAt: '2026-01-01',
    publishedBy: 'Anamika (HR)',
    publishedAt: '2026-01-01',
    updatedAt: '2026-10-15',
    updatedBy: 'Anamika (HR)'
  },
  {
    id: 'POL-CLI-001',
    code: 'CLI-DEPLOY-ALLOW',
    name: 'Client Deployment, Email Verification & Onsite Allowance Policy',
    module: 'Client',
    description: 'Governs external client deployments, client supervisor email verification, mandatory Company HR/Manager final approval, and onsite allowances.',
    rulesSummary: '2-Stage Verification (Client Supervisor + Company HR/Mgr) required for payroll · Client release retains Active company employment.',
    parameters: { defaultOnsiteAllowanceMonthly: 5000, maxAllocationPercent: 100, preserveEmploymentOnClose: true, requireTwoStageVerification: true },
    effectiveFrom: '2026-01-01',
    reviewExpiryDate: '2026-12-31',
    ownerDepartment: 'Engineering & Delivery',
    applicableTo: 'Client-Deployed Consultants & Engineers',
    isActive: true,
    versionNumber: '1.0',
    lifecycleStatus: 'Published',
    requiresAcknowledgement: true,
    approvedBy: 'Dr. Selvakumar (MD)',
    approvedAt: '2026-01-01',
    publishedBy: 'Anamika (HR)',
    publishedAt: '2026-01-01',
    updatedAt: '2026-10-18',
    updatedBy: 'Anamika (HR)'
  },
  {
    id: 'POL-STAT-001',
    code: 'STAT-EPF-ESI-PT-26',
    name: 'Statutory Compliance & Withholding Policy (EPF, ESI, PT, TDS)',
    module: 'Statutory',
    description: 'Governs statutory provident fund ceiling, ESI gross eligibility threshold (₹21,000), state PT slab, and TDS regime elections.',
    rulesSummary: 'EPF: 12% Employee + 12% Employer (₹15,000 wage ceiling option) · ESI: 0.75% Emp / 3.25% Er up to ₹21,000 Gross · PT: ₹200/mo.',
    parameters: { epfCeiling: 15000, esiGrossLimit: 21000, ptSlabMonthly: 200, tdsDefaultRegime: 'New Regime' },
    effectiveFrom: '2026-04-01',
    reviewExpiryDate: '2027-03-31',
    ownerDepartment: 'Finance & Statutory Compliance',
    applicableTo: 'All Statutory-Eligible Staff',
    isActive: true,
    versionNumber: '1.0',
    lifecycleStatus: 'Published',
    requiresAcknowledgement: true,
    approvedBy: 'Dr. Selvakumar (MD)',
    approvedAt: '2026-04-01',
    publishedBy: 'Anamika (HR)',
    publishedAt: '2026-04-01',
    updatedAt: '2026-10-20',
    updatedBy: 'Anamika (HR)'
  },
  {
    id: 'POL-EXIT-001',
    code: 'EXIT-CLR-FNF-60',
    name: 'Employee Separation, Notice Buyout & Mandatory Clearance Policy',
    module: 'Employee & Exit',
    description: 'Mandates 4-stage clearance (IT Hardware Return, Digital Access Revocation, Finance Settlement, Knowledge Handover) before separation.',
    rulesSummary: 'Standard notice: 60 days · Final separation blocked until all 4 clearance gates are verified · F&F settled within 15 days of LWD.',
    parameters: { standardNoticeDays: 60, requireHardwareReturn: true, requireAccessRevocation: true, fnfSlaDays: 15 },
    effectiveFrom: '2026-01-01',
    reviewExpiryDate: '2026-12-31',
    ownerDepartment: 'People & Culture (HR)',
    applicableTo: 'All Separating Employees',
    isActive: true,
    versionNumber: '1.0',
    lifecycleStatus: 'Published',
    requiresAcknowledgement: true,
    approvedBy: 'Dr. Selvakumar (MD)',
    approvedAt: '2026-01-01',
    publishedBy: 'Anamika (HR)',
    publishedAt: '2026-01-01',
    updatedAt: '2026-10-22',
    updatedBy: 'Anamika (HR)'
  },
  {
    id: 'POL-WRK-DRAFT-001',
    code: 'ATT-HYBRID-2027-DRAFT',
    name: 'FY 2027 Hybrid Work & Flexi-Shift Proposal (Draft)',
    module: 'Attendance',
    description: 'Proposed policy update for 3-day office / 2-day remote work schedule pending MD and Founder review.',
    rulesSummary: 'Draft Only (Hidden from regular employees until Published) · Core hours 11:00–16:00 · Requires MD approval.',
    parameters: { officeDaysPerWeek: 3, remoteDaysPerWeek: 2, coreStartHour: 11 },
    effectiveFrom: '2027-01-01',
    reviewExpiryDate: '2027-12-31',
    ownerDepartment: 'People & Culture (HR)',
    applicableTo: 'Engineering & Product Delivery Teams',
    isActive: false,
    versionNumber: '0.9',
    lifecycleStatus: 'Draft',
    requiresAcknowledgement: true,
    updatedAt: '2026-10-25',
    updatedBy: 'Anamika (HR)'
  }
];

export const initialPolicyAcknowledgements: PolicyAcknowledgement[] = [
  {
    id: 'PACK-001',
    policyId: 'POL-ORG-001',
    policyCode: 'ORG-PROB-60',
    policyName: 'Standard Probation & Notice Period Policy',
    versionNumber: '1.0',
    employeeId: 'EMP-003',
    status: 'Acknowledged',
    acknowledgedAt: '2026-10-05T10:15:00Z',
    dueDate: '2026-10-31',
    comments: 'Read and understood probation and notice terms.'
  },
  {
    id: 'PACK-002',
    policyId: 'POL-LV-001',
    policyCode: 'LV-ACCRUAL-2026',
    policyName: 'Annual Leave Accrual & Carry-Forward Rule',
    versionNumber: '1.0',
    employeeId: 'EMP-003',
    status: 'Acknowledged',
    acknowledgedAt: '2026-10-06T11:20:00Z',
    dueDate: '2026-10-31'
  },
  {
    id: 'PACK-003',
    policyId: 'POL-ORG-001',
    policyCode: 'ORG-PROB-60',
    policyName: 'Standard Probation & Notice Period Policy',
    versionNumber: '1.0',
    employeeId: 'EMP-004',
    status: 'Acknowledged',
    acknowledgedAt: '2026-10-07T09:45:00Z',
    dueDate: '2026-10-31'
  }
];

type StorageListener = () => void;
const listeners = new Set<StorageListener>();

export function subscribeToDB(listener: StorageListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function notifySubscribers() {
  listeners.forEach((listener) => {
    try {
      listener();
    } catch (e) {
      console.error('Error in DB subscriber:', e);
    }
  });
}

function getItem<T>(key: string, defaultValue: T): T {
  try {
    const raw = localStorage.getItem(DB_PREFIX + key);
    if (!raw) return defaultValue;
    return JSON.parse(raw) as T;
  } catch (e) {
    console.error(`Failed to read ${key} from storage:`, e);
    return defaultValue;
  }
}

function setItem<T>(key: string, value: T): void {
  try {
    localStorage.setItem(DB_PREFIX + key, JSON.stringify(value));
    notifySubscribers();
  } catch (e) {
    console.error(`Failed to write ${key} to storage:`, e);
  }
}

export function initDatabase(): void {
  if (!localStorage.getItem(DB_PREFIX + 'initialized')) {
    resetToSeedData();
  } else {
    // One-time migration to ensure EMP-000 (MD) photo matches his canonical executive portrait if still using old seed string
    try {
      const emps = getItem<Employee[]>('employees', initialEmployees);
      const mdIdx = emps.findIndex((e) => e.id === 'EMP-000');
      if (
        mdIdx >= 0 &&
        emps[mdIdx].avatarUrl ===
          'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
      ) {
        emps[mdIdx].avatarUrl =
          'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80';
        localStorage.setItem(DB_PREFIX + 'employees', JSON.stringify(emps));
      }
    } catch {
      // ignore
    }
    seedRealisticDemoRequests();
  }
}

export function resetToSeedData(): void {
  localStorage.setItem(DB_PREFIX + 'companyProfile', JSON.stringify(initialCompanyProfile));
  localStorage.setItem(DB_PREFIX + 'branches', JSON.stringify(initialBranches));
  localStorage.setItem(DB_PREFIX + 'departments', JSON.stringify(initialDepartments));
  localStorage.setItem(DB_PREFIX + 'designations', JSON.stringify(initialDesignations));
  localStorage.setItem(DB_PREFIX + 'shifts', JSON.stringify(initialShifts));
  localStorage.setItem(DB_PREFIX + 'leaveTypes', JSON.stringify(initialLeaveTypes));
  localStorage.setItem(DB_PREFIX + 'holidays', JSON.stringify(initialHolidays));
  localStorage.setItem(DB_PREFIX + 'salaryComponents', JSON.stringify(initialSalaryComponents));
  localStorage.setItem(DB_PREFIX + 'salaryStructures', JSON.stringify(initialSalaryStructures));
  localStorage.setItem(DB_PREFIX + 'employees', JSON.stringify(initialEmployees));
  localStorage.setItem(DB_PREFIX + 'leaveApplications', JSON.stringify(initialLeaveApplications));
  localStorage.setItem(DB_PREFIX + 'expenseCategories', JSON.stringify(initialExpenseCategories));
  localStorage.setItem(DB_PREFIX + 'expenseClaims', JSON.stringify(initialExpenseClaims));
  localStorage.setItem(DB_PREFIX + 'assets', JSON.stringify(initialAssets));
  localStorage.setItem(DB_PREFIX + 'attendanceRecords', JSON.stringify(initialAttendanceRecords));
  localStorage.setItem(DB_PREFIX + 'correctionRequests', JSON.stringify(initialCorrectionRequests));
  localStorage.setItem(DB_PREFIX + 'payrollRuns', JSON.stringify(initialPayrollRuns));
  localStorage.setItem(DB_PREFIX + 'payrollLineItems', JSON.stringify(initialPayrollLineItems));
  localStorage.setItem(DB_PREFIX + 'auditLogs', JSON.stringify(initialAuditLogs));
  localStorage.setItem(DB_PREFIX + 'notifications', JSON.stringify(initialNotifications));
  localStorage.setItem(DB_PREFIX + 'policies', JSON.stringify(initialPolicies));
  localStorage.setItem(DB_PREFIX + 'governanceMembers', JSON.stringify(initialGovernanceMembers));
  localStorage.setItem(DB_PREFIX + 'governanceHistory', JSON.stringify(initialGovernanceHistory));
  localStorage.setItem(
    DB_PREFIX + 'clientEmailConfirmations',
    JSON.stringify(initialClientEmailConfirmations)
  );
  localStorage.setItem(
    DB_PREFIX + 'policyAcknowledgements',
    JSON.stringify(initialPolicyAcknowledgements)
  );
  localStorage.setItem(DB_PREFIX + 'delegations', JSON.stringify(initialDelegations));
  localStorage.setItem(DB_PREFIX + 'initialized', 'true');
  seedRealisticDemoRequests();
  notifySubscribers();
}

// ---------------- TYPED REPOSITORIES ----------------

export const db = {
  // Company Profile
  getCompanyProfile(): CompanyProfile {
    return getItem<CompanyProfile>('companyProfile', initialCompanyProfile);
  },
  updateCompanyProfile(profile: Partial<CompanyProfile>): CompanyProfile {
    const current = this.getCompanyProfile();
    const updated = { ...current, ...profile };
    setItem('companyProfile', updated);
    return updated;
  },

  // Branches
  getBranches(): Branch[] {
    return getItem<Branch[]>('branches', initialBranches);
  },
  saveBranch(branch: Branch): void {
    const list = this.getBranches();
    const idx = list.findIndex((b) => b.id === branch.id);
    if (idx >= 0) list[idx] = branch;
    else list.push(branch);
    setItem('branches', list);
  },

  // Departments
  getDepartments(): Department[] {
    return getItem<Department[]>('departments', initialDepartments);
  },
  saveDepartment(dept: Department): void {
    const list = this.getDepartments();
    const idx = list.findIndex((d) => d.id === dept.id);
    if (idx >= 0) list[idx] = dept;
    else list.push(dept);
    setItem('departments', list);
  },

  // Designations
  getDesignations(): Designation[] {
    return getItem<Designation[]>('designations', initialDesignations);
  },
  saveDesignation(desig: Designation): void {
    const list = this.getDesignations();
    const idx = list.findIndex((d) => d.id === desig.id);
    if (idx >= 0) list[idx] = desig;
    else list.push(desig);
    setItem('designations', list);
  },

  // Employees
  getEmployees(): Employee[] {
    return getItem<Employee[]>('employees', initialEmployees);
  },
  getEmployeeById(id: string): Employee | undefined {
    return this.getEmployees().find((e) => e.id === id);
  },
  getEmployeeByUserId(userId: string): Employee | undefined {
    return this.getEmployees().find((e) => e.userId === userId);
  },
  saveEmployee(emp: Employee): void {
    const list = this.getEmployees();
    const idx = list.findIndex((e) => e.id === emp.id);
    if (idx >= 0) list[idx] = emp;
    else list.push(emp);
    setItem('employees', list);
  },

  // Shifts
  getShifts(): ShiftDefinition[] {
    return getItem<ShiftDefinition[]>('shifts', initialShifts);
  },
  saveShift(shift: ShiftDefinition): void {
    const list = this.getShifts();
    const idx = list.findIndex((s) => s.id === shift.id);
    if (idx >= 0) list[idx] = shift;
    else list.push(shift);
    setItem('shifts', list);
  },

  // Leave Types & Policies
  getLeaveTypes(): LeaveType[] {
    return getItem<LeaveType[]>('leaveTypes', initialLeaveTypes);
  },
  saveLeaveType(lt: LeaveType): void {
    const list = this.getLeaveTypes();
    const idx = list.findIndex((l) => l.id === lt.id);
    if (idx >= 0) list[idx] = lt;
    else list.push(lt);
    setItem('leaveTypes', list);
  },

  // Holidays
  getHolidays(): Holiday[] {
    return getItem<Holiday[]>('holidays', initialHolidays);
  },
  saveHoliday(h: Holiday): void {
    const list = this.getHolidays();
    const idx = list.findIndex((item) => item.id === h.id);
    if (idx >= 0) list[idx] = h;
    else list.push(h);
    setItem('holidays', list);
  },
  deleteHoliday(id: string): void {
    const list = this.getHolidays().filter((h) => h.id !== id);
    setItem('holidays', list);
  },

  // Leave Applications
  getLeaveApplications(): LeaveApplication[] {
    return getItem<LeaveApplication[]>('leaveApplications', initialLeaveApplications);
  },
  saveLeaveApplication(app: LeaveApplication): void {
    const list = this.getLeaveApplications();
    const idx = list.findIndex((a) => a.id === app.id);
    if (idx >= 0) list[idx] = app;
    else list.unshift(app);
    setItem('leaveApplications', list);
  },

  // Salary Components & Structures
  getSalaryComponents(): SalaryComponent[] {
    return getItem<SalaryComponent[]>('salaryComponents', initialSalaryComponents);
  },
  getSalaryStructures(): SalaryStructure[] {
    return getItem<SalaryStructure[]>('salaryStructures', initialSalaryStructures);
  },
  saveSalaryStructure(structure: SalaryStructure): void {
    const list = this.getSalaryStructures();
    const idx = list.findIndex((s) => s.id === structure.id);
    if (idx >= 0) list[idx] = structure;
    else list.push(structure);
    setItem('salaryStructures', list);
  },

  // Payroll Runs & Line Items
  getPayrollRuns(): PayrollRun[] {
    return getItem<PayrollRun[]>('payrollRuns', initialPayrollRuns);
  },
  savePayrollRun(run: PayrollRun): void {
    const list = this.getPayrollRuns();
    const idx = list.findIndex((r) => r.id === run.id);
    if (idx >= 0) list[idx] = run;
    else list.unshift(run);
    setItem('payrollRuns', list);
  },
  getPayrollLineItems(runId?: string): PayrollLineItem[] {
    const items = getItem<PayrollLineItem[]>('payrollLineItems', initialPayrollLineItems);
    if (runId) return items.filter((item) => item.payrollRunId === runId);
    return items;
  },
  savePayrollLineItems(newItems: PayrollLineItem[]): void {
    const current = getItem<PayrollLineItem[]>('payrollLineItems', initialPayrollLineItems);
    const map = new Map(current.map((item) => [item.id, item]));
    newItems.forEach((item) => map.set(item.id, item));
    setItem('payrollLineItems', Array.from(map.values()));
  },

  // Expense Categories & Claims
  getExpenseCategories(): ExpenseCategory[] {
    return getItem<ExpenseCategory[]>('expenseCategories', initialExpenseCategories);
  },
  saveExpenseCategory(cat: ExpenseCategory): void {
    const list = this.getExpenseCategories();
    const idx = list.findIndex((c) => c.id === cat.id);
    if (idx >= 0) list[idx] = cat;
    else list.push(cat);
    setItem('expenseCategories', list);
  },
  getExpenseClaims(): ExpenseClaim[] {
    return getItem<ExpenseClaim[]>('expenseClaims', initialExpenseClaims);
  },
  saveExpenseClaim(claim: ExpenseClaim): void {
    const list = this.getExpenseClaims();
    const idx = list.findIndex((c) => c.id === claim.id);
    if (idx >= 0) list[idx] = claim;
    else list.unshift(claim);
    setItem('expenseClaims', list);
  },

  // Assets
  getAssets(): Asset[] {
    return getItem<Asset[]>('assets', initialAssets);
  },
  getAssetById(id: string): Asset | undefined {
    return this.getAssets().find((a) => a.id === id);
  },
  saveAsset(asset: Asset): void {
    const list = this.getAssets();
    const idx = list.findIndex((a) => a.id === asset.id);
    if (idx >= 0) list[idx] = asset;
    else list.push(asset);
    setItem('assets', list);
  },

  // Attendance & Corrections
  getAttendanceRecords(): AttendanceRecord[] {
    return getItem<AttendanceRecord[]>('attendanceRecords', initialAttendanceRecords);
  },
  saveAttendanceRecord(rec: AttendanceRecord): void {
    const list = this.getAttendanceRecords();
    const idx = list.findIndex((r) => r.id === rec.id);
    if (idx >= 0) list[idx] = rec;
    else list.unshift(rec);
    setItem('attendanceRecords', list);
  },
  getCorrectionRequests(): AttendanceCorrectionRequest[] {
    return getItem<AttendanceCorrectionRequest[]>('correctionRequests', initialCorrectionRequests);
  },
  saveCorrectionRequest(req: AttendanceCorrectionRequest): void {
    const list = this.getCorrectionRequests();
    const idx = list.findIndex((r) => r.id === req.id);
    if (idx >= 0) list[idx] = req;
    else list.unshift(req);
    setItem('correctionRequests', list);
  },

  // Audit Logs
  getAuditLogs(): AuditLog[] {
    return getItem<AuditLog[]>('auditLogs', initialAuditLogs);
  },
  logAudit(log: Omit<AuditLog, 'id' | 'timestamp'>): void {
    const list = this.getAuditLogs();
    let delegationMeta: Partial<AuditLog> = {};
    let desc = log.description;
    try {
      const activeDelRaw = localStorage.getItem(DB_PREFIX + 'active_delegation_ctx');
      if (activeDelRaw) {
        const activeDel = JSON.parse(activeDelRaw) as DelegationRecord | null;
        if (
          activeDel &&
          activeDel.status === 'Active' &&
          activeDel.delegateUserId === log.actorUserId
        ) {
          delegationMeta = {
            representedUserId: activeDel.delegatorUserId,
            representedUserName: activeDel.delegatorName,
            representedRole: activeDel.delegatorRole,
            delegationId: activeDel.id
          };
          if (!desc.includes('Acting on behalf of')) {
            desc = `${desc} [Acting on behalf of ${activeDel.delegatorName} (${activeDel.delegatorRole}) · Delegation ${activeDel.id}]`;
          }
        }
      }
    } catch {
      // ignore
    }
    const entry: AuditLog = {
      ...log,
      ...delegationMeta,
      description: desc,
      id: `AUD-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString()
    };
    list.unshift(entry);
    // Keep last 300 logs
    setItem('auditLogs', list.slice(0, 300));
  },

  // Notifications
  getNotifications(userId?: string): AppNotification[] {
    const list = getItem<AppNotification[]>('notifications', initialNotifications);
    if (userId) {
      return list.filter((n) => n.targetUserId === userId || n.targetUserId === 'all');
    }
    return list;
  },
  addNotification(notif: Omit<AppNotification, 'id' | 'createdAt' | 'isRead'>): void {
    const list = getItem<AppNotification[]>('notifications', initialNotifications);
    const entry: AppNotification = {
      ...notif,
      id: `NOTIF-${Date.now()}`,
      isRead: false,
      createdAt: new Date().toISOString()
    };
    list.unshift(entry);
    setItem('notifications', list.slice(0, 50));
  },
  markNotificationRead(id: string): void {
    const list = getItem<AppNotification[]>('notifications', initialNotifications);
    const notif = list.find((n) => n.id === id);
    if (notif) {
      notif.isRead = true;
      setItem('notifications', list);
    }
  },
  markAllNotificationsRead(userId: string): void {
    const list = getItem<AppNotification[]>('notifications', initialNotifications);
    list.forEach((n) => {
      if (n.targetUserId === userId || n.targetUserId === 'all') {
        n.isRead = true;
      }
    });
    setItem('notifications', list);
  },

  // Policies & Rules
  getPolicies(): PolicyRule[] {
    const stored = getItem<PolicyRule[]>('policies', initialPolicies);
    const missing = initialPolicies.filter((initPol) => !stored.some((p) => p.id === initPol.id));
    if (missing.length > 0) {
      const merged = [...stored, ...missing];
      setItem('policies', merged);
      return merged;
    }
    return stored;
  },
  savePolicy(policy: PolicyRule): void {
    const list = this.getPolicies();
    const idx = list.findIndex((p) => p.id === policy.id);
    if (idx >= 0) list[idx] = policy;
    else list.unshift(policy);
    setItem('policies', list);
  },

  // Governance Members & History (Requirement 1)
  getGovernanceMembers(): GovernanceMember[] {
    return getItem<GovernanceMember[]>('governanceMembers', initialGovernanceMembers);
  },
  saveGovernanceMember(member: GovernanceMember): void {
    const list = this.getGovernanceMembers();
    const idx = list.findIndex((m) => m.id === member.id);
    if (idx >= 0) list[idx] = member;
    else list.push(member);
    setItem('governanceMembers', list);
  },
  getGovernanceHistory(): GovernanceHistoryEntry[] {
    return getItem<GovernanceHistoryEntry[]>('governanceHistory', initialGovernanceHistory);
  },
  addGovernanceHistory(entry: Omit<GovernanceHistoryEntry, 'id' | 'timestamp'>): void {
    const list = this.getGovernanceHistory();
    const full: GovernanceHistoryEntry = {
      ...entry,
      id: `GH-${Date.now()}`,
      timestamp: new Date().toISOString()
    };
    list.unshift(full);
    setItem('governanceHistory', list);
  },

  // Client Email Confirmations (Requirement 3)
  getClientEmailConfirmations(): ClientEmailConfirmation[] {
    return getItem<ClientEmailConfirmation[]>(
      'clientEmailConfirmations',
      initialClientEmailConfirmations
    );
  },
  saveClientEmailConfirmation(item: ClientEmailConfirmation): void {
    const list = this.getClientEmailConfirmations();
    const idx = list.findIndex((c) => c.id === item.id);
    if (idx >= 0) list[idx] = item;
    else list.unshift(item);
    setItem('clientEmailConfirmations', list);
  },

  // Policy Acknowledgements (Requirement 4)
  getPolicyAcknowledgements(): PolicyAcknowledgement[] {
    return getItem<PolicyAcknowledgement[]>(
      'policyAcknowledgements',
      initialPolicyAcknowledgements
    );
  },
  savePolicyAcknowledgement(ack: PolicyAcknowledgement): void {
    const list = this.getPolicyAcknowledgements();
    const idx = list.findIndex(
      (a) =>
        a.id === ack.id ||
        (a.policyId === ack.policyId &&
          a.employeeId === ack.employeeId &&
          a.versionNumber === ack.versionNumber)
    );
    if (idx >= 0) list[idx] = ack;
    else list.unshift(ack);
    setItem('policyAcknowledgements', list);
  },

  // Delegations (Requirement 5)
  getDelegations(): DelegationRecord[] {
    return getItem<DelegationRecord[]>('delegations', initialDelegations);
  },
  saveDelegation(del: DelegationRecord): void {
    const list = this.getDelegations();
    const idx = list.findIndex((d) => d.id === del.id);
    if (idx >= 0) list[idx] = del;
    else list.unshift(del);
    setItem('delegations', list);
  }
};


