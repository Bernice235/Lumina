import React, { useState } from 'react';
import {
  ShieldAlert,
  Trash2,
  CheckCircle2,
  ArrowLeft,
  Lock,
  Mail,
  FileText,
  ExternalLink,
} from 'lucide-react';
import { auth } from '../services/firebase';
import {
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  signInWithPopup,
} from 'firebase/auth';
import {
  AccountDeletionResult,
  deleteUserAccount,
} from '../services/firebaseService';
import { isValidEmailAddress, sanitizeTextInput } from '../services/securityService';

interface DeleteAccountPageProps {
  signedInUserId?: string;
  signedInUserEmail?: string;
  onBackHome: () => void;
  onAccountDeleted: () => void;
}

export const DeleteAccountPage: React.FC<DeleteAccountPageProps> = ({
  signedInUserId,
  signedInUserEmail,
  onBackHome,
  onAccountDeleted,
}) => {
  const [mode, setMode] = useState<'self_service' | 'external_request'>('self_service');

  // Self-service immediate deletion states
  const [email, setEmail] = useState(signedInUserEmail || auth.currentUser?.email || '');
  const [password, setPassword] = useState('');
  const [confirmWord, setConfirmWord] = useState('');
  const [acknowledge, setAcknowledge] = useState(false);
  const [selfLoading, setSelfLoading] = useState(false);
  const [selfError, setSelfError] = useState('');
  const [selfReceipt, setSelfReceipt] = useState<AccountDeletionResult | null>(null);

  // External DSAR request states (when user cannot access password or device)
  const [reqEmail, setReqEmail] = useState('');
  const [reqName, setReqName] = useState('');
  const [reqReason, setReqReason] = useState('No longer using Lumina');
  const [reqNotes, setReqNotes] = useState('');
  const [reqWebsite, setReqWebsite] = useState(''); // Honeypot
  const [reqAck, setReqAck] = useState(false);
  const [reqLoading, setReqLoading] = useState(false);
  const [reqError, setReqError] = useState('');
  const [reqConfirmation, setReqConfirmation] = useState<{ ticketId: string; submittedAt: string } | null>(null);

  const handleSelfServiceDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    setSelfError('');

    if (confirmWord.trim().toUpperCase() !== 'DELETE') {
      setSelfError('Please type DELETE in uppercase to confirm permanent deletion.');
      return;
    }
    if (!acknowledge) {
      setSelfError('Please acknowledge that this action is permanent.');
      return;
    }

    setSelfLoading(true);
    try {
      let targetUid = signedInUserId || auth.currentUser?.uid || '';
      let targetEmail = signedInUserEmail || auth.currentUser?.email || email.trim();

      if (!auth.currentUser) {
        if (!isValidEmailAddress(email)) {
          throw new Error('Please enter a valid account email address.');
        }
        if (!password) {
          throw new Error('Please enter your account password to verify ownership before deleting.');
        }
        const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
        targetUid = cred.user.uid;
        targetEmail = cred.user.email || email.trim();
      }

      const receipt = await deleteUserAccount(targetUid, {
        password: password || undefined,
        email: targetEmail,
      });

      setPassword('');
      setConfirmWord('');
      setSelfReceipt(receipt);
    } catch (err: any) {
      const code = err?.code || '';
      if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') {
        setSelfError('The email or password could not be verified. If you cannot access your password, switch to the "External Request" tab below.');
      } else {
        setSelfError(err?.message || 'Unable to verify and delete your account right now.');
      }
    } finally {
      setSelfLoading(false);
    }
  };

  const handleGoogleSignInAndDelete = async () => {
    setSelfError('');
    if (confirmWord.trim().toUpperCase() !== 'DELETE' || !acknowledge) {
      setSelfError('Please type DELETE and check the acknowledgement box before continuing with Google verification.');
      return;
    }
    setSelfLoading(true);
    try {
      if (!auth.currentUser) {
        const res = await signInWithPopup(auth, new GoogleAuthProvider());
        const receipt = await deleteUserAccount(res.user.uid, {
          email: res.user.email || undefined,
          skipReauth: true, // Just signed in interactively with Google seconds ago
        });
        setSelfReceipt(receipt);
      } else {
        const receipt = await deleteUserAccount(auth.currentUser.uid, {
          email: auth.currentUser.email || undefined,
        });
        setSelfReceipt(receipt);
      }
    } catch (err: any) {
      setSelfError(err?.message || 'Google verification could not be completed.');
    } finally {
      setSelfLoading(false);
    }
  };

  const handleExternalRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setReqError('');

    if (!isValidEmailAddress(reqEmail)) {
      setReqError('Please enter a valid account email address.');
      return;
    }
    if (!reqAck) {
      setReqError('Please confirm that you understand this submits a permanent account erasure request.');
      return;
    }

    setReqLoading(true);
    try {
      const res = await fetch('/api/account-deletion-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: sanitizeTextInput(reqEmail, 160),
          name: sanitizeTextInput(reqName, 120),
          reason: sanitizeTextInput(reqReason, 120),
          notes: sanitizeTextInput(reqNotes, 1000),
          website: reqWebsite,
        }),
      });
      const json: any = await res.json();
      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || 'Could not submit your deletion request right now.');
      }
      setReqConfirmation({
        ticketId: json.ticketId,
        submittedAt: json.receivedAt,
      });
    } catch (err: any) {
      setReqError(err?.message || 'Unable to submit request. Please email privacy@luminabloom.app.');
    } finally {
      setReqLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#fffafb] text-stone-800 py-8 px-4 sm:px-6 font-sans">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onBackHome}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white border border-pink-100 text-xs font-bold text-pink-700 hover:bg-pink-50 cursor-pointer shadow-xs"
          >
            <ArrowLeft size={14} />
            <span>Back to Lumina</span>
          </button>
          <span className="text-[11px] font-bold uppercase tracking-widest text-pink-600">
            Lumina: Bloom &amp; Balance
          </span>
        </div>

        <header className="bg-white rounded-[2rem] border border-pink-100 p-6 sm:p-8 shadow-sm space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 shrink-0">
              <ShieldAlert size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-serif font-bold text-stone-900">
                Account &amp; Personal Data Deletion
              </h1>
              <p className="text-xs text-stone-600">
                Verified self-service deletion &amp; external Data Erasure (DSAR) portal for Web, iOS, and Android.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs">
            <div className="p-3.5 rounded-2xl bg-rose-50/50 border border-rose-100 space-y-1">
              <p className="font-bold text-rose-900">Data Deleted Immediately</p>
              <p className="text-[11px] text-stone-700 leading-relaxed">
                Profile details, cycle dates, symptoms, mood logs, pregnancy data, diary entries, partner connections, 2FA/PINs, encrypted local vaults, and analytics/crash logs tied to your UID.
              </p>
            </div>
            <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200 space-y-1">
              <p className="font-bold text-stone-900">Legal &amp; Financial Retention</p>
              <p className="text-[11px] text-stone-700 leading-relaxed">
                Payment and subscription billing records processed independently by Apple App Store, Google Play, or Paystack are retained solely as required by tax, fraud, and financial regulations (typically 6–7 years).
              </p>
            </div>
          </div>
        </header>

        {/* Mode Switcher */}
        <div className="flex gap-2 bg-white p-1.5 rounded-2xl border border-pink-100 shadow-xs">
          <button
            type="button"
            onClick={() => setMode('self_service')}
            className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              mode === 'self_service'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'text-stone-700 hover:bg-pink-50'
            }`}
          >
            Immediate Self-Service Deletion
          </button>
          <button
            type="button"
            onClick={() => setMode('external_request')}
            className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              mode === 'external_request'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'text-stone-700 hover:bg-pink-50'
            }`}
          >
            External Request (No Login Access)
          </button>
        </div>

        {mode === 'self_service' ? (
          selfReceipt ? (
            <section className="bg-white rounded-[2rem] border border-emerald-200 p-6 sm:p-8 shadow-sm text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto text-emerald-600">
                <CheckCircle2 size={32} />
              </div>
              <h2 className="text-xl font-serif font-bold text-stone-900">
                Your Account Has Been Permanently Deleted
              </h2>
              <p className="text-xs text-stone-600 max-w-md mx-auto leading-relaxed">
                Completed on {new Date(selfReceipt.deletedAt).toLocaleString()}. All associated cloud records, sessions, and local encrypted keys have been permanently removed.
              </p>
              <button
                type="button"
                onClick={onAccountDeleted}
                className="px-6 py-3 rounded-2xl bg-stone-900 text-white text-xs font-bold cursor-pointer"
              >
                Return to Home
              </button>
            </section>
          ) : (
            <form
              onSubmit={handleSelfServiceDelete}
              className="bg-white rounded-[2rem] border border-pink-100 p-6 sm:p-8 shadow-sm space-y-4"
            >
              <h2 className="text-base font-serif font-bold text-stone-900">
                Authenticate &amp; Permanently Delete Account
              </h2>
              <p className="text-xs text-stone-600 leading-relaxed">
                For your protection, account deletion requires fresh identity verification before any health records are erased.
              </p>

              {selfError && (
                <div role="alert" className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-800">
                  {selfError}
                </div>
              )}

              {auth.currentUser ? (
                <div className="p-3.5 rounded-2xl bg-pink-50/50 border border-pink-100 text-xs text-stone-800">
                  Signed in as <strong>{auth.currentUser.email || signedInUserEmail}</strong>. Enter your password (if using email sign-in) or re-verify with Google below.
                </div>
              ) : (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
                    <Mail size={13} className="text-pink-600" />
                    <span>Account Email</span>
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full px-4 py-2.5 rounded-xl bg-stone-50 border border-stone-200 text-xs text-stone-900"
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
                  <Lock size={13} className="text-pink-600" />
                  <span>Password (for Email/Password accounts)</span>
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your current password"
                  autoComplete="current-password"
                  className="w-full px-4 py-2.5 rounded-xl bg-stone-50 border border-stone-200 text-xs text-stone-900"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-stone-800 block">
                  Type <span className="font-mono text-rose-700">DELETE</span> to confirm permanent deletion:
                </label>
                <input
                  type="text"
                  value={confirmWord}
                  onChange={(e) => setConfirmWord(e.target.value)}
                  placeholder="Type DELETE"
                  className="w-full px-4 py-2.5 rounded-xl bg-stone-50 border border-stone-200 text-xs font-mono font-bold text-stone-900"
                />
              </div>

              <label className="flex items-start gap-2.5 text-xs text-stone-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={acknowledge}
                  onChange={(e) => setAcknowledge(e.target.checked)}
                  className="mt-0.5 accent-rose-600 w-4 h-4 shrink-0"
                />
                <span>
                  I understand this permanently deletes my Lumina account and cannot be undone.
                </span>
              </label>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  type="submit"
                  disabled={selfLoading}
                  className="flex-1 py-3 px-4 rounded-2xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Trash2 size={14} />
                  <span>{selfLoading ? 'Verifying & Deleting...' : 'Verify Password & Delete Account'}</span>
                </button>
                <button
                  type="button"
                  disabled={selfLoading}
                  onClick={handleGoogleSignInAndDelete}
                  className="py-3 px-4 rounded-2xl bg-white border border-stone-300 hover:bg-stone-50 text-stone-800 text-xs font-bold cursor-pointer"
                >
                  Verify with Google &amp; Delete
                </button>
              </div>
            </form>
          )
        ) : reqConfirmation ? (
          <section className="bg-white rounded-[2rem] border border-emerald-200 p-6 sm:p-8 shadow-sm space-y-4">
            <div className="flex items-center gap-3 text-emerald-700">
              <CheckCircle2 size={28} />
              <div>
                <h2 className="text-lg font-serif font-bold text-stone-900">Deletion Request Received</h2>
                <p className="text-xs text-stone-600">
                  Reference ID: <strong className="font-mono text-stone-900">{reqConfirmation.ticketId}</strong>
                </p>
              </div>
            </div>
            <p className="text-xs text-stone-700 leading-relaxed">
              Your external erasure request was recorded at{' '}
              {new Date(reqConfirmation.submittedAt).toLocaleString()}. Before processing permanent cloud erasure for an unauthenticated request, our Data Protection team verifies ownership via your registered email address within 72 hours and completes erasure within 30 days (NDPA / GDPR statutory timeline).
            </p>
            <p className="text-xs text-stone-600">
              You can also contact our Data Protection Officer directly at{' '}
              <a href="mailto:privacy@luminabloom.app" className="text-pink-700 font-bold underline">
                privacy@luminabloom.app
              </a>{' '}
              with your reference ID.
            </p>
          </section>
        ) : (
          <form
            onSubmit={handleExternalRequestSubmit}
            className="bg-white rounded-[2rem] border border-pink-100 p-6 sm:p-8 shadow-sm space-y-4"
          >
            <div className="flex items-center gap-2">
              <FileText size={18} className="text-pink-600" />
              <h2 className="text-base font-serif font-bold text-stone-900">
                Submit External Deletion Request
              </h2>
            </div>
            <p className="text-xs text-stone-600 leading-relaxed">
              No longer have access to the app or forgot your sign-in method? Submit a verified erasure request below and our Privacy team will confirm identity via email before removing your account.
            </p>

            {reqError && (
              <div role="alert" className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-800">
                {reqError}
              </div>
            )}

            {/* Anti-spam honeypot */}
            <input
              type="text"
              name="website"
              value={reqWebsite}
              onChange={(e) => setReqWebsite(e.target.value)}
              tabIndex={-1}
              autoComplete="off"
              className="hidden"
              aria-hidden="true"
            />

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-stone-800 block">Registered Account Email *</label>
              <input
                type="email"
                required
                value={reqEmail}
                onChange={(e) => setReqEmail(e.target.value)}
                placeholder="account-email@example.com"
                className="w-full px-4 py-2.5 rounded-xl bg-stone-50 border border-stone-200 text-xs text-stone-900"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-stone-800 block">Profile Name (Optional)</label>
                <input
                  type="text"
                  value={reqName}
                  onChange={(e) => setReqName(e.target.value)}
                  placeholder="Name on account"
                  className="w-full px-4 py-2.5 rounded-xl bg-stone-50 border border-stone-200 text-xs text-stone-900"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-stone-800 block">Reason</label>
                <select
                  value={reqReason}
                  onChange={(e) => setReqReason(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-stone-50 border border-stone-200 text-xs text-stone-900"
                >
                  <option value="No longer using Lumina">No longer using Lumina</option>
                  <option value="Privacy / sensitive data erasure">Privacy / sensitive data erasure</option>
                  <option value="Lost device or login access">Lost device or login access</option>
                  <option value="Duplicate account cleanup">Duplicate account cleanup</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-stone-800 block">Additional Verification Notes (Optional)</label>
              <textarea
                rows={3}
                value={reqNotes}
                onChange={(e) => setReqNotes(e.target.value)}
                placeholder="Do not include sensitive medical details — only helpful account identifiers such as approximate sign-up month."
                className="w-full px-4 py-2.5 rounded-xl bg-stone-50 border border-stone-200 text-xs text-stone-900"
              />
            </div>

            <label className="flex items-start gap-2.5 text-xs text-stone-700 cursor-pointer">
              <input
                type="checkbox"
                checked={reqAck}
                onChange={(e) => setReqAck(e.target.checked)}
                className="mt-0.5 accent-rose-600 w-4 h-4 shrink-0"
              />
              <span>
                I confirm I am the owner of this email address and request permanent deletion of all associated Lumina data.
              </span>
            </label>

            <button
              type="submit"
              disabled={reqLoading}
              className="w-full py-3 rounded-2xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-bold cursor-pointer"
            >
              {reqLoading ? 'Submitting Request...' : 'Submit Verified Deletion Request'}
            </button>
          </form>
        )}

        <footer className="text-center text-[11px] text-stone-500 space-y-1 pb-6">
          <p className="inline-flex items-center gap-1">
            <ExternalLink size={11} />
            <span>Direct Privacy Desk:</span>
            <a href="mailto:privacy@luminabloom.app" className="text-pink-700 font-semibold underline">
              privacy@luminabloom.app
            </a>
          </p>
        </footer>
      </div>
    </div>
  );
};

export default DeleteAccountPage;
