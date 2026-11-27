import React, { useState } from 'react';
import { ShieldAlert, Trash2, CheckCircle2, Lock, ExternalLink } from 'lucide-react';
import { User } from '../types';
import {
  AccountDeletionResult,
  deleteUserAccount,
  getCurrentAuthProviders,
} from '../services/firebaseService';

interface DeleteAccountModalProps {
  isOpen: boolean;
  user: User;
  onClose: () => void;
  onDeleted: () => void;
  onOpenExternalPage?: () => void;
}

export const DeleteAccountModal: React.FC<DeleteAccountModalProps> = ({
  isOpen,
  user,
  onClose,
  onDeleted,
  onOpenExternalPage,
}) => {
  const [confirmInput, setConfirmInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [acknowledgedRetention, setAcknowledgedRetention] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [deletionReceipt, setDeletionReceipt] = useState<AccountDeletionResult | null>(null);

  if (!isOpen) return null;

  const providers = getCurrentAuthProviders();
  const isPasswordAccount = providers.includes('password') && !user.id.startsWith('sandbox_') && !user.id.startsWith('offline_');
  const isOAuthAccount = providers.includes('google.com') || providers.includes('apple.com');

  const canSubmit =
    confirmInput.trim().toUpperCase() === 'DELETE' &&
    acknowledgedRetention &&
    (!isPasswordAccount || passwordInput.length > 0) &&
    !isDeleting;

  const handleConfirmDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setErrorMsg('');
    setIsDeleting(true);
    try {
      sessionStorage.setItem('lumina_deletion_in_progress', 'true');
      const receipt = await deleteUserAccount(user.id, {
        password: passwordInput || undefined,
        email: user.email,
      });
      setPasswordInput('');
      setConfirmInput('');
      setDeletionReceipt(receipt);
    } catch (err: any) {
      sessionStorage.removeItem('lumina_deletion_in_progress');
      setErrorMsg(
        err?.message || 'Could not verify your identity or delete your account right now. Please try again.'
      );
    } finally {
      setIsDeleting(false);
    }
  };

  if (deletionReceipt) {
    return (
      <div className="fixed inset-0 bg-stone-950/70 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-fadeIn">
        <div className="bg-white dark:bg-[#1a1816] rounded-2xl p-6 sm:p-8 max-w-md w-full space-y-5 border border-stone-200/80 dark:border-[#2e2a26] shadow-2xl text-center">
          <div className="w-14 h-14 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 rounded-2xl flex items-center justify-center mx-auto text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 size={28} />
          </div>
          <div className="space-y-2">
            <h3 className="font-serif font-bold text-xl text-stone-900 dark:text-stone-100">Account Permanently Deleted</h3>
            <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed">
              Your Lumina profile, cycle and health logs, diary entries, partner connections, device backups, and local encrypted keys have been permanently erased.
            </p>
          </div>
          <div className="bg-[#faf8f6] dark:bg-[#23201d] border border-stone-200/80 dark:border-[#342f2b] rounded-xl p-4 text-left text-[11px] text-stone-600 dark:text-stone-300 space-y-1.5">
            <p className="tabular-nums">
              <strong className="text-stone-800 dark:text-stone-100">Completed At:</strong>{' '}
              {new Date(deletionReceipt.deletedAt).toLocaleString()}
            </p>
            <p>
              <strong className="text-stone-800 dark:text-stone-100">Cloud &amp; Session Status:</strong> All active sessions and authentication access have been revoked.
            </p>
            <p className="text-[10px] text-stone-500 dark:text-stone-400 pt-1">
              Note: Independent app-store or payment processor tax/transaction receipts (Apple App Store, Google Play, or Paystack) remain subject to statutory financial retention rules outside Lumina.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              sessionStorage.removeItem('lumina_deletion_in_progress');
              setDeletionReceipt(null);
              onClose();
              onDeleted();
            }}
            className="w-full py-3 bg-stone-900 dark:bg-stone-100 hover:bg-stone-800 dark:hover:bg-white text-white dark:text-stone-900 font-semibold text-xs rounded-xl transition-colors cursor-pointer"
          >
            Finish &amp; Exit
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-stone-950/70 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-fadeIn">
      <form
        onSubmit={handleConfirmDelete}
        className="bg-white dark:bg-[#1a1816] rounded-2xl p-6 sm:p-7 max-w-md w-full space-y-4 border border-stone-200/80 dark:border-[#2e2a26] shadow-2xl max-h-[92vh] overflow-y-auto text-left"
      >
        <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
          <div className="p-2.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200/70 dark:border-rose-900/40 rounded-xl shrink-0">
            <ShieldAlert size={22} />
          </div>
          <div>
            <h3 className="font-serif font-bold text-lg text-stone-900 dark:text-stone-100">Delete Account Permanently?</h3>
            <p className="text-[11px] font-semibold text-rose-600 dark:text-rose-400">
              Verified reauthentication required · Irreversible
            </p>
          </div>
        </div>

        <div className="space-y-2 text-xs text-stone-700 dark:text-stone-300 bg-rose-50/70 dark:bg-rose-950/25 p-4 rounded-xl border border-rose-200/80 dark:border-rose-900/40">
          <p className="font-bold text-rose-900 dark:text-rose-200">Immediate permanent erasure applies to:</p>
          <ul className="list-disc pl-5 space-y-1 text-[11px] text-rose-900/90 dark:text-rose-200/90">
            <li>Cycle history, predictions, symptoms, mood &amp; pregnancy logs</li>
            <li>Private diary entries, PINs, 2FA keys, and local encrypted vaults</li>
            <li>Partner Circle connections, shared summaries, invites, and gifts</li>
            <li>Your Firebase authentication credentials and active sessions</li>
          </ul>
          <p className="text-[10px] text-stone-600 dark:text-stone-400 pt-1.5 border-t border-rose-200/70 dark:border-rose-900/40">
            <strong>Legal retention notice:</strong> Financial transaction records processed directly by Apple App Store, Google Play, or Paystack may be retained strictly as required by tax and accounting law.
          </p>
        </div>

        {errorMsg && (
          <div role="alert" className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-xs text-rose-800 dark:text-rose-300 font-medium">
            {errorMsg}
          </div>
        )}

        {isPasswordAccount && (
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-stone-800 dark:text-stone-200 flex items-center gap-1.5">
              <Lock size={13} className="text-rose-600 dark:text-rose-400" />
              <span>Verify your current password</span>
            </label>
            <input
              type="password"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              placeholder="Enter current password"
              autoComplete="current-password"
              required
              className="w-full h-11 bg-[#faf8f6] dark:bg-[#23201d] border border-stone-200/80 dark:border-[#342f2b] px-4 rounded-xl text-xs text-stone-900 dark:text-stone-100 focus:border-rose-400 outline-none"
            />
          </div>
        )}

        {isOAuthAccount && (
          <div className="p-3 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200/70 dark:border-indigo-900/40 text-[11px] text-indigo-900 dark:text-indigo-200">
            When you click <strong>Verify &amp; Delete</strong>, a secure {providers.includes('google.com') ? 'Google' : 'Apple'} confirmation window will appear to verify your identity before any data is erased.
          </div>
        )}

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-stone-800 dark:text-stone-200 block">
            Type <span className="font-mono text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 px-1.5 py-0.5 rounded border border-rose-200 dark:border-rose-900/40">DELETE</span> to confirm
          </label>
          <input
            type="text"
            value={confirmInput}
            onChange={(e) => setConfirmInput(e.target.value)}
            placeholder="Type DELETE"
            className="w-full h-11 bg-[#faf8f6] dark:bg-[#23201d] border border-stone-200/80 dark:border-[#342f2b] px-4 rounded-xl text-xs font-mono font-bold text-stone-900 dark:text-stone-100 focus:border-rose-400 outline-none"
          />
        </div>

        <label className="flex items-start gap-2.5 text-[11px] text-stone-700 dark:text-stone-300 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={acknowledgedRetention}
            onChange={(e) => setAcknowledgedRetention(e.target.checked)}
            className="mt-0.5 accent-rose-600 w-4 h-4 shrink-0"
          />
          <span>
            I understand that deleting my account permanently destroys my reproductive health and diary data and cannot be reversed.
          </span>
        </label>

        {onOpenExternalPage && (
          <button
            type="button"
            onClick={onOpenExternalPage}
            className="text-[11px] font-semibold text-pink-700 dark:text-pink-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
          >
            <ExternalLink size={12} />
            <span>View Public Web Account Deletion &amp; Retention Policy</span>
          </button>
        )}

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            disabled={isDeleting}
            onClick={() => {
              setErrorMsg('');
              setPasswordInput('');
              setConfirmInput('');
              onClose();
            }}
            className="flex-1 py-3 bg-stone-100 dark:bg-[#23201d] hover:bg-stone-200 dark:hover:bg-[#2b2724] text-stone-700 dark:text-stone-200 font-semibold text-xs rounded-xl transition-colors cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!canSubmit}
            className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold text-xs rounded-xl transition-colors cursor-pointer shadow-xs flex items-center justify-center gap-1.5"
          >
            <Trash2 size={14} />
            <span>{isDeleting ? 'Verifying & Deleting...' : 'Verify & Delete'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};

export default DeleteAccountModal;
