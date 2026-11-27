import React, { useEffect, useState } from 'react';
import { Cookie, ShieldCheck, Sliders, X, Check } from 'lucide-react';
import {
  CookieConsentState,
  getCookieConsent,
  setCookieConsent,
} from '../services/analyticsService';
import { isRunningAsApp } from '../hooks/usePWAInstall';

interface CookieConsentBannerProps {
  onConsentUpdated?: (state: CookieConsentState) => void;
}

export const CookieConsentBanner: React.FC<CookieConsentBannerProps> = ({
  onConsentUpdated,
}) => {
  const [consent, setConsent] = useState<CookieConsentState>(() => getCookieConsent());
  const [isVisible, setIsVisible] = useState<boolean>(
    () => !getCookieConsent().decided && !isRunningAsApp()
  );
  const [showCustomize, setShowCustomize] = useState<boolean>(false);

  const [analyticsOptIn, setAnalyticsOptIn] = useState<boolean>(consent.analytics);
  const [performanceOptIn, setPerformanceOptIn] = useState<boolean>(consent.performance);
  const [personalizationOptIn, setPersonalizationOptIn] = useState<boolean>(
    consent.personalization
  );

  useEffect(() => {
    const handleOpenCustomizer = () => {
      const latest = getCookieConsent();
      setConsent(latest);
      setAnalyticsOptIn(latest.analytics);
      setPerformanceOptIn(latest.performance);
      setPersonalizationOptIn(latest.personalization);
      setIsVisible(true);
      setShowCustomize(true);
    };
    window.addEventListener('lumina:open-cookie-settings', handleOpenCustomizer);
    return () => {
      window.removeEventListener('lumina:open-cookie-settings', handleOpenCustomizer);
    };
  }, []);

  const applyConsent = (next: {
    analytics: boolean;
    performance: boolean;
    personalization: boolean;
  }) => {
    const updated = setCookieConsent({ ...next, decided: true });
    setConsent(updated);
    setAnalyticsOptIn(updated.analytics);
    setPerformanceOptIn(updated.performance);
    setPersonalizationOptIn(updated.personalization);
    setIsVisible(false);
    setShowCustomize(false);
    onConsentUpdated?.(updated);
  };

  if (!isVisible) return null;

  return (
    <div
      role="dialog"
      aria-modal={showCustomize ? 'true' : 'false'}
      aria-label="Cookie and Privacy Preferences"
      className="fixed bottom-[calc(4.75rem+env(safe-area-inset-bottom))] md:bottom-4 inset-x-3 sm:inset-x-auto sm:right-5 sm:max-w-md z-[130] animate-fadeIn"
    >
      {!showCustomize ? (
        <div className="bg-white/95 dark:bg-[#1a1816]/95 backdrop-blur-xl border border-stone-200/80 dark:border-[#2e2a26] rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-pink-50 dark:bg-pink-950/40 border border-pink-100 dark:border-pink-900/40 flex items-center justify-center text-pink-600 dark:text-pink-400 shrink-0">
              <Cookie size={20} aria-hidden="true" />
            </div>
            <div className="space-y-1 flex-1">
              <h2 className="text-sm font-serif font-bold text-stone-900 dark:text-stone-100">
                Your Privacy &amp; Storage Choices
              </h2>
              <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed">
                Lumina uses strictly essential storage to keep your cycle sanctuary secure. Optional analytics and performance checks only run if you choose to enable them.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <button
              type="button"
              onClick={() =>
                applyConsent({ analytics: true, performance: true, personalization: true })
              }
              className="flex-1 py-2.5 px-4 rounded-xl bg-pink-600 hover:bg-pink-700 text-white text-xs font-semibold shadow-xs focus:outline-none cursor-pointer transition-colors"
            >
              Accept All
            </button>
            <button
              type="button"
              onClick={() =>
                applyConsent({ analytics: false, performance: false, personalization: false })
              }
              className="flex-1 py-2.5 px-4 rounded-xl bg-stone-100 dark:bg-[#23201d] hover:bg-stone-200 dark:hover:bg-[#2c2824] text-stone-800 dark:text-stone-200 text-xs font-semibold focus:outline-none cursor-pointer transition-colors"
            >
              Essential Only
            </button>
            <button
              type="button"
              onClick={() => setShowCustomize(true)}
              className="py-2.5 px-3.5 rounded-xl border border-stone-200 dark:border-[#2e2a26] text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-[#23201d] text-xs font-semibold flex items-center justify-center gap-1.5 focus:outline-none cursor-pointer transition-colors"
            >
              <Sliders size={14} aria-hidden="true" />
              <span>Customize</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-[#1a1816] border border-stone-200/80 dark:border-[#2e2a26] rounded-2xl p-5 sm:p-6 shadow-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-pink-100 pb-3">
            <div className="flex items-center gap-2">
              <ShieldCheck size={18} className="text-pink-600" aria-hidden="true" />
              <h2 className="text-base font-serif font-bold text-stone-900">
                Customize Privacy & Cookies
              </h2>
            </div>
            <button
              type="button"
              aria-label="Close cookie preferences"
              onClick={() => {
                if (consent.decided) {
                  setIsVisible(false);
                }
                setShowCustomize(false);
              }}
              className="w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-700 flex items-center justify-center cursor-pointer"
            >
              <X size={15} />
            </button>
          </div>

          <div className="space-y-3 max-h-[55vh] overflow-y-auto pr-1">
            <div className="p-3.5 rounded-2xl bg-pink-50/40 border border-pink-100 flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-stone-900">Strictly Essential Cookies</p>
                <p className="text-[11px] text-stone-600 mt-0.5 leading-relaxed">
                  Required for authentication, 2FA verification, encrypted local storage, and saving your cycle records.
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold shrink-0">
                Always Active
              </span>
            </div>

            <label className="p-3.5 rounded-2xl bg-white border border-stone-200 flex items-start justify-between gap-3 cursor-pointer hover:border-pink-200">
              <div>
                <span className="text-xs font-bold text-stone-900 block">
                  Privacy-Safe Analytics
                </span>
                <span className="text-[11px] text-stone-600 mt-0.5 block leading-relaxed">
                  Counts anonymized navigation visits and feature usage without collecting diary text or personal health notes.
                </span>
              </div>
              <input
                type="checkbox"
                checked={analyticsOptIn}
                onChange={(e) => setAnalyticsOptIn(e.target.checked)}
                className="mt-1 h-4 w-4 accent-pink-600 rounded"
              />
            </label>

            <label className="p-3.5 rounded-2xl bg-white border border-stone-200 flex items-start justify-between gap-3 cursor-pointer hover:border-pink-200">
              <div>
                <span className="text-xs font-bold text-stone-900 block">
                  Performance & Crash Diagnostics
                </span>
                <span className="text-[11px] text-stone-600 mt-0.5 block leading-relaxed">
                  Measures page speed (LCP/CLS) and anonymized app stability diagnostics to keep Lumina fast.
                </span>
              </div>
              <input
                type="checkbox"
                checked={performanceOptIn}
                onChange={(e) => setPerformanceOptIn(e.target.checked)}
                className="mt-1 h-4 w-4 accent-pink-600 rounded"
              />
            </label>

            <label className="p-3.5 rounded-2xl bg-white border border-stone-200 flex items-start justify-between gap-3 cursor-pointer hover:border-pink-200">
              <div>
                <span className="text-xs font-bold text-stone-900 block">
                  Wellness Personalization
                </span>
                <span className="text-[11px] text-stone-600 mt-0.5 block leading-relaxed">
                  Remembers your theme, companion voice tone, and calm soundscape preferences across visits.
                </span>
              </div>
              <input
                type="checkbox"
                checked={personalizationOptIn}
                onChange={(e) => setPersonalizationOptIn(e.target.checked)}
                className="mt-1 h-4 w-4 accent-pink-600 rounded"
              />
            </label>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-stone-100">
            <button
              type="button"
              onClick={() =>
                applyConsent({
                  analytics: analyticsOptIn,
                  performance: performanceOptIn,
                  personalization: personalizationOptIn,
                })
              }
              className="flex-1 py-2.5 px-4 rounded-2xl bg-gradient-to-r from-pink-500 to-rose-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm hover:opacity-95 cursor-pointer"
            >
              <Check size={14} aria-hidden="true" />
              <span>Save My Preferences</span>
            </button>
            <button
              type="button"
              onClick={() =>
                applyConsent({ analytics: false, performance: false, personalization: false })
              }
              className="py-2.5 px-4 rounded-2xl bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold cursor-pointer"
            >
              Reject All Optional
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CookieConsentBanner;
