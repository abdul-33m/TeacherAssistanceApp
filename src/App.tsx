import React, { useState, useEffect, useRef } from 'react';
import {
  LayoutDashboard,
  Users,
  Award,
  BookOpen,
  UserCheck,
  Lock,
  Unlock,
  Cloud,
  TrendingUp,
  LogIn,
  LogOut,
  AlertCircle,
  X,
  RefreshCw,
} from 'lucide-react';
import {
  AppDatabase,
  BookStudy,
  ClassGroup,
  Student,
  AttendanceRecord,
  AttendanceStatus,
  Assignment,
  GradeRecord,
  LessonPlan,
  GrammarExercise,
  EncryptedTeacherNote,
  AssignmentCompletionStatus,
  LessonMasteryStatus,
  StudentLessonProgress,
  StudentCumulativeProgress,
  MonthlyAssessmentRecord,
  ParticipationItem,
  TeacherNote,
} from './types';
import { StorageService, getDefaultDatabase } from './services/storage';
import { CryptoVault } from './services/crypto';
import { PdfExportService } from './services/pdfExport';
import { useOnlineStatus } from './hooks/useOnlineStatus';
import { useAuth } from './context/AuthContext';
import {
  ensureUserWorkspaceSeeded,
  subscribeToUserWorkspace,
  FirestoreService,
} from './services/firestoreService';
import { PWAInstallButton } from './components/common/PWAInstallButton';
import { OfflineIndicator } from './components/common/OfflineIndicator';
import { GlobalSearchBar } from './components/common/GlobalSearchBar';

// Views
import { DashboardView } from './components/views/DashboardView';
import { AttendanceView } from './components/views/AttendanceView';
import { GradebookView } from './components/views/GradebookView';
import { StudentProgressTrackingView } from './components/views/StudentProgressTrackingView';
import { LessonsGrammarView } from './components/views/LessonsGrammarView';
import { StudentRosterView } from './components/views/StudentRosterView';

// Modals
import { ClassManagerModal } from './components/modals/ClassManagerModal';
import { CreateAssignmentModal } from './components/modals/CreateAssignmentModal';
import { BackupSyncModal } from './components/modals/BackupSyncModal';
import { EncryptedVaultModal } from './components/modals/EncryptedVaultModal';

type NavTab = 'dashboard' | 'attendance' | 'gradebook' | 'progress' | 'lessons' | 'students';

export default function App() {
  const isOnline = useOnlineStatus();
  const {
    user,
    authReady,
    isSigningIn,
    authError,
    signInWithGoogle,
    signOutUser,
    clearAuthError,
  } = useAuth();

  // App database state
  const [db, setDb] = useState<AppDatabase>(() => StorageService.load());
  const dbRef = useRef<AppDatabase>(db);
  dbRef.current = db;

  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [activeClassId, setActiveClassId] = useState<string>(() => {
    return db.settings.activeClassId || '6A';
  });

  // Dark mode state
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    return db.settings.isDarkMode !== false;
  });

  // Vault state
  const [isVaultUnlocked, setIsVaultUnlocked] = useState<boolean>(CryptoVault.isUnlocked());

  // Cloud sync UI state
  const [isCloudSyncing, setIsCloudSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  // Modal open states
  const [showClassModal, setShowClassModal] = useState(false);
  const [classModalMode, setClassModalMode] = useState<'list' | 'create' | { editId: string }>('list');
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [showBackupModal, setShowBackupModal] = useState(false);
  const [showVaultModal, setShowVaultModal] = useState(false);

  // Global search deep-focus state
  const [searchFocus, setSearchFocus] = useState<{
    type: 'student' | 'assignment' | 'lesson' | 'note';
    id: string;
    token: number;
  } | null>(null);

  const handleCloudWriteError = (err: unknown) => {
    console.error('Firestore persistence error:', err);
    setSyncError('Saved locally; unable to sync latest change to cloud.');
  };

  // Sync state to local storage whenever db changes
  useEffect(() => {
    StorageService.save(db);
  }, [db]);

  // Sync dark mode class on document
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Connect Firebase Auth + Firestore real-time workspace listener
  useEffect(() => {
    if (!authReady || !user) {
      setIsCloudSyncing(false);
      return;
    }

    let cancelled = false;
    let unsubscribe: (() => void) | null = null;

    const connectWorkspace = async () => {
      setIsCloudSyncing(true);
      setSyncError(null);
      try {
        await ensureUserWorkspaceSeeded(user, dbRef.current);
        if (cancelled) return;

        unsubscribe = subscribeToUserWorkspace(
          user.uid,
          getDefaultDatabase(),
          (cloudDb) => {
            if (cancelled) return;
            setDb(cloudDb);
            if (cloudDb.settings.activeClassId) {
              setActiveClassId(cloudDb.settings.activeClassId);
            }
            if (typeof cloudDb.settings.isDarkMode === 'boolean') {
              setIsDarkMode(cloudDb.settings.isDarkMode);
            }
            if (cloudDb.settings.vaultSalt) {
              localStorage.setItem('gradecraft_vault_salt', cloudDb.settings.vaultSalt);
            }
            setIsCloudSyncing(false);
          }
        );
      } catch (err) {
        if (!cancelled) {
          console.error('Firestore workspace connection error:', err);
          setSyncError('Cloud workspace sync unavailable. Operating on local offline database.');
          setIsCloudSyncing(false);
        }
      }
    };

    connectWorkspace();

    return () => {
      cancelled = true;
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [authReady, user]);

  // Handle active class change
  const handleSelectClass = (classId: string) => {
    setActiveClassId(classId);
    const nextSettings = { ...dbRef.current.settings, activeClassId: classId };
    setDb((prev) => ({
      ...prev,
      settings: { ...prev.settings, activeClassId: classId },
    }));
    if (user) {
      FirestoreService.saveUserSettings(
        user.uid,
        user,
        nextSettings,
        dbRef.current.academicYears
      ).catch(handleCloudWriteError);
    }
  };

  // Attendance save handler
  const handleSaveAttendance = (
    classId: string,
    date: string,
    records: Record<string, AttendanceStatus>,
    notes?: string
  ) => {
    const newRecord: AttendanceRecord = {
      id: `${classId}_${date}`,
      classId,
      date,
      records,
      notes,
    };

    setDb((prev) => {
      const existingIdx = prev.attendance.findIndex(
        (a) => a.classId === classId && a.date === date
      );
      const updatedList = [...prev.attendance];
      if (existingIdx >= 0) {
        updatedList[existingIdx] = newRecord;
      } else {
        updatedList.push(newRecord);
      }
      return {
        ...prev,
        attendance: updatedList,
      };
    });

    if (user) {
      FirestoreService.saveAttendanceRecord(user.uid, newRecord).catch(handleCloudWriteError);
    }
  };

  // Grade update handler
  const handleUpdateGrade = (
    assignmentId: string,
    studentId: string,
    score: number,
    feedback?: string
  ) => {
    const existing = dbRef.current.grades;
    const existingIdx = existing.findIndex(
      (g) => g.assignmentId === assignmentId && g.studentId === studentId
    );
    const newGrade: GradeRecord = {
      id: `${assignmentId}_${studentId}`,
      assignmentId,
      studentId,
      score,
      feedback,
      submitted: true,
      gradedAt: new Date().toISOString().split('T')[0],
    };
    const nextGrades = [...existing];
    if (existingIdx >= 0) {
      nextGrades[existingIdx] = newGrade;
    } else {
      nextGrades.push(newGrade);
    }

    setDb((prev) => ({ ...prev, grades: nextGrades }));

    if (user) {
      const forAssignment = nextGrades.filter((g) => g.assignmentId === assignmentId);
      FirestoreService.saveAssignmentGradesMap(user.uid, assignmentId, forAssignment).catch(
        handleCloudWriteError
      );
    }
  };

  // Student Progress: Assignment Score, Completion Status & Specific Feedback
  const handleSaveAssignmentProgress = (
    assignmentId: string,
    studentId: string,
    score: number,
    status: AssignmentCompletionStatus,
    feedback?: string
  ) => {
    const existing = dbRef.current.grades;
    const existingIdx = existing.findIndex(
      (g) => g.assignmentId === assignmentId && g.studentId === studentId
    );
    const newGrade: GradeRecord = {
      id: `${assignmentId}_${studentId}`,
      assignmentId,
      studentId,
      score,
      completionStatus: status,
      feedback,
      submitted: status === 'completed',
      gradedAt: new Date().toISOString().split('T')[0],
    };
    const nextGrades = [...existing];
    if (existingIdx >= 0) {
      nextGrades[existingIdx] = newGrade;
    } else {
      nextGrades.push(newGrade);
    }

    setDb((prev) => ({ ...prev, grades: nextGrades }));

    if (user) {
      const forAssignment = nextGrades.filter((g) => g.assignmentId === assignmentId);
      FirestoreService.saveAssignmentGradesMap(user.uid, assignmentId, forAssignment).catch(
        handleCloudWriteError
      );
    }
  };

  // Student Progress: Lesson Mastery, Exit Ticket & Teacher Notes
  const handleSaveLessonProgress = (
    lessonId: string,
    studentId: string,
    status: LessonMasteryStatus,
    exitTicketScore?: number,
    exitTicketCompleted?: boolean,
    notes?: string
  ) => {
    const list = [...(dbRef.current.studentLessonProgress || [])];
    const existingIdx = list.findIndex(
      (lp) => lp.lessonId === lessonId && lp.studentId === studentId
    );
    const updatedItem: StudentLessonProgress = {
      id: `${lessonId}_${studentId}`,
      lessonId,
      studentId,
      status,
      exitTicketScore,
      exitTicketCompleted: exitTicketCompleted ?? true,
      notes,
      updatedAt: new Date().toISOString().split('T')[0],
    };
    if (existingIdx >= 0) {
      list[existingIdx] = updatedItem;
    } else {
      list.push(updatedItem);
    }

    setDb((prev) => ({ ...prev, studentLessonProgress: list }));

    if (user) {
      const forLesson = list.filter((lp) => lp.lessonId === lessonId);
      FirestoreService.saveLessonProgressMap(user.uid, lessonId, forLesson).catch(
        handleCloudWriteError
      );
    }
  };

  // Student Progress: Cumulative Remarks & Goals
  const handleSaveCumulativeProgress = (
    studentId: string,
    updates: Partial<StudentCumulativeProgress>
  ) => {
    const list = [...(dbRef.current.cumulativeProgress || [])];
    const existingIdx = list.findIndex((c) => c.studentId === studentId);
    const updatedItem: StudentCumulativeProgress = {
      id: studentId,
      studentId,
      ...(existingIdx >= 0 ? list[existingIdx] : {}),
      ...updates,
      updatedAt: new Date().toISOString().split('T')[0],
    };
    if (existingIdx >= 0) {
      list[existingIdx] = updatedItem;
    } else {
      list.push(updatedItem);
    }

    setDb((prev) => ({ ...prev, cumulativeProgress: list }));

    if (user) {
      const studentObj = dbRef.current.students.find((s) => s.id === studentId);
      const targetClassId = studentObj?.classId || activeClassId;
      const classStudentIds = new Set(
        dbRef.current.students
          .filter((s) => s.classId === targetClassId)
          .map((s) => s.id)
      );
      classStudentIds.add(studentId);
      const classCumulative = list.filter((c) => classStudentIds.has(c.studentId));
      FirestoreService.saveCumulativeProgressMap(user.uid, targetClassId, classCumulative).catch(
        handleCloudWriteError
      );
    }
  };

  // Assignment status update
  const handleUpdateAssignmentStatus = (
    assignmentId: string,
    status: Assignment['status']
  ) => {
    const target = dbRef.current.assignments.find((a) => a.id === assignmentId);
    setDb((prev) => ({
      ...prev,
      assignments: prev.assignments.map((a) =>
        a.id === assignmentId ? { ...a, status } : a
      ),
    }));

    if (user && target) {
      FirestoreService.saveAssignment(user.uid, { ...target, status }).catch(
        handleCloudWriteError
      );
    }
  };

  // Save new assignment
  const handleSaveAssignment = (asg: Assignment) => {
    setDb((prev) => ({
      ...prev,
      assignments: [asg, ...prev.assignments],
    }));
    if (user) {
      FirestoreService.saveAssignment(user.uid, asg).catch(handleCloudWriteError);
    }
  };

  // Save lesson plan
  const handleSaveLessonPlan = (plan: LessonPlan) => {
    setDb((prev) => {
      const idx = prev.lessonPlans.findIndex((p) => p.id === plan.id);
      const updated = [...prev.lessonPlans];
      if (idx >= 0) {
        updated[idx] = plan;
      } else {
        updated.unshift(plan);
      }
      return { ...prev, lessonPlans: updated };
    });
    if (user) {
      FirestoreService.saveLessonPlan(user.uid, plan).catch(handleCloudWriteError);
    }
  };

  // Delete lesson plan
  const handleDeleteLessonPlan = (lessonId: string) => {
    setDb((prev) => ({
      ...prev,
      lessonPlans: prev.lessonPlans.filter((p) => p.id !== lessonId),
    }));
    if (user) {
      FirestoreService.deleteLessonPlan(user.uid, lessonId).catch(handleCloudWriteError);
    }
  };

  // Save custom teacher note / PDF handout
  const handleSaveTeacherNote = (note: TeacherNote) => {
    setDb((prev) => {
      const list = [...(prev.teacherNotes || [])];
      const idx = list.findIndex((n) => n.id === note.id);
      if (idx >= 0) {
        list[idx] = note;
      } else {
        list.unshift(note);
      }
      return { ...prev, teacherNotes: list };
    });
    if (user) {
      FirestoreService.saveTeacherNote(user.uid, note).catch(handleCloudWriteError);
    }
  };

  // Delete custom teacher note
  const handleDeleteTeacherNote = (noteId: string) => {
    setDb((prev) => ({
      ...prev,
      teacherNotes: (prev.teacherNotes || []).filter((n) => n.id !== noteId),
    }));
    if (user) {
      FirestoreService.deleteTeacherNote(user.uid, noteId).catch(handleCloudWriteError);
    }
  };

  // Update literature book progress
  const handleUpdateBookProgress = (book: BookStudy) => {
    setDb((prev) => ({
      ...prev,
      books: prev.books.map((b) => (b.id === book.id ? book : b)),
    }));
    if (user) {
      FirestoreService.saveBookStudy(user.uid, book).catch(handleCloudWriteError);
    }
  };

  // Save grammar exercise
  const handleSaveGrammarExercise = (exercise: GrammarExercise) => {
    setDb((prev) => ({
      ...prev,
      grammarExercises: [exercise, ...prev.grammarExercises],
    }));
    if (user) {
      FirestoreService.saveGrammarExercise(user.uid, exercise).catch(handleCloudWriteError);
    }
  };

  // Save encrypted note
  const handleSaveEncryptedNote = (note: EncryptedTeacherNote) => {
    setDb((prev) => ({
      ...prev,
      encryptedNotes: [note, ...prev.encryptedNotes],
    }));
    if (user) {
      FirestoreService.saveEncryptedNote(user.uid, note).catch(handleCloudWriteError);
    }
  };

  // Save class definition
  const handleSaveClass = (cls: ClassGroup) => {
    setDb((prev) => {
      const idx = prev.classes.findIndex((c) => c.id === cls.id);
      const updated = [...prev.classes];
      if (idx >= 0) {
        updated[idx] = cls;
      } else {
        updated.push(cls);
      }
      return { ...prev, classes: updated };
    });
    if (user) {
      FirestoreService.saveClassGroup(user.uid, cls).catch(handleCloudWriteError);
    }
  };

  // Delete class
  const handleDeleteClass = (classId: string) => {
    setDb((prev) => ({
      ...prev,
      classes: prev.classes.filter((c) => c.id !== classId),
    }));
    if (user) {
      FirestoreService.deleteClassGroup(user.uid, classId).catch(handleCloudWriteError);
    }
  };

  // Student roster handlers
  const handleSaveStudent = (student: Student) => {
    setDb((prev) => {
      const idx = prev.students.findIndex((s) => s.id === student.id);
      const updated = [...prev.students];
      if (idx >= 0) {
        updated[idx] = student;
      } else {
        updated.push(student);
      }
      return { ...prev, students: updated };
    });
    if (user) {
      FirestoreService.saveStudent(user.uid, student).catch(handleCloudWriteError);
    }
  };

  const handleBulkAddStudents = (newStudents: Student[]) => {
    setDb((prev) => ({
      ...prev,
      students: [...prev.students, ...newStudents],
    }));
    if (user && newStudents.length > 0) {
      FirestoreService.saveStudentsBatch(user.uid, newStudents).catch(handleCloudWriteError);
    }
  };

  const handlePopulate80Students = (classId: string) => {
    const generated = StorageService.generateRealisticLargeRoster(classId, 80);
    setDb((prev) => {
      const filtered = prev.students.filter((s) => s.classId !== classId);
      return {
        ...prev,
        students: [...filtered, ...generated],
      };
    });
    if (user) {
      FirestoreService.saveStudentsBatch(user.uid, generated, classId).catch(
        handleCloudWriteError
      );
    }
  };

  // Add academic year
  const handleAddAcademicYear = (year: string) => {
    const nextYears = [...dbRef.current.academicYears, year];
    const nextSettings = { ...dbRef.current.settings, activeAcademicYear: year };
    setDb((prev) => ({
      ...prev,
      academicYears: [...prev.academicYears, year],
      settings: { ...prev.settings, activeAcademicYear: year },
    }));
    if (user) {
      FirestoreService.saveUserSettings(user.uid, user, nextSettings, nextYears).catch(
        handleCloudWriteError
      );
    }
  };

  const handleSelectAcademicYear = (year: string) => {
    const nextSettings = { ...dbRef.current.settings, activeAcademicYear: year };
    setDb((prev) => ({
      ...prev,
      settings: { ...prev.settings, activeAcademicYear: year },
    }));
    if (user) {
      FirestoreService.saveUserSettings(
        user.uid,
        user,
        nextSettings,
        dbRef.current.academicYears
      ).catch(handleCloudWriteError);
    }
  };

  // Participation logger
  const handleLogParticipation = (studentId: string, delta: number, reason: string) => {
    const today = new Date().toISOString().split('T')[0];
    const partIdx = dbRef.current.participation.findIndex(
      (p) => p.classId === activeClassId && p.date === today
    );

    const logEntry = {
      id: 'p_' + Date.now(),
      studentId,
      delta,
      reason,
      timestamp: Date.now(),
    };

    let persistedItem: ParticipationItem;
    if (partIdx >= 0) {
      const item = dbRef.current.participation[partIdx];
      const currentScore = item.scores[studentId] || 0;
      const updatedScores = { ...item.scores, [studentId]: Math.max(0, currentScore + delta) };
      persistedItem = {
        ...item,
        scores: updatedScores,
        logs: [logEntry, ...item.logs],
      };
      const list = [...dbRef.current.participation];
      list[partIdx] = persistedItem;
      setDb((prev) => ({ ...prev, participation: list }));
    } else {
      persistedItem = {
        id: `part_${activeClassId}_${today}`,
        classId: activeClassId,
        date: today,
        scores: { [studentId]: Math.max(0, delta) },
        logs: [logEntry],
      };
      setDb((prev) => ({
        ...prev,
        participation: [persistedItem, ...prev.participation],
      }));
    }

    if (user) {
      FirestoreService.saveParticipationItem(user.uid, persistedItem).catch(
        handleCloudWriteError
      );
    }
  };

  // Toggle reminder completion
  const handleToggleReminder = (reminderId: string) => {
    const target = dbRef.current.reminders.find((r) => r.id === reminderId);
    setDb((prev) => ({
      ...prev,
      reminders: prev.reminders.map((r) =>
        r.id === reminderId ? { ...r, completed: !r.completed } : r
      ),
    }));
    if (user && target) {
      FirestoreService.saveReminder(user.uid, {
        ...target,
        completed: !target.completed,
      }).catch(handleCloudWriteError);
    }
  };

  // Restore database
  const handleRestoreDatabase = (restored: AppDatabase) => {
    setDb(restored);
    if (user) {
      setIsCloudSyncing(true);
      FirestoreService.syncFullDatabaseToFirestore(user, restored)
        .catch(handleCloudWriteError)
        .finally(() => setIsCloudSyncing(false));
    }
  };

  // PDF Export Handlers
  const handleExportClassPdf = (classGroup: ClassGroup) => {
    const classStudents = db.students.filter((s) => s.classId === classGroup.id);
    PdfExportService.generateClassSummary(
      classGroup,
      classStudents,
      db.assignments,
      db.grades,
      db.attendance
    );
  };

  const handleExportStudentPdf = (
    student: Student,
    classGroup: ClassGroup,
    customNote?: string
  ) => {
    const cumulative = (db.cumulativeProgress || []).find((c) => c.studentId === student.id);
    PdfExportService.generateStudentReport(
      student,
      classGroup,
      db.attendance,
      db.assignments,
      db.grades,
      customNote,
      db.studentLessonProgress || [],
      db.lessonPlans || [],
      cumulative
    );
  };

  const handleExportWorksheetPdf = (lesson: LessonPlan, exercise?: GrammarExercise) => {
    PdfExportService.generateWorksheet(lesson, exercise);
  };

  const handleSaveMonthlyAssessment = (
    classId: string,
    studentId: string,
    month: string,
    updates: Partial<MonthlyAssessmentRecord>
  ) => {
    const list = [...(dbRef.current.monthlyAssessments || [])];
    const existingIdx = list.findIndex(
      (m) => m.classId === classId && m.studentId === studentId && m.month === month
    );
    if (existingIdx >= 0) {
      list[existingIdx] = { ...list[existingIdx], ...updates };
    } else {
      list.push({
        id: `${classId}_${studentId}_${month}`,
        classId,
        studentId,
        month,
        ...updates,
      });
    }

    setDb((prev) => ({ ...prev, monthlyAssessments: list }));

    if (user) {
      const recordsForClassMonth = list.filter(
        (m) => m.classId === classId && m.month === month
      );
      FirestoreService.saveMonthlyAssessmentsMap(
        user.uid,
        classId,
        month,
        recordsForClassMonth
      ).catch(handleCloudWriteError);
    }
  };

  const handleExportMonthlyRegisterPdf = (classGroup: ClassGroup, yearMonth: string) => {
    const classStudents = db.students.filter((s) => s.classId === classGroup.id);
    PdfExportService.generateMonthlyRegisterPdf(
      classGroup,
      classStudents,
      db.attendance,
      db.monthlyAssessments || [],
      yearMonth
    );
  };

  const handleVaultStatusChange = (unlocked: boolean) => {
    setIsVaultUnlocked(unlocked);
    const salt = localStorage.getItem('gradecraft_vault_salt') || undefined;
    if (salt && salt !== dbRef.current.settings.vaultSalt) {
      const nextSettings = { ...dbRef.current.settings, vaultSalt: salt };
      setDb((prev) => ({ ...prev, settings: nextSettings }));
      if (user) {
        FirestoreService.saveUserSettings(
          user.uid,
          user,
          nextSettings,
          dbRef.current.academicYears
        ).catch(handleCloudWriteError);
      }
    }
  };

  const handleSearchSelectStudent = (
    student: Student,
    destination: 'students' | 'progress'
  ) => {
    handleSelectClass(student.classId);
    setSearchFocus({ type: 'student', id: student.id, token: Date.now() });
    setActiveTab(destination);
  };

  const handleSearchSelectAssignment = (assignment: Assignment) => {
    const exactClass = db.classes.find((c) => c.id === assignment.classId);
    if (exactClass) {
      handleSelectClass(exactClass.id);
    } else if (assignment.classId.startsWith('all-')) {
      const targetGrade = assignment.classId.replace('all-', '');
      const currentCls = db.classes.find((c) => c.id === activeClassId);
      if (!currentCls || currentCls.grade !== targetGrade) {
        const gradeMatch = db.classes.find((c) => c.grade === targetGrade);
        if (gradeMatch) handleSelectClass(gradeMatch.id);
      }
    }
    setSearchFocus({ type: 'assignment', id: assignment.id, token: Date.now() });
    setActiveTab('gradebook');
  };

  const handleSearchSelectLesson = (lesson: LessonPlan) => {
    const exactClass = db.classes.find((c) => c.id === lesson.classId);
    if (exactClass) {
      handleSelectClass(exactClass.id);
    }
    setSearchFocus({ type: 'lesson', id: lesson.id, token: Date.now() });
    setActiveTab('lessons');
  };

  const handleSearchSelectNote = (note: TeacherNote) => {
    const exactClass = db.classes.find((c) => c.id === note.classId);
    if (exactClass) {
      handleSelectClass(exactClass.id);
    }
    setSearchFocus({ type: 'note', id: note.id, token: Date.now() });
    setActiveTab('lessons');
  };

  const activeClass = db.classes.find((c) => c.id === activeClassId) || db.classes[0];

  // Participation points for today's active class
  const todayStr = new Date().toISOString().split('T')[0];
  const todayPart = db.participation.find(
    (p) => p.classId === activeClassId && p.date === todayStr
  );
  const participationScores = todayPart ? todayPart.scores : {};

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-blue-600 selection:text-white">
      {/* CLEAN APP HEADER */}
      <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
          {/* Brand Logo */}
          <button
            type="button"
            onClick={() => setActiveTab('dashboard')}
            className="flex items-center gap-2.5 shrink-0 text-left focus:outline-none"
          >
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center shadow-sm">
              <BookOpen className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-base tracking-tight text-white">
              GradeCraft
            </span>
          </button>

          {/* Global Search Bar */}
          <GlobalSearchBar
            classes={db.classes}
            students={db.students}
            assignments={db.assignments}
            lessonPlans={db.lessonPlans}
            teacherNotes={db.teacherNotes || []}
            onSelectStudent={handleSearchSelectStudent}
            onSelectAssignment={handleSearchSelectAssignment}
            onSelectLessonPlan={handleSearchSelectLesson}
            onSelectTeacherNote={handleSearchSelectNote}
          />

          {/* Right Utility Actions */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setShowVaultModal(true)}
              className={`p-2 rounded-xl border transition ${
                isVaultUnlocked
                  ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                  : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
              }`}
              title={isVaultUnlocked ? 'Private Notes Vault Unlocked' : 'Unlock Private Notes Vault'}
              aria-label="Private notes vault"
            >
              {isVaultUnlocked ? (
                <Unlock className="w-4 h-4 text-emerald-400" />
              ) : (
                <Lock className="w-4 h-4 text-amber-400" />
              )}
            </button>

            <button
              type="button"
              onClick={() => setShowBackupModal(true)}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white transition relative"
              title={user ? (isCloudSyncing ? 'Syncing with cloud...' : 'Cloud backup & export') : 'Local backup & export'}
              aria-label="Backup and sync"
            >
              {isCloudSyncing ? (
                <RefreshCw className="w-4 h-4 text-blue-400 animate-spin" />
              ) : (
                <Cloud className="w-4 h-4 text-blue-400" />
              )}
            </button>

            {authReady && (
              user ? (
                <div className="flex items-center gap-1.5 pl-1.5 pr-1 py-1 rounded-xl bg-slate-800 border border-slate-700">
                  {user.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt={user.displayName || 'Teacher'}
                      className="w-6 h-6 rounded-lg object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-6 h-6 rounded-lg bg-blue-600/30 text-blue-300 text-[11px] font-bold flex items-center justify-center">
                      {(user.displayName || user.email || 'T').charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span className="hidden lg:inline text-xs font-medium text-slate-200 max-w-[100px] truncate">
                    {user.displayName?.split(' ')[0] || user.email?.split('@')[0]}
                  </span>
                  <button
                    type="button"
                    onClick={() => signOutUser()}
                    className="p-1 rounded-lg text-slate-400 hover:text-rose-300 hover:bg-slate-700 transition"
                    title="Sign out"
                    aria-label="Sign out"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => signInWithGoogle()}
                  disabled={isSigningIn}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-xs font-semibold text-white transition"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline whitespace-nowrap">
                    {isSigningIn ? 'Signing in...' : 'Sign in'}
                  </span>
                </button>
              )
            )}

            <PWAInstallButton />
          </div>
        </div>

        {/* Clean Desktop Navigation Bar */}
        <div className="hidden md:block bg-slate-900/60 border-t border-slate-800/70">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between py-1.5">
            <nav className="flex items-center gap-1" aria-label="Main navigation">
              <button
                type="button"
                onClick={() => setActiveTab('dashboard')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 whitespace-nowrap ${
                  activeTab === 'dashboard'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                <span>Home</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('attendance')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 whitespace-nowrap ${
                  activeTab === 'attendance'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Attendance</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('gradebook')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 whitespace-nowrap ${
                  activeTab === 'gradebook'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Award className="w-3.5 h-3.5" />
                <span>Gradebook</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('progress')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 whitespace-nowrap ${
                  activeTab === 'progress'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <TrendingUp className="w-3.5 h-3.5" />
                <span>Progress</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('lessons')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 whitespace-nowrap ${
                  activeTab === 'lessons'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Lessons & Notes</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('students')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 whitespace-nowrap ${
                  activeTab === 'students'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>Students</span>
              </button>
            </nav>

            {activeClass && (
              <div className="text-xs text-slate-400 flex items-center gap-2 shrink-0">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: activeClass.color || '#3b82f6' }}
                />
                <span className="font-medium text-slate-300">{activeClass.name}</span>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 pt-5 pb-24 md:pb-12">
        {/* Inline Auth / Cloud Sync Error Alert */}
        {(authError || syncError) && (
          <div className="mb-4 px-4 py-3 rounded-xl bg-rose-950/50 border border-rose-500/40 text-rose-200 text-xs flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{authError || syncError}</span>
            </div>
            <button
              onClick={() => {
                clearAuthError();
                setSyncError(null);
              }}
              className="p-1 rounded-lg text-rose-300 hover:text-white hover:bg-rose-900/50"
              aria-label="Dismiss error"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {activeTab === 'dashboard' && (
          <DashboardView
            classes={db.classes}
            students={db.students}
            attendance={db.attendance}
            assignments={db.assignments}
            grades={db.grades}
            lessonPlans={db.lessonPlans}
            teacherNotes={db.teacherNotes || []}
            reminders={db.reminders}
            participationScores={participationScores}
            activeClassId={activeClassId}
            academicYear={db.settings.activeAcademicYear}
            onSelectClass={handleSelectClass}
            onOpenAttendance={(classId) => {
              handleSelectClass(classId);
              setActiveTab('attendance');
            }}
            onOpenGradebook={(classId) => {
              handleSelectClass(classId);
              setActiveTab('gradebook');
            }}
            onOpenLessons={(classId) => {
              handleSelectClass(classId);
              setActiveTab('lessons');
            }}
            onOpenProgress={(classId) => {
              handleSelectClass(classId);
              setActiveTab('progress');
            }}
            onExportPdf={handleExportClassPdf}
            onLogParticipation={handleLogParticipation}
            onToggleReminder={handleToggleReminder}
            onOpenAddClassModal={() => {
              setClassModalMode('create');
              setShowClassModal(true);
            }}
            onOpenEditClassModal={(classId) => {
              setClassModalMode({ editId: classId });
              setShowClassModal(true);
            }}
            onOpenManageClassesModal={() => {
              setClassModalMode('list');
              setShowClassModal(true);
            }}
            onOpenNewAssignmentModal={() => setShowAssignmentModal(true)}
          />
        )}

        {activeTab === 'attendance' && (
          <AttendanceView
            classes={db.classes}
            students={db.students}
            attendanceRecords={db.attendance}
            monthlyAssessments={db.monthlyAssessments || []}
            activeClassId={activeClassId}
            onSelectClass={handleSelectClass}
            onSaveAttendance={handleSaveAttendance}
            onSaveMonthlyAssessment={handleSaveMonthlyAssessment}
            onExportPdf={handleExportClassPdf}
            onExportMonthlyRegisterPdf={handleExportMonthlyRegisterPdf}
          />
        )}

        {activeTab === 'gradebook' && (
          <GradebookView
            classes={db.classes}
            students={db.students}
            assignments={db.assignments}
            grades={db.grades}
            activeClassId={activeClassId}
            onSelectClass={handleSelectClass}
            onOpenNewAssignmentModal={() => setShowAssignmentModal(true)}
            onUpdateGrade={handleUpdateGrade}
            onUpdateAssignmentStatus={handleUpdateAssignmentStatus}
            onExportPdf={handleExportClassPdf}
            focusedAssignmentId={
              searchFocus?.type === 'assignment' ? searchFocus.id : undefined
            }
            focusToken={searchFocus?.type === 'assignment' ? searchFocus.token : undefined}
          />
        )}

        {activeTab === 'progress' && (
          <StudentProgressTrackingView
            classes={db.classes}
            students={db.students}
            assignments={db.assignments}
            grades={db.grades}
            lessonPlans={db.lessonPlans}
            studentLessonProgress={db.studentLessonProgress || []}
            cumulativeProgress={db.cumulativeProgress || []}
            attendanceRecords={db.attendance}
            activeClassId={activeClassId}
            onSelectClass={handleSelectClass}
            onSaveAssignmentProgress={handleSaveAssignmentProgress}
            onSaveLessonProgress={handleSaveLessonProgress}
            onSaveCumulativeProgress={handleSaveCumulativeProgress}
            onExportStudentPdf={handleExportStudentPdf}
            focusedStudentId={
              searchFocus?.type === 'student' ? searchFocus.id : undefined
            }
            focusToken={searchFocus?.type === 'student' ? searchFocus.token : undefined}
          />
        )}

        {activeTab === 'lessons' && (
          <LessonsGrammarView
            lessonPlans={db.lessonPlans}
            teacherNotes={db.teacherNotes || []}
            grammarExercises={db.grammarExercises}
            books={db.books}
            classes={db.classes}
            activeClassId={activeClassId}
            onSelectClass={handleSelectClass}
            onSaveLessonPlan={handleSaveLessonPlan}
            onDeleteLessonPlan={handleDeleteLessonPlan}
            onSaveTeacherNote={handleSaveTeacherNote}
            onDeleteTeacherNote={handleDeleteTeacherNote}
            onSaveGrammarExercise={handleSaveGrammarExercise}
            onUpdateBookProgress={handleUpdateBookProgress}
            onExportWorksheetPdf={handleExportWorksheetPdf}
            focusedLessonId={
              searchFocus?.type === 'lesson' ? searchFocus.id : undefined
            }
            focusedNoteId={
              searchFocus?.type === 'note' ? searchFocus.id : undefined
            }
            focusToken={
              searchFocus?.type === 'lesson' || searchFocus?.type === 'note'
                ? searchFocus.token
                : undefined
            }
          />
        )}

        {activeTab === 'students' && (
          <StudentRosterView
            classes={db.classes}
            students={db.students}
            attendance={db.attendance}
            assignments={db.assignments}
            grades={db.grades}
            encryptedNotes={db.encryptedNotes}
            activeClassId={activeClassId}
            onSelectClass={handleSelectClass}
            onExportStudentPdf={handleExportStudentPdf}
            onSaveEncryptedNote={handleSaveEncryptedNote}
            onOpenVaultSettings={() => setShowVaultModal(true)}
            onAddStudent={handleSaveStudent}
            onBulkAddStudents={handleBulkAddStudents}
            onPopulate80Students={handlePopulate80Students}
            focusedStudentId={
              searchFocus?.type === 'student' ? searchFocus.id : undefined
            }
            focusToken={searchFocus?.type === 'student' ? searchFocus.token : undefined}
          />
        )}
      </main>

      {/* MOBILE BOTTOM NAVIGATION BAR */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-lg border-t border-slate-800 px-1 py-1.5 flex items-center justify-around safe-area-bottom">
        <button
          type="button"
          onClick={() => setActiveTab('dashboard')}
          className={`flex flex-col items-center gap-1 py-1 px-2 rounded-xl transition ${
            activeTab === 'dashboard'
              ? 'text-blue-400 font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <LayoutDashboard className="w-5 h-5" />
          <span className="text-[10px]">Home</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('attendance')}
          className={`flex flex-col items-center gap-1 py-1 px-2 rounded-xl transition ${
            activeTab === 'attendance'
              ? 'text-blue-400 font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Users className="w-5 h-5" />
          <span className="text-[10px]">Roll</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('gradebook')}
          className={`flex flex-col items-center gap-1 py-1 px-2 rounded-xl transition ${
            activeTab === 'gradebook'
              ? 'text-blue-400 font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Award className="w-5 h-5" />
          <span className="text-[10px]">Grades</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('progress')}
          className={`flex flex-col items-center gap-1 py-1 px-2 rounded-xl transition ${
            activeTab === 'progress'
              ? 'text-blue-400 font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <TrendingUp className="w-5 h-5" />
          <span className="text-[10px]">Progress</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('lessons')}
          className={`flex flex-col items-center gap-1 py-1 px-2 rounded-xl transition ${
            activeTab === 'lessons'
              ? 'text-blue-400 font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <BookOpen className="w-5 h-5" />
          <span className="text-[10px]">Lessons</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('students')}
          className={`flex flex-col items-center gap-1 py-1 px-2 rounded-xl transition ${
            activeTab === 'students'
              ? 'text-blue-400 font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <UserCheck className="w-5 h-5" />
          <span className="text-[10px]">Students</span>
        </button>
      </nav>

      {/* OFFLINE INDICATOR */}
      <OfflineIndicator />

      {/* MODALS */}
      <ClassManagerModal
        isOpen={showClassModal}
        onClose={() => setShowClassModal(false)}
        classes={db.classes}
        academicYears={db.academicYears}
        activeAcademicYear={db.settings.activeAcademicYear}
        initialMode={classModalMode}
        onSaveClass={handleSaveClass}
        onDeleteClass={handleDeleteClass}
        onAddAcademicYear={handleAddAcademicYear}
        onSelectAcademicYear={handleSelectAcademicYear}
      />

      <CreateAssignmentModal
        isOpen={showAssignmentModal}
        onClose={() => setShowAssignmentModal(false)}
        classes={db.classes}
        activeClassId={activeClassId}
        onSaveAssignment={handleSaveAssignment}
      />

      <BackupSyncModal
        isOpen={showBackupModal}
        onClose={() => setShowBackupModal(false)}
        database={db}
        onRestoreDatabase={handleRestoreDatabase}
        isOnline={isOnline}
      />

      <EncryptedVaultModal
        isOpen={showVaultModal}
        onClose={() => setShowVaultModal(false)}
        onVaultStatusChange={handleVaultStatusChange}
      />
    </div>
  );
}
