import { db } from './storage';
import { LeaveApplication, ExpenseClaim, AttendanceCorrectionRequest } from '../types/hrms';

/**
 * Idempotent Demo Data Seeder
 * Populates realistic synthetic requests for active employees:
 * - 8 Software Engineers send requests to Krishnaraj (EMP-002)
 * - Krishnaraj (EMP-002) and Anamika (EMP-001) send requests to Dr. Selvakumar (EMP-000)
 * - Deactivated employees (EMP-005, EMP-006, EMP-007, EMP-008) are strictly excluded from new requests
 * - Tagged with isDemo: true
 */
export function seedRealisticDemoRequests(): {
  leavesCreated: number;
  expensesCreated: number;
  correctionsCreated: number;
} {
  const employees = db.getEmployees();
  const activeEmployees = employees.filter((e) => e.status !== 'Inactive' && e.status !== 'Separated');

  let leavesCreated = 0;
  let expensesCreated = 0;
  let correctionsCreated = 0;

  const existingLeaves = db.getLeaveApplications();
  const existingExpenses = db.getExpenseClaims();
  const existingCorrections = db.getCorrectionRequests();

  // -------------------------------------------------------------------------
  // 1. LEAVE APPLICATIONS
  // -------------------------------------------------------------------------
  // Anupriya (EMP-011) -> Pending to Krishnaraj (EMP-002)
  const demoLeaves: LeaveApplication[] = [
    {
      id: 'DEMO-LV-001',
      employeeId: 'EMP-011', // Anupriya
      leaveTypeId: 'LT-AL',
      startDate: '2026-10-28',
      endDate: '2026-10-30',
      isHalfDay: false,
      totalDays: 3,
      reason: '[DEMO] Annual family festival visit to Coimbatore',
      status: 'Pending Approval',
      approverId: 'EMP-002',
      appliedAt: '2026-10-22T09:15:00Z',
      isDemo: true
    },
    // Suguna (EMP-012) -> Pending to Krishnaraj (EMP-002)
    {
      id: 'DEMO-LV-002',
      employeeId: 'EMP-012', // Suguna
      leaveTypeId: 'LT-SL',
      startDate: '2026-10-27',
      endDate: '2026-10-27',
      isHalfDay: false,
      totalDays: 1,
      reason: '[DEMO] Dental surgery appointment and rest',
      status: 'Pending Approval',
      approverId: 'EMP-002',
      appliedAt: '2026-10-23T08:00:00Z',
      isDemo: true
    },
    // Praveen (EMP-013) -> Pending to Krishnaraj (EMP-002)
    {
      id: 'DEMO-LV-003',
      employeeId: 'EMP-013', // Praveen
      leaveTypeId: 'LT-CL',
      startDate: '2026-11-04',
      endDate: '2026-11-04',
      isHalfDay: true,
      halfDayPeriod: 'First Half',
      totalDays: 0.5,
      reason: '[DEMO] Driving license renewal at RTO',
      status: 'Pending Approval',
      approverId: 'EMP-002',
      appliedAt: '2026-10-21T11:30:00Z',
      isDemo: true
    },
    // Karthiga (EMP-014) -> Approved by Krishnaraj
    {
      id: 'DEMO-LV-004',
      employeeId: 'EMP-014', // Karthiga
      leaveTypeId: 'LT-AL',
      startDate: '2026-10-14',
      endDate: '2026-10-16',
      isHalfDay: false,
      totalDays: 3,
      reason: '[DEMO] Sister engagement ceremony in Madurai',
      status: 'Approved',
      approverId: 'EMP-002',
      approvalComments: 'Approved. Sprint deliverables reassigned.',
      appliedAt: '2026-10-05T10:00:00Z',
      decidedAt: '2026-10-06T15:00:00Z',
      isDemo: true
    },
    // Priyadharshini (EMP-015) -> Pending to Krishnaraj
    {
      id: 'DEMO-LV-005',
      employeeId: 'EMP-015', // Priyadharshini
      leaveTypeId: 'LT-AL',
      startDate: '2026-11-10',
      endDate: '2026-11-12',
      isHalfDay: false,
      totalDays: 3,
      reason: '[DEMO] Attending technical symposium on Cloud Architecture',
      status: 'Pending Approval',
      approverId: 'EMP-002',
      appliedAt: '2026-10-22T16:00:00Z',
      isDemo: true
    },
    // Niranjan (EMP-016) -> Rejected by Krishnaraj
    {
      id: 'DEMO-LV-006',
      employeeId: 'EMP-016', // Niranjan
      leaveTypeId: 'LT-CL',
      startDate: '2026-10-29',
      endDate: '2026-10-30',
      isHalfDay: false,
      totalDays: 2,
      reason: '[DEMO] Long weekend road trip',
      status: 'Rejected',
      approverId: 'EMP-002',
      approvalComments: 'Client deployment window on Oct 29. Please reschedule.',
      appliedAt: '2026-10-20T14:00:00Z',
      decidedAt: '2026-10-21T09:30:00Z',
      isDemo: true
    },
    // Archana (EMP-003) -> Pending to Krishnaraj
    {
      id: 'DEMO-LV-007',
      employeeId: 'EMP-003', // Archana
      leaveTypeId: 'LT-AL',
      startDate: '2026-11-05',
      endDate: '2026-11-06',
      isHalfDay: false,
      totalDays: 2,
      reason: '[DEMO] Personal travel and wellness break',
      status: 'Pending Approval',
      approverId: 'EMP-002',
      appliedAt: '2026-10-22T10:00:00Z',
      isDemo: true
    },
    // Krishnaraj (EMP-002) -> Pending to Dr. Selvakumar (EMP-000)
    {
      id: 'DEMO-LV-008',
      employeeId: 'EMP-002', // Krishnaraj
      leaveTypeId: 'LT-AL',
      startDate: '2026-11-16',
      endDate: '2026-11-18',
      isHalfDay: false,
      totalDays: 3,
      reason: '[DEMO] Enterprise Tech Leadership Summit attendance in Mumbai',
      status: 'Pending Approval',
      approverId: 'EMP-000', // Dr. Selvakumar
      appliedAt: '2026-10-23T07:30:00Z',
      isDemo: true
    },
    // Anamika (EMP-001) -> Pending to Dr. Selvakumar (EMP-000)
    {
      id: 'DEMO-LV-009',
      employeeId: 'EMP-001', // Anamika
      leaveTypeId: 'LT-AL',
      startDate: '2026-11-23',
      endDate: '2026-11-25',
      isHalfDay: false,
      totalDays: 3,
      reason: '[DEMO] National HR Conclave 2026 in New Delhi',
      status: 'Pending Approval',
      approverId: 'EMP-000', // Dr. Selvakumar
      appliedAt: '2026-10-22T12:00:00Z',
      isDemo: true
    }
  ];

  for (const item of demoLeaves) {
    if (!existingLeaves.some((l) => l.id === item.id)) {
      db.saveLeaveApplication(item);
      leavesCreated++;
    }
  }

  // -------------------------------------------------------------------------
  // 2. EXPENSE CLAIMS
  // -------------------------------------------------------------------------
  const demoExpenses: ExpenseClaim[] = [
    // Anupriya -> Pending to Krishnaraj
    {
      id: 'DEMO-EXP-001',
      claimNumber: 'EXP-2026-101',
      employeeId: 'EMP-011',
      categoryId: 'CAT-CONV',
      title: '[DEMO] Client site travel cab reimbursement (Whitefield)',
      amount: 1450,
      currency: 'INR',
      expenseDate: '2026-10-20',
      businessPurpose: 'On-site integration testing at enterprise customer facility',
      receiptFileName: 'uber_receipt_oct20_1450.pdf',
      status: 'Pending Manager Approval',
      approverId: 'EMP-002',
      submittedAt: '2026-10-21T09:00:00Z',
      isDemo: true
    },
    // Praveen -> Pending to Krishnaraj
    {
      id: 'DEMO-EXP-002',
      claimNumber: 'EXP-2026-102',
      employeeId: 'EMP-013',
      categoryId: 'CAT-SUPP',
      title: '[DEMO] Ergonomic keyboard & mouse for engineering station',
      amount: 3200,
      currency: 'INR',
      expenseDate: '2026-10-18',
      businessPurpose: 'Replacement input accessories under workplace ergonomics policy',
      receiptFileName: 'amazon_tax_invoice_mouse.pdf',
      status: 'Pending Manager Approval',
      approverId: 'EMP-002',
      submittedAt: '2026-10-19T14:30:00Z',
      isDemo: true
    },
    // Mahalakshmi -> Approved, Pending Reimbursement
    {
      id: 'DEMO-EXP-003',
      claimNumber: 'EXP-2026-103',
      employeeId: 'EMP-004',
      categoryId: 'CAT-MEAL',
      title: '[DEMO] Team sprint lunch during release deployment weekend',
      amount: 2800,
      currency: 'INR',
      expenseDate: '2026-10-12',
      businessPurpose: 'Working lunch for engineering release squad',
      receiptFileName: 'swiggy_invoice_lunch.pdf',
      status: 'Pending Reimbursement',
      approverId: 'EMP-002',
      approvalComments: 'Approved by Delivery Manager. Forwarded to finance for payout.',
      submittedAt: '2026-10-13T11:00:00Z',
      decidedAt: '2026-10-14T10:00:00Z',
      isDemo: true
    },
    // Suguna -> Reimbursed
    {
      id: 'DEMO-EXP-004',
      claimNumber: 'EXP-2026-104',
      employeeId: 'EMP-012',
      categoryId: 'CAT-CONV',
      title: '[DEMO] Airport cab conveyance for client workshop',
      amount: 1850,
      currency: 'INR',
      expenseDate: '2026-09-28',
      businessPurpose: 'Airport pickup and drop for Chennai tech briefing',
      receiptFileName: 'cab_toll_receipt.pdf',
      status: 'Reimbursed',
      approverId: 'EMP-002',
      reimbursementReference: 'NEFT-AXIS-98214',
      reimbursedAt: '2026-10-05T16:00:00Z',
      submittedAt: '2026-09-29T10:00:00Z',
      decidedAt: '2026-09-30T11:00:00Z',
      isDemo: true
    },
    // Krishnaraj (EMP-002) -> Pending to Dr. Selvakumar (EMP-000)
    {
      id: 'DEMO-EXP-005',
      claimNumber: 'EXP-2026-105',
      employeeId: 'EMP-002', // Krishnaraj
      categoryId: 'CAT-TRV',
      title: '[DEMO] Flight tickets for Hyderabad client delivery review',
      amount: 11200,
      currency: 'INR',
      expenseDate: '2026-10-15',
      businessPurpose: 'Q3 Enterprise Architecture steering committee meeting',
      receiptFileName: 'indigo_flight_hyd_blr.pdf',
      status: 'Pending Manager Approval',
      approverId: 'EMP-000', // Dr. Selvakumar
      submittedAt: '2026-10-16T17:00:00Z',
      isDemo: true
    },
    // Anamika (EMP-001) -> Pending to Dr. Selvakumar (EMP-000)
    {
      id: 'DEMO-EXP-006',
      claimNumber: 'EXP-2026-106',
      employeeId: 'EMP-001', // Anamika
      categoryId: 'CAT-MISC',
      title: '[DEMO] Annual campus hiring booth branding & merchandise',
      amount: 8500,
      currency: 'INR',
      expenseDate: '2026-10-19',
      businessPurpose: 'Collaterals and booth banners for RVCE Engineering campus drive',
      receiptFileName: 'printo_branding_materials.pdf',
      status: 'Pending Manager Approval',
      approverId: 'EMP-000', // Dr. Selvakumar
      submittedAt: '2026-10-20T11:30:00Z',
      isDemo: true
    }
  ];

  for (const item of demoExpenses) {
    if (!existingExpenses.some((e) => e.id === item.id)) {
      db.saveExpenseClaim(item);
      expensesCreated++;
    }
  }

  // -------------------------------------------------------------------------
  // 3. ATTENDANCE CORRECTIONS
  // -------------------------------------------------------------------------
  const demoCorrections: AttendanceCorrectionRequest[] = [
    // Karthiga (EMP-014) -> Pending to Krishnaraj (EMP-002)
    {
      id: 'DEMO-CORR-001',
      employeeId: 'EMP-014',
      date: '2026-10-21',
      requestedCheckIn: '09:25',
      requestedCheckOut: '18:35',
      reason: '[DEMO] Biometric scanner network outage at Bengaluru lobby entrance',
      status: 'Pending',
      approverId: 'EMP-002',
      submittedAt: '2026-10-21T19:00:00Z',
      isDemo: true
    },
    // Priyadharshini (EMP-015) -> Pending to Krishnaraj (EMP-002)
    {
      id: 'DEMO-CORR-002',
      employeeId: 'EMP-015',
      date: '2026-10-22',
      requestedCheckIn: '09:30',
      requestedCheckOut: '19:15',
      reason: '[DEMO] Missed web check-out due to client escalation call',
      status: 'Pending',
      approverId: 'EMP-002',
      submittedAt: '2026-10-22T20:10:00Z',
      isDemo: true
    },
    // Krishnaraj (EMP-002) -> Pending to Dr. Selvakumar (EMP-000)
    {
      id: 'DEMO-CORR-003',
      employeeId: 'EMP-002',
      date: '2026-10-20',
      requestedCheckIn: '09:15',
      requestedCheckOut: '19:45',
      reason: '[DEMO] Direct transit to executive customer briefing without office badge swipe',
      status: 'Pending',
      approverId: 'EMP-000', // Dr. Selvakumar
      submittedAt: '2026-10-21T08:30:00Z',
      isDemo: true
    }
  ];

  for (const item of demoCorrections) {
    if (!existingCorrections.some((c) => c.id === item.id)) {
      db.saveCorrectionRequest(item);
      correctionsCreated++;
    }
  }

  // -------------------------------------------------------------------------
  // 4. CLIENT-SITE ATTENDANCE RECORDS COVERING SCENARIOS A, B, C, AND D
  // -------------------------------------------------------------------------
  const existingAtt = db.getAttendanceRecords();
  const clientSiteDemoAttendance = [
    // Scenario A: Employee (Archana EMP-003 at Apex FinTech CAS-201) forgot check-out, submitted correction, pending Client Email Verification
    {
      id: 'ATT-CLI-SCEN-A-001',
      employeeId: 'EMP-003',
      date: '2026-10-20',
      entryDate: '2026-10-21',
      shiftId: 'SHIFT-GEN',
      checkInTime: '09:30',
      checkOutTime: '18:45',
      breakDurationMinutes: 60,
      totalHoursWorked: 8.25,
      regularHours: 8.0,
      overtimeHours: 0.25,
      status: 'Present' as const,
      isLate: false,
      isEarlyDeparture: false,
      lateMinutes: 0,
      source: 'Attendance Correction' as const,
      workMode: 'Client Site' as const,
      assignmentId: 'CAS-201',
      clientId: 'CLI-101',
      projectName: 'Core Banking Ledger Modernization',
      clientSupervisorName: 'Vikramaditya Rao',
      clientSupervisorEmail: 'v.rao@apexfintech.example.com',
      verificationMethod: 'Client Email Confirmation' as const,
      clientVerificationStatus: 'Pending' as const,
      companyApprovalStatus: 'Pending' as const,
      payrollEligibilityStatus: 'Not Eligible' as const,
      approvalStatus: 'Pending Client Verification' as const,
      entryType: 'Correction' as const,
      exceptionType: 'Missed Punch',
      reason: 'Forgot to check out after client UAT sign-off meeting at Mumbai BKC office.',
      supportingEvidence: 'BKC Visitor Security Exit Log #BKC-882',
      originalCheckIn: '09:30',
      originalCheckOut: undefined,
      originalHours: 0,
      originalStatus: 'Present' as const,
      originalSource: 'Web Punch',
      approvalHistory: [
        {
          stage: 'Scenario A: Missed Check-Out Correction Submitted',
          actorName: 'Archana',
          actorRole: 'employee',
          timestamp: '2026-10-21T09:10:00Z',
          comments: 'Original check-in 09:30 preserved; requested check-out 18:45 (8.25h). Flagged for Client Supervisor Email Verification.'
        }
      ]
    },
    // Scenario B (Stage 1 Verified, Pending Stage 2 Company Approval): Mahalakshmi (EMP-004 at Horizon Retail CAS-202)
    {
      id: 'ATT-CLI-SCEN-B-001',
      employeeId: 'EMP-004',
      date: '2026-10-21',
      entryDate: '2026-10-21',
      shiftId: 'SHIFT-GEN',
      checkInTime: '09:20',
      checkOutTime: '18:50',
      breakDurationMinutes: 60,
      totalHoursWorked: 8.5,
      regularHours: 8.0,
      overtimeHours: 0.5,
      status: 'Present' as const,
      isLate: false,
      isEarlyDeparture: false,
      lateMinutes: 0,
      source: 'Client Timesheet' as const,
      workMode: 'Client Site' as const,
      assignmentId: 'CAS-202',
      clientId: 'CLI-102',
      projectName: 'Omnichannel Checkout Microservices',
      clientSupervisorName: 'Meera Krishnan',
      clientSupervisorEmail: 'meera.k@horizonretail.example.com',
      clientVerifiedAt: '2026-10-24',
      verificationMethod: 'Client Email Confirmation' as const,
      verificationRefId: 'CEC-2026-002',
      evidenceRef: 'MSG-HRZN-20261024-3318',
      clientVerificationStatus: 'Verified' as const,
      companyApprovalStatus: 'Pending' as const,
      payrollEligibilityStatus: 'Not Eligible' as const,
      approvalStatus: 'Pending Manager Approval' as const,
      entryType: 'Regular' as const,
      notes: 'Verified via external email from Meera Krishnan; awaiting internal Manager/HR final approval.',
      approvalHistory: [
        {
          stage: 'Stage 1: External Client Supervisor Email Verified',
          actorName: 'Krishnaraj (recorded email from Meera Krishnan)',
          actorRole: 'reporting_manager',
          timestamp: '2026-10-24T15:10:00Z',
          decision: 'Verified' as const,
          comments: 'Ref CEC-2026-002: Client confirmed 8.5h worked. Forwarded for Stage 2 Internal Company Approval.'
        }
      ]
    },
    // Scenario B (Both Stages Complete — Eligible for Draft Payroll): Archana (EMP-003 at Apex FinTech CAS-201)
    {
      id: 'ATT-CLI-SCEN-B-002',
      employeeId: 'EMP-003',
      date: '2026-10-19',
      entryDate: '2026-10-19',
      shiftId: 'SHIFT-GEN',
      checkInTime: '09:25',
      checkOutTime: '18:25',
      breakDurationMinutes: 60,
      totalHoursWorked: 8.0,
      regularHours: 8.0,
      overtimeHours: 0,
      status: 'Present' as const,
      isLate: false,
      isEarlyDeparture: false,
      lateMinutes: 0,
      source: 'Client Timesheet' as const,
      workMode: 'Client Site' as const,
      assignmentId: 'CAS-201',
      clientId: 'CLI-101',
      projectName: 'Core Banking Ledger Modernization',
      clientSupervisorName: 'Vikramaditya Rao',
      clientSupervisorEmail: 'v.rao@apexfintech.example.com',
      clientVerifiedAt: '2026-10-22',
      verificationMethod: 'Client Email Confirmation' as const,
      verificationRefId: 'CEC-2026-001',
      evidenceRef: 'MSG-APEX-20261022-9941',
      clientVerificationStatus: 'Verified' as const,
      companyApprovalStatus: 'Approved' as const,
      payrollEligibilityStatus: 'Eligible for Draft Payroll' as const,
      approvalStatus: 'Approved' as const,
      approvedBy: 'Krishnaraj (reporting_manager)',
      approvedAt: '2026-10-23',
      entryType: 'Regular' as const,
      approvalHistory: [
        {
          stage: 'Stage 1: External Client Supervisor Email Verified',
          actorName: 'Anamika (recorded email from Vikramaditya Rao)',
          actorRole: 'hr_admin',
          timestamp: '2026-10-22T17:30:00Z',
          decision: 'Verified' as const,
          comments: 'Confirmed via MSG-APEX-20261022-9941'
        },
        {
          stage: 'Stage 2: Internal Company Approval (Approved)',
          actorName: 'Krishnaraj',
          actorRole: 'reporting_manager',
          timestamp: '2026-10-23T10:00:00Z',
          decision: 'Approved' as const,
          comments: 'Approved for October payroll processing.'
        }
      ]
    },
    // Scenario C: Attendance Machine / Server Outage Historical Manual Entry (Archana EMP-003 on 2026-10-16)
    {
      id: 'ATT-CLI-SCEN-C-001',
      employeeId: 'EMP-003',
      date: '2026-10-16',
      entryDate: '2026-10-17',
      shiftId: 'SHIFT-GEN',
      checkInTime: '09:30',
      checkOutTime: '18:30',
      breakDurationMinutes: 60,
      totalHoursWorked: 8.0,
      regularHours: 8.0,
      overtimeHours: 0,
      status: 'Present' as const,
      isLate: false,
      isEarlyDeparture: false,
      lateMinutes: 0,
      source: 'Manual HR Entry' as const,
      workMode: 'Client Site' as const,
      assignmentId: 'CAS-201',
      clientId: 'CLI-101',
      projectName: 'Core Banking Ledger Modernization',
      clientSupervisorName: 'Vikramaditya Rao',
      clientSupervisorEmail: 'v.rao@apexfintech.example.com',
      verificationMethod: 'Client Email Confirmation' as const,
      clientVerificationStatus: 'Verified' as const,
      companyApprovalStatus: 'Pending' as const,
      payrollEligibilityStatus: 'Not Eligible' as const,
      approvalStatus: 'Pending Manager Approval' as const,
      entryType: 'Manual Entry' as const,
      exceptionType: 'Machine Failure',
      outageIncidentRef: 'INC-2026-409',
      failureReason: 'Attendance machine failure' as const,
      reason: 'Client turnstile & attendance terminal power failure during Oct 16 morning shift.',
      supportingEvidence: 'IT Incident #INC-2026-409 & Signed Physical Register',
      approvalHistory: [
        {
          stage: 'Scenario C: Historical Outage Manual Entry Logged',
          actorName: 'Anamika',
          actorRole: 'hr_admin',
          timestamp: '2026-10-17T10:00:00Z',
          comments: 'Attendance date 2026-10-16 entered on 2026-10-17 under Incident Ref INC-2026-409.'
        },
        {
          stage: 'Stage 1: External Client Supervisor Email Verified',
          actorName: 'Anamika (recorded email from Vikramaditya Rao)',
          actorRole: 'hr_admin',
          timestamp: '2026-10-22T17:30:00Z',
          decision: 'Verified' as const,
          comments: 'Client supervisor confirmed physical sign-in sheet for Oct 16.'
        }
      ]
    },
    // Scenario D: Client Supervisor Disputes Recorded Working Hours (Mahalakshmi EMP-004 on 2026-10-18)
    {
      id: 'ATT-CLI-SCEN-D-001',
      employeeId: 'EMP-004',
      date: '2026-10-18',
      entryDate: '2026-10-18',
      shiftId: 'SHIFT-GEN',
      checkInTime: '09:30',
      checkOutTime: '18:30',
      breakDurationMinutes: 60,
      totalHoursWorked: 8.0,
      regularHours: 8.0,
      overtimeHours: 0,
      status: 'Present' as const,
      isLate: false,
      isEarlyDeparture: false,
      lateMinutes: 0,
      source: 'Web Punch' as const,
      workMode: 'Client Site' as const,
      assignmentId: 'CAS-202',
      clientId: 'CLI-102',
      projectName: 'Omnichannel Checkout Microservices',
      clientSupervisorName: 'Meera Krishnan',
      clientSupervisorEmail: 'meera.k@horizonretail.example.com',
      clientVerifiedAt: '2026-10-24',
      verificationMethod: 'Client Email Confirmation' as const,
      verificationRefId: 'CEC-2026-DISP-01',
      evidenceRef: 'MSG-HRZN-20261024-3399',
      clientVerificationStatus: 'Disputed' as const,
      companyApprovalStatus: 'Pending' as const,
      payrollEligibilityStatus: 'Not Eligible' as const,
      approvalStatus: 'Disputed' as const,
      originalCheckIn: '09:30',
      originalCheckOut: '18:30',
      originalHours: 8.0,
      originalStatus: 'Present' as const,
      disputeDetails: 'Client supervisor Meera Krishnan emailed stating employee departed Whitefield client bay at 15:30 (5.0 net hrs worked) rather than 18:30.',
      clientClaimedCheckIn: '09:30',
      clientClaimedCheckOut: '15:30',
      clientClaimedHours: 5.0,
      employeeClarification: 'Departed Whitefield bay at 15:30 to complete production hotfix deployment from Orbyx Bengaluru office VPN from 16:00 to 18:30.',
      employeeClarificationBy: 'Mahalakshmi (EMP-004)',
      employeeClarificationAt: '2026-10-24T17:45:00Z',
      employeeClarificationEvidence: 'GitHub PR #418 Merge Log & VPN Session #VPN-9921',
      approvalHistory: [
        {
          stage: 'Client-Site Check-In & Check-Out Recorded',
          actorName: 'Mahalakshmi',
          actorRole: 'employee',
          timestamp: '2026-10-18T18:30:00Z',
          comments: 'Recorded 09:30 to 18:30 (8.0h).'
        },
        {
          stage: 'Scenario D: Client Supervisor Email Disputed',
          actorName: 'Krishnaraj (recorded email from Meera Krishnan)',
          actorRole: 'reporting_manager',
          timestamp: '2026-10-24T16:00:00Z',
          decision: 'Disputed' as const,
          comments: 'Client claimed 09:30-15:30 (5.0h) onsite vs 8.0h recorded. Blocked from finalized payroll pending resolution.'
        },
        {
          stage: 'Employee Clarification Submitted',
          actorName: 'Mahalakshmi',
          actorRole: 'employee',
          timestamp: '2026-10-24T17:45:00Z',
          comments: 'Provided VPN & PR evidence for remote completion of afternoon sprint hours.'
        }
      ]
    }
  ];

  for (const att of clientSiteDemoAttendance) {
    if (!existingAtt.some((r) => r.id === att.id)) {
      db.saveAttendanceRecord(att);
    }
  }

  // Ensure existing baseline attendance records have explicit 4 status dimensions populated
  const updatedAttList = db.getAttendanceRecords();
  updatedAttList.forEach((r) => {
    let changed = false;
    const isClient = Boolean(r.workMode === 'Client Site' || r.assignmentId || r.clientId);
    if (!r.clientVerificationStatus) {
      r.clientVerificationStatus = isClient
        ? r.approvalStatus === 'Pending Client Verification'
          ? 'Pending'
          : r.approvalStatus === 'Disputed'
          ? 'Disputed'
          : 'Verified'
        : 'Not Required';
      changed = true;
    }
    if (!r.companyApprovalStatus) {
      r.companyApprovalStatus = isClient
        ? r.approvalStatus === 'Approved'
          ? 'Approved'
          : 'Pending'
        : 'Approved';
      changed = true;
    }
    if (!r.payrollEligibilityStatus) {
      r.payrollEligibilityStatus =
        r.companyApprovalStatus === 'Approved' && r.clientVerificationStatus !== 'Disputed'
          ? 'Eligible for Draft Payroll'
          : 'Not Eligible';
      changed = true;
    }
    if (changed) {
      db.saveAttendanceRecord(r);
    }
  });

  return { leavesCreated, expensesCreated, correctionsCreated };
}
