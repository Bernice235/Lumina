import React, { useState } from 'react';
import { User } from '../types';
import { 
  QrCode, 
  Share2, 
  Copy, 
  MessageCircle, 
  Smartphone, 
  Check, 
  Heart
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { QrCodeCanvas } from './QrCodeCanvas';

interface CommunityInviteProps {
  user: User;
}

export const CommunityInvite: React.FC<CommunityInviteProps> = ({ user }) => {
  const [showQR, setShowQR] = useState(false);
  const [copied, setCopied] = useState(false);

  const getBaseUrl = () => {
    const envUrl = (import.meta as any).env?.VITE_PUBLIC_APP_URL;
    if (envUrl && envUrl.trim().length > 0) {
      return envUrl.trim().replace(/\/$/, "");
    }
    return window.location.origin.replace('://ais-dev-', '://ais-pre-');
  };

  const referralLink = `${getBaseUrl()}?ref=${user.id}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const getShareText = () => {
    return `Join me on Lumina, the modern, supportive cycle tracker and pregnancy sanctuary! 🌸 Here is my personal invite code: ${user.partnerCode || user.id}\nClick here to join: ${referralLink}`;
  };

  const shareWhatsApp = () => {
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(getShareText())}`;
    window.open(url, '_blank');
  };

  const shareSMS = () => {
    const url = `sms:?&body=${encodeURIComponent(getShareText())}`;
    window.open(url, '_blank');
  };

  return (
    <div className="bg-white dark:bg-[#1a1816] p-6 sm:p-8 rounded-2xl shadow-xs border border-stone-200/80 dark:border-[#2e2a26] space-y-6 max-w-2xl mx-auto" id="community-invite-container">
      {/* Header section */}
      <div className="flex items-start gap-4">
        <div className="bg-pink-50 dark:bg-pink-950/40 border border-pink-100 dark:border-pink-900/40 p-3 rounded-xl text-pink-600 dark:text-pink-400 shrink-0">
          <Share2 size={22} />
        </div>
        <div className="space-y-1">
          <h3 className="text-xl sm:text-2xl font-serif text-stone-900 dark:text-stone-100 font-bold">Invite Friends</h3>
          <p className="text-xs text-stone-500 dark:text-stone-400 leading-relaxed">
            Invite friends and sisters to join the sanctuary and experience Lumina together.
          </p>
        </div>
      </div>

      {/* Mode Details */}
      <div className="bg-[#faf8f6] dark:bg-[#23201d] p-4 sm:p-5 rounded-xl border border-stone-200/80 dark:border-[#342f2b] text-center">
        <p className="text-xs text-stone-700 dark:text-stone-300 leading-relaxed">
          Share Lumina with friends or colleagues so they can enjoy our cycle tracker, wellness insights, and calming soundscapes.
        </p>
      </div>

      {/* Share Actions */}
      <div className="space-y-3">
        <p className="text-[11px] font-semibold text-stone-500 dark:text-stone-400">Share options</p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            type="button"
            onClick={handleCopy}
            className={`py-3.5 px-3 rounded-xl font-semibold text-xs border transition-colors flex flex-col items-center justify-center gap-2 cursor-pointer ${
              copied
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900/50 text-emerald-700 dark:text-emerald-300'
                : 'bg-[#faf8f6] dark:bg-[#23201d] hover:border-pink-300 dark:hover:border-pink-800 border-stone-200/80 dark:border-[#342f2b] text-stone-700 dark:text-stone-200'
            }`}
          >
            {copied ? <Check size={16} /> : <Copy size={16} className="text-pink-600 dark:text-pink-400" />}
            <span>{copied ? 'Link Copied' : 'Copy Share Link'}</span>
          </button>

          <button
            type="button"
            onClick={shareWhatsApp}
            className="py-3.5 px-3 bg-[#faf8f6] dark:bg-[#23201d] hover:border-emerald-300 dark:hover:border-emerald-800 border border-stone-200/80 dark:border-[#342f2b] text-stone-700 dark:text-stone-200 rounded-xl font-semibold text-xs transition-colors flex flex-col items-center justify-center gap-2 cursor-pointer"
          >
            <MessageCircle size={16} className="text-emerald-600 dark:text-emerald-400" />
            <span>Share on WhatsApp</span>
          </button>

          <button
            type="button"
            onClick={shareSMS}
            className="py-3.5 px-3 bg-[#faf8f6] dark:bg-[#23201d] hover:border-blue-300 dark:hover:border-blue-800 border border-stone-200/80 dark:border-[#342f2b] text-stone-700 dark:text-stone-200 rounded-xl font-semibold text-xs transition-colors flex flex-col items-center justify-center gap-2 cursor-pointer"
          >
            <Smartphone size={16} className="text-blue-600 dark:text-blue-400" />
            <span>Share via SMS</span>
          </button>
        </div>
      </div>

      {/* QR Code toggle */}
      <div className="border-t border-stone-100 dark:border-[#2e2a26] pt-5 space-y-4">
        <button
          type="button"
          onClick={() => setShowQR(!showQR)}
          className="w-full py-3 bg-pink-600 hover:bg-pink-700 text-white font-semibold rounded-xl text-xs flex items-center justify-center gap-2 shadow-xs cursor-pointer transition-colors"
        >
          <QrCode size={15} />
          <span>{showQR ? 'Hide Invitation QR Code' : 'Show Invitation QR Code'}</span>
        </button>

        <AnimatePresence>
          {showQR && (
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              className="bg-[#faf8f6] dark:bg-[#23201d] border border-stone-200/80 dark:border-[#342f2b] p-6 sm:p-8 rounded-2xl flex flex-col items-center justify-center text-center space-y-4"
            >
              <div className="space-y-1">
                <p className="text-xs font-bold text-stone-900 dark:text-stone-100">
                  Friend Invitation QR
                </p>
                <p className="text-[11px] text-stone-500 dark:text-stone-400">
                  Scan with a phone camera to connect instantly
                </p>
              </div>

              <div className="qr-code-container bg-white p-4 rounded-2xl border border-stone-200/80 shadow-sm w-full max-w-[240px] aspect-square flex items-center justify-center overflow-hidden mx-auto">
                <QrCodeCanvas
                  value={referralLink}
                  size={220}
                  alt="Lumina Referral QR Code"
                />
              </div>

              <div className="bg-white dark:bg-[#1a1816] p-3.5 rounded-xl border border-stone-200/80 dark:border-[#342f2b] max-w-sm">
                <span className="text-[11px] font-medium text-stone-500 dark:text-stone-400 block mb-1.5">Invitation Code</span>
                <span className="text-xs font-mono font-bold text-pink-700 dark:text-pink-300 bg-pink-50 dark:bg-pink-950/40 px-3.5 py-1.5 rounded-lg border border-pink-200/80 dark:border-pink-900/40 select-all tracking-wider inline-block">
                  {user.partnerCode || user.id}
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
