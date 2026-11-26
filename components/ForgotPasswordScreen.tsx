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
    <div className="space-y-5 animate-fadeIn w-full" data-testid="forgot-password-screen">
      <button
        type="button"
        onClick={onBackToSignIn}
        className="inline-flex items-center gap-1.5 text-[10px] font-sans font-bold uppercase tracking-widest text-pink-700 hover:text-pink-900 cursor-pointer"
      >
        <ArrowLeft size={12} aria-hidden="true" /> Back to Sign In
      </button>

      <div className="text-center space-y-1.5">
        <div className="w-11 h-11 rounded-2xl bg-pink-50 border border-pink-100 text-pink-600 flex items-center justify-center mx-auto shadow-xs">
          <Mail size={20} aria-hidden="true" />
        </div>
        <p className="text-[9px] font-extrabold uppercase tracking-[0.22em] text-pink-500">
          {LUMINA_BRAND_NAME}
        </p>
        <h2 className="text-2xl font-serif text-pink-950 font-bold italic">
          Reset Your Password
        </h2>
        <p className="text-xs text-stone-600 leading-relaxed px-2">
          Enter the email associated with your account and we&apos;ll send secure recovery instructions.
        </p>
      </div>

      {error && (
        <div
          role="alert"
          className="w-full bg-rose-50 text-rose-700 text-[11px] text-center font-medium p-3.5 rounded-2xl border border-rose-200 animate-fadeIn leading-relaxed"
        >
          {error}
        </div>
      )}

      {successMessage ? (
        <div className="space-y-4 animate-fadeIn">
          <div
            role="status"
            className="w-full bg-emerald-50/90 text-emerald-900 p-4 rounded-2xl border border-emerald-200 space-y-2 text-center"
          >
            <div className="flex items-center justify-center gap-1.5 text-emerald-700 font-bold text-xs">
              <CheckCircle2 size={16} aria-hidden="true" />
              <span>Reset Request Sent</span>
            </div>
            <p className="text-[11px] leading-relaxed text-emerald-800">{successMessage}</p>
          </div>

          <div className="bg-pink-50/40 border border-pink-100 rounded-2xl p-3.5 text-[11px] text-stone-600 space-y-1.5">
            <p className="font-bold text-pink-900 text-[10px] uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck size={13} className="text-pink-600" aria-hidden="true" />
              Helpful Tips
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
              className="w-full py-3.5 bg-white border border-pink-200 text-pink-700 hover:bg-pink-50/50 rounded-2xl font-bold text-[10px] uppercase tracking-widest transition-all disabled:opacity-55 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
            >
              {cooldownSec > 0 ? (
                <>
                  <Clock size={13} aria-hidden="true" />
                  <span>Resend available in {cooldownSec}s</span>
                </>
              ) : (
                <span>Send Another Reset Link</span>
              )}
            </button>

            <button
              type="button"
              onClick={onBackToSignIn}
              className="w-full py-4 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-2xl font-bold text-xs uppercase tracking-[0.15em] shadow-md shadow-pink-100 hover:opacity-95 active:scale-95 transition-all cursor-pointer"
            >
              Return to Sign In
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3.5 pt-1" noValidate>
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
              className="block text-[10px] font-bold text-pink-800 uppercase tracking-wider px-1"
            >
              Email Address
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
              className="w-full px-5 py-4 bg-white/85 border border-pink-200 rounded-2xl text-xs font-semibold text-stone-900 placeholder:text-stone-400 outline-none focus:border-pink-400 transition-colors"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading || cooldownSec > 0}
            className="w-full py-4 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-2xl font-bold text-xs uppercase tracking-[0.15em] shadow-md shadow-pink-100 hover:opacity-95 active:scale-95 transition-all disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" aria-hidden="true" />
                <span>Sending Reset Link...</span>
              </>
            ) : cooldownSec > 0 ? (
              <span>Please wait {cooldownSec}s</span>
            ) : (
              <span>Send Reset Link</span>
            )}
          </button>

          <div className="text-center pt-1">
            <button
              type="button"
              onClick={onBackToSignIn}
              className="text-[10px] font-bold uppercase tracking-widest text-pink-600 hover:underline cursor-pointer"
            >
              Remembered your password? Sign In
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
