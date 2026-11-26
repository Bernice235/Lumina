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
      <div className="fixed inset-0 bg-stone-900/70 backdrop-blur-md z-[200] flex items-center justify-center p-4 animate-fadeIn">
        <div className="bg-white rounded-[2.5rem] p-6 sm:p-8 max-w-md w-full space-y-5 border border-emerald-100 shadow-2xl text-center">
          <div className="w-16 h-16 bg-emerald-50 border border-emerald-200 rounded-full flex items-center justify-center mx-auto text-emerald-600">
            <CheckCircle2 size={32} />
          </div>
          <div className="space-y-2">
            <h3 className="font-serif font-bold text-xl text-stone-900">Account Permanently Deleted</h3>
            <p className="text-xs text-stone-600 leading-relaxed">
              Your Lumina profile, cycle and health logs, diary entries, partner connections, device backups, and local encrypted keys have been permanently erased.
            </p>
          </div>
          <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4 text-left text-[11px] text-stone-600 space-y-1">
            <p>
              <strong className="text-stone-800">Completed At:</strong>{' '}
              {new Date(deletionReceipt.deletedAt).toLocaleString()}
            </p>
            <p>
              <strong className="text-stone-800">Cloud &amp; Session Status:</strong> All active sessions and authentication access have been revoked.
            </p>
            <p className="text-[10px] text-stone-500 pt-1">
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
            className="w-full py-3.5 bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs uppercase tracking-wider rounded-2xl transition-all cursor-pointer"
          >
            Finish &amp; Exit
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-stone-900/70 backdrop-blur-md z-[200] flex items-center justify-center p-4 animate-fadeIn">
      <form
        onSubmit={handleConfirmDelete}
        className="bg-white rounded-[2.5rem] p-6 sm:p-7 max-w-md w-full space-y-4 border border-rose-100 shadow-2xl max-h-[92vh] overflow-y-auto text-left"
      >
        <div className="flex items-center gap-3 text-rose-600">
          <div className="p-3 bg-rose-100/70 rounded-2xl shrink-0">
            <ShieldAlert size={24} />
          </div>
          <div>
            <h3 className="font-serif font-bold text-lg text-stone-900">Delete Account Permanently?</h3>
            <p className="text-[10px] font-bold text-rose-600 uppercase tracking-widest">
              Verified Reauthentication Required • Irreversible
            </p>
          </div>
        </div>

        <div className="space-y-2 text-xs text-stone-700 bg-rose-50/60 p-4 rounded-2xl border border-rose-100">
          <p className="font-bold text-rose-900">Immediate permanent erasure applies to:</p>
          <ul className="list-disc pl-5 space-y-1 text-[11px] text-rose-900/90">
            <li>Cycle history, predictions, symptoms, mood &amp; pregnancy logs</li>
            <li>Private diary entries, PINs, 2FA keys, and local encrypted vaults</li>
            <li>Partner Circle connections, shared summaries, invites, and gifts</li>
            <li>Your Firebase authentication credentials and active sessions</li>
          </ul>
          <p className="text-[10px] text-stone-600 pt-1 border-t border-rose-200/70">
            <strong>Legal retention notice:</strong> Financial transaction records processed directly by Apple App Store, Google Play, or Paystack may be retained strictly as required by tax and accounting law.
          </p>
        </div>

        {errorMsg && (
          <div role="alert" className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-800 font-medium">
            {errorMsg}
          </div>
        )}

        {isPasswordAccount && (
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
              <Lock size={13} className="text-rose-600" />
              <span>Verify your current password</span>
            </label>
            <input
              type="password"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              placeholder="Enter current password"
              autoComplete="current-password"
              required
              className="w-full bg-stone-50 border border-stone-200 px-4 py-2.5 rounded-2xl text-xs text-stone-900 focus:border-rose-400 outline-none"
            />
          </div>
        )}

        {isOAuthAccount && (
          <div className="p-3 rounded-2xl bg-indigo-50/60 border border-indigo-100 text-[11px] text-indigo-900">
            When you click <strong>Verify &amp; Delete</strong>, a secure {providers.includes('google.com') ? 'Google' : 'Apple'} confirmation window will appear to verify your identity before any data is erased.
          </div>
        )}

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-stone-800 block">
            Type <span className="font-mono text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">DELETE</span> to confirm:
          </label>
          <input
            type="text"
            value={confirmInput}
            onChange={(e) => setConfirmInput(e.target.value)}
            placeholder="Type DELETE"
            className="w-full bg-stone-50 border border-stone-200 px-4 py-2.5 rounded-2xl text-xs font-mono font-bold text-stone-900 focus:border-rose-400 outline-none"
          />
        </div>

        <label className="flex items-start gap-2.5 text-[11px] text-stone-700 cursor-pointer select-none">
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
            className="text-[11px] font-semibold text-pink-700 hover:underline inline-flex items-center gap-1 cursor-pointer"
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
            className="flex-1 py-3 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs rounded-xl transition-all cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!canSubmit}
            className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-xs rounded-xl transition-all cursor-pointer shadow-md shadow-rose-200 flex items-center justify-center gap-1.5"
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
