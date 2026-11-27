import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

const BANNER_DISMISS_KEY = 'lumina_pwa_banner_dismissed_v1';

export function isRunningAsApp(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    if (Capacitor.isNativePlatform()) return true;
  } catch {
    // Ignore non-Capacitor context
  }
  const standaloneQuery = window.matchMedia?.('(display-mode: standalone)').matches;
  const iosStandalone = (window.navigator as unknown as { standalone?: boolean }).standalone === true;
  const androidAppRef = typeof document !== 'undefined' && document.referrer.startsWith('android-app://');
  return Boolean(standaloneQuery || iosStandalone || androidAppRef);
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState<boolean>(() => isRunningAsApp());
  const [isNative] = useState<boolean>(() => {
    try {
      return Capacitor.isNativePlatform();
    } catch {
      return false;
    }
  });
  const [isIOS, setIsIOS] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isInAppBrowser, setIsInAppBrowser] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(BANNER_DISMISS_KEY) === 'true';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    setIsInstalled(isRunningAsApp());

    const ua = window.navigator.userAgent || '';
    const lowerUa = ua.toLowerCase();
    const iosDevice =
      /iphone|ipad|ipod/.test(lowerUa) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const mobileDevice = iosDevice || /android|mobile/i.test(lowerUa);
    const inApp =
      /instagram|fban|fbav|line\/|twitter|micromessenger|gsa\/|crios.*edge|snapchat/i.test(lowerUa) ||
      (iosDevice && !/safari/i.test(lowerUa));

    setIsIOS(iosDevice);
    setIsMobile(mobileDevice);
    setIsInAppBrowser(inApp);

    const mediaQuery = window.matchMedia?.('(display-mode: standalone)');
    const handleDisplayChange = () => setIsInstalled(isRunningAsApp());
    mediaQuery?.addEventListener?.('change', handleDisplayChange);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      mediaQuery?.removeEventListener?.('change', handleDisplayChange);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const install = async () => {
    if (!deferredPrompt) return false;
    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
        setDeferredPrompt(null);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const dismissBanner = () => {
    setBannerDismissed(true);
    try {
      localStorage.setItem(BANNER_DISMISS_KEY, 'true');
    } catch {
      // Ignore storage failures
    }
  };

  return {
    isInstallable: Boolean(deferredPrompt),
    isInstalled,
    isNative,
    isIOS,
    isMobile,
    isInAppBrowser,
    bannerDismissed,
    install,
    dismissBanner,
  };
}
