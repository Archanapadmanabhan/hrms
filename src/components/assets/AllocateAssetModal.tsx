import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { db } from '../../db/storage';
import { hrmsService } from '../../services/hrmsService';
import { useAuth } from '../../services/authContext';
import { Asset, AllocationCondition } from '../../types/hrms';
import { AlertCircle, Check } from 'lucide-react';

interface AllocateAssetModalProps {
  asset: Asset | null;
  isOpen: boolean;
  onClose: () => void;
  onAllocated?: () => void;
}

export const AllocateAssetModal: React.FC<AllocateAssetModalProps> = ({
  asset,
  isOpen,
  onClose,
  onAllocated
}) => {
  const { currentUser } = useAuth();
  const employees = db.getEmployees().filter((e) => e.status === 'Active' || e.status === 'Probation');

  const [employeeId, setEmployeeId] = useState(employees[0]?.id || 'EMP-001');
  const [condition, setCondition] = useState<AllocationCondition>('Good');
  const [error, setError] = useState<string | null>(null);

  if (!asset) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const res = hrmsService.allocateAsset(
      asset.id,
      employeeId,
      condition,
      currentUser.id,
      currentUser.name
    );

    if (!res.success) {
      setError(res.error || 'Failed to allocate asset.');
      return;
    }

    onAllocated?.();
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Allocate Asset to Employee"
      description={`${asset.name} · Tag: ${asset.assetTag}`}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
          <p className="font-semibold text-slate-800">{asset.name}</p>
          <p className="text-slate-500 text-[11px] mt-0.5">
            SN: <span className="font-mono text-slate-700">{asset.serialNumber}</span> · Category: {asset.category}
          </p>
        </div>

        <div>
          <label className="block text-slate-600 font-medium mb-1">Select Employee Recipient *</label>
          <select
            value={employeeId}
            onChange={(e) => setEmployeeId(e.target.value)}
            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-medium text-slate-800"
          >
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.firstName} {emp.lastName} ({emp.id}) · {emp.email}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-slate-600 font-medium mb-1">Dispatch Physical Condition *</label>
          <select
            value={condition}
            onChange={(e) => setCondition(e.target.value as any)}
            className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg"
          >
            <option value="Brand New">Brand New (Sealed/Unopened)</option>
            <option value="Good">Good (Working fine, clean)</option>
            <option value="Fair">Fair (Operational, minor cosmetic wear)</option>
            <option value="Minor Scratches">Minor Scratches</option>
          </select>
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
            <span>Confirm Allocation</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
