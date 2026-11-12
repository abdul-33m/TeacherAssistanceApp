import React, { useState } from 'react';
import { X, Sparkles, Plus, Minus, UserCheck, Flame } from 'lucide-react';
import { ClassGroup, Student } from '../../types';

interface QuickParticipationModalProps {
  isOpen: boolean;
  onClose: () => void;
  classGroup: ClassGroup;
  students: Student[];
  currentScores: Record<string, number>;
  onLogParticipation: (studentId: string, delta: number, reason: string) => void;
}

const PRESET_REASONS = [
  'Volunteered reading text aloud',
  'Thoughtful literary analysis',
  'Correct grammar answer',
  'Active group discussion',
  'Assisted classmate with prompt',
  'Off-task / distracted',
];

export const QuickParticipationModal: React.FC<QuickParticipationModalProps> = ({
  isOpen,
  onClose,
  classGroup,
  students,
  currentScores,
  onLogParticipation,
}) => {
  const [selectedReason, setSelectedReason] = useState(PRESET_REASONS[0]);
  const [customReason, setCustomReason] = useState('');

  if (!isOpen) return null;

  const handleScore = (studentId: string, delta: number) => {
    const reason = customReason.trim() || selectedReason;
    onLogParticipation(studentId, delta, reason);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: classGroup.color || '#3b82f6' }}
            />
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                Live Class Participation Clicker
              </h3>
              <p className="text-xs text-slate-400">
                {classGroup.name} · {classGroup.subject}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Reason Tag Selector */}
        <div className="p-4 bg-slate-950/40 border-b border-slate-800">
          <label className="block text-xs font-semibold text-slate-300 mb-2">
            Select Recognition or Observation Note:
          </label>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {PRESET_REASONS.map((r, i) => (
              <button
                key={i}
                onClick={() => {
                  setSelectedReason(r);
                  setCustomReason('');
                }}
                className={`text-xs px-2.5 py-1 rounded-lg border transition ${
                  selectedReason === r && !customReason
                    ? 'bg-blue-600 border-blue-500 text-white font-medium shadow-sm'
                    : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-600'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
          <input
            type="text"
            placeholder="Or type a custom note..."
            value={customReason}
            onChange={(e) => setCustomReason(e.target.value)}
            className="w-full text-xs bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* Students Roster Grid */}
        <div className="p-4 overflow-y-auto space-y-2 flex-1">
          {students.map((student) => {
            const score = currentScores[student.id] || 0;
            return (
              <div
                key={student.id}
                className="flex items-center justify-between p-2.5 rounded-xl bg-slate-800/70 border border-slate-700/60 hover:border-slate-600 transition"
              >
                <div className="flex items-center gap-2.5 min-w-0 pr-2">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs text-white shrink-0"
                    style={{ backgroundColor: student.avatarColor || '#475569' }}
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

                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 text-xs font-bold text-slate-200">
                    <Flame className={`w-3.5 h-3.5 ${score > 0 ? 'text-amber-400' : 'text-slate-500'}`} />
                    <span>{score} pts</span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleScore(student.id, -1)}
                      className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-rose-900/60 border border-slate-700 hover:border-rose-500 text-slate-300 hover:text-rose-200 flex items-center justify-center transition active:scale-95"
                      title="-1 point"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleScore(student.id, 1)}
                      className="w-7 h-7 rounded-lg bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center font-bold text-xs transition active:scale-95"
                      title="+1 point"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleScore(student.id, 2)}
                      className="w-7 h-7 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center font-bold text-xs transition active:scale-95"
                      title="+2 points (Outstanding)"
                    >
                      +2
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-950 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
