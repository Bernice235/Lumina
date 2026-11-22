import React, { useEffect, useState } from 'react';
import { Cookie, ShieldCheck, Sliders, X, Check } from 'lucide-react';
import {
  CookieConsentState,
  getCookieConsent,
  setCookieConsent,
} from '../services/analyticsService';

interface CookieConsentBannerProps {
  onConsentUpdated?: (state: CookieConsentState) => void;
}

export const CookieConsentBanner: React.FC<CookieConsentBannerProps> = ({
  onConsentUpdated,
}) => {
  const [consent, setConsent] = useState<CookieConsentState>(() => getCookieConsent());
  const [isVisible, setIsVisible] = useState<boolean>(() => !getCookieConsent().decided);
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
      className="fixed bottom-4 inset-x-3 sm:inset-x-auto sm:right-5 sm:max-w-md z-[130] animate-fadeIn"
    >
      {!showCustomize ? (
        <div className="bg-white/95 backdrop-blur-xl border border-pink-200 rounded-3xl p-5 shadow-[0_20px_50px_rgba(219,39,119,0.16)] space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-2xl bg-pink-50 border border-pink-100 flex items-center justify-center text-pink-600 shrink-0">
              <Cookie size={20} aria-hidden="true" />
            </div>
            <div className="space-y-1 flex-1">
              <h2 className="text-sm font-serif font-bold text-stone-900">
                Your Privacy & Cookie Choices
              </h2>
              <p className="text-xs text-stone-600 leading-relaxed">
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
              className="flex-1 py-2.5 px-4 rounded-2xl bg-gradient-to-r from-pink-500 to-rose-500 text-white text-xs font-bold tracking-wide shadow-sm hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-pink-400 cursor-pointer transition-all"
            >
              Accept All
            </button>
            <button
              type="button"
              onClick={() =>
                applyConsent({ analytics: false, performance: false, personalization: false })
              }
              className="flex-1 py-2.5 px-4 rounded-2xl bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold tracking-wide focus:outline-none focus:ring-2 focus:ring-stone-400 cursor-pointer transition-all"
            >
              Reject Non-Essential
            </button>
            <button
              type="button"
              onClick={() => setShowCustomize(true)}
              className="py-2.5 px-3.5 rounded-2xl border border-pink-200 text-pink-700 hover:bg-pink-50 text-xs font-bold flex items-center justify-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-pink-300 cursor-pointer transition-all"
            >
              <Sliders size={14} aria-hidden="true" />
              <span>Customize</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-pink-200 rounded-3xl p-5 sm:p-6 shadow-[0_24px_60px_rgba(15,23,42,0.18)] space-y-4">
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
