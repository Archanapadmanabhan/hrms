# ORBYX HRMS — Enterprise Enhancement Implementation Prompt
## Organization Governance, Manual Attendance, Client Deployment, Policy Governance, Delegated Authority, and Global Profile Synchronization

### 1. Objective

Enhance the existing Orbyx HRMS application with the six requirements specified below.

The existing application already contains modules, data models, dashboards, role-based permissions, attendance, client management, payroll, employee profiles, policies, and audit mechanisms. Inspect the current implementation and extend it safely.

**Do not rebuild the application from scratch. Do not replace existing functionality with static mockups. Do not generate another audit report instead of modifying the code.**

The task is to inspect the existing implementation, identify the precise changes needed, implement them in the current codebase, integrate them with the existing data layer, and verify the actual behavior.

Preserve:
- Orbyx HRMS branding and navigation.
- Existing employee, organization, client, payroll, and attendance records.
- Existing working routes and modules.
- Existing role definitions and authorization rules.
- Existing database relationships and API contracts wherever possible.
- Existing audit history and approval workflows.

Use incremental changes, backward-compatible data migrations, reusable services, and shared components.

---

# REQUIREMENT 1 — ORGANIZATION HIERARCHY: CHAIRMAN / BOARD ABOVE MD

## 2. Organization Structure

Extend the existing Organization Setup and Reporting Hierarchy to support the governance structure:

**Board of Directors / Chairman → Managing Director (MD) → Managers → Employees**

Support the following organizational roles and relationships:
- Chairman
- Board of Directors, where applicable
- Managing Director / Founder, according to the organization's configured structure
- Senior Management
- Department Managers
- Team Leads, if applicable
- Employees

Do not assume that every company has a Chairman, a Board, or a Founder. These positions and relationships must be configurable.

### 2.1 Chairman and Board Configuration

Provide authorized HR or Super Admin users with the ability to:
- Create and maintain Chairman and Board member records.
- Assign the appropriate governance position.
- Associate the MD with the Chairman or designated Board authority.
- Configure reporting and oversight relationships.
- Record effective dates for changes.
- View historical governance changes.

Use the existing employee/person model where appropriate. If a board member is not an employee, support a separate governance-person record rather than incorrectly creating an employee payroll record.

A Chairman or Board member should not automatically be treated as an employee entitled to attendance tracking, salary, leave, or payroll.

### 2.2 Hierarchy Chart

Update the existing organization chart to display the governance hierarchy above the MD.

Requirements:
- Display the Chairman or Board above the MD when configured.
- Display the MD's reporting relationship correctly.
- Support multiple Board members when required.
- Distinguish governance oversight from ordinary employee reporting.
- Allow authorized users to expand and collapse branches.
- Show the person's photograph, display name, and role when available.
- Support viewing a person's profile where permitted.
- Prevent circular reporting relationships.
- Prevent a person from reporting to themselves.
- Validate changes before saving.
- Preserve historical reporting relationships.

Do not hardcode a Chairman above the MD if the organization has not configured one.

If Board oversight and operational reporting have different meanings in the current data model, represent them as distinct relationship types rather than forcing both into a single manager field.

### 2.3 Permissions

- Super Admin or authorized HR can maintain organizational relationships.
- The MD can view governance and organization information permitted by their role.
- Chairman and Board access must be explicitly configured.
- A governance role does not automatically grant access to confidential salary, bank, tax, or personal employee data.
- All hierarchy changes must be audited.

### 2.4 Acceptance Tests

Verify:
1. The Chairman appears above the MD when configured.
2. The MD's reporting or oversight relationship is displayed correctly.
3. Multiple Board members can be represented without creating false reporting chains.
4. An unconfigured Chairman is not displayed as a fabricated person.
5. Circular and self-reporting relationships are rejected.
6. Saved hierarchy changes persist after refreshing the application.
7. Existing department and employee reporting relationships remain intact.

---

# REQUIREMENT 2 — MANUAL ATTENDANCE DURING MACHINE FAILURE OR SERVER DOWNTIME

## 3. Manual Attendance and Correction Workflow

Enhance the existing Attendance & Shifts module to support authorized manual attendance entry and corrections when:
- An attendance machine fails.
- The application or server is unavailable.
- An employee forgets to check in or check out.
- An attendance record contains incorrect timestamps.
- An authorized administrator must correct an attendance exception.

Manual attendance must be a controlled exception workflow, not an unrestricted way to modify attendance records.

### 3.1 Manual Attendance Entry

Provide an authorized Manual Attendance Entry action.

Capture:
- Employee ID and name.
- Attendance date.
- Applicable shift.
- Work location or work mode, if required by the existing system.
- Client and assignment, if the employee worked at a client office.
- Actual check-in time.
- Actual check-out time.
- Break duration, where tracked.
- Calculated worked hours.
- Attendance outcome.
- Reason for manual entry.
- Failure type: machine failure, server downtime, missed punch, correction, or other authorized reason.
- Supporting evidence, where applicable.
- Person submitting the entry.
- Submission timestamp.
- Approval status.

Require a reason for every manual entry or correction.

For machine or server failures, allow relevant supporting evidence such as:
- Incident reference.
- Supervisor confirmation.
- Client email confirmation.
- Authorized timesheet.
- Other approved evidence.

Do not require evidence that is impossible to provide in a particular incident, but record why evidence is unavailable where the policy requires an explanation.

### 3.2 Attendance Correction Requests

Employees should be able to request corrections to their own permitted attendance records.

Capture:
- Original attendance values.
- Requested values.
- Correction reason.
- Supporting evidence, if available.
- Submission date.
- Review and approval history.

Employees must not directly overwrite finalized attendance records.

### 3.3 Approval Workflow

Use the existing approval system and permissions.

Recommended workflow:

Employee or authorized supervisor submits a manual entry or correction
→ Reporting manager reviews, where required
→ HR approves or rejects according to the configured policy
→ Approved attendance becomes eligible for payroll processing.

The workflow must be configurable where the existing system requires a different approval chain.

Support:
- Pending Review
- Returned for Correction
- Approved
- Rejected

A manager must not automatically be allowed to approve their own manual attendance entry.

When an employee is assigned to a client, include the client attendance verification information where required. Client verification does not replace the company's final approval.

### 3.4 Audit and Original Records

Maintain a complete audit trail containing:
- Original values.
- Updated values.
- Reason for the change.
- Supporting evidence reference.
- Actor who submitted the change.
- Reviewer and approver.
- Approval decision.
- Timestamps.
- Rejection or correction comments.

Never silently replace an original attendance record.

Preserve the original values and maintain a correction history or equivalent auditable record.

### 3.5 Downtime Recovery and Duplicate Prevention

When service is restored:
- Allow authorized users to enter the actual historical timestamps.
- Preserve the actual attendance date separately from the entry/submission timestamp.
- Detect duplicate employee/date/shift records.
- Detect overlapping attendance.
- Flag conflicts with existing machine punches.
- Require review when records conflict.
- Avoid double-counting attendance or working hours.

Do not invent timestamps or automatically assume a full working day.

If the system already supports queued offline attendance, integrate with it. Do not claim offline support unless attendance can genuinely be recorded and safely synchronized without the server.

### 3.6 Payroll Integration

Only approved attendance and corrections may be treated as finalized payroll inputs.

After a correction:
- Recalculate draft payroll where appropriate.
- Flag affected payroll runs for review if they have already been approved or processed.
- Do not silently modify historical finalized payslips.
- Use a controlled reopening or adjustment workflow for processed payroll.

### 3.7 Acceptance Tests

Verify:
1. HR can create a manual entry with a mandatory reason.
2. Unauthorized users cannot create or approve entries.
3. Supporting evidence can be attached or referenced according to the existing storage architecture.
4. Employees can request corrections without directly overwriting approved records.
5. Conflicting punches and duplicate entries are flagged.
6. Original values remain available in the audit history.
7. Only approved corrections affect eligible payroll calculations.
8. The actual attendance date is preserved even when the entry is made later.

---

# REQUIREMENT 3 — CLIENT OFFICE AND PROJECT DEPLOYMENT ATTENDANCE

## 4. Client Deployment Management

Extend the existing Client Management and Attendance & Shifts modules to track employees deployed to external client offices, projects, or client engagements.

Do not create a second employee identity or an independent client payroll system.

### 4.1 Deployment Record

Each deployment must reference the existing employee and client records.

Capture:
- Deployment ID.
- Employee ID.
- Client organization.
- Client project or engagement.
- Client office or work location.
- Deployment start date.
- Deployment end date, if applicable.
- Deployment status.
- Internal reporting manager.
- Client supervisor or authorized verifier.
- Assigned shift and schedule.
- Applicable attendance rules.
- Eligible allowances or benefits, where configured.
- Deployment notes and supporting documents, where required.

Support multiple historical deployments for the same employee without duplicating employee profiles.

Validate deployment dates and prevent overlapping active assignments where they conflict with the configured working schedule.

### 4.2 Employee Attendance

Employees deployed to a client must use the existing Orbyx HRMS attendance interface.

Record:
- Employee ID.
- Client and project.
- Deployment ID.
- Attendance date.
- Check-in and check-out timestamps.
- Shift.
- Break duration.
- Worked hours.
- Overtime claimed, where applicable.
- Attendance status.
- Client verification status.
- Company approval status.
- Record source.
- Correction history.

Do not require GPS or location permissions.

Do not create duplicate attendance entries when the same employee works at a client location.

Integrate client attendance with the canonical employee attendance records and existing attendance reports.

### 4.3 Client-Side Verification

Provide a Client Attendance Verification view for authorized client supervisors.

They should be able to:
- Review attendance for assigned client deployments.
- Verify the reported attendance.
- Dispute recorded hours.
- Flag missing punches.
- Add comments.
- Request corrections.
- Record the method of verification.

Support these verification methods:
- In-application confirmation.
- Recorded email confirmation.
- Approved timesheet or other supporting evidence.

### 4.4 Email Confirmation Recording

When attendance is confirmed through email, capture:
- Client contact or sender identity.
- Sender email address.
- Received or confirmation date.
- Relevant attendance date or date range.
- Client deployment or project.
- Confirmation summary.
- Email reference or message ID, where available.
- Supporting email file or attachment reference, where supported.
- Person who recorded the confirmation.
- Verification status.
- Review comments.

Do not automatically trust a manually typed email address as proof of authenticity.

Clearly distinguish:
- Email confirmation recorded manually by an authorized user.
- Email imported from a connected, authenticated mailbox.
- Confirmation verified through another approved process.

Do not claim mailbox integration unless a real email connector or API has been configured.

### 4.5 Approval Workflow

Use this workflow:

Employee check-in/check-out or authorized manual entry
→ Client supervisor verification or recorded email confirmation
→ Company reporting manager or HR review
→ Approved attendance
→ Payroll inputs.

Company approval is mandatory.

Client verification alone must not finalize company attendance or authorize payroll.

Support correction, dispute resolution, rejection, and audit history.

### 4.6 Deployment Closure

When a deployment ends:
- Close the deployment.
- Prevent new attendance under that deployment after its end date, except authorized corrections.
- Preserve historical attendance.
- Resolve pending attendance and timesheet approvals.
- Complete relevant expense settlement.
- Recover client-issued assets and access where applicable.
- Preserve the employee's company employment status.

Closing a client deployment must never automatically terminate the employee.

### 4.7 Acceptance Tests

Verify:
1. HR can create a deployment using an existing employee and client.
2. Attendance is linked to the correct client project and deployment.
3. Client supervisors can access only authorized deployments.
4. Email confirmations can be recorded with relevant metadata and evidence references.
5. Manual and client attendance do not create duplicate daily records or hours.
6. Company approval is required before payroll finalization.
7. Closing a deployment preserves employee employment and historical records.
8. Deployment reports reflect accurate employee and attendance information.

---

# REQUIREMENT 4 — CENTRALIZED POLICIES HUB

## 5. Policy Governance and Publication

Extend the existing centralized Policies hub rather than creating another policy module.

The Policies hub must serve as the single source of truth for company policies and their versions.

Organize policies into the existing categories, including:
- Organization.
- Employee and Exit.
- Leave.
- Attendance and Shifts.
- Payroll.
- Statutory and Compliance.
- Expenses.
- Assets.
- Client Assignments.

Additional categories may be added through controlled configuration.

### 5.1 Policy Information

Each policy should include:
- Unique policy ID and code.
- Policy title.
- Category.
- Description and policy content.
- Version number.
- Owner or responsible department.
- Applicable employee groups.
- Effective-from date.
- Expiry or review date, where relevant.
- Status.
- Created by and creation date.
- Last modified by and modification date.
- Approval history.
- Publication history.
- Superseded version reference.

### 5.2 Policy Lifecycle

Implement a controlled lifecycle:

Draft
→ Submitted for Review
→ Approved
→ Published
→ Superseded or Archived.

Support rejection and return for revision.

Only authorized users can submit, approve, publish, or archive policies.

A policy author must not bypass a mandatory approval workflow.

Do not permit ordinary employees to edit official company policy content.

### 5.3 Version Control

When a published policy changes:
- Create a new version.
- Preserve the previous published version.
- Record the reason for the change.
- Record the actor and timestamps.
- Require the appropriate review and approval.
- Publish the new version according to its effective date.
- Retain historical acknowledgement records against the version originally acknowledged.

Do not overwrite published policy history.

### 5.4 Employee Policy Access

Provide a dedicated employee-facing Policies view.

Employees should be able to:
- Browse policies applicable to them.
- Search by policy name and category.
- Read published policy content.
- View the version and effective date.
- Download or print the policy where permitted.
- Acknowledge required policies.
- View their acknowledgement history.

Do not expose draft policies or restricted internal documents to ordinary employees.

### 5.5 Acknowledgement Tracking

For policies requiring acknowledgement, capture:
- Employee ID.
- Policy ID.
- Published policy version.
- Acknowledgement status.
- Acknowledgement timestamp.
- Relevant confirmation metadata.
- Applicable due date.
- Reminder or outstanding status, if supported.

A policy update may require a new acknowledgement when configured.

Do not erase prior acknowledgements when a new policy version is published.

Provide HR with a report of:
- Employees who have acknowledged.
- Employees who are pending.
- Overdue acknowledgements.
- Acknowledgement history by policy version.

### 5.6 Functional Integration

Use published policies in the relevant workflows.

For example:
- Leave policies influence leave eligibility and balances.
- Attendance policies influence shift and correction rules.
- Payroll policies influence applicable payroll calculations.
- Expense policies influence claim limits and approvals.
- Asset policies influence assignment and recovery workflows.

Do not treat the policy hub as a static document library when the policy contains executable configuration.

Where a policy is informational only, do not invent calculation behavior.

### 5.7 Acceptance Tests

Verify:
1. Authorized users can create and submit policy drafts.
2. Approval and publication follow configured permissions.
3. Published policies are visible to applicable employees.
4. Acknowledgements are recorded against specific versions.
5. New versions preserve historical records.
6. Draft and restricted policies are not exposed to unauthorized users.
7. Reports correctly show pending and completed acknowledgements.

---

# REQUIREMENT 5 — SEPARATE MD AND FOUNDER ACCOUNTS WITH CONTROLLED DELEGATION

## 6. Separate Identity and Authority

Provide separate accounts and identities for:
- Managing Director (MD).
- Founder.
- Super Admin.
- Admin.
- HR.
- Other existing roles.

The MD and Founder must have separate login identities, role assignments, permissions, and audit histories.

Do not combine them into one shared account or treat their titles as interchangeable.

A person may hold more than one business role if explicitly configured, but identity and authorization must remain unambiguous.

### 6.1 Authentication

Inspect the existing authentication system.

If real authentication already exists:
- Extend the existing identity and role model.
- Preserve account security.
- Avoid duplicate accounts for the same authenticated identity.
- Support separate MD and Founder accounts.

If the current MVP uses a persona switcher or demo role selector, do not represent that as production authentication.

Keep prototype access clearly distinguished from production login.

### 6.2 Role and Permission Configuration

Use explicit permissions for:
- View.
- Create.
- Edit.
- Submit.
- Approve.
- Reject.
- Publish.
- Process.
- Export.
- Delegate.
- Perform actions on behalf of another user.

Do not automatically grant all permissions to every Founder, MD, Super Admin, or Admin.

Sensitive actions, such as payroll approval, policy publication, statutory configuration, and manual attendance approval, must follow their configured authorization rules.

### 6.3 Controlled Delegation

Implement a Delegation Management feature for authorized Super Admins or Admins.

A delegation record should include:
- Delegation ID.
- Delegating person.
- Authorized acting person.
- Permitted actions.
- Applicable modules or records.
- Effective-from date.
- Effective-to date.
- Reason.
- Status.
- Granting authority.
- Creation and revocation timestamps.

Support:
- Grant delegation.
- View active delegation.
- Modify delegation within permitted authority.
- Revoke delegation.
- Expire delegation automatically after its end date.

Do not allow an Admin to grant themselves greater authority than they possess.

The system must check the delegate's permissions, the represented person's relevant authority, the delegation scope, and the target record's permissions.

A delegation must not bypass mandatory approval separation or other security controls.

### 6.4 Acting on Behalf of the MD or Founder

When an authorized Admin performs an action on behalf of the MD or Founder:
- Authenticate the actual acting person.
- Record the represented person separately.
- Validate that the action is explicitly covered by an active delegation.
- Display the acting-on-behalf-of context clearly.
- Preserve the real actor's identity.
- Apply the relevant permission checks.
- Record the delegation reference.

The interface must not falsely show that the MD or Founder personally performed the action.

For example, if an Admin approves a permitted record on behalf of the MD, the audit log must state that the Admin performed the action under delegation from the MD.

If a particular approval must legally or operationally be performed personally by the MD or Founder, delegation must not be used to bypass that restriction.

### 6.5 Audit Trail

For every delegated action, record:
- Actual actor ID and role.
- Represented person ID and role.
- Delegation ID.
- Action performed.
- Target record.
- Timestamp.
- Outcome.
- Reason or comments, where required.

Audit both the creation and revocation of delegation permissions.

Prevent an actor from editing or deleting the audit record to conceal the delegation.

### 6.6 Acceptance Tests

Verify:
1. MD and Founder accounts are separate.
2. Each account has its own permissions and audit history.
3. An Admin without delegation cannot act on behalf of the MD or Founder.
4. An authorized delegate can perform only the permitted actions.
5. Expired or revoked delegation is rejected.
6. The audit trail identifies both the actual actor and represented person.
7. Delegation cannot bypass mandatory approval controls.
8. The interface does not misrepresent a delegated action as personally performed by the MD or Founder.

---

# REQUIREMENT 6 — GLOBAL EMPLOYEE NAME AND PROFILE PHOTO SYNCHRONIZATION

## 7. Single Source of Truth for Employee Identity

When an employee's name or profile photograph changes, the update must be reflected consistently throughout the application.

Do not update each screen independently or maintain duplicate name and photo values in separate components.

Inspect the existing employee model, data layer, subscriptions, caching, and components before implementing the changes.

### 7.1 Centralized Employee Profile

Use the existing employee record as the authoritative source for:
- Employee name.
- Profile photograph.
- Employee ID.
- Official email.
- Official contact information, where applicable.
- Employment status.
- Designation and department.
- Reporting manager.

Do not create another employee record to support profile changes.

Use stable employee IDs for relationships rather than employee names or photo URLs.

### 7.2 Global Update Behavior

When an authorized user updates an employee's name or photograph:
- Validate the changes.
- Save them to the authoritative data source.
- Update the shared employee state or invalidate relevant caches.
- Notify subscribed components or refresh dependent queries.
- Refresh displayed values throughout the application.

Where applicable, update:
- Employee profile.
- Employee directory.
- My Reportees.
- Reporting hierarchy.
- Dashboard cards.
- Attendance records and attendance lists.
- Leave requests and approval queues.
- Expense claims.
- Payroll lists and payslips.
- Client assignments.
- Asset assignments.
- Recruitment-to-employee onboarding references.
- Appraisal and promotion screens.
- Employee document vault.
- Notifications and employee-related reports.

### 7.3 Historical Integrity

Updating an employee's name or photograph must not alter:
- Employee ID.
- Attendance timestamps.
- Approval history.
- Payroll calculations.
- Historical payslip amounts.
- Existing client assignments.
- Document verification history.
- Audit records.

Historical transaction records should retain their relationship to the employee ID. Where historical snapshots intentionally preserve the display name at transaction time, do not overwrite them unless the business rules explicitly require it.

Use the current employee profile for ordinary profile displays and preserve historical snapshots for finalized transactions when required.

### 7.4 Photo Storage and Display

Use the existing photo upload/capture functionality.

- Persist the photo using the existing configured storage mechanism.
- Use a consistent employee photo reference.
- Refresh image caches or component state after replacement.
- Handle missing or invalid photos with a default avatar.
- Avoid stale browser object URLs or temporary camera images.
- Enforce appropriate access permissions.

If the current MVP stores images in local storage, keep the prototype functional and clearly identify the production migration required for secure file storage.

### 7.5 Acceptance Tests

Verify:
1. Updating an employee name refreshes the directory and profile.
2. Updating a photo refreshes the header avatar and hierarchy.
3. Attendance, leave, expense, payroll, asset, and client screens show the correct current profile where applicable.
4. Historical records remain associated with the same employee ID.
5. Refreshing the application preserves the updated profile according to the existing persistence mechanism.
6. Updates do not create duplicate employee records.
7. Unauthorized users cannot change protected employee identity fields.

---

# 8. Cross-Module Integration Requirements

Integrate all six enhancements with the existing:
- Organization Setup.
- Employee Setup.
- Reporting Hierarchy.
- Client Management.
- Attendance & Shifts.
- Leave & Holidays.
- Payroll & Payslips.
- Expense Claims.
- Asset Management.
- Policies.
- Recruitment.
- Promotions & Appraisals.
- Reports & Analytics.
- Authentication and permission services.
- Shared data layer.
- Audit logs and notifications.

Use existing services and components where appropriate.

Avoid duplicate sources of truth for employees, policies, attendance, delegations, and organizational relationships.

If a backend database exists, use safe migrations, appropriate foreign keys, validation, and transactional updates.

If the project uses local storage, implement the prototype consistently and identify which features require backend persistence before production.

Do not silently reset the existing data.

---

# 9. Implementation Plan

Before coding, inspect the existing application and map each requirement to the relevant source files and services.

Then implement in this order:

### Phase 1 — Organization and Identity
- Extend the organization hierarchy for Chairman and Board oversight.
- Preserve the MD's existing relationships.
- Implement global employee profile synchronization.

### Phase 2 — Attendance Reliability
- Implement manual attendance and correction workflows.
- Add evidence and approval handling.
- Integrate client deployment attendance and email verification records.
- Preserve attendance history and payroll integrity.

### Phase 3 — Policy Governance
- Extend the existing Policies hub.
- Implement versioning, approval, publication, and employee acknowledgement.
- Integrate policy configuration with applicable workflows.

### Phase 4 — Delegated Authority
- Implement or extend separate MD and Founder accounts.
- Add controlled delegation.
- Enforce delegated permissions and audit attribution.

### Phase 5 — Integration and Testing
- Verify cross-module synchronization.
- Test permissions and failure scenarios.
- Run available build checks and automated tests.
- Resolve regressions before marking the work complete.

Do not create a separate application, duplicate existing modules, or remove working features.

---

# 10. Mandatory End-to-End Acceptance Tests

Test the following scenarios in the running application:

1. Configure a Chairman and verify the governance hierarchy above the MD.
2. Attempt an invalid circular hierarchy change and verify rejection.
3. Create a manual attendance entry with a reason and supporting evidence.
4. Submit an attendance correction and verify that the original values remain auditable.
5. Simulate a server or machine outage scenario using authorized historical entry, without inventing timestamps.
6. Verify client attendance using a client confirmation and a recorded email reference.
7. Confirm that company HR or an authorized manager must approve the attendance.
8. Verify that only approved attendance enters eligible payroll calculations.
9. Publish a policy and confirm that employees can access the correct published version.
10. Update a published policy and verify that the old version and acknowledgements remain available.
11. Verify that employees can acknowledge required policies and HR can review acknowledgement status.
12. Log in separately as MD and Founder and verify independent permissions.
13. Test an authorized delegation, an unauthorized delegation, an expired delegation, and a revoked delegation.
14. Verify that delegated actions record both the actual actor and represented person.
15. Change an employee's name and photograph and confirm that all relevant current profile displays update.
16. Confirm that historical attendance, payroll, and audit records remain intact.
17. Verify that the existing application still builds and that previously working modules continue to function.

---

# 11. Final Delivery Requirements

After implementation, provide a concise but evidence-based report containing:

1. Files changed.
2. Database migrations or model changes.
3. APIs, services, and UI components updated.
4. Features implemented and connected to existing modules.
5. End-to-end tests actually executed and their results.
6. Features that remain incomplete.
7. Production infrastructure requirements.

Do not mark a feature completed merely because a screen, button, or data model exists.

Clearly distinguish:
- Functionality implemented and tested.
- Functionality implemented but not fully tested.
- Functionality that remains a prototype.
- Functionality requiring external infrastructure or integration.

**Final instruction:** Implement these six enhancements incrementally in the existing Orbyx HRMS MVP, preserve existing functionality and data, enforce role-based authorization, and verify the actual workflows before reporting completion.