import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Song, User } from '../types';
import { SONGS } from '../constants';
import { calculateCycleSyncData } from '../services/cycleSyncService';
import { 
  Play, 
  Pause, 
  SkipForward, 
  SkipBack, 
  Volume2, 
  VolumeX, 
  Heart, 
  Search, 
  Plus, 
  Trash2, 
  DownloadCloud, 
  Check, 
  Music, 
  Sparkles, 
  Compass, 
  Clock, 
  FolderHeart, 
  ListPlus, 
  Flame, 
  Disc, 
  Radio, 
  Share2,
  ListMusic,
  Download,
  ThumbsUp,
  Lock,
  Repeat,
  X,
  FolderPlus,
  Headphones
} from 'lucide-react';

interface MusicRoomProps {
  user: User;
  onToggleFavorite: (songId: string) => void;
  currentSongIndex: number;
  onSelectSong: (index: number, genre?: string) => void;
  isMusicPlaying: boolean;
  onTogglePlay: () => void;
  onNext: () => void;
  onPrev: () => void;
  onAddCustomSong: (song: Song) => void;
  activeMusicGenre: string;
  setActiveMusicGenre: (genre: string) => void;
}

interface CustomPlaylist {
  id: string;
  name: string;
  songs: string[];
  isOffline?: boolean;
}

const CATEGORIES = [
  { id: 'all', label: 'All', emoji: '🌈' },
  { id: 'lo-fi', label: 'Lo-Fi Chill', emoji: '☕' },
  { id: 'classical', label: 'Classical', emoji: '🎻' },
  { id: 'ambient', label: 'Ambient Space', emoji: '🌌' },
  { id: 'nature sounds', label: 'Nature Sounds', emoji: '🍃' },
  { id: 'meditation', label: 'Meditation', emoji: '🧘' },
  { id: 'jazz', label: 'Jazz', emoji: '🎷' },
  { id: 'pop', label: 'Pop', emoji: '🎤' },
  { id: 'afrobeats', label: 'Afrobeats', emoji: '🌍' },
  { id: 'r&b', label: 'R&B', emoji: '🎶' },
  { id: 'gospel', label: 'Gospel', emoji: '✨' },
  { id: 'relaxation & sleep', label: 'Relaxation & Sleep', emoji: '😴' },
  { id: 'pregnancy relaxation', label: 'Pregnancy Relaxation', emoji: '🤰' },
  { id: 'postpartum wellness', label: 'Postpartum Wellness', emoji: '🌸' },
  { id: 'acoustic', label: 'Acoustic', emoji: '🎸' },
];

const MusicRoom: React.FC<MusicRoomProps> = ({ 
  user, 
  onToggleFavorite, 
  currentSongIndex, 
  onSelectSong, 
  isMusicPlaying,
  onTogglePlay,
  onNext,
  onPrev,
  onAddCustomSong,
  activeMusicGenre,
  setActiveMusicGenre
}) => {
  // Navigation Tabs
  const [activeTab, setActiveTab] = useState<'discover' | 'playlists' | 'favorites' | 'recent' | 'mood'>('discover');
  
  // Search & Filters
  const [activeCategory, setActiveCategory] = useState(activeMusicGenre || 'all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (activeMusicGenre) {
      setActiveCategory(activeMusicGenre);
    }
  }, [activeMusicGenre]);

  const handleCategoryChange = (catId: string) => {
    setActiveCategory(catId);
    setActiveMusicGenre(catId);
  };
  
  // Custom Song Dialog state
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newArtist, setNewArtist] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [newEmoji, setNewEmoji] = useState('🎵');
  const [newGenre, setNewGenre] = useState('pop');

  // Playlists persistence
  const [playlists, setPlaylists] = useState<CustomPlaylist[]>(() => {
    const local = localStorage.getItem(`lumina_playlists_${user.id}`);
    if (local) {
      try { return JSON.parse(local); } catch (e) { return []; }
    }
    // Seed standard starter playlist
    const starter: CustomPlaylist[] = [{
      id: 'pl-sanctuary',
      name: '🌸 Evening Self-Care Sanctuary',
      songs: ['j1', 'p1', 'af3', 'c1']
    }];
    localStorage.setItem(`lumina_playlists_${user.id}`, JSON.stringify(starter));
    return starter;
  });

  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [showCreatePlaylistModal, setShowCreatePlaylistModal] = useState(false);
  const [selectedPlaylistInfo, setSelectedPlaylistInfo] = useState<CustomPlaylist | null>(null);

  // Recently Played songs
  const [recentlyPlayed, setRecentlyPlayed] = useState<string[]>(() => {
    try {
      const local = localStorage.getItem(`lumina_recent_${user?.id || 'default'}`);
      return local ? JSON.parse(local) : ['j1', 'af1', 'p1'];
    } catch {
      return ['j1', 'af1', 'p1'];
    }
  });

  // Track playlist dropdown attachment
  const [activeDropdownSongId, setActiveDropdownSongId] = useState<string | null>(null);

  // High-fidelity audio visualizer simulation
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(0.4);
  const [isMuted, setIsMuted] = useState(false);
  const [isShuffle, setIsShuffle] = useState(false);
  const [isRepeat, setIsRepeat] = useState<'off' | 'one' | 'all'>('all');
  const [lyricsVisible, setLyricsVisble] = useState(false);

  const [lockedSongAttempt, setLockedSongAttempt] = useState<any | null>(null);

  const isSongPremiumLocked = (song: any) => {
    return false;
  };

  const handleSongSelect = (songIdx: number) => {
    const song = fullLibrary[songIdx];
    if (song && isSongPremiumLocked(song)) {
      setLockedSongAttempt(song);
    } else {
      onSelectSong(songIdx, activeCategory);
    }
  };

  const customSongs = user.customSongs || [];
  const fullLibrary = useMemo(() => {
    // Inject album and display meta directly to augment search fidelity
    return [...SONGS, ...customSongs].map(song => ({
      ...song,
      album: song.tags.includes('gospel') ? 'Grace & Faith' :
             song.tags.includes('afrobeats') ? 'African Giantess Vol 1' :
             song.tags.includes('pop') ? 'Sanctuary Anthems' :
             song.tags.includes('jazz') ? 'Late Night Lounge' :
             song.tags.includes('classical') ? 'Golden Harmonics' : 'Sanctuary Dreams'
    }));
  }, [customSongs]);

  const favorites = user.favoriteSongs || [];

  // Determine current cycle phase using central synchronised logic
  const cyclePhase = useMemo(() => {
    if (user.isPregnancyMode) return 'pregnancy';
    const sync = calculateCycleSyncData(user, new Date());
    if (sync.phase === 'Menstrual') return 'period';
    if (sync.phase === 'Follicular') return 'follicular';
    if (sync.phase === 'Ovulatory') return 'ovulation';
    return 'luteal';
  }, [user]);

  // Current track pointer
  const currentSong = fullLibrary[currentSongIndex] || fullLibrary[0];

  // Map phase or pregnancy status to recommended categories & explanations
  const recommendationDetail = useMemo(() => {
    if (user.isPregnancyMode) {
      return {
        title: '🤰 Pregnancy Bonding & Rest',
        desc: 'Slowing breathing rhythms connects oxygen transfers directly to your little angel. Listen to sweet harp, lullabies, and peaceful alpha frequency waves.',
        targetGenres: ['pregnancy relaxation', 'meditation', 'classical', 'gospel'],
        vibe: 'Womb Connection'
      };
    }
    if (user.isPostpartumMode) {
      return {
        title: '🪷 Postpartum Healing & Rejuvenation',
        desc: 'Welcome to your beautiful postpartum fourth trimester. Your body and mind are healing and integrating. Soothe your nervous system with restorative soft flute tunes, baby lullabies, and comforting recovery soundscapes.',
        targetGenres: ['postpartum wellness', 'relaxation & sleep', 'meditation'],
        vibe: 'Postpartum Recovery'
      };
    }
    switch (cyclePhase) {
      case 'period':
        return {
          title: '🩸 Menstrual Phase Calm Winters',
          desc: 'With estrogen at its annual baseline, your lower back and pelvic muscles are working incredibly hard. Soft 528Hz tuning and cozy acoustic tunes soothe your physical state.',
          targetGenres: ['relaxation & sleep', 'jazz', 'classical', 'meditation'],
          vibe: 'Melting Cramps'
        };
      case 'follicular':
        return {
          title: '🌱 Follicular Spring Awakening',
          desc: 'Estrogen returns with beautiful, dynamic clarity! Fuel your ascending creativity, goal mapping, and fitness starts with crisp afrobeats, pop, and organic grooves.',
          targetGenres: ['pop', 'afrobeats', 'jazz'],
          vibe: 'Rising Energy'
        };
      case 'ovulation':
        return {
          title: '☀️ Ovulatory High Summer Peak',
          desc: 'Your testosterone peak triggers maximum magnetism! You are outgoing, expressive, and radiant. Dance to energetic afrobeats and glowing pop hits.',
          targetGenres: ['afrobeats', 'pop', 'r&b'],
          vibe: 'Radiant Divinity'
        };
      case 'luteal':
      default:
        return {
          title: '🍂 Luteal Autumning Nesting',
          desc: 'Progesterone levels are nesting. Sensory sensitivity triggers early, so draw firm emotional boundaries. Gentle lo-fi jazz and deep meditation restore sleep pathways.',
          targetGenres: ['meditation', 'relaxation & sleep', 'jazz'],
          vibe: 'Boundary Comfort'
        };
    }
  }, [cyclePhase, user.isPregnancyMode]);

  // Trending Section
  const trendingSongs = useMemo(() => {
    // Return songs with requested tags or matching current recommendations
    return fullLibrary.filter(s => 
      s.tags.includes(cyclePhase) || 
      s.tags.includes('calm') || 
      recommendationDetail.targetGenres.some(g => s.tags.includes(g))
    ).slice(0, 6);
  }, [fullLibrary, cyclePhase, recommendationDetail]);

  // Handle recently played queuing
  useEffect(() => {
    if (isMusicPlaying && currentSong) {
      setRecentlyPlayed(prev => {
        const filtered = prev.filter(id => id !== currentSong.id);
        const next = [currentSong.id, ...filtered].slice(0, 8);
        localStorage.setItem(`lumina_recent_${user.id}`, JSON.stringify(next));
        return next;
      });
    }
  }, [currentSongIndex, isMusicPlaying]);

  // Time tracker listener targeting real audio node in DOM
  useEffect(() => {
    const audioEl = document.querySelector('audio');
    if (!audioEl) return;

    const handleTimeUpdate = () => {
      setCurrentTime(audioEl.currentTime);
      setDuration(audioEl.duration || 0);
    };

    const handleLoadedMetadata = () => {
      setDuration(audioEl.duration || 0);
    };

    audioEl.addEventListener('timeupdate', handleTimeUpdate);
    audioEl.addEventListener('loadedmetadata', handleLoadedMetadata);
    
    // Periodically force update duration just in case
    if (audioEl.duration) {
      setDuration(audioEl.duration);
    }

    return () => {
      audioEl.removeEventListener('timeupdate', handleTimeUpdate);
      audioEl.removeEventListener('loadedmetadata', handleLoadedMetadata);
    };
  }, [currentSongIndex]);

  // Shuffle, Repeat controls custom handlers overriding default onEnded
  useEffect(() => {
    const audioEl = document.querySelector('audio');
    if (!audioEl) return;

    const handleSongEnded = () => {
      if (isRepeat === 'one') {
        audioEl.currentTime = 0;
        audioEl.play().catch(e => console.warn(e));
      } else if (isShuffle) {
        const randomIdx = Math.floor(Math.random() * fullLibrary.length);
        onSelectSong(randomIdx);
      } else {
        onNext();
      }
    };

    audioEl.removeEventListener('ended', handleSongEnded); // Clean old
    audioEl.addEventListener('ended', handleSongEnded);

    return () => {
      audioEl.removeEventListener('ended', handleSongEnded);
    };
  }, [isShuffle, isRepeat, fullLibrary, onNext, onSelectSong]);

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    const audioEl = document.querySelector('audio');
    if (audioEl) {
      audioEl.currentTime = val;
      setCurrentTime(val);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolumeState(val);
    const audioEl = document.querySelector('audio');
    if (audioEl) {
      audioEl.volume = val;
    }
    if (val > 0) setIsMuted(false);
  };

  const toggleMute = () => {
    const audioEl = document.querySelector('audio');
    if (!audioEl) return;
    if (isMuted) {
      audioEl.volume = volume;
      setIsMuted(false);
    } else {
      audioEl.volume = 0;
      setIsMuted(true);
    }
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return '0:00';
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // Searching songs, artists, and albums
  const filteredSongs = useMemo(() => {
    return fullLibrary.filter(song => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = 
        song.title.toLowerCase().includes(q) || 
        song.artist.toLowerCase().includes(q) || 
        (song as any).album.toLowerCase().includes(q) ||
        song.tags.some(t => t.toLowerCase().includes(q));

      const matchesCategory = 
        activeCategory === 'all' || 
        song.tags.includes(activeCategory);

      return matchesSearch && matchesCategory;
    });
  }, [fullLibrary, searchQuery, activeCategory]);

  // Add Custom Track helper
  const handleAddSong = () => {
    if (!newTitle) return;
    
    let source: 'internal' | 'spotify' | 'youtube' | 'external' = 'external';
    if (newUrl.includes('spotify.com')) source = 'spotify';
    else if (newUrl.includes('youtube.com') || newUrl.includes('youtu.be')) source = 'youtube';

    const newSong: Song = {
      id: 'custom-' + Math.random().toString(36).substr(2, 9),
      title: newTitle,
      artist: newArtist || 'Self-Care Artist',
      url: newUrl || 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-12.mp3', // default soothing track
      tags: [newGenre, 'custom'],
      coverEmoji: newEmoji,
      source
    };

    onAddCustomSong(newSong);
    setShowAddForm(false);
    setNewTitle('');
    setNewArtist('');
    setNewUrl('');
    setNewEmoji('🎵');
  };

  // Playlists helper
  const createPlaylist = () => {
    if (!newPlaylistName.trim()) return;
    const newPlay: CustomPlaylist = {
      id: 'pl-' + Math.random().toString(36).substr(2, 9),
      name: '🎵 ' + newPlaylistName,
      songs: []
    };
    const nextArr = [...playlists, newPlay];
    setPlaylists(nextArr);
    localStorage.setItem(`lumina_playlists_${user.id}`, JSON.stringify(nextArr));
    setNewPlaylistName('');
    setShowCreatePlaylistModal(false);
  };

  const deletePlaylist = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const nextArr = playlists.filter(p => p.id !== id);
    setPlaylists(nextArr);
    localStorage.setItem(`lumina_playlists_${user.id}`, JSON.stringify(nextArr));
    if (selectedPlaylistInfo?.id === id) setSelectedPlaylistInfo(null);
  };

  const togglePlaylistOffline = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const nextArr = playlists.map(p => {
      if (p.id === id) {
        return { ...p, isOffline: !p.isOffline };
      }
      return p;
    });
    setPlaylists(nextArr);
    localStorage.setItem(`lumina_playlists_${user.id}`, JSON.stringify(nextArr));
    if (selectedPlaylistInfo?.id === id) {
      setSelectedPlaylistInfo(nextArr.find(p => p.id === id) || null);
    }
  };

  const addSongToPlaylist = (songId: string, playlistId: string) => {
    const nextArr = playlists.map(p => {
      if (p.id === playlistId) {
        if (p.songs.includes(songId)) return p; // avoid duplicate
        return { ...p, songs: [...p.songs, songId] };
      }
      return p;
    });
    setPlaylists(nextArr);
    localStorage.setItem(`lumina_playlists_${user.id}`, JSON.stringify(nextArr));
    setActiveDropdownSongId(null);
  };

  const removeSongFromPlaylist = (songId: string, playlistId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const nextArr = playlists.map(p => {
      if (p.id === playlistId) {
        return { ...p, songs: p.songs.filter(id => id !== songId) };
      }
      return p;
    });
    setPlaylists(nextArr);
    localStorage.setItem(`lumina_playlists_${user.id}`, JSON.stringify(nextArr));
    if (selectedPlaylistInfo?.id === playlistId) {
      setSelectedPlaylistInfo(nextArr.find(p => p.id === playlistId) || null);
    }
  };

  const playPlaylist = (pl: CustomPlaylist) => {
    if (pl.songs.length === 0) return;
    // Find index of first song in global full play queue
    const firstIdx = fullLibrary.findIndex(s => s.id === pl.songs[0]);
    if (firstIdx !== -1) {
      onSelectSong(firstIdx);
      if (!isMusicPlaying) onTogglePlay();
    }
  };

  // AI-inspired instant dynamic playlist creator according to cycle
  const generateLuminaMoodPlaylist = () => {
    const generatedSongs = fullLibrary.filter(s => 
      s.tags.includes(cyclePhase) || 
      recommendationDetail.targetGenres.some(g => s.tags.includes(g))
    ).map(s => s.id);

    const matchNames: Record<string, string> = {
      pregnancy: '🤰 Prenatal Blossom & Baby Bond Lullaby',
      period: '🩹 Menstrual Cozy Heating Bed & Warm Tea',
      follicular: '🌱 Rising Spring Energy & Vision Map Beats',
      ovulation: '☀️ Ovulatory Radiant Summer Dance Hits',
      luteal: '🍂 Luteal Autumn Boundary Candlelight'
    };

    const newPlay: CustomPlaylist = {
      id: 'pl-ai-' + Math.random().toString(36).substr(2, 9),
      name: '🪄 AI: ' + (matchNames[cyclePhase] || 'Wellness Recovery Beats'),
      songs: generatedSongs.slice(0, 6)
    };

    const nextArr = [newPlay, ...playlists];
    setPlaylists(nextArr);
    localStorage.setItem(`lumina_playlists_${user.id}`, JSON.stringify(nextArr));
    setSelectedPlaylistInfo(newPlay);
    setActiveTab('playlists');
  };

  // Beautiful fallback values for recently/favorite queries
  const favoriteSongsCollected = useMemo(() => {
    return fullLibrary.filter(s => favorites.includes(s.id));
  }, [fullLibrary, favorites]);

  const recentSongsCollected = useMemo(() => {
    return recentlyPlayed.map(id => fullLibrary.find(s => s.id === id)).filter((s): s is (typeof fullLibrary)[0] => Boolean(s));
  }, [fullLibrary, recentlyPlayed]);

  // Smart lyric generator for extreme aesthetic value
  const computedLyrics = useMemo(() => {
    return [
      `[00:00] (Gentle soothing introductory pads playing...)`,
      `[00:10] Breathing in, I welcome this peaceful sanctuary.`,
      `[00:22] Release the tension, release the strain, beautiful girl.`,
      `[00:35] Your body is carrying magnificent life and dynamic power.`,
      `[00:50] Glow, grow, let the waves wash away the heavy rain.`,
      `[01:10] Deep in your tissues, magnesium relaxing the muscles.`,
      `[01:30] Trusting the winter, preparing for spring garden, blooming again...`,
      `[01:55] (Peaceful instrumentation outro...)`
    ];
  }, [currentSongIndex]);

  return (
    <div className="space-y-6 animate-fadeIn pb-36">
      {/* HEADER SECTION */}
      <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white dark:bg-[#1a1816] p-5 md:p-6 rounded-2xl border border-stone-200/80 dark:border-[#2e2a26] shadow-xs">
        <div>
          <h2 className="text-2xl md:text-3xl font-serif text-stone-900 dark:text-stone-100 flex items-center gap-2.5 tracking-tight">
            <Music className="text-pink-600 dark:text-pink-400 shrink-0" size={24} />
            Lumina Music Hub
          </h2>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-1 font-medium flex items-center gap-1.5">
            <Radio className="text-pink-600 dark:text-pink-400 shrink-0" size={13} />
            Tailored wellness audio • {user.isPregnancyMode ? "Pregnancy Sanctuary" : "Cycle Syncing"}
          </p>
        </div>

        {/* TAB SWITCHERS */}
        <div className="flex bg-[#faf8f6] dark:bg-[#23201d] p-1 rounded-xl border border-stone-200/80 dark:border-[#342f2b] w-full lg:w-auto overflow-x-auto scrollbar-hide shrink-0 gap-1 select-none">
          <button
            type="button"
            onClick={() => { setActiveTab('discover'); setSelectedPlaylistInfo(null); }}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer ${activeTab === 'discover' ? 'bg-pink-600 text-white shadow-xs' : 'text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-[#2e2a26]'}`}
          >
            <Compass size={14} />
            Discover
          </button>

          <button
            type="button"
            onClick={() => { setActiveTab('playlists'); }}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer ${activeTab === 'playlists' ? 'bg-pink-600 text-white shadow-xs' : 'text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-[#2e2a26]'}`}
          >
            <ListMusic size={14} />
            Playlists
          </button>

          <button
            type="button"
            onClick={() => { setActiveTab('favorites'); }}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer ${activeTab === 'favorites' ? 'bg-pink-600 text-white shadow-xs' : 'text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-[#2e2a26]'}`}
          >
            <Heart size={14} />
            Liked
          </button>

          <button
            type="button"
            onClick={() => { setActiveTab('recent'); }}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer ${activeTab === 'recent' ? 'bg-pink-600 text-white shadow-xs' : 'text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-[#2e2a26]'}`}
          >
            <Clock size={14} />
            Recent
          </button>

          <button
            type="button"
            onClick={() => { setActiveTab('mood'); }}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer ${activeTab === 'mood' ? 'bg-pink-600 text-white shadow-xs' : 'text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-[#2e2a26]'}`}
          >
            <Sparkles size={14} />
            Lumina AI
          </button>
        </div>
      </header>

      {/* SEARCH AND ADD EXPANDER BAR */}
      <section className="bg-white dark:bg-[#1a1816] p-4 rounded-2xl shadow-xs border border-stone-200/80 dark:border-[#2e2a26] flex flex-col md:flex-row gap-3 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" size={16} />
          <input
            type="text"
            placeholder="Search tracks, artists, classical, jazz, lo-fi..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-11 text-sm pl-10 pr-4 bg-[#faf8f6] dark:bg-[#23201d] rounded-xl border border-stone-200/80 dark:border-[#342f2b] outline-none focus:border-pink-400 dark:focus:border-pink-500 transition-all text-stone-800 dark:text-stone-100 placeholder:text-stone-400"
          />
        </div>
        <button
          type="button"
          onClick={() => setShowAddForm(!showAddForm)}
          className="w-full md:w-auto h-11 px-4 bg-[#faf8f6] dark:bg-[#23201d] hover:bg-stone-100 dark:hover:bg-[#2e2a26] text-stone-700 dark:text-stone-200 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer border border-stone-200/80 dark:border-[#342f2b] whitespace-nowrap shrink-0"
        >
          {showAddForm ? <><X size={14} /> Close Form</> : <><Plus size={14} /> Add Custom Track</>}
        </button>
      </section>

      {/* CREATE CUSTOM SONG TRACK EXPANDABLE PANEL */}
      {showAddForm && (
        <div className="bg-white dark:bg-[#1a1816] p-5 md:p-6 rounded-2xl shadow-xs border border-stone-200/80 dark:border-[#2e2a26] animate-slideDownBlock space-y-4 w-full">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-stone-800 dark:text-stone-100">Add Custom Audio Track</h3>
            <span className="text-[11px] font-medium text-pink-600 dark:text-pink-400 bg-pink-50 dark:bg-pink-950/30 border border-pink-200/70 dark:border-pink-900/40 px-2.5 py-0.5 rounded-md">
              Personal Library
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-stone-600 dark:text-stone-300">Song Title</label>
              <input
                type="text"
                placeholder="e.g. Lavender Sleep Whispers"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="h-11 px-3.5 bg-[#faf8f6] dark:bg-[#23201d] rounded-xl outline-none border border-stone-200/80 dark:border-[#342f2b] text-sm text-stone-800 dark:text-stone-100 focus:border-pink-400"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-stone-600 dark:text-stone-300">Artist / Performer</label>
              <input
                type="text"
                placeholder="e.g. Solfeggio Solitude"
                value={newArtist}
                onChange={(e) => setNewArtist(e.target.value)}
                className="h-11 px-3.5 bg-[#faf8f6] dark:bg-[#23201d] rounded-xl outline-none border border-stone-200/80 dark:border-[#342f2b] text-sm text-stone-800 dark:text-stone-100 focus:border-pink-400"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-stone-600 dark:text-stone-300">Cover Icon</label>
              <input
                type="text"
                placeholder="e.g. 🧘, 🌧️, 🎷"
                value={newEmoji}
                onChange={(e) => setNewEmoji(e.target.value)}
                className="h-11 px-3.5 bg-[#faf8f6] dark:bg-[#23201d] rounded-xl outline-none border border-stone-200/80 dark:border-[#342f2b] text-sm text-stone-800 dark:text-stone-100 focus:border-pink-400 text-center"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-stone-600 dark:text-stone-300">Genre Category</label>
              <select
                value={newGenre}
                onChange={(e) => setNewGenre(e.target.value)}
                className="h-11 px-3.5 bg-[#faf8f6] dark:bg-[#23201d] rounded-xl outline-none border border-stone-200/80 dark:border-[#342f2b] text-sm text-stone-800 dark:text-stone-100 focus:border-pink-400"
              >
                {CATEGORIES.filter(c => c.id !== 'all').map(c => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5 md:col-span-1">
              <label className="text-xs font-semibold text-stone-600 dark:text-stone-300">Audio URL (MP3)</label>
              <input
                type="text"
                placeholder="https://example.com/audio.mp3"
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                className="h-11 px-3.5 bg-[#faf8f6] dark:bg-[#23201d] rounded-xl outline-none border border-stone-200/80 dark:border-[#342f2b] text-sm text-stone-800 dark:text-stone-100 focus:border-pink-400"
              />
            </div>
          </div>
          <button
            type="button"
            onClick={handleAddSong}
            disabled={!newTitle}
            className="w-full h-11 bg-pink-600 hover:bg-pink-700 active:scale-[0.99] text-white rounded-xl text-xs font-semibold disabled:opacity-50 transition-all cursor-pointer"
          >
            Add to Soundbank
          </button>
        </div>
      )}

      {/* TAB 1: DISCOVER TAB */}
      {activeTab === 'discover' && (
        <>
          {/* FEATURED RELEASES */}
          <section className="space-y-3">
            <div className="flex justify-between items-center px-1">
              <h3 className="text-lg font-serif text-stone-900 dark:text-stone-100 flex items-center gap-2">
                <Flame size={18} className="text-pink-600 dark:text-pink-400" />
                Featured & Popular Releases
              </h3>
              <span className="text-[11px] font-medium text-pink-600 dark:text-pink-400 bg-pink-50 dark:bg-pink-950/30 border border-pink-200/70 dark:border-pink-900/40 px-2.5 py-0.5 rounded-md">
                Curated Picks
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
              {trendingSongs.map((song) => {
                const songIdx = fullLibrary.indexOf(song);
                const isCurrent = currentSongIndex === songIdx;
                const isFav = favorites.includes(song.id);
                const isLocked = isSongPremiumLocked(song);

                return (
                  <div
                    key={song.id}
                    onClick={() => handleSongSelect(songIdx)}
                    className={`group relative aspect-square bg-white dark:bg-[#1a1816] rounded-2xl border overflow-hidden cursor-pointer transition-all hover:shadow-md ${isCurrent ? 'border-pink-500 ring-1 ring-pink-500/30' : 'border-stone-200/80 dark:border-[#2e2a26] hover:border-pink-300 dark:hover:border-pink-700'}`}
                  >
                    <div className="absolute inset-0 bg-stone-900/85 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3.5">
                      <p className="text-white font-semibold text-xs truncate leading-snug">{song.title}</p>
                      <p className="text-stone-300 text-[11px] truncate mt-0.5">{song.artist}</p>
                      <div className="text-[10px] text-stone-400 truncate border-t border-white/15 mt-1.5 pt-1">
                        {(song as any).album}
                      </div>
                    </div>

                    <div className="w-full h-full flex flex-col items-center justify-center p-3.5 text-center">
                      {isLocked && (
                        <div className="absolute top-2.5 left-2.5 w-6 h-6 bg-stone-100 dark:bg-[#23201d] rounded-full flex items-center justify-center z-10 text-stone-600 dark:text-stone-300">
                          <Lock size={11} />
                        </div>
                      )}
                      <div className="text-3xl mb-2 transition-transform duration-300 group-hover:scale-110">
                        {song.coverEmoji}
                      </div>
                      <span className="text-xs font-semibold text-stone-800 dark:text-stone-100 truncate max-w-full block group-hover:opacity-0 transition-opacity">{song.title}</span>
                      <span className="text-[11px] text-stone-500 dark:text-stone-400 truncate max-w-full block group-hover:opacity-0 transition-opacity">{song.artist}</span>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleFavorite(song.id);
                      }}
                      aria-label={isFav ? 'Remove from favorites' : 'Add to favorites'}
                      className="absolute top-2.5 right-2.5 w-7 h-7 bg-white/90 dark:bg-[#23201d]/90 border border-stone-200/70 dark:border-[#342f2b] rounded-full flex items-center justify-center z-10 hover:scale-105 active:scale-95 transition-all text-pink-600 dark:text-pink-400 cursor-pointer"
                    >
                      <Heart size={13} className={isFav ? 'fill-pink-600 dark:fill-pink-400' : ''} />
                    </button>
                  </div>
                );
              })}
            </div>
          </section>

          {/* SCROLLABLE CATEGORIES */}
          <section className="space-y-3">
            <h3 className="text-lg font-serif text-stone-900 dark:text-stone-100 px-1">Browse Genres</h3>
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide select-none">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => handleCategoryChange(cat.id)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border transition-all whitespace-nowrap text-xs font-medium shrink-0 cursor-pointer ${activeCategory === cat.id ? 'bg-pink-600 text-white border-pink-600 shadow-xs' : 'bg-white dark:bg-[#1a1816] text-stone-600 dark:text-stone-300 border-stone-200/80 dark:border-[#2e2a26] hover:border-pink-300 dark:hover:border-pink-700'}`}
                >
                  <span>{cat.emoji}</span>
                  <span>{cat.label}</span>
                </button>
              ))}
            </div>
          </section>

          {/* TRACK LIST */}
          <section className="space-y-3">
            <div className="flex justify-between items-center px-1">
              <h4 className="text-sm font-semibold text-stone-800 dark:text-stone-100">
                {activeCategory === 'all' ? 'Full Audio Library' : `${CATEGORIES.find(c => c.id === activeCategory)?.label || activeCategory} Collection`} <span className="text-stone-400 font-normal tabular-nums">({filteredSongs.length})</span>
              </h4>
              <span className="text-xs text-stone-400 dark:text-stone-500">Tap track to play</span>
            </div>

            {filteredSongs.length === 0 ? (
              <div className="text-center py-16 bg-white dark:bg-[#1a1816] rounded-2xl border border-stone-200/80 dark:border-[#2e2a26]">
                <Music size={28} className="mx-auto text-stone-300 dark:text-stone-600 mb-2" />
                <p className="text-sm text-stone-500 dark:text-stone-400">No tracks matched "{searchQuery}" in this category.</p>
              </div>
            ) : (
              <div className="grid gap-2.5">
                {filteredSongs.map((song) => {
                  const songIdx = fullLibrary.indexOf(song);
                  const isCurrent = currentSongIndex === songIdx;
                  const isFav = favorites.includes(song.id);
                  const isLocked = isSongPremiumLocked(song);

                  return (
                    <div
                      key={song.id}
                      onClick={() => handleSongSelect(songIdx)}
                      className={`group bg-white dark:bg-[#1a1816] p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 cursor-pointer relative ${isCurrent ? 'border-pink-500 ring-1 ring-pink-500/20 bg-pink-50/30 dark:bg-pink-950/10' : 'border-stone-200/80 dark:border-[#2e2a26] hover:border-pink-300 dark:hover:border-pink-700'}`}
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0 border transition-all ${isCurrent ? 'bg-pink-50 dark:bg-pink-950/30 border-pink-200 dark:border-pink-800' : 'bg-[#faf8f6] dark:bg-[#23201d] border-stone-200/60 dark:border-[#342f2b]'}`}>
                          {song.coverEmoji}
                        </div>
                        <div className="min-w-0">
                          <h5 className={`text-sm font-semibold truncate leading-snug flex items-center gap-1.5 ${isCurrent ? 'text-pink-600 dark:text-pink-400' : 'text-stone-800 dark:text-stone-100'}`}>
                            <span className="truncate">{song.title}</span>
                            {isLocked && (
                              <span className="text-[10px] bg-stone-100 dark:bg-[#23201d] border border-stone-200/80 dark:border-[#342f2b] text-stone-600 dark:text-stone-300 px-1.5 py-0.5 rounded font-medium inline-flex items-center gap-1 shrink-0">
                                <Lock size={9} /> Pro
                              </span>
                            )}
                          </h5>
                          <div className="flex items-center gap-1.5 mt-0.5 text-xs text-stone-500 dark:text-stone-400 truncate">
                            <span className="font-medium truncate">{song.artist}</span>
                            <span className="text-stone-300 dark:text-stone-600">•</span>
                            <span className="truncate">{(song as any).album}</span>
                          </div>
                        </div>
                      </div>

                      {/* ACTIONS */}
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="relative">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveDropdownSongId(activeDropdownSongId === song.id ? null : song.id);
                            }}
                            className="p-2 border border-stone-200/80 dark:border-[#342f2b] text-stone-500 dark:text-stone-400 hover:text-pink-600 dark:hover:text-pink-400 rounded-xl hover:bg-stone-50 dark:hover:bg-[#23201d] transition-colors cursor-pointer"
                            title="Add to Playlist"
                          >
                            <ListPlus size={15} />
                          </button>

                          {activeDropdownSongId === song.id && (
                            <div className="absolute right-0 mt-2 w-52 bg-white dark:bg-[#1a1816] border border-stone-200/80 dark:border-[#2e2a26] rounded-xl shadow-lg py-1.5 z-30 animate-fadeIn text-left">
                              <p className="px-3.5 py-1.5 text-[11px] font-semibold text-stone-400 dark:text-stone-500 border-b border-stone-100 dark:border-[#2e2a26]">Add to Playlist</p>
                              {playlists.map(pl => (
                                <button
                                  key={pl.id}
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    addSongToPlaylist(song.id, pl.id);
                                  }}
                                  className="w-full text-left px-3.5 py-2 text-xs text-stone-700 dark:text-stone-200 hover:bg-stone-50 dark:hover:bg-[#23201d] hover:text-pink-600 dark:hover:text-pink-400 transition-colors truncate cursor-pointer"
                                >
                                  {pl.name}
                                </button>
                              ))}
                              <div className="border-t border-stone-100 dark:border-[#2e2a26] mt-1 pt-1">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setShowCreatePlaylistModal(true);
                                    setActiveDropdownSongId(null);
                                  }}
                                  className="w-full text-left px-3.5 py-2 text-xs font-semibold text-pink-600 dark:text-pink-400 hover:bg-stone-50 dark:hover:bg-[#23201d] transition-colors flex items-center gap-1.5 cursor-pointer"
                                >
                                  <FolderPlus size={13} /> New Playlist
                                </button>
                              </div>
                            </div>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleFavorite(song.id);
                          }}
                          aria-label={isFav ? 'Remove from favorites' : 'Add to favorites'}
                          className="p-2 rounded-xl hover:bg-stone-50 dark:hover:bg-[#23201d] transition-colors text-stone-400 hover:text-pink-600 cursor-pointer"
                        >
                          <Heart size={16} className={isFav ? 'fill-pink-600 text-pink-600 dark:fill-pink-400 dark:text-pink-400' : ''} />
                        </button>

                        <button
                          type="button"
                          aria-label={isCurrent && isMusicPlaying ? 'Pause' : 'Play'}
                          className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all cursor-pointer ${isCurrent && isMusicPlaying ? 'bg-pink-600 text-white' : 'bg-[#faf8f6] dark:bg-[#23201d] border border-stone-200/80 dark:border-[#342f2b] text-stone-600 dark:text-stone-300 hover:bg-pink-600 hover:text-white hover:border-pink-600'}`}
                        >
                          {isCurrent && isMusicPlaying ? <Pause size={14} /> : <Play size={14} className="ml-0.5" />}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </>
      )}

      {/* TAB 2: PLAYLISTS TAB */}
      {activeTab === 'playlists' && (
        <div className="space-y-5">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h3 className="text-lg font-serif text-stone-900 dark:text-stone-100">Your Playlists</h3>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">Curate soundscapes for rest, focus, and hormonal balance.</p>
            </div>

            <button
              type="button"
              onClick={() => setShowCreatePlaylistModal(true)}
              className="h-10 px-4 bg-pink-600 hover:bg-pink-700 text-white rounded-xl text-xs font-semibold transition-all active:scale-[0.98] cursor-pointer flex items-center gap-1.5 shrink-0"
            >
              <Plus size={14} /> Create Playlist
            </button>
          </div>

          {showCreatePlaylistModal && (
            <div className="bg-white dark:bg-[#1a1816] p-5 rounded-2xl border border-stone-200/80 dark:border-[#2e2a26] shadow-xs animate-fadeIn space-y-4">
              <h4 className="font-serif text-base text-stone-900 dark:text-stone-100">New Playlist</h4>
              <input
                type="text"
                placeholder="e.g. Evening Womb Rest"
                value={newPlaylistName}
                onChange={(e) => setNewPlaylistName(e.target.value)}
                className="w-full h-11 px-3.5 bg-[#faf8f6] dark:bg-[#23201d] rounded-xl border border-stone-200/80 dark:border-[#342f2b] text-sm text-stone-800 dark:text-stone-100 outline-none focus:border-pink-400"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={createPlaylist}
                  disabled={!newPlaylistName.trim()}
                  className="h-10 px-5 bg-pink-600 hover:bg-pink-700 text-white rounded-xl text-xs font-semibold disabled:opacity-50 cursor-pointer"
                >
                  Save Playlist
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreatePlaylistModal(false)}
                  className="h-10 px-5 bg-stone-100 dark:bg-[#23201d] text-stone-600 dark:text-stone-300 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {playlists.map((pl) => {
              const isSelected = selectedPlaylistInfo?.id === pl.id;

              return (
                <div
                  key={pl.id}
                  onClick={() => setSelectedPlaylistInfo(pl)}
                  className={`bg-white dark:bg-[#1a1816] p-5 rounded-2xl border transition-all cursor-pointer relative ${isSelected ? 'border-pink-500 ring-1 ring-pink-500/20 shadow-xs' : 'border-stone-200/80 dark:border-[#2e2a26] hover:border-pink-300 dark:hover:border-pink-700'}`}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="w-10 h-10 rounded-xl bg-[#faf8f6] dark:bg-[#23201d] border border-stone-200/80 dark:border-[#342f2b] flex items-center justify-center text-pink-600 dark:text-pink-400">
                      <Disc size={20} />
                    </div>

                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={(e) => togglePlaylistOffline(pl.id, e)}
                        className={`p-2 rounded-xl border transition-colors cursor-pointer ${pl.isOffline ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/40' : 'bg-[#faf8f6] dark:bg-[#23201d] text-stone-500 dark:text-stone-400 border-stone-200/80 dark:border-[#342f2b] hover:text-pink-600'}`}
                        title={pl.isOffline ? 'Downloaded Offline' : 'Save Offline'}
                      >
                        {pl.isOffline ? <Check size={14} /> : <Download size={14} />}
                      </button>

                      <button
                        type="button"
                        onClick={(e) => deletePlaylist(pl.id, e)}
                        className="p-2 bg-[#faf8f6] dark:bg-[#23201d] hover:bg-rose-50 dark:hover:bg-rose-950/30 text-stone-500 hover:text-rose-600 dark:text-stone-400 dark:hover:text-rose-400 border border-stone-200/80 dark:border-[#342f2b] rounded-xl transition-colors cursor-pointer"
                        title="Delete Playlist"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  <h4 className="font-semibold text-stone-900 dark:text-stone-100 text-sm truncate">{pl.name}</h4>
                  <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5 tabular-nums">{pl.songs.length} tracks</p>

                  <div className="mt-4 border-t border-stone-100 dark:border-[#2e2a26] pt-3.5 flex justify-between items-center">
                    <span className="text-[11px] font-medium px-2.5 py-0.5 bg-[#faf8f6] dark:bg-[#23201d] border border-stone-200/70 dark:border-[#342f2b] text-stone-600 dark:text-stone-300 rounded-md">
                      {pl.isOffline ? 'Offline Saved' : 'Synced'}
                    </span>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        playPlaylist(pl);
                      }}
                      disabled={pl.songs.length === 0}
                      className="px-3 py-1.5 bg-pink-600 hover:bg-pink-700 text-white rounded-lg text-xs font-semibold disabled:opacity-50 flex items-center gap-1 cursor-pointer"
                    >
                      <Play size={11} /> Play
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {selectedPlaylistInfo && (
            <div className="bg-white dark:bg-[#1a1816] p-5 md:p-6 rounded-2xl border border-stone-200/80 dark:border-[#2e2a26] shadow-xs animate-fadeIn space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-stone-100 dark:border-[#2e2a26] pb-4">
                <div>
                  <h4 className="font-serif text-lg text-stone-900 dark:text-stone-100">{selectedPlaylistInfo.name}</h4>
                  <p className="text-xs text-stone-500 dark:text-stone-400">{selectedPlaylistInfo.isOffline ? 'Saved for offline listening' : 'Active stream'}</p>
                </div>
                <button
                  type="button"
                  onClick={() => playPlaylist(selectedPlaylistInfo)}
                  disabled={selectedPlaylistInfo.songs.length === 0}
                  className="h-10 px-4 bg-pink-600 hover:bg-pink-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Play size={13} /> Play All
                </button>
              </div>

              {selectedPlaylistInfo.songs.length === 0 ? (
                <div className="text-center py-10 bg-[#faf8f6] dark:bg-[#23201d] rounded-xl border border-dashed border-stone-200 dark:border-[#342f2b]">
                  <p className="text-sm text-stone-500 dark:text-stone-400 mb-2">This playlist has no tracks yet.</p>
                  <button
                    type="button"
                    onClick={() => setActiveTab('discover')}
                    className="text-xs font-semibold text-pink-600 dark:text-pink-400 hover:underline cursor-pointer"
                  >
                    Browse Discover to add tracks
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-stone-100 dark:divide-[#2e2a26]">
                  {selectedPlaylistInfo.songs.map(songId => {
                    const found = fullLibrary.find(s => s.id === songId);
                    if (!found) return null;
                    const songIdx = fullLibrary.indexOf(found);
                    const isCurrent = currentSongIndex === songIdx;
                    const isLocked = isSongPremiumLocked(found);

                    return (
                      <div
                        key={songId}
                        onClick={() => handleSongSelect(songIdx)}
                        className="py-3 flex items-center justify-between group cursor-pointer hover:bg-[#faf8f6] dark:hover:bg-[#23201d] px-2 -mx-2 rounded-xl transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="text-2xl shrink-0">{found.coverEmoji}</span>
                          <div className="min-w-0">
                            <h5 className={`text-sm font-semibold flex items-center gap-1.5 truncate ${isCurrent ? 'text-pink-600 dark:text-pink-400' : 'text-stone-800 dark:text-stone-100'}`}>
                              <span className="truncate">{found.title}</span>
                              {isLocked && <span className="text-[10px] bg-stone-100 dark:bg-[#23201d] text-stone-600 dark:text-stone-300 px-1.5 py-0.5 rounded font-medium">Pro</span>}
                            </h5>
                            <p className="text-xs text-stone-500 dark:text-stone-400 truncate">{found.artist}</p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => removeSongFromPlaylist(found.id, selectedPlaylistInfo.id, e)}
                          className="px-2.5 py-1.5 bg-[#faf8f6] dark:bg-[#23201d] hover:bg-rose-50 dark:hover:bg-rose-950/30 text-stone-500 dark:text-stone-400 hover:text-rose-600 dark:hover:text-rose-400 border border-stone-200/80 dark:border-[#342f2b] rounded-lg text-xs font-medium transition-all cursor-pointer shrink-0"
                          title="Remove from Playlist"
                        >
                          Remove
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: FAVORITES TAB */}
      {activeTab === 'favorites' && (
        <div className="space-y-4">
          <h3 className="text-lg font-serif text-stone-900 dark:text-stone-100 px-1">
            Liked Tracks <span className="text-stone-400 text-sm font-sans font-normal tabular-nums">({favoriteSongsCollected.length})</span>
          </h3>

          {favoriteSongsCollected.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-[#1a1816] rounded-2xl border border-stone-200/80 dark:border-[#2e2a26]">
              <Heart size={28} className="mx-auto text-stone-300 dark:text-stone-600 mb-2" />
              <p className="text-sm text-stone-500 dark:text-stone-400">You haven&apos;t liked any tracks yet. Tap the heart icon on any song to save it here.</p>
            </div>
          ) : (
            <div className="grid gap-2.5">
              {favoriteSongsCollected.map((song) => {
                const songIdx = fullLibrary.indexOf(song);
                const isCurrent = currentSongIndex === songIdx;
                const isLocked = isSongPremiumLocked(song);

                return (
                  <div
                    key={song.id}
                    onClick={() => handleSongSelect(songIdx)}
                    className={`bg-white dark:bg-[#1a1816] p-3.5 rounded-2xl border flex items-center justify-between cursor-pointer transition-all ${isCurrent ? 'border-pink-500 ring-1 ring-pink-500/20' : 'border-stone-200/80 dark:border-[#2e2a26] hover:border-pink-300 dark:hover:border-pink-700'}`}
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <span className="text-2xl shrink-0">{song.coverEmoji}</span>
                      <div className="min-w-0">
                        <h4 className={`text-sm font-semibold flex items-center gap-1.5 truncate ${isCurrent ? 'text-pink-600 dark:text-pink-400' : 'text-stone-800 dark:text-stone-100'}`}>
                          <span className="truncate">{song.title}</span>
                          {isLocked && <span className="text-[10px] bg-stone-100 dark:bg-[#23201d] text-stone-600 dark:text-stone-300 px-1.5 py-0.5 rounded font-medium">Pro</span>}
                        </h4>
                        <p className="text-xs text-stone-500 dark:text-stone-400 truncate">{song.artist}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleFavorite(song.id);
                        }}
                        className="p-2 rounded-xl hover:bg-stone-50 dark:hover:bg-[#23201d] text-pink-600 dark:text-pink-400 cursor-pointer"
                      >
                        <Heart size={16} className="fill-pink-600 dark:fill-pink-400" />
                      </button>

                      <button
                        type="button"
                        className="w-9 h-9 rounded-xl bg-pink-600 text-white flex items-center justify-center cursor-pointer"
                      >
                        {isCurrent && isMusicPlaying ? <Pause size={14} /> : <Play size={14} className="ml-0.5" />}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: RECENTLY PLAYED TAB */}
      {activeTab === 'recent' && (
        <div className="space-y-4">
          <h3 className="text-lg font-serif text-stone-900 dark:text-stone-100 px-1">Recently Played</h3>

          {recentSongsCollected.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-[#1a1816] rounded-2xl border border-stone-200/80 dark:border-[#2e2a26]">
              <Clock size={28} className="mx-auto text-stone-300 dark:text-stone-600 mb-2" />
              <p className="text-sm text-stone-500 dark:text-stone-400">No listening history yet. Play a track to start your log.</p>
            </div>
          ) : (
            <div className="grid gap-2.5">
              {recentSongsCollected.map((song) => {
                const songIdx = fullLibrary.indexOf(song);
                const isCurrent = currentSongIndex === songIdx;
                const isLocked = isSongPremiumLocked(song);

                return (
                  <div
                    key={song.id}
                    onClick={() => handleSongSelect(songIdx)}
                    className={`bg-white dark:bg-[#1a1816] p-3.5 rounded-2xl border flex justify-between items-center cursor-pointer transition-all ${isCurrent ? 'border-pink-500 ring-1 ring-pink-500/20' : 'border-stone-200/80 dark:border-[#2e2a26] hover:border-pink-300 dark:hover:border-pink-700'}`}
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <span className="text-2xl shrink-0">{song.coverEmoji}</span>
                      <div className="min-w-0">
                        <h4 className="text-sm font-semibold text-stone-800 dark:text-stone-100 leading-snug flex items-center gap-1.5 truncate">
                          <span className="truncate">{song.title}</span>
                          {isLocked && <span className="text-[10px] bg-stone-100 dark:bg-[#23201d] text-stone-600 dark:text-stone-300 px-1.5 py-0.5 rounded font-medium">Pro</span>}
                        </h4>
                        <p className="text-xs text-stone-500 dark:text-stone-400 truncate">{song.artist}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="w-9 h-9 rounded-xl bg-[#faf8f6] dark:bg-[#23201d] border border-stone-200/80 dark:border-[#342f2b] text-stone-600 dark:text-stone-300 flex items-center justify-center shrink-0 cursor-pointer"
                    >
                      {isCurrent && isMusicPlaying ? <Pause size={14} /> : <Play size={14} className="ml-0.5" />}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 5: LUMINA MOOD RECOMMENDATIONS */}
      {activeTab === 'mood' && (
        <div className="space-y-6">
          <section className="bg-white dark:bg-[#1a1816] p-6 md:p-8 rounded-2xl border border-stone-200/80 dark:border-[#2e2a26] shadow-xs space-y-4">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium bg-pink-50 dark:bg-pink-950/30 text-pink-600 dark:text-pink-400 border border-pink-200/70 dark:border-pink-900/40 rounded-md">
              <Headphones size={13} /> Recommended Focus: {recommendationDetail.vibe}
            </span>

            <h3 className="text-2xl md:text-3xl font-serif text-stone-900 dark:text-stone-100 leading-tight">
              {recommendationDetail.title}
            </h3>

            <p className="text-sm text-stone-600 dark:text-stone-300 leading-relaxed max-w-2xl">
              {recommendationDetail.desc}
            </p>

            <div className="pt-2 border-t border-stone-100 dark:border-[#2e2a26]">
              <button
                type="button"
                onClick={generateLuminaMoodPlaylist}
                className="h-11 px-5 bg-pink-600 hover:bg-pink-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                <Sparkles size={14} />
                Auto-Generate Cycle Playlist
              </button>
            </div>
          </section>

          <section className="space-y-3">
            <h4 className="text-sm font-semibold text-stone-800 dark:text-stone-100 px-1">Phase-Aligned Selection</h4>
            <div className="grid gap-2.5">
              {fullLibrary.filter(s => recommendationDetail.targetGenres.some(g => s.tags.includes(g))).slice(0, 5).map(song => {
                const songIdx = fullLibrary.indexOf(song);
                const isLocked = isSongPremiumLocked(song);

                return (
                  <div
                    key={song.id}
                    onClick={() => handleSongSelect(songIdx)}
                    className="bg-white dark:bg-[#1a1816] p-3.5 rounded-2xl border border-stone-200/80 dark:border-[#2e2a26] flex items-center justify-between cursor-pointer hover:border-pink-300 dark:hover:border-pink-700 transition-all"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <span className="text-2xl shrink-0">{song.coverEmoji}</span>
                      <div className="min-w-0">
                        <h5 className="text-sm font-semibold text-stone-800 dark:text-stone-100 leading-snug flex items-center gap-1.5 truncate">
                          <span className="truncate">{song.title}</span>
                          {isLocked && <span className="text-[10px] bg-stone-100 dark:bg-[#23201d] text-stone-600 dark:text-stone-300 px-1.5 py-0.5 rounded font-medium">Pro</span>}
                        </h5>
                        <p className="text-xs text-stone-500 dark:text-stone-400 truncate mt-0.5">{song.artist}</p>
                      </div>
                    </div>
                    <span className="text-xs font-medium text-pink-600 dark:text-pink-400 bg-pink-50 dark:bg-pink-950/30 border border-pink-200/60 dark:border-pink-900/40 px-2.5 py-1 rounded-md shrink-0">
                      Match
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      )}

      {/* PLAYER CONTROL BAR */}
      <footer className="fixed bottom-20 md:bottom-5 left-1/2 -translate-x-1/2 w-[94%] max-w-4xl bg-white/95 dark:bg-[#1a1816]/95 backdrop-blur-xl border border-stone-200/90 dark:border-[#2e2a26] rounded-2xl p-4 shadow-lg z-[60] flex flex-col md:flex-row items-center gap-4 transition-all duration-300">
        {/* SONG META */}
        <div
          onClick={() => setLyricsVisble(!lyricsVisible)}
          className="flex items-center gap-3 flex-1 min-w-0 w-full md:w-auto cursor-pointer select-none group"
        >
          <div className="w-12 h-12 rounded-xl bg-[#faf8f6] dark:bg-[#23201d] border border-stone-200/80 dark:border-[#342f2b] flex items-center justify-center text-2xl shrink-0">
            {currentSong?.coverEmoji || '🎵'}
          </div>
          <div className="min-w-0">
            <h4 className="text-sm font-semibold text-stone-900 dark:text-stone-100 truncate flex items-center gap-2">
              <span className="truncate">{currentSong?.title || 'No Track Loaded'}</span>
              <span className={`text-[10px] px-2 py-0.5 rounded font-medium shrink-0 ${lyricsVisible ? 'bg-pink-600 text-white' : 'bg-stone-100 dark:bg-[#23201d] text-stone-600 dark:text-stone-300'}`}>
                {lyricsVisible ? 'Hide Lyrics' : 'Lyrics'}
              </span>
            </h4>
            <p className="text-xs text-stone-500 dark:text-stone-400 truncate mt-0.5">
              {currentSong?.artist || 'Select a Song'}
            </p>
          </div>
        </div>

        {/* SEEK SLIDER */}
        <div className="flex flex-col items-center gap-1 w-full md:w-1/3 shrink-0">
          <div className="flex items-center justify-between text-[11px] font-mono text-stone-400 dark:text-stone-500 w-full tabular-nums">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>

          <input
            type="range"
            min="0"
            max={duration || 100}
            value={currentTime}
            onChange={handleSeek}
            className="w-full accent-pink-600 h-1.5 bg-stone-200 dark:bg-[#342f2b] rounded-lg cursor-pointer"
          />
        </div>

        {/* PLAYBACK CONTROLS */}
        <div className="flex items-center gap-2 w-full md:w-auto justify-center select-none">
          <button
            type="button"
            onClick={() => setIsShuffle(!isShuffle)}
            className={`p-2 rounded-xl transition-all cursor-pointer ${isShuffle ? 'text-pink-600 dark:text-pink-400 bg-pink-50 dark:bg-pink-950/30 border border-pink-200/70 dark:border-pink-900/40' : 'text-stone-400 hover:text-stone-700 dark:hover:text-stone-200'}`}
            title="Shuffle"
          >
            <Sparkles size={15} />
          </button>

          <button
            type="button"
            onClick={onPrev}
            className="p-2 text-stone-600 dark:text-stone-300 hover:text-pink-600 dark:hover:text-pink-400 hover:bg-stone-100 dark:hover:bg-[#23201d] rounded-xl transition-colors cursor-pointer"
            aria-label="Previous track"
          >
            <SkipBack size={18} />
          </button>

          <button
            type="button"
            onClick={onTogglePlay}
            className="w-11 h-11 bg-pink-600 hover:bg-pink-700 active:scale-95 text-white rounded-full flex items-center justify-center shadow-sm transition-all cursor-pointer"
            aria-label={isMusicPlaying ? 'Pause' : 'Play'}
          >
            {isMusicPlaying ? <Pause size={18} /> : <Play size={18} className="ml-0.5" />}
          </button>

          <button
            type="button"
            onClick={onNext}
            className="p-2 text-stone-600 dark:text-stone-300 hover:text-pink-600 dark:hover:text-pink-400 hover:bg-stone-100 dark:hover:bg-[#23201d] rounded-xl transition-colors cursor-pointer"
            aria-label="Next track"
          >
            <SkipForward size={18} />
          </button>

          <button
            type="button"
            onClick={() => setIsRepeat(isRepeat === 'off' ? 'all' : isRepeat === 'all' ? 'one' : 'off')}
            className={`px-2 py-1.5 rounded-xl text-[11px] font-semibold flex items-center gap-1 transition-all cursor-pointer ${isRepeat !== 'off' ? 'text-pink-600 dark:text-pink-400 bg-pink-50 dark:bg-pink-950/30 border border-pink-200/70 dark:border-pink-900/40' : 'text-stone-400 hover:text-stone-700 dark:hover:text-stone-200'}`}
            title={`Repeat: ${isRepeat}`}
          >
            <Repeat size={13} />
            <span className="capitalize">{isRepeat}</span>
          </button>
        </div>

        {/* VOLUME */}
        <div className="hidden md:flex items-center gap-2 border-l border-stone-200 dark:border-[#2e2a26] pl-3 w-auto justify-end">
          <button
            type="button"
            onClick={toggleMute}
            className="text-stone-500 dark:text-stone-400 hover:text-pink-600 dark:hover:text-pink-400 p-1.5 transition-colors cursor-pointer"
            aria-label={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={isMuted ? 0 : volume}
            onChange={handleVolumeChange}
            className="w-16 h-1 accent-pink-600 cursor-pointer"
          />
        </div>
      </footer>

      {/* LYRICS DRAWER */}
      {lyricsVisible && (
        <div className="bg-white dark:bg-[#1a1816] p-6 rounded-2xl border border-stone-200/80 dark:border-[#2e2a26] shadow-sm space-y-4 animate-fadeIn">
          <div className="flex justify-between items-center text-xs text-stone-500 dark:text-stone-400 border-b border-stone-100 dark:border-[#2e2a26] pb-3">
            <span className="font-semibold text-stone-800 dark:text-stone-100 flex items-center gap-1.5">
              <Sparkles size={14} className="text-pink-600 dark:text-pink-400" />
              {currentSong?.title} — Guided Lyrics
            </span>
            <span className="text-emerald-600 dark:text-emerald-400 font-medium">Synced</span>
          </div>

          <div className="max-h-56 overflow-y-auto scrollbar-hide py-2 text-center text-sm text-stone-600 dark:text-stone-300 font-serif italic leading-relaxed space-y-3">
            {computedLyrics.map((lyr, idx) => (
              <p key={idx} className={idx === 2 ? 'text-pink-600 dark:text-pink-400 font-semibold border-y border-stone-100 dark:border-[#2e2a26] py-2' : ''}>
                {lyr}
              </p>
            ))}
          </div>

          <p className="text-[11px] text-stone-400 dark:text-stone-500 border-t border-stone-100 dark:border-[#2e2a26] pt-3">
            Streams provided via open-licensed audio assets.
          </p>
        </div>
      )}

      {/* PREMIUM TRACK MODAL */}
      {lockedSongAttempt && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[110] p-4 animate-fadeIn">
          <div className="bg-white dark:bg-[#1a1816] p-6 md:p-7 rounded-2xl border border-stone-200/80 dark:border-[#2e2a26] max-w-sm w-full text-center space-y-5 shadow-xl text-stone-700 dark:text-stone-200">
            <div className="w-14 h-14 bg-pink-50 dark:bg-pink-950/30 border border-pink-200/70 dark:border-pink-900/40 text-pink-600 dark:text-pink-400 rounded-2xl flex items-center justify-center mx-auto">
              <Lock size={24} />
            </div>

            <div className="space-y-1.5">
              <h4 className="text-xl font-serif text-stone-900 dark:text-stone-100">
                Unlock Premium Track
              </h4>
              <p className="text-xs text-stone-500 dark:text-stone-400 font-medium">
                &ldquo;{lockedSongAttempt.title}&rdquo; • {lockedSongAttempt.artist}
              </p>
              <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed pt-2">
                This acoustic track is part of the Premium Sound Therapy Suite with prenatal, lo-fi, and sleep soundscapes.
              </p>
            </div>

            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setLockedSongAttempt(null);
                  window.dispatchEvent(new CustomEvent('lumina-set-active-tab', { detail: { tab: 'settings', subTab: 'billing' } }));
                }}
                className="w-full h-11 bg-pink-600 hover:bg-pink-700 text-white rounded-xl text-xs font-semibold transition-all cursor-pointer"
              >
                Unlock with Lumina Pro
              </button>
              <button
                type="button"
                onClick={() => setLockedSongAttempt(null)}
                className="w-full h-10 bg-stone-100 dark:bg-[#23201d] hover:bg-stone-200/70 dark:hover:bg-[#2e2a26] rounded-xl text-xs font-medium text-stone-600 dark:text-stone-300 transition-all cursor-pointer"
              >
                Maybe Later
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MusicRoom;
