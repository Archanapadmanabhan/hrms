import React, { useState, useMemo, useEffect } from 'react';
import { db, subscribeToDB } from '../../db/storage';
import { Asset, AllocationCondition, NavigationContext } from '../../types/hrms';
import { useAuth } from '../../services/authContext';
import { hrmsService } from '../../services/hrmsService';
import { DataTable, Column } from '../common/DataTable';
import { ExportButton } from '../common/ExportButton';
import { StatCard } from '../common/StatCard';
import { CsvImportModal } from '../common/CsvImportModal';
import { RegisterAssetModal } from './RegisterAssetModal';
import { AllocateAssetModal } from './AllocateAssetModal';
import {
  Laptop,
  CheckCircle2,
  Package,
  Plus,
  UserCheck,
  ShieldCheck,
  RotateCcw,
  Edit3,
  Power,
  Upload
} from 'lucide-react';

interface AssetManagementProps {
  navContext?: NavigationContext;
  onOpenPolicies?: () => void;
}

export const AssetManagement: React.FC<AssetManagementProps> = ({ navContext, onOpenPolicies }) => {
  const { currentUser, canManageOrganization } = useAuth();
  const isHR = canManageOrganization();
  const isSeniorManager = currentUser.role === 'senior_manager';
  const isReportingManager = currentUser.role === 'reporting_manager';
  const isEmployee = currentUser.role === 'employee';
  const [, setDbTick] = useState(0);

  useEffect(() => {
    return subscribeToDB(() => setDbTick((t) => t + 1));
  }, []);

  const [activeTab, setActiveTab] = useState<'all' | 'myAssets' | 'teamAssets'>(() => {
    if (navContext?.subTab === 'myAssets') return 'myAssets';
    if (navContext?.subTab === 'teamAssets') return 'teamAssets';
    return isHR || isSeniorManager ? 'all' : isReportingManager ? 'teamAssets' : 'myAssets';
  });
  const [typeFilter, setTypeFilter] = useState<'all' | 'Hardware' | 'Software & Digital'>('all');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState(() => navContext?.statusFilter || 'ALL');
  const [empFilter, setEmpFilter] = useState('ALL');

  useEffect(() => {
    if (!navContext) return;
    if (navContext.subTab === 'myAssets') setActiveTab('myAssets');
    else if (navContext.subTab === 'teamAssets') setActiveTab('teamAssets');
    else if (navContext.subTab === 'all') setActiveTab('all');
    if (navContext.statusFilter) setStatusFilter(navContext.statusFilter);
  }, [navContext]);

  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [allocatingAsset, setAllocatingAsset] = useState<Asset | null>(null);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [viewingAsset, setViewingAsset] = useState<Asset | null>(null);

  // Deactivate confirmation modal
  const [deactivatingAsset, setDeactivatingAsset] = useState<Asset | null>(null);
  const [deactivateReason, setDeactivateReason] = useState('Hardware obsolete / removed from active pool');
  const [lifecycleNotice, setLifecycleNotice] = useState('');

  // Return modal
  const [returningAsset, setReturningAsset] = useState<Asset | null>(null);
  const [returnCondition, setReturnCondition] = useState<AllocationCondition>('Good');
  const [returnNotes, setReturnNotes] = useState('');

  const allAssets = db.getAssets().map((a) => ({
    ...a,
    isActive: a.isActive !== false && a.status !== 'Inactive',
    assetType:
      a.assetType ||
      (['Software License', 'Email Account', 'Subscription', 'Cloud Access'].includes(a.category)
        ? 'Software & Digital'
        : 'Hardware')
  }));
  const employees = db.getEmployees();

  // Team direct report IDs for manager
  const teamMemberIds = employees
    .filter((e) => e.reportingManagerId === currentUser.employeeId)
    .map((e) => e.id);

  const myAssets = allAssets.filter((a) => a.currentEmployeeId === currentUser.employeeId);
  const teamAssets = allAssets.filter(
    (a) => a.currentEmployeeId && teamMemberIds.includes(a.currentEmployeeId)
  );

  // Base tab assets
  const tabAssets = isEmployee
    ? myAssets
    : activeTab === 'myAssets'
    ? myAssets
    : activeTab === 'teamAssets'
    ? teamAssets
    : allAssets;

  // Apply contextual filters
  const displayAssets = useMemo(() => {
    return tabAssets.filter((a) => {
      if (typeFilter !== 'all' && a.assetType !== typeFilter) return false;
      if (categoryFilter !== 'ALL' && a.category !== categoryFilter) return false;
      if (statusFilter !== 'ALL') {
        if (statusFilter === 'Inactive' && a.isActive !== false && a.status !== 'Inactive') return false;
        if (statusFilter !== 'Inactive' && a.status !== statusFilter) return false;
      }
      if (empFilter !== 'ALL' && (a.currentEmployeeId || 'UNASSIGNED') !== empFilter) return false;
      return true;
    });
  }, [tabAssets, typeFilter, categoryFilter, statusFilter, empFilter]);

  const allocatedCount = allAssets.filter((a) => a.status === 'Allocated').length;
  const availableCount = allAssets.filter((a) => a.status === 'Available' && a.isActive !== false).length;
  const totalValuation = allAssets.reduce((acc, a) => acc + a.purchaseCost, 0);

  const showBanner = (msg: string) => {
    setLifecycleNotice(msg);
    setTimeout(() => setLifecycleNotice(''), 3500);
  };

  const handleReturnConfirm = () => {
    if (!returningAsset) return;
    hrmsService.returnAsset(
      returningAsset.id,
      returnCondition,
      returnNotes,
      currentUser.id,
      currentUser.name
    );
    showBanner(`Asset ${returningAsset.assetTag} returned and marked Available.`);
    setReturningAsset(null);
    setReturnNotes('');
  };

  const handleAcknowledge = (assetId: string) => {
    hrmsService.acknowledgeAssetReceipt(assetId, currentUser.id, currentUser.name);
    showBanner('Asset custody receipt acknowledged.');
  };

  const handleToggleRetire = (asset: Asset) => {
    const nextStatus = asset.status === 'Retired' ? 'Available' : 'Retired';
    db.saveAsset({
      ...asset,
      status: nextStatus as any,
      isActive: true
    });
    db.logAudit({
      actorUserId: currentUser.id,
      actorName: currentUser.name,
      actorRole: currentUser.role,
      action: 'UPDATE',
      module: 'ASSET',
      entityId: asset.id,
      entityName: asset.assetTag,
      description: `Changed asset ${asset.assetTag} lifecycle state to ${nextStatus}`
    });
    showBanner(`Asset ${asset.assetTag} marked as ${nextStatus}.`);
  };

  const handleMarkAvailable = (asset: Asset) => {
    db.saveAsset({
      ...asset,
      status: 'Available',
      isActive: true
    });
    db.logAudit({
      actorUserId: currentUser.id,
      actorName: currentUser.name,
      actorRole: currentUser.role,
      action: 'UPDATE',
      module: 'ASSET',
      entityId: asset.id,
      entityName: asset.assetTag,
      description: `Marked asset ${asset.assetTag} as Available from ${asset.status}`
    });
    showBanner(`Asset ${asset.assetTag} restored to Available stock.`);
  };

  const handleConfirmDeactivate = () => {
    if (!deactivatingAsset) return;
    const res = hrmsService.deactivateAsset(
      deactivatingAsset.id,
      deactivateReason,
      currentUser.id,
      currentUser.name
    );
    if (res.success) {
      showBanner(`Asset ${deactivatingAsset.assetTag} deactivated.`);
      setDeactivatingAsset(null);
    }
  };

  const handleActivateAsset = (asset: Asset) => {
    const res = hrmsService.activateAsset(asset.id, currentUser.id, currentUser.name);
    if (res.success) {
      showBanner(`Asset ${asset.assetTag} activated and available for allocation.`);
    }
  };

  const handleSaveEditAsset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAsset) return;
    db.saveAsset(editingAsset);
    db.logAudit({
      actorUserId: currentUser.id,
      actorName: currentUser.name,
      actorRole: currentUser.role,
      action: 'UPDATE',
      module: 'ASSET',
      entityId: editingAsset.id,
      entityName: editingAsset.assetTag,
      description: `Updated asset metadata for ${editingAsset.assetTag}`
    });
    showBanner(`Saved changes to ${editingAsset.assetTag}.`);
    setEditingAsset(null);
  };

  const columns: Column<Asset>[] = [
    {
      header: 'Asset Details',
      accessorKey: 'name',
      sortable: true,
      cell: (asset) => (
        <div>
          <span className="font-bold text-slate-900">{asset.name}</span>
          <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
            <span className="font-mono text-indigo-700 font-semibold">{asset.assetTag}</span>
            <span>·</span>
            <span>{asset.category}</span>
          </div>
        </div>
      )
    },
    {
      header: 'Brand & Serial',
      accessorKey: 'serialNumber',
      sortable: true,
      cell: (asset) => (
        <div>
          <span className="font-medium text-slate-800">{asset.brand} - {asset.model}</span>
          <span className="text-[11px] text-slate-500 block font-mono">SN: {asset.serialNumber}</span>
        </div>
      )
    },
    {
      header: 'Assigned To',
      accessorKey: 'currentEmployeeId',
      sortable: true,
      cell: (asset) => {
        if (!asset.currentEmployeeId) {
          return <span className="text-slate-400 italic">Unassigned (In Stock)</span>;
        }
        const emp = employees.find((e) => e.id === asset.currentEmployeeId);
        return (
          <div>
            <span className="font-semibold text-slate-900">
              {emp ? `${emp.firstName} ${emp.lastName}` : asset.currentEmployeeId}
            </span>
            <div className="flex items-center gap-1 mt-0.5">
              {asset.acknowledgedByEmployee ? (
                <span className="text-[10px] text-emerald-700 flex items-center gap-0.5 font-medium">
                  <CheckCircle2 className="h-3 w-3" /> Acknowledged
                </span>
              ) : (
                <span className="text-[10px] text-amber-700 font-medium">Pending Ack</span>
              )}
            </div>
          </div>
        );
      }
    },
    {
      header: 'Purchase & Warranty',
      accessorKey: 'purchaseCost',
      sortable: true,
      cell: (asset) => (
        <div>
          <span className="font-mono font-bold text-slate-900">₹{asset.purchaseCost.toLocaleString()}</span>
          <span className="text-[11px] text-slate-400 block">Warranty to {asset.warrantyExpiryDate}</span>
        </div>
      )
    },
    {
      header: 'Status',
      accessorKey: 'status',
      sortable: true,
      cell: (asset) => {
        const isInactive = asset.isActive === false || asset.status === 'Inactive';
        return (
          <div className="space-y-0.5">
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                isInactive
                  ? 'bg-rose-50 text-rose-700 border border-rose-200'
                  : asset.status === 'Available'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : asset.status === 'Allocated'
                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                  : asset.status === 'Retired'
                  ? 'bg-slate-200 text-slate-600'
                  : 'bg-amber-50 text-amber-700 border border-amber-200'
              }`}
            >
              {isInactive ? 'Inactive' : asset.status}
            </span>
            {isInactive && asset.deactivatedReason && (
              <span className="block text-[10px] text-slate-400 truncate max-w-[140px]" title={asset.deactivatedReason}>
                {asset.deactivatedReason}
              </span>
            )}
          </div>
        );
      }
    },
    {
      header: 'Lifecycle Actions',
      cell: (asset) => {
        const eligibility = hrmsService.getAssetLifecycleActions(
          asset,
          isHR,
          currentUser.employeeId
        );

        return (
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => setViewingAsset(asset)}
              className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] font-medium transition-colors"
              title="View Asset Custody & Details"
            >
              View
            </button>

            {eligibility.canAllocate && (
              <button
                onClick={() => setAllocatingAsset(asset)}
                className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded text-[11px] font-semibold transition-colors"
              >
                Allocate
              </button>
            )}

            {eligibility.canReturn && (
              <button
                onClick={() => setReturningAsset(asset)}
                className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded text-[11px] font-semibold transition-colors"
              >
                Return
              </button>
            )}

            {eligibility.canMarkAvailable && (
              <button
                onClick={() => handleMarkAvailable(asset)}
                className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded text-[11px] font-semibold transition-colors"
              >
                Mark Available
              </button>
            )}

            {eligibility.canEdit && (
              <button
                onClick={() => setEditingAsset(asset)}
                className="px-2 py-1 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded text-[11px] font-medium"
                title="Edit Asset Metadata"
              >
                Edit
              </button>
            )}

            {eligibility.canRetire && (
              <button
                onClick={() => handleToggleRetire(asset)}
                className="px-2 py-1 text-amber-700 bg-amber-50 hover:bg-amber-100 rounded text-[11px] font-medium"
                title="Retire Asset from Active Pool"
              >
                Retire
              </button>
            )}

            {eligibility.canUnretire && (
              <button
                onClick={() => handleToggleRetire(asset)}
                className="px-2 py-1 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded text-[11px] font-semibold"
                title="Restore Retired Asset to Available"
              >
                Restore
              </button>
            )}

            {eligibility.canDeactivate && (
              <button
                onClick={() => {
                  setDeactivatingAsset(asset);
                  setDeactivateReason('Hardware decommissioned / license discontinued');
                }}
                className="px-2 py-1 text-rose-700 bg-rose-50 hover:bg-rose-100 rounded text-[11px] font-semibold transition-colors"
                title={
                  eligibility.deactivateBlockedReason || 'Deactivate Asset Record'
                }
              >
                Deactivate
              </button>
            )}

            {eligibility.canActivate && (
              <button
                onClick={() => handleActivateAsset(asset)}
                className="px-2.5 py-1 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded text-[11px] font-semibold transition-colors"
              >
                Activate
              </button>
            )}

            {eligibility.canAcknowledge && (
              <button
                onClick={() => handleAcknowledge(asset.id)}
                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] font-semibold transition-colors"
              >
                Acknowledge
              </button>
            )}
          </div>
        );
      }
    }
  ];

  const exportData = displayAssets.map((a) => ({
    AssetTag: a.assetTag,
    Name: a.name,
    Category: a.category,
    Brand: a.brand,
    Model: a.model,
    SerialNumber: isEmployee ? '••••••••' : a.serialNumber,
    PurchaseCost: isEmployee ? 0 : a.purchaseCost,
    PurchaseDate: a.purchaseDate,
    WarrantyExpiry: a.warrantyExpiryDate,
    Status: a.status,
    CurrentEmployeeID: a.currentEmployeeId || 'None',
    Condition: a.condition
  }));

  const hasFilters =
    typeFilter !== 'all' ||
    categoryFilter !== 'ALL' ||
    statusFilter !== 'ALL' ||
    empFilter !== 'ALL';

  return (
    <div className="space-y-6">
      {/* Stat Cards */}
      {(isHR || isSeniorManager) ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Registered Assets"
            value={allAssets.length}
            subtitle="Enterprise IT hardware & software catalog"
            icon={Laptop}
            badge="Tracked"
            badgeColor="slate"
          />
          <StatCard
            title="Allocated Workstations"
            value={allocatedCount}
            subtitle={`${myAssets.length} allocated to you`}
            icon={UserCheck}
            badge="In Deployment"
            badgeColor="blue"
          />
          <StatCard
            title="In Stock / Available"
            value={availableCount}
            subtitle="Ready for new onboarding"
            icon={Package}
            badge={availableCount > 0 ? 'Stock Ready' : 'Low Inventory'}
            badgeColor={availableCount > 0 ? 'emerald' : 'amber'}
          />
          <StatCard
            title="Asset Valuation"
            value={`₹${totalValuation.toLocaleString()}`}
            subtitle="Procurement cost total"
            icon={ShieldCheck}
            badge="Audited"
            badgeColor="indigo"
          />
        </div>
      ) : isReportingManager ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            title="Team Assets"
            value={teamAssets.length}
            subtitle="Hardware deployed to your direct reports"
            icon={Laptop}
            badge="Team Scope"
            badgeColor="indigo"
          />
          <StatCard
            title="My Assigned Hardware"
            value={myAssets.length}
            subtitle="Equipment allocated for your use"
            icon={UserCheck}
            badge="Active"
            badgeColor="blue"
          />
          <StatCard
            title="Acknowledged"
            value={teamAssets.filter((a) => a.acknowledgedByEmployee).length}
            subtitle="Receipt confirmed by team"
            icon={CheckCircle2}
            badge="Verified"
            badgeColor="emerald"
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <StatCard
            title="My Assigned Hardware"
            value={myAssets.length}
            subtitle="Equipment allocated to you"
            icon={Laptop}
            badge="Self-Service"
            badgeColor="indigo"
          />
          <StatCard
            title="Acknowledgement Status"
            value={myAssets.every((a) => a.acknowledgedByEmployee) ? 'All Confirmed' : 'Action Pending'}
            subtitle="Custody receipt status"
            icon={ShieldCheck}
            badge="Compliance"
            badgeColor={myAssets.every((a) => a.acknowledgedByEmployee) ? 'emerald' : 'amber'}
          />
        </div>
      )}

      {/* Tabs and Actions Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200">
        <div className="flex flex-wrap items-center gap-1 bg-slate-100 p-1 rounded-lg">
          {(isHR || isSeniorManager) && (
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                activeTab === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Organization Assets ({allAssets.length})
            </button>
          )}
          {isReportingManager && (
            <button
              onClick={() => setActiveTab('teamAssets')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                activeTab === 'teamAssets' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Team Assets ({teamAssets.length})
            </button>
          )}
          <button
            onClick={() => setActiveTab('myAssets')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              activeTab === 'myAssets' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            My Assigned Assets ({myAssets.length})
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {onOpenPolicies && (
            <button
              type="button"
              onClick={onOpenPolicies}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-lg border border-indigo-200 transition-colors"
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Asset Policies →</span>
            </button>
          )}
          <ExportButton data={exportData} fileName={isEmployee ? `Orbyx_My_Assets_${currentUser.employeeId}` : 'Orbyx_Asset_Inventory'} />
          {isHR && (
            <>
              <button
                onClick={() => setIsImportOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg"
              >
                <Upload className="h-3.5 w-3.5" />
                <span>Import CSV</span>
              </button>
              <button
                onClick={() => setIsRegisterModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-2xs transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Register New Asset</span>
              </button>
            </>
          )}
        </div>
      </div>

      {lifecycleNotice && (
        <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl flex items-center justify-between text-xs text-indigo-900 font-medium">
          <span>{lifecycleNotice}</span>
          <button onClick={() => setLifecycleNotice('')} className="text-indigo-700 font-bold">Dismiss</button>
        </div>
      )}

      {/* Contextual Filters Bar */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 flex flex-wrap items-center gap-2.5 text-xs">
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as any)}
          className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-700"
        >
          <option value="all">All Classes (Hardware & Digital)</option>
          <option value="Hardware">Hardware Assets Only</option>
          <option value="Software & Digital">Software & Digital Assets Only</option>
        </select>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg"
        >
          <option value="ALL">All Categories</option>
          <option value="Laptop">Laptop</option>
          <option value="Monitor">Monitor</option>
          <option value="Mobile Device">Mobile Device</option>
          <option value="Software License">Software License</option>
          <option value="Email Account">Email Account</option>
          <option value="Subscription">Subscription</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg"
        >
          <option value="ALL">All Lifecycle Statuses</option>
          <option value="Available">Available</option>
          <option value="Allocated">Allocated</option>
          <option value="Returned">Returned</option>
          <option value="Under Maintenance">Under Maintenance</option>
          <option value="Retired">Retired</option>
          <option value="Inactive">Inactive</option>
        </select>
        {(isHR || isSeniorManager) && (
          <select
            value={empFilter}
            onChange={(e) => setEmpFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg"
          >
            <option value="ALL">All Custodians</option>
            <option value="UNASSIGNED">Unassigned (In Stock)</option>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>{e.firstName} {e.lastName}</option>
            ))}
          </select>
        )}
        {hasFilters && (
          <button
            onClick={() => {
              setTypeFilter('all');
              setCategoryFilter('ALL');
              setStatusFilter('ALL');
              setEmpFilter('ALL');
            }}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Clear Filters
          </button>
        )}
      </div>

      {/* Table Content */}
      <DataTable
        data={displayAssets}
        columns={columns}
        searchPlaceholder="Search assets by tag, serial number, brand, or model..."
        searchFilterKey={(a) => `${a.name} ${a.assetTag} ${a.serialNumber} ${a.brand}`}
      />

      {/* View Asset Details Modal */}
      {viewingAsset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-xl border border-slate-200 space-y-4 text-xs">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <h4 className="text-base font-bold text-slate-900">{viewingAsset.name}</h4>
                <p className="text-slate-500 font-mono text-[11px]">{viewingAsset.assetTag} · {viewingAsset.category}</p>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-semibold">
                {viewingAsset.isActive === false ? 'Inactive' : viewingAsset.status}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              <div><span className="text-slate-400 block">Brand & Model</span><span className="font-semibold text-slate-800">{viewingAsset.brand} {viewingAsset.model}</span></div>
              <div><span className="text-slate-400 block">Serial Number</span><span className="font-mono font-semibold text-slate-800">{viewingAsset.serialNumber}</span></div>
              <div><span className="text-slate-400 block">Purchase Cost</span><span className="font-mono font-bold text-slate-900">₹{viewingAsset.purchaseCost.toLocaleString()}</span></div>
              <div><span className="text-slate-400 block">Warranty Expiry</span><span className="font-mono text-slate-800">{viewingAsset.warrantyExpiryDate}</span></div>
              <div><span className="text-slate-400 block">Condition</span><span className="font-semibold text-slate-800">{viewingAsset.condition}</span></div>
              <div><span className="text-slate-400 block">Location</span><span className="text-slate-800">{viewingAsset.location}</span></div>
              <div className="col-span-2">
                <span className="text-slate-400 block">Current Custodian</span>
                <span className="font-semibold text-slate-900">
                  {viewingAsset.currentEmployeeId
                    ? (() => {
                        const emp = employees.find((e) => e.id === viewingAsset.currentEmployeeId);
                        return emp ? `${emp.firstName} ${emp.lastName} (${emp.id})` : viewingAsset.currentEmployeeId;
                      })()
                    : 'Unassigned (Available in Inventory)'}
                </span>
              </div>
              {viewingAsset.deactivatedReason && (
                <div className="col-span-2 pt-2 border-t border-slate-200">
                  <span className="text-rose-600 font-semibold block">Deactivation Reason</span>
                  <span className="text-slate-700">{viewingAsset.deactivatedReason}</span>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setViewingAsset(null)}
                className="px-4 py-1.5 bg-slate-900 text-white font-semibold rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Deactivate Asset Confirmation / Blocking Modal */}
      {deactivatingAsset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4 text-xs">
            <h4 className="text-base font-bold text-slate-900">
              Deactivate Asset — {deactivatingAsset.assetTag}
            </h4>
            {deactivatingAsset.status === 'Allocated' || deactivatingAsset.status === 'In Use' ? (
              <div className="space-y-3">
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 space-y-1.5">
                  <p className="font-bold">Deactivation Blocked: Active Employee Custody</p>
                  <p className="leading-relaxed">
                    <span className="font-semibold">{deactivatingAsset.name}</span> ({deactivatingAsset.assetTag}) is currently allocated to employee{' '}
                    <span className="font-mono font-bold">{deactivatingAsset.currentEmployeeId}</span>.
                    Organizational policy requires returning or unassigning active hardware/licenses before deactivating the asset record.
                  </p>
                </div>
                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    onClick={() => setDeactivatingAsset(null)}
                    className="px-3 py-1.5 border border-slate-200 rounded-lg text-slate-700"
                  >
                    Close
                  </button>
                  <button
                    onClick={() => {
                      const target = deactivatingAsset;
                      setDeactivatingAsset(null);
                      setReturningAsset(target);
                    }}
                    className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg"
                  >
                    Process Return First
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-slate-600">
                  Deactivating <span className="font-semibold text-slate-900">{deactivatingAsset.name}</span> will mark it <span className="font-semibold text-rose-700">Inactive</span> and prevent new allocations until reactivated. Historical custody logs are preserved.
                </p>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Deactivation Reason *</label>
                  <textarea
                    rows={2}
                    value={deactivateReason}
                    onChange={(e) => setDeactivateReason(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg"
                    placeholder="e.g. Hardware decommissioned / sent for vendor disposal"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    onClick={() => setDeactivatingAsset(null)}
                    className="px-3 py-1.5 border border-slate-200 rounded-lg text-slate-700"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirmDeactivate}
                    className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-lg"
                  >
                    Confirm Deactivation
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Edit Asset Modal */}
      {editingAsset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <form
            onSubmit={handleSaveEditAsset}
            className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-3 text-xs"
          >
            <h4 className="text-base font-bold text-slate-900">Edit Asset — {editingAsset.assetTag}</h4>
            <label className="block font-semibold text-slate-700">
              Asset Name *
              <input
                required
                value={editingAsset.name}
                onChange={(e) => setEditingAsset({ ...editingAsset, name: e.target.value })}
                className="mt-1 w-full px-3 py-1.5 border border-slate-200 rounded-lg"
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="font-semibold text-slate-700">
                Brand
                <input
                  value={editingAsset.brand}
                  onChange={(e) => setEditingAsset({ ...editingAsset, brand: e.target.value })}
                  className="mt-1 w-full px-3 py-1.5 border border-slate-200 rounded-lg"
                />
              </label>
              <label className="font-semibold text-slate-700">
                Model
                <input
                  value={editingAsset.model}
                  onChange={(e) => setEditingAsset({ ...editingAsset, model: e.target.value })}
                  className="mt-1 w-full px-3 py-1.5 border border-slate-200 rounded-lg"
                />
              </label>
              <label className="font-semibold text-slate-700">
                Purchase Cost (₹)
                <input
                  type="number"
                  value={editingAsset.purchaseCost}
                  onChange={(e) => setEditingAsset({ ...editingAsset, purchaseCost: Number(e.target.value) })}
                  className="mt-1 w-full px-3 py-1.5 border border-slate-200 rounded-lg"
                />
              </label>
              <label className="font-semibold text-slate-700">
                Warranty / Expiry
                <input
                  type="date"
                  value={editingAsset.warrantyExpiryDate}
                  onChange={(e) => setEditingAsset({ ...editingAsset, warrantyExpiryDate: e.target.value })}
                  className="mt-1 w-full px-3 py-1.5 border border-slate-200 rounded-lg"
                />
              </label>
              <label className="font-semibold text-slate-700 col-span-2">
                Lifecycle Status
                <select
                  value={editingAsset.status}
                  onChange={(e) => setEditingAsset({ ...editingAsset, status: e.target.value as any })}
                  className="mt-1 w-full px-3 py-1.5 border border-slate-200 rounded-lg bg-white"
                >
                  <option value="Available">Available</option>
                  <option value="Allocated">Allocated</option>
                  <option value="Returned">Returned</option>
                  <option value="Under Maintenance">Under Maintenance</option>
                  <option value="Retired">Retired</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </label>
            </div>
            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditingAsset(null)}
                className="px-3 py-1.5 border border-slate-200 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-indigo-600 text-white font-semibold rounded-lg"
              >
                Save Changes
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Register Modal */}
      <RegisterAssetModal
        isOpen={isRegisterModalOpen}
        onClose={() => setIsRegisterModalOpen(false)}
      />

      {/* Allocate Modal */}
      <AllocateAssetModal
        asset={allocatingAsset}
        isOpen={!!allocatingAsset}
        onClose={() => setAllocatingAsset(null)}
      />

      {/* Return Asset Modal */}
      {returningAsset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4 text-xs">
            <h4 className="text-base font-bold text-slate-900">Process Asset Return</h4>
            <p className="text-slate-600">
              Returning <span className="font-semibold text-slate-800">{returningAsset.name}</span> ({returningAsset.assetTag}).
            </p>
            <div>
              <label className="block text-slate-600 font-medium mb-1">Inspected Return Condition *</label>
              <select
                value={returnCondition}
                onChange={(e) => setReturnCondition(e.target.value as any)}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg"
              >
                <option value="Good">Good (Working fine, normal wear)</option>
                <option value="Fair">Fair (Minor cosmetic blemishes)</option>
                <option value="Minor Scratches">Minor Scratches</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-600 font-medium mb-1">Return Notes / Reason</label>
              <textarea
                value={returnNotes}
                onChange={(e) => setReturnNotes(e.target.value)}
                placeholder="e.g. Employee hardware upgrade to M3 Pro or role transition"
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg"
                rows={2}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setReturningAsset(null)}
                className="px-3 py-1.5 text-slate-700 bg-white border border-slate-200 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleReturnConfirm}
                className="px-4 py-1.5 font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg"
              >
                Confirm Return & Stock Available
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk CSV Import Assets */}
      <CsvImportModal<Asset>
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        title="Bulk Import Hardware & Digital Assets"
        description="Upload or paste asset inventory rows with unique Asset Tag and Serial Number."
        templateFileName="Orbyx_Asset_Import_Template"
        headers={['AssetTag', 'Name', 'Category', 'Brand', 'Model', 'SerialNumber', 'PurchaseCost']}
        sampleRows={[
          ['ORBYX-LAP-099', 'MacBook Pro 14 M3', 'Laptop', 'Apple', 'M3 Pro 18GB', 'C02X9988ZZ', '185000']
        ]}
        validateRow={(cols, idx) => {
          const [assetTag, name, category, brand, model, serialNumber, purchaseCost] = cols;
          if (!assetTag || !name || !serialNumber) {
            return { valid: false, error: 'AssetTag, Name, and SerialNumber are required' };
          }
          if (allAssets.some((a) => a.assetTag.toLowerCase() === assetTag.toLowerCase())) {
            return { valid: false, error: `Asset Tag "${assetTag}" already exists` };
          }
          return {
            valid: true,
            data: {
              id: `AST-IMP-${Date.now()}-${idx}`,
              assetTag,
              name,
              category: (category as any) || 'Laptop',
              brand: brand || 'Generic',
              model: model || 'Standard',
              serialNumber,
              purchaseDate: '2026-10-01',
              warrantyExpiryDate: '2029-10-01',
              purchaseCost: Number(purchaseCost) || 50000,
              supplier: 'Orbyx Approved IT Vendor',
              location: 'Bengaluru HQ',
              status: 'Available',
              isActive: true,
              condition: 'Good',
              acknowledgedByEmployee: false
            }
          };
        }}
        onCommit={(validItems) => {
          validItems.forEach((asset) => db.saveAsset(asset));
        }}
      />
    </div>
  );
};
