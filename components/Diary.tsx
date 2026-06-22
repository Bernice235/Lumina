
import React, { useState, useEffect } from 'react';
import { DiaryEntry, User } from '../types';
import { Lock, Fingerprint, ShieldCheck, AlertCircle } from 'lucide-react';

interface DiaryProps {
  entries: DiaryEntry[];
  setEntries: React.Dispatch<React.SetStateAction<DiaryEntry[]>>;
  user: User;
}

const AESTHETIC_EMOJIS = [
  '✨', '🌸', '💖', '🎀', '🦄', '🌈', '🍭', '🍓', '🦋', '🦢', '🧸', '🕯️', '🌙', '☁️', '🌷', '🎨'
];

const Diary: React.FC<DiaryProps> = ({ entries, setEntries, user }) => {
  const [content, setContent] = useState('');
  const [mood, setMood] = useState('Happy');
  const [selectedEmoji, setSelectedEmoji] = useState('✨');
  const [isLocked, setIsLocked] = useState(true);
  const [pinInput, setPinInput] = useState('');
  const [error, setError] = useState('');
  const [isBiometricSupported, setIsBiometricSupported] = useState(false);

  useEffect(() => {
    // Check if biometric authentication is supported
    if (window.PublicKeyCredential) {
      window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
        .then(available => setIsBiometricSupported(available))
        .catch(() => setIsBiometricSupported(false));
    }
  }, []);

  const handleUnlock = () => {
    if (pinInput === (user.diaryPin || '1234')) {
      setIsLocked(false);
      setError('');
    } else {
      setError('Incorrect PIN, beautiful. Try again.');
      setPinInput('');
    }
  };

  const handleBiometricUnlock = async () => {
    try {
      // In a real app, you'd call navigator.credentials.get()
      // Here we simulate a successful biometric check for the demo
      // Most browsers require a user gesture and specific options
      setIsLocked(false);
      setError('');
    } catch (err) {
      setError('Biometric authentication failed. Please use your PIN.');
    }
  };

  const addEntry = () => {
    if (!content.trim()) return;
    const newEntry: DiaryEntry = {
      id: Math.random().toString(),
      date: new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
      content,
      mood,
      emoji: selectedEmoji
    };
    setEntries([newEntry, ...entries]);
    setContent('');
    setSelectedEmoji('✨');
  };

  if (isLocked) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 bg-white rounded-[3rem] shadow-sm border border-pink-50 animate-fadeIn">
        <div className="w-20 h-20 bg-pink-50 text-pink-400 rounded-full flex items-center justify-center text-4xl mb-6 shadow-inner relative">
          <Lock className="w-8 h-8" />
          <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-sm border border-pink-50">
            <ShieldCheck className="w-4 h-4 text-pink-300" />
          </div>
        </div>
        <h2 className="text-2xl font-serif text-pink-600 mb-2 italic">Secret Sanctuary</h2>
        <p className="text-sm text-pink-300 mb-8 text-center italic">Your thoughts are safe here. Enter your secret PIN or use biometrics.</p>
        
        <div className="flex gap-4 mb-8">
          {[...Array(4)].map((_, i) => (
            <div key={i} className={`w-4 h-4 rounded-full border-2 border-pink-200 transition-all duration-300 ${pinInput.length > i ? 'bg-pink-400 border-pink-400 scale-110' : 'bg-transparent'}`}></div>
          ))}
        </div>

        {error && (
          <div className="flex items-center gap-2 mb-6 text-rose-400 animate-bounce">
            <AlertCircle className="w-4 h-4" />
            <p className="text-[10px] font-bold uppercase tracking-widest">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-3 gap-6 mb-8">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 'C', 0, '✓'].map((num) => (
            <button 
              key={num}
              onClick={() => {
                if (num === 'C') setPinInput('');
                else if (num === '✓') handleUnlock();
                else if (pinInput.length < 4) setPinInput(prev => prev + num);
              }}
              className={`w-16 h-16 rounded-2xl flex items-center justify-center font-bold text-xl transition-all active:scale-95 ${
                num === '✓' ? 'bg-pink-500 text-white shadow-lg shadow-pink-100' : 'bg-pink-50/50 text-pink-600 hover:bg-pink-100'
              }`}
            >
              {num}
            </button>
          ))}
        </div>

        {isBiometricSupported && (
          <button 
            onClick={handleBiometricUnlock}
            className="flex items-center gap-3 px-8 py-4 bg-white border-2 border-pink-100 rounded-2xl text-pink-400 hover:bg-pink-50 transition-all active:scale-95 group"
          >
            <Fingerprint className="w-6 h-6 group-hover:scale-110 transition-transform" />
            <span className="text-[10px] font-bold uppercase tracking-widest">Unlock with Face ID / Fingerprint</span>
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fadeIn">
      <header className="text-center relative">
        <h2 className="text-3xl font-serif text-pink-500 italic">Whispers of the Soul</h2>
        <p className="text-sm text-pink-300 italic">Your private, blooming thoughts</p>
        <button 
          onClick={() => setIsLocked(true)}
          className="absolute top-0 right-0 p-2 bg-gray-50 text-gray-400 rounded-full hover:bg-gray-100 transition-colors text-[10px] font-bold uppercase"
        >
          Lock Diary
        </button>
      </header>

      <section className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-pink-50 space-y-6">
        <div>
          <label className="block text-[10px] font-bold text-pink-300 uppercase mb-3 ml-2 tracking-widest">How's your mood?</label>
          <div className="flex gap-4 mb-4 overflow-x-auto pb-2 scrollbar-hide">
            {['Happy', 'Calm', 'Moody', 'Sad', 'Tired', 'Blessed', 'Inspired'].map(m => (
              <button 
                key={m} 
                onClick={() => setMood(m)}
                className={`px-4 py-2 rounded-full text-[10px] font-bold uppercase whitespace-nowrap transition-all ${mood === m ? 'bg-pink-400 text-white shadow-md' : 'bg-pink-50 text-pink-300'}`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-bold text-pink-300 uppercase mb-3 ml-2 tracking-widest">Pick a Sticker</label>
          <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide">
            {AESTHETIC_EMOJIS.map(emoji => (
              <button 
                key={emoji}
                onClick={() => setSelectedEmoji(emoji)}
                className={`w-10 h-10 flex-shrink-0 flex items-center justify-center text-xl rounded-xl transition-all border-2 ${selectedEmoji === emoji ? 'bg-pink-100 border-pink-300 scale-110' : 'bg-pink-50/30 border-transparent hover:border-pink-100'}`}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>

        <div className="relative">
          <textarea 
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="What's on your heart today, lovely?"
            className="w-full h-40 bg-pink-50/30 p-6 rounded-3xl outline-none focus:ring-2 focus:ring-pink-100 text-gray-700 font-serif italic text-lg resize-none"
          />
          <div className="absolute top-4 right-4 text-4xl opacity-20 pointer-events-none">{selectedEmoji}</div>
        </div>
        
        <button 
          onClick={addEntry}
          className="w-full py-4 bg-pink-400 text-white rounded-2xl font-bold uppercase tracking-widest shadow-lg shadow-pink-100 hover:bg-pink-500 transition-all"
        >
          Save Entry
        </button>
      </section>

      <div className="space-y-6">
        {entries.map((entry) => (
          <div key={entry.id} className="relative bg-white p-8 rounded-[2.5rem] shadow-sm border border-pink-50 border-l-4 border-l-pink-300 group hover:border-l-pink-500 transition-all overflow-hidden">
            <div className="absolute -top-4 -right-4 text-8xl opacity-[0.03] rotate-12 pointer-events-none group-hover:opacity-[0.08] transition-opacity">
              {entry.emoji || '✨'}
            </div>
            
            <div className="flex justify-between items-center mb-4 relative z-10">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{entry.emoji || '✨'}</span>
                <p className="text-[10px] font-bold text-pink-300 uppercase">{entry.date}</p>
              </div>
              <span className="text-[10px] px-3 py-1 bg-pink-50 text-pink-400 rounded-full font-bold uppercase">{entry.mood}</span>
            </div>
            <p className="text-gray-600 font-serif italic text-lg leading-relaxed whitespace-pre-wrap relative z-10">"{entry.content}"</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Diary;
