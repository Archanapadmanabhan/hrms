import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { PhotoCaptureField } from '../common/PhotoCaptureField';
import { Employee, BasicDirectoryEmployee } from '../../types/hrms';
import { db } from '../../db/storage';
import { useAuth } from '../../services/authContext';
import { permissionService } from '../../services/permissionService';
import {
  User,
  Briefcase,
  GitFork,
  FileText,
  Calendar,
  Clock,
  Receipt,
  Laptop,
  CreditCard,
  History,
  ShieldAlert,
  Upload,
  CheckCircle2,
  Mail,
  Phone,
  ShieldCheck,
  Lock,
  Camera
} from 'lucide-react';

interface EmployeeProfileModalProps {
  employee: Employee | BasicDirectoryEmployee | null;
  isOpen: boolean;
  onClose: () => void;
}

type ProfileTab =
  | 'personal'
  | 'employment'
  | 'organization'
  | 'documents'
  | 'leave'
  | 'attendance'
  | 'expenses'
  | 'assets'
  | 'clients'
  | 'lifecycle'
  | 'salary'
  | 'audit';

export const EmployeeProfileModal: React.FC<EmployeeProfileModalProps> = ({
  employee,
  isOpen,
  onClose
}) => {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<ProfileTab>('personal');
  const [docUploadTitle, setDocUploadTitle] = useState('');
  const [docType, setDocType] = useState<
    | 'Resume'
    | 'ID Proof'
    | 'Education Certificate'
    | 'Professional Certificate'
    | 'Offer Letter'
    | 'Appointment Letter'
    | 'Statutory & Tax'
    | 'Performance & Appraisal'
    | 'Appraisal & Promotion Letter'
  >('Education Certificate');
  const [docIssueDate, setDocIssueDate] = useState('');
  const [docExpiryDate, setDocExpiryDate] = useState('');
  const [docCategoryFilter, setDocCategoryFilter] = useState('All');
  const [previewDoc, setPreviewDoc] = useState<{
    id: string;
    title: string;
    category: string;
    uploadedAt: string;
    issueDate?: string;
    expiryDate?: string;
    status: 'Verified' | 'Pending' | 'Rejected';
    uploadedBy: string;
  } | null>(null);
  const [, setDocRefresh] = useState(0);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [showPhotoUpdater, setShowPhotoUpdater] = useState(false);
  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [nameSavedNotice, setNameSavedNotice] = useState('');

  React.useEffect(() => {
    if (isOpen && employee?.id) {
      permissionService.logProfileAccessAudit(employee.id, currentUser);
    }
  }, [isOpen, employee?.id, currentUser.id]);

  if (!employee) return null;

  // Retrieve authorized profile through permissionService (backend-style security enforcement)
  const authorizedProfile = permissionService.getAuthorizedProfile(employee.id, currentUser);
  if (!authorizedProfile) return null;

  // -------------------------------------------------------------------------
  // CASE 1: REGULAR EMPLOYEE VIEWING A COLLEAGUE (OR UNRELATED OUT-OF-SCOPE)
  // Strictly display ONLY: Photo, Name, Official Mobile Number, Official Email.
  // -------------------------------------------------------------------------
  if (authorizedProfile.viewScope === 'colleague_basic') {
    const basic = authorizedProfile as BasicDirectoryEmployee;
    return (
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Employee Directory"
        description="Public corporate contact card"
        maxWidth="md"
      >
        <div className="space-y-5 text-xs">
          {/* Privacy Banner */}
          <div className="p-3 bg-indigo-50/60 rounded-xl border border-indigo-100 flex items-center gap-2 text-indigo-900">
            <ShieldCheck className="h-4 w-4 text-indigo-600 shrink-0" />
            <p className="text-[11px] leading-relaxed">
              <span className="font-semibold">Privacy-Protected Directory Profile:</span> Only permitted official communication channels are accessible to colleagues.
            </p>
          </div>

          {/* Profile Card */}
          <div className="flex flex-col items-center text-center p-6 bg-slate-50 rounded-2xl border border-slate-200">
            <img
              src={basic.avatarUrl}
              alt={basic.firstName}
              className="h-24 w-24 rounded-full object-cover ring-4 ring-white shadow-sm"
            />
            <h3 className="mt-3 text-lg font-bold text-slate-900">
              {basic.firstName} {basic.lastName}
            </h3>
            <span className="mt-1 text-[11px] font-mono text-slate-400">
              {basic.id}
            </span>

            {/* Official Contact Details */}
            <div className="mt-6 w-full space-y-2.5 text-left border-t border-slate-200/80 pt-4">
              <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-200/80">
                <div className="h-8 w-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
                  <Mail className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                    Official Work Email
                  </span>
                  <a
                    href={`mailto:${basic.officialEmail}`}
                    className="font-medium text-indigo-700 hover:underline truncate block text-xs"
                  >
                    {basic.officialEmail}
                  </a>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-200/80">
                <div className="h-8 w-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
                  <Phone className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                    Official Mobile Number
                  </span>
                  <a
                    href={`tel:${basic.officialPhone}`}
                    className="font-medium text-slate-900 font-mono text-xs"
                  >
                    {basic.officialPhone}
                  </a>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2 border-t border-slate-100">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </Modal>
    );
  }

  // -------------------------------------------------------------------------
  // CASE 2: AUTHORIZED PROFILE (SELF, DIRECT REPORTING MANAGER, OR HR ADMIN)
  // -------------------------------------------------------------------------
  const full = authorizedProfile as Employee & { viewScope: string; canViewSalary: boolean };

  const departments = db.getDepartments();
  const designations = db.getDesignations();
  const branches = db.getBranches();
  const shifts = db.getShifts();
  const allEmployees = db.getEmployees();

  const dept = departments.find((d) => d.id === full.departmentId);
  const desig = designations.find((d) => d.id === full.designationId);
  const branch = branches.find((b) => b.id === full.branchId);
  const shift = shifts.find((s) => s.id === full.shiftId);
  const manager = allEmployees.find((e) => e.id === full.reportingManagerId);

  // Cross-module data
  const leaves = db.getLeaveApplications().filter((a) => a.employeeId === full.id);
  const attendance = db.getAttendanceRecords().filter((r) => r.employeeId === full.id);
  const expenses = db.getExpenseClaims().filter((c) => c.employeeId === full.id);
  const assets = db.getAssets().filter((a) => a.currentEmployeeId === full.id);
  const salaryStructure = db.getSalaryStructures().find((s) => s.id === full.salaryStructureId);
  const auditLogs = db.getAuditLogs().filter((l) => l.entityId === full.id || l.description.includes(full.id));

  // Determine permitted tabs based on relationship
  const isManager = full.viewScope === 'direct_report';
  const isSelf = full.viewScope === 'self';
  const isHR = full.viewScope === 'organization_admin';

  const tabs: { id: ProfileTab; label: string; icon: React.ElementType }[] = [
    { id: 'personal', label: 'Personal', icon: User },
    { id: 'employment', label: 'Employment', icon: Briefcase },
    { id: 'organization', label: 'Org & Reporting', icon: GitFork },
    { id: 'documents', label: 'Documents', icon: FileText },
    { id: 'leave', label: 'Leave History', icon: Calendar },
    { id: 'attendance', label: 'Attendance', icon: Clock },
    { id: 'expenses', label: 'Expenses', icon: Receipt },
    { id: 'assets', label: 'Assets', icon: Laptop },
    { id: 'clients', label: 'Client Assignments', icon: Briefcase },
    { id: 'lifecycle', label: 'Onboarding Lifecycle', icon: CheckCircle2 }
  ];

  if (isSelf || isHR) {
    tabs.push({ id: 'salary', label: 'Salary Structure', icon: CreditCard });
  }

  if (isHR) {
    tabs.push({ id: 'audit', label: 'Audit Trail', icon: History });
  }

  type VaultDoc = {
    id: string;
    title: string;
    category: string;
    uploadedAt: string;
    issueDate: string;
    expiryDate: string;
    status: 'Verified' | 'Pending' | 'Rejected';
    uploadedBy: string;
  };

  const docStorageKey = `orbyx_extra_docs_${full.id}`;
  const defaultDocs: VaultDoc[] = [
    {
      id: `DOC-${full.id}-1`,
      title: 'Employment Contract & Signed Offer.pdf',
      category: 'Offer Letter',
      uploadedAt: full.dateOfJoining,
      issueDate: full.dateOfJoining,
      expiryDate: '',
      status: 'Verified',
      uploadedBy: 'Anamika (HR Admin)'
    },
    {
      id: `DOC-${full.id}-2`,
      title: 'Government Tax ID & PAN Card.pdf',
      category: 'ID Proof',
      uploadedAt: full.dateOfJoining,
      issueDate: '2021-04-01',
      expiryDate: '',
      status: 'Verified',
      uploadedBy: `${full.firstName} ${full.lastName}`
    },
    {
      id: `DOC-${full.id}-3`,
      title: 'B.Tech / Postgraduate Degree Certificate.pdf',
      category: 'Education Certificate',
      uploadedAt: full.dateOfJoining,
      issueDate: '2019-06-15',
      expiryDate: '',
      status: 'Verified',
      uploadedBy: `${full.firstName} ${full.lastName}`
    }
  ];

  const getEmployeeDocs = (): VaultDoc[] => {
    try {
      const raw = localStorage.getItem(docStorageKey);
      if (raw) return JSON.parse(raw) as VaultDoc[];
    } catch {
      // ignore
    }
    return defaultDocs;
  };

  const saveEmployeeDocs = (nextDocs: VaultDoc[]) => {
    localStorage.setItem(docStorageKey, JSON.stringify(nextDocs));
    setDocRefresh((n) => n + 1);
  };

  const employeeDocs = getEmployeeDocs();
  const filteredDocs = employeeDocs.filter((d) => docCategoryFilter === 'All' || d.category === docCategoryFilter);

  const handleMockDocUpload = (e: React.FormEvent) => {
    e.preventDefault();
    if (!docUploadTitle.trim()) return;
    const newDoc = {
      id: `DOC-${full.id}-${Date.now()}`,
      title: docUploadTitle.trim().endsWith('.pdf') ? docUploadTitle.trim() : `${docUploadTitle.trim()}.pdf`,
      category: docType,
      uploadedAt: new Date().toISOString().split('T')[0],
      issueDate: docIssueDate || new Date().toISOString().split('T')[0],
      expiryDate: docExpiryDate || '',
      status: (isHR ? 'Verified' : 'Pending') as 'Verified' | 'Pending' | 'Rejected',
      uploadedBy: `${currentUser.name} (${currentUser.role})`
    };
    saveEmployeeDocs([newDoc, ...employeeDocs]);
    db.logAudit({
      actorUserId: currentUser.id,
      actorName: currentUser.name,
      actorRole: currentUser.role,
      module: 'EMPLOYEE',
      action: 'CREATE',
      entityId: full.id,
      entityName: `${full.firstName} ${full.lastName}`,
      description: `Uploaded document "${newDoc.title}" (${newDoc.category}) for ${full.firstName} ${full.lastName}`
    });
    setUploadSuccess(true);
    setDocUploadTitle('');
    setDocIssueDate('');
    setDocExpiryDate('');
    setTimeout(() => {
      setUploadSuccess(false);
    }, 2500);
  };

  const handleUpdateDocStatus = (docId: string, nextStatus: 'Verified' | 'Rejected') => {
    const next = employeeDocs.map((d) => (d.id === docId ? { ...d, status: nextStatus } : d));
    saveEmployeeDocs(next);
    db.logAudit({
      actorUserId: currentUser.id,
      actorName: currentUser.name,
      actorRole: currentUser.role,
      module: 'EMPLOYEE',
      action: nextStatus === 'Verified' ? 'APPROVE' : 'REJECT',
      entityId: full.id,
      entityName: `${full.firstName} ${full.lastName}`,
      description: `Document ${docId} marked as ${nextStatus} by ${currentUser.name}`
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`${full.firstName} ${full.lastName}`}
      description={`${desig?.title || 'Staff'} · ${dept?.name || 'Department'} · ID: ${full.id} (${
        isSelf ? 'My Self-Service Profile' : isManager ? 'Direct Report Profile' : 'HR Admin View'
      })`}
      maxWidth="3xl"
    >
      <div className="space-y-4">
        {/* Header Summary */}
        <div className="flex flex-col gap-3 p-4 rounded-xl bg-slate-50 border border-slate-200">
          <div className="flex items-center gap-4">
            <img
              src={full.avatarUrl}
              alt={full.firstName}
              className="h-16 w-16 rounded-full object-cover ring-2 ring-white shadow-2xs"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="text-base font-bold text-slate-900">{full.firstName} {full.lastName}</h4>
                <span className={`px-2 py-0.5 text-xs font-semibold rounded ${
                  full.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700'
                }`}>
                  {full.status}
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 bg-slate-200/60 text-slate-700 rounded">
                  Scope: {full.viewScope}
                </span>
                {(isHR || isSelf) && (
                  <button
                    type="button"
                    onClick={() => {
                      if (!showPhotoUpdater) {
                        setEditFirstName(full.firstName);
                        setEditLastName(full.lastName);
                        setNameSavedNotice('');
                      }
                      setShowPhotoUpdater(!showPhotoUpdater);
                    }}
                    className="ml-auto inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg border border-indigo-200 transition-colors"
                  >
                    <Camera className="h-3 w-3" />
                    <span>{showPhotoUpdater ? 'Hide Profile & Photo Editor' : 'Edit Name / Capture Photo'}</span>
                  </button>
                )}
              </div>
              <p className="text-xs text-slate-600 mt-0.5">
                Official Email: <span className="font-semibold text-slate-800">{full.officialEmail || full.email}</span> · Official Mobile: <span className="font-semibold text-slate-800">{full.officialPhone || full.phone}</span>
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Branch: <span className="font-medium text-slate-700">{branch?.name}</span> · Reporting Manager:{' '}
                <span className="font-medium text-slate-700">
                  {manager ? `${manager.firstName} ${manager.lastName}` : 'Company Board'}
                </span>
              </p>
            </div>
          </div>

          {showPhotoUpdater && (isHR || isSelf) && (
            <div className="pt-3 border-t border-slate-200 space-y-3">
              {/* Name Synchronization Form */}
              <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-700">Employee Full Name (Global Sync)</span>
                  {nameSavedNotice && (
                    <span className="text-[11px] font-semibold text-emerald-700">{nameSavedNotice}</span>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-end">
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">First Name</label>
                    <input
                      type="text"
                      value={editFirstName}
                      onChange={(e) => setEditFirstName(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-slate-50 focus:bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Last Name</label>
                    <input
                      type="text"
                      value={editLastName}
                      onChange={(e) => setEditLastName(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-slate-50 focus:bg-white"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (!editFirstName.trim()) return;
                      const rawEmp = db.getEmployeeById(full.id);
                      if (rawEmp) {
                        const updatedEmp: Employee = {
                          ...rawEmp,
                          firstName: editFirstName.trim(),
                          lastName: editLastName.trim(),
                          updatedAt: new Date().toISOString().split('T')[0]
                        };
                        db.saveEmployee(updatedEmp);
                        db.logAudit({
                          actorUserId: currentUser.id,
                          actorName: currentUser.name,
                          actorRole: currentUser.role,
                          module: 'EMPLOYEE',
                          action: 'UPDATE',
                          entityId: full.id,
                          entityName: `${updatedEmp.firstName} ${updatedEmp.lastName}`,
                          description: `Updated employee name to "${updatedEmp.firstName} ${updatedEmp.lastName}" (${full.id}); synchronized globally.`
                        });
                        setNameSavedNotice('Name updated & synced across all views!');
                        setDocRefresh((n) => n + 1);
                      }
                    }}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg"
                  >
                    Save Name
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-600">Employee Profile Photograph</span>
                <button
                  type="button"
                  onClick={() => {
                    const defaultAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                      `${full.firstName} ${full.lastName}`
                    )}&background=4f46e5&color=fff&size=256`;
                    const rawEmp = db.getEmployeeById(full.id);
                    if (rawEmp) {
                      db.saveEmployee({ ...rawEmp, avatarUrl: defaultAvatar });
                      db.logAudit({
                        actorUserId: currentUser.id,
                        actorName: currentUser.name,
                        actorRole: currentUser.role,
                        module: 'EMPLOYEE',
                        action: 'UPDATE',
                        entityId: full.id,
                        entityName: `${full.firstName} ${full.lastName}`,
                        description: `Reset photograph to default corporate avatar for ${full.firstName} ${full.lastName}`
                      });
                      setDocRefresh((n) => n + 1);
                    }
                  }}
                  className="px-2.5 py-1 text-[11px] font-medium text-slate-600 bg-white border border-slate-300 rounded hover:bg-slate-100"
                >
                  Reset to Default Avatar
                </button>
              </div>
              <PhotoCaptureField
                value={full.avatarUrl}
                onChange={(newDataUrl) => {
                  const rawEmp = db.getEmployeeById(full.id);
                  if (rawEmp) {
                    db.saveEmployee({ ...rawEmp, avatarUrl: newDataUrl });
                    db.logAudit({
                      actorUserId: currentUser.id,
                      actorName: currentUser.name,
                      actorRole: currentUser.role,
                      module: 'EMPLOYEE',
                      action: 'UPDATE',
                      entityId: full.id,
                      entityName: `${full.firstName} ${full.lastName}`,
                      description: `Updated employee photograph for ${full.firstName} ${full.lastName} (${full.id})`
                    });
                    setDocRefresh((n) => n + 1);
                  }
                }}
                label="Capture Live Webcam Photo or Upload Image"
              />
            </div>
          )}
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-slate-200 overflow-x-auto flex items-center gap-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 whitespace-nowrap transition-colors ${
                  isActive
                    ? 'border-indigo-600 text-indigo-700'
                    : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Contents */}
        <div className="py-2 min-h-64 text-xs">
          {/* TAB: PERSONAL */}
          {activeTab === 'personal' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-lg border border-slate-100 bg-slate-50/50 space-y-2.5">
                <p className="font-semibold text-slate-900 text-xs border-b border-slate-200/60 pb-1">General Details</p>
                <div className="flex justify-between"><span className="text-slate-500">Date of Birth:</span><span className="font-medium text-slate-800">{full.dateOfBirth}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Gender:</span><span className="font-medium text-slate-800">{full.gender}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Blood Group:</span><span className="font-medium text-slate-800">{full.bloodGroup || 'N/A'}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Marital Status:</span><span className="font-medium text-slate-800">{full.maritalStatus || 'Single'}</span></div>
                <div><span className="text-slate-500 block mb-0.5">Permanent Address:</span><span className="font-medium text-slate-800">{full.address}</span></div>
              </div>
              <div className="p-4 rounded-lg border border-slate-100 bg-slate-50/50 space-y-2.5">
                <p className="font-semibold text-slate-900 text-xs border-b border-slate-200/60 pb-1">Emergency Contact</p>
                <div className="flex justify-between"><span className="text-slate-500">Contact Name:</span><span className="font-medium text-slate-800">{full.emergencyContact.name}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Relationship:</span><span className="font-medium text-slate-800">{full.emergencyContact.relationship}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Emergency Phone:</span><span className="font-medium text-slate-800">{full.emergencyContact.phone}</span></div>
              </div>
            </div>
          )}

          {/* TAB: EMPLOYMENT */}
          {activeTab === 'employment' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-lg border border-slate-100 bg-slate-50/50 space-y-2.5">
                <p className="font-semibold text-slate-900 text-xs border-b border-slate-200/60 pb-1">Lifecycle Milestones</p>
                <div className="flex justify-between"><span className="text-slate-500">Date of Joining:</span><span className="font-medium text-slate-800">{full.dateOfJoining}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Employment Type:</span><span className="font-medium text-slate-800">{full.employmentType}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Confirmation Date:</span><span className="font-medium text-slate-800">{full.confirmationDate || 'In Probation'}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Notice Period:</span><span className="font-medium text-slate-800">{full.noticePeriodDays} days</span></div>
              </div>
              <div className="p-4 rounded-lg border border-slate-100 bg-slate-50/50 space-y-2.5">
                <p className="font-semibold text-slate-900 text-xs border-b border-slate-200/60 pb-1">Work Arrangement</p>
                <div className="flex justify-between"><span className="text-slate-500">Assigned Shift:</span><span className="font-medium text-slate-800">{shift?.name || 'General Day'}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Working Hours:</span><span className="font-medium text-slate-800">{shift ? `${shift.startTime} - ${shift.endTime}` : '09:30 - 18:30'}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Branch Location:</span><span className="font-medium text-slate-800">{branch?.name} ({branch?.city})</span></div>
              </div>
            </div>
          )}

          {/* TAB: ORGANIZATION */}
          {activeTab === 'organization' && (
            <div className="p-4 rounded-lg border border-slate-100 bg-slate-50/50 space-y-3">
              <p className="font-semibold text-slate-900 text-xs">Hierarchy & Department Assignment</p>
              <div className="grid grid-cols-2 gap-4">
                <div><span className="text-slate-500 block">Department:</span><span className="font-medium text-slate-800 text-sm">{dept?.name} ({dept?.code})</span></div>
                <div><span className="text-slate-500 block">Designation:</span><span className="font-medium text-slate-800 text-sm">{desig?.title}</span></div>
                <div><span className="text-slate-500 block">Job Level:</span><span className="font-medium text-slate-800">{desig?.level || 'Standard'}</span></div>
                <div><span className="text-slate-500 block">Reports Directly To:</span><span className="font-medium text-indigo-700">{manager ? `${manager.firstName} ${manager.lastName} (${manager.id})` : 'Company Board'}</span></div>
              </div>
            </div>
          )}

          {/* TAB: DOCUMENTS */}
          {activeTab === 'documents' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="font-semibold text-slate-900 block">Employee Document Vault & Certificates</span>
                  <span className="text-[11px] text-slate-500">Verified educational, identity, statutory, and lifecycle documents</span>
                </div>
                <select
                  value={docCategoryFilter}
                  onChange={(e) => setDocCategoryFilter(e.target.value)}
                  className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                >
                  <option value="All">All Categories ({employeeDocs.length})</option>
                  <option value="Resume">Resume / CV</option>
                  <option value="ID Proof">ID Proof</option>
                  <option value="Education Certificate">Education Certificate</option>
                  <option value="Professional Certificate">Professional Certificate</option>
                  <option value="Offer Letter">Offer Letter</option>
                  <option value="Appointment Letter">Appointment Letter</option>
                  <option value="Statutory & Tax">Statutory & Tax</option>
                  <option value="Performance & Appraisal">Performance & Appraisal</option>
                  <option value="Appraisal & Promotion Letter">Appraisal & Promotion Letter</option>
                </select>
              </div>

              <div className="space-y-2">
                {filteredDocs.map((doc) => (
                  <div key={doc.id} className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-lg border border-slate-200 bg-white">
                    <div className="flex items-center gap-2.5">
                      <FileText className="h-4 w-4 text-indigo-600 shrink-0" />
                      <div>
                        <p className="font-medium text-slate-800">{doc.title}</p>
                        <p className="text-[11px] text-slate-400">
                          {doc.category} · Uploaded {doc.uploadedAt} by {doc.uploadedBy}
                          {doc.issueDate ? ` · Issued: ${doc.issueDate}` : ''}
                          {doc.expiryDate ? ` · Expires: ${doc.expiryDate}` : ''}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`text-[11px] px-2 py-0.5 rounded font-semibold border ${
                          doc.status === 'Verified'
                            ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                            : doc.status === 'Rejected'
                            ? 'text-rose-700 bg-rose-50 border-rose-200'
                            : 'text-amber-700 bg-amber-50 border-amber-200'
                        }`}
                      >
                        {doc.status}
                      </span>
                      <button
                        type="button"
                        onClick={() => setPreviewDoc(doc)}
                        className="px-2 py-1 text-[11px] font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded"
                      >
                        Preview
                      </button>
                      {isHR && doc.status !== 'Verified' && (
                        <button
                          type="button"
                          onClick={() => handleUpdateDocStatus(doc.id, 'Verified')}
                          className="px-2 py-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded"
                        >
                          Verify
                        </button>
                      )}
                      {isHR && doc.status !== 'Rejected' && (
                        <button
                          type="button"
                          onClick={() => handleUpdateDocStatus(doc.id, 'Rejected')}
                          className="px-2 py-1 text-[11px] font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded"
                        >
                          Reject
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {previewDoc && (
                <div className="p-4 rounded-xl bg-indigo-50/60 border border-indigo-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-indigo-950 text-xs">Document Metadata & Preview: {previewDoc.title}</span>
                    <button
                      type="button"
                      onClick={() => setPreviewDoc(null)}
                      className="text-[11px] font-semibold text-indigo-700 hover:underline"
                    >
                      Close Preview
                    </button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] bg-white p-3 rounded-lg border border-indigo-100">
                    <div>
                      <span className="text-slate-400 block">Document ID</span>
                      <span className="font-mono font-semibold text-slate-800">{previewDoc.id}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Category</span>
                      <span className="font-semibold text-slate-800">{previewDoc.category}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Issue / Expiry</span>
                      <span className="font-semibold text-slate-800">
                        {previewDoc.issueDate || 'N/A'} {previewDoc.expiryDate ? `→ ${previewDoc.expiryDate}` : ''}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Verification Status</span>
                      <span className="font-semibold text-indigo-700">{previewDoc.status}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Upload Document Form */}
              {(isSelf || isHR) && (
                <form onSubmit={handleMockDocUpload} className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-3">
                  <p className="font-medium text-slate-800 text-xs">Upload Certificate / Employee Document</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={docUploadTitle}
                      onChange={(e) => setDocUploadTitle(e.target.value)}
                      placeholder="Document Title (e.g. AWS Solutions Architect Certificate)"
                      className="px-3 py-1.5 bg-white border border-slate-200 rounded text-xs"
                      required
                    />
                    <select
                      value={docType}
                      onChange={(e) => setDocType(e.target.value as any)}
                      className="px-3 py-1.5 bg-white border border-slate-200 rounded text-xs"
                    >
                      <option value="Education Certificate">Education Certificate</option>
                      <option value="Professional Certificate">Professional Certificate</option>
                      <option value="ID Proof">Government ID Proof</option>
                      <option value="Resume">Resume / CV</option>
                      <option value="Offer Letter">Offer Letter</option>
                      <option value="Appointment Letter">Appointment Letter</option>
                      <option value="Statutory & Tax">Statutory & Tax Form</option>
                      <option value="Performance & Appraisal">Performance & Appraisal</option>
                      <option value="Exit & Clearance">Exit & Clearance</option>
                    </select>
                    <div>
                      <label className="block text-[10px] text-slate-500 mb-0.5">Issue Date (Optional)</label>
                      <input
                        type="date"
                        value={docIssueDate}
                        onChange={(e) => setDocIssueDate(e.target.value)}
                        className="w-full px-2.5 py-1 bg-white border border-slate-200 rounded text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-500 mb-0.5">Expiry Date (Optional)</label>
                      <input
                        type="date"
                        value={docExpiryDate}
                        onChange={(e) => setDocExpiryDate(e.target.value)}
                        className="w-full px-2.5 py-1 bg-white border border-slate-200 rounded text-xs"
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-slate-500">Persisted to Employee Document Vault (PDF, PNG, JPG)</span>
                    <button
                      type="submit"
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-xs font-semibold"
                    >
                      <Upload className="h-3 w-3" />
                      Upload to Vault
                    </button>
                  </div>
                  {uploadSuccess && (
                    <p className="text-[11px] text-emerald-700 flex items-center gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Document uploaded and saved to employee record.
                    </p>
                  )}
                </form>
              )}
            </div>
          )}

          {/* TAB: LEAVE */}
          {activeTab === 'leave' && (
            <div className="space-y-3">
              <p className="font-semibold text-slate-900">Leave Applications & History ({leaves.length})</p>
              {leaves.length === 0 ? (
                <p className="text-slate-400 py-6 text-center">No leave applications recorded.</p>
              ) : (
                leaves.map((l) => (
                  <div key={l.id} className="p-2.5 rounded-lg border border-slate-200 bg-white flex justify-between items-center">
                    <div>
                      <p className="font-semibold text-slate-800">{l.totalDays} day(s) · {l.startDate} to {l.endDate}</p>
                      <p className="text-slate-500 text-[11px]">Reason: {l.reason}</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                      l.status === 'Approved' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}>
                      {l.status}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB: ATTENDANCE */}
          {activeTab === 'attendance' && (
            <div className="space-y-3">
              <p className="font-semibold text-slate-900">Attendance Records</p>
              {attendance.length === 0 ? (
                <p className="text-slate-400 py-6 text-center">No attendance punches recorded.</p>
              ) : (
                attendance.map((att) => (
                  <div key={att.id} className="p-2.5 rounded-lg border border-slate-200 bg-white flex justify-between items-center">
                    <div>
                      <p className="font-semibold text-slate-800">{att.date} ({att.status})</p>
                      <p className="text-slate-500 text-[11px]">In: {att.checkInTime || '--'} | Out: {att.checkOutTime || '--'} | Total: {att.totalHoursWorked}h</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                      att.isLate ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-slate-100 text-slate-700'
                    }`}>
                      {att.source}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB: EXPENSES */}
          {activeTab === 'expenses' && (
            <div className="space-y-3">
              <p className="font-semibold text-slate-900">Expense Claims ({expenses.length})</p>
              {expenses.length === 0 ? (
                <p className="text-slate-400 py-6 text-center">No expense claims filed.</p>
              ) : (
                expenses.map((exp) => (
                  <div key={exp.id} className="p-2.5 rounded-lg border border-slate-200 bg-white flex justify-between items-center">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-800">{exp.claimNumber}</span>
                        <span className="font-mono text-indigo-700 font-bold">₹{exp.amount.toLocaleString()}</span>
                      </div>
                      <p className="text-slate-500 text-[11px]">{exp.title} · Date: {exp.expenseDate}</p>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700">
                      {exp.status}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB: ASSETS */}
          {activeTab === 'assets' && (
            <div className="space-y-3">
              <p className="font-semibold text-slate-900">Assigned Company Assets ({assets.length})</p>
              {assets.length === 0 ? (
                <p className="text-slate-400 py-6 text-center">No assets allocated to this employee.</p>
              ) : (
                assets.map((asset) => (
                  <div key={asset.id} className="p-3 rounded-lg border border-slate-200 bg-white flex justify-between items-center">
                    <div>
                      <p className="font-semibold text-slate-900">{asset.name}</p>
                      <p className="text-slate-500 text-[11px]">Tag: {asset.assetTag} · SN: {asset.serialNumber} · Condition: {asset.condition}</p>
                    </div>
                    <span className="text-[11px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                      {asset.status}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB: CLIENT ASSIGNMENTS */}
          {activeTab === 'clients' && (
            <div className="space-y-3">
              <p className="font-semibold text-slate-900">Client Deployments & Engagements</p>
              {(() => {
                let empAssignments: any[] = [];
                try {
                  const raw = localStorage.getItem('orbyx_hrms_client_assignments_v1');
                  if (raw) {
                    empAssignments = (JSON.parse(raw) as any[]).filter((a) => a.employeeId === full.id);
                  }
                } catch {
                  empAssignments = [];
                }
                if (empAssignments.length === 0) {
                  return <p className="text-slate-400 py-6 text-center">No active or historical client deployments for this employee.</p>;
                }
                return empAssignments.map((a) => (
                  <div key={a.id} className="p-3 rounded-lg border border-slate-200 bg-white flex justify-between items-center">
                    <div>
                      <p className="font-semibold text-slate-900">{a.project} ({a.clientId})</p>
                      <p className="text-slate-500 text-[11px]">{a.workMode} · {a.location} · Period: {a.startDate} to {a.plannedEndDate || 'Ongoing'}</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                      a.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {a.status}
                    </span>
                  </div>
                ));
              })()}
            </div>
          )}

          {/* TAB: ONBOARDING LIFECYCLE */}
          {activeTab === 'lifecycle' && (
            <div className="max-w-xl mx-auto space-y-4">
              <div className="p-4 rounded-lg border border-slate-200 bg-slate-50/50 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <div>
                    <p className="font-semibold text-slate-900 text-xs">Onboarding Lifecycle & Provisioning Checklist</p>
                    <p className="text-[11px] text-slate-500">Verified milestones for employee setup and IT readiness</p>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Active Workforce Record
                  </span>
                </div>
                {[
                  { label: 'Unique Employee ID & Profile Created', done: true, desc: `ID: ${full.id} · Joined: ${full.dateOfJoining}` },
                  { label: 'Department, Designation & Reporting Manager Linked', done: true, desc: `${dept?.name || 'Assigned'} · ${desig?.title || 'Assigned'}` },
                  { label: 'Salary Structure & Statutory Compliance Assigned', done: true, desc: salaryStructure?.name || 'Standard Structure' },
                  { label: 'Hardware Workstation & Official Email Provisioned', done: assets.length > 0, desc: `${assets.length} Asset(s) allocated` },
                  { label: 'Identity, Education & Employment Documents Recorded', done: true, desc: `${employeeDocs.length} document(s) on file` }
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs py-1.5 border-b border-slate-100 last:border-0">
                    <div>
                      <span className="text-slate-800 font-medium block">{item.label}</span>
                      <span className="text-[11px] text-slate-500">{item.desc}</span>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold shrink-0 ml-3 ${item.done ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                      {item.done ? 'Completed' : 'Pending'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB: SALARY STRUCTURE (CONFIDENTIAL - ACCESSIBLE ONLY TO SELF OR HR ADMIN) */}
          {activeTab === 'salary' && (
            <div>
              {!full.canViewSalary ? (
                <div className="p-8 text-center bg-rose-50 rounded-xl border border-rose-200">
                  <ShieldAlert className="h-8 w-8 text-rose-600 mx-auto mb-2" />
                  <h4 className="text-sm font-bold text-rose-900">Confidential Salary Record</h4>
                  <p className="text-xs text-rose-700 mt-1 max-w-md mx-auto">
                    Reporting Managers and colleagues are not authorized to view this employee's salary and bank account details.
                    Access is strictly limited to HR Administrators and the individual employee.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                      <div>
                        <span className="text-xs text-slate-500">Annual Cost to Company (CTC)</span>
                        <div className="text-xl font-bold text-slate-900 font-mono">
                          ₹{full.baseSalaryAnnual.toLocaleString()}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-xs text-slate-500">Structure</span>
                        <p className="font-medium text-slate-800">{salaryStructure?.name || 'Default'}</p>
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-4 text-xs">
                      <div>
                        <span className="text-slate-500 block">Bank Account:</span>
                        <span className="font-medium text-slate-800 font-mono">
                          {full.bankDetails.bankName} - {full.bankDetails.accountNumber}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">IFSC Code:</span>
                        <span className="font-medium text-slate-800 font-mono">{full.bankDetails.ifscOrRouting}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">PAN / Tax Number:</span>
                        <span className="font-medium text-slate-800 font-mono">{full.panOrTaxNumber}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">PF UAN:</span>
                        <span className="font-medium text-slate-800 font-mono">{full.pfUan || 'N/A'}</span>
                      </div>
                    </div>
                  </div>

                  {salaryStructure && (
                    <div className="border border-slate-200 rounded-lg overflow-hidden">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200">
                          <tr>
                            <th className="px-3 py-2">Component</th>
                            <th className="px-3 py-2">Type</th>
                            <th className="px-3 py-2 text-right">Monthly Amount</th>
                            <th className="px-3 py-2 text-right">Annual Amount</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {salaryStructure.items.map((item, idx) => (
                            <tr key={idx} className="hover:bg-slate-50">
                              <td className="px-3 py-2 font-medium text-slate-800">{item.componentName}</td>
                              <td className="px-3 py-2 text-slate-500">{item.type}</td>
                              <td className="px-3 py-2 text-right font-mono font-medium text-slate-900">₹{item.amountMonthly.toLocaleString()}</td>
                              <td className="px-3 py-2 text-right font-mono text-slate-600">₹{item.amountAnnual.toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB: AUDIT */}
          {activeTab === 'audit' && isHR && (
            <div className="space-y-2">
              <p className="font-semibold text-slate-900">Historical Changes & Audit Records</p>
              {auditLogs.length === 0 ? (
                <p className="text-slate-400 py-6 text-center">No audit trail records for this employee.</p>
              ) : (
                auditLogs.map((log) => (
                  <div key={log.id} className="p-2.5 bg-slate-50 rounded border border-slate-200 text-xs">
                    <div className="flex justify-between items-center text-[11px] text-slate-500">
                      <span className="font-semibold text-slate-800">{log.action} by {log.actorName}</span>
                      <span>{new Date(log.timestamp).toLocaleString()}</span>
                    </div>
                    <p className="text-slate-600 mt-1">{log.description}</p>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};
