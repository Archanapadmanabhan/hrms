import React, { useState, useMemo, useEffect } from 'react';
import { db, subscribeToDB } from '../../db/storage';
import { useAuth } from '../../services/authContext';
import { hrmsService } from '../../services/hrmsService';
import { PayrollRun, PayrollLineItem, SalaryStructure, NavigationContext } from '../../types/hrms';
import { DataTable, Column } from '../common/DataTable';
import { ExportButton } from '../common/ExportButton';
import { StatCard } from '../common/StatCard';
import { PayslipModal } from './PayslipModal';
import { ProcessPayrollModal } from './ProcessPayrollModal';
import {
  CreditCard,
  CheckCircle2,
  Lock,
  Plus,
  Eye,
  Send,
  Layers,
  ShieldCheck,
  RotateCcw,
  Edit3
} from 'lucide-react';

interface PayrollDashboardProps {
  navContext?: NavigationContext;
  onOpenPolicies?: () => void;
}

export const PayrollDashboard: React.FC<PayrollDashboardProps> = ({ navContext, onOpenPolicies }) => {
  const { currentUser, canProcessPayroll } = useAuth();
  const isHR = currentUser.role === 'hr_admin';
  const isMD = currentUser.role === 'senior_manager';
  const canViewRuns = isHR || isMD;
  const [, setDbTick] = useState(0);

  useEffect(() => {
    return subscribeToDB(() => setDbTick((t) => t + 1));
  }, []);

  const [activeTab, setActiveTab] = useState<'runs' | 'payslips' | 'structures'>(() => {
    if (navContext?.subTab === 'payslips') return 'payslips';
    if (navContext?.subTab === 'structures') return 'structures';
    return canViewRuns ? 'runs' : 'payslips';
  });
  const [isProcessModalOpen, setIsProcessModalOpen] = useState(false);
  const [selectedPayslipItem, setSelectedPayslipItem] = useState<PayrollLineItem | null>(null);

  // Contextual filters on Payslips
  const [deptFilter, setDeptFilter] = useState(() => navContext?.departmentFilter || 'ALL');
  const [runFilter, setRunFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState(() => navContext?.statusFilter || 'ALL');

  useEffect(() => {
    if (!navContext) return;
    if (navContext.subTab === 'payslips') setActiveTab('payslips');
    else if (navContext.subTab === 'structures') setActiveTab('structures');
    else if (navContext.subTab === 'runs' && canViewRuns) setActiveTab('runs');
    if (navContext.departmentFilter) setDeptFilter(navContext.departmentFilter);
    if (navContext.statusFilter) setStatusFilter(navContext.statusFilter);
  }, [navContext, canViewRuns]);

  // Edit Salary Structure Modal
  const [editingStruct, setEditingStruct] = useState<SalaryStructure | null>(null);
  const [structName, setStructName] = useState('');
  const [structDesc, setStructDesc] = useState('');
  const [structGross, setStructGross] = useState(100000);

  // Disburse modal
  const [disburseRunId, setDisburseRunId] = useState<string | null>(null);
  const [disburseRef, setDisburseRef] = useState('');

  // Reopen Payroll Run modal (requires mandatory audit reason)
  const [reopenRunId, setReopenRunId] = useState<string | null>(null);
  const [reopenReason, setReopenReason] = useState('');
  const [notice, setNotice] = useState('');
  const [mdSignedOffRuns, setMdSignedOffRuns] = useState<Record<string, string>>(() => {
    try {
      const raw = localStorage.getItem('orbyx_md_payroll_signoffs');
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });

  const payrollRuns = db.getPayrollRuns();
  const lineItems = db.getPayrollLineItems();
  const structures = db.getSalaryStructures();
  const departments = db.getDepartments();
  const currentEmp = db.getEmployeeById(currentUser.employeeId);
  const myStructure = currentEmp ? structures.find((s) => s.id === currentEmp.salaryStructureId) : null;

  // Scoped line items
  const scopedLineItems = useMemo(() => {
    return canViewRuns
      ? lineItems
      : lineItems.filter((item) => item.employeeId === currentUser.employeeId);
  }, [canViewRuns, lineItems, currentUser.employeeId]);

  const visibleLineItems = useMemo(() => {
    return scopedLineItems.filter((item) => {
      if (deptFilter !== 'ALL' && item.departmentName !== deptFilter) return false;
      if (runFilter !== 'ALL' && item.payrollRunId !== runFilter) return false;
      if (statusFilter !== 'ALL' && item.status !== statusFilter) return false;
      return true;
    });
  }, [scopedLineItems, deptFilter, runFilter, statusFilter]);

  const myLatestPayslip = scopedLineItems[scopedLineItems.length - 1];
  const latestRun = payrollRuns[0];

  const handleDisburseConfirm = () => {
    if (!disburseRunId || !disburseRef) return;
    hrmsService.recordPayrollDisbursement(
      disburseRunId,
      disburseRef,
      currentUser.id,
      currentUser.name
    );
    setDisburseRunId(null);
    setDisburseRef('');
    setNotice('Payroll run marked as Paid and bank UTR recorded in audit log.');
  };

  const handleMdSignOff = (run: PayrollRun, decision: 'Approved' | 'Returned to HR') => {
    const next = { ...mdSignedOffRuns, [run.id]: decision };
    setMdSignedOffRuns(next);
    localStorage.setItem('orbyx_md_payroll_signoffs', JSON.stringify(next));
    db.logAudit({
      actorUserId: currentUser.id,
      actorName: currentUser.name,
      actorRole: currentUser.role,
      action: decision === 'Approved' ? 'APPROVE' : 'REJECT',
      module: 'PAYROLL',
      entityId: run.id,
      entityName: run.periodLabel,
      description: `Senior Management (${currentUser.name}) ${decision} payroll run ${run.periodLabel} (Net Outflow: ₹${run.totalNetPay.toLocaleString()})`
    });
    setNotice(
      decision === 'Approved'
        ? `Executive Sign-Off recorded for ${run.periodLabel}. Authorized for HR bank disbursement.`
        : `Payroll run ${run.periodLabel} returned to HR for adjustment.`
    );
  };

  const handleReopenConfirm = () => {
    if (!reopenRunId || !reopenReason.trim()) return;
    try {
      hrmsService.reopenPayrollRun(reopenRunId, reopenReason.trim(), currentUser.id, currentUser.name);
      setNotice(`Payroll run ${reopenRunId} reopened for adjustment. Reason logged in Audit Trail.`);
      setReopenRunId(null);
      setReopenReason('');
    } catch (err: any) {
      setNotice(err?.message || 'Unable to reopen payroll run.');
    }
  };

  const openEditStructure = (s: SalaryStructure) => {
    setEditingStruct(s);
    setStructName(s.name);
    setStructDesc(s.description);
    setStructGross(s.grossMonthly);
  };

  const handleSaveStructure = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStruct) return;
    const gross = Number(structGross) || editingStruct.grossMonthly;
    const basic = Math.round(gross * 0.5);
    const hra = Math.round(gross * 0.25);
    const special = gross - basic - hra;
    db.saveSalaryStructure({
      ...editingStruct,
      name: structName.trim(),
      description: structDesc.trim(),
      grossMonthly: gross,
      ctcAnnual: gross * 12,
      items: [
        { componentId: 'COMP-BASIC', componentName: 'Basic Salary', componentCode: 'BASIC', type: 'Earning', amountMonthly: basic, amountAnnual: basic * 12 },
        { componentId: 'COMP-HRA', componentName: 'House Rent Allowance (HRA)', componentCode: 'HRA', type: 'Earning', amountMonthly: hra, amountAnnual: hra * 12 },
        { componentId: 'COMP-SPEC', componentName: 'Special & Flexi Allowance', componentCode: 'SPECIAL', type: 'Earning', amountMonthly: special, amountAnnual: special * 12 }
      ]
    });
    setEditingStruct(null);
  };

  // Run columns
  const runColumns: Column<PayrollRun>[] = [
    {
      header: 'Payroll Period',
      accessorKey: 'periodLabel',
      sortable: true,
      cell: (run) => (
        <div>
          <span className="font-bold text-slate-900">{run.periodLabel}</span>
          <span className="text-[11px] text-slate-500 block font-mono">
            {run.startDate} to {run.endDate}
          </span>
        </div>
      )
    },
    {
      header: 'Headcount',
      accessorKey: 'totalEmployees',
      sortable: true,
      cell: (run) => (
        <span className="font-semibold text-slate-800">{run.totalEmployees} employees</span>
      )
    },
    {
      header: 'Total Gross',
      accessorKey: 'totalGrossPay',
      sortable: true,
      cell: (run) => (
        <span className="font-mono text-slate-800">₹{run.totalGrossPay.toLocaleString()}</span>
      )
    },
    {
      header: 'Total Deductions',
      accessorKey: 'totalDeductions',
      sortable: true,
      cell: (run) => (
        <span className="font-mono text-rose-600">-₹{run.totalDeductions.toLocaleString()}</span>
      )
    },
    {
      header: 'Net Outflow',
      accessorKey: 'totalNetPay',
      sortable: true,
      cell: (run) => (
        <span className="font-mono font-bold text-slate-900">₹{run.totalNetPay.toLocaleString()}</span>
      )
    },
    {
      header: 'Status & Governance',
      accessorKey: 'status',
      sortable: true,
      cell: (run) => {
        const mdDecision = mdSignedOffRuns[run.id];
        return (
          <div className="space-y-1">
            <span
              className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium ${
                run.status === 'Paid'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : run.status === 'Finalized'
                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                  : 'bg-amber-50 text-amber-700 border border-amber-200'
              }`}
            >
              {run.status === 'Paid' ? <CheckCircle2 className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
              <span>{run.status}</span>
            </span>
            {mdDecision && (
              <span className="block text-[10px] font-semibold text-indigo-700">
                MD Sign-Off: {mdDecision}
              </span>
            )}
            {run.hasPostFinalizationAttendanceChange && (
              <span
                className="block text-[10px] font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded"
                title={run.postFinalizationChangeNote}
              >
                Post-Lock Attendance Adjustment Flagged
              </span>
            )}
          </div>
        );
      }
    },
    {
      header: 'Actions',
      cell: (run) => (
        <div className="flex flex-wrap items-center gap-1.5">
          {isMD && (
            <>
              <button
                onClick={() => handleMdSignOff(run, 'Approved')}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors"
              >
                <CheckCircle2 className="h-3 w-3" />
                <span>MD Approve Run</span>
              </button>
              {run.status !== 'Paid' && (
                <button
                  onClick={() => handleMdSignOff(run, 'Returned to HR')}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition-colors"
                >
                  <RotateCcw className="h-3 w-3" />
                  <span>Return to HR</span>
                </button>
              )}
            </>
          )}
          {isHR && run.status === 'Finalized' && (
            <>
              <button
                onClick={() => {
                  setDisburseRunId(run.id);
                  setDisburseRef(`UTR-${Date.now().toString().slice(-8)}`);
                }}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors"
              >
                <Send className="h-3 w-3" />
                <span>Record Payment</span>
              </button>
              <button
                onClick={() => {
                  setReopenRunId(run.id);
                  setReopenReason('');
                }}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors"
              >
                <RotateCcw className="h-3 w-3" />
                <span>Reopen Run</span>
              </button>
            </>
          )}
          <button
            onClick={() => {
              setRunFilter(run.id);
              setActiveTab('payslips');
            }}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
          >
            <Eye className="h-3 w-3" />
            <span>Payslips & Breakdown</span>
          </button>
        </div>
      )
    }
  ];

  // Payslip columns
  const payslipColumns: Column<PayrollLineItem>[] = [
    {
      header: 'Employee',
      accessorKey: 'employeeName',
      sortable: true,
      cell: (item) => {
        const liveEmp = db.getEmployeeById(item.employeeId);
        const liveName = liveEmp ? `${liveEmp.firstName} ${liveEmp.lastName}` : item.employeeName;
        return (
          <div className="flex items-center gap-2">
            {liveEmp?.avatarUrl && (
              <img
                src={liveEmp.avatarUrl}
                alt={liveName}
                className="h-7 w-7 rounded-full object-cover border border-slate-200 shrink-0"
              />
            )}
            <div>
              <span className="font-semibold text-slate-900">{liveName}</span>
              <span className="text-[11px] text-slate-500 block font-mono">
                {item.employeeId} · {item.departmentName}
              </span>
            </div>
          </div>
        );
      }
    },
    {
      header: 'Payable Days',
      accessorKey: 'payableDays',
      sortable: true,
      cell: (item) => (
        <span className="font-mono text-slate-700">
          {item.payableDays} / {item.workingDaysInMonth}
          {item.unpaidLeaves > 0 && <span className="text-rose-600 block text-[10px]">({item.unpaidLeaves}d LOP)</span>}
        </span>
      )
    },
    {
      header: 'Gross Earnings',
      accessorKey: 'grossEarnings',
      sortable: true,
      cell: (item) => <span className="font-mono text-slate-800">₹{item.grossEarnings.toLocaleString()}</span>
    },
    {
      header: 'Deductions (PF/PT/TDS)',
      accessorKey: 'totalDeductions',
      sortable: true,
      cell: (item) => <span className="font-mono text-rose-600">-₹{item.totalDeductions.toLocaleString()}</span>
    },
    {
      header: 'Net Pay',
      accessorKey: 'netPayable',
      sortable: true,
      cell: (item) => (
        <span className="font-mono font-bold text-slate-900">₹{item.netPayable.toLocaleString()}</span>
      )
    },
    {
      header: 'Status',
      accessorKey: 'status',
      sortable: true,
      cell: (item) => (
        <span className="px-2 py-0.5 rounded text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
          {item.status}
        </span>
      )
    },
    {
      header: 'Payslip & Breakdown',
      cell: (item) => (
        <button
          onClick={() => setSelectedPayslipItem(item)}
          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
        >
          <Eye className="h-3 w-3" />
          <span>Slip & Formula</span>
        </button>
      )
    }
  ];

  const exportData = visibleLineItems.map((i) => ({
    EmployeeID: i.employeeId,
    Name: i.employeeName,
    Department: i.departmentName,
    PayableDays: i.payableDays,
    Gross: i.grossEarnings,
    Basic: i.basicEarnings,
    HRA: i.hraEarnings,
    PFEmployee: i.pfEmployee,
    PT: i.professionalTax,
    TDS: i.tdsWithholding,
    TotalDeductions: i.totalDeductions,
    NetPay: i.netPayable,
    BankAccount: i.bankAccountNumber
  }));

  return (
    <div className="space-y-6">
      {notice && (
        <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-900 text-xs flex items-center justify-between">
          <span className="font-medium">{notice}</span>
          <button onClick={() => setNotice('')} className="text-indigo-700 font-bold hover:underline">Dismiss</button>
        </div>
      )}
      {/* Stat Cards */}
      {canViewRuns ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Payroll Periods"
            value={payrollRuns.length}
            subtitle={`Latest: ${latestRun?.periodLabel || 'None'}`}
            icon={CreditCard}
            badge="Audit Locked"
            badgeColor="slate"
          />
          <StatCard
            title="Latest Net Outflow"
            value={`₹${(latestRun?.totalNetPay || 0).toLocaleString()}`}
            subtitle={`${latestRun?.totalEmployees || 0} employees disbursed`}
            icon={CheckCircle2}
            badge={latestRun?.status || 'Finalized'}
            badgeColor="emerald"
          />
          <StatCard
            title="Statutory PF / ESI"
            value="100% Compliant"
            subtitle="Formulas & slabs auto-calculated"
            icon={ShieldCheck}
            badge="India Payroll Rules"
            badgeColor="indigo"
          />
          <StatCard
            title="Active Structures"
            value={structures.length}
            subtitle="Grade-wise salary matrices"
            icon={Layers}
            badge="Configurable"
            badgeColor="blue"
            onClick={() => setActiveTab('structures')}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="My Gross Monthly"
            value={`₹${(myStructure?.grossMonthly || (currentEmp?.baseSalaryAnnual ? Math.round(currentEmp.baseSalaryAnnual / 12) : 0)).toLocaleString()}`}
            subtitle={`Annual CTC: ₹${((currentEmp?.baseSalaryAnnual || myStructure?.ctcAnnual || 0)).toLocaleString()}`}
            icon={CreditCard}
            badge="Assigned Structure"
            badgeColor="indigo"
          />
          <StatCard
            title="Latest Net Pay"
            value={myLatestPayslip ? `₹${myLatestPayslip.netPayable.toLocaleString()}` : '₹0'}
            subtitle={myLatestPayslip?.periodLabel || 'Latest disbursed payslip'}
            icon={CheckCircle2}
            badge="Finalized"
            badgeColor="emerald"
          />
          <StatCard
            title="Total Deductions"
            value={myLatestPayslip ? `₹${myLatestPayslip.totalDeductions.toLocaleString()}` : '₹0'}
            subtitle="PF, PT & TDS withholding"
            icon={ShieldCheck}
            badge="Statutory"
            badgeColor="slate"
          />
          <StatCard
            title="My Structure"
            value={myStructure?.name || 'Assigned Structure'}
            subtitle="View salary component breakdown"
            icon={Layers}
            badge="Active"
            badgeColor="blue"
            onClick={() => setActiveTab('structures')}
          />
        </div>
      )}

      {/* Tabs and Action Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200">
        <div className="flex flex-wrap items-center gap-1 bg-slate-100 p-1 rounded-lg">
          {canViewRuns && (
            <button
              onClick={() => setActiveTab('runs')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                activeTab === 'runs' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Payroll Runs ({payrollRuns.length})
            </button>
          )}
          <button
            onClick={() => setActiveTab('payslips')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              activeTab === 'payslips' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {canViewRuns ? `All Employee Payslips (${visibleLineItems.length})` : `My Payslips (${visibleLineItems.length})`}
          </button>
          <button
            onClick={() => setActiveTab('structures')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              activeTab === 'structures' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {canViewRuns ? `Salary Structures (${structures.length})` : 'My Salary Structure'}
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
              <span>Payroll & Statutory Policies →</span>
            </button>
          )}
          <ExportButton data={exportData} fileName={canViewRuns ? 'Orbyx_Payroll_Register' : `Orbyx_My_Payslips_${currentUser.employeeId}`} />
          {isHR && canProcessPayroll() && (
            <button
              onClick={() => setIsProcessModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-2xs transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Process New Payroll</span>
            </button>
          )}
        </div>
      </div>

      {/* Contextual Filters for Payslips */}
      {activeTab === 'payslips' && (
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 flex flex-wrap items-center gap-3 text-xs">
          {canViewRuns && (
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg"
            >
              <option value="ALL">All Departments</option>
              {departments.map((d) => (
                <option key={d.id} value={d.name}>{d.name}</option>
              ))}
            </select>
          )}
          <select
            value={runFilter}
            onChange={(e) => setRunFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg"
          >
            <option value="ALL">All Payroll Periods</option>
            {payrollRuns.map((r) => (
              <option key={r.id} value={r.id}>{r.periodLabel}</option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg"
          >
            <option value="ALL">All Payment Statuses</option>
            <option value="Paid">Paid</option>
            <option value="Finalized">Finalized</option>
          </select>
          {(deptFilter !== 'ALL' || runFilter !== 'ALL' || statusFilter !== 'ALL') && (
            <button
              onClick={() => {
                setDeptFilter('ALL');
                setRunFilter('ALL');
                setStatusFilter('ALL');
              }}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Clear Filters
            </button>
          )}
        </div>
      )}

      {/* Content: Runs */}
      {canViewRuns && activeTab === 'runs' && (
        <DataTable
          data={payrollRuns}
          columns={runColumns}
          searchPlaceholder="Search payroll periods..."
        />
      )}

      {/* Content: Payslips */}
      {activeTab === 'payslips' && (
        <DataTable
          data={visibleLineItems}
          columns={payslipColumns}
          searchPlaceholder="Search payslips by employee name, ID, or department..."
        />
      )}

      {/* Content: Salary Structures */}
      {activeTab === 'structures' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {(canViewRuns ? structures : (myStructure ? [myStructure] : [])).map((s) => (
            <div key={s.id} className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-3">
              <div className="pb-3 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">{s.name}</h4>
                  <p className="text-[11px] text-slate-500">{s.description}</p>
                </div>
                {isHR && (
                  <button
                    onClick={() => openEditStructure(s)}
                    className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded"
                  >
                    <Edit3 className="h-3 w-3" /> Edit
                  </button>
                )}
              </div>
              <div className="flex justify-between items-baseline pt-1">
                <span className="text-xs text-slate-500">Gross Monthly:</span>
                <span className="text-base font-bold text-slate-900 font-mono">₹{s.grossMonthly.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-baseline border-b border-slate-100 pb-2">
                <span className="text-xs text-slate-500">Annual CTC:</span>
                <span className="text-sm font-semibold text-indigo-700 font-mono">₹{s.ctcAnnual.toLocaleString()}</span>
              </div>
              <div className="space-y-1.5 pt-1 text-xs">
                {s.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between text-slate-600">
                    <span>{item.componentName}</span>
                    <span className="font-mono font-medium">₹{item.amountMonthly.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Salary Structure Modal */}
      {editingStruct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <form
            onSubmit={handleSaveStructure}
            className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-3 text-xs"
          >
            <h4 className="text-base font-bold text-slate-900">Edit Salary Structure</h4>
            <label className="block font-semibold text-slate-700">
              Structure Name *
              <input
                required
                value={structName}
                onChange={(e) => setStructName(e.target.value)}
                className="mt-1 w-full px-3 py-1.5 border border-slate-200 rounded-lg"
              />
            </label>
            <label className="block font-semibold text-slate-700">
              Description
              <input
                value={structDesc}
                onChange={(e) => setStructDesc(e.target.value)}
                className="mt-1 w-full px-3 py-1.5 border border-slate-200 rounded-lg"
              />
            </label>
            <label className="block font-semibold text-slate-700">
              Monthly Gross Salary (₹) *
              <input
                required
                type="number"
                value={structGross}
                onChange={(e) => setStructGross(Number(e.target.value))}
                className="mt-1 w-full px-3 py-1.5 border border-slate-200 rounded-lg font-mono"
              />
              <span className="text-[11px] text-slate-400 block mt-1">
                Auto-calculates 50% Basic, 25% HRA, and 25% Special Allowance.
              </span>
            </label>
            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditingStruct(null)}
                className="px-3 py-1.5 border border-slate-200 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-indigo-600 text-white font-semibold rounded-lg"
              >
                Save Structure
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Payslip Modal */}
      <PayslipModal
        item={selectedPayslipItem}
        periodLabel={latestRun?.periodLabel || 'September 2026'}
        isOpen={!!selectedPayslipItem}
        onClose={() => setSelectedPayslipItem(null)}
      />

      {/* Process Payroll Modal */}
      <ProcessPayrollModal
        isOpen={isProcessModalOpen}
        onClose={() => setIsProcessModalOpen(false)}
        onFinalized={() => {}}
      />

      {/* Disburse Modal */}
      {disburseRunId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4 text-xs">
            <h4 className="text-base font-bold text-slate-900">Record Salary Disbursement</h4>
            <p className="text-slate-600">
              Enter the bank transaction reference (NEFT / RTGS / UTR number) for auditing.
            </p>
            <div>
              <label className="block text-slate-600 font-medium mb-1">Payment Reference / UTR *</label>
              <input
                type="text"
                value={disburseRef}
                onChange={(e) => setDisburseRef(e.target.value)}
                placeholder="e.g. UTR-HDFC-99887766"
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-mono uppercase"
                required
              />
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setDisburseRunId(null)}
                className="px-3 py-1.5 text-slate-700 bg-white border border-slate-200 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleDisburseConfirm}
                className="px-4 py-1.5 font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg"
              >
                Confirm & Mark Disbursed
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reopen Payroll Run Modal */}
      {reopenRunId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4 text-xs">
            <h4 className="text-base font-bold text-slate-900">Reopen Finalized Payroll Run</h4>
            <p className="text-slate-600">
              Reopening this payroll period unlocks it for attendance, allowance, or statutory recalculation. An immutable audit log entry is mandatory.
            </p>
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Mandatory Audit Reason *</label>
              <textarea
                rows={3}
                value={reopenReason}
                onChange={(e) => setReopenReason(e.target.value)}
                placeholder="e.g. Late client attendance approval for EMP-003..."
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg"
                required
              />
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setReopenRunId(null)}
                className="px-3 py-1.5 text-slate-700 bg-white border border-slate-200 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleReopenConfirm}
                disabled={!reopenReason.trim()}
                className="px-4 py-1.5 font-semibold text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-50 rounded-lg"
              >
                Confirm & Reopen Run
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
