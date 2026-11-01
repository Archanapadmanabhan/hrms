import React, { useState, useEffect } from 'react';
import {
  Building2,
  MapPin,
  Layers3,
  Network,
  Plus,
  Save,
  ShieldAlert,
  Eye,
  Edit3,
  Power,
  Search,
  Upload,
  ShieldCheck,
  RotateCcw,
  Scale
} from 'lucide-react';
import { db, subscribeToDB } from '../../db/storage';
import { useAuth } from '../../services/authContext';
import { Branch, CompanyProfile, Department, Designation, StatutoryComplianceConfig } from '../../types/hrms';
import { ExportButton } from '../common/ExportButton';
import { CsvImportModal } from '../common/CsvImportModal';
import { PolicyRulesPanel } from '../common/PolicyRulesPanel';
import { OrgChart } from '../employees/OrgChart';

type Tab = 'profile' | 'statutory' | 'branches' | 'departments' | 'designations' | 'hierarchy';
const inputClass =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 disabled:bg-slate-50 disabled:text-slate-500';
const labelClass = 'mb-1 block text-xs font-semibold text-slate-600';

const DEFAULT_STATUTORY_CONFIG: StatutoryComplianceConfig = {
  epfApplicable: true,
  epfEmployeeRatePercent: 12,
  epfEmployerRatePercent: 12,
  epfWageCeilingMonthly: 15000,
  epfRestrictToWageCeiling: false,
  epfEffectiveFrom: '2026-04-01',
  epfExemptionReason: '',
  esiApplicable: true,
  esiGrossThresholdMonthly: 21000,
  esiEmployeeRatePercent: 0.75,
  esiEmployerRatePercent: 3.25,
  esiEffectiveFrom: '2026-04-01',
  esiExemptionReason: '',
  ptApplicable: true,
  ptStateJurisdiction: 'Karnataka',
  ptMonthlySlabAmount: 200,
  ptMinGrossThreshold: 15000,
  ptEffectiveFrom: '2026-04-01',
  tdsApplicable: true,
  tdsFinancialYear: 'FY 2026-27',
  tdsDefaultRegime: 'New Regime (FY 2026-27)',
  tdsEffectiveFrom: '2026-04-01'
};

interface OrganizationSetupProps {
  onOpenPolicies?: () => void;
}

export const OrganizationSetup: React.FC<OrganizationSetupProps> = ({ onOpenPolicies }) => {
  const { currentUser, canManageOrganization } = useAuth();
  const isHR = canManageOrganization();
  const isSeniorManager = currentUser.role === 'senior_manager';

  const [tab, setTab] = useState<Tab>('profile');
  const [company, setCompany] = useState<CompanyProfile>(() => {
    const prof = db.getCompanyProfile();
    return {
      ...prof,
      registrationNumber: prof.registrationNumber || 'U72900KA2021PTC149821',
      contactEmail: prof.contactEmail || 'hr.operations@orbyx.internal',
      contactPhone: prof.contactPhone || '+91 80 4092 6600',
      statutoryConfig: prof.statutoryConfig || DEFAULT_STATUTORY_CONFIG
    };
  });
  const [branches, setBranches] = useState(() => db.getBranches());
  const [departments, setDepartments] = useState(() => db.getDepartments());
  const [designations, setDesignations] = useState(() => db.getDesignations());
  const [employees, setEmployees] = useState(() => db.getEmployees());
  const [success, setSuccess] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Subscribe to storage updates so changes persist and stay synced across tabs/navigation
  useEffect(() => {
    return subscribeToDB(() => {
      const prof = db.getCompanyProfile();
      setCompany({
        ...prof,
        registrationNumber: prof.registrationNumber || 'U72900KA2021PTC149821',
        contactEmail: prof.contactEmail || 'hr.operations@orbyx.internal',
        contactPhone: prof.contactPhone || '+91 80 4092 6600',
        statutoryConfig: prof.statutoryConfig || DEFAULT_STATUTORY_CONFIG
      });
      setBranches(db.getBranches());
      setDepartments(db.getDepartments());
      setDesignations(db.getDesignations());
      setEmployees(db.getEmployees());
    });
  }, []);

  // Search & Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'Active' | 'Inactive'>('ALL');
  const [deptFilter, setDeptFilter] = useState('ALL');

  // Form states
  const [newName, setNewName] = useState('');
  const [newCode, setNewCode] = useState('');
  const [newCity, setNewCity] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [desigDeptId, setDesigDeptId] = useState(() => db.getDepartments()[0]?.id || 'DEP-ENG');
  const [desigLevel, setDesigLevel] = useState('Mid');

  // Edit modals
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [editingDesig, setEditingDesig] = useState<Designation | null>(null);
  const [showDeptImport, setShowDeptImport] = useState(false);

  if (!isHR && !isSeniorManager) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-white p-10 text-center">
        <ShieldAlert className="mx-auto mb-3 h-9 w-9 text-rose-500" />
        <h2 className="font-bold text-slate-900">Access restricted</h2>
        <p className="mt-1 text-sm text-slate-500">
          Only authorized HR and Senior Management users can access Organization Setup.
        </p>
      </div>
    );
  }

  const notify = (s: string) => {
    setErrorMsg('');
    setSuccess(s);
    window.setTimeout(() => setSuccess(''), 3500);
  };

  const saveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isHR) return;
    if (!company.name.trim() || !company.legalEntity.trim() || !company.taxId.trim()) {
      setErrorMsg('Organization Name, Legal Entity Name, and PAN/Tax ID are required.');
      return;
    }
    db.updateCompanyProfile(company);
    db.logAudit({
      actorUserId: currentUser.id,
      actorName: currentUser.name,
      actorRole: currentUser.role,
      action: 'UPDATE',
      module: 'SYSTEM',
      entityId: company.id,
      entityName: company.name,
      description: 'Updated organization profile and statutory compliance settings'
    });
    notify('Organization profile & statutory configuration saved and persisted.');
  };

  const updateStatConfig = (patch: Partial<StatutoryComplianceConfig>) => {
    const currentStat = company.statutoryConfig || DEFAULT_STATUTORY_CONFIG;
    setCompany({
      ...company,
      statutoryConfig: {
        ...currentStat,
        ...patch
      }
    });
  };

  const addBranch = () => {
    if (!isHR || !newName.trim() || !newCode.trim()) return;
    const b: Branch = {
      id: `BR-${Date.now()}`,
      name: newName.trim(),
      code: newCode.trim().toUpperCase(),
      city: newCity.trim() || 'Bengaluru',
      isHeadquarters: false,
      isActive: true
    };
    db.saveBranch(b);
    setBranches(db.getBranches());
    setNewName('');
    setNewCode('');
    setNewCity('');
    notify('Branch added.');
  };

  const toggleBranchStatus = (b: Branch) => {
    if (!isHR) return;
    const updated: Branch = { ...b, isActive: b.isActive === false ? true : false };
    db.saveBranch(updated);
    setBranches(db.getBranches());
    notify(`Branch "${updated.name}" marked ${updated.isActive ? 'Active' : 'Inactive'}.`);
  };

  const addDepartment = () => {
    if (!isHR || !newName.trim() || !newCode.trim()) return;
    const d: Department = {
      id: `DEP-${Date.now()}`,
      name: newName.trim(),
      code: newCode.trim().toUpperCase(),
      description: newDescription.trim(),
      isActive: true
    };
    db.saveDepartment(d);
    setDepartments(db.getDepartments());
    setNewName('');
    setNewCode('');
    setNewDescription('');
    notify('Department added.');
  };

  const toggleDeptStatus = (d: Department) => {
    if (!isHR) return;
    const updated: Department = { ...d, isActive: d.isActive === false ? true : false };
    db.saveDepartment(updated);
    setDepartments(db.getDepartments());
    notify(`Department "${updated.name}" marked ${updated.isActive ? 'Active' : 'Inactive'}.`);
  };

  const addDesignation = () => {
    if (!isHR || !newName.trim() || !newCode.trim()) return;
    const desig: Designation = {
      id: `DES-${Date.now()}`,
      title: newName.trim(),
      code: newCode.trim().toUpperCase(),
      departmentId: desigDeptId,
      level: desigLevel,
      isActive: true
    };
    db.saveDesignation(desig);
    setDesignations(db.getDesignations());
    setNewName('');
    setNewCode('');
    notify('Designation added.');
  };

  const toggleDesigStatus = (d: Designation) => {
    if (!isHR) return;
    const updated: Designation = { ...d, isActive: d.isActive === false ? true : false };
    db.saveDesignation(updated);
    setDesignations(db.getDesignations());
    notify(`Designation "${updated.title}" marked ${updated.isActive ? 'Active' : 'Inactive'}.`);
  };

  // Check if assigning newManagerId to empId creates a circular reporting loop
  const wouldCreateCycle = (empId: string, candidateManagerId: string): boolean => {
    if (!candidateManagerId) return false;
    if (empId === candidateManagerId) return true;
    let cursorId: string | undefined = candidateManagerId;
    const visited = new Set<string>();
    while (cursorId) {
      if (cursorId === empId) return true;
      if (visited.has(cursorId)) break;
      visited.add(cursorId);
      const mgr = employees.find((e) => e.id === cursorId);
      cursorId = mgr?.reportingManagerId;
    }
    return false;
  };

  const updateReportingManager = (empId: string, newManagerId: string) => {
    if (!isHR) return;
    if (wouldCreateCycle(empId, newManagerId)) {
      setErrorMsg('Invalid reporting line: Circular or self-reporting hierarchy is prohibited.');
      return;
    }
    const emp = db.getEmployeeById(empId);
    if (!emp) return;
    emp.reportingManagerId = newManagerId || undefined;
    db.saveEmployee(emp);
    setEmployees(db.getEmployees());
    notify(`Updated reporting manager for ${emp.firstName} ${emp.lastName}.`);
  };

  // Filtered lists
  const filteredBranches = branches.filter((b) => {
    const active = b.isActive !== false;
    if (statusFilter === 'Active' && !active) return false;
    if (statusFilter === 'Inactive' && active) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return b.name.toLowerCase().includes(q) || b.code.toLowerCase().includes(q) || (b.city || '').toLowerCase().includes(q);
    }
    return true;
  });

  const filteredDepts = departments.filter((d) => {
    const active = d.isActive !== false;
    if (statusFilter === 'Active' && !active) return false;
    if (statusFilter === 'Inactive' && active) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return d.name.toLowerCase().includes(q) || d.code.toLowerCase().includes(q) || d.description.toLowerCase().includes(q);
    }
    return true;
  });

  const filteredDesigs = designations.filter((d) => {
    const active = d.isActive !== false;
    if (statusFilter === 'Active' && !active) return false;
    if (statusFilter === 'Inactive' && active) return false;
    if (deptFilter !== 'ALL' && d.departmentId !== deptFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return d.title.toLowerCase().includes(q) || d.code.toLowerCase().includes(q) || d.level.toLowerCase().includes(q);
    }
    return true;
  });

  const filteredHierarchy = employees.filter((e) => {
    if (deptFilter !== 'ALL' && e.departmentId !== deptFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return `${e.firstName} ${e.lastName} ${e.id}`.toLowerCase().includes(q);
    }
    return true;
  });

  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: 'profile', label: 'Organization Profile', icon: Building2 },
    { id: 'statutory', label: 'Statutory & Compliance (PF/ESI/PT/TDS)', icon: Scale },
    { id: 'branches', label: 'Branches & Offices', icon: MapPin },
    { id: 'departments', label: 'Departments', icon: Layers3 },
    { id: 'designations', label: 'Designations', icon: Network },
    { id: 'hierarchy', label: 'Reporting Hierarchy', icon: Network }
  ];

  const stat = company.statutoryConfig || DEFAULT_STATUTORY_CONFIG;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-indigo-600">HR Setup · Master Organization Configuration</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">Organization Setup</h1>
          <p className="mt-1 text-sm text-slate-500">
            Single source of truth for legal entity, configurable statutory applicability (EPF/ESI/PT/TDS), branches, departments, designations, and reporting lines.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {onOpenPolicies && (
            <button
              type="button"
              onClick={onOpenPolicies}
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-3 py-1.5 text-xs font-semibold text-indigo-700 transition-colors"
            >
              <ShieldCheck size={14} />
              <span>Organization Policies →</span>
            </button>
          )}
          {!isHR && (
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700">
              <Eye size={14} /> Read-Only Executive View
            </span>
          )}
          {success && (
            <span className="rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 text-xs font-semibold text-emerald-700">
              {success}
            </span>
          )}
          {errorMsg && (
            <span className="rounded-lg bg-rose-50 border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700">
              {errorMsg}
            </span>
          )}
        </div>
      </div>

      {/* Tab Selector */}
      <div className="flex flex-wrap gap-2 rounded-xl border border-slate-200 bg-white p-2">
        {tabs.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => {
                setTab(t.id);
                setSearchQuery('');
                setStatusFilter('ALL');
                setDeptFilter('ALL');
              }}
              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold ${
                tab === t.id ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Icon size={15} />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Shared Search & Filter Bar for List Tabs */}
      {tab !== 'profile' && tab !== 'statutory' && (
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 text-xs">
          <div className="flex flex-wrap items-center gap-2 flex-1">
            <div className="relative min-w-[220px] flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={`Search ${tab}...`}
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:bg-white focus:border-indigo-400"
              />
            </div>

            {tab !== 'hierarchy' && (
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-700"
              >
                <option value="ALL">All Statuses</option>
                <option value="Active">Active Only</option>
                <option value="Inactive">Inactive Only</option>
              </select>
            )}

            {(tab === 'designations' || tab === 'hierarchy') && (
              <select
                value={deptFilter}
                onChange={(e) => setDeptFilter(e.target.value)}
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

            {(searchQuery || statusFilter !== 'ALL' || deptFilter !== 'ALL') && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('ALL');
                  setDeptFilter('ALL');
                }}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-indigo-700 hover:bg-indigo-50 rounded-lg font-semibold"
              >
                <RotateCcw className="h-3 w-3" />
                <span>Clear Filters</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {tab === 'departments' && isHR && (
              <button
                onClick={() => setShowDeptImport(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg font-semibold text-slate-700"
              >
                <Upload className="h-3.5 w-3.5" />
                <span>Import CSV</span>
              </button>
            )}
            <ExportButton
              data={
                tab === 'branches'
                  ? filteredBranches
                  : tab === 'departments'
                  ? filteredDepts
                  : tab === 'designations'
                  ? filteredDesigs
                  : filteredHierarchy.map((e) => ({
                      EmployeeID: e.id,
                      Name: `${e.firstName} ${e.lastName}`,
                      Department: departments.find((d) => d.id === e.departmentId)?.name || '',
                      Designation: designations.find((d) => d.id === e.designationId)?.title || '',
                      ReportsTo: e.reportingManagerId || 'Board'
                    }))
              }
              fileName={`Orbyx_Org_${tab}`}
            />
          </div>
        </div>
      )}

      {tab === 'profile' && (
        <form onSubmit={saveProfile} className="rounded-2xl border border-slate-200 bg-white p-5 space-y-5">
          <div>
            <h2 className="font-bold text-slate-900">Legal Entity & Corporate Identity</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Changes saved here persist immediately and appear on all generated employee payslips, statutory registers, and compliance exports.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <label>
              <span className={labelClass}>Organization Display Name *</span>
              <input
                required
                disabled={!isHR}
                className={inputClass}
                value={company.name}
                onChange={(e) => setCompany({ ...company, name: e.target.value })}
              />
            </label>
            <label>
              <span className={labelClass}>Registered Legal Entity Name *</span>
              <input
                required
                disabled={!isHR}
                className={inputClass}
                value={company.legalEntity}
                onChange={(e) => setCompany({ ...company, legalEntity: e.target.value })}
              />
            </label>
            <label>
              <span className={labelClass}>Corporate Registration / CIN Number</span>
              <input
                disabled={!isHR}
                className={`${inputClass} font-mono uppercase`}
                value={company.registrationNumber || ''}
                onChange={(e) => setCompany({ ...company, registrationNumber: e.target.value })}
              />
            </label>
            <label>
              <span className={labelClass}>PAN / Tax Identifier *</span>
              <input
                required
                disabled={!isHR}
                className={`${inputClass} font-mono uppercase`}
                value={company.taxId}
                onChange={(e) => setCompany({ ...company, taxId: e.target.value })}
              />
            </label>
            <label>
              <span className={labelClass}>Corporate Contact Email</span>
              <input
                type="email"
                disabled={!isHR}
                className={inputClass}
                value={company.contactEmail || ''}
                onChange={(e) => setCompany({ ...company, contactEmail: e.target.value })}
              />
            </label>
            <label>
              <span className={labelClass}>Corporate Contact Phone</span>
              <input
                disabled={!isHR}
                className={inputClass}
                value={company.contactPhone || ''}
                onChange={(e) => setCompany({ ...company, contactPhone: e.target.value })}
              />
            </label>
            <label className="md:col-span-2">
              <span className={labelClass}>Registered Headquarters Address *</span>
              <input
                required
                disabled={!isHR}
                className={inputClass}
                value={company.address}
                onChange={(e) => setCompany({ ...company, address: e.target.value })}
              />
            </label>
            <label>
              <span className={labelClass}>City</span>
              <input
                disabled={!isHR}
                className={inputClass}
                value={company.city}
                onChange={(e) => setCompany({ ...company, city: e.target.value })}
              />
            </label>
            <label>
              <span className={labelClass}>State / Jurisdiction</span>
              <input
                disabled={!isHR}
                className={inputClass}
                value={company.state}
                onChange={(e) => setCompany({ ...company, state: e.target.value })}
              />
            </label>
            <label>
              <span className={labelClass}>Country</span>
              <input
                disabled={!isHR}
                className={inputClass}
                value={company.country}
                onChange={(e) => setCompany({ ...company, country: e.target.value })}
              />
            </label>
            <label>
              <span className={labelClass}>Postal / PIN Code</span>
              <input
                disabled={!isHR}
                className={inputClass}
                value={company.zipCode}
                onChange={(e) => setCompany({ ...company, zipCode: e.target.value })}
              />
            </label>
            <label>
              <span className={labelClass}>Payroll Currency</span>
              <input
                disabled={!isHR}
                className={inputClass}
                value={company.currency}
                onChange={(e) => setCompany({ ...company, currency: e.target.value })}
              />
            </label>
            <label>
              <span className={labelClass}>Financial Year Start (MM-DD)</span>
              <input
                disabled={!isHR}
                className={inputClass}
                value={company.fiscalYearStart}
                onChange={(e) => setCompany({ ...company, fiscalYearStart: e.target.value })}
              />
            </label>
            <label>
              <span className={labelClass}>Working Days Per Week</span>
              <input
                disabled={!isHR}
                type="number"
                min="1"
                max="7"
                className={inputClass}
                value={company.workingDaysPerWeek}
                onChange={(e) =>
                  setCompany({ ...company, workingDaysPerWeek: Number(e.target.value) })
                }
              />
            </label>
            <label>
              <span className={labelClass}>Standard Hours Per Day</span>
              <input
                disabled={!isHR}
                type="number"
                min="1"
                max="24"
                className={inputClass}
                value={company.standardHoursPerDay}
                onChange={(e) =>
                  setCompany({ ...company, standardHoursPerDay: Number(e.target.value) })
                }
              />
            </label>
          </div>
          {isHR && (
            <button type="submit" className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 px-4 py-2.5 text-sm font-semibold text-white">
              <Save size={16} />
              Save Organization Profile
            </button>
          )}
        </form>
      )}

      {tab === 'statutory' && (
        <form onSubmit={saveProfile} className="rounded-2xl border border-slate-200 bg-white p-5 space-y-6 text-xs">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-base font-bold text-slate-900">Configurable Statutory & Tax Applicability (EPF, ESI, PT, TDS)</h2>
            <p className="text-slate-500 mt-0.5">
              EPF and ESI are not forced blindly on every organization or employee. Configure whether your organization is covered under EPF, ESI, Professional Tax, and TDS, along with wage ceilings, contribution percentages, and exemption reasons.
            </p>
          </div>

          {/* 1. EPF */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">1. Employees&apos; Provident Fund (EPF)</h3>
                <p className="text-slate-500 text-[11px]">Statutory retirement fund contribution for eligible establishments</p>
              </div>
              <label className="inline-flex items-center gap-2 cursor-pointer font-semibold text-slate-800">
                <input
                  type="checkbox"
                  disabled={!isHR}
                  checked={stat.epfApplicable}
                  onChange={(e) => updateStatConfig({ epfApplicable: e.target.checked })}
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600"
                />
                <span>{stat.epfApplicable ? 'EPF Enabled for Organization' : 'EPF Not Applicable / Exempt'}</span>
              </label>
            </div>

            {stat.epfApplicable ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
                <label>
                  <span className={labelClass}>EPF Establishment Registration Code</span>
                  <input
                    disabled={!isHR}
                    className={`${inputClass} font-mono uppercase`}
                    value={company.pfRegistrationNumber}
                    onChange={(e) => setCompany({ ...company, pfRegistrationNumber: e.target.value })}
                    placeholder="e.g. KN/BLR/0049218/000"
                  />
                </label>
                <label>
                  <span className={labelClass}>Employee Contribution Rate (%)</span>
                  <input
                    type="number"
                    step="0.1"
                    disabled={!isHR}
                    className={inputClass}
                    value={stat.epfEmployeeRatePercent}
                    onChange={(e) => updateStatConfig({ epfEmployeeRatePercent: Number(e.target.value) })}
                  />
                </label>
                <label>
                  <span className={labelClass}>Employer Contribution Rate (%)</span>
                  <input
                    type="number"
                    step="0.1"
                    disabled={!isHR}
                    className={inputClass}
                    value={stat.epfEmployerRatePercent}
                    onChange={(e) => updateStatConfig({ epfEmployerRatePercent: Number(e.target.value) })}
                  />
                </label>
                <label>
                  <span className={labelClass}>Monthly PF Wage Ceiling (₹)</span>
                  <input
                    type="number"
                    disabled={!isHR}
                    className={inputClass}
                    value={stat.epfWageCeilingMonthly}
                    onChange={(e) => updateStatConfig({ epfWageCeilingMonthly: Number(e.target.value) })}
                  />
                </label>
                <label>
                  <span className={labelClass}>Wage Base Calculation Mode</span>
                  <select
                    disabled={!isHR}
                    className={inputClass}
                    value={stat.epfRestrictToWageCeiling ? 'ceiling' : 'actual'}
                    onChange={(e) => updateStatConfig({ epfRestrictToWageCeiling: e.target.value === 'ceiling' })}
                  >
                    <option value="actual">12% on Actual Basic Salary</option>
                    <option value="ceiling">Cap at Statutory Wage Ceiling (₹15,000 Basic)</option>
                  </select>
                </label>
                <label>
                  <span className={labelClass}>Effective From</span>
                  <input
                    type="date"
                    disabled={!isHR}
                    className={inputClass}
                    value={stat.epfEffectiveFrom}
                    onChange={(e) => updateStatConfig({ epfEffectiveFrom: e.target.value })}
                  />
                </label>
              </div>
            ) : (
              <div className="pt-2">
                <label>
                  <span className={labelClass}>EPF Exemption / Non-Applicability Reason</span>
                  <input
                    disabled={!isHR}
                    className={inputClass}
                    value={stat.epfExemptionReason || ''}
                    onChange={(e) => updateStatConfig({ epfExemptionReason: e.target.value })}
                    placeholder="e.g. Establishment headcount below statutory threshold (<20 employees)"
                  />
                </label>
              </div>
            )}
          </div>

          {/* 2. ESI */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">2. Employees&apos; State Insurance (ESI)</h3>
                <p className="text-slate-500 text-[11px]">Applies only when ESI is enabled and employee Monthly Gross is within threshold</p>
              </div>
              <label className="inline-flex items-center gap-2 cursor-pointer font-semibold text-slate-800">
                <input
                  type="checkbox"
                  disabled={!isHR}
                  checked={stat.esiApplicable}
                  onChange={(e) => updateStatConfig({ esiApplicable: e.target.checked })}
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600"
                />
                <span>{stat.esiApplicable ? 'ESI Enabled for Organization' : 'ESI Not Applicable / Exempt'}</span>
              </label>
            </div>

            {stat.esiApplicable ? (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 pt-2">
                <label>
                  <span className={labelClass}>ESI Registration Number</span>
                  <input
                    disabled={!isHR}
                    className={`${inputClass} font-mono uppercase`}
                    value={company.esiRegistrationNumber}
                    onChange={(e) => setCompany({ ...company, esiRegistrationNumber: e.target.value })}
                  />
                </label>
                <label>
                  <span className={labelClass}>Monthly Gross Ceiling (₹)</span>
                  <input
                    type="number"
                    disabled={!isHR}
                    className={inputClass}
                    value={stat.esiGrossThresholdMonthly}
                    onChange={(e) => updateStatConfig({ esiGrossThresholdMonthly: Number(e.target.value) })}
                  />
                </label>
                <label>
                  <span className={labelClass}>Employee Rate (%)</span>
                  <input
                    type="number"
                    step="0.05"
                    disabled={!isHR}
                    className={inputClass}
                    value={stat.esiEmployeeRatePercent}
                    onChange={(e) => updateStatConfig({ esiEmployeeRatePercent: Number(e.target.value) })}
                  />
                </label>
                <label>
                  <span className={labelClass}>Employer Rate (%)</span>
                  <input
                    type="number"
                    step="0.05"
                    disabled={!isHR}
                    className={inputClass}
                    value={stat.esiEmployerRatePercent}
                    onChange={(e) => updateStatConfig({ esiEmployerRatePercent: Number(e.target.value) })}
                  />
                </label>
              </div>
            ) : (
              <div className="pt-2">
                <label>
                  <span className={labelClass}>ESI Exemption / Non-Applicability Reason</span>
                  <input
                    disabled={!isHR}
                    className={inputClass}
                    value={stat.esiExemptionReason || ''}
                    onChange={(e) => updateStatConfig({ esiExemptionReason: e.target.value })}
                    placeholder="e.g. All employees covered under corporate group medical insurance / above ₹21,000 threshold"
                  />
                </label>
              </div>
            )}
          </div>

          {/* 3. Professional Tax & TDS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-900 text-sm">3. Professional Tax (PT)</h3>
                <label className="inline-flex items-center gap-1.5 cursor-pointer font-semibold text-slate-800">
                  <input
                    type="checkbox"
                    disabled={!isHR}
                    checked={stat.ptApplicable}
                    onChange={(e) => updateStatConfig({ ptApplicable: e.target.checked })}
                    className="h-4 w-4 rounded border-slate-300 text-indigo-600"
                  />
                  <span>{stat.ptApplicable ? 'Enabled' : 'Exempt'}</span>
                </label>
              </div>
              {stat.ptApplicable && (
                <div className="grid grid-cols-2 gap-3">
                  <label>
                    <span className={labelClass}>State Jurisdiction</span>
                    <input
                      disabled={!isHR}
                      className={inputClass}
                      value={stat.ptStateJurisdiction}
                      onChange={(e) => updateStatConfig({ ptStateJurisdiction: e.target.value })}
                    />
                  </label>
                  <label>
                    <span className={labelClass}>Monthly PT Slab (₹)</span>
                    <input
                      type="number"
                      disabled={!isHR}
                      className={inputClass}
                      value={stat.ptMonthlySlabAmount}
                      onChange={(e) => updateStatConfig({ ptMonthlySlabAmount: Number(e.target.value) })}
                    />
                  </label>
                </div>
              )}
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-900 text-sm">4. Income Tax / TDS Withholding</h3>
                <label className="inline-flex items-center gap-1.5 cursor-pointer font-semibold text-slate-800">
                  <input
                    type="checkbox"
                    disabled={!isHR}
                    checked={stat.tdsApplicable}
                    onChange={(e) => updateStatConfig({ tdsApplicable: e.target.checked })}
                    className="h-4 w-4 rounded border-slate-300 text-indigo-600"
                  />
                  <span>{stat.tdsApplicable ? 'Enabled' : 'Disabled'}</span>
                </label>
              </div>
              {stat.tdsApplicable && (
                <div className="grid grid-cols-2 gap-3">
                  <label>
                    <span className={labelClass}>Financial Year</span>
                    <input
                      disabled={!isHR}
                      className={inputClass}
                      value={stat.tdsFinancialYear}
                      onChange={(e) => updateStatConfig({ tdsFinancialYear: e.target.value })}
                    />
                  </label>
                  <label>
                    <span className={labelClass}>Default Tax Regime</span>
                    <select
                      disabled={!isHR}
                      className={inputClass}
                      value={stat.tdsDefaultRegime}
                      onChange={(e) => updateStatConfig({ tdsDefaultRegime: e.target.value as any })}
                    >
                      <option value="New Regime (FY 2026-27)">New Regime (FY 2026-27)</option>
                      <option value="Old Regime">Old Regime</option>
                    </select>
                  </label>
                </div>
              )}
            </div>
          </div>

          {isHR && (
            <button type="submit" className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 px-4 py-2.5 text-sm font-semibold text-white">
              <Save size={16} />
              Save Statutory & Compliance Configuration
            </button>
          )}
        </form>
      )}

      {tab === 'branches' && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="font-bold text-slate-900">Branches & Offices</h2>
          <p className="mb-4 mt-1 text-sm text-slate-500">
            Each branch is a separate organizational record.
          </p>
          {isHR && (
            <div className="mb-5 grid gap-2 md:grid-cols-[1fr_140px_160px_auto]">
              <input
                className={inputClass}
                placeholder="Branch / office name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
              <input
                className={inputClass}
                placeholder="Branch code"
                value={newCode}
                onChange={(e) => setNewCode(e.target.value)}
              />
              <input
                className={inputClass}
                placeholder="City"
                value={newCity}
                onChange={(e) => setNewCity(e.target.value)}
              />
              <button
                onClick={addBranch}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white"
              >
                <Plus size={15} />
                Add branch
              </button>
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b text-xs uppercase text-slate-500">
                  <th className="p-3">Branch</th>
                  <th className="p-3">Code</th>
                  <th className="p-3">City</th>
                  <th className="p-3">Type</th>
                  <th className="p-3">Status</th>
                  {isHR && <th className="p-3">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {filteredBranches.map((b) => {
                  const active = b.isActive !== false;
                  return (
                    <tr key={b.id} className="border-b last:border-0">
                      <td className="p-3 font-semibold">{b.name}</td>
                      <td className="p-3 font-mono text-xs">{b.code}</td>
                      <td className="p-3">{b.city || 'Not specified'}</td>
                      <td className="p-3">{b.isHeadquarters ? 'Headquarters' : 'Branch'}</td>
                      <td className="p-3">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                            active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      {isHR && (
                        <td className="p-3">
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => setEditingBranch(b)}
                              className="px-2 py-1 text-xs font-semibold text-indigo-700 bg-indigo-50 rounded"
                            >
                              <Edit3 size={12} className="inline mr-1" />
                              Edit
                            </button>
                            <button
                              onClick={() => toggleBranchStatus(b)}
                              className={`px-2 py-1 text-xs font-semibold rounded ${
                                active ? 'text-rose-700 bg-rose-50' : 'text-emerald-700 bg-emerald-50'
                              }`}
                            >
                              {active ? 'Deactivate' : 'Activate'}
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {tab === 'departments' && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="font-bold text-slate-900">Departments</h2>
          {isHR && (
            <div className="my-4 grid gap-2 md:grid-cols-[1fr_150px_1fr_auto]">
              <input
                className={inputClass}
                placeholder="Department name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
              <input
                className={inputClass}
                placeholder="Code"
                value={newCode}
                onChange={(e) => setNewCode(e.target.value)}
              />
              <input
                className={inputClass}
                placeholder="Purpose / description"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
              />
              <button
                onClick={addDepartment}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white"
              >
                <Plus size={15} />
                Add
              </button>
            </div>
          )}
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {filteredDepts.map((d) => {
              const active = d.isActive !== false;
              return (
                <div key={d.id} className="rounded-xl border border-slate-200 p-4 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between gap-2">
                      <h3 className="font-bold text-slate-900">{d.name}</h3>
                      <div className="flex items-center gap-1.5">
                        <span className="h-fit rounded bg-slate-100 px-2 py-0.5 font-mono text-xs">
                          {d.code}
                        </span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                            active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-200 text-slate-600'
                          }`}
                        >
                          {active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                    <p className="mt-2 text-sm text-slate-500">
                      {d.description || 'No description provided'}
                    </p>
                  </div>
                  <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-xs text-slate-400">
                      Head: {d.headEmployeeId || 'Not assigned'}
                    </span>
                    {isHR && (
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => setEditingDept(d)}
                          className="px-2 py-1 text-xs font-semibold text-indigo-700 bg-indigo-50 rounded"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => toggleDeptStatus(d)}
                          className={`px-2 py-1 text-xs font-semibold rounded ${
                            active ? 'text-rose-700 bg-rose-50' : 'text-emerald-700 bg-emerald-50'
                          }`}
                        >
                          {active ? 'Deactivate' : 'Activate'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {tab === 'designations' && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="mb-4 font-bold text-slate-900">Designations & Job Levels</h2>
          {isHR && (
            <div className="mb-5 grid gap-2 md:grid-cols-[1fr_130px_180px_140px_auto]">
              <input
                className={inputClass}
                placeholder="Designation title"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
              <input
                className={inputClass}
                placeholder="Code"
                value={newCode}
                onChange={(e) => setNewCode(e.target.value)}
              />
              <select
                className={inputClass}
                value={desigDeptId}
                onChange={(e) => setDesigDeptId(e.target.value)}
              >
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
              <select
                className={inputClass}
                value={desigLevel}
                onChange={(e) => setDesigLevel(e.target.value)}
              >
                <option value="Junior">Junior</option>
                <option value="Mid">Mid</option>
                <option value="Senior">Senior</option>
                <option value="Lead">Lead</option>
                <option value="Executive">Executive</option>
              </select>
              <button
                onClick={addDesignation}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white"
              >
                <Plus size={15} />
                Add
              </button>
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b text-xs uppercase text-slate-500">
                  <th className="p-3">Designation</th>
                  <th className="p-3">Code</th>
                  <th className="p-3">Department</th>
                  <th className="p-3">Level</th>
                  <th className="p-3">Status</th>
                  {isHR && <th className="p-3">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {filteredDesigs.map((d: Designation) => {
                  const active = d.isActive !== false;
                  return (
                    <tr key={d.id} className="border-b last:border-0">
                      <td className="p-3 font-semibold">{d.title}</td>
                      <td className="p-3 font-mono text-xs">{d.code}</td>
                      <td className="p-3">
                        {departments.find((x) => x.id === d.departmentId)?.name || 'Unassigned'}
                      </td>
                      <td className="p-3">{d.level}</td>
                      <td className="p-3">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                            active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      {isHR && (
                        <td className="p-3">
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => setEditingDesig(d)}
                              className="px-2 py-1 text-xs font-semibold text-indigo-700 bg-indigo-50 rounded"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => toggleDesigStatus(d)}
                              className={`px-2 py-1 text-xs font-semibold rounded ${
                                active ? 'text-rose-700 bg-rose-50' : 'text-emerald-700 bg-emerald-50'
                              }`}
                            >
                              {active ? 'Deactivate' : 'Activate'}
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {tab === 'hierarchy' && (
        <div className="space-y-6">
          <OrgChart onSelectEmployee={() => {}} />

          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="mb-1 font-bold text-slate-900">Operational Reporting Line Assignments</h2>
            <p className="mb-4 text-sm text-slate-500">
              Manage operational reporting lines across payroll employees. Self-reporting and circular reporting relationships are automatically blocked.
            </p>
            <div className="grid gap-3 md:grid-cols-2">
              {filteredHierarchy.map((e) => (
                <div
                  key={e.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={e.avatarUrl}
                      alt=""
                      className="h-10 w-10 rounded-full object-cover shrink-0"
                    />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-slate-900">
                        {e.firstName} {e.lastName}{' '}
                        <span className="font-mono text-xs font-normal text-slate-400">({e.id})</span>
                      </p>
                      <p className="truncate text-xs text-slate-500">
                        {designations.find((d) => d.id === e.designationId)?.title || 'Employee'} ·{' '}
                        {departments.find((d) => d.id === e.departmentId)?.name || 'Department'}
                      </p>
                    </div>
                  </div>
                  <div className="w-48 shrink-0">
                    <label className="block text-[10px] font-semibold uppercase text-slate-400 mb-0.5">
                      Reports To
                    </label>
                    <select
                      disabled={!isHR}
                      value={e.reportingManagerId || ''}
                      onChange={(valueEvent) => updateReportingManager(e.id, valueEvent.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-medium text-slate-800 disabled:opacity-60"
                    >
                      <option value="">Chairman / Board of Directors (Top)</option>
                      {employees
                        .filter((candidate) => candidate.id !== e.id)
                        .map((candidate) => (
                          <option key={candidate.id} value={candidate.id}>
                            {candidate.firstName} {candidate.lastName} ({candidate.id})
                          </option>
                        ))}
                    </select>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      {/* Edit Branch Modal */}
      {editingBranch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-3 text-xs">
            <h4 className="text-base font-bold text-slate-900">Edit Branch: {editingBranch.code}</h4>
            <label className="block">
              <span className={labelClass}>Branch Name</span>
              <input
                className={inputClass}
                value={editingBranch.name}
                onChange={(e) => setEditingBranch({ ...editingBranch, name: e.target.value })}
              />
            </label>
            <label className="block">
              <span className={labelClass}>Branch Code</span>
              <input
                className={inputClass}
                value={editingBranch.code}
                onChange={(e) => setEditingBranch({ ...editingBranch, code: e.target.value.toUpperCase() })}
              />
            </label>
            <label className="block">
              <span className={labelClass}>City</span>
              <input
                className={inputClass}
                value={editingBranch.city}
                onChange={(e) => setEditingBranch({ ...editingBranch, city: e.target.value })}
              />
            </label>
            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button onClick={() => setEditingBranch(null)} className="px-3 py-1.5 border rounded-lg">Cancel</button>
              <button
                onClick={() => {
                  db.saveBranch(editingBranch);
                  setBranches(db.getBranches());
                  setEditingBranch(null);
                  notify('Branch updated.');
                }}
                className="px-4 py-1.5 bg-indigo-600 text-white font-semibold rounded-lg"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Department Modal */}
      {editingDept && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-3 text-xs">
            <h4 className="text-base font-bold text-slate-900">Edit Department: {editingDept.code}</h4>
            <label className="block">
              <span className={labelClass}>Department Name</span>
              <input
                className={inputClass}
                value={editingDept.name}
                onChange={(e) => setEditingDept({ ...editingDept, name: e.target.value })}
              />
            </label>
            <label className="block">
              <span className={labelClass}>Code</span>
              <input
                className={inputClass}
                value={editingDept.code}
                onChange={(e) => setEditingDept({ ...editingDept, code: e.target.value.toUpperCase() })}
              />
            </label>
            <label className="block">
              <span className={labelClass}>Description</span>
              <textarea
                rows={2}
                className={inputClass}
                value={editingDept.description}
                onChange={(e) => setEditingDept({ ...editingDept, description: e.target.value })}
              />
            </label>
            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button onClick={() => setEditingDept(null)} className="px-3 py-1.5 border rounded-lg">Cancel</button>
              <button
                onClick={() => {
                  db.saveDepartment(editingDept);
                  setDepartments(db.getDepartments());
                  setEditingDept(null);
                  notify('Department updated.');
                }}
                className="px-4 py-1.5 bg-indigo-600 text-white font-semibold rounded-lg"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Designation Modal */}
      {editingDesig && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-3 text-xs">
            <h4 className="text-base font-bold text-slate-900">Edit Designation: {editingDesig.code}</h4>
            <label className="block">
              <span className={labelClass}>Title</span>
              <input
                className={inputClass}
                value={editingDesig.title}
                onChange={(e) => setEditingDesig({ ...editingDesig, title: e.target.value })}
              />
            </label>
            <label className="block">
              <span className={labelClass}>Code</span>
              <input
                className={inputClass}
                value={editingDesig.code}
                onChange={(e) => setEditingDesig({ ...editingDesig, code: e.target.value.toUpperCase() })}
              />
            </label>
            <label className="block">
              <span className={labelClass}>Level</span>
              <select
                className={inputClass}
                value={editingDesig.level}
                onChange={(e) => setEditingDesig({ ...editingDesig, level: e.target.value })}
              >
                <option value="Junior">Junior</option>
                <option value="Mid">Mid</option>
                <option value="Senior">Senior</option>
                <option value="Lead">Lead</option>
                <option value="Executive">Executive</option>
              </select>
            </label>
            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button onClick={() => setEditingDesig(null)} className="px-3 py-1.5 border rounded-lg">Cancel</button>
              <button
                onClick={() => {
                  db.saveDesignation(editingDesig);
                  setDesignations(db.getDesignations());
                  setEditingDesig(null);
                  notify('Designation updated.');
                }}
                className="px-4 py-1.5 bg-indigo-600 text-white font-semibold rounded-lg"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CSV Import Modal for Departments */}
      <CsvImportModal<Department>
        isOpen={showDeptImport}
        onClose={() => setShowDeptImport(false)}
        title="Import Departments (CSV)"
        description="Upload or paste department records. Duplicate department codes are automatically rejected."
        templateFileName="Orbyx_Departments"
        headers={['Name', 'Code', 'Description']}
        sampleRows={[
          ['Quality Assurance', 'QA', 'Automated testing and release validation'],
          ['Customer Success', 'CS', 'Enterprise client onboarding and SLA support']
        ]}
        validateRow={(cols) => {
          const [name, code, description] = cols;
          if (!name || !code) {
            return { valid: false, error: 'Missing required Name or Code' };
          }
          const exists = departments.some((d) => d.code.toLowerCase() === code.toLowerCase());
          if (exists) {
            return { valid: false, error: `Duplicate department code "${code}"` };
          }
          return {
            valid: true,
            data: {
              id: `DEP-${code.toUpperCase()}-${Date.now().toString().slice(-3)}`,
              name,
              code: code.toUpperCase(),
              description: description || '',
              isActive: true
            }
          };
        }}
        onCommit={(validDepts) => {
          validDepts.forEach((d) => db.saveDepartment(d));
          setDepartments(db.getDepartments());
          notify(`Imported ${validDepts.length} department(s).`);
        }}
      />
    </div>
  );
};
