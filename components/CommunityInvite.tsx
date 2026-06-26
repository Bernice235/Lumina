import React, { useState } from 'react';
import { User } from '../types';
import { 
  QrCode, 
  Share2, 
  Copy, 
  MessageCircle, 
  Smartphone, 
  Check, 
  Camera
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface CommunityInviteProps {
  user: User;
  themeColor?: string;
}

export const CommunityInvite: React.FC<CommunityInviteProps> = ({ user }) => {
  const [showQR, setShowQR] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showIGInfo, setShowIGInfo] = useState(false);

  // Generate unique link using the configured public app URL if available, falling back to window.location.origin
  const getBaseUrl = () => {
    const envUrl = (import.meta as any).env?.VITE_PUBLIC_APP_URL;
    if (envUrl && envUrl.trim().length > 0) {
      return envUrl.trim().replace(/\/$/, "");
    }
    return window.location.origin;
  };

  const inviteLink = `${getBaseUrl()}?ref=${user.id}&code=${user.partnerCode || user.id}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const shareText = `Join me on Lumina, the modern, supportive cycle tracker and pregnancy sanctuary! 🌸 Here is my personal invite code: ${user.partnerCode || user.id}\nClick here to join: ${inviteLink}`;

  const shareWhatsApp = () => {
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;
    window.open(url, '_blank');
  };

  const shareSMS = () => {
    const url = `sms:?&body=${encodeURIComponent(shareText)}`;
    window.open(url, '_blank');
  };

  const shareInstagram = () => {
    setShowIGInfo(true);
  };

  return (
    <div className="bg-white p-6 sm:p-8 rounded-[2.5rem] shadow-sm border border-pink-50 space-y-6 max-w-2xl mx-auto" id="community-invite-container">
      {/* Header section */}
      <div className="flex items-start gap-4">
        <div className="bg-pink-100 p-3.5 rounded-2xl text-pink-500 shrink-0">
          <Share2 size={24} />
        </div>
        <div className="space-y-1">
          <h3 className="text-2xl font-serif text-pink-600 italic font-bold">Invite Friends to Lumina</h3>
          <p className="text-xs text-gray-500 leading-relaxed font-serif">
            Share Lumina with friends before the App Store and Google Play launch.
          </p>
        </div>
      </div>

      {/* Community Impact Tracker */}
      <div className="bg-pink-50/30 p-6 rounded-3xl border border-pink-100/30 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h4 className="text-xs font-bold text-pink-500 uppercase tracking-widest flex items-center gap-1.5">
              <span>🌸</span> COMMUNITY IMPACT
            </h4>
            <p className="text-sm font-semibold text-pink-950 font-serif leading-none">Friends Joined Through You</p>
            <p className="text-xs text-gray-500 font-serif italic max-w-sm">
              Help more women discover Lumina through your QR code and share links.
            </p>
          </div>
          <div className="bg-gradient-to-br from-pink-500 to-rose-400 text-white rounded-2xl h-14 w-14 flex flex-col items-center justify-center font-bold text-lg shadow-md shrink-0">
            <span className="text-[10px] font-medium leading-none mb-0.5">Joined</span>
            <span className="leading-none text-xl">{user.referralCount || 0}</span>
          </div>
        </div>
      </div>

      {/* Share Options */}
      <div className="space-y-3">
        <p className="text-[10px] font-bold text-pink-400 uppercase tracking-wider">Share options</p>
        
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <button
            onClick={handleCopy}
            className={`py-3.5 px-3 rounded-2xl font-bold text-[9px] uppercase tracking-widest border transition-all flex flex-col items-center gap-2 cursor-pointer ${
              copied 
                ? 'bg-emerald-50 border-emerald-200 text-emerald-600 shadow-sm shadow-emerald-50' 
                : 'bg-white hover:bg-pink-50/20 border-pink-100 text-pink-500'
            }`}
          >
            {copied ? <Check size={16} /> : <Copy size={16} />}
            <span>{copied ? 'Copied!' : 'Copy Invite Link'}</span>
          </button>

          <button
            onClick={shareWhatsApp}
            className="py-3.5 px-3 bg-white hover:bg-emerald-50/20 border border-pink-100 text-pink-500 rounded-2xl font-bold text-[9px] uppercase tracking-widest transition-all flex flex-col items-center gap-2 cursor-pointer"
          >
            <MessageCircle size={16} className="text-emerald-500" />
            <span>Share WhatsApp</span>
          </button>

          <button
            onClick={shareSMS}
            className="py-3.5 px-3 bg-white hover:bg-blue-50/20 border border-pink-100 text-pink-500 rounded-2xl font-bold text-[9px] uppercase tracking-widest transition-all flex flex-col items-center gap-2 cursor-pointer"
          >
            <Smartphone size={16} className="text-blue-500" />
            <span>Share via SMS</span>
          </button>

          <button
            onClick={shareInstagram}
            className="py-3.5 px-3 bg-white hover:bg-purple-50/20 border border-pink-100 text-pink-500 rounded-2xl font-bold text-[9px] uppercase tracking-widest transition-all flex flex-col items-center gap-2 cursor-pointer"
          >
            <Camera size={16} className="text-purple-500" />
            <span>Instagram bio</span>
          </button>
        </div>
      </div>

      {/* Instagram Bio Instruction Drawer */}
      <AnimatePresence>
        {showIGInfo && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="p-5 bg-purple-50/50 rounded-3xl border border-purple-100 space-y-3 overflow-hidden"
          >
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-purple-950 uppercase tracking-widest">📷 Instagram Bio Sharing</h4>
              <button onClick={() => setShowIGInfo(false)} className="text-[10px] text-purple-400 font-bold uppercase hover:text-purple-600">Close ✕</button>
            </div>
            <p className="text-[10px] text-gray-500 leading-relaxed font-serif">
              Instagram does not allow direct URL triggers inside posts. To share your code in your Instagram profile:
            </p>
            <div className="space-y-2 bg-white/80 p-3 rounded-2xl border border-purple-100/50 text-[10px] text-purple-900 leading-normal">
              <p>1. Copy your link below.</p>
              <p>2. Paste it in your bio link field under <span className="font-bold">Edit Profile</span> on Instagram.</p>
              <p>3. Let your followers scan or tap to connect with you instantly!</p>
            </div>
            <button
              onClick={handleCopy}
              className="w-full py-2 bg-gradient-to-r from-purple-500 to-indigo-500 text-white font-bold text-[9px] uppercase tracking-widest rounded-xl hover:opacity-95 transition-all"
            >
              {copied ? '✓ Copied!' : 'Copy Link for Instagram'}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* QR Code trigger */}
      <div className="border-t border-pink-50 pt-5 space-y-4">
        <button
          onClick={() => setShowQR(!showQR)}
          className="w-full py-3.5 bg-gradient-to-r from-pink-500 to-rose-450 text-white font-bold rounded-2xl text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 shadow-md shadow-pink-100 cursor-pointer transition-all"
        >
          <QrCode size={14} />
          <span>{showQR ? 'Hide Personal QR Code' : 'Show Personal QR Code'}</span>
        </button>

        {/* QR Code centered, responsive, no overflow/clipping */}
        <AnimatePresence>
          {showQR && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-rose-50/15 border border-pink-100/30 p-6 sm:p-8 rounded-[2.5rem] flex flex-col items-center justify-center text-center space-y-4 shadow-inner"
            >
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-pink-600 uppercase tracking-widest">My Lumina QR Code</p>
                <p className="text-[9px] text-gray-400 font-serif leading-none italic">Let a friend scan with their phone camera to join instantly</p>
              </div>

              {/* QR Code Container styled strictly to match mobile limits */}
              <div className="bg-white p-4 rounded-[2rem] border border-pink-100 shadow-lg w-full max-w-[300px] min-w-[220px] aspect-square flex items-center justify-center overflow-hidden mx-auto">
                <img 
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&color=db2777&data=${encodeURIComponent(inviteLink)}`} 
                  alt="My Personal Lumina Referral QR Code"
                  className="w-full h-auto max-w-[250px] aspect-square mx-auto block object-contain"
                  referrerPolicy="no-referrer"
                />
              </div>

              <div className="bg-white/80 p-3.5 rounded-2xl border border-pink-50 max-w-sm">
                <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Invite Code:</span>
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
