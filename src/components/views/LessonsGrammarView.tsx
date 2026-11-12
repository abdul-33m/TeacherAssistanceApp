import React, { useEffect, useRef, useState } from 'react';
import {
  BookOpen,
  Sparkles,
  Plus,
  CheckCircle2,
  Circle,
  Printer,
  ChevronDown,
  ChevronUp,
  Filter,
  FileText,
  FileUp,
  Bookmark,
  Check,
  X,
  Bot,
  Loader2,
  Pencil,
  Trash2,
  Eye,
  Download,
  StickyNote,
  PenLine,
  ClipboardList,
  Clock,
  Calendar,
} from 'lucide-react';
import {
  LessonPlan,
  GrammarExercise,
  BookStudy,
  ClassGroup,
  TeacherNote,
} from '../../types';
import { PdfAttachmentStorage } from '../../services/pdfAttachmentStorage';

interface LessonsGrammarViewProps {
  lessonPlans: LessonPlan[];
  teacherNotes: TeacherNote[];
  grammarExercises: GrammarExercise[];
  books: BookStudy[];
  classes: ClassGroup[];
  activeClassId: string;
  onSelectClass: (classId: string) => void;
  onSaveLessonPlan: (plan: LessonPlan) => void;
  onDeleteLessonPlan: (lessonId: string) => void;
  onSaveTeacherNote: (note: TeacherNote) => void;
  onDeleteTeacherNote: (noteId: string) => void;
  onSaveGrammarExercise: (exercise: GrammarExercise) => void;
  onUpdateBookProgress?: (book: BookStudy) => void;
  onExportWorksheetPdf: (lesson: LessonPlan, exercise?: GrammarExercise) => void;
  focusedLessonId?: string;
  focusedNoteId?: string;
  focusToken?: number;
}

function formatBytes(bytes?: number): string {
  if (!bytes || bytes <= 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export const LessonsGrammarView: React.FC<LessonsGrammarViewProps> = ({
  lessonPlans,
  teacherNotes,
  grammarExercises,
  books,
  classes,
  activeClassId,
  onSaveLessonPlan,
  onDeleteLessonPlan,
  onSaveTeacherNote,
  onDeleteTeacherNote,
  onSaveGrammarExercise,
  onUpdateBookProgress,
  onExportWorksheetPdf,
  focusedLessonId,
  focusedNoteId,
  focusToken,
}) => {
  const [activeTab, setActiveTab] = useState<'lessons' | 'notes' | 'grammar' | 'books'>('lessons');
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'done'>('all');
  const [expandedLessonIds, setExpandedLessonIds] = useState<Record<string, boolean>>({});
  const [confirmDeleteKey, setConfirmDeleteKey] = useState<string | null>(null);

  // Create/Edit Lesson Modal State
  const [showLessonModal, setShowLessonModal] = useState(false);
  const [lessonModalMode, setLessonModalMode] = useState<'created' | 'uploaded_pdf'>('created');
  const [editingLessonId, setEditingLessonId] = useState<string | null>(null);
  const [lpTitle, setLpTitle] = useState('');
  const [lpClassId, setLpClassId] = useState(activeClassId || classes[0]?.id || '6A');
  const [lpUnit, setLpUnit] = useState('');
  const [lpDate, setLpDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [lpDuration, setLpDuration] = useState(45);
  const [lpGrammarFocus, setLpGrammarFocus] = useState('');
  const [lpObjectivesText, setLpObjectivesText] = useState('');
  const [lpWarmUp, setLpWarmUp] = useState('');
  const [lpDirect, setLpDirect] = useState('');
  const [lpGuided, setLpGuided] = useState('');
  const [lpExitTicket, setLpExitTicket] = useState('');
  const [lpNotes, setLpNotes] = useState('');
  const [lpCompleted, setLpCompleted] = useState(false);
  const [lpPdfFile, setLpPdfFile] = useState<File | null>(null);
  const [lpExistingAttachment, setLpExistingAttachment] = useState<{
    id: string;
    name: string;
    size?: number;
  } | null>(null);
  const lpFileInputRef = useRef<HTMLInputElement>(null);

  // Create/Edit Teacher Note Modal State
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [noteModalMode, setNoteModalMode] = useState<'created' | 'uploaded_pdf'>('created');
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteClassId, setNoteClassId] = useState<string>('all');
  const [noteCategory, setNoteCategory] = useState<TeacherNote['category']>('lesson_note');
  const [noteContent, setNoteContent] = useState('');
  const [noteDate, setNoteDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [noteCompleted, setNoteCompleted] = useState(false);
  const [notePdfFile, setNotePdfFile] = useState<File | null>(null);
  const [noteExistingAttachment, setNoteExistingAttachment] = useState<{
    id: string;
    name: string;
    size?: number;
  } | null>(null);
  const noteFileInputRef = useRef<HTMLInputElement>(null);

  // PDF Preview Modal State
  const [previewPdf, setPreviewPdf] = useState<{
    title: string;
    fileName: string;
    url: string | null;
    missingLocalBlob: boolean;
  } | null>(null);

  // AI Drafter Modal State
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiTopic, setAiTopic] = useState('');
  const [aiGrade, setAiGrade] = useState<'6' | '7'>('6');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isSavingFile, setIsSavingFile] = useState(false);

  useEffect(() => {
    if (focusedLessonId) {
      setActiveTab('lessons');
      setSelectedClassFilter('all');
      setStatusFilter('all');
      setExpandedLessonIds((prev) => ({ ...prev, [focusedLessonId]: true }));
      const timer = setTimeout(() => {
        document
          .getElementById(`lesson-card-${focusedLessonId}`)
          ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 60);
      return () => clearTimeout(timer);
    }
    if (focusedNoteId) {
      setActiveTab('notes');
      setSelectedClassFilter('all');
      setStatusFilter('all');
      const timer = setTimeout(() => {
        document
          .getElementById(`note-card-${focusedNoteId}`)
          ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 60);
      return () => clearTimeout(timer);
    }
  }, [focusedLessonId, focusedNoteId, focusToken]);

  // Cleanup preview object URL on unmount/change
  useEffect(() => {
    return () => {
      if (previewPdf?.url) {
        URL.revokeObjectURL(previewPdf.url);
      }
    };
  }, [previewPdf?.url]);

  const handleOpenPdfPreview = async (
    title: string,
    attachmentId?: string,
    attachmentName?: string
  ) => {
    if (!attachmentId) return;
    const url = await PdfAttachmentStorage.getPdfObjectUrl(attachmentId);
    setPreviewPdf({
      title,
      fileName: attachmentName || 'document.pdf',
      url,
      missingLocalBlob: !url,
    });
  };

  const handleDownloadPdf = async (attachmentId?: string, attachmentName?: string) => {
    if (!attachmentId) return;
    const url = await PdfAttachmentStorage.getPdfObjectUrl(attachmentId);
    if (!url) {
      setPreviewPdf({
        title: attachmentName || 'PDF Document',
        fileName: attachmentName || 'document.pdf',
        url: null,
        missingLocalBlob: true,
      });
      return;
    }
    const a = document.createElement('a');
    a.href = url;
    a.download = attachmentName || 'lesson-plan.pdf';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  // Open Lesson Modal helpers
  const openNewLessonModal = (mode: 'created' | 'uploaded_pdf') => {
    setEditingLessonId(null);
    setLessonModalMode(mode);
    setLpTitle('');
    setLpClassId(activeClassId || classes[0]?.id || '6A');
    setLpUnit('');
    setLpDate(new Date().toISOString().split('T')[0]);
    setLpDuration(45);
    setLpGrammarFocus('');
    setLpObjectivesText('');
    setLpWarmUp('');
    setLpDirect('');
    setLpGuided('');
    setLpExitTicket('');
    setLpNotes('');
    setLpCompleted(false);
    setLpPdfFile(null);
    setLpExistingAttachment(null);
    setShowLessonModal(true);
  };

  const openEditLessonModal = (plan: LessonPlan) => {
    setEditingLessonId(plan.id);
    setLessonModalMode(plan.sourceType === 'uploaded_pdf' ? 'uploaded_pdf' : 'created');
    setLpTitle(plan.title);
    setLpClassId(plan.classId);
    setLpUnit(plan.unit || '');
    setLpDate(plan.date || new Date().toISOString().split('T')[0]);
    setLpDuration(plan.durationMinutes || 45);
    setLpGrammarFocus(plan.grammarFocus || '');
    setLpObjectivesText((plan.objectives || []).join('\n'));
    setLpWarmUp(plan.warmUp || '');
    setLpDirect(plan.directInstruction || '');
    setLpGuided(plan.guidedPractice || '');
    setLpExitTicket(plan.exitTicket || '');
    setLpNotes(plan.teacherNotes || '');
    setLpCompleted(Boolean(plan.completed));
    setLpPdfFile(null);
    setLpExistingAttachment(
      plan.attachmentId
        ? {
            id: plan.attachmentId,
            name: plan.attachmentName || 'Lesson_Plan.pdf',
            size: plan.attachmentSize,
          }
        : null
    );
    setShowLessonModal(true);
  };

  const handleSaveLessonSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lpTitle.trim() && !lpPdfFile) return;
    setIsSavingFile(true);
    try {
      const targetClass = classes.find((c) => c.id === lpClassId) || classes[0];
      const lessonId = editingLessonId || `lp_${Date.now()}`;

      let attachmentId = lpExistingAttachment?.id;
      let attachmentName = lpExistingAttachment?.name;
      let attachmentSize = lpExistingAttachment?.size;

      if (lpPdfFile) {
        attachmentId = `pdf_lp_${Date.now()}`;
        attachmentName = lpPdfFile.name;
        attachmentSize = lpPdfFile.size;
        await PdfAttachmentStorage.savePdf(attachmentId, lpPdfFile, lpPdfFile.name);
      }

      const objectives = lpObjectivesText
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);

      const finalTitle =
        lpTitle.trim() ||
        (lpPdfFile ? lpPdfFile.name.replace(/\.pdf$/i, '') : 'Custom Lesson Plan');

      const plan: LessonPlan = {
        id: lessonId,
        classId: lpClassId,
        grade: targetClass?.grade || '6',
        title: finalTitle,
        unit: lpUnit.trim() || (lessonModalMode === 'uploaded_pdf' ? 'Uploaded PDF Plan' : 'Custom Unit'),
        date: lpDate,
        durationMinutes: Math.max(5, Math.min(480, Number(lpDuration) || 45)),
        grammarFocus: lpGrammarFocus.trim() || 'Custom Lesson Focus',
        objectives: objectives.length > 0 ? objectives : ['Complete lesson objectives'],
        materials: attachmentName ? [attachmentName] : ['Lesson notes'],
        warmUp: lpWarmUp.trim(),
        directInstruction: lpDirect.trim(),
        guidedPractice: lpGuided.trim(),
        independentPractice: '',
        exitTicket: lpExitTicket.trim(),
        teacherNotes: lpNotes.trim() || undefined,
        completed: lpCompleted,
        sourceType: attachmentId ? 'uploaded_pdf' : 'created',
        attachmentId,
        attachmentName,
        attachmentSize,
      };

      onSaveLessonPlan(plan);
      setShowLessonModal(false);
    } finally {
      setIsSavingFile(false);
    }
  };

  // Open Note Modal helpers
  const openNewNoteModal = (mode: 'created' | 'uploaded_pdf') => {
    setEditingNoteId(null);
    setNoteModalMode(mode);
    setNoteTitle('');
    setNoteClassId('all');
    setNoteCategory(mode === 'uploaded_pdf' ? 'handout_pdf' : 'lesson_note');
    setNoteContent('');
    setNoteDate(new Date().toISOString().split('T')[0]);
    setNoteCompleted(false);
    setNotePdfFile(null);
    setNoteExistingAttachment(null);
    setShowNoteModal(true);
  };

  const openEditNoteModal = (note: TeacherNote) => {
    setEditingNoteId(note.id);
    setNoteModalMode(note.sourceType);
    setNoteTitle(note.title);
    setNoteClassId(note.classId);
    setNoteCategory(note.category);
    setNoteContent(note.content);
    setNoteDate(note.date);
    setNoteCompleted(note.completed);
    setNotePdfFile(null);
    setNoteExistingAttachment(
      note.attachmentId
        ? {
            id: note.attachmentId,
            name: note.attachmentName || 'Attachment.pdf',
            size: note.attachmentSize,
          }
        : null
    );
    setShowNoteModal(true);
  };

  const handleSaveNoteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteTitle.trim() && !notePdfFile) return;
    setIsSavingFile(true);
    try {
      const noteId = editingNoteId || `tn_${Date.now()}`;
      let attachmentId = noteExistingAttachment?.id;
      let attachmentName = noteExistingAttachment?.name;
      let attachmentSize = noteExistingAttachment?.size;

      if (notePdfFile) {
        attachmentId = `pdf_tn_${Date.now()}`;
        attachmentName = notePdfFile.name;
        attachmentSize = notePdfFile.size;
        await PdfAttachmentStorage.savePdf(attachmentId, notePdfFile, notePdfFile.name);
      }

      const finalTitle =
        noteTitle.trim() ||
        (notePdfFile ? notePdfFile.name.replace(/\.pdf$/i, '') : 'Teacher Note');

      const item: TeacherNote = {
        id: noteId,
        title: finalTitle,
        classId: noteClassId || 'all',
        category: noteCategory,
        sourceType: attachmentId ? 'uploaded_pdf' : 'created',
        content: noteContent.trim(),
        attachmentId,
        attachmentName,
        attachmentSize,
        completed: noteCompleted,
        date: noteDate,
      };

      onSaveTeacherNote(item);
      setShowNoteModal(false);
    } finally {
      setIsSavingFile(false);
    }
  };

  // Filters
  const selectedClassObj = classes.find((c) => c.id === selectedClassFilter);

  const filteredLessons = lessonPlans.filter((lp) => {
    if (selectedClassFilter !== 'all') {
      const matchesClass = lp.classId === selectedClassFilter;
      const matchesGrade = selectedClassObj && lp.grade === selectedClassObj.grade && lp.classId === 'all';
      if (!matchesClass && !matchesGrade) return false;
    }
    if (statusFilter === 'done' && !lp.completed) return false;
    if (statusFilter === 'pending' && lp.completed) return false;
    return true;
  });

  const filteredNotes = teacherNotes.filter((n) => {
    if (selectedClassFilter !== 'all' && n.classId !== 'all' && n.classId !== selectedClassFilter) {
      return false;
    }
    if (statusFilter === 'done' && !n.completed) return false;
    if (statusFilter === 'pending' && n.completed) return false;
    return true;
  });

  const filteredGrammar = grammarExercises.filter((g) => {
    if (selectedClassFilter !== 'all' && selectedClassObj && g.grade !== selectedClassObj.grade) {
      return false;
    }
    return true;
  });

  // AI Generation Handler
  const handleGenerateAi = async () => {
    if (!aiTopic.trim()) return;
    setIsAiLoading(true);
    try {
      if (activeTab === 'grammar') {
        const res = await fetch('/api/ai/grammar-exercise', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ grade: Number(aiGrade), topic: aiTopic, questionCount: 4 }),
        });
        const json = await res.json();
        if (json.data) {
          onSaveGrammarExercise({
            id: 'g_' + Date.now(),
            grade: aiGrade,
            title: json.data.title || `${aiTopic} Practice Drill`,
            topic: json.data.topic || aiTopic,
            difficulty: 'intermediate',
            rulesExplanation: json.data.rulesExplanation || `Key rule for ${aiTopic}.`,
            questions: json.data.questions || [],
            assignedClassIds: classes.filter((c) => c.grade === aiGrade).map((c) => c.id),
            createdAt: new Date().toISOString().split('T')[0],
          });
        }
      } else {
        const res = await fetch('/api/ai/lesson-plan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            grade: Number(aiGrade),
            title: aiTopic,
            standardsOrGrammar: 'ELA Standards & Syntax',
          }),
        });
        const json = await res.json();
        if (json.data) {
          const defaultClass = classes.find((c) => c.grade === aiGrade)?.id || activeClassId || '6A';
          onSaveLessonPlan({
            id: 'lp_' + Date.now(),
            classId: defaultClass,
            grade: aiGrade,
            title: json.data.title || aiTopic,
            unit: json.data.unit || 'English Unit',
            date: new Date().toISOString().split('T')[0],
            durationMinutes: 45,
            grammarFocus: json.data.grammarFocus || aiTopic,
            objectives: json.data.objectives || ['Demonstrate proficiency with lesson target.'],
            materials: json.data.materials || ['Notebooks', 'Text excerpts'],
            warmUp: json.data.warmUp || 'Quick bellringer reflection (5 mins)',
            directInstruction: json.data.directInstruction || 'Model key concept (12 mins)',
            guidedPractice: json.data.guidedPractice || 'Partner practice (15 mins)',
            independentPractice: json.data.independentPractice || 'Independent work (10 mins)',
            exitTicket: json.data.exitTicket || 'Submit 2 example sentences.',
            teacherNotes: json.data.teacherNotes,
            completed: false,
            sourceType: 'ai',
          });
        }
      }
      setShowAiModal(false);
      setAiTopic('');
    } catch {
      const defaultClass = classes.find((c) => c.grade === aiGrade)?.id || activeClassId || '6A';
      onSaveLessonPlan({
        id: 'lp_' + Date.now(),
        classId: defaultClass,
        grade: aiGrade,
        title: aiTopic,
        unit: `Grade ${aiGrade} ELA`,
        date: new Date().toISOString().split('T')[0],
        durationMinutes: 45,
        grammarFocus: aiTopic,
        objectives: ['Identify key patterns', 'Apply concept in writing'],
        materials: ['Notebook', 'Handout'],
        warmUp: '5-minute bellringer prompt',
        directInstruction: 'Rule overview & mentor examples',
        guidedPractice: 'Partner sentence analysis',
        independentPractice: 'Independent practice task',
        exitTicket: 'Exit check question',
        completed: false,
        sourceType: 'ai',
      });
      setShowAiModal(false);
      setAiTopic('');
    } finally {
      setIsAiLoading(false);
    }
  };

  const categoryLabels: Record<TeacherNote['category'], string> = {
    lesson_note: 'Lesson Note',
    pacing_plan: 'Pacing Plan',
    handout_pdf: 'PDF Handout',
    reference: 'Reference Guide',
  };

  return (
    <div className="space-y-5 pb-12">
      {/* Page Header with Clear Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Lessons, Plans & Notes
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Create your own lessons and notes, upload existing PDF files, or mark completed lessons done
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {activeTab === 'notes' ? (
            <>
              <button
                type="button"
                onClick={() => openNewNoteModal('created')}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white transition active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>Write Note / Plan</span>
              </button>
              <button
                type="button"
                onClick={() => openNewNoteModal('uploaded_pdf')}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-white transition"
              >
                <FileUp className="w-4 h-4 text-emerald-400" />
                <span>Upload PDF</span>
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => openNewLessonModal('created')}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white transition active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>New Lesson</span>
              </button>
              <button
                type="button"
                onClick={() => openNewLessonModal('uploaded_pdf')}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-white transition"
              >
                <FileUp className="w-4 h-4 text-emerald-400" />
                <span>Upload PDF</span>
              </button>
              <button
                type="button"
                onClick={() => setShowAiModal(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-medium text-purple-300 transition"
              >
                <Sparkles className="w-4 h-4 text-purple-400" />
                <span>AI Draft</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Navigation Tabs & Clean Filters */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 p-2 rounded-2xl bg-slate-900 border border-slate-800">
        <div className="flex items-center gap-1 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('lessons')}
            className={`px-3 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'lessons'
                ? 'bg-blue-600 text-white'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Lesson Plans ({lessonPlans.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('notes')}
            className={`px-3 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'notes'
                ? 'bg-blue-600 text-white'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <StickyNote className="w-3.5 h-3.5" />
            <span>My Notes & PDFs ({teacherNotes.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('grammar')}
            className={`px-3 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'grammar'
                ? 'bg-blue-600 text-white'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <ClipboardList className="w-3.5 h-3.5" />
            <span>Grammar Bank ({grammarExercises.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('books')}
            className={`px-3 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'books'
                ? 'bg-blue-600 text-white'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Bookmark className="w-3.5 h-3.5" />
            <span>Books ({books.length})</span>
          </button>
        </div>

        {/* Filters */}
        {(activeTab === 'lessons' || activeTab === 'notes' || activeTab === 'grammar') && (
          <div className="flex flex-wrap items-center gap-2 px-1">
            {(activeTab === 'lessons' || activeTab === 'notes') && (
              <div className="flex items-center bg-slate-950 rounded-xl p-0.5 border border-slate-800 text-[11px]">
                {(['all', 'pending', 'done'] as const).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setStatusFilter(st)}
                    className={`px-2.5 py-1 rounded-lg font-medium transition ${
                      statusFilter === st
                        ? 'bg-slate-800 text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {st === 'all' ? 'All' : st === 'pending' ? 'To Teach' : 'Already Done'}
                  </button>
                ))}
              </div>
            )}

            <div className="flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={selectedClassFilter}
                onChange={(e) => setSelectedClassFilter(e.target.value)}
                className="text-xs bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-blue-500"
              >
                <option value="all">All Classes</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} (Grade {c.grade})
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* TAB 1: LESSON PLANS */}
      {activeTab === 'lessons' && (
        <div className="space-y-3.5">
          {filteredLessons.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/50 p-10 text-center space-y-3">
              <BookOpen className="w-8 h-8 text-slate-500 mx-auto" />
              <h3 className="text-sm font-semibold text-white">No lesson plans match this filter</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Create your own lesson plan in the app or upload an existing PDF lesson plan.
              </p>
              <div className="flex items-center justify-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => openNewLessonModal('created')}
                  className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white transition"
                >
                  + New Lesson
                </button>
                <button
                  type="button"
                  onClick={() => openNewLessonModal('uploaded_pdf')}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white transition"
                >
                  Upload PDF
                </button>
              </div>
            </div>
          ) : (
            filteredLessons.map((plan) => {
              const cls = classes.find((c) => c.id === plan.classId);
              const isFocused = focusedLessonId === plan.id;
              const isExpanded = Boolean(expandedLessonIds[plan.id]);
              const isPdfPlan = plan.sourceType === 'uploaded_pdf' || Boolean(plan.attachmentId);

              return (
                <div
                  key={plan.id}
                  id={`lesson-card-${plan.id}`}
                  className={`rounded-2xl border bg-slate-900/90 p-4 sm:p-5 transition ${
                    isFocused
                      ? 'border-blue-500 ring-2 ring-blue-500/30'
                      : plan.completed
                      ? 'border-emerald-500/30 bg-slate-900/70'
                      : 'border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {/* Top Row */}
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                          isPdfPlan
                            ? 'bg-emerald-500/15 text-emerald-400'
                            : plan.sourceType === 'ai'
                            ? 'bg-purple-500/15 text-purple-400'
                            : 'bg-blue-500/15 text-blue-400'
                        }`}
                      >
                        {isPdfPlan ? (
                          <FileText className="w-5 h-5" />
                        ) : plan.sourceType === 'ai' ? (
                          <Sparkles className="w-5 h-5" />
                        ) : (
                          <PenLine className="w-5 h-5" />
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-slate-400">
                          <span
                            className="font-semibold"
                            style={{ color: cls?.color || '#60a5fa' }}
                          >
                            {cls?.name || `Grade ${plan.grade}`}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span>{plan.unit || 'Lesson Unit'}</span>
                          <span aria-hidden="true">·</span>
                          <span className="inline-flex items-center gap-1 tabular-nums">
                            <Calendar className="w-3 h-3 text-slate-500" />
                            {plan.date}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span className="inline-flex items-center gap-1 tabular-nums">
                            <Clock className="w-3 h-3 text-slate-500" />
                            {plan.durationMinutes} min
                          </span>
                        </div>

                        <h3 className="text-base font-bold text-white mt-0.5">
                          {plan.title}
                        </h3>

                        {plan.grammarFocus && (
                          <p className="text-xs text-slate-300 mt-1">
                            <span className="text-slate-400">Focus:</span> {plan.grammarFocus}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Right Action Toolbar */}
                    <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() =>
                          onSaveLessonPlan({ ...plan, completed: !plan.completed })
                        }
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${
                          plan.completed
                            ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/25'
                            : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white hover:border-slate-600'
                        }`}
                        title={plan.completed ? 'Marked as already done' : 'Mark as already done'}
                      >
                        {plan.completed ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Circle className="w-3.5 h-3.5 text-slate-400" />
                        )}
                        <span>{plan.completed ? 'Done' : 'Mark Done'}</span>
                      </button>

                      {plan.attachmentId && (
                        <button
                          type="button"
                          onClick={() =>
                            handleOpenPdfPreview(plan.title, plan.attachmentId, plan.attachmentName)
                          }
                          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-medium text-emerald-300 transition"
                          title="Open uploaded PDF"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Open PDF</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => openEditLessonModal(plan)}
                        className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white transition"
                        title="Edit lesson"
                        aria-label="Edit lesson"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => onExportWorksheetPdf(plan)}
                        className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white transition"
                        title="Print PDF worksheet packet"
                        aria-label="Print PDF worksheet packet"
                      >
                        <Printer className="w-3.5 h-3.5" />
                      </button>

                      {confirmDeleteKey === `lp_${plan.id}` ? (
                        <button
                          type="button"
                          onClick={() => {
                            onDeleteLessonPlan(plan.id);
                            if (plan.attachmentId) {
                              PdfAttachmentStorage.deletePdf(plan.attachmentId);
                            }
                            setConfirmDeleteKey(null);
                          }}
                          className="px-2.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-semibold text-white transition"
                        >
                          Confirm
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteKey(`lp_${plan.id}`)}
                          className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-400 hover:text-rose-400 transition"
                          title="Delete lesson"
                          aria-label="Delete lesson"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* PDF Attachment Row if uploaded */}
                  {plan.attachmentId && (
                    <div className="mt-3 px-3 py-2.5 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 min-w-0 text-xs">
                        <FileText className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span className="font-medium text-slate-200 truncate">
                          {plan.attachmentName || 'Lesson_Plan.pdf'}
                        </span>
                        {plan.attachmentSize && (
                          <span className="text-[11px] text-slate-500 tabular-nums shrink-0">
                            ({formatBytes(plan.attachmentSize)})
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          handleDownloadPdf(plan.attachmentId, plan.attachmentName)
                        }
                        className="flex items-center gap-1 text-xs font-medium text-blue-400 hover:text-blue-300 shrink-0"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download</span>
                      </button>
                    </div>
                  )}

                  {/* Teacher Notes preview if present */}
                  {plan.teacherNotes && (
                    <p className="mt-3 text-xs text-slate-300 bg-slate-950/50 px-3 py-2 rounded-xl border border-slate-800/80">
                      <span className="font-semibold text-slate-400">Notes: </span>
                      {plan.teacherNotes}
                    </p>
                  )}

                  {/* Expandable Plan Details */}
                  {(plan.objectives.length > 0 ||
                    plan.warmUp ||
                    plan.directInstruction ||
                    plan.guidedPractice ||
                    plan.exitTicket) && (
                    <div className="mt-3 pt-3 border-t border-slate-800/80">
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedLessonIds((prev) => ({
                            ...prev,
                            [plan.id]: !isExpanded,
                          }))
                        }
                        className="flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-white transition"
                      >
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                        <span>{isExpanded ? 'Hide lesson outline' : 'View lesson outline & steps'}</span>
                      </button>

                      {isExpanded && (
                        <div className="mt-3 space-y-3">
                          {plan.objectives.length > 0 && (
                            <div>
                              <h4 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                                Objectives
                              </h4>
                              <ul className="space-y-1">
                                {plan.objectives.map((obj, i) => (
                                  <li
                                    key={i}
                                    className="text-xs text-slate-300 flex items-start gap-2"
                                  >
                                    <Check className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" />
                                    <span>{obj}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs">
                            {plan.warmUp && (
                              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                                <span className="font-semibold text-amber-400 block mb-1">
                                  1. Warm-Up
                                </span>
                                <p className="text-slate-300 text-[11px] leading-relaxed">
                                  {plan.warmUp}
                                </p>
                              </div>
                            )}
                            {plan.directInstruction && (
                              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                                <span className="font-semibold text-blue-400 block mb-1">
                                  2. Instruction
                                </span>
                                <p className="text-slate-300 text-[11px] leading-relaxed">
                                  {plan.directInstruction}
                                </p>
                              </div>
                            )}
                            {plan.guidedPractice && (
                              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                                <span className="font-semibold text-purple-400 block mb-1">
                                  3. Practice
                                </span>
                                <p className="text-slate-300 text-[11px] leading-relaxed">
                                  {plan.guidedPractice}
                                </p>
                              </div>
                            )}
                            {plan.exitTicket && (
                              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                                <span className="font-semibold text-emerald-400 block mb-1">
                                  4. Exit Ticket
                                </span>
                                <p className="text-slate-300 text-[11px] leading-relaxed">
                                  {plan.exitTicket}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* TAB 2: CUSTOM TEACHER NOTES, PLANS & PDF UPLOADS */}
      {activeTab === 'notes' && (
        <div className="space-y-3.5">
          {filteredNotes.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/50 p-10 text-center space-y-3">
              <StickyNote className="w-8 h-8 text-slate-500 mx-auto" />
              <h3 className="text-sm font-semibold text-white">No personal notes or PDFs yet</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Add your own teaching notes, pacing guides, or upload PDF worksheets and plans—and mark items already done anytime.
              </p>
              <div className="flex items-center justify-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => openNewNoteModal('created')}
                  className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white transition"
                >
                  + Write Note / Plan
                </button>
                <button
                  type="button"
                  onClick={() => openNewNoteModal('uploaded_pdf')}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white transition"
                >
                  Upload PDF
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredNotes.map((note) => {
                const cls = classes.find((c) => c.id === note.classId);
                const isFocused = focusedNoteId === note.id;
                const isPdf = note.sourceType === 'uploaded_pdf' || Boolean(note.attachmentId);

                return (
                  <div
                    key={note.id}
                    id={`note-card-${note.id}`}
                    className={`rounded-2xl border bg-slate-900/90 p-4 sm:p-5 flex flex-col justify-between gap-4 transition ${
                      isFocused
                        ? 'border-blue-500 ring-2 ring-blue-500/30'
                        : note.completed
                        ? 'border-emerald-500/30'
                        : 'border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 min-w-0">
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                              isPdf
                                ? 'bg-emerald-500/15 text-emerald-400'
                                : 'bg-amber-500/15 text-amber-400'
                            }`}
                          >
                            {isPdf ? (
                              <FileText className="w-4 h-4" />
                            ) : (
                              <StickyNote className="w-4 h-4" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-slate-400">
                              <span className="font-medium text-slate-300">
                                {categoryLabels[note.category]}
                              </span>
                              <span aria-hidden="true">·</span>
                              <span>{cls ? cls.name : 'All Classes'}</span>
                              <span aria-hidden="true">·</span>
                              <span className="tabular-nums">{note.date}</span>
                            </div>
                            <h3 className="text-sm font-bold text-white mt-0.5 truncate">
                              {note.title}
                            </h3>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            onSaveTeacherNote({ ...note, completed: !note.completed })
                          }
                          className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-semibold border shrink-0 transition ${
                            note.completed
                              ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                              : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
                          }`}
                        >
                          {note.completed ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Circle className="w-3.5 h-3.5 text-slate-400" />
                          )}
                          <span>{note.completed ? 'Done' : 'Mark Done'}</span>
                        </button>
                      </div>

                      {note.content && (
                        <p className="text-xs text-slate-300 whitespace-pre-wrap leading-relaxed bg-slate-950/50 p-3 rounded-xl border border-slate-800/80">
                          {note.content}
                        </p>
                      )}

                      {note.attachmentId && (
                        <div className="px-3 py-2.5 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0 text-xs">
                            <FileText className="w-4 h-4 text-emerald-400 shrink-0" />
                            <span className="font-medium text-slate-200 truncate">
                              {note.attachmentName || 'Document.pdf'}
                            </span>
                            {note.attachmentSize && (
                              <span className="text-[11px] text-slate-500 tabular-nums shrink-0">
                                {formatBytes(note.attachmentSize)}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() =>
                                handleOpenPdfPreview(note.title, note.attachmentId, note.attachmentName)
                              }
                              className="text-xs font-medium text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>View</span>
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                handleDownloadPdf(note.attachmentId, note.attachmentName)
                              }
                              className="text-xs font-medium text-blue-400 hover:text-blue-300"
                              title="Download PDF"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-end gap-1.5 pt-2 border-t border-slate-800/80">
                      <button
                        type="button"
                        onClick={() => openEditNoteModal(note)}
                        className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 flex items-center gap-1 transition"
                      >
                        <Pencil className="w-3 h-3" />
                        <span>Edit</span>
                      </button>

                      {confirmDeleteKey === `tn_${note.id}` ? (
                        <button
                          type="button"
                          onClick={() => {
                            onDeleteTeacherNote(note.id);
                            if (note.attachmentId) {
                              PdfAttachmentStorage.deletePdf(note.attachmentId);
                            }
                            setConfirmDeleteKey(null);
                          }}
                          className="px-2.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-semibold text-white transition"
                        >
                          Confirm Delete
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteKey(`tn_${note.id}`)}
                          className="p-1.5 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition"
                          title="Delete note"
                          aria-label="Delete note"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: GRAMMAR EXERCISES BANK */}
      {activeTab === 'grammar' && (
        <div className="space-y-4">
          {filteredGrammar.map((ex) => (
            <div
              key={ex.id}
              className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5 space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                <div>
                  <div className="flex items-center gap-2 text-[11px] text-slate-400">
                    <span className="font-semibold text-purple-400">Grade {ex.grade}</span>
                    <span aria-hidden="true">·</span>
                    <span className="capitalize">{ex.difficulty}</span>
                    <span aria-hidden="true">·</span>
                    <span>Assigned: {ex.assignedClassIds.join(', ')}</span>
                  </div>
                  <h3 className="text-base font-bold text-white mt-0.5">{ex.title}</h3>
                  <p className="text-xs text-blue-300 mt-0.5">Topic: {ex.topic}</p>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-200 leading-relaxed">
                <span className="font-semibold text-blue-300 block mb-1">Rule Summary</span>
                {ex.rulesExplanation}
              </div>

              <div className="space-y-2.5">
                {ex.questions.map((q, idx) => (
                  <div
                    key={q.id}
                    className="p-3 rounded-xl bg-slate-950/50 border border-slate-800 text-xs space-y-2"
                  >
                    <p className="font-semibold text-white">
                      {idx + 1}. {q.prompt}
                    </p>
                    {q.options && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {q.options.map((opt, i) => {
                          const isCorrect = opt === q.correctAnswer;
                          return (
                            <div
                              key={i}
                              className={`p-2 rounded-lg border text-[11px] flex items-center justify-between ${
                                isCorrect
                                  ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200 font-semibold'
                                  : 'bg-slate-900 border-slate-800 text-slate-300'
                              }`}
                            >
                              <span>{opt}</span>
                              {isCorrect && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                            </div>
                          );
                        })}
                      </div>
                    )}
                    <p className="text-[11px] text-slate-400">
                      <span className="text-slate-300 font-medium">Answer Key: </span>
                      {q.explanation}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 4: LITERATURE & BOOKS UNIT */}
      {activeTab === 'books' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {books.map((book) => {
            const progressPercent = Math.round((book.currentChapter / book.totalChapters) * 100);
            const cls = classes.find((c) => c.id === book.classId);
            return (
              <div
                key={book.id}
                className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5 space-y-4"
              >
                <div>
                  <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                    <span className="font-semibold text-amber-400">
                      {cls?.name || book.classId} · {book.genre}
                    </span>
                    <span className="tabular-nums">Target: {book.targetCompletionDate}</span>
                  </div>
                  <h3 className="text-base font-bold text-white">{book.title}</h3>
                  <p className="text-xs text-slate-400">By {book.author}</p>
                </div>

                <div>
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="text-slate-300 font-semibold tabular-nums">
                      Chapter {book.currentChapter} of {book.totalChapters}
                    </span>
                    <div className="flex items-center gap-2">
                      {onUpdateBookProgress && (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() =>
                              onUpdateBookProgress({
                                ...book,
                                currentChapter: Math.max(0, book.currentChapter - 1),
                              })
                            }
                            className="w-6 h-6 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200"
                            title="Previous chapter"
                          >
                            -
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              onUpdateBookProgress({
                                ...book,
                                currentChapter: Math.min(book.totalChapters, book.currentChapter + 1),
                              })
                            }
                            className="w-6 h-6 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200"
                            title="Advance 1 chapter"
                          >
                            +
                          </button>
                        </div>
                      )}
                      <span className="text-blue-400 font-bold tabular-nums">
                        {progressPercent}%
                      </span>
                    </div>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-950 overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full transition-all duration-300"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>

                <p className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-300 leading-relaxed">
                  {book.summary}
                </p>

                <div>
                  <h4 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                    Vocabulary
                  </h4>
                  <p className="text-xs text-slate-300">{book.vocabulary.join(' · ')}</p>
                </div>

                <div>
                  <h4 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                    Discussion Prompts
                  </h4>
                  <ul className="space-y-1.5 text-xs text-slate-300">
                    {book.discussionQuestions.map((q, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <Bookmark className="w-3.5 h-3.5 text-amber-400 mt-0.5 shrink-0" />
                        <span>{q}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE / EDIT LESSON PLAN MODAL (WRITE IN APP OR UPLOAD PDF + MARK DONE) */}
      {showLessonModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-sm p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowLessonModal(false);
          }}
        >
          <div className="w-full max-w-2xl rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center">
                  {lessonModalMode === 'uploaded_pdf' ? (
                    <FileUp className="w-4 h-4" />
                  ) : (
                    <PenLine className="w-4 h-4" />
                  )}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    {editingLessonId ? 'Edit Lesson Plan' : 'Add Lesson Plan'}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Write your own lesson in the app or upload an existing PDF file
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowLessonModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveLessonSubmit} className="p-5 overflow-y-auto space-y-4 flex-1">
              {/* Mode Switcher */}
              <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-slate-950 border border-slate-800">
                <button
                  type="button"
                  onClick={() => setLessonModalMode('created')}
                  className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                    lessonModalMode === 'created'
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <PenLine className="w-3.5 h-3.5" />
                  <span>Write in App</span>
                </button>
                <button
                  type="button"
                  onClick={() => setLessonModalMode('uploaded_pdf')}
                  className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                    lessonModalMode === 'uploaded_pdf'
                      ? 'bg-emerald-600 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <FileUp className="w-3.5 h-3.5" />
                  <span>Upload PDF Plan</span>
                </button>
              </div>

              {/* PDF Upload Box */}
              {lessonModalMode === 'uploaded_pdf' && (
                <div className="space-y-2">
                  <input
                    ref={lpFileInputRef}
                    type="file"
                    accept=".pdf,application/pdf"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setLpPdfFile(file);
                        if (!lpTitle.trim()) {
                          setLpTitle(file.name.replace(/\.pdf$/i, ''));
                        }
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => lpFileInputRef.current?.click()}
                    className="w-full p-5 rounded-xl border-2 border-dashed border-slate-700 hover:border-emerald-500/60 bg-slate-950/60 text-center transition space-y-1.5"
                  >
                    <FileUp className="w-6 h-6 text-emerald-400 mx-auto" />
                    <div className="text-xs font-semibold text-white">
                      {lpPdfFile
                        ? `Selected: ${lpPdfFile.name} (${formatBytes(lpPdfFile.size)})`
                        : lpExistingAttachment
                        ? `Current PDF: ${lpExistingAttachment.name} (Click to replace)`
                        : 'Click to choose a PDF lesson plan from your device'}
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Stored locally on your device for instant offline viewing
                    </p>
                  </button>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="sm:col-span-2">
                  <label className="block text-slate-300 font-medium mb-1">Lesson Title</label>
                  <input
                    type="text"
                    required={lessonModalMode === 'created'}
                    value={lpTitle}
                    onChange={(e) => setLpTitle(e.target.value)}
                    placeholder="E.g. Persuasive Writing Workshop"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Class</label>
                  <select
                    value={lpClassId}
                    onChange={(e) => setLpClassId(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-blue-500"
                  >
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} (Grade {c.grade})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Unit / Chapter</label>
                  <input
                    type="text"
                    value={lpUnit}
                    onChange={(e) => setLpUnit(e.target.value)}
                    placeholder="Unit 2: Argument"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Date</label>
                  <input
                    type="date"
                    value={lpDate}
                    onChange={(e) => setLpDate(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Duration (mins)</label>
                  <input
                    type="number"
                    min={5}
                    max={480}
                    value={lpDuration}
                    onChange={(e) => setLpDuration(Number(e.target.value))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="text-xs">
                <label className="block text-slate-300 font-medium mb-1">
                  Topic / Grammar Focus
                </label>
                <input
                  type="text"
                  value={lpGrammarFocus}
                  onChange={(e) => setLpGrammarFocus(e.target.value)}
                  placeholder="E.g. Thesis Statements & Transitions"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              {lessonModalMode === 'created' && (
                <>
                  <div className="text-xs">
                    <label className="block text-slate-300 font-medium mb-1">
                      Learning Objectives (one per line)
                    </label>
                    <textarea
                      rows={2}
                      value={lpObjectivesText}
                      onChange={(e) => setLpObjectivesText(e.target.value)}
                      placeholder="Identify claim vs evidence&#10;Draft a 3-sentence opening paragraph"
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="block text-slate-300 font-medium mb-1">Warm-Up</label>
                      <textarea
                        rows={2}
                        value={lpWarmUp}
                        onChange={(e) => setLpWarmUp(e.target.value)}
                        placeholder="5-min bellringer..."
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-300 font-medium mb-1">
                        Direct Instruction
                      </label>
                      <textarea
                        rows={2}
                        value={lpDirect}
                        onChange={(e) => setLpDirect(e.target.value)}
                        placeholder="Mini-lesson & examples..."
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-300 font-medium mb-1">
                        Guided Practice
                      </label>
                      <textarea
                        rows={2}
                        value={lpGuided}
                        onChange={(e) => setLpGuided(e.target.value)}
                        placeholder="Partner / group activity..."
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-300 font-medium mb-1">Exit Ticket</label>
                      <textarea
                        rows={2}
                        value={lpExitTicket}
                        onChange={(e) => setLpExitTicket(e.target.value)}
                        placeholder="Quick end-of-class check..."
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>
                </>
              )}

              <div className="text-xs">
                <label className="block text-slate-300 font-medium mb-1">Teacher Notes</label>
                <textarea
                  rows={2}
                  value={lpNotes}
                  onChange={(e) => setLpNotes(e.target.value)}
                  placeholder="Optional reminders, pacing notes, or differentiation..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Already Done Toggle */}
              <label className="flex items-center gap-3 p-3 rounded-xl bg-slate-950/60 border border-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={lpCompleted}
                  onChange={(e) => setLpCompleted(e.target.checked)}
                  className="w-4 h-4 rounded accent-emerald-500"
                />
                <div>
                  <div className="text-xs font-semibold text-white">
                    Already Done / Completed
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Check this if you already taught or completed this lesson plan
                  </div>
                </div>
              </label>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowLessonModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={
                    isSavingFile ||
                    (lessonModalMode === 'uploaded_pdf' && !lpPdfFile && !lpExistingAttachment && !lpTitle.trim()) ||
                    (lessonModalMode === 'created' && !lpTitle.trim())
                  }
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-xs font-semibold text-white transition flex items-center gap-1.5"
                >
                  {isSavingFile && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{editingLessonId ? 'Save Changes' : 'Save Lesson Plan'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE / EDIT TEACHER NOTE OR PDF HANDOUT MODAL */}
      {showNoteModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-sm p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowNoteModal(false);
          }}
        >
          <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                  {noteModalMode === 'uploaded_pdf' ? (
                    <FileUp className="w-4 h-4" />
                  ) : (
                    <StickyNote className="w-4 h-4" />
                  )}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    {editingNoteId ? 'Edit Note / Plan' : 'Add Note or Plan'}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Write a note in the app or upload an existing PDF file
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowNoteModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveNoteSubmit} className="p-5 overflow-y-auto space-y-4 flex-1">
              <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-slate-950 border border-slate-800">
                <button
                  type="button"
                  onClick={() => setNoteModalMode('created')}
                  className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                    noteModalMode === 'created'
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <PenLine className="w-3.5 h-3.5" />
                  <span>Write Note</span>
                </button>
                <button
                  type="button"
                  onClick={() => setNoteModalMode('uploaded_pdf')}
                  className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                    noteModalMode === 'uploaded_pdf'
                      ? 'bg-emerald-600 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <FileUp className="w-3.5 h-3.5" />
                  <span>Upload PDF</span>
                </button>
              </div>

              {noteModalMode === 'uploaded_pdf' && (
                <div>
                  <input
                    ref={noteFileInputRef}
                    type="file"
                    accept=".pdf,application/pdf"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setNotePdfFile(file);
                        if (!noteTitle.trim()) {
                          setNoteTitle(file.name.replace(/\.pdf$/i, ''));
                        }
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => noteFileInputRef.current?.click()}
                    className="w-full p-4 rounded-xl border-2 border-dashed border-slate-700 hover:border-emerald-500/60 bg-slate-950/60 text-center transition space-y-1"
                  >
                    <FileUp className="w-6 h-6 text-emerald-400 mx-auto" />
                    <div className="text-xs font-semibold text-white">
                      {notePdfFile
                        ? `Selected: ${notePdfFile.name} (${formatBytes(notePdfFile.size)})`
                        : noteExistingAttachment
                        ? `Current PDF: ${noteExistingAttachment.name} (Click to replace)`
                        : 'Click to upload a PDF note, worksheet, or pacing plan'}
                    </div>
                  </button>
                </div>
              )}

              <div className="text-xs">
                <label className="block text-slate-300 font-medium mb-1">Title</label>
                <input
                  type="text"
                  required={noteModalMode === 'created'}
                  value={noteTitle}
                  onChange={(e) => setNoteTitle(e.target.value)}
                  placeholder="E.g. Week 4 Grammar Pacing Notes"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Type</label>
                  <select
                    value={noteCategory}
                    onChange={(e) => setNoteCategory(e.target.value as TeacherNote['category'])}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none"
                  >
                    <option value="lesson_note">Lesson Note</option>
                    <option value="pacing_plan">Pacing Plan</option>
                    <option value="handout_pdf">PDF Handout</option>
                    <option value="reference">Reference</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Class</label>
                  <select
                    value={noteClassId}
                    onChange={(e) => setNoteClassId(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none"
                  >
                    <option value="all">All Classes</option>
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Date</label>
                  <input
                    type="date"
                    value={noteDate}
                    onChange={(e) => setNoteDate(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="text-xs">
                <label className="block text-slate-300 font-medium mb-1">
                  {noteModalMode === 'uploaded_pdf' ? 'Notes / Summary (Optional)' : 'Note Content'}
                </label>
                <textarea
                  rows={5}
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  placeholder="Write your lesson notes, key reminders, or plan outline..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <label className="flex items-center gap-3 p-3 rounded-xl bg-slate-950/60 border border-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={noteCompleted}
                  onChange={(e) => setNoteCompleted(e.target.checked)}
                  className="w-4 h-4 rounded accent-emerald-500"
                />
                <div>
                  <div className="text-xs font-semibold text-white">Already Done</div>
                  <div className="text-[11px] text-slate-400">
                    Mark this note or plan as already completed
                  </div>
                </div>
              </label>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowNoteModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={
                    isSavingFile ||
                    (noteModalMode === 'uploaded_pdf' && !notePdfFile && !noteExistingAttachment && !noteTitle.trim()) ||
                    (noteModalMode === 'created' && !noteTitle.trim())
                  }
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-xs font-semibold text-white transition flex items-center gap-1.5"
                >
                  {isSavingFile && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{editingNoteId ? 'Save Changes' : 'Save Note'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* INLINE PDF VIEWER MODAL */}
      {previewPdf && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setPreviewPdf(null);
          }}
        >
          <div className="w-full max-w-4xl rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
            <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="w-4 h-4 text-emerald-400 shrink-0" />
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-white truncate">{previewPdf.title}</h3>
                  <p className="text-[11px] text-slate-400 truncate">{previewPdf.fileName}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {previewPdf.url && (
                  <a
                    href={previewPdf.url}
                    download={previewPdf.fileName}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white transition"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download</span>
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => setPreviewPdf(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-4 flex-1 bg-slate-950 overflow-auto">
              {previewPdf.url ? (
                <iframe
                  src={previewPdf.url}
                  title={previewPdf.fileName}
                  className="w-full h-[70vh] rounded-xl border border-slate-800 bg-white"
                />
              ) : (
                <div className="py-16 text-center space-y-2 text-xs text-slate-400">
                  <FileText className="w-8 h-8 text-slate-500 mx-auto" />
                  <p className="text-sm font-semibold text-white">PDF file not found on this device</p>
                  <p className="max-w-md mx-auto">
                    Uploaded PDF files are saved in this browser&apos;s local storage to keep sync fast. Re-upload the PDF via Edit if you switched devices.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* AI Curriculum Drafter Modal */}
      {showAiModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowAiModal(false);
          }}
        >
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-700 p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Bot className="w-5 h-5 text-purple-400" />
                <h3 className="text-sm font-bold text-white">
                  {activeTab === 'grammar' ? 'AI Grammar Drill Generator' : 'AI Lesson Plan Drafter'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAiModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Target Grade Level
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAiGrade('6')}
                    className={`py-2 rounded-xl text-xs font-bold transition border ${
                      aiGrade === '6'
                        ? 'bg-emerald-600 border-emerald-500 text-white'
                        : 'bg-slate-800 border-slate-700 text-slate-300'
                    }`}
                  >
                    Grade 6
                  </button>
                  <button
                    type="button"
                    onClick={() => setAiGrade('7')}
                    className={`py-2 rounded-xl text-xs font-bold transition border ${
                      aiGrade === '7'
                        ? 'bg-violet-600 border-violet-500 text-white'
                        : 'bg-slate-800 border-slate-700 text-slate-300'
                    }`}
                  >
                    Grade 7
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  {activeTab === 'grammar' ? 'Grammar Focus' : 'Lesson Topic'}
                </label>
                <input
                  type="text"
                  placeholder={
                    activeTab === 'grammar'
                      ? 'E.g. Semicolons vs Colons, Relative Pronouns'
                      : 'E.g. Analyzing Suspense in The Tell-Tale Heart'
                  }
                  value={aiTopic}
                  onChange={(e) => setAiTopic(e.target.value)}
                  className="w-full text-xs bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white placeholder:text-slate-500 focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowAiModal(false)}
                className="px-3.5 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleGenerateAi}
                disabled={!aiTopic.trim() || isAiLoading}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-xs font-semibold text-white transition"
              >
                {isAiLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Drafting...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Generate & Add</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
