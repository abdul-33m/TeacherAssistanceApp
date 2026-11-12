import React, { useState } from 'react';
import { X, Lock, Unlock, ShieldCheck, Key, AlertTriangle } from 'lucide-react';
import { CryptoVault } from '../../services/crypto';

interface EncryptedVaultModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVaultStatusChange: (isUnlocked: boolean) => void;
}

export const EncryptedVaultModal: React.FC<EncryptedVaultModalProps> = ({
  isOpen,
  onClose,
  onVaultStatusChange,
}) => {
  const [passphrase, setPassphrase] = useState('');
  const [confirmPassphrase, setConfirmPassphrase] = useState('');
  const [isUnlocked, setIsUnlocked] = useState(CryptoVault.isUnlocked());
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  if (!isOpen) return null;

  const handleUnlock = async () => {
    setError('');
    setSuccess('');
    if (!passphrase) {
      setError('Enter your master passphrase.');
      return;
    }

    const salt = localStorage.getItem('gradecraft_vault_salt') || CryptoVault.generateSalt();
    localStorage.setItem('gradecraft_vault_salt', salt);

    const ok = await CryptoVault.unlock(passphrase, salt);
    if (ok) {
      setIsUnlocked(true);
      onVaultStatusChange(true);
      setSuccess('Vault unlocked for this active session!');
      setPassphrase('');
    } else {
      setError('Decryption failed. Please check passphrase.');
    }
  };

  const handleLock = () => {
    CryptoVault.lock();
    setIsUnlocked(false);
    onVaultStatusChange(false);
    setSuccess('Vault locked. Private notes in storage cannot be read.');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl p-5 overflow-hidden space-y-4 text-xs">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <h3 className="text-base font-bold text-white">
              End-to-End Encryption Vault
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Info Box */}
        <div className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700 leading-relaxed text-slate-300 space-y-1.5">
          <p className="font-semibold text-white flex items-center gap-1.5">
            <Lock className="w-4 h-4 text-amber-400" />
            Zero-Knowledge AES-GCM 256
          </p>
          <p className="text-[11px] text-slate-400">
            Confidential teacher notes, behavioral records, and IEP accommodation summaries are encrypted directly on your device using a PBKDF2 100,000-round derived key. Without your passphrase, raw text never leaves the cryptographic boundary.
          </p>
        </div>

        {/* Current Vault Status */}
        <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800">
          <span className="text-slate-300 font-semibold">Current Session Status:</span>
          {isUnlocked ? (
            <span className="flex items-center gap-1 text-emerald-400 font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
              <Unlock className="w-3.5 h-3.5" />
              Unlocked
            </span>
          ) : (
            <span className="flex items-center gap-1 text-amber-400 font-bold px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20">
              <Lock className="w-3.5 h-3.5" />
              Locked
            </span>
          )}
        </div>

        {/* Form Controls */}
        {!isUnlocked ? (
          <div className="space-y-3">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Enter Master Passphrase to Unlock:
              </label>
              <input
                type="password"
                placeholder="Master Passphrase"
                value={passphrase}
                onChange={(e) => setPassphrase(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            <button
              onClick={handleUnlock}
              className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 font-bold text-white transition active:scale-95 shadow-sm"
            >
              Unlock Vault
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-slate-300">
              Your cryptographic key is active in session memory. When you step away from your desk or phone, lock the vault.
            </p>
            <button
              onClick={handleLock}
              className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 font-bold text-white transition active:scale-95 shadow-sm flex items-center justify-center gap-2"
            >
              <Lock className="w-4 h-4" />
              <span>Lock Vault Now</span>
            </button>
          </div>
        )}

        {error && <p className="text-rose-400 text-[11px]">{error}</p>}
        {success && <p className="text-emerald-400 text-[11px]">{success}</p>}

        <div className="pt-2 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 font-semibold text-white transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
