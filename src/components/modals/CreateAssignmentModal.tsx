import React, { useState } from 'react';
import { X, Plus, Calendar, FileText, Award } from 'lucide-react';
import { Assignment, AssignmentCategory, ClassGroup } from '../../types';

interface CreateAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  classes: ClassGroup[];
  activeClassId: string;
  onSaveAssignment: (asg: Assignment) => void;
}

export const CreateAssignmentModal: React.FC<CreateAssignmentModalProps> = ({
  isOpen,
  onClose,
  classes,
  activeClassId,
  onSaveAssignment,
}) => {
  const [classId, setClassId] = useState(activeClassId || '6A');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<AssignmentCategory>('Homework');
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    return d.toISOString().split('T')[0];
  });
  const [maxPoints, setMaxPoints] = useState(25);
  const [weight, setWeight] = useState(1);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const newAssignment: Assignment = {
      id: 'asg_' + Date.now(),
      classId,
      title: title.trim(),
      description: description.trim(),
      category,
      dueDate,
      maxPoints: Number(maxPoints) || 10,
      weight: Number(weight) || 1,
      status: 'assigned',
      createdAt: new Date().toISOString().split('T')[0],
    };

    onSaveAssignment(newAssignment);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-400" />
            <h3 className="text-base font-bold text-white">
              Create New Assignment / Task
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          {/* Target Class */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Target Class or Grade Group:
            </label>
            <select
              value={classId}
              onChange={(e) => setClassId(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white font-semibold focus:outline-none focus:border-blue-500"
            >
              <optgroup label="Individual Classes">
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.subject})
                  </option>
                ))}
              </optgroup>
              <optgroup label="Entire Grades">
                <option value="all-6">All Grade 6 (6A & 6B)</option>
                <option value="all-7">All Grade 7 (7A & 7B)</option>
                <option value="all">All Classes (6A, 6B, 7A, 7B)</option>
              </optgroup>
            </select>
          </div>

          {/* Title */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Title:
            </label>
            <input
              type="text"
              required
              placeholder="E.g. The Giver Vocabulary & Symbolism Quiz"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Category & Due Date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Category:
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-blue-500"
              >
                <option value="Homework">Homework</option>
                <option value="Grammar Exercise">Grammar Exercise</option>
                <option value="Essay & Writing">Essay & Writing</option>
                <option value="Quiz">Quiz</option>
                <option value="Exam">Exam</option>
                <option value="Reading Log">Reading Log</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Due Date:
              </label>
              <input
                type="date"
                required
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Max Points & Weight */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Max Points:
              </label>
              <input
                type="number"
                min="1"
                max="500"
                value={maxPoints}
                onChange={(e) => setMaxPoints(Number(e.target.value))}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Gradebook Weight:
              </label>
              <select
                value={weight}
                onChange={(e) => setWeight(Number(e.target.value))}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-blue-500"
              >
                <option value="0.5">0.5x (Practice / Formative)</option>
                <option value="1">1.0x (Standard)</option>
                <option value="1.5">1.5x (Major Assignment)</option>
                <option value="2">2.0x (Unit Exam / Term Essay)</option>
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Instructions & Rubric Notes:
            </label>
            <textarea
              rows={3}
              placeholder="Describe instructions, grammar requirements, or chapter focus..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white transition active:scale-95 shadow-sm"
            >
              Create Assignment
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
