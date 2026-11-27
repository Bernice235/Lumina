import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Download,
  Smartphone,
  Share,
  PlusSquare,
  Compass,
  X,
  ChevronRight,
  Flower2,
} from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  variant?: 'compact' | 'banner' | 'settings';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ variant = 'compact' }) => {
  const {
    isInstallable,
    isInstalled,
    isNative,
    isIOS,
    isMobile,
    isInAppBrowser,
    bannerDismissed,
    install,
    dismissBanner,
  } = usePWAInstall();
  const [showGuideModal, setShowGuideModal] = useState(false);

  // Never show when already installed as standalone PWA or running natively in iOS/Android app
  if (isInstalled || isNative) {
    return null;
  }

  // On desktop browsers that don't expose beforeinstallprompt, only show inside Settings or skip banner
  if (variant === 'banner' && (!isMobile || bannerDismissed)) {
    return null;
  }

  if (variant === 'compact' && !isInstallable && !isMobile) {
    return null;
  }

  const handleAction = async () => {
    if (isInstallable) {
      const accepted = await install();
      if (accepted) return;
    }
    setShowGuideModal(true);
  };

  const guideModal =
    showGuideModal && typeof document !== 'undefined'
      ? createPortal(
          <div
            className="fixed inset-0 z-[260] flex items-end sm:items-center justify-center bg-stone-950/55 backdrop-blur-xs p-0 sm:p-4"
            onClick={() => setShowGuideModal(false)}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="pwa-install-guide-title"
              onClick={(e) => e.stopPropagation()}
              className="w-full sm:max-w-md bg-white dark:bg-[#1a1816] border border-stone-200/80 dark:border-[#2e2a26] rounded-t-3xl sm:rounded-2xl p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-2xl space-y-5 animate-fadeIn"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <img
                    src="/icon-192.png"
                    alt="Lumina app icon"
                    className="w-12 h-12 rounded-2xl border border-pink-100 dark:border-[#2e2a26] shrink-0"
                  />
                  <div>
                    <h3
                      id="pwa-install-guide-title"
                      className="text-lg font-serif font-semibold text-stone-900 dark:text-stone-100"
                    >
                      Open Lumina Full-Screen
                    </h3>
                    <p className="text-xs text-stone-500 dark:text-stone-400">
                      Add Lumina to your Home Screen to hide browser bars.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowGuideModal(false)}
                  aria-label="Close install instructions"
                  className="w-8 h-8 rounded-xl bg-stone-100 dark:bg-[#23201d] text-stone-600 dark:text-stone-300 flex items-center justify-center hover:bg-stone-200 dark:hover:bg-[#2c2824] transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {isIOS ? (
                <ol className="space-y-2.5">
                  {(isInAppBrowser || true) && (
                    <li className="p-3.5 rounded-xl bg-[#faf8f6] dark:bg-[#23201d] border border-stone-200/80 dark:border-[#342f2b] flex items-start gap-3">
                      <span className="w-6 h-6 rounded-lg bg-pink-600 text-white text-xs font-semibold flex items-center justify-center shrink-0 tabular-nums">
                        1
                      </span>
                      <div className="text-xs text-stone-700 dark:text-stone-300 leading-relaxed">
                        If a browser link bar is showing, tap the{' '}
                        <strong className="inline-flex items-center gap-1 text-stone-900 dark:text-white">
                          <Compass className="w-3.5 h-3.5 text-pink-600 inline" />
                          Safari
                        </strong>{' '}
                        icon at the bottom right to open Lumina directly in Safari.
                      </div>
                    </li>
                  )}
                  <li className="p-3.5 rounded-xl bg-[#faf8f6] dark:bg-[#23201d] border border-stone-200/80 dark:border-[#342f2b] flex items-start gap-3">
                    <span className="w-6 h-6 rounded-lg bg-pink-600 text-white text-xs font-semibold flex items-center justify-center shrink-0 tabular-nums">
                      2
                    </span>
                    <div className="text-xs text-stone-700 dark:text-stone-300 leading-relaxed">
                      Tap the{' '}
                      <strong className="inline-flex items-center gap-1 text-stone-900 dark:text-white">
                        <Share className="w-3.5 h-3.5 text-pink-600 inline" />
                        Share
                      </strong>{' '}
                      button in the Safari toolbar.
                    </div>
                  </li>
                  <li className="p-3.5 rounded-xl bg-[#faf8f6] dark:bg-[#23201d] border border-stone-200/80 dark:border-[#342f2b] flex items-start gap-3">
                    <span className="w-6 h-6 rounded-lg bg-pink-600 text-white text-xs font-semibold flex items-center justify-center shrink-0 tabular-nums">
                      3
                    </span>
                    <div className="text-xs text-stone-700 dark:text-stone-300 leading-relaxed">
                      Scroll down and select{' '}
                      <strong className="inline-flex items-center gap-1 text-stone-900 dark:text-white">
                        <PlusSquare className="w-3.5 h-3.5 text-pink-600 inline" />
                        Add to Home Screen
                      </strong>
                      , then open Lumina from your Home Screen.
                    </div>
                  </li>
                </ol>
              ) : (
                <ol className="space-y-2.5">
                  <li className="p-3.5 rounded-xl bg-[#faf8f6] dark:bg-[#23201d] border border-stone-200/80 dark:border-[#342f2b] flex items-start gap-3">
                    <span className="w-6 h-6 rounded-lg bg-pink-600 text-white text-xs font-semibold flex items-center justify-center shrink-0 tabular-nums">
                      1
                    </span>
                    <p className="text-xs text-stone-700 dark:text-stone-300 leading-relaxed">
                      Open your browser menu (<strong className="text-stone-900 dark:text-white">⋮</strong> or{' '}
                      <strong className="text-stone-900 dark:text-white">⋯</strong>) in the corner of the screen.
                    </p>
                  </li>
                  <li className="p-3.5 rounded-xl bg-[#faf8f6] dark:bg-[#23201d] border border-stone-200/80 dark:border-[#342f2b] flex items-start gap-3">
                    <span className="w-6 h-6 rounded-lg bg-pink-600 text-white text-xs font-semibold flex items-center justify-center shrink-0 tabular-nums">
                      2
                    </span>
                    <p className="text-xs text-stone-700 dark:text-stone-300 leading-relaxed">
                      Tap <strong className="text-stone-900 dark:text-white">Install app</strong> or{' '}
                      <strong className="text-stone-900 dark:text-white">Add to Home screen</strong> so Lumina launches with zero URL bar.
                    </p>
                  </li>
                </ol>
              )}

              <button
                type="button"
                onClick={() => setShowGuideModal(false)}
                className="w-full h-11 rounded-xl bg-pink-600 hover:bg-pink-700 text-white text-xs font-semibold transition-colors cursor-pointer"
              >
                Got It
              </button>
            </div>
          </div>,
          document.body
        )
      : null;

  if (variant === 'banner') {
    return (
      <>
        <div className="mb-4 bg-white dark:bg-[#1a1816] border border-stone-200/80 dark:border-[#2e2a26] rounded-2xl p-3.5 shadow-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <img
              src="/icon-192.png"
              alt="Lumina"
              className="w-10 h-10 rounded-xl border border-pink-100 dark:border-[#2e2a26] shrink-0"
            />
            <div className="min-w-0">
              <p className="text-xs font-semibold text-stone-900 dark:text-stone-100 truncate">
                Use Lumina as a Phone App
              </p>
              <p className="text-[11px] text-stone-500 dark:text-stone-400 truncate">
                Launch full-screen with no browser bar
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handleAction}
              className="h-9 px-3 rounded-xl bg-pink-600 hover:bg-pink-700 text-white text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap"
            >
              {isInstallable ? 'Install' : 'How to Open'}
            </button>
            <button
              type="button"
              onClick={dismissBanner}
              aria-label="Dismiss install banner"
              className="w-8 h-8 rounded-xl text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-[#23201d] flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
        {guideModal}
      </>
    );
  }

  if (variant === 'settings') {
    return (
      <>
        <div className="space-y-2">
          <span className="text-[11px] font-semibold tracking-wide text-stone-500 dark:text-stone-400 ml-1">
            Mobile App Experience
          </span>
          <div className="bg-white dark:bg-[#1a1816] rounded-2xl border border-stone-200/80 dark:border-[#2e2a26] shadow-xs p-1.5 overflow-hidden">
            <button
              type="button"
              onClick={handleAction}
              className="w-full flex items-center justify-between p-3.5 hover:bg-stone-50 dark:hover:bg-[#23201d] transition-colors rounded-xl text-left group cursor-pointer"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-9 h-9 rounded-xl bg-pink-50 dark:bg-pink-950/40 text-pink-600 dark:text-pink-400 flex items-center justify-center shrink-0">
                  <Smartphone size={18} />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-stone-900 dark:text-stone-100 group-hover:text-pink-600 dark:group-hover:text-pink-400 transition-colors">
                    {isInstallable ? 'Install Lumina App' : 'Add to Home Screen'}
                  </h4>
                  <p className="text-xs text-stone-500 dark:text-stone-400">
                    Open Lumina full-screen without the website address bar
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-stone-400 group-hover:text-pink-600 transition-colors" />
            </button>
          </div>
        </div>
        {guideModal}
      </>
    );
  }

  // Compact variant (header / Auth bottom link)
  return (
    <>
      <button
        type="button"
        onClick={handleAction}
        className="h-9 px-3 rounded-xl bg-stone-50 dark:bg-[#23201d] hover:bg-stone-100 dark:hover:bg-[#2c2824] text-stone-800 dark:text-stone-200 border border-stone-200/80 dark:border-[#2e2a26] text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        title="Install Lumina App"
      >
        {isInstallable ? (
          <Download className="w-3.5 h-3.5 text-pink-600 dark:text-pink-400" />
        ) : (
          <Flower2 className="w-3.5 h-3.5 text-pink-600 dark:text-pink-400" />
        )}
        <span>{isInstallable ? 'Install App' : 'Add to Home'}</span>
      </button>
      {guideModal}
    </>
  );
};

export default PWAInstallButton;
