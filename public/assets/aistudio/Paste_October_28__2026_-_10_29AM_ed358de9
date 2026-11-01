# Orbyx HRMS — Critical Functional Corrections & Payroll Enhancement

## Objective

Enhance the existing Orbyx HRMS application based on the issues identified during testing and the attached screenshots.

The application is already branded as Orbyx HRMS and contains Organization Setup, Employee Setup, Client Management, Leave & Holidays, Attendance & Shifts, Expense Claims, Payroll & Payslips, Asset Inventory, Reports & Analytics, and Company Settings.

**Do not rebuild the application from scratch.** Inspect the current code, data models, state management, components, API integrations, and persistence mechanisms. Identify the actual causes of the issues and implement fixes in the existing project.

Prioritize data persistence, correct business logic, payroll transparency, statutory configuration, and client-related attendance.

---

## 1. Asset Management — Fix Missing Activate/Deactivate Actions

### Problem

In the Asset Inventory screen, some asset records do not display the appropriate Activate or Deactivate action. Certain rows show only Edit, Return, Allocate, or other lifecycle actions.

### Required changes

Review the asset lifecycle implementation, including:
- Available
- Allocated
- In use
- Under maintenance
- Returned
- Retired
- Inactive, if supported by the existing data model

Implement a consistent action system based on the asset's current state and the user's permissions.

| Asset state | Appropriate actions |
|---|---|
| Available | Allocate, Edit, Deactivate |
| Allocated / In use | View, Edit, Return or Reassign, Deactivate only when business rules permit |
| Returned / In stock | Allocate, Edit, Deactivate |
| Under maintenance | View, Edit, Mark Available when cleared, Deactivate if permitted |
| Retired | View, Edit metadata, Reactivate only if business rules allow |
| Inactive | View, Edit, Activate |

Rules:
1. Every applicable asset must expose the correct lifecycle action.
2. Do not hide actions simply because a row uses a different status label or capitalization.
3. Centralize action eligibility in a reusable function or service rather than duplicating conditional logic in each row.
4. Keep Edit, Allocate, Return, Activate, and Deactivate as distinct operations.
5. Require confirmation for deactivation and explain why an asset cannot be deactivated when it has an active assignment or another blocking condition.
6. Preserve asset assignment history, custodian acknowledgments, purchase details, warranty information, and software license information.
7. Record who performed each action and when, where the current architecture supports auditing.
8. After an action succeeds, update the displayed row, counts, filters, and dashboard summaries without requiring a manual refresh.

Do not treat retirement and deactivation as interchangeable. Retirement means the asset has reached the end of its usable lifecycle; deactivation means it is excluded from active inventory operations.

### Acceptance criteria

Test each relevant asset state and confirm that the correct actions appear, execute successfully, and persist after navigating away and returning.

---

## 2. Organization Setup — Fix Data Persistence

### Problem

Organization details can be entered and saved in the Organization Profile form, but the information is not reliably retained.

### Required changes

Investigate the complete save and load flow instead of fixing only the Save button.

Review:
- Form input state and controlled fields
- Save button event handling
- Validation
- API requests and response handling
- Database or local persistence
- Organization identifiers and record selection
- Initial form loading
- Error handling
- State refresh after saving

Implement the following behavior:

1. Load the existing organization profile when the screen opens.
2. If no organization profile exists, display an appropriate initial setup form.
3. Populate the form using the persisted organization record.
4. Validate required fields and formats.
5. Save changes to the actual configured data source.
6. Display a success message only after the save operation succeeds.
7. Display a meaningful error message when saving fails.
8. Refresh the displayed information from the saved record.
9. Preserve the information after page refresh, navigation, and application restart, according to the persistence capabilities of the existing architecture.
10. Prevent duplicate organization records when a user edits an existing profile.
11. Ensure the same organization record is used by payroll, employee management, attendance, and reports wherever relevant.

The organization profile should support the existing fields and any appropriate missing fields, including:
- Organization name
- Legal entity name
- Company registration details
- PAN or tax identifier
- EPF establishment details, where applicable
- ESI registration details, where applicable
- Registered address
- City, state, country, and postal code
- Payroll currency
- Financial year start
- Working days per week
- Standard working hours per day
- Organization contact details, where required

Do not make EPF or ESI registration fields mandatory for every company. Their applicability must be configurable.

**Important:** If the project uses local storage, repair the existing persistence mechanism rather than replacing the application architecture unnecessarily. If a backend and database are configured, persist the profile through the existing API and database.

Do not claim database persistence if the data is stored only in browser local storage.

### Acceptance criteria

Change several organization fields, save, navigate to another module, return, refresh the page, and verify that the saved values remain correct. Confirm that existing employee and payroll data has not been duplicated or lost.

---

## 3. Remove Redundant Company Settings or Give It a Clear Purpose

### Problem

The sidebar contains both Organization Setup and Company Settings. Organization Setup already captures the legal entity, company profile, departments, designations, reporting hierarchy, and organization policies. This creates uncertainty about where administrators should manage information.

### Required changes

First, inspect what Company Settings currently contains and whether any other module depends on it.

Do not delete it blindly. Eliminate overlapping functionality and make the ownership of each setting clear.

Use this proposed separation:

**Organization Setup**
- Company and legal entity profile
- Branches and offices
- Departments
- Designations
- Reporting hierarchy
- Organization policies
- Statutory registration details
- Financial year and company working calendar
- Organization-specific defaults

**Company Settings / System Settings**, only if needed:
- User accounts and authentication settings
- Role and permission administration
- Notification preferences
- Application-wide configuration
- Integration settings
- Security settings
- Audit log and system administration

If Company Settings contains no meaningful functionality beyond what Organization Setup already provides, consolidate the overlapping screens into Organization Setup and remove the redundant sidebar entry.

If distinct system administration functionality exists, retain Company Settings but rename it to **System Settings** and keep only application-wide configuration there.

Do not duplicate the same organization policy or company profile in two places.

Update navigation, routes, permissions, links, and any dependent components when consolidating screens.

### Acceptance criteria

An HR administrator should be able to identify exactly where organization information is managed and where application-wide settings are managed, without duplicated forms or conflicting values.

---

## 4. Payroll — Build Detailed Payroll Processing and Payslips

### Problem

The existing Monthly Payroll Processing Engine displays high-level summary cards and a compact employee table. The screen is not detailed enough to explain how each employee's gross earnings, deductions, and net pay were calculated.

Use the attached payroll screenshot as the starting reference for the existing workflow, but extend it into a detailed, auditable payroll system.

### A. Payroll Processing Workflow

Implement a structured workflow:

**Step 1: Select Pay Period**
- Month and year
- Pay frequency
- Payroll period start and end dates
- Applicable organization or branch
- Payroll processing status

**Step 2: Gather Payroll Inputs**
- Active employees eligible for the period
- Salary structure and effective dates
- Attendance and payable days
- Approved leave and Loss of Pay
- Approved overtime
- Applicable allowances
- Expense or travel reimbursements, if configured as payroll-payable
- Salary advances and scheduled recoveries
- Applicable statutory and other authorized deductions

**Step 3: Calculate Payroll**
- Calculate each employee's earnings and deductions from the configured rules.
- Show the inputs used for each calculation.
- Validate missing salary structures, incomplete attendance, invalid deductions, and other exceptions.
- Show warnings and blocking errors separately.
- Allow recalculation when permitted.

**Step 4: Review and Lock**
- Display employee-level payroll calculations.
- Allow authorized reviewers to inspect exceptions.
- Prevent changes to locked payroll inputs unless an authorized correction or reopening workflow is used.
- Record who reviewed and approved the payroll.

**Step 5: Approve and Process**
- Require the configured approval workflow.
- Distinguish draft, calculated, under review, approved, processed, and paid states.
- Prevent duplicate payroll runs for the same employee and period unless the application explicitly supports controlled adjustments.

**Step 6: Generate Payslips and Reports**
- Generate an individual payslip for each eligible employee.
- Provide authorized PDF download and payroll export functionality.
- Keep payroll totals consistent with employee-level calculations.

Do not mark payroll as paid merely because it has been calculated or processed.

### B. Employee-Level Payroll Details

When an authorized user selects an employee in a payroll run, open a detailed view containing the following sections.

**Employee and Pay Period**
- Employee ID
- Employee name
- Department and designation
- Organization and branch
- Employment status
- Pay period
- Bank/payment details, accessible only to authorized roles

**Attendance and Payable Days**
- Calendar days in the pay period
- Scheduled working days
- Present days
- Weekly offs and holidays
- Paid leave days
- Unpaid leave / LOP days
- Approved absence or attendance adjustments
- Approved overtime hours
- Payable days and the formula used

Clearly define the payable-day calculation according to the organization's configured payroll rules. Avoid double-counting leave, holidays, or weekly offs.

**Earnings**
Support configurable salary components, including:
- Basic salary
- House Rent Allowance (HRA)
- Dearness Allowance (DA), if configured
- Conveyance or transport allowance
- Special allowance
- Other fixed allowances
- Variable pay or incentives
- Overtime earnings, where eligible
- Other configured earnings

Show each component's amount and calculation basis. Do not assume every employee receives every component.

**Deductions**
Support configurable deduction components, including:
- Employee EPF contribution, when applicable
- Employee ESI contribution, when applicable
- Professional Tax, according to applicable state rules
- TDS or income-tax deductions, where applicable and configured
- Loss of Pay deduction
- Salary advance recovery
- Other authorized deductions

Clearly separate statutory deductions from company-specific deductions.

**Reimbursements and Advances**
- Approved expense reimbursements payable through payroll, if configured
- Travel allowances, if applicable
- Salary advance issued
- Advance recovered in the current pay period
- Remaining advance balance

Do not include an expense reimbursement in payroll if it has already been paid separately. Avoid double payments.

**Calculation Summary**
- Gross earnings
- Total statutory deductions
- Total other deductions
- Total deductions
- Reimbursements, if payable through payroll
- Net payable
- Rounding adjustment, if applicable
- Formula or calculation breakdown

Display the formula clearly:

Gross earnings = sum of applicable earning components.

Total deductions = applicable statutory deductions + other authorized deductions.

Net payable = gross earnings − total deductions + additional amounts payable through payroll, such as eligible reimbursements not already settled separately.

Apply configured LOP and attendance rules through the correct salary components without deducting the same absence twice.

### C. Detailed Payslip

Create a professional individual payslip layout that can be viewed and exported as PDF.

Include:
- Company legal name and address
- Company logo, if available
- Payslip month and year
- Payslip number
- Employee name and ID
- Department, designation, and work location
- Pay period and payable days
- Attendance and LOP summary
- Earnings table with component name and amount
- Deductions table with component name and amount
- Gross earnings
- Total deductions
- Net pay
- Bank payment status, where authorized
- Payment date and reference, if available
- Generated-on timestamp

Keep statutory and confidential information visible only to authorized users. Employees should be able to view their own permitted payslips.

### D. Payroll Reports and Reconciliation

Provide reports for:
- Employee-wise payroll register
- Earnings and deductions summary
- Statutory contribution summary
- LOP and attendance impact
- Advance recovery
- Reimbursement payable
- Payment status
- Payroll exceptions
- Payroll reconciliation

Allow filtering by period, employee, department, branch, and payroll status where applicable.

Ensure that report totals reconcile with the corresponding payroll run.

### E. Payroll History and Auditability

Preserve processed payroll records and payslip snapshots. Changes to a salary structure or policy must not silently rewrite an already processed payslip.

If a correction is necessary, implement a controlled adjustment, reversal, or reopening process that records the reason, actor, timestamp, and affected records.

---

## 5. EPF, ESI, Professional Tax, and Statutory Applicability Configuration

### Problem

Not every company or employee necessarily falls under the same statutory requirements. The existing payroll flow must not apply EPF or ESI to every employee or assume that every company has identical registrations and obligations.

Implement configurable statutory applicability at the organization and employee levels.

**Important:** Do not hardcode statutory applicability solely from the company name, a single checkbox, or a universal salary threshold. Actual applicability depends on the applicable law, establishment circumstances, employee eligibility, wages, and effective dates.

### A. Organization-Level Statutory Configuration

Add a dedicated **Statutory & Compliance Settings** section under Organization Setup.

Support configuration for:

**EPF / Provident Fund**
- Whether EPF applies to the establishment
- Establishment registration details
- Registration identifier, if applicable
- Applicable scheme and contribution configuration
- Relevant wage components
- Applicable contribution rates and limits
- Effective-from and effective-to dates
- Exemption or non-applicability classification, with reason and supporting details where appropriate

**ESI**
- Whether ESI applies to the establishment
- ESI registration details, if applicable
- Applicable employee eligibility rules
- Relevant wage definition
- Applicable contribution rates and limits
- Contribution period or effective-date configuration, where relevant
- Exemption or non-applicability classification and reason, where appropriate

**Professional Tax**
- Applicable state or jurisdiction
- Registration or enrollment details where required
- Configured slab or calculation method
- Effective dates

**TDS / Income Tax**
- Applicable payroll withholding configuration
- Employee declarations and eligible information, if included in scope
- Effective financial year
- Configurable calculation method and rates, based on verified current requirements

Also support other required statutory settings where relevant to the organization's jurisdiction and payroll configuration.

### B. Employee-Level Applicability

Each employee's payroll eligibility must be evaluated separately where the applicable rules require it.

Support fields such as:
- EPF applicability or membership classification
- Relevant EPF identifiers, when applicable
- ESI eligibility and identifiers, when applicable
- Applicable wage base
- Statutory exemption or exception reason
- Supporting documents or verification status, where required
- Effective date and audit history

Use the organization-level configuration as the starting point, then apply the employee's actual eligibility and applicable rules.

Do not let an ordinary employee edit their own statutory contribution settings.

### C. Payroll Calculation Behavior

For every payroll run:
1. Determine the applicable organization configuration for the pay period.
2. Determine employee-level eligibility and the applicable effective dates.
3. Calculate each contribution only when required by the configured, applicable rules.
4. Display the contribution base, rate, amount, and reason for applicability or non-applicability.
5. Distinguish a legally non-applicable contribution from missing or incomplete registration/configuration.
6. Block finalization when required compliance data is missing or invalid.
7. Preserve the statutory configuration used for the processed payroll run.
8. Provide an audit trail for changes to rates, limits, eligibility, and exemptions.

If EPF or ESI is not applicable, the calculation should show the relevant non-applicability status and reason rather than silently deducting zero without explanation.

If applicability is unknown or the configuration is incomplete, show an exception requiring authorized review rather than guessing.

### D. Configuration and Compliance Safety

- Keep statutory rates, thresholds, limits, wage definitions, and eligibility rules configurable and effective-dated.
- Do not invent or permanently hardcode legal values.
- Validate statutory rules against current official requirements before using them for real payroll.
- Record the source or verification date of compliance configuration where supported.
- Clearly distinguish a demonstration calculation from a compliance-validated payroll calculation.

The application should support companies for which a contribution is applicable and companies for which it is not, without forcing one universal configuration.

---

## 6. Client-Assigned Employees — Attendance Calculation and Payroll Integration

### Problem

Employees may work at a client's location or on a client engagement. Their attendance, overtime, workdays, and eligible allowances must be tracked correctly without creating duplicate employee records or losing company-level attendance information.

Implement a client assignment-aware attendance workflow.

### A. Assignment Structure

Use the existing employee record and client assignment record.

Each assignment should include:
- Employee ID
- Client ID
- Assignment start date
- Assignment end date, if known
- Assigned work location
- Applicable shift or working schedule
- Client reporting contact or supervisor, where relevant
- Internal company manager
- Assignment status
- Applicable attendance and overtime rules
- Eligible client-related allowances or benefits
- Required timesheet or approval process

An employee can have historical client assignments without creating a new employee profile for every client.

Support the company's normal office work, client-site work, and approved remote work as distinct work locations or work modes where appropriate.

### B. Attendance Capture

Support the relevant attendance methods available in the existing architecture:
- Employee check-in and check-out
- Manual attendance entry by authorized personnel
- Timesheet submission
- Client supervisor verification, where required
- Manager approval
- Attendance correction requests

For each attendance record, capture:
- Employee ID
- Attendance date
- Assignment ID, when client-related
- Client ID, when applicable
- Work location or work mode
- Shift
- Check-in and check-out timestamps, when available
- Break duration, where tracked
- Total worked hours
- Regular hours
- Overtime hours
- Attendance status
- Source of the record
- Approval status
- Approver and approval timestamp, when available
- Correction history

Use a single canonical employee identity and a consistent attendance data model.

Do not count overlapping office and client attendance records as two separate attendance days.

### C. Client Attendance Approval Workflow

Implement a configurable workflow such as:

Employee submits attendance or timesheet
→ Client supervisor verifies, if required
→ Internal reporting manager reviews
→ HR resolves exceptions where needed
→ Approved attendance is included in payroll inputs

The workflow should be configurable because not every client engagement requires the same approval chain.

Handle missing check-outs, disputed hours, overlapping assignments, holidays, weekly offs, late arrivals, and overtime through clear validation and exception workflows.

Client supervisors should only access the records they are authorized to review for their own engagement.

### D. Attendance Calculation for Payroll

Use approved attendance as an input to payroll, not a separate independent payroll record.

Calculate, according to the configured organization and employee rules:
- Scheduled working days
- Present days
- Paid leave
- Unpaid leave
- Holidays and weekly offs
- Approved worked hours
- Approved overtime
- LOP days
- Payable days
- Eligible attendance-linked allowances

Client attendance must contribute to the same employee's payroll calculation, while retaining the client assignment reference for reporting.

Do not assume that all hours above a standard daily schedule automatically qualify as payable overtime. Apply the configured rules and required approvals.

Do not automatically deduct salary for missing or disputed attendance without the appropriate review and applicable rules.

### E. Client-Related Allowances and Expenses

Where the organization's policy permits, support:
- Client-site allowance
- Travel allowance
- Eligible meal or accommodation allowance
- Approved overtime payment
- Reimbursable client-related expenses

Store the eligibility rules, supporting evidence, approval status, and payment route.

Prevent double payments if the same amount has already been reimbursed through Expenses or paid separately.

### F. Client Assignment Closure

When an assignment ends:
- Close the client assignment.
- Stop accepting new attendance under that assignment after the applicable end date, subject to authorized corrections.
- Preserve historical attendance and timesheets.
- Complete outstanding approval and expense workflows.
- Recover client-issued assets and access where required.
- Return the employee to an available or unassigned state where appropriate.

**Closing a client assignment must never automatically terminate the employee's company employment.**

### G. Reporting

Provide reports for:
- Client-wise employee allocation
- Employee-wise attendance across client assignments
- Client-wise approved hours
- Overtime by client and employee
- Missing or disputed timesheets
- Client attendance approval status
- Client-related allowances and expenses
- Assignment dates and history

Ensure the employee's attendance totals, client assignment totals, and payroll inputs reconcile without double-counting.

---

## 7. Data Model and Integration Requirements

Inspect the existing schema and reuse suitable models. Extend it only where required.

At minimum, ensure the architecture can represent:

- Organization and statutory configuration
- Employee statutory eligibility
- Salary structures and effective-dated components
- Payroll runs and employee payroll details
- Earnings and deductions
- Payslip snapshots
- Salary advances and recovery schedules
- Expense reimbursements and settlement states
- Attendance records
- Client assignments
- Client-linked timesheets and approvals
- Asset lifecycle and assignment history
- Audit events

Use stable record IDs and relationships. Avoid duplicating employees, organization profiles, attendance, or payroll records.

Add migrations or API changes if the project has a backend database. Keep calculations in a reusable business-logic layer rather than implementing separate inconsistent formulas in each screen.

Preserve existing records and provide safe migration defaults.

If the project is still using mock data or local storage, implement the improvements consistently with that architecture while identifying the exact production persistence and security work still required.

---

## 8. Role-Based Access and Audit Controls

Maintain role-based permissions for HR, Senior Management, Employees, and other roles already supported.

Restrict access to:
- Salary structures
- Detailed payroll calculations
- Bank and statutory identifiers
- Payroll processing and approval
- Statutory configuration
- Attendance correction and approval
- Client attendance
- Asset lifecycle actions
- Organization-wide reports
- Import and export of sensitive data

Enforce permissions in the backend when available, not only by hiding buttons.

Audit important changes, including:
- Organization profile edits
- Statutory configuration changes
- Salary structure updates
- Payroll calculations, approvals, and corrections
- Attendance changes and approvals
- Client assignment lifecycle
- Asset activation, deactivation, allocation, and return

Record the actor, timestamp, affected record, and relevant before-and-after values where supported.

---

## 9. Implementation and Testing Instructions

Implement the work in this order:

1. Fix asset lifecycle actions and persistence.
2. Repair organization profile saving and loading.
3. Consolidate Organization Setup and Company/System Settings.
4. Implement detailed payroll calculation and employee-level breakdown.
5. Add configurable statutory applicability and payroll integration.
6. Implement client assignment-aware attendance and approval workflows.
7. Integrate approved attendance, advances, deductions, and eligible reimbursements with payroll.
8. Test role permissions, historical data, validation, and exports.

Do not stop after producing a plan or mockup. Implement the code changes, update the existing models and services as needed, and run the available build and tests.

### Final acceptance checklist

- Asset activation and deactivation work for all applicable lifecycle states.
- Organization details persist correctly after navigation and refresh.
- Organization Setup and System Settings have clear, nonduplicated responsibilities.
- Payroll shows transparent earnings, deductions, payable days, and net pay calculations for each employee.
- Individual payslips can be generated from the correct payroll records.
- EPF, ESI, and other statutory deductions are calculated according to configurable applicability and verified rules.
- Incomplete compliance configuration produces a visible exception rather than a guessed result.
- Client-related attendance is linked to the correct employee and assignment.
- Approved client attendance flows into payroll without duplicate days or hours.
- Assignment closure preserves employee employment and historical records.
- Existing working modules and data remain intact.

At completion, provide a concise implementation report listing the files changed, features implemented, tests performed, any remaining defects, and functionality that still requires backend or compliance verification.