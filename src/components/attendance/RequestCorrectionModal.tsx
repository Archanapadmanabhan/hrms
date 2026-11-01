import React, { useState, useMemo, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { hrmsService } from '../../services/hrmsService';
import { useAuth } from '../../services/authContext';
import { db } from '../../db/storage';
import { AlertCircle, Check, AlertTriangle, Building2, Mail } from 'lucide-react';

interface RequestCorrectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  defaultEntryType?: 'Manual Entry' | 'Correction';
}

export const RequestCorrectionModal: React.FC<RequestCorrectionModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  defaultEntryType = 'Correction'
}) => {
  const { currentUser } = useAuth();
  const isHROrManager =
    currentUser.role === 'hr_admin' ||
    currentUser.role === 'senior_manager' ||
    currentUser.role === 'reporting_manager';

  const employees = db.getEmployees();
  const shifts = db.getShifts();
  const deployments = useMemo(() => hrmsService.getClientDeploymentsFromStorage(), [isOpen]);
  const clients = useMemo(() => hrmsService.getClientsFromStorage(), [isOpen]);

  const [entryType, setEntryType] = useState<'Manual Entry' | 'Correction'>(defaultEntryType);
  const [targetEmployeeId, setTargetEmployeeId] = useState(currentUser.employeeId);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [assignmentId, setAssignmentId] = useState<string>('');
  const [shiftId, setShiftId] = useState('SHIFT-GEN');
  const [exceptionType, setExceptionType] = useState<
    | 'Machine Failure'
    | 'Server Downtime'
    | 'Application Unavailable'
    | 'Missed Punch'
    | 'Timestamp Error'
    | 'Client Site Exception'
    | 'Authorized Exception'
  >(defaultEntryType === 'Manual Entry' ? 'Machine Failure' : 'Missed Punch');
  const [outageIncidentRef, setOutageIncidentRef] = useState('');
  const [requestedCheckIn, setRequestedCheckIn] = useState('09:30');
  const [requestedCheckOut, setRequestedCheckOut] = useState('18:30');
  const [breakDurationMinutes, setBreakDurationMinutes] = useState(60);
  const [requestedOutcome, setRequestedOutcome] = useState<
    'Present' | 'Late' | 'Half Day' | 'Absent' | 'On Leave'
  >('Present');
  const [supportingEvidence, setSupportingEvidence] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  const todayEntryDate = new Date().toISOString().split('T')[0];

  // Auto-detect eligible client deployment for (targetEmployeeId, date)
  const employeeDeployments = useMemo(() => {
    return deployments.filter(
      (d) =>
        d.employeeId === targetEmployeeId &&
        d.status !== 'Cancelled' &&
        d.startDate <= date &&
        (!d.actualEndDate || date <= d.actualEndDate)
    );
  }, [deployments, targetEmployeeId, date]);

  useEffect(() => {
    if (isOpen) {
      setEntryType(defaultEntryType);
      setTargetEmployeeId(currentUser.employeeId);
      setExceptionType(defaultEntryType === 'Manual Entry' ? 'Machine Failure' : 'Missed Punch');
      setError(null);
    }
  }, [isOpen, defaultEntryType, currentUser.employeeId]);

  useEffect(() => {
    if (employeeDeployments.length > 0) {
      setAssignmentId(employeeDeployments[0].id);
      if (employeeDeployments[0].shiftId) {
        setShiftId(employeeDeployments[0].shiftId);
      }
    } else {
      setAssignmentId('');
    }
  }, [employeeDeployments]);

  const selectedDeployment = useMemo(
    () => deployments.find((d) => d.id === assignmentId),
    [deployments, assignmentId]
  );

  const selectedClient = useMemo(
    () => (selectedDeployment ? clients.find((c) => c.id === selectedDeployment.clientId) : undefined),
    [clients, selectedDeployment]
  );

  // Check if an attendance record already exists for the selected employee and date
  const existingRecord = useMemo(() => {
    return db
      .getAttendanceRecords()
      .find((r) => r.employeeId === targetEmployeeId && r.date === date);
  }, [targetEmployeeId, date, isOpen]);

  const calculatedHours = useMemo(() => {
    const [inH, inM] = (requestedCheckIn || '09:30').split(':').map(Number);
    const [outH, outM] = (requestedCheckOut || '18:30').split(':').map(Number);
    let rawMins = outH * 60 + outM - (inH * 60 + inM);
    if (rawMins < 0) rawMins += 24 * 60;
    const workedMins = Math.max(0, rawMins - (Number(breakDurationMinutes) || 0));
    return Number((workedMins / 60).toFixed(2));
  }, [requestedCheckIn, requestedCheckOut, breakDurationMinutes]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError('A mandatory reason explaining the failure, exception, or timestamp correction is required.');
      return;
    }
    if (calculatedHours <= 0) {
      setError('Calculated worked hours must be greater than 0.');
      return;
    }

    hrmsService.submitAttendanceCorrection(
      {
        employeeId: targetEmployeeId,
        date,
        entryType,
        exceptionType,
        outageIncidentRef: outageIncidentRef.trim() || undefined,
        assignmentId: assignmentId || undefined,
        clientId: selectedDeployment?.clientId,
        shiftId,
        requestedCheckIn,
        requestedCheckOut,
        breakDurationMinutes: Number(breakDurationMinutes) || 0,
        requestedOutcome,
        supportingEvidence,
        reason
      },
      currentUser.id,
      currentUser.name
    );

    setReason('');
    setSupportingEvidence('');
    setOutageIncidentRef('');
    setError(null);
    onSuccess?.();
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        entryType === 'Manual Entry'
          ? 'Scenario C: Manual Attendance Entry (Machine / Server Outage)'
          : 'Scenario A: Request Attendance Correction (Missed Check-In / Check-Out)'
      }
      description={`Submitted by ${currentUser.name} (${currentUser.employeeId}) · Entry Date: ${todayEntryDate} · Subject to 2-Stage Verification & Approval`}
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Mode Toggle: Manual Attendance Entry vs Attendance Correction */}
        <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-lg">
          <button
            type="button"
            onClick={() => {
              setEntryType('Manual Entry');
              setExceptionType('Machine Failure');
            }}
            className={`py-1.5 rounded-md font-semibold transition-colors ${
              entryType === 'Manual Entry'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Scenario C: Outage / Manual Entry
          </button>
          <button
            type="button"
            onClick={() => {
              setEntryType('Correction');
              setExceptionType('Missed Punch');
            }}
            className={`py-1.5 rounded-md font-semibold transition-colors ${
              entryType === 'Correction'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Scenario A: Forgot Check-In / Check-Out
          </button>
        </div>

        {/* Employee, Actual Attendance Date, and Separate Entry Date */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-slate-600 font-semibold mb-1">Employee *</label>
            <select
              disabled={!isHROrManager}
              value={targetEmployeeId}
              onChange={(e) => setTargetEmployeeId(e.target.value)}
              className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg disabled:bg-slate-50"
            >
              {employees
                .filter((e) => isHROrManager || e.id === currentUser.employeeId)
                .map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.firstName} {e.lastName} ({e.id})
                  </option>
                ))}
            </select>
          </div>
          <div>
            <label className="block text-slate-600 font-semibold mb-1">
              Actual Attendance Date *
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg font-mono"
              required
            />
          </div>
          <div>
            <label className="block text-slate-600 font-semibold mb-1">
              Entry Date (Recorded On)
            </label>
            <input
              type="date"
              value={todayEntryDate}
              disabled
              className="w-full px-3 py-1.5 bg-slate-100 border border-slate-200 rounded-lg font-mono text-slate-600"
            />
          </div>
        </div>

        {/* Client Deployment Selection & External Email Verification Notice */}
        <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-xl space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label className="font-semibold text-indigo-950 flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5 text-indigo-600" />
              <span>Work Location / Client Deployment on {date}</span>
            </label>
            <select
              value={assignmentId}
              onChange={(e) => setAssignmentId(e.target.value)}
              className="px-2.5 py-1 bg-white border border-indigo-200 rounded-lg text-xs font-medium text-slate-800"
            >
              <option value="">Internal Company Office (No Client Deployment)</option>
              {employeeDeployments.map((d) => {
                const cli = clients.find((c) => c.id === d.clientId);
                return (
                  <option key={d.id} value={d.id}>
                    {d.id}: {cli?.name || d.clientId} — {d.project} ({d.status})
                  </option>
                );
              })}
            </select>
          </div>

          {selectedDeployment && (
            <div className="text-[11px] text-indigo-900 bg-white/90 p-2.5 rounded-lg border border-indigo-100 space-y-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span>
                  Client Supervisor:{' '}
                  <strong>
                    {selectedDeployment.clientSupervisorName || selectedClient?.contactName || 'Client Supervisor'}
                  </strong>{' '}
                  ({selectedDeployment.clientSupervisorEmail || selectedClient?.email || 'External Email'})
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 font-semibold text-[10px]">
                  <Mail className="h-3 w-3" /> Requires External Client Email Verification
                </span>
              </div>
              <p className="text-[10px] text-slate-600">
                Client supervisors do not log in to Orbyx HRMS. Upon submission, this record will be marked{' '}
                <strong>Pending Client Email Verification (Stage 1)</strong> and{' '}
                <strong>Pending Company Approval (Stage 2)</strong>.
              </p>
            </div>
          )}
        </div>

        {/* Conflict / Existing Record Preservation Notice */}
        {existingRecord && (
          <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">
                Conflict Detection: Existing Attendance Record on {date} ({existingRecord.source})
              </p>
              <p className="text-[11px] text-amber-800 mt-0.5">
                Original values — In:{' '}
                <span className="font-mono font-bold">{existingRecord.checkInTime || '--:--'}</span> | Out:{' '}
                <span className="font-mono font-bold">{existingRecord.checkOutTime || '--:--'}</span> (
                {existingRecord.totalHoursWorked}h, {existingRecord.status}) — will be preserved in{' '}
                <code className="font-mono">originalCheckIn / originalCheckOut</code> for audit history without creating duplicate records.
              </p>
            </div>
          </div>
        )}

        {/* Applicable Shift & Failure/Exception Type */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-slate-600 font-semibold mb-1">Applicable Shift *</label>
            <select
              value={shiftId}
              onChange={(e) => {
                const selected = shifts.find((s) => s.id === e.target.value);
                setShiftId(e.target.value);
                if (selected) {
                  setRequestedCheckIn(selected.startTime);
                  setRequestedCheckOut(selected.endTime);
                  setBreakDurationMinutes(selected.breakDurationMinutes);
                }
              }}
              className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg"
            >
              {shifts.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.startTime} - {s.endTime})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-slate-600 font-semibold mb-1">Failure / Exception Type *</label>
            <select
              value={exceptionType}
              onChange={(e) => setExceptionType(e.target.value as any)}
              className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg"
            >
              <option value="Machine Failure">Attendance machine failure</option>
              <option value="Server Downtime">Server downtime</option>
              <option value="Application Unavailable">Application unavailable</option>
              <option value="Missed Punch">Missed Check-In or Check-Out (Forgot Punch)</option>
              <option value="Timestamp Error">Incorrect Recorded Timestamp</option>
              <option value="Client Site Exception">Client-Site / Field Deployment Exception</option>
              <option value="Authorized Exception">Other authorized exception</option>
            </select>
          </div>
        </div>

        {/* Check-In, Check-Out, Break, and Auto-Calculated Worked Hours */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
          <div>
            <label className="block text-slate-600 font-semibold mb-1">Actual Check-In *</label>
            <input
              type="time"
              value={requestedCheckIn}
              onChange={(e) => setRequestedCheckIn(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg font-mono"
              required
            />
          </div>
          <div>
            <label className="block text-slate-600 font-semibold mb-1">Actual Check-Out *</label>
            <input
              type="time"
              value={requestedCheckOut}
              onChange={(e) => setRequestedCheckOut(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg font-mono"
              required
            />
          </div>
          <div>
            <label className="block text-slate-600 font-semibold mb-1">Break (mins)</label>
            <input
              type="number"
              min="0"
              max="240"
              value={breakDurationMinutes}
              onChange={(e) => setBreakDurationMinutes(Number(e.target.value))}
              className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg font-mono"
            />
          </div>
          <div>
            <label className="block text-slate-600 font-semibold mb-1">Net Worked Hours</label>
            <div className="px-2.5 py-1.5 bg-indigo-50 border border-indigo-200 text-indigo-800 rounded-lg font-mono font-bold">
              {calculatedHours} hrs
            </div>
          </div>
        </div>

        {/* Attendance Outcome, Outage Incident Ref, & Supporting Evidence */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-slate-600 font-semibold mb-1">Attendance Outcome *</label>
            <select
              value={requestedOutcome}
              onChange={(e) => setRequestedOutcome(e.target.value as any)}
              className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg"
            >
              <option value="Present">Present (Full Day)</option>
              <option value="Late">Late Arrival</option>
              <option value="Half Day">Half Day</option>
            </select>
          </div>
          <div>
            <label className="block text-slate-600 font-semibold mb-1">
              Outage / Incident Ref {entryType === 'Manual Entry' ? '*' : '(Optional)'}
            </label>
            <input
              type="text"
              required={entryType === 'Manual Entry'}
              value={outageIncidentRef}
              onChange={(e) => setOutageIncidentRef(e.target.value)}
              placeholder="e.g. INC-2026-412 / SRV-DOWN-08"
              className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg font-mono"
            />
          </div>
          <div>
            <label className="block text-slate-600 font-semibold mb-1">
              Supporting Evidence / Log Ref
            </label>
            <input
              type="text"
              value={supportingEvidence}
              onChange={(e) => setSupportingEvidence(e.target.value)}
              placeholder="e.g. Gate Register #88 or VPN Log"
              className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg"
            />
          </div>
        </div>

        <div>
          <label className="block text-slate-600 font-semibold mb-1">
            Mandatory Reason / Audit Justification *
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
            placeholder="Explain why manual attendance entry or correction is required (e.g., Biometric reader offline at 09:30 AM, or forgot to check out after client UAT call)..."
            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg"
            required
          />
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-2xs transition-colors flex items-center gap-1.5"
          >
            <Check className="h-4 w-4" />
            <span>
              {entryType === 'Manual Entry'
                ? 'Submit Outage Manual Entry'
                : 'Submit Correction Request'}
            </span>
          </button>
        </div>
      </form>
    </Modal>
  );
};

