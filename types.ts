
export type AppTheme = 'rose' | 'lavender' | 'mint' | 'peach';

export interface PeriodLog {
  date: string;
  intensity: 'spotting' | 'light' | 'medium' | 'heavy';
}

export interface Period {
  id: string;
  startDate: string;
  endDate: string;
  intensity: 'spotting' | 'light' | 'medium' | 'heavy';
}

export interface MoodLog {
  id: string;
  date: string;
  mood: 'happy' | 'sad' | 'angry' | 'anxious' | 'calm' | 'excited' | 'tired' | 'irritable';
  note?: string;
}

export interface SexualActivityLog {
  id: string;
  date: string;
  protected: boolean;
  hadSex?: boolean;
  protection?: 'protected' | 'unprotected';
  ejaculation?: 'occurred' | 'none';
  notes?: string;
  contraceptiveMethod?: 'none' | 'condom' | 'pill' | 'iud' | 'implant' | 'other';
  emergencyContraceptiveTaken?: boolean;
  emergencyContraceptiveTime?: string;
}

export interface PartnerRequest {
  partnerId: string;
  partnerName: string;
  requestedReceives: string[];
  status: 'pending' | 'approved' | 'declined';
  timestamp?: string;
}

export interface SharingSettings {
  shareCycleInfo: boolean;
  shareSymptoms: boolean;
  shareMood: boolean;
  shareNotes: boolean;
  shareFertilityInfo: boolean;
  sharePregnancyInfo: boolean;
  shareIntimacyInfo: boolean;
  shareDoctorReports: boolean;
  shareAppointmentReminders: boolean;
  shareWellnessUpdates: boolean;
}

export interface User {
  id: string;
  name: string;
  email: string;
  partnerName: string;
  partnerId?: string;
  partnerCode?: string;
  isPartnerLinked: boolean;
  cycleLength: number;
  periodLength: number;
  lastPeriodStart: string;
  isPartner: boolean;
  isPregnancyMode: boolean;
  isPostpartumMode?: boolean;
  onboardingCompleted?: boolean;
  pregnancyStartDate?: string;
  deliveryDate?: string;
  diaryPin?: string;
  theme: AppTheme;
  periodDates?: string[];
  periodLogs?: PeriodLog[];
  periods?: Period[];
  birthControlConfig?: BirthControlConfig;
  favoriteSongs?: string[]; 
  customSongs?: Song[];    
  playlists?: Playlist[];
  recentlyPlayed?: string[];
  wishlist?: string[];      
  receivedComforts?: ReceivedComfort[];
  tempUnit?: 'C' | 'F';
  moodLogs?: MoodLog[];
  sexualActivityLogs?: SexualActivityLog[];
  symptoms?: Symptom[];
  diaryEntries?: DiaryEntry[];
  bcLogs?: BirthControlLog[];
  tempLogs?: TemperatureLog[];
  sharingSettings: SharingSettings;
  partnerRequest?: PartnerRequest;
  waterGoal?: number;
  notificationSettings?: NotificationSettings;
  pregnancyAppointments?: { id: string; date: string; title: string; notes?: string }[];
  pregnancySupplements?: string[];
  pregnancyNotes?: string;
}

export interface NotificationSettings {
  enabled: boolean;
  toneStyle: 'supportive' | 'playful' | 'affirming' | 'aesthetic';
  reminderDaysBefore: number;
  quietHours: {
    enabled: boolean;
    startTime: string;
    endTime: string;
  };
  types: {
    periodStarting: boolean;
    periodStarted: boolean;
    periodEnding: boolean;
    ovulation: boolean;
    fertileWindow: boolean;
    lutealPhase: boolean;
    pregnancyRisk: boolean;
  };
  partnerNotificationsEnabled: boolean;
  partnerReceiveTypes: {
    periodStarting: boolean;
    periodStarted: boolean;
    periodEnding: boolean;
    ovulation: boolean;
    fertileWindow: boolean;
    pregnancyRisk: boolean;
  };
  pregnancyEnabled: boolean;
  partnerPregnancyEnabled: boolean;
  pregnancyReminderTime: string;
  pregnancyTypes: {
    welcome: boolean;
    weeklyBabyDev: boolean;
    babySizeUpdate: boolean;
    appointment: boolean;
    medicationVitamin: boolean;
    hydration: boolean;
    rest: boolean;
    kickCounter: boolean;
    symptomCheck: boolean;
    dueDateCountdown: boolean;
    laborNear: boolean;
    encouragement: boolean;
    hospitalBag: boolean;
    contractionTimer: boolean;
    breastfeedingPrep: boolean;
    birthPlan: boolean;
    postpartumPrep: boolean;
  };
  partnerPregnancyReceiveTypes: {
    welcome: boolean;
    weeklyBabyDev: boolean;
    appointment: boolean;
    rest: boolean;
    symptomSupport: boolean;
    dueDateCountdown: boolean;
    laborNear: boolean;
    encouragement: boolean;
  };
}

export interface TemperatureLog {
  id: string;
  date: string;
  value: number;
  unit: 'C' | 'F';
}

export interface ReceivedComfort {
  id: string;
  type: 'hug' | 'tea' | 'flower' | 'chocolate' | 'sparkle';
  senderId: string;
  senderName: string;
  timestamp: string;
}

export interface BirthControlConfig {
  method: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  reminderTime: string;
  enabled: boolean;
}

export interface BirthControlLog {
  date: string;
  taken: boolean;
}

export interface Symptom {
  id: string;
  date: string;
  type: 'cramps' | 'headache' | 'bloating' | 'moody' | 'acne' | 'fatigue' | 'tender_breasts' | 'insomnia' | 'nausea' | 'back_pain' | 'flare_up' | 'brain_fog';
  intensity: 1 | 2 | 3;
}

export interface DiaryEntry {
  id: string;
  date: string;
  content: string;
  mood: string;
  emoji?: string;
}

export interface SelfCareTask {
  id: string;
  task: string;
  completed: boolean;
}

export interface Song {
  id: string;
  title: string;
  artist: string;
  url: string; 
  tags: string[];
  coverEmoji: string;
  source: 'internal' | 'spotify' | 'youtube' | 'external';
}

export interface Playlist {
  id: string;
  name: string;
  emoji: string;
  songIds: string[];
}

export interface Reminder {
  id: string;
  text: string;
  time: string;
  isCompleted: boolean;
}
