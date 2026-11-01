import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../services/authContext';
import { UserCheck, ChevronDown, RotateCcw, Shield } from 'lucide-react';
import { resetToSeedData } from '../../db/storage';
import { UserRole } from '../../types/hrms';

const ROLE_LABELS: Record<UserRole, string> = {
  founder: 'Founder & Chairman',
  senior_manager: 'Senior Management (MD)',
  super_admin: 'Super Admin',
  admin: 'Admin',
  hr_admin: 'HR Admin',
  reporting_manager: 'Reporting Manager',
  employee: 'Employee'
};

export const PersonaSwitcher: React.FC = () => {
  const {
    currentUser,
    switchPersona,
    allPersonas
  } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleResetData = () => {
    resetToSeedData();
    setConfirmReset(false);
    setIsOpen(false);
    switchPersona('user_hr_admin');
    window.location.reload();
  };

  const personaList = allPersonas || [];

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 text-xs font-medium shadow-2xs transition-colors"
      >
        <div className="h-5 w-5 rounded-full overflow-hidden shrink-0 border border-slate-200">
          <img src={currentUser?.avatarUrl} alt={currentUser?.name || 'User'} className="h-full w-full object-cover" />
        </div>
        <div className="text-left hidden sm:block">
          <span className="font-semibold text-slate-900">{currentUser?.name}</span>
          <span className="text-slate-400 ml-1">
            ({ROLE_LABELS[currentUser?.role] || currentUser?.role})
          </span>
        </div>
        <ChevronDown className="h-3.5 w-3.5 text-slate-400 ml-0.5" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-slate-200 py-2 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="px-4 py-2 border-b border-slate-100 bg-slate-50/70">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-slate-900">Switch Role / Persona</p>
              <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-800 font-semibold">
                RBAC Switcher
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Test RBAC workflows as HR Admin, Approving Manager, or Employee.
            </p>
          </div>

          <div className="py-1 max-h-80 overflow-y-auto">
            {personaList.map((persona) => {
              const isSelected = persona.id === currentUser?.id;
              return (
                <button
                  key={persona.id}
                  onClick={() => {
                    switchPersona(persona.id);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-start gap-3 px-4 py-2.5 text-left text-xs transition-colors ${
                    isSelected ? 'bg-indigo-50/70 text-indigo-900' : 'hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <img
                    src={persona.avatarUrl}
                    alt={persona.name}
                    className="h-8 w-8 rounded-full object-cover shrink-0 mt-0.5 border border-slate-200"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-900 truncate">{persona.name}</span>
                      {isSelected && <UserCheck className="h-4 w-4 text-indigo-600 shrink-0" />}
                    </div>
                    <p className="text-[11px] text-slate-500 truncate">{persona.designationTitle}</p>
                    <div className="mt-1 flex items-center gap-1.5 text-[10px]">
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-mono">
                        <Shield className="h-2.5 w-2.5" />
                        {ROLE_LABELS[persona.role] || persona.role}
                      </span>
                      <span className="text-slate-400 truncate">{persona.email}</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="mt-1 pt-2 border-t border-slate-100 px-3">
            {!confirmReset ? (
              <button
                type="button"
                onClick={() => setConfirmReset(true)}
                className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <RotateCcw className="h-3.5 w-3.5 text-slate-400" />
                <span>Reset Database to Seed State</span>
              </button>
            ) : (
              <div className="bg-rose-50 p-2.5 rounded-lg border border-rose-200 text-center">
                <p className="text-[11px] text-rose-800 font-medium mb-2">
                  Reset all records, leaves, payroll & assets to original demo seed?
                </p>
                <div className="flex items-center justify-center gap-2">
                  <button
                    onClick={handleResetData}
                    className="px-2.5 py-1 text-[11px] font-semibold bg-rose-600 text-white rounded hover:bg-rose-700"
                  >
                    Confirm Reset
                  </button>
                  <button
                    onClick={() => setConfirmReset(false)}
                    className="px-2.5 py-1 text-[11px] font-medium bg-white text-slate-700 border border-slate-200 rounded hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
