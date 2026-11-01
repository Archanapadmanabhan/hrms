import React, { useState } from 'react';
import { CreditCard, Wallet, Plus, CheckCircle2, Clock, ArrowLeftRight } from 'lucide-react';
import { useAuth } from '../../services/authContext';
import { db } from '../../db/storage';

type RequestType = 'Salary Advance' | 'Travel Petty Cash';
type RequestStatus = 'Pending Approval' | 'Approved' | 'Rejected' | 'Disbursed' | 'Settlement Pending' | 'Settled';

interface AdvanceRecord {
  id: string;
  employeeId: string;
  type: RequestType;
  amount: number;
  purpose: string;
  date: string;
  status: RequestStatus;
  approvedAmount?: number;
  recoveredAmount?: number;
  paymentReference?: string;
  actualExpense?: number;
  settlementNote?: string;
}

const KEY = 'orbyx_hrms_advance_petty_cash_v1';
const field = 'w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100';

const seedAdvances: AdvanceRecord[] = [
  {
    id: 'ADV-2026-101',
    employeeId: 'EMP-003',
    type: 'Salary Advance',
    amount: 20000,
    approvedAmount: 20000,
    recoveredAmount: 5000,
    purpose: 'Emergency family medical expense — requested 4-month payroll recovery',
    date: '2026-10-05',
    status: 'Disbursed',
    paymentReference: 'UTR-HDFC-449102'
  },
  {
    id: 'ADV-2026-102',
    employeeId: 'EMP-004',
    type: 'Travel Petty Cash',
    amount: 15000,
    approvedAmount: 15000,
    purpose: 'Onsite client deployment visit to Mumbai (3 days hotel & local transit)',
    date: '2026-10-12',
    status: 'Disbursed',
    paymentReference: 'UTR-ICICI-882319'
  },
  {
    id: 'ADV-2026-103',
    employeeId: 'EMP-005',
    type: 'Salary Advance',
    amount: 12000,
    purpose: 'Festival advance request for November',
    date: '2026-10-20',
    status: 'Pending Approval'
  }
];

const read = (): AdvanceRecord[] => {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) {
      localStorage.setItem(KEY, JSON.stringify(seedAdvances));
      return seedAdvances;
    }
    const parsed = JSON.parse(raw) as AdvanceRecord[];
    if (parsed.length === 0) {
      localStorage.setItem(KEY, JSON.stringify(seedAdvances));
      return seedAdvances;
    }
    return parsed;
  } catch {
    return seedAdvances;
  }
};

export const AdvancePettyCash: React.FC = () => {
  const { currentUser } = useAuth();
  const [records, setRecords] = useState<AdvanceRecord[]>(read);
  const [showForm, setShowForm] = useState(false);
  const [type, setType] = useState<RequestType>('Salary Advance');
  const [amount, setAmount] = useState('');
  const [purpose, setPurpose] = useState('');
  const [settleRecord, setSettleRecord] = useState<AdvanceRecord | null>(null);
  const [actual, setActual] = useState('');
  const [note, setNote] = useState('');
  const [disbursingId, setDisbursingId] = useState<string | null>(null);
  const [disburseRefInput, setDisburseRefInput] = useState('');
  const [message, setMessage] = useState('');

  const isHR = currentUser.role === 'hr_admin';
  const canApprove = isHR || currentUser.role === 'senior_manager';

  const save = (next: AdvanceRecord[]) => {
    setRecords(next);
    localStorage.setItem(KEY, JSON.stringify(next));
  };

  const mine = records.filter((r) => r.employeeId === currentUser.employeeId);
  const visible = isHR || currentUser.role === 'senior_manager' ? records : mine;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const n = Number(amount);
    if (!Number.isFinite(n) || n <= 0 || !purpose.trim()) return;
    const newRec: AdvanceRecord = {
      id: `ADV-${Date.now()}`,
      employeeId: currentUser.employeeId,
      type,
      amount: n,
      purpose: purpose.trim(),
      date: new Date().toISOString().slice(0, 10),
      status: 'Pending Approval'
    };
    save([newRec, ...records]);
    db.logAudit({
      actorUserId: currentUser.id,
      actorName: currentUser.name,
      actorRole: currentUser.role,
      action: 'CREATE',
      module: 'EXPENSE',
      entityId: newRec.id,
      entityName: newRec.type,
      description: `Submitted ${newRec.type} request for ₹${n.toLocaleString('en-IN')}`
    });
    setAmount('');
    setPurpose('');
    setShowForm(false);
    setMessage('Request submitted for approval.');
  };

  const update = (id: string, patch: Partial<AdvanceRecord>) =>
    save(records.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  const submitSettlement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!settleRecord) return;
    const n = Number(actual);
    if (!Number.isFinite(n) || n < 0) return;
    update(settleRecord.id, {
      actualExpense: n,
      settlementNote: note,
      status: 'Settlement Pending'
    });
    setSettleRecord(null);
    setActual('');
    setNote('');
    setMessage('Settlement submitted for review.');
  };

  const confirmDisbursement = (id: string) => {
    if (!disburseRefInput.trim()) return;
    update(id, { status: 'Disbursed', paymentReference: disburseRefInput.trim() });
    db.logAudit({
      actorUserId: currentUser.id,
      actorName: currentUser.name,
      actorRole: currentUser.role,
      action: 'REIMBURSE',
      module: 'EXPENSE',
      entityId: id,
      entityName: id,
      description: `Disbursed advance via Ref #${disburseRefInput.trim()}`
    });
    setDisbursingId(null);
    setDisburseRefInput('');
    setMessage('Advance disbursement recorded.');
  };

  const totals = {
    requested: visible
      .filter((r) => r.status === 'Pending Approval')
      .reduce((s, r) => s + r.amount, 0),
    outstanding: visible
      .filter((r) => r.status === 'Disbursed' || r.status === 'Settlement Pending')
      .reduce((s, r) => s + Math.max(0, (r.approvedAmount ?? r.amount) - (r.recoveredAmount ?? 0)), 0)
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Salary Advances & Travel Petty Cash</h2>
          <p className="mt-1 text-sm text-slate-500">
            Track requests, approvals, disbursements and travel settlements as separate financial events.
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white"
        >
          <Plus size={16} />
          New request
        </button>
      </div>

      {message && (
        <div className="rounded-lg bg-indigo-50 px-3 py-2 text-sm text-indigo-800">
          {message}
          <button onClick={() => setMessage('')} className="ml-3 font-bold">
            Dismiss
          </button>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        <Summary icon={Clock} title="Pending approval" value={`₹${totals.requested.toLocaleString('en-IN')}`} />
        <Summary icon={Wallet} title="Outstanding advances" value={`₹${totals.outstanding.toLocaleString('en-IN')}`} />
        <Summary icon={CreditCard} title="Total requests" value={String(visible.length)} />
      </div>

      {showForm && (
        <form onSubmit={submit} className="rounded-xl border border-indigo-100 bg-white p-4">
          <h3 className="mb-3 font-bold text-slate-900">Create financial request</h3>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="text-xs font-semibold text-slate-600">
              Request type
              <select
                className={`${field} mt-1`}
                value={type}
                onChange={(e) => setType(e.target.value as RequestType)}
              >
                <option>Salary Advance</option>
                <option>Travel Petty Cash</option>
              </select>
            </label>
            <label className="text-xs font-semibold text-slate-600">
              Requested amount (₹)
              <input
                required
                type="number"
                min="1"
                step="0.01"
                className={`${field} mt-1`}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </label>
            <label className="text-xs font-semibold text-slate-600 md:col-span-2">
              Purpose / reason
              <textarea
                required
                rows={2}
                className={`${field} mt-1`}
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                placeholder={
                  type === 'Travel Petty Cash'
                    ? 'Destination, travel dates and business purpose'
                    : 'Reason for salary advance & repayment schedule'
                }
              />
            </label>
          </div>
          <p className="mt-3 rounded-lg bg-amber-50 p-3 text-xs text-amber-800">
            Submitting a request does not disburse money or trigger a payroll deduction. Approval and payment are recorded separately.
          </p>
          <div className="mt-3 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-lg border px-4 py-2 text-sm"
            >
              Cancel
            </button>
            <button className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white">
              Submit request
            </button>
          </div>
        </form>
      )}

      {settleRecord && (
        <form onSubmit={submitSettlement} className="rounded-xl border border-indigo-100 bg-white p-4">
          <h3 className="font-bold text-slate-900">Settle travel petty cash</h3>
          <p className="my-2 text-sm text-slate-500">
            Advance disbursed: ₹{(settleRecord.approvedAmount ?? settleRecord.amount).toLocaleString('en-IN')}
          </p>
          <label className="block text-xs font-semibold text-slate-600">
            Actual eligible expenses (₹)
            <input
              required
              type="number"
              min="0"
              step="0.01"
              className={`${field} mt-1`}
              value={actual}
              onChange={(e) => setActual(e.target.value)}
            />
          </label>
          <label className="mt-3 block text-xs font-semibold text-slate-600">
            Receipt references / settlement note
            <textarea
              className={`${field} mt-1`}
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Record receipt names or refund details"
            />
          </label>
          {actual !== '' && (
            <p className="mt-2 rounded-lg bg-slate-50 p-3 text-sm">
              Settlement difference:{' '}
              <strong>
                {Number(actual) - (settleRecord.approvedAmount ?? settleRecord.amount) >= 0
                  ? `₹${(Number(actual) - (settleRecord.approvedAmount ?? settleRecord.amount)).toLocaleString('en-IN')} potentially payable to employee`
                  : `₹${Math.abs(Number(actual) - (settleRecord.approvedAmount ?? settleRecord.amount)).toLocaleString('en-IN')} recoverable from employee`}
              </strong>
            </p>
          )}
          <div className="mt-3 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setSettleRecord(null)}
              className="rounded-lg border px-4 py-2 text-sm"
            >
              Cancel
            </button>
            <button className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white">
              Submit settlement
            </button>
          </div>
        </form>
      )}

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead>
            <tr className="border-b bg-slate-50 text-xs uppercase text-slate-500">
              <th className="p-3">Request</th>
              <th className="p-3">Employee</th>
              <th className="p-3">Requested / Balance</th>
              <th className="p-3">Settlement</th>
              <th className="p-3">Status</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((r) => {
              const emp = db.getEmployeeById(r.employeeId);
              const diff =
                r.actualExpense === undefined
                  ? undefined
                  : r.actualExpense - (r.approvedAmount ?? r.amount);
              const isOwnRequest = r.employeeId === currentUser.employeeId;

              return (
                <tr key={r.id} className="border-b last:border-0">
                  <td className="p-3">
                    <p className="font-semibold text-slate-900">{r.type}</p>
                    <p className="text-xs text-slate-400">
                      {r.id} · {r.date}
                    </p>
                    <p className="mt-1 max-w-xs text-xs text-slate-500">{r.purpose}</p>
                  </td>
                  <td className="p-3">{emp ? `${emp.firstName} ${emp.lastName}` : r.employeeId}</td>
                  <td className="p-3">
                    <p className="font-semibold">₹{r.amount.toLocaleString('en-IN')}</p>
                    {r.recoveredAmount ? (
                      <p className="text-xs text-emerald-700">
                        Recovered: ₹{r.recoveredAmount.toLocaleString('en-IN')} · Bal: ₹
                        {Math.max(0, (r.approvedAmount ?? r.amount) - r.recoveredAmount).toLocaleString('en-IN')}
                      </p>
                    ) : null}
                  </td>
                  <td className="p-3">
                    {diff === undefined
                      ? '—'
                      : diff === 0
                      ? 'Balanced'
                      : diff > 0
                      ? `₹${diff.toLocaleString('en-IN')} payable`
                      : `₹${Math.abs(diff).toLocaleString('en-IN')} recoverable`}
                  </td>
                  <td className="p-3">
                    <span
                      className={`rounded-full px-2 py-1 text-[11px] font-semibold ${
                        r.status === 'Settled' || r.status === 'Disbursed'
                          ? 'bg-emerald-50 text-emerald-700'
                          : r.status === 'Rejected'
                          ? 'bg-rose-50 text-rose-700'
                          : 'bg-amber-50 text-amber-800'
                      }`}
                    >
                      {r.status}
                    </span>
                  </td>
                  <td className="p-3">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {canApprove && !isOwnRequest && r.status === 'Pending Approval' && (
                        <>
                          <button
                            onClick={() => {
                              update(r.id, { status: 'Approved', approvedAmount: r.amount });
                              setMessage('Request approved. Disbursement remains a separate action.');
                            }}
                            className="rounded bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => update(r.id, { status: 'Rejected' })}
                            className="rounded bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-700"
                          >
                            Reject
                          </button>
                        </>
                      )}

                      {isHR && r.status === 'Approved' && (
                        disbursingId === r.id ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="text"
                              value={disburseRefInput}
                              onChange={(e) => setDisburseRefInput(e.target.value)}
                              placeholder="UTR / Ref #"
                              className="w-28 rounded border border-slate-300 px-2 py-1 text-xs font-mono"
                            />
                            <button
                              onClick={() => confirmDisbursement(r.id)}
                              className="rounded bg-indigo-600 px-2 py-1 text-xs font-semibold text-white"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setDisbursingId(null)}
                              className="rounded border px-1.5 py-1 text-xs text-slate-600"
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              setDisbursingId(r.id);
                              setDisburseRefInput(`UTR-${Date.now().toString().slice(-6)}`);
                            }}
                            className="rounded bg-indigo-50 px-2 py-1 text-xs font-semibold text-indigo-700"
                          >
                            Record disbursement
                          </button>
                        )
                      )}

                      {r.type === 'Travel Petty Cash' &&
                        r.status === 'Disbursed' &&
                        r.employeeId === currentUser.employeeId && (
                          <button
                            onClick={() => {
                              setSettleRecord(r);
                              setActual('');
                              setNote('');
                            }}
                            className="rounded bg-indigo-50 px-2 py-1 text-xs font-semibold text-indigo-700"
                          >
                            Settle
                          </button>
                        )}

                      {isHR && r.status === 'Settlement Pending' && (
                        <button
                          onClick={() => {
                            update(r.id, { status: 'Settled' });
                            setMessage(
                              'Settlement marked reviewed. Ensure any refund or additional reimbursement is separately recorded.'
                            );
                          }}
                          className="rounded bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700"
                        >
                          <CheckCircle2 size={12} className="mr-1 inline" />
                          Review & close
                        </button>
                      )}

                      {r.paymentReference && (
                        <span className="self-center text-[10px] font-mono text-slate-400">
                          Ref: {r.paymentReference}
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {visible.length === 0 && (
              <tr>
                <td colSpan={6} className="p-10 text-center text-sm text-slate-500">
                  No advance or petty cash requests yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-slate-400">
        <ArrowLeftRight size={12} className="mr-1 inline" />
        Disbursed salary advances automatically flow into payroll calculation previews up to the outstanding balance.
      </p>
    </div>
  );
};

const Summary: React.FC<{ icon: React.ElementType; title: string; value: string }> = ({
  icon: Icon,
  title,
  value
}) => (
  <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4">
    <div className="rounded-lg bg-indigo-50 p-2.5 text-indigo-700">
      <Icon size={18} />
    </div>
    <div>
      <p className="text-xs text-slate-500">{title}</p>
      <p className="text-lg font-bold text-slate-900">{value}</p>
    </div>
  </div>
);
