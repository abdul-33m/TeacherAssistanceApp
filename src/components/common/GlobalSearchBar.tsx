import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Search,
  X,
  Users,
  Award,
  BookOpen,
  TrendingUp,
  ChevronRight,
  StickyNote,
} from 'lucide-react';
import { Assignment, ClassGroup, LessonPlan, Student, TeacherNote } from '../../types';

export type SearchFilterCategory = 'all' | 'students' | 'assignments' | 'lessons' | 'notes';

interface GlobalSearchBarProps {
  classes: ClassGroup[];
  students: Student[];
  assignments: Assignment[];
  lessonPlans: LessonPlan[];
  teacherNotes?: TeacherNote[];
  onSelectStudent: (student: Student, destination: 'students' | 'progress') => void;
  onSelectAssignment: (assignment: Assignment) => void;
  onSelectLessonPlan: (lesson: LessonPlan) => void;
  onSelectTeacherNote?: (note: TeacherNote) => void;
}

type SearchResultEntry =
  | { kind: 'student'; item: Student }
  | { kind: 'assignment'; item: Assignment }
  | { kind: 'lesson'; item: LessonPlan }
  | { kind: 'note'; item: TeacherNote };

function matchesAllTokens(searchable: string, tokens: string[]): boolean {
  if (tokens.length === 0) return false;
  const lower = searchable.toLowerCase();
  return tokens.every((token) => lower.includes(token));
}

export const GlobalSearchBar: React.FC<GlobalSearchBarProps> = ({
  classes,
  students,
  assignments,
  lessonPlans,
  teacherNotes = [],
  onSelectStudent,
  onSelectAssignment,
  onSelectLessonPlan,
  onSelectTeacherNote,
}) => {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<SearchFilterCategory>('all');
  const [isOpen, setIsOpen] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const desktopInputRef = useRef<HTMLInputElement>(null);
  const mobileInputRef = useRef<HTMLInputElement>(null);

  const classMap = useMemo(() => {
    const map = new Map<string, ClassGroup>();
    classes.forEach((c) => map.set(c.id, c));
    return map;
  }, [classes]);

  const trimmed = query.trim();
  const tokens = useMemo(
    () =>
      trimmed
        .toLowerCase()
        .split(/\s+/)
        .filter((t) => t.length > 0),
    [trimmed]
  );

  const searchMatches = useMemo(() => {
    if (tokens.length === 0) {
      return {
        students: [] as Student[],
        assignments: [] as Assignment[],
        lessons: [] as LessonPlan[],
        notes: [] as TeacherNote[],
        totalStudents: 0,
        totalAssignments: 0,
        totalLessons: 0,
        totalNotes: 0,
      };
    }

    const matchedStudents = students.filter((s) => {
      const cls = classMap.get(s.classId);
      const haystack = [
        s.name,
        s.rollNumber,
        `#${s.rollNumber}`,
        `roll ${s.rollNumber}`,
        s.classId,
        cls?.name || '',
        s.accommodations || '',
        s.guardianName || '',
      ].join(' ');
      return matchesAllTokens(haystack, tokens);
    });

    const matchedAssignments = assignments.filter((a) => {
      const cls = classMap.get(a.classId);
      const haystack = [
        a.title,
        a.description,
        a.category,
        a.classId,
        cls?.name || '',
        a.grammarTopic || '',
        a.bookChapter || '',
        a.dueDate,
        a.status,
      ].join(' ');
      return matchesAllTokens(haystack, tokens);
    });

    const matchedLessons = lessonPlans.filter((lp) => {
      const cls = classMap.get(lp.classId);
      const haystack = [
        lp.title,
        lp.unit,
        lp.grammarFocus,
        lp.classId,
        cls?.name || '',
        `grade ${lp.grade}`,
        lp.date,
        lp.attachmentName || '',
        ...(lp.objectives || []),
      ].join(' ');
      return matchesAllTokens(haystack, tokens);
    });

    const matchedNotes = teacherNotes.filter((n) => {
      const cls = classMap.get(n.classId);
      const haystack = [
        n.title,
        n.content,
        n.category,
        n.classId,
        cls?.name || '',
        n.attachmentName || '',
        n.date,
      ].join(' ');
      return matchesAllTokens(haystack, tokens);
    });

    const studentLimit = category === 'students' ? 12 : 5;
    const assignmentLimit = category === 'assignments' ? 12 : 4;
    const lessonLimit = category === 'lessons' ? 12 : 4;
    const noteLimit = category === 'notes' ? 12 : 4;

    return {
      students: category === 'all' || category === 'students' ? matchedStudents.slice(0, studentLimit) : [],
      assignments: category === 'all' || category === 'assignments' ? matchedAssignments.slice(0, assignmentLimit) : [],
      lessons: category === 'all' || category === 'lessons' ? matchedLessons.slice(0, lessonLimit) : [],
      notes: category === 'all' || category === 'notes' ? matchedNotes.slice(0, noteLimit) : [],
      totalStudents: matchedStudents.length,
      totalAssignments: matchedAssignments.length,
      totalLessons: matchedLessons.length,
      totalNotes: matchedNotes.length,
    };
  }, [tokens, students, assignments, lessonPlans, teacherNotes, classMap, category]);

  const flatEntries = useMemo<SearchResultEntry[]>(() => {
    const list: SearchResultEntry[] = [];
    searchMatches.students.forEach((item) => list.push({ kind: 'student', item }));
    searchMatches.assignments.forEach((item) => list.push({ kind: 'assignment', item }));
    searchMatches.lessons.forEach((item) => list.push({ kind: 'lesson', item }));
    searchMatches.notes.forEach((item) => list.push({ kind: 'note', item }));
    return list;
  }, [searchMatches]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query, category]);

  // Global keyboard shortcuts (Cmd/Ctrl+K or '/')
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isEditing =
        target &&
        (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) ||
          target.isContentEditable);

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (window.innerWidth < 768) {
          setIsMobileOpen(true);
          setTimeout(() => mobileInputRef.current?.focus(), 20);
        } else {
          setIsOpen(true);
          desktopInputRef.current?.focus();
          desktopInputRef.current?.select();
        }
        return;
      }

      if (e.key === '/' && !isEditing && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        if (window.innerWidth < 768) {
          setIsMobileOpen(true);
          setTimeout(() => mobileInputRef.current?.focus(), 20);
        } else {
          setIsOpen(true);
          desktopInputRef.current?.focus();
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  // Outside click closes desktop popover
  useEffect(() => {
    const handlePointerDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, []);

  const closeAll = () => {
    setIsOpen(false);
    setIsMobileOpen(false);
  };

  const handleActivateEntry = (entry: SearchResultEntry) => {
    if (entry.kind === 'student') {
      onSelectStudent(entry.item, 'students');
    } else if (entry.kind === 'assignment') {
      onSelectAssignment(entry.item);
    } else if (entry.kind === 'lesson') {
      onSelectLessonPlan(entry.item);
    } else if (onSelectTeacherNote) {
      onSelectTeacherNote(entry.item);
    }
    setQuery('');
    closeAll();
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      closeAll();
      (e.target as HTMLInputElement).blur();
      return;
    }

    if (flatEntries.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) => (prev + 1) % flatEntries.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) => (prev - 1 + flatEntries.length) % flatEntries.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const target = flatEntries[activeIndex] || flatEntries[0];
      if (target) {
        handleActivateEntry(target);
      }
    }
  };

  const totalMatches =
    searchMatches.totalStudents +
    searchMatches.totalAssignments +
    searchMatches.totalLessons +
    searchMatches.totalNotes;

  const renderResultsBody = () => {
    if (tokens.length === 0) {
      return (
        <div className="p-4 text-xs text-slate-400 space-y-2">
          <p className="text-slate-300 font-medium">
            Search across all classes (6A, 6B, 7A, 7B)
          </p>
          <div className="space-y-1 text-[11px] text-slate-400">
            <p>Students by name, roll number, class, or accommodations (e.g. &quot;Maya 6A&quot;)</p>
            <p>Assignments by title, category, or due date (e.g. &quot;Narrative&quot;)</p>
            <p>Lesson plans by unit, grammar focus, or grade (e.g. &quot;Active Voice&quot;)</p>
          </div>
        </div>
      );
    }

    let runningIdx = 0;

    return (
      <div className="flex flex-col max-h-[65vh] sm:max-h-[420px]">
        {/* Category Filter Tabs */}
        <div className="flex items-center gap-1 px-3 py-2 border-b border-slate-800 bg-slate-900/95 overflow-x-auto">
          <button
            type="button"
            onClick={() => setCategory('all')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap shrink-0 transition-colors ${
              category === 'all'
                ? 'bg-blue-600 text-white'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            All ({totalMatches})
          </button>
          <button
            type="button"
            onClick={() => setCategory('students')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap shrink-0 transition-colors ${
              category === 'students'
                ? 'bg-blue-600 text-white'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            Students ({searchMatches.totalStudents})
          </button>
          <button
            type="button"
            onClick={() => setCategory('assignments')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap shrink-0 transition-colors ${
              category === 'assignments'
                ? 'bg-blue-600 text-white'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            Assignments ({searchMatches.totalAssignments})
          </button>
          <button
            type="button"
            onClick={() => setCategory('lessons')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap shrink-0 transition-colors ${
              category === 'lessons'
                ? 'bg-blue-600 text-white'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            Lessons ({searchMatches.totalLessons})
          </button>
          <button
            type="button"
            onClick={() => setCategory('notes')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap shrink-0 transition-colors ${
              category === 'notes'
                ? 'bg-blue-600 text-white'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            Notes ({searchMatches.totalNotes})
          </button>
        </div>

        {/* Scrollable Matches */}
        <div className="overflow-y-auto divide-y divide-slate-800/80">
          {flatEntries.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-400">
              No students, assignments, or lesson plans match &ldquo;{trimmed}&rdquo;.
            </div>
          ) : (
            <>
              {/* Students Section */}
              {searchMatches.students.length > 0 && (
                <div className="py-1.5">
                  <div className="px-3 py-1 flex items-center justify-between text-[11px] font-semibold text-slate-400">
                    <span className="flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-emerald-400" />
                      Students
                    </span>
                    <span className="tabular-nums text-slate-500">
                      Showing {searchMatches.students.length} of {searchMatches.totalStudents}
                    </span>
                  </div>
                  {searchMatches.students.map((student) => {
                    const idx = runningIdx++;
                    const isHighlighted = idx === activeIndex;
                    const cls = classMap.get(student.classId);
                    return (
                      <div
                        key={student.id}
                        onMouseEnter={() => setActiveIndex(idx)}
                        className={`px-3 py-2 flex items-center justify-between gap-2 transition-colors ${
                          isHighlighted ? 'bg-slate-800/90' : 'hover:bg-slate-800/60'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => handleActivateEntry({ kind: 'student', item: student })}
                          className="flex items-center gap-2.5 min-w-0 flex-1 text-left focus:outline-none"
                        >
                          <div
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-bold text-white shrink-0"
                            style={{ backgroundColor: student.avatarColor || cls?.color || '#3b82f6' }}
                          >
                            {student.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-semibold text-white truncate">
                              {student.name}
                            </p>
                            <div className="flex items-center gap-1.5 text-[11px] text-slate-400 truncate">
                              <span className="tabular-nums">Roll #{student.rollNumber}</span>
                              <span aria-hidden="true">·</span>
                              <span>{cls?.name || student.classId}</span>
                              {student.accommodations && (
                                <>
                                  <span aria-hidden="true">·</span>
                                  <span className="truncate text-amber-300/90">
                                    {student.accommodations}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </button>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              onSelectStudent(student, 'progress');
                              setQuery('');
                              closeAll();
                            }}
                            className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-blue-600 border border-slate-700 hover:border-blue-500 text-[11px] font-medium text-slate-300 hover:text-white flex items-center gap-1 transition-colors whitespace-nowrap"
                            title="Open student progress tracker"
                          >
                            <TrendingUp className="w-3 h-3" />
                            <span>Progress</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleActivateEntry({ kind: 'student', item: student })}
                            className="p-1 rounded-lg text-slate-400 hover:text-white"
                            aria-label={`Open ${student.name} profile`}
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Assignments Section */}
              {searchMatches.assignments.length > 0 && (
                <div className="py-1.5">
                  <div className="px-3 py-1 flex items-center justify-between text-[11px] font-semibold text-slate-400">
                    <span className="flex items-center gap-1.5">
                      <Award className="w-3.5 h-3.5 text-blue-400" />
                      Assignments
                    </span>
                    <span className="tabular-nums text-slate-500">
                      Showing {searchMatches.assignments.length} of {searchMatches.totalAssignments}
                    </span>
                  </div>
                  {searchMatches.assignments.map((asg) => {
                    const idx = runningIdx++;
                    const isHighlighted = idx === activeIndex;
                    const cls = classMap.get(asg.classId);
                    return (
                      <button
                        key={asg.id}
                        type="button"
                        onMouseEnter={() => setActiveIndex(idx)}
                        onClick={() => handleActivateEntry({ kind: 'assignment', item: asg })}
                        className={`w-full px-3 py-2 flex items-center justify-between gap-2 text-left transition-colors ${
                          isHighlighted ? 'bg-slate-800/90' : 'hover:bg-slate-800/60'
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-white truncate">
                            {asg.title}
                          </p>
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-400 truncate mt-0.5">
                            <span>{cls?.name || asg.classId}</span>
                            <span aria-hidden="true">·</span>
                            <span>{asg.category}</span>
                            <span aria-hidden="true">·</span>
                            <span className="tabular-nums">Due {asg.dueDate}</span>
                            <span aria-hidden="true">·</span>
                            <span className="tabular-nums">{asg.maxPoints} pts</span>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Lesson Plans Section */}
              {searchMatches.lessons.length > 0 && (
                <div className="py-1.5">
                  <div className="px-3 py-1 flex items-center justify-between text-[11px] font-semibold text-slate-400">
                    <span className="flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-purple-400" />
                      Lesson Plans
                    </span>
                    <span className="tabular-nums text-slate-500">
                      Showing {searchMatches.lessons.length} of {searchMatches.totalLessons}
                    </span>
                  </div>
                  {searchMatches.lessons.map((plan) => {
                    const idx = runningIdx++;
                    const isHighlighted = idx === activeIndex;
                    const cls = classMap.get(plan.classId);
                    return (
                      <button
                        key={plan.id}
                        type="button"
                        onMouseEnter={() => setActiveIndex(idx)}
                        onClick={() => handleActivateEntry({ kind: 'lesson', item: plan })}
                        className={`w-full px-3 py-2 flex items-center justify-between gap-2 text-left transition-colors ${
                          isHighlighted ? 'bg-slate-800/90' : 'hover:bg-slate-800/60'
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-white truncate">
                            {plan.title}
                          </p>
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-400 truncate mt-0.5">
                            <span>{cls?.name || `Grade ${plan.grade}`}</span>
                            <span aria-hidden="true">·</span>
                            <span className="truncate">{plan.grammarFocus || plan.unit}</span>
                            <span aria-hidden="true">·</span>
                            <span className="tabular-nums">{plan.date}</span>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                      </button>
                    );
                  })}
                </div>
              )}
              {/* Teacher Notes Section */}
              {searchMatches.notes.length > 0 && (
                <div className="py-1.5">
                  <div className="px-3 py-1 flex items-center justify-between text-[11px] font-semibold text-slate-400">
                    <span className="flex items-center gap-1.5">
                      <StickyNote className="w-3.5 h-3.5 text-amber-400" />
                      Notes & PDFs
                    </span>
                    <span className="tabular-nums text-slate-500">
                      Showing {searchMatches.notes.length} of {searchMatches.totalNotes}
                    </span>
                  </div>
                  {searchMatches.notes.map((note) => {
                    const idx = runningIdx++;
                    const isHighlighted = idx === activeIndex;
                    const cls = classMap.get(note.classId);
                    return (
                      <button
                        key={note.id}
                        type="button"
                        onMouseEnter={() => setActiveIndex(idx)}
                        onClick={() => handleActivateEntry({ kind: 'note', item: note })}
                        className={`w-full px-3 py-2 flex items-center justify-between gap-2 text-left transition-colors ${
                          isHighlighted ? 'bg-slate-800/90' : 'hover:bg-slate-800/60'
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-white truncate">
                            {note.title}
                          </p>
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-400 truncate mt-0.5">
                            <span>{cls?.name || 'All Classes'}</span>
                            <span aria-hidden="true">·</span>
                            <span>{note.attachmentName || note.category}</span>
                            <span aria-hidden="true">·</span>
                            <span className="tabular-nums">{note.date}</span>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                      </button>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Desktop Inline Global Search Input + Popover */}
      <div ref={containerRef} className="relative hidden md:block flex-1 max-w-sm">
        <div className="relative flex items-center">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
          <input
            ref={desktopInputRef}
            type="text"
            value={query}
            onFocus={() => setIsOpen(true)}
            onChange={(e) => {
              setQuery(e.target.value);
              setIsOpen(true);
            }}
            onKeyDown={handleInputKeyDown}
            placeholder="Search students, assignments, lessons..."
            aria-label="Global search for students, assignments, or lesson plans"
            className="w-full h-9 pl-9 pr-14 bg-slate-800/90 border border-slate-700 hover:border-slate-600 focus:border-blue-500 focus:bg-slate-900 rounded-xl text-xs text-white placeholder:text-slate-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 transition-colors"
          />
          {query ? (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                desktopInputRef.current?.focus();
              }}
              className="absolute right-2 p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
              aria-label="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : (
            <kbd className="absolute right-2.5 px-1.5 py-0.5 text-[10px] font-mono text-slate-400 bg-slate-900 border border-slate-700 rounded pointer-events-none">
              /
            </kbd>
          )}
        </div>

        {isOpen && (
          <div className="absolute left-0 right-0 top-full mt-2 w-[440px] max-w-[90vw] rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl overflow-hidden z-50">
            {renderResultsBody()}
          </div>
        )}
      </div>

      {/* Mobile Search Trigger Button */}
      <button
        type="button"
        onClick={() => {
          setIsMobileOpen(true);
          setTimeout(() => mobileInputRef.current?.focus(), 20);
        }}
        className="md:hidden p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white transition-colors min-w-[40px] min-h-[40px] flex items-center justify-center"
        aria-label="Search students, assignments, or lesson plans"
        title="Search"
      >
        <Search className="w-4 h-4" />
      </button>

      {/* Mobile Search Palette Overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm p-3 flex flex-col md:hidden"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              closeAll();
            }
          }}
        >
          <div className="w-full rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl overflow-hidden">
            <div className="p-2.5 border-b border-slate-800 flex items-center gap-2">
              <Search className="w-4 h-4 text-slate-400 shrink-0 ml-1" />
              <input
                ref={mobileInputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleInputKeyDown}
                placeholder="Search students, assignments, lessons..."
                aria-label="Global search for students, assignments, or lesson plans"
                className="flex-1 bg-transparent text-sm text-white placeholder:text-slate-400 focus:outline-none py-1.5"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery('');
                    mobileInputRef.current?.focus();
                  }}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white"
                  aria-label="Clear search"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
              <button
                type="button"
                onClick={closeAll}
                className="px-2.5 py-1.5 rounded-xl bg-slate-800 text-xs font-semibold text-slate-200 hover:bg-slate-700"
              >
                Close
              </button>
            </div>
            {renderResultsBody()}
          </div>
        </div>
      )}
    </>
  );
};
