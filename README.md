# Orbyx HRMS

Orbyx HRMS is a React + TypeScript HRMS demonstration application. This reference build includes organization and employee administration, leaves, payroll, expenses, advances and travel petty cash tracking, hardware/digital assets, shifts and attendance, and client assignment tracking.

## Run locally

**Prerequisite:** Node.js (current LTS recommended).

1. Install dependencies: `npm install`
2. Start the development server: `npm run dev`
3. Open the local URL printed by Vite.
4. Run `npm run lint` for TypeScript checks and `npm run build` for a production build.

## Changes in this reference revision

- Renamed package metadata and page branding to **Orbyx HRMS**.
- Split the combined Employees & Org navigation into separate **Organization Setup** and **Employee Setup** sections.
- Added Organization Setup views for company profile, branches, departments, designations, and reporting hierarchy.
- Added Client Management for client records and employee assignments, with assignment closure separate from employment termination.
- Added salary advance and travel petty cash request, approval, disbursement-reference, and settlement tracking under Expenses.
- Extended Asset Management registration to classify hardware versus software/digital resources and capture account identifiers, license seats, renewal dates, subscription costs, and billing frequency.
- Added a collapsible sidebar and updated module headings.

## Important limitations

This is still a **browser-local demo reference**, not a production-secure multi-user HRMS. Existing records and the newly added client/advance records use local storage. The new client assignment records are not yet automatically synchronized into attendance or payroll calculations. Advance tracking does not execute bank transfers or automatically deduct salary; payroll integrations and payment-provider connections must be implemented and tested separately. Secure authentication, server-side authorization, relational persistence, private document storage, statutory payroll validation, and end-to-end integration tests are required before production deployment.

The application intentionally does not store passwords or secret credentials in asset records.
