import React, { useState } from 'react';
import {
  Users,
  Search,
  Award,
  BookOpen,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Printer,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  FileText,
  Save,
  Check,
  TrendingUp,
  LayoutGrid,
  UserCheck,
  Target,
  MessageSquare,
  Bot,
  HelpCircle,
  X,
  Plus,
} from 'lucide-react';
import {
  Student,
  ClassGroup,
  Assignment,
  GradeRecord,
  LessonPlan,
  StudentLessonProgress,
  StudentCumulativeProgress,
  AssignmentCompletionStatus,
  LessonMasteryStatus,
  AttendanceRecord,
} from '../../types';

interface StudentProgressTrackingViewProps {
  classes: ClassGroup[];
  students: Student[];
  assignments: Assignment[];
  grades: GradeRecord[];
  lessonPlans: LessonPlan[];
  studentLessonProgress: StudentLessonProgress[];
  cumulativeProgress: StudentCumulativeProgress[];
  attendanceRecords: AttendanceRecord[];
  activeClassId: string;
  onSelectClass: (classId: string) => void;
  onSaveAssignmentProgress: (
    assignmentId: string,
    studentId: string,
    score: number,
    status: AssignmentCompletionStatus,
    feedback?: string
  ) => void;
  onSaveLessonProgress: (
    lessonId: string,
    studentId: string,
    status: LessonMasteryStatus,
    exitTicketScore?: number,
    exitTicketCompleted?: boolean,
    notes?: string
  ) => void;
  onSaveCumulativeProgress: (
    studentId: string,
    updates: Partial<StudentCumulativeProgress>
  ) => void;
  onExportStudentPdf: (
    student: Student,
    classGroup: ClassGroup,
    customNote?: string
  ) => void;
  focusedStudentId?: string;
  focusToken?: number;
}

export const StudentProgressTrackingView: React.FC<StudentProgressTrackingViewProps> = ({
  classes,
  students,
  assignments,
  grades,
  lessonPlans,
  studentLessonProgress,
  cumulativeProgress,
  attendanceRecords,
  activeClassId,
  onSelectClass,
  onSaveAssignmentProgress,
  onSaveLessonProgress,
  onSaveCumulativeProgress,
  onExportStudentPdf,
  focusedStudentId,
  focusToken,
}) => {
  const currentClass = classes.find((c) => c.id === activeClassId) || classes[0];
  const classStudents = students.filter((s) => s.classId === currentClass.id);

  // View mode: 'profile' | 'matrix'
  const [viewMode, setViewMode] = useState<'profile' | 'matrix'>('profile');

  // Search & Scalability state for 80+ students
  const [searchQuery, setSearchQuery] = useState('');
  const [studentFilter, setStudentFilter] = useState<'all' | 'needs_support' | 'high_achiever'>('all');
  const [selectedStudentId, setSelectedStudentId] = useState<string>(
    classStudents[0]?.id || ''
  );
  const [matrixPageSize, setMatrixPageSize] = useState<number>(25);
  const [matrixCurrentPage, setMatrixCurrentPage] = useState<number>(1);

  // Profile inner tab: 'assignments' | 'lessons' | 'cumulative'
  const [activeProfileTab, setActiveProfileTab] = useState<'assignments' | 'lessons' | 'cumulative'>('assignments');

  // Local draft states for instant responsive typing
  const [draftScores, setDraftScores] = useState<Record<string, number>>({});
  const [draftStatuses, setDraftStatuses] = useState<Record<string, AssignmentCompletionStatus>>({});
  const [draftFeedbacks, setDraftFeedbacks] = useState<Record<string, string>>({});

  const [draftLessonStatuses, setDraftLessonStatuses] = useState<Record<string, LessonMasteryStatus>>({});
  const [draftLessonNotes, setDraftLessonNotes] = useState<Record<string, string>>({});
  const [draftExitScores, setDraftExitScores] = useState<Record<string, number>>({});

  const [savedFeedbackToast, setSavedFeedbackToast] = useState<string | null>(null);

  // AI Parent Note Drafter state
  const [showAiDraftModal, setShowAiDraftModal] = useState(false);
  const [aiDraftContent, setAiDraftContent] = useState<{ subject: string; body: string } | null>(null);
  const [isAiDraftLoading, setIsAiDraftLoading] = useState(false);

  // Filter students by search and condition
  const filteredStudents = classStudents.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.rollNumber.includes(searchQuery);
    if (!matchesSearch) return false;

    if (studentFilter === 'all') return true;

    // Calculate this student's grade average
    const sGrades = grades.filter((g) => g.studentId === s.id);
    let earned = 0;
    let possible = 0;
    sGrades.forEach((g) => {
      const asg = assignments.find((a) => a.id === g.assignmentId);
      if (asg) {
        earned += g.score;
        possible += asg.maxPoints;
      }
    });
    const avg = possible > 0 ? (earned / possible) * 100 : 85;

    if (studentFilter === 'needs_support') return avg < 75;
    if (studentFilter === 'high_achiever') return avg >= 90;
    return true;
  });

  // Focus student when navigated via global search
  React.useEffect(() => {
    if (!focusedStudentId) return;
    const target = students.find((s) => s.id === focusedStudentId);
    if (target) {
      setViewMode('profile');
      setSearchQuery('');
      setStudentFilter('all');
      setSelectedStudentId(target.id);
    }
  }, [focusedStudentId, focusToken, students]);

  // When class changes, ensure selectedStudentId points to valid student
  React.useEffect(() => {
    const list = students.filter((s) => s.classId === currentClass.id);
    if (list.length > 0 && (!selectedStudentId || !list.some((s) => s.id === selectedStudentId))) {
      setSelectedStudentId(list[0].id);
    }
  }, [currentClass.id, students, selectedStudentId]);

  const selectedStudent =
    students.find((s) => s.id === selectedStudentId) || filteredStudents[0] || classStudents[0];

  // Sequential student navigation helpers
  const currentStudentIdx = filteredStudents.findIndex((s) => s.id === selectedStudent?.id);

  const handleNextStudent = () => {
    if (currentStudentIdx >= 0 && currentStudentIdx < filteredStudents.length - 1) {
      setSelectedStudentId(filteredStudents[currentStudentIdx + 1].id);
    }
  };

  const handlePrevStudent = () => {
    if (currentStudentIdx > 0) {
      setSelectedStudentId(filteredStudents[currentStudentIdx - 1].id);
    }
  };

  // Class assignments & lessons
  const classAssignments = assignments.filter(
    (a) => a.classId === currentClass.id || a.classId === `all-${currentClass.grade}` || a.classId === 'all'
  );

  const classLessons = lessonPlans.filter(
    (l) => l.classId === currentClass.id || l.grade === currentClass.grade
  );

  // Calculate stats for current selected student
  const studentGrades = selectedStudent
    ? grades.filter((g) => g.studentId === selectedStudent.id)
    : [];

  let earnedScore = 0;
  let possibleScore = 0;
  let completedAssignmentsCount = 0;

  classAssignments.forEach((asg) => {
    const g = studentGrades.find((gr) => gr.assignmentId === asg.id);
    if (g && typeof g.score === 'number') {
      earnedScore += g.score;
      possibleScore += asg.maxPoints;
      const st = g.completionStatus || (g.score > 0 ? 'completed' : 'in_progress');
      if (st === 'completed') completedAssignmentsCount++;
    }
  });

  const assignmentCompletionRate =
    classAssignments.length > 0
      ? Math.round((completedAssignmentsCount / classAssignments.length) * 100)
      : 100;

  const averageScorePercent =
    possibleScore > 0 ? Math.round((earnedScore / possibleScore) * 100) : 92;

  // Student lesson mastery calculation
  const sLessonProgressList = selectedStudent
    ? studentLessonProgress.filter((lp) => lp.studentId === selectedStudent.id)
    : [];

  const masteredLessonsCount = sLessonProgressList.filter((lp) => lp.status === 'mastered').length;
  const lessonMasteryRate =
    classLessons.length > 0
      ? Math.round((masteredLessonsCount / classLessons.length) * 100)
      : 80;

  // Cumulative record for student
  const cumulative = selectedStudent
    ? cumulativeProgress.find((c) => c.studentId === selectedStudent.id)
    : undefined;

  // Attendance for student
  let presentDays = 0;
  let totalDays = 0;
  attendanceRecords.forEach((att) => {
    if (selectedStudent && att.records[selectedStudent.id]) {
      totalDays++;
      const st = att.records[selectedStudent.id];
      if (st === 'present' || st === 'P') presentDays++;
    }
  });
  const attendanceRate = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 100;

  // Handlers for Assignment Updates with optional Sequential Auto-Advance
  const handleSaveSingleAssignment = (assignmentId: string, autoAdvance: boolean = false) => {
    if (!selectedStudent) return;
    const existing = studentGrades.find((g) => g.assignmentId === assignmentId);
    const score = draftScores[assignmentId] !== undefined ? draftScores[assignmentId] : (existing?.score ?? 0);
    const status = draftStatuses[assignmentId] || existing?.completionStatus || 'completed';
    const feedback = draftFeedbacks[assignmentId] !== undefined ? draftFeedbacks[assignmentId] : (existing?.feedback || '');

    onSaveAssignmentProgress(assignmentId, selectedStudent.id, score, status, feedback);

    if (autoAdvance) {
      if (currentStudentIdx < filteredStudents.length - 1) {
        const nextStud = filteredStudents[currentStudentIdx + 1];
        setSelectedStudentId(nextStud.id);
        setSavedFeedbackToast(`Saved for #${selectedStudent.rollNumber} ${selectedStudent.name} ➔ Advanced to #${nextStud.rollNumber}`);
      } else {
        setSavedFeedbackToast(`Saved! Completed all ${filteredStudents.length} students!`);
      }
    } else {
      setSavedFeedbackToast(`Saved progress for ${selectedStudent.name}`);
    }
    setTimeout(() => setSavedFeedbackToast(null), 2500);
  };

  // Handlers for Lesson Updates with optional Sequential Auto-Advance
  const handleSaveSingleLesson = (lessonId: string, autoAdvance: boolean = false) => {
    if (!selectedStudent) return;
    const existing = sLessonProgressList.find((lp) => lp.lessonId === lessonId);
    const status = draftLessonStatuses[lessonId] || existing?.status || 'in_progress';
    const notes = draftLessonNotes[lessonId] !== undefined ? draftLessonNotes[lessonId] : (existing?.notes || '');
    const exitScore = draftExitScores[lessonId] !== undefined ? draftExitScores[lessonId] : (existing?.exitTicketScore ?? 5);

    onSaveLessonProgress(lessonId, selectedStudent.id, status, exitScore, true, notes);

    if (autoAdvance) {
      if (currentStudentIdx < filteredStudents.length - 1) {
        const nextStud = filteredStudents[currentStudentIdx + 1];
        setSelectedStudentId(nextStud.id);
        setSavedFeedbackToast(`Saved for #${selectedStudent.rollNumber} ➔ Advanced to #${nextStud.rollNumber}`);
      } else {
        setSavedFeedbackToast(`Saved! Completed all ${filteredStudents.length} students!`);
      }
    } else {
      setSavedFeedbackToast(`Saved lesson progress for ${selectedStudent.name}`);
    }
    setTimeout(() => setSavedFeedbackToast(null), 2500);
  };

  // AI Parent Summary Drafter
  const handleGenerateAiParentNote = async () => {
    if (!selectedStudent) return;
    setIsAiDraftLoading(true);
    setShowAiDraftModal(true);

    try {
      const res = await fetch('/api/ai/parent-note', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentName: selectedStudent.name,
          gradeClass: currentClass.name,
          attendanceRate,
          avgScore: averageScorePercent,
          recentNotes: cumulative?.generalNotes || 'Active participation in ELA and consistent assignments.',
        }),
      });

      const json = await res.json();
      if (json.data) {
        setAiDraftContent(json.data);
      }
    } catch (e) {
      // Offline fallback
      setAiDraftContent({
        subject: `English Class Progress Update: ${selectedStudent.name}`,
        body: `Dear Family,\n\nI am pleased to share an update on ${selectedStudent.name}'s progress in ${currentClass.name} (${currentClass.subject}).\n\nCurrently, ${selectedStudent.name} holds an average score of ${averageScorePercent}% with an assignment completion rate of ${assignmentCompletionRate}%. In class, ${selectedStudent.name} actively contributes to reading discussions.\n\nPlease let me know if you would like to schedule a conference.\n\nWarm regards,\nEnglish Teacher`,
      });
    } finally {
      setIsAiDraftLoading(false);
    }
  };

  return (
    <div className="space-y-5 pb-12">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <span>Student Progress Tracking System</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Track assignment scores, completion status, lesson comprehension & student-specific feedback
          </p>
        </div>

        {selectedStudent && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleGenerateAiParentNote}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-purple-600/90 hover:bg-purple-600 text-xs font-bold text-white transition active:scale-95 shadow-sm"
              title="Draft personalized feedback note for parents"
            >
              <Sparkles className="w-4 h-4 text-purple-200" />
              <span>Draft Parent Note</span>
            </button>
            <button
              onClick={() => onExportStudentPdf(selectedStudent, currentClass, cumulative?.generalNotes)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white transition active:scale-95 shadow-sm"
            >
              <Printer className="w-4 h-4" />
              <span>Export Progress PDF</span>
            </button>
          </div>
        )}
      </div>

      {/* Class Switcher Tabs (6A, 6B, 7A, 7B) */}
      <div className="flex flex-wrap items-center gap-2">
        {classes.map((cls) => {
          const isSelected = cls.id === currentClass.id;
          const classStudentsCount = students.filter((s) => s.classId === cls.id).length;
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
              <span className="text-[10px] font-normal opacity-80">
                ({classStudentsCount} students)
              </span>
            </button>
          );
        })}
      </div>

      {/* Control Bar: View Toggle (Profile Deep-Dive vs Matrix) */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl bg-slate-800/80 border border-slate-700">
        <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setViewMode('profile')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              viewMode === 'profile'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            <span>Individual Student Progress Console</span>
          </button>
          <button
            onClick={() => setViewMode('matrix')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              viewMode === 'matrix'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <LayoutGrid className="w-4 h-4" />
            <span>Full Class Progress Matrix ({currentClass.name})</span>
          </button>
        </div>

        {/* Saved Feedback Toast Notification */}
        {savedFeedbackToast && (
          <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-bold px-3 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 animate-fade-in">
            <Check className="w-3.5 h-3.5" />
            <span>{savedFeedbackToast}</span>
          </div>
        )}
      </div>

      {/* VIEW 1: INDIVIDUAL STUDENT PROGRESS CONSOLE (DEEP DIVE) */}
      {viewMode === 'profile' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Left Column: Student List (4 Cols) */}
          <div className="lg:col-span-4 space-y-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                placeholder={`Search ${classStudents.length} students...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Filter Pills for 80+ Student Roster */}
            <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-900 border border-slate-800 text-[11px]">
              <button
                onClick={() => setStudentFilter('all')}
                className={`flex-1 py-1 rounded-lg font-bold transition text-center ${
                  studentFilter === 'all'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                All ({classStudents.length})
              </button>
              <button
                onClick={() => setStudentFilter('needs_support')}
                className={`flex-1 py-1 rounded-lg font-bold transition text-center ${
                  studentFilter === 'needs_support'
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                &lt; 75%
              </button>
              <button
                onClick={() => setStudentFilter('high_achiever')}
                className={`flex-1 py-1 rounded-lg font-bold transition text-center ${
                  studentFilter === 'high_achiever'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                &ge; 90%
              </button>
            </div>

            <div className="rounded-2xl border border-slate-700 bg-slate-800/80 divide-y divide-slate-700/60 max-h-[640px] overflow-y-auto shadow-sm">
              {filteredStudents.map((student) => {
                const isSelected = selectedStudent?.id === student.id;

                // Student completion rate snippet
                const sGrades = grades.filter((g) => g.studentId === student.id);
                const comp = sGrades.filter(
                  (g) => g.completionStatus === 'completed' || (!g.completionStatus && g.score > 0)
                ).length;
                const totalAsg = classAssignments.length;

                return (
                  <button
                    key={student.id}
                    onClick={() => setSelectedStudentId(student.id)}
                    className={`w-full p-3 text-left transition flex items-center justify-between ${
                      isSelected
                        ? 'bg-blue-600/20 border-l-4 border-blue-500 text-white'
                        : 'hover:bg-slate-750 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 pr-2">
                      <div
                        className="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs text-white shrink-0 shadow-sm"
                        style={{ backgroundColor: student.avatarColor || '#3b82f6' }}
                      >
                        {student.name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-white truncate">
                          {student.name}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          Roll #{student.rollNumber} · {comp}/{totalAsg} Tasks
                        </p>
                      </div>
                    </div>
                    <ChevronRight className={`w-4 h-4 ${isSelected ? 'text-blue-400' : 'text-slate-600'}`} />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Column: Deep-Dive Student Progress Console (8 Cols) */}
          <div className="lg:col-span-8 space-y-4">
            {selectedStudent ? (
              <div className="space-y-4">
                {/* SEQUENTIAL 80-STUDENT NAVIGATION & FAST SELECTOR */}
                <div className="flex items-center justify-between p-2.5 rounded-2xl bg-slate-800/90 border border-slate-700 shadow-sm text-xs">
                  <button
                    disabled={currentStudentIdx <= 0}
                    onClick={handlePrevStudent}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs font-bold text-slate-300 hover:text-white disabled:opacity-30 transition"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Prev Student</span>
                  </button>

                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-slate-400 font-bold hidden md:inline">
                      Student {currentStudentIdx + 1} of {filteredStudents.length}:
                    </span>
                    <select
                      value={selectedStudent.id}
                      onChange={(e) => setSelectedStudentId(e.target.value)}
                      className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs font-black text-white focus:outline-none focus:border-blue-500 cursor-pointer max-w-[240px]"
                    >
                      {filteredStudents.map((s) => (
                        <option key={s.id} value={s.id}>
                          #{s.rollNumber} - {s.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    disabled={currentStudentIdx >= filteredStudents.length - 1}
                    onClick={handleNextStudent}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white disabled:opacity-30 transition shadow-sm"
                  >
                    <span className="hidden sm:inline">Next Student</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Student Header Card & KPI Metrics */}
                <div className="rounded-2xl border border-slate-700 bg-slate-800/90 p-5 shadow-sm space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg text-white shadow-md"
                        style={{ backgroundColor: selectedStudent.avatarColor || '#3b82f6' }}
                      >
                        {selectedStudent.name.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-bold text-white">
                            {selectedStudent.name}
                          </h3>
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-900 text-slate-300 border border-slate-700">
                            Roll #{selectedStudent.rollNumber}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {currentClass.name} · Parent: {selectedStudent.guardianName || 'N/A'} ({selectedStudent.guardianContact || 'N/A'})
                        </p>
                      </div>
                    </div>
                  </div>

                  {selectedStudent.accommodations && (
                    <div className="p-2.5 rounded-xl bg-amber-950/30 border border-amber-500/30 text-xs text-amber-200">
                      <span className="font-bold">Learning Accommodations: </span>
                      {selectedStudent.accommodations}
                    </div>
                  )}

                  {/* 4 Summary Performance KPIs */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center">
                    <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-700/60">
                      <span className="text-[10px] text-slate-400 uppercase font-semibold">
                        Grade Average
                      </span>
                      <p className="text-lg font-black text-blue-400 mt-0.5">
                        {averageScorePercent}%
                      </p>
                      <span className="text-[10px] text-slate-400">
                        {averageScorePercent >= 90 ? 'Grade A' : averageScorePercent >= 80 ? 'Grade B' : 'Grade C'}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-700/60">
                      <span className="text-[10px] text-slate-400 uppercase font-semibold">
                        Assignments Done
                      </span>
                      <p className="text-lg font-black text-emerald-400 mt-0.5">
                        {assignmentCompletionRate}%
                      </p>
                      <span className="text-[10px] text-slate-400">
                        {completedAssignmentsCount} of {classAssignments.length}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-700/60">
                      <span className="text-[10px] text-slate-400 uppercase font-semibold">
                        Lesson Mastery
                      </span>
                      <p className="text-lg font-black text-purple-400 mt-0.5">
                        {lessonMasteryRate}%
                      </p>
                      <span className="text-[10px] text-slate-400">
                        {masteredLessonsCount} Mastered
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-700/60">
                      <span className="text-[10px] text-slate-400 uppercase font-semibold">
                        Attendance
                      </span>
                      <p className="text-lg font-black text-white mt-0.5">
                        {attendanceRate}%
                      </p>
                      <span className="text-[10px] text-emerald-400 font-medium">
                        {presentDays}/{totalDays} Present
                      </span>
                    </div>
                  </div>
                </div>

                {/* Progress Navigation Tabs */}
                <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-900 border border-slate-800 text-xs">
                  <button
                    onClick={() => setActiveProfileTab('assignments')}
                    className={`flex-1 py-1.5 rounded-lg font-bold transition text-center flex items-center justify-center gap-1.5 ${
                      activeProfileTab === 'assignments'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Assignment Scores & Feedback ({classAssignments.length})</span>
                  </button>

                  <button
                    onClick={() => setActiveProfileTab('lessons')}
                    className={`flex-1 py-1.5 rounded-lg font-bold transition text-center flex items-center justify-center gap-1.5 ${
                      activeProfileTab === 'lessons'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>Lesson Completion & Mastery ({classLessons.length})</span>
                  </button>

                  <button
                    onClick={() => setActiveProfileTab('cumulative')}
                    className={`flex-1 py-1.5 rounded-lg font-bold transition text-center flex items-center justify-center gap-1.5 ${
                      activeProfileTab === 'cumulative'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Target className="w-3.5 h-3.5" />
                    <span>Cumulative Goals & Remarks</span>
                  </button>
                </div>

                {/* SECTION 1: ASSIGNMENT PROGRESS, SCORES & TEACHER FEEDBACK */}
                {activeProfileTab === 'assignments' && (
                  <div className="space-y-3">
                    {classAssignments.length === 0 ? (
                      <div className="p-8 text-center text-xs text-slate-400 rounded-2xl bg-slate-800/80 border border-slate-700">
                        No assignments recorded for this class yet.
                      </div>
                    ) : (
                      classAssignments.map((asg) => {
                        const gradeRecord = studentGrades.find((g) => g.assignmentId === asg.id);
                        const currentScore =
                          draftScores[asg.id] !== undefined
                            ? draftScores[asg.id]
                            : (gradeRecord?.score ?? 0);

                        const currentStatus =
                          draftStatuses[asg.id] ||
                          gradeRecord?.completionStatus ||
                          (gradeRecord?.score ? 'completed' : 'in_progress');

                        const currentFeedback =
                          draftFeedbacks[asg.id] !== undefined
                            ? draftFeedbacks[asg.id]
                            : (gradeRecord?.feedback || '');

                        const scorePercent = Math.round((currentScore / asg.maxPoints) * 100);

                        return (
                          <div
                            key={asg.id}
                            className="rounded-2xl border border-slate-700 bg-slate-800/80 p-4 shadow-sm space-y-3"
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-700/60 pb-2.5">
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                                    {asg.category}
                                  </span>
                                  <h4 className="text-sm font-bold text-white">
                                    {asg.title}
                                  </h4>
                                </div>
                                <p className="text-[11px] text-slate-400 mt-0.5">
                                  Due {asg.dueDate} · Max Points: {asg.maxPoints} pts · Weight: {asg.weight}x
                                </p>
                              </div>

                              {/* Save & Sequential Next Student Buttons */}
                              <div className="flex items-center gap-1.5 self-end sm:self-auto">
                                <button
                                  onClick={() => handleSaveSingleAssignment(asg.id, false)}
                                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-slate-200 transition active:scale-95 shadow-sm"
                                  title="Save this student's grade"
                                >
                                  <Save className="w-3.5 h-3.5 text-blue-400" />
                                  <span>Save</span>
                                </button>
                                <button
                                  onClick={() => handleSaveSingleAssignment(asg.id, true)}
                                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white transition active:scale-95 shadow-sm"
                                  title="Save and advance directly to the next student in roster"
                                >
                                  <span>Save &amp; Next Student</span>
                                  <ChevronRight className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>

                            {/* Inputs Row: Score + Completion Status */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                              {/* Score input */}
                              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-700/60">
                                <label className="block text-slate-300 font-semibold mb-1">
                                  Student Score (Out of {asg.maxPoints} pts):
                                </label>
                                <div className="flex items-center gap-2">
                                  <input
                                    type="number"
                                    min="0"
                                    max={asg.maxPoints}
                                    value={currentScore}
                                    onChange={(e) => {
                                      const val = e.target.value === '' ? 0 : Number(e.target.value);
                                      setDraftScores((prev) => ({ ...prev, [asg.id]: val }));
                                    }}
                                    className="w-20 text-center py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-sm font-black text-white focus:outline-none focus:border-blue-500"
                                  />
                                  <span className="text-xs font-bold text-slate-400">
                                    / {asg.maxPoints} pts
                                  </span>
                                  <span
                                    className={`ml-auto font-black px-2 py-0.5 rounded text-xs ${
                                      scorePercent >= 90
                                        ? 'text-emerald-400 bg-emerald-500/10'
                                        : scorePercent >= 80
                                        ? 'text-blue-400 bg-blue-500/10'
                                        : scorePercent >= 70
                                        ? 'text-amber-400 bg-amber-500/10'
                                        : 'text-rose-400 bg-rose-500/10'
                                    }`}
                                  >
                                    {scorePercent}%
                                  </span>
                                </div>
                              </div>

                              {/* Completion Status selector */}
                              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-700/60">
                                <label className="block text-slate-300 font-semibold mb-1">
                                  Completion Status:
                                </label>
                                <select
                                  value={currentStatus}
                                  onChange={(e) => {
                                    setDraftStatuses((prev) => ({
                                      ...prev,
                                      [asg.id]: e.target.value as AssignmentCompletionStatus,
                                    }));
                                  }}
                                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-bold text-white focus:outline-none"
                                >
                                  <option value="completed">Completed (Turned in & Graded)</option>
                                  <option value="in_progress">In Progress (Drafting)</option>
                                  <option value="needs_revision">Needs Revision (Resubmit)</option>
                                  <option value="late">Late Submission</option>
                                  <option value="missing">Missing / Overdue</option>
                                  <option value="not_started">Not Started</option>
                                </select>
                              </div>
                            </div>

                            {/* Detailed Teacher Notes & Specific Performance Feedback */}
                            <div className="space-y-1">
                              <label className="block text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                                <MessageSquare className="w-3.5 h-3.5 text-blue-400" />
                                <span>Detailed Teacher Notes & Feedback for {selectedStudent.name}:</span>
                              </label>
                              <textarea
                                rows={2}
                                value={currentFeedback}
                                onChange={(e) => {
                                  setDraftFeedbacks((prev) => ({
                                    ...prev,
                                    [asg.id]: e.target.value,
                                  }));
                                }}
                                placeholder={`Enter detailed observations regarding ${selectedStudent.name}'s performance, grammatical accuracy, strengths, and areas to revise...`}
                                className="w-full text-xs bg-slate-900 border border-slate-700 rounded-xl p-3 text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500 leading-relaxed"
                              />
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}

                {/* SECTION 2: LESSON COMPLETION & MASTERY */}
                {activeProfileTab === 'lessons' && (
                  <div className="space-y-3">
                    {classLessons.map((les) => {
                      const lessonProg = sLessonProgressList.find((lp) => lp.lessonId === les.id);
                      const currentStatus =
                        draftLessonStatuses[les.id] ||
                        lessonProg?.status ||
                        'in_progress';

                      const currentNotes =
                        draftLessonNotes[les.id] !== undefined
                          ? draftLessonNotes[les.id]
                          : (lessonProg?.notes || '');

                      const currentExitScore =
                        draftExitScores[les.id] !== undefined
                          ? draftExitScores[les.id]
                          : (lessonProg?.exitTicketScore ?? 5);

                      return (
                        <div
                          key={les.id}
                          className="rounded-2xl border border-slate-700 bg-slate-800/80 p-4 shadow-sm space-y-3"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-700/60 pb-2.5">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                                  {les.unit}
                                </span>
                                <h4 className="text-sm font-bold text-white">
                                  {les.title}
                                </h4>
                              </div>
                              <p className="text-[11px] text-amber-300 font-medium mt-0.5">
                                Grammar & Standard Focus: {les.grammarFocus}
                              </p>
                            </div>

                            <div className="flex items-center gap-1.5 self-end sm:self-auto">
                              <button
                                onClick={() => handleSaveSingleLesson(les.id, false)}
                                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-slate-200 transition active:scale-95 shadow-sm"
                                title="Save this student's lesson comprehension"
                              >
                                <Save className="w-3.5 h-3.5 text-purple-400" />
                                <span>Save</span>
                              </button>
                              <button
                                onClick={() => handleSaveSingleLesson(les.id, true)}
                                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-xs font-bold text-white transition active:scale-95 shadow-sm"
                                title="Save lesson comprehension and advance to next student in roster"
                              >
                                <span>Save &amp; Next Student</span>
                                <ChevronRight className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* Inputs: Lesson Mastery & Exit Ticket */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-700/60">
                              <label className="block text-slate-300 font-semibold mb-1">
                                Conceptual Mastery Status:
                              </label>
                              <select
                                value={currentStatus}
                                onChange={(e) => {
                                  setDraftLessonStatuses((prev) => ({
                                    ...prev,
                                    [les.id]: e.target.value as LessonMasteryStatus,
                                  }));
                                }}
                                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-bold text-white focus:outline-none"
                              >
                                <option value="mastered">Mastered (Fully Grasped Standard)</option>
                                <option value="in_progress">In Progress (Developing Comprehension)</option>
                                <option value="needs_support">Needs Support (Small-Group Scaffold)</option>
                                <option value="absent_needs_catchup">Absent / Catch-up Packet Needed</option>
                              </select>
                            </div>

                            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-700/60">
                              <label className="block text-slate-300 font-semibold mb-1">
                                Exit Ticket Comprehension (Score / 5):
                              </label>
                              <div className="flex items-center gap-2">
                                <input
                                  type="number"
                                  min="0"
                                  max="5"
                                  value={currentExitScore}
                                  onChange={(e) => {
                                    const val = Number(e.target.value);
                                    setDraftExitScores((prev) => ({ ...prev, [les.id]: val }));
                                  }}
                                  className="w-16 text-center py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-sm font-black text-white focus:outline-none focus:border-purple-500"
                                />
                                <span className="text-xs text-slate-400 font-bold">/ 5 pts</span>
                                <span className="ml-auto text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                                  {currentExitScore >= 4 ? 'Met Standard' : 'Requires Review'}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Specific Teacher Lesson Notes */}
                          <div className="space-y-1">
                            <label className="block text-xs font-semibold text-slate-300">
                              Teacher Lesson Observation & Comprehension Notes for {selectedStudent.name}:
                            </label>
                            <textarea
                              rows={2}
                              value={currentNotes}
                              onChange={(e) => {
                                setDraftLessonNotes((prev) => ({
                                  ...prev,
                                  [les.id]: e.target.value,
                                }));
                              }}
                              placeholder={`E.g. ${selectedStudent.name} identified active verbs with high accuracy during guided practice; struggled slightly with complex sentences...`}
                              className="w-full text-xs bg-slate-900 border border-slate-700 rounded-xl p-3 text-white placeholder:text-slate-500 focus:outline-none focus:border-purple-500 leading-relaxed"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* SECTION 3: CUMULATIVE GROWTH & TEACHER REMARKS */}
                {activeProfileTab === 'cumulative' && (
                  <div className="rounded-2xl border border-slate-700 bg-slate-800/80 p-5 shadow-sm space-y-4">
                    <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                      Cumulative English Progress Profile for {selectedStudent.name}
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                      <div>
                        <label className="block text-slate-300 font-bold mb-1">
                          Key Strengths & Superpowers:
                        </label>
                        <textarea
                          rows={3}
                          defaultValue={cumulative?.strengths || ''}
                          onBlur={(e) =>
                            onSaveCumulativeProgress(selectedStudent.id, { strengths: e.target.value })
                          }
                          placeholder="E.g. Analytical thinking, rich vocabulary, thoughtful dialogue writing..."
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-300 font-bold mb-1">
                          Focus Areas & Growth Targets:
                        </label>
                        <textarea
                          rows={3}
                          defaultValue={cumulative?.growthAreas || ''}
                          onBlur={(e) =>
                            onSaveCumulativeProgress(selectedStudent.id, { growthAreas: e.target.value })
                          }
                          placeholder="E.g. Semicolon punctuation, compound subject-verb agreement..."
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
                        />
                      </div>
                    </div>

                    <div className="text-xs space-y-1">
                      <label className="block text-slate-300 font-bold mb-1">
                        Actionable Learning Goals:
                      </label>
                      <input
                        type="text"
                        defaultValue={cumulative?.targetGoals || ''}
                        onBlur={(e) =>
                          onSaveCumulativeProgress(selectedStudent.id, { targetGoals: e.target.value })
                        }
                        placeholder="E.g. Submit draft of personal narrative with 5 dialogue conventions by Nov 16."
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    <div className="text-xs space-y-1">
                      <label className="block text-slate-300 font-bold mb-1">
                        Comprehensive Teacher Observations & Notes:
                      </label>
                      <textarea
                        rows={3}
                        defaultValue={cumulative?.generalNotes || ''}
                        onBlur={(e) =>
                          onSaveCumulativeProgress(selectedStudent.id, { generalNotes: e.target.value })
                        }
                        placeholder="Overall teacher observations on student engagement, class discussions, and homework discipline..."
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500 leading-relaxed"
                      />
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-12 text-center text-xs text-slate-400">
                Select a student from the left column to view and record progress.
              </div>
            )}
          </div>
        </div>
      )}

      {/* VIEW 2: FULL CLASS PROGRESS MATRIX GRID */}
      {viewMode === 'matrix' && (() => {
        const matrixTotalPages = Math.max(1, Math.ceil(filteredStudents.length / matrixPageSize));
        const safeCurrentPage = Math.min(matrixCurrentPage, matrixTotalPages);
        const matrixDisplayedStudents =
          matrixPageSize >= 80
            ? filteredStudents
            : filteredStudents.slice(
                (safeCurrentPage - 1) * matrixPageSize,
                safeCurrentPage * matrixPageSize
              );
        const startIndex = matrixPageSize >= 80 ? 1 : (safeCurrentPage - 1) * matrixPageSize + 1;
        const endIndex =
          matrixPageSize >= 80
            ? filteredStudents.length
            : Math.min(safeCurrentPage * matrixPageSize, filteredStudents.length);

        return (
          <div className="space-y-3">
            {/* Matrix View Scalability Bar for 80+ Students */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl bg-slate-800/90 border border-slate-700">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-300 font-semibold">
                  Showing <span className="text-white font-bold">{startIndex}–{endIndex}</span> of{' '}
                  <span className="text-blue-400 font-bold">{filteredStudents.length}</span> students
                </span>
                <span className="text-slate-600">•</span>
                <span className="text-xs text-slate-400">
                  {currentClass.name} Large Roster Console
                </span>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 text-xs text-slate-300">
                  <span className="text-slate-400">Rows:</span>
                  <select
                    value={matrixPageSize}
                    onChange={(e) => {
                      setMatrixPageSize(Number(e.target.value));
                      setMatrixCurrentPage(1);
                    }}
                    className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value={25}>25 / page</option>
                    <option value={50}>50 / page</option>
                    <option value={80}>All (80+ students)</option>
                  </select>
                </div>

                {matrixPageSize < 80 && (
                  <div className="flex items-center gap-1 bg-slate-900 rounded-xl p-1 border border-slate-800">
                    <button
                      onClick={() => setMatrixCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={safeCurrentPage <= 1}
                      className="p-1 rounded-lg text-slate-300 hover:text-white disabled:opacity-30 disabled:hover:text-slate-300 transition"
                      title="Previous Page"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="px-2 text-xs font-bold text-slate-200">
                      Page {safeCurrentPage} of {matrixTotalPages}
                    </span>
                    <button
                      onClick={() => setMatrixCurrentPage((p) => Math.min(matrixTotalPages, p + 1))}
                      disabled={safeCurrentPage >= matrixTotalPages}
                      className="p-1 rounded-lg text-slate-300 hover:text-white disabled:opacity-30 disabled:hover:text-slate-300 transition"
                      title="Next Page"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-700 bg-slate-800/80 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-900/95 text-slate-300 border-b border-slate-700">
                      <th className="p-3.5 sticky left-0 bg-slate-900 z-10 font-bold min-w-[150px] border-r border-slate-800 shadow-[2px_0_5px_rgba(0,0,0,0.3)]">
                        Student Name
                      </th>
                      <th className="p-3 font-bold text-center min-w-[70px]">
                        Avg Grade
                      </th>

                      {/* Assignment Columns */}
                      {classAssignments.map((asg) => (
                        <th
                          key={asg.id}
                          className="p-3 font-semibold text-center min-w-[170px] max-w-[220px] border-l border-slate-800"
                        >
                          <div className="truncate font-bold text-white" title={asg.title}>
                            {asg.title}
                          </div>
                          <div className="text-[10px] text-blue-400 font-normal">
                            Score / Status / Feedback
                          </div>
                        </th>
                      ))}

                      {/* Lesson Columns */}
                      {classLessons.map((les) => (
                        <th
                          key={les.id}
                          className="p-3 font-semibold text-center min-w-[180px] max-w-[220px] border-l-2 border-purple-800 bg-purple-950/20"
                        >
                          <div className="truncate font-bold text-purple-200" title={les.title}>
                            Lesson: {les.title}
                          </div>
                          <div className="text-[10px] text-purple-400 font-normal">
                            Mastery Status & Notes
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-700/60 text-slate-200">
                    {matrixDisplayedStudents.map((student) => {
                      const sGrades = grades.filter((g) => g.studentId === student.id);
                      let totScore = 0;
                  let totMax = 0;
                  sGrades.forEach((g) => {
                    const asg = assignments.find((a) => a.id === g.assignmentId);
                    if (asg) {
                      totScore += g.score;
                      totMax += asg.maxPoints;
                    }
                  });
                  const avg = totMax > 0 ? Math.round((totScore / totMax) * 100) : 92;

                  return (
                    <tr key={student.id} className="hover:bg-slate-750 transition">
                      {/* Sticky Student Name */}
                      <td className="p-3 sticky left-0 bg-slate-800/95 z-10 border-r border-slate-700/60 shadow-[2px_0_5px_rgba(0,0,0,0.3)]">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-bold text-slate-400">
                            #{student.rollNumber}
                          </span>
                          <span className="font-semibold text-white truncate max-w-[120px]">
                            {student.name}
                          </span>
                        </div>
                      </td>

                      {/* Average */}
                      <td className="p-2 text-center">
                        <span className="font-black text-xs text-blue-400">{avg}%</span>
                      </td>

                      {/* Assignment Cells */}
                      {classAssignments.map((asg) => {
                        const g = sGrades.find((gr) => gr.assignmentId === asg.id);
                        const score = g?.score ?? 0;
                        const status = g?.completionStatus || (g?.score ? 'completed' : 'in_progress');

                        return (
                          <td
                            key={asg.id}
                            className="p-2 text-center border-l border-slate-800/80"
                          >
                            <div className="flex items-center justify-center gap-1.5 mb-1">
                              <input
                                type="number"
                                min="0"
                                max={asg.maxPoints}
                                defaultValue={score}
                                onBlur={(e) => {
                                  const val = Number(e.target.value);
                                  onSaveAssignmentProgress(asg.id, student.id, val, status, g?.feedback);
                                }}
                                className="w-12 text-center py-0.5 bg-slate-900 border border-slate-700 rounded text-xs font-bold text-white focus:outline-none"
                              />
                              <span className="text-[10px] text-slate-500">/{asg.maxPoints}</span>
                            </div>

                            <select
                              value={status}
                              onChange={(e) => {
                                onSaveAssignmentProgress(
                                  asg.id,
                                  student.id,
                                  score,
                                  e.target.value as AssignmentCompletionStatus,
                                  g?.feedback
                                );
                              }}
                              className="text-[10px] bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-slate-300 font-semibold focus:outline-none"
                            >
                              <option value="completed">Completed</option>
                              <option value="in_progress">In Progress</option>
                              <option value="needs_revision">Needs Rev</option>
                              <option value="late">Late</option>
                              <option value="missing">Missing</option>
                            </select>
                          </td>
                        );
                      })}

                      {/* Lesson Mastery Cells */}
                      {classLessons.map((les) => {
                        const lProg = studentLessonProgress.find(
                          (lp) => lp.lessonId === les.id && lp.studentId === student.id
                        );
                        const status = lProg?.status || 'in_progress';

                        return (
                          <td
                            key={les.id}
                            className="p-2 text-center border-l-2 border-purple-800/60 bg-purple-950/10"
                          >
                            <select
                              value={status}
                              onChange={(e) => {
                                onSaveLessonProgress(
                                  les.id,
                                  student.id,
                                  e.target.value as LessonMasteryStatus,
                                  lProg?.exitTicketScore ?? 5,
                                  true,
                                  lProg?.notes
                                );
                              }}
                              className="text-[10px] bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-purple-200 font-semibold focus:outline-none"
                            >
                              <option value="mastered">Mastered</option>
                              <option value="in_progress">In Progress</option>
                              <option value="needs_support">Needs Support</option>
                              <option value="absent_needs_catchup">Absent</option>
                            </select>
                            <div className="text-[10px] text-slate-400 mt-1 truncate max-w-[140px]" title={lProg?.notes}>
                              {lProg?.notes || 'No note'}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  })()}

      {/* AI Parent Note Modal */}
      {showAiDraftModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-700 p-5 shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Bot className="w-5 h-5 text-purple-400" />
                <h3 className="text-sm font-bold text-white">
                  Parent Progress Communication Drafter
                </h3>
              </div>
              <button
                onClick={() => setShowAiDraftModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {isAiDraftLoading ? (
              <div className="p-8 text-center space-y-2">
                <Sparkles className="w-6 h-6 text-purple-400 animate-spin mx-auto" />
                <p className="text-xs text-slate-300">
                  Synthesizing {selectedStudent?.name}'s assignments, lesson mastery, and attendance...
                </p>
              </div>
            ) : aiDraftContent ? (
              <div className="space-y-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">
                    Subject Line:
                  </label>
                  <input
                    type="text"
                    value={aiDraftContent.subject}
                    onChange={(e) =>
                      setAiDraftContent({ ...aiDraftContent, subject: e.target.value })
                    }
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white font-semibold focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">
                    Message Body:
                  </label>
                  <textarea
                    rows={8}
                    value={aiDraftContent.body}
                    onChange={(e) =>
                      setAiDraftContent({ ...aiDraftContent, body: e.target.value })
                    }
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white leading-relaxed focus:outline-none font-sans"
                  />
                </div>
              </div>
            ) : null}

            <div className="pt-2 border-t border-slate-800 flex justify-end gap-2">
              <button
                onClick={() => setShowAiDraftModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 font-semibold text-white transition"
              >
                Close
              </button>
              {aiDraftContent && (
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(`${aiDraftContent.subject}\n\n${aiDraftContent.body}`);
                    setSavedFeedbackToast('Copied parent update to clipboard!');
                    setTimeout(() => setSavedFeedbackToast(null), 2500);
                    setShowAiDraftModal(false);
                  }}
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 font-bold text-white transition"
                >
                  Copy Message
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
