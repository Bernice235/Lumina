import React, { useState, useEffect, useRef } from 'react';
import { DiaryEntry, User } from '../types';
import { Lock, Fingerprint, ShieldCheck, AlertCircle, Edit3, PlusCircle, Clock, RotateCcw, CheckCircle2, Calendar, Sparkles, Trash2, Heart } from 'lucide-react';
import { trackCreateDiaryEntry, trackUpdateDiaryEntry } from '../services/analyticsService';
import { calculateCycleSyncData } from '../services/cycleSyncService';
import { saveEncryptedSessionUser, secureStorage } from '../services/secureStorage';
import { authenticateWithBiometrics, getBiometricCapability } from '../services/biometricService';
import {
  clearDiaryPinLockout,
  getDiaryPinLockoutState,
  hashDiaryPin,
  recordFailedDiaryPinAttempt,
  userHasConfiguredPin,
  validateNewDiaryPin,
  verifyDiaryPin
} from '../services/securityService';
import { syncUser } from '../services/firebaseService';

interface DiaryProps {
  entries: DiaryEntry[];
  setEntries: React.Dispatch<React.SetStateAction<DiaryEntry[]>>;
  user: User;
  setUser?: React.Dispatch<React.SetStateAction<User | null>>;
}

const AESTHETIC_EMOJIS = [
  '✨', '🌸', '💖', '🎀', '🦄', '🌈', '🍭', '🍓', '🦋', '🦢', '🧸', '🕯️', '🌙', '☁️', '🌷', '🎨'
];

const getCurrentCyclePhase = (user: User): string => {
  const sync = calculateCycleSyncData(user, new Date());
  if (sync.isLatePeriodMode) {
    return `Late Period • Day ${sync.daysLate}`;
  }
  const fertileTag = sync.isWithinFertileWindow && sync.fertilityStatus ? ' • Fertile Window (Est.)' : '';
  return `${sync.phaseName} • Day ${sync.cycleDay}${fertileTag}`;
};

const DRAFT_KEY = 'diary_draft_v1';

const Diary: React.FC<DiaryProps> = ({ entries, setEntries, user, setUser }) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [content, setContent] = useState('');
  const [mood, setMood] = useState('Happy');
  const [selectedEmoji, setSelectedEmoji] = useState('✨');
  const [isLocked, setIsLocked] = useState(true);
  const [pinInput, setPinInput] = useState('');
  const [newPinInput, setNewPinInput] = useState('');
  const [confirmPinInput, setConfirmPinInput] = useState('');
  const [pinSaving, setPinSaving] = useState(false);
  const [error, setError] = useState('');
  const [isBiometricSupported, setIsBiometricSupported] = useState(false);
  const [biometricLabel, setBiometricLabel] = useState('Device Biometrics');

  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [hasRestoredDraft, setHasRestoredDraft] = useState(false);

  const editorRef = useRef<HTMLDivElement>(null);

  const currentPhaseName = getCurrentCyclePhase(user);

  useEffect(() => {
    let cancelled = false;
    getBiometricCapability(user.id).then((cap) => {
      if (cancelled) return;
      setIsBiometricSupported(cap.available);
      setBiometricLabel(cap.biometryLabel);
    });
    return () => {
      cancelled = true;
    };
  }, [user.id]);

  // Auto-lock Secret Diary on backgrounding or inactivity
  useEffect(() => {
    if (isLocked) return;
    const timeoutMins = Math.max(1, Math.min(30, Number(user.privacyPreferences?.autoLockTimeoutMinutes) || 5));
    let timerId: ReturnType<typeof setTimeout> | null = null;

    const resetInactivityTimer = () => {
      if (timerId) clearTimeout(timerId);
      timerId = setTimeout(() => {
        setIsLocked(true);
      }, timeoutMins * 60 * 1000);
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'hidden' && user.privacyPreferences?.autoLockOnBlur) {
        setIsLocked(true);
      }
    };

    const events: (keyof WindowEventMap)[] = ['pointerdown', 'keydown', 'touchstart', 'scroll'];
    events.forEach((ev) => window.addEventListener(ev, resetInactivityTimer, { passive: true }));
    document.addEventListener('visibilitychange', handleVisibility);
    resetInactivityTimer();

    return () => {
      if (timerId) clearTimeout(timerId);
      events.forEach((ev) => window.removeEventListener(ev, resetInactivityTimer));
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [isLocked, user.privacyPreferences?.autoLockOnBlur, user.privacyPreferences?.autoLockTimeoutMinutes]);

  // Restore Encrypted Draft on Mount (Draft Recovery)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        localStorage.removeItem('lumina_diary_draft');
        const savedDraftStr = await secureStorage.getItem(DRAFT_KEY);
        if (!cancelled && savedDraftStr) {
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
      } catch {
        // Ignore corrupted draft
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Auto-Save Content Changes into encrypted IndexedDB vault while typing
  useEffect(() => {
    if (!content.trim()) {
      void secureStorage.removeItem(DRAFT_KEY);
      localStorage.removeItem('lumina_diary_draft');
      setLastSavedAt(null);
      return;
    }

    const nowIso = new Date().toISOString();
    const nowDisplay = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    void secureStorage.setItem(
      DRAFT_KEY,
      JSON.stringify({
        editingId,
        content,
        mood,
        selectedEmoji,
        timestamp: nowIso,
      })
    ).then(() => setLastSavedAt(nowDisplay)).catch(() => {});

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

  const handleCreateCustomPin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const validation = validateNewDiaryPin(newPinInput);
    if (!validation.valid) {
      setError(validation.error || 'Choose a stronger 4–6 digit PIN.');
      return;
    }
    if (newPinInput !== confirmPinInput) {
      setError('Your two PIN entries do not match. Please try again.');
      return;
    }

    setPinSaving(true);
    try {
      const { hash, salt } = await hashDiaryPin(newPinInput);
      const updatedUser: User = {
        ...user,
        diaryPin: undefined,
        diaryPinHash: hash,
        diaryPinSalt: salt,
      };
      if (setUser) setUser(updatedUser);
      const rememberPref = localStorage.getItem('lumina_remember_me') !== 'false';
      await saveEncryptedSessionUser(updatedUser, rememberPref);
      await syncUser(updatedUser);
      setNewPinInput('');
      setConfirmPinInput('');
      setIsLocked(false);
    } catch {
      setError('Unable to save your new Secret Diary PIN right now.');
    } finally {
      setPinSaving(false);
    }
  };

  const handleUnlock = async () => {
    setError('');
    const lockout = await getDiaryPinLockoutState(user.id);
    if (lockout.isLocked) {
      const mins = Math.max(1, Math.ceil(lockout.remainingMs / 60_000));
      setError(`Diary PIN temporarily locked after 5 failed attempts. Try again in ${mins} minute(s) or use biometrics.`);
      return;
    }

    const verdict = await verifyDiaryPin(pinInput, user);
    if (verdict === 'valid') {
      await clearDiaryPinLockout(user.id);
      // Silently upgrade legacy customized plaintext PIN to salted PBKDF2-SHA256 hash
      if (!user.diaryPinHash && user.diaryPin && user.diaryPin !== '1234') {
        try {
          const { hash, salt } = await hashDiaryPin(pinInput);
          const upgraded: User = { ...user, diaryPinHash: hash, diaryPinSalt: salt, diaryPin: undefined };
          if (setUser) setUser(upgraded);
          await syncUser(upgraded);
        } catch {}
      }
      setIsLocked(false);
      setPinInput('');
      setError('');
      return;
    }

    const failState = await recordFailedDiaryPinAttempt(user.id);
    setPinInput('');
    setError(
      failState.isLocked
        ? 'Diary locked for 5 minutes after 5 incorrect PIN attempts.'
        : `Incorrect PIN (${failState.remainingAttempts} attempt(s) remaining).`
    );
  };

  const handleBiometricUnlock = async () => {
    setError('');
    const res = await authenticateWithBiometrics(user, 'Verify your identity to unlock your Secret Diary');
    if (res.verified) {
      setIsLocked(false);
      setError('');
    } else {
      setError(res.message);
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
        id: crypto.randomUUID(),
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

    // Clear Encrypted Draft
    void secureStorage.removeItem(DRAFT_KEY);
    localStorage.removeItem('lumina_diary_draft');
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
    void secureStorage.removeItem(DRAFT_KEY);
    localStorage.removeItem('lumina_diary_draft');
    setHasRestoredDraft(false);
    setLastSavedAt(null);
  };

  const handleDiscardDraft = () => {
    void secureStorage.removeItem(DRAFT_KEY);
    localStorage.removeItem('lumina_diary_draft');
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
    const hasConfiguredPin = userHasConfiguredPin(user);

    if (!hasConfiguredPin) {
      return (
        <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 sm:p-10 bg-white dark:bg-[#1a1816] rounded-2xl shadow-xs border border-stone-200/80 dark:border-[#2e2a26] max-w-lg mx-auto animate-fadeIn">
          <div className="w-16 h-16 bg-pink-50 dark:bg-pink-950/40 border border-pink-100 dark:border-pink-900/40 text-pink-600 dark:text-pink-400 rounded-2xl flex items-center justify-center mb-5">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-serif font-bold text-stone-900 dark:text-stone-100 mb-2 text-center">Set Your Private Diary PIN</h2>
          <p className="text-xs text-stone-600 dark:text-stone-400 mb-6 text-center max-w-sm leading-relaxed">
            For your privacy, Lumina no longer uses a shared default PIN. Create your own 4–6 digit secret PIN before opening your diary.
          </p>

          {error && (
            <div role="alert" className="flex items-center gap-2 mb-4 px-4 py-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300 text-xs font-medium w-full max-w-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleCreateCustomPin} className="w-full max-w-xs space-y-3">
            <input
              type="password"
              inputMode="numeric"
              maxLength={6}
              value={newPinInput}
              onChange={(e) => setNewPinInput(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
              placeholder="New 4–6 digit PIN"
              aria-label="New 4 to 6 digit Diary PIN"
              className="w-full h-11 px-4 rounded-xl bg-[#faf8f6] dark:bg-[#23201d] border border-stone-200/80 dark:border-[#342f2b] text-center text-sm font-mono tracking-[0.35em] text-stone-900 dark:text-stone-100 outline-none focus:border-pink-400 tabular-nums"
              required
            />
            <input
              type="password"
              inputMode="numeric"
              maxLength={6}
              value={confirmPinInput}
              onChange={(e) => setConfirmPinInput(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
              placeholder="Confirm PIN"
              aria-label="Confirm Diary PIN"
              className="w-full h-11 px-4 rounded-xl bg-[#faf8f6] dark:bg-[#23201d] border border-stone-200/80 dark:border-[#342f2b] text-center text-sm font-mono tracking-[0.35em] text-stone-900 dark:text-stone-100 outline-none focus:border-pink-400 tabular-nums"
              required
            />
            <button
              type="submit"
              disabled={pinSaving}
              className="w-full py-3 bg-pink-600 hover:bg-pink-700 text-white rounded-xl text-xs font-semibold shadow-xs cursor-pointer transition-colors disabled:opacity-60"
            >
              {pinSaving ? 'Encrypting PIN...' : 'Save Private PIN & Open Diary'}
            </button>
          </form>

          {isBiometricSupported && (
            <button
              type="button"
              onClick={handleBiometricUnlock}
              className="mt-4 flex items-center gap-2.5 px-5 py-2.5 bg-[#faf8f6] dark:bg-[#23201d] border border-stone-200/80 dark:border-[#342f2b] rounded-xl text-stone-700 dark:text-stone-200 hover:border-pink-300 transition-colors cursor-pointer"
            >
              <Fingerprint className="w-4 h-4 text-pink-600 dark:text-pink-400" />
              <span className="text-xs font-semibold">Or unlock with {biometricLabel}</span>
            </button>
          )}
        </div>
      );
    }

    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 sm:p-10 bg-white dark:bg-[#1a1816] rounded-2xl shadow-xs border border-stone-200/80 dark:border-[#2e2a26] max-w-md mx-auto animate-fadeIn">
        <div className="w-16 h-16 bg-pink-50 dark:bg-pink-950/40 border border-pink-100 dark:border-pink-900/40 text-pink-600 dark:text-pink-400 rounded-2xl flex items-center justify-center mb-5 relative">
          <Lock className="w-7 h-7" />
        </div>
        <h2 className="text-2xl font-serif font-bold text-stone-900 dark:text-stone-100 mb-1.5">Secret Sanctuary</h2>
        <p className="text-xs text-stone-500 dark:text-stone-400 mb-6 text-center max-w-xs">Your thoughts are encrypted here. Enter your private PIN or verify with biometrics.</p>

        <div className="flex gap-3 mb-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className={`w-3 h-3 rounded-full border-2 transition-colors ${pinInput.length > i ? 'bg-pink-600 border-pink-600' : 'border-stone-300 dark:border-[#342f2b] bg-transparent'}`}></div>
          ))}
        </div>

        {error && (
          <div role="alert" className="flex items-center gap-2 mb-5 px-4 py-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300 max-w-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <p className="text-xs font-medium">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-3 gap-3.5 mb-6">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 'C', 0, '✓'].map((num) => (
            <button
              key={num}
              type="button"
              onClick={() => {
                if (num === 'C') setPinInput('');
                else if (num === '✓') void handleUnlock();
                else if (pinInput.length < 6) setPinInput(prev => prev + num);
              }}
              className={`w-16 h-14 rounded-xl flex items-center justify-center font-semibold text-lg transition-colors active:scale-95 cursor-pointer tabular-nums border ${
                num === '✓'
                  ? 'bg-pink-600 hover:bg-pink-700 text-white border-pink-600 shadow-xs'
                  : 'bg-[#faf8f6] dark:bg-[#23201d] border-stone-200/80 dark:border-[#342f2b] text-stone-800 dark:text-stone-100 hover:bg-stone-100 dark:hover:bg-[#2b2724]'
              }`}
            >
              {num}
            </button>
          ))}
        </div>

        {isBiometricSupported && (
          <button
            type="button"
            onClick={handleBiometricUnlock}
            className="flex items-center gap-2.5 px-6 py-3 bg-[#faf8f6] dark:bg-[#23201d] border border-stone-200/80 dark:border-[#342f2b] rounded-xl text-stone-800 dark:text-stone-100 hover:border-pink-300 transition-colors cursor-pointer"
          >
            <Fingerprint className="w-5 h-5 text-pink-600 dark:text-pink-400" />
            <span className="text-xs font-semibold">Unlock with {biometricLabel}</span>
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn max-w-4xl mx-auto">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-1">
        <div>
          <h2 className="text-2xl sm:text-3xl font-serif font-bold text-stone-900 dark:text-stone-100">Whispers of the Soul</h2>
          <p className="text-xs text-stone-500 dark:text-stone-400">Your private, encrypted journal and reflection space</p>
        </div>
        <button
          type="button"
          onClick={() => setIsLocked(true)}
          className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3.5 py-2 bg-white dark:bg-[#1a1816] border border-stone-200/80 dark:border-[#2e2a26] text-stone-700 dark:text-stone-200 rounded-xl hover:border-pink-300 transition-colors text-xs font-semibold cursor-pointer"
        >
          <Lock className="w-3.5 h-3.5 text-pink-600 dark:text-pink-400" />
          <span>Lock Diary</span>
        </button>
      </header>

      {/* DRAFT RECOVERY BANNER */}
      {hasRestoredDraft && (
        <div className="bg-amber-50/80 dark:bg-amber-950/30 p-4 rounded-2xl border border-amber-200/80 dark:border-amber-900/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 animate-slideDown">
          <div className="flex items-center gap-2.5">
            <RotateCcw className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <div>
              <p className="text-xs font-bold text-amber-900 dark:text-amber-200">
                Unsaved Draft Restored
              </p>
              <p className="text-[11px] text-amber-800/80 dark:text-amber-300/80">
                Lumina auto-recovered your unsaved notes from your previous session.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setHasRestoredDraft(false)}
              className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold cursor-pointer transition-colors"
            >
              Keep Writing
            </button>
            <button
              type="button"
              onClick={handleDiscardDraft}
              className="px-3.5 py-1.5 bg-white dark:bg-[#23201d] border border-stone-200/80 dark:border-[#342f2b] text-stone-600 dark:text-stone-300 rounded-lg text-xs font-semibold hover:text-rose-600 cursor-pointer transition-colors"
            >
              Discard Draft
            </button>
          </div>
        </div>
      )}

      {/* EDITOR SECTION */}
      <section ref={editorRef} className="bg-white dark:bg-[#1a1816] p-6 sm:p-8 rounded-2xl shadow-xs border border-stone-200/80 dark:border-[#2e2a26] space-y-5 relative overflow-hidden">
        {/* Editor Top Status Header */}
        <div className="flex flex-wrap justify-between items-center gap-2 border-b border-stone-100 dark:border-[#2e2a26] pb-4">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-1 bg-pink-50 dark:bg-pink-950/40 text-pink-700 dark:text-pink-300 border border-pink-200/70 dark:border-pink-900/40 rounded-md text-xs font-semibold flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              {currentPhaseName}
            </span>
            {editingId ? (
              <span className="px-2.5 py-1 bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200/70 dark:border-purple-900/40 rounded-md text-xs font-semibold flex items-center gap-1.5">
                <Edit3 className="w-3.5 h-3.5" />
                Editing Entry
              </span>
            ) : (
              <span className="px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/70 dark:border-emerald-900/40 rounded-md text-xs font-semibold">
                New Entry
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 text-xs text-stone-500 dark:text-stone-400">
            {lastSavedAt && (
              <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium flex items-center gap-1 tabular-nums">
                <CheckCircle2 className="w-3.5 h-3.5" /> Auto-saved {lastSavedAt}
              </span>
            )}
            {editingId && (
              <button
                type="button"
                onClick={handleStartNewEntry}
                className="text-pink-600 dark:text-pink-400 font-semibold hover:underline text-xs flex items-center gap-1 cursor-pointer"
              >
                <PlusCircle className="w-3.5 h-3.5" /> Start Fresh
              </button>
            )}
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-2.5">How is your mood right now?</label>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {['Happy', 'Calm', 'Moody', 'Sad', 'Tired', 'Blessed', 'Inspired'].map(m => (
              <button
                type="button"
                key={m}
                onClick={() => setMood(m)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer border ${
                  mood === m
                    ? 'bg-pink-600 text-white border-pink-600 shadow-xs'
                    : 'bg-[#faf8f6] dark:bg-[#23201d] border-stone-200/80 dark:border-[#342f2b] text-stone-600 dark:text-stone-300 hover:border-pink-300'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-2.5">Entry Icon</label>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {AESTHETIC_EMOJIS.map(emoji => (
              <button
                type="button"
                key={emoji}
                onClick={() => setSelectedEmoji(emoji)}
                className={`w-10 h-10 shrink-0 flex items-center justify-center text-lg rounded-xl transition-colors border cursor-pointer ${
                  selectedEmoji === emoji
                    ? 'bg-pink-50 dark:bg-pink-950/40 border-pink-500'
                    : 'bg-[#faf8f6] dark:bg-[#23201d] border-stone-200/80 dark:border-[#342f2b] hover:border-pink-300'
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
            placeholder="Write freely... Lumina auto-saves every word as you type. Open previous entries anytime to continue where you left off."
            className="w-full h-48 bg-[#faf8f6] dark:bg-[#23201d] p-5 rounded-xl border border-stone-200/80 dark:border-[#342f2b] outline-none focus:border-pink-400 text-stone-800 dark:text-stone-100 font-serif text-base leading-relaxed resize-none transition-colors"
          />
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleSaveOrFinalize}
            disabled={!content.trim()}
            className="flex-1 py-3 bg-pink-600 hover:bg-pink-700 text-white rounded-xl font-semibold text-xs shadow-xs transition-colors disabled:opacity-40 cursor-pointer flex items-center justify-center gap-2"
          >
            <span>{editingId ? 'Update Entry' : 'Save & Publish Entry'}</span>
            <Sparkles className="w-4 h-4" />
          </button>

          {editingId && (
            <button
              type="button"
              onClick={handleStartNewEntry}
              className="px-5 py-3 bg-stone-100 dark:bg-[#23201d] text-stone-700 dark:text-stone-200 rounded-xl font-semibold text-xs hover:bg-stone-200 dark:hover:bg-[#2b2724] transition-colors cursor-pointer"
            >
              Cancel Edit
            </button>
          )}
        </div>
      </section>

      {/* DIARY ENTRIES HISTORY LIST */}
      <div className="space-y-4">
        <div className="flex justify-between items-center px-1">
          <h3 className="text-lg font-serif font-bold text-stone-900 dark:text-stone-100">Previous Diary Entries</h3>
          <span className="text-xs text-stone-500 dark:text-stone-400 tabular-nums">{entries.length} {entries.length === 1 ? 'entry' : 'entries'} saved</span>
        </div>

        {entries.length === 0 ? (
          <div className="p-10 text-center bg-white dark:bg-[#1a1816] rounded-2xl border border-stone-200/80 dark:border-[#2e2a26] text-stone-500 dark:text-stone-400 space-y-2.5">
            <Heart className="w-9 h-9 mx-auto text-pink-400/70" />
            <p className="font-serif font-semibold text-base text-stone-800 dark:text-stone-200">Your sanctuary is ready for your first note</p>
            <p className="text-xs text-stone-500 dark:text-stone-400 max-w-sm mx-auto">
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
                className={`relative p-6 rounded-2xl shadow-xs border transition-colors cursor-pointer group ${
                  isCurrentlyEditing
                    ? 'bg-pink-50/40 dark:bg-[#23201d] border-pink-500 ring-1 ring-pink-400'
                    : 'bg-white dark:bg-[#1a1816] border-stone-200/80 dark:border-[#2e2a26] border-l-4 border-l-pink-500 hover:border-pink-300 dark:hover:border-pink-800'
                }`}
              >
                <div className="flex flex-wrap justify-between items-center gap-2 mb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{entry.emoji || '✨'}</span>
                    <div>
                      <p className="text-xs font-bold text-stone-900 dark:text-stone-100">{entry.date}</p>
                      <div className="flex flex-wrap items-center gap-2 mt-0.5">
                        <span className="text-[11px] text-pink-600 dark:text-pink-400 font-medium flex items-center gap-1 tabular-nums">
                          <Calendar className="w-3 h-3" />
                          Created {entry.createdAt || entry.date}
                        </span>
                        {entry.updatedAt && (
                          <span className="text-[11px] text-stone-400 flex items-center gap-1 tabular-nums">
                            · <Clock className="w-3 h-3" /> Edited {entry.updatedAt}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {entry.cyclePhase && (
                      <span className="text-[10px] px-2.5 py-0.5 bg-pink-50 dark:bg-pink-950/40 text-pink-700 dark:text-pink-300 border border-pink-200/70 dark:border-pink-900/40 rounded-md font-semibold">
                        {entry.cyclePhase}
                      </span>
                    )}
                    <span className="text-[10px] px-2.5 py-0.5 bg-[#faf8f6] dark:bg-[#23201d] text-stone-700 dark:text-stone-300 border border-stone-200/80 dark:border-[#342f2b] rounded-md font-semibold">
                      {entry.mood}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => handleDeleteEntry(entry.id, e)}
                      className="text-stone-400 hover:text-rose-600 p-1.5 rounded-lg transition-colors opacity-80 group-hover:opacity-100 hover:bg-stone-100 dark:hover:bg-[#23201d] cursor-pointer"
                      title="Delete entry"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <p className="text-stone-700 dark:text-stone-200 font-serif text-base leading-relaxed whitespace-pre-wrap my-2">
                  "{entry.content}"
                </p>

                <div className="mt-3 pt-3 border-t border-stone-100 dark:border-[#2e2a26] flex items-center justify-between text-xs text-pink-600 dark:text-pink-400 font-semibold">
                  <span className="flex items-center gap-1.5">
                    <Edit3 className="w-3.5 h-3.5" />
                    {isCurrentlyEditing ? 'Currently Editing Above' : 'Tap entry to continue writing'}
                  </span>
                  <span className="text-xs opacity-80 group-hover:underline">
                    Continue →
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
