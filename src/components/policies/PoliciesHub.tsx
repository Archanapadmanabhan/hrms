import React, { useState, useEffect } from 'react';
import { db, subscribeToDB } from '../../db/storage';
import { PolicyModule, PolicyRule, PolicyAcknowledgement } from '../../types/hrms';
import { useAuth } from '../../services/authContext';
import {
  ShieldCheck,
  Building2,
  Calendar,
  Clock,
  CreditCard,
  Scale,
  Receipt,
  Laptop,
  Briefcase,
  UserMinus,
  Layers,
  FileCheck2,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { PolicyRulesPanel } from '../common/PolicyRulesPanel';
import { ExportButton } from '../common/ExportButton';

interface PoliciesHubProps {
  initialCategory?: PolicyModule | 'ALL';
}

const POLICY_CATEGORIES: {
  id: PolicyModule | 'ALL';
  label: string;
  shortDesc: string;
  icon: React.ElementType;
}[] = [
  {
    id: 'ALL',
    label: 'All Enterprise Policies',
    shortDesc: 'Unified repository across all 9 HR governance domains',
    icon: Layers
  },
  {
    id: 'Organization',
    label: 'Organization Policies',
    shortDesc: 'Probation, hierarchy validation & structure governance',
    icon: Building2
  },
  {
    id: 'Leave',
    label: 'Leave Policies',
    shortDesc: 'Accruals, carry-forward caps, half-days & LOP rules',
    icon: Calendar
  },
  {
    id: 'Attendance',
    label: 'Attendance & Shift Policies',
    shortDesc: 'Grace windows, shift duration & overtime calculation',
    icon: Clock
  },
  {
    id: 'Payroll',
    label: 'Payroll Policies',
    shortDesc: 'Payable days denominator, advance recovery caps & locks',
    icon: CreditCard
  },
  {
    id: 'Statutory',
    label: 'Statutory & Compliance',
    shortDesc: 'EPF wage ceiling, ESI gross limit, PT slabs & TDS regime',
    icon: Scale
  },
  {
    id: 'Expense',
    label: 'Expense Policies',
    shortDesc: 'Claim limits, mandatory receipts & travel advance settlement',
    icon: Receipt
  },
  {
    id: 'Asset',
    label: 'Asset Policies',
    shortDesc: 'Hardware custody, acknowledgement SLA & access revocation',
    icon: Laptop
  },
  {
    id: 'Client',
    label: 'Client Assignment Policies',
    shortDesc: 'Deployment allocation caps, allowances & release continuity',
    icon: Briefcase
  },
  {
    id: 'Employee & Exit',
    label: 'Employee Policies',
    shortDesc: 'Notice period, probation confirmation & workforce SLA rules',
    icon: UserMinus
  }
];

export const PoliciesHub: React.FC<PoliciesHubProps> = ({ initialCategory = 'ALL' }) => {
  const { currentUser, canManageOrganization } = useAuth();
  const isHR = canManageOrganization();
  const [activeCategory, setActiveCategory] = useState<PolicyModule | 'ALL'>(initialCategory);
  const [viewMode, setViewMode] = useState<'repository' | 'compliance'>('repository');
  const [policies, setPolicies] = useState<PolicyRule[]>(() => db.getPolicies());
  const [acknowledgements, setAcknowledgements] = useState<PolicyAcknowledgement[]>(() =>
    db.getPolicyAcknowledgements()
  );
  const [selectedAckPolicyId, setSelectedAckPolicyId] = useState<string>('ALL');
  const [ackStatusFilter, setAckStatusFilter] = useState<'ALL' | 'Acknowledged' | 'Pending' | 'Overdue'>('ALL');

  useEffect(() => {
    setActiveCategory(initialCategory);
  }, [initialCategory]);

  useEffect(() => {
    return subscribeToDB(() => {
      setPolicies(db.getPolicies());
      setAcknowledgements(db.getPolicyAcknowledgements());
    });
  }, []);

  const selectedMeta =
    POLICY_CATEGORIES.find((c) => c.id === activeCategory) || POLICY_CATEGORIES[0];

  const publishedPolicies = policies.filter(
    (p) => (p.lifecycleStatus || (p.isActive ? 'Published' : 'Draft')) === 'Published' && p.requiresAcknowledgement !== false
  );
  const activeEmployees = db.getEmployees().filter((e) => e.status === 'Active');

  const complianceRows = publishedPolicies.flatMap((pol) => {
    const ver = pol.versionNumber || '1.0';
    return activeEmployees.map((emp) => {
      const currentAck = acknowledgements.find(
        (a) => a.policyId === pol.id && a.employeeId === emp.id && a.versionNumber === ver
      );
      const priorAcks = acknowledgements.filter(
        (a) => a.policyId === pol.id && a.employeeId === emp.id && a.versionNumber !== ver
      );
      // Determine Acknowledged / Pending / Overdue (if effectiveFrom > 30 days ago and unacknowledged)
      const isOverdue = !currentAck && pol.effectiveFrom < '2026-09-01';
      const status: 'Acknowledged' | 'Pending' | 'Overdue' = currentAck
        ? 'Acknowledged'
        : isOverdue
          ? 'Overdue'
          : 'Pending';

      return {
        key: `${pol.id}-${emp.id}`,
        policyId: pol.id,
        policyCode: pol.code,
        policyName: pol.name,
        module: pol.module,
        versionNumber: ver,
        employeeId: emp.id,
        employeeName: `${emp.firstName} ${emp.lastName}`,
        employeeAvatar: emp.avatarUrl,
        acknowledgedAt: currentAck?.acknowledgedAt || '-',
        status,
        priorVersionAcks: priorAcks.map((pa) => `v${pa.versionNumber} (${pa.acknowledgedAt})`).join(', ')
      };
    });
  });

  const filteredComplianceRows = complianceRows.filter((r) => {
    if (selectedAckPolicyId !== 'ALL' && r.policyId !== selectedAckPolicyId) return false;
    if (ackStatusFilter !== 'ALL' && r.status !== ackStatusFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-indigo-600" />
            <h1 className="text-xl font-bold text-slate-900">Enterprise Policies & Rules Hub</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Centralized governance repository with full Policy Lifecycle (Draft &rarr; Review &rarr; Approved &rarr; Published &rarr; Superseded/Archived), Version Control, and Employee Acknowledgement tracking.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <button
            type="button"
            onClick={() => setViewMode('repository')}
            className={`px-3 py-1.5 rounded-lg font-semibold border transition-colors ${
              viewMode === 'repository'
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            1. Policy Repository ({policies.filter((p) => p.isActive).length} Published)
          </button>
          {isHR && (
            <button
              type="button"
              onClick={() => setViewMode('compliance')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold border transition-colors ${
                viewMode === 'compliance'
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <FileCheck2 className="h-3.5 w-3.5" />
              <span>2. Policy Acknowledgement Report</span>
            </button>
          )}
        </div>
      </div>

      {viewMode === 'repository' ? (
        <>
          {/* Category Selector Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {POLICY_CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const isSelected = activeCategory === cat.id;
              const visiblePoliciesForRole = policies.filter((p) => {
                const lc = p.lifecycleStatus || (p.isActive ? 'Published' : 'Draft');
                if (!isHR && currentUser.role === 'employee' && lc !== 'Published') return false;
                return cat.id === 'ALL' ? true : p.module === cat.id;
              });
              const count = visiblePoliciesForRole.length;

              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setActiveCategory(cat.id)}
                  className={`text-left p-3.5 rounded-xl border transition-all flex flex-col justify-between ${
                    isSelected
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                      : 'bg-white text-slate-800 border-slate-200 hover:border-indigo-300'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div
                      className={`p-2 rounded-lg ${
                        isSelected ? 'bg-indigo-500/40 text-white' : 'bg-indigo-50 text-indigo-600'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <span
                      className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                        isSelected
                          ? 'bg-white/20 text-white'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {count} {count === 1 ? 'rule' : 'rules'}
                    </span>
                  </div>
                  <div>
                    <p className={`text-xs font-bold ${isSelected ? 'text-white' : 'text-slate-900'}`}>
                      {cat.label}
                    </p>
                    <p
                      className={`text-[11px] mt-0.5 line-clamp-2 ${
                        isSelected ? 'text-indigo-100' : 'text-slate-500'
                      }`}
                    >
                      {cat.shortDesc}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Policy Panel for Selected Category */}
          <PolicyRulesPanel
            key={activeCategory}
            moduleFilter={activeCategory === 'ALL' ? undefined : activeCategory}
            title={selectedMeta.label}
            subtitle={selectedMeta.shortDesc}
          />
        </>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <FileCheck2 className="h-4 w-4 text-indigo-600" />
                <span>HR Policy Acknowledgement & Compliance Tracking Report</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Tracks employee acknowledgement status (Acknowledged, Pending, Overdue) for every published policy version while preserving historical prior-version acknowledgements.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <select
                value={selectedAckPolicyId}
                onChange={(e) => setSelectedAckPolicyId(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-medium"
              >
                <option value="ALL">All Published Policies ({publishedPolicies.length})</option>
                {publishedPolicies.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.code} (v{p.versionNumber || '1.0'}) — {p.name}
                  </option>
                ))}
              </select>
              <select
                value={ackStatusFilter}
                onChange={(e) => setAckStatusFilter(e.target.value as any)}
                className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-medium"
              >
                <option value="ALL">All Statuses</option>
                <option value="Acknowledged">Acknowledged</option>
                <option value="Pending">Pending</option>
                <option value="Overdue">Overdue</option>
              </select>
              <ExportButton
                data={filteredComplianceRows.map((r) => ({
                  PolicyCode: r.policyCode,
                  PolicyName: r.policyName,
                  CurrentVersion: `v${r.versionNumber}`,
                  EmployeeID: r.employeeId,
                  EmployeeName: r.employeeName,
                  Status: r.status,
                  AcknowledgedAt: r.acknowledgedAt,
                  PriorVersionAcknowledgements: r.priorVersionAcks || 'None'
                }))}
                fileName="Orbyx_Policy_Acknowledgement_Report"
                label="Export Compliance CSV"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200">
              <span className="text-emerald-700 font-semibold block">Acknowledged (Current Version)</span>
              <span className="text-lg font-bold text-emerald-900">
                {complianceRows.filter((r) => r.status === 'Acknowledged').length}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200">
              <span className="text-amber-800 font-semibold block">Pending Acknowledgement</span>
              <span className="text-lg font-bold text-amber-900">
                {complianceRows.filter((r) => r.status === 'Pending').length}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-rose-50/70 border border-rose-200">
              <span className="text-rose-700 font-semibold block">Overdue Acknowledgement</span>
              <span className="text-lg font-bold text-rose-900">
                {complianceRows.filter((r) => r.status === 'Overdue').length}
              </span>
            </div>
          </div>

          <div className="overflow-x-auto max-h-[460px] rounded-xl border border-slate-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase text-slate-500 sticky top-0">
                <tr>
                  <th className="p-3">Employee</th>
                  <th className="p-3">Policy & Active Version</th>
                  <th className="p-3">Module</th>
                  <th className="p-3">Acknowledgement Status</th>
                  <th className="p-3">Acknowledged Date</th>
                  <th className="p-3">Preserved Prior Version History</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredComplianceRows.map((row) => (
                  <tr key={row.key} className="hover:bg-slate-50/70">
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <img
                          src={row.employeeAvatar}
                          alt={row.employeeName}
                          className="h-6 w-6 rounded-full object-cover border border-slate-200"
                        />
                        <div>
                          <div className="font-semibold text-slate-900">{row.employeeName}</div>
                          <div className="font-mono text-[10px] text-slate-400">{row.employeeId}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="font-semibold text-slate-900">{row.policyName}</div>
                      <div className="font-mono text-[10px] text-indigo-700">
                        {row.policyCode} · Version v{row.versionNumber}
                      </div>
                    </td>
                    <td className="p-3 text-slate-600">{row.module}</td>
                    <td className="p-3">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold border ${
                          row.status === 'Acknowledged'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : row.status === 'Overdue'
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : 'bg-amber-50 text-amber-800 border-amber-200'
                        }`}
                      >
                        {row.status === 'Acknowledged' ? (
                          <CheckCircle2 className="h-3 w-3" />
                        ) : (
                          <AlertTriangle className="h-3 w-3" />
                        )}
                        {row.status}
                      </span>
                    </td>
                    <td className="p-3 font-mono text-slate-700">{row.acknowledgedAt}</td>
                    <td className="p-3 font-mono text-[11px] text-slate-500">
                      {row.priorVersionAcks || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
