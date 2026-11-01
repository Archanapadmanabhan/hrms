import React, { useState, useMemo, useEffect } from 'react';
import { db, subscribeToDB } from '../../db/storage';
import { ExpenseClaim, ExpenseCategory, NavigationContext } from '../../types/hrms';
import { useAuth } from '../../services/authContext';
import { hrmsService } from '../../services/hrmsService';
import { DataTable, Column } from '../common/DataTable';
import { ExportButton } from '../common/ExportButton';
import { StatCard } from '../common/StatCard';
import { PolicyRulesPanel } from '../common/PolicyRulesPanel';
import { NewExpenseModal } from './NewExpenseModal';
import { AdvancePettyCash } from './AdvancePettyCash';
import {
  Receipt,
  CheckCircle2,
  Clock,
  Plus,
  Check,
  X,
  CreditCard,
  Send,
  RotateCcw,
  Eye,
  Edit3,
  Power,
  ShieldCheck
} from 'lucide-react';

interface ExpenseManagementProps {
  navContext?: NavigationContext;
  onOpenPolicies?: () => void;
}

export const ExpenseManagement: React.FC<ExpenseManagementProps> = ({ navContext, onOpenPolicies }) => {
  const { currentUser, canApproveRequestFor } = useAuth();
  const isMD = currentUser.role === 'senior_manager';
  const [, setDbTick] = useState(0);

  useEffect(() => {
    return subscribeToDB(() => setDbTick((t) => t + 1));
  }, []);

  const [activeTab, setActiveTab] = useState<'claims' | 'approvals' | 'reimbursements' | 'categories' | 'advances'>(() => {
    if (navContext?.subTab === 'approvals' || navContext?.statusFilter === 'Pending Manager Approval') return 'approvals';
    if (navContext?.subTab === 'reimbursements' || navContext?.statusFilter === 'Pending Reimbursement') return 'reimbursements';
    if (navContext?.subTab === 'advances') return 'advances';
    return 'claims';
  });
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);

  // Contextual filters for Claims
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState(() => navContext?.statusFilter || 'ALL');
  const [empFilter, setEmpFilter] = useState('ALL');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  useEffect(() => {
    if (!navContext) return;
    if (navContext.subTab === 'approvals' || navContext.statusFilter === 'Pending Manager Approval') setActiveTab('approvals');
    else if (navContext.subTab === 'reimbursements' || navContext.statusFilter === 'Pending Reimbursement') setActiveTab('reimbursements');
    else if (navContext.subTab === 'advances') setActiveTab('advances');
    else if (navContext.subTab === 'claims') setActiveTab('claims');
    if (navContext.statusFilter) setStatusFilter(navContext.statusFilter);
  }, [navContext]);

  // View Claim modal
  const [viewingClaim, setViewingClaim] = useState<ExpenseClaim | null>(null);

  // Add/Edit Expense Category modal
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ExpenseCategory | null>(null);
  const [catForm, setCatForm] = useState({
    name: '',
    code: '',
    maxLimitPerClaim: 10000,
    requiresReceipt: true,
    description: '',
    isActive: true
  });

  // Review modal
  const [reviewClaim, setReviewClaim] = useState<{ id: string; decision: 'Approved' | 'Rejected' } | null>(null);
  const [reviewComments, setReviewComments] = useState('');

  // Reimbursement modal
  const [reimburseClaim, setReimburseClaim] = useState<ExpenseClaim | null>(null);
  const [reimburseRef, setReimburseRef] = useState('');

  const claims = db.getExpenseClaims();
  const categories = db.getExpenseCategories();
  const employees = db.getEmployees();

  const isHR = currentUser.role === 'hr_admin';

  // Scoped claims based on role
  const scopedClaims = useMemo(() => {
    return claims.filter((claim) => {
      if (isHR) return true;
      if (currentUser.role === 'senior_manager' || currentUser.role === 'reporting_manager') {
        const emp = employees.find((e) => e.id === claim.employeeId);
        return emp?.reportingManagerId === currentUser.employeeId || claim.employeeId === currentUser.employeeId;
      }
      return claim.employeeId === currentUser.employeeId;
    });
  }, [claims, isHR, currentUser, employees]);

  const visibleClaims = useMemo(() => {
    return scopedClaims.filter((c) => {
      if (categoryFilter !== 'ALL' && c.categoryId !== categoryFilter) return false;
      if (statusFilter !== 'ALL' && c.status !== statusFilter) return false;
      if (empFilter !== 'ALL' && c.employeeId !== empFilter) return false;
      if (fromDate && c.expenseDate < fromDate) return false;
      if (toDate && c.expenseDate > toDate) return false;
      return true;
    });
  }, [scopedClaims, categoryFilter, statusFilter, empFilter, fromDate, toDate]);

  const pendingApprovals = claims.filter((c) => {
    if (c.status !== 'Pending Manager Approval') return false;
    return canApproveRequestFor(c.employeeId);
  });

  const pendingReimbursements = claims.filter((c) => c.status === 'Pending Reimbursement');

  const totalReimbursed = scopedClaims
    .filter((c) => c.status === 'Reimbursed')
    .reduce((acc, c) => acc + c.amount, 0);

  const handleDecisionConfirm = () => {
    if (!reviewClaim) return;
    hrmsService.decideExpenseClaim(
      reviewClaim.id,
      reviewClaim.decision,
      reviewComments,
      currentUser.id,
      currentUser.name
    );
    setReviewClaim(null);
    setReviewComments('');
  };

  const handleReimburseConfirm = () => {
    if (!reimburseClaim || !reimburseRef) return;
    hrmsService.reimburseExpenseClaim(
      reimburseClaim.id,
      reimburseRef,
      currentUser.id,
      currentUser.name
    );
    setReimburseClaim(null);
    setReimburseRef('');
  };

  const openAddCategory = () => {
    setEditingCategory(null);
    setCatForm({
      name: '',
      code: '',
      maxLimitPerClaim: 10000,
      requiresReceipt: true,
      description: '',
      isActive: true
    });
    setIsCategoryModalOpen(true);
  };

  const openEditCategory = (cat: ExpenseCategory) => {
    setEditingCategory(cat);
    setCatForm({
      name: cat.name,
      code: cat.code,
      maxLimitPerClaim: cat.maxLimitPerClaim,
      requiresReceipt: cat.requiresReceipt,
      description: cat.description,
      isActive: cat.isActive !== false
    });
    setIsCategoryModalOpen(true);
  };

  const handleSaveCategory = (e: React.FormEvent) => {
    e.preventDefault();
    db.saveExpenseCategory({
      id: editingCategory?.id || `ECAT-${Date.now().toString().slice(-4)}`,
      name: catForm.name.trim(),
      code: catForm.code.trim().toUpperCase(),
      maxLimitPerClaim: Number(catForm.maxLimitPerClaim),
      requiresReceipt: catForm.requiresReceipt,
      description: catForm.description.trim(),
      isActive: catForm.isActive
    });
    setIsCategoryModalOpen(false);
  };

  const toggleCategoryActive = (cat: ExpenseCategory) => {
    db.saveExpenseCategory({
      ...cat,
      isActive: cat.isActive === false ? true : false
    });
  };

  const columns: Column<ExpenseClaim>[] = [
    {
      header: 'Claim Number',
      accessorKey: 'claimNumber',
      sortable: true,
      cell: (claim) => (
        <div>
          <span className="font-bold text-slate-900 font-mono">{claim.claimNumber}</span>
          <span className="text-[11px] text-slate-500 block">{claim.expenseDate}</span>
        </div>
      )
    },
    {
      header: 'Employee',
      accessorKey: 'employeeId',
      sortable: true,
      cell: (claim) => {
        const emp = employees.find((e) => e.id === claim.employeeId);
        return (
          <div className="flex items-center gap-2">
            <img
              src={emp?.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'}
              alt=""
              className="h-7 w-7 rounded-full object-cover"
            />
            <div>
              <p className="font-semibold text-slate-900">{emp ? `${emp.firstName} ${emp.lastName}` : claim.employeeId}</p>
              <p className="text-[10px] text-slate-400 font-mono">{claim.employeeId}</p>
            </div>
          </div>
        );
      }
    },
    {
      header: 'Category & Title',
      accessorKey: 'title',
      sortable: true,
      cell: (claim) => {
        const cat = categories.find((c) => c.id === claim.categoryId);
        return (
          <div className="max-w-xs">
            <span className="font-medium text-slate-800">{claim.title}</span>
            <span className="text-[11px] text-slate-500 block truncate">{cat?.name}</span>
            {claim.receiptFileName && (
              <span className="text-[10px] text-indigo-600 block">Receipt: {claim.receiptFileName}</span>
            )}
          </div>
        );
      }
    },
    {
      header: 'Amount',
      accessorKey: 'amount',
      sortable: true,
      cell: (claim) => (
        <span className="font-bold text-slate-900 font-mono">
          ₹{claim.amount.toLocaleString()}
        </span>
      )
    },
    {
      header: 'Status',
      accessorKey: 'status',
      sortable: true,
      cell: (claim) => (
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
            claim.status === 'Reimbursed'
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : claim.status === 'Pending Reimbursement'
              ? 'bg-blue-50 text-blue-700 border border-blue-200'
              : claim.status === 'Rejected'
              ? 'bg-rose-50 text-rose-700 border border-rose-200'
              : 'bg-amber-50 text-amber-700 border border-amber-200'
          }`}
        >
          {claim.status}
        </span>
      )
    },
    {
      header: 'Actions',
      cell: (claim) => {
        const canApprove = claim.status === 'Pending Manager Approval' && canApproveRequestFor(claim.employeeId);
        const canPay = claim.status === 'Pending Reimbursement' && isHR;

        return (
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setViewingClaim(claim)}
              className="p-1.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
              title="View Details"
            >
              <Eye className="h-3.5 w-3.5" />
            </button>

            {canApprove && (
              <>
                <button
                  onClick={() => setReviewClaim({ id: claim.id, decision: 'Approved' })}
                  className="p-1.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white transition-colors"
                  title="Approve"
                >
                  <Check className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => setReviewClaim({ id: claim.id, decision: 'Rejected' })}
                  className="p-1.5 rounded-md bg-rose-600 hover:bg-rose-700 text-white transition-colors"
                  title="Reject"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </>
            )}

            {canPay && (
              <button
                onClick={() => {
                  setReimburseClaim(claim);
                  setReimburseRef(`UTR-REIMB-${Date.now().toString().slice(-6)}`);
                }}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors"
              >
                <Send className="h-3 w-3" />
                <span>Pay Reimbursement</span>
              </button>
            )}

            {!canApprove && !canPay && claim.reimbursementReference && (
              <span className="text-[10px] text-slate-500 font-mono">Ref: {claim.reimbursementReference}</span>
            )}
          </div>
        );
      }
    }
  ];

  const exportData = visibleClaims.map((c) => ({
    ClaimNumber: c.claimNumber,
    EmployeeID: c.employeeId,
    Category: categories.find((cat) => cat.id === c.categoryId)?.name || '',
    Title: c.title,
    Amount: c.amount,
    Date: c.expenseDate,
    Purpose: c.businessPurpose,
    Status: c.status,
    PaymentReference: c.reimbursementReference || ''
  }));

  const hasFilters =
    categoryFilter !== 'ALL' ||
    statusFilter !== 'ALL' ||
    empFilter !== 'ALL' ||
    Boolean(fromDate) ||
    Boolean(toDate);

  return (
    <div className="space-y-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Claims"
          value={visibleClaims.length}
          subtitle="Accessible within role scope"
          icon={Receipt}
          badge="Audit Tracked"
          badgeColor="slate"
        />
        <StatCard
          title="Pending Approvals"
          value={pendingApprovals.length}
          subtitle="Manager review queue"
          icon={Clock}
          badge={pendingApprovals.length > 0 ? 'Action Needed' : 'Cleared'}
          badgeColor={pendingApprovals.length > 0 ? 'amber' : 'emerald'}
          onClick={() => setActiveTab('approvals')}
        />
        <StatCard
          title="Awaiting Payment"
          value={pendingReimbursements.length}
          subtitle="Approved by manager"
          icon={CreditCard}
          badge={pendingReimbursements.length > 0 ? 'Pay Out' : 'None'}
          badgeColor={pendingReimbursements.length > 0 ? 'blue' : 'slate'}
          onClick={() => setActiveTab('reimbursements')}
        />
        <StatCard
          title="Reimbursed Total"
          value={`₹${totalReimbursed.toLocaleString()}`}
          subtitle="Disbursed via direct transfer"
          icon={CheckCircle2}
          badge="Processed"
          badgeColor="emerald"
        />
      </div>

      {/* Tabs and Actions Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200">
        <div className="flex flex-wrap items-center gap-1 bg-slate-100 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab('claims')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              activeTab === 'claims' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All Claims ({visibleClaims.length})
          </button>
          {pendingApprovals.length > 0 && (
            <button
              onClick={() => setActiveTab('approvals')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                activeTab === 'approvals' ? 'bg-white text-amber-800 shadow-xs' : 'text-amber-700 hover:text-amber-900'
              }`}
            >
              Manager Queue ({pendingApprovals.length})
            </button>
          )}
          {isHR && (
            <button
              onClick={() => setActiveTab('reimbursements')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                activeTab === 'reimbursements' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Reimbursement Payouts ({pendingReimbursements.length})
            </button>
          )}
          <button
            onClick={() => setActiveTab('advances')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${activeTab === 'advances' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
          >
            Advances & Petty Cash
          </button>
          <button
            onClick={() => setActiveTab('categories')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              activeTab === 'categories' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Expense Categories ({categories.length})
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
              <span>Expense Policies →</span>
            </button>
          )}
          <ExportButton data={exportData} fileName="Orbyx_Expense_Register" />
          {isHR && activeTab === 'categories' && (
            <button
              onClick={openAddCategory}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Category</span>
            </button>
          )}
          {!isMD && (
            <button
              onClick={() => setIsNewModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-2xs transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Submit Claim</span>
            </button>
          )}
        </div>
      </div>

      {/* Contextual Filters for Claims */}
      {activeTab === 'claims' && (
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 text-xs">
          {isHR && (
            <select
              value={empFilter}
              onChange={(e) => setEmpFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg"
            >
              <option value="ALL">All Employees</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>{e.firstName} {e.lastName}</option>
              ))}
            </select>
          )}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg"
          >
            <option value="ALL">All Expense Categories</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg"
          >
            <option value="ALL">All Claim Statuses</option>
            <option value="Pending Manager Approval">Pending Manager Approval</option>
            <option value="Pending Reimbursement">Pending Reimbursement</option>
            <option value="Reimbursed">Reimbursed</option>
            <option value="Rejected">Rejected</option>
          </select>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg"
            title="From Date"
          />
          <div className="flex items-center gap-1.5">
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg"
              title="To Date"
            />
            {hasFilters && (
              <button
                onClick={() => {
                  setCategoryFilter('ALL');
                  setStatusFilter('ALL');
                  setEmpFilter('ALL');
                  setFromDate('');
                  setToDate('');
                }}
                className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg shrink-0"
                title="Clear Filters"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Content: Claims */}
      {activeTab === 'claims' && (
        <DataTable
          data={visibleClaims}
          columns={columns}
          searchPlaceholder="Search claims by number, employee, or purpose..."
        />
      )}

      {/* Content: Approvals */}
      {activeTab === 'approvals' && (
        <DataTable
          data={pendingApprovals}
          columns={columns}
          searchPlaceholder="Filter pending approvals..."
          emptyMessage="No approvals waiting in your manager queue."
        />
      )}

      {/* Content: Reimbursements */}
      {activeTab === 'reimbursements' && (
        <DataTable
          data={pendingReimbursements}
          columns={columns}
          searchPlaceholder="Filter pending reimbursements..."
          emptyMessage="No claims currently pending reimbursement."
        />
      )}

      {/* Salary advances and travel petty cash lifecycle */}
      {activeTab === 'advances' && <AdvancePettyCash />}

      {/* Content: Categories */}
      {activeTab === 'categories' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
          {categories.map((cat) => {
            const active = cat.isActive !== false;
            return (
              <div
                key={cat.id}
                className={`p-4 bg-white rounded-xl border shadow-xs space-y-2.5 ${
                  active ? 'border-slate-200' : 'border-slate-200 opacity-65 bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div>
                    <span className="font-bold text-slate-900 block">{cat.name}</span>
                    <span className="font-mono text-[10px] text-slate-500">{cat.code}</span>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                      active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <p className="text-slate-600 text-[11px]">{cat.description}</p>
                <div className="pt-2 border-t border-slate-100 flex justify-between">
                  <span className="text-slate-500">Max Limit:</span>
                  <span className="font-mono font-bold text-slate-900">₹{cat.maxLimitPerClaim.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Receipt Required:</span>
                  <span className="font-medium text-emerald-700">{cat.requiresReceipt ? 'Yes' : 'No'}</span>
                </div>
                {isHR && (
                  <div className="pt-2 border-t border-slate-100 flex justify-end gap-2">
                    <button
                      onClick={() => openEditCategory(cat)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded"
                    >
                      <Edit3 className="h-3 w-3" /> Edit
                    </button>
                    <button
                      onClick={() => toggleCategoryActive(cat)}
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

      {/* View Claim Details Modal */}
      {viewingClaim && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-3 text-xs">
            <h4 className="text-base font-bold text-slate-900">
              Expense Claim — {viewingClaim.claimNumber}
            </h4>
            <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              <div>
                <span className="text-slate-400 block">Employee ID</span>
                <span className="font-mono font-bold text-slate-900">{viewingClaim.employeeId}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Expense Date</span>
                <span className="font-mono text-slate-800">{viewingClaim.expenseDate}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Amount</span>
                <span className="font-mono font-bold text-indigo-700">₹{viewingClaim.amount.toLocaleString()}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Status</span>
                <span className="font-semibold text-slate-800">{viewingClaim.status}</span>
              </div>
              <div className="col-span-2">
                <span className="text-slate-400 block">Title & Purpose</span>
                <span className="font-semibold text-slate-900 block">{viewingClaim.title}</span>
                <span className="text-slate-600">{viewingClaim.businessPurpose}</span>
              </div>
              {viewingClaim.reimbursementReference && (
                <div className="col-span-2">
                  <span className="text-slate-400 block">UTR / Payment Reference</span>
                  <span className="font-mono font-bold text-emerald-700">{viewingClaim.reimbursementReference}</span>
                </div>
              )}
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => setViewingClaim(null)}
                className="px-4 py-1.5 bg-slate-900 text-white font-semibold rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Category Modal */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <form
            onSubmit={handleSaveCategory}
            className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-3 text-xs"
          >
            <h4 className="text-base font-bold text-slate-900">
              {editingCategory ? 'Edit Expense Category' : 'Add Expense Category'}
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <label className="col-span-2 font-semibold text-slate-700">
                Category Name *
                <input
                  required
                  value={catForm.name}
                  onChange={(e) => setCatForm({ ...catForm, name: e.target.value })}
                  className="mt-1 w-full px-3 py-1.5 border border-slate-200 rounded-lg"
                />
              </label>
              <label className="font-semibold text-slate-700">
                Category Code *
                <input
                  required
                  value={catForm.code}
                  onChange={(e) => setCatForm({ ...catForm, code: e.target.value })}
                  className="mt-1 w-full px-3 py-1.5 border border-slate-200 rounded-lg font-mono uppercase"
                />
              </label>
              <label className="font-semibold text-slate-700">
                Max Limit / Claim (₹) *
                <input
                  required
                  type="number"
                  value={catForm.maxLimitPerClaim}
                  onChange={(e) => setCatForm({ ...catForm, maxLimitPerClaim: Number(e.target.value) })}
                  className="mt-1 w-full px-3 py-1.5 border border-slate-200 rounded-lg"
                />
              </label>
              <label className="col-span-2 font-semibold text-slate-700">
                Description
                <textarea
                  rows={2}
                  value={catForm.description}
                  onChange={(e) => setCatForm({ ...catForm, description: e.target.value })}
                  className="mt-1 w-full px-3 py-1.5 border border-slate-200 rounded-lg"
                />
              </label>
              <label className="col-span-2 flex items-center gap-2 font-semibold text-slate-700">
                <input
                  type="checkbox"
                  checked={catForm.requiresReceipt}
                  onChange={(e) => setCatForm({ ...catForm, requiresReceipt: e.target.checked })}
                />
                Mandatory tax invoice / receipt attachment required
              </label>
            </div>
            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsCategoryModalOpen(false)}
                className="px-3 py-1.5 text-slate-700 border border-slate-200 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg"
              >
                Save Category
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Review Modal */}
      {reviewClaim && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4 text-xs">
            <h4 className="text-base font-bold text-slate-900">
              {reviewClaim.decision === 'Approved' ? 'Approve Expense Claim' : 'Reject Expense Claim'}
            </h4>
            <p className="text-slate-600">
              Enter manager review notes. Approved claims will move to the finance reimbursement queue.
            </p>
            <textarea
              value={reviewComments}
              onChange={(e) => setReviewComments(e.target.value)}
              placeholder="e.g. Approved. Matches sprint hardware policy..."
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg"
              rows={3}
            />
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setReviewClaim(null)}
                className="px-3 py-1.5 text-slate-700 bg-white border border-slate-200 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleDecisionConfirm}
                className={`px-4 py-1.5 font-semibold text-white rounded-lg ${
                  reviewClaim.decision === 'Approved' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                Confirm {reviewClaim.decision}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reimbursement Payment Modal */}
      {reimburseClaim && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4 text-xs">
            <h4 className="text-base font-bold text-slate-900">Process Expense Reimbursement</h4>
            <p className="text-slate-600">
              Disbursing ₹{reimburseClaim.amount.toLocaleString()} for claim {reimburseClaim.claimNumber}.
            </p>
            <div>
              <label className="block text-slate-600 font-medium mb-1">Bank Payment Reference / UTR Number *</label>
              <input
                type="text"
                value={reimburseRef}
                onChange={(e) => setReimburseRef(e.target.value)}
                placeholder="e.g. UTR-HDFC-88997766"
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-mono uppercase"
                required
              />
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setReimburseClaim(null)}
                className="px-3 py-1.5 text-slate-700 bg-white border border-slate-200 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleReimburseConfirm}
                className="px-4 py-1.5 font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg"
              >
                Record Payment & Mark Reimbursed
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Claim Modal */}
      <NewExpenseModal
        isOpen={isNewModalOpen}
        onClose={() => setIsNewModalOpen(false)}
      />
    </div>
  );
};
