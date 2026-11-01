import React, { useState, useEffect } from 'react';
import { db, subscribeToDB } from '../../db/storage';
import { PolicyLifecycleStatus, PolicyModule, PolicyRule } from '../../types/hrms';
import { useAuth } from '../../services/authContext';
import {
  ShieldCheck,
  Plus,
  Search,
  Edit3,
  Power,
  Eye,
  Calendar,
  Users,
  CheckCircle2,
  AlertTriangle,
  History,
  FileCheck2
} from 'lucide-react';

interface PolicyRulesPanelProps {
  moduleFilter?: PolicyModule;
  title?: string;
  subtitle?: string;
}

export const PolicyRulesPanel: React.FC<PolicyRulesPanelProps> = ({
  moduleFilter,
  title = 'Policy & Rules Configuration',
  subtitle = 'Configure active operational rules, effective dates, lifecycle states, and employee acknowledgements.'
}) => {
  const { currentUser, canManageOrganization } = useAuth();
  const isHR = canManageOrganization();
  const canViewDrafts = isHR || currentUser.role === 'senior_manager';

  const [policies, setPolicies] = useState<PolicyRule[]>(() => db.getPolicies());
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedModule, setSelectedModule] = useState<string>(moduleFilter || 'ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'Active' | 'Inactive'>('ALL');
  const [lifecycleFilter, setLifecycleFilter] = useState<'ALL' | PolicyLifecycleStatus>('ALL');

  const [editingPolicy, setEditingPolicy] = useState<PolicyRule | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [viewingPolicy, setViewingPolicy] = useState<PolicyRule | null>(null);
  const [confirmTogglePolicy, setConfirmTogglePolicy] = useState<PolicyRule | null>(null);
  const [feedback, setFeedback] = useState('');

  // Form state for Add/Edit
  const [formCode, setFormCode] = useState('');
  const [formName, setFormName] = useState('');
  const [formModule, setFormModule] = useState<PolicyModule>(moduleFilter || 'Leave');
  const [formDesc, setFormDesc] = useState('');
  const [formRulesSummary, setFormRulesSummary] = useState('');
  const [formEffectiveFrom, setFormEffectiveFrom] = useState('2026-01-01');
  const [formEffectiveTo, setFormEffectiveTo] = useState('');
  const [formApplicableTo, setFormApplicableTo] = useState('All Active Employees');
  const [formVersion, setFormVersion] = useState('v1.0');
  const [formLifecycle, setFormLifecycle] = useState<PolicyLifecycleStatus>('Published');
  const [formIsActive, setFormIsActive] = useState(true);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    return subscribeToDB(() => {
      setPolicies(db.getPolicies());
    });
  }, []);

  const refresh = (msg?: string) => {
    setPolicies(db.getPolicies());
    if (msg) {
      setFeedback(msg);
      window.setTimeout(() => setFeedback(''), 3000);
    }
  };

  const openCreateModal = () => {
    setEditingPolicy(null);
    setIsCreating(true);
    setFormCode(`${(moduleFilter || 'POL').slice(0, 3).toUpperCase()}-RULE-${Date.now().toString().slice(-3)}`);
    setFormName('');
    setFormModule(moduleFilter || 'Leave');
    setFormDesc('');
    setFormRulesSummary('');
    setFormEffectiveFrom(new Date().toISOString().slice(0, 10));
    setFormEffectiveTo('');
    setFormApplicableTo('All Active Employees');
    setFormVersion('v1.0');
    setFormLifecycle('Published');
    setFormIsActive(true);
    setFormError('');
  };

  const openEditModal = (pol: PolicyRule) => {
    setIsCreating(false);
    setEditingPolicy(pol);
    setFormCode(pol.code);
    setFormName(pol.name);
    setFormModule(pol.module);
    setFormDesc(pol.description);
    setFormRulesSummary(pol.rulesSummary);
    setFormEffectiveFrom(pol.effectiveFrom);
    setFormEffectiveTo(pol.effectiveTo || '');
    setFormApplicableTo(pol.applicableTo);
    // Suggest incremented minor version when editing
    const currVer = pol.version || 'v1.0';
    const match = currVer.match(/^v?(\d+)\.(\d+)$/);
    const nextVer = match ? `v${match[1]}.${Number(match[2]) + 1}` : currVer;
    setFormVersion(nextVer);
    setFormLifecycle(pol.lifecycleStatus || (pol.isActive ? 'Published' : 'Archived'));
    setFormIsActive(pol.isActive);
    setFormError('');
  };

  const handleSavePolicy = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formCode.trim() || !formRulesSummary.trim()) {
      setFormError('Policy name, unique code, and rules summary are required.');
      return;
    }

    const duplicateCode = policies.some(
      (p) =>
        p.code.toLowerCase() === formCode.trim().toLowerCase() &&
        p.id !== editingPolicy?.id
    );
    if (duplicateCode) {
      setFormError(`Policy code "${formCode.trim()}" is already in use.`);
      return;
    }

    const prevHistory = editingPolicy?.versionHistory || [];
    const nextHistory =
      editingPolicy &&
      (editingPolicy.rulesSummary !== formRulesSummary.trim() ||
        editingPolicy.version !== formVersion.trim())
        ? [
            {
              version: editingPolicy.version || 'v1.0',
              effectiveFrom: editingPolicy.effectiveFrom,
              updatedAt: editingPolicy.updatedAt,
              updatedBy: editingPolicy.updatedBy,
              rulesSummary: editingPolicy.rulesSummary
            },
            ...prevHistory
          ]
        : prevHistory;

    const saved: PolicyRule = {
      id: editingPolicy?.id || `POL-${Date.now()}`,
      code: formCode.trim().toUpperCase(),
      name: formName.trim(),
      module: moduleFilter || formModule,
      description: formDesc.trim(),
      rulesSummary: formRulesSummary.trim(),
      parameters: editingPolicy?.parameters || {},
      effectiveFrom: formEffectiveFrom,
      effectiveTo: formEffectiveTo || undefined,
      applicableTo: formApplicableTo.trim() || 'All Employees',
      version: formVersion.trim() || 'v1.0',
      lifecycleStatus: formLifecycle,
      isActive: formLifecycle === 'Archived' ? false : formIsActive,
      updatedAt: new Date().toISOString().slice(0, 10),
      updatedBy: currentUser.name,
      versionHistory: nextHistory,
      acknowledgements: editingPolicy?.acknowledgements || []
    };

    db.savePolicy(saved);
    db.logAudit({
      actorUserId: currentUser.id,
      actorName: currentUser.name,
      actorRole: currentUser.role,
      action: editingPolicy ? 'UPDATE' : 'CREATE',
      module: 'SYSTEM',
      entityId: saved.id,
      entityName: saved.code,
      description: `${editingPolicy ? 'Updated' : 'Created'} policy ${saved.name} (${saved.code}, ${saved.version}, ${saved.lifecycleStatus})`
    });

    setEditingPolicy(null);
    setIsCreating(false);
    refresh(`Policy "${saved.name}" (${saved.version}) saved as ${saved.lifecycleStatus}.`);
  };

  const handleAcknowledgePolicy = (pol: PolicyRule) => {
    const ver = pol.version || 'v1.0';
    const existingAcks = pol.acknowledgements || [];
    if (
      existingAcks.some(
        (a) => a.employeeId === currentUser.employeeId && a.version === ver
      )
    ) {
      return;
    }
    const nextAck = {
      employeeId: currentUser.employeeId,
      employeeName: currentUser.name,
      version: ver,
      acknowledgedAt: new Date().toISOString().slice(0, 10)
    };
    const updated: PolicyRule = {
      ...pol,
      acknowledgements: [nextAck, ...existingAcks]
    };
    db.savePolicy(updated);
    if (viewingPolicy?.id === pol.id) {
      setViewingPolicy(updated);
    }
    db.logAudit({
      actorUserId: currentUser.id,
      actorName: currentUser.name,
      actorRole: currentUser.role,
      action: 'UPDATE',
      module: 'SYSTEM',
      entityId: pol.id,
      entityName: pol.code,
      description: `Employee ${currentUser.name} (${currentUser.employeeId}) acknowledged policy ${pol.code} (${ver})`
    });
    refresh(`Acknowledged ${pol.name} (${ver}).`);
  };

  const handleConfirmToggle = () => {
    if (!confirmTogglePolicy) return;
    const nextActive = !confirmTogglePolicy.isActive;
    const updated: PolicyRule = {
      ...confirmTogglePolicy,
      isActive: nextActive,
      lifecycleStatus: nextActive ? 'Published' : 'Archived',
      updatedAt: new Date().toISOString().slice(0, 10),
      updatedBy: currentUser.name
    };
    db.savePolicy(updated);
    db.logAudit({
      actorUserId: currentUser.id,
      actorName: currentUser.name,
      actorRole: currentUser.role,
      action: 'UPDATE',
      module: 'SYSTEM',
      entityId: updated.id,
      entityName: updated.code,
      description: `${updated.isActive ? 'Activated' : 'Deactivated'} policy ${updated.name}`
    });
    setConfirmTogglePolicy(null);
    refresh(`Policy "${updated.name}" marked ${updated.isActive ? 'Active' : 'Inactive'}.`);
  };

  const filteredPolicies = policies.filter((p) => {
    const lifecycle = p.lifecycleStatus || (p.isActive ? 'Published' : 'Archived');
    // Role-based access: Regular employees only see Published policies
    if (!canViewDrafts && lifecycle !== 'Published') return false;
    if (moduleFilter && p.module !== moduleFilter) return false;
    if (!moduleFilter && selectedModule !== 'ALL' && p.module !== selectedModule) return false;
    if (statusFilter === 'Active' && !p.isActive) return false;
    if (statusFilter === 'Inactive' && p.isActive) return false;
    if (lifecycleFilter !== 'ALL' && lifecycle !== lifecycleFilter) return false;
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      return (
        p.name.toLowerCase().includes(q) ||
        p.code.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.rulesSummary.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div>
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-indigo-600" />
            <span>{title}</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
        </div>
        <div className="flex items-center gap-2">
          {feedback && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-semibold">
              <CheckCircle2 className="h-3.5 w-3.5" />
              {feedback}
            </span>
          )}
          {isHR && (
            <button
              type="button"
              onClick={openCreateModal}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add New Policy</span>
            </button>
          )}
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search policies by name, code, or rule parameters..."
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:bg-white focus:border-indigo-400"
          />
        </div>

        {!moduleFilter && (
          <select
            value={selectedModule}
            onChange={(e) => setSelectedModule(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700"
          >
            <option value="ALL">All Modules</option>
            <option value="Organization">Organization Policies</option>
            <option value="Leave">Leave Policies</option>
            <option value="Attendance">Attendance & Shift Policies</option>
            <option value="Payroll">Payroll Policies</option>
            <option value="Statutory">Statutory & Compliance Policies</option>
            <option value="Expense">Expense Policies</option>
            <option value="Asset">Asset Policies</option>
            <option value="Client">Client Assignment Policies</option>
            <option value="Employee & Exit">Employee & Exit Policies</option>
          </select>
        )}

        {canViewDrafts && (
          <select
            value={lifecycleFilter}
            onChange={(e) => setLifecycleFilter(e.target.value as any)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700"
          >
            <option value="ALL">All Lifecycle States</option>
            <option value="Published">Published</option>
            <option value="Approved">Approved</option>
            <option value="Under Review">Under Review</option>
            <option value="Draft">Draft</option>
            <option value="Archived">Archived</option>
          </select>
        )}

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as any)}
          className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700"
        >
          <option value="ALL">All Statuses</option>
          <option value="Active">Active Only</option>
          <option value="Inactive">Inactive Only</option>
        </select>

        {(searchTerm ||
          statusFilter !== 'ALL' ||
          lifecycleFilter !== 'ALL' ||
          (!moduleFilter && selectedModule !== 'ALL')) && (
          <button
            type="button"
            onClick={() => {
              setSearchTerm('');
              setStatusFilter('ALL');
              setLifecycleFilter('ALL');
              if (!moduleFilter) setSelectedModule('ALL');
            }}
            className="px-2.5 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-50 rounded-lg"
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Scrollable Structured Policy List */}
      <div className="max-h-96 overflow-y-auto space-y-2.5 pr-1">
        {filteredPolicies.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl">
            No policies match the selected search or filters.
          </div>
        ) : (
          filteredPolicies.map((pol) => {
            const ver = pol.version || 'v1.0';
            const lifecycle = pol.lifecycleStatus || (pol.isActive ? 'Published' : 'Archived');
            const acks = pol.acknowledgements || [];
            const myAck = acks.find(
              (a) => a.employeeId === currentUser.employeeId && a.version === ver
            );

            return (
              <div
                key={pol.id}
                className={`p-4 rounded-xl border transition-colors ${
                  pol.isActive
                    ? 'bg-white border-slate-200 hover:border-indigo-200'
                    : 'bg-slate-50/70 border-slate-200 opacity-75'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-slate-900 text-sm">{pol.name}</span>
                      <span className="font-mono text-[10px] font-semibold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                        {pol.code}
                      </span>
                      <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                        {ver}
                      </span>
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                        {pol.module}
                      </span>
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                          lifecycle === 'Published'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : lifecycle === 'Draft' || lifecycle === 'Under Review'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : lifecycle === 'Approved'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        {lifecycle}
                      </span>
                      {myAck && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                          <FileCheck2 className="h-3 w-3" /> Acknowledged {myAck.version}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-600">{pol.description}</p>
                    <p className="text-xs font-medium text-slate-800 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-100 mt-1">
                      {pol.rulesSummary}
                    </p>
                    <div className="flex flex-wrap items-center gap-4 pt-1 text-[11px] text-slate-400">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" /> Effective: {pol.effectiveFrom}
                        {pol.effectiveTo ? ` to ${pol.effectiveTo}` : ''}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" /> Scope: {pol.applicableTo}
                      </span>
                      <span>
                        {acks.length} staff acknowledgement(s)
                      </span>
                      <span>Updated {pol.updatedAt} by {pol.updatedBy}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                    {pol.isActive && !myAck && (
                      <button
                        type="button"
                        onClick={() => handleAcknowledgePolicy(pol)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg"
                      >
                        <FileCheck2 className="h-3 w-3" />
                        <span>Acknowledge ({ver})</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setViewingPolicy(pol)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
                    >
                      <Eye className="h-3 w-3" />
                      <span>Details</span>
                    </button>
                    {isHR && (
                      <>
                        <button
                          type="button"
                          onClick={() => openEditModal(pol)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg"
                        >
                          <Edit3 className="h-3 w-3" />
                          <span>Edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmTogglePolicy(pol)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg ${
                            pol.isActive
                              ? 'text-rose-700 bg-rose-50 hover:bg-rose-100'
                              : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                          }`}
                        >
                          <Power className="h-3 w-3" />
                          <span>{pol.isActive ? 'Deactivate' : 'Activate'}</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* View Policy Details Modal */}
      {viewingPolicy && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 shadow-xl border border-slate-200 space-y-4 text-xs">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <h4 className="text-base font-bold text-slate-900">
                  {viewingPolicy.name} ({viewingPolicy.version || 'v1.0'})
                </h4>
                <p className="text-slate-500 font-mono">
                  {viewingPolicy.code} · {viewingPolicy.module} Module ·{' '}
                  {viewingPolicy.lifecycleStatus || (viewingPolicy.isActive ? 'Published' : 'Archived')}
                </p>
              </div>
              <button onClick={() => setViewingPolicy(null)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <div className="space-y-2.5">
              <div>
                <span className="text-slate-400 block">Description:</span>
                <p className="text-slate-800 font-medium">{viewingPolicy.description}</p>
              </div>
              <div>
                <span className="text-slate-400 block">Configured Rules & Parameters:</span>
                <p className="text-slate-900 font-semibold bg-slate-50 p-2.5 rounded-lg border border-slate-200 mt-0.5">
                  {viewingPolicy.rulesSummary}
                </p>
              </div>
              {viewingPolicy.parameters && Object.keys(viewingPolicy.parameters).length > 0 && (
                <div>
                  <span className="text-slate-400 block mb-1">Rule Engine Parameters:</span>
                  <div className="grid grid-cols-2 gap-1.5 bg-indigo-50/40 p-2.5 rounded-lg border border-indigo-100">
                    {Object.entries(viewingPolicy.parameters).map(([k, v]) => (
                      <div key={k} className="flex items-center justify-between bg-white px-2 py-1 rounded border border-slate-100">
                        <span className="text-[11px] text-slate-500 font-mono">{k}</span>
                        <span className="text-[11px] font-bold text-indigo-700 font-mono">{String(v)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div><span className="text-slate-400 block">Effective From:</span><span className="font-mono">{viewingPolicy.effectiveFrom}</span></div>
                <div><span className="text-slate-400 block">Effective To:</span><span className="font-mono">{viewingPolicy.effectiveTo || 'Indefinite'}</span></div>
                <div><span className="text-slate-400 block">Applicable Scope:</span><span>{viewingPolicy.applicableTo}</span></div>
                <div><span className="text-slate-400 block">Lifecycle Status:</span><span className="font-semibold">{viewingPolicy.lifecycleStatus || (viewingPolicy.isActive ? 'Published' : 'Archived')}</span></div>
                <div><span className="text-slate-400 block">Last Updated:</span><span className="font-mono">{viewingPolicy.updatedAt}</span></div>
                <div><span className="text-slate-400 block">Updated By:</span><span>{viewingPolicy.updatedBy}</span></div>
              </div>

              {/* Version History */}
              {viewingPolicy.versionHistory && viewingPolicy.versionHistory.length > 0 && (
                <div className="pt-2 border-t border-slate-100">
                  <span className="text-slate-600 font-semibold flex items-center gap-1 mb-1.5">
                    <History className="h-3.5 w-3.5 text-indigo-600" /> Prior Version History
                  </span>
                  <div className="space-y-1.5 max-h-28 overflow-y-auto">
                    {viewingPolicy.versionHistory.map((vh, idx) => (
                      <div key={idx} className="p-2 rounded-lg bg-slate-50 border border-slate-200">
                        <div className="flex justify-between font-mono text-[10px] text-slate-500">
                          <span className="font-bold text-indigo-700">{vh.version}</span>
                          <span>Effective {vh.effectiveFrom} · Updated {vh.updatedAt} by {vh.updatedBy}</span>
                        </div>
                        <p className="text-[11px] text-slate-700 mt-0.5">{vh.rulesSummary}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Employee Acknowledgements linked to Version */}
              <div className="pt-2 border-t border-slate-100">
                <span className="text-slate-600 font-semibold flex items-center gap-1 mb-1.5">
                  <FileCheck2 className="h-3.5 w-3.5 text-emerald-600" /> Employee Acknowledgements (
                  {(viewingPolicy.acknowledgements || []).length})
                </span>
                {(viewingPolicy.acknowledgements || []).length === 0 ? (
                  <p className="text-[11px] text-slate-400 italic">
                    No employee acknowledgements recorded for this policy yet.
                  </p>
                ) : (
                  <div className="space-y-1 max-h-28 overflow-y-auto">
                    {(viewingPolicy.acknowledgements || []).map((ack, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between px-2.5 py-1.5 rounded bg-emerald-50/60 border border-emerald-100 text-[11px]"
                      >
                        <span className="font-medium text-slate-800">
                          {ack.employeeName} ({ack.employeeId})
                        </span>
                        <span className="font-mono text-emerald-700">
                          {ack.version} · {ack.acknowledgedAt}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              {viewingPolicy.isActive &&
                !(viewingPolicy.acknowledgements || []).some(
                  (a) =>
                    a.employeeId === currentUser.employeeId &&
                    a.version === (viewingPolicy.version || 'v1.0')
                ) && (
                  <button
                    onClick={() => handleAcknowledgePolicy(viewingPolicy)}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg"
                  >
                    Acknowledge {viewingPolicy.version || 'v1.0'}
                  </button>
                )}
              <button
                onClick={() => setViewingPolicy(null)}
                className="px-4 py-1.5 bg-slate-900 text-white font-semibold rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Policy Modal */}
      {(isCreating || editingPolicy) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <form
            onSubmit={handleSavePolicy}
            className="bg-white rounded-xl max-w-lg w-full p-6 shadow-xl border border-slate-200 space-y-3 text-xs"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <h4 className="text-base font-bold text-slate-900">
                {editingPolicy ? `Edit Policy: ${editingPolicy.code}` : 'Create New Policy Rule'}
              </h4>
              <button
                type="button"
                onClick={() => {
                  setEditingPolicy(null);
                  setIsCreating(false);
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 font-medium">
                {formError}
              </div>
            )}

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Policy Code *</label>
                <input
                  type="text"
                  value={formCode}
                  onChange={(e) => setFormCode(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg font-mono uppercase"
                  required
                />
              </div>
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Module *</label>
                <select
                  disabled={!!moduleFilter}
                  value={formModule}
                  onChange={(e) => setFormModule(e.target.value as PolicyModule)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg disabled:bg-slate-50"
                >
                  <option value="Organization">Organization</option>
                  <option value="Leave">Leave</option>
                  <option value="Attendance">Attendance</option>
                  <option value="Payroll">Payroll</option>
                  <option value="Statutory">Statutory</option>
                  <option value="Expense">Expense</option>
                  <option value="Asset">Asset</option>
                  <option value="Client">Client</option>
                  <option value="Employee & Exit">Employee & Exit</option>
                </select>
              </div>
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Version *</label>
                <input
                  type="text"
                  value={formVersion}
                  onChange={(e) => setFormVersion(e.target.value)}
                  placeholder="v1.0"
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg font-mono"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-600 font-semibold mb-1">Policy Name *</label>
              <input
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g. Annual Leave Carry-Forward & Encashment Policy"
                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg"
                required
              />
            </div>

            <div>
              <label className="block text-slate-600 font-semibold mb-1">Short Description</label>
              <input
                type="text"
                value={formDesc}
                onChange={(e) => setFormDesc(e.target.value)}
                placeholder="Brief summary of purpose"
                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-slate-600 font-semibold mb-1">Policy Rules & Parameters *</label>
              <textarea
                rows={2}
                value={formRulesSummary}
                onChange={(e) => setFormRulesSummary(e.target.value)}
                placeholder="Specify concrete thresholds, limits, approval rules, and workflow behavior..."
                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Effective From *</label>
                <input
                  type="date"
                  value={formEffectiveFrom}
                  onChange={(e) => setFormEffectiveFrom(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Effective To (Optional)</label>
                <input
                  type="date"
                  value={formEffectiveTo}
                  onChange={(e) => setFormEffectiveTo(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 items-center">
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Applicable Group</label>
                <input
                  type="text"
                  value={formApplicableTo}
                  onChange={(e) => setFormApplicableTo(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Lifecycle State</label>
                <select
                  value={formLifecycle}
                  onChange={(e) => {
                    const next = e.target.value as PolicyLifecycleStatus;
                    setFormLifecycle(next);
                    setFormIsActive(next === 'Published' || next === 'Approved');
                  }}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg"
                >
                  <option value="Published">Published</option>
                  <option value="Approved">Approved</option>
                  <option value="Under Review">Under Review</option>
                  <option value="Draft">Draft</option>
                  <option value="Archived">Archived</option>
                </select>
              </div>
              <label className="flex items-center gap-2 pt-5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formIsActive}
                  onChange={(e) => setFormIsActive(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600"
                />
                <span className="font-semibold text-slate-700">Active Policy</span>
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setEditingPolicy(null);
                  setIsCreating(false);
                }}
                className="px-4 py-1.5 text-slate-700 bg-white border border-slate-200 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg"
              >
                Save Policy
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Confirm Activate/Deactivate Modal */}
      {confirmTogglePolicy && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4 text-xs">
            <div className="flex items-center gap-2 text-amber-700">
              <AlertTriangle className="h-5 w-5 shrink-0" />
              <h4 className="text-base font-bold text-slate-900">
                {confirmTogglePolicy.isActive ? 'Deactivate Policy?' : 'Activate Policy?'}
              </h4>
            </div>
            <p className="text-slate-600">
              Are you sure you want to {confirmTogglePolicy.isActive ? 'deactivate' : 'activate'}{' '}
              <span className="font-semibold text-slate-900">{confirmTogglePolicy.name}</span> ({confirmTogglePolicy.code})?
              Historical transactions and processed payroll runs will remain unchanged.
            </p>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setConfirmTogglePolicy(null)}
                className="px-3 py-1.5 text-slate-700 bg-white border border-slate-200 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmToggle}
                className={`px-4 py-1.5 font-semibold text-white rounded-lg ${
                  confirmTogglePolicy.isActive ? 'bg-rose-600 hover:bg-rose-700' : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                Confirm {confirmTogglePolicy.isActive ? 'Deactivate' : 'Activate'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
