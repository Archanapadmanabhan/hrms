import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { db } from '../../db/storage';
import { hrmsService } from '../../services/hrmsService';
import { useAuth } from '../../services/authContext';
import { AlertCircle, Check, Upload, Receipt } from 'lucide-react';

interface NewExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const NewExpenseModal: React.FC<NewExpenseModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { currentUser } = useAuth();
  const categories = db.getExpenseCategories().filter((c) => c.isActive !== false);

  const [categoryId, setCategoryId] = useState(categories[0]?.id || 'EXP-CAT-TRV');
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState<number | ''>('');
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);
  const [businessPurpose, setBusinessPurpose] = useState('');
  const [receiptFileName, setReceiptFileName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const selectedCategory = categories.find((c) => c.id === categoryId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim() || !amount || Number(amount) <= 0) {
      setError('Please provide a valid expense title and positive amount.');
      return;
    }

    if (selectedCategory?.requiresReceipt && !receiptFileName) {
      setError(`Receipt or bill invoice attachment is required for ${selectedCategory.name}.`);
      return;
    }

    const res = hrmsService.submitExpenseClaim(
      {
        employeeId: currentUser.employeeId,
        categoryId,
        title,
        amount: Number(amount),
        currency: 'INR',
        expenseDate,
        businessPurpose,
        receiptFileName: receiptFileName || undefined
      },
      currentUser.id,
      currentUser.name
    );

    if (!res.success) {
      setError(res.error || 'Failed to submit claim.');
      return;
    }

    onSuccess?.();
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Submit Expense Reimbursement Claim"
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

        {/* Category selector */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-slate-600 font-semibold">Expense Category *</label>
            {selectedCategory && (
              <span className="text-[11px] text-slate-500">
                Max Limit: <span className="font-bold font-mono">₹{selectedCategory.maxLimitPerClaim.toLocaleString()}</span>
              </span>
            )}
          </div>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-medium text-slate-800"
          >
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name} (Max: ₹{cat.maxLimitPerClaim.toLocaleString()})
              </option>
            ))}
          </select>
        </div>

        {/* Claim Title */}
        <div>
          <label className="block text-slate-600 font-medium mb-1">Claim Title / Item Description *</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Flight to Mumbai client on-site or Ergonomic keyboard"
            className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg"
            required
          />
        </div>

        {/* Amount & Date */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-slate-600 font-medium mb-1">Amount (₹ INR) *</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value === '' ? '' : Number(e.target.value))}
              placeholder="e.g. 4500"
              className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg font-mono"
              required
              min={1}
            />
          </div>
          <div>
            <label className="block text-slate-600 font-medium mb-1">Expense Date *</label>
            <input
              type="date"
              value={expenseDate}
              onChange={(e) => setExpenseDate(e.target.value)}
              className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg"
              required
            />
          </div>
        </div>

        {/* Business Purpose */}
        <div>
          <label className="block text-slate-600 font-medium mb-1">Business Purpose / Justification *</label>
          <textarea
            value={businessPurpose}
            onChange={(e) => setBusinessPurpose(e.target.value)}
            rows={2}
            placeholder="Explain how this relates to official company duties..."
            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg"
            required
          />
        </div>

        {/* Receipt Attachment */}
        <div>
          <label className="block text-slate-600 font-medium mb-1">
            Receipt / Tax Invoice {selectedCategory?.requiresReceipt && '* (Mandatory)'}
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={receiptFileName}
              onChange={(e) => setReceiptFileName(e.target.value)}
              placeholder="e.g. uber_receipt_invoice.pdf"
              className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg"
            />
            <button
              type="button"
              onClick={() => setReceiptFileName(`receipt_${Date.now().toString().slice(-4)}.pdf`)}
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
            <span>Submit Claim</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
