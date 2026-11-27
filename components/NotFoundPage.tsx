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
      className="min-h-[70vh] flex items-center justify-center px-4 py-12 bg-[#faf8f6] dark:bg-[#11100f]"
    >
      <div className="max-w-md w-full bg-white dark:bg-[#1a1816] border border-stone-200/80 dark:border-[#2e2a26] rounded-2xl p-7 sm:p-9 text-center shadow-sm space-y-6">
        <div className="mx-auto w-14 h-14 rounded-2xl bg-pink-50 dark:bg-pink-950/40 border border-pink-200/70 dark:border-pink-900/50 flex items-center justify-center text-2xl">
          <span role="img" aria-label="Cherry blossom">
            🌸
          </span>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold text-pink-600 dark:text-pink-400 tabular-nums">
            Error 404 • Page Not Found
          </p>
          <h1
            id="not-found-heading"
            className="text-2xl sm:text-3xl font-serif font-semibold text-stone-900 dark:text-stone-100"
          >
            Page Not Found
          </h1>
          <p className="text-sm text-stone-600 dark:text-stone-300 leading-relaxed">
            We couldn&apos;t find a page matching{' '}
            <code className="px-2 py-0.5 rounded-lg bg-[#faf8f6] dark:bg-[#23201d] text-pink-700 dark:text-pink-300 text-xs font-mono border border-stone-200/70 dark:border-[#342f2b] break-all">
              {requestedPath || '/'}
            </code>
            . Return to your dashboard below.
          </p>
        </div>

        <div className="space-y-2.5 pt-1">
          <button
            type="button"
            onClick={onGoHome}
            className="w-full py-3 px-5 rounded-xl bg-pink-600 hover:bg-pink-700 text-white text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-pink-400 flex items-center justify-center gap-2 cursor-pointer transition-colors"
          >
            <ArrowLeft size={16} aria-hidden="true" />
            <span>Return to Home Dashboard</span>
          </button>

          <div className="grid grid-cols-2 gap-2.5">
            {onGoCycle && (
              <button
                type="button"
                onClick={onGoCycle}
                className="py-2.5 px-3 rounded-xl bg-[#faf8f6] dark:bg-[#23201d] hover:bg-stone-100 dark:hover:bg-[#2c2824] text-stone-800 dark:text-stone-200 border border-stone-200/80 dark:border-[#342f2b] text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
              >
                <Calendar size={14} aria-hidden="true" />
                <span>Cycle Calendar</span>
              </button>
            )}
            {onGoPrivacy && (
              <button
                type="button"
                onClick={onGoPrivacy}
                className="py-2.5 px-3 rounded-xl bg-[#faf8f6] dark:bg-[#23201d] hover:bg-stone-100 dark:hover:bg-[#2c2824] text-stone-800 dark:text-stone-200 border border-stone-200/80 dark:border-[#342f2b] text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
              >
                <ShieldCheck size={14} aria-hidden="true" />
                <span>Privacy Vault</span>
              </button>
            )}
          </div>
        </div>

        <p className="text-xs text-stone-500 dark:text-stone-400 flex items-center justify-center gap-1.5 pt-1">
          <Sparkles size={13} className="text-pink-600 dark:text-pink-400" aria-hidden="true" />
          <span>Your cycle &amp; wellness records remain encrypted.</span>
        </p>
      </div>
    </main>
  );
};

export default NotFoundPage;
