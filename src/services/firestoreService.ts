import { User } from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  Unsubscribe,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import {
  AppDatabase,
  Assignment,
  AttendanceRecord,
  BookStudy,
  ClassGroup,
  EncryptedTeacherNote,
  GradeRecord,
  GrammarExercise,
  LessonPlan,
  MonthlyAssessmentRecord,
  ParticipationItem,
  Reminder,
  Student,
  StudentCumulativeProgress,
  StudentLessonProgress,
  TeacherNote,
  TeacherSettings,
} from '../types';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// =========================================================================
// Defensive Sanitization & Blueprint Boundary Helpers
// =========================================================================
export function toValidId(raw: string, fallback = 'item'): string {
  const cleaned = (raw || '')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 128);
  return cleaned.length > 0 ? cleaned : fallback;
}

function clampStr(val: unknown, maxLen: number, fallback = ''): string {
  const s = typeof val === 'string' ? val : fallback;
  return s.slice(0, maxLen);
}

function clampNonEmpty(val: unknown, maxLen: number, fallback: string): string {
  const s = typeof val === 'string' ? val.trim() : '';
  return (s.length > 0 ? s : fallback).slice(0, maxLen);
}

function stripUndefined<T extends Record<string, any>>(obj: T): T {
  const result: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null) {
      result[k] = v;
    }
  }
  return result as T;
}

function tsToIso(val: unknown, fallback: string): string {
  if (val instanceof Timestamp) {
    return val.toDate().toISOString();
  }
  if (val && typeof (val as any).toDate === 'function') {
    return (val as any).toDate().toISOString();
  }
  if (typeof val === 'string' && val.length > 0) return val;
  return fallback;
}

function clampMapKeys<T>(entries: Record<string, T>, maxKeys = 300): Record<string, T> {
  const keys = Object.keys(entries).slice(0, maxKeys);
  const out: Record<string, T> = {};
  for (const k of keys) {
    out[k] = entries[k];
  }
  return out;
}

// Track known existing doc paths (`subcol/docId`) so updates preserve `createdAt`
const knownDocKeys = new Set<string>();

function markKnown(subcol: string, docId: string) {
  knownDocKeys.add(`${subcol}/${docId}`);
}

function unmarkKnown(subcol: string, docId: string) {
  knownDocKeys.delete(`${subcol}/${docId}`);
}

// =========================================================================
// Entity Serializers (Strict Schema Alignment with firestore.rules)
// =========================================================================
function serializeUserProfile(
  uid: string,
  user: User,
  settings: TeacherSettings,
  academicYears: string[]
) {
  const safeEmail = clampNonEmpty(user.email, 200, 'teacher@gradecraft.local');
  const safeDisplayName = clampNonEmpty(
    user.displayName || settings.teacherName || safeEmail.split('@')[0],
    120,
    'English Teacher'
  );
  const safeAcademicYears = (academicYears || ['2026-2027'])
    .slice(0, 20)
    .map((y) => clampNonEmpty(y, 32, '2026-2027'));

  return stripUndefined({
    uid: toValidId(uid, uid),
    displayName: safeDisplayName,
    email: safeEmail,
    photoURL: user.photoURL ? clampStr(user.photoURL, 500) : undefined,
    activeAcademicYear: clampNonEmpty(settings.activeAcademicYear, 32, '2026-2027'),
    activeClassId: toValidId(settings.activeClassId || '6A', '6A').slice(0, 64),
    isDarkMode: settings.isDarkMode !== false,
    cloudSyncKey: settings.cloudSyncKey ? clampStr(settings.cloudSyncKey, 128) : undefined,
    notificationEnabled: settings.notificationEnabled !== false,
    vaultSalt: settings.vaultSalt ? clampStr(settings.vaultSalt, 256) : undefined,
    vaultVerifier: settings.vaultVerifier ? clampStr(settings.vaultVerifier, 256) : undefined,
    academicYears: safeAcademicYears,
  });
}

function serializeClassGroup(uid: string, cls: ClassGroup) {
  const id = toValidId(cls.id, 'class').slice(0, 64);
  return stripUndefined({
    id,
    ownerId: uid,
    name: clampNonEmpty(cls.name, 100, `Class ${id}`),
    grade: clampNonEmpty(cls.grade, 20, '6'),
    section: clampNonEmpty(cls.section, 20, 'A'),
    subject: clampNonEmpty(cls.subject, 120, 'English Language Arts'),
    academicYear: clampNonEmpty(cls.academicYear, 32, '2026-2027'),
    color: clampNonEmpty(cls.color, 20, '#3b82f6'),
    roomNumber: cls.roomNumber ? clampStr(cls.roomNumber, 40) : undefined,
    schedulePeriod: cls.schedulePeriod ? clampStr(cls.schedulePeriod, 80) : undefined,
  });
}

function serializeStudent(uid: string, s: Student) {
  const id = toValidId(s.id, 'student');
  return stripUndefined({
    id,
    ownerId: uid,
    classId: toValidId(s.classId, '6A').slice(0, 64),
    name: clampNonEmpty(s.name, 120, 'Student'),
    rollNumber: clampNonEmpty(s.rollNumber, 20, '01'),
    avatarColor: s.avatarColor ? clampStr(s.avatarColor, 20) : undefined,
    guardianName: s.guardianName ? clampStr(s.guardianName, 120) : undefined,
    guardianContact: s.guardianContact ? clampStr(s.guardianContact, 160) : undefined,
    accommodations: s.accommodations ? clampStr(s.accommodations, 500) : undefined,
  });
}

function serializeAttendance(uid: string, rec: AttendanceRecord) {
  const classId = toValidId(rec.classId, '6A').slice(0, 64);
  const date = /^\d{4}-\d{2}-\d{2}$/.test(rec.date)
    ? rec.date
    : new Date().toISOString().split('T')[0];
  const id = toValidId(rec.id || `${classId}_${date}`, `${classId}_${date}`);
  return stripUndefined({
    id,
    ownerId: uid,
    classId,
    date,
    records: clampMapKeys(rec.records || {}, 300),
    notes: rec.notes ? clampStr(rec.notes, 1000) : undefined,
  });
}

function serializeAssignment(uid: string, asg: Assignment) {
  const id = toValidId(asg.id, 'asg');
  const validCategories = [
    'Homework',
    'Grammar Exercise',
    'Essay & Writing',
    'Quiz',
    'Exam',
    'Project',
    'Reading Log',
  ];
  const validStatuses = ['assigned', 'collected', 'grading', 'graded', 'returned'];

  return stripUndefined({
    id,
    ownerId: uid,
    classId: toValidId(asg.classId || '6A', '6A').slice(0, 64),
    title: clampNonEmpty(asg.title, 180, 'Untitled Assignment'),
    description: clampStr(asg.description, 2000, ''),
    category: validCategories.includes(asg.category) ? asg.category : 'Homework',
    dueDate: clampNonEmpty(asg.dueDate, 20, new Date().toISOString().split('T')[0]),
    maxPoints: Math.max(1, Math.min(10000, Number(asg.maxPoints) || 100)),
    weight: Math.max(0, Math.min(100, Number(asg.weight ?? 1))),
    status: validStatuses.includes(asg.status) ? asg.status : 'assigned',
    grammarTopic: asg.grammarTopic ? clampStr(asg.grammarTopic, 160) : undefined,
    bookChapter: asg.bookChapter ? clampStr(asg.bookChapter, 160) : undefined,
    createdDate: asg.createdAt ? clampStr(asg.createdAt, 32) : undefined,
  });
}

function serializeLessonPlan(uid: string, plan: LessonPlan) {
  const id = toValidId(plan.id, 'lp');
  const validSources = ['premade', 'created', 'uploaded_pdf', 'ai'];
  return stripUndefined({
    id,
    ownerId: uid,
    classId: toValidId(plan.classId || '6A', '6A').slice(0, 64),
    grade: clampNonEmpty(plan.grade, 20, '6'),
    title: clampNonEmpty(plan.title, 200, 'ELA Lesson Plan'),
    unit: clampStr(plan.unit, 160, 'Unit 1'),
    date: clampStr(plan.date, 32, new Date().toISOString().split('T')[0]),
    durationMinutes: Math.max(5, Math.min(480, Number(plan.durationMinutes) || 45)),
    grammarFocus: clampStr(plan.grammarFocus, 300, ''),
    objectives: (plan.objectives || []).slice(0, 25).map((o) => clampStr(o, 500)),
    materials: (plan.materials || []).slice(0, 30).map((m) => clampStr(m, 200)),
    warmUp: clampStr(plan.warmUp, 2000, ''),
    directInstruction: clampStr(plan.directInstruction, 4000, ''),
    guidedPractice: clampStr(plan.guidedPractice, 4000, ''),
    independentPractice: clampStr(plan.independentPractice, 4000, ''),
    exitTicket: clampStr(plan.exitTicket, 2000, ''),
    homeworkAssigned: plan.homeworkAssigned ? clampStr(plan.homeworkAssigned, 1000) : undefined,
    teacherNotes: plan.teacherNotes ? clampStr(plan.teacherNotes, 4000) : undefined,
    completed: Boolean(plan.completed),
    sourceType: plan.sourceType && validSources.includes(plan.sourceType) ? plan.sourceType : undefined,
    attachmentId: plan.attachmentId ? clampStr(plan.attachmentId, 128) : undefined,
    attachmentName: plan.attachmentName ? clampStr(plan.attachmentName, 255) : undefined,
    attachmentSize:
      typeof plan.attachmentSize === 'number'
        ? Math.max(0, Math.min(104857600, plan.attachmentSize))
        : undefined,
  });
}

function serializeTeacherNote(uid: string, note: TeacherNote) {
  const id = toValidId(note.id, 'tn');
  const validCategories = ['lesson_note', 'pacing_plan', 'handout_pdf', 'reference'];
  const validSources = ['created', 'uploaded_pdf'];
  return stripUndefined({
    id,
    ownerId: uid,
    title: clampNonEmpty(note.title, 200, 'Teacher Note'),
    classId: toValidId(note.classId || 'all', 'all').slice(0, 64),
    category: validCategories.includes(note.category) ? note.category : 'lesson_note',
    sourceType: validSources.includes(note.sourceType) ? note.sourceType : 'created',
    content: clampStr(note.content, 12000, ''),
    attachmentId: note.attachmentId ? clampStr(note.attachmentId, 128) : undefined,
    attachmentName: note.attachmentName ? clampStr(note.attachmentName, 255) : undefined,
    attachmentSize:
      typeof note.attachmentSize === 'number'
        ? Math.max(0, Math.min(104857600, note.attachmentSize))
        : undefined,
    completed: Boolean(note.completed),
    date: clampStr(note.date, 32, new Date().toISOString().split('T')[0]),
  });
}

function serializeGrammarExercise(uid: string, ex: GrammarExercise) {
  const id = toValidId(ex.id, 'gram');
  const validDiff = ['beginner', 'intermediate', 'advanced'];
  return stripUndefined({
    id,
    ownerId: uid,
    grade: clampNonEmpty(ex.grade, 20, '6'),
    title: clampNonEmpty(ex.title, 200, 'Grammar Practice'),
    topic: clampStr(ex.topic, 160, 'Grammar'),
    difficulty: validDiff.includes(ex.difficulty) ? ex.difficulty : 'intermediate',
    rulesExplanation: clampStr(ex.rulesExplanation, 4000, ''),
    questions: (ex.questions || []).slice(0, 50),
    assignedClassIds: (ex.assignedClassIds || [])
      .slice(0, 20)
      .map((cid) => toValidId(cid, '6A').slice(0, 64)),
    createdDate: ex.createdAt ? clampStr(ex.createdAt, 32) : undefined,
  });
}

function serializeBookStudy(uid: string, book: BookStudy) {
  const id = toValidId(book.id, 'book');
  return stripUndefined({
    id,
    ownerId: uid,
    classId: toValidId(book.classId || '6A', '6A').slice(0, 64),
    title: clampNonEmpty(book.title, 200, 'Class Novel'),
    author: clampStr(book.author, 160, ''),
    totalChapters: Math.max(1, Math.min(500, Number(book.totalChapters) || 12)),
    currentChapter: Math.max(0, Math.min(500, Number(book.currentChapter) || 1)),
    genre: clampStr(book.genre, 100, 'Fiction'),
    summary: clampStr(book.summary, 4000, ''),
    vocabulary: (book.vocabulary || []).slice(0, 100).map((v) => clampStr(v, 120)),
    discussionQuestions: (book.discussionQuestions || [])
      .slice(0, 50)
      .map((q) => clampStr(q, 500)),
    targetCompletionDate: clampStr(book.targetCompletionDate, 32, '2026-12-15'),
  });
}

function serializeEncryptedNote(uid: string, note: EncryptedTeacherNote) {
  const id = toValidId(note.id, 'note');
  const validCats = ['observation', 'iep_confidential', 'parent_conference', 'private_memo'];
  return stripUndefined({
    id,
    ownerId: uid,
    title: clampNonEmpty(note.title, 200, 'Encrypted Note'),
    studentId: note.studentId ? toValidId(note.studentId, 'student') : undefined,
    classId: note.classId ? toValidId(note.classId, '6A').slice(0, 64) : undefined,
    category: validCats.includes(note.category) ? note.category : 'observation',
    ciphertext: clampNonEmpty(note.ciphertext, 32000, 'cipher'),
    iv: clampNonEmpty(note.iv, 256, 'iv'),
    salt: clampNonEmpty(note.salt, 256, 'salt'),
  });
}

function serializeReminder(uid: string, rem: Reminder) {
  const id = toValidId(rem.id, 'rem');
  const validPriorities = ['low', 'medium', 'high'];
  const validCats = ['grading', 'lesson_prep', 'exam', 'parent_call', 'general'];
  return stripUndefined({
    id,
    ownerId: uid,
    title: clampNonEmpty(rem.title, 200, 'Reminder'),
    description: rem.description ? clampStr(rem.description, 1000) : undefined,
    dueDate: clampNonEmpty(rem.dueDate, 32, new Date().toISOString().split('T')[0]),
    classId: rem.classId ? toValidId(rem.classId, '6A').slice(0, 64) : undefined,
    priority: validPriorities.includes(rem.priority) ? rem.priority : 'medium',
    category: validCats.includes(rem.category) ? rem.category : 'general',
    completed: Boolean(rem.completed),
  });
}

function serializeParticipation(uid: string, item: ParticipationItem) {
  const classId = toValidId(item.classId, '6A').slice(0, 64);
  const date = /^\d{4}-\d{2}-\d{2}$/.test(item.date)
    ? item.date
    : new Date().toISOString().split('T')[0];
  const id = toValidId(item.id || `${classId}_${date}`, `${classId}_${date}`);
  return {
    id,
    ownerId: uid,
    classId,
    date,
    scores: clampMapKeys(item.scores || {}, 300),
    logs: (item.logs || []).slice(-500),
  };
}

// =========================================================================
// Batch Writer Helper (<= 350 ops per batch)
// =========================================================================
async function commitOperationsInBatches(
  ops: Array<(batch: ReturnType<typeof writeBatch>) => void>,
  contextPath: string
): Promise<void> {
  const CHUNK_SIZE = 350;
  for (let i = 0; i < ops.length; i += CHUNK_SIZE) {
    const chunk = ops.slice(i, i + CHUNK_SIZE);
    const batch = writeBatch(db);
    chunk.forEach((fn) => fn(batch));
    try {
      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, contextPath);
    }
  }
}

async function upsertSubcollectionDoc(
  uid: string,
  subcol: string,
  docId: string,
  createPayload: Record<string, any>,
  updatePayload: Record<string, any>
): Promise<void> {
  const path = `users/${uid}/${subcol}/${docId}`;
  const docRef = doc(db, 'users', uid, subcol, docId);
  try {
    let exists = knownDocKeys.has(`${subcol}/${docId}`);
    if (!exists) {
      const snap = await getDoc(docRef);
      exists = snap.exists();
    }
    if (exists) {
      await updateDoc(docRef, {
        ...updatePayload,
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(docRef, {
        ...createPayload,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
    markKnown(subcol, docId);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

// =========================================================================
// Workspace Bootstrap & Seeding on First Google Sign-In
// =========================================================================
export async function ensureUserWorkspaceSeeded(
  user: User,
  seedSource: AppDatabase
): Promise<void> {
  const uid = user.uid;
  const userPath = `users/${uid}`;
  const userRef = doc(db, 'users', uid);

  let userSnap;
  try {
    userSnap = await getDoc(userRef);
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, userPath);
  }

  if (userSnap.exists()) {
    return; // Already initialized in Firestore
  }

  // 1. Create parent /users/{uid} profile document first
  const profilePayload = serializeUserProfile(
    uid,
    user,
    seedSource.settings,
    seedSource.academicYears
  );
  try {
    await setDoc(userRef, {
      ...profilePayload,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, userPath);
  }

  // 2. Seed all subcollections in safe chunked batches
  const ops: Array<(batch: ReturnType<typeof writeBatch>) => void> = [];

  for (const cls of seedSource.classes) {
    const data = serializeClassGroup(uid, cls);
    ops.push((b) =>
      b.set(doc(db, 'users', uid, 'classes', data.id), {
        ...data,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    );
    markKnown('classes', data.id);
  }

  for (const student of seedSource.students) {
    const data = serializeStudent(uid, student);
    ops.push((b) =>
      b.set(doc(db, 'users', uid, 'students', data.id), {
        ...data,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    );
    markKnown('students', data.id);
  }

  for (const att of seedSource.attendance) {
    const data = serializeAttendance(uid, att);
    ops.push((b) =>
      b.set(doc(db, 'users', uid, 'attendance', data.id), {
        ...data,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    );
    markKnown('attendance', data.id);
  }

  for (const asg of seedSource.assignments) {
    const data = serializeAssignment(uid, asg);
    ops.push((b) =>
      b.set(doc(db, 'users', uid, 'assignments', data.id), {
        ...data,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    );
    markKnown('assignments', data.id);
  }

  // Group GradeRecords by assignmentId into AssignmentGradesMap
  const gradesByAsg = new Map<string, Record<string, GradeRecord>>();
  for (const g of seedSource.grades) {
    const asgId = toValidId(g.assignmentId, 'asg');
    const map = gradesByAsg.get(asgId) || {};
    map[g.studentId] = stripUndefined({ ...g });
    gradesByAsg.set(asgId, map);
  }
  for (const [asgId, entries] of gradesByAsg.entries()) {
    ops.push((b) =>
      b.set(doc(db, 'users', uid, 'assignmentGrades', asgId), {
        id: asgId,
        ownerId: uid,
        assignmentId: asgId,
        entries: clampMapKeys(entries, 300),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    );
    markKnown('assignmentGrades', asgId);
  }

  // Group MonthlyAssessments by classId_month
  const monthlyByKey = new Map<
    string,
    { classId: string; month: string; entries: Record<string, MonthlyAssessmentRecord> }
  >();
  for (const m of seedSource.monthlyAssessments || []) {
    const classId = toValidId(m.classId, '6A').slice(0, 64);
    const month = /^\d{4}-\d{2}$/.test(m.month) ? m.month : '2026-11';
    const docId = toValidId(`${classId}_${month}`, `${classId}_${month}`);
    const current = monthlyByKey.get(docId) || { classId, month, entries: {} };
    current.entries[m.studentId] = stripUndefined({ ...m });
    monthlyByKey.set(docId, current);
  }
  for (const [docId, val] of monthlyByKey.entries()) {
    ops.push((b) =>
      b.set(doc(db, 'users', uid, 'monthlyAssessments', docId), {
        id: docId,
        ownerId: uid,
        classId: val.classId,
        month: val.month,
        entries: clampMapKeys(val.entries, 300),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    );
    markKnown('monthlyAssessments', docId);
  }

  for (const part of seedSource.participation || []) {
    const data = serializeParticipation(uid, part);
    ops.push((b) =>
      b.set(doc(db, 'users', uid, 'participation', data.id), {
        ...data,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    );
    markKnown('participation', data.id);
  }

  for (const lp of seedSource.lessonPlans) {
    const data = serializeLessonPlan(uid, lp);
    ops.push((b) =>
      b.set(doc(db, 'users', uid, 'lessonPlans', data.id), {
        ...data,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    );
    markKnown('lessonPlans', data.id);
  }

  // Group StudentLessonProgress by lessonId
  const lessonProgByLesson = new Map<string, Record<string, StudentLessonProgress>>();
  for (const slp of seedSource.studentLessonProgress || []) {
    const lessonId = toValidId(slp.lessonId, 'lp');
    const map = lessonProgByLesson.get(lessonId) || {};
    map[slp.studentId] = stripUndefined({ ...slp });
    lessonProgByLesson.set(lessonId, map);
  }
  for (const [lessonId, entries] of lessonProgByLesson.entries()) {
    ops.push((b) =>
      b.set(doc(db, 'users', uid, 'lessonProgress', lessonId), {
        id: lessonId,
        ownerId: uid,
        lessonId,
        entries: clampMapKeys(entries, 300),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    );
    markKnown('lessonProgress', lessonId);
  }

  // Group CumulativeProgress by student's classId
  const studentClassMap = new Map<string, string>();
  seedSource.students.forEach((s) => studentClassMap.set(s.id, s.classId));
  const cumByClass = new Map<string, Record<string, StudentCumulativeProgress>>();
  for (const cp of seedSource.cumulativeProgress || []) {
    const classId = toValidId(studentClassMap.get(cp.studentId) || '6A', '6A').slice(0, 64);
    const map = cumByClass.get(classId) || {};
    map[cp.studentId] = stripUndefined({ ...cp });
    cumByClass.set(classId, map);
  }
  for (const [classId, entries] of cumByClass.entries()) {
    ops.push((b) =>
      b.set(doc(db, 'users', uid, 'cumulativeProgress', classId), {
        id: classId,
        ownerId: uid,
        classId,
        entries: clampMapKeys(entries, 300),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    );
    markKnown('cumulativeProgress', classId);
  }

  for (const ex of seedSource.grammarExercises) {
    const data = serializeGrammarExercise(uid, ex);
    ops.push((b) =>
      b.set(doc(db, 'users', uid, 'grammarExercises', data.id), {
        ...data,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    );
    markKnown('grammarExercises', data.id);
  }

  for (const book of seedSource.books) {
    const data = serializeBookStudy(uid, book);
    ops.push((b) =>
      b.set(doc(db, 'users', uid, 'books', data.id), {
        ...data,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    );
    markKnown('books', data.id);
  }

  for (const note of seedSource.encryptedNotes) {
    const data = serializeEncryptedNote(uid, note);
    ops.push((b) =>
      b.set(doc(db, 'users', uid, 'encryptedNotes', data.id), {
        ...data,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    );
    markKnown('encryptedNotes', data.id);
  }

  for (const tNote of seedSource.teacherNotes || []) {
    const data = serializeTeacherNote(uid, tNote);
    ops.push((b) =>
      b.set(doc(db, 'users', uid, 'teacherNotes', data.id), {
        ...data,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    );
    markKnown('teacherNotes', data.id);
  }

  for (const rem of seedSource.reminders) {
    const data = serializeReminder(uid, rem);
    ops.push((b) =>
      b.set(doc(db, 'users', uid, 'reminders', data.id), {
        ...data,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    );
    markKnown('reminders', data.id);
  }

  await commitOperationsInBatches(ops, `users/${uid}`);
}

// =========================================================================
// Real-Time Firestore Listeners (onSnapshot)
// =========================================================================
export function subscribeToUserWorkspace(
  uid: string,
  baseTemplate: AppDatabase,
  onDatabaseUpdate: (db: AppDatabase) => void
): Unsubscribe {
  knownDocKeys.clear();

  let profileDoc: any = null;
  let classesRaw: any[] = [];
  let studentsRaw: Student[] = [];
  let attendanceRaw: AttendanceRecord[] = [];
  let assignmentsRaw: Assignment[] = [];
  let gradesRaw: GradeRecord[] = [];
  let monthlyAssessmentsRaw: MonthlyAssessmentRecord[] = [];
  let participationRaw: ParticipationItem[] = [];
  let lessonPlansRaw: LessonPlan[] = [];
  let studentLessonProgressRaw: StudentLessonProgress[] = [];
  let cumulativeProgressRaw: StudentCumulativeProgress[] = [];
  let grammarExercisesRaw: GrammarExercise[] = [];
  let booksRaw: BookStudy[] = [];
  let encryptedNotesRaw: EncryptedTeacherNote[] = [];
  let teacherNotesRaw: TeacherNote[] = [];
  let remindersRaw: Reminder[] = [];

  let profileLoaded = false;

  const emit = () => {
    if (!profileLoaded) return;

    const classes: ClassGroup[] = classesRaw.map((c) => ({
      id: c.id,
      name: c.name,
      grade: c.grade,
      section: c.section,
      subject: c.subject,
      academicYear: c.academicYear,
      color: c.color,
      roomNumber: c.roomNumber,
      schedulePeriod: c.schedulePeriod,
      studentIds: studentsRaw.filter((s) => s.classId === c.id).map((s) => s.id),
    }));

    const settings: TeacherSettings = {
      ...baseTemplate.settings,
      teacherName: profileDoc?.displayName || baseTemplate.settings.teacherName,
      activeAcademicYear:
        profileDoc?.activeAcademicYear || baseTemplate.settings.activeAcademicYear,
      activeClassId: profileDoc?.activeClassId || baseTemplate.settings.activeClassId,
      isDarkMode:
        typeof profileDoc?.isDarkMode === 'boolean'
          ? profileDoc.isDarkMode
          : baseTemplate.settings.isDarkMode,
      cloudSyncKey: profileDoc?.cloudSyncKey || baseTemplate.settings.cloudSyncKey,
      notificationEnabled:
        typeof profileDoc?.notificationEnabled === 'boolean'
          ? profileDoc.notificationEnabled
          : baseTemplate.settings.notificationEnabled,
      vaultSalt: profileDoc?.vaultSalt || baseTemplate.settings.vaultSalt,
      vaultVerifier: profileDoc?.vaultVerifier || baseTemplate.settings.vaultVerifier,
      lastBackupDate: new Date().toISOString(),
    };

    const assembled: AppDatabase = {
      ...baseTemplate,
      classes: classes.length > 0 ? classes : baseTemplate.classes,
      students: studentsRaw,
      attendance: attendanceRaw,
      assignments: assignmentsRaw,
      grades: gradesRaw,
      monthlyAssessments: monthlyAssessmentsRaw,
      participation: participationRaw,
      lessonPlans: lessonPlansRaw,
      studentLessonProgress: studentLessonProgressRaw,
      cumulativeProgress: cumulativeProgressRaw,
      grammarExercises: grammarExercisesRaw,
      books: booksRaw,
      encryptedNotes: encryptedNotesRaw,
      teacherNotes: teacherNotesRaw,
      reminders: remindersRaw,
      settings,
      academicYears:
        Array.isArray(profileDoc?.academicYears) && profileDoc.academicYears.length > 0
          ? profileDoc.academicYears
          : baseTemplate.academicYears,
    };

    onDatabaseUpdate(assembled);
  };

  const unsubs: Unsubscribe[] = [];

  // 1. User Profile
  const userPath = `users/${uid}`;
  unsubs.push(
    onSnapshot(
      doc(db, 'users', uid),
      (snap) => {
        if (snap.exists()) {
          profileDoc = snap.data();
          profileLoaded = true;
          emit();
        }
      },
      (err) => handleFirestoreError(err, OperationType.GET, userPath)
    )
  );

  // Helper to attach ownerId-filtered collection listeners
  const listenSubcol = (subcol: string, handler: (docs: any[]) => void) => {
    const path = `users/${uid}/${subcol}`;
    const q = query(collection(db, 'users', uid, subcol), where('ownerId', '==', uid));
    unsubs.push(
      onSnapshot(
        q,
        (snap) => {
          const items: any[] = [];
          snap.forEach((d) => {
            markKnown(subcol, d.id);
            items.push(d.data());
          });
          handler(items);
          emit();
        },
        (err) => handleFirestoreError(err, OperationType.LIST, path)
      )
    );
  };

  listenSubcol('classes', (items) => {
    classesRaw = items.sort((a, b) => String(a.id).localeCompare(String(b.id)));
  });

  listenSubcol('students', (items) => {
    studentsRaw = items
      .map((s) => ({
        id: s.id,
        classId: s.classId,
        name: s.name,
        rollNumber: s.rollNumber,
        avatarColor: s.avatarColor,
        guardianName: s.guardianName,
        guardianContact: s.guardianContact,
        accommodations: s.accommodations,
      }))
      .sort((a, b) => {
        if (a.classId !== b.classId) return a.classId.localeCompare(b.classId);
        return parseInt(a.rollNumber, 10) - parseInt(b.rollNumber, 10);
      });
  });

  listenSubcol('attendance', (items) => {
    attendanceRaw = items.map((a) => ({
      id: a.id,
      classId: a.classId,
      date: a.date,
      records: a.records || {},
      notes: a.notes,
    }));
  });

  listenSubcol('assignments', (items) => {
    assignmentsRaw = items.map((a) => ({
      id: a.id,
      classId: a.classId,
      title: a.title,
      description: a.description || '',
      category: a.category,
      dueDate: a.dueDate,
      maxPoints: a.maxPoints,
      weight: a.weight,
      status: a.status,
      grammarTopic: a.grammarTopic,
      bookChapter: a.bookChapter,
      createdAt: a.createdDate || tsToIso(a.createdAt, '2026-11-01').split('T')[0],
    }));
  });

  listenSubcol('assignmentGrades', (items) => {
    const flat: GradeRecord[] = [];
    items.forEach((docData) => {
      const entries = docData.entries || {};
      Object.values(entries).forEach((entry: any) => {
        if (entry && entry.studentId && entry.assignmentId) {
          flat.push(entry as GradeRecord);
        }
      });
    });
    gradesRaw = flat;
  });

  listenSubcol('monthlyAssessments', (items) => {
    const flat: MonthlyAssessmentRecord[] = [];
    items.forEach((docData) => {
      const entries = docData.entries || {};
      Object.values(entries).forEach((entry: any) => {
        if (entry && entry.studentId && entry.classId) {
          flat.push(entry as MonthlyAssessmentRecord);
        }
      });
    });
    monthlyAssessmentsRaw = flat;
  });

  listenSubcol('participation', (items) => {
    participationRaw = items.map((p) => ({
      id: p.id,
      classId: p.classId,
      date: p.date,
      scores: p.scores || {},
      logs: p.logs || [],
    }));
  });

  listenSubcol('lessonPlans', (items) => {
    lessonPlansRaw = items.map((lp) => ({
      id: lp.id,
      classId: lp.classId,
      grade: lp.grade,
      title: lp.title,
      unit: lp.unit || '',
      date: lp.date,
      durationMinutes: lp.durationMinutes,
      grammarFocus: lp.grammarFocus || '',
      objectives: lp.objectives || [],
      materials: lp.materials || [],
      warmUp: lp.warmUp || '',
      directInstruction: lp.directInstruction || '',
      guidedPractice: lp.guidedPractice || '',
      independentPractice: lp.independentPractice || '',
      exitTicket: lp.exitTicket || '',
      homeworkAssigned: lp.homeworkAssigned,
      teacherNotes: lp.teacherNotes,
      completed: Boolean(lp.completed),
      sourceType: lp.sourceType,
      attachmentId: lp.attachmentId,
      attachmentName: lp.attachmentName,
      attachmentSize: lp.attachmentSize,
    }));
  });

  listenSubcol('lessonProgress', (items) => {
    const flat: StudentLessonProgress[] = [];
    items.forEach((docData) => {
      const entries = docData.entries || {};
      Object.values(entries).forEach((entry: any) => {
        if (entry && entry.studentId && entry.lessonId) {
          flat.push(entry as StudentLessonProgress);
        }
      });
    });
    studentLessonProgressRaw = flat;
  });

  listenSubcol('cumulativeProgress', (items) => {
    const flat: StudentCumulativeProgress[] = [];
    items.forEach((docData) => {
      const entries = docData.entries || {};
      Object.values(entries).forEach((entry: any) => {
        if (entry && entry.studentId) {
          flat.push(entry as StudentCumulativeProgress);
        }
      });
    });
    cumulativeProgressRaw = flat;
  });

  listenSubcol('grammarExercises', (items) => {
    grammarExercisesRaw = items.map((ex) => ({
      id: ex.id,
      grade: ex.grade,
      title: ex.title,
      topic: ex.topic,
      difficulty: ex.difficulty,
      rulesExplanation: ex.rulesExplanation,
      questions: ex.questions || [],
      assignedClassIds: ex.assignedClassIds || [],
      createdAt: ex.createdDate || tsToIso(ex.createdAt, '2026-11-01').split('T')[0],
    }));
  });

  listenSubcol('books', (items) => {
    booksRaw = items.map((b) => ({
      id: b.id,
      classId: b.classId,
      title: b.title,
      author: b.author,
      totalChapters: b.totalChapters,
      currentChapter: b.currentChapter,
      genre: b.genre,
      summary: b.summary,
      vocabulary: b.vocabulary || [],
      discussionQuestions: b.discussionQuestions || [],
      targetCompletionDate: b.targetCompletionDate,
    }));
  });

  listenSubcol('encryptedNotes', (items) => {
    encryptedNotesRaw = items.map((n) => ({
      id: n.id,
      title: n.title,
      studentId: n.studentId,
      classId: n.classId,
      category: n.category,
      ciphertext: n.ciphertext,
      iv: n.iv,
      salt: n.salt,
      createdAt: tsToIso(n.createdAt, new Date().toISOString()),
      updatedAt: tsToIso(n.updatedAt, new Date().toISOString()),
    }));
  });

  listenSubcol('teacherNotes', (items) => {
    teacherNotesRaw = items.map((tn) => ({
      id: tn.id,
      title: tn.title,
      classId: tn.classId,
      category: tn.category,
      sourceType: tn.sourceType,
      content: tn.content || '',
      attachmentId: tn.attachmentId,
      attachmentName: tn.attachmentName,
      attachmentSize: tn.attachmentSize,
      completed: Boolean(tn.completed),
      date: tn.date,
    }));
  });

  listenSubcol('reminders', (items) => {
    remindersRaw = items.map((r) => ({
      id: r.id,
      title: r.title,
      description: r.description,
      dueDate: r.dueDate,
      classId: r.classId,
      priority: r.priority,
      category: r.category,
      completed: Boolean(r.completed),
    }));
  });

  return () => {
    unsubs.forEach((u) => u());
  };
}

// =========================================================================
// Granular Persistence API
// =========================================================================
export const FirestoreService = {
  async saveUserSettings(
    uid: string,
    user: User,
    settings: TeacherSettings,
    academicYears: string[]
  ): Promise<void> {
    const path = `users/${uid}`;
    const userRef = doc(db, 'users', uid);
    const payload = serializeUserProfile(uid, user, settings, academicYears);
    try {
      const snap = await getDoc(userRef);
      if (snap.exists()) {
        const { uid: _u, email: _e, ...updatable } = payload;
        await updateDoc(userRef, {
          ...updatable,
          updatedAt: serverTimestamp(),
        });
      } else {
        await setDoc(userRef, {
          ...payload,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, path);
    }
  },

  async saveClassGroup(uid: string, cls: ClassGroup): Promise<void> {
    const data = serializeClassGroup(uid, cls);
    const { id: _id, ownerId: _o, ...updatable } = data;
    await upsertSubcollectionDoc(uid, 'classes', data.id, data, updatable);
  },

  async deleteClassGroup(uid: string, classId: string): Promise<void> {
    const id = toValidId(classId, 'class').slice(0, 64);
    const path = `users/${uid}/classes/${id}`;
    try {
      await deleteDoc(doc(db, 'users', uid, 'classes', id));
      unmarkKnown('classes', id);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, path);
    }
  },

  async saveStudent(uid: string, student: Student): Promise<void> {
    const data = serializeStudent(uid, student);
    const { id: _id, ownerId: _o, ...updatable } = data;
    await upsertSubcollectionDoc(uid, 'students', data.id, data, updatable);
  },

  async saveStudentsBatch(
    uid: string,
    students: Student[],
    replaceClassId?: string
  ): Promise<void> {
    const colPath = `users/${uid}/students`;
    const existingIds = new Set<string>();

    try {
      const snap = await getDocs(
        query(collection(db, 'users', uid, 'students'), where('ownerId', '==', uid))
      );

      if (replaceClassId) {
        const deleteOps: Array<(batch: ReturnType<typeof writeBatch>) => void> = [];
        snap.forEach((d) => {
          if (d.data().classId === replaceClassId) {
            deleteOps.push((b) => b.delete(d.ref));
            unmarkKnown('students', d.id);
          } else {
            existingIds.add(d.id);
          }
        });
        if (deleteOps.length > 0) {
          await commitOperationsInBatches(deleteOps, colPath);
        }
      } else {
        snap.forEach((d) => existingIds.add(d.id));
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, colPath);
    }

    const writeOps: Array<(batch: ReturnType<typeof writeBatch>) => void> = [];
    for (const s of students) {
      const data = serializeStudent(uid, s);
      const docRef = doc(db, 'users', uid, 'students', data.id);
      if (existingIds.has(data.id)) {
        const { id: _id, ownerId: _o, ...updatable } = data;
        writeOps.push((b) =>
          b.update(docRef, {
            ...updatable,
            updatedAt: serverTimestamp(),
          })
        );
      } else {
        writeOps.push((b) =>
          b.set(docRef, {
            ...data,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          })
        );
      }
      markKnown('students', data.id);
    }

    await commitOperationsInBatches(writeOps, colPath);
  },

  async saveAttendanceRecord(uid: string, record: AttendanceRecord): Promise<void> {
    const data = serializeAttendance(uid, record);
    await upsertSubcollectionDoc(uid, 'attendance', data.id, data, {
      records: data.records,
      ...(data.notes !== undefined ? { notes: data.notes } : {}),
    });
  },

  async saveAssignment(uid: string, assignment: Assignment): Promise<void> {
    const data = serializeAssignment(uid, assignment);
    const { id: _id, ownerId: _o, createdDate: _cd, ...updatable } = data;
    await upsertSubcollectionDoc(uid, 'assignments', data.id, data, updatable);
  },

  async saveAssignmentGradesMap(
    uid: string,
    assignmentId: string,
    allGradesForAssignment: GradeRecord[]
  ): Promise<void> {
    const asgId = toValidId(assignmentId, 'asg');
    const entries: Record<string, GradeRecord> = {};
    allGradesForAssignment.forEach((g) => {
      entries[g.studentId] = stripUndefined({ ...g });
    });
    const bounded = clampMapKeys(entries, 300);
    await upsertSubcollectionDoc(
      uid,
      'assignmentGrades',
      asgId,
      { id: asgId, ownerId: uid, assignmentId: asgId, entries: bounded },
      { entries: bounded }
    );
  },

  async saveMonthlyAssessmentsMap(
    uid: string,
    classId: string,
    month: string,
    recordsForClassMonth: MonthlyAssessmentRecord[]
  ): Promise<void> {
    const safeClassId = toValidId(classId, '6A').slice(0, 64);
    const safeMonth = /^\d{4}-\d{2}$/.test(month) ? month : '2026-11';
    const docId = toValidId(`${safeClassId}_${safeMonth}`, `${safeClassId}_${safeMonth}`);
    const entries: Record<string, MonthlyAssessmentRecord> = {};
    recordsForClassMonth.forEach((m) => {
      entries[m.studentId] = stripUndefined({ ...m });
    });
    const bounded = clampMapKeys(entries, 300);
    await upsertSubcollectionDoc(
      uid,
      'monthlyAssessments',
      docId,
      { id: docId, ownerId: uid, classId: safeClassId, month: safeMonth, entries: bounded },
      { entries: bounded }
    );
  },

  async saveParticipationItem(uid: string, item: ParticipationItem): Promise<void> {
    const data = serializeParticipation(uid, item);
    await upsertSubcollectionDoc(uid, 'participation', data.id, data, {
      scores: data.scores,
      logs: data.logs,
    });
  },

  async saveLessonPlan(uid: string, plan: LessonPlan): Promise<void> {
    const data = serializeLessonPlan(uid, plan);
    const { id: _id, ownerId: _o, ...updatable } = data;
    await upsertSubcollectionDoc(uid, 'lessonPlans', data.id, data, updatable);
  },

  async deleteLessonPlan(uid: string, lessonId: string): Promise<void> {
    const id = toValidId(lessonId, 'lp');
    const path = `users/${uid}/lessonPlans/${id}`;
    try {
      await deleteDoc(doc(db, 'users', uid, 'lessonPlans', id));
      unmarkKnown('lessonPlans', id);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, path);
    }
  },

  async saveTeacherNote(uid: string, note: TeacherNote): Promise<void> {
    const data = serializeTeacherNote(uid, note);
    const { id: _id, ownerId: _o, ...updatable } = data;
    await upsertSubcollectionDoc(uid, 'teacherNotes', data.id, data, updatable);
  },

  async deleteTeacherNote(uid: string, noteId: string): Promise<void> {
    const id = toValidId(noteId, 'tn');
    const path = `users/${uid}/teacherNotes/${id}`;
    try {
      await deleteDoc(doc(db, 'users', uid, 'teacherNotes', id));
      unmarkKnown('teacherNotes', id);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, path);
    }
  },

  async saveLessonProgressMap(
    uid: string,
    lessonId: string,
    progressListForLesson: StudentLessonProgress[]
  ): Promise<void> {
    const safeLessonId = toValidId(lessonId, 'lp');
    const entries: Record<string, StudentLessonProgress> = {};
    progressListForLesson.forEach((lp) => {
      entries[lp.studentId] = stripUndefined({ ...lp });
    });
    const bounded = clampMapKeys(entries, 300);
    await upsertSubcollectionDoc(
      uid,
      'lessonProgress',
      safeLessonId,
      { id: safeLessonId, ownerId: uid, lessonId: safeLessonId, entries: bounded },
      { entries: bounded }
    );
  },

  async saveCumulativeProgressMap(
    uid: string,
    classId: string,
    progressListForClass: StudentCumulativeProgress[]
  ): Promise<void> {
    const safeClassId = toValidId(classId, '6A').slice(0, 64);
    const entries: Record<string, StudentCumulativeProgress> = {};
    progressListForClass.forEach((cp) => {
      entries[cp.studentId] = stripUndefined({ ...cp });
    });
    const bounded = clampMapKeys(entries, 300);
    await upsertSubcollectionDoc(
      uid,
      'cumulativeProgress',
      safeClassId,
      { id: safeClassId, ownerId: uid, classId: safeClassId, entries: bounded },
      { entries: bounded }
    );
  },

  async saveGrammarExercise(uid: string, ex: GrammarExercise): Promise<void> {
    const data = serializeGrammarExercise(uid, ex);
    const { id: _id, ownerId: _o, createdDate: _cd, ...updatable } = data;
    await upsertSubcollectionDoc(uid, 'grammarExercises', data.id, data, updatable);
  },

  async saveBookStudy(uid: string, book: BookStudy): Promise<void> {
    const data = serializeBookStudy(uid, book);
    const { id: _id, ownerId: _o, ...updatable } = data;
    await upsertSubcollectionDoc(uid, 'books', data.id, data, updatable);
  },

  async saveEncryptedNote(uid: string, note: EncryptedTeacherNote): Promise<void> {
    const data = serializeEncryptedNote(uid, note);
    await upsertSubcollectionDoc(uid, 'encryptedNotes', data.id, data, {
      title: data.title,
      category: data.category,
      ciphertext: data.ciphertext,
      iv: data.iv,
      salt: data.salt,
    });
  },

  async saveReminder(uid: string, rem: Reminder): Promise<void> {
    const data = serializeReminder(uid, rem);
    const { id: _id, ownerId: _o, ...updatable } = data;
    await upsertSubcollectionDoc(uid, 'reminders', data.id, data, updatable);
  },

  async syncFullDatabaseToFirestore(
    user: User,
    dbData: AppDatabase
  ): Promise<void> {
    const uid = user.uid;
    await this.saveUserSettings(uid, user, dbData.settings, dbData.academicYears);

    const subcols = [
      'classes',
      'students',
      'attendance',
      'assignments',
      'assignmentGrades',
      'monthlyAssessments',
      'participation',
      'lessonPlans',
      'lessonProgress',
      'cumulativeProgress',
      'grammarExercises',
      'books',
      'encryptedNotes',
      'teacherNotes',
      'reminders',
    ] as const;

    const existingBySubcol = new Map<string, Set<string>>();
    await Promise.all(
      subcols.map(async (subcol) => {
        const path = `users/${uid}/${subcol}`;
        try {
          const snap = await getDocs(
            query(collection(db, 'users', uid, subcol), where('ownerId', '==', uid))
          );
          const ids = new Set<string>();
          snap.forEach((d) => {
            ids.add(d.id);
            markKnown(subcol, d.id);
          });
          existingBySubcol.set(subcol, ids);
        } catch (err) {
          handleFirestoreError(err, OperationType.LIST, path);
        }
      })
    );

    const ops: Array<(batch: ReturnType<typeof writeBatch>) => void> = [];
    const queueUpsert = (
      subcol: string,
      docId: string,
      createData: Record<string, any>,
      updateData: Record<string, any>
    ) => {
      const docRef = doc(db, 'users', uid, subcol, docId);
      const exists = existingBySubcol.get(subcol)?.has(docId) ?? false;
      if (exists) {
        ops.push((b) =>
          b.update(docRef, {
            ...updateData,
            updatedAt: serverTimestamp(),
          })
        );
      } else {
        ops.push((b) =>
          b.set(docRef, {
            ...createData,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          })
        );
      }
      markKnown(subcol, docId);
    };

    for (const cls of dbData.classes || []) {
      const data = serializeClassGroup(uid, cls);
      const { id: _id, ownerId: _o, ...updatable } = data;
      queueUpsert('classes', data.id, data, updatable);
    }

    for (const s of dbData.students || []) {
      const data = serializeStudent(uid, s);
      const { id: _id, ownerId: _o, ...updatable } = data;
      queueUpsert('students', data.id, data, updatable);
    }

    for (const att of dbData.attendance || []) {
      const data = serializeAttendance(uid, att);
      queueUpsert('attendance', data.id, data, {
        records: data.records,
        ...(data.notes !== undefined ? { notes: data.notes } : {}),
      });
    }

    for (const asg of dbData.assignments || []) {
      const data = serializeAssignment(uid, asg);
      const { id: _id, ownerId: _o, createdDate: _cd, ...updatable } = data;
      queueUpsert('assignments', data.id, data, updatable);
    }

    const gradesByAsg = new Map<string, Record<string, GradeRecord>>();
    for (const g of dbData.grades || []) {
      const asgId = toValidId(g.assignmentId, 'asg');
      const map = gradesByAsg.get(asgId) || {};
      map[g.studentId] = stripUndefined({ ...g });
      gradesByAsg.set(asgId, map);
    }
    for (const [asgId, entries] of gradesByAsg.entries()) {
      const bounded = clampMapKeys(entries, 300);
      queueUpsert(
        'assignmentGrades',
        asgId,
        { id: asgId, ownerId: uid, assignmentId: asgId, entries: bounded },
        { entries: bounded }
      );
    }

    const monthlyByKey = new Map<
      string,
      { classId: string; month: string; entries: Record<string, MonthlyAssessmentRecord> }
    >();
    for (const m of dbData.monthlyAssessments || []) {
      const classId = toValidId(m.classId, '6A').slice(0, 64);
      const month = /^\d{4}-\d{2}$/.test(m.month) ? m.month : '2026-11';
      const docId = toValidId(`${classId}_${month}`, `${classId}_${month}`);
      const current = monthlyByKey.get(docId) || { classId, month, entries: {} };
      current.entries[m.studentId] = stripUndefined({ ...m });
      monthlyByKey.set(docId, current);
    }
    for (const [docId, val] of monthlyByKey.entries()) {
      const bounded = clampMapKeys(val.entries, 300);
      queueUpsert(
        'monthlyAssessments',
        docId,
        { id: docId, ownerId: uid, classId: val.classId, month: val.month, entries: bounded },
        { entries: bounded }
      );
    }

    for (const part of dbData.participation || []) {
      const data = serializeParticipation(uid, part);
      queueUpsert('participation', data.id, data, {
        scores: data.scores,
        logs: data.logs,
      });
    }

    for (const lp of dbData.lessonPlans || []) {
      const data = serializeLessonPlan(uid, lp);
      const { id: _id, ownerId: _o, ...updatable } = data;
      queueUpsert('lessonPlans', data.id, data, updatable);
    }

    const lessonProgByLesson = new Map<string, Record<string, StudentLessonProgress>>();
    for (const slp of dbData.studentLessonProgress || []) {
      const lessonId = toValidId(slp.lessonId, 'lp');
      const map = lessonProgByLesson.get(lessonId) || {};
      map[slp.studentId] = stripUndefined({ ...slp });
      lessonProgByLesson.set(lessonId, map);
    }
    for (const [lessonId, entries] of lessonProgByLesson.entries()) {
      const bounded = clampMapKeys(entries, 300);
      queueUpsert(
        'lessonProgress',
        lessonId,
        { id: lessonId, ownerId: uid, lessonId, entries: bounded },
        { entries: bounded }
      );
    }

    const studentClassMap = new Map<string, string>();
    (dbData.students || []).forEach((s) => studentClassMap.set(s.id, s.classId));
    const cumByClass = new Map<string, Record<string, StudentCumulativeProgress>>();
    for (const cp of dbData.cumulativeProgress || []) {
      const classId = toValidId(studentClassMap.get(cp.studentId) || '6A', '6A').slice(0, 64);
      const map = cumByClass.get(classId) || {};
      map[cp.studentId] = stripUndefined({ ...cp });
      cumByClass.set(classId, map);
    }
    for (const [classId, entries] of cumByClass.entries()) {
      const bounded = clampMapKeys(entries, 300);
      queueUpsert(
        'cumulativeProgress',
        classId,
        { id: classId, ownerId: uid, classId, entries: bounded },
        { entries: bounded }
      );
    }

    for (const ex of dbData.grammarExercises || []) {
      const data = serializeGrammarExercise(uid, ex);
      const { id: _id, ownerId: _o, createdDate: _cd, ...updatable } = data;
      queueUpsert('grammarExercises', data.id, data, updatable);
    }

    for (const book of dbData.books || []) {
      const data = serializeBookStudy(uid, book);
      const { id: _id, ownerId: _o, ...updatable } = data;
      queueUpsert('books', data.id, data, updatable);
    }

    for (const note of dbData.encryptedNotes || []) {
      const data = serializeEncryptedNote(uid, note);
      queueUpsert('encryptedNotes', data.id, data, {
        title: data.title,
        category: data.category,
        ciphertext: data.ciphertext,
        iv: data.iv,
        salt: data.salt,
      });
    }

    for (const tNote of dbData.teacherNotes || []) {
      const data = serializeTeacherNote(uid, tNote);
      const { id: _id, ownerId: _o, ...updatable } = data;
      queueUpsert('teacherNotes', data.id, data, updatable);
    }

    for (const rem of dbData.reminders || []) {
      const data = serializeReminder(uid, rem);
      const { id: _id, ownerId: _o, ...updatable } = data;
      queueUpsert('reminders', data.id, data, updatable);
    }

    await commitOperationsInBatches(ops, `users/${uid}/restore`);
  },
};
