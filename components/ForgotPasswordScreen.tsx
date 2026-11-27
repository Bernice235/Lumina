import React, { useEffect, useState } from 'react';
import { ArrowLeft, CheckCircle2, Clock, Mail, ShieldCheck } from 'lucide-react';
import {
  LUMINA_BRAND_NAME,
  requestFirebasePasswordReset,
} from '../services/passwordResetService';
import {
  isHoneypotTriggered,
  isValidEmailAddress,
  sanitizeTextInput,
} from '../services/securityService';

interface ForgotPasswordScreenProps {
  initialEmail?: string;
  onEmailChange?: (email: string) => void;
  onBackToSignIn: () => void;
}

export const ForgotPasswordScreen: React.FC<ForgotPasswordScreenProps> = ({
  initialEmail = '',
  onEmailChange,
  onBackToSignIn,
}) => {
  const [emailInput, setEmailInput] = useState(() => sanitizeTextInput(initialEmail, 160));
  const [honeypot, setHoneypot] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [cooldownSec, setCooldownSec] = useState(0);

  useEffect(() => {
    const prevTitle = document.title;
    document.title = `Forgot Password — ${LUMINA_BRAND_NAME}`;
    return () => {
      document.title = prevTitle;
    };
  }, []);

  useEffect(() => {
    if (cooldownSec <= 0) return;
    const timer = window.setInterval(() => {
      setCooldownSec((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [cooldownSec]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (isHoneypotTriggered(honeypot)) {
      setError('Submission rejected. Please refresh and try again.');
      return;
    }

    if (cooldownSec > 0) {
      setError(`Please wait ${cooldownSec}s before requesting another reset link.`);
      return;
    }

    const cleanEmail = sanitizeTextInput(emailInput, 160).toLowerCase();
    if (!isValidEmailAddress(cleanEmail)) {
      setError('Please enter a valid email address.');
      return;
    }

    setLoading(true);
    try {
      const result = await requestFirebasePasswordReset(cleanEmail);
      if (result.ok) {
        setSuccessMessage(result.message);
        setCooldownSec(result.cooldownSec || 60);
        onEmailChange?.(cleanEmail);
      } else {
        setError(result.message);
        if (result.cooldownSec && result.cooldownSec > 0) {
          setCooldownSec(result.cooldownSec);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn w-full" data-testid="forgot-password-screen">
      <button
        type="button"
        onClick={onBackToSignIn}
        className="inline-flex items-center gap-1.5 text-xs font-medium text-stone-600 hover:text-stone-900 transition-colors cursor-pointer"
      >
        <ArrowLeft size={14} aria-hidden="true" /> Back to sign in
      </button>

      <div className="space-y-2 text-left">
        <div className="w-10 h-10 rounded-xl bg-pink-50 border border-pink-200/70 text-pink-600 flex items-center justify-center">
          <Mail size={18} aria-hidden="true" />
        </div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-pink-700 pt-1">
          {LUMINA_BRAND_NAME}
        </p>
        <h2 className="text-2xl font-serif font-semibold text-stone-900 tracking-tight">
          Reset your password
        </h2>
        <p className="text-sm text-stone-600 leading-relaxed">
          Enter the email associated with your account and we&apos;ll send secure recovery instructions.
        </p>
      </div>

      {error && (
        <div
          role="alert"
          className="w-full bg-rose-50 text-rose-800 text-xs font-medium p-3.5 rounded-xl border border-rose-200 animate-fadeIn leading-relaxed"
        >
          {error}
        </div>
      )}

      {successMessage ? (
        <div className="space-y-4 animate-fadeIn">
          <div
            role="status"
            className="w-full bg-emerald-50 text-emerald-900 p-4 rounded-xl border border-emerald-200 space-y-1.5"
          >
            <div className="flex items-center gap-2 text-emerald-800 font-semibold text-sm">
              <CheckCircle2 size={16} aria-hidden="true" />
              <span>Reset request sent</span>
            </div>
            <p className="text-xs leading-relaxed text-emerald-800">{successMessage}</p>
          </div>

          <div className="bg-stone-50 border border-stone-200/80 rounded-xl p-4 text-xs text-stone-600 space-y-1.5">
            <p className="font-semibold text-stone-800 flex items-center gap-1.5">
              <ShieldCheck size={14} className="text-pink-600" aria-hidden="true" />
              Helpful tips
            </p>
            <p className="leading-relaxed">
              Check your Spam or Promotions folder if you don&apos;t see the message within a couple of minutes. Reset links expire automatically for your privacy.
            </p>
          </div>

          <div className="space-y-2.5 pt-1">
            <button
              type="button"
              disabled={loading || cooldownSec > 0}
              onClick={handleSubmit}
              className="w-full h-11 px-4 bg-white border border-stone-200 text-stone-800 hover:bg-stone-50 rounded-xl font-semibold text-sm transition-colors disabled:opacity-55 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
            >
              {cooldownSec > 0 ? (
                <>
                  <Clock size={14} aria-hidden="true" />
                  <span className="tabular-nums">Resend available in {cooldownSec}s</span>
                </>
              ) : (
                <span>Send another reset link</span>
              )}
            </button>

            <button
              type="button"
              onClick={onBackToSignIn}
              className="w-full h-11 px-4 bg-pink-600 hover:bg-pink-700 text-white rounded-xl font-semibold text-sm transition-colors cursor-pointer"
            >
              Return to sign in
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div className="hidden" aria-hidden="true">
            <label htmlFor="forgot-pw-website">Website</label>
            <input
              id="forgot-pw-website"
              name="website"
              type="text"
              tabIndex={-1}
              autoComplete="off"
              value={honeypot}
              onChange={(e) => setHoneypot(e.target.value)}
            />
          </div>

          <div className="space-y-1.5 text-left">
            <label
              htmlFor="forgot-password-email"
              className="block text-xs font-medium text-stone-700"
            >
              Email address
            </label>
            <input
              id="forgot-password-email"
              type="email"
              autoComplete="email"
              placeholder="name@example.com"
              value={emailInput}
              onChange={(e) => {
                setEmailInput(e.target.value);
                onEmailChange?.(e.target.value);
                if (error) setError('');
              }}
              className="w-full h-11 px-3.5 bg-white border border-stone-200 rounded-xl text-sm text-stone-900 placeholder:text-stone-400 outline-none focus:border-pink-500 transition-colors"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading || cooldownSec > 0}
            className="w-full h-11 px-4 bg-pink-600 hover:bg-pink-700 text-white rounded-xl font-semibold text-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" aria-hidden="true" />
                <span>Sending reset link...</span>
              </>
            ) : cooldownSec > 0 ? (
              <span className="tabular-nums">Please wait {cooldownSec}s</span>
            ) : (
              <span>Send reset link</span>
            )}
          </button>

          <div className="text-center pt-1">
            <button
              type="button"
              onClick={onBackToSignIn}
              className="text-xs font-medium text-pink-700 hover:underline cursor-pointer"
            >
              Remembered your password? Sign in
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
