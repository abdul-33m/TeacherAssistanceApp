import React, { useState, useMemo } from 'react';
import {
  Award,
  Plus,
  Calendar,
  FileText,
  Filter,
  CheckCircle,
  Clock,
  Printer,
  ChevronDown,
  Edit2,
  Trash2,
  Search,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Users,
  AlertCircle,
} from 'lucide-react';
import {
  ClassGroup,
  Student,
  Assignment,
  GradeRecord,
  AssignmentCategory,
} from '../../types';

interface GradebookViewProps {
  classes: ClassGroup[];
  students: Student[];
  assignments: Assignment[];
  grades: GradeRecord[];
  activeClassId: string;
  onSelectClass: (classId: string) => void;
  onOpenNewAssignmentModal: () => void;
  onUpdateGrade: (assignmentId: string, studentId: string, score: number, feedback?: string) => void;
  onUpdateAssignmentStatus: (assignmentId: string, status: Assignment['status']) => void;
  onExportPdf: (classGroup: ClassGroup) => void;
  focusedAssignmentId?: string;
  focusToken?: number;
}

export const GradebookView: React.FC<GradebookViewProps> = ({
  classes,
  students,
  assignments,
  grades,
  activeClassId,
  onSelectClass,
  onOpenNewAssignmentModal,
  onUpdateGrade,
  onUpdateAssignmentStatus,
  onExportPdf,
  focusedAssignmentId,
  focusToken,
}) => {
  const currentClass = classes.find((c) => c.id === activeClassId) || classes[0];
  const classStudents = students.filter((s) => s.classId === currentClass.id);

  // Active view: 'matrix' | 'assignments'
  const [activeTab, setActiveTab] = useState<'matrix' | 'assignments'>('matrix');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [editingAssignmentId, setEditingAssignmentId] = useState<string | null>(null);

  // Scalability state for 80+ students
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'roll_asc' | 'roll_desc' | 'name_asc' | 'grade_desc' | 'grade_asc'>('roll_asc');
  const [gradeFilter, setGradeFilter] = useState<'all' | 'honor' | 'needs_support'>('all');
  const [pageSize, setPageSize] = useState<number>(25);
  const [currentPage, setCurrentPage] = useState<number>(1);

  React.useEffect(() => {
    if (!focusedAssignmentId) return;
    setActiveTab('assignments');
    setSelectedCategory('all');
    const timer = setTimeout(() => {
      document
        .getElementById(`assignment-card-${focusedAssignmentId}`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 60);
    return () => clearTimeout(timer);
  }, [focusedAssignmentId, focusToken]);

  // Filter assignments for current class or global
  const classAssignments = assignments.filter((a) => {
    const matchesClass =
      a.classId === currentClass.id ||
      a.classId === `all-${currentClass.grade}` ||
      a.classId === 'all';
    const matchesCategory =
      selectedCategory === 'all' || a.category === selectedCategory;
    return matchesClass && matchesCategory;
  });

  // Calculate student averages
  const studentAverages = useMemo(() => {
    return classStudents.map((s) => {
      let earned = 0;
      let possible = 0;
      let gradedCount = 0;

      classAssignments.forEach((asg) => {
        const g = grades.find((gr) => gr.assignmentId === asg.id && gr.studentId === s.id);
        if (g && typeof g.score === 'number') {
          earned += g.score * (asg.weight || 1);
          possible += asg.maxPoints * (asg.weight || 1);
          gradedCount++;
        }
      });

      const percent = possible > 0 ? Math.round((earned / possible) * 100) : 92;
      let letter = 'A';
      if (percent >= 90) letter = 'A';
      else if (percent >= 80) letter = 'B';
      else if (percent >= 70) letter = 'C';
      else if (percent >= 60) letter = 'D';
      else letter = 'F';

      return {
        student: s,
        percent,
        letter,
        gradedCount,
      };
    });
  }, [classStudents, classAssignments, grades]);

  // Statistical summary metrics
  const classStats = useMemo(() => {
    if (studentAverages.length === 0) {
      return { avg: 0, honorCount: 0, passingCount: 0, supportCount: 0 };
    }
    const sum = studentAverages.reduce((acc, curr) => acc + curr.percent, 0);
    const avg = Math.round(sum / studentAverages.length);
    const honorCount = studentAverages.filter((s) => s.percent >= 90).length;
    const passingCount = studentAverages.filter((s) => s.percent >= 70 && s.percent < 90).length;
    const supportCount = studentAverages.filter((s) => s.percent < 70).length;

    return { avg, honorCount, passingCount, supportCount };
  }, [studentAverages]);

  // Filtered & sorted student list
  const filteredAndSortedAverages = useMemo(() => {
    let result = studentAverages.filter(({ student, percent }) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        student.name.toLowerCase().includes(q) ||
        student.rollNumber.includes(q);
      if (!matchesSearch) return false;

      if (gradeFilter === 'honor') return percent >= 90;
      if (gradeFilter === 'needs_support') return percent < 75;
      return true;
    });

    result.sort((a, b) => {
      if (sortBy === 'roll_asc') {
        return parseInt(a.student.rollNumber, 10) - parseInt(b.student.rollNumber, 10);
      }
      if (sortBy === 'roll_desc') {
        return parseInt(b.student.rollNumber, 10) - parseInt(a.student.rollNumber, 10);
      }
      if (sortBy === 'name_asc') {
        return a.student.name.localeCompare(b.student.name);
      }
      if (sortBy === 'grade_desc') {
        return b.percent - a.percent;
      }
      if (sortBy === 'grade_asc') {
        return a.percent - b.percent;
      }
      return 0;
    });

    return result;
  }, [studentAverages, searchQuery, gradeFilter, sortBy]);

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredAndSortedAverages.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const pagedAverages =
    pageSize >= 80
      ? filteredAndSortedAverages
      : filteredAndSortedAverages.slice((safePage - 1) * pageSize, safePage * pageSize);

  const startRecord = pageSize >= 80 ? 1 : (safePage - 1) * pageSize + 1;
  const endRecord =
    pageSize >= 80
      ? filteredAndSortedAverages.length
      : Math.min(safePage * pageSize, filteredAndSortedAverages.length);

  return (
    <div className="space-y-5 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <span>Gradebook & Assignment Tracker</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Rubric weighting, assignment statuses & grade averages for large {currentClass.name} roster
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onExportPdf(currentClass)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-200 transition"
          >
            <Printer className="w-4 h-4 text-slate-400" />
            <span>Export Roster PDF</span>
          </button>
          <button
            onClick={onOpenNewAssignmentModal}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white shadow-sm transition active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Add Assignment</span>
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
              onClick={() => {
                onSelectClass(cls.id);
                setCurrentPage(1);
              }}
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
                ({count} students)
              </span>
            </button>
          );
        })}
      </div>

      {/* 80-Student Statistical Performance Header Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] text-slate-400 font-semibold">Total Students</div>
            <div className="text-lg font-black text-white">{classStudents.length}</div>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] text-slate-400 font-semibold">Class Average</div>
            <div className="text-lg font-black text-indigo-300">{classStats.avg}%</div>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] text-slate-400 font-semibold">Honor Roll (≥90%)</div>
            <div className="text-lg font-black text-emerald-300">{classStats.honorCount}</div>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] text-slate-400 font-semibold">Needs Support (&lt;70%)</div>
            <div className="text-lg font-black text-amber-300">{classStats.supportCount}</div>
          </div>
        </div>
      </div>

      {/* Control Bar: View Toggle + Search + Sort + Category Filter */}
      <div className="space-y-2 p-3 rounded-2xl bg-slate-800/80 border border-slate-700">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setActiveTab('matrix')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                activeTab === 'matrix'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              Full Grade Matrix
            </button>
            <button
              onClick={() => setActiveTab('assignments')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                activeTab === 'assignments'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              Assignments & Tasks ({classAssignments.length})
            </button>
          </div>

          {/* Category Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="text-xs bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-slate-300 focus:outline-none focus:border-blue-500"
            >
              <option value="all">All Categories</option>
              <option value="Homework">Homework</option>
              <option value="Grammar Exercise">Grammar Exercise</option>
              <option value="Essay & Writing">Essay & Writing</option>
              <option value="Quiz">Quiz</option>
              <option value="Reading Log">Reading Log</option>
            </select>
          </div>
        </div>

        {/* 80-Student Search, Filter Pills & Sort Bar for Matrix */}
        {activeTab === 'matrix' && (
          <div className="pt-2 border-t border-slate-700/80 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[260px]">
              <div className="relative flex-1 min-w-[180px] max-w-sm">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder={`Search name or roll # in ${classStudents.length} students...`}
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Status Filter Pills */}
              <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 text-[11px]">
                <button
                  onClick={() => {
                    setGradeFilter('all');
                    setCurrentPage(1);
                  }}
                  className={`px-2.5 py-0.5 rounded-lg font-bold transition ${
                    gradeFilter === 'all'
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  All ({studentAverages.length})
                </button>
                <button
                  onClick={() => {
                    setGradeFilter('honor');
                    setCurrentPage(1);
                  }}
                  className={`px-2.5 py-0.5 rounded-lg font-bold transition ${
                    gradeFilter === 'honor'
                      ? 'bg-emerald-600 text-white'
                      : 'text-slate-400 hover:text-emerald-300'
                  }`}
                >
                  Honor Roll ({classStats.honorCount})
                </button>
                <button
                  onClick={() => {
                    setGradeFilter('needs_support');
                    setCurrentPage(1);
                  }}
                  className={`px-2.5 py-0.5 rounded-lg font-bold transition ${
                    gradeFilter === 'needs_support'
                      ? 'bg-amber-600 text-white'
                      : 'text-slate-400 hover:text-amber-300'
                  }`}
                >
                  &lt;75% ({classStats.supportCount})
                </button>
              </div>
            </div>

            {/* Sort & Pagination Bar */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-xs text-slate-300">
                <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="roll_asc">Roll # (1 to 80)</option>
                  <option value="roll_desc">Roll # (80 to 1)</option>
                  <option value="name_asc">Name (A–Z)</option>
                  <option value="grade_desc">Grade (Highest first)</option>
                  <option value="grade_asc">Grade (Lowest first)</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5 text-xs text-slate-300">
                <span className="text-slate-400">Rows:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-blue-500"
                >
                  <option value={25}>25 / page</option>
                  <option value={50}>50 / page</option>
                  <option value={80}>All (80+ students)</option>
                </select>
              </div>

              {pageSize < 80 && (
                <div className="flex items-center gap-1 bg-slate-900 rounded-xl p-1 border border-slate-800">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={safePage <= 1}
                    className="p-1 rounded-lg text-slate-300 hover:text-white disabled:opacity-30 disabled:hover:text-slate-300 transition"
                    title="Previous Page"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="px-2 text-xs font-bold text-slate-200">
                    {safePage} / {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={safePage >= totalPages}
                    className="p-1 rounded-lg text-slate-300 hover:text-white disabled:opacity-30 disabled:hover:text-slate-300 transition"
                    title="Next Page"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* VIEW A: Full Grade Matrix */}
      {activeTab === 'matrix' && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400 px-1">
            <span>
              Showing <span className="text-white font-bold">{startRecord}–{endRecord}</span> of{' '}
              <span className="text-blue-400 font-bold">{filteredAndSortedAverages.length}</span> students
            </span>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="text-blue-400 hover:underline"
              >
                Clear filter
              </button>
            )}
          </div>

          <div className="rounded-2xl border border-slate-700 bg-slate-800/80 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-900/90 text-slate-300 border-b border-slate-700">
                    <th className="p-3.5 sticky left-0 bg-slate-900 z-10 font-bold min-w-[150px] shadow-[2px_0_5px_rgba(0,0,0,0.3)]">
                      Student Name
                    </th>
                    <th className="p-3.5 font-bold text-center min-w-[80px]">
                      Average
                    </th>
                    {classAssignments.map((asg) => (
                      <th
                        key={asg.id}
                        className="p-3.5 font-semibold text-center min-w-[140px] max-w-[180px] border-l border-slate-800"
                      >
                        <div className="truncate font-bold text-white" title={asg.title}>
                          {asg.title}
                        </div>
                        <div className="text-[10px] text-slate-400 font-normal">
                          {asg.category} · {asg.maxPoints} pts
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/60 text-slate-200">
                  {pagedAverages.map(({ student, percent, letter }) => (
                    <tr key={student.id} className="hover:bg-slate-750 transition">
                      {/* Student Name */}
                      <td className="p-3.5 sticky left-0 bg-slate-800/95 z-10 border-r border-slate-700/50 shadow-[2px_0_5px_rgba(0,0,0,0.3)]">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-bold text-slate-400">
                            #{student.rollNumber}
                          </span>
                          <span className="font-semibold text-white truncate max-w-[130px]">
                            {student.name}
                          </span>
                        </div>
                      </td>

                      {/* Overall Average */}
                      <td className="p-3 text-center">
                        <span
                          className={`font-black text-xs px-2 py-0.5 rounded-lg ${
                            percent >= 90
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : percent >= 80
                              ? 'bg-blue-500/20 text-blue-300'
                              : percent >= 70
                              ? 'bg-amber-500/20 text-amber-300'
                              : 'bg-rose-500/20 text-rose-300'
                          }`}
                        >
                          {percent}% ({letter})
                        </span>
                      </td>

                      {/* Scores for each assignment */}
                      {classAssignments.map((asg) => {
                        const gradeRecord = grades.find(
                          (g) => g.assignmentId === asg.id && g.studentId === student.id
                        );
                        const score = gradeRecord?.score;

                        return (
                          <td
                            key={asg.id}
                            className="p-2 text-center border-l border-slate-800/80"
                          >
                            <div className="flex items-center justify-center gap-1">
                              <input
                                type="number"
                                min="0"
                                max={asg.maxPoints}
                                value={typeof score === 'number' ? score : ''}
                                placeholder="-"
                                onChange={(e) => {
                                  const val = e.target.value === '' ? 0 : Number(e.target.value);
                                  onUpdateGrade(asg.id, student.id, val);
                                }}
                                className="w-14 text-center py-1 bg-slate-900 border border-slate-700 rounded-lg text-xs font-bold text-white focus:outline-none focus:border-blue-500 focus:bg-slate-950 transition"
                              />
                              <span className="text-[10px] text-slate-500">
                                /{asg.maxPoints}
                              </span>
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* VIEW B: Assignments & Tasks Cards */}
      {activeTab === 'assignments' && (
        <div className="space-y-3">
          {classAssignments.length === 0 ? (
            <div className="rounded-2xl border border-slate-700 bg-slate-800/80 p-8 text-center text-xs text-slate-400">
              No assignments found in this category.{' '}
              <button
                onClick={onOpenNewAssignmentModal}
                className="text-blue-400 underline font-medium"
              >
                Create an assignment
              </button>
            </div>
          ) : (
            classAssignments.map((asg) => {
              // Stats for this assignment
              const asgGrades = grades.filter((g) => g.assignmentId === asg.id);
              const gradedCount = asgGrades.length;
              const totalClass = classStudents.length;

              const isFocused = focusedAssignmentId === asg.id;

              return (
                <div
                  key={asg.id}
                  id={`assignment-card-${asg.id}`}
                  className={`rounded-2xl border bg-slate-800/80 p-4 shadow-sm transition ${
                    isFocused
                      ? 'border-blue-500 ring-2 ring-blue-500/30'
                      : 'border-slate-700 hover:border-slate-600'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                          {asg.category}
                        </span>
                        <h3 className="text-sm font-bold text-white">
                          {asg.title}
                        </h3>
                      </div>
                      <p className="text-xs text-slate-400 mt-1 max-w-xl">
                        {asg.description}
                      </p>
                    </div>

                    {/* Status Pill & Select */}
                    <div className="flex items-center gap-2">
                      <select
                        value={asg.status}
                        onChange={(e) =>
                          onUpdateAssignmentStatus(asg.id, e.target.value as any)
                        }
                        className="text-xs bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-slate-300 font-semibold focus:outline-none"
                      >
                        <option value="assigned">Assigned</option>
                        <option value="collected">Collected</option>
                        <option value="grading">Grading</option>
                        <option value="graded">Graded</option>
                        <option value="returned">Returned</option>
                      </select>
                    </div>
                  </div>

                  <div className="mt-3.5 pt-3 border-t border-slate-700/60 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1 text-slate-300">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        Due {asg.dueDate}
                      </span>
                      <span>·</span>
                      <span>Max {asg.maxPoints} pts</span>
                      <span>·</span>
                      <span>Weight: {asg.weight}x</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-slate-300">
                        Graded: {gradedCount} / {totalClass}
                      </span>
                      <div className="w-24 h-2 rounded-full bg-slate-900 overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 transition-all duration-300"
                          style={{
                            width: `${totalClass > 0 ? (gradedCount / totalClass) * 100 : 0}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};
