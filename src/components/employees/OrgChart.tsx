import React, { useState, useEffect } from 'react';
import { db, subscribeToDB } from '../../db/storage';
import { Employee, CompanyProfile } from '../../types/hrms';
import { useAuth } from '../../services/authContext';
import { hrmsService } from '../../services/hrmsService';
import {
  Users,
  ChevronRight,
  ChevronDown,
  GitFork,
  CheckCircle2,
  AlertCircle,
  Edit3,
  Landmark,
  ShieldCheck
} from 'lucide-react';

interface OrgChartProps {
  onSelectEmployee: (emp: Employee) => void;
}

export const OrgChart: React.FC<OrgChartProps> = ({ onSelectEmployee }) => {
  const { currentUser } = useAuth();
  const isHR = currentUser.role === 'hr_admin';
  const isMD = currentUser.role === 'senior_manager';
  const canConfigureGovernance = isHR || isMD;

  const [employees, setEmployees] = useState<Employee[]>(() => db.getEmployees());
  const [companyProfile, setCompanyProfile] = useState<CompanyProfile>(() => db.getCompanyProfile());
  const departments = db.getDepartments();
  const designations = db.getDesignations();

  useEffect(() => {
    return subscribeToDB(() => {
      setEmployees(db.getEmployees());
      setCompanyProfile(db.getCompanyProfile());
    });
  }, []);

  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());
  const [reassigningEmp, setReassigningEmp] = useState<Employee | null>(null);
  const [targetManagerId, setTargetManagerId] = useState<string>('');
  const [reassignError, setReassignError] = useState<string>('');
  const [reassignSuccess, setReassignSuccess] = useState<string>('');

  // Optional Governance Oversight modal for MD
  const [showGovernanceModal, setShowGovernanceModal] = useState(false);
  const [govMode, setGovMode] = useState<'None' | 'Chairman' | 'Board of Directors'>(
    companyProfile.governanceMode || 'None'
  );
  const [govName, setGovName] = useState(companyProfile.governanceAuthorityName || '');
  const [govTitle, setGovTitle] = useState(companyProfile.governanceAuthorityTitle || '');

  // Root leaders (no reporting manager or reports to self / EMP-001)
  const rootLeaders = employees.filter(
    (e) => !e.reportingManagerId || e.reportingManagerId === e.id || e.id === 'EMP-001'
  );

  const getDirectReports = (empId: string) => {
    return employees.filter((e) => e.reportingManagerId === empId && e.id !== empId);
  };

  // Helper to check if `candidateManagerId` is a descendant of `empId` (prevents circular hierarchy)
  const isDescendantOf = (candidateManagerId: string, empId: string): boolean => {
    const visited = new Set<string>();
    const queue = [empId];
    while (queue.length > 0) {
      const curr = queue.shift()!;
      if (curr === candidateManagerId) return true;
      if (visited.has(curr)) continue;
      visited.add(curr);
      const children = getDirectReports(curr);
      children.forEach((c) => queue.push(c.id));
    }
    return false;
  };

  const toggleNodeCollapse = (empId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const next = new Set(collapsedIds);
    if (next.has(empId)) next.delete(empId);
    else next.add(empId);
    setCollapsedIds(next);
  };

  const handleSaveGovernance = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canConfigureGovernance) return;
    const updated = db.updateCompanyProfile({
      governanceMode: govMode,
      governanceAuthorityName: govMode === 'None' ? '' : govName.trim(),
      governanceAuthorityTitle:
        govMode === 'None'
          ? ''
          : govTitle.trim() || (govMode === 'Chairman' ? 'Executive Chairman' : 'Corporate Board of Directors')
    });
    setCompanyProfile(updated);
    db.logAudit({
      actorUserId: currentUser.id,
      actorName: currentUser.name,
      actorRole: currentUser.role,
      action: 'UPDATE',
      module: 'EMPLOYEE',
      entityId: 'EMP-001',
      entityName: 'MD Governance Oversight',
      description:
        govMode === 'None'
          ? 'Configured Managing Director (EMP-001) at top of operational hierarchy (no external Chairman/Board configured)'
          : `Configured MD governance oversight under ${govMode}: ${govName.trim() || govMode}`
    });
    setShowGovernanceModal(false);
    setReassignSuccess(
      govMode === 'None'
        ? 'Managing Director is set at the top of the operational hierarchy.'
        : `MD governance oversight relationship updated (${govMode}: ${govName.trim() || govMode}).`
    );
    window.setTimeout(() => setReassignSuccess(''), 4000);
  };

  const handleReassignSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reassigningEmp || !isHR) return;

    if (targetManagerId === reassigningEmp.id) {
      setReassignError('Validation blocked: An employee cannot be assigned as their own reporting manager.');
      return;
    }

    if (targetManagerId && isDescendantOf(targetManagerId, reassigningEmp.id)) {
      setReassignError(
        'Circular reporting detected: Cannot assign a direct or indirect reportee as this employee’s reporting manager.'
      );
      return;
    }

    const updated: Employee = {
      ...reassigningEmp,
      reportingManagerId: targetManagerId || undefined
    };
    hrmsService.updateEmployee(updated, currentUser.id, currentUser.name);
    setEmployees(db.getEmployees());
    setReassigningEmp(null);
    setReassignError('');
    setReassignSuccess(
      `Updated reporting line for ${updated.firstName} ${updated.lastName} (${updated.id}).`
    );
    window.setTimeout(() => setReassignSuccess(''), 4000);
  };

  const hasConfiguredGovernance =
    companyProfile.governanceMode &&
    companyProfile.governanceMode !== 'None' &&
    Boolean(companyProfile.governanceAuthorityName || companyProfile.governanceMode);

  const renderNode = (emp: Employee, depth = 0) => {
    const reports = getDirectReports(emp.id);
    const desig = designations.find((d) => d.id === emp.designationId);
    const dept = departments.find((d) => d.id === emp.departmentId);
    const isCollapsed = collapsedIds.has(emp.id);
    const isTopMD = emp.id === 'EMP-001';

    return (
      <div key={emp.id} className="relative pl-6 pb-4">
        {depth > 0 && (
          <div className="absolute left-0 top-6 w-5 h-px bg-slate-300" />
        )}
        {reports.length > 0 && depth > 0 && (
          <div className="absolute left-0 top-0 bottom-0 w-px bg-slate-200" />
        )}

        <div
          onClick={() => onSelectEmployee(emp)}
          className={`inline-flex items-center gap-3 p-3 bg-white rounded-xl border shadow-xs hover:border-indigo-400 hover:shadow-sm cursor-pointer transition-all min-w-80 group ${
            isTopMD ? 'border-indigo-300 ring-1 ring-indigo-100' : 'border-slate-200'
          }`}
        >
          <img
            src={
              emp.avatarUrl ||
              `https://ui-avatars.com/api/?name=${encodeURIComponent(
                `${emp.firstName} ${emp.lastName}`
              )}&background=4f46e5&color=fff&size=256`
            }
            alt={emp.firstName}
            className="h-10 w-10 rounded-full object-cover ring-1 ring-slate-200 shrink-0"
          />
          <div className="flex-1 min-w-0 text-xs">
            <div className="flex items-center justify-between gap-2">
              <span className="font-bold text-slate-900 truncate">
                {emp.firstName} {emp.lastName}
              </span>
              <span className="text-[10px] font-mono text-slate-400">{emp.id}</span>
            </div>
            <p className="text-[11px] text-slate-600 truncate mt-0.5">{desig?.title || 'Staff'}</p>
            {isTopMD && (
              <p className="text-[10px] font-medium text-indigo-700 mt-0.5">
                {hasConfiguredGovernance
                  ? `Governance Oversight: ${companyProfile.governanceAuthorityName || companyProfile.governanceMode} (${companyProfile.governanceMode})`
                  : 'Top of Operational Hierarchy'}
              </p>
            )}
            <div className="mt-1 flex items-center justify-between gap-2 text-[10px] text-slate-400">
              <span>{dept?.name}</span>
              <div className="flex items-center gap-1.5">
                {isTopMD && canConfigureGovernance && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setGovMode(companyProfile.governanceMode || 'None');
                      setGovName(companyProfile.governanceAuthorityName || '');
                      setGovTitle(companyProfile.governanceAuthorityTitle || '');
                      setShowGovernanceModal(true);
                    }}
                    className="px-1.5 py-0.5 rounded bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold inline-flex items-center gap-0.5"
                    title="Configure MD Governance Oversight (Chairman / Board of Directors)"
                  >
                    <Landmark className="h-2.5 w-2.5" />
                    <span>Governance</span>
                  </button>
                )}
                {isHR && emp.id !== 'EMP-001' && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setReassigningEmp(emp);
                      setTargetManagerId(emp.reportingManagerId || 'EMP-001');
                      setReassignError('');
                    }}
                    className="px-1.5 py-0.5 rounded bg-slate-100 hover:bg-indigo-50 text-slate-600 hover:text-indigo-700 font-semibold inline-flex items-center gap-0.5"
                    title="Change Reporting Manager"
                  >
                    <Edit3 className="h-2.5 w-2.5" />
                    <span>Manager</span>
                  </button>
                )}
                {reports.length > 0 && (
                  <button
                    type="button"
                    onClick={(e) => toggleNodeCollapse(emp.id, e)}
                    className="px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 font-semibold inline-flex items-center gap-0.5 hover:bg-indigo-100"
                  >
                    {isCollapsed ? (
                      <ChevronRight className="h-3 w-3" />
                    ) : (
                      <ChevronDown className="h-3 w-3" />
                    )}
                    <span>
                      {reports.length} report{reports.length > 1 ? 's' : ''}
                    </span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {reports.length > 0 && !isCollapsed && (
          <div className="mt-3 pl-6 border-l border-slate-200 space-y-2">
            {reports.map((report) => renderNode(report, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
      <div className="pb-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <GitFork className="h-4 w-4 text-indigo-600" />
            <span>Organization Reporting Hierarchy</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Interactive operational reporting tree with circular-reporting protection and optional MD Board/Chairman governance oversight.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {canConfigureGovernance && (
            <button
              type="button"
              onClick={() => {
                setGovMode(companyProfile.governanceMode || 'None');
                setGovName(companyProfile.governanceAuthorityName || '');
                setGovTitle(companyProfile.governanceAuthorityTitle || '');
                setShowGovernanceModal(true);
              }}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-semibold"
            >
              <Landmark className="h-3.5 w-3.5" />
              <span>
                {hasConfiguredGovernance
                  ? `MD Oversight: ${companyProfile.governanceMode}`
                  : 'Configure MD Governance Oversight'}
              </span>
            </button>
          )}
          <button
            type="button"
            onClick={() => setCollapsedIds(new Set())}
            className="px-2.5 py-1 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 font-medium"
          >
            Expand All
          </button>
          <button
            type="button"
            onClick={() => setCollapsedIds(new Set(employees.map((e) => e.id)))}
            className="px-2.5 py-1 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 font-medium"
          >
            Collapse Branches
          </button>
          <span className="text-slate-500 flex items-center gap-1.5 ml-2">
            <Users className="h-4 w-4 text-indigo-600" />
            <span>{employees.length} Staff</span>
          </span>
        </div>
      </div>

      {reassignSuccess && (
        <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{reassignSuccess}</span>
        </div>
      )}

      <div className="overflow-x-auto py-2">
        {/* Optional Governance Oversight Node (Only rendered when explicitly configured) */}
        {hasConfiguredGovernance && (
          <div className="pl-6 mb-3">
            <div className="inline-flex items-center gap-3 p-3.5 rounded-xl border-2 border-dashed border-amber-300 bg-amber-50/60 min-w-80">
              <div className="h-10 w-10 rounded-xl bg-amber-600 text-white flex items-center justify-center shrink-0">
                <Landmark className="h-5 w-5" />
              </div>
              <div className="text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300">
                    Governance Oversight ({companyProfile.governanceMode})
                  </span>
                </div>
                <p className="font-bold text-slate-900 mt-1">
                  {companyProfile.governanceAuthorityName || companyProfile.governanceMode}
                </p>
                <p className="text-[11px] text-slate-600">
                  {companyProfile.governanceAuthorityTitle ||
                    (companyProfile.governanceMode === 'Chairman'
                      ? 'Chairman of the Board (Non-Operational Governance Authority)'
                      : 'Board of Directors (Corporate Governance Oversight)')}
                </p>
              </div>
            </div>
            <div className="ml-8 h-5 border-l-2 border-dashed border-amber-400 pl-2 flex items-center">
              <span className="text-[10px] font-semibold text-amber-800">
                Governance Oversight Line &darr;
              </span>
            </div>
          </div>
        )}

        {rootLeaders.map((leader) => renderNode(leader, 0))}
      </div>

      {/* Configure MD Governance Oversight Modal */}
      {showGovernanceModal && canConfigureGovernance && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <form
            onSubmit={handleSaveGovernance}
            className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4 text-xs"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-indigo-600" />
                <span>MD Governance & Board Oversight</span>
              </h4>
              <button
                type="button"
                onClick={() => setShowGovernanceModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <p className="text-slate-600 leading-relaxed">
              Configure how the Managing Director (EMP-001) is positioned at the top of the hierarchy. Governance oversight is distinguished from ordinary employee operational reporting.
            </p>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Governance Oversight Mode
              </label>
              <select
                value={govMode}
                onChange={(e) => setGovMode(e.target.value as any)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white"
              >
                <option value="None">None — MD is at the top of the operational hierarchy</option>
                <option value="Chairman">Chairman — MD reports to / is overseen by a Chairman</option>
                <option value="Board of Directors">Board of Directors — MD is overseen by the Board</option>
              </select>
            </div>

            {govMode !== 'None' && (
              <div className="space-y-3 pt-1">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    {govMode === 'Chairman' ? 'Chairman Name *' : 'Board / Designated Authority Name *'}
                  </label>
                  <input
                    required
                    value={govName}
                    onChange={(e) => setGovName(e.target.value)}
                    placeholder={
                      govMode === 'Chairman'
                        ? 'e.g. Mr. R. Sundaram (Chairman)'
                        : 'e.g. Orbyx Corporate Board of Directors'
                    }
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Governance Role / Title
                  </label>
                  <input
                    value={govTitle}
                    onChange={(e) => setGovTitle(e.target.value)}
                    placeholder={
                      govMode === 'Chairman'
                        ? 'Chairman & Non-Executive Governance Head'
                        : 'Statutory Board of Directors'
                    }
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white"
                  />
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowGovernanceModal(false)}
                className="px-3 py-1.5 border border-slate-200 rounded-lg text-slate-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg"
              >
                Save Governance Structure
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Reassign Reporting Manager Modal with Circular Hierarchy Guard */}
      {reassigningEmp && isHR && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <form
            onSubmit={handleReassignSubmit}
            className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4 text-xs"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <h4 className="text-sm font-bold text-slate-900">
                Change Reporting Manager: {reassigningEmp.firstName} {reassigningEmp.lastName}
              </h4>
              <button
                type="button"
                onClick={() => setReassigningEmp(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            {reassignError && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 font-medium flex items-start gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{reassignError}</span>
              </div>
            )}

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Select New Reporting Manager
              </label>
              <select
                value={targetManagerId}
                onChange={(e) => {
                  setTargetManagerId(e.target.value);
                  setReassignError('');
                }}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white"
              >
                {employees.map((m) => {
                  const isSelf = m.id === reassigningEmp.id;
                  const isSubordinate = isDescendantOf(m.id, reassigningEmp.id);
                  return (
                    <option key={m.id} value={m.id}>
                      {m.firstName} {m.lastName} ({m.id})
                      {isSelf ? ' — [Self - Blocked]' : isSubordinate ? ' — [Subordinate - Circular Blocked]' : ''}
                    </option>
                  );
                })}
              </select>
              <p className="text-[11px] text-slate-400 mt-1.5">
                Self-reporting and circular manager-reportee loops are automatically validated and blocked.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setReassigningEmp(null)}
                className="px-3 py-1.5 border border-slate-200 rounded-lg text-slate-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg"
              >
                Update Reporting Line
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
