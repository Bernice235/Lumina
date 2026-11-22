import React from 'react';
import { ArrowLeft, Calendar, ShieldCheck, Sparkles } from 'lucide-react';

interface NotFoundPageProps {
  requestedPath: string;
  onGoHome: () => void;
  onGoCycle?: () => void;
  onGoPrivacy?: () => void;
}

export const NotFoundPage: React.FC<NotFoundPageProps> = ({
  requestedPath,
  onGoHome,
  onGoCycle,
  onGoPrivacy,
}) => {
  return (
    <main
      role="main"
      aria-labelledby="not-found-heading"
      className="min-h-[70vh] flex items-center justify-center px-4 py-12"
    >
      <div className="max-w-md w-full bg-white/95 border border-pink-100 rounded-[2.5rem] p-8 sm:p-10 text-center shadow-[0_24px_60px_rgba(244,114,182,0.1)] space-y-6">
        <div className="mx-auto w-16 h-16 rounded-3xl bg-gradient-to-tr from-pink-100 to-purple-100 border border-pink-200 flex items-center justify-center text-3xl">
          <span role="img" aria-label="Cherry blossom">
            🌸
          </span>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-widest text-pink-700">
            Error 404 • Page Not Found
          </p>
          <h1
            id="not-found-heading"
            className="text-3xl font-serif font-bold text-stone-900"
          >
            This Sanctuary Path Doesn&apos;t Exist
          </h1>
          <p className="text-sm text-stone-600 leading-relaxed">
            We couldn&apos;t find a page matching{' '}
            <code className="px-2 py-0.5 rounded-lg bg-pink-50 text-pink-800 text-xs font-mono break-all">
              {requestedPath || '/'}
            </code>
            . Let&apos;s gently bring you back to your dashboard.
          </p>
        </div>

        <div className="space-y-3 pt-2">
          <button
            type="button"
            onClick={onGoHome}
            className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-pink-500 to-rose-500 text-white text-sm font-bold shadow-md shadow-pink-100 hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-pink-400 flex items-center justify-center gap-2 cursor-pointer transition-all"
          >
            <ArrowLeft size={16} aria-hidden="true" />
            <span>Return to Home Dashboard</span>
          </button>

          <div className="grid grid-cols-2 gap-2.5">
            {onGoCycle && (
              <button
                type="button"
                onClick={onGoCycle}
                className="py-2.5 px-3 rounded-2xl bg-pink-50 hover:bg-pink-100 text-pink-800 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
              >
                <Calendar size={14} aria-hidden="true" />
                <span>Cycle Calendar</span>
              </button>
            )}
            {onGoPrivacy && (
              <button
                type="button"
                onClick={onGoPrivacy}
                className="py-2.5 px-3 rounded-2xl bg-purple-50 hover:bg-purple-100 text-purple-900 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
              >
                <ShieldCheck size={14} aria-hidden="true" />
                <span>Privacy Vault</span>
              </button>
            )}
          </div>
        </div>

        <p className="text-xs text-stone-500 flex items-center justify-center gap-1.5 pt-2">
          <Sparkles size={13} className="text-pink-600" aria-hidden="true" />
          <span>Your cycle &amp; wellness records remain safely encrypted.</span>
        </p>
      </div>
    </main>
  );
};

export default NotFoundPage;
