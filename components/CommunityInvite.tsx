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
    return window.location.origin;
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
    <div className="bg-white p-6 sm:p-8 rounded-[2.5rem] shadow-sm border border-pink-50 space-y-6 max-w-2xl mx-auto" id="community-invite-container">
      {/* Header section */}
      <div className="flex items-start gap-4">
        <div className="bg-pink-100 p-3.5 rounded-2xl text-pink-500 shrink-0">
          <Share2 size={24} />
        </div>
        <div className="space-y-1">
          <h3 className="text-2xl font-serif text-pink-600 italic font-bold">Invite Friends</h3>
          <p className="text-xs text-gray-500 leading-relaxed font-serif">
            Invite friends and sisters to join the sanctuary and experience Lumina together.
          </p>
        </div>
      </div>

      {/* Mode Details */}
      <div className="bg-pink-50/20 p-5 rounded-3xl border border-pink-100/30 text-center space-y-2">
        <p className="text-xs text-pink-950 font-serif italic">
          Share Lumina with other sisters, friends or colleagues so they can enjoy our beautiful period tracker & soundscapes.
        </p>
      </div>

      {/* Share Actions */}
      <div className="space-y-3">
        <p className="text-[10px] font-bold text-pink-400 uppercase tracking-wider">Share options</p>
        
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            onClick={handleCopy}
            className={`py-3.5 px-3 rounded-2xl font-bold text-[9px] uppercase tracking-widest border transition-all flex flex-col items-center justify-center gap-2 cursor-pointer ${
              copied 
                ? 'bg-emerald-50 border-emerald-200 text-emerald-600 shadow-sm shadow-emerald-50' 
                : 'bg-white hover:bg-pink-50/20 border-pink-100 text-pink-500'
            }`}
          >
            {copied ? <Check size={16} /> : <Copy size={16} />}
            <span>{copied ? 'Copied!' : 'Copy Share Link'}</span>
          </button>

          <button
            onClick={shareWhatsApp}
            className="py-3.5 px-3 bg-white hover:bg-emerald-50/20 border border-pink-100 text-pink-500 rounded-2xl font-bold text-[9px] uppercase tracking-widest transition-all flex flex-col items-center justify-center gap-2 cursor-pointer"
          >
            <MessageCircle size={16} className="text-emerald-500" />
            <span>Share WhatsApp</span>
          </button>

          <button
            onClick={shareSMS}
            className="py-3.5 px-3 bg-white hover:bg-blue-50/20 border border-pink-100 text-pink-500 rounded-2xl font-bold text-[9px] uppercase tracking-widest transition-all flex flex-col items-center justify-center gap-2 cursor-pointer"
          >
            <Smartphone size={16} className="text-blue-500" />
            <span>Share via SMS</span>
          </button>
        </div>
      </div>

      {/* QR Code toggle */}
      <div className="border-t border-pink-50 pt-5 space-y-4">
        <button
          onClick={() => setShowQR(!showQR)}
          className="w-full py-3.5 bg-gradient-to-r from-pink-500 to-rose-450 text-white font-bold rounded-2xl text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 shadow-md shadow-pink-100 cursor-pointer transition-all"
        >
          <QrCode size={14} />
          <span>{showQR ? 'Hide Invitation QR Code' : 'Show Invitation QR Code'}</span>
        </button>

        <AnimatePresence>
          {showQR && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-rose-50/15 border border-pink-100/30 p-6 sm:p-8 rounded-[2.5rem] flex flex-col items-center justify-center text-center space-y-4 shadow-inner"
            >
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-pink-600 uppercase tracking-widest">
                  Friend Invitation QR
                </p>
                <p className="text-[9px] text-gray-400 font-serif leading-none italic">
                  Let them scan with their phone camera to connect instantly
                </p>
              </div>

              <div className="qr-code-container bg-white p-4 rounded-[2rem] border border-pink-100 shadow-lg w-full max-w-[240px] aspect-square flex items-center justify-center overflow-hidden mx-auto">
                <img 
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&color=db2777&data=${encodeURIComponent(referralLink)}`} 
                  alt="Lumina Referral QR Code"
                  className="w-full h-full object-contain block"
                  referrerPolicy="no-referrer"
                />
              </div>

              <div className="bg-white/80 p-3.5 rounded-2xl border border-pink-50 max-w-sm">
                <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Invitation Code:</span>
                <span className="text-xs font-mono font-bold text-pink-700 bg-pink-50/50 px-3.5 py-1.5 rounded-lg border border-pink-100 select-all tracking-widest">
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
