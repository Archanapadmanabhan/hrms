import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { PhotoCaptureField } from '../common/PhotoCaptureField';
import { db } from '../../db/storage';
import { hrmsService } from '../../services/hrmsService';
import { useAuth } from '../../services/authContext';
import { Employee, EmploymentType } from '../../types/hrms';
import { Check, AlertCircle, ShieldCheck } from 'lucide-react';

interface NewEmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (emp: Employee) => void;
}

export const NewEmployeeModal: React.FC<NewEmployeeModalProps> = ({ isOpen, onClose, onCreated }) => {
  const { currentUser } = useAuth();

  const nextId = hrmsService.generateNextEmployeeId();
  const departments = db.getDepartments();
  const designations = db.getDesignations();
  const branches = db.getBranches();
  const shifts = db.getShifts();
  const managers = db.getEmployees();
  const structures = db.getSalaryStructures();

  const [avatarUrl, setAvatarUrl] = useState(
    'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80'
  );
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [dob, setDob] = useState('1996-01-01');
  const [gender, setGender] = useState<'Male' | 'Female' | 'Other'>('Male');
  const [bloodGroup, setBloodGroup] = useState('O+');
  const [address, setAddress] = useState('');

  // Emergency contact
  const [emName, setEmName] = useState('');
  const [emRelation, setEmRelation] = useState('Parent');
  const [emPhone, setEmPhone] = useState('');

  // Employment
  const [departmentId, setDepartmentId] = useState(departments[0]?.id || 'DEP-ENG');
  const [designationId, setDesignationId] = useState(designations[0]?.id || 'DES-JR-ENG');
  const [branchId, setBranchId] = useState(branches[0]?.id || 'BR-BLR');
  const [shiftId, setShiftId] = useState(shifts[0]?.id || 'SHIFT-GEN');
  const [reportingManagerId, setReportingManagerId] = useState(managers[1]?.id || 'EMP-002');
  const [employmentType, setEmploymentType] = useState<EmploymentType>('Permanent');
  const [dateOfJoining, setDateOfJoining] = useState(new Date().toISOString().split('T')[0]);

  // Financial & Statutory
  const [bankName, setBankName] = useState('HDFC Bank Ltd');
  const [accountNumber, setAccountNumber] = useState('');
  const [ifsc, setIfsc] = useState('HDFC0001234');
  const [panNumber, setPanNumber] = useState('');
  const [baseSalaryAnnual, setBaseSalaryAnnual] = useState(960000);
  const [salaryStructureId, setSalaryStructureId] = useState(structures[2]?.id || 'SS-JUNIOR');

  // Configurable Employee-Level Statutory Applicability
  const [epfApplicable, setEpfApplicable] = useState(true);
  const [epfWageCeilingApplied, setEpfWageCeilingApplied] = useState(true);
  const [pfUan, setPfUan] = useState('');
  const [esiApplicable, setEsiApplicable] = useState(false);
  const [esiNumber, setEsiNumber] = useState('');
  const [ptApplicable, setPtApplicable] = useState(true);
  const [statutoryExemptionReason, setStatutoryExemptionReason] = useState('');

  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName || !lastName || !email || !phone || !accountNumber || !panNumber) {
      setError('Please complete all mandatory personal, contact, and banking fields.');
      return;
    }

    try {
      const created = hrmsService.createEmployee(
        {
          userId: `user_${firstName.toLowerCase()}_${Math.floor(Math.random() * 1000)}`,
          firstName,
          lastName,
          email,
          officialEmail: email,
          phone,
          officialPhone: phone,
          avatarUrl,
          dateOfBirth: dob,
          gender,
          bloodGroup,
          maritalStatus: 'Single',
          address: address || 'Indiranagar, Bengaluru',
          emergencyContact: {
            name: emName || `${firstName}'s Guardian`,
            relationship: emRelation,
            phone: emPhone || phone
          },
          departmentId,
          designationId,
          branchId,
          employmentType,
          status: 'Active',
          dateOfJoining,
          confirmationDate: employmentType === 'Permanent' ? '2026-10-01' : undefined,
          noticePeriodDays: 30,
          reportingManagerId,
          shiftId,
          bankDetails: {
            bankName,
            accountNumber,
            ifscOrRouting: ifsc,
            accountType: 'Savings'
          },
          panOrTaxNumber: panNumber.toUpperCase(),
          pfUan: pfUan.trim() || undefined,
          esiNumber: esiNumber.trim() || undefined,
          epfApplicable,
          epfWageCeilingApplied,
          esiApplicable,
          ptApplicable,
          statutoryExemptionReason: statutoryExemptionReason.trim() || undefined,
          baseSalaryAnnual: Number(baseSalaryAnnual),
          salaryStructureId
        },
        currentUser.id,
        currentUser.name
      );

      onCreated(created);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to create employee profile.');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create New Employee Profile"
      description={`Generated System ID: ${nextId} · Onboarding wizard with live webcam photo capture & statutory eligibility`}
      maxWidth="3xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Section 0: Employee Photo Capture / Upload */}
        <PhotoCaptureField
          value={avatarUrl}
          onChange={setAvatarUrl}
          label="Employee Photograph (Live Camera Capture or File Upload)"
        />

        {/* Section 1: Basic Info */}
        <div className="p-3.5 bg-slate-50/75 rounded-xl border border-slate-200/80 space-y-3">
          <p className="font-semibold text-slate-900 border-b border-slate-200 pb-1">1. Personal & Contact Identity</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-slate-600 font-medium mb-1">First Name *</label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="e.g. Rahul"
                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg"
                required
              />
            </div>
            <div>
              <label className="block text-slate-600 font-medium mb-1">Last Name *</label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="e.g. Varma"
                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg"
                required
              />
            </div>
            <div>
              <label className="block text-slate-600 font-medium mb-1">Work Email *</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="rahul.varma@orbyx.internal"
                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg"
                required
              />
            </div>
            <div>
              <label className="block text-slate-600 font-medium mb-1">Mobile Phone *</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98111 22334"
                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg"
                required
              />
            </div>
            <div>
              <label className="block text-slate-600 font-medium mb-1">Date of Birth</label>
              <input
                type="date"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-slate-600 font-medium mb-1">Gender</label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value as any)}
                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg"
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>
        </div>

        {/* Section 2: Organization & Reporting */}
        <div className="p-3.5 bg-slate-50/75 rounded-xl border border-slate-200/80 space-y-3">
          <p className="font-semibold text-slate-900 border-b border-slate-200 pb-1">2. Department, Designation & Reporting</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-slate-600 font-medium mb-1">Department</label>
              <select
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg"
              >
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-slate-600 font-medium mb-1">Designation</label>
              <select
                value={designationId}
                onChange={(e) => setDesignationId(e.target.value)}
                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg"
              >
                {designations.map((d) => (
                  <option key={d.id} value={d.id}>{d.title}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-slate-600 font-medium mb-1">Reporting Manager</label>
              <select
                value={reportingManagerId}
                onChange={(e) => setReportingManagerId(e.target.value)}
                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg"
              >
                {managers.map((m) => (
                  <option key={m.id} value={m.id}>{m.firstName} {m.lastName} ({m.id})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-slate-600 font-medium mb-1">Branch Location</label>
              <select
                value={branchId}
                onChange={(e) => setBranchId(e.target.value)}
                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg"
              >
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-slate-600 font-medium mb-1">Employment Type</label>
              <select
                value={employmentType}
                onChange={(e) => {
                  const val = e.target.value as EmploymentType;
                  setEmploymentType(val);
                  if (val === 'Contract' || val === 'Intern') {
                    setEpfApplicable(false);
                    setStatutoryExemptionReason(`${val} engagement — exempt from PF`);
                  }
                }}
                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg"
              >
                <option value="Permanent">Permanent</option>
                <option value="Contract">Contract</option>
                <option value="Probation">Probation</option>
                <option value="Intern">Intern</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-600 font-medium mb-1">Work Shift</label>
              <select
                value={shiftId}
                onChange={(e) => setShiftId(e.target.value)}
                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg"
              >
                {shifts.map((s) => (
                  <option key={s.id} value={s.id}>{s.name} ({s.startTime} - {s.endTime})</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Section 3: Salary & Bank Details */}
        <div className="p-3.5 bg-slate-50/75 rounded-xl border border-slate-200/80 space-y-3">
          <p className="font-semibold text-slate-900 border-b border-slate-200 pb-1">3. Salary Structure & Banking Credentials</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-slate-600 font-medium mb-1">Annual CTC (₹) *</label>
              <input
                type="number"
                value={baseSalaryAnnual}
                onChange={(e) => setBaseSalaryAnnual(Number(e.target.value))}
                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg font-mono"
                required
              />
            </div>
            <div>
              <label className="block text-slate-600 font-medium mb-1">Salary Structure</label>
              <select
                value={salaryStructureId}
                onChange={(e) => setSalaryStructureId(e.target.value)}
                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg"
              >
                {structures.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-slate-600 font-medium mb-1">PAN / Tax ID *</label>
              <input
                type="text"
                value={panNumber}
                onChange={(e) => setPanNumber(e.target.value)}
                placeholder="ABCDE1234F"
                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg font-mono uppercase"
                required
              />
            </div>
            <div>
              <label className="block text-slate-600 font-medium mb-1">Bank Name</label>
              <input
                type="text"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg"
                required
              />
            </div>
            <div>
              <label className="block text-slate-600 font-medium mb-1">Account Number *</label>
              <input
                type="text"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                placeholder="50100498761234"
                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg font-mono"
                required
              />
            </div>
            <div>
              <label className="block text-slate-600 font-medium mb-1">IFSC Code *</label>
              <input
                type="text"
                value={ifsc}
                onChange={(e) => setIfsc(e.target.value)}
                placeholder="HDFC0001234"
                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg font-mono uppercase"
                required
              />
            </div>
          </div>
        </div>

        {/* Section 4: Configurable Employee-Level Statutory & Tax Eligibility */}
        <div className="p-3.5 bg-indigo-50/40 rounded-xl border border-indigo-200/70 space-y-3">
          <div className="flex items-center justify-between border-b border-indigo-100 pb-1.5">
            <p className="font-semibold text-indigo-950 flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-indigo-600" />
              4. Statutory & Compliance Eligibility (Configurable per Employee)
            </p>
            <span className="text-[10px] font-medium text-indigo-700">Non-mandatory — overrides or inherits Org rules</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5 bg-white p-2.5 rounded-lg border border-slate-200">
              <label className="flex items-center gap-2 font-semibold text-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={epfApplicable}
                  onChange={(e) => setEpfApplicable(e.target.checked)}
                />
                <span>EPF (Provident Fund) Eligible</span>
              </label>
              {epfApplicable && (
                <>
                  <label className="flex items-center gap-2 text-[11px] text-slate-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={epfWageCeilingApplied}
                      onChange={(e) => setEpfWageCeilingApplied(e.target.checked)}
                    />
                    <span>Apply ₹15,000 Wage Ceiling</span>
                  </label>
                  <input
                    type="text"
                    value={pfUan}
                    onChange={(e) => setPfUan(e.target.value)}
                    placeholder="Optional UAN (12 digits)"
                    className="w-full px-2.5 py-1 bg-slate-50 border border-slate-200 rounded font-mono text-[11px]"
                  />
                </>
              )}
            </div>

            <div className="space-y-1.5 bg-white p-2.5 rounded-lg border border-slate-200">
              <label className="flex items-center gap-2 font-semibold text-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={esiApplicable}
                  onChange={(e) => setEsiApplicable(e.target.checked)}
                />
                <span>ESI Eligible (≤₹21k Gross)</span>
              </label>
              {esiApplicable && (
                <input
                  type="text"
                  value={esiNumber}
                  onChange={(e) => setEsiNumber(e.target.value)}
                  placeholder="Optional ESI IP Number"
                  className="w-full px-2.5 py-1 bg-slate-50 border border-slate-200 rounded font-mono text-[11px]"
                />
              )}
              <label className="flex items-center gap-2 font-semibold text-slate-800 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={ptApplicable}
                  onChange={(e) => setPtApplicable(e.target.checked)}
                />
                <span>Professional Tax (PT) Applicable</span>
              </label>
            </div>

            <div className="space-y-1.5 bg-white p-2.5 rounded-lg border border-slate-200">
              <label className="block text-slate-700 font-semibold text-[11px]">
                Exemption / Non-Applicability Reason
              </label>
              <input
                type="text"
                value={statutoryExemptionReason}
                onChange={(e) => setStatutoryExemptionReason(e.target.value)}
                placeholder="e.g. Consultant / Intern / Opted out"
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded text-[11px]"
              />
              <span className="text-[10px] text-slate-400 block">
                Displayed on payslip if PF/ESI/PT is disabled.
              </span>
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 shadow-2xs transition-colors flex items-center gap-1.5"
          >
            <Check className="h-4 w-4" />
            <span>Create & Onboard Employee</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
