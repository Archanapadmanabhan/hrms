# ORBYX HRMS — COMPLETE PRODUCT REQUIREMENTS AND DEVELOPMENT MASTER PROMPT

## 1. YOUR ROLE

Act as a senior product architect, HRMS business analyst, UI/UX designer, full-stack developer, database architect, and application security engineer.

Build **Orbyx HRMS**, an integrated Human Resource Management System designed to manage an organization's workforce, employee lifecycle, payroll, expenses, assets, attendance, shifts, and client deployments.

You must understand the business requirements, define the data relationships, implement the workflows, and build a complete, responsive, functional application.

Do not treat this as a simple dashboard design exercise. Every module must have real business logic, validated data, role-based permissions, appropriate status transitions, and integration with related modules.

Do not assume any previous conversation or existing application. All requirements and business rules are specified in this prompt.

## 2. PRODUCT VISION

Orbyx HRMS will serve as a centralized system for managing the complete employee lifecycle and internal workforce operations.

The system must allow HR to manage the organization and employees, employees to access their own information and submit requests, and Senior Management to monitor operations and approve authorized transactions.

It must also support employees who are assigned to external client organizations to provide services. Their client assignments, attendance, overtime, eligible benefits, expenses, and assignment lifecycle must be traceable without creating duplicate employee records.

### Primary modules

1. HR Setup
2. Leaves
3. Payroll
4. Expenses
5. Asset Management
6. Shift / Attendance

### Additional integrated module

7. Client Management

Supporting capabilities include dashboards, notifications, employee profiles, onboarding, offboarding, approval workflows, reports, audit history, bulk import/export, organization settings, and document management.

The application name must be **Orbyx HRMS** throughout the interface, application title, navigation, login page, and branding.

Do not use the name KiteHR or any other HRMS name.

## 3. USERS, ROLES, AND ACCESS CONTROL

Initially implement three primary roles:

- HR
- Senior Management
- Employee

The architecture must support adding more roles in the future.

Permissions must be defined centrally and enforced consistently throughout the application. Each module must behave differently according to the logged-in user's role and assigned permissions.

A role determines what a user can do. A data scope determines which records they can access.

Support these permission dimensions:

- View
- Create
- Edit
- Delete or deactivate where permitted
- Submit
- Approve
- Reject
- Export
- Configure or administer

Also support data scopes such as own records, assigned team, department, branch, organization, and assigned client engagements.

### 3.1 HR role

HR manages employee administration and the company's HR operations.

HR must be able to:

- Create and manage organization records.
- Manage branches, departments, designations, job levels, and reporting hierarchy.
- Create and maintain employee records.
- Manage onboarding, employee photographs, certificates, and documents.
- Manage employment details, probation, promotions, transfers, and reporting changes.
- Manage offboarding and exit-clearance workflows.
- Configure leave types, entitlements, holidays, and policies.
- Maintain shifts, attendance policies, and overtime records.
- Administer salary structures and payroll processing according to permissions.
- Manage salary advances, expense claims, petty cash, reimbursements, and transaction history.
- Manage physical assets, email accounts, software licenses, and subscriptions.
- Register client organizations and manage employee client assignments.
- Generate authorized reports and perform bulk import/export.
- View audit history and administer configured policies.

HR must not automatically be allowed to approve every transaction they create. Separate transaction initiation, approval, and payment permissions wherever required.

### 3.2 Senior Management role

Senior Management must have organization-wide visibility into authorized operational and financial information.

They must be able to:

- View organization structure and workforce summaries.
- Review employee information within their permissions.
- Review payroll totals, salary costs, and payroll history.
- Approve or reject payroll runs where authorized.
- Review salary advances, travel petty cash, expenses, and reimbursements.
- Approve or reject assigned requests.
- Review attendance exceptions and overtime.
- View asset inventory, software costs, subscriptions, and asset utilization.
- Review client assignments, deployment status, client-related expenses, and workforce utilization.
- Access organization-level reports and dashboards.
- Review audit history when authorized.

Sensitive employee information, including bank details and confidential identity documents, must remain restricted unless explicit permission is granted.

### 3.3 Employee role

Employees must have access to their own records and authorized self-service functionality.

They must be able to:

- View their own profile and employment details.
- Edit permitted personal information.
- Upload photographs, certificates, and requested documents.
- View leave balances and apply for leave.
- View their own attendance and shifts.
- Request attendance corrections.
- Submit overtime requests where the workflow requires them.
- View their own payslips and authorized salary information.
- Request salary advances.
- Request travel petty cash and submit travel settlements.
- Submit expenses with receipts.
- Track reimbursements and outstanding advances.
- View their own financial transaction history.
- View assigned hardware and digital assets.
- View current and historical client assignments relevant to them.
- View request statuses, notifications, and authorized reports.

Employees must not modify approved payroll records, alter their own salary structures, approve their own requests, access other employees' private records, or change their own permissions.

### 3.4 Future role support

Design the role and permission architecture so that additional roles, such as department managers or finance administrators, can be introduced through configuration rather than requiring a rewrite of all modules.

Do not rely only on frontend visibility rules. Enforce permissions at the business logic and backend/API layers.

## 4. APPLICATION NAVIGATION

Create a clean, enterprise-style application with a collapsible sidebar.

Use the following navigation structure:

**Workspace**
- Dashboard

**HR Setup**
- Organization Setup
- Employee Setup

**People Operations**
- Leaves
- Shift / Attendance

**Finance**
- Payroll
- Expenses

**Resources**
- Asset Management
- Client Management

**Administration**
- Reports
- Notifications
- Audit Logs
- Settings

Show only the sections and actions the logged-in user is authorized to access.

The sidebar must be collapsible on desktop and become a responsive navigation drawer on mobile.

Use clear page titles, breadcrumbs, consistent icons, status indicators, forms, tables, filters, tabs, confirmation dialogs, and useful success or error messages.

## 5. HR SETUP

HR Setup must be divided into two independent sections: **Organization Setup** and **Employee Setup**.

They must be separate navigation destinations, separate interfaces, and logically separate data entities, while maintaining proper relationships between them.

### 5.1 Organization Setup

This module maintains the company's organizational structure and policies.

#### Organization Profile
- Organization name and unique organization code.
- Legal entity name.
- Registered address.
- Contact information.
- Applicable registration and tax identifiers.
- Payroll currency.
- Financial year.
- Working days and standard working hours.
- Organization status.

#### Branch Management
- Branch name and code.
- Address and contact information.
- Associated legal entity.
- Branch head.
- Active/inactive status.

#### Department Management
- Department name and code.
- Department head.
- Parent department where applicable.
- Branch or organizational association.
- Department status.

#### Designation and Job Level Management
- Designation title and code.
- Department association.
- Job level or grade.
- Employment category where relevant.
- Active/inactive status.

#### Organizational Hierarchy
- Employee reporting manager.
- Department head.
- Senior management relationships.
- Reporting changes with effective dates.
- Visual organization chart.

Prevent circular reporting, invalid managers, and self-reporting.

#### Policy Configuration
Provide configurable policies for leaves, attendance, shifts, payroll, expenses, asset assignments, client deployment, and approvals.

Organization Setup must be managed only by authorized users.

### 5.2 Employee Setup

Employee Setup manages the complete employee lifecycle.

#### Employee Directory

Display:

- Employee ID.
- Photograph.
- Full name.
- Official email.
- Department.
- Designation.
- Reporting manager.
- Branch.
- Joining date.
- Employment type.
- Employment status.
- Current client assignment where applicable.

Provide search, sorting, filtering, pagination, and employee detail navigation.

#### Employee Profile

Organize information into tabs:

1. Personal Information
2. Employment Information
3. Organization and Reporting
4. Salary and Compensation
5. Leaves
6. Shift and Attendance
7. Expenses and Advances
8. Assets and Software Access
9. Client Assignments
10. Documents and Certificates
11. Onboarding and Offboarding

Display sensitive information only to authorized users.

#### Onboarding

Implement the workflow:

Employee creation → Unique employee ID → Personal information → Employment details → Department and designation → Reporting manager → Joining date and probation → Salary structure → Shift assignment → Leave policy assignment → Hardware allocation → Software access provisioning → Document verification → Onboarding completion.

Use an onboarding checklist with pending, completed, and overdue statuses.

#### Offboarding

Implement:

- Resignation or termination recording.
- Exit reason and last working date.
- Notice period tracking.
- Departmental clearance.
- Hardware recovery.
- Email and software access revocation.
- Petty cash and advance reconciliation.
- Outstanding expense and reimbursement processing.
- Final payroll settlement.
- Exit documents.
- Clearance approvals.
- Separation confirmation.

An employee must not be marked fully cleared while mandatory clearance items remain unresolved unless an authorized exception is recorded.

Do not delete separated employees or their historical records.

#### Employee documents

Support profile photographs, educational certificates, employment documents, identity documents, and other configured document types.

Track document type, upload date, verification status, expiry date where applicable, and authorized access.

#### Bulk import/export

Support employee data import using CSV and XLSX where available.

Provide a sample template, column mapping, validation, duplicate detection, preview, row-level errors, import summary, and error report.

Exports must respect role permissions and exclude unauthorized sensitive fields.

## 6. LEAVES MODULE

Implement a complete leave-management workflow.

HR must be able to configure leave types, entitlements, accrual, carry-forward, holidays, working calendars, eligibility, and approval rules.

Employees must be able to:

- View leave balances.
- Apply for leave.
- Select leave type and dates.
- Request half-day leave where supported.
- Provide a reason and supporting document.
- Track approval status.
- Withdraw eligible pending requests.

Senior Management must be able to view authorized team or organization leave summaries and approve requests assigned to them.

Business rules:

- Validate date ranges and overlapping leave applications.
- Calculate working days using the assigned calendar.
- Apply eligibility and available-balance rules.
- Support unpaid leave where configured.
- Record approvals, rejections, comments, and adjustments.
- Prevent unauthorized leave-balance modifications.
- Integrate approved leave with attendance and applicable payroll calculations.

## 7. PAYROLL MODULE

Payroll is a critical financial module and must have accurate calculations, controlled approvals, transaction history, and clear separation of requested, approved, calculated, and paid amounts.

### 7.1 Salary structures

Support configurable components:

- Basic salary.
- House Rent Allowance.
- Other allowances.
- Incentives and bonuses.
- Overtime earnings where applicable.
- Other earnings.
- Employee deductions.
- Employer contributions.
- Applicable tax and statutory deductions.

Salary structures must support effective dates and revision history.

Do not hardcode a single salary formula for every employee.

### 7.2 Payroll processing

Implement the workflow:

1. Select organization and payroll period.
2. Retrieve eligible employees.
3. Retrieve the applicable salary structures.
4. Retrieve attendance records and approved overtime.
5. Apply relevant leave and unpaid leave rules.
6. Include eligible earnings and allowances.
7. Apply authorized deductions and eligible salary advance recoveries.
8. Calculate gross earnings, total deductions, and net salary.
9. Validate missing information and exceptional values.
10. Display an employee-wise payroll preview.
11. Submit the payroll run for approval.
12. Approve or reject the run according to the configured workflow.
13. Record payment status and transaction references.
14. Generate payslips and payroll reports.

Provide calculation breakdowns and validation errors.

Use a unique payroll-period identifier and prevent duplicate payroll runs or duplicate payments.

Once approved, payroll must be locked against ordinary edits. Corrections must use an authorized amendment or reversal process.

Distinguish Draft, Calculated, Pending Approval, Approved, Payment Pending, Paid, and Failed states as appropriate.

Do not claim that payment has been completed unless a payment record or real payment integration confirms it.

### 7.3 Salary advances

Employees can request salary advances.

Maintain:

- Request ID.
- Employee ID.
- Requested amount.
- Reason.
- Request date.
- Requested repayment schedule.
- Approved amount.
- Approver and approval date.
- Disbursement date and transaction reference.
- Amount recovered.
- Outstanding balance.
- Status.

Workflow:

Request → Approval → Disbursement record → Scheduled payroll recovery → Balance reconciliation → Closure.

A request alone must never trigger a salary deduction.

Only eligible, approved, disbursed advances can be recovered, and deductions must not exceed the outstanding recoverable amount or applicable configured limits.

### 7.4 Payslips and reports

Employees must access their own payslips.

Authorized HR and Senior Management users may access employee or organization payroll data according to permissions.

Include payroll summaries, earnings and deduction breakdowns, advance recovery reports, overtime costs, payroll exceptions, and payment reconciliation.

## 8. EXPENSES MODULE

Expenses must cover the complete lifecycle of employee spending, travel advances, petty cash, settlements, and reimbursements.

Do not combine different financial transaction types into a single generic expense record.

### 8.1 Expense categories

Support configurable categories including travel, accommodation, meals, transportation, client visits, office purchases, project expenses, communication, and other business expenses.

### 8.2 Employee expense claims

Employees must be able to:

- Create and save draft claims.
- Select an expense category and date.
- Enter amount, currency, purpose, and description.
- Associate the claim with a client or project where relevant.
- Upload receipts and invoices.
- Submit claims.
- Track approval and reimbursement status.

Validate amounts, dates, required fields, duplicate claims, and configured policy limits.

### 8.3 Travel petty cash and advances

Support a dedicated travel advance workflow.

Capture employee, travel purpose, client/project, destination, travel dates, requested amount, supporting documents, approver, approved amount, and disbursement reference.

After travel, the employee submits the actual expenses with receipts.

Calculate:

Settlement balance = Total actual eligible expenses − Advance disbursed.

- Positive balance: potentially payable to the employee.
- Negative balance: amount recoverable from the employee.
- Zero: no remaining settlement difference.

Require appropriate review and the necessary payment or refund records before closing the settlement.

### 8.4 Reimbursements

Support employee-paid business expenses, approval, receipt verification, payment status, payment date, transaction reference, and outstanding reimbursement balances.

An approved claim is not automatically a paid claim.

### 8.5 Transaction history

Maintain a transaction ledger with:

- Transaction ID.
- Employee.
- Transaction type.
- Amount and currency.
- Date.
- Associated claim or advance.
- Approval status.
- Disbursement or payment status.
- Payment method and reference where relevant.
- Client or project association.
- Actor and timestamp.

Provide employee-wise, category-wise, client-wise, and period-wise reports.

Prevent duplicate disbursements, duplicate reimbursements, and unauthorized edits.

### 8.6 Role-based expense access

Employees manage their own requests and settlements.

Senior Management reviews and approves assigned transactions and accesses authorized summaries.

HR administers records and workflows according to granted permissions.

Separate approval, disbursement, and reconciliation permissions where appropriate.

## 9. ASSET MANAGEMENT

Asset Management must support two primary categories: **Hardware Assets** and **Software & Digital Assets**.

### 9.1 Hardware Assets

Examples include laptops, desktops, mobile phones, tablets, monitors, keyboards, mice, headsets, chargers, and accessories.

Track:

- Asset ID.
- Name and category.
- Manufacturer and model.
- Serial number.
- Purchase date and cost.
- Warranty and expiry.
- Vendor.
- Organization and branch.
- Current custodian.
- Assignment and return dates.
- Condition and maintenance history.
- Lifecycle status.
- Recovery and disposal details.

Lifecycle:

Registration → Available → Assigned → Active use → Transfer or maintenance → Returned → Reassigned or disposed.

Support assignment acknowledgement, transfer, return, repair, loss, damage, and offboarding clearance.

Prevent duplicate active assignment of unique physical assets.

### 9.2 Software and Digital Assets

Track:

- Official email accounts.
- Software accounts.
- Application access.
- Software licenses.
- Cloud service access.
- Development tools.
- Project-specific software.
- Recurring subscriptions.

Maintain the service provider, account or license identifier, assigned employee, business purpose, client/project association, license type, seat allocation, purchase date, renewal date, expiry date, recurring cost, billing frequency, access owner, and provisioning status.

Do not store passwords, private keys, or secret tokens as ordinary asset data.

Support assignment, license allocation, renewal reminders, reassignment, access review, and deactivation.

During offboarding, generate and track a digital-access revocation checklist.

### 9.3 Permissions

Employees view and acknowledge their own assigned assets.

HR or authorized asset administrators maintain inventory, allocation, returns, and lifecycle records.

Senior Management views authorized inventory, utilization, subscription costs, renewals, and reports.

## 10. SHIFT / ATTENDANCE MODULE

### 10.1 Shift management

Maintain shift name, code, start time, end time, breaks, grace period, working days, weekly offs, effective dates, and assigned employees or groups.

Support overnight shifts and configured attendance rules.

### 10.2 Attendance

Track:

- Employee ID.
- Attendance date.
- Assigned shift.
- Check-in and check-out timestamps.
- Worked duration.
- Break duration where tracked.
- Late arrival and early departure.
- Attendance status.
- Source of the record.
- Correction history.
- Approval status.
- Client/project association where applicable.

Support Present, Absent, Late, Half Day, Leave, Holiday, Weekly Off, and additional configured statuses.

Distinguish recorded attendance from calculated summaries.

Support authorized manual entry and import if device integration is unavailable.

### 10.3 Overtime

Track employee, date, regular working hours, requested overtime, actual overtime, reason, client/project association, approver, approval status, applicable rate, and calculated payable amount where applicable.

Workflow:

Overtime request or recorded exception → Manager review → Approval or rejection → Approved overtime record → Payroll integration.

Unapproved overtime must not become payable by default.

Prevent duplicate overtime records for the same work period.

### 10.4 Attendance corrections

Employees can submit correction requests with reasons and supporting evidence.

The authorized approver reviews and approves or rejects the request.

Maintain the original record, proposed change, decision, and final approved record.

Changes affecting finalized payroll must use a controlled correction process.

## 11. CLIENT MANAGEMENT

Client Management is a mandatory module for tracking external client organizations and employees deployed to provide services to them.

An employee remains an employee of Orbyx's organization even while serving at a client company.

Client assignments must be separate entities linked to existing employee records.

### 11.1 Client registry

Maintain:

- Client ID.
- Client organization name.
- Contact information.
- Address and location.
- Primary contact.
- Contract or engagement reference.
- Project or service description.
- Contract dates.
- Working schedule where applicable.
- Billing arrangement where applicable.
- Contract status.
- Internal relationship owner.

Restrict commercially sensitive information to authorized roles.

### 11.2 Employee client assignments

Maintain:

- Employee ID.
- Client ID.
- Project or engagement.
- Assignment start date.
- Planned and actual end dates.
- Deployment location.
- Onsite, remote, or hybrid work mode.
- Internal reporting manager.
- Client-side supervisor or contact.
- Assignment role.
- Billable or non-billable status.
- Allocation percentage or planned hours.
- Assignment status.
- Handover and closure details.

Allow multiple historical assignments and concurrent assignments only when permitted by policy.

### 11.3 Client assignment lifecycle

Implement:

1. Client registration.
2. Engagement or project configuration.
3. Employee selection.
4. Assignment approval.
5. Client onboarding and access provisioning.
6. Active deployment.
7. Attendance and work tracking.
8. Assignment extension or change.
9. Client release or assignment closure.
10. Asset and digital-access recovery.
11. Time, expense, and billing reconciliation where applicable.
12. Historical assignment retention.

Closing a client assignment must not automatically terminate the employee's employment.

### 11.4 Client attendance

Associate attendance records with the relevant active client assignment.

Track client location or work mode, check-in and check-out, shift, overtime, client-side confirmation where required, internal approval, and attendance exceptions.

Maintain one authoritative attendance record for each applicable employee work period. Do not create duplicate attendance merely because the employee works at a client site.

### 11.5 Client-related salary and benefits

The employee's company salary structure remains the authoritative compensation record.

Support assignment-specific allowances and benefits such as onsite allowance, approved travel allowance, eligible overtime, and other configured benefits.

Store effective dates, eligibility, approval history, and payment treatment.

Only eligible and approved allowances flow into payroll.

Keep employee compensation separate from client billing amounts.

### 11.6 Client-related expenses and reports

Allow authorized expenses to be associated with a client and project.

Provide:

- Employees deployed per client.
- Active and historical assignments.
- Assignment duration and expiry.
- Attendance and overtime by client.
- Workforce utilization.
- Client-related expenses.
- Assignment allowances.
- Client-wise operational costs.
- Billable hours and billing summaries where applicable.

Do not calculate or display actual client profitability without reliable billing revenue and cost information.

## 12. DASHBOARDS

### HR Dashboard

Show:

- Total and active employees.
- Employees by department and branch.
- New joiners.
- Pending onboarding and offboarding.
- Leave requests awaiting review.
- Attendance exceptions.
- Overtime approvals.
- Payroll processing status.
- Pending salary advances.
- Expense claims and reimbursement balances.
- Petty cash awaiting settlement.
- Assets awaiting allocation or recovery.
- Upcoming license renewals.
- Active client deployments and assignment expiries.

### Senior Management Dashboard

Show authorized summaries of:

- Workforce size and distribution.
- Payroll costs and trends.
- Expenses and reimbursements.
- Outstanding advances.
- Attendance and overtime.
- Asset utilization and subscription costs.
- Client deployment utilization.
- Client-related operational costs.
- Pending approvals and exceptions.

### Employee Dashboard

Show only the logged-in employee's information:

- Today's attendance.
- Current shift.
- Leave balance.
- Pending leave requests.
- Latest payslip.
- Salary advance status.
- Pending expenses and reimbursements.
- Petty cash settlement status.
- Assigned assets.
- Current client assignment.
- Notifications and upcoming actions.

All dashboard metrics must be calculated from underlying records, not hardcoded values.

Cards and charts must navigate to the relevant filtered module.

## 13. APPROVALS AND NOTIFICATIONS

Build reusable approval workflows rather than separate, inconsistent approval logic in each module.

Support:

- Configurable approval stages.
- Assigned approvers.
- Approval and rejection comments.
- Submission and decision timestamps.
- Pending and overdue states.
- Reassignment where authorized.
- Escalation rules where configured.
- Full approval history.

Use appropriate approval workflows for leaves, payroll, salary advances, travel advances, reimbursements, overtime, asset assignments, client assignments, and offboarding clearance.

Notify relevant users when requests are submitted, approved, rejected, returned for correction, or approaching a configured deadline.

Never allow a user to approve their own transaction unless an explicitly configured policy permits it and the applicable controls are satisfied.

## 14. DATA MODEL AND INTEGRATION

Use shared, unique identifiers and proper relationships.

Create appropriate entities for:

- Organizations and legal entities.
- Branches, departments, and designations.
- Employees and user accounts.
- Roles and permissions.
- Reporting relationships.
- Leave policies and applications.
- Shift definitions and attendance records.
- Overtime requests.
- Salary structures and revisions.
- Payroll runs and payroll line items.
- Salary advances and recoveries.
- Expense claims.
- Travel advances and settlements.
- Reimbursements.
- Financial transactions.
- Hardware assets.
- Software accounts, licenses, and subscriptions.
- Clients and projects.
- Employee client assignments.
- Employee documents.
- Onboarding and offboarding tasks.
- Approval history.
- Notifications.
- Audit logs.

Avoid duplicate employee records and duplicate copies of authoritative financial data.

### Required cross-module workflows

**Onboarding**

Employee Setup → Organization assignment → Salary configuration → Shift assignment → Leave policy → Hardware allocation → Software access → Document verification → Onboarding completion.

**Payroll**

Employee eligibility → Salary structure → Attendance → Approved overtime → Applicable leave and deductions → Approved advance recovery → Payroll calculation → Approval → Payment record → Payslip.

**Expenses**

Request → Approval → Advance disbursement where applicable → Actual expense submission → Receipt verification → Settlement → Refund or reimbursement → Reconciliation.

**Client deployment**

Client registry → Engagement → Employee assignment → Shift and attendance → Overtime → Eligible allowances and expenses → Assignment closure → Asset and access recovery.

**Offboarding**

Exit request → Notice and last working date → Clearance → Asset recovery → Digital access revocation → Financial reconciliation → Final settlement → Separation.

All workflows must operate on shared records and preserve historical information.

## 15. FINANCIAL INTEGRITY

Apply the following rules across Payroll and Expenses:

1. Use decimal-safe calculations for money.
2. Validate amounts, currencies, and transaction dates.
3. Separate requested, approved, disbursed, recovered, reimbursed, and settled amounts.
4. Prevent duplicate payment and recovery transactions.
5. Prevent deductions greater than the outstanding recoverable amount.
6. Do not include unapproved overtime or claims in payable amounts by default.
7. Restrict modifications to approved and finalized records.
8. Maintain effective dates for salary structures and applicable policies.
9. Record all financial corrections through an auditable workflow.
10. Provide calculation breakdowns and exception messages.
11. Use configurable rules for taxes, statutory deductions, leave, and overtime.
12. Preserve financial history after employee separation.

For Indian payroll, allow configuration of applicable statutory deductions and components. Do not hardcode unverified legal assumptions or claim compliance without appropriate validation.

## 16. TECHNICAL IMPLEMENTATION

First determine the best architecture for the new project.

Use a maintainable, modular frontend with reusable components and a clear separation between presentation, business logic, data access, validation, and permissions.

A suitable stack is:

- React and TypeScript.
- Tailwind CSS.
- Lucide icons.
- A relational database such as PostgreSQL.
- A secure backend/API layer.
- Authentication and server-side authorization.
- Secure document storage.
- Database transactions for financial operations.

You may use Google AI Studio's supported environment and integrations, but do not claim a backend, database, authentication provider, or storage service is connected unless it is actually configured.

If the initial build uses demonstration data, clearly identify demo-mode limitations.

Do not use browser local storage as the authoritative production database for sensitive employee and financial information.

Implement appropriate database constraints, unique identifiers, foreign keys, validation, transactions, audit logging, and secure file access.

Use migrations and structured seed data where appropriate.

Never expose database credentials, API secrets, private keys, or privileged tokens in frontend code.

## 17. UI/UX REQUIREMENTS

The interface must look like a professional enterprise HRMS rather than a generic admin template.

Implement:

- Orbyx HRMS branding.
- A professional login and role-aware application shell.
- Collapsible sidebar.
- Responsive desktop, tablet, and mobile layouts.
- Consistent forms, tables, cards, modals, tabs, and status badges.
- Search, sorting, pagination, and contextual filters.
- Clear page titles and breadcrumbs.
- Loading, empty, success, and error states.
- Accessible controls and keyboard navigation.
- Confirmation dialogs for destructive or financial actions.
- Field-level validation.
- Approval timelines and transaction histories.
- Employee detail pages with structured tabs.
- Responsive tables or mobile-friendly cards.
- Consistent currency, date, and number formatting.
- Permission-aware actions and navigation.

Use progressive disclosure. Do not put every employee attribute into one large form or expose sensitive data in general lists.

Every button must perform the action represented by its label. Forms must validate and save data through the appropriate service. Status changes must update the underlying record and its history.

## 18. DEVELOPMENT AND TESTING STRATEGY

Build the system in coherent phases while preserving a functional application.

### Phase 1
Establish the Orbyx HRMS application shell, navigation, role model, shared data architecture, and Organization Setup / Employee Setup separation.

### Phase 2
Implement employee lifecycle, onboarding, offboarding, documents, reporting hierarchy, and bulk import/export.

### Phase 3
Implement Leaves and Shift / Attendance, including overtime and corrections.

### Phase 4
Implement Payroll, salary advances, Expenses, travel petty cash, reimbursements, and financial transaction tracking.

### Phase 5
Implement Hardware Assets, Software & Digital Assets, and lifecycle management.

### Phase 6
Implement Client Management, employee deployments, client attendance, eligible benefits, and client-related reporting.

### Phase 7
Integrate dashboards, approval workflows, notifications, audit logs, reports, and export functionality.

### Phase 8
Validate permissions, financial calculations, persistence, lifecycle transitions, responsive behavior, and production builds.

Do not stop at describing these phases. Implement the application and its workflows.

If the environment cannot complete all phases in one run, finish the current phase coherently, retain a working build, and explicitly identify the remaining work.

## 19. ACCEPTANCE CRITERIA

The implementation is acceptable only when the following behaviors work:

- Organization Setup and Employee Setup are separate sections.
- Employees link correctly to departments, designations, branches, and managers.
- HR, Senior Management, and Employee have distinct permissions.
- Employees cannot access other employees' restricted information.
- Onboarding and offboarding create trackable workflow records.
- Leave applications follow eligibility and approval rules.
- Attendance and approved overtime integrate with payroll.
- Salary advances are recovered only through eligible approved transactions.
- Travel petty cash settlements correctly determine amounts payable or recoverable.
- Approved reimbursements remain unpaid until a payment record is created.
- Duplicate financial transactions are prevented.
- Hardware and software assets have separate lifecycles.
- Client assignments link to existing employees.
- Ending a client assignment does not terminate company employment.
- Client attendance does not create duplicate employee attendance.
- Employee separation preserves historical records.
- Reports and exports respect permissions.
- Dashboard metrics reflect actual underlying records.
- Important state transitions and sensitive changes are audited.
- The application builds successfully and major workflows can be tested end to end.

## 20. REQUIRED FINAL REPORT

After implementation, report:

1. Application architecture.
2. Modules and screens implemented.
3. Role-permission behavior.
4. Organization and employee data structure.
5. Payroll and Expenses calculations and workflows.
6. Asset and Client Management integration.
7. Database and persistence implementation.
8. Authentication and authorization status.
9. Type-check and build results.
10. Functional test results.
11. Features completed.
12. Features remaining or requiring external configuration.

Be precise about what actually works. Do not describe mockups as completed functionality or claim production readiness when security, persistence, or integrations are incomplete.

**FINAL PRODUCT GOAL**

Deliver Orbyx HRMS as a unified, modular, responsive, role-based human resource management application with seven integrated business modules, reliable financial workflows, a complete employee lifecycle, client deployment tracking, and a foundation that supports additional roles and future expansion without redesigning the entire system.