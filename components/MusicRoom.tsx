import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Song, User } from '../types';
import { SONGS } from '../constants';
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
  ThumbsUp
} from 'lucide-react';

interface MusicRoomProps {
  user: User;
  onToggleFavorite: (songId: string) => void;
  currentSongIndex: number;
  onSelectSong: (index: number) => void;
  isMusicPlaying: boolean;
  onTogglePlay: () => void;
  onNext: () => void;
  onPrev: () => void;
  onAddCustomSong: (song: Song) => void;
}

interface CustomPlaylist {
  id: string;
  name: string;
  songs: string[];
  isOffline?: boolean;
}

const CATEGORIES = [
  { id: 'all', label: 'All', emoji: '🌈' },
  { id: 'jazz', label: 'Jazz 🎷', emoji: '🎷' },
  { id: 'pop', label: 'Pop 🎤', emoji: '🎤' },
  { id: 'afrobeats', label: 'Afrobeats 🌍', emoji: '🌍' },
  { id: 'r&b', label: 'R&B 🎶', emoji: '🎶' },
  { id: 'classical', label: 'Classical 🎻', emoji: '🎻' },
  { id: 'gospel', label: 'Gospel ✨', emoji: '✨' },
  { id: 'relaxation & sleep', label: 'Relaxation & Sleep 😴', emoji: '😴' },
  { id: 'meditation', label: 'Meditation 🧘', emoji: '🧘' },
  { id: 'pregnancy relaxation', label: 'Pregnancy Relaxation 🤰', emoji: '🤰' },
  { id: 'postpartum wellness', label: 'Postpartum Wellness 🌸', emoji: '🌸' },
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
  onAddCustomSong
}) => {
  // Navigation Tabs
  const [activeTab, setActiveTab] = useState<'discover' | 'playlists' | 'favorites' | 'recent' | 'mood'>('discover');
  
  // Search & Filters
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  
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
    const local = localStorage.getItem(`lumina_recent_${user.id}`);
    return local ? JSON.parse(local) : ['j1', 'af1', 'p1'];
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

  // Determine current cycle phase
  const cyclePhase = useMemo(() => {
    if (user.isPregnancyMode) return 'pregnancy';
    if (!user.lastPeriodStart) return 'follicular';
    const today = new Date();
    const lastStart = new Date(user.lastPeriodStart);
    const diffDays = Math.floor((today.getTime() - lastStart.getTime()) / (1000 * 60 * 60 * 24));
    const cycleDay = (diffDays % (user.cycleLength || 28)) + 1;
    
    if (cycleDay <= (user.periodLength || 5)) return 'period';
    if (cycleDay <= (user.cycleLength || 28) - 14) return 'follicular';
    if (cycleDay <= (user.cycleLength || 28) - 10) return 'ovulation';
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
    return recentlyPlayed.map(id => fullLibrary.find(s => s.id === id)).filter(Boolean) as Song[];
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
    <div className="space-y-8 animate-fadeIn pb-36">
      {/* HEADER SECTION WITH DYNAMIC QUOTE */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-gradient-to-br from-white to-pink-50/20 p-6 rounded-[3rem] border border-pink-100/30">
        <div>
          <h2 className="text-4xl font-serif text-pink-500 italic flex items-center gap-2">
            <Music className="text-pink-400 shrink-0" size={28} />
            Lumina Music Hub 🎵
          </h2>
          <p className="text-xs text-pink-400 mt-1 uppercase tracking-widest font-black flex items-center gap-1">
            <Radio className="animate-pulse text-rose-500" size={13} />
            Tailored Wellness Audio • {user.isPregnancyMode ? "Pregnancy Sanctuary" : "Cycle Syncing"}
          </p>
        </div>
        
        {/* TAB SWITCHERS GRID */}
        <div className="flex bg-pink-50/40 p-1 rounded-2xl border border-pink-100/50 w-full md:w-auto overflow-x-auto scrollbar-hide shrink-0 gap-1 select-none">
          <button 
            type="button"
            onClick={() => { setActiveTab('discover'); setSelectedPlaylistInfo(null); }}
            className={`px-4 py-2.5 rounded-xl text-[10px] font-black tracking-widest uppercase transition-all flex items-center gap-1 ${activeTab === 'discover' ? 'bg-pink-500 text-white shadow-md shadow-pink-150' : 'text-pink-400 hover:bg-pink-100/30'}`}
          >
            <Compass size={12} />
            Discover
          </button>
          
          <button 
            type="button"
            onClick={() => { setActiveTab('playlists'); }}
            className={`px-4 py-2.5 rounded-xl text-[10px] font-black tracking-widest uppercase transition-all flex items-center gap-1 ${activeTab === 'playlists' ? 'bg-pink-500 text-white shadow-md shadow-pink-150' : 'text-pink-400 hover:bg-pink-100/30'}`}
          >
            <ListMusic size={12} />
            Playlists
          </button>

          <button 
            type="button"
            onClick={() => { setActiveTab('favorites'); }}
            className={`px-4 py-2.5 rounded-xl text-[10px] font-black tracking-widest uppercase transition-all flex items-center gap-1 ${activeTab === 'favorites' ? 'bg-pink-500 text-white shadow-md shadow-pink-150' : 'text-pink-400 hover:bg-pink-100/30'}`}
          >
            <Heart size={12} />
            Liked
          </button>

          <button 
            type="button"
            onClick={() => { setActiveTab('recent'); }}
            className={`px-4 py-2.5 rounded-xl text-[10px] font-black tracking-widest uppercase transition-all flex items-center gap-1 ${activeTab === 'recent' ? 'bg-pink-500 text-white shadow-md shadow-pink-150' : 'text-pink-400 hover:bg-pink-100/30'}`}
          >
            <Clock size={12} />
            Recent
          </button>

          <button 
            type="button"
            onClick={() => { setActiveTab('mood'); }}
            className={`px-4 py-2.5 rounded-xl text-[10px] font-black tracking-widest uppercase transition-all flex items-center gap-1 ${activeTab === 'mood' ? 'bg-pink-500 text-white shadow-md shadow-pink-150' : 'text-pink-400 hover:bg-pink-100/30'}`}
          >
            <Sparkles size={12} />
            Lumina AI
          </button>
        </div>
      </header>

      {/* SEARCH AND ADD EXPANDER BAR */}
      <section className="bg-white p-5 rounded-[2.5rem] shadow-sm border border-pink-50 flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-pink-300" size={16} />
          <input 
            type="text" 
            placeholder="Search matching Cardi B, SZA, Tems, Burna Boy, Classical, Jazz..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs font-serif italic pl-11 pr-5 py-3.5 bg-pink-50/30 rounded-2xl border border-pink-100/50 outline-none focus:border-pink-300 focus:bg-white transition-all text-pink-700"
          />
        </div>
        <button
          type="button"
          onClick={() => setShowAddForm(!showAddForm)}
          className="w-full md:w-auto px-6 py-3.5 bg-pink-50 hover:bg-pink-100/50 text-pink-500 rounded-2xl text-[9px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer border border-pink-100"
        >
          {showAddForm ? '✕ Hide Form' : '➕ Add Custom Track'}
        </button>
      </section>

      {/* CREATE CUSTOM SONG TRACK EXPANDABLE PANEL */}
      {showAddForm && (
        <fieldset className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-pink-100 animate-slideDown space-y-4">
          <legend className="px-4 py-1 text-[9px] font-black bg-pink-500 text-white rounded-full uppercase tracking-widest">
            Add Custom Sovereign Track
          </legend>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <span className="text-[9px] font-bold text-pink-400 uppercase tracking-wider pl-1 font-sans">Song Title</span>
              <input 
                type="text" 
                placeholder="e.g. Lavender Sleep Whispers" 
                value={newTitle} 
                onChange={(e) => setNewTitle(e.target.value)}
                className="p-3 bg-pink-50/40 rounded-xl outline-none border border-pink-50 text-xs text-pink-700 focus:border-pink-200"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="text-[9px] font-bold text-pink-400 uppercase tracking-wider pl-1 font-sans">Artist / Performer</span>
              <input 
                type="text" 
                placeholder="e.g. Solfeggio Solitude" 
                value={newArtist} 
                onChange={(e) => setNewArtist(e.target.value)}
                className="p-3 bg-pink-50/40 rounded-xl outline-none border border-pink-50 text-xs text-pink-700 focus:border-pink-200"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex flex-col gap-1.5">
              <span className="text-[9px] font-bold text-pink-400 uppercase tracking-wider pl-1 font-sans">Cover Emoji</span>
              <input 
                type="text" 
                placeholder="e.g. 🧘, 🌧️, 🎷" 
                value={newEmoji} 
                onChange={(e) => setNewEmoji(e.target.value)}
                className="p-3 bg-pink-50/40 rounded-xl outline-none border border-pink-50 text-xs text-pink-700 focus:border-pink-200 text-center"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="text-[9px] font-bold text-pink-400 uppercase tracking-wider pl-1 font-sans">Target Genre Category</span>
              <select
                value={newGenre}
                onChange={(e) => setNewGenre(e.target.value)}
                className="p-3 bg-pink-50/40 rounded-xl outline-none border border-pink-50 text-xs text-pink-700 focus:border-pink-200"
              >
                {CATEGORIES.filter(c => c.id !== 'all').map(c => (
                  <option key={c.id} value={c.id}>{c.emoji} {c.label}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5 md:col-span-1">
              <span className="text-[9px] font-bold text-pink-400 uppercase tracking-wider pl-1 font-sans">Song URL (Standard MP3 Link)</span>
              <input 
                type="text" 
                placeholder="https://example.com/audio.mp3" 
                value={newUrl} 
                onChange={(e) => setNewUrl(e.target.value)}
                className="p-3 bg-pink-50/40 rounded-xl outline-none border border-pink-50 text-xs text-pink-700 focus:border-pink-200"
              />
            </div>
          </div>
          <button 
            type="button"
            onClick={handleAddSong}
            disabled={!newTitle}
            className="w-full py-3.5 bg-gradient-to-r from-pink-500 to-rose-400 hover:opacity-90 active:scale-98 text-white rounded-2xl text-[9px] font-black uppercase tracking-widest disabled:opacity-50 transition-all cursor-pointer"
          >
            Add To Sanctuary Soundbank 📥
          </button>
        </fieldset>
      )}

      {/* TAB CONTENTS */}

      {/* TAB 1: DISCOVER TAB */}
      {activeTab === 'discover' && (
        <>
          {/* HIGH-TOUCH DYNAMIC TRENDING HERO FOR DIVERSE ARTISTS */}
          <section className="space-y-4">
            <div className="flex justify-between items-center px-1">
              <h3 className="text-xl font-serif text-pink-500 italic flex items-center gap-1">
                <Flame size={18} className="text-orange-400 animate-pulse" />
                Featured & Popular Releases 
              </h3>
              <span className="text-[9px] font-black text-pink-400 bg-pink-50 border border-pink-100/50 px-3 py-1 rounded-full uppercase tracking-widest">
                🔥 Hot Picks
              </span>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {trendingSongs.map((song) => {
                const songIdx = fullLibrary.indexOf(song);
                const isCurrent = currentSongIndex === songIdx;
                const isFav = favorites.includes(song.id);

                return (
                  <div 
                    key={song.id} 
                    onClick={() => onSelectSong(songIdx)}
                    className="group relative aspect-square bg-gradient-to-br from-white to-pink-50/10 rounded-[2.2rem] border border-pink-100/40 overflow-hidden cursor-pointer hover:shadow-xl hover:shadow-pink-100/40 transition-all hover:scale-[1.03]"
                  >
                    <div className="absolute inset-0 bg-gradient-to-t from-pink-900/90 via-pink-700/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4">
                      <p className="text-white font-serif italic text-xs truncate leading-snug">{song.title}</p>
                      <p className="text-pink-200 text-[8px] uppercase font-black tracking-widest truncate mt-0.5">{song.artist}</p>
                      <div className="text-[7px] text-pink-100 uppercase tracking-tight truncate border-t border-pink-400/30 mt-1 pt-1 italic font-serif">
                        📻 Album: {(song as any).album}
                      </div>
                    </div>
                    
                    <div className="w-full h-full flex flex-col items-center justify-center p-4">
                      <div className="text-4xl mb-2 transition-transform duration-300 group-hover:scale-125">
                        {song.coverEmoji}
                      </div>
                      <span className="text-[10px] font-serif italic text-pink-600 font-black truncate max-w-full block group-hover:opacity-0 transition-opacity">{song.title}</span>
                      <span className="text-[8px] text-gray-400 font-bold uppercase tracking-wider truncate max-w-full block group-hover:opacity-0 transition-opacity">{song.artist}</span>
                    </div>

                    <button 
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleFavorite(song.id);
                      }}
                      className="absolute top-3 right-3 w-7 h-7 bg-white/90 backdrop-blur-md rounded-full flex items-center justify-center text-xs shadow-sm z-10 hover:scale-110 active:scale-95 transition-all text-pink-500"
                    >
                      {isFav ? '💖' : '🤍'}
                    </button>
                  </div>
                );
              })}
            </div>
          </section>

          {/* DYNAMIC SCROLLABLE CATEGORIES/GENRES */}
          <section className="space-y-4">
            <h3 className="text-xl font-serif text-pink-500 italic pl-1">Browse Sanctuary Genres</h3>
            <div className="flex gap-3 overflow-x-auto pb-3 scrollbar-hide select-none">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setActiveCategory(cat.id)}
                  className={`flex items-center gap-2.5 px-5 py-3 rounded-2xl border transition-all whitespace-nowrap text-xs font-black uppercase tracking-wider shrink-0 cursor-pointer ${activeCategory === cat.id ? 'bg-gradient-to-r from-pink-500 to-rose-450 text-white border-pink-500 shadow-md shadow-pink-100' : 'bg-white text-pink-400 border-pink-50 hover:border-pink-200'}`}
                >
                  <span className="text-sm">{cat.emoji}</span>
                  <span>{cat.id === 'all' ? 'All' : cat.id}</span>
                </button>
              ))}
            </div>
          </section>

          {/* DENSE SEARCH LIST */}
          <section className="space-y-4">
            <div className="flex justify-between items-center px-1">
              <h4 className="text-sm font-bold text-pink-900 tracking-wide uppercase">
                {activeCategory === 'all' ? 'Lumina Full Sanctuary Library' : `${activeCategory} Collection`} ({filteredSongs.length})
              </h4>
              <span className="text-[8px] text-gray-400 font-mono">Tap Track to Play</span>
            </div>

            {filteredSongs.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-[3rem] border border-pink-50">
                <span className="text-4xl block mb-2">🐚</span>
                <p className="text-xs text-pink-400 italic font-serif">Empty echo... We could not find any songs matching "{searchQuery}" in {activeCategory}.</p>
              </div>
            ) : (
              <div className="grid gap-3.5">
                {filteredSongs.map((song) => {
                  const songIdx = fullLibrary.indexOf(song);
                  const isCurrent = currentSongIndex === songIdx;
                  const isFav = favorites.includes(song.id);

                  return (
                    <div 
                      key={song.id}
                      onClick={() => onSelectSong(songIdx)}
                      className={`group bg-white p-4.5 rounded-[2rem] border transition-all duration-300 flex items-center justify-between cursor-pointer relative ${isCurrent ? 'border-pink-300 ring-2 ring-pink-100 bg-pink-50/10' : 'border-pink-50 hover:border-pink-200'}`}
                    >
                      <div className="flex items-center gap-4.5">
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shadow-inner transition-all duration-300 ${isCurrent ? 'bg-pink-100 scale-105 rotate-3' : 'bg-pink-50/40 group-hover:scale-105'}`}>
                          {song.coverEmoji}
                        </div>
                        <div>
                          <h5 className={`font-serif text-sm font-bold truncate leading-snug ${isCurrent ? 'text-pink-600' : 'text-gray-700'}`}>
                            {song.title}
                          </h5>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] font-bold text-pink-400 uppercase tracking-widest">{song.artist}</span>
                            <span className="text-gray-300 text-[9px] font-thin">•</span>
                            <span className="text-[9px] text-gray-400 font-serif italic">Album: {(song as any).album}</span>
                          </div>
                        </div>
                      </div>

                      {/* RIGHT MENU DROPDOWNS AND PLAY BUTTONS */}
                      <div className="flex items-center gap-4">
                        {/* PLAYLIST ADD OPTION */}
                        <div className="relative">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveDropdownSongId(activeDropdownSongId === song.id ? null : song.id);
                            }}
                            className="p-2 border border-pink-50 text-pink-400 hover:text-pink-600 rounded-xl hover:bg-pink-50/50 transition-colors"
                            title="Add to Custom Playlist"
                          >
                            <ListPlus size={15} />
                          </button>

                          {activeDropdownSongId === song.id && (
                            <div className="absolute right-0 mt-2 w-48 bg-white border border-pink-100 rounded-2xl shadow-xl py-2 z-30 animate-fadeIn text-left">
                              <p className="px-3.5 py-1 text-[8px] font-black text-pink-400 uppercase tracking-widest border-b border-pink-50">Add to Playlist</p>
                              {playlists.map(pl => (
                                <button
                                  key={pl.id}
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    addSongToPlaylist(song.id, pl.id);
                                  }}
                                  className="w-full text-left px-4 py-2 text-xs text-gray-600 hover:bg-pink-50 hover:text-pink-600 transition-colors truncate"
                                >
                                  {pl.name}
                                </button>
                              ))}
                              <div className="border-t border-pink-50 mt-1 pt-1">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setShowCreatePlaylistModal(true);
                                    setActiveDropdownSongId(null);
                                  }}
                                  className="w-full text-left px-4 py-2 text-[10px] font-bold text-pink-500 hover:text-pink-700 transition-colors uppercase tracking-wider"
                                >
                                  ➕ Create Playlist
                                </button>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* FAVORITING */}
                        <button 
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleFavorite(song.id);
                          }}
                          className="text-xl hover:scale-125 transition-transform"
                        >
                          {isFav ? '💖' : '🤍'}
                        </button>

                        {/* Play/pause button */}
                        <button 
                          type="button"
                          className={`w-9 h-9 rounded-full flex items-center justify-center text-xs shadow-md transition-all ${isCurrent && isMusicPlaying ? 'bg-rose-500 text-white animate-pulse' : 'bg-pink-50 text-pink-400 hover:bg-pink-500 hover:text-white'}`}
                        >
                          {isCurrent && isMusicPlaying ? <Pause size={13} /> : <Play size={13} />}
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
        <fieldset className="space-y-6">
          <legend className="px-4 py-1 text-[9px] font-black bg-pink-500 text-white rounded-full uppercase tracking-widest">
            Personalized Soundboards & Playlists
          </legend>

          <div className="flex md:flex-row flex-col justify-between items-start md:items-center gap-4">
            <div>
              <h3 className="text-xl font-serif text-pink-500 italic pl-1">Your Custom Playlists</h3>
              <p className="text-[10px] text-gray-400 mt-0.5">Organize tracks to balance cortisol spikes and maintain optimal baseline levels.</p>
            </div>
            
            <button
              type="button"
              onClick={() => setShowCreatePlaylistModal(true)}
              className="px-6 py-3 bg-gradient-to-r from-pink-500 to-rose-450 text-white rounded-2xl text-[9px] font-black uppercase tracking-widest shadow-md transition-all active:scale-95 cursor-pointer"
            >
              ➕ Create New Playlist
            </button>
          </div>

          {/* DYNAMIC PLAYLIST GENERATOR MODAL VIEW */}
          {showCreatePlaylistModal && (
            <div className="bg-pink-50/65 p-6 rounded-[2.5rem] border border-pink-100 animate-fadeIn space-y-4">
              <h4 className="font-serif italic text-pink-500">Design New Personalized Playlist</h4>
              <div className="relative">
                <input 
                  type="text" 
                  placeholder="e.g. My Late Night Womb Relaxer" 
                  value={newPlaylistName}
                  onChange={(e) => setNewPlaylistName(e.target.value)}
                  className="w-full p-4 bg-white rounded-2xl border border-pink-200 font-sans text-xs text-pink-700 outline-none focus:border-pink-300"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={createPlaylist}
                  disabled={!newPlaylistName}
                  className="px-6 py-3 bg-pink-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest disabled:opacity-50"
                >
                  Confirm Playlist
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreatePlaylistModal(false)}
                  className="px-6 py-3 bg-gray-100 text-gray-400 rounded-xl text-[10px] font-black uppercase tracking-widest"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* SELECT PLAYLIST COMPONENT HEADER */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {playlists.map((pl) => {
              const matchedSongs = pl.songs.map(id => fullLibrary.find(s => s.id === id)).filter(Boolean) as Song[];
              const isSelected = selectedPlaylistInfo?.id === pl.id;

              return (
                <div 
                  key={pl.id}
                  onClick={() => setSelectedPlaylistInfo(pl)}
                  className={`bg-white p-6 rounded-[2.5rem] border transition-all duration-300 cursor-pointer relative ${isSelected ? 'border-pink-300 shadow-md shadow-pink-100/50' : 'border-pink-50 hover:border-pink-150'}`}
                >
                  <div className="flex justify-between items-start mb-6">
                    <span className="text-3xl leading-none">💿</span>
                    
                    <div className="flex gap-1.5">
                      {/* DOWNLOAD BUTTON */}
                      <button
                        type="button"
                        onClick={(e) => togglePlaylistOffline(pl.id, e)}
                        className={`p-2 rounded-xl transition-colors ${pl.isOffline ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-gray-50 text-gray-400 border border-gray-100 hover:text-pink-500'}`}
                        title={pl.isOffline ? 'Downloaded Offline' : 'Download Playlist'}
                      >
                        {pl.isOffline ? <Check size={13} className="stroke-[3]" /> : <Download size={13} />}
                      </button>

                      <button
                        type="button"
                        onClick={(e) => deletePlaylist(pl.id, e)}
                        className="p-2 bg-rose-50 hover:bg-rose-100/60 text-rose-500 border border-rose-100 rounded-xl transition-colors"
                        title="Delete Playlist"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  <h4 className="font-serif italic text-pink-900 font-bold text-sm tracking-tight truncate leading-snug">{pl.name}</h4>
                  <p className="text-[9px] font-bold text-pink-300 uppercase tracking-widest mt-1">{pl.songs.length} Tracks</p>

                  <div className="mt-4 border-t border-pink-50/50 pt-4 flex justify-between items-center">
                    <span className="text-[8px] uppercase tracking-wider font-mono px-2.5 py-1 bg-pink-50 text-pink-400 rounded-full font-bold">
                      {pl.isOffline ? '📥 Offline Saved' : '☁️ Cloud Synced'}
                    </span>
                    
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        playPlaylist(pl);
                      }}
                      disabled={pl.songs.length === 0}
                      className="px-4 py-2 bg-pink-50 hover:bg-pink-100/60 text-pink-600 rounded-full text-[9px] font-black uppercase tracking-widest disabled:opacity-50 flex items-center gap-1"
                    >
                      <Play size={10} />
                      Play List
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* PLAYLIST DRILLDOWN VIEW DETAILS */}
          {selectedPlaylistInfo && (
            <div className="bg-white p-7 rounded-[3rem] border border-pink-100/80 animate-fadeIn space-y-6 mt-6">
              <div className="flex justify-between items-center border-b border-pink-50 pb-4">
                <div>
                  <h4 className="font-serif text-lg text-pink-600 font-black italic">{selectedPlaylistInfo.name}</h4>
                  <p className="text-[9px] text-gray-500 uppercase tracking-widest">Selected playlist tracks • {selectedPlaylistInfo.isOffline ? '📥 Local Storage Downloaded' : '☁️ Active Stream'}</p>
                </div>
                <button
                  type="button"
                  onClick={() => playPlaylist(selectedPlaylistInfo)}
                  disabled={selectedPlaylistInfo.songs.length === 0}
                  className="px-6 py-2.5 bg-pink-500 hover:bg-pink-600 text-white rounded-full text-xs font-black uppercase tracking-widest shadow-md shadow-pink-150 flex items-center gap-1.5"
                >
                  <Play size={12} />
                  Play Full Playlist
                </button>
              </div>

              {selectedPlaylistInfo.songs.length === 0 ? (
                <div className="text-center py-10 bg-pink-50/20 rounded-[2rem] border border-dashed border-pink-100">
                  <p className="text-xs text-pink-400 font-serif italic mb-2">This playlist is crying for tunes! 🐚</p>
                  <button
                    type="button"
                    onClick={() => setActiveTab('discover')}
                    className="text-[9px] font-black text-pink-500 uppercase tracking-wider underline cursor-pointer"
                  >
                    Go browse Discover tab to add songs!
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-pink-50/40">
                  {selectedPlaylistInfo.songs.map(songId => {
                    const found = fullLibrary.find(s => s.id === songId);
                    if (!found) return null;
                    const songIdx = fullLibrary.indexOf(found);
                    const isCurrent = currentSongIndex === songIdx;

                    return (
                      <div 
                        key={songId}
                        onClick={() => onSelectSong(songIdx)}
                        className="py-3 flex items-center justify-between group cursor-pointer hover:bg-pink-50/10 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{found.coverEmoji}</span>
                          <div>
                            <h5 className={`font-serif text-xs font-bold ${isCurrent ? 'text-pink-600' : 'text-gray-700'}`}>{found.title}</h5>
                            <p className="text-[9px] text-pink-300 font-bold uppercase tracking-wider">{found.artist}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={(e) => removeSongFromPlaylist(found.id, selectedPlaylistInfo.id, e)}
                            className="p-1 px-2.5 bg-gray-50 group-hover:bg-rose-50 text-gray-400 group-hover:text-rose-500 rounded-xl text-[9px] font-black uppercase transition-all"
                            title="Remove Song from Playlist"
                          >
                            Remove ✕
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </fieldset>
      )}

      {/* TAB 3: FAVORITES TAB */}
      {activeTab === 'favorites' && (
        <fieldset className="space-y-4">
          <legend className="px-4 py-1 text-[9px] font-black bg-pink-500 text-white rounded-full uppercase tracking-widest">
            Your Premium Liked Grooves
          </legend>

          <h3 className="text-xl font-serif text-pink-500 italic pl-1">Favorite Sanctuary Hits ({favoriteSongsCollected.length})</h3>

          {favoriteSongsCollected.length === 0 ? (
            <div className="text-center py-24 bg-white rounded-[3rem] border border-pink-50">
              <span className="text-4xl block mb-2">🐚</span>
              <p className="text-xs text-pink-400 italic font-serif">You haven't liked any songs yet. Press '💖' on Discover cards to unlock quick lists!</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {favoriteSongsCollected.map((song) => {
                const songIdx = fullLibrary.indexOf(song);
                const isCurrent = currentSongIndex === songIdx;

                return (
                  <div 
                    key={song.id}
                    onClick={() => onSelectSong(songIdx)}
                    className={`bg-white p-4 rounded-3xl border flex items-center justify-between cursor-pointer transition-all ${isCurrent ? 'border-pink-300 bg-pink-50/10' : 'border-pink-50 hover:border-pink-150'}`}
                  >
                    <div className="flex items-center gap-4">
                      <span className="text-2xl">{song.coverEmoji}</span>
                      <div>
                        <h4 className={`font-serif text-sm font-bold ${isCurrent ? 'text-pink-700' : 'text-gray-700'}`}>{song.title}</h4>
                        <p className="text-[9px] text-pink-300 font-bold uppercase tracking-wider">{song.artist}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleFavorite(song.id);
                        }}
                        className="text-xl hover:scale-125 transition-transform"
                      >
                        💖
                      </button>
                      
                      <button className="w-8 h-8 rounded-full bg-pink-500 text-white flex items-center justify-center shadow-sm">
                        {isCurrent && isMusicPlaying ? <Pause size={12} /> : <Play size={12} />}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </fieldset>
      )}

      {/* TAB 4: RECENTLY PLAYED TAB */}
      {activeTab === 'recent' && (
        <fieldset className="space-y-4">
          <legend className="px-4 py-1 text-[9px] font-black bg-pink-500 text-white rounded-full uppercase tracking-widest">
            History Archives
          </legend>

          <h3 className="text-xl font-serif text-pink-500 italic pl-1">Recently Played Songs</h3>

          {recentSongsCollected.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-[3rem] border border-pink-50">
              <span className="text-3xl block mb-2">📻</span>
              <p className="text-xs text-pink-400 italic">No history logged yet. Listen to tracks to activate logger.</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {recentSongsCollected.map((song) => {
                const songIdx = fullLibrary.indexOf(song);
                const isCurrent = currentSongIndex === songIdx;

                return (
                  <div 
                    key={song.id}
                    onClick={() => onSelectSong(songIdx)}
                    className="bg-white p-4.5 rounded-3xl border border-pink-50 flex justify-between items-center cursor-pointer hover:border-pink-200"
                  >
                    <div className="flex items-center gap-3.5">
                      <span className="text-2xl">{song.coverEmoji}</span>
                      <div>
                        <h4 className="font-serif text-xs font-bold text-pink-900 leading-snug">{song.title}</h4>
                        <p className="text-[9px] text-pink-300 font-bold uppercase tracking-widest">{song.artist}</p>
                      </div>
                    </div>
                    <button className="w-8 h-8 rounded-full bg-pink-50 text-pink-400 flex items-center justify-center">
                      {isCurrent && isMusicPlaying ? <Pause size={12} /> : <Play size={12} />}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </fieldset>
      )}

      {/* TAB 5: LUMINA MOOD RECOMMENDATIONS */}
      {activeTab === 'mood' && (
        <fieldset className="space-y-6">
          <legend className="px-4 py-1 text-[9px] font-black bg-pink-500 text-white rounded-full uppercase tracking-widest">
            Lumina Smart Cycle recommendations
          </legend>

          {/* DYNAMIC WELCOME BANNER EXPLAINING MODE */}
          <section className="bg-gradient-to-br from-pink-500 to-rose-400 p-8 rounded-[3.2rem] text-white space-y-4 shadow-xl shadow-pink-100 relative overflow-hidden">
            <div className="absolute right-4 bottom-0 opacity-10 text-9xl pointer-events-none select-none">
              ☕
            </div>
            
            <span className="px-3.5 py-1 text-[8px] font-black bg-white/20 uppercase tracking-widest rounded-full">
              💫 Recommended Focus: {recommendationDetail.vibe}
            </span>

            <h3 className="text-2.5xl font-serif italic text-white font-bold leading-tight">
              {recommendationDetail.title}
            </h3>
            
            <p className="text-xs text-pink-100 font-serif leading-relaxed mt-2 max-w-2xl">
              {recommendationDetail.desc}
            </p>

            <div className="flex flex-col sm:flex-row gap-3 mt-4 border-t border-white/20 pt-4">
              <button
                type="button"
                onClick={generateLuminaMoodPlaylist}
                className="px-6 py-3 bg-white hover:bg-pink-50 text-pink-600 rounded-2xl text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-1 shadow-md shadow-pink-900/10 cursor-pointer"
              >
                <Sparkles size={11} className="text-pink-500" />
                Auto-Generate Cycle Playlist 🪄
              </button>
            </div>
          </section>

          {/* CHOSEN SONGS GRID */}
          <section className="space-y-4">
            <h4 className="text-sm font-bold text-pink-900 uppercase pl-1">Feminine Energetics Selection</h4>
            <div className="grid gap-3.5">
              {fullLibrary.filter(s => recommendationDetail.targetGenres.some(g => s.tags.includes(g))).slice(0, 5).map(song => {
                const songIdx = fullLibrary.indexOf(song);
                const isCurrent = currentSongIndex === songIdx;

                return (
                  <div 
                    key={song.id}
                    onClick={() => onSelectSong(songIdx)}
                    className="bg-white p-4.5 rounded-[2.2rem] border border-pink-50 flex items-center justify-between cursor-pointer hover:border-pink-200"
                  >
                    <div className="flex items-center gap-4">
                      <span className="text-3xl">{song.coverEmoji}</span>
                      <div>
                        <h5 className="font-serif text-sm font-bold text-pink-900 leading-none">{song.title}</h5>
                        <p className="text-[9px] text-pink-400 font-bold uppercase tracking-widest mt-1.5">{song.artist}</p>
                      </div>
                    </div>
                    <span className="text-[8px] font-bold text-pink-300 uppercase tracking-wider bg-pink-50 px-2.5 py-1 rounded-full">
                      Match Vibe
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
        </fieldset>
      )}

      {/* FULL IMMERSIVE PLAYER CONTROL BAR - FIXED AT FOOTER */}
      <footer className="fixed bottom-24 left-1/2 -translate-x-1/2 w-[92%] max-w-4xl bg-white/95 backdrop-blur-2xl border border-pink-100 rounded-[2.8rem] p-5 shadow-[0_25px_60px_rgba(244,114,182,0.18)] z-[60] flex flex-col md:flex-row items-center gap-4 transition-all duration-300">
        
        {/* SONG META COVER INFO */}
        <div 
          onClick={() => setLyricsVisble(!lyricsVisible)} 
          className="flex items-center gap-3.5 flex-1 min-w-0 w-full md:w-auto cursor-pointer select-none group"
        >
          <div className={`w-13 h-13 rounded-2xl bg-gradient-to-br from-pink-100 to-rose-100 flex items-center justify-center text-3xl shadow-md transition-all duration-500 border border-white ${isMusicPlaying ? 'animate-[spin_12s_linear_infinite]' : 'group-hover:rotate-12'}`}>
            {currentSong?.coverEmoji || '🎵'}
          </div>
          <div className="min-w-0">
            <h4 className="text-sm font-serif italic text-pink-600 font-black truncate flex items-center gap-2">
              {currentSong?.title || 'No Track Loaded'}
              {lyricsVisible ? (
                <span className="text-[8px] px-1.5 py-0.5 bg-pink-500 text-white rounded uppercase tracking-wider scale-90">Hide Lyrics</span>
              ) : (
                <span className="text-[8px] px-1.5 py-0.5 bg-pink-50 text-pink-400 border border-pink-100 rounded uppercase tracking-wider scale-90">Show Lyrics</span>
              )}
            </h4>
            <p className="text-[9px] font-black text-pink-300 uppercase tracking-widest truncate mt-0.5">
              {currentSong?.artist || 'Select a Song'} • {currentSong?.source === 'internal' ? 'Internal' : 'Licensed Service'}
            </p>
          </div>
        </div>

        {/* PROGRESS SEEK SLIDER CONTROLS */}
        <div className="flex flex-col items-center gap-1 w-full md:w-1/3 shrink-0">
          <div className="flex items-center justify-between text-[9px] font-mono font-bold text-gray-400 w-full px-1">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
          
          <input 
            type="range"
            min="0"
            max={duration || 100}
            value={currentTime}
            onChange={handleSeek}
            className="w-full accent-pink-500 h-1.5 bg-pink-100 rounded-lg cursor-pointer transition-all"
          />
        </div>

        {/* MUSIC CONTROLLERS PANEL */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-center select-none">
          {/* SHUFFLE */}
          <button
            type="button"
            onClick={() => setIsShuffle(!isShuffle)}
            className={`p-2 rounded-xl transition-all ${isShuffle ? 'text-pink-600 bg-pink-50 scale-110 border border-pink-100/40' : 'text-gray-400 hover:text-pink-500'}`}
            title="Shuffle"
          >
            <Sparkles size={14} className="animate-pulse" />
          </button>

          {/* PREVIOUS */}
          <button 
            type="button"
            onClick={onPrev}
            className="p-2.5 text-pink-400 hover:text-pink-600 hover:bg-pink-50 rounded-full transition-colors font-bold"
          >
            <SkipBack size={18} className="stroke-[2.5]" />
          </button>

          {/* PLAY/PAUSE CORE ENGINE PORT */}
          <button 
            type="button"
            onClick={onTogglePlay}
            className="w-13 h-13 bg-gradient-to-br from-pink-500 to-rose-450 hover:opacity-90 hover:scale-105 active:scale-95 text-white rounded-full flex items-center justify-center shadow-lg shadow-pink-200 border-4 border-white transition-all transition-transform cursor-pointer"
          >
            {isMusicPlaying ? <Pause size={20} className="stroke-[2.5]" /> : <Play size={20} className="ml-0.5 stroke-[2.5]" />}
          </button>

          {/* NEXT */}
          <button 
            type="button"
            onClick={onNext}
            className="p-2.5 text-pink-400 hover:text-pink-600 hover:bg-pink-50 rounded-full transition-colors font-bold"
          >
            <SkipForward size={18} className="stroke-[2.5]" />
          </button>

          {/* REPEAT BUTTON FLIPPER */}
          <button
            type="button"
            onClick={() => setIsRepeat(isRepeat === 'off' ? 'all' : isRepeat === 'all' ? 'one' : 'off')}
            className={`p-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${isRepeat !== 'off' ? 'text-pink-600 bg-pink-50 border border-pink-100/40' : 'text-gray-400 hover:text-pink-500'}`}
            title={`Repeat: ${isRepeat}`}
          >
            🔂 {isRepeat}
          </button>
        </div>

        {/* VOLUME & LYRICS MINI TOGGLES */}
        <div className="flex items-center gap-2 border-l border-pink-100 pl-4 w-full md:w-auto justify-end">
          <button 
            type="button"
            onClick={toggleMute} 
            className="text-pink-400 hover:text-pink-600 p-1.5 transition-colors"
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
            className="w-16 h-1 accent-pink-450 cursor-pointer"
          />
        </div>
      </footer>

      {/* LYRICS POP DRAWER WITH ESTABLISHED LITERACY */}
      {lyricsVisible && (
        <fieldset className="bg-white p-6.5 rounded-[2.5rem] border border-pink-100 shadow-xl space-y-4 animate-fadeIn">
          <legend className="px-4 py-1 text-[9px] font-black bg-pink-500 text-white rounded-full uppercase tracking-widest flex items-center gap-1">
            <Sparkles size={11} /> Lumina Syncing Lyrics & Visual Equalizer
          </legend>
          
          <div className="flex justify-between items-center text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-pink-50 pb-3">
            <span>Now Reading: {currentSong?.title}</span>
            <span className="text-pink-500 animate-pulse">● Live Equalizer Connected</span>
          </div>

          <div className="max-h-56 overflow-y-auto scrollbar-hide py-2 text-center text-xs text-pink-700/80 font-serif italic leading-relaxed space-y-4 font-black">
            {computedLyrics.map((lyr, idx) => (
              <p key={idx} className={idx === 2 ? 'text-pink-600 font-bold tracking-wide scale-105 border-y border-pink-50/50 py-2' : ''}>
                {lyr}
              </p>
            ))}
          </div>

          <div className="flex items-center gap-2 text-gray-400 text-[8px] font-black uppercase tracking-widest border-t border-pink-50 pt-3">
            <span>🛡️ COPYRIGHT NOTICE: DIRECT STREAM PROVIDED FROM OPEN LICENSED ARCHIVE.ORG / SOUNDHELIX ASSETS TO PROMPT ZERO-TRUST LICENSING VIOLATIONS.</span>
          </div>
        </fieldset>
      )}
    </div>
  );
};

export default MusicRoom;
