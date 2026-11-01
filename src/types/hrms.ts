export type UserRole =
  | 'founder'
  | 'senior_manager'
  | 'super_admin'
  | 'admin'
  | 'hr_admin'
  | 'reporting_manager'
  | 'employee';

export type EmploymentType = 'Permanent' | 'Contract' | 'Probation' | 'Intern';
export type EmploymentStatus = 'Active' | 'On Leave' | 'Probation' | 'Notice Period' | 'Separated' | 'Inactive';

export interface StatutoryComplianceConfig {
  // EPF / Provident Fund
  epfApplicable: boolean;
  epfEmployeeRatePercent: number; // default 12
  epfEmployerRatePercent: number; // default 12
  epfWageCeilingMonthly: number; // default 15000
  epfRestrictToWageCeiling: boolean; // true = cap at ₹15,000 basic; false = full basic
  epfEffectiveFrom: string;
  epfExemptionReason?: string;

  // ESI (Employees' State Insurance)
  esiApplicable: boolean;
  esiGrossThresholdMonthly: number; // default 21000
  esiEmployeeRatePercent: number; // default 0.75
  esiEmployerRatePercent: number; // default 3.25
  esiEffectiveFrom: string;
  esiExemptionReason?: string;

  // Professional Tax (PT)
  ptApplicable: boolean;
  ptStateJurisdiction: string;
  ptMonthlySlabAmount: number; // default 200
  ptMinGrossThreshold: number; // default 15000
  ptEffectiveFrom: string;

  // TDS / Income Tax Withholding
  tdsApplicable: boolean;
  tdsFinancialYear: string;
  tdsDefaultRegime: 'New Regime (FY 2026-27)' | 'Old Regime';
  tdsEffectiveFrom: string;
}

export interface CompanyProfile {
  id: string;
  name: string;
  legalEntity: string;
  registrationNumber?: string; // CIN / Incorporation Number
  taxId: string; // PAN / GSTIN / EIN
  pfRegistrationNumber: string;
  esiRegistrationNumber: string;
  contactEmail?: string;
  contactPhone?: string;
  address: string;
  city: string;
  state: string;
  country: string;
  zipCode: string;
  currency: string;
  currencySymbol: string;
  workingDaysPerWeek: number;
  standardHoursPerDay: number;
  fiscalYearStart: string; // MM-DD
  statutoryConfig?: StatutoryComplianceConfig;
  governanceMode?: 'None' | 'Chairman' | 'Board of Directors';
  governanceAuthorityName?: string;
  governanceAuthorityTitle?: string;
}

export interface Branch {
  id: string;
  name: string;
  code: string;
  city: string;
  isHeadquarters: boolean;
  isActive?: boolean;
}

export interface Department {
  id: string;
  name: string;
  code: string;
  headEmployeeId?: string;
  description: string;
  isActive?: boolean;
}

export interface Designation {
  id: string;
  title: string;
  code: string;
  departmentId: string;
  level: string; // Junior, Mid, Senior, Lead, Executive
  isActive?: boolean;
}

export type DocumentCategory =
  | 'Resume'
  | 'ID Proof'
  | 'Education Certificate'
  | 'Professional Certificate'
  | 'Offer Letter'
  | 'Appointment Letter'
  | 'Address Proof'
  | 'Tax Form'
  | 'Contract'
  | 'Statutory & Tax'
  | 'Performance & Appraisal'
  | 'Exit & Clearance'
  | 'Degree';

export interface EmployeeDocument {
  id: string;
  employeeId: string;
  title: string;
  documentType: DocumentCategory;
  fileName: string;
  fileSize: string;
  uploadedAt: string;
  uploadedBy?: string;
  issueDate?: string;
  expiryDate?: string;
  verificationStatus?: 'Pending' | 'Verified' | 'Rejected';
  verifiedBy?: string;
  fileUrl?: string;
  notes?: string;
}

export type Permission =
  | 'employee.profile.read_self'
  | 'employee.profile.update_self'
  | 'employee.directory.read_basic'
  | 'employee.profile.read_team'
  | 'employee.profile.read_all'
  | 'employee.profile.read_org'
  | 'employee.profile.read_sensitive'
  | 'employee.documents.read_team'
  | 'employee.documents.read_all'
  | 'employee.salary.read'
  | 'employee.bank_details.read'
  | 'employee.identity_documents.read'
  | 'employee.leave.read_team'
  | 'employee.attendance.read_team'
  | 'employee.expenses.read_team'
  | 'employee.assets.read_team'
  | 'employee.assets.read_all'
  | 'employee.assets.administer'
  | 'reports.organization.read'
  | 'leave.approve_team'
  | 'expenses.approve_team'
  | 'attendance.approve_team'
  | 'payroll.process';

export interface BasicDirectoryEmployee {
  id: string;
  firstName: string;
  lastName: string;
  officialEmail: string;
  officialPhone: string;
  avatarUrl: string;
  viewScope: 'colleague_basic';
}

export type AccessScope = 'self' | 'direct_report' | 'senior_management' | 'organization_admin' | 'colleague_basic';

export interface BankAccountDetails {
  accountNumber: string;
  bankName: string;
  ifscOrRouting: string;
  accountType: 'Savings' | 'Current';
}

export interface Employee {
  id: string; // e.g. EMP-001
  userId: string;
  firstName: string;
  lastName: string;
  email: string; // Official email
  officialEmail?: string;
  phone: string; // Official mobile number
  officialPhone?: string;
  personalEmail?: string;
  personalPhone?: string;
  avatarUrl: string;
  dateOfBirth: string;
  gender: 'Male' | 'Female' | 'Other';
  bloodGroup?: string;
  maritalStatus?: 'Single' | 'Married' | 'Other';
  address: string;
  emergencyContact: {
    name: string;
    relationship: string;
    phone: string;
  };
  // Employment
  departmentId: string;
  designationId: string;
  branchId: string;
  employmentType: EmploymentType;
  status: EmploymentStatus;
  dateOfJoining: string;
  probationEndDate?: string;
  confirmationDate?: string;
  noticePeriodDays: number;
  reportingManagerId?: string; // Reports to another Employee ID
  shiftId: string;
  // Financial & Confidential
  bankDetails: BankAccountDetails;
  panOrTaxNumber: string;
  pfUan?: string;
  esiNumber?: string;
  epfApplicable?: boolean;
  epfWageCeilingApplied?: boolean;
  esiApplicable?: boolean;
  ptApplicable?: boolean;
  tdsRatePercent?: number;
  statutoryExemptionReason?: string;
  statutoryEffectiveDate?: string;
  baseSalaryAnnual: number;
  salaryStructureId: string;
  createdAt: string;
  updatedAt: string;
}

export type ProfileViewResult = 
  | (BasicDirectoryEmployee & { viewScope: 'colleague_basic' })
  | (Employee & { viewScope: 'self' | 'direct_report' | 'senior_management' | 'organization_admin'; canViewSalary: boolean });

// --------------------- MODULE 2: LEAVE ---------------------
export type LeaveTypeCode = 'AL' | 'SL' | 'CL' | 'ML' | 'PL' | 'LOP' | 'CO' | string;

export interface LeaveType {
  id: string;
  name: string;
  code: LeaveTypeCode;
  description: string;
  isPaid: boolean;
  annualEntitlement: number;
  carryForwardLimit: number;
  maxConsecutiveDays: number;
  allowsHalfDay: boolean;
  allowNegativeBalance: boolean;
  requiresDocumentProof: boolean;
  color: string;
  isActive?: boolean;
  effectiveFrom?: string;
  eligibility?: string;
  accrualType?: 'Annual Upfront' | 'Monthly Accrual' | 'On Request';
}

export type LeaveApplicationStatus = 
  | 'Draft' 
  | 'Pending Approval' 
  | 'Approved' 
  | 'Rejected' 
  | 'Cancelled';

export interface LeaveApplication {
  id: string;
  employeeId: string;
  leaveTypeId: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  isHalfDay: boolean;
  halfDayPeriod?: 'First Half' | 'Second Half';
  totalDays: number;
  reason: string;
  attachmentName?: string;
  status: LeaveApplicationStatus;
  approverId: string;
  approvalComments?: string;
  appliedAt: string;
  decidedAt?: string;
  isDemo?: boolean;
}

export interface LeaveBalance {
  employeeId: string;
  leaveTypeId: string;
  totalEntitled: number;
  taken: number;
  pending: number;
  remaining: number;
}

export interface Holiday {
  id: string;
  name: string;
  date: string; // YYYY-MM-DD
  isOptional: boolean;
  description?: string;
}

// --------------------- MODULE 3: PAYROLL ---------------------
export type ComponentType = 'Earning' | 'Deduction' | 'Employer_Contribution';

export interface SalaryComponent {
  id: string;
  name: string;
  code: string;
  type: ComponentType;
  isStatutory: boolean;
  isTaxable: boolean;
  calculationType: 'Fixed' | 'Percentage_Basic' | 'Percentage_CTC' | 'Formula';
  formulaOrRate?: number; // e.g. 0.50 for 50% of CTC or basic
}

export interface SalaryStructureItem {
  componentId: string;
  componentCode: string;
  componentName: string;
  type: ComponentType;
  amountMonthly: number;
  amountAnnual: number;
}

export interface SalaryStructure {
  id: string;
  name: string;
  description: string;
  grossMonthly: number;
  ctcAnnual: number;
  items: SalaryStructureItem[];
  isActive: boolean;
}

export type PayrollRunStatus =
  | 'Draft'
  | 'Preview'
  | 'Calculated'
  | 'Under Review'
  | 'Pending Approval'
  | 'Approved'
  | 'Finalized'
  | 'Paid';

export interface PayrollLineItem {
  id: string;
  payrollRunId: string;
  employeeId: string;
  employeeName: string;
  departmentName: string;
  designationTitle: string;
  bankAccountNumber: string;
  panNumber: string;
  workingDaysInMonth: number;
  calendarDays?: number;
  scheduledWorkingDays?: number;
  weeklyOffsAndHolidays?: number;
  daysPresent: number;
  paidLeaves: number;
  unpaidLeaves: number; // LOP days
  approvedOvertimeHours?: number;
  payableDays: number;
  payableDaysFormula?: string;
  basicEarnings: number;
  hraEarnings: number;
  daEarnings?: number;
  conveyanceEarnings?: number;
  specialAllowanceEarnings: number;
  clientSiteAllowance?: number;
  overtimeEarnings?: number;
  grossEarnings: number;
  // Deductions
  pfEmployee: number;
  pfApplicabilityNote?: string;
  esiEmployee: number;
  esiApplicabilityNote?: string;
  professionalTax: number;
  ptApplicabilityNote?: string;
  tdsWithholding: number;
  tdsApplicabilityNote?: string;
  unpaidLeaveDeduction: number;
  advanceRecovery?: number;
  otherDeductions: number;
  totalStatutoryDeductions?: number;
  totalOtherDeductions?: number;
  totalDeductions: number;
  // Reimbursements & Advances
  reimbursementsPayable?: number;
  advanceIssued?: number;
  advanceRecoveredThisMonth?: number;
  advanceRemainingBalance?: number;
  netPayable: number;
  // Employer Cost
  pfEmployer: number;
  esiEmployer: number;
  totalEmployerCost: number;
  status: 'Calculated' | 'Finalized' | 'Paid';
  periodLabel?: string;
  complianceWarnings?: string[];
  blockingErrors?: string[];
}

export interface PayrollRun {
  id: string;
  month: number; // 1-12
  year: number;
  periodLabel: string; // e.g. "October 2026"
  startDate: string;
  endDate: string;
  totalEmployees: number;
  totalGrossPay: number;
  totalDeductions: number;
  totalNetPay: number;
  status: PayrollRunStatus;
  processedBy: string;
  approvedBy?: string;
  finalizedAt?: string;
  paymentReference?: string;
  paymentDate?: string;
  notes?: string;
  hasPostFinalizationAttendanceChange?: boolean;
  postFinalizationChangeNote?: string;
}

// --------------------- MODULE 4: EXPENSES ---------------------
export interface ExpenseCategory {
  id: string;
  name: string;
  code: string;
  maxLimitPerClaim: number;
  requiresReceipt: boolean;
  description: string;
  isActive?: boolean;
  effectiveFrom?: string;
  applicableTo?: string;
}

export type ExpenseClaimStatus = 
  | 'Draft' 
  | 'Pending Manager Approval' 
  | 'Approved' 
  | 'Rejected' 
  | 'Pending Reimbursement' 
  | 'Reimbursed';

export interface ExpenseClaim {
  id: string;
  claimNumber: string; // EXP-2026-001
  employeeId: string;
  categoryId: string;
  title: string;
  amount: number;
  currency: string;
  expenseDate: string; // YYYY-MM-DD
  businessPurpose: string;
  receiptFileName?: string;
  receiptUrl?: string;
  status: ExpenseClaimStatus;
  approverId: string;
  approvalComments?: string;
  reimbursementReference?: string;
  reimbursedAt?: string;
  submittedAt: string;
  decidedAt?: string;
  isDemo?: boolean;
}

// --------------------- MODULE 5: ASSET MANAGEMENT ---------------------
export type AssetCategoryType = 'Laptop' | 'Monitor' | 'Mobile Device' | 'Accessories' | 'Office Furniture' | 'Software License' | 'Email Account' | 'Subscription' | 'Cloud Access';

export interface AssetCategory {
  id: string;
  name: AssetCategoryType;
  code: string;
  depreciationRateAnnualPercent: number;
  description: string;
}

export type AssetStatus =
  | 'Available'
  | 'Allocated'
  | 'In Use'
  | 'Returned'
  | 'Under Maintenance'
  | 'Retired'
  | 'Inactive'
  | 'Lost';
export type AllocationCondition = 'Brand New' | 'Good' | 'Fair' | 'Minor Scratches';

export interface Asset {
  id: string; // AST-001
  assetTag: string;
  name: string;
  category: AssetCategoryType;
  brand: string;
  model: string;
  serialNumber: string;
  purchaseDate: string;
  purchaseCost: number;
  warrantyExpiryDate: string;
  supplier: string;
  location: string;
  condition: AllocationCondition;
  status: AssetStatus;
  isActive?: boolean;
  deactivatedReason?: string;
  deactivatedAt?: string;
  deactivatedBy?: string;
  currentEmployeeId?: string;
  allocatedDate?: string;
  acknowledgedByEmployee: boolean;
  acknowledgedAt?: string;
  notes?: string;
  assetType?: 'Hardware' | 'Software & Digital';
  accountIdentifier?: string;
  licenseSeats?: number;
  renewalDate?: string;
  subscriptionCost?: number;
  billingFrequency?: 'Monthly' | 'Quarterly' | 'Annual' | 'One-time';
}

export interface AssetAssignmentHistory {
  id: string;
  assetId: string;
  employeeId: string;
  allocatedDate: string;
  returnedDate?: string;
  initialCondition: AllocationCondition;
  returnCondition?: AllocationCondition;
  notes?: string;
}

// --------------------- MODULE 6: SHIFTS & ATTENDANCE ---------------------
export interface ShiftDefinition {
  id: string;
  name: string;
  code: string;
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  gracePeriodMinutes: number;
  breakDurationMinutes: number;
  totalWorkingHours: number;
  isOvernight: boolean;
  weeklyOffDays: number[]; // 0=Sun, 6=Sat
  isActive?: boolean;
  effectiveFrom?: string;
}

export type AttendanceStatus = 'Present' | 'Late' | 'Half Day' | 'Absent' | 'On Leave' | 'Holiday' | 'Weekly Off';

export type ClientVerificationStatus =
  | 'Not Required'
  | 'Pending'
  | 'Verification Requested'
  | 'Verified'
  | 'Disputed'
  | 'Correction Requested';

export type CompanyApprovalStatus =
  | 'Pending'
  | 'Approved'
  | 'Rejected'
  | 'Returned for Correction';

export type PayrollEligibilityStatus =
  | 'Not Eligible'
  | 'Eligible for Draft Payroll'
  | 'Included in Draft Payroll'
  | 'Finalized';

export type DisputeResolutionDecision =
  | 'Approve Original Attendance'
  | 'Approve Corrected Attendance'
  | 'Return for Additional Information'
  | 'Reject Attendance Correction';

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  date: string; // YYYY-MM-DD (Actual attendance date)
  entryDate?: string; // YYYY-MM-DD (Date record was entered/submitted if different from attendance date)
  shiftId: string;
  checkInTime?: string; // HH:MM
  checkOutTime?: string; // HH:MM
  totalHoursWorked: number;
  regularHours: number;
  overtimeHours: number;
  status: AttendanceStatus;
  isLate: boolean;
  isEarlyDeparture: boolean;
  lateMinutes: number;
  source: 'Web Punch' | 'Manual HR Entry' | 'Attendance Correction' | 'Biometric Import' | 'System Default' | 'Client Timesheet';
  notes?: string;
  assignmentId?: string;
  clientId?: string;
  projectName?: string;
  workMode?: 'Office' | 'Client Site' | 'Remote';
  // Legacy combined approval status kept in sync for backward compatibility
  approvalStatus?: 'Pending Client Verification' | 'Pending Manager Approval' | 'Approved' | 'Disputed';
  // Four Mandatory Distinct Status Dimensions (Section 8)
  clientVerificationStatus?: ClientVerificationStatus;
  companyApprovalStatus?: CompanyApprovalStatus;
  payrollEligibilityStatus?: PayrollEligibilityStatus;
  // External Client Supervisor Email Verification (No Orbyx Login)
  clientSupervisorName?: string;
  clientSupervisorEmail?: string;
  clientVerifiedAt?: string;
  verificationMethod?: 'Supervisor Sign-off' | 'Client Email Confirmation' | 'Portal Approval';
  verificationRefId?: string;
  evidenceRef?: string;
  approvedBy?: string;
  approvedAt?: string;
  // Outage / Machine Failure Incident Reference (Scenario C)
  outageIncidentRef?: string;
  failureReason?: 'Attendance machine failure' | 'Server downtime' | 'Application unavailable' | 'Other authorized exception';
  // Client Dispute & Internal Resolution (Scenario D)
  disputeDetails?: string;
  clientClaimedCheckIn?: string;
  clientClaimedCheckOut?: string;
  clientClaimedHours?: number;
  employeeClarification?: string;
  employeeClarificationBy?: string;
  employeeClarificationAt?: string;
  employeeClarificationEvidence?: string;
  disputeResolutionDecision?: DisputeResolutionDecision;
  disputeResolutionReason?: string;
  disputeResolvedBy?: string;
  disputeResolvedAt?: string;
  // Audit preservation for manual entries & corrections
  entryType?: 'Regular' | 'Manual Entry' | 'Correction';
  exceptionType?: string;
  reason?: string;
  breakDurationMinutes?: number;
  supportingEvidence?: string;
  submittedBy?: string;
  submittedAt?: string;
  originalCheckIn?: string;
  originalCheckOut?: string;
  originalHours?: number;
  originalStatus?: AttendanceStatus;
  originalSource?: string;
  approvalHistory?: Array<{
    stage: string;
    actorName: string;
    actorRole: string;
    timestamp: string;
    decision?: 'Approved' | 'Rejected' | 'Verified' | 'Disputed' | 'Returned for Correction';
    comments?: string;
  }>;
}

export type CorrectionRequestStatus = 'Pending' | 'Approved' | 'Rejected' | 'Returned for Correction';

export interface AttendanceCorrectionRequest {
  id: string;
  attendanceId?: string;
  employeeId: string;
  date: string;
  entryDate?: string;
  entryType?: 'Manual Entry' | 'Correction';
  exceptionType?: 'Machine Failure' | 'Server Downtime' | 'Application Unavailable' | 'Missed Punch' | 'Timestamp Error' | 'Client Site Exception' | 'Authorized Exception';
  outageIncidentRef?: string;
  assignmentId?: string;
  clientId?: string;
  projectName?: string;
  clientSupervisorName?: string;
  clientSupervisorEmail?: string;
  requiresClientEmailVerification?: boolean;
  clientVerificationStatus?: ClientVerificationStatus;
  companyApprovalStatus?: CompanyApprovalStatus;
  verificationRefId?: string;
  shiftId?: string;
  requestedCheckIn: string;
  requestedCheckOut: string;
  breakDurationMinutes?: number;
  calculatedHours?: number;
  requestedOutcome?: AttendanceStatus;
  attendanceOutcome?: AttendanceStatus;
  supportingEvidence?: string;
  originalCheckIn?: string;
  originalCheckOut?: string;
  originalHours?: number;
  originalStatus?: AttendanceStatus;
  originalSource?: string;
  conflictWarning?: string;
  submittedBy?: string;
  reason: string;
  status: CorrectionRequestStatus;
  approverId: string;
  approverComments?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  submittedAt: string;
  decidedAt?: string;
  isDemo?: boolean;
}

// --------------------- AUDIT & NOTIFICATIONS ---------------------
export interface AuditLog {
  id: string;
  timestamp: string;
  actorUserId: string;
  actorName: string;
  actorRole: UserRole;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'APPROVE' | 'REJECT' | 'FINALIZE' | 'REIMBURSE' | 'ALLOCATE' | 'LOGIN';
  module: 'EMPLOYEE' | 'LEAVE' | 'PAYROLL' | 'EXPENSE' | 'ASSET' | 'ATTENDANCE' | 'SYSTEM';
  entityId: string;
  entityName: string;
  description: string;
  metadata?: Record<string, any>;
  representedUserId?: string;
  representedUserName?: string;
  representedRole?: UserRole | string;
  delegationId?: string;
}

export interface AppNotification {
  id: string;
  targetUserId: string;
  title: string;
  message: string;
  module: 'leave' | 'payroll' | 'expense' | 'asset' | 'attendance' | 'employee';
  isRead: boolean;
  createdAt: string;
  actionUrl?: string;
}

export interface CurrentUser {
  id: string;
  employeeId: string;
  name: string;
  email: string;
  role: UserRole;
  departmentId: string;
  designationTitle: string;
  avatarUrl: string;
  isGovernanceOnly?: boolean;
}

export type PolicyModule =
  | 'Organization'
  | 'Leave'
  | 'Attendance'
  | 'Payroll'
  | 'Statutory'
  | 'Expense'
  | 'Asset'
  | 'Client'
  | 'Employee & Exit';

export type PolicyLifecycleStatus = 'Draft' | 'Under Review' | 'Approved' | 'Published' | 'Archived';

export interface PolicyAcknowledgement {
  id?: string;
  policyId?: string;
  policyCode?: string;
  policyName?: string;
  employeeId: string;
  employeeName?: string;
  version?: string;
  versionNumber?: number | string;
  status?: string;
  acknowledgedAt: string;
  dueDate?: string;
  comments?: string;
}

export interface PolicyRule {
  id: string;
  code: string;
  name: string;
  module: PolicyModule;
  description: string;
  rulesSummary: string;
  parameters: Record<string, string | number | boolean>;
  effectiveFrom: string;
  effectiveTo?: string;
  applicableTo: string;
  isActive: boolean;
  version?: string;
  versionNumber?: number | string;
  reviewExpiryDate?: string;
  ownerDepartment?: string;
  approvedBy?: string;
  approvedAt?: string;
  publishedBy?: string;
  publishedAt?: string;
  requiresAcknowledgement?: boolean;
  lifecycleStatus?: PolicyLifecycleStatus;
  versionHistory?: Array<{
    version: string;
    effectiveFrom?: string;
    updatedAt: string;
    updatedBy: string;
    rulesSummary?: string;
    summary?: string;
  }>;
  acknowledgements?: Array<PolicyAcknowledgement>;
  updatedAt: string;
  updatedBy: string;
}

export interface GovernanceMember {
  id: string;
  name: string;
  role: 'Chairman' | 'Director' | 'Board Member' | 'Independent Director' | 'Advisor';
  email?: string;
  phone?: string;
  avatarUrl?: string;
  oversightTargetEmployeeId?: string;
  effectiveFrom: string;
  isActive: boolean;
  isPayrollEmployee?: boolean;
  committeeRole?: string;
  notes?: string;
  updatedAt?: string;
  updatedBy?: string;
}

export interface GovernanceHistoryEntry {
  id: string;
  timestamp: string;
  memberId: string;
  memberName: string;
  role: string;
  action: string;
  effectiveDate: string;
  actorUserId: string;
  actorName: string;
  details: string;
}

export interface ClientEmailConfirmation {
  id: string;
  assignmentId: string;
  clientId: string;
  clientName: string;
  employeeId: string;
  employeeName?: string;
  project: string;
  projectName?: string;
  coverageType?: 'Single Date' | 'Multiple Dates' | 'Weekly Timesheet' | 'Date Range';
  coveredDates?: string[];
  attendanceDate?: string;
  attendanceRecordIds?: string[];
  correctionRequestId?: string;
  clientSupervisorName?: string;
  clientSupervisorEmail?: string;
  requestPreparedAt?: string;
  requestPreparedBy?: string;
  emailDeliveryNote?: string;
  senderName: string;
  senderEmail: string;
  confirmedByEmail?: string;
  emailSubject?: string;
  confirmationDate: string;
  confirmedAt?: string;
  emailReceivedAt?: string;
  attendanceStartDate: string;
  attendanceEndDate: string;
  confirmedDaysCount: number;
  confirmedHoursTotal: number;
  decision?: 'Pending' | 'Verified' | 'Disputed' | 'Correction Requested' | 'Absent';
  summary: string;
  disputeDetails?: string;
  claimedCheckIn?: string;
  claimedCheckOut?: string;
  claimedHours?: number;
  messageIdReference: string;
  messageReference?: string;
  attachmentFileName?: string;
  authenticityStatus: string;
  recordedByUserId: string;
  recordedByName: string;
  recordedBy?: string;
  recordedAt: string;
  verificationOutcome: string;
  companyApprovalStatus: string;
  companyApprovedBy?: string;
  companyApprovedAt?: string;
  reviewComments?: string;
}

export type DelegableAction =
  | 'APPROVE_LEAVE'
  | 'APPROVE_ATTENDANCE'
  | 'APPROVE_PAYROLL'
  | 'APPROVE_EXPENSE'
  | 'APPROVE_POLICY'
  | 'MANAGE_ORGANIZATION'
  | 'FINAL_SETTLEMENT_SIGNOFF'
  | string;

export interface DelegationRecord {
  id: string;
  delegatorUserId: string;
  delegatorEmployeeId?: string;
  delegatorName: string;
  delegatorRole: string;
  delegateUserId: string;
  delegateEmployeeId?: string;
  delegateName: string;
  delegateRole?: string;
  permittedActions: DelegableAction[];
  applicableModules: string[];
  effectiveFrom: string;
  effectiveTo: string;
  reason: string;
  status: 'Active' | 'Revoked' | 'Expired';
  grantedByUserId?: string;
  grantedByName?: string;
  createdBy?: string;
  revokedAt?: string;
  revokedBy?: string;
  createdAt: string;
}

export interface NavigationContext {
  subTab?: string;
  statusFilter?: string;
  departmentFilter?: string;
  dateFilter?: string;
  managerId?: string;
  policyCategory?: PolicyModule | 'ALL';
  employeeId?: string;
  highlightAction?: string;
}


