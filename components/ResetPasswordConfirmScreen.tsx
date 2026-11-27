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
    <div className="space-y-6 animate-fadeIn w-full" data-testid="reset-password-confirm-screen">
      {stage !== 'completed' && (
        <button
          type="button"
          onClick={() => onBackToSignIn(verifiedEmail || undefined)}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-stone-600 hover:text-stone-900 transition-colors cursor-pointer"
        >
          <ArrowLeft size={14} aria-hidden="true" /> Back to sign in
        </button>
      )}

      <div className="space-y-2 text-left">
        <div className="w-10 h-10 rounded-xl bg-pink-50 border border-pink-200/70 text-pink-600 flex items-center justify-center">
          {stage === 'completed' ? (
            <CheckCircle2 size={20} className="text-emerald-600" aria-hidden="true" />
          ) : stage === 'invalid' ? (
            <AlertTriangle size={18} className="text-rose-600" aria-hidden="true" />
          ) : (
            <KeyRound size={18} aria-hidden="true" />
          )}
        </div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-pink-700 pt-1">
          {LUMINA_BRAND_NAME}
        </p>
        <h2 className="text-2xl font-serif font-semibold text-stone-900 tracking-tight">
          {stage === 'completed'
            ? 'Password updated'
            : stage === 'invalid'
              ? 'Reset link unavailable'
              : 'Create new password'}
        </h2>
      </div>

      {stage === 'verifying' && (
        <div className="py-10 flex flex-col items-center justify-center gap-3 text-center">
          <div className="w-8 h-8 border-2 border-stone-200 border-t-pink-600 rounded-full animate-spin" />
          <p className="text-sm font-medium text-stone-600">
            Verifying your secure reset link...
          </p>
        </div>
      )}

      {stage === 'invalid' && (
        <div className="space-y-4 animate-fadeIn">
          <div
            role="alert"
            className="w-full bg-rose-50 text-rose-800 text-xs font-medium p-4 rounded-xl border border-rose-200 leading-relaxed"
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
                className="w-full h-11 px-4 bg-pink-600 hover:bg-pink-700 text-white rounded-xl font-semibold text-sm transition-colors cursor-pointer"
              >
                Request new reset link
              </button>
            )}

            {canRetryVerify && (
              <button
                type="button"
                onClick={runVerification}
                className="w-full h-11 px-4 bg-white border border-stone-200 text-stone-800 hover:bg-stone-50 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                <RefreshCw size={14} aria-hidden="true" />
                <span>Try verification again</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                onResetConsumed?.();
                onBackToSignIn();
              }}
              className="w-full h-11 px-4 bg-white border border-stone-200 text-stone-700 hover:bg-stone-50 rounded-xl font-medium text-sm cursor-pointer transition-colors"
            >
              Back to sign in
            </button>
          </div>
        </div>
      )}

      {stage === 'ready' && (
        <form onSubmit={handleConfirmSubmit} className="space-y-4 animate-fadeIn" noValidate>
          {verifiedEmail && (
            <div className="bg-stone-50 border border-stone-200/80 rounded-xl px-4 py-3 text-left">
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-stone-500">
                Verified account
              </p>
              <p className="text-sm font-medium text-stone-900 break-all mt-0.5">
                {verifiedEmail}
              </p>
            </div>
          )}

          {error && (
            <div
              role="alert"
              className="w-full bg-rose-50 text-rose-800 text-xs font-medium p-3.5 rounded-xl border border-rose-200 leading-relaxed"
            >
              {error}
            </div>
          )}

          <div className="space-y-1.5 text-left">
            <label
              htmlFor="reset-new-password"
              className="block text-xs font-medium text-stone-700"
            >
              New password
            </label>
            <div className="relative">
              <input
                id="reset-new-password"
                type={showNewPassword ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="Enter a strong password"
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  if (error) setError('');
                }}
                className="w-full h-11 pl-3.5 pr-11 bg-white border border-stone-200 rounded-xl text-sm text-stone-900 placeholder:text-stone-400 outline-none focus:border-pink-500 transition-colors"
                required
              />
              <button
                type="button"
                onClick={() => setShowNewPassword((prev) => !prev)}
                aria-label={showNewPassword ? 'Hide new password' : 'Show new password'}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 p-1 cursor-pointer"
              >
                {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div className="space-y-1.5 text-left">
            <label
              htmlFor="reset-confirm-password"
              className="block text-xs font-medium text-stone-700"
            >
              Confirm new password
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
                className="w-full h-11 pl-3.5 pr-11 bg-white border border-stone-200 rounded-xl text-sm text-stone-900 placeholder:text-stone-400 outline-none focus:border-pink-500 transition-colors"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((prev) => !prev)}
                aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 p-1 cursor-pointer"
              >
                {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Password Strength & Requirement Checklist */}
          <div className="p-4 rounded-xl bg-stone-50 border border-stone-200/80 space-y-2.5 text-left">
            <div className="flex items-center justify-between text-xs font-medium">
              <span className="text-stone-600">Password strength</span>
              <span
                className={
                  strength.label === 'Strong'
                    ? 'text-emerald-700 font-semibold'
                    : strength.label === 'Good'
                      ? 'text-amber-700 font-semibold'
                      : 'text-rose-700 font-semibold'
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
                      : 'bg-stone-200'
                  }`}
                />
              ))}
            </div>
            <ul className="grid grid-cols-2 gap-x-3 gap-y-1.5 pt-1 text-xs text-stone-600">
              <li className={`flex items-center gap-1.5 ${strength.checks.minLength ? 'text-emerald-700 font-medium' : ''}`}>
                <Check size={12} aria-hidden="true" /> 8+ characters
              </li>
              <li className={`flex items-center gap-1.5 ${strength.checks.hasUpper && strength.checks.hasLower ? 'text-emerald-700 font-medium' : ''}`}>
                <Check size={12} aria-hidden="true" /> Upper &amp; lowercase
              </li>
              <li className={`flex items-center gap-1.5 ${strength.checks.hasNumber ? 'text-emerald-700 font-medium' : ''}`}>
                <Check size={12} aria-hidden="true" /> At least 1 number
              </li>
              <li className={`flex items-center gap-1.5 ${strength.checks.hasSymbol ? 'text-emerald-700 font-medium' : ''}`}>
                <Check size={12} aria-hidden="true" /> Special symbol
              </li>
              <li className={`flex items-center gap-1.5 col-span-2 ${passwordsMatch ? 'text-emerald-700 font-medium' : ''}`}>
                <Check size={12} aria-hidden="true" /> Passwords match
              </li>
            </ul>
          </div>

          <button
            type="submit"
            disabled={submitting || !strength.valid || !passwordsMatch}
            className="w-full h-11 px-4 bg-pink-600 hover:bg-pink-700 text-white rounded-xl font-semibold text-sm transition-colors disabled:opacity-55 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" aria-hidden="true" />
                <span>Updating password...</span>
              </>
            ) : (
              <span>Save new password</span>
            )}
          </button>
        </form>
      )}

      {stage === 'completed' && (
        <div className="space-y-4 animate-fadeIn">
          <div
            role="status"
            className="w-full bg-emerald-50 text-emerald-900 p-4 rounded-xl border border-emerald-200 space-y-1"
          >
            <p className="text-sm font-semibold text-emerald-900">
              Your {LUMINA_BRAND_NAME} password has been changed.
            </p>
            <p className="text-xs text-emerald-800 leading-relaxed">
              You can now sign in with your new password across web, iOS, and Android.
            </p>
          </div>

          <button
            type="button"
            onClick={() => onBackToSignIn(verifiedEmail || undefined, true)}
            className="w-full h-11 px-4 bg-pink-600 hover:bg-pink-700 text-white rounded-xl font-semibold text-sm transition-colors cursor-pointer"
          >
            Sign in now
          </button>
        </div>
      )}
    </div>
  );
};
