export type GradeLevel = '6' | '7' | '8' | string;

export interface ClassGroup {
  id: string; // e.g. "6A", "6B", "7A", "7B"
  name: string; // "Class 6A"
  grade: GradeLevel; // "6"
  section: string; // "A"
  subject: string; // "English Language Arts & Literature"
  academicYear: string; // "2026-2027"
  color: string; // Hex color (e.g., "#10b981", "#06b6d4", "#6366f1", "#f59e0b")
  roomNumber?: string;
  schedulePeriod?: string; // "Period 1 (08:30 - 09:15)"
  studentIds: string[];
}

export interface Student {
  id: string;
  classId: string;
  name: string;
  rollNumber: string;
  avatarColor?: string;
  guardianName?: string;
  guardianContact?: string;
  accommodations?: string; // IEP, ESL/ELL support, extra time, etc.
}

export type AttendanceStatus = 'P' | 'A' | 'Permitted' | 'present' | 'absent' | 'tardy' | 'excused';

export interface MonthlyAssessmentRecord {
  id: string; // classId_studentId_YYYY-MM
  classId: string;
  studentId: string;
  month: string; // YYYY-MM
  monthlyExamScore?: number;
  hwScore?: number;
  oralParticipationScore?: number;
  notes?: string;
}

export interface AttendanceRecord {
  id: string; // classId_YYYY-MM-DD
  classId: string;
  date: string; // YYYY-MM-DD
  records: Record<string, AttendanceStatus>; // studentId -> status ('P' | 'A' | 'Permitted')
  notes?: string;
}

export type AssignmentCategory = 'Homework' | 'Grammar Exercise' | 'Essay & Writing' | 'Quiz' | 'Exam' | 'Project' | 'Reading Log';

export interface Assignment {
  id: string;
  classId: string; // classId or 'all-6' | 'all-7' | 'all'
  title: string;
  description: string;
  category: AssignmentCategory;
  dueDate: string; // YYYY-MM-DD
  maxPoints: number;
  weight: number; // e.g. 1
  status: 'assigned' | 'collected' | 'grading' | 'graded' | 'returned';
  grammarTopic?: string;
  bookChapter?: string;
  createdAt: string;
}

export type AssignmentCompletionStatus = 'completed' | 'in_progress' | 'needs_revision' | 'late' | 'missing' | 'not_started';

export interface GradeRecord {
  id: string; // assignmentId_studentId
  assignmentId: string;
  studentId: string;
  score: number; // 0 to maxPoints
  completionStatus?: AssignmentCompletionStatus;
  feedback?: string; // detailed teacher notes and feedback specific to this student's performance
  submitted: boolean;
  gradedAt?: string;
}

export type LessonMasteryStatus = 'mastered' | 'in_progress' | 'needs_support' | 'absent_needs_catchup';

export interface StudentLessonProgress {
  id: string; // lessonId_studentId
  lessonId: string;
  studentId: string;
  status: LessonMasteryStatus;
  exitTicketScore?: number; // e.g. out of 5 or 100
  exitTicketCompleted: boolean;
  notes?: string; // detailed teacher notes on lesson performance
  updatedAt: string;
}

export interface StudentCumulativeProgress {
  id: string; // studentId
  studentId: string;
  strengths?: string;
  growthAreas?: string;
  generalNotes?: string;
  targetGoals?: string;
  updatedAt: string;
}

export interface ParticipationItem {
  id: string;
  classId: string;
  date: string; // YYYY-MM-DD
  scores: Record<string, number>; // studentId -> total points today
  logs: Array<{
    id: string;
    studentId: string;
    delta: number;
    reason: string;
    timestamp: number;
  }>;
}

export interface LessonPlan {
  id: string;
  classId: string; // or "Grade 6", "Grade 7"
  grade: GradeLevel;
  title: string;
  unit: string;
  date: string; // scheduled date
  durationMinutes: number;
  grammarFocus: string;
  objectives: string[];
  materials: string[];
  warmUp: string;
  directInstruction: string;
  guidedPractice: string;
  independentPractice: string;
  exitTicket: string;
  homeworkAssigned?: string;
  teacherNotes?: string;
  completed: boolean;
  sourceType?: 'premade' | 'created' | 'uploaded_pdf' | 'ai';
  attachmentId?: string;
  attachmentName?: string;
  attachmentSize?: number;
}

export interface TeacherNote {
  id: string;
  title: string;
  classId: string; // specific classId or 'all'
  category: 'lesson_note' | 'pacing_plan' | 'handout_pdf' | 'reference';
  sourceType: 'created' | 'uploaded_pdf';
  content: string;
  attachmentId?: string;
  attachmentName?: string;
  attachmentSize?: number;
  completed: boolean;
  date: string;
}

export interface GrammarQuestion {
  id: string;
  prompt: string;
  type: 'mcq' | 'fill-blank' | 'correction';
  options?: string[];
  correctAnswer: string;
  explanation: string;
}

export interface GrammarExercise {
  id: string;
  grade: GradeLevel;
  title: string;
  topic: string; // e.g. "Subject-Verb Agreement", "Active vs Passive Voice"
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  rulesExplanation: string;
  questions: GrammarQuestion[];
  assignedClassIds: string[];
  createdAt: string;
}

export interface StudentProgressItem {
  studentId: string;
  exerciseId: string;
  score: number; // percentage or points
  masteryStatus: 'mastered' | 'in_progress' | 'needs_support';
  completedDate: string;
}

export interface BookStudy {
  id: string;
  classId: string;
  title: string;
  author: string;
  totalChapters: number;
  currentChapter: number;
  genre: string;
  summary: string;
  vocabulary: string[];
  discussionQuestions: string[];
  targetCompletionDate: string;
}

export interface EncryptedTeacherNote {
  id: string;
  title: string;
  studentId?: string; // If student-specific
  classId?: string; // If class-specific
  category: 'observation' | 'iep_confidential' | 'parent_conference' | 'private_memo';
  ciphertext: string; // Base64 AES-GCM
  iv: string; // Base64 IV
  salt: string; // Base64 Salt
  createdAt: string;
  updatedAt: string;
}

export interface DecryptedTeacherNote {
  id: string;
  title: string;
  studentId?: string;
  classId?: string;
  category: 'observation' | 'iep_confidential' | 'parent_conference' | 'private_memo';
  content: string; // Decrypted plaintext
  createdAt: string;
  updatedAt: string;
}

export interface Reminder {
  id: string;
  title: string;
  description?: string;
  dueDate: string; // YYYY-MM-DD or ISO
  classId?: string;
  priority: 'low' | 'medium' | 'high';
  category: 'grading' | 'lesson_prep' | 'exam' | 'parent_call' | 'general';
  completed: boolean;
}

export interface TeacherSettings {
  teacherName: string;
  activeAcademicYear: string;
  activeClassId: string;
  isDarkMode: boolean;
  vaultSalt?: string;
  vaultVerifier?: string; // Hash to verify passphrase without leaking
  lastBackupDate?: string;
  cloudSyncKey: string;
  notificationEnabled: boolean;
}

export interface AppDatabase {
  classes: ClassGroup[];
  students: Student[];
  attendance: AttendanceRecord[];
  assignments: Assignment[];
  grades: GradeRecord[];
  participation: ParticipationItem[];
  lessonPlans: LessonPlan[];
  grammarExercises: GrammarExercise[];
  studentProgress: StudentProgressItem[];
  books: BookStudy[];
  encryptedNotes: EncryptedTeacherNote[];
  teacherNotes: TeacherNote[];
  reminders: Reminder[];
  monthlyAssessments: MonthlyAssessmentRecord[];
  studentLessonProgress: StudentLessonProgress[];
  cumulativeProgress: StudentCumulativeProgress[];
  settings: TeacherSettings;
  academicYears: string[];
}
