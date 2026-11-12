import React, { useEffect, useState } from 'react';
import {
  X,
  Plus,
  GraduationCap,
  Calendar,
  Check,
  Pencil,
  Trash2,
  ArrowLeft,
} from 'lucide-react';
import { ClassGroup } from '../../types';

interface ClassManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  classes: ClassGroup[];
  academicYears: string[];
  activeAcademicYear: string;
  initialMode?: 'list' | 'create' | { editId: string };
  onSaveClass: (cls: ClassGroup) => void;
  onDeleteClass: (classId: string) => void;
  onAddAcademicYear: (year: string) => void;
  onSelectAcademicYear: (year: string) => void;
}

const PRESET_COLORS = [
  '#10b981', // Emerald
  '#06b6d4', // Cyan
  '#8b5cf6', // Violet
  '#f59e0b', // Amber
  '#f43f5e', // Rose
  '#3b82f6', // Blue
  '#14b8a6', // Teal
  '#ec4899', // Pink
];

export const ClassManagerModal: React.FC<ClassManagerModalProps> = ({
  isOpen,
  onClose,
  classes,
  academicYears,
  activeAcademicYear,
  initialMode = 'list',
  onSaveClass,
  onDeleteClass,
  onAddAcademicYear,
  onSelectAcademicYear,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Form state
  const [className, setClassName] = useState('Class 6C');
  const [grade, setGrade] = useState('6');
  const [section, setSection] = useState('C');
  const [subject, setSubject] = useState('English Language Arts 6');
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [roomNumber, setRoomNumber] = useState('Room 205');
  const [schedulePeriod, setSchedulePeriod] = useState('Period 3 (10:20 - 11:05 AM)');

  // New academic year input
  const [newYearInput, setNewYearInput] = useState('');

  const handleOpenCreate = () => {
    setSelectedClassId(null);
    setConfirmDeleteId(null);
    setClassName('Class 8A');
    setGrade('8');
    setSection('A');
    setSubject('English Language Arts 8');
    setColor(PRESET_COLORS[4]);
    setRoomNumber('Room 208');
    setSchedulePeriod('Period 6 (01:45 - 02:30 PM)');
    setIsEditing(true);
  };

  const handleOpenEdit = (cls: ClassGroup) => {
    setSelectedClassId(cls.id);
    setConfirmDeleteId(null);
    setClassName(cls.name);
    setGrade(cls.grade);
    setSection(cls.section);
    setSubject(cls.subject);
    setColor(cls.color);
    setRoomNumber(cls.roomNumber || '');
    setSchedulePeriod(cls.schedulePeriod || '');
    setIsEditing(true);
  };

  useEffect(() => {
    if (!isOpen) return;
    setConfirmDeleteId(null);
    if (initialMode === 'create') {
      handleOpenCreate();
    } else if (typeof initialMode === 'object' && initialMode.editId) {
      const target = classes.find((c) => c.id === initialMode.editId);
      if (target) {
        handleOpenEdit(target);
      } else {
        setIsEditing(false);
      }
    } else {
      setIsEditing(false);
    }
  }, [isOpen, initialMode]);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanSection = section.trim().toUpperCase() || 'A';
    const cleanGrade = grade.trim() || '6';
    const id = selectedClassId || `${cleanGrade}${cleanSection}`;
    const newCls: ClassGroup = {
      id,
      name: className.trim() || `Class ${id}`,
      grade: cleanGrade,
      section: cleanSection,
      subject: subject.trim() || 'English Language Arts',
      academicYear: activeAcademicYear,
      color,
      roomNumber: roomNumber.trim(),
      schedulePeriod: schedulePeriod.trim(),
      studentIds: selectedClassId
        ? classes.find((c) => c.id === selectedClassId)?.studentIds || []
        : [],
    };
    onSaveClass(newCls);
    setIsEditing(false);
    if (initialMode === 'create') {
      onClose();
    }
  };

  const handleAddYear = () => {
    if (!newYearInput.trim()) return;
    onAddAcademicYear(newYearInput.trim());
    setNewYearInput('');
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-xl rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {isEditing && initialMode === 'list' && (
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                aria-label="Back to class list"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <div className="w-8 h-8 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center">
              <GraduationCap className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">
                {isEditing
                  ? selectedClassId
                    ? `Edit Class ${selectedClassId}`
                    : 'Add New Class'
                  : 'Manage Classes & Academic Year'}
              </h3>
              <p className="text-[11px] text-slate-400">
                {isEditing
                  ? 'Configure grade, section, room, and schedule period'
                  : `${classes.length} classes configured · ${activeAcademicYear}`}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-5 flex-1">
          {!isEditing ? (
            <>
              {/* Classes List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold text-slate-300">
                    Your Classes ({classes.length})
                  </h4>
                  <button
                    type="button"
                    onClick={handleOpenCreate}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white transition active:scale-95"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Class</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {classes.map((cls) => (
                    <div
                      key={cls.id}
                      className="p-3 rounded-xl bg-slate-800/70 border border-slate-700/80 flex items-center justify-between gap-3 hover:border-slate-600 transition"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span
                          className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs text-white shrink-0"
                          style={{ backgroundColor: cls.color || '#3b82f6' }}
                        >
                          {cls.id}
                        </span>
                        <div className="min-w-0">
                          <h5 className="text-xs font-bold text-white truncate">
                            {cls.name}
                          </h5>
                          <p className="text-[11px] text-slate-400 truncate">
                            {cls.subject}
                            {cls.schedulePeriod ? ` · ${cls.schedulePeriod}` : ''}
                            {cls.roomNumber ? ` · ${cls.roomNumber}` : ''}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(cls)}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-700/80 hover:bg-slate-700 text-xs font-medium text-slate-200 transition flex items-center gap-1"
                        >
                          <Pencil className="w-3 h-3" />
                          <span>Edit</span>
                        </button>
                        {classes.length > 1 && (
                          confirmDeleteId === cls.id ? (
                            <button
                              type="button"
                              onClick={() => {
                                onDeleteClass(cls.id);
                                setConfirmDeleteId(null);
                              }}
                              className="px-2.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-xs font-semibold text-white transition"
                            >
                              Confirm
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(cls.id)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-700/60 transition"
                              title="Remove class"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Academic Year Control */}
              <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/80 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-white flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-blue-400" />
                    Academic Year
                  </span>
                  <select
                    value={activeAcademicYear}
                    onChange={(e) => onSelectAcademicYear(e.target.value)}
                    className="text-xs bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 font-semibold focus:outline-none focus:border-blue-500"
                  >
                    {academicYears.map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-slate-700/60">
                  <input
                    type="text"
                    placeholder="Add academic year (e.g. 2027-2028)"
                    value={newYearInput}
                    onChange={(e) => setNewYearInput(e.target.value)}
                    className="flex-1 text-xs bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddYear}
                    disabled={!newYearInput.trim()}
                    className="px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 disabled:opacity-40 text-xs font-semibold text-white transition"
                  >
                    Add Year
                  </button>
                </div>
              </div>
            </>
          ) : (
            /* Class Edit / Add Form */
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Grade Level</label>
                  <input
                    type="text"
                    required
                    value={grade}
                    onChange={(e) => {
                      const val = e.target.value;
                      setGrade(val);
                      if (!selectedClassId) {
                        setClassName(`Class ${val}${section.toUpperCase()}`);
                      }
                    }}
                    placeholder="6, 7, 8..."
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Section</label>
                  <input
                    type="text"
                    required
                    value={section}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSection(val);
                      if (!selectedClassId) {
                        setClassName(`Class ${grade}${val.toUpperCase()}`);
                      }
                    }}
                    placeholder="A, B, C..."
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="text-xs">
                <label className="block text-slate-300 font-medium mb-1">Class Display Title</label>
                <input
                  type="text"
                  required
                  value={className}
                  onChange={(e) => setClassName(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="text-xs">
                <label className="block text-slate-300 font-medium mb-1">Subject / Curriculum</label>
                <input
                  type="text"
                  required
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Schedule Period</label>
                  <input
                    type="text"
                    value={schedulePeriod}
                    onChange={(e) => setSchedulePeriod(e.target.value)}
                    placeholder="Period 1 (08:30 - 09:15 AM)"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Room Number</label>
                  <input
                    type="text"
                    value={roomNumber}
                    onChange={(e) => setRoomNumber(e.target.value)}
                    placeholder="Room 204"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Color Picker */}
              <div className="text-xs">
                <label className="block text-slate-300 font-medium mb-2">Class Accent Color</label>
                <div className="flex items-center gap-2.5">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      className="w-7 h-7 rounded-full flex items-center justify-center transition hover:scale-110 active:scale-95"
                      style={{ backgroundColor: c }}
                      aria-label={`Select color ${c}`}
                    >
                      {color === c && <Check className="w-4 h-4 text-white" />}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-800">
                <div>
                  {selectedClassId && classes.length > 1 && (
                    confirmDeleteId === selectedClassId ? (
                      <button
                        type="button"
                        onClick={() => {
                          onDeleteClass(selectedClassId);
                          setIsEditing(false);
                          onClose();
                        }}
                        className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-semibold text-white transition"
                      >
                        Confirm Delete Class
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(selectedClassId)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-rose-400 hover:bg-rose-950/40 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete Class</span>
                      </button>
                    )
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (initialMode !== 'list') {
                        onClose();
                      } else {
                        setIsEditing(false);
                      }
                    }}
                    className="px-3.5 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white transition"
                  >
                    {selectedClassId ? 'Save Changes' : 'Create Class'}
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        {!isEditing && (
          <div className="px-5 py-3 bg-slate-950 border-t border-slate-800 flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white transition"
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
