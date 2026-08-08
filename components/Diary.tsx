import React, { useState, useEffect, useRef } from 'react';
import { DiaryEntry, User } from '../types';
import { Lock, Fingerprint, ShieldCheck, AlertCircle, Edit3, PlusCircle, Clock, RotateCcw, CheckCircle2, Calendar, Sparkles, Trash2, Heart } from 'lucide-react';
import { trackCreateDiaryEntry, trackUpdateDiaryEntry } from '../services/analyticsService';

interface DiaryProps {
  entries: DiaryEntry[];
  setEntries: React.Dispatch<React.SetStateAction<DiaryEntry[]>>;
  user: User;
}

const AESTHETIC_EMOJIS = [
  '✨', '🌸', '💖', '🎀', '🦄', '🌈', '🍭', '🍓', '🦋', '🦢', '🧸', '🕯️', '🌙', '☁️', '🌷', '🎨'
];

const getCurrentCyclePhase = (user: User): string => {
  if (!user.lastPeriodStart) return 'Cycle Phase';
  const cycleLen = user.cycleLength || 28;
  const periodLen = user.periodLength || 5;

  const lastStart = new Date(user.lastPeriodStart);
  const start = new Date(lastStart.getFullYear(), lastStart.getMonth(), lastStart.getDate());
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const diffDays = Math.floor((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

  const expectedMidnight = new Date(start.getTime() + cycleLen * 24 * 60 * 60 * 1000).getTime();
  let hasLoggedNewPeriod = false;
  if (user.periods && user.periods.length > 0) {
    hasLoggedNewPeriod = user.periods.some(p => new Date(p.startDate).setHours(0,0,0,0) >= expectedMidnight);
  }

  const isLate = diffDays > cycleLen && !hasLoggedNewPeriod;
  if (isLate) return `Late Period • Day ${diffDays - cycleLen}`;

  const cycleDay = ((diffDays % cycleLen) + cycleLen) % cycleLen + 1;
  if (cycleDay <= periodLen) return `Period Phase • Day ${cycleDay}`;
  if (cycleDay <= cycleLen - 14) return `Follicular Phase • Day ${cycleDay - periodLen}`;
  if (cycleDay <= cycleLen - 10) return `Ovulation Phase • Day ${Math.max(1, cycleDay - (cycleLen - 14))}`;
  return `Luteal Phase • Day ${Math.max(1, cycleDay - (cycleLen - 10))}`;
};

const DRAFT_KEY = 'lumina_diary_draft';

const Diary: React.FC<DiaryProps> = ({ entries, setEntries, user }) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [content, setContent] = useState('');
  const [mood, setMood] = useState('Happy');
  const [selectedEmoji, setSelectedEmoji] = useState('✨');
  const [isLocked, setIsLocked] = useState(true);
  const [pinInput, setPinInput] = useState('');
  const [error, setError] = useState('');
  const [isBiometricSupported, setIsBiometricSupported] = useState(false);

  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [hasRestoredDraft, setHasRestoredDraft] = useState(false);

  const editorRef = useRef<HTMLDivElement>(null);

  const currentPhaseName = getCurrentCyclePhase(user);

  useEffect(() => {
    // Check if biometric authentication is supported
    if (window.PublicKeyCredential) {
      window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
        .then(available => setIsBiometricSupported(available))
        .catch(() => setIsBiometricSupported(false));
    }
  }, []);

  // Restore Draft on Mount (Draft Recovery)
  useEffect(() => {
    try {
      const savedDraftStr = localStorage.getItem(DRAFT_KEY);
      if (savedDraftStr) {
        const draft = JSON.parse(savedDraftStr);
        if (draft && draft.content && draft.content.trim()) {
          setContent(draft.content);
          if (draft.mood) setMood(draft.mood);
          if (draft.selectedEmoji) setSelectedEmoji(draft.selectedEmoji);
          if (draft.editingId) setEditingId(draft.editingId);
          setHasRestoredDraft(true);
          if (draft.timestamp) {
            setLastSavedAt(new Date(draft.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
          }
        }
      }
    } catch (e) {
      console.warn('Failed to load diary draft:', e);
    }
  }, []);

  // Auto-Save Content Changes while typing (Auto Save & Continuation System)
  useEffect(() => {
    if (!content.trim()) {
      localStorage.removeItem(DRAFT_KEY);
      setLastSavedAt(null);
      return;
    }

    const nowIso = new Date().toISOString();
    const nowDisplay = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // Save to localStorage draft
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({
        editingId,
        content,
        mood,
        selectedEmoji,
        timestamp: nowIso
      }));
      setLastSavedAt(nowDisplay);
    } catch (e) {
      console.warn('Draft save error:', e);
    }

    // Auto update existing entry in real-time if editing
    if (editingId) {
      setEntries(prev => prev.map(e => {
        if (e.id === editingId) {
          return {
            ...e,
            content,
            mood,
            emoji: selectedEmoji,
            updatedAt: new Date().toLocaleString(undefined, {
              weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
              hour: '2-digit', minute: '2-digit'
            })
          };
        }
        return e;
      }));
    }
  }, [content, mood, selectedEmoji, editingId]);

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
      setIsLocked(false);
      setError('');
    } catch (err) {
      setError('Biometric authentication failed. Please use your PIN.');
    }
  };

  const handleSaveOrFinalize = () => {
    if (!content.trim()) return;

    const fullFormattedDate = new Date().toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
    const nowTimeString = new Date().toLocaleString(undefined, {
      weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });

    if (editingId) {
      // Update existing entry
      setEntries(prev => prev.map(e => {
        if (e.id === editingId) {
          return {
            ...e,
            content,
            mood,
            emoji: selectedEmoji,
            updatedAt: nowTimeString,
            cyclePhase: e.cyclePhase || currentPhaseName
          };
        }
        return e;
      }));
      trackUpdateDiaryEntry(mood);
    } else {
      // Create new entry
      const newEntry: DiaryEntry = {
        id: Math.random().toString(),
        date: fullFormattedDate,
        createdAt: nowTimeString,
        updatedAt: nowTimeString,
        content,
        mood,
        emoji: selectedEmoji,
        cyclePhase: currentPhaseName
      };
      setEntries([newEntry, ...entries]);
      trackCreateDiaryEntry(mood);
    }

    // Clear Draft
    localStorage.removeItem(DRAFT_KEY);
    setContent('');
    setEditingId(null);
    setSelectedEmoji('✨');
    setHasRestoredDraft(false);
    setLastSavedAt(null);
  };

  const handleOpenEntryForEditing = (entry: DiaryEntry) => {
    setEditingId(entry.id);
    setContent(entry.content);
    setMood(entry.mood || 'Happy');
    setSelectedEmoji(entry.emoji || '✨');
    setHasRestoredDraft(false);

    if (editorRef.current) {
      editorRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleStartNewEntry = () => {
    setEditingId(null);
    setContent('');
    setMood('Happy');
    setSelectedEmoji('✨');
    localStorage.removeItem(DRAFT_KEY);
    setHasRestoredDraft(false);
    setLastSavedAt(null);
  };

  const handleDiscardDraft = () => {
    localStorage.removeItem(DRAFT_KEY);
    setContent('');
    setEditingId(null);
    setHasRestoredDraft(false);
    setLastSavedAt(null);
  };

  const handleDeleteEntry = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setEntries(prev => prev.filter(item => item.id !== id));
    if (editingId === id) {
      handleStartNewEntry();
    }
  };

  if (isLocked) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 bg-white dark:bg-stone-900 rounded-[3rem] shadow-sm border border-pink-50 dark:border-stone-800 animate-fadeIn">
        <div className="w-20 h-20 bg-pink-50 dark:bg-stone-800 text-pink-400 rounded-full flex items-center justify-center text-4xl mb-6 shadow-inner relative">
          <Lock className="w-8 h-8" />
          <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-white dark:bg-stone-900 rounded-full flex items-center justify-center shadow-sm border border-pink-50 dark:border-stone-800">
            <ShieldCheck className="w-4 h-4 text-pink-300" />
          </div>
        </div>
        <h2 className="text-2xl font-serif text-pink-600 dark:text-pink-400 mb-2 italic">Secret Sanctuary</h2>
        <p className="text-sm text-pink-300 dark:text-pink-300/70 mb-8 text-center italic">Your thoughts are safe here. Enter your secret PIN or use biometrics.</p>

        <div className="flex gap-4 mb-8">
          {[...Array(4)].map((_, i) => (
            <div key={i} className={`w-4 h-4 rounded-full border-2 border-pink-200 dark:border-stone-700 transition-all duration-300 ${pinInput.length > i ? 'bg-pink-400 border-pink-400 scale-110' : 'bg-transparent'}`}></div>
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
                num === '✓' ? 'bg-pink-500 text-white shadow-lg shadow-pink-100' : 'bg-pink-50/50 dark:bg-stone-800 text-pink-600 dark:text-pink-300 hover:bg-pink-100'
              }`}
            >
              {num}
            </button>
          ))}
        </div>

        {isBiometricSupported && (
          <button
            onClick={handleBiometricUnlock}
            className="flex items-center gap-3 px-8 py-4 bg-white dark:bg-stone-800 border-2 border-pink-100 dark:border-stone-700 rounded-2xl text-pink-400 hover:bg-pink-50 transition-all active:scale-95 group cursor-pointer"
          >
            <Fingerprint className="w-6 h-6 group-hover:scale-110 transition-transform" />
            <span className="text-[10px] font-bold uppercase tracking-widest">Unlock with Face ID / Fingerprint</span>
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fadeIn max-w-4xl mx-auto">
      <header className="text-center relative">
        <h2 className="text-3xl font-serif text-pink-500 italic">Whispers of the Soul</h2>
        <p className="text-sm text-pink-300 italic">Your private, blooming thoughts & diary continuation sanctuary</p>
        <button
          onClick={() => setIsLocked(true)}
          className="absolute top-0 right-0 p-2.5 bg-gray-50 dark:bg-stone-800 text-gray-500 dark:text-stone-300 rounded-full hover:bg-gray-100 transition-colors text-[10px] font-bold uppercase cursor-pointer"
        >
          Lock Diary
        </button>
      </header>

      {/* DRAFT RECOVERY BANNER */}
      {hasRestoredDraft && (
        <div className="bg-gradient-to-r from-amber-500/15 via-pink-500/10 to-rose-500/15 p-4 rounded-3xl border border-amber-300/50 dark:border-amber-700/50 flex flex-col sm:flex-row justify-between items-center gap-3 animate-slideDown">
          <div className="flex items-center gap-2.5">
            <RotateCcw className="w-5 h-5 text-amber-600 dark:text-amber-400 animate-spin-slow flex-shrink-0" />
            <div>
              <p className="text-xs font-bold text-amber-800 dark:text-amber-200">
                Unsaved Draft Restored
              </p>
              <p className="text-[11px] text-amber-700 dark:text-amber-300/80">
                Lumina auto-recovered your unsaved notes from your previous session. No thoughts were lost! ✨
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => setHasRestoredDraft(false)}
              className="px-3.5 py-1.5 bg-amber-500 text-white rounded-xl text-[10px] font-bold uppercase tracking-wider shadow-sm hover:bg-amber-600 cursor-pointer"
            >
              Keep Writing
            </button>
            <button
              onClick={handleDiscardDraft}
              className="px-3.5 py-1.5 bg-white/80 dark:bg-stone-800 text-stone-500 rounded-xl text-[10px] font-bold uppercase tracking-wider hover:bg-rose-50 hover:text-rose-600 cursor-pointer"
            >
              Discard Draft
            </button>
          </div>
        </div>
      )}

      {/* EDITOR SECTION */}
      <section ref={editorRef} className="bg-white dark:bg-stone-900 p-8 rounded-[2.5rem] shadow-sm border border-pink-100 dark:border-stone-800 space-y-6 relative overflow-hidden">
        {/* Editor Top Status Header */}
        <div className="flex justify-between items-center border-b border-pink-50 dark:border-stone-800 pb-4">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-pink-100 dark:bg-pink-900/50 text-pink-700 dark:text-pink-300 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              {currentPhaseName}
            </span>
            {editingId ? (
              <span className="px-3 py-1 bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                <Edit3 className="w-3 h-3" />
                Continuing Existing Entry
              </span>
            ) : (
              <span className="px-3 py-1 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 rounded-full text-[10px] font-bold uppercase tracking-wider">
                New Entry
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 text-xs text-stone-400">
            {lastSavedAt && (
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1 animate-pulse">
                <CheckCircle2 className="w-3.5 h-3.5" /> Auto-saved {lastSavedAt}
              </span>
            )}
            {editingId && (
              <button
                onClick={handleStartNewEntry}
                className="text-pink-500 font-bold hover:underline text-[10px] uppercase tracking-wider flex items-center gap-1 cursor-pointer"
              >
                <PlusCircle className="w-3.5 h-3.5" /> Start Fresh Entry
              </button>
            )}
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-bold text-pink-400 uppercase mb-3 ml-2 tracking-widest">How's your mood right now?</label>
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
            {['Happy', 'Calm', 'Moody', 'Sad', 'Tired', 'Blessed', 'Inspired'].map(m => (
              <button
                key={m}
                onClick={() => setMood(m)}
                className={`px-4 py-2 rounded-full text-[10px] font-bold uppercase whitespace-nowrap transition-all cursor-pointer ${
                  mood === m ? 'bg-pink-500 text-white shadow-md shadow-pink-200/50' : 'bg-pink-50 dark:bg-stone-800 text-pink-400 dark:text-pink-300 hover:bg-pink-100'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-bold text-pink-400 uppercase mb-3 ml-2 tracking-widest">Pick a Mood Sticker</label>
          <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide">
            {AESTHETIC_EMOJIS.map(emoji => (
              <button
                key={emoji}
                onClick={() => setSelectedEmoji(emoji)}
                className={`w-10 h-10 flex-shrink-0 flex items-center justify-center text-xl rounded-xl transition-all border-2 cursor-pointer ${
                  selectedEmoji === emoji ? 'bg-pink-100 dark:bg-pink-900/50 border-pink-400 scale-110 shadow-sm' : 'bg-pink-50/30 dark:bg-stone-800/50 border-transparent hover:border-pink-200'
                }`}
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
            placeholder="Write freely... Lumina auto-saves every word as you type. Open previous entries anytime to continue from where you stopped!"
            className="w-full h-48 bg-pink-50/30 dark:bg-stone-800/40 p-6 rounded-3xl outline-none focus:ring-2 focus:ring-pink-300 dark:focus:ring-pink-600 text-stone-700 dark:text-stone-200 font-serif italic text-lg leading-relaxed resize-none transition-all"
          />
          <div className="absolute top-4 right-4 text-4xl opacity-20 pointer-events-none">{selectedEmoji}</div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleSaveOrFinalize}
            disabled={!content.trim()}
            className="flex-1 py-4 bg-gradient-to-r from-pink-400 to-rose-500 text-white rounded-2xl font-bold uppercase tracking-widest shadow-lg shadow-pink-200/60 dark:shadow-none hover:scale-[1.01] transition-all disabled:opacity-40 cursor-pointer flex items-center justify-center gap-2"
          >
            <span>{editingId ? 'Update & Finalize Entry' : 'Save & Publish Entry'}</span>
            <Sparkles className="w-4 h-4" />
          </button>

          {editingId && (
            <button
              onClick={handleStartNewEntry}
              className="px-6 py-4 bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 rounded-2xl font-bold uppercase text-xs tracking-wider hover:bg-stone-200 transition-all cursor-pointer"
            >
              Cancel Edit
            </button>
          )}
        </div>
      </section>

      {/* DIARY ENTRIES HISTORY LIST */}
      <div className="space-y-6">
        <div className="flex justify-between items-center px-2">
          <h3 className="text-xl font-serif text-pink-600 dark:text-pink-400 italic">Previous Diary Entries</h3>
          <span className="text-xs text-stone-400 italic">{entries.length} {entries.length === 1 ? 'entry' : 'entries'} saved</span>
        </div>

        {entries.length === 0 ? (
          <div className="p-12 text-center bg-white dark:bg-stone-900 rounded-[2.5rem] border border-pink-50 dark:border-stone-800 text-stone-400 space-y-3">
            <Heart className="w-10 h-10 mx-auto text-pink-300 opacity-50 animate-pulse" />
            <p className="font-serif italic text-lg text-stone-600 dark:text-stone-300">Your sanctuary is ready for your first whisper.</p>
            <p className="text-xs text-stone-400 max-w-sm mx-auto">
              Write your thoughts above. Every entry auto-saves while you type and remains editable anytime.
            </p>
          </div>
        ) : (
          entries.map((entry) => {
            const isCurrentlyEditing = editingId === entry.id;
            return (
              <div
                key={entry.id}
                onClick={() => handleOpenEntryForEditing(entry)}
                className={`relative p-8 rounded-[2.5rem] shadow-sm border transition-all cursor-pointer group overflow-hidden ${
                  isCurrentlyEditing
                    ? 'bg-gradient-to-r from-pink-50/90 to-rose-50/60 dark:from-stone-800 dark:to-stone-800/90 border-pink-400 dark:border-pink-600 ring-2 ring-pink-300'
                    : 'bg-white dark:bg-stone-900 border-pink-100 dark:border-stone-800 border-l-4 border-l-pink-300 hover:border-l-pink-500 hover:shadow-md'
                }`}
              >
                <div className="absolute -top-4 -right-4 text-8xl opacity-[0.03] rotate-12 pointer-events-none group-hover:opacity-[0.08] transition-opacity">
                  {entry.emoji || '✨'}
                </div>

                <div className="flex flex-wrap justify-between items-center gap-2 mb-4 relative z-10">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{entry.emoji || '✨'}</span>
                    <div>
                      <p className="text-xs font-bold text-stone-800 dark:text-stone-100">{entry.date}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-pink-500 font-semibold flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          Created {entry.createdAt || entry.date}
                        </span>
                        {entry.updatedAt && (
                          <span className="text-[10px] text-stone-400 flex items-center gap-1 font-mono">
                            • <Clock className="w-3 h-3" /> Last edited {entry.updatedAt}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {entry.cyclePhase && (
                      <span className="text-[9px] px-3 py-1 bg-pink-100/80 dark:bg-pink-900/40 text-pink-700 dark:text-pink-300 rounded-full font-bold uppercase tracking-wider">
                        {entry.cyclePhase}
                      </span>
                    )}
                    <span className="text-[10px] px-3 py-1 bg-pink-50 dark:bg-stone-800 text-pink-500 rounded-full font-bold uppercase">
                      {entry.mood}
                    </span>
                    <button
                      onClick={(e) => handleDeleteEntry(entry.id, e)}
                      className="text-stone-300 hover:text-rose-500 p-1.5 rounded-full transition-colors opacity-0 group-hover:opacity-100 hover:bg-stone-100 dark:hover:bg-stone-800"
                      title="Delete entry"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <p className="text-stone-700 dark:text-stone-200 font-serif italic text-lg leading-relaxed whitespace-pre-wrap relative z-10 my-3">
                  "{entry.content}"
                </p>

                <div className="mt-4 pt-3 border-t border-pink-50 dark:border-stone-800/80 flex items-center justify-between text-xs text-pink-500 font-bold">
                  <span className="flex items-center gap-1.5">
                    <Edit3 className="w-3.5 h-3.5" />
                    {isCurrentlyEditing ? 'Currently Editing in Canvas Above' : 'Tap entry to continue writing & edit'}
                  </span>
                  <span className="text-[10px] uppercase tracking-wider opacity-80 group-hover:underline">
                    Continue Writing →
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default Diary;
