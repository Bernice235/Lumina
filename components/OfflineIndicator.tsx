import React from 'react';
import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-20 md:bottom-5 left-4 z-[140] flex items-center gap-2 rounded-xl bg-stone-900 dark:bg-[#23201d] text-white border border-stone-700/80 dark:border-[#342f2b] px-3.5 py-2 text-xs font-medium shadow-lg"
    >
      <WifiOff className="w-3.5 h-3.5 text-amber-400 shrink-0" aria-hidden="true" />
      <span>Offline Mode — Encrypted local records active</span>
    </div>
  );
};

export default OfflineIndicator;
