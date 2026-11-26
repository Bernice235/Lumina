import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  RefreshCw,
} from 'lucide-react';
import {
  completeFirebasePasswordReset,
  LUMINA_BRAND_NAME,
  verifyFirebaseResetCode,
} from '../services/passwordResetService';
import {
  clearLoginLockout,
  evaluatePasswordStrength,
} from '../services/securityService';

interface ResetPasswordConfirmScreenProps {
  oobCode: string | null;
  onRequestNewLink: () => void;
  onBackToSignIn: (prefillEmail?: string, didCompleteReset?: boolean) => void;
  onResetConsumed?: () => void;
}

type VerifyStage = 'verifying' | 'ready' | 'invalid' | 'completed';

export const ResetPasswordConfirmScreen: React.FC<ResetPasswordConfirmScreenProps> = ({
  oobCode,
  onRequestNewLink,
  onBackToSignIn,
  onResetConsumed,
}) => {
  const [stage, setStage] = useState<VerifyStage>('verifying');
  const [verifiedEmail, setVerifiedEmail] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [canRequestNewLink, setCanRequestNewLink] = useState<boolean>(true);
  const [canRetryVerify, setCanRetryVerify] = useState<boolean>(false);

  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [showNewPassword, setShowNewPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);

  const runVerification = useCallback(async () => {
    if (!oobCode) {
      setStage('invalid');
      setError('This password reset link is missing an action code. Please request a fresh reset link.');
      setCanRequestNewLink(true);
      setCanRetryVerify(false);
      return;
    }

    setStage('verifying');
    setError('');
    const result = await verifyFirebaseResetCode(oobCode);
    if (result.ok && result.email) {
      setVerifiedEmail(result.email);
      setStage('ready');
    } else {
      setStage('invalid');
      setError(result.message || 'This password reset link is invalid or has expired.');
      setCanRequestNewLink(result.canRequestNewLink ?? true);
      setCanRetryVerify(result.canRetry ?? false);
    }
  }, [oobCode]);

  useEffect(() => {
    runVerification();
  }, [runVerification]);

  // Clear ephemeral password inputs cleanly when unmounting and restore page title
  useEffect(() => {
    const prevTitle = document.title;
    document.title = `Reset Password — ${LUMINA_BRAND_NAME}`;
    return () => {
      document.title = prevTitle;
      setNewPassword('');
      setConfirmPassword('');
    };
  }, []);

  const strength = evaluatePasswordStrength(newPassword);
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;

  const handleConfirmSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!oobCode) {
      setStage('invalid');
      setError('Your reset session expired. Please request a new reset link.');
      setCanRequestNewLink(true);
      return;
    }

    setError('');
    if (!strength.valid) {
      setError(
        strength.error ||
          'Choose a stronger password (8+ characters, uppercase & lowercase letters, number, and symbol).'
      );
      return;
    }
    if (!passwordsMatch) {
      setError('Passwords do not match. Please re-enter both fields identically.');
      return;
    }

    setSubmitting(true);
    try {
      const result = await completeFirebasePasswordReset(oobCode, newPassword, confirmPassword);
      if (result.ok) {
        const accountEmail = verifiedEmail;
        setNewPassword('');
        setConfirmPassword('');
        if (accountEmail) {
          await clearLoginLockout(accountEmail).catch(() => {});
        }
        onResetConsumed?.();
        setStage('completed');
      } else if (result.canRequestNewLink) {
        setNewPassword('');
        setConfirmPassword('');
        setStage('invalid');
        setError(result.message || 'This password reset link has expired or was already used.');
        setCanRequestNewLink(true);
        setCanRetryVerify(false);
      } else {
        setError(result.message || 'Unable to update your password right now.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-5 animate-fadeIn w-full" data-testid="reset-password-confirm-screen">
      {stage !== 'completed' && (
        <button
          type="button"
          onClick={() => onBackToSignIn(verifiedEmail || undefined)}
          className="inline-flex items-center gap-1.5 text-[10px] font-sans font-bold uppercase tracking-widest text-pink-700 hover:text-pink-900 cursor-pointer"
        >
          <ArrowLeft size={12} aria-hidden="true" /> Back to Sign In
        </button>
      )}

      <div className="text-center space-y-1.5">
        <div className="w-11 h-11 rounded-2xl bg-pink-50 border border-pink-100 text-pink-600 flex items-center justify-center mx-auto shadow-xs">
          {stage === 'completed' ? (
            <CheckCircle2 size={22} className="text-emerald-600" aria-hidden="true" />
          ) : stage === 'invalid' ? (
            <AlertTriangle size={20} className="text-rose-600" aria-hidden="true" />
          ) : (
            <KeyRound size={20} aria-hidden="true" />
          )}
        </div>
        <p className="text-[9px] font-extrabold uppercase tracking-[0.22em] text-pink-500">
          {LUMINA_BRAND_NAME}
        </p>
        <h2 className="text-2xl font-serif text-pink-950 font-bold italic">
          {stage === 'completed'
            ? 'Password Updated'
            : stage === 'invalid'
              ? 'Reset Link Unavailable'
              : 'Create New Password'}
        </h2>
      </div>

      {stage === 'verifying' && (
        <div className="py-10 flex flex-col items-center justify-center gap-3 text-center">
          <div className="w-9 h-9 border-3 border-pink-100 border-t-pink-500 rounded-full animate-spin" />
          <p className="text-xs font-medium text-stone-600">
            Verifying your secure reset link with Firebase...
          </p>
        </div>
      )}

      {stage === 'invalid' && (
        <div className="space-y-4 animate-fadeIn">
          <div
            role="alert"
            className="w-full bg-rose-50 text-rose-800 text-[11px] text-center font-medium p-4 rounded-2xl border border-rose-200 leading-relaxed"
          >
            {error}
          </div>

          <div className="space-y-2.5 pt-1">
            {canRequestNewLink && (
              <button
                type="button"
                onClick={() => {
                  onResetConsumed?.();
                  onRequestNewLink();
                }}
                className="w-full py-4 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-2xl font-bold text-xs uppercase tracking-[0.15em] shadow-md shadow-pink-100 hover:opacity-95 active:scale-95 transition-all cursor-pointer"
              >
                Request New Reset Link
              </button>
            )}

            {canRetryVerify && (
              <button
                type="button"
                onClick={runVerification}
                className="w-full py-3.5 bg-white border border-pink-200 text-pink-700 hover:bg-pink-50/40 rounded-2xl font-bold text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 cursor-pointer"
              >
                <RefreshCw size={13} aria-hidden="true" />
                <span>Try Verification Again</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                onResetConsumed?.();
                onBackToSignIn();
              }}
              className="w-full py-3.5 bg-white border border-stone-200 text-stone-700 hover:bg-stone-50 rounded-2xl font-bold text-[10px] uppercase tracking-widest cursor-pointer"
            >
              Back to Sign In
            </button>
          </div>
        </div>
      )}

      {stage === 'ready' && (
        <form onSubmit={handleConfirmSubmit} className="space-y-4 animate-fadeIn" noValidate>
          {verifiedEmail && (
            <div className="bg-pink-50/50 border border-pink-100 rounded-2xl px-4 py-2.5 text-center">
              <p className="text-[10px] font-bold uppercase tracking-wider text-pink-700">
                Verified Account
              </p>
              <p className="text-xs font-semibold text-stone-800 break-all mt-0.5">
                {verifiedEmail}
              </p>
            </div>
          )}

          {error && (
            <div
              role="alert"
              className="w-full bg-rose-50 text-rose-700 text-[11px] text-center font-medium p-3.5 rounded-2xl border border-rose-200 leading-relaxed"
            >
              {error}
            </div>
          )}

          <div className="space-y-1.5 text-left">
            <label
              htmlFor="reset-new-password"
              className="block text-[10px] font-bold text-pink-800 uppercase tracking-wider px-1"
            >
              New Password
            </label>
            <div className="relative">
              <input
                id="reset-new-password"
                type={showNewPassword ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="Enter new strong password"
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  if (error) setError('');
                }}
                className="w-full pl-4 pr-11 py-3.5 bg-white/85 border border-pink-200 rounded-2xl text-xs font-semibold text-stone-900 placeholder:text-stone-400 outline-none focus:border-pink-400 transition-colors"
                required
              />
              <button
                type="button"
                onClick={() => setShowNewPassword((prev) => !prev)}
                aria-label={showNewPassword ? 'Hide new password' : 'Show new password'}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-pink-600 cursor-pointer"
              >
                {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div className="space-y-1.5 text-left">
            <label
              htmlFor="reset-confirm-password"
              className="block text-[10px] font-bold text-pink-800 uppercase tracking-wider px-1"
            >
              Confirm New Password
            </label>
            <div className="relative">
              <input
                id="reset-confirm-password"
                type={showConfirmPassword ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="Re-enter your new password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (error) setError('');
                }}
                className="w-full pl-4 pr-11 py-3.5 bg-white/85 border border-pink-200 rounded-2xl text-xs font-semibold text-stone-900 placeholder:text-stone-400 outline-none focus:border-pink-400 transition-colors"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((prev) => !prev)}
                aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-pink-600 cursor-pointer"
              >
                {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Password Strength & Requirement Checklist */}
          <div className="p-3.5 rounded-2xl bg-pink-50/35 border border-pink-100 space-y-2 text-left">
            <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider">
              <span className="text-stone-600">Password Strength</span>
              <span
                className={
                  strength.label === 'Strong'
                    ? 'text-emerald-700'
                    : strength.label === 'Good'
                      ? 'text-amber-700'
                      : 'text-rose-700'
                }
              >
                {strength.label}
              </span>
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {[1, 2, 3, 4].map((seg) => (
                <div
                  key={seg}
                  className={`h-1.5 rounded-full transition-colors ${
                    strength.score >= seg
                      ? strength.valid
                        ? 'bg-emerald-500'
                        : 'bg-amber-400'
                      : 'bg-pink-100'
                  }`}
                />
              ))}
            </div>
            <ul className="grid grid-cols-2 gap-x-2 gap-y-1 pt-1 text-[10px] font-medium text-stone-600">
              <li className={`flex items-center gap-1 ${strength.checks.minLength ? 'text-emerald-700 font-semibold' : ''}`}>
                <Check size={11} aria-hidden="true" /> 8+ characters
              </li>
              <li className={`flex items-center gap-1 ${strength.checks.hasUpper && strength.checks.hasLower ? 'text-emerald-700 font-semibold' : ''}`}>
                <Check size={11} aria-hidden="true" /> Upper &amp; lowercase
              </li>
              <li className={`flex items-center gap-1 ${strength.checks.hasNumber ? 'text-emerald-700 font-semibold' : ''}`}>
                <Check size={11} aria-hidden="true" /> At least 1 number
              </li>
              <li className={`flex items-center gap-1 ${strength.checks.hasSymbol ? 'text-emerald-700 font-semibold' : ''}`}>
                <Check size={11} aria-hidden="true" /> Special symbol
              </li>
              <li className={`flex items-center gap-1 col-span-2 ${passwordsMatch ? 'text-emerald-700 font-semibold' : ''}`}>
                <Check size={11} aria-hidden="true" /> Passwords match
              </li>
            </ul>
          </div>

          <button
            type="submit"
            disabled={submitting || !strength.valid || !passwordsMatch}
            className="w-full py-4 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-2xl font-bold text-xs uppercase tracking-[0.15em] shadow-md shadow-pink-100 hover:opacity-95 active:scale-95 transition-all disabled:opacity-55 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" aria-hidden="true" />
                <span>Updating Password...</span>
              </>
            ) : (
              <span>Save New Password</span>
            )}
          </button>
        </form>
      )}

      {stage === 'completed' && (
        <div className="space-y-4 animate-fadeIn text-center">
          <div
            role="status"
            className="w-full bg-emerald-50 text-emerald-900 p-4 rounded-2xl border border-emerald-200 space-y-1.5"
          >
            <p className="text-xs font-bold text-emerald-800">
              Your {LUMINA_BRAND_NAME} password has been changed.
            </p>
            <p className="text-[11px] text-emerald-700 leading-relaxed">
              You can now sign in with your new password across web, iOS, and Android.
            </p>
          </div>

          <button
            type="button"
            onClick={() => onBackToSignIn(verifiedEmail || undefined, true)}
            className="w-full py-4 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-2xl font-bold text-xs uppercase tracking-[0.15em] shadow-md shadow-pink-100 hover:opacity-95 active:scale-95 transition-all cursor-pointer"
          >
            Sign In Now
          </button>
        </div>
      )}
    </div>
  );
};
