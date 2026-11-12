import React, { useState } from 'react';
import {
  Plus,
  Calendar,
  CheckCircle2,
  Circle,
  BookOpen,
  FileText,
  ArrowRight,
  Bell,
} from 'lucide-react';
import {
  ClassGroup,
  Student,
  AttendanceRecord,
  Assignment,
  GradeRecord,
  LessonPlan,
  Reminder,
  TeacherNote,
} from '../../types';
import { ClassesWidget } from '../widgets/ClassesWidget';
import { QuickParticipationModal } from '../widgets/QuickParticipationModal';

interface DashboardViewProps {
  classes: ClassGroup[];
  students: Student[];
  attendance: AttendanceRecord[];
  assignments: Assignment[];
  grades: GradeRecord[];
  lessonPlans: LessonPlan[];
  teacherNotes: TeacherNote[];
  reminders: Reminder[];
  participationScores: Record<string, number>;
  activeClassId: string;
  academicYear: string;
  onSelectClass: (classId: string) => void;
  onOpenAttendance: (classId: string) => void;
  onOpenGradebook: (classId: string) => void;
  onOpenLessons: (classId: string) => void;
  onOpenProgress: (classId: string) => void;
  onExportPdf: (classGroup: ClassGroup) => void;
  onLogParticipation: (studentId: string, delta: number, reason: string) => void;
  onToggleReminder: (reminderId: string) => void;
  onOpenAddClassModal: () => void;
  onOpenEditClassModal: (classId: string) => void;
  onOpenManageClassesModal: () => void;
  onOpenNewAssignmentModal: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  classes,
  students,
  attendance,
  assignments,
  grades,
  lessonPlans,
  teacherNotes,
  reminders,
  participationScores,
  activeClassId,
  academicYear,
  onSelectClass,
  onOpenAttendance,
  onOpenGradebook,
  onOpenLessons,
  onOpenProgress,
  onExportPdf,
  onLogParticipation,
  onToggleReminder,
  onOpenAddClassModal,
  onOpenEditClassModal,
  onOpenManageClassesModal,
  onOpenNewAssignmentModal,
}) => {
  const [participationModalClass, setParticipationModalClass] = useState<ClassGroup | null>(null);

  const pendingReminders = reminders.filter((r) => !r.completed);
  const completedLessons = lessonPlans.filter((lp) => lp.completed).length;

  return (
    <div className="space-y-6 pb-8">
      {/* Clean Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Dashboard
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            {new Date().toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            })}{' '}
            · Academic Year {academicYear}
          </p>
        </div>

        <button
          type="button"
          onClick={onOpenNewAssignmentModal}
          className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white shadow-sm transition active:scale-95 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Assignment</span>
        </button>
      </div>

      {/* Main Two-Column Structured Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Dedicated Classes Widget (switch classes, add class, active class focus) */}
        <div className="lg:col-span-7">
          <ClassesWidget
            classes={classes}
            students={students}
            attendance={attendance}
            assignments={assignments}
            grades={grades}
            lessonPlans={lessonPlans}
            activeClassId={activeClassId}
            onSelectClass={onSelectClass}
            onAddClass={onOpenAddClassModal}
            onEditClass={onOpenEditClassModal}
            onManageClasses={onOpenManageClassesModal}
            onOpenAttendance={onOpenAttendance}
            onOpenGradebook={onOpenGradebook}
            onOpenProgress={onOpenProgress}
            onOpenLessons={onOpenLessons}
            onQuickParticipation={(cls) => setParticipationModalClass(cls)}
            onExportPdf={onExportPdf}
          />
        </div>

        {/* Right: Deadlines Checklist + Lessons & Notes Shortcut */}
        <div className="lg:col-span-5 space-y-5">
          {/* Upcoming Deadlines Widget */}
          <section className="rounded-2xl border border-slate-800 bg-slate-900/90 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center">
                  <Bell className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white">Upcoming Deadlines</h2>
                  <p className="text-[11px] text-slate-400 tabular-nums">
                    {pendingReminders.length} pending
                  </p>
                </div>
              </div>
            </div>

            <div className="divide-y divide-slate-800/80">
              {reminders.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400">
                  No upcoming deadlines.
                </div>
              ) : (
                reminders.slice(0, 5).map((rem) => {
                  const cls = classes.find((c) => c.id === rem.classId);
                  return (
                    <button
                      key={rem.id}
                      type="button"
                      onClick={() => onToggleReminder(rem.id)}
                      className="w-full px-5 py-3 flex items-start gap-3 text-left hover:bg-slate-800/40 transition"
                    >
                      {rem.completed ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                      ) : (
                        <Circle className="w-4 h-4 text-slate-500 mt-0.5 shrink-0" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p
                          className={`text-xs font-medium ${
                            rem.completed ? 'line-through text-slate-500' : 'text-slate-100'
                          }`}
                        >
                          {rem.title}
                        </p>
                        <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                          {cls && (
                            <span className="font-semibold text-slate-300">{cls.name}</span>
                          )}
                          {cls && <span aria-hidden="true">·</span>}
                          <span className="inline-flex items-center gap-1 tabular-nums">
                            <Calendar className="w-3 h-3 text-slate-500" />
                            {rem.dueDate}
                          </span>
                        </div>
                      </div>
                      <span
                        className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                          rem.priority === 'high'
                            ? 'bg-rose-400'
                            : rem.priority === 'medium'
                            ? 'bg-amber-400'
                            : 'bg-blue-400'
                        }`}
                        title={`${rem.priority} priority`}
                      />
                    </button>
                  );
                })
              )}
            </div>
          </section>

          {/* Lessons, Plans & Notes Shortcut Card */}
          <section className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-purple-500/15 text-purple-400 flex items-center justify-center">
                  <BookOpen className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white">Lessons & Notes</h2>
                  <p className="text-[11px] text-slate-400">
                    Create plans, upload PDFs, or track completed lessons
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                  <BookOpen className="w-3.5 h-3.5 text-blue-400" />
                  <span>Lesson Plans</span>
                </div>
                <div className="mt-1 text-base font-bold text-white tabular-nums">
                  {lessonPlans.length}
                </div>
                <div className="text-[11px] text-emerald-400 tabular-nums">
                  {completedLessons} completed
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                  <FileText className="w-3.5 h-3.5 text-purple-400" />
                  <span>Notes & PDFs</span>
                </div>
                <div className="mt-1 text-base font-bold text-white tabular-nums">
                  {teacherNotes.length}
                </div>
                <div className="text-[11px] text-slate-400">
                  Custom & uploaded
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onOpenLessons(activeClassId)}
              className="w-full py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-white flex items-center justify-center gap-2 transition"
            >
              <span>Open Lessons & Notes</span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
            </button>
          </section>
        </div>
      </div>

      {/* Quick Participation Modal */}
      {participationModalClass && (
        <QuickParticipationModal
          isOpen={true}
          onClose={() => setParticipationModalClass(null)}
          classGroup={participationModalClass}
          students={students.filter((s) => s.classId === participationModalClass.id)}
          currentScores={participationScores}
          onLogParticipation={onLogParticipation}
        />
      )}
    </div>
  );
};
