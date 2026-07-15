
import { Song, AppTheme } from './types';

export const THEMES: Record<AppTheme, { primary: string, secondary: string, bg: string, text: string }> = {
  rose: { primary: 'pink-500', secondary: 'pink-300', bg: 'bg-[#fffafb]', text: 'pink-600' },
  lavender: { primary: 'purple-500', secondary: 'purple-300', bg: 'bg-[#fafaff]', text: 'purple-600' },
  mint: { primary: 'teal-500', secondary: 'teal-300', bg: 'bg-[#fafffa]', text: 'teal-600' },
  peach: { primary: 'orange-400', secondary: 'orange-200', bg: 'bg-[#fffbfa]', text: 'orange-500' },
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
  { id: "ns1", title: "Forest Birds & Gentle Stream", artist: "Earth Sanctuary", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-11.mp3", tags: ["nature soundscapes", "calm", "sleep", "meditation"], coverEmoji: "🍃", source: "internal" },
  { id: "ns2", title: "Deep Space Ocean Waves", artist: "Zen Sound Healing", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-12.mp3", tags: ["nature soundscapes", "calm", "sleep", "meditation"], coverEmoji: "🌊", source: "internal" }
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
