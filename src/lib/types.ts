export type Bi = { en: string; id: string };
export type Profile = {
  locale: "en" | "id";
  experience: string;
  goal: string;
  dailyMinutes: number;
  reminderTime: string;
  timezone: string;
  onboardingStep: number;
  onboardingDone: boolean;
  placementScore: number | null;
  pinyin: boolean;
  traditional: boolean;
  audio: boolean;
  publicLeaderboard: boolean;
  theme: string;
  favorites: string[];
};
export type User = {
  id: string;
  name: string;
  email: string;
  role: string;
  plan: string;
  emailVerified: boolean;
  profile: Profile;
  notifications: { enabled: boolean; quietStart: string; quietEnd: string };
};
export type Review = {
  id: string;
  vocabularyId: string;
  due: string;
  difficulty: number;
  intervalDays: number;
  repetitions: number;
  lapses: number;
  vocabulary: Word;
};
export type Word = {
  id: string;
  hanzi: string;
  traditional: string | null;
  pinyin: string;
  sample: string;
  samplePinyin: string;
  sampleTranslation: Bi;
  tags: string[];
  translations: { locale: string; text: string }[];
  reviews?: Review[];
};
export type Exercise = {
  id: string;
  type: string;
  order: number;
  prompt: Bi;
  hanzi: string | null;
  pinyin: string | null;
  hint: Bi;
  options: {
    id: string;
    text: string;
    order: number;
    display?: Bi;
    hanzi?: string;
  }[];
};
export type Attempt = {
  exerciseId: string;
  correct: boolean;
  answer: string | string[];
  attemptNo: number;
};
export type Lesson = {
  id: string;
  lessonId: string;
  version: number;
  title: Bi;
  objective: Bi;
  estimatedMinutes: number;
  threshold: number;
  status: string;
  exercises: Exercise[];
  vocabulary: { vocabulary: Word }[];
  grammar: { grammar: Grammar }[];
  dialogues: {
    title: string;
    lines: {
      speaker: string;
      hanzi: string;
      pinyin: string;
      translation: Bi;
    }[];
  }[];
  progress: {
    cursor: number;
    accuracy: number | null;
    completedAt: string | null;
    attempts: Attempt[];
  };
};
export type Unit = {
  id: string;
  title: Bi;
  description: Bi;
  icon: string;
  order: number;
  lessons: {
    id: string;
    order: number;
    prerequisites: { requiredId: string }[];
    versions: {
      id: string;
      title: Bi;
      estimatedMinutes: number;
      progress: {
        cursor: number;
        accuracy: number | null;
        completedAt: string | null;
      }[];
    }[];
  }[];
};
export type Grammar = {
  id: string;
  title: Bi;
  pattern: string;
  explanation: Bi;
  examples: { hanzi: string; pinyin: string; translation: Bi }[];
  commonErrors: Bi;
  lessons?: { version: { lessonId: string; title: Bi; status: string } }[];
};
export type Achievement = {
  id: string;
  title: Bi;
  description: Bi;
  threshold: number;
  users?: { earnedAt: string }[];
};
export type Dashboard = {
  xp: number;
  completed: number;
  totalLessons: number;
  due: number;
  mastered: number;
  difficult: number;
  upcoming: number;
  overdue: number;
  retention: number | null;
  streak: number;
  accuracy: number | null;
  minutes: number;
  todayXp: number;
  chart: { day: string; xp: number }[];
  nextLesson: string | null;
  achievements: { achievement: Achievement }[];
  writing: number;
  speaking: number;
  missions: { progress: number; mission: { title: Bi; target: number } }[];
};
export type Capabilities = {
  ai: boolean;
  transcription: boolean;
  pronunciation: boolean;
  email: boolean;
  billing: boolean;
  push: boolean;
  google: boolean;
};
