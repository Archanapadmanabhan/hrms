import React, { useState } from 'react';
import { db } from '../../db/storage';
import { Calendar, ChevronLeft, ChevronRight, User } from 'lucide-react';

export const AbsenceCalendar: React.FC = () => {
  const [currentMonth, setCurrentMonth] = useState(10); // October
  const [currentYear, setCurrentYear] = useState(2026);

  const employees = db.getEmployees();
  const leaveApps = db.getLeaveApplications().filter((a) => a.status === 'Approved');
  const holidays = db.getHolidays();
  const leaveTypes = db.getLeaveTypes();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const handlePrevMonth = () => {
    if (currentMonth === 1) {
      setCurrentMonth(12);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 12) {
      setCurrentMonth(1);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
  const firstDayOfWeek = new Date(currentYear, currentMonth - 1, 1).getDay(); // 0 is Sun

  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const leadingBlanks = Array.from({ length: firstDayOfWeek }, (_, i) => i);

  const getAbsencesForDay = (day: number) => {
    const dateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return leaveApps.filter((a) => a.startDate <= dateStr && a.endDate >= dateStr);
  };

  const getHolidayForDay = (day: number) => {
    const dateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return holidays.find((h) => h.date === dateStr);
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
      {/* Month Navigation */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-indigo-600" />
          <h3 className="text-sm font-bold text-slate-900">
            {monthNames[currentMonth - 1]} {currentYear} Absence Schedule
          </h3>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={handlePrevMonth}
            className="p-1 rounded-md border border-slate-200 hover:bg-slate-50 text-slate-600"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="px-2 text-xs font-semibold text-slate-700">
            {monthNames[currentMonth - 1]} {currentYear}
          </span>
          <button
            onClick={handleNextMonth}
            className="p-1 rounded-md border border-slate-200 hover:bg-slate-50 text-slate-600"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1 text-center text-xs">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d, i) => (
          <div key={d} className={`py-1.5 font-bold uppercase tracking-wider text-[10px] ${i === 0 || i === 6 ? 'text-rose-500' : 'text-slate-500'}`}>
            {d}
          </div>
        ))}

        {leadingBlanks.map((b) => (
          <div key={`blank-${b}`} className="min-h-20 bg-slate-50/50 rounded-lg border border-transparent" />
        ))}

        {daysArray.map((day) => {
          const absences = getAbsencesForDay(day);
          const holiday = getHolidayForDay(day);
          const isWeekend = new Date(currentYear, currentMonth - 1, day).getDay() === 0 || new Date(currentYear, currentMonth - 1, day).getDay() === 6;

          return (
            <div
              key={day}
              className={`min-h-20 p-1.5 rounded-lg border text-left flex flex-col justify-between transition-colors ${
                holiday
                  ? 'bg-rose-50/50 border-rose-200'
                  : isWeekend
                  ? 'bg-slate-50/60 border-slate-100'
                  : 'bg-white border-slate-200/80 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-[11px] font-bold ${isWeekend ? 'text-slate-400' : 'text-slate-800'}`}>
                  {day}
                </span>
                {holiday && (
                  <span className="text-[9px] font-semibold text-rose-700 truncate max-w-16">
                    {holiday.name}
                  </span>
                )}
              </div>

              <div className="space-y-1 mt-1 overflow-hidden">
                {absences.map((app) => {
                  const emp = employees.find((e) => e.id === app.employeeId);
                  const lt = leaveTypes.find((l) => l.id === app.leaveTypeId);
                  return (
                    <div
                      key={app.id}
                      className="px-1 py-0.5 rounded text-[10px] bg-indigo-50 border border-indigo-200 text-indigo-900 truncate font-medium"
                      title={`${emp?.firstName || app.employeeId} (${lt?.code})`}
                    >
                      {emp?.firstName || 'Emp'} ({lt?.code})
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
