# ORBYX HRMS — Existing MVP Audit, Corrections and Complete Functional Implementation

## 1. Project Objective

You are working on the existing **Orbyx HRMS** application. The MVP already contains modules, navigation, dashboard cards, employee records, attendance, expenses, assets, organization setup, and payroll screens.

Your task is to audit, improve, and complete this existing application based on the requirements below.

**Do not rebuild the application from scratch. Do not replace it with a generic HRMS template. Do not remove working functionality simply to simplify the implementation.**

First inspect the entire existing codebase, including:
- Routes and navigation
- Sidebar and dashboard components
- Employee, organization, client, attendance, payroll, expense, leave, and asset data models
- Role-based permissions
- Existing policies and configuration screens
- API integrations and backend services
- Persistence and state management
- Forms, validation, and existing workflows

Then create an implementation plan, identify existing features that satisfy the requirements, and implement the missing or defective functionality.

Do not stop after producing the audit or plan. Complete the implementation in manageable phases and verify each phase.

## 2. Preserve the Existing MVP

Preserve:
- Orbyx HRMS branding and existing visual identity
- Existing working routes and modules
- Existing employee and organization records
- Existing components and useful design patterns
- Existing API contracts and data relationships wherever possible
- Existing role definitions, while extending permissions when required
- Existing workflows that already work correctly

Do not:
- Generate a second application alongside the existing one.
- Replace real data with hardcoded demo records.
- silently reset local storage, database records, or application state.
- create duplicate employee records for client assignments.
- remove existing functionality without a clear reason.
- present a static mockup as an implemented workflow.
- display success messages when a save or transaction has failed.

Before changing data models or database structures, identify dependencies and use safe migrations or compatible updates.

## 3. Audit Existing Requirements Before Implementation

Create an internal implementation checklist with these statuses:

- **Implemented and verified**
- **Partially implemented**
- **Missing**
- **Implemented but defective**
- **Requires backend or production infrastructure**

Inspect the actual source code and test existing functionality before assigning a status. A visible button is not proof that its functionality works.

Audit the following requirement groups:

1. Recruitment
2. Organization Setup
3. Employee Management
4. Reporting hierarchy and reportees
5. Client Management
6. Leave and Holidays
7. Attendance and Shifts
8. Payroll and Payslips
9. Taxation and statutory compliance
10. Expenses, advances, petty cash, and reimbursements
11. Asset Management
12. Promotions and Appraisals
13. Employee photographs and documents
14. Bulk employee import and export
15. Exit formalities and clearance workflows
16. Overtime approval
17. Individual employee reports
18. Policy management
19. Role-based permissions
20. Organization-wise data management
21. Dashboard navigation and reports

Do not claim that any requirement is satisfied until its behavior has been verified.

After implementation, provide a requirement-to-feature matrix showing the original requirement, current state, implemented change, and verification result.

# PART A — DASHBOARD NAVIGATION

## 4. Every Actionable Dashboard Card Must Navigate

Review all dashboard cards, metrics, charts, and summary sections across every role.

Every card that represents actionable information must open the appropriate module or record details.

Examples:

- Direct Reports → Employee Setup filtered to the manager's reportees.
- Team on Leave Today → Leave & Holidays filtered to today's approved leave records.
- Pending Approvals → Authorized approval inbox.
- Team Assets → Asset Inventory filtered to the relevant team.
- Pending Team Leave Requests → Relevant leave request or approval page.
- Pending Team Expense Claims → Relevant expense claim or approval page.
- Attendance metrics → Attendance & Shifts with relevant filters.
- Payroll metrics → Payroll & Payslips with the appropriate pay period and status.
- Client metrics → Client Management.
- Employee metrics → Employee Setup.
- Asset metrics → Asset Inventory.
- Leave metrics → Leave & Holidays.
- Recruitment metrics → Recruitment pipeline and requisition details, where implemented.
- Reports → Relevant report and filters.

Requirements:
- Use existing routes and real records.
- Apply relevant filters automatically.
- Preserve date, department, employee, client, and status context where appropriate.
- Support browser back navigation.
- Provide meaningful empty states.
- Enforce permissions on both navigation and data access.
- Keep buttons such as Approve, Reject, Check In, and Check Out independent of card-level navigation.
- Make interactive cards keyboard accessible.

Do not make purely decorative elements clickable without a meaningful destination.

# PART B — ROLE-BASED NAVIGATION AND ACTIONS

## 5. Implement Clear Role-Specific Experiences

Support the existing roles:
- Managing Director (MD) / Senior Management
- HR
- Reporting Manager
- Employee
- Client-side supervisor or client user, if supported by the current architecture

Do not assume that every role should have the same buttons or actions.

### Managing Director / Senior Management

Provide appropriate access to:
- Organization-wide dashboards and reports
- Payroll summaries and authorized employee payroll details
- Payroll approval
- Leave and expense approval where assigned
- Organization-wide asset and client reporting
- Management decisions and approval history

**Remove employee-style New Request actions from the MD interface wherever they are not relevant to the role.**

For example, the MD should not see a generic employee self-service New Request button merely because the same component is reused across roles.

However, if the MD is also a company employee, legitimate employee self-service requests may remain available when explicitly required by the business rules. Determine the correct behavior from the role and permissions rather than blindly hiding every request feature.

### HR

HR should manage:
- Organization and employee information
- Recruitment, onboarding, and offboarding
- Salary structures and payroll preparation
- Leave policies and requests
- Attendance corrections and shift policies
- Expense claims and settlements
- Assets and software licenses
- Employee documents and bulk data operations
- Reports and permitted administrative settings

### Reporting Manager

A manager should see:
- Their direct reportees
- Team attendance and leave
- Team expense claims requiring their approval
- Team overtime and timesheet approvals
- Assigned client engagements
- Employee information permitted by their reporting scope

Managers must not receive unrestricted access to unrelated employees' confidential salary, bank, tax, or personal document information.

### Employee

Employees should be able to:
- View and update permitted personal information
- View their own attendance and shifts
- Check in and check out when eligible
- Submit attendance corrections
- Apply for leave
- Submit expense claims and advances
- View assigned assets
- View their own permitted payroll information and payslips
- Submit permitted documents and declarations
- Track their own requests

Employees must not approve their own requests or modify protected HR and payroll records.

### Client-side User

If client-side accounts are implemented, restrict them to the client engagements, assigned employees, timesheets, and attendance verification records they are authorized to access.

Enforce permissions in the backend when available. Hiding a button is not sufficient security.

# PART C — ATTENDANCE AND SHIFT MANAGEMENT

## 6. Remove Duplicate Check-In and Check-Out Controls

Inspect the current Attendance & Shifts screen and its shared header components.

The screenshots show a check-in status and Check Out control in the application header, with another Check Out control in the Today's Attendance Station card.

Determine whether both controls invoke the same attendance operation.

If they are duplicates:
- Retain one clear primary check-in/check-out control in the appropriate location.
- Remove the redundant control.
- Keep the attendance status visible.
- Ensure the remaining control works consistently throughout the application.
- Do not create two attendance records when the user clicks the same action.
- Disable or change the control according to the actual attendance state.

Use a centralized attendance action so the header, dashboard, and attendance page cannot create conflicting records.

If two controls are intentionally required in different contexts, document the distinct purpose and ensure they share the same validated attendance service.

## 7. Remove Redundant Calendar Filters

The Attendance & Shifts screenshot shows two date selectors.

Inspect their actual purpose before changing them.

If they represent a date range:
- Label them clearly as From Date and To Date.
- Validate that the end date is not earlier than the start date.

If they duplicate the same date filter or are unnecessary:
- Remove the redundant selector.
- Keep one appropriate date selector or a clearly labelled date range.
- Ensure filtering and CSV export use the selected dates consistently.

Do not remove useful date-range functionality merely because two calendar controls are present.

## 8. Client-Assigned Employee Attendance

Attendance must be tracked when an employee works at a client location or on a client engagement.

Use the existing employee record and connect attendance to the applicable client assignment.

Capture, where relevant:
- Employee ID
- Client and assignment ID
- Attendance date
- Work location or work mode
- Shift
- Check-in and check-out timestamps
- Worked hours and break duration
- Overtime hours
- Attendance status
- Timesheet or verification source
- Approval status and approver
- Correction history

Implement a configurable workflow:

Employee attendance or timesheet submission → Client supervisor verification, if required → Internal reporting manager approval → HR exception handling → Payroll input.

Requirements:
- Do not create duplicate employee records.
- Do not count the same attendance day twice.
- Preserve historical client attendance.
- Prevent unauthorized attendance entry outside an assignment's applicable dates.
- Allow approved corrections to historical records with an audit trail.
- Handle missing punches, disputes, and overtime through explicit workflows.
- Apply approved attendance to the employee's existing payroll calculation.
- Do not automatically deduct salary for unapproved or disputed attendance without the required review.

Closing a client assignment must not terminate the employee's employment with the company.

# PART D — EMPLOYEE MANAGEMENT AND REPORTING HIERARCHY

## 9. Reorder Employee Setup

The Employee Setup screen currently offers a Directory Table and Hierarchy Chart, but the requirement is to show reportees before the full directory and hierarchy.

Implement this page structure:

1. **My Reportees**
2. **Employee Directory**
3. **Reporting Hierarchy**

### My Reportees

For an authorized manager, display the employees who directly report to that manager.

Include:
- Employee photograph
- Employee name and ID
- Department
- Designation
- Employment status
- Client assignment status, where relevant
- View Profile action
- Other actions permitted by the current role

For HR and senior management, provide an appropriate organization-wide or selected-manager view based on permissions.

If the current user has no reportees, display a clear empty state instead of an empty table with no explanation.

### Employee Directory

Display all employees within the user's authorized data scope.

Provide:
- Search by name, employee ID, or email
- Department filter
- Designation filter
- Reporting manager filter
- Employment status filter
- Client assignment filter
- Joining date range
- Export CSV
- Import employees for authorized users
- View and Edit actions according to permissions

### Reporting Hierarchy

Display the organizational reporting tree after My Reportees and Employee Directory.

Requirements:
- Use actual reporting relationships.
- Support expanding and collapsing branches.
- Clearly show manager-to-reportee relationships.
- Avoid circular reporting relationships.
- Prevent assigning an employee as their own manager.
- Allow authorized users to change reporting relationships through a validated form.
- Update the hierarchy when a reporting relationship changes.

# PART E — EMPLOYEE PHOTOGRAPHS AND DOCUMENTS

## 10. Employee Photo Capture and Document Management

Implement a proper employee profile and document management workflow.

### Employee Photograph

Support:
- Uploading an employee photograph from the device.
- Capturing a photograph using the device camera where supported.
- Previewing the image before saving.
- Replacing or removing an existing photograph according to permissions.
- Displaying the photograph in the employee profile, reportee list, directory, and relevant record views.
- Validating file type and size.
- Providing a default avatar when no photograph is available.

Request camera permission only when needed. Provide an upload alternative if camera access is unavailable or denied.

Do not store an image only in temporary component state and then lose it when the page refreshes.

### Employee Documents

Support document categories such as:
- Resume and recruitment documents
- Identity documents
- Education certificates
- Professional certificates
- Employment and joining documents
- Offer and appointment letters
- Statutory and payroll-related documents
- Performance and appraisal documents
- Exit and clearance documents
- Other authorized HR documents

Each document should support appropriate metadata:
- Document type
- Document name
- Issue or upload date, where relevant
- Expiry date, where relevant
- Verification status
- Uploaded by
- Upload timestamp
- Access permissions

Provide:
- Upload
- Preview or download, where permitted
- Replace
- Verification and rejection workflows
- Expiry indicators where relevant
- Document history where supported

Protect sensitive documents with role-based access. Do not expose private document URLs or allow unrestricted downloading.

If a real backend exists, use the configured file-storage mechanism and authorization. Do not claim secure permanent storage if files are only stored in browser memory or local storage.

# PART F — POLICY MANAGEMENT

## 11. Move Policies Out of General Module Tabs

Policies should not appear as an ordinary tab mixed with operational records on every module screen.

For example, the Attendance & Shifts page currently places Attendance & Shift Policies alongside Timesheet Records, Corrections Queue, and Configured Shifts.

Apply the same correction to Leave, Expenses, Payroll, Assets, and Organization Setup wherever policies are embedded in operational tab groups.

Create a dedicated **Policies** navigation section in the sidebar, accessible according to role permissions.

Under Policies, provide separate policy categories:

- Organization Policies
- Leave Policies
- Attendance & Shift Policies
- Payroll Policies
- Statutory & Compliance Policies
- Expense Policies
- Asset Policies
- Client Assignment Policies
- Employee and Exit Policies, where applicable

Do not duplicate policy storage across modules.

### Policy Navigation and Details

When a user opens a policy category:
- Show a list of existing policies.
- Provide search and status filters.
- Show policy name, description, status, and effective date.
- Provide View Details and Edit actions according to permissions.
- Provide Add New Policy for authorized roles.
- Support activation and deactivation where appropriate.

When a user selects an individual policy:
- Open a dedicated details page, drawer, or modal.
- Show the policy's complete rules, eligibility, effective dates, applicability, and audit information.
- Allow authorized users to edit or configure it.
- Preserve historical policy versions where needed.

Policies should not be mixed into operational record tabs. Operational pages should use the applicable policy behind the scenes and may provide a clear link to the relevant policy details.

### Functional Policy Rules

Policies must influence the appropriate workflows.

Examples:
- Leave policies influence eligibility, quotas, carry-forward, approval, and LOP.
- Attendance policies influence shifts, grace periods, corrections, and overtime.
- Payroll policies influence salary calculations and deductions.
- Expense policies influence claim limits, receipts, approval, and settlement.
- Asset policies influence allocation, returns, and renewal.
- Client assignment policies influence attendance verification and assignment closure.

Use effective dates, validation, and audit history. Do not silently rewrite historical transactions when a policy changes.

# PART G — EXPENSES, ADVANCES, AND PETTY CASH

## 12. Complete Expense Management

Preserve and enhance the existing Expense Management module.

Support:
- Employee expense claims
- Travel expenses
- Supporting receipts and documents
- Claim categories and limits
- Manager and HR approval
- Reimbursement status
- Payment status
- Settlement and transaction references
- Expense reports and exports

### Salary Advances

Track salary advances separately from expense claims.

Capture:
- Employee
- Request date
- Requested amount
- Approved amount
- Approval history
- Disbursement date and reference
- Recovery schedule
- Recovered amount
- Outstanding balance
- Status

### Travel Petty Cash

Track petty cash as a separate financial event.

Capture:
- Employee and client assignment, if applicable
- Purpose and travel details
- Requested and approved amount
- Disbursed amount
- Supporting receipts
- Actual expenditure
- Settlement amount
- Refund or additional reimbursement
- Settlement date and transaction reference

Prevent duplicate reimbursement or payroll deduction. Preserve the complete financial transaction history.

# PART H — PAYROLL

## 13. Complete the Existing Payroll Module

Retain the existing Orbyx Payroll & Payslips module and extend it into a detailed, role-aware payroll workflow inspired by Horilla's payroll concepts.

Do not create a disconnected payroll application.

Include:
- Payroll Overview
- Salary Structures
- Employee Salary Details
- Payroll Runs
- Payslips
- Allowances and Deductions
- Salary Advances and Recoveries
- Reimbursements
- Statutory & Compliance Settings
- Payroll Reports

### HR Responsibilities

HR can, within configured permissions:
- Create and update salary structures.
- Assign salary structures to employees.
- Maintain effective-dated salary components.
- Review attendance and leave inputs.
- Review overtime and LOP.
- Record authorized advances and deductions.
- Review approved reimbursements.
- Calculate payroll.
- Investigate payroll exceptions.
- Prepare payroll runs.
- Submit payroll for approval.
- Generate authorized reports and payslips.

### Employee Responsibilities

Employees can:
- View their own permitted salary details.
- View and download their own finalized payslips.
- Submit permitted tax declarations and payroll information.
- Submit bank detail changes for verification.
- View advances, recoveries, and reimbursements.
- Raise payroll queries.
- Track their payroll query status.

Employees cannot edit official salary structures, approve their own payroll, or view other employees' confidential payroll information.

### Senior Management Responsibilities

Senior Management can, according to permissions:
- View payroll summaries and cost reports.
- Review employee payroll calculations where authorized.
- Review exceptions and statutory summaries.
- Approve or reject payroll.
- Return payroll to HR for corrections.
- View approval and audit history.

Do not show employee-style New Request buttons to the MD unless the MD is explicitly permitted to use that employee self-service workflow.

### Payroll Calculation

Use:
- Effective salary structure
- Approved attendance
- Approved leave and LOP
- Approved overtime
- Applicable allowances
- Statutory deductions when applicable
- Salary advance recovery
- Authorized deductions
- Reimbursements payable through payroll, when not already settled separately

Display component-wise earnings, deductions, gross earnings, employer contributions, net payable, payable days, and the calculation basis.

Provide a detailed individual payslip and downloadable PDF.

Distinguish Draft, Calculated, Under Review, Approved, Processed, and Paid statuses.

Preserve processed payroll history. Do not automatically mark a payroll run as paid without a valid payment confirmation.

# PART I — ORIGINAL HRMS REQUIREMENTS

## 14. Recruitment

Audit and implement a Recruitment module if it is missing or incomplete.

Support, as applicable:
- Job requisitions
- Vacancies and job descriptions
- Candidate profiles
- Resume/document uploads
- Recruitment stages
- Interview scheduling and feedback
- Selection and rejection
- Offer management
- Candidate-to-employee conversion during onboarding

Do not create a duplicate employee when converting a selected candidate into an employee.

If Recruitment is outside the current MVP scope, identify that clearly in the final audit rather than silently omitting the requirement.

## 15. Employee Management

Support:
- Employee onboarding
- Employee profiles
- Employment information
- Organization, department, and designation
- Reporting relationships
- Employee photographs and certificates
- Profile editing according to permissions
- Bulk employee import/export
- Individual employee reports
- Employment history
- Employee exit and clearance workflows

## 16. Promotion and Appraisal

Audit the current project for promotion and appraisal functionality.

Where required, support:
- Promotion requests and approvals
- Designation and grade changes
- Effective dates
- Salary revision links
- Performance review cycles
- Appraisal forms
- Goals and evaluation criteria
- Manager feedback
- Review and approval history

Maintain historical designations and salary changes. Do not overwrite previous employment records.

## 17. Leave, Attendance, and Overtime

Support:
- Leave types and policies
- Leave balances
- Leave requests and approvals
- Holiday calendars
- Configured shifts
- Check-in and check-out
- Attendance correction requests
- Timesheets where required
- Client attendance
- Overtime submission and approval
- LOP integration with payroll
- Individual attendance reports

Use the same employee identity across all attendance sources.

## 18. Asset Management

Support physical and digital assets.

Physical assets include:
- Laptops
- Desktops and workstations
- Mobile devices
- Accessories
- Office equipment

Digital assets include:
- Company email accounts
- Software licenses
- Software subscriptions
- Project-related software access
- Digital accounts and access assignments

Provide allocation, acknowledgment, reassignment, return, renewal, expiry alerts, and deactivation workflows as applicable.

Preserve asset history and access-revocation records.

## 19. Client Management

Support:
- Client organization records
- Client contacts
- Employee assignment to clients
- Assignment dates and status
- Client-side attendance verification, where required
- Client overtime approvals
- Eligible allowances and benefits
- Client-related expenses
- Client-issued asset and access recovery
- Assignment history and reports

Closing a client assignment must not terminate company employment.

## 20. Exit Formalities and Clearance

Support:
- Resignation or exit initiation
- Notice period
- Exit approval
- Handover tasks
- Asset return
- Digital access revocation
- Pending expense settlement
- Advance recovery review
- Payroll and final settlement inputs
- Clearance approvals
- Exit documents
- Final employment status

Do not mark an employee as fully cleared when mandatory clearance tasks remain incomplete.

# PART J — DATA, SECURITY, AND TESTING

## 21. Data Persistence

Inspect whether the current project uses a backend API/database, local storage, or mock data.

Use the existing architecture wherever possible.

Verify that:
- Organization details persist after saving.
- Employee profile changes persist.
- Employee photos and documents remain accessible according to permissions.
- Attendance records persist and are not duplicated.
- Client assignments and related attendance remain linked.
- Payroll runs and payslips persist.
- Expense transactions and advance balances remain consistent.
- Policy changes affect applicable future workflows.
- Imported records are validated and stored correctly.
- Dashboard metrics reflect actual application data.

If the application is currently frontend-only, clearly identify which requirements need backend persistence, authentication, file storage, or additional infrastructure before production.

## 22. Import and Export

For applicable modules, implement:
- CSV templates
- CSV import
- Validation and duplicate detection
- Preview before import
- Row-level error reporting
- Export of permitted records
- Export of filtered results

Respect role permissions and sensitive-data restrictions.

## 23. Acceptance Tests

Test the following end-to-end scenarios:

1. Every actionable dashboard card opens the correct destination.
2. A manager sees their reportees before the employee directory.
3. The reporting hierarchy reflects actual reporting relationships.
4. The MD does not see irrelevant employee-only actions.
5. Only the required check-in/check-out controls are displayed and functional.
6. Attendance date filtering works correctly without redundant calendars.
7. Client-assigned employees have linked, nonduplicated attendance.
8. Client attendance approvals feed into the correct employee's payroll inputs.
9. Policy details open separately from operational module tabs.
10. Employees can upload or capture permitted profile photographs.
11. Authorized users can upload and manage employee documents.
12. Recruitment, employee onboarding, promotion, appraisal, payroll, taxation, leave, and attendance requirements are audited and implemented according to scope.
13. Salary advances, petty cash, reimbursements, and settlements maintain correct balances.
14. Asset lifecycle actions work for the relevant asset states.
15. Import/export operates on actual authorized records.
16. Payroll calculations, approvals, payslips, and payment statuses remain consistent.
17. Role restrictions work on both the interface and underlying data access.
18. Existing working functionality and records are preserved.

## 24. Implementation Sequence

Implement in these phases:

**Phase 1 — Audit and Safety**
- Inspect the existing application.
- Map the routes, models, roles, and data layer.
- Record implemented, partial, missing, and defective requirements.
- Protect existing records and working features.

**Phase 2 — UI and Navigation Corrections**
- Make dashboard cards actionable.
- Fix role-specific actions.
- Remove duplicate attendance controls and unnecessary date selectors.
- Reorder Employee Setup.
- Separate Policies from operational tabs.

**Phase 3 — Employee Data and Client Attendance**
- Implement employee photo and document workflows.
- Complete reporting relationships.
- Implement client assignment-aware attendance and approval.

**Phase 4 — Payroll and Financial Workflows**
- Complete role-aware payroll.
- Integrate advances, deductions, reimbursements, and statutory configuration.
- Implement payslips and payroll reports.

**Phase 5 — Remaining HRMS Requirements**
- Audit and complete Recruitment, Promotion, Appraisal, Exit Formalities, and other incomplete modules.

**Phase 6 — Verification**
- Run the available build and tests.
- Fix regressions.
- Verify data persistence and permissions.
- Provide the requirement-to-feature matrix.

## Final Instruction

Plan and implement the changes in the existing Orbyx HRMS project. Do not stop after planning, do not replace working functionality with placeholders, and do not claim that a requirement is complete without verifying it.

At the end, provide:
1. A requirement audit showing implemented, partial, missing, and infrastructure-dependent features.
2. A summary of the code changes made.
3. The end-to-end tests performed and their results.
4. Any remaining defects or limitations.
5. A list of features that require a real backend, secure file storage, authentication, or compliance verification before production.

**Priority:** Preserve the existing MVP, correct the identified issues, and progressively complete the required HRMS functionality without duplicating modules, records, policies, or workflows.