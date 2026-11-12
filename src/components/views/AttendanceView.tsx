import React, { useState } from 'react';
import {
  Calendar,
  Check,
  X,
  Clock,
  ShieldAlert,
  Users,
  ChevronLeft,
  ChevronRight,
  Printer,
  Sparkles,
  Search,
  CheckCircle2,
  Table,
  SlidersHorizontal,
  FileSpreadsheet,
  Edit3,
} from 'lucide-react';
import {
  ClassGroup,
  Student,
  AttendanceRecord,
  AttendanceStatus,
  MonthlyAssessmentRecord,
} from '../../types';

interface AttendanceViewProps {
  classes: ClassGroup[];
  students: Student[];
  attendanceRecords: AttendanceRecord[];
  monthlyAssessments: MonthlyAssessmentRecord[];
  activeClassId: string;
  onSelectClass: (classId: string) => void;
  onSaveAttendance: (
    classId: string,
    date: string,
    records: Record<string, AttendanceStatus>,
    notes?: string
  ) => void;
  onSaveMonthlyAssessment: (
    classId: string,
    studentId: string,
    month: string,
    updates: Partial<MonthlyAssessmentRecord>
  ) => void;
  onExportPdf: (classGroup: ClassGroup) => void;
  onExportMonthlyRegisterPdf: (classGroup: ClassGroup, yearMonth: string) => void;
}

export const AttendanceView: React.FC<AttendanceViewProps> = ({
  classes,
  students,
  attendanceRecords,
  monthlyAssessments,
  activeClassId,
  onSelectClass,
  onSaveAttendance,
  onSaveMonthlyAssessment,
  onExportPdf,
  onExportMonthlyRegisterPdf,
}) => {
  // Mode: 'monthly_ledger' | 'daily_check'
  const [viewMode, setViewMode] = useState<'monthly_ledger' | 'daily_check'>('monthly_ledger');

  // Selected Year & Month (e.g. "2026-11")
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  });

  // Selected single date for daily check
  const [selectedDailyDate, setSelectedDailyDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });

  const [searchQuery, setSearchQuery] = useState('');

  const currentClass = classes.find((c) => c.id === activeClassId) || classes[0];
  const classStudents = students.filter((s) => s.classId === currentClass.id);

  // Month calculation helpers
  const [yearStr, monthStr] = selectedMonth.split('-');
  const yearNum = Number(yearStr);
  const monthNum = Number(monthStr);
  const daysInMonth = new Date(yearNum, monthNum, 0).getDate();
  const monthDateObj = new Date(yearNum, monthNum - 1, 1);
  const monthDisplayTitle = monthDateObj.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  const todayIso = new Date().toISOString().split('T')[0];

  // Map attendance by date string for fast lookup: { "2026-11-11": { s1: 'P', s2: 'A' } }
  const attendanceByDate: Record<string, Record<string, AttendanceStatus>> = {};
  attendanceRecords
    .filter((a) => a.classId === currentClass.id)
    .forEach((rec) => {
      attendanceByDate[rec.date] = rec.records;
    });

  // Normalize status helper: converts legacy 'present' to 'P', 'absent' to 'A', 'tardy'/'excused' to 'Permitted'
  const getNormalizedStatus = (st?: AttendanceStatus): 'P' | 'A' | 'Permitted' | null => {
    if (!st) return null;
    if (st === 'P' || st === 'present') return 'P';
    if (st === 'A' || st === 'absent') return 'A';
    if (st === 'Permitted' || st === 'tardy' || st === 'excused') return 'Permitted';
    return null;
  };

  // Cycle status on one-click in monthly matrix: null -> 'P' -> 'A' -> 'Permitted' -> null
  const handleCycleDayStatus = (studentId: string, dayNum: number) => {
    const dayStr = `${selectedMonth}-${String(dayNum).padStart(2, '0')}`;
    const dayRecords = { ...(attendanceByDate[dayStr] || {}) };
    const current = getNormalizedStatus(dayRecords[studentId]);

    let next: AttendanceStatus | undefined = undefined;
    if (current === null) {
      next = 'P';
    } else if (current === 'P') {
      next = 'A';
    } else if (current === 'A') {
      next = 'Permitted';
    } else {
      next = undefined;
    }

    if (next) {
      dayRecords[studentId] = next;
    } else {
      delete dayRecords[studentId];
    }

    onSaveAttendance(currentClass.id, dayStr, dayRecords);
  };

  // Fill selected day with 'P' for all students
  const handleFillAllDayPresent = (dayNum: number) => {
    const dayStr = `${selectedMonth}-${String(dayNum).padStart(2, '0')}`;
    const dayRecords: Record<string, AttendanceStatus> = {};
    classStudents.forEach((s) => {
      dayRecords[s.id] = 'P';
    });
    onSaveAttendance(currentClass.id, dayStr, dayRecords);
  };

  // Daily mode record
  const currentDailyRecord = attendanceRecords.find(
    (a) => a.classId === currentClass.id && a.date === selectedDailyDate
  );
  const dailyRecords = currentDailyRecord?.records || {};

  const handleDailyStatus = (studentId: string, status: AttendanceStatus) => {
    const updated = { ...dailyRecords, [studentId]: status };
    onSaveAttendance(currentClass.id, selectedDailyDate, updated, currentDailyRecord?.notes);
  };

  const handleDailyMarkAllPresent = () => {
    const updated: Record<string, AttendanceStatus> = {};
    classStudents.forEach((s) => {
      updated[s.id] = 'P';
    });
    onSaveAttendance(currentClass.id, selectedDailyDate, updated, currentDailyRecord?.notes);
  };

  // State for 80+ student scalability
  const [pageSize, setPageSize] = useState<number>(25);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [filterCondition, setFilterCondition] = useState<'all' | 'absent' | 'permitted' | 'low_attendance'>('all');
  const [jumpRoll, setJumpRoll] = useState('');
  const [isCompactDaily, setIsCompactDaily] = useState(true);
  const [activeRollIndex, setActiveRollIndex] = useState(0);

  // Filter students by search and condition
  const filteredStudents = classStudents.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.rollNumber.includes(searchQuery);
    if (!matchesSearch) return false;

    if (filterCondition === 'all') return true;

    // Check student's monthly attendance
    let pCount = 0;
    let aCount = 0;
    let permCount = 0;
    let recordedDays = 0;

    for (let d = 1; d <= daysInMonth; d++) {
      const dStr = `${selectedMonth}-${String(d).padStart(2, '0')}`;
      const st = getNormalizedStatus(attendanceByDate[dStr]?.[s.id]);
      if (st) {
        recordedDays++;
        if (st === 'P') pCount++;
        else if (st === 'A') aCount++;
        else if (st === 'Permitted') permCount++;
      }
    }

    if (filterCondition === 'absent') return aCount > 0;
    if (filterCondition === 'permitted') return permCount > 0;
    if (filterCondition === 'low_attendance') {
      const rate = recordedDays > 0 ? (pCount / recordedDays) * 100 : 100;
      return rate < 75;
    }

    return true;
  });

  // Keyboard navigation for Daily Fast Check
  React.useEffect(() => {
    if (viewMode !== 'daily_check') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if typing in an input
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      if (filteredStudents.length === 0) return;
      const curStudent = filteredStudents[activeRollIndex];
      if (!curStudent) return;

      if (e.key === '1' || e.key.toLowerCase() === 'p') {
        e.preventDefault();
        handleDailyStatus(curStudent.id, 'P');
        setActiveRollIndex((prev) => Math.min(prev + 1, filteredStudents.length - 1));
      } else if (e.key === '2' || e.key.toLowerCase() === 'a') {
        e.preventDefault();
        handleDailyStatus(curStudent.id, 'A');
        setActiveRollIndex((prev) => Math.min(prev + 1, filteredStudents.length - 1));
      } else if (e.key === '3' || e.key.toLowerCase() === 'l') {
        e.preventDefault();
        handleDailyStatus(curStudent.id, 'Permitted');
        setActiveRollIndex((prev) => Math.min(prev + 1, filteredStudents.length - 1));
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveRollIndex((prev) => Math.min(prev + 1, filteredStudents.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveRollIndex((prev) => Math.max(prev - 1, 0));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [viewMode, activeRollIndex, filteredStudents, dailyRecords, currentClass.id, selectedDailyDate]);

  // Handle jump to roll number
  const handleJumpToRoll = (roll: string) => {
    const clean = roll.trim();
    if (!clean) return;
    const targetIdx = filteredStudents.findIndex(
      (s) => s.rollNumber === clean || parseInt(s.rollNumber, 10) === parseInt(clean, 10)
    );
    if (targetIdx >= 0) {
      if (pageSize < 80) {
        const targetPage = Math.floor(targetIdx / pageSize) + 1;
        setCurrentPage(targetPage);
      }
      setActiveRollIndex(targetIdx);
    }
  };

  // Paginated students for 80+ class rendering efficiency
  const totalPages = Math.max(1, Math.ceil(filteredStudents.length / pageSize));
  const paginatedStudents =
    pageSize >= 80
      ? filteredStudents
      : filteredStudents.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Reset page when class or search changes
  React.useEffect(() => {
    setCurrentPage(1);
    setActiveRollIndex(0);
  }, [currentClass.id, searchQuery, filterCondition, pageSize]);

  return (
    <div className="space-y-5 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Attendance Register
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            {currentClass.name} · {classStudents.length} students · Present, Absent &amp; Permitted tracking
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onExportMonthlyRegisterPdf(currentClass, selectedMonth)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-200 transition shadow-sm"
            title="Export official landscape Monthly Attendance Register PDF"
          >
            <Printer className="w-4 h-4 text-blue-400" />
            <span>Export Monthly PDF ({totalPages} Pages)</span>
          </button>
        </div>
      </div>

      {/* Class Selector Tabs */}
      <div className="flex flex-wrap items-center gap-2">
        {classes.map((cls) => {
          const isSelected = cls.id === currentClass.id;
          const count = students.filter((s) => s.classId === cls.id).length;
          return (
            <button
              key={cls.id}
              onClick={() => onSelectClass(cls.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 border ${
                isSelected
                  ? 'text-white border-blue-400 shadow-md ring-1 ring-blue-500/20'
                  : 'bg-slate-800/80 border-slate-700/80 text-slate-300 hover:border-slate-600'
              }`}
              style={{
                backgroundColor: isSelected ? cls.color : undefined,
              }}
            >
              <span>{cls.name}</span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-black/20">
                {count} Students
              </span>
            </button>
          );
        })}
      </div>

      {/* View Switcher & Month Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl bg-slate-800/80 border border-slate-700">
        {/* Toggle View Mode */}
        <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setViewMode('monthly_ledger')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              viewMode === 'monthly_ledger'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Monthly Master Ledger (Day 1–31)</span>
          </button>

          <button
            onClick={() => setViewMode('daily_check')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              viewMode === 'daily_check'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Daily Fast Check (80 Stud)</span>
          </button>
        </div>

        {/* Month or Date Selector */}
        {viewMode === 'monthly_ledger' ? (
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-400 hidden sm:inline">
              Select Month:
            </span>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs font-bold text-white focus:outline-none focus:border-blue-500 cursor-pointer"
            />
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-400 hidden sm:inline">
              Daily Date:
            </span>
            <input
              type="date"
              value={selectedDailyDate}
              onChange={(e) => setSelectedDailyDate(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs font-bold text-white focus:outline-none focus:border-blue-500 cursor-pointer"
            />
          </div>
        )}
      </div>

      {/* 80+ STUDENT SCALABILITY CONTROL BAR: Search, Jump to Roll #, Status Filter & Pagination */}
      <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-700 flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Left: Search input + Jump to Roll */}
        <div className="flex items-center gap-2 flex-1 min-w-[260px] max-w-md">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder={`Search ${classStudents.length} students in ${currentClass.name}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex items-center gap-1 bg-slate-800 border border-slate-700 rounded-xl px-2 py-1">
            <span className="text-[10px] text-slate-400 font-semibold">Roll #:</span>
            <input
              type="text"
              placeholder="01-80"
              value={jumpRoll}
              onChange={(e) => setJumpRoll(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleJumpToRoll(jumpRoll);
              }}
              className="w-12 text-center bg-transparent text-xs font-bold text-white focus:outline-none"
            />
            <button
              onClick={() => handleJumpToRoll(jumpRoll)}
              className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-600 text-white hover:bg-blue-500"
            >
              Go
            </button>
          </div>
        </div>

        {/* Center: Filter Pills */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setFilterCondition('all')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
              filterCondition === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            All ({classStudents.length})
          </button>
          <button
            onClick={() => setFilterCondition('absent')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
              filterCondition === 'absent'
                ? 'bg-rose-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:text-rose-300'
            }`}
          >
            Has Absence
          </button>
          <button
            onClick={() => setFilterCondition('low_attendance')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
              filterCondition === 'low_attendance'
                ? 'bg-amber-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:text-amber-300'
            }`}
          >
            &lt; 75% Attendance
          </button>
        </div>

        {/* Right: Page Size & Pagination */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <span className="text-[11px] text-slate-400">View:</span>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white font-semibold focus:outline-none"
            >
              <option value={25}>25 / page</option>
              <option value={50}>50 / page</option>
              <option value={80}>All 80 Students</option>
            </select>
          </div>

          {pageSize < 80 && totalPages > 1 && (
            <div className="flex items-center gap-1">
              <button
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                className="p-1 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:text-white disabled:opacity-40"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="text-[11px] font-bold text-slate-300 px-1">
                {currentPage} / {totalPages}
              </span>
              <button
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                className="p-1 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:text-white disabled:opacity-40"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 3-State Legend & Batch Helpers */}
      <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <span className="font-bold text-slate-300">3 Attendance States:</span>
          <span className="flex items-center gap-1.5 text-emerald-400 font-bold px-2 py-0.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
            <span>P</span>
            <span className="font-medium text-slate-400 text-[10px]">= Present</span>
          </span>
          <span className="flex items-center gap-1.5 text-rose-400 font-bold px-2 py-0.5 rounded-lg bg-rose-500/10 border border-rose-500/30">
            <span>A</span>
            <span className="font-medium text-slate-400 text-[10px]">= Absent</span>
          </span>
          <span className="flex items-center gap-1.5 text-blue-400 font-bold px-2 py-0.5 rounded-lg bg-blue-500/10 border border-blue-500/30">
            <span>Permitted</span>
            <span className="font-medium text-slate-400 text-[10px]">= Authorized / Excused</span>
          </span>
        </div>

        <div className="text-[11px] text-slate-400 flex items-center gap-2">
          <span>💡 Tip: Click any day cell to cycle:</span>
          <span className="font-mono text-slate-300 bg-slate-800 px-1.5 py-0.5 rounded">
            Empty → P → A → Permitted → Empty
          </span>
        </div>
      </div>

      {/* VIEW 1: MONTHLY MASTER LEDGER (DAYS 1 TO END OF MONTH + CONTINUOUS ASSESSMENTS) */}
      {viewMode === 'monthly_ledger' && (
        <div className="rounded-2xl border border-slate-700 bg-slate-800/80 overflow-hidden shadow-sm">
          {/* Scrollable Container */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-900/95 text-slate-300 border-b border-slate-700">
                  {/* Fixed Student Name Column */}
                  <th className="p-3.5 sticky left-0 bg-slate-900 z-20 font-bold min-w-[160px] border-r border-slate-800 shadow-[2px_0_5px_rgba(0,0,0,0.3)]">
                    Student ({monthDisplayTitle})
                  </th>

                  {/* Day Columns 1 to daysInMonth */}
                  {Array.from({ length: daysInMonth }, (_, idx) => {
                    const dayNum = idx + 1;
                    const dateIter = new Date(yearNum, monthNum - 1, dayNum);
                    const dayOfWeek = dateIter.toLocaleDateString('en-US', { weekday: 'narrow' });
                    const isWeekend = dateIter.getDay() === 0 || dateIter.getDay() === 6;
                    const dayIso = `${selectedMonth}-${String(dayNum).padStart(2, '0')}`;
                    const isToday = dayIso === todayIso;

                    return (
                      <th
                        key={dayNum}
                        onClick={() => handleFillAllDayPresent(dayNum)}
                        className={`p-1 text-center font-bold min-w-[32px] max-w-[36px] border-r border-slate-800/80 cursor-pointer select-none transition ${
                          isToday
                            ? 'bg-blue-900/40 text-blue-300'
                            : isWeekend
                            ? 'bg-slate-950/40 text-slate-500'
                            : 'hover:bg-slate-800/60'
                        }`}
                        title={`Click to fill Day ${dayNum} with P`}
                      >
                        <div className="text-[9px] uppercase opacity-70">{dayOfWeek}</div>
                        <div className={`text-xs ${isToday ? 'font-black underline' : ''}`}>
                          {dayNum}
                        </div>
                      </th>
                    );
                  })}

                  {/* Assessment & Observation Columns */}
                  <th className="p-3 font-bold text-center min-w-[90px] border-l-2 border-slate-700 bg-slate-900/90 text-emerald-400">
                    Attendance
                  </th>
                  <th className="p-3 font-bold text-center min-w-[90px] border-l border-slate-800 bg-slate-900/90 text-blue-300">
                    Monthly Exam
                  </th>
                  <th className="p-3 font-bold text-center min-w-[80px] border-l border-slate-800 bg-slate-900/90 text-amber-300">
                    H.W.
                  </th>
                  <th className="p-3 font-bold text-center min-w-[90px] border-l border-slate-800 bg-slate-900/90 text-purple-300">
                    Oral Part.
                  </th>
                  <th className="p-3 font-bold min-w-[220px] border-l border-slate-800 bg-slate-900/90 text-slate-200">
                    Teacher Notes & Observations
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-700/60 text-slate-200">
                {paginatedStudents.map((student) => {
                  // Count student's P, A, Permitted for this month
                  let pCount = 0;
                  let aCount = 0;
                  let permCount = 0;
                  let recordedDays = 0;

                  for (let d = 1; d <= daysInMonth; d++) {
                    const dStr = `${selectedMonth}-${String(d).padStart(2, '0')}`;
                    const st = getNormalizedStatus(attendanceByDate[dStr]?.[student.id]);
                    if (st) {
                      recordedDays++;
                      if (st === 'P') pCount++;
                      else if (st === 'A') aCount++;
                      else if (st === 'Permitted') permCount++;
                    }
                  }

                  const attRate =
                    recordedDays > 0 ? Math.round((pCount / recordedDays) * 100) : 100;

                  // Find monthly assessment record
                  const assessment = monthlyAssessments.find(
                    (m) =>
                      m.classId === currentClass.id &&
                      m.studentId === student.id &&
                      m.month === selectedMonth
                  );

                  return (
                    <tr key={student.id} className="hover:bg-slate-750 transition">
                      {/* Sticky Student Name */}
                      <td className="p-3 sticky left-0 bg-slate-800/95 z-10 border-r border-slate-700/60 shadow-[2px_0_5px_rgba(0,0,0,0.3)]">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-bold text-slate-400">
                            #{student.rollNumber}
                          </span>
                          <span className="font-semibold text-white truncate max-w-[130px]">
                            {student.name}
                          </span>
                        </div>
                      </td>

                      {/* Day Cells 1 to daysInMonth */}
                      {Array.from({ length: daysInMonth }, (_, idx) => {
                        const dayNum = idx + 1;
                        const dayIso = `${selectedMonth}-${String(dayNum).padStart(2, '0')}`;
                        const isToday = dayIso === todayIso;
                        const status = getNormalizedStatus(
                          attendanceByDate[dayIso]?.[student.id]
                        );

                        return (
                          <td
                            key={dayNum}
                            onClick={() => handleCycleDayStatus(student.id, dayNum)}
                            className={`p-1 text-center border-r border-slate-800/70 cursor-pointer select-none transition ${
                              isToday ? 'bg-blue-950/20' : 'hover:bg-slate-700/60'
                            }`}
                          >
                            {status === 'P' && (
                              <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-emerald-500/20 text-emerald-400 font-black text-xs border border-emerald-500/40">
                                P
                              </span>
                            )}
                            {status === 'A' && (
                              <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-rose-500/20 text-rose-400 font-black text-xs border border-rose-500/40">
                                A
                              </span>
                            )}
                            {status === 'Permitted' && (
                              <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-blue-500/20 text-blue-400 font-bold text-[10px] border border-blue-500/40" title="Permitted">
                                L
                              </span>
                            )}
                            {!status && (
                              <span className="text-slate-600 text-xs">·</span>
                            )}
                          </td>
                        );
                      })}

                      {/* Continuous Assessment Columns */}
                      {/* Attendance Summary */}
                      <td className="p-2 text-center border-l-2 border-slate-700">
                        <div className="font-bold text-emerald-400 text-xs">
                          {pCount} / {daysInMonth}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {attRate}%
                        </div>
                      </td>

                      {/* Monthly Exam */}
                      <td className="p-2 text-center border-l border-slate-800">
                        <input
                          type="number"
                          placeholder="-"
                          value={assessment?.monthlyExamScore ?? ''}
                          onChange={(e) => {
                            const val = e.target.value === '' ? undefined : Number(e.target.value);
                            onSaveMonthlyAssessment(currentClass.id, student.id, selectedMonth, {
                              monthlyExamScore: val,
                            });
                          }}
                          className="w-14 text-center py-1 bg-slate-900 border border-slate-700 rounded-lg text-xs font-bold text-blue-300 focus:outline-none focus:border-blue-500"
                        />
                      </td>

                      {/* H.W. (Homework) */}
                      <td className="p-2 text-center border-l border-slate-800">
                        <input
                          type="number"
                          placeholder="-"
                          value={assessment?.hwScore ?? ''}
                          onChange={(e) => {
                            const val = e.target.value === '' ? undefined : Number(e.target.value);
                            onSaveMonthlyAssessment(currentClass.id, student.id, selectedMonth, {
                              hwScore: val,
                            });
                          }}
                          className="w-12 text-center py-1 bg-slate-900 border border-slate-700 rounded-lg text-xs font-bold text-amber-300 focus:outline-none focus:border-amber-500"
                        />
                      </td>

                      {/* Oral Participation */}
                      <td className="p-2 text-center border-l border-slate-800">
                        <input
                          type="number"
                          max="5"
                          min="0"
                          placeholder="-"
                          value={assessment?.oralParticipationScore ?? ''}
                          onChange={(e) => {
                            const val = e.target.value === '' ? undefined : Number(e.target.value);
                            onSaveMonthlyAssessment(currentClass.id, student.id, selectedMonth, {
                              oralParticipationScore: val,
                            });
                          }}
                          className="w-12 text-center py-1 bg-slate-900 border border-slate-700 rounded-lg text-xs font-bold text-purple-300 focus:outline-none focus:border-purple-500"
                        />
                      </td>

                      {/* Monthly Observation Notes */}
                      <td className="p-2 border-l border-slate-800">
                        <input
                          type="text"
                          placeholder="Teacher observation note for this month..."
                          value={assessment?.notes ?? ''}
                          onChange={(e) => {
                            onSaveMonthlyAssessment(currentClass.id, student.id, selectedMonth, {
                              notes: e.target.value,
                            });
                          }}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-blue-500"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 2: DAILY FAST CHECK (SINGLE DAY FOCUS) FOR 80 STUDENTS */}
      {viewMode === 'daily_check' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-2xl bg-slate-800/80 border border-slate-700">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
                <Calendar className="w-4 h-4 text-blue-400" />
                <span>Roll Call: {selectedDailyDate} ({classStudents.length} Students)</span>
              </div>
              <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded-lg border border-slate-800 text-[11px]">
                <button
                  onClick={() => setIsCompactDaily(true)}
                  className={`px-2 py-0.5 rounded font-bold transition ${
                    isCompactDaily ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Compact Roster
                </button>
                <button
                  onClick={() => setIsCompactDaily(false)}
                  className={`px-2 py-0.5 rounded font-bold transition ${
                    !isCompactDaily ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Cards
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-400 hidden lg:inline">
                ⌨️ Hotkeys: [1/P] Present • [2/A] Absent • [3/L] Permitted • [↑/↓] Row
              </span>
              <button
                onClick={handleDailyMarkAllPresent}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white transition active:scale-95 shadow-sm"
              >
                <Check className="w-4 h-4" />
                <span>Mark All ({classStudents.length}) Present</span>
              </button>
            </div>
          </div>

          {/* COMPACT VIEW FOR FAST 80-STUDENT ROLL CALL */}
          {isCompactDaily ? (
            <div className="rounded-2xl border border-slate-700 bg-slate-800/80 overflow-hidden shadow-sm">
              <div className="max-h-[640px] overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="sticky top-0 bg-slate-900 z-10 border-b border-slate-700 text-slate-300">
                    <tr>
                      <th className="p-2.5 text-center w-12">Roll</th>
                      <th className="p-2.5">Student Name</th>
                      <th className="p-2.5 hidden sm:table-cell">Accommodations</th>
                      <th className="p-2.5 text-center">Status</th>
                      <th className="p-2.5 text-right pr-4">Quick Mark</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/60">
                    {filteredStudents.map((student, idx) => {
                      const currentSt = getNormalizedStatus(dailyRecords[student.id]) || 'P';
                      const isFocused = idx === activeRollIndex;

                      return (
                        <tr
                          key={student.id}
                          onClick={() => setActiveRollIndex(idx)}
                          className={`transition cursor-pointer ${
                            isFocused
                              ? 'bg-blue-600/15 border-l-4 border-blue-500 text-white'
                              : 'hover:bg-slate-750 text-slate-200'
                          }`}
                        >
                          <td className="p-2 text-center font-bold text-slate-400">
                            #{student.rollNumber}
                          </td>
                          <td className="p-2 font-semibold">
                            <div className="flex items-center gap-2">
                              <span>{student.name}</span>
                              {isFocused && (
                                <span className="text-[9px] px-1 py-0.2 rounded bg-blue-500/30 text-blue-300 font-bold uppercase">
                                  Current
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="p-2 text-[11px] text-amber-300 hidden sm:table-cell truncate max-w-[180px]">
                            {student.accommodations || '—'}
                          </td>
                          <td className="p-2 text-center">
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                currentSt === 'P'
                                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                  : currentSt === 'A'
                                  ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                  : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                              }`}
                            >
                              {currentSt === 'P' ? 'Present' : currentSt === 'A' ? 'Absent' : 'Permitted'}
                            </span>
                          </td>
                          <td className="p-2 text-right pr-4">
                            <div className="inline-flex items-center gap-1">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDailyStatus(student.id, 'P');
                                  setActiveRollIndex(Math.min(idx + 1, filteredStudents.length - 1));
                                }}
                                className={`w-7 h-7 rounded-lg text-xs font-black transition ${
                                  currentSt === 'P'
                                    ? 'bg-emerald-600 text-white shadow-sm'
                                    : 'bg-slate-900 text-slate-400 hover:text-emerald-400 border border-slate-700'
                                }`}
                                title="Mark Present [1]"
                              >
                                P
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDailyStatus(student.id, 'A');
                                  setActiveRollIndex(Math.min(idx + 1, filteredStudents.length - 1));
                                }}
                                className={`w-7 h-7 rounded-lg text-xs font-black transition ${
                                  currentSt === 'A'
                                    ? 'bg-rose-600 text-white shadow-sm'
                                    : 'bg-slate-900 text-slate-400 hover:text-rose-400 border border-slate-700'
                                }`}
                                title="Mark Absent [2]"
                              >
                                A
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDailyStatus(student.id, 'Permitted');
                                  setActiveRollIndex(Math.min(idx + 1, filteredStudents.length - 1));
                                }}
                                className={`w-7 h-7 rounded-lg text-xs font-black transition ${
                                  currentSt === 'Permitted'
                                    ? 'bg-blue-600 text-white shadow-sm'
                                    : 'bg-slate-900 text-slate-400 hover:text-blue-400 border border-slate-700'
                                }`}
                                title="Mark Permitted [3]"
                              >
                                L
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* CARD VIEW */
            <div className="rounded-2xl border border-slate-700 bg-slate-800/80 divide-y divide-slate-700/60 overflow-hidden shadow-sm max-h-[640px] overflow-y-auto">
              {filteredStudents.map((student) => {
                const currentSt = getNormalizedStatus(dailyRecords[student.id]) || 'P';

                return (
                  <div
                    key={student.id}
                    className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-750 transition"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold text-slate-400">
                        #{student.rollNumber}
                      </span>
                      <div>
                        <h4 className="text-sm font-semibold text-white">
                          {student.name}
                        </h4>
                        {student.accommodations && (
                          <p className="text-[11px] text-amber-300">
                            {student.accommodations}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* 3-State Buttons: Present (P), Absent (A), Permitted */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleDailyStatus(student.id, 'P')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                          currentSt === 'P'
                            ? 'bg-emerald-600 text-white shadow-sm ring-1 ring-emerald-400/40'
                            : 'bg-slate-900 border border-slate-700 text-slate-400 hover:text-white'
                        }`}
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>(P) Present</span>
                      </button>

                      <button
                        onClick={() => handleDailyStatus(student.id, 'A')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                          currentSt === 'A'
                            ? 'bg-rose-600 text-white shadow-sm ring-1 ring-rose-400/40'
                            : 'bg-slate-900 border border-slate-700 text-slate-400 hover:text-white'
                        }`}
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>(A) Absent</span>
                      </button>

                      <button
                        onClick={() => handleDailyStatus(student.id, 'Permitted')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                          currentSt === 'Permitted'
                            ? 'bg-blue-600 text-white shadow-sm ring-1 ring-blue-400/40'
                            : 'bg-slate-900 border border-slate-700 text-slate-400 hover:text-white'
                        }`}
                      >
                        <ShieldAlert className="w-3.5 h-3.5" />
                        <span>Permitted</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
