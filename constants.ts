
import { Song, AppTheme } from './types';

export const THEMES: Record<AppTheme, { primary: string, secondary: string, bg: string, text: string }> = {
  rose: { primary: 'pink-500', secondary: 'pink-300', bg: 'bg-[#fffafb]', text: 'pink-600' },
  lavender: { primary: 'purple-500', secondary: 'purple-300', bg: 'bg-[#fafaff]', text: 'purple-600' },
  mint: { primary: 'teal-500', secondary: 'teal-300', bg: 'bg-[#fafffa]', text: 'teal-600' },
  peach: { primary: 'orange-400', secondary: 'orange-200', bg: 'bg-[#fffbfa]', text: 'orange-500' },
  sky: { primary: 'sky-500', secondary: 'sky-300', bg: 'bg-[#fafcfe]', text: 'sky-600' },
  emerald: { primary: 'emerald-600', secondary: 'emerald-400', bg: 'bg-[#f8fdfa]', text: 'emerald-700' },
  amber: { primary: 'amber-500', secondary: 'amber-300', bg: 'bg-[#fffdf9]', text: 'amber-600' },
  sunset: { primary: 'rose-600', secondary: 'rose-400', bg: 'bg-[#fffaf9]', text: 'rose-700' },
  lilac: { primary: 'purple-400', secondary: 'purple-200', bg: 'bg-[#fcf8ff]', text: 'purple-500' },
  sage: { primary: 'emerald-700', secondary: 'emerald-500', bg: 'bg-[#f5f8f6]', text: 'emerald-800' },
  coral: { primary: 'rose-500', secondary: 'rose-300', bg: 'bg-[#fff8f8]', text: 'rose-600' },
  ocean: { primary: 'sky-600', secondary: 'sky-400', bg: 'bg-[#f5fbff]', text: 'sky-700' },
  orchid: { primary: 'pink-600', secondary: 'pink-400', bg: 'bg-[#fdf5fd]', text: 'pink-700' },
  gold: { primary: 'amber-600', secondary: 'amber-400', bg: 'bg-[#fefcf5]', text: 'amber-700' },
  latte: { primary: 'amber-800', secondary: 'amber-600', bg: 'bg-[#faf7f4]', text: 'amber-900' },
  periwinkle: { primary: 'indigo-500', secondary: 'indigo-300', bg: 'bg-[#fafbff]', text: 'indigo-600' },
};

export const CYCLE_PHASES = [
  {
    id: 'menstrual',
    name: 'Menstrual Phase',
    duration: 'Days 1-5',
    description: 'The winter of your cycle. Your hormones are at their lowest, and your body is shedding the uterine lining.',
    feelings: ['Introspective', 'Quiet', 'Tired', 'Emotional'],
    cravings: ['Iron-rich foods (steak, spinach)', 'Warm soups', 'Dark chocolate', 'Herbal teas'],
    symptoms: ['Cramps', 'Lower back pain', 'Fatigue', 'Heavy legs'],
    advice: 'Honor your need for rest. It is a time for release and reflection.',
    emoji: '❄️'
  },
  {
    id: 'follicular',
    name: 'Follicular Phase',
    duration: 'Days 6-13',
    description: 'The spring of your cycle. Estrogen begins to rise, bringing new energy and creativity.',
    feelings: ['Creative', 'Confident', 'Outgoing', 'Optimistic'],
    cravings: ['Fresh salads', 'Light proteins', 'Fermented foods', 'Crisp fruits'],
    symptoms: ['Glowing skin', 'Increased energy', 'Better focus', 'Mild twinges'],
    advice: 'Start new projects and say yes to social invitations. You are blooming!',
    emoji: '🌱'
  },
  {
    id: 'ovulatory',
    name: 'Ovulatory Phase',
    duration: 'Days 14',
    description: 'The summer of your cycle. Estrogen and Testosterone peak. You are at your most fertile and magnetic.',
    feelings: ['Magnetic', 'High Libido', 'Articulate', 'Fearless'],
    cravings: ['Light, hydrating foods', 'Smoothies', 'Raw vegetables', 'Seafood'],
    symptoms: ['Increased cervical mucus', 'Heightened senses', 'Slight bloating', 'Ovulation pain'],
    advice: 'Schedule your big presentations or dates. You are absolutely radiant.',
    emoji: '☀️'
  },
  {
    id: 'luteal',
    name: 'Luteal Phase',
    duration: 'Days 15-28',
    description: 'The autumn of your cycle. Progesterone rises. Your body is preparing for a possible pregnancy or your next period.',
    feelings: ['Nesting', 'Anxious', 'Irritable', 'Sensitive'],
    cravings: ['Carbohydrates', 'Comfort foods', 'Peanut butter', 'Root vegetables'],
    symptoms: ['PMS', 'Bloating', 'Breast tenderness', 'Insomnia'],
    advice: 'Slow down. Focus on self-care and setting boundaries. You are protecting your peace.',
    emoji: '🍂'
  }
];

export const SUPPLEMENTS = [
  {
    id: 'magnesium',
    name: 'Magnesium Glycinate',
    bestFor: ['cramps', 'insomnia', 'moody'],
    description: 'The ultimate relaxation mineral. Helps calm the nervous system and relaxes uterine muscles.',
    dosage: '200-400mg daily, especially during Luteal and Menstrual phases.',
    emoji: '💎'
  },
  {
    id: 'iron',
    name: 'Iron (Gentle)',
    bestFor: ['fatigue', 'brain_fog'],
    description: 'Vital during your period to replace what is lost. Boosts energy and focus.',
    dosage: 'As needed during your period. Best taken with Vitamin C.',
    emoji: '🩸'
  },
  {
    id: 'vitamin_b6',
    name: 'Vitamin B6',
    bestFor: ['moody', 'tender_breasts', 'bloating'],
    description: 'A key player in hormone metabolism and neurotransmitter production.',
    dosage: '50-100mg daily to support PMS symptoms.',
    emoji: '💊'
  },
  {
    id: 'omega3',
    name: 'Omega-3 Fish Oil',
    bestFor: ['flare_up', 'cramps', 'acne'],
    description: 'Potent anti-inflammatory. Excellent for Endometriosis flare-up prevention.',
    dosage: '1000-2000mg daily. Look for high EPA/DHA.',
    emoji: '🐟'
  },
  {
    id: 'zinc',
    name: 'Zinc',
    bestFor: ['acne', 'follicular'],
    description: 'Supports healthy skin and egg development. Great for the Follicular phase.',
    dosage: '15-30mg daily.',
    emoji: '✨'
  },
  {
    id: 'vitex',
    name: 'Vitex (Chasteberry)',
    bestFor: ['moody', 'tender_breasts'],
    description: 'Herbal support that balances Progesterone levels naturally.',
    dosage: 'Best taken in the morning on an empty stomach.',
    emoji: '🌿'
  }
];

export const SYMPTOMS = [
  { id: 'cramps', label: 'Cramps', emoji: '🩸' },
  { id: 'headache', label: 'Headache', emoji: '🤕' },
  { id: 'bloating', label: 'Bloating', emoji: '🎈' },
  { id: 'moody', label: 'Mood Swings', emoji: '🌪️' },
  { id: 'acne', label: 'Breakouts', emoji: '✨' },
  { id: 'fatigue', label: 'Tiredness', emoji: '😴' },
  { id: 'tender_breasts', label: 'Tender Breasts', emoji: '🍒' },
  { id: 'insomnia', label: 'Insomnia', emoji: '🌑' },
  { id: 'nausea', label: 'Nausea', emoji: '🤢' },
  { id: 'back_pain', label: 'Back Pain', emoji: '⚡' },
  { id: 'brain_fog', label: 'Brain Fog', emoji: '☁️' },
  { id: 'flare_up', label: 'Endo Flare-up', emoji: '🔥' },
];

export const SONGS: Song[] = [
  // Jazz Category 🎷
  { id: "j1", title: "Midnight Saxophone", artist: "Lumina Jazz Quartet", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3", tags: ["jazz", "calm", "background", "menstrual", "period", "cramps"], coverEmoji: "🎷", source: "internal" },
  { id: "j2", title: "Kind of Blue (Inspiration)", artist: "Miles Davis Studio", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3", tags: ["jazz", "calm", "relax", "luteal", "dreamy"], coverEmoji: "🎺", source: "internal" },
  { id: "j3", title: "Don't Know Why (Warm Cover)", artist: "Norah Jones Tribute", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3", tags: ["jazz", "calm", "vocals", "menstrual", "sleep"], coverEmoji: "☕", source: "internal" },

  // Pop Category 🎤
  { id: "p1", title: "What Was I Made For?", artist: "Billie Eilish", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3", tags: ["pop", "calm", "luteal", "emotional", "dreamy"], coverEmoji: "🎀", source: "internal" },
  { id: "p2", title: "Easy On Me", artist: "Adele", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3", tags: ["pop", "vocals", "menstrual", "period", "cramps"], coverEmoji: "🌧️", source: "internal" },
  { id: "p3", title: "Ocean Eyes", artist: "Billie Eilish", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3", tags: ["pop", "dreamy", "follicular", "happy"], coverEmoji: "🌊", source: "internal" },
  { id: "p4", title: "Up (Hype Instrumental)", artist: "Cardi B Studio", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-13.mp3", tags: ["pop", "excited", "ovulatory", "ovulation", "energy"], coverEmoji: "🔥", source: "internal" },

  // Afrobeats Category 🌍
  { id: "af1", title: "Rush", artist: "Ayra Starr", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3", tags: ["afrobeats", "happy", "follicular", "excited"], coverEmoji: "⭐️", source: "internal" },
  { id: "af2", title: "Last Last", artist: "Burna Boy", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3", tags: ["afrobeats", "excited", "ovulatory", "ovulation", "energy"], coverEmoji: "🦍", source: "internal" },
  { id: "af3", title: "Free Mind", artist: "Tems", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-9.mp3", tags: ["afrobeats", "r&b", "calm", "follicular", "happy"], coverEmoji: "🕊️", source: "internal" },
  { id: "af4", title: "Sability", artist: "Ayra Starr", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-14.mp3", tags: ["afrobeats", "excited", "ovulatory", "energy"], coverEmoji: "💅", source: "internal" },

  // R&B Category 🎶
  { id: "rb1", title: "Kill Bill", artist: "SZA", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-10.mp3", tags: ["r&b", "luteal", "excited", "moody"], coverEmoji: "🗡️", source: "internal" },
  { id: "rb2", title: "Snooze", artist: "SZA", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-11.mp3", tags: ["r&b", "calm", "follicular", "dreamy"], coverEmoji: "💤", source: "internal" },

  // Classical Category 🎻
  { id: "c1", title: "Gymnopédie No. I", artist: "Erik Satie (Chopin Orch)", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-12.mp3", tags: ["classical", "calm", "sleep", "menstrual", "period", "dreamy"], coverEmoji: "🎹", source: "internal" },
  { id: "c2", title: "Spring Waltz", artist: "Frederic Chopin", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-15.mp3", tags: ["classical", "follicular", "happy", "calm"], coverEmoji: "🎻", source: "internal" },

  // Gospel Category ✨
  { id: "g1", title: "Goodness of God", artist: "CeCe Winans Tribute", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-16.mp3", tags: ["gospel", "calm", "vocals", "luteal", "happy", "dreamy"], coverEmoji: "🙌", source: "internal" },

  // Relaxation & Sleep Category 😴
  { id: "rs1", title: "Deep Sea Rain", artist: "Cozy Bedroom Rain", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3", tags: ["relaxation & sleep", "sleep", "calm", "menstrual", "period", "cramps"], coverEmoji: "🌧️", source: "internal" },
  
  // Meditation Category 🧘
  { id: "med1", title: "Ocean Whispers 528Hz", artist: "Inner Sanctuary Solfeggio", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3", tags: ["meditation", "calm", "luteal", "dreamy"], coverEmoji: "🧘", source: "internal" },

  // Pregnancy Relaxation Category 🤰
  { id: "preg1", title: "Angelic Lavender Lullaby (Harp)", artist: "Prenatal Blossom", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3", tags: ["pregnancy relaxation", "calm", "pregnancy", "dreamy"], coverEmoji: "🤰", source: "internal" },
  { id: "preg2", title: "Sweet Embryo Waves", artist: "Cosmic Motherhood", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3", tags: ["pregnancy relaxation", "calm", "pregnancy", "sleep"], coverEmoji: "🍼", source: "internal" },

  // Postpartum Wellness Category 🌸
  { id: "post1", title: "Motherhood Recovery (Soft Flute)", artist: "Womb Healing Society", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3", tags: ["postpartum wellness", "postpartum", "calm", "period", "cramps"], coverEmoji: "🪷", source: "internal" },

  // Lofi Chill Category ☕
  { id: "lf1", title: "Sunset Cozy Chill", artist: "Lumina Lofi Beats", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3", tags: ["lofi chill", "calm", "relax", "dreamy"], coverEmoji: "☕", source: "internal" },
  { id: "lf2", title: "Rainy Cafe Study", artist: "Nostalgia Vibes", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3", tags: ["lofi chill", "calm", "sleep", "background"], coverEmoji: "🌧️", source: "internal" },

  // Acoustic Category 🎸
  { id: "ac1", title: "Warm Fireplace Acoustic", artist: "Acoustic Whispers", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-9.mp3", tags: ["acoustic", "calm", "happy", "vocals"], coverEmoji: "🎸", source: "internal" },
  { id: "ac2", title: "Gentle Morning Breeze", artist: "Folk & Harmony", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-10.mp3", tags: ["acoustic", "calm", "dreamy", "relax"], coverEmoji: "🍃", source: "internal" },

  // Nature Soundscapes Category 🍃
  { id: "ns1", title: "Forest Birds & Gentle Stream", artist: "Earth Sanctuary", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-11.mp3", tags: ["nature soundscapes", "nature sounds", "calm", "sleep", "meditation"], coverEmoji: "🍃", source: "internal" },
  { id: "ns2", title: "Deep Space Ocean Waves", artist: "Zen Sound Healing", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-12.mp3", tags: ["nature soundscapes", "nature sounds", "calm", "sleep", "meditation"], coverEmoji: "🌊", source: "internal" },
  { id: "ns3", title: "Whispering Rain & Windchimes", artist: "Nature Sanctuary", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-13.mp3", tags: ["nature soundscapes", "nature sounds", "calm", "sleep"], coverEmoji: "🎐", source: "internal" },
  { id: "ns4", title: "Golden Beach Sunrise Tide", artist: "Ocean Whispers", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-14.mp3", tags: ["nature soundscapes", "nature sounds", "calm", "relax"], coverEmoji: "🌅", source: "internal" },

  // Lofi Chill Category ☕ (Added more Lofi tracks)
  { id: "lf3", title: "Midnight Tea & Warm Blankets", artist: "Cozy Lumina Beats", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-15.mp3", tags: ["lofi chill", "lo-fi", "calm", "sleep", "relax"], coverEmoji: "🍵", source: "internal" },
  { id: "lf4", title: "Solfeggio Lofi 432Hz", artist: "Theta Frequency Waves", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-16.mp3", tags: ["lofi chill", "lo-fi", "calm", "meditation", "dreamy"], coverEmoji: "☁️", source: "internal" },

  // Ambient Sanctuary Tones 🌌 (New Category)
  { id: "amb1", title: "Celestial Warmth 528Hz", artist: "Solfeggio Soundscapes", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-9.mp3", tags: ["ambient", "calm", "meditation", "sleep", "dreamy"], coverEmoji: "✨", source: "internal" },
  { id: "amb2", title: "Cosmic Breath Control", artist: "Zenith Sound Lab", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-10.mp3", tags: ["ambient", "calm", "meditation", "relax"], coverEmoji: "🪐", source: "internal" },
  { id: "amb3", title: "Deep Sleep Astral Hum", artist: "Andromeda Wave Ensemble", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-11.mp3", tags: ["ambient", "calm", "sleep", "dreamy"], coverEmoji: "🌌", source: "internal" },

  // Cosmic Sanctuary Tones (New Category) 🪐
  { id: "cos1", title: "Jupiter Eternal Drone", artist: "Voyager Sonic Labs", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-14.mp3", tags: ["cosmic", "meditation", "calm", "dreamy"], coverEmoji: "🪐", source: "internal" },
  { id: "cos2", title: "Nebula Sleep Resonance", artist: "Andromeda Wave Ensemble", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-15.mp3", tags: ["cosmic", "relax", "sleep", "calm"], coverEmoji: "🌌", source: "internal" },
  { id: "cos3", title: "Aurora Borealis Chords", artist: "Northern Lights Ambient", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-16.mp3", tags: ["cosmic", "dreamy", "luteal", "happy"], coverEmoji: "✨", source: "internal" },
  { id: "cos4", title: "Solar Wind Flute", artist: "Starry Night Resonance", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-13.mp3", tags: ["cosmic", "calm", "follicular", "happy"], coverEmoji: "☀️", source: "internal" }
];

export const MOODS = [
  { label: 'Happy', emoji: '😊', songTag: 'happy' },
  { label: 'Calm', emoji: '😌', songTag: 'calm' },
  { label: 'Crampy', emoji: '🩹', songTag: 'cramps' },
  { label: 'Sleepy', emoji: '😴', songTag: 'sleep' },
  { label: 'Dreamy', emoji: '☁️', songTag: 'dreamy' },
  { label: 'Excited', emoji: '✨', songTag: 'excited' },
];

export const PRODUCT_TUTORIALS = [
  {
    title: "The Classic Pad",
    icon: "☁️",
    difficulty: "Beginner Friendly",
    bestFor: "School, Sleep, First Periods",
    description: "A rectangular piece of absorbent material that sticks to the inside of your underwear.",
    whenToUse: "Great for any time, especially when you're just starting or during sleep.",
    pros: ["Very easy to use", "No internal insertion", "Available in many sizes"],
    cons: ["Can feel bulky", "Not suitable for swimming", "May shift during heavy activity"],
    prep: ["Wash your hands with floral soap", "Pick a size (Regular/Super/Night)"],
    steps: [
      "Unwrap the pad—keep the wrapper for later disposal!",
      "Peel off the paper backing to reveal the sticky side.",
      "If it has wings, remove those tiny stickers too.",
      "Press the pad firmly onto the center of your pretty underwear.",
      "Wrap the wings around the sides to keep everything secure.",
      "Change every 4-6 hours to stay fresh and floral.",
      "To dispose: Roll it up, wrap it in the wrapper or tissue, and bin it (never flush!)."
    ],
    proTip: "Night pads are longer and keep you worry-free while you dream."
  },
  {
    title: "The Discreet Tampon",
    icon: "🕯️",
    difficulty: "Needs Practice",
    bestFor: "Swimming, Sports, Tight Outfits",
    description: "A small plug of absorbent material inserted into the vagina to soak up blood.",
    whenToUse: "Ideal for active days, swimming, or when you want a discreet option.",
    pros: ["Invisible under clothes", "Can be used for swimming", "No 'wet' feeling"],
    cons: ["Requires internal insertion", "Risk of TSS if left too long", "Can be tricky to learn"],
    prep: ["Clean hands", "Relax your muscles", "Deep breath, princess"],
    steps: [
      "Unwrap the tampon and check that the string is nice and secure.",
      "Find a comfy spot—try standing with one leg on the toilet seat.",
      "Hold the applicator grip with your thumb and middle finger.",
      "Gently slide the outer tube into your vagina towards your lower back.",
      "Push the inner tube with your pointer finger until it's all the way in.",
      "Remove the applicator, leaving the string hanging outside for easy removal.",
      "If you feel it when you walk, it's not in far enough! Gently push or try again."
    ],
    proTip: "Start with 'Lite' or 'Slim' sizes for the smoothest first experience."
  },
  {
    title: "The Eco-Friendly Cup",
    icon: "🍷",
    difficulty: "Advanced",
    bestFor: "Long Days, Eco-Conscious, Heavy Flow",
    description: "A flexible silicone cup that collects rather than absorbs menstrual fluid.",
    whenToUse: "Perfect for long days (up to 12 hours) and reducing waste.",
    pros: ["Reusable for years", "Holds more than tampons", "Eco-friendly"],
    cons: ["Higher upfront cost", "Steep learning curve", "Can be messy to empty in public"],
    prep: ["Sterilize before first use", "Wash hands thoroughly", "Apply water-based lube if needed"],
    steps: [
      "Fold the cup (try the 'C-fold' or 'Punch-down' fold).",
      "Insert the folded cup into your vagina, aiming towards your tailbone.",
      "Let it pop open—it should create a seal against the walls.",
      "Run a finger around the base to ensure it's fully open.",
      "To remove: Pinch the base to break the seal, then gently pull out.",
      "Empty into the toilet, rinse, and reinsert."
    ],
    proTip: "Practice in the shower first to make clean-up a breeze!"
  },
  {
    title: "The Light Liner",
    icon: "🕊️",
    difficulty: "Super Easy",
    bestFor: "Spotting, Discharge, Backup",
    description: "A very thin version of a pad designed for light flow or daily freshness.",
    whenToUse: "Use on very light days, for daily discharge, or as backup with a tampon/cup.",
    pros: ["Extremely thin and comfy", "Great for 'just in case' days", "Very discreet"],
    cons: ["Not absorbent enough for a full period", "Can bunch up if not placed well"],
    prep: ["Wash hands", "Check your flow level"],
    steps: [
      "Unwrap the liner.",
      "Peel off the backing.",
      "Stick it to the center of your underwear.",
      "Change every few hours or whenever it feels damp."
    ],
    proTip: "Liners are perfect for the 'waiting' days before your period officially starts."
  }
];

export const YOGA_POSES = [
  {
    name: "Child's Pose (Balasana)",
    description: "Gently stretches the lower back and promotes deep relaxation. Perfect for cramp relief.",
    benefit: "Calms the mind, eases menstrual tension.",
    image: "https://picsum.photos/seed/yoga1/400/300"
  },
  {
    name: "Cat-Cow Stretch",
    description: "Moves the spine and abdominal muscles to help ease internal tension.",
    benefit: "Flexibility and blood flow boost.",
    image: "https://picsum.photos/seed/yoga2/400/300"
  },
  {
    name: "Bound Angle Pose",
    description: "Opens the hips and stimulates the pelvic region gently.",
    benefit: "Relieves heaviness and bloating.",
    image: "https://picsum.photos/seed/yoga3/400/300"
  }
];

export const BABY_SIZES = [
  { week: 4, size: "Poppy Seed", fruit: "🌱" },
  { week: 8, size: "Raspberry", fruit: "🍓" },
  { week: 12, size: "Lime", fruit: "🍋" },
  { week: 16, size: "Avocado", fruit: "🥑" },
  { week: 20, size: "Banana", fruit: "🍌" },
  { week: 24, size: "Corn", fruit: "🌽" },
  { week: 28, size: "Eggplant", fruit: "🍆" },
  { week: 32, size: "Squash", fruit: "🎃" },
  { week: 36, size: "Honeydew", fruit: "🍈" },
  { week: 40, size: "Watermelon", fruit: "🍉" }
];

export const THEME_PALETTES: Record<AppTheme, {
  50: string;
  100: string;
  200: string;
  300: string;
  400: string;
  500: string;
  600: string;
  700: string;
  800: string;
  900: string;
  950: string;
}> = {
  rose: {
    50: '#fdf2f8', 100: '#fce7f3', 200: '#fbcfe8', 300: '#f9a8d4', 400: '#f472b6',
    500: '#ec4899', 600: '#db2777', 700: '#be185d', 800: '#9d174d', 900: '#831843', 950: '#500724'
  },
  lavender: {
    50: '#faf5ff', 100: '#f3e8ff', 200: '#e9d5ff', 300: '#d8b4fe', 400: '#c084fc',
    500: '#a855f7', 600: '#9333ea', 700: '#7e22ce', 800: '#6b21a8', 900: '#581c87', 950: '#3b0764'
  },
  mint: {
    50: '#f0fdfa', 100: '#ccfbf1', 200: '#99f6e4', 300: '#5eead4', 400: '#2dd4bf',
    500: '#14b8a6', 600: '#0d9488', 700: '#0f766e', 800: '#115e59', 900: '#134e4a', 950: '#042f2e'
  },
  peach: {
    50: '#fff7ed', 100: '#ffedd5', 200: '#fed7aa', 300: '#fdbb74', 400: '#f97316',
    500: '#ea580c', 600: '#ca8a04', 700: '#c2410c', 800: '#9a3412', 900: '#7c2d12', 950: '#431407'
  },
  sky: {
    50: '#f0f9ff', 100: '#e0f2fe', 200: '#bae6fd', 300: '#7dd3fc', 400: '#38bdf8',
    500: '#0ea5e9', 600: '#0284c7', 700: '#0369a1', 800: '#075985', 900: '#0c4a6e', 950: '#082f49'
  },
  emerald: {
    50: '#f0fdf4', 100: '#dcfce7', 200: '#bbf7d0', 300: '#86efac', 400: '#4ade80',
    500: '#22c55e', 600: '#16a34a', 700: '#15803d', 800: '#166534', 900: '#14532d', 950: '#052e16'
  },
  amber: {
    50: '#fffbeb', 100: '#fef3c7', 200: '#fde68a', 300: '#fcd34d', 400: '#fbbf24',
    500: '#f59e0b', 600: '#d97706', 700: '#b45309', 800: '#92400e', 900: '#78350f', 950: '#451a03'
  },
  sunset: {
    50: '#fff1f2', 100: '#ffe4e6', 200: '#fecdd3', 300: '#fda4af', 400: '#fb7185',
    500: '#f43f5e', 600: '#e11d48', 700: '#be123c', 800: '#9f1239', 900: '#881337', 950: '#4c0519'
  },
  lilac: {
    50: '#faf5ff', 100: '#f5e6ff', 200: '#ebd0ff', 300: '#dba3ff', 400: '#c870ff',
    500: '#b53df5', 600: '#9f25df', 700: '#861bb8', 800: '#6e1596', 900: '#5a117b', 950: '#3c0554'
  },
  sage: {
    50: '#f4f7f5', 100: '#e6ede8', 200: '#cbdcd0', 300: '#a4c2ae', 400: '#7ca48a',
    500: '#5e866e', 600: '#496b56', 700: '#3c5646', 800: '#32463b', 900: '#2a3b32', 950: '#17211b'
  },
  coral: {
    50: '#fff5f5', 100: '#ffebeb', 200: '#ffd1d1', 300: '#ffa8a8', 400: '#ff8282',
    500: '#ff5c5c', 600: '#ff3333', 700: '#e61a1a', 800: '#b31515', 900: '#8c1010', 950: '#590a0a'
  },
  ocean: {
    50: '#f0fdfa', 100: '#e0fcf6', 200: '#bbf7eb', 300: '#82efe1', 400: '#45dfce',
    500: '#20c9b9', 600: '#17a195', 700: '#138077', 800: '#10635c', 900: '#0d4f4a', 950: '#06302d'
  },
  orchid: {
    50: '#fdf4fd', 100: '#fae8fa', 200: '#f5d0f5', 300: '#eba7eb', 400: '#dc73dc',
    500: '#cc4fc8', 600: '#b33bb0', 700: '#942e92', 800: '#7a2679', 900: '#642163', 950: '#3d0c3c'
  },
  gold: {
    50: '#fdfbf2', 100: '#fcf6e2', 200: '#f7e8b6', 300: '#edd17d', 400: '#dfb448',
    500: '#cc992e', 600: '#b37f22', 700: '#946419', 800: '#7a5114', 900: '#634010', 950: '#3d2607'
  },
  latte: {
    50: '#faf6f3', 100: '#f4eae1', 200: '#e8d4c4', 300: '#d5b69f', 400: '#bd9477',
    500: '#a47657', 600: '#8d6043', 700: '#744e35', 800: '#5f3e2a', 900: '#4d3222', 950: '#301e14'
  },
  periwinkle: {
    50: '#f5f6ff', 100: '#ebeeff', 200: '#dadeff', 300: '#bdc3ff', 400: '#9aa0ff',
    500: '#797eff', 600: '#5a5aff', 700: '#4c47e6', 800: '#3f39bf', 900: '#332d99', 950: '#1e1b59'
  }
};
