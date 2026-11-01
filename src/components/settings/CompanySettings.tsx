import React, { useState, useEffect } from 'react';
import { db, resetToSeedData, subscribeToDB } from '../../db/storage';
import { useAuth } from '../../services/authContext';
import {
  AuditLog,
  CurrentUser,
  NavigationContext,
  DelegationRecord,
  DelegableAction
} from '../../types/hrms';
import { DataTable, Column } from '../common/DataTable';
import { ExportButton } from '../common/ExportButton';
import { PolicyRulesPanel } from '../common/PolicyRulesPanel';
import {
  Users,
  Sliders,
  History,
  Check,
  ShieldAlert,
  ShieldCheck,
  BookOpen,
  RotateCcw,
  KeyRound,
  Plus,
  XCircle
} from 'lucide-react';
import { SecurityTestRunner } from './SecurityTestRunner';

interface CompanySettingsProps {
  navContext?: NavigationContext;
}

const DELEGABLE_ACTIONS_LIST: { id: DelegableAction; label: string }[] = [
  { id: 'APPROVE_LEAVE', label: 'Approve Leave Requests' },
  { id: 'APPROVE_ATTENDANCE', label: 'Approve Attendance & Outage Recovery' },
  { id: 'APPROVE_PAYROLL', label: 'Approve & Lock Payroll Runs' },
  { id: 'APPROVE_EXPENSE', label: 'Approve Expense & Advance Claims' },
  { id: 'APPROVE_POLICY', label: 'Executive Approve Policies' },
  { id: 'MANAGE_ORGANIZATION', label: 'Manage Organization & Governance' },
  { id: 'FINAL_SETTLEMENT_SIGNOFF', label: 'Full & Final Settlement Sign-off' }
];

export const CompanySettings: React.FC<CompanySettingsProps> = ({ navContext }) => {
  const { currentUser, canManageOrganization, allPersonas } = useAuth();
  const availableUsers: CurrentUser[] = allPersonas;
  const [activeTab, setActiveTab] = useState<
    'users_rbac' | 'delegations' | 'preferences' | 'policies' | 'audit' | 'security_audit'
  >(() => {
    if (navContext?.subTab === 'audit') return 'audit';
    if (navContext?.subTab === 'delegations') return 'delegations';
    if (navContext?.subTab === 'preferences') return 'preferences';
    if (navContext?.subTab === 'policies') return 'policies';
    if (navContext?.subTab === 'security_audit') return 'security_audit';
    return 'users_rbac';
  });

  const [saveSuccess, setSaveSuccess] = useState('');
  const [auditModuleFilter, setAuditModuleFilter] = useState('ALL');
  const [delegations, setDelegations] = useState<DelegationRecord[]>(() => db.getDelegations());
  const [showCreateDelegation, setShowCreateDelegation] = useState(false);
  const [delError, setDelError] = useState('');
  const [delForm, setDelForm] = useState({
    delegatorUserId: 'user_md_selvakumar',
    delegateUserId: 'user_hr_admin',
    permittedActions: ['APPROVE_LEAVE', 'APPROVE_ATTENDANCE', 'APPROVE_POLICY'] as DelegableAction[],
    effectiveFrom: new Date().toISOString().slice(0, 10),
    effectiveTo: '2026-12-31',
    reason: ''
  });

  useEffect(() => {
    return subscribeToDB(() => {
      setDelegations(db.getDelegations());
    });
  }, []);

  const [sysPrefs, setSysPrefs] = useState(() => {
    try {
      const raw = localStorage.getItem('orbyx_hrms_sys_prefs_v1');
      if (raw) return JSON.parse(raw);
    } catch {}
    return {
      dateFormat: 'YYYY-MM-DD (ISO 8601)',
      timeZone: 'Asia/Kolkata (IST UTC+05:30)',
      sessionTimeoutMinutes: 60,
      emailNotificationsEnabled: true,
      inAppNotificationsEnabled: true,
      strictSelfApprovalBlock: true,
      requireAuditReasonForPayrollReopen: true,
      autoArchiveSeparatedEmployeeDays: 365
    };
  });

  const auditLogs = db.getAuditLogs();
  const visibleAuditLogs =
    auditModuleFilter === 'ALL'
      ? auditLogs
      : auditLogs.filter((l) => l.module === auditModuleFilter);

  if (!canManageOrganization()) {
    return (
      <div className="p-8 text-center bg-white rounded-xl border border-slate-200">
        <ShieldAlert className="h-8 w-8 text-rose-600 mx-auto mb-2" />
        <h3 className="text-base font-bold text-slate-900">Access Restricted</h3>
        <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
          System administration, role permission matrices, and audit streams are strictly restricted to HR Administrators and Executive Governance.
        </p>
      </div>
    );
  }

  const handleCreateDelegation = (e: React.FormEvent) => {
    e.preventDefault();
    setDelError('');
    if (delForm.delegatorUserId === delForm.delegateUserId) {
      setDelError('Self-delegation is blocked: Delegator and Delegate must be different accounts.');
      return;
    }
    if (delForm.permittedActions.length === 0) {
      setDelError('Select at least one permitted action scope.');
      return;
    }
    if (!delForm.reason.trim()) {
      setDelError('A mandatory governance reason is required to grant delegated executive authority.');
      return;
    }

    const delegator = availableUsers.find((u) => u.id === delForm.delegatorUserId);
    const delegate = availableUsers.find((u) => u.id === delForm.delegateUserId);
    if (!delegator || !delegate) return;

    const record: DelegationRecord = {
      id: `DEL-${Date.now().toString().slice(-4)}`,
      delegatorUserId: delegator.id,
      delegatorName: delegator.name,
      delegatorRole: delegator.role,
      delegateUserId: delegate.id,
      delegateName: delegate.name,
      delegateRole: delegate.role,
      permittedActions: delForm.permittedActions,
      applicableModules: ['LEAVE', 'ATTENDANCE', 'PAYROLL', 'EXPENSE', 'SYSTEM', 'EMPLOYEE'],
      effectiveFrom: delForm.effectiveFrom,
      effectiveTo: delForm.effectiveTo,
      reason: delForm.reason.trim(),
      status: 'Active',
      createdAt: new Date().toISOString().slice(0, 10),
      createdBy: `${currentUser.name} (${currentUser.role})`
    };

    db.saveDelegation(record);
    db.logAudit({
      actorUserId: currentUser.id,
      actorName: currentUser.name,
      actorRole: currentUser.role,
      action: 'CREATE',
      module: 'SYSTEM',
      entityId: record.id,
      entityName: `${delegator.name} -> ${delegate.name}`,
      description: `Granted delegated authority (${record.id}) from ${delegator.name} to ${delegate.name} (${record.effectiveFrom} to ${record.effectiveTo}). Reason: ${record.reason}`
    });
    setDelegations(db.getDelegations());
    setShowCreateDelegation(false);
    setSaveSuccess(`Delegation ${record.id} granted to ${delegate.name}.`);
    setTimeout(() => setSaveSuccess(''), 3500);
  };

  const handleRevokeDelegation = (del: DelegationRecord) => {
    const todayIso = new Date().toISOString().slice(0, 10);
    const updated: DelegationRecord = {
      ...del,
      status: 'Revoked',
      revokedAt: todayIso,
      revokedBy: `${currentUser.name} (${currentUser.role})`
    };
    db.saveDelegation(updated);
    db.logAudit({
      actorUserId: currentUser.id,
      actorName: currentUser.name,
      actorRole: currentUser.role,
      action: 'UPDATE',
      module: 'SYSTEM',
      entityId: del.id,
      entityName: `${del.delegatorName} -> ${del.delegateName}`,
      description: `Revoked delegated authority ${del.id} (${del.delegatorName} -> ${del.delegateName})`
    });
    setDelegations(db.getDelegations());
    setSaveSuccess(`Delegation ${del.id} revoked immediately.`);
    setTimeout(() => setSaveSuccess(''), 3500);
  };

  const handleSavePreferences = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('orbyx_hrms_sys_prefs_v1', JSON.stringify(sysPrefs));
    db.logAudit({
      actorUserId: currentUser.id,
      actorName: currentUser.name,
      actorRole: currentUser.role,
      action: 'UPDATE',
      module: 'SYSTEM',
      entityId: 'SYS-PREFS',
      entityName: 'System Preferences',
      description: 'Updated application-wide notification, security, and localization preferences'
    });
    setSaveSuccess('System preferences saved.');
    setTimeout(() => setSaveSuccess(''), 3000);
  };

  const handleResetDemoData = () => {
    resetToSeedData();
    setSaveSuccess('System database restored to clean factory seed state.');
    setTimeout(() => setSaveSuccess(''), 3500);
  };

  const auditColumns: Column<AuditLog>[] = [
    {
      header: 'Timestamp',
      accessorKey: 'timestamp',
      sortable: true,
      cell: (log) => (
        <span className="font-mono text-slate-600 text-xs">
          {new Date(log.timestamp).toLocaleString()}
        </span>
      )
    },
    {
      header: 'Actual Actor & Delegated Context',
      accessorKey: 'actorName',
      sortable: true,
      cell: (log) => (
        <div>
          <span className="font-semibold text-slate-900">{log.actorName}</span>
          <span className="text-[10px] text-slate-400 block font-mono">Role: {log.actorRole}</span>
          {log.representedUserName && (
            <span className="mt-0.5 inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-50 border border-amber-200 text-amber-900 font-semibold text-[10px]">
              Acting on Behalf of: {log.representedUserName} ({log.delegationId})
            </span>
          )}
        </div>
      )
    },
    {
      header: 'Action',
      accessorKey: 'action',
      sortable: true,
      cell: (log) => (
        <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded">
          {log.action}
        </span>
      )
    },
    {
      header: 'Module',
      accessorKey: 'module',
      sortable: true,
      cell: (log) => <span className="font-semibold text-slate-700">{log.module}</span>
    },
    {
      header: 'Description',
      accessorKey: 'description',
      cell: (log) => (
        <div>
          <span className="text-slate-800">{log.description}</span>
          {log.entityName && (
            <span className="text-slate-400 block text-[11px]">Target: {log.entityName}</span>
          )}
        </div>
      )
    }
  ];

  const exportAudit = visibleAuditLogs.map((l) => ({
    Timestamp: l.timestamp,
    ActualActor: l.actorName,
    ActorRole: l.actorRole,
    RepresentedPerson: l.representedUserName || 'Self',
    DelegationID: l.delegationId || '-',
    Action: l.action,
    Module: l.module,
    Entity: l.entityName,
    Description: l.description
  }));

  return (
    <div className="space-y-6">
      {/* System Settings Header */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-indigo-600">
            System Administration
          </p>
          <h2 className="text-lg font-bold text-slate-900">System Settings & Access Governance</h2>
          <p className="text-xs text-slate-500">
            Manage separate Founder, MD, Super Admin, Admin, HR, Manager, and Employee identities, controlled executive delegation, and tamper-evident audit logs.
          </p>
        </div>
        {saveSuccess && (
          <span className="text-emerald-700 text-xs font-semibold flex items-center gap-1 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
            <Check className="h-3.5 w-3.5" /> {saveSuccess}
          </span>
        )}
      </div>

      {/* Settings Navigation */}
      <div className="flex flex-wrap items-center gap-1 bg-white p-2 rounded-xl border border-slate-200">
        <button
          onClick={() => setActiveTab('users_rbac')}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors ${
            activeTab === 'users_rbac'
              ? 'bg-indigo-600 text-white'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Users className="h-4 w-4" />
          <span>Users & Role Permission Matrix</span>
        </button>
        <button
          onClick={() => setActiveTab('delegations')}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors ${
            activeTab === 'delegations'
              ? 'bg-indigo-600 text-white'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <KeyRound className="h-4 w-4" />
          <span>Delegated Authority (MD & Founder)</span>
        </button>
        <button
          onClick={() => setActiveTab('preferences')}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors ${
            activeTab === 'preferences'
              ? 'bg-indigo-600 text-white'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Sliders className="h-4 w-4" />
          <span>Application & Notification Defaults</span>
        </button>
        <button
          onClick={() => setActiveTab('policies')}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors ${
            activeTab === 'policies'
              ? 'bg-indigo-600 text-white'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <BookOpen className="h-4 w-4" />
          <span>Master Policy Hub</span>
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors ${
            activeTab === 'audit'
              ? 'bg-indigo-600 text-white'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <History className="h-4 w-4" />
          <span>System Audit Log ({auditLogs.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('security_audit')}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors ${
            activeTab === 'security_audit'
              ? 'bg-indigo-600 text-white shadow-2xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <ShieldCheck className="h-4 w-4" />
          <span>Security & Privacy Audit (10 Tests)</span>
        </button>
      </div>

      {/* Tab 1: Users & RBAC Matrix */}
      {activeTab === 'users_rbac' && (
        <div className="space-y-5 text-xs">
          <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Provisioned System Accounts ({availableUsers.length})</h3>
                <p className="text-slate-500 text-[11px]">
                  Separate accounts for Managing Director (MD), HR Admin, Reporting Manager, and Employees. Synchronized live with Employee records.
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-semibold">
                Prototype Mode: Top-Right Persona Switcher Active · Production Mode: OIDC/SSO + MFA
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-[11px] uppercase text-slate-500">
                    <th className="p-2.5">User / Identity</th>
                    <th className="p-2.5">Official Email</th>
                    <th className="p-2.5">Designation</th>
                    <th className="p-2.5">Assigned System Role</th>
                    <th className="p-2.5">Account Classification & Scope</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {availableUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50">
                      <td className="p-2.5 font-semibold text-slate-900 flex items-center gap-2">
                        <img src={u.avatarUrl} alt="" className="h-7 w-7 rounded-full object-cover" />
                        <div>
                          <span>{u.name}</span>
                          <span className="block text-[10px] font-mono text-slate-400">{u.employeeId}</span>
                        </div>
                      </td>
                      <td className="p-2.5 font-mono text-slate-600">{u.email}</td>
                      <td className="p-2.5 text-slate-700">{u.designationTitle}</td>
                      <td className="p-2.5">
                        <span className="px-2 py-0.5 rounded font-mono text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                          {u.role}
                        </span>
                      </td>
                      <td className="p-2.5 text-slate-600">
                        {u.role === 'senior_manager'
                          ? 'Managing Director (MD) — Executive Oversight & Final Approvals'
                          : u.role === 'hr_admin'
                            ? 'Full Organization, Policy & Confidential Payroll'
                            : u.role === 'reporting_manager'
                              ? 'Direct Reports + Self-Service'
                              : 'Self-Service + Public Colleague Contact Card'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
            <h3 className="text-sm font-bold text-slate-900">Role-Based Access Control (RBAC) Capability Matrix</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-[11px] uppercase text-slate-500">
                    <th className="p-2.5">Capability / Module</th>
                    <th className="p-2.5">Senior Management (MD)</th>
                    <th className="p-2.5">HR Admin</th>
                    <th className="p-2.5">Reporting Manager</th>
                    <th className="p-2.5">Employee</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {[
                    ['Executive Oversight & Approvals', 'Full Oversight & Approvals', 'Configure & Audit', 'Read-Only', 'Read-Only'],
                    ['Organization & Statutory Setup', 'Approve & View All', 'Full Configure', 'Restricted', 'Restricted'],
                    ['Employee Directory & Profiles', 'Executive View', 'Full Access (Inc. Salary)', 'Direct Reports + Basic Dir', 'Self Full + Basic Colleague Card'],
                    ['Leave & Outage Attendance Approvals', 'Executive / Escalated (No Self)', 'All Employees (No Self)', 'Direct Reports (No Self)', 'Self Apply Only'],
                    ['Payroll Processing & Structures', 'Executive Sign-off & Summary', 'Process, Lock, Reopen, Disburse', 'Own Payslip Only', 'Own Payslip Only'],
                    ['Centralized Policy Lifecycle', 'Approve & Publish Policies', 'Draft, Submit, Publish & Track', 'Read & Acknowledge', 'Read Published & Acknowledge'],
                    ['Delegation of Authority', 'Grant / Revoke Own Authority', 'Administer & Act When Delegated', 'Act When Delegated', 'No Delegation Rights']
                  ].map(([cap, exec, hr, mgr, emp], i) => (
                    <tr key={i}>
                      <td className="p-2.5 font-semibold text-slate-900">{cap}</td>
                      <td className="p-2.5 text-amber-800 font-semibold">{exec}</td>
                      <td className="p-2.5 text-emerald-700 font-semibold">{hr}</td>
                      <td className="p-2.5 text-slate-700">{mgr}</td>
                      <td className="p-2.5 text-slate-600">{emp}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Delegated Authority (MD) */}
      {activeTab === 'delegations' && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-amber-600" />
                <span>Controlled Executive Delegation (Acting on Behalf of MD)</span>
              </h3>
              <p className="text-slate-500 mt-0.5">
                Instead of sharing credentials, grant time-bound, scope-restricted delegated authority. Every action taken under delegation logs both the actual actor and the represented executive in the Audit Log.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setDelError('');
                setShowCreateDelegation(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Grant New Delegation</span>
            </button>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase text-slate-500">
                <tr>
                  <th className="p-3">Delegation ID</th>
                  <th className="p-3">Represented Executive (Delegator)</th>
                  <th className="p-3">Authorized Delegate (Actor)</th>
                  <th className="p-3">Permitted Actions Scope</th>
                  <th className="p-3">Effective Window</th>
                  <th className="p-3">Governance Reason</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {delegations.map((del) => (
                  <tr key={del.id} className="hover:bg-slate-50/70">
                    <td className="p-3 font-mono font-bold text-indigo-700">{del.id}</td>
                    <td className="p-3">
                      <div className="font-semibold text-slate-900">{del.delegatorName}</div>
                      <div className="font-mono text-[10px] text-amber-700 uppercase">{del.delegatorRole}</div>
                    </td>
                    <td className="p-3">
                      <div className="font-semibold text-slate-900">{del.delegateName}</div>
                      <div className="font-mono text-[10px] text-slate-500 uppercase">{del.delegateRole}</div>
                    </td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {del.permittedActions.map((act) => (
                          <span
                            key={act}
                            className="px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 font-mono text-[10px]"
                          >
                            {act}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="p-3 font-mono text-[11px] text-slate-700">
                      {del.effectiveFrom} &rarr; {del.effectiveTo}
                    </td>
                    <td className="p-3 text-slate-600 max-w-xs">{del.reason}</td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                          del.status === 'Active'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}
                      >
                        {del.status}
                      </span>
                      {del.revokedAt && (
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          Revoked {del.revokedAt}
                        </div>
                      )}
                    </td>
                    <td className="p-3 text-right">
                      {del.status === 'Active' ? (
                        <button
                          type="button"
                          onClick={() => handleRevokeDelegation(del)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-semibold text-[11px]"
                        >
                          <XCircle className="h-3 w-3" /> Revoke
                        </button>
                      ) : (
                        <span className="text-[10px] text-slate-400">Inactive</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {showCreateDelegation && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
              <form
                onSubmit={handleCreateDelegation}
                className="bg-white rounded-xl max-w-lg w-full p-6 shadow-xl border border-slate-200 space-y-3 text-xs"
              >
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                  <h4 className="text-base font-bold text-slate-900">
                    Grant Time-Bound Executive Delegation
                  </h4>
                  <button
                    type="button"
                    onClick={() => setShowCreateDelegation(false)}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    ✕
                  </button>
                </div>

                {delError && (
                  <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 font-medium">
                    {delError}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <label className="block font-semibold text-slate-700">
                    Represented Executive (Delegator) *
                    <select
                      value={delForm.delegatorUserId}
                      onChange={(e) => setDelForm({ ...delForm, delegatorUserId: e.target.value })}
                      className="w-full mt-1 px-3 py-1.5 border border-slate-200 rounded-lg bg-white"
                    >
                      {availableUsers
                        .filter((u) => u.role === 'founder' || u.role === 'senior_manager')
                        .map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.name} ({u.designationTitle})
                          </option>
                        ))}
                    </select>
                  </label>
                  <label className="block font-semibold text-slate-700">
                    Authorized Delegate (Actor) *
                    <select
                      value={delForm.delegateUserId}
                      onChange={(e) => setDelForm({ ...delForm, delegateUserId: e.target.value })}
                      className="w-full mt-1 px-3 py-1.5 border border-slate-200 rounded-lg bg-white"
                    >
                      {availableUsers
                        .filter((u) => u.role !== 'employee')
                        .map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.name} ({u.role})
                          </option>
                        ))}
                    </select>
                  </label>
                  <label className="block font-semibold text-slate-700">
                    Effective From *
                    <input
                      type="date"
                      required
                      value={delForm.effectiveFrom}
                      onChange={(e) => setDelForm({ ...delForm, effectiveFrom: e.target.value })}
                      className="w-full mt-1 px-3 py-1.5 border border-slate-200 rounded-lg bg-white font-mono"
                    />
                  </label>
                  <label className="block font-semibold text-slate-700">
                    Effective To (Expiry) *
                    <input
                      type="date"
                      required
                      value={delForm.effectiveTo}
                      onChange={(e) => setDelForm({ ...delForm, effectiveTo: e.target.value })}
                      className="w-full mt-1 px-3 py-1.5 border border-slate-200 rounded-lg bg-white font-mono"
                    />
                  </label>
                </div>

                <div>
                  <span className="block font-semibold text-slate-700 mb-1.5">Permitted Actions Scope *</span>
                  <div className="grid grid-cols-2 gap-1.5 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                    {DELEGABLE_ACTIONS_LIST.map((item) => {
                      const checked = delForm.permittedActions.includes(item.id);
                      return (
                        <label key={item.id} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => {
                              const next = e.target.checked
                                ? [...delForm.permittedActions, item.id]
                                : delForm.permittedActions.filter((x) => x !== item.id);
                              setDelForm({ ...delForm, permittedActions: next });
                            }}
                            className="h-3.5 w-3.5 rounded border-slate-300 text-indigo-600"
                          />
                          <span className="text-[11px] text-slate-800">{item.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <label className="block font-semibold text-slate-700">
                  Governance Reason / Authorization Note *
                  <textarea
                    rows={2}
                    required
                    value={delForm.reason}
                    onChange={(e) => setDelForm({ ...delForm, reason: e.target.value })}
                    placeholder="e.g. Authorized to approve urgent policies and payroll runs during MD international summit travel..."
                    className="w-full mt-1 px-3 py-1.5 border border-slate-200 rounded-lg bg-white"
                  />
                </label>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowCreateDelegation(false)}
                    className="px-4 py-1.5 border border-slate-200 rounded-lg text-slate-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg"
                  >
                    Grant Delegation
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Application & Notification Preferences */}
      {activeTab === 'preferences' && (
        <form onSubmit={handleSavePreferences} className="bg-white rounded-xl border border-slate-200 p-6 space-y-5 text-xs">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Application, Security & Notification Defaults</h3>
              <p className="text-slate-500 text-[11px]">Configure global workflow behavior, notification channels, and environment maintenance</p>
            </div>
            <button
              type="button"
              onClick={handleResetDemoData}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg font-semibold"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Reset Local Storage to Factory Seed</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="block">
              <span className="font-semibold text-slate-700 block mb-1">System Date Format</span>
              <select
                value={sysPrefs.dateFormat}
                onChange={(e) => setSysPrefs({ ...sysPrefs, dateFormat: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white"
              >
                <option value="YYYY-MM-DD (ISO 8601)">YYYY-MM-DD (ISO 8601)</option>
                <option value="DD-MM-YYYY (India Standard)">DD-MM-YYYY (India Standard)</option>
              </select>
            </label>
            <label className="block">
              <span className="font-semibold text-slate-700 block mb-1">Default Time Zone</span>
              <input
                value={sysPrefs.timeZone}
                onChange={(e) => setSysPrefs({ ...sysPrefs, timeZone: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white"
              />
            </label>
          </div>

          <div className="space-y-2.5 pt-2 border-t border-slate-100">
            <label className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-200 cursor-pointer">
              <div>
                <span className="font-semibold text-slate-900 block">In-App Workflow Notifications</span>
                <span className="text-[11px] text-slate-500">Deliver real-time alerts for leave approvals, payslip release, and asset custody</span>
              </div>
              <input
                type="checkbox"
                checked={sysPrefs.inAppNotificationsEnabled}
                onChange={(e) => setSysPrefs({ ...sysPrefs, inAppNotificationsEnabled: e.target.checked })}
                className="h-4 w-4 rounded border-slate-300 text-indigo-600"
              />
            </label>
            <label className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-200 cursor-pointer">
              <div>
                <span className="font-semibold text-slate-900 block">Enforce Strict Self-Approval Prohibition</span>
                <span className="text-[11px] text-slate-500">Block users from approving their own leave, attendance correction, or expense claims</span>
              </div>
              <input
                type="checkbox"
                checked={sysPrefs.strictSelfApprovalBlock}
                onChange={(e) => setSysPrefs({ ...sysPrefs, strictSelfApprovalBlock: e.target.checked })}
                className="h-4 w-4 rounded border-slate-300 text-indigo-600"
              />
            </label>
            <label className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-200 cursor-pointer">
              <div>
                <span className="font-semibold text-slate-900 block">Require Audit Reason for Reopening Finalized Payroll</span>
                <span className="text-[11px] text-slate-500">Mandate a logged compliance reason whenever a locked payroll run is reopened for adjustment</span>
              </div>
              <input
                type="checkbox"
                checked={sysPrefs.requireAuditReasonForPayrollReopen}
                onChange={(e) => setSysPrefs({ ...sysPrefs, requireAuditReasonForPayrollReopen: e.target.checked })}
                className="h-4 w-4 rounded border-slate-300 text-indigo-600"
              />
            </label>
          </div>

          <div className="flex justify-end pt-3 border-t border-slate-100">
            <button
              type="submit"
              className="px-4 py-2 font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-2xs transition-colors"
            >
              Save System Preferences
            </button>
          </div>
        </form>
      )}

      {/* Tab 4: Master Policy Hub */}
      {activeTab === 'policies' && (
        <PolicyRulesPanel
          title="Enterprise Master Policy & Governance Hub"
          subtitle="Centralized rule administration across Organization, Leave, Attendance, Payroll, Expenses, Assets, and Client Deployments."
        />
      )}

      {/* Tab 5: Audit Log */}
      {activeTab === 'audit' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Append-Only Audit Stream (with Delegated Attribution)</h3>
              <p className="text-xs text-slate-500">
                Tamper-evident logs recording both the actual logged-in actor and any represented executive / delegation ID
              </p>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={auditModuleFilter}
                onChange={(e) => setAuditModuleFilter(e.target.value)}
                className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
              >
                <option value="ALL">All Modules</option>
                <option value="EMPLOYEE">Employee</option>
                <option value="LEAVE">Leave</option>
                <option value="ATTENDANCE">Attendance</option>
                <option value="PAYROLL">Payroll</option>
                <option value="EXPENSE">Expense</option>
                <option value="ASSET">Asset</option>
                <option value="SYSTEM">System</option>
              </select>
              <ExportButton data={exportAudit} fileName="Orbyx_System_Audit_Log" />
            </div>
          </div>

          <DataTable
            data={visibleAuditLogs}
            columns={auditColumns}
            searchPlaceholder="Filter audit records by actor, represented executive, action, or module..."
          />
        </div>
      )}

      {/* Tab 6: Security & Privacy Audit */}
      {activeTab === 'security_audit' && <SecurityTestRunner />}
    </div>
  );
};
