import React, { useState, useEffect } from 'react';
import { db, subscribeToDB } from '../../db/storage';
import { Employee, BasicDirectoryEmployee, EmploymentStatus, NavigationContext } from '../../types/hrms';
import { useAuth } from '../../services/authContext';
import { permissionService } from '../../services/permissionService';
import { DataTable, Column } from '../common/DataTable';
import { ExportButton } from '../common/ExportButton';
import { CsvImportModal } from '../common/CsvImportModal';
import { PhotoCaptureField } from '../common/PhotoCaptureField';
import { EmployeeProfileModal } from './EmployeeProfileModal';
import { NewEmployeeModal } from './NewEmployeeModal';
import { OrgChart } from './OrgChart';
import { hrmsService } from '../../services/hrmsService';
import { readAssignments } from '../clients/ClientManagement';
import {
  UserPlus,
  LayoutList,
  GitFork,
  Eye,
  ShieldCheck,
  Mail,
  Phone,
  Upload,
  Edit3,
  Power,
  RotateCcw,
  Users,
  Plus
} from 'lucide-react';

interface EmployeeDirectoryProps {
  navContext?: NavigationContext;
  onOpenPolicies?: () => void;
}

export const EmployeeDirectory: React.FC<EmployeeDirectoryProps> = ({
  navContext,
  onOpenPolicies
}) => {
  const { currentUser, canManageOrganization } = useAuth();
  const isRegularEmployee = currentUser.role === 'employee';
  const isManager = currentUser.role === 'senior_manager' || currentUser.role === 'reporting_manager';
  const isHR = currentUser.role === 'hr_admin';

  const [viewMode, setViewMode] = useState<'reportees' | 'directory' | 'hierarchy'>(() => {
    if (navContext?.subTab === 'directory') return 'directory';
    if (navContext?.subTab === 'hierarchy') return 'hierarchy';
    return isRegularEmployee ? 'directory' : 'reportees';
  });
  const [reporteeManagerFilter, setReporteeManagerFilter] = useState<string>(() => {
    if (navContext?.managerId) return navContext.managerId;
    return currentUser.role === 'hr_admin' ? 'ALL_REPORTEES' : currentUser.employeeId;
  });
  const [, setTick] = useState(0);

  useEffect(() => {
    return subscribeToDB(() => setTick((t) => t + 1));
  }, []);

  useEffect(() => {
    if (navContext?.subTab === 'reportees') {
      setViewMode('reportees');
      if (navContext.managerId) setReporteeManagerFilter(navContext.managerId);
    } else if (navContext?.subTab === 'directory') {
      setViewMode('directory');
    } else if (navContext?.subTab === 'hierarchy') {
      setViewMode('hierarchy');
    }
    if (navContext?.statusFilter) {
      setSelectedStatusFilter(navContext.statusFilter);
    }
    if (navContext?.departmentFilter) {
      setSelectedDeptFilter(navContext.departmentFilter);
    }
  }, [navContext]);

  useEffect(() => {
    if (!navContext?.managerId) {
      setReporteeManagerFilter(
        currentUser.role === 'hr_admin' ? 'ALL_REPORTEES' : currentUser.employeeId
      );
    }
    if (!navContext?.subTab) {
      setViewMode(currentUser.role === 'employee' ? 'directory' : 'reportees');
    }
  }, [currentUser.employeeId, currentUser.role, navContext]);

  const [selectedEmployee, setSelectedEmployee] = useState<Employee | BasicDirectoryEmployee | null>(null);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [editError, setEditError] = useState<string>('');
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [notice, setNotice] = useState('');

  // Filters
  const [selectedDeptFilter, setSelectedDeptFilter] = useState<string>(() => navContext?.departmentFilter || 'ALL');
  const [selectedDesigFilter, setSelectedDesigFilter] = useState<string>('ALL');
  const [selectedManagerFilter, setSelectedManagerFilter] = useState<string>('ALL');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>(() => navContext?.statusFilter || 'ALL');
  const [selectedClientFilter, setSelectedClientFilter] = useState<'ALL' | 'DEPLOYED' | 'INTERNAL'>('ALL');

  const departments = db.getDepartments();
  const designations = db.getDesignations();
  const branches = db.getBranches();
  const allEmployees = db.getEmployees();
  const activeClientAssignments = readAssignments().filter((a) => a.status === 'Active');
  const deployedEmpIds = new Set(activeClientAssignments.map((a) => a.employeeId));

  // Retrieve authorized rows (sanitized strictly at service layer)
  const rawRows = permissionService.getAuthorizedDirectoryRows(currentUser);

  // Direct Reportees list for "My Reportees" tab
  const targetManagerIdForReportees =
    isHR || currentUser.role === 'senior_manager' ? reporteeManagerFilter : currentUser.employeeId;
  const directReportees = allEmployees.filter((e) => {
    if (targetManagerIdForReportees === 'ALL_REPORTEES') {
      return Boolean(e.reportingManagerId);
    }
    return e.reportingManagerId === targetManagerIdForReportees && e.id !== targetManagerIdForReportees;
  });

  // Apply filters if permitted
  const filteredRows = rawRows.filter((r) => {
    if (isRegularEmployee) return true;
    const emp = r as Employee;
    if ('departmentId' in r && selectedDeptFilter !== 'ALL' && emp.departmentId !== selectedDeptFilter) return false;
    if ('designationId' in r && selectedDesigFilter !== 'ALL' && emp.designationId !== selectedDesigFilter) return false;
    if ('reportingManagerId' in r && selectedManagerFilter !== 'ALL' && emp.reportingManagerId !== selectedManagerFilter) return false;
    if ('status' in r && selectedStatusFilter !== 'ALL' && emp.status !== selectedStatusFilter) return false;
    if (selectedClientFilter === 'DEPLOYED' && !deployedEmpIds.has(emp.id)) return false;
    if (selectedClientFilter === 'INTERNAL' && deployedEmpIds.has(emp.id)) return false;
    return true;
  });

  const isDescendantOf = (candidateManagerId: string, empId: string): boolean => {
    const visited = new Set<string>();
    const queue = [empId];
    while (queue.length > 0) {
      const curr = queue.shift()!;
      if (curr === candidateManagerId) return true;
      if (visited.has(curr)) continue;
      visited.add(curr);
      const children = allEmployees.filter((e) => e.reportingManagerId === curr && e.id !== curr);
      children.forEach((c) => queue.push(c.id));
    }
    return false;
  };

  const handleToggleEmployeeActive = (emp: Employee) => {
    if (!isHR) return;
    const nextStatus: EmploymentStatus = emp.status === 'Inactive' ? 'Active' : 'Inactive';
    const updated: Employee = { ...emp, status: nextStatus };
    hrmsService.updateEmployee(updated, currentUser.id, currentUser.name);
    setNotice(`Employee ${emp.firstName} ${emp.lastName} (${emp.id}) status updated to ${nextStatus}.`);
  };

  const handleSaveEditedEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEmployee || !isHR) return;
    if (editingEmployee.reportingManagerId === editingEmployee.id) {
      setEditError('An employee cannot be assigned as their own reporting manager.');
      return;
    }
    if (
      editingEmployee.reportingManagerId &&
      isDescendantOf(editingEmployee.reportingManagerId, editingEmployee.id)
    ) {
      setEditError(
        'Circular reporting detected: Cannot assign a direct or indirect reportee as this employee’s reporting manager.'
      );
      return;
    }
    setEditError('');
    hrmsService.updateEmployee(editingEmployee, currentUser.id, currentUser.name);
    setNotice(`Saved changes to ${editingEmployee.firstName} ${editingEmployee.lastName} (${editingEmployee.id}).`);
    setEditingEmployee(null);
  };

  let columns: Column<any>[] = [];

  if (isRegularEmployee) {
    columns = [
      {
        header: 'Colleague',
        accessorKey: 'firstName',
        sortable: true,
        cell: (emp: BasicDirectoryEmployee) => (
          <div className="flex items-center gap-3">
            <img
              src={emp.avatarUrl}
              alt={emp.firstName}
              className="h-10 w-10 rounded-full object-cover ring-1 ring-slate-200"
            />
            <div className="min-w-0">
              <div className="font-semibold text-slate-900 truncate">
                {emp.firstName} {emp.lastName}
              </div>
              <span className="text-[11px] text-slate-400">Company Colleague</span>
            </div>
          </div>
        )
      },
      {
        header: 'Official Mobile Number',
        accessorKey: 'officialPhone',
        sortable: true,
        cell: (emp: BasicDirectoryEmployee) => (
          <div className="flex items-center gap-1.5 font-mono text-slate-700 font-medium">
            <Phone className="h-3.5 w-3.5 text-slate-400" />
            <span>{emp.officialPhone}</span>
          </div>
        )
      },
      {
        header: 'Official Email Address',
        accessorKey: 'officialEmail',
        sortable: true,
        cell: (emp: BasicDirectoryEmployee) => (
          <div className="flex items-center gap-1.5 text-indigo-700">
            <Mail className="h-3.5 w-3.5 text-indigo-500" />
            <a href={`mailto:${emp.officialEmail}`} className="hover:underline">
              {emp.officialEmail}
            </a>
          </div>
        )
      },
      {
        header: 'Directory Access',
        cell: (emp: BasicDirectoryEmployee) => (
          <button
            onClick={() => setSelectedEmployee(emp)}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
          >
            <Eye className="h-3.5 w-3.5" />
            <span>View Contact</span>
          </button>
        )
      }
    ];
  } else if (isManager) {
    columns = [
      {
        header: 'Employee',
        accessorKey: 'firstName',
        sortable: true,
        cell: (r: any) => {
          const isDirectReport = r.isDirectReport;
          const desig = designations.find((d) => d.id === r.designationId);
          return (
            <div className="flex items-center gap-3">
              <img
                src={r.avatarUrl}
                alt={r.firstName}
                className="h-9 w-9 rounded-full object-cover ring-1 ring-slate-200"
              />
              <div className="min-w-0">
                <div className="font-semibold text-slate-900 truncate flex items-center gap-2">
                  <span>{r.firstName} {r.lastName}</span>
                  {isDirectReport && (
                    <span className="text-[10px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.2 rounded">
                      Direct Report
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-slate-500 truncate">
                  {desig ? desig.title : 'Organization Colleague'}
                </div>
              </div>
            </div>
          );
        }
      },
      {
        header: 'Official Mobile',
        accessorKey: 'officialPhone',
        cell: (r: any) => <span className="font-mono text-slate-700">{r.officialPhone}</span>
      },
      {
        header: 'Official Email',
        accessorKey: 'officialEmail',
        cell: (r: any) => (
          <a href={`mailto:${r.officialEmail}`} className="text-indigo-700 hover:underline">
            {r.officialEmail}
          </a>
        )
      },
      {
        header: 'Reporting Scope',
        cell: (r: any) => (
          <span className="text-xs text-slate-600 font-medium">
            {r.isDirectReport ? 'Reporting to You' : 'Organization Colleague'}
          </span>
        )
      },
      {
        header: 'Actions',
        cell: (r: any) => (
          <button
            onClick={() => setSelectedEmployee(r)}
            className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors ${
              r.isDirectReport
                ? 'text-indigo-700 bg-indigo-50 hover:bg-indigo-100'
                : 'text-slate-700 bg-slate-100 hover:bg-slate-200'
            }`}
          >
            <Eye className="h-3 w-3" />
            <span>{r.isDirectReport ? 'Team Profile' : 'View Contact'}</span>
          </button>
        )
      }
    ];
  } else {
    columns = [
      {
        header: 'Employee',
        accessorKey: 'firstName',
        sortable: true,
        cell: (emp: Employee) => {
          const desig = designations.find((d) => d.id === emp.designationId);
          const isClientDeployed = deployedEmpIds.has(emp.id);
          return (
            <div className="flex items-center gap-3">
              <img
                src={emp.avatarUrl}
                alt={emp.firstName}
                className="h-9 w-9 rounded-full object-cover ring-1 ring-slate-200"
              />
              <div className="min-w-0">
                <div className="font-semibold text-slate-900 truncate flex items-center gap-1.5">
                  <span>{emp.firstName} {emp.lastName}</span>
                  {isClientDeployed && (
                    <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                      Client Site
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-slate-500 truncate flex items-center gap-1.5">
                  <span>{desig?.title || 'Staff'}</span>
                  <span>·</span>
                  <span className="font-mono text-slate-400">{emp.id}</span>
                </div>
              </div>
            </div>
          );
        }
      },
      {
        header: 'Department & Branch',
        accessorKey: 'departmentId',
        sortable: true,
        cell: (emp: Employee) => {
          const dept = departments.find((d) => d.id === emp.departmentId);
          const br = branches.find((b) => b.id === emp.branchId);
          return (
            <div>
              <span className="font-medium text-slate-800 block">{dept?.name || emp.departmentId}</span>
              <span className="text-[11px] text-slate-400">{br?.city || 'Bengaluru'}</span>
            </div>
          );
        }
      },
      {
        header: 'Status',
        accessorKey: 'status',
        sortable: true,
        cell: (emp: Employee) => (
          <span
            className={`inline-flex items-center gap-1.5 text-xs font-medium ${
              emp.status === 'Active'
                ? 'text-emerald-700'
                : emp.status === 'On Leave'
                ? 'text-amber-700'
                : 'text-slate-600'
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                emp.status === 'Active' ? 'bg-emerald-500' : emp.status === 'On Leave' ? 'bg-amber-500' : 'bg-slate-400'
              }`}
            />
            <span>{emp.status}</span>
          </span>
        )
      },
      {
        header: 'Official Contact',
        accessorKey: 'email',
        cell: (emp: Employee) => (
          <div className="text-[11px] space-y-0.5">
            <p className="text-slate-700">{emp.officialEmail || emp.email}</p>
            <p className="text-slate-400">{emp.officialPhone || emp.phone}</p>
          </div>
        )
      },
      {
        header: 'Joined',
        accessorKey: 'dateOfJoining',
        sortable: true,
        cell: (emp: Employee) => <span className="font-mono text-slate-600 text-xs">{emp.dateOfJoining}</span>
      },
      {
        header: 'Actions',
        cell: (emp: Employee) => (
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setSelectedEmployee(emp)}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
            >
              <Eye className="h-3 w-3" />
              <span>View</span>
            </button>
            {isHR && (
              <>
                <button
                  onClick={() => setEditingEmployee({ ...emp })}
                  className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  <Edit3 className="h-3 w-3" />
                  <span>Edit</span>
                </button>
                <button
                  onClick={() => handleToggleEmployeeActive(emp)}
                  className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-lg transition-colors ${
                    emp.status === 'Inactive'
                      ? 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                      : 'text-rose-700 bg-rose-50 hover:bg-rose-100'
                  }`}
                  title={emp.status === 'Inactive' ? 'Activate Employee' : 'Deactivate Employee'}
                >
                  <Power className="h-3 w-3" />
                  <span>{emp.status === 'Inactive' ? 'Activate' : 'Deactivate'}</span>
                </button>
              </>
            )}
          </div>
        )
      }
    ];
  }

  const exportData = permissionService.getAuthorizedDirectoryExport(currentUser);

  const hasActiveFilters =
    selectedDeptFilter !== 'ALL' ||
    selectedDesigFilter !== 'ALL' ||
    selectedManagerFilter !== 'ALL' ||
    selectedStatusFilter !== 'ALL' ||
    selectedClientFilter !== 'ALL';

  return (
    <div className="space-y-4">
      {isRegularEmployee && (
        <div className="p-3.5 bg-indigo-50/80 rounded-xl border border-indigo-100 flex items-center justify-between text-indigo-950">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="h-5 w-5 text-indigo-600 shrink-0" />
            <span className="text-xs font-medium">
              <span className="font-bold">Privacy-Protected Directory:</span> You can view colleagues' names, official mobile numbers, official email addresses, and profile photos. Confidential HR, salary, and personal details are restricted.
            </span>
          </div>
        </div>
      )}

      {notice && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-medium flex items-center justify-between">
          <span>{notice}</span>
          <button onClick={() => setNotice('')} className="font-bold ml-3">Dismiss</button>
        </div>
      )}

      {/* Reordered Employee Setup Tabs (Req 4): 1. My Reportees -> 2. Employee Directory -> 3. Reporting Hierarchy -> 4. Promotions & Appraisals -> 5. Exit & Clearance */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200">
        <div className="flex flex-wrap items-center gap-1 bg-slate-100 p-1 rounded-lg">
          <button
            type="button"
            onClick={() => setViewMode('reportees')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              viewMode === 'reportees' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="h-3.5 w-3.5 text-indigo-600" />
            <span>1. My Reportees ({directReportees.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('directory')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              viewMode === 'directory' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <LayoutList className="h-3.5 w-3.5" />
            <span>2. Employee Directory ({filteredRows.length})</span>
          </button>

          {!isRegularEmployee && (
            <button
              type="button"
              onClick={() => setViewMode('hierarchy')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                viewMode === 'hierarchy' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <GitFork className="h-3.5 w-3.5" />
              <span>3. Reporting Hierarchy</span>
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {onOpenPolicies && (
            <button
              type="button"
              onClick={onOpenPolicies}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg border border-indigo-200 transition-colors"
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Employee Policies &rarr;</span>
            </button>
          )}
          <ExportButton data={exportData} fileName="Orbyx_Employee_Directory" />
          {canManageOrganization() && (
            <>
              <button
                onClick={() => setIsImportModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold rounded-lg transition-colors"
              >
                <Upload className="h-3.5 w-3.5" />
                <span>Import CSV</span>
              </button>
              <button
                onClick={() => setIsNewModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-2xs transition-colors"
              >
                <UserPlus className="h-3.5 w-3.5" />
                <span>Add Employee</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* TAB 1: MY REPORTEES (Req 4) */}
      {viewMode === 'reportees' && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Direct Reportees Roster
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {targetManagerIdForReportees === 'ALL_REPORTEES'
                  ? 'All active employees mapped to a Reporting Manager across departments'
                  : `Employees reporting directly to ${
                      allEmployees.find((m) => m.id === targetManagerIdForReportees)
                        ? `${allEmployees.find((m) => m.id === targetManagerIdForReportees)?.firstName} ${
                            allEmployees.find((m) => m.id === targetManagerIdForReportees)?.lastName
                          } (${targetManagerIdForReportees})`
                        : currentUser.name
                    }`}
              </p>
            </div>
            {(isHR || currentUser.role === 'senior_manager') && (
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-500 font-medium">Inspect Manager's Team:</span>
                <select
                  value={reporteeManagerFilter}
                  onChange={(e) => setReporteeManagerFilter(e.target.value)}
                  className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-semibold text-slate-800"
                >
                  <option value="ALL_REPORTEES">All Reporting Managers' Teams ({allEmployees.filter((e) => Boolean(e.reportingManagerId)).length})</option>
                  {allEmployees.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.firstName} {m.lastName} ({m.id})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {directReportees.length === 0 ? (
            <div className="p-10 text-center border border-dashed border-slate-200 rounded-xl space-y-2">
              <Users className="h-8 w-8 text-slate-300 mx-auto" />
              <p className="text-sm font-bold text-slate-700">No Direct Reportees Assigned</p>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                There are currently no employees assigned directly under this reporting manager. Switch to the{' '}
                <button
                  type="button"
                  onClick={() => setViewMode('directory')}
                  className="text-indigo-600 font-semibold underline"
                >
                  Employee Directory
                </button>{' '}
                to browse the organization roster.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {directReportees.map((rep) => {
                const dept = departments.find((d) => d.id === rep.departmentId);
                const desig = designations.find((d) => d.id === rep.designationId);
                const activeDeploy = activeClientAssignments.find((a) => a.employeeId === rep.id);
                return (
                  <div
                    key={rep.id}
                    className="p-4 rounded-xl border border-slate-200 hover:border-indigo-300 bg-white shadow-2xs transition-all flex flex-col justify-between gap-3"
                  >
                    <div className="flex items-start gap-3">
                      <img
                        src={rep.avatarUrl}
                        alt={rep.firstName}
                        className="h-12 w-12 rounded-full object-cover ring-2 ring-indigo-50 shrink-0"
                      />
                      <div className="min-w-0 flex-1 text-xs">
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-bold text-slate-900 truncate">
                            {rep.firstName} {rep.lastName}
                          </span>
                          <span className="font-mono text-[10px] text-slate-400">{rep.id}</span>
                        </div>
                        <p className="text-slate-600 font-medium truncate mt-0.5">{desig?.title || 'Staff'}</p>
                        <p className="text-[11px] text-slate-400">{dept?.name}</p>
                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                          <span
                            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                              rep.status === 'Active'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-amber-50 text-amber-700'
                            }`}
                          >
                            {rep.status}
                          </span>
                          <span
                            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                              activeDeploy
                                ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {activeDeploy ? `Client: ${activeDeploy.project}` : 'Internal Operations'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
                      <span className="text-[11px] text-slate-400 font-mono truncate">{rep.officialEmail || rep.email}</span>
                      <button
                        type="button"
                        onClick={() => setSelectedEmployee(rep)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg shrink-0"
                      >
                        <Eye className="h-3 w-3" />
                        <span>View Profile</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Comprehensive Filter Bar for HR & Managers on Tab 2: Employee Directory */}
      {viewMode === 'directory' && !isRegularEmployee && (
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 flex flex-wrap items-center gap-2 text-xs">
          <select
            value={selectedDeptFilter}
            onChange={(e) => setSelectedDeptFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-700"
          >
            <option value="ALL">All Departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>

          <select
            value={selectedDesigFilter}
            onChange={(e) => setSelectedDesigFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-700"
          >
            <option value="ALL">All Designations</option>
            {designations.map((d) => (
              <option key={d.id} value={d.id}>{d.title}</option>
            ))}
          </select>

          <select
            value={selectedManagerFilter}
            onChange={(e) => setSelectedManagerFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-700"
          >
            <option value="ALL">All Managers</option>
            {allEmployees.map((m) => (
              <option key={m.id} value={m.id}>
                Mgr: {m.firstName} {m.lastName}
              </option>
            ))}
          </select>

          <select
            value={selectedStatusFilter}
            onChange={(e) => setSelectedStatusFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-700"
          >
            <option value="ALL">All Statuses</option>
            <option value="Active">Active</option>
            <option value="On Leave">On Leave</option>
            <option value="Probation">Probation</option>
            <option value="Separated">Separated</option>
            <option value="Inactive">Inactive</option>
          </select>

          <select
            value={selectedClientFilter}
            onChange={(e) => setSelectedClientFilter(e.target.value as any)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-700"
          >
            <option value="ALL">All Assignments</option>
            <option value="DEPLOYED">Deployed to Client</option>
            <option value="INTERNAL">Internal Operations</option>
          </select>

          {hasActiveFilters && (
            <button
              onClick={() => {
                setSelectedDeptFilter('ALL');
                setSelectedDesigFilter('ALL');
                setSelectedManagerFilter('ALL');
                setSelectedStatusFilter('ALL');
                setSelectedClientFilter('ALL');
              }}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-indigo-700 hover:bg-indigo-50 rounded-lg font-semibold"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Clear Filters</span>
            </button>
          )}
        </div>
      )}

      {/* TAB 2: EMPLOYEE DIRECTORY TABLE */}
      {viewMode === 'directory' && (
        <DataTable
          data={filteredRows}
          columns={columns}
          searchPlaceholder={isRegularEmployee ? "Search colleagues by name or official contact..." : "Search employees by name, ID, or email..."}
          searchFilterKey={(emp: any) => `${emp.id || ''} ${emp.firstName} ${emp.lastName} ${emp.officialEmail || emp.email || ''} ${emp.officialPhone || emp.phone || ''}`}
        />
      )}

      {/* TAB 3: REPORTING HIERARCHY */}
      {viewMode === 'hierarchy' && (
        <OrgChart onSelectEmployee={(emp) => setSelectedEmployee(emp)} />
      )}


      {/* Profile Modal with Role-Based Scoped Rendering */}
      <EmployeeProfileModal
        employee={selectedEmployee ? db.getEmployeeById(selectedEmployee.id) || selectedEmployee : null}
        isOpen={!!selectedEmployee}
        onClose={() => setSelectedEmployee(null)}
      />

      {/* Edit Employee Modal (Preserves all existing fields) */}
      {editingEmployee && isHR && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <form
            onSubmit={handleSaveEditedEmployee}
            className="bg-white rounded-xl max-w-2xl w-full p-6 shadow-xl border border-slate-200 space-y-4 text-xs max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h4 className="text-base font-bold text-slate-900">
                  Edit Employee Record ({editingEmployee.id})
                </h4>
                <p className="text-slate-500">Update personal, organizational, or compensation details without losing historical data.</p>
              </div>
              <button type="button" onClick={() => { setEditingEmployee(null); setEditError(''); }} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            {editError && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 font-medium">
                {editError}
              </div>
            )}

            {/* Employee Photo Capture / Upload */}
            <PhotoCaptureField
              value={editingEmployee.avatarUrl}
              onChange={(newUrl) => setEditingEmployee({ ...editingEmployee, avatarUrl: newUrl })}
              label="Employee Photograph (Live Camera Capture or File Upload)"
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-600 font-semibold mb-1">First Name *</label>
                <input
                  required
                  value={editingEmployee.firstName}
                  onChange={(e) => setEditingEmployee({ ...editingEmployee, firstName: e.target.value })}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Last Name *</label>
                <input
                  required
                  value={editingEmployee.lastName}
                  onChange={(e) => setEditingEmployee({ ...editingEmployee, lastName: e.target.value })}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Official Email *</label>
                <input
                  type="email"
                  required
                  value={editingEmployee.officialEmail || editingEmployee.email}
                  onChange={(e) =>
                    setEditingEmployee({
                      ...editingEmployee,
                      email: e.target.value,
                      officialEmail: e.target.value
                    })
                  }
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Official Mobile *</label>
                <input
                  required
                  value={editingEmployee.officialPhone || editingEmployee.phone}
                  onChange={(e) =>
                    setEditingEmployee({
                      ...editingEmployee,
                      phone: e.target.value,
                      officialPhone: e.target.value
                    })
                  }
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Department</label>
                <select
                  value={editingEmployee.departmentId}
                  onChange={(e) => setEditingEmployee({ ...editingEmployee, departmentId: e.target.value })}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg"
                >
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Designation</label>
                <select
                  value={editingEmployee.designationId}
                  onChange={(e) => setEditingEmployee({ ...editingEmployee, designationId: e.target.value })}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg"
                >
                  {designations.map((d) => (
                    <option key={d.id} value={d.id}>{d.title}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Branch</label>
                <select
                  value={editingEmployee.branchId}
                  onChange={(e) => setEditingEmployee({ ...editingEmployee, branchId: e.target.value })}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg"
                >
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>{b.name} ({b.city})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Employment Status</label>
                <select
                  value={editingEmployee.status}
                  onChange={(e) => setEditingEmployee({ ...editingEmployee, status: e.target.value as EmploymentStatus })}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg"
                >
                  <option value="Active">Active</option>
                  <option value="Probation">Probation</option>
                  <option value="On Leave">On Leave</option>
                  <option value="Notice Period">Notice Period</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Reporting Manager</label>
                <select
                  value={editingEmployee.reportingManagerId || ''}
                  onChange={(e) => setEditingEmployee({ ...editingEmployee, reportingManagerId: e.target.value || undefined })}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg"
                >
                  <option value="">Company Board</option>
                  {allEmployees
                    .filter((m) => m.id !== editingEmployee.id)
                    .map((m) => (
                      <option key={m.id} value={m.id}>{m.firstName} {m.lastName} ({m.id})</option>
                    ))}
                </select>
              </div>
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Annual Base CTC (₹)</label>
                <input
                  type="number"
                  min={100000}
                  value={editingEmployee.baseSalaryAnnual}
                  onChange={(e) => setEditingEmployee({ ...editingEmployee, baseSalaryAnnual: Number(e.target.value) })}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg font-mono"
                />
              </div>
            </div>

            {/* Configurable Employee-Level Statutory Settings */}
            <div className="p-3 bg-indigo-50/40 rounded-xl border border-indigo-200/70 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-indigo-950 flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-indigo-600" />
                  Statutory & Tax Eligibility (Configurable)
                </span>
                <span className="text-[10px] text-indigo-700">Non-mandatory per employee</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div className="bg-white p-2.5 rounded-lg border border-slate-200 space-y-1.5">
                  <label className="flex items-center gap-2 font-semibold text-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editingEmployee.epfApplicable !== false}
                      onChange={(e) => setEditingEmployee({ ...editingEmployee, epfApplicable: e.target.checked })}
                    />
                    <span>EPF Applicable</span>
                  </label>
                  <label className="flex items-center gap-2 text-[11px] text-slate-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editingEmployee.epfWageCeilingApplied !== false}
                      onChange={(e) => setEditingEmployee({ ...editingEmployee, epfWageCeilingApplied: e.target.checked })}
                    />
                    <span>Cap at ₹15k Wage Ceiling</span>
                  </label>
                  <input
                    value={editingEmployee.pfUan || ''}
                    onChange={(e) => setEditingEmployee({ ...editingEmployee, pfUan: e.target.value })}
                    placeholder="PF UAN (Optional)"
                    className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded font-mono text-[11px]"
                  />
                </div>
                <div className="bg-white p-2.5 rounded-lg border border-slate-200 space-y-1.5">
                  <label className="flex items-center gap-2 font-semibold text-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editingEmployee.esiApplicable === true}
                      onChange={(e) => setEditingEmployee({ ...editingEmployee, esiApplicable: e.target.checked })}
                    />
                    <span>ESI Applicable</span>
                  </label>
                  <input
                    value={editingEmployee.esiNumber || ''}
                    onChange={(e) => setEditingEmployee({ ...editingEmployee, esiNumber: e.target.value })}
                    placeholder="ESI IP Number (Optional)"
                    className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded font-mono text-[11px]"
                  />
                  <label className="flex items-center gap-2 font-semibold text-slate-800 cursor-pointer pt-1">
                    <input
                      type="checkbox"
                      checked={editingEmployee.ptApplicable !== false}
                      onChange={(e) => setEditingEmployee({ ...editingEmployee, ptApplicable: e.target.checked })}
                    />
                    <span>Professional Tax (PT)</span>
                  </label>
                </div>
                <div className="bg-white p-2.5 rounded-lg border border-slate-200 space-y-1.5">
                  <label className="block font-semibold text-slate-700 text-[11px]">
                    Exemption / Override Note
                  </label>
                  <input
                    value={editingEmployee.statutoryExemptionReason || ''}
                    onChange={(e) => setEditingEmployee({ ...editingEmployee, statutoryExemptionReason: e.target.value })}
                    placeholder="e.g. Exempted consultant"
                    className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded text-[11px]"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditingEmployee(null)}
                className="px-4 py-1.5 text-slate-700 bg-white border border-slate-200 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg"
              >
                Save Employee Changes
              </button>
            </div>
          </form>
        </div>
      )}

      {/* New Employee Modal */}
      <NewEmployeeModal
        isOpen={isNewModalOpen}
        onClose={() => setIsNewModalOpen(false)}
        onCreated={(newEmp) => setSelectedEmployee(newEmp)}
      />

      {/* Validated CSV Import Modal */}
      <CsvImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        title="Bulk Import Employees (CSV)"
        description="Download the template or upload a CSV file. Duplicate official emails and missing fields are flagged per row."
        templateFileName="Orbyx_Employees"
        headers={['FirstName', 'LastName', 'Email', 'Phone', 'DepartmentId', 'DesignationId', 'BaseSalaryAnnual']}
        sampleRows={[
          ['Rohan', 'Verma', 'rohan.verma@orbyx.internal', '+91 98450 77881', 'DEP-ENG', 'DES-SWE', '1250000'],
          ['Divya', 'Nair', 'divya.nair@orbyx.internal', '+91 98450 77882', 'DEP-OPS', 'DES-PM', '1450000']
        ]}
        validateRow={(cols) => {
          const [firstName, lastName, email, phone, deptId, desigId, salaryStr] = cols;
          if (!firstName || !lastName || !email) {
            return { valid: false, error: 'Missing FirstName, LastName, or Email' };
          }
          if (!email.includes('@')) {
            return { valid: false, error: `Invalid email address "${email}"` };
          }
          const exists = allEmployees.some(
            (e) => (e.officialEmail || e.email).toLowerCase() === email.toLowerCase()
          );
          if (exists) {
            return { valid: false, error: `Duplicate email "${email}" already registered` };
          }
          return {
            valid: true,
            data: {
              firstName,
              lastName,
              email,
              phone: phone || '+91 98450 00000',
              deptId: deptId || 'DEP-ENG',
              desigId: desigId || 'DES-SWE',
              salary: Number(salaryStr) || 1200000
            }
          };
        }}
        onCommit={(validRows) => {
          validRows.forEach((r, idx) => {
            hrmsService.createEmployee(
              {
                userId: `user_${Date.now()}_${idx}`,
                firstName: r.firstName,
                lastName: r.lastName,
                email: r.email,
                officialEmail: r.email,
                phone: r.phone,
                officialPhone: r.phone,
                avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
                dateOfBirth: '1996-05-15',
                gender: 'Other',
                address: 'Bengaluru, Karnataka',
                emergencyContact: { name: 'Primary Kin', relationship: 'Family', phone: '+91 98000 00000' },
                departmentId: r.deptId,
                designationId: r.desigId,
                branchId: 'BR-BLR',
                employmentType: 'Permanent',
                status: 'Active',
                dateOfJoining: new Date().toISOString().slice(0, 10),
                noticePeriodDays: 60,
                reportingManagerId: 'EMP-002',
                shiftId: 'SHIFT-GEN',
                bankDetails: { accountNumber: '5010099887766', bankName: 'HDFC Bank', ifscOrRouting: 'HDFC0001234', accountType: 'Savings' },
                panOrTaxNumber: 'ABCDE1234F',
                baseSalaryAnnual: r.salary,
                salaryStructureId: 'STRUCT-MID'
              },
              currentUser.id,
              currentUser.name
            );
          });
          setNotice(`Successfully imported ${validRows.length} employee(s).`);
        }}
      />
    </div>
  );
};
