import React, { useState, useMemo } from 'react';
import { db } from '../../db/storage';
import { DataTable } from '../common/DataTable';
import { ExportButton } from '../common/ExportButton';
import { readClients, readAssignments } from '../clients/ClientManagement';
import { RotateCcw } from 'lucide-react';

export const ReportsHub: React.FC = () => {
  const [reportType, setReportType] = useState<'attendance' | 'headcount' | 'leave' | 'payroll' | 'expenses' | 'clients'>('attendance');
  const [deptFilter, setDeptFilter] = useState('ALL');

  // Section 11 Filters for Attendance & Client Verification Report
  const [attEmpFilter, setAttEmpFilter] = useState('ALL');
  const [attClientFilter, setAttClientFilter] = useState('ALL');
  const [attDeploymentFilter, setAttDeploymentFilter] = useState('ALL');
  const [attDateFrom, setAttDateFrom] = useState('');
  const [attDateTo, setAttDateTo] = useState('');
  const [attClientVerFilter, setAttClientVerFilter] = useState('ALL');
  const [attCompanyAppFilter, setAttCompanyAppFilter] = useState('ALL');
  const [attPayrollFilter, setAttPayrollFilter] = useState('ALL');

  const employees = db.getEmployees();
  const departments = db.getDepartments();
  const leaveApps = db.getLeaveApplications();
  const leaveTypes = db.getLeaveTypes();
  const payrollItems = db.getPayrollLineItems();
  const claims = db.getExpenseClaims();
  const categories = db.getExpenseCategories();
  const attendanceRecords = db.getAttendanceRecords();
  const clients = readClients();
  const assignments = readAssignments();

  // Filtered Attendance Report Data (Section 11)
  const filteredAttendanceReport = useMemo(() => {
    return attendanceRecords
      .filter((r) => {
        if (attEmpFilter !== 'ALL' && r.employeeId !== attEmpFilter) return false;
        if (attClientFilter !== 'ALL' && r.clientId !== attClientFilter) return false;
        if (attDeploymentFilter !== 'ALL' && r.assignmentId !== attDeploymentFilter) return false;
        if (attDateFrom && r.date < attDateFrom) return false;
        if (attDateTo && r.date > attDateTo) return false;
        const cVer = r.clientVerificationStatus || (r.workMode === 'Client Site' ? 'Pending' : 'Not Required');
        if (attClientVerFilter !== 'ALL' && cVer !== attClientVerFilter) return false;
        const cApp = r.companyApprovalStatus || (r.approvalStatus === 'Approved' ? 'Approved' : 'Pending');
        if (attCompanyAppFilter !== 'ALL' && cApp !== attCompanyAppFilter) return false;
        const pElig = r.payrollEligibilityStatus || (cApp === 'Approved' ? 'Eligible for Draft Payroll' : 'Not Eligible');
        if (attPayrollFilter !== 'ALL' && pElig !== attPayrollFilter) return false;
        return true;
      })
      .map((r) => {
        const emp = employees.find((e) => e.id === r.employeeId);
        const cli = clients.find((c) => c.id === r.clientId);
        const asg = assignments.find((a) => a.id === r.assignmentId);
        const cVer = r.clientVerificationStatus || (r.workMode === 'Client Site' ? 'Pending' : 'Not Required');
        const cApp = r.companyApprovalStatus || (r.approvalStatus === 'Approved' ? 'Approved' : 'Pending');
        const pElig = r.payrollEligibilityStatus || (cApp === 'Approved' ? 'Eligible for Draft Payroll' : 'Not Eligible');
        return {
          RecordID: r.id,
          EmployeeID: r.employeeId,
          EmployeeName: emp ? `${emp.firstName} ${emp.lastName}` : r.employeeId,
          Date: r.date,
          WorkMode: r.workMode || 'Office',
          ClientOrganization: cli?.name || (r.workMode === 'Client Site' ? r.clientId || 'Client Site' : 'Internal Office'),
          ProjectDeployment: asg?.project || r.projectName || '—',
          CheckIn: r.checkInTime || '--:--',
          CheckOut: r.checkOutTime || '--:--',
          HoursWorked: r.totalHoursWorked,
          AttendanceOutcome: r.status,
          ClientVerification: cVer,
          CompanyApproval: cApp,
          PayrollProcessing: pElig,
          ClientSupervisorEmail: r.clientSupervisorEmail || asg?.clientSupervisorEmail || '—'
        };
      });
  }, [
    attendanceRecords,
    attEmpFilter,
    attClientFilter,
    attDeploymentFilter,
    attDateFrom,
    attDateTo,
    attClientVerFilter,
    attCompanyAppFilter,
    attPayrollFilter,
    employees,
    clients,
    assignments
  ]);

  const attKpis = useMemo(() => {
    const total = filteredAttendanceReport.length;
    const pendingClientVer = filteredAttendanceReport.filter(
      (r) =>
        r.ClientVerification === 'Pending' ||
        r.ClientVerification === 'Verification Requested' ||
        r.ClientVerification === 'Correction Requested'
    ).length;
    const verified = filteredAttendanceReport.filter((r) => r.ClientVerification === 'Verified').length;
    const disputed = filteredAttendanceReport.filter((r) => r.ClientVerification === 'Disputed').length;
    const pendingCompany = filteredAttendanceReport.filter(
      (r) => r.CompanyApproval === 'Pending' || r.CompanyApproval === 'Returned for Correction'
    ).length;
    const approvedCompany = filteredAttendanceReport.filter((r) => r.CompanyApproval === 'Approved').length;
    const payrollEligible = filteredAttendanceReport.filter((r) => r.PayrollProcessing !== 'Not Eligible').length;
    return { total, pendingClientVer, verified, disputed, pendingCompany, approvedCompany, payrollEligible };
  }, [filteredAttendanceReport]);

  // 1. Headcount by Department
  const headcountData = departments
    .filter((d) => deptFilter === 'ALL' || d.name === deptFilter)
    .map((dept) => {
      const deptEmps = employees.filter((e) => e.departmentId === dept.id);
      const active = deptEmps.filter((e) => e.status === 'Active' || e.status === 'Probation').length;
      return {
        Department: dept.name,
        Code: dept.code,
        TotalStaff: deptEmps.length,
        Active: active,
        OnLeave: deptEmps.filter((e) => e.status === 'On Leave').length
      };
    });

  // 2. Leave Utilization
  const leaveUtilData = leaveTypes.map((lt) => {
    const apps = leaveApps.filter((a) => a.leaveTypeId === lt.id && a.status === 'Approved');
    const totalDaysTaken = apps.reduce((acc, a) => acc + a.totalDays, 0);
    return {
      LeaveType: lt.name,
      Code: lt.code,
      Category: lt.isPaid ? 'Paid' : 'Unpaid',
      Status: lt.isActive === false ? 'Inactive' : 'Active',
      AnnualEntitlement: lt.annualEntitlement,
      TotalDaysTaken: totalDaysTaken,
      ApprovedRequests: apps.length
    };
  });

  // 3. Filtered Payroll Summary
  const filteredPayrollItems = payrollItems.filter(
    (item) => deptFilter === 'ALL' || item.departmentName === deptFilter
  );

  // 4. Expense by Category
  const expenseSummaryData = categories.map((cat) => {
    const catClaims = claims.filter((c) => c.categoryId === cat.id);
    const totalClaimed = catClaims.reduce((acc, c) => acc + c.amount, 0);
    const reimbursed = catClaims.filter((c) => c.status === 'Reimbursed').reduce((acc, c) => acc + c.amount, 0);
    const pending = catClaims.filter((c) => c.status !== 'Reimbursed' && c.status !== 'Rejected').reduce((acc, c) => acc + c.amount, 0);
    return {
      Category: cat.name,
      Code: cat.code,
      MaxLimitPerClaim: `₹${cat.maxLimitPerClaim.toLocaleString()}`,
      TotalClaimsCount: catClaims.length,
      TotalAmountClaimed: `₹${totalClaimed.toLocaleString()}`,
      ReimbursedAmount: `₹${reimbursed.toLocaleString()}`,
      PendingAmount: `₹${pending.toLocaleString()}`
    };
  });

  // 5. Client Deployment Utilization
  const clientReportData = clients.map((c) => {
    const cAssigns = assignments.filter((a) => a.clientId === c.id);
    const activeAssigns = cAssigns.filter((a) => a.status === 'Active');
    const allowanceTotal = activeAssigns.reduce((sum, a) => sum + (a.allowanceMonthly || 0), 0);
    return {
      ClientID: c.id,
      ClientName: c.name,
      Location: c.address,
      Status: c.status,
      ActiveDeployments: activeAssigns.length,
      TotalHistoricalDeployments: cAssigns.length,
      MonthlyOnsiteAllowances: `₹${allowanceTotal.toLocaleString()}`
    };
  });

  return (
    <div className="space-y-5">
      {/* Selector Tabs */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1 bg-slate-100 p-1 rounded-lg">
          <button
            onClick={() => setReportType('attendance')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              reportType === 'attendance' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Attendance & Client Verification
          </button>
          <button
            onClick={() => setReportType('headcount')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              reportType === 'headcount' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Headcount Report
          </button>
          <button
            onClick={() => setReportType('leave')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              reportType === 'leave' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Leave Utilization
          </button>
          <button
            onClick={() => setReportType('payroll')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              reportType === 'payroll' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Payroll Summary
          </button>
          <button
            onClick={() => setReportType('expenses')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              reportType === 'expenses' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Expense Categorization
          </button>
          <button
            onClick={() => setReportType('clients')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              reportType === 'clients' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Client Deployments
          </button>
        </div>

        <div className="flex items-center gap-2">
          {(reportType === 'headcount' || reportType === 'payroll') && (
            <>
              <select
                value={deptFilter}
                onChange={(e) => setDeptFilter(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
              >
                <option value="ALL">All Departments</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.name}>{d.name}</option>
                ))}
              </select>
              {deptFilter !== 'ALL' && (
                <button
                  onClick={() => setDeptFilter('ALL')}
                  className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg"
                  title="Clear Department Filter"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </button>
              )}
            </>
          )}

          <ExportButton
            data={
              reportType === 'attendance'
                ? filteredAttendanceReport
                : reportType === 'headcount'
                ? headcountData
                : reportType === 'leave'
                ? leaveUtilData
                : reportType === 'payroll'
                ? filteredPayrollItems
                : reportType === 'expenses'
                ? expenseSummaryData
                : clientReportData
            }
            fileName={`Orbyx_Report_${reportType}`}
          />
        </div>
      </div>

      {/* Attendance & Client Verification Report (Section 11) */}
      {reportType === 'attendance' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
            <div className="bg-white p-3 rounded-xl border border-slate-200">
              <p className="text-[10px] font-semibold uppercase text-slate-400">Total Recorded</p>
              <p className="text-lg font-bold text-slate-900 mt-0.5">{attKpis.total}</p>
            </div>
            <div className="bg-white p-3 rounded-xl border border-amber-200">
              <p className="text-[10px] font-semibold uppercase text-amber-700">Pending Client Email</p>
              <p className="text-lg font-bold text-amber-700 mt-0.5">{attKpis.pendingClientVer}</p>
            </div>
            <div className="bg-white p-3 rounded-xl border border-blue-200">
              <p className="text-[10px] font-semibold uppercase text-blue-700">Client Verified</p>
              <p className="text-lg font-bold text-blue-700 mt-0.5">{attKpis.verified}</p>
            </div>
            <div className="bg-white p-3 rounded-xl border border-rose-200">
              <p className="text-[10px] font-semibold uppercase text-rose-700">Disputed Attendance</p>
              <p className="text-lg font-bold text-rose-700 mt-0.5">{attKpis.disputed}</p>
            </div>
            <div className="bg-white p-3 rounded-xl border border-purple-200">
              <p className="text-[10px] font-semibold uppercase text-purple-700">Pending Company App.</p>
              <p className="text-lg font-bold text-purple-700 mt-0.5">{attKpis.pendingCompany}</p>
            </div>
            <div className="bg-white p-3 rounded-xl border border-emerald-200">
              <p className="text-[10px] font-semibold uppercase text-emerald-700">Approved Attendance</p>
              <p className="text-lg font-bold text-emerald-700 mt-0.5">{attKpis.approvedCompany}</p>
            </div>
            <div className="bg-white p-3 rounded-xl border border-indigo-200">
              <p className="text-[10px] font-semibold uppercase text-indigo-700">Eligible for Payroll</p>
              <p className="text-lg font-bold text-indigo-700 mt-0.5">{attKpis.payrollEligible}</p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">Employee</label>
              <select
                value={attEmpFilter}
                onChange={(e) => setAttEmpFilter(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg"
              >
                <option value="ALL">All Employees</option>
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.firstName} {e.lastName} ({e.id})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">Client</label>
              <select
                value={attClientFilter}
                onChange={(e) => setAttClientFilter(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg"
              >
                <option value="ALL">All Clients & Office</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.id})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">Project / Deployment</label>
              <select
                value={attDeploymentFilter}
                onChange={(e) => setAttDeploymentFilter(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg"
              >
                <option value="ALL">All Deployments</option>
                {assignments.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.project} ({a.id})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">Client Verification Status</label>
              <select
                value={attClientVerFilter}
                onChange={(e) => setAttClientVerFilter(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg"
              >
                <option value="ALL">All Client Verification</option>
                <option value="Not Required">Not Required</option>
                <option value="Pending">Pending</option>
                <option value="Verification Requested">Verification Requested</option>
                <option value="Verified">Verified</option>
                <option value="Disputed">Disputed</option>
                <option value="Correction Requested">Correction Requested</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">Company Approval Status</label>
              <select
                value={attCompanyAppFilter}
                onChange={(e) => setAttCompanyAppFilter(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg"
              >
                <option value="ALL">All Company Approvals</option>
                <option value="Pending">Pending</option>
                <option value="Approved">Approved</option>
                <option value="Rejected">Rejected</option>
                <option value="Returned for Correction">Returned for Correction</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">Payroll Processing Status</label>
              <select
                value={attPayrollFilter}
                onChange={(e) => setAttPayrollFilter(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg"
              >
                <option value="ALL">All Payroll Statuses</option>
                <option value="Not Eligible">Not Eligible</option>
                <option value="Eligible for Draft Payroll">Eligible for Draft Payroll</option>
                <option value="Included in Draft Payroll">Included in Draft Payroll</option>
                <option value="Finalized">Finalized</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">Date From</label>
              <input
                type="date"
                value={attDateFrom}
                onChange={(e) => setAttDateFrom(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg"
              />
            </div>
            <div className="flex items-end gap-1.5">
              <div className="flex-1">
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">Date To</label>
                <input
                  type="date"
                  value={attDateTo}
                  onChange={(e) => setAttDateTo(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>
              <button
                onClick={() => {
                  setAttEmpFilter('ALL');
                  setAttClientFilter('ALL');
                  setAttDeploymentFilter('ALL');
                  setAttDateFrom('');
                  setAttDateTo('');
                  setAttClientVerFilter('ALL');
                  setAttCompanyAppFilter('ALL');
                  setAttPayrollFilter('ALL');
                }}
                className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg"
                title="Reset Filters"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <DataTable
            data={filteredAttendanceReport}
            columns={[
              { header: 'Employee', accessorKey: 'EmployeeName', sortable: true },
              { header: 'Date', accessorKey: 'Date', sortable: true },
              { header: 'Client / Office', accessorKey: 'ClientOrganization', sortable: true },
              { header: 'Project', accessorKey: 'ProjectDeployment', sortable: true },
              { header: 'Hours', accessorKey: 'HoursWorked', sortable: true },
              { header: '1. Outcome', accessorKey: 'AttendanceOutcome', sortable: true },
              { header: '2. Client Email', accessorKey: 'ClientVerification', sortable: true },
              { header: '3. Company App.', accessorKey: 'CompanyApproval', sortable: true },
              { header: '4. Payroll Status', accessorKey: 'PayrollProcessing', sortable: true }
            ]}
            searchPlaceholder="Search attendance report by employee, client, project, or status..."
          />
        </div>
      )}

      {/* Headcount Report */}
      {reportType === 'headcount' && (
        <DataTable
          data={headcountData}
          columns={[
            { header: 'Department', accessorKey: 'Department', sortable: true },
            { header: 'Code', accessorKey: 'Code', sortable: true },
            { header: 'Total Staff', accessorKey: 'TotalStaff', sortable: true },
            { header: 'Active Employees', accessorKey: 'Active', sortable: true },
            { header: 'On Leave Today', accessorKey: 'OnLeave', sortable: true }
          ]}
          searchPlaceholder="Filter departments..."
        />
      )}

      {/* Leave Utilization Report */}
      {reportType === 'leave' && (
        <DataTable
          data={leaveUtilData}
          columns={[
            { header: 'Leave Category', accessorKey: 'LeaveType', sortable: true },
            { header: 'Code', accessorKey: 'Code', sortable: true },
            { header: 'Type', accessorKey: 'Category', sortable: true },
            { header: 'Policy Status', accessorKey: 'Status', sortable: true },
            { header: 'Annual Entitlement', accessorKey: 'AnnualEntitlement', sortable: true },
            { header: 'Total Days Utilized', accessorKey: 'TotalDaysTaken', sortable: true },
            { header: 'Approved Applications', accessorKey: 'ApprovedRequests', sortable: true }
          ]}
          searchPlaceholder="Filter leave types..."
        />
      )}

      {/* Payroll Summary Report */}
      {reportType === 'payroll' && (
        <DataTable
          data={filteredPayrollItems}
          columns={[
            { header: 'Employee', accessorKey: 'employeeName', sortable: true },
            { header: 'Department', accessorKey: 'departmentName', sortable: true },
            { header: 'Payable Days', accessorKey: 'payableDays', sortable: true },
            { header: 'Gross Earnings', accessorKey: 'grossEarnings', sortable: true, cell: (i) => `₹${i.grossEarnings.toLocaleString()}` },
            { header: 'PF Employee', accessorKey: 'pfEmployee', sortable: true, cell: (i) => `₹${i.pfEmployee.toLocaleString()}` },
            { header: 'TDS Tax', accessorKey: 'tdsWithholding', sortable: true, cell: (i) => `₹${i.tdsWithholding.toLocaleString()}` },
            { header: 'Net Pay', accessorKey: 'netPayable', sortable: true, cell: (i) => `₹${i.netPayable.toLocaleString()}` }
          ]}
          searchPlaceholder="Search payroll register..."
        />
      )}

      {/* Expense Summary Report */}
      {reportType === 'expenses' && (
        <DataTable
          data={expenseSummaryData}
          columns={[
            { header: 'Category Name', accessorKey: 'Category', sortable: true },
            { header: 'Code', accessorKey: 'Code', sortable: true },
            { header: 'Max Limit / Claim', accessorKey: 'MaxLimitPerClaim', sortable: true },
            { header: 'Claims Filed', accessorKey: 'TotalClaimsCount', sortable: true },
            { header: 'Total Claimed', accessorKey: 'TotalAmountClaimed', sortable: true },
            { header: 'Reimbursed Total', accessorKey: 'ReimbursedAmount', sortable: true },
            { header: 'Pending Payout', accessorKey: 'PendingAmount', sortable: true }
          ]}
          searchPlaceholder="Filter expense categories..."
        />
      )}

      {/* Client Deployment Report */}
      {reportType === 'clients' && (
        <DataTable
          data={clientReportData}
          columns={[
            { header: 'Client ID', accessorKey: 'ClientID', sortable: true },
            { header: 'Client Organization', accessorKey: 'ClientName', sortable: true },
            { header: 'Location', accessorKey: 'Location', sortable: true },
            { header: 'Contract Status', accessorKey: 'Status', sortable: true },
            { header: 'Active Deployments', accessorKey: 'ActiveDeployments', sortable: true },
            { header: 'Total Historical', accessorKey: 'TotalHistoricalDeployments', sortable: true },
            { header: 'Monthly Onsite Allowances', accessorKey: 'MonthlyOnsiteAllowances', sortable: true }
          ]}
          searchPlaceholder="Search client organizations..."
        />
      )}
    </div>
  );
};

