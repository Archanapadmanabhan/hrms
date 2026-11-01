import React, { useState, useEffect } from 'react';
import { db, subscribeToDB } from '../../db/storage';
import { LeaveApplication, LeaveType, Holiday, NavigationContext } from '../../types/hrms';
import { useAuth } from '../../services/authContext';
import { hrmsService } from '../../services/hrmsService';
import { DataTable, Column } from '../common/DataTable';
import { ExportButton } from '../common/ExportButton';
import { StatCard } from '../common/StatCard';
import { PolicyRulesPanel } from '../common/PolicyRulesPanel';
import { ApplyLeaveModal } from './ApplyLeaveModal';
import { AbsenceCalendar } from './AbsenceCalendar';
import {
  CalendarDays,
  CalendarCheck,
  Plus,
  Check,
  X,
  Calendar,
  Eye,
  Edit3,
  Power,
  Search,
  AlertTriangle,
  RotateCcw,
  Trash2,
  ShieldCheck
} from 'lucide-react';

interface LeaveManagementProps {
  navContext?: NavigationContext;
  onOpenPolicies?: () => void;
}

export const LeaveManagement: React.FC<LeaveManagementProps> = ({ navContext, onOpenPolicies }) => {
  const { currentUser, canApproveRequestFor, canManageOrganization } = useAuth();
  const isHR = canManageOrganization();
  const isMD = currentUser.role === 'senior_manager';
  const [, setDbTick] = useState(0);

  useEffect(() => {
    return subscribeToDB(() => setDbTick((t) => t + 1));
  }, []);

  const [activeTab, setActiveTab] = useState<'applications' | 'approvals' | 'calendar' | 'types' | 'holidays'>(() => {
    if (navContext?.subTab === 'approvals' || navContext?.statusFilter === 'Pending Approval') return 'approvals';
    if (navContext?.subTab === 'calendar') return 'calendar';
    if (navContext?.subTab === 'holidays') return 'holidays';
    return 'applications';
  });
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [commentModalApp, setCommentModalApp] = useState<{ id: string; decision: 'Approved' | 'Rejected' } | null>(null);
  const [decisionComments, setDecisionComments] = useState('');
  const [viewingApp, setViewingApp] = useState<LeaveApplication | null>(null);

  // Filters for Applications
  const [filterLeaveType, setFilterLeaveType] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState(() => navContext?.statusFilter || 'ALL');
  const [filterDept, setFilterDept] = useState(() => navContext?.departmentFilter || 'ALL');
  const [filterFromDate, setFilterFromDate] = useState('');
  const [filterToDate, setFilterToDate] = useState('');

  useEffect(() => {
    if (!navContext) return;
    if (navContext.subTab === 'approvals' || navContext.statusFilter === 'Pending Approval') setActiveTab('approvals');
    else if (navContext.subTab === 'calendar') setActiveTab('calendar');
    else if (navContext.subTab === 'holidays') setActiveTab('holidays');
    else if (navContext.subTab === 'applications' || navContext.subTab === 'my_leaves') setActiveTab('applications');
    if (navContext.statusFilter) setFilterStatus(navContext.statusFilter);
    if (navContext.departmentFilter) setFilterDept(navContext.departmentFilter);
  }, [navContext]);

  // Leave Policy Rules & Types state
  const [leaveTypesState, setLeaveTypesState] = useState<LeaveType[]>(() => db.getLeaveTypes());
  const [policySearch, setPolicySearch] = useState('');
  const [policyStatusFilter, setPolicyStatusFilter] = useState<'ALL' | 'Active' | 'Inactive'>('ALL');
  const [editingLeaveType, setEditingLeaveType] = useState<LeaveType | null>(null);
  const [isCreatingLeaveType, setIsCreatingLeaveType] = useState(false);
  const [confirmDeactivateType, setConfirmDeactivateType] = useState<LeaveType | null>(null);
  const [policyNotice, setPolicyNotice] = useState('');

  // Leave Type Add/Edit Form
  const [ltName, setLtName] = useState('');
  const [ltCode, setLtCode] = useState('');
  const [ltDesc, setLtDesc] = useState('');
  const [ltIsPaid, setLtIsPaid] = useState(true);
  const [ltAnnualQuota, setLtAnnualQuota] = useState(12);
  const [ltCarryForward, setLtCarryForward] = useState(5);
  const [ltMaxConsecutive, setLtMaxConsecutive] = useState(10);
  const [ltAllowsHalfDay, setLtAllowsHalfDay] = useState(true);
  const [ltRequiresDoc, setLtRequiresDoc] = useState(false);
  const [ltEligibility, setLtEligibility] = useState('All Permanent & Probation Staff');
  const [ltEffectiveDate, setLtEffectiveDate] = useState('2026-01-01');
  const [ltIsActive, setLtIsActive] = useState(true);
  const [ltError, setLtError] = useState('');

  // Holidays state
  const [holidaysState, setHolidaysState] = useState<Holiday[]>(() => db.getHolidays());
  const [holidaySearch, setHolidaySearch] = useState('');
  const [showAddHoliday, setShowAddHoliday] = useState(false);
  const [newHolidayName, setNewHolidayName] = useState('');
  const [newHolidayDate, setNewHolidayDate] = useState('');
  const [newHolidayOptional, setNewHolidayOptional] = useState(false);

  const applications = db.getLeaveApplications();
  const leaveTypes = leaveTypesState;
  const employees = db.getEmployees();
  const departments = db.getDepartments();
  const holidays = holidaysState;

  // Scope filter:
  const scopedApplications = applications.filter((app) => {
    if (currentUser.role === 'hr_admin') return true;
    if (currentUser.role === 'senior_manager' || currentUser.role === 'reporting_manager') {
      const emp = employees.find((e) => e.id === app.employeeId);
      return emp?.reportingManagerId === currentUser.employeeId || app.employeeId === currentUser.employeeId;
    }
    return app.employeeId === currentUser.employeeId;
  });

  // Apply contextual filters
  const visibleApplications = scopedApplications.filter((app) => {
    if (filterLeaveType !== 'ALL' && app.leaveTypeId !== filterLeaveType) return false;
    if (filterStatus !== 'ALL' && app.status !== filterStatus) return false;
    if (filterDept !== 'ALL') {
      const emp = employees.find((e) => e.id === app.employeeId);
      if (emp?.departmentId !== filterDept) return false;
    }
    if (filterFromDate && app.startDate < filterFromDate) return false;
    if (filterToDate && app.endDate > filterToDate) return false;
    return true;
  });

  const pendingApprovals = applications.filter((app) => {
    if (app.status !== 'Pending Approval') return false;
    return canApproveRequestFor(app.employeeId);
  });

  const approvedCount = visibleApplications.filter((a) => a.status === 'Approved').length;

  const handleDecisionConfirm = () => {
    if (!commentModalApp) return;
    hrmsService.decideLeave(
      commentModalApp.id,
      commentModalApp.decision,
      decisionComments,
      currentUser.id,
      currentUser.name
    );
    setCommentModalApp(null);
    setDecisionComments('');
  };

  const handleWithdrawLeave = (app: LeaveApplication) => {
    app.status = 'Cancelled';
    db.saveLeaveApplication(app);
    db.logAudit({
      actorUserId: currentUser.id,
      actorName: currentUser.name,
      actorRole: currentUser.role,
      action: 'UPDATE',
      module: 'LEAVE',
      entityId: app.id,
      entityName: app.id,
      description: `Employee withdrew pending leave application (${app.startDate} to ${app.endDate})`
    });
    setPolicyNotice('Pending leave application withdrawn.');
  };

  // Leave Type Modal Helpers
  const openAddLeaveType = () => {
    setEditingLeaveType(null);
    setIsCreatingLeaveType(true);
    setLtName('');
    setLtCode('');
    setLtDesc('');
    setLtIsPaid(true);
    setLtAnnualQuota(12);
    setLtCarryForward(5);
    setLtMaxConsecutive(10);
    setLtAllowsHalfDay(true);
    setLtRequiresDoc(false);
    setLtEligibility('All Active Employees');
    setLtEffectiveDate('2026-01-01');
    setLtIsActive(true);
    setLtError('');
  };

  const openEditLeaveType = (lt: LeaveType) => {
    setIsCreatingLeaveType(false);
    setEditingLeaveType(lt);
    setLtName(lt.name);
    setLtCode(lt.code);
    setLtDesc(lt.description);
    setLtIsPaid(lt.isPaid);
    setLtAnnualQuota(lt.annualEntitlement);
    setLtCarryForward(lt.carryForwardLimit);
    setLtMaxConsecutive(lt.maxConsecutiveDays);
    setLtAllowsHalfDay(lt.allowsHalfDay);
    setLtRequiresDoc(lt.requiresDocumentProof);
    setLtEligibility(lt.eligibility || 'All Active Employees');
    setLtEffectiveDate(lt.effectiveFrom || '2026-01-01');
    setLtIsActive(lt.isActive !== false);
    setLtError('');
  };

  const handleSaveLeaveType = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ltName.trim() || !ltCode.trim()) {
      setLtError('Leave type name and unique code are required.');
      return;
    }
    if (ltAnnualQuota < 0 || ltCarryForward < 0 || ltMaxConsecutive < 1) {
      setLtError('Quotas cannot be negative and max consecutive days must be at least 1.');
      return;
    }

    const duplicate = leaveTypesState.some(
      (l) => l.code.toLowerCase() === ltCode.trim().toLowerCase() && l.id !== editingLeaveType?.id
    );
    if (duplicate) {
      setLtError(`Leave code "${ltCode.trim().toUpperCase()}" already exists. Duplicate codes are not allowed.`);
      return;
    }

    const saved: LeaveType = {
      id: editingLeaveType?.id || `LT-${ltCode.trim().toUpperCase()}-${Date.now().toString().slice(-3)}`,
      name: ltName.trim(),
      code: ltCode.trim().toUpperCase(),
      description: ltDesc.trim() || `${ltName.trim()} policy`,
      isPaid: ltIsPaid,
      annualEntitlement: Number(ltAnnualQuota),
      carryForwardLimit: Number(ltCarryForward),
      maxConsecutiveDays: Number(ltMaxConsecutive),
      allowsHalfDay: ltAllowsHalfDay,
      allowNegativeBalance: !ltIsPaid,
      requiresDocumentProof: ltRequiresDoc,
      color: editingLeaveType?.color || (ltIsPaid ? 'indigo' : 'rose'),
      isActive: ltIsActive,
      effectiveFrom: ltEffectiveDate,
      eligibility: ltEligibility.trim() || 'All Active Employees'
    };

    db.saveLeaveType(saved);
    setLeaveTypesState(db.getLeaveTypes());
    db.logAudit({
      actorUserId: currentUser.id,
      actorName: currentUser.name,
      actorRole: currentUser.role,
      action: editingLeaveType ? 'UPDATE' : 'CREATE',
      module: 'LEAVE',
      entityId: saved.id,
      entityName: saved.name,
      description: `${editingLeaveType ? 'Updated' : 'Created'} leave policy type ${saved.name} (${saved.code}) - Quota: ${saved.annualEntitlement}d`
    });

    setEditingLeaveType(null);
    setIsCreatingLeaveType(false);
    setPolicyNotice(`Leave policy "${saved.name}" saved and applied to future leave applications.`);
  };

  const handleToggleLeaveTypeStatus = () => {
    if (!confirmDeactivateType) return;
    const nextActive = confirmDeactivateType.isActive === false ? true : false;
    const updated: LeaveType = {
      ...confirmDeactivateType,
      isActive: nextActive
    };
    db.saveLeaveType(updated);
    setLeaveTypesState(db.getLeaveTypes());
    db.logAudit({
      actorUserId: currentUser.id,
      actorName: currentUser.name,
      actorRole: currentUser.role,
      action: 'UPDATE',
      module: 'LEAVE',
      entityId: updated.id,
      entityName: updated.name,
      description: `${nextActive ? 'Activated' : 'Deactivated'} leave type ${updated.name} (${updated.code})`
    });
    setConfirmDeactivateType(null);
    setPolicyNotice(`Leave type "${updated.name}" is now ${nextActive ? 'Active' : 'Inactive'}.`);
  };

  const handleAddHoliday = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHolidayName.trim() || !newHolidayDate) return;
    const h: Holiday = {
      id: `HOL-${Date.now()}`,
      name: newHolidayName.trim(),
      date: newHolidayDate,
      isOptional: newHolidayOptional
    };
    db.saveHoliday(h);
    setHolidaysState(db.getHolidays());
    setNewHolidayName('');
    setNewHolidayDate('');
    setShowAddHoliday(false);
  };

  const handleDeleteHoliday = (id: string) => {
    db.deleteHoliday(id);
    setHolidaysState(db.getHolidays());
  };

  const filteredLeaveTypes = leaveTypes.filter((lt) => {
    const active = lt.isActive !== false;
    if (policyStatusFilter === 'Active' && !active) return false;
    if (policyStatusFilter === 'Inactive' && active) return false;
    if (policySearch.trim()) {
      const q = policySearch.toLowerCase();
      return (
        lt.name.toLowerCase().includes(q) ||
        lt.code.toLowerCase().includes(q) ||
        lt.description.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const columns: Column<LeaveApplication>[] = [
    {
      header: 'Applicant',
      accessorKey: 'employeeId',
      sortable: true,
      cell: (app) => {
        const emp = employees.find((e) => e.id === app.employeeId);
        return (
          <div className="flex items-center gap-2.5">
            <img
              src={emp?.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'}
              alt={emp?.firstName || ''}
              className="h-8 w-8 rounded-full object-cover"
            />
            <div>
              <p className="font-semibold text-slate-900">{emp ? `${emp.firstName} ${emp.lastName}` : app.employeeId}</p>
              <p className="text-[11px] text-slate-500 font-mono">{app.employeeId}</p>
            </div>
          </div>
        );
      }
    },
    {
      header: 'Leave Type',
      accessorKey: 'leaveTypeId',
      sortable: true,
      cell: (app) => {
        const lt = leaveTypes.find((l) => l.id === app.leaveTypeId);
        return (
          <div>
            <span className="font-medium text-slate-800">{lt?.name || app.leaveTypeId}</span>
            <span className="text-[11px] text-slate-400 block">{lt?.isPaid ? 'Paid' : 'Unpaid (LOP)'}</span>
          </div>
        );
      }
    },
    {
      header: 'Duration',
      accessorKey: 'totalDays',
      sortable: true,
      cell: (app) => (
        <div>
          <span className="font-bold text-slate-900 font-mono">{app.totalDays} day{app.totalDays !== 1 ? 's' : ''}</span>
          <span className="text-[11px] text-slate-500 block">
            {app.startDate} to {app.endDate}
          </span>
        </div>
      )
    },
    {
      header: 'Reason',
      accessorKey: 'reason',
      cell: (app) => (
        <div className="max-w-xs">
          <p className="text-slate-700 truncate">{app.reason}</p>
          {app.attachmentName && (
            <p className="text-[10px] text-indigo-600 truncate mt-0.5">Attachment: {app.attachmentName}</p>
          )}
        </div>
      )
    },
    {
      header: 'Status',
      accessorKey: 'status',
      sortable: true,
      cell: (app) => (
        <span
          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium ${
            app.status === 'Approved'
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : app.status === 'Rejected' || app.status === 'Cancelled'
              ? 'bg-rose-50 text-rose-700 border border-rose-200'
              : 'bg-amber-50 text-amber-700 border border-amber-200'
          }`}
        >
          {app.status}
        </span>
      )
    },
    {
      header: 'Actions',
      cell: (app) => {
        const canApprove = app.status === 'Pending Approval' && canApproveRequestFor(app.employeeId);
        const canWithdraw = app.status === 'Pending Approval' && app.employeeId === currentUser.employeeId;

        return (
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setViewingApp(app)}
              className="px-2 py-1 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md"
              title="View Details"
            >
              <Eye className="h-3.5 w-3.5" />
            </button>
            {canWithdraw && (
              <button
                onClick={() => handleWithdrawLeave(app)}
                className="px-2 py-1 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-md"
              >
                Withdraw
              </button>
            )}
            {canApprove && (
              <>
                <button
                  onClick={() => setCommentModalApp({ id: app.id, decision: 'Approved' })}
                  className="p-1.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white transition-colors"
                  title="Approve"
                >
                  <Check className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => setCommentModalApp({ id: app.id, decision: 'Rejected' })}
                  className="p-1.5 rounded-md bg-rose-600 hover:bg-rose-700 text-white transition-colors"
                  title="Reject"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </>
            )}
          </div>
        );
      }
    }
  ];

  const exportData = visibleApplications.map((a) => ({
    ApplicationID: a.id,
    EmployeeID: a.employeeId,
    LeaveType: leaveTypes.find((l) => l.id === a.leaveTypeId)?.name || '',
    StartDate: a.startDate,
    EndDate: a.endDate,
    TotalDays: a.totalDays,
    Reason: a.reason,
    Status: a.status,
    AppliedAt: a.appliedAt
  }));

  const hasActiveFilters =
    filterLeaveType !== 'ALL' ||
    filterStatus !== 'ALL' ||
    filterDept !== 'ALL' ||
    filterFromDate !== '' ||
    filterToDate !== '';

  return (
    <div className="space-y-6">
      {/* Top Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Applications"
          value={visibleApplications.length}
          subtitle="Matching current filters"
          icon={CalendarDays}
          badge="Ledger Active"
          badgeColor="slate"
        />
        <StatCard
          title="Pending Approvals"
          value={pendingApprovals.length}
          subtitle="Waiting for your review"
          icon={CalendarCheck}
          badge={pendingApprovals.length > 0 ? 'Action Needed' : 'Cleared'}
          badgeColor={pendingApprovals.length > 0 ? 'amber' : 'emerald'}
          onClick={() => setActiveTab('approvals')}
        />
        <StatCard
          title="Approved Requests"
          value={approvedCount}
          subtitle="Deducted from balance"
          icon={Check}
          badge="Verified"
          badgeColor="emerald"
        />
        <StatCard
          title="Upcoming Holidays"
          value={holidays.length}
          subtitle="Year 2026 Calendar"
          icon={Calendar}
          badge={`${holidays.length} Declared`}
          badgeColor="blue"
          onClick={() => setActiveTab('holidays')}
        />
      </div>

      {policyNotice && (
        <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-900 text-xs font-medium flex items-center justify-between">
          <span>{policyNotice}</span>
          <button onClick={() => setPolicyNotice('')} className="font-bold ml-3">Dismiss</button>
        </div>
      )}

      {/* Tab Switcher & Top Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200">
        <div className="flex flex-wrap items-center gap-1 bg-slate-100 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab('applications')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              activeTab === 'applications' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Applications ({visibleApplications.length})
          </button>
          {pendingApprovals.length > 0 && (
            <button
              onClick={() => setActiveTab('approvals')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                activeTab === 'approvals' ? 'bg-white text-rose-700 shadow-xs' : 'text-rose-600 hover:text-rose-800'
              }`}
            >
              Action Queue ({pendingApprovals.length})
            </button>
          )}
          <button
            onClick={() => setActiveTab('calendar')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              activeTab === 'calendar' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Absence Calendar
          </button>
          <button
            onClick={() => setActiveTab('types')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              activeTab === 'types' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Leave Types & Quotas ({leaveTypes.length})
          </button>
          <button
            onClick={() => setActiveTab('holidays')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              activeTab === 'holidays' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Holiday Calendar ({holidays.length})
          </button>
        </div>

        <div className="flex items-center gap-2">
          {onOpenPolicies && (
            <button
              type="button"
              onClick={onOpenPolicies}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-lg border border-indigo-200 transition-colors"
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Leave Policies →</span>
            </button>
          )}
          <ExportButton data={exportData} fileName="Orbyx_Leave_Ledger" />
          {!isMD && (
            <button
              onClick={() => setIsApplyModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-2xs transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Apply for Leave</span>
            </button>
          )}
        </div>
      </div>

      {/* Contextual Filter Bar for Applications */}
      {activeTab === 'applications' && (
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 flex flex-wrap items-center gap-2.5 text-xs">
          <select
            value={filterLeaveType}
            onChange={(e) => setFilterLeaveType(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-700"
          >
            <option value="ALL">All Leave Types</option>
            {leaveTypes.map((lt) => (
              <option key={lt.id} value={lt.id}>
                {lt.name} ({lt.code})
              </option>
            ))}
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-700"
          >
            <option value="ALL">All Statuses</option>
            <option value="Pending Approval">Pending Approval</option>
            <option value="Approved">Approved</option>
            <option value="Rejected">Rejected</option>
            <option value="Cancelled">Cancelled</option>
          </select>

          {currentUser.role !== 'employee' && (
            <select
              value={filterDept}
              onChange={(e) => setFilterDept(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-700"
            >
              <option value="ALL">All Departments</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          )}

          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">From:</span>
            <input
              type="date"
              value={filterFromDate}
              onChange={(e) => setFilterFromDate(e.target.value)}
              className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">To:</span>
            <input
              type="date"
              value={filterToDate}
              onChange={(e) => setFilterToDate(e.target.value)}
              className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg"
            />
          </div>

          {hasActiveFilters && (
            <button
              onClick={() => {
                setFilterLeaveType('ALL');
                setFilterStatus('ALL');
                setFilterDept('ALL');
                setFilterFromDate('');
                setFilterToDate('');
              }}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-indigo-700 hover:bg-indigo-50 rounded-lg font-semibold"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Clear Filters</span>
            </button>
          )}
        </div>
      )}

      {/* Tab 1: Applications */}
      {activeTab === 'applications' && (
        <DataTable
          data={visibleApplications}
          columns={columns}
          searchPlaceholder="Search leave requests by employee or reason..."
        />
      )}

      {/* Tab 2: Pending Approvals */}
      {activeTab === 'approvals' && (
        <DataTable
          data={pendingApprovals}
          columns={columns}
          searchPlaceholder="Filter pending approvals..."
          emptyMessage="No approvals waiting in your queue."
        />
      )}

      {/* Tab 3: Absence Calendar */}
      {activeTab === 'calendar' && <AbsenceCalendar />}

      {/* Tab 4: Leave Types & Quotas */}
      {activeTab === 'types' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">Leave Types & Annual Entitlement Quotas</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Configure paid and unpaid leave categories, annual quotas, carry-forward limits, and eligibility. Overarching accrual rules are managed in the dedicated Policies module.
                </p>
              </div>
              {isHR && (
                <button
                  onClick={openAddLeaveType}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-2xs transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add New Leave Type</span>
                </button>
              )}
            </div>

            {/* Search & Filter Leave Types */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative flex-1 min-w-[220px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  value={policySearch}
                  onChange={(e) => setPolicySearch(e.target.value)}
                  placeholder="Search leave types by name, code, or description..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:bg-white focus:border-indigo-400"
                />
              </div>
              <select
                value={policyStatusFilter}
                onChange={(e) => setPolicyStatusFilter(e.target.value as any)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700"
              >
                <option value="ALL">All Statuses</option>
                <option value="Active">Active Only</option>
                <option value="Inactive">Inactive Only</option>
              </select>
            </div>

            {/* Structured Scrollable Leave Types List */}
            <div className="max-h-[460px] overflow-y-auto space-y-3 pr-1">
              {filteredLeaveTypes.map((type) => {
                const isActive = type.isActive !== false;
                return (
                  <div
                    key={type.id}
                    className={`p-4 rounded-xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                      isActive
                        ? 'bg-white border-slate-200 hover:border-indigo-200'
                        : 'bg-slate-50 border-slate-200 opacity-70'
                    }`}
                  >
                    <div className="space-y-1.5 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="font-bold text-slate-900 text-sm">{type.name}</h4>
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold ${
                            type.isPaid
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {type.code} · {type.isPaid ? 'PAID' : 'UNPAID (LOP)'}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                            isActive
                              ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                              : 'bg-slate-200 text-slate-600'
                          }`}
                        >
                          {isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600">{type.description}</p>
                      <div className="flex flex-wrap items-center gap-x-5 gap-y-1 pt-1 text-xs text-slate-600">
                        <span>
                          Quota: <strong className="text-slate-900">{type.annualEntitlement} days/yr</strong>
                        </span>
                        <span>
                          Carry-Forward: <strong className="text-slate-900">Max {type.carryForwardLimit} days</strong>
                        </span>
                        <span>
                          Max Consecutive: <strong className="text-slate-900">{type.maxConsecutiveDays} days</strong>
                        </span>
                        <span>
                          Half-Day: <strong className="text-slate-900">{type.allowsHalfDay ? 'Allowed' : 'No'}</strong>
                        </span>
                        <span>
                          Eligibility: <strong className="text-slate-900">{type.eligibility || 'All Active Staff'}</strong>
                        </span>
                        <span>
                          Effective: <strong className="font-mono text-slate-800">{type.effectiveFrom || '2026-01-01'}</strong>
                        </span>
                      </div>
                    </div>

                    {isHR && (
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => openEditLeaveType(type)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                          <span>Edit</span>
                        </button>
                        <button
                          onClick={() => setConfirmDeactivateType(type)}
                          className={`inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                            isActive
                              ? 'text-rose-700 bg-rose-50 hover:bg-rose-100'
                              : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                          }`}
                        >
                          <Power className="h-3.5 w-3.5" />
                          <span>{isActive ? 'Deactivate' : 'Activate'}</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Tab 5: Holidays */}
      {activeTab === 'holidays' && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="pb-3 border-b border-slate-100 flex flex-wrap justify-between items-center gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">2026 Official Company Holidays</h3>
              <p className="text-xs text-slate-500">Working days are automatically calculated excluding these dates</p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={holidaySearch}
                onChange={(e) => setHolidaySearch(e.target.value)}
                placeholder="Search holidays..."
                className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg"
              />
              {isHR && (
                <button
                  onClick={() => setShowAddHoliday(!showAddHoliday)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-600 text-white text-xs font-semibold rounded-lg"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add Holiday</span>
                </button>
              )}
            </div>
          </div>

          {showAddHoliday && isHR && (
            <form onSubmit={handleAddHoliday} className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex flex-wrap items-end gap-3 text-xs">
              <div className="flex-1 min-w-[180px]">
                <label className="block text-slate-600 font-semibold mb-1">Holiday Name *</label>
                <input
                  type="text"
                  required
                  value={newHolidayName}
                  onChange={(e) => setNewHolidayName(e.target.value)}
                  placeholder="e.g. Founder's Day"
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Date *</label>
                <input
                  type="date"
                  required
                  value={newHolidayDate}
                  onChange={(e) => setNewHolidayDate(e.target.value)}
                  className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg"
                />
              </div>
              <label className="flex items-center gap-1.5 pb-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={newHolidayOptional}
                  onChange={(e) => setNewHolidayOptional(e.target.checked)}
                  className="rounded border-slate-300"
                />
                <span>Optional / Restricted Holiday</span>
              </label>
              <button type="submit" className="px-4 py-1.5 bg-indigo-600 text-white font-semibold rounded-lg">
                Save Holiday
              </button>
            </form>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
            {holidays
              .filter((h) => h.name.toLowerCase().includes(holidaySearch.toLowerCase()))
              .map((h) => (
                <div key={h.id} className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex justify-between items-center">
                  <div>
                    <p className="font-semibold text-slate-900">{h.name}</p>
                    <p className="text-[11px] text-slate-500 font-mono">{h.date}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded font-medium ${
                        h.isOptional ? 'bg-amber-100 text-amber-800' : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {h.isOptional ? 'Optional' : 'Public'}
                    </span>
                    {isHR && (
                      <button
                        onClick={() => handleDeleteHoliday(h.id)}
                        className="text-slate-400 hover:text-rose-600"
                        title="Remove holiday"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* View Leave Application Details Modal */}
      {viewingApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-3 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <h4 className="text-base font-bold text-slate-900">Leave Application Details</h4>
              <button onClick={() => setViewingApp(null)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between"><span className="text-slate-500">Application ID:</span><span className="font-mono font-semibold">{viewingApp.id}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Employee ID:</span><span className="font-mono">{viewingApp.employeeId}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Dates:</span><span className="font-mono">{viewingApp.startDate} to {viewingApp.endDate} ({viewingApp.totalDays}d)</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Status:</span><span className="font-semibold">{viewingApp.status}</span></div>
              <div><span className="text-slate-500 block">Reason:</span><p className="font-medium text-slate-800 mt-0.5">{viewingApp.reason}</p></div>
              {viewingApp.approvalComments && (
                <div><span className="text-slate-500 block">Reviewer Note:</span><p className="font-medium text-indigo-800 mt-0.5">{viewingApp.approvalComments}</p></div>
              )}
            </div>
            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button onClick={() => setViewingApp(null)} className="px-4 py-1.5 bg-slate-900 text-white font-semibold rounded-lg">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Leave Type Modal */}
      {(isCreatingLeaveType || editingLeaveType) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <form onSubmit={handleSaveLeaveType} className="bg-white rounded-xl max-w-lg w-full p-6 shadow-xl border border-slate-200 space-y-3 text-xs max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <h4 className="text-base font-bold text-slate-900">
                {editingLeaveType ? `Edit Leave Type: ${editingLeaveType.name}` : 'Add New Leave Type'}
              </h4>
              <button
                type="button"
                onClick={() => {
                  setEditingLeaveType(null);
                  setIsCreatingLeaveType(false);
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            {ltError && (
              <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 font-medium">
                {ltError}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Leave Type Name *</label>
                <input
                  type="text"
                  required
                  value={ltName}
                  onChange={(e) => setLtName(e.target.value)}
                  placeholder="e.g. Study / Sabbatical Leave"
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Unique Leave Code *</label>
                <input
                  type="text"
                  required
                  value={ltCode}
                  onChange={(e) => setLtCode(e.target.value)}
                  placeholder="e.g. STL"
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg font-mono uppercase"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-600 font-semibold mb-1">Description *</label>
              <input
                type="text"
                required
                value={ltDesc}
                onChange={(e) => setLtDesc(e.target.value)}
                placeholder="Purpose and conditions for this leave category"
                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Annual Quota (Days) *</label>
                <input
                  type="number"
                  min={0}
                  required
                  value={ltAnnualQuota}
                  onChange={(e) => setLtAnnualQuota(Number(e.target.value))}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg font-mono"
                />
              </div>
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Max Carry-Forward *</label>
                <input
                  type="number"
                  min={0}
                  required
                  value={ltCarryForward}
                  onChange={(e) => setLtCarryForward(Number(e.target.value))}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg font-mono"
                />
              </div>
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Max Consecutive *</label>
                <input
                  type="number"
                  min={1}
                  required
                  value={ltMaxConsecutive}
                  onChange={(e) => setLtMaxConsecutive(Number(e.target.value))}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Eligibility Rules</label>
                <input
                  type="text"
                  value={ltEligibility}
                  onChange={(e) => setLtEligibility(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Effective From Date *</label>
                <input
                  type="date"
                  required
                  value={ltEffectiveDate}
                  onChange={(e) => setLtEffectiveDate(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={ltIsPaid}
                  onChange={(e) => setLtIsPaid(e.target.checked)}
                  className="rounded border-slate-300 text-indigo-600"
                />
                <span className="font-medium text-slate-700">Paid Leave (Unchecked = Loss of Pay)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={ltAllowsHalfDay}
                  onChange={(e) => setLtAllowsHalfDay(e.target.checked)}
                  className="rounded border-slate-300 text-indigo-600"
                />
                <span className="font-medium text-slate-700">Half-Day Leave Allowed</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={ltRequiresDoc}
                  onChange={(e) => setLtRequiresDoc(e.target.checked)}
                  className="rounded border-slate-300 text-indigo-600"
                />
                <span className="font-medium text-slate-700">Requires Medical / Supporting Proof</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={ltIsActive}
                  onChange={(e) => setLtIsActive(e.target.checked)}
                  className="rounded border-slate-300 text-indigo-600"
                />
                <span className="font-medium text-slate-700">Active Status</span>
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setEditingLeaveType(null);
                  setIsCreatingLeaveType(false);
                }}
                className="px-4 py-1.5 text-slate-700 bg-white border border-slate-200 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg"
              >
                Save Leave Policy
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Confirm Deactivate Leave Type Modal */}
      {confirmDeactivateType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4 text-xs">
            <div className="flex items-center gap-2 text-amber-700">
              <AlertTriangle className="h-5 w-5 shrink-0" />
              <h4 className="text-base font-bold text-slate-900">
                {confirmDeactivateType.isActive !== false ? 'Deactivate Leave Type?' : 'Activate Leave Type?'}
              </h4>
            </div>
            <p className="text-slate-600">
              {confirmDeactivateType.isActive !== false
                ? `Deactivating "${confirmDeactivateType.name}" (${confirmDeactivateType.code}) will prevent employees from selecting it for new leave applications. Existing approved leaves and historical payroll runs will remain intact.`
                : `Activating "${confirmDeactivateType.name}" (${confirmDeactivateType.code}) will make it available for new employee leave applications immediately.`}
            </p>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setConfirmDeactivateType(null)}
                className="px-3 py-1.5 text-slate-700 bg-white border border-slate-200 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleToggleLeaveTypeStatus}
                className={`px-4 py-1.5 font-semibold text-white rounded-lg ${
                  confirmDeactivateType.isActive !== false
                    ? 'bg-rose-600 hover:bg-rose-700'
                    : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                Confirm {confirmDeactivateType.isActive !== false ? 'Deactivate' : 'Activate'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Decision Comments Modal */}
      {commentModalApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <h4 className="text-base font-bold text-slate-900">
              {commentModalApp.decision === 'Approved' ? 'Approve Leave Request' : 'Reject Leave Request'}
            </h4>
            <p className="text-xs text-slate-600">
              Please enter review notes or justification. The applicant will be notified immediately.
            </p>
            <textarea
              value={decisionComments}
              onChange={(e) => setDecisionComments(e.target.value)}
              placeholder="e.g. Approved. Please ensure project sprint handover before departure..."
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
              rows={3}
              required
            />
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setCommentModalApp(null)}
                className="px-3 py-1.5 text-xs text-slate-700 bg-white border border-slate-200 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleDecisionConfirm}
                className={`px-4 py-1.5 text-xs font-semibold text-white rounded-lg ${
                  commentModalApp.decision === 'Approved' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                Confirm {commentModalApp.decision}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Apply Leave Modal */}
      <ApplyLeaveModal
        isOpen={isApplyModalOpen}
        onClose={() => setIsApplyModalOpen(false)}
      />
    </div>
  );
};
