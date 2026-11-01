import React, { useState, useMemo, useEffect } from 'react';
import { db, subscribeToDB } from '../../db/storage';
import {
  AttendanceRecord,
  AttendanceCorrectionRequest,
  ShiftDefinition,
  NavigationContext,
  ClientVerificationStatus,
  CompanyApprovalStatus,
  PayrollEligibilityStatus,
  DisputeResolutionDecision
} from '../../types/hrms';
import { useAuth } from '../../services/authContext';
import { hrmsService } from '../../services/hrmsService';
import { DataTable, Column } from '../common/DataTable';
import { ExportButton } from '../common/ExportButton';
import { CsvImportModal } from '../common/CsvImportModal';
import { RequestCorrectionModal } from './RequestCorrectionModal';
import {
  Clock,
  LogIn,
  LogOut,
  CheckCircle2,
  Plus,
  Check,
  X,
  RotateCcw,
  Edit3,
  Power,
  Upload,
  ShieldCheck,
  AlertCircle,
  Mail,
  FileCheck2,
  AlertTriangle,
  Building2,
  Copy,
  MessageSquareWarning,
  Gavel
} from 'lucide-react';

interface AttendanceManagementProps {
  navContext?: NavigationContext;
  onOpenPolicies?: () => void;
}

export const AttendanceManagement: React.FC<AttendanceManagementProps> = ({
  navContext,
  onOpenPolicies
}) => {
  const { currentUser, canApproveRequestFor } = useAuth();
  const [activeTab, setActiveTab] = useState<'records' | 'corrections' | 'shifts' | 'verifications'>('records');
  const [isCorrectionModalOpen, setIsCorrectionModalOpen] = useState(false);
  const [correctionModalType, setCorrectionModalType] = useState<'Manual Entry' | 'Correction'>('Correction');
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [, setDbTick] = useState(0);

  useEffect(() => {
    return subscribeToDB(() => setDbTick((t) => t + 1));
  }, []);

  // Extended filters for Attendance Records (Section 11)
  const [empFilter, setEmpFilter] = useState('ALL');
  const [clientFilter, setClientFilter] = useState('ALL');
  const [deploymentFilter, setDeploymentFilter] = useState('ALL');
  const [shiftFilter, setShiftFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [clientVerFilter, setClientVerFilter] = useState<string>('ALL');
  const [companyAppFilter, setCompanyAppFilter] = useState<string>('ALL');
  const [payrollStatusFilter, setPayrollStatusFilter] = useState<string>('ALL');
  const [exceptionFilter, setExceptionFilter] = useState<'ALL' | 'LATE' | 'OVERTIME'>('ALL');
  const [selectedDate, setSelectedDate] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Punch station state
  const [punchMessage, setPunchMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [punchWorkMode, setPunchWorkMode] = useState<'Auto' | 'Client Site' | 'Office'>('Auto');

  useEffect(() => {
    if (!navContext) return;
    if (navContext.subTab === 'corrections') {
      setActiveTab('corrections');
    } else if (navContext.subTab === 'shifts') {
      setActiveTab('shifts');
    } else if (navContext.subTab === 'logs' || navContext.subTab === 'records') {
      setActiveTab('records');
    }
    if (navContext.dateFilter !== undefined) {
      setSelectedDate(navContext.dateFilter);
    }
    if (navContext.employeeId) {
      setEmpFilter(navContext.employeeId);
    }
    if (navContext.statusFilter && navContext.subTab !== 'corrections') {
      setStatusFilter(navContext.statusFilter);
    }
  }, [navContext]);

  // Shift Add/Edit modal
  const [editingShift, setEditingShift] = useState<ShiftDefinition | null>(null);
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
  const [shiftForm, setShiftForm] = useState({
    name: '',
    code: '',
    startTime: '09:30',
    endTime: '18:30',
    gracePeriodMinutes: 15,
    totalWorkingHours: 8,
    breakDurationMinutes: 60,
    isActive: true
  });

  const [reviewCorr, setReviewCorr] = useState<{ id: string; decision: 'Approved' | 'Rejected' } | null>(null);
  const [reviewComments, setReviewComments] = useState('');
  const [reviewCorrError, setReviewCorrError] = useState('');

  // Modal 1: Prepare External Client Verification Email (Section 6)
  const [prepModalRec, setPrepModalRec] = useState<{
    rec?: AttendanceRecord;
    corr?: AttendanceCorrectionRequest;
    coverageType: 'Single Date' | 'Multiple Dates' | 'Weekly Timesheet' | 'Date Range';
    dateRangeEnd: string;
    selectedExtraIds: string[];
    draft?: {
      referenceId: string;
      supervisorName: string;
      supervisorEmail: string;
      subject: string;
      body: string;
      deliveryNote: string;
    };
    copied?: boolean;
  } | null>(null);

  // Modal 2: Record External Client Supervisor Email Response (Scenarios B & D)
  const [recordEmailModal, setRecordEmailModal] = useState<{
    rec?: AttendanceRecord;
    corr?: AttendanceCorrectionRequest;
    decision: 'Verified' | 'Disputed' | 'Correction Requested' | 'Absent';
    coverageType: 'Single Date' | 'Multiple Dates' | 'Weekly Timesheet' | 'Date Range';
    coveredStartDate: string;
    coveredEndDate: string;
    extraRecordIds: string[];
    senderName: string;
    senderEmail: string;
    emailSubject: string;
    emailReceivedAt: string;
    messageReference: string;
    supportingAttachmentRef: string;
    summary: string;
    disputeDetails: string;
    claimedCheckIn: string;
    claimedCheckOut: string;
    claimedHours: string;
    error?: string;
  } | null>(null);

  // Modal 3: Dispute Clarification & Resolution (Scenario D)
  const [disputeModalRec, setDisputeModalRec] = useState<AttendanceRecord | null>(null);
  const [clarificationText, setClarificationText] = useState('');
  const [clarificationEvidence, setClarificationEvidence] = useState('');
  const [resolutionDecision, setResolutionDecision] = useState<DisputeResolutionDecision>('Approve Original Attendance');
  const [resolutionReason, setResolutionReason] = useState('');
  const [resolvedCheckIn, setResolvedCheckIn] = useState('');
  const [resolvedCheckOut, setResolvedCheckOut] = useState('');
  const [disputeModalError, setDisputeModalError] = useState('');

  // Modal 4: Stage 2 Company Final Approval (Section 8)
  const [companyApprovalModal, setCompanyApprovalModal] = useState<{
    rec: AttendanceRecord;
    decision: 'Approved' | 'Rejected' | 'Returned for Correction';
    comments: string;
    error?: string;
  } | null>(null);

  const records = db.getAttendanceRecords();
  const corrections = db.getCorrectionRequests();
  const shifts = db.getShifts();
  const employees = db.getEmployees();
  const clientConfirmations = db.getClientEmailConfirmations();
  const clients = hrmsService.getClientsFromStorage();
  const deployments = hrmsService.getClientDeploymentsFromStorage();

  const isHR = currentUser.role === 'hr_admin';
  const isMD = currentUser.role === 'senior_manager';
  const isManager = currentUser.role === 'reporting_manager';
  const canRecordClientEmail = isHR || isMD || isManager;

  // Scope: HR and MD see all; Reporting Manager sees team + own; Employee sees own
  const scopedRecords = useMemo(() => {
    return records.filter((r) => {
      if (isHR || isMD) return true;
      if (currentUser.role === 'reporting_manager') {
        const emp = employees.find((e) => e.id === r.employeeId);
        return emp?.reportingManagerId === currentUser.employeeId || r.employeeId === currentUser.employeeId;
      }
      return r.employeeId === currentUser.employeeId;
    });
  }, [records, isHR, isMD, currentUser, employees]);

  const visibleRecords = useMemo(() => {
    return scopedRecords.filter((r) => {
      if (empFilter !== 'ALL' && r.employeeId !== empFilter) return false;
      if (clientFilter !== 'ALL' && r.clientId !== clientFilter) return false;
      if (deploymentFilter !== 'ALL' && r.assignmentId !== deploymentFilter) return false;
      if (shiftFilter !== 'ALL' && r.shiftId !== shiftFilter) return false;
      if (statusFilter !== 'ALL' && r.status !== statusFilter) return false;
      const cVer = r.clientVerificationStatus || (r.workMode === 'Client Site' ? 'Pending' : 'Not Required');
      if (clientVerFilter !== 'ALL' && cVer !== clientVerFilter) return false;
      const cApp = r.companyApprovalStatus || (r.approvalStatus === 'Approved' ? 'Approved' : 'Pending');
      if (companyAppFilter !== 'ALL' && cApp !== companyAppFilter) return false;
      const pElig = r.payrollEligibilityStatus || (cApp === 'Approved' ? 'Eligible for Draft Payroll' : 'Not Eligible');
      if (payrollStatusFilter !== 'ALL' && pElig !== payrollStatusFilter) return false;
      if (exceptionFilter === 'LATE' && !r.isLate) return false;
      if (exceptionFilter === 'OVERTIME' && !(r.overtimeHours > 0)) return false;
      if (selectedDate && r.date !== selectedDate) return false;
      if (dateFrom && r.date < dateFrom) return false;
      if (dateTo && r.date > dateTo) return false;
      return true;
    });
  }, [
    scopedRecords,
    empFilter,
    clientFilter,
    deploymentFilter,
    shiftFilter,
    statusFilter,
    clientVerFilter,
    companyAppFilter,
    payrollStatusFilter,
    exceptionFilter,
    selectedDate,
    dateFrom,
    dateTo
  ]);

  // 7 Required Summary KPIs (Section 11)
  const kpiStats = useMemo(() => {
    const total = visibleRecords.length;
    const pendingClientVer = visibleRecords.filter((r) => {
      const st = r.clientVerificationStatus || (r.workMode === 'Client Site' ? 'Pending' : 'Not Required');
      return st === 'Pending' || st === 'Verification Requested' || st === 'Correction Requested';
    }).length;
    const verifiedClient = visibleRecords.filter((r) => r.clientVerificationStatus === 'Verified').length;
    const disputed = visibleRecords.filter(
      (r) => r.clientVerificationStatus === 'Disputed' || r.approvalStatus === 'Disputed'
    ).length;
    const pendingCompany = visibleRecords.filter((r) => {
      const app = r.companyApprovalStatus || (r.approvalStatus === 'Approved' ? 'Approved' : 'Pending');
      return app === 'Pending' || app === 'Returned for Correction';
    }).length;
    const approvedCompany = visibleRecords.filter((r) => {
      const app = r.companyApprovalStatus || (r.approvalStatus === 'Approved' ? 'Approved' : 'Pending');
      return app === 'Approved';
    }).length;
    const payrollEligible = visibleRecords.filter((r) => {
      const pel = r.payrollEligibilityStatus;
      if (pel) return pel !== 'Not Eligible';
      const app = r.companyApprovalStatus || (r.approvalStatus === 'Approved' ? 'Approved' : 'Pending');
      return app === 'Approved' && r.clientVerificationStatus !== 'Disputed';
    }).length;

    return {
      total,
      pendingClientVer,
      verifiedClient,
      disputed,
      pendingCompany,
      approvedCompany,
      payrollEligible
    };
  }, [visibleRecords]);

  const pendingCorrections = corrections.filter((c) => {
    if (c.status !== 'Pending') return false;
    return canApproveRequestFor(c.employeeId);
  });

  const todayStr = new Date().toISOString().split('T')[0];
  const myTodayRecord = records.find(
    (r) => r.employeeId === currentUser.employeeId && r.date === todayStr
  );
  const myActiveDeployment = useMemo(
    () => hrmsService.getActiveEmployeeDeploymentForDate(currentUser.employeeId, todayStr),
    [currentUser.employeeId, todayStr, records.length]
  );

  const handlePunch = (type: 'check-in' | 'check-out') => {
    setPunchMessage(null);
    const useClientDep =
      punchWorkMode === 'Office'
        ? undefined
        : myActiveDeployment
        ? {
            assignmentId: myActiveDeployment.id,
            clientId: myActiveDeployment.clientId,
            projectName: myActiveDeployment.projectName,
            workMode: 'Client Site' as const
          }
        : undefined;

    const res = hrmsService.punchAttendance(
      currentUser.employeeId,
      type,
      currentUser.id,
      currentUser.name,
      useClientDep
    );
    if (!res.success) {
      setPunchMessage({ type: 'error', text: res.message });
    } else {
      setPunchMessage({ type: 'success', text: res.message });
    }
  };

  const handleCorrectionDecision = () => {
    if (!reviewCorr) return;
    setReviewCorrError('');
    const res = hrmsService.decideAttendanceCorrection(
      reviewCorr.id,
      reviewCorr.decision,
      reviewComments,
      currentUser.id,
      currentUser.name
    );
    if (res && !res.success) {
      setReviewCorrError(res.message);
      return;
    }
    setReviewCorr(null);
    setReviewComments('');
  };

  const openPrepareEmailModal = (rec?: AttendanceRecord, corr?: AttendanceCorrectionRequest) => {
    const targetIds = rec ? [rec.id] : [];
    const draftRes = hrmsService.prepareClientVerificationRequest({
      attendanceRecordIds: targetIds,
      correctionRequestId: corr?.id,
      coverageType: 'Single Date',
      actorUserId: currentUser.id,
      actorName: currentUser.name
    });
    setPrepModalRec({
      rec,
      corr,
      coverageType: 'Single Date',
      dateRangeEnd: rec?.date || corr?.date || todayStr,
      selectedExtraIds: targetIds,
      draft: draftRes.success
        ? {
            referenceId: draftRes.referenceId,
            supervisorName: draftRes.supervisorName,
            supervisorEmail: draftRes.supervisorEmail,
            subject: draftRes.subject,
            body: draftRes.body,
            deliveryNote: draftRes.deliveryNote
          }
        : undefined
    });
  };

  const regenerateDraftForCoverage = (
    coverageType: 'Single Date' | 'Multiple Dates' | 'Weekly Timesheet' | 'Date Range',
    rec?: AttendanceRecord,
    corr?: AttendanceCorrectionRequest
  ) => {
    if (!rec && !corr) return;
    const empId = rec?.employeeId || corr?.employeeId;
    const matchingEmpRecords = records
      .filter((r) => r.employeeId === empId && r.workMode === 'Client Site')
      .map((r) => r.id);
    const idsToInclude =
      coverageType === 'Single Date'
        ? rec
          ? [rec.id]
          : []
        : matchingEmpRecords.length > 0
        ? matchingEmpRecords
        : rec
        ? [rec.id]
        : [];

    const draftRes = hrmsService.prepareClientVerificationRequest({
      attendanceRecordIds: idsToInclude,
      correctionRequestId: corr?.id,
      coverageType,
      actorUserId: currentUser.id,
      actorName: currentUser.name
    });

    setPrepModalRec((prev) =>
      prev
        ? {
            ...prev,
            coverageType,
            selectedExtraIds: idsToInclude,
            draft: draftRes.success
              ? {
                  referenceId: draftRes.referenceId,
                  supervisorName: draftRes.supervisorName,
                  supervisorEmail: draftRes.supervisorEmail,
                  subject: draftRes.subject,
                  body: draftRes.body,
                  deliveryNote: draftRes.deliveryNote
                }
              : prev.draft
          }
        : null
    );
  };

  const openRecordEmailResponseModal = (
    rec?: AttendanceRecord,
    corr?: AttendanceCorrectionRequest,
    defaultDecision: 'Verified' | 'Disputed' | 'Correction Requested' | 'Absent' = 'Verified'
  ) => {
    const empId = rec?.employeeId || corr?.employeeId || '';
    const dateVal = rec?.date || corr?.date || todayStr;
    const dep =
      deployments.find((d) => d.id === (rec?.assignmentId || corr?.assignmentId)) ||
      hrmsService.getActiveEmployeeDeploymentForDate(empId, dateVal, true);

    const supName = rec?.clientSupervisorName || corr?.clientSupervisorName || dep?.clientSupervisorName || 'Client Supervisor';
    const supEmail =
      rec?.clientSupervisorEmail ||
      corr?.clientSupervisorEmail ||
      dep?.clientSupervisorEmail ||
      'supervisor@client-org.example.com';

    setRecordEmailModal({
      rec,
      corr,
      decision: defaultDecision,
      coverageType: 'Single Date',
      coveredStartDate: dateVal,
      coveredEndDate: dateVal,
      extraRecordIds: rec ? [rec.id] : [],
      senderName: supName,
      senderEmail: supEmail,
      emailSubject: `RE: [Orbyx HRMS] Attendance Verification (${empId} - ${dateVal})`,
      emailReceivedAt: new Date().toISOString().slice(0, 16),
      messageReference: `MSG-EXT-${Date.now().toString().slice(-5)}`,
      supportingAttachmentRef: '',
      summary:
        defaultDecision === 'Verified'
          ? `Client supervisor ${supName} confirmed attendance hours via external email reply.`
          : `Client supervisor ${supName} disputed the recorded working hours via external email reply.`,
      disputeDetails: '',
      claimedCheckIn: rec?.checkInTime || corr?.requestedCheckIn || '09:30',
      claimedCheckOut: rec?.checkOutTime || corr?.requestedCheckOut || '16:30',
      claimedHours: '6.0'
    });
  };

  const handleSaveClientEmailResponse = (e: React.FormEvent) => {
    e.preventDefault();
    if (!recordEmailModal) return;

    const { rec, corr } = recordEmailModal;
    const empId = rec?.employeeId || corr?.employeeId || '';
    let targetIds = [...recordEmailModal.extraRecordIds];

    if (recordEmailModal.coverageType !== 'Single Date') {
      const rangeMatches = records
        .filter(
          (r) =>
            r.employeeId === empId &&
            r.workMode === 'Client Site' &&
            r.date >= recordEmailModal.coveredStartDate &&
            r.date <= recordEmailModal.coveredEndDate
        )
        .map((r) => r.id);
      targetIds = Array.from(new Set([...targetIds, ...rangeMatches]));
    }

    const coveredDates = Array.from(
      new Set([
        recordEmailModal.coveredStartDate,
        recordEmailModal.coveredEndDate,
        ...records.filter((r) => targetIds.includes(r.id)).map((r) => r.date)
      ])
    ).sort();

    const res = hrmsService.recordClientSupervisorEmailResponse({
      attendanceRecordIds: targetIds,
      correctionRequestId: corr?.id,
      coverageType: recordEmailModal.coverageType,
      coveredDates,
      decision: recordEmailModal.decision,
      senderName: recordEmailModal.senderName,
      senderEmail: recordEmailModal.senderEmail,
      emailSubject: recordEmailModal.emailSubject,
      emailReceivedAt: recordEmailModal.emailReceivedAt,
      messageReference: recordEmailModal.messageReference,
      supportingAttachmentRef: recordEmailModal.supportingAttachmentRef || undefined,
      summary: recordEmailModal.summary,
      disputeDetails: recordEmailModal.disputeDetails || undefined,
      claimedCheckIn: recordEmailModal.claimedCheckIn || undefined,
      claimedCheckOut: recordEmailModal.claimedCheckOut || undefined,
      claimedHours: recordEmailModal.claimedHours ? Number(recordEmailModal.claimedHours) : undefined,
      actorUserId: currentUser.id,
      actorName: currentUser.name,
      actorRole: currentUser.role
    });

    if (!res.success) {
      setRecordEmailModal({ ...recordEmailModal, error: res.message });
      return;
    }
    setRecordEmailModal(null);
  };

  const openDisputeModal = (rec: AttendanceRecord) => {
    setDisputeModalRec(rec);
    setClarificationText(rec.employeeClarification || '');
    setClarificationEvidence(rec.employeeClarificationEvidence || '');
    setResolutionDecision(rec.disputeResolutionDecision || 'Approve Original Attendance');
    setResolutionReason(rec.disputeResolutionReason || '');
    setResolvedCheckIn(rec.clientClaimedCheckIn || rec.checkInTime || '09:30');
    setResolvedCheckOut(rec.clientClaimedCheckOut || rec.checkOutTime || '17:30');
    setDisputeModalError('');
  };

  const handleSubmitClarification = () => {
    if (!disputeModalRec) return;
    setDisputeModalError('');
    const res = hrmsService.submitDisputeClarification({
      attendanceRecordId: disputeModalRec.id,
      clarification: clarificationText,
      evidence: clarificationEvidence || undefined,
      actorUserId: currentUser.id,
      actorName: currentUser.name
    });
    if (!res.success) {
      setDisputeModalError(res.message);
      return;
    }
    const updated = db.getAttendanceRecords().find((r) => r.id === disputeModalRec.id) || null;
    setDisputeModalRec(updated);
  };

  const handleResolveDispute = () => {
    if (!disputeModalRec) return;
    setDisputeModalError('');
    const res = hrmsService.resolveAttendanceDispute({
      attendanceRecordId: disputeModalRec.id,
      decision: resolutionDecision,
      reason: resolutionReason,
      correctedCheckIn: resolutionDecision === 'Approve Corrected Attendance' ? resolvedCheckIn : undefined,
      correctedCheckOut: resolutionDecision === 'Approve Corrected Attendance' ? resolvedCheckOut : undefined,
      actorUserId: currentUser.id,
      actorName: currentUser.name,
      actorRole: currentUser.role
    });
    if (!res.success) {
      setDisputeModalError(res.message);
      return;
    }
    setDisputeModalRec(null);
  };

  const handleCompanyApprovalSubmit = () => {
    if (!companyApprovalModal) return;
    const res = hrmsService.decideCompanyAttendanceApproval({
      attendanceRecordId: companyApprovalModal.rec.id,
      decision: companyApprovalModal.decision,
      comments: companyApprovalModal.comments,
      actorUserId: currentUser.id,
      actorName: currentUser.name,
      actorRole: currentUser.role
    });
    if (!res.success) {
      setCompanyApprovalModal({ ...companyApprovalModal, error: res.message });
      return;
    }
    setCompanyApprovalModal(null);
  };

  const openAddShift = () => {
    setEditingShift(null);
    setShiftForm({
      name: '',
      code: '',
      startTime: '09:30',
      endTime: '18:30',
      gracePeriodMinutes: 15,
      totalWorkingHours: 8,
      breakDurationMinutes: 60,
      isActive: true
    });
    setIsShiftModalOpen(true);
  };

  const openEditShift = (s: ShiftDefinition) => {
    setEditingShift(s);
    setShiftForm({
      name: s.name,
      code: s.code,
      startTime: s.startTime,
      endTime: s.endTime,
      gracePeriodMinutes: s.gracePeriodMinutes,
      totalWorkingHours: s.totalWorkingHours,
      breakDurationMinutes: s.breakDurationMinutes,
      isActive: s.isActive !== false
    });
    setIsShiftModalOpen(true);
  };

  const handleSaveShift = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: ShiftDefinition = {
      id: editingShift?.id || `SHF-${Date.now().toString().slice(-4)}`,
      name: shiftForm.name.trim(),
      code: shiftForm.code.trim().toUpperCase(),
      startTime: shiftForm.startTime,
      endTime: shiftForm.endTime,
      gracePeriodMinutes: Number(shiftForm.gracePeriodMinutes),
      totalWorkingHours: Number(shiftForm.totalWorkingHours),
      breakDurationMinutes: Number(shiftForm.breakDurationMinutes),
      weeklyOffDays: editingShift?.weeklyOffDays || [0, 6],
      isOvernight: editingShift?.isOvernight ?? false,
      isActive: shiftForm.isActive
    };
    db.saveShift(payload);
    setIsShiftModalOpen(false);
  };

  const toggleShiftActive = (s: ShiftDefinition) => {
    db.saveShift({ ...s, isActive: s.isActive === false ? true : false });
  };

  const recordColumns: Column<AttendanceRecord>[] = [
    {
      header: 'Employee & Deployment',
      accessorKey: 'employeeId',
      sortable: true,
      cell: (rec) => {
        const emp = employees.find((e) => e.id === rec.employeeId);
        const cli = clients.find((c) => c.id === rec.clientId);
        return (
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <img
                src={emp?.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'}
                alt=""
                className="h-7 w-7 rounded-full object-cover"
              />
              <div>
                <p className="font-semibold text-slate-900">{emp ? `${emp.firstName} ${emp.lastName}` : rec.employeeId}</p>
                <p className="text-[10px] text-slate-400 font-mono">{rec.employeeId}</p>
              </div>
            </div>
            {rec.workMode === 'Client Site' && (
              <div className="pl-9 text-[10px] text-indigo-700">
                <span className="font-semibold block">{cli?.name || rec.clientId || 'Client Site'}</span>
                {rec.projectName && <span className="text-slate-500 block">{rec.projectName}</span>}
              </div>
            )}
          </div>
        );
      }
    },
    {
      header: 'Date & Shift',
      accessorKey: 'date',
      sortable: true,
      cell: (rec) => {
        const sh = shifts.find((s) => s.id === rec.shiftId);
        return (
          <div>
            <span className="font-mono text-slate-800 font-medium block">{rec.date}</span>
            <span className="text-[10px] text-slate-400">{sh?.code || rec.shiftId}</span>
            {rec.entryDate && rec.entryDate !== rec.date && (
              <span className="text-[10px] text-purple-700 font-mono block" title="Historical entry date">
                Entered: {rec.entryDate}
              </span>
            )}
            {rec.outageIncidentRef && (
              <span className="text-[10px] text-amber-700 font-mono block">
                Ref: {rec.outageIncidentRef}
              </span>
            )}
          </div>
        );
      }
    },
    {
      header: 'Punches & Hours',
      accessorKey: 'totalHoursWorked',
      sortable: true,
      cell: (rec) => (
        <div className="space-y-0.5">
          <div className="font-mono font-bold text-slate-900">
            {rec.checkInTime || '--:--'} &rarr; {rec.checkOutTime || 'Active'}
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-xs font-semibold text-slate-700">{rec.totalHoursWorked} hrs</span>
            {rec.overtimeHours > 0 && (
              <span className="text-[10px] text-indigo-600 font-semibold">+{rec.overtimeHours}h OT</span>
            )}
            {rec.isLate && (
              <span className="text-[10px] text-rose-600 font-medium">+{rec.lateMinutes}m Late</span>
            )}
          </div>
          {(rec.originalCheckIn || rec.originalCheckOut) &&
            (rec.originalCheckIn !== rec.checkInTime || rec.originalCheckOut !== rec.checkOutTime) && (
              <span className="text-[10px] text-slate-400 font-mono block" title="Preserved original timestamps">
                Orig: {rec.originalCheckIn || '--:--'}-{rec.originalCheckOut || '--:--'}{' '}
                {rec.originalHours !== undefined ? `(${rec.originalHours}h)` : ''}
              </span>
            )}
          {rec.clientClaimedHours !== undefined && rec.clientVerificationStatus === 'Disputed' && (
            <span className="text-[10px] text-rose-700 font-mono font-semibold block">
              Client Claim: {rec.clientClaimedCheckIn || '--:--'}-{rec.clientClaimedCheckOut || '--:--'} ({rec.clientClaimedHours}h)
            </span>
          )}
        </div>
      )
    },
    {
      header: '1. Attendance Outcome',
      accessorKey: 'status',
      sortable: true,
      cell: (rec) => (
        <div className="space-y-1">
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
              rec.status === 'Present'
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : rec.status === 'Late'
                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                : rec.status === 'Half Day'
                ? 'bg-orange-50 text-orange-700 border border-orange-200'
                : rec.status === 'On Leave'
                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                : 'bg-slate-100 text-slate-600'
            }`}
          >
            {rec.status}
          </span>
          <span className="block text-[10px] text-slate-400">{rec.source}</span>
        </div>
      )
    },
    {
      header: '2. Client Email Verification',
      cell: (rec) => {
        const cVer: ClientVerificationStatus =
          rec.clientVerificationStatus || (rec.workMode === 'Client Site' ? 'Pending' : 'Not Required');
        return (
          <div className="space-y-1">
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${
                cVer === 'Verified'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : cVer === 'Disputed'
                  ? 'bg-rose-50 text-rose-700 border border-rose-200'
                  : cVer === 'Verification Requested'
                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                  : cVer === 'Pending' || cVer === 'Correction Requested'
                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                  : 'bg-slate-100 text-slate-500'
              }`}
            >
              {cVer}
            </span>
            {rec.clientSupervisorName && (
              <p className="text-[10px] text-slate-500">
                Sup: <span className="font-medium text-slate-700">{rec.clientSupervisorName}</span>
                {rec.clientSupervisorEmail && (
                  <span className="block font-mono text-[9px] text-slate-400">{rec.clientSupervisorEmail}</span>
                )}
              </p>
            )}
            {rec.verificationRefId && (
              <span className="text-[9px] font-mono text-indigo-600 block">Ref: {rec.verificationRefId}</span>
            )}
          </div>
        );
      }
    },
    {
      header: '3. Company Approval & 4. Payroll',
      cell: (rec) => {
        const cApp: CompanyApprovalStatus =
          rec.companyApprovalStatus || (rec.approvalStatus === 'Approved' ? 'Approved' : 'Pending');
        const pElig: PayrollEligibilityStatus =
          rec.payrollEligibilityStatus || (cApp === 'Approved' ? 'Eligible for Draft Payroll' : 'Not Eligible');
        return (
          <div className="space-y-1">
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-slate-400">Company:</span>
              <span
                className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                  cApp === 'Approved'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : cApp === 'Rejected'
                    ? 'bg-rose-50 text-rose-700 border border-rose-200'
                    : 'bg-amber-50 text-amber-700 border border-amber-200'
                }`}
              >
                {cApp}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-slate-400">Payroll:</span>
              <span
                className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                  pElig === 'Finalized'
                    ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                    : pElig === 'Included in Draft Payroll' || pElig === 'Eligible for Draft Payroll'
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                {pElig}
              </span>
            </div>
            {rec.approvedBy && (
              <span className="text-[9px] text-slate-400 block">By: {rec.approvedBy}</span>
            )}
          </div>
        );
      }
    },
    {
      header: 'Workflow Actions',
      cell: (rec) => {
        const cVer: ClientVerificationStatus =
          rec.clientVerificationStatus || (rec.workMode === 'Client Site' ? 'Pending' : 'Not Required');
        const cApp: CompanyApprovalStatus =
          rec.companyApprovalStatus || (rec.approvalStatus === 'Approved' ? 'Approved' : 'Pending');
        const canCompanyApprove =
          (isHR || isMD || canApproveRequestFor(rec.employeeId)) && rec.employeeId !== currentUser.employeeId;

        return (
          <div className="flex flex-wrap items-center gap-1.5">
            {rec.workMode === 'Client Site' && cVer !== 'Verified' && (
              <button
                onClick={() => openPrepareEmailModal(rec)}
                className="inline-flex items-center gap-1 px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded text-[10px] font-semibold"
                title="Prepare External Verification Email for Client Supervisor"
              >
                <Mail className="h-3 w-3" />
                <span> Email Req</span>
              </button>
            )}

            {rec.workMode === 'Client Site' && canRecordClientEmail && (
              <button
                onClick={() => openRecordEmailResponseModal(rec, undefined, 'Verified')}
                className="inline-flex items-center gap-1 px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded text-[10px] font-semibold"
                title="Record Client Supervisor Email Reply (Verified / Disputed)"
              >
                <FileCheck2 className="h-3 w-3" />
                <span>Log Email Reply</span>
              </button>
            )}

            {(cVer === 'Disputed' || rec.disputeDetails || rec.disputeResolutionDecision) && (
              <button
                onClick={() => openDisputeModal(rec)}
                className="inline-flex items-center gap-1 px-2 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded text-[10px] font-semibold"
              >
                <Gavel className="h-3 w-3" />
                <span>{cVer === 'Disputed' ? 'Dispute Review' : 'Dispute Log'}</span>
              </button>
            )}

            {canCompanyApprove && cApp !== 'Approved' && cVer !== 'Disputed' && (
              <button
                onClick={() =>
                  setCompanyApprovalModal({
                    rec,
                    decision: 'Approved',
                    comments: 'Verified against deployment shift & client email confirmation.'
                  })
                }
                disabled={rec.workMode === 'Client Site' && cVer !== 'Verified'}
                className={`inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-semibold ${
                  rec.workMode === 'Client Site' && cVer !== 'Verified'
                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                }`}
                title={
                  rec.workMode === 'Client Site' && cVer !== 'Verified'
                    ? 'Awaiting Stage 1 Client Supervisor Email Verification before Stage 2 Company Approval'
                    : 'Stage 2 Company Final Approval'
                }
              >
                <Check className="h-3 w-3" />
                <span>Company Approve</span>
              </button>
            )}
          </div>
        );
      }
    }
  ];

  const corrColumns: Column<AttendanceCorrectionRequest>[] = [
    {
      header: 'Employee & Exception Type',
      accessorKey: 'employeeId',
      sortable: true,
      cell: (req) => {
        const emp = employees.find((e) => e.id === req.employeeId);
        const type = req.entryType || 'Correction';
        return (
          <div>
            <span className="font-semibold text-slate-900 block">
              {emp ? `${emp.firstName} ${emp.lastName}` : req.employeeId}
            </span>
            <div className="flex flex-wrap items-center gap-1 mt-0.5">
              <span
                className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                  type === 'Manual Entry'
                    ? 'bg-purple-50 text-purple-700 border border-purple-200'
                    : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                }`}
              >
                {type}
              </span>
              {req.exceptionType && (
                <span className="text-[10px] text-slate-500">{req.exceptionType}</span>
              )}
              {req.outageIncidentRef && (
                <span className="text-[10px] font-mono text-amber-700 bg-amber-50 px-1 rounded">
                  {req.outageIncidentRef}
                </span>
              )}
            </div>
          </div>
        );
      }
    },
    {
      header: 'Attendance vs Entry Date',
      accessorKey: 'date',
      sortable: true,
      cell: (req) => (
        <div>
          <span className="font-mono font-semibold text-slate-900 block">Att: {req.date}</span>
          <span className="text-[10px] text-slate-400 block">
            Entry: {req.entryDate || (req.submittedAt ? req.submittedAt.slice(0, 10) : '—')}
          </span>
        </div>
      )
    },
    {
      header: 'Requested vs Original',
      cell: (req) => (
        <div>
          <span className="font-mono font-bold text-slate-900 block">
            {req.requestedCheckIn} - {req.requestedCheckOut}
            {req.calculatedHours !== undefined ? ` (${req.calculatedHours}h)` : ''}
          </span>
          {(req.originalCheckIn || req.originalCheckOut) && (
            <span className="text-[10px] text-slate-500 font-mono block">
              Original: {req.originalCheckIn || '--:--'} - {req.originalCheckOut || '--:--'}
              {req.originalHours !== undefined ? ` (${req.originalHours}h)` : ''}
            </span>
          )}
          {req.conflictWarning && (
            <span className="text-[10px] text-amber-700 font-medium block mt-0.5">
              {req.conflictWarning}
            </span>
          )}
        </div>
      )
    },
    {
      header: 'Reason & Client Verification',
      accessorKey: 'reason',
      cell: (req) => (
        <div className="space-y-1">
          <span className="text-slate-700 block">{req.reason}</span>
          {req.supportingEvidence && (
            <span className="text-[10px] text-indigo-700 font-mono block">
              Ref: {req.supportingEvidence}
            </span>
          )}
          {req.requiresClientEmailVerification && (
            <div className="flex items-center gap-1.5">
              <span
                className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                  req.clientVerificationStatus === 'Verified'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : req.clientVerificationStatus === 'Disputed'
                    ? 'bg-rose-50 text-rose-700 border border-rose-200'
                    : 'bg-amber-50 text-amber-800 border border-amber-200'
                }`}
              >
                Client Email: {req.clientVerificationStatus || 'Pending'}
              </span>
              {req.clientSupervisorName && (
                <span className="text-[10px] text-slate-500">({req.clientSupervisorName})</span>
              )}
            </div>
          )}
        </div>
      )
    },
    {
      header: 'Company Status',
      accessorKey: 'status',
      sortable: true,
      cell: (req) => (
        <div>
          <span
            className={`px-2 py-0.5 rounded text-xs font-medium ${
              req.status === 'Approved'
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : req.status === 'Rejected'
                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                : 'bg-amber-50 text-amber-700 border border-amber-200'
            }`}
          >
            {req.status}
          </span>
          {req.approverComments && (
            <span className="text-[10px] text-slate-400 block mt-0.5">{req.approverComments}</span>
          )}
        </div>
      )
    },
    {
      header: 'Actions',
      cell: (req) => {
        if (req.status !== 'Pending') return null;
        return (
          <div className="flex flex-wrap items-center gap-1.5">
            {req.requiresClientEmailVerification && req.clientVerificationStatus !== 'Verified' && (
              <>
                <button
                  onClick={() => openPrepareEmailModal(undefined, req)}
                  className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded text-[10px] font-semibold"
                >
                  Email Draft
                </button>
                {canRecordClientEmail && (
                  <button
                    onClick={() => openRecordEmailResponseModal(undefined, req, 'Verified')}
                    className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded text-[10px] font-semibold"
                  >
                    Log Client Email
                  </button>
                )}
              </>
            )}
            {req.employeeId === currentUser.employeeId ? (
              <span className="text-[10px] text-slate-400 italic">Awaiting Manager/HR (No Self-Approval)</span>
            ) : (
              canApproveRequestFor(req.employeeId) && (
                <>
                  <button
                    onClick={() => {
                      setReviewCorrError('');
                      setReviewCorr({ id: req.id, decision: 'Approved' });
                    }}
                    className="p-1.5 bg-emerald-600 text-white rounded hover:bg-emerald-700 transition-colors"
                    title="Approve Correction"
                  >
                    <Check className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => {
                      setReviewCorrError('');
                      setReviewCorr({ id: req.id, decision: 'Rejected' });
                    }}
                    className="p-1.5 bg-rose-600 text-white rounded hover:bg-rose-700 transition-colors"
                    title="Reject Correction"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </>
              )
            )}
          </div>
        );
      }
    }
  ];

  const exportData = visibleRecords.map((r) => ({
    EmployeeID: r.employeeId,
    Date: r.date,
    EntryDate: r.entryDate || r.date,
    ShiftID: r.shiftId,
    WorkMode: r.workMode || 'Office',
    ClientID: r.clientId || '',
    DeploymentID: r.assignmentId || '',
    Project: r.projectName || '',
    CheckIn: r.checkInTime || '',
    CheckOut: r.checkOutTime || '',
    TotalHours: r.totalHoursWorked,
    OvertimeHours: r.overtimeHours,
    AttendanceOutcome: r.status,
    ClientVerificationStatus: r.clientVerificationStatus || 'Not Required',
    CompanyApprovalStatus: r.companyApprovalStatus || 'Approved',
    PayrollEligibilityStatus: r.payrollEligibilityStatus || 'Eligible for Draft Payroll',
    ClientSupervisor: r.clientSupervisorName || '',
    ClientSupervisorEmail: r.clientSupervisorEmail || '',
    Source: r.source
  }));

  const hasActiveFilters =
    empFilter !== 'ALL' ||
    clientFilter !== 'ALL' ||
    deploymentFilter !== 'ALL' ||
    shiftFilter !== 'ALL' ||
    statusFilter !== 'ALL' ||
    clientVerFilter !== 'ALL' ||
    companyAppFilter !== 'ALL' ||
    payrollStatusFilter !== 'ALL' ||
    exceptionFilter !== 'ALL' ||
    Boolean(selectedDate) ||
    Boolean(dateFrom) ||
    Boolean(dateTo);

  return (
    <div className="space-y-5">
      {/* Check-In / Check-Out Station with Client Deployment Awareness (Section 5) */}
      {!isMD && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-3">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                <Clock className="h-6 w-6" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-sm font-bold text-slate-900">Today's Attendance Station ({todayStr})</h3>
                  {myActiveDeployment ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                      <Building2 className="h-3 w-3" />
                      Active Client Deployment: {myActiveDeployment.projectName} ({myActiveDeployment.id})
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-600">
                      Internal Company Office
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  {myActiveDeployment ? (
                    <>
                      Client Supervisor:{' '}
                      <span className="font-semibold text-slate-700">{myActiveDeployment.clientSupervisorName}</span>{' '}
                      <span className="font-mono text-[11px] text-slate-500">
                        ({myActiveDeployment.clientSupervisorEmail || 'External Email Verification Required'})
                      </span>{' '}
                      · No GPS tracking · Actual punch timestamps recorded
                    </>
                  ) : (
                    <>
                      Shift: <span className="font-semibold text-slate-700">General Day Shift (09:30 - 18:30)</span> · 15 min grace period
                    </>
                  )}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {myActiveDeployment && !myTodayRecord?.checkInTime && (
                <select
                  value={punchWorkMode}
                  onChange={(e) => setPunchWorkMode(e.target.value as any)}
                  className="px-2.5 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg text-slate-700"
                  aria-label="Punch Location Mode"
                >
                  <option value="Auto">Client Site ({myActiveDeployment.projectName})</option>
                  <option value="Office">Internal Office Visit</option>
                </select>
              )}

              {!myTodayRecord?.checkInTime ? (
                <button
                  onClick={() => handlePunch('check-in')}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-2xs transition-colors"
                >
                  <LogIn className="h-4 w-4" />
                  <span>{myActiveDeployment && punchWorkMode !== 'Office' ? 'Client-Site Check-In' : 'Record Check-In'}</span>
                </button>
              ) : !myTodayRecord?.checkOutTime ? (
                <div className="flex items-center gap-2.5">
                  <span className="text-xs text-slate-700">
                    In at <span className="font-mono font-bold text-slate-900">{myTodayRecord.checkInTime}</span>
                  </span>
                  <button
                    onClick={() => handlePunch('check-out')}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition-colors"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    <span>Check Out</span>
                  </button>
                </div>
              ) : (
                <span className="text-xs text-emerald-800 font-semibold bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span>
                    Shift Complete ({myTodayRecord.totalHoursWorked} hrs ·{' '}
                    {myTodayRecord.clientVerificationStatus && myTodayRecord.clientVerificationStatus !== 'Not Required'
                      ? `Client: ${myTodayRecord.clientVerificationStatus}`
                      : 'Office'}
                    )
                  </span>
                </span>
              )}

              <button
                onClick={() => {
                  setCorrectionModalType('Manual Entry');
                  setIsCorrectionModalOpen(true);
                }}
                className="px-3 py-2 text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 rounded-lg transition-colors"
              >
                + Outage / Manual Entry
              </button>
              <button
                onClick={() => {
                  setCorrectionModalType('Correction');
                  setIsCorrectionModalOpen(true);
                }}
                className="px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors"
              >
                Forgot Check-In/Out (Correction)
              </button>
            </div>
          </div>

          {punchMessage && (
            <div
              className={`p-2.5 rounded-lg border text-xs flex items-center justify-between ${
                punchMessage.type === 'error'
                  ? 'bg-rose-50 border-rose-200 text-rose-700'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-800'
              }`}
            >
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{punchMessage.text}</span>
              </div>
              <button onClick={() => setPunchMessage(null)} className="text-slate-400 hover:text-slate-600">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* 7 Mandatory Attendance & Client Verification Summary KPIs (Section 11) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
        <div
          onClick={() => {
            setClientVerFilter('ALL');
            setCompanyAppFilter('ALL');
            setPayrollStatusFilter('ALL');
          }}
          className="bg-white p-3 rounded-xl border border-slate-200 cursor-pointer hover:border-indigo-300 transition-colors"
        >
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">1. Total Recorded</p>
          <p className="text-xl font-bold text-slate-900 mt-1">{kpiStats.total}</p>
          <p className="text-[10px] text-slate-500">All scoped logs</p>
        </div>
        <div
          onClick={() => {
            setActiveTab('records');
            setClientVerFilter('Pending');
          }}
          className="bg-white p-3 rounded-xl border border-amber-200 cursor-pointer hover:bg-amber-50/40 transition-colors"
        >
          <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-700">2. Pending Client Email</p>
          <p className="text-xl font-bold text-amber-700 mt-1">{kpiStats.pendingClientVer}</p>
          <p className="text-[10px] text-amber-600">Awaiting supervisor reply</p>
        </div>
        <div
          onClick={() => {
            setActiveTab('records');
            setClientVerFilter('Verified');
          }}
          className="bg-white p-3 rounded-xl border border-blue-200 cursor-pointer hover:bg-blue-50/40 transition-colors"
        >
          <p className="text-[10px] font-semibold uppercase tracking-wider text-blue-700">3. Client Verified</p>
          <p className="text-xl font-bold text-blue-700 mt-1">{kpiStats.verifiedClient}</p>
          <p className="text-[10px] text-blue-600">Email confirmation logged</p>
        </div>
        <div
          onClick={() => {
            setActiveTab('records');
            setClientVerFilter('Disputed');
          }}
          className="bg-white p-3 rounded-xl border border-rose-200 cursor-pointer hover:bg-rose-50/40 transition-colors"
        >
          <p className="text-[10px] font-semibold uppercase tracking-wider text-rose-700">4. Disputed Hours</p>
          <p className="text-xl font-bold text-rose-700 mt-1">{kpiStats.disputed}</p>
          <p className="text-[10px] text-rose-600">Flagged for resolution</p>
        </div>
        <div
          onClick={() => {
            setActiveTab('records');
            setCompanyAppFilter('Pending');
          }}
          className="bg-white p-3 rounded-xl border border-purple-200 cursor-pointer hover:bg-purple-50/40 transition-colors"
        >
          <p className="text-[10px] font-semibold uppercase tracking-wider text-purple-700">5. Pending Company App.</p>
          <p className="text-xl font-bold text-purple-700 mt-1">{kpiStats.pendingCompany}</p>
          <p className="text-[10px] text-purple-600">Awaiting Manager / HR</p>
        </div>
        <div
          onClick={() => {
            setActiveTab('records');
            setCompanyAppFilter('Approved');
          }}
          className="bg-white p-3 rounded-xl border border-emerald-200 cursor-pointer hover:bg-emerald-50/40 transition-colors"
        >
          <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-700">6. Company Approved</p>
          <p className="text-xl font-bold text-emerald-700 mt-1">{kpiStats.approvedCompany}</p>
          <p className="text-[10px] text-emerald-600">Internal sign-off complete</p>
        </div>
        <div
          onClick={() => {
            setActiveTab('records');
            setCompanyAppFilter('Approved');
          }}
          className="bg-white p-3 rounded-xl border border-indigo-200 cursor-pointer hover:bg-indigo-50/40 transition-colors"
        >
          <p className="text-[10px] font-semibold uppercase tracking-wider text-indigo-700">7. Payroll Eligible</p>
          <p className="text-xl font-bold text-indigo-700 mt-1">{kpiStats.payrollEligible}</p>
          <p className="text-[10px] text-indigo-600">Approved & undisputed</p>
        </div>
      </div>

      {/* Tabs and Actions Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200">
        <div className="flex flex-wrap items-center gap-1 bg-slate-100 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab('records')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              activeTab === 'records' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Timesheet Records ({visibleRecords.length})
          </button>
          <button
            onClick={() => setActiveTab('corrections')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              activeTab === 'corrections' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Exceptions & Corrections Queue ({pendingCorrections.length})
          </button>
          <button
            onClick={() => setActiveTab('verifications')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              activeTab === 'verifications' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            External Client Email Log ({clientConfirmations.length})
          </button>
          <button
            onClick={() => setActiveTab('shifts')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              activeTab === 'shifts' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Configured Shifts ({shifts.length})
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {onOpenPolicies && (
            <button
              type="button"
              onClick={onOpenPolicies}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg border border-indigo-200 transition-colors"
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Attendance Policies &rarr;</span>
            </button>
          )}
          {isHR && activeTab === 'records' && (
            <button
              onClick={() => setIsImportOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg"
            >
              <Upload className="h-3.5 w-3.5" />
              <span>Import Punches</span>
            </button>
          )}
          {isHR && activeTab === 'shifts' && (
            <button
              onClick={openAddShift}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Shift</span>
            </button>
          )}
          <ExportButton data={exportData} fileName="Orbyx_Attendance_Log" />
        </div>
      </div>

      {/* Extended Filter Bar for Records (Section 11) */}
      {activeTab === 'records' && (
        <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
            {(isHR || isMD || isManager) && (
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">Employee</label>
                <select
                  value={empFilter}
                  onChange={(e) => setEmpFilter(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg"
                >
                  <option value="ALL">All Employees</option>
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.firstName} {e.lastName} ({e.id})
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">Client Organization</label>
              <select
                value={clientFilter}
                onChange={(e) => setClientFilter(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg"
              >
                <option value="ALL">All Clients & Office</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.id})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">Project / Deployment</label>
              <select
                value={deploymentFilter}
                onChange={(e) => setDeploymentFilter(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg"
              >
                <option value="ALL">All Deployments</option>
                {deployments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.projectName} ({d.id} - {d.employeeId})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">Client Verification Status</label>
              <select
                value={clientVerFilter}
                onChange={(e) => setClientVerFilter(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg"
              >
                <option value="ALL">All Client Verification</option>
                <option value="Not Required">Not Required (Office)</option>
                <option value="Pending">Pending</option>
                <option value="Verification Requested">Verification Requested</option>
                <option value="Verified">Verified</option>
                <option value="Disputed">Disputed</option>
                <option value="Correction Requested">Correction Requested</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">Company Approval Status</label>
              <select
                value={companyAppFilter}
                onChange={(e) => setCompanyAppFilter(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg"
              >
                <option value="ALL">All Company Approvals</option>
                <option value="Pending">Pending</option>
                <option value="Approved">Approved</option>
                <option value="Rejected">Rejected</option>
                <option value="Returned for Correction">Returned for Correction</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end pt-2 border-t border-slate-100">
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">Payroll Processing Status</label>
              <select
                value={payrollStatusFilter}
                onChange={(e) => setPayrollStatusFilter(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg"
              >
                <option value="ALL">All Payroll Statuses</option>
                <option value="Not Eligible">Not Eligible</option>
                <option value="Eligible for Draft Payroll">Eligible for Draft Payroll</option>
                <option value="Included in Draft Payroll">Included in Draft Payroll</option>
                <option value="Finalized">Finalized</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">Attendance Outcome</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg"
              >
                <option value="ALL">All Outcomes</option>
                <option value="Present">Present</option>
                <option value="Late">Late</option>
                <option value="Half Day">Half Day</option>
                <option value="Absent">Absent</option>
                <option value="On Leave">On Leave</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">Date From</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">Date To</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg"
              />
            </div>
            <div className="flex items-end gap-1.5">
              <div className="flex-1">
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Exact Date</label>
                <input
                  type="date"
                  aria-label="Attendance Date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>
              {hasActiveFilters && (
                <button
                  onClick={() => {
                    setEmpFilter('ALL');
                    setClientFilter('ALL');
                    setDeploymentFilter('ALL');
                    setShiftFilter('ALL');
                    setStatusFilter('ALL');
                    setClientVerFilter('ALL');
                    setCompanyAppFilter('ALL');
                    setPayrollStatusFilter('ALL');
                    setExceptionFilter('ALL');
                    setSelectedDate('');
                    setDateFrom('');
                    setDateTo('');
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg shrink-0"
                  title="Clear Filters"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>Reset</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Content: Records */}
      {activeTab === 'records' && (
        <DataTable
          data={visibleRecords}
          columns={recordColumns}
          searchPlaceholder="Search punches by employee ID, project, or date..."
        />
      )}

      {/* Content: Corrections */}
      {activeTab === 'corrections' && (
        <DataTable
          data={isHR || isMD ? corrections : corrections.filter((c) => c.employeeId === currentUser.employeeId || canApproveRequestFor(c.employeeId))}
          columns={corrColumns}
          searchPlaceholder="Filter correction & outage requests..."
          emptyMessage="No attendance correction or manual entry requests."
        />
      )}

      {/* Content: External Client Email Verification Log (Section 6) */}
      {activeTab === 'verifications' && (
        <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3 text-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
            <div>
              <h4 className="text-sm font-bold text-slate-900">External Client Supervisor Email Confirmation Audit Log</h4>
              <p className="text-[11px] text-slate-500">
                External client supervisors have zero login access to Orbyx HRMS. Their email replies are logged here as auditable verification evidence before internal Manager/HR approval.
              </p>
            </div>
            <span className="px-2.5 py-1 rounded-md bg-amber-50 border border-amber-200 text-amber-800 text-[10px] font-semibold">
              Mode: Manual Recording by Authorized Internal User (No Live SMTP/IMAP Configured)
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-[11px] text-slate-500 uppercase">
                  <th className="py-2 px-3">Ref ID & Coverage</th>
                  <th className="py-2 px-3">Employee & Client</th>
                  <th className="py-2 px-3">External Supervisor Sender</th>
                  <th className="py-2 px-3">Decision & Claim</th>
                  <th className="py-2 px-3">Subject & Summary</th>
                  <th className="py-2 px-3">Recorded By (Internal)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {clientConfirmations.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/70">
                    <td className="py-2.5 px-3 font-mono text-[11px]">
                      <span className="font-bold text-slate-900 block">{c.id}</span>
                      <span className="text-[10px] text-indigo-600">{c.coverageType || 'Single Date'}</span>
                      <span className="text-[10px] text-slate-400 block">
                        {c.coveredDates ? c.coveredDates.join(', ') : c.attendanceDate}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="font-semibold text-slate-900 block">{c.employeeName || c.employeeId}</span>
                      <span className="text-[10px] text-slate-500">{c.clientName} · {c.projectName}</span>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="font-medium text-slate-800 block">{c.clientSupervisorName || c.confirmedByEmail}</span>
                      <span className="font-mono text-[10px] text-slate-500 block">{c.confirmedByEmail}</span>
                      <span className="text-[10px] text-slate-400">Ref: {c.messageReference}</span>
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded text-[10px] font-semibold ${
                          (c.decision || 'Verified') === 'Verified'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : c.decision === 'Disputed'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                      >
                        {c.decision || 'Verified'}
                      </span>
                      {c.claimedHours !== undefined && (
                        <span className="text-[10px] text-rose-700 font-mono block mt-0.5">
                          Claimed: {c.claimedCheckIn}-{c.claimedCheckOut} ({c.claimedHours}h)
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 max-w-xs">
                      <span className="font-medium text-slate-800 block truncate">{c.emailSubject}</span>
                      <span className="text-[11px] text-slate-500 block">{c.summary}</span>
                      {c.disputeDetails && (
                        <span className="text-[10px] text-rose-600 block mt-0.5">Dispute: {c.disputeDetails}</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-[11px] text-slate-600">
                      <span className="font-semibold text-slate-800 block">{c.recordedBy}</span>
                      <span className="text-[10px] text-slate-400 block">{c.confirmedAt}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Content: Shifts */}
      {activeTab === 'shifts' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          {shifts.map((s) => {
            const active = s.isActive !== false;
            return (
              <div
                key={s.id}
                className={`p-4 bg-white rounded-xl border shadow-xs space-y-3 ${
                  active ? 'border-slate-200' : 'border-slate-200 opacity-65 bg-slate-50'
                }`}
              >
                <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                  <div>
                    <span className="font-bold text-slate-900 block">{s.name}</span>
                    <span className="font-mono text-[10px] text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded">
                      {s.code}
                    </span>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                      active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div className="space-y-1.5 text-slate-600">
                  <div className="flex justify-between"><span className="text-slate-400">Timings:</span><span className="font-mono font-medium">{s.startTime} - {s.endTime}</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">Total Duration:</span><span>{s.totalWorkingHours} hours</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">Grace Period:</span><span>{s.gracePeriodMinutes} mins</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">Break Duration:</span><span>{s.breakDurationMinutes} mins</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">Weekly Offs:</span><span>Saturday, Sunday</span></div>
                </div>
                {isHR && (
                  <div className="pt-2 border-t border-slate-100 flex justify-end gap-2">
                    <button
                      onClick={() => openEditShift(s)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded"
                    >
                      <Edit3 className="h-3 w-3" /> Edit
                    </button>
                    <button
                      onClick={() => toggleShiftActive(s)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-100 rounded"
                    >
                      <Power className="h-3 w-3" /> {active ? 'Deactivate' : 'Activate'}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal 1: Prepare External Client Verification Email (Section 6) */}
      {prepModalRec && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-xl max-w-xl w-full p-6 shadow-xl border border-slate-200 space-y-4 text-xs max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <h4 className="text-base font-bold text-slate-900">Prepare External Client Supervisor Verification Email</h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Client supervisors verify attendance by ordinary email reply without any Orbyx HRMS account or login.
                </p>
              </div>
              <button onClick={() => setPrepModalRec(null)} className="text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-[11px]">
              <strong>Honest Email Integration Status:</strong> Live external SMTP/IMAP email server integration is not configured in this local-storage MVP. Prepare the structured email draft below, send via your mail client, and record the client supervisor's email response in Orbyx HRMS.
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Verification Coverage Scope</label>
              <div className="grid grid-cols-4 gap-2">
                {(['Single Date', 'Multiple Dates', 'Weekly Timesheet', 'Date Range'] as const).map((cov) => (
                  <button
                    key={cov}
                    type="button"
                    onClick={() => regenerateDraftForCoverage(cov, prepModalRec.rec, prepModalRec.corr)}
                    className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold ${
                      prepModalRec.coverageType === cov
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {cov}
                  </button>
                ))}
              </div>
            </div>

            {prepModalRec.draft && (
              <div className="space-y-2.5">
                <div className="grid grid-cols-2 gap-2 p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Verification Reference ID</span>
                    <span className="font-mono font-bold text-indigo-700">{prepModalRec.draft.referenceId}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Recipient (Client Supervisor)</span>
                    <span className="font-semibold text-slate-800">{prepModalRec.draft.supervisorName}</span>
                    <span className="font-mono text-[10px] text-slate-500 block">{prepModalRec.draft.supervisorEmail}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Email Subject</label>
                  <input
                    readOnly
                    value={prepModalRec.draft.subject}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-mono text-[11px]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Email Body (Confidential salary, bank & ID data excluded per Section 6.1)
                  </label>
                  <textarea
                    readOnly
                    value={prepModalRec.draft.body}
                    rows={10}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg font-mono text-[11px]"
                  />
                </div>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-100">
              <div className="flex items-center gap-2">
                {prepModalRec.draft && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard?.writeText(
                          `To: ${prepModalRec.draft?.supervisorEmail}\nSubject: ${prepModalRec.draft?.subject}\n\n${prepModalRec.draft?.body}`
                        );
                        setPrepModalRec({ ...prepModalRec, copied: true });
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg font-semibold"
                    >
                      <Copy className="h-3.5 w-3.5" />
                      <span>{prepModalRec.copied ? 'Copied Draft!' : 'Copy Email Draft'}</span>
                    </button>
                    <a
                      href={`mailto:${encodeURIComponent(prepModalRec.draft.supervisorEmail)}?subject=${encodeURIComponent(
                        prepModalRec.draft.subject
                      )}&body=${encodeURIComponent(prepModalRec.draft.body)}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg font-semibold"
                    >
                      <Mail className="h-3.5 w-3.5" />
                      <span>Open in Mail Client</span>
                    </a>
                  </>
                )}
              </div>
              <button
                type="button"
                onClick={() => setPrepModalRec(null)}
                className="px-4 py-1.5 bg-slate-900 text-white font-semibold rounded-lg"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 2: Record External Client Supervisor Email Response (Scenarios B & D) */}
      {recordEmailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <form
            onSubmit={handleSaveClientEmailResponse}
            className="bg-white rounded-xl max-w-xl w-full p-6 shadow-xl border border-slate-200 space-y-3.5 text-xs max-h-[92vh] overflow-y-auto"
          >
            <div className="flex items-start justify-between border-b border-slate-100 pb-2.5">
              <div>
                <h4 className="text-base font-bold text-slate-900">Record External Client Supervisor Email Response</h4>
                <p className="text-[11px] text-slate-500">
                  Stage 1 External Verification · Does not auto-approve Stage 2 Company Approval.
                </p>
              </div>
              <button type="button" onClick={() => setRecordEmailModal(null)} className="text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>

            {recordEmailModal.error && (
              <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700">
                {recordEmailModal.error}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Client Supervisor Decision *</label>
                <select
                  value={recordEmailModal.decision}
                  onChange={(e) =>
                    setRecordEmailModal({
                      ...recordEmailModal,
                      decision: e.target.value as any
                    })
                  }
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg font-semibold"
                >
                  <option value="Verified">Verified (Confirmed Hours)</option>
                  <option value="Disputed">Disputed (Scenario D - Hours Disputed)</option>
                  <option value="Correction Requested">Correction Requested</option>
                  <option value="Absent">Marked Absent by Client</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Confirmation Coverage Scope *</label>
                <select
                  value={recordEmailModal.coverageType}
                  onChange={(e) =>
                    setRecordEmailModal({
                      ...recordEmailModal,
                      coverageType: e.target.value as any
                    })
                  }
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg"
                >
                  <option value="Single Date">Single Date</option>
                  <option value="Multiple Dates">Multiple Dates</option>
                  <option value="Weekly Timesheet">Weekly Timesheet</option>
                  <option value="Date Range">Date Range</option>
                </select>
              </div>
            </div>

            {recordEmailModal.coverageType !== 'Single Date' && (
              <div className="grid grid-cols-2 gap-3 p-2.5 bg-indigo-50/50 rounded-lg border border-indigo-100">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Covered Start Date *</label>
                  <input
                    type="date"
                    value={recordEmailModal.coveredStartDate}
                    onChange={(e) => setRecordEmailModal({ ...recordEmailModal, coveredStartDate: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Covered End Date *</label>
                  <input
                    type="date"
                    value={recordEmailModal.coveredEndDate}
                    onChange={(e) => setRecordEmailModal({ ...recordEmailModal, coveredEndDate: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg"
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Client Supervisor Name *</label>
                <input
                  required
                  value={recordEmailModal.senderName}
                  onChange={(e) => setRecordEmailModal({ ...recordEmailModal, senderName: e.target.value })}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Client Supervisor Official Email *</label>
                <input
                  required
                  type="email"
                  value={recordEmailModal.senderEmail}
                  onChange={(e) => setRecordEmailModal({ ...recordEmailModal, senderEmail: e.target.value })}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg font-mono"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Email Received Date & Time *</label>
                <input
                  required
                  type="datetime-local"
                  value={recordEmailModal.emailReceivedAt}
                  onChange={(e) => setRecordEmailModal({ ...recordEmailModal, emailReceivedAt: e.target.value })}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg font-mono"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Email Message ID / Reference *</label>
                <input
                  required
                  value={recordEmailModal.messageReference}
                  onChange={(e) => setRecordEmailModal({ ...recordEmailModal, messageReference: e.target.value })}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Email Subject Line *</label>
              <input
                required
                value={recordEmailModal.emailSubject}
                onChange={(e) => setRecordEmailModal({ ...recordEmailModal, emailSubject: e.target.value })}
                className="w-full px-3 py-1.5 border border-slate-200 rounded-lg"
              />
            </div>

            {(recordEmailModal.decision === 'Disputed' || recordEmailModal.decision === 'Correction Requested') && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 space-y-2.5">
                <p className="font-bold text-rose-800">Scenario D — Client Disputed Working Hours Details</p>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[10px] font-semibold text-rose-700 mb-1">Client Claimed Check-In</label>
                    <input
                      type="time"
                      value={recordEmailModal.claimedCheckIn}
                      onChange={(e) => setRecordEmailModal({ ...recordEmailModal, claimedCheckIn: e.target.value })}
                      className="w-full px-2 py-1 bg-white border border-rose-200 rounded font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-rose-700 mb-1">Client Claimed Check-Out</label>
                    <input
                      type="time"
                      value={recordEmailModal.claimedCheckOut}
                      onChange={(e) => setRecordEmailModal({ ...recordEmailModal, claimedCheckOut: e.target.value })}
                      className="w-full px-2 py-1 bg-white border border-rose-200 rounded font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-rose-700 mb-1">Client Claimed Hours</label>
                    <input
                      type="number"
                      step="0.5"
                      value={recordEmailModal.claimedHours}
                      onChange={(e) => setRecordEmailModal({ ...recordEmailModal, claimedHours: e.target.value })}
                      className="w-full px-2 py-1 bg-white border border-rose-200 rounded font-mono"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-rose-700 mb-1">Dispute Statement from Client Email *</label>
                  <textarea
                    required
                    value={recordEmailModal.disputeDetails}
                    onChange={(e) => setRecordEmailModal({ ...recordEmailModal, disputeDetails: e.target.value })}
                    placeholder="e.g., Employee left client site at 16:30 after sprint demo; only 6 billable hours confirmed."
                    className="w-full p-2 bg-white border border-rose-200 rounded"
                    rows={2}
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Email Confirmation Summary / Excerpt *</label>
              <textarea
                required
                value={recordEmailModal.summary}
                onChange={(e) => setRecordEmailModal({ ...recordEmailModal, summary: e.target.value })}
                rows={2}
                className="w-full p-2.5 border border-slate-200 rounded-lg"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Supporting Email Attachment Reference (Optional)</label>
              <input
                value={recordEmailModal.supportingAttachmentRef}
                onChange={(e) => setRecordEmailModal({ ...recordEmailModal, supportingAttachmentRef: e.target.value })}
                placeholder="e.g., signed_weekly_timesheet_oct26.pdf"
                className="w-full px-3 py-1.5 border border-slate-200 rounded-lg font-mono"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setRecordEmailModal(null)}
                className="px-3 py-1.5 text-slate-700 border border-slate-200 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg"
              >
                Save External Email Confirmation
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal 3: Scenario D — Client Dispute Clarification & Internal Resolution */}
      {disputeModalRec && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-xl max-w-2xl w-full p-6 shadow-xl border border-slate-200 space-y-4 text-xs max-h-[92vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <h4 className="text-base font-bold text-slate-900">
                  Scenario D — Client Attendance Dispute Review & Resolution ({disputeModalRec.employeeId} · {disputeModalRec.date})
                </h4>
                <p className="text-[11px] text-slate-500">
                  Preserves original employee timestamps, client supervisor dispute details, employee clarification, and internal Manager/HR resolution.
                </p>
              </div>
              <button onClick={() => setDisputeModalRec(null)} className="text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>

            {disputeModalError && (
              <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700">
                {disputeModalError}
              </div>
            )}

            {/* Side-by-side comparison of Original vs Client Dispute */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-[10px] font-bold uppercase text-slate-500">Preserved Original Employee Record</span>
                <p className="font-mono font-bold text-slate-900 text-sm">
                  {disputeModalRec.originalCheckIn || disputeModalRec.checkInTime || '--:--'} &rarr;{' '}
                  {disputeModalRec.originalCheckOut || disputeModalRec.checkOutTime || '--:--'} (
                  {disputeModalRec.originalHours ?? disputeModalRec.totalHoursWorked} hrs)
                </p>
                <p className="text-[11px] text-slate-600">
                  Current Active: {disputeModalRec.checkInTime} - {disputeModalRec.checkOutTime} ({disputeModalRec.totalHoursWorked} hrs)
                </p>
              </div>

              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 space-y-1">
                <span className="text-[10px] font-bold uppercase text-rose-700">
                  External Client Supervisor Dispute ({disputeModalRec.clientSupervisorName})
                </span>
                <p className="font-mono font-bold text-rose-900 text-sm">
                  Claimed: {disputeModalRec.clientClaimedCheckIn || '--:--'} &rarr;{' '}
                  {disputeModalRec.clientClaimedCheckOut || '--:--'} ({disputeModalRec.clientClaimedHours ?? '--'} hrs)
                </p>
                <p className="text-[11px] text-rose-800">{disputeModalRec.disputeDetails || 'Disputed via external email.'}</p>
              </div>
            </div>

            {/* Step 1: Employee / Reporting Manager Clarification */}
            <div className="p-3.5 rounded-lg border border-indigo-200 bg-indigo-50/40 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-indigo-950">Step 1: Employee / Manager Clarification & Evidence</span>
                {disputeModalRec.employeeClarificationAt && (
                  <span className="text-[10px] text-indigo-700">
                    Submitted by {disputeModalRec.employeeClarificationBy} on {disputeModalRec.employeeClarificationAt.slice(0, 10)}
                  </span>
                )}
              </div>
              <textarea
                value={clarificationText}
                onChange={(e) => setClarificationText(e.target.value)}
                placeholder="Explain actual working hours (e.g., worked from client conference room / VPN after 16:30)..."
                rows={2}
                className="w-full p-2 bg-white border border-slate-200 rounded-lg"
              />
              <div className="flex items-center gap-2">
                <input
                  value={clarificationEvidence}
                  onChange={(e) => setClarificationEvidence(e.target.value)}
                  placeholder="Supporting evidence ref (e.g. Jira commit log, VPN session ID)..."
                  className="flex-1 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg font-mono"
                />
                <button
                  type="button"
                  onClick={handleSubmitClarification}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg"
                >
                  Save Clarification
                </button>
              </div>
            </div>

            {/* Step 2: Internal Manager / HR Final Dispute Resolution */}
            {(isHR || isMD || (isManager && disputeModalRec.employeeId !== currentUser.employeeId)) && (
              <div className="p-3.5 rounded-lg border border-slate-200 bg-white space-y-3">
                <span className="font-bold text-slate-900 block">
                  Step 2: Authorized Internal Manager / HR Resolution Decision
                </span>

                <div className="grid grid-cols-2 gap-2">
                  {(
                    [
                      'Approve Original Attendance',
                      'Approve Corrected Attendance',
                      'Return for Additional Information',
                      'Reject Attendance Correction'
                    ] as DisputeResolutionDecision[]
                  ).map((dec) => (
                    <button
                      key={dec}
                      type="button"
                      onClick={() => setResolutionDecision(dec)}
                      className={`p-2 rounded-lg border text-left font-semibold text-[11px] ${
                        resolutionDecision === dec
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {dec}
                    </button>
                  ))}
                </div>

                {resolutionDecision === 'Approve Corrected Attendance' && (
                  <div className="grid grid-cols-2 gap-3 p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg">
                    <div>
                      <label className="block text-[10px] font-semibold text-emerald-800 mb-1">Approved Check-In</label>
                      <input
                        type="time"
                        value={resolvedCheckIn}
                        onChange={(e) => setResolvedCheckIn(e.target.value)}
                        className="w-full px-2.5 py-1 bg-white border border-emerald-300 rounded font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-emerald-800 mb-1">Approved Check-Out</label>
                      <input
                        type="time"
                        value={resolvedCheckOut}
                        onChange={(e) => setResolvedCheckOut(e.target.value)}
                        className="w-full px-2.5 py-1 bg-white border border-emerald-300 rounded font-mono"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Mandatory Resolution Decision Reason *</label>
                  <textarea
                    value={resolutionReason}
                    onChange={(e) => setResolutionReason(e.target.value)}
                    placeholder="Document internal investigation findings and basis for final hours decision..."
                    rows={2}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setDisputeModalRec(null)}
                    className="px-3 py-1.5 border border-slate-200 rounded-lg text-slate-700"
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    onClick={handleResolveDispute}
                    className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg"
                  >
                    Confirm Dispute Resolution
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal 4: Stage 2 Company Final Approval (Section 8) */}
      {companyApprovalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4 text-xs">
            <h4 className="text-base font-bold text-slate-900">
              Stage 2: Internal Company Attendance Approval ({companyApprovalModal.rec.employeeId} · {companyApprovalModal.rec.date})
            </h4>
            <p className="text-slate-600">
              Client verification never automatically approves company attendance. Only internal Manager/HR approval makes this record eligible for payroll processing.
            </p>

            {companyApprovalModal.error && (
              <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700">
                {companyApprovalModal.error}
              </div>
            )}

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Company Approval Decision</label>
              <select
                value={companyApprovalModal.decision}
                onChange={(e) =>
                  setCompanyApprovalModal({
                    ...companyApprovalModal,
                    decision: e.target.value as any
                  })
                }
                className="w-full px-3 py-1.5 border border-slate-200 rounded-lg font-semibold"
              >
                <option value="Approved">Approved (Eligible for Draft Payroll)</option>
                <option value="Returned for Correction">Returned for Correction</option>
                <option value="Rejected">Rejected (Not Payable)</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Approver Remarks</label>
              <textarea
                value={companyApprovalModal.comments}
                onChange={(e) => setCompanyApprovalModal({ ...companyApprovalModal, comments: e.target.value })}
                rows={2}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setCompanyApprovalModal(null)}
                className="px-3 py-1.5 text-slate-700 border border-slate-200 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleCompanyApprovalSubmit}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg"
              >
                Confirm Company Decision
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Shift Modal */}
      {isShiftModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <form
            onSubmit={handleSaveShift}
            className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-3 text-xs"
          >
            <h4 className="text-base font-bold text-slate-900">
              {editingShift ? 'Edit Shift Definition' : 'Add Shift Definition'}
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <label className="col-span-2 font-semibold text-slate-700">
                Shift Name *
                <input
                  required
                  value={shiftForm.name}
                  onChange={(e) => setShiftForm({ ...shiftForm, name: e.target.value })}
                  className="mt-1 w-full px-3 py-1.5 border border-slate-200 rounded-lg"
                />
              </label>
              <label className="font-semibold text-slate-700">
                Shift Code *
                <input
                  required
                  value={shiftForm.code}
                  onChange={(e) => setShiftForm({ ...shiftForm, code: e.target.value })}
                  className="mt-1 w-full px-3 py-1.5 border border-slate-200 rounded-lg font-mono uppercase"
                />
              </label>
              <label className="font-semibold text-slate-700">
                Grace Period (mins)
                <input
                  type="number"
                  value={shiftForm.gracePeriodMinutes}
                  onChange={(e) => setShiftForm({ ...shiftForm, gracePeriodMinutes: Number(e.target.value) })}
                  className="mt-1 w-full px-3 py-1.5 border border-slate-200 rounded-lg"
                />
              </label>
              <label className="font-semibold text-slate-700">
                Start Time
                <input
                  type="time"
                  value={shiftForm.startTime}
                  onChange={(e) => setShiftForm({ ...shiftForm, startTime: e.target.value })}
                  className="mt-1 w-full px-3 py-1.5 border border-slate-200 rounded-lg"
                />
              </label>
              <label className="font-semibold text-slate-700">
                End Time
                <input
                  type="time"
                  value={shiftForm.endTime}
                  onChange={(e) => setShiftForm({ ...shiftForm, endTime: e.target.value })}
                  className="mt-1 w-full px-3 py-1.5 border border-slate-200 rounded-lg"
                />
              </label>
              <label className="font-semibold text-slate-700">
                Working Hours
                <input
                  type="number"
                  value={shiftForm.totalWorkingHours}
                  onChange={(e) => setShiftForm({ ...shiftForm, totalWorkingHours: Number(e.target.value) })}
                  className="mt-1 w-full px-3 py-1.5 border border-slate-200 rounded-lg"
                />
              </label>
              <label className="font-semibold text-slate-700">
                Break (mins)
                <input
                  type="number"
                  value={shiftForm.breakDurationMinutes}
                  onChange={(e) => setShiftForm({ ...shiftForm, breakDurationMinutes: Number(e.target.value) })}
                  className="mt-1 w-full px-3 py-1.5 border border-slate-200 rounded-lg"
                />
              </label>
            </div>
            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsShiftModalOpen(false)}
                className="px-3 py-1.5 text-slate-700 border border-slate-200 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg"
              >
                Save Shift
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Correction Decision Modal */}
      {reviewCorr && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4 text-xs">
            <h4 className="text-base font-bold text-slate-900">
              {reviewCorr.decision === 'Approved' ? 'Approve Attendance Correction' : 'Reject Attendance Correction'}
            </h4>
            <p className="text-slate-600">
              Approved corrections update the attendance record while preserving the original timestamps and audit history.
            </p>
            {reviewCorrError && (
              <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 font-medium">
                {reviewCorrError}
              </div>
            )}
            <textarea
              value={reviewComments}
              onChange={(e) => setReviewComments(e.target.value)}
              placeholder="e.g. Verified client email confirmation and shift logs..."
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg"
              rows={3}
            />
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setReviewCorr(null)}
                className="px-3 py-1.5 text-slate-700 bg-white border border-slate-200 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleCorrectionDecision}
                className={`px-4 py-1.5 font-semibold text-white rounded-lg ${
                  reviewCorr.decision === 'Approved' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                Confirm {reviewCorr.decision}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Request Correction / Manual Entry Modal */}
      <RequestCorrectionModal
        isOpen={isCorrectionModalOpen}
        onClose={() => setIsCorrectionModalOpen(false)}
        defaultEntryType={correctionModalType}
      />

      {/* Bulk CSV Import Attendance */}
      <CsvImportModal<AttendanceRecord>
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        title="Bulk Import Attendance Punches"
        description="Import biometric or external attendance punches by Employee ID and Date."
        templateFileName="Orbyx_Attendance_Import_Template"
        headers={['EmployeeID', 'Date', 'CheckIn', 'CheckOut', 'HoursWorked', 'Status']}
        sampleRows={[
          ['EMP-003', '2026-10-26', '09:32', '18:40', '9.1', 'Present']
        ]}
        validateRow={(cols, idx) => {
          const [employeeId, date, checkInTime, checkOutTime, totalHoursWorked, status] = cols;
          if (!employeeId || !date) {
            return { valid: false, error: 'EmployeeID and Date are required' };
          }
          if (!employees.some((e) => e.id === employeeId)) {
            return { valid: false, error: `Employee ID "${employeeId}" not found` };
          }
          const hrs = Number(totalHoursWorked) || 8;
          return {
            valid: true,
            data: {
              id: `ATT-IMP-${Date.now()}-${idx}`,
              employeeId,
              date,
              shiftId: 'SHF-GEN',
              checkInTime: checkInTime || '09:30',
              checkOutTime: checkOutTime || '18:30',
              totalHoursWorked: hrs,
              regularHours: Math.min(8, hrs),
              overtimeHours: hrs > 8 ? Number((hrs - 8).toFixed(1)) : 0,
              status: (status as any) || 'Present',
              isLate: status === 'Late',
              lateMinutes: status === 'Late' ? 20 : 0,
              isEarlyDeparture: false,
              source: 'Biometric Import',
              clientVerificationStatus: 'Not Required',
              companyApprovalStatus: 'Approved',
              payrollEligibilityStatus: 'Eligible for Draft Payroll'
            }
          };
        }}
        onCommit={(validItems) => {
          validItems.forEach((rec) => db.saveAttendanceRecord(rec));
        }}
      />
    </div>
  );
};

