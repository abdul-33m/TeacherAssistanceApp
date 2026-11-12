import React from 'react';
import {
  GraduationCap,
  Plus,
  Pencil,
  SlidersHorizontal,
  UserCheck,
  Award,
  TrendingUp,
  BookOpen,
  Sparkles,
  Printer,
  Clock,
  MapPin,
  CheckCircle2,
  Users,
} from 'lucide-react';
import {
  AttendanceRecord,
  Assignment,
  ClassGroup,
  GradeRecord,
  LessonPlan,
  Student,
} from '../../types';

interface ClassesWidgetProps {
  classes: ClassGroup[];
  students: Student[];
  attendance: AttendanceRecord[];
  assignments: Assignment[];
  grades: GradeRecord[];
  lessonPlans: LessonPlan[];
  activeClassId: string;
  onSelectClass: (classId: string) => void;
  onAddClass: () => void;
  onEditClass: (classId: string) => void;
  onManageClasses: () => void;
  onOpenAttendance: (classId: string) => void;
  onOpenGradebook: (classId: string) => void;
  onOpenProgress: (classId: string) => void;
  onOpenLessons: (classId: string) => void;
  onQuickParticipation: (cls: ClassGroup) => void;
  onExportPdf: (cls: ClassGroup) => void;
}

export const ClassesWidget: React.FC<ClassesWidgetProps> = ({
  classes,
  students,
  attendance,
  assignments,
  grades,
  lessonPlans,
  activeClassId,
  onSelectClass,
  onAddClass,
  onEditClass,
  onManageClasses,
  onOpenAttendance,
  onOpenGradebook,
  onOpenProgress,
  onOpenLessons,
  onQuickParticipation,
  onExportPdf,
}) => {
  const activeClass = classes.find((c) => c.id === activeClassId) || classes[0];
  const activeColor = activeClass?.color || '#3b82f6';

  if (!activeClass) {
    return (
      <section className="rounded-2xl border border-slate-800 bg-slate-900/90 p-6 text-center space-y-3">
        <GraduationCap className="w-8 h-8 text-blue-400 mx-auto" />
        <h2 className="text-base font-bold text-white">No classes added yet</h2>
        <p className="text-xs text-slate-400">Add your first class to start tracking students, grades, and lessons.</p>
        <button
          type="button"
          onClick={onAddClass}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white transition"
        >
          <Plus className="w-4 h-4" />
          <span>Add Class</span>
        </button>
      </section>
    );
  }

  // Active class metrics
  const classStudents = students.filter((s) => s.classId === activeClass.id);
  const enrolledCount = classStudents.length;

  const classAttRecords = attendance
    .filter((a) => a.classId === activeClass.id)
    .sort((a, b) => b.date.localeCompare(a.date));
  const latestAtt = classAttRecords[0];
  let presentCount = 0;
  let attTaken = false;
  if (latestAtt?.records) {
    attTaken = Object.keys(latestAtt.records).length > 0;
    classStudents.forEach((s) => {
      const st = latestAtt.records[s.id];
      if (st === 'P' || st === 'present') presentCount++;
    });
  }

  const classStudentSet = new Set(classStudents.map((s) => s.id));
  const classGrades = grades.filter((g) => classStudentSet.has(g.studentId));
  let totalScore = 0;
  let totalMax = 0;
  classGrades.forEach((g) => {
    const asg = assignments.find((a) => a.id === g.assignmentId);
    if (asg) {
      totalScore += g.score;
      totalMax += asg.maxPoints;
    }
  });
  const avgGrade = totalMax > 0 ? Math.round((totalScore / totalMax) * 100) : null;

  const classLessons = lessonPlans.filter(
    (lp) => lp.classId === activeClass.id || lp.grade === activeClass.grade
  );
  const completedLessonsCount = classLessons.filter((lp) => lp.completed).length;
  const nextLesson = classLessons.find((lp) => !lp.completed) || classLessons[0];

  const pendingAssignments = assignments.filter(
    (a) =>
      (a.classId === activeClass.id ||
        a.classId === `all-${activeClass.grade}` ||
        a.classId === 'all') &&
      a.status !== 'returned'
  );

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/90 shadow-sm overflow-hidden">
      {/* Widget Header with Add Class inside the Classes Widget */}
      <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-blue-600/15 text-blue-400 flex items-center justify-center shrink-0">
            <GraduationCap className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-white tracking-tight">Classes</h2>
            <p className="text-[11px] text-slate-400 truncate tabular-nums">
              {classes.length} classes · {students.length} total students
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={onAddClass}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white transition active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Class</span>
          </button>
          <button
            type="button"
            onClick={onManageClasses}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white transition"
            title="Manage all classes & academic year"
            aria-label="Manage all classes and academic year"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Compact Class Selector Row inside Classes Widget */}
      <div className="px-5 py-3 bg-slate-950/40 border-b border-slate-800/80">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {classes.map((cls) => {
            const isSelected = cls.id === activeClass.id;
            const count = students.filter((s) => s.classId === cls.id).length;
            return (
              <div
                key={cls.id}
                className={`group relative rounded-xl border transition-all ${
                  isSelected
                    ? 'bg-slate-800 border-blue-500/70 shadow-sm'
                    : 'bg-slate-900/70 border-slate-800 hover:border-slate-700'
                }`}
              >
                <button
                  type="button"
                  onClick={() => onSelectClass(cls.id)}
                  className="w-full p-2.5 text-left flex items-center gap-2.5 focus:outline-none"
                >
                  <span
                    className="w-2.5 h-8 rounded-full shrink-0"
                    style={{ backgroundColor: cls.color || '#3b82f6' }}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold text-white truncate">
                      {cls.name}
                    </div>
                    <div className="text-[11px] text-slate-400 tabular-nums truncate">
                      {count} students
                    </div>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEditClass(cls.id);
                  }}
                  className="absolute top-1.5 right-1.5 p-1 rounded-lg text-slate-500 opacity-0 group-hover:opacity-100 focus:opacity-100 hover:text-white hover:bg-slate-700 transition"
                  title={`Edit ${cls.name}`}
                  aria-label={`Edit ${cls.name}`}
                >
                  <Pencil className="w-3 h-3" />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Focused View of ONLY the Active Class */}
      <div className="p-5 space-y-5">
        {/* Selected Class Title & Metadata */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2.5">
              <span
                className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-black text-white shrink-0"
                style={{ backgroundColor: activeColor }}
              >
                {activeClass.id}
              </span>
              <div className="min-w-0">
                <h3 className="text-base font-bold text-white truncate">
                  {activeClass.name}
                </h3>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-400">
                  <span>{activeClass.subject}</span>
                  {activeClass.schedulePeriod && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="inline-flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-500" />
                        {activeClass.schedulePeriod}
                      </span>
                    </>
                  )}
                  {activeClass.roomNumber && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-500" />
                        {activeClass.roomNumber}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => onQuickParticipation(activeClass)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-medium text-slate-200 transition"
              title="Quick participation points"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Participation</span>
            </button>
            <button
              type="button"
              onClick={() => onExportPdf(activeClass)}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white transition"
              title="Export class summary PDF"
              aria-label="Export class summary PDF"
            >
              <Printer className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 3 Clean Key Metrics */}
        <div className="grid grid-cols-3 gap-3">
          <button
            type="button"
            onClick={() => onOpenAttendance(activeClass.id)}
            className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-slate-700 text-left transition"
          >
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400">
              <Users className="w-3.5 h-3.5 text-emerald-400" />
              <span>Attendance</span>
            </div>
            <div className="mt-1.5 text-lg font-bold text-white tabular-nums">
              {attTaken && enrolledCount > 0 ? `${presentCount}/${enrolledCount}` : 'Pending'}
            </div>
            <div className="text-[11px] text-slate-500 tabular-nums">
              {attTaken && enrolledCount > 0
                ? `${Math.round((presentCount / enrolledCount) * 100)}% present`
                : `${enrolledCount} enrolled`}
            </div>
          </button>

          <button
            type="button"
            onClick={() => onOpenGradebook(activeClass.id)}
            className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-slate-700 text-left transition"
          >
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400">
              <Award className="w-3.5 h-3.5 text-amber-400" />
              <span>Class Avg</span>
            </div>
            <div className="mt-1.5 text-lg font-bold text-white tabular-nums">
              {avgGrade !== null ? `${avgGrade}%` : '—'}
            </div>
            <div className="text-[11px] text-slate-500 tabular-nums">
              {pendingAssignments.length} open tasks
            </div>
          </button>

          <button
            type="button"
            onClick={() => onOpenLessons(activeClass.id)}
            className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-slate-700 text-left transition"
          >
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400">
              <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />
              <span>Lessons Done</span>
            </div>
            <div className="mt-1.5 text-lg font-bold text-white tabular-nums">
              {completedLessonsCount}/{classLessons.length}
            </div>
            <div className="text-[11px] text-slate-500 truncate">
              {nextLesson ? nextLesson.title : 'No lessons yet'}
            </div>
          </button>
        </div>

        {/* 4 Straightforward Action Buttons */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <button
            type="button"
            onClick={() => onOpenAttendance(activeClass.id)}
            className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700/80 text-xs font-semibold text-white transition"
          >
            <UserCheck className="w-4 h-4 text-emerald-400" />
            <span>Attendance</span>
          </button>

          <button
            type="button"
            onClick={() => onOpenGradebook(activeClass.id)}
            className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700/80 text-xs font-semibold text-white transition"
          >
            <Award className="w-4 h-4 text-amber-400" />
            <span>Gradebook</span>
          </button>

          <button
            type="button"
            onClick={() => onOpenProgress(activeClass.id)}
            className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white transition shadow-sm"
          >
            <TrendingUp className="w-4 h-4" />
            <span>Progress</span>
          </button>

          <button
            type="button"
            onClick={() => onOpenLessons(activeClass.id)}
            className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700/80 text-xs font-semibold text-white transition"
          >
            <BookOpen className="w-4 h-4 text-purple-400" />
            <span>Lessons</span>
          </button>
        </div>
      </div>
    </section>
  );
};
