import React, { useState } from 'react';
import {
  Users,
  Search,
  Award,
  Calendar,
  Lock,
  Unlock,
  Printer,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  ShieldAlert,
  Mail,
  UserCheck,
  FileText,
  Plus,
  Flame,
  Check,
  Upload,
  X,
  RefreshCw,
  FileSpreadsheet,
} from 'lucide-react';
import {
  Student,
  ClassGroup,
  AttendanceRecord,
  Assignment,
  GradeRecord,
  EncryptedTeacherNote,
  DecryptedTeacherNote,
} from '../../types';
import { CryptoVault } from '../../services/crypto';

interface StudentRosterViewProps {
  classes: ClassGroup[];
  students: Student[];
  attendance: AttendanceRecord[];
  assignments: Assignment[];
  grades: GradeRecord[];
  encryptedNotes: EncryptedTeacherNote[];
  activeClassId: string;
  onSelectClass: (classId: string) => void;
  onExportStudentPdf: (student: Student, classGroup: ClassGroup, customNote?: string) => void;
  onSaveEncryptedNote: (note: EncryptedTeacherNote) => void;
  onOpenVaultSettings: () => void;
  onAddStudent?: (student: Student) => void;
  onBulkAddStudents?: (students: Student[]) => void;
  onPopulate80Students?: (classId: string) => void;
  focusedStudentId?: string;
  focusToken?: number;
}

export const StudentRosterView: React.FC<StudentRosterViewProps> = ({
  classes,
  students,
  attendance,
  assignments,
  grades,
  encryptedNotes,
  activeClassId,
  onSelectClass,
  onExportStudentPdf,
  onSaveEncryptedNote,
  onOpenVaultSettings,
  onAddStudent,
  onBulkAddStudents,
  onPopulate80Students,
  focusedStudentId,
  focusToken,
}) => {
  const currentClass = classes.find((c) => c.id === activeClassId) || classes[0];
  const classStudents = students.filter((s) => s.classId === currentClass.id);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(classStudents[0] || null);

  // Scalability & filter state for 80+ students
  const [rosterFilter, setRosterFilter] = useState<'all' | 'accommodations' | 'low_attendance'>('all');
  const [rosterPage, setRosterPage] = useState<number>(1);
  const ROSTER_PAGE_SIZE = 25;

  // Bulk Import modal state
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkNamesText, setBulkNamesText] = useState('');

  // Add Single Student modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentRoll, setNewStudentRoll] = useState('');
  const [newStudentAccommodations, setNewStudentAccommodations] = useState('');
  const [newStudentGuardian, setNewStudentGuardian] = useState('');
  const [newStudentContact, setNewStudentContact] = useState('');

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [confirmPopulate, setConfirmPopulate] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Decrypted note drafts
  const [decryptedNotesMap, setDecryptedNotesMap] = useState<Record<string, string>>({});
  const [newNoteContent, setNewNoteContent] = useState('');
  const [newNoteCategory, setNewNoteCategory] = useState<EncryptedTeacherNote['category']>('observation');
  const [isVaultUnlocked, setIsVaultUnlocked] = useState(CryptoVault.isUnlocked());
  const [passphraseInput, setPassphraseInput] = useState('');
  const [vaultError, setVaultError] = useState('');

  // Update selected student when class changes or global search focuses a student
  React.useEffect(() => {
    const list = students.filter((s) => s.classId === currentClass.id);
    if (focusedStudentId) {
      const target = students.find((s) => s.id === focusedStudentId);
      if (target) {
        setSearchQuery('');
        setRosterFilter('all');
        setSelectedStudent(target);
        const targetIndex = list.findIndex((s) => s.id === target.id);
        if (targetIndex >= 0) {
          setRosterPage(Math.floor(targetIndex / ROSTER_PAGE_SIZE) + 1);
        }
        return;
      }
    }
    if (list.length > 0 && (!selectedStudent || selectedStudent.classId !== currentClass.id)) {
      setSelectedStudent(list[0]);
    }
  }, [currentClass.id, students, focusedStudentId, focusToken]);

  // Attempt to decrypt notes when student or vault status changes
  React.useEffect(() => {
    setIsVaultUnlocked(CryptoVault.isUnlocked());
    if (CryptoVault.isUnlocked() && selectedStudent) {
      const studentNotes = encryptedNotes.filter((n) => n.studentId === selectedStudent.id);
      studentNotes.forEach(async (n) => {
        try {
          const dec = await CryptoVault.decrypt(n.ciphertext, n.iv);
          setDecryptedNotesMap((prev) => ({ ...prev, [n.id]: dec }));
        } catch (e) {
          console.error('Failed to decrypt note', e);
        }
      });
    }
  }, [selectedStudent?.id, encryptedNotes, isVaultUnlocked]);

  const handleUnlockVault = async () => {
    setVaultError('');
    if (!passphraseInput) return;
    const salt = localStorage.getItem('gradecraft_vault_salt') || CryptoVault.generateSalt();
    localStorage.setItem('gradecraft_vault_salt', salt);

    const success = await CryptoVault.unlock(passphraseInput, salt);
    if (success) {
      setIsVaultUnlocked(true);
      setPassphraseInput('');
    } else {
      setVaultError('Incorrect passphrase or decryption failed.');
    }
  };

  const handleAddEncryptedNote = async () => {
    if (!selectedStudent || !newNoteContent.trim()) return;
    if (!CryptoVault.isUnlocked()) {
      setVaultError('Please unlock your private vault first.');
      return;
    }

    try {
      const enc = await CryptoVault.encrypt(newNoteContent.trim());
      const newNote: EncryptedTeacherNote = {
        id: 'note_' + Date.now(),
        title: `${newNoteCategory.toUpperCase()} - ${new Date().toLocaleDateString()}`,
        studentId: selectedStudent.id,
        classId: currentClass.id,
        category: newNoteCategory,
        ciphertext: enc.ciphertext,
        iv: enc.iv,
        salt: enc.salt,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      setDecryptedNotesMap((prev) => ({ ...prev, [newNote.id]: newNoteContent.trim() }));
      onSaveEncryptedNote(newNote);
      setNewNoteContent('');
    } catch (e) {
      setVaultError('Encryption failed. Make sure vault is unlocked.');
    }
  };

  // Metrics for selected student
  const studentGrades = selectedStudent
    ? grades.filter((g) => g.studentId === selectedStudent.id)
    : [];

  let totalScore = 0;
  let totalMax = 0;
  studentGrades.forEach((g) => {
    const asg = assignments.find((a) => a.id === g.assignmentId);
    if (asg) {
      totalScore += g.score;
      totalMax += asg.maxPoints;
    }
  });

  const gradePercent = totalMax > 0 ? Math.round((totalScore / totalMax) * 100) : 92;

  // Attendance rate for selected student
  let presentDays = 0;
  let totalDays = 0;
  attendance.forEach((att) => {
    if (selectedStudent && att.records[selectedStudent.id]) {
      totalDays++;
      if (att.records[selectedStudent.id] === 'present') presentDays++;
    }
  });
  const attendancePercent = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 100;

  // Filter students by search and condition for 80+ roster
  const filteredStudents = classStudents.filter((s) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      s.name.toLowerCase().includes(q) ||
      s.rollNumber.includes(q);
    if (!matchesSearch) return false;

    if (rosterFilter === 'accommodations') return !!s.accommodations;
    if (rosterFilter === 'low_attendance') {
      let pres = 0;
      let tot = 0;
      attendance.forEach((att) => {
        if (att.records[s.id]) {
          tot++;
          if (att.records[s.id] === 'present') pres++;
        }
      });
      const rate = tot > 0 ? (pres / tot) * 100 : 100;
      return rate < 80;
    }
    return true;
  });

  const totalRosterPages = Math.max(1, Math.ceil(filteredStudents.length / ROSTER_PAGE_SIZE));
  const safeRosterPage = Math.min(rosterPage, totalRosterPages);
  const pagedStudents = filteredStudents.slice(
    (safeRosterPage - 1) * ROSTER_PAGE_SIZE,
    safeRosterPage * ROSTER_PAGE_SIZE
  );

  const startStudentIdx = (safeRosterPage - 1) * ROSTER_PAGE_SIZE + 1;
  const endStudentIdx = Math.min(safeRosterPage * ROSTER_PAGE_SIZE, filteredStudents.length);

  const handleExecuteBulkImport = () => {
    if (!bulkNamesText.trim()) return;
    const lines = bulkNamesText
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (lines.length === 0) return;

    const maxRoll = classStudents.reduce((acc, s) => {
      const num = parseInt(s.rollNumber, 10);
      return !isNaN(num) && num > acc ? num : acc;
    }, 0);

    const avatarColors = [
      '#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ec4899', '#06b6d4',
      '#f97316', '#6366f1', '#14b8a6', '#f43f5e', '#84cc16', '#a855f7'
    ];

    const newStudents: Student[] = lines.map((name, idx) => {
      const rollNum = String(maxRoll + idx + 1).padStart(2, '0');
      const studentId = `s_${currentClass.id.toLowerCase()}_${rollNum}_${Date.now().toString(36)}`;
      const parts = name.split(' ');
      const fName = parts[0] || 'Student';
      const lName = parts.slice(1).join(' ') || 'Learner';

      return {
        id: studentId,
        classId: currentClass.id,
        name,
        rollNumber: rollNum,
        guardianName: `Parent of ${fName}`,
        guardianContact: `${fName.toLowerCase()}.${lName.toLowerCase()}@parent-mail.com`,
        avatarColor: avatarColors[(maxRoll + idx) % avatarColors.length],
      };
    });

    if (onBulkAddStudents) {
      onBulkAddStudents(newStudents);
    }
    setShowBulkModal(false);
    setBulkNamesText('');
    showToast(`Successfully added ${newStudents.length} students to ${currentClass.name}!`);
  };

  const handleAddSingleStudent = () => {
    if (!newStudentName.trim()) return;
    const roll = newStudentRoll.trim() || String(classStudents.length + 1).padStart(2, '0');
    const studentId = `s_${currentClass.id.toLowerCase()}_${roll}_${Date.now().toString(36)}`;
    const student: Student = {
      id: studentId,
      classId: currentClass.id,
      name: newStudentName.trim(),
      rollNumber: roll,
      accommodations: newStudentAccommodations.trim() || undefined,
      guardianName: newStudentGuardian.trim() || `Parent of ${newStudentName.trim()}`,
      guardianContact: newStudentContact.trim() || `${newStudentName.trim().toLowerCase().replace(/\s+/g, '.')}@parent-mail.com`,
      avatarColor: '#3b82f6',
    };

    if (onAddStudent) {
      onAddStudent(student);
    }
    setShowAddModal(false);
    setNewStudentName('');
    setNewStudentRoll('');
    setNewStudentAccommodations('');
    setNewStudentGuardian('');
    setNewStudentContact('');
    setSelectedStudent(student);
    showToast(`Added ${student.name} (#${student.rollNumber}) to ${currentClass.name}!`);
  };

  return (
    <div className="space-y-5 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <span>Student Profiles & Encrypted Notes</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            End-to-End Encrypted (E2EE) private observations & roster management for {currentClass.name}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {onPopulate80Students && (
            confirmPopulate ? (
              <div className="flex items-center gap-1.5 bg-slate-800 border border-blue-500/40 rounded-xl px-2.5 py-1.5 text-xs">
                <span className="text-slate-200 font-medium">Reset {currentClass.name} to 80?</span>
                <button
                  type="button"
                  onClick={() => {
                    onPopulate80Students(currentClass.id);
                    setConfirmPopulate(false);
                    showToast(`Populated 80 students in ${currentClass.name}`);
                  }}
                  className="px-2 py-0.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold"
                >
                  Confirm
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmPopulate(false)}
                  className="px-1.5 py-0.5 rounded-lg text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmPopulate(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-200 transition"
                title="Populate full 80-student roster"
              >
                <RefreshCw className="w-3.5 h-3.5 text-blue-400" />
                <span>Populate 80 Students</span>
              </button>
            )
          )}

          <button
            onClick={() => setShowBulkModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-200 transition"
            title="Bulk import list of student names"
          >
            <Upload className="w-3.5 h-3.5 text-emerald-400" />
            <span>Bulk Paste Names</span>
          </button>

          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-200 transition"
            title="Add a single new student"
          >
            <Plus className="w-3.5 h-3.5 text-purple-400" />
            <span>Add Student</span>
          </button>

          {selectedStudent && (
            <button
              onClick={() => onExportStudentPdf(selectedStudent, currentClass)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white shadow-sm transition active:scale-95"
            >
              <Printer className="w-4 h-4" />
              <span>Export Parent PDF</span>
            </button>
          )}
        </div>
      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-bold animate-fade-in">
          <Check className="w-4 h-4" />
          <span>{toastMessage}</span>
        </div>
      )}

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
                setRosterPage(1);
              }}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 border ${
                isSelected
                  ? 'text-white border-blue-400 shadow-md ring-1 ring-blue-500/20'
                  : 'bg-slate-800/80 border-slate-700/80 text-slate-300 hover:border-slate-600'
              }`}
              style={{ backgroundColor: isSelected ? cls.color : undefined }}
            >
              <span>{cls.name}</span>
              <span className="text-[10px] font-normal opacity-80">
                ({count} students)
              </span>
            </button>
          );
        })}
      </div>

      {/* 2-Column Responsive Layout: Left Student List, Right Deep Dive Profile */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Roster Column (5 cols) */}
        <div className="lg:col-span-5 space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder={`Search in ${classStudents.length} students...`}
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setRosterPage(1);
              }}
              className="w-full pl-9 pr-4 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 text-[11px]">
            <button
              onClick={() => {
                setRosterFilter('all');
                setRosterPage(1);
              }}
              className={`flex-1 py-1 rounded-lg font-bold transition text-center ${
                rosterFilter === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              All ({classStudents.length})
            </button>
            <button
              onClick={() => {
                setRosterFilter('accommodations');
                setRosterPage(1);
              }}
              className={`flex-1 py-1 rounded-lg font-bold transition text-center ${
                rosterFilter === 'accommodations'
                  ? 'bg-amber-600 text-white'
                  : 'text-slate-400 hover:text-amber-300'
              }`}
            >
              Accommodations
            </button>
            <button
              onClick={() => {
                setRosterFilter('low_attendance');
                setRosterPage(1);
              }}
              className={`flex-1 py-1 rounded-lg font-bold transition text-center ${
                rosterFilter === 'low_attendance'
                  ? 'bg-rose-600 text-white'
                  : 'text-slate-400 hover:text-rose-300'
              }`}
            >
              Att &lt;80%
            </button>
          </div>

          {/* Roster Pagination Header */}
          <div className="flex items-center justify-between text-xs px-1 text-slate-400">
            <span>
              Showing <span className="text-white font-bold">{startStudentIdx}–{endStudentIdx}</span> of{' '}
              <span className="text-blue-400 font-bold">{filteredStudents.length}</span>
            </span>

            {totalRosterPages > 1 && (
              <div className="flex items-center gap-1 bg-slate-900 rounded-lg p-0.5 border border-slate-800">
                <button
                  onClick={() => setRosterPage((p) => Math.max(1, p - 1))}
                  disabled={safeRosterPage <= 1}
                  className="p-1 text-slate-300 hover:text-white disabled:opacity-30 transition"
                  title="Previous Page"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <span className="text-[11px] font-bold text-slate-200 px-1.5">
                  {safeRosterPage} / {totalRosterPages}
                </span>
                <button
                  onClick={() => setRosterPage((p) => Math.min(totalRosterPages, p + 1))}
                  disabled={safeRosterPage >= totalRosterPages}
                  className="p-1 text-slate-300 hover:text-white disabled:opacity-30 transition"
                  title="Next Page"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-slate-700 bg-slate-800/80 divide-y divide-slate-700/50 max-h-[550px] overflow-y-auto shadow-sm">
            {pagedStudents.map((student) => {
              const isSel = selectedStudent?.id === student.id;
              return (
                <button
                  key={student.id}
                  onClick={() => setSelectedStudent(student)}
                  className={`w-full p-3 text-left transition flex items-center justify-between ${
                    isSel ? 'bg-blue-600/20 border-l-4 border-blue-500' : 'hover:bg-slate-750'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 pr-2">
                    <div
                      className="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs text-white shrink-0"
                      style={{ backgroundColor: student.avatarColor || '#3b82f6' }}
                    >
                      {student.name.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-white truncate">
                        {student.name}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        Roll #{student.rollNumber} {student.accommodations && '· 💡 Accommodations'}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-500" />
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Student Profile Deep Dive (7 cols) */}
        <div className="lg:col-span-7">
          {selectedStudent ? (
            <div className="space-y-4">
              {/* Profile Overview Card */}
              <div className="rounded-2xl border border-slate-700 bg-slate-800/80 p-5 shadow-sm space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg text-white shadow-md"
                      style={{ backgroundColor: selectedStudent.avatarColor || '#3b82f6' }}
                    >
                      {selectedStudent.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-white">
                        {selectedStudent.name}
                      </h3>
                      <p className="text-xs text-slate-400">
                        {currentClass.name} · Roll #{selectedStudent.rollNumber}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => onExportStudentPdf(selectedStudent, currentClass)}
                    className="p-2 rounded-xl bg-slate-700/60 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                    title="Export Student Report PDF"
                  >
                    <Printer className="w-4 h-4" />
                  </button>
                </div>

                {/* Guardian Info */}
                <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-700/60 text-xs text-slate-300 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                      Parent / Guardian:
                    </span>
                    <span className="font-medium text-white">
                      {selectedStudent.guardianName || 'Not Listed'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                      Contact:
                    </span>
                    <span className="font-medium text-blue-400">
                      {selectedStudent.guardianContact || 'N/A'}
                    </span>
                  </div>
                </div>

                {selectedStudent.accommodations && (
                  <div className="p-2.5 rounded-xl bg-amber-950/30 border border-amber-500/30 text-xs text-amber-200">
                    <span className="font-bold">Learning Accommodations: </span>
                    {selectedStudent.accommodations}
                  </div>
                )}

                {/* Metrics */}
                <div className="grid grid-cols-2 gap-3 text-center">
                  <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-700/60">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">
                      Attendance Rate
                    </span>
                    <p className="text-xl font-bold text-emerald-400 mt-0.5">
                      {attendancePercent}%
                    </p>
                    <span className="text-[10px] text-slate-400">
                      {presentDays} of {totalDays} days
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-700/60">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">
                      Academic Mark
                    </span>
                    <p className="text-xl font-bold text-blue-400 mt-0.5">
                      {gradePercent}%
                    </p>
                    <span className="text-[10px] text-slate-400">
                      {studentGrades.length} graded tasks
                    </span>
                  </div>
                </div>
              </div>

              {/* END-TO-END ENCRYPTED PRIVATE TEACHER NOTES VAULT */}
              <div className="rounded-2xl border border-slate-700 bg-slate-800/80 p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-700/60 pb-3">
                  <div className="flex items-center gap-2">
                    {isVaultUnlocked ? (
                      <Unlock className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Lock className="w-4 h-4 text-amber-400" />
                    )}
                    <h3 className="text-sm font-bold text-white tracking-tight">
                      Confidential Encrypted Notes (AES-256 E2EE)
                    </h3>
                  </div>

                  <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-700">
                    {isVaultUnlocked ? 'Vault Unlocked' : 'Vault Locked'}
                  </span>
                </div>

                {!isVaultUnlocked ? (
                  /* Vault Locked View */
                  <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-700/60 text-center space-y-3">
                    <Lock className="w-8 h-8 text-amber-400 mx-auto" />
                    <p className="text-xs text-slate-300 max-w-sm mx-auto">
                      All student observations, IEP records, and parent notes are encrypted at rest with AES-GCM 256. Enter master passcode to decrypt.
                    </p>
                    <div className="flex items-center justify-center gap-2 max-w-xs mx-auto">
                      <input
                        type="password"
                        placeholder="Master Passphrase"
                        value={passphraseInput}
                        onChange={(e) => setPassphraseInput(e.target.value)}
                        className="text-xs bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
                      />
                      <button
                        onClick={handleUnlockVault}
                        className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white transition active:scale-95"
                      >
                        Unlock
                      </button>
                    </div>
                    {vaultError && (
                      <p className="text-[11px] text-rose-400">{vaultError}</p>
                    )}
                  </div>
                ) : (
                  /* Vault Unlocked View */
                  <div className="space-y-4">
                    {/* List of Decrypted Notes for this student */}
                    <div className="space-y-2">
                      {encryptedNotes
                        .filter((n) => n.studentId === selectedStudent.id)
                        .map((note) => {
                          const content = decryptedNotesMap[note.id] || '[Decrypted in session]';
                          return (
                            <div
                              key={note.id}
                              className="p-3 rounded-xl bg-slate-900/60 border border-slate-700/60 text-xs space-y-1"
                            >
                              <div className="flex items-center justify-between text-[10px] text-slate-400">
                                <span className="font-bold text-blue-400 uppercase">
                                  {note.category.replace('_', ' ')}
                                </span>
                                <span>{new Date(note.createdAt).toLocaleDateString()}</span>
                              </div>
                              <p className="text-slate-200 leading-relaxed whitespace-pre-wrap">
                                {content}
                              </p>
                            </div>
                          );
                        })}

                      {encryptedNotes.filter((n) => n.studentId === selectedStudent.id).length === 0 && (
                        <div className="text-xs text-slate-500 italic py-2">
                          No encrypted notes recorded for {selectedStudent.name}.
                        </div>
                      )}
                    </div>

                    {/* Add New Encrypted Note */}
                    <div className="pt-3 border-t border-slate-700/60 space-y-2">
                      <div className="flex items-center gap-2">
                        <select
                          value={newNoteCategory}
                          onChange={(e) => setNewNoteCategory(e.target.value as any)}
                          className="text-xs bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-slate-300 focus:outline-none"
                        >
                          <option value="observation">Classroom Observation</option>
                          <option value="iep_confidential">IEP / Accommodation Record</option>
                          <option value="parent_conference">Parent Conference Note</option>
                          <option value="private_memo">Private Memo</option>
                        </select>
                      </div>

                      <textarea
                        rows={2}
                        placeholder={`Add private encrypted note about ${selectedStudent.name}...`}
                        value={newNoteContent}
                        onChange={(e) => setNewNoteContent(e.target.value)}
                        className="w-full text-xs bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
                      />

                      <div className="flex justify-end">
                        <button
                          onClick={handleAddEncryptedNote}
                          disabled={!newNoteContent.trim()}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-xs font-bold text-white transition active:scale-95 shadow-sm"
                        >
                          <Lock className="w-3.5 h-3.5" />
                          <span>Encrypt & Save</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-xs text-slate-400">
              Select a student to view details.
            </div>
          )}
        </div>
      </div>

      {/* BULK IMPORT MODAL FOR 80+ STUDENTS */}
      {showBulkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl p-5 shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
                <h3 className="text-sm font-bold text-white">
                  Bulk Import Names into {currentClass.name}
                </h3>
              </div>
              <button
                onClick={() => setShowBulkModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-slate-400">
              Paste student full names (one per line). Sequential roll numbers starting from #{String(classStudents.length + 1).padStart(2, '0')} will be automatically assigned.
            </p>

            <textarea
              rows={8}
              value={bulkNamesText}
              onChange={(e) => setBulkNamesText(e.target.value)}
              placeholder={`Maya Walker\nLiam Khan\nAaliyah Dubois\nNoah Hernandez\nChloe Kim\n...`}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white focus:outline-none focus:border-blue-500 font-mono text-xs leading-relaxed"
            />

            <div className="flex items-center justify-between text-slate-400">
              <span>
                Detected:{' '}
                <strong className="text-white">
                  {bulkNamesText.split('\n').filter((l) => l.trim().length > 0).length}
                </strong>{' '}
                students
              </span>
              <span className="text-[11px]">Current Class Size: {classStudents.length}</span>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setShowBulkModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold transition"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteBulkImport}
                disabled={!bulkNamesText.trim()}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-bold transition shadow-sm"
              >
                Import Students
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD SINGLE STUDENT MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl p-5 shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-purple-400" />
                <h3 className="text-sm font-bold text-white">
                  Add Student to {currentClass.name}
                </h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Full Name:</label>
                <input
                  type="text"
                  placeholder="e.g. Maya Lin"
                  value={newStudentName}
                  onChange={(e) => setNewStudentName(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">
                  Roll Number (Leave blank for #{String(classStudents.length + 1).padStart(2, '0')}):
                </label>
                <input
                  type="text"
                  placeholder={String(classStudents.length + 1).padStart(2, '0')}
                  value={newStudentRoll}
                  onChange={(e) => setNewStudentRoll(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">
                  Learning Accommodations / Notes (Optional):
                </label>
                <input
                  type="text"
                  placeholder="e.g. Extra time on essays, preferential seating"
                  value={newStudentAccommodations}
                  onChange={(e) => setNewStudentAccommodations(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">
                  Parent / Guardian Name:
                </label>
                <input
                  type="text"
                  placeholder="e.g. Sarah Lin"
                  value={newStudentGuardian}
                  onChange={(e) => setNewStudentGuardian(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">
                  Guardian Contact Email / Phone:
                </label>
                <input
                  type="text"
                  placeholder="e.g. sarah.lin@example.com"
                  value={newStudentContact}
                  onChange={(e) => setNewStudentContact(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold transition"
              >
                Cancel
              </button>
              <button
                onClick={handleAddSingleStudent}
                disabled={!newStudentName.trim()}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white font-bold transition shadow-sm"
              >
                Add Student
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
