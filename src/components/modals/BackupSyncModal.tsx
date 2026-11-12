import React, { useState } from 'react';
import {
  X,
  Download,
  Upload,
  Cloud,
  ShieldCheck,
  Check,
  RefreshCw,
  Copy,
  Smartphone,
  LogIn,
} from 'lucide-react';
import { AppDatabase } from '../../types';
import { StorageService } from '../../services/storage';
import { useAuth } from '../../context/AuthContext';
import { FirestoreService } from '../../services/firestoreService';

interface BackupSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  database: AppDatabase;
  onRestoreDatabase: (db: AppDatabase) => void;
  isOnline: boolean;
}

export const BackupSyncModal: React.FC<BackupSyncModalProps> = ({
  isOpen,
  onClose,
  database,
  onRestoreDatabase,
  isOnline,
}) => {
  const { user, signInWithGoogle, isSigningIn } = useAuth();
  const [syncKey, setSyncKey] = useState(database.settings.cloudSyncKey || 'teacher_vault_main');
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleExportJson = () => {
    StorageService.exportJsonBackup(database);
  };

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const imported = await StorageService.importJsonBackup(file);
      onRestoreDatabase(imported);
      setSyncStatus('Backup restored and synced!');
      onClose();
    } catch (err: any) {
      setSyncStatus(`Import error: ${err.message || 'Corrupted file'}`);
    }
  };

  const handleSyncFirestoreNow = async () => {
    if (!user) return;
    setIsSyncing(true);
    setSyncStatus(null);
    try {
      await FirestoreService.syncFullDatabaseToFirestore(user, database);
      setSyncStatus(`Synced all classes, rosters, grades, and lessons to your Google account at ${new Date().toLocaleTimeString()}.`);
    } catch (err: any) {
      setSyncStatus(`Cloud sync error: ${err?.message || 'Unable to reach Firestore'}`);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Cloud className="w-5 h-5 text-blue-400" />
            <h3 className="text-base font-bold text-white">
              Backup, Multi-Device Sync & Privacy
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-5 text-xs">
          {/* Security & Offline Banner */}
          <div className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-white">
                Offline-First Architecture & Zero-Knowledge Privacy
              </h4>
              <p className="text-slate-400 mt-0.5 leading-relaxed">
                All records, student grades, attendance, and lesson plans are saved locally for instant offline access and synced in real time to your private Firestore workspace when signed in with Google. Confidential notes remain encrypted with AES-GCM 256.
              </p>
            </div>
          </div>

          {/* Section 1: Google Account & Cloud Firestore Sync */}
          <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700 space-y-3">
            <h4 className="font-bold text-white text-xs uppercase tracking-wider flex items-center gap-1.5">
              <Smartphone className="w-4 h-4 text-purple-400" />
              Google Account Cloud Persistence
            </h4>

            {user ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/30">
                  <div className="flex items-center gap-2.5 min-w-0">
                    {user.photoURL ? (
                      <img
                        src={user.photoURL}
                        alt={user.displayName || 'Teacher'}
                        className="w-8 h-8 rounded-full border border-emerald-500/40 shrink-0"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-emerald-600/30 flex items-center justify-center text-emerald-300 font-bold shrink-0">
                        {(user.displayName || user.email || 'T').charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="font-bold text-white truncate">
                        {user.displayName || 'Authenticated Teacher'}
                      </p>
                      <p className="text-[11px] text-emerald-300 truncate">
                        {user.email} · {isOnline ? 'Real-time Cloud Sync Active' : 'Offline Mode'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={handleSyncFirestoreNow}
                    disabled={isSyncing || !isOnline}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-xs font-bold text-white transition active:scale-95 shadow-sm"
                  >
                    <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                    <span>{isSyncing ? 'Syncing Workspace...' : 'Force Full Cloud Sync Now'}</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-slate-400">
                  Sign in with your Google account to automatically persist and synchronize your classes (6A, 6B, 7A, 7B), student progress, and encrypted notes across your phone, tablet, and desktop.
                </p>
                <button
                  onClick={() => signInWithGoogle()}
                  disabled={isSigningIn}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-xs font-bold text-white transition active:scale-95 shadow-sm"
                >
                  <LogIn className="w-4 h-4" />
                  <span>{isSigningIn ? 'Signing in...' : 'Sign in with Google'}</span>
                </button>
              </div>
            )}

            <div className="pt-2 border-t border-slate-700/60 space-y-1.5">
              <label className="block text-slate-400 font-semibold">
                Reference Sync Identifier:
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={user ? user.uid : syncKey}
                  readOnly={Boolean(user)}
                  onChange={(e) => setSyncKey(e.target.value)}
                  className="flex-1 font-mono text-[11px] bg-slate-950 border border-slate-700 rounded-xl p-2 text-blue-300 focus:outline-none"
                />
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(user ? user.uid : syncKey);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 transition"
                  title="Copy identifier"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {syncStatus && (
              <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 text-xs">
                {syncStatus}
              </div>
            )}
          </div>

          {/* Section 2: Offline File Backup & Restore */}
          <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700 space-y-3">
            <h4 className="font-bold text-white text-xs uppercase tracking-wider flex items-center gap-1.5">
              <Download className="w-4 h-4 text-blue-400" />
              Portable File Backup & Restore
            </h4>
            <p className="text-slate-400">
              Download your full database as a portable JSON backup file, or restore a previously exported archive into your workspace.
            </p>

            <div className="flex flex-wrap gap-2 pt-1">
              <button
                onClick={handleExportJson}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white transition active:scale-95 shadow-sm"
              >
                <Download className="w-4 h-4" />
                <span>Export Backup File (.json)</span>
              </button>

              <label className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 border border-slate-600 text-xs font-semibold text-slate-200 transition cursor-pointer">
                <Upload className="w-4 h-4 text-slate-300" />
                <span>Import / Restore File</span>
                <input
                  type="file"
                  accept=".json,.vault"
                  onChange={handleFileImport}
                  className="hidden"
                />
              </label>
            </div>
          </div>
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
