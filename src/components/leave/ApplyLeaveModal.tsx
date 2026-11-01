import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { db } from '../../db/storage';
import { hrmsService } from '../../services/hrmsService';
import { useAuth } from '../../services/authContext';
import { AlertCircle, Calendar, Check, Upload } from 'lucide-react';

interface ApplyLeaveModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const ApplyLeaveModal: React.FC<ApplyLeaveModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { currentUser } = useAuth();
  const leaveTypes = db.getLeaveTypes().filter((lt) => lt.isActive !== false);

  const [leaveTypeId, setLeaveTypeId] = useState(leaveTypes[0]?.id || 'LT-AL');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [isHalfDay, setIsHalfDay] = useState(false);
  const [halfDayPeriod, setHalfDayPeriod] = useState<'First Half' | 'Second Half'>('First Half');
  const [reason, setReason] = useState('');
  const [attachmentName, setAttachmentName] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Live calculation of working days & balance
  const [calculatedDays, setCalculatedDays] = useState(1);
  const selectedType = leaveTypes.find((lt) => lt.id === leaveTypeId);
  const currentBalance = hrmsService.getLeaveBalance(currentUser.employeeId, leaveTypeId);

  useEffect(() => {
    const days = hrmsService.calculateWorkingDays(startDate, endDate, isHalfDay);
    setCalculatedDays(days);
  }, [startDate, endDate, isHalfDay]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!reason.trim()) {
      setError('Please provide a reason for the leave application.');
      return;
    }

    if (selectedType?.requiresDocumentProof && !attachmentName) {
      setError(`Proof of document or medical certificate is required for ${selectedType.name}.`);
      return;
    }

    const res = hrmsService.applyLeave(
      {
        employeeId: currentUser.employeeId,
        leaveTypeId,
        startDate,
        endDate,
        isHalfDay,
        halfDayPeriod: isHalfDay ? halfDayPeriod : undefined,
        reason,
        attachmentName: attachmentName || undefined
      },
      currentUser.id,
      currentUser.name
    );

    if (!res.success) {
      setError(res.error || 'Failed to submit leave application.');
      return;
    }

    onSuccess?.();
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Apply for Leave / Absence"
      description={`Submitting as ${currentUser.name} (ID: ${currentUser.employeeId})`}
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Leave Type and Live Balance display */}
        <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
          <div className="flex items-center justify-between mb-2">
            <label className="text-slate-700 font-semibold">Select Leave Category *</label>
            <span className="text-[11px] text-slate-500">
              Available Balance:{' '}
              <span className="font-bold text-indigo-700 font-mono">
                {selectedType?.isPaid ? `${currentBalance.remaining} days` : 'Uncapped / Loss of Pay'}
              </span>
            </span>
          </div>

          <select
            value={leaveTypeId}
            onChange={(e) => setLeaveTypeId(e.target.value)}
            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-medium text-slate-800"
          >
            {leaveTypes.map((lt) => (
              <option key={lt.id} value={lt.id}>
                {lt.name} ({lt.isPaid ? 'Paid' : 'Unpaid'}) - {lt.description}
              </option>
            ))}
          </select>
        </div>

        {/* Date pickers */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-slate-600 font-medium mb-1">Start Date *</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                if (e.target.value > endDate) setEndDate(e.target.value);
              }}
              className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg"
              required
            />
          </div>
          <div>
            <label className="block text-slate-600 font-medium mb-1">End Date *</label>
            <input
              type="date"
              value={endDate}
              min={startDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg"
              required
            />
          </div>
        </div>

        {/* Half day toggle */}
        {selectedType?.allowsHalfDay && (
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isHalfDay}
                onChange={(e) => setIsHalfDay(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-indigo-600"
              />
              <span className="font-medium text-slate-700">Apply for Half Day</span>
            </label>

            {isHalfDay && (
              <select
                value={halfDayPeriod}
                onChange={(e) => setHalfDayPeriod(e.target.value as any)}
                className="px-2.5 py-1 bg-white border border-slate-200 rounded text-xs text-slate-700"
              >
                <option value="First Half">First Half (Morning)</option>
                <option value="Second Half">Second Half (Afternoon)</option>
              </select>
            )}
          </div>
        )}

        {/* Working Days Calculation Preview */}
        <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-lg flex items-center justify-between text-indigo-950">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-indigo-600" />
            <span>Effective Working Days (excludes weekends & company holidays):</span>
          </div>
          <span className="text-sm font-bold font-mono">{calculatedDays} day{calculatedDays !== 1 ? 's' : ''}</span>
        </div>

        {/* Reason */}
        <div>
          <label className="block text-slate-600 font-medium mb-1">Reason for Absence *</label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
            placeholder="Please specify context (e.g. personal appointment, sick rest, family event)..."
            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg"
            required
          />
        </div>

        {/* Attachment */}
        <div>
          <label className="block text-slate-600 font-medium mb-1">
            Supporting Document / Prescription {selectedType?.requiresDocumentProof && '* (Mandatory)'}
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={attachmentName}
              onChange={(e) => setAttachmentName(e.target.value)}
              placeholder="e.g. doctor_prescription_oct26.pdf"
              className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg"
            />
            <button
              type="button"
              onClick={() => setAttachmentName(`doc_${Date.now().toString().slice(-4)}.pdf`)}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium"
            >
              Attach Sample
            </button>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 shadow-2xs transition-colors flex items-center gap-1.5"
          >
            <Check className="h-4 w-4" />
            <span>Submit Application</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
