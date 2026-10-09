// Shared TypeScript types for the Duolingo clone

export type ExerciseType =
  | 'multiple_choice'
  | 'translate_wordbank'
  | 'match_pairs'
  | 'fill_blank'
  | 'type_answer';

export interface User {
  id: string;
  name: string;
  email: string | null;
  nativeLanguage: string;
  targetLanguage: string;
  proficiencyLevel: string | null;
  avatar: string;
  createdAt: string;
  xp: number;
  streak: number;
  bestStreak: number;
  lastActive: string | null;
  hearts: number;
  maxHearts: number;
  heartsRegenAt: string | null;
  gems: number;
  dailyGoal: number;
  dailyXp: number;
  dailyXpDate: string;
  language: string;
  courseCode: string;
  theme: 'light' | 'dark';
  skillProgress: Record<string, { crowns: number; lessonsCompleted: number }>;
  lessonProgress: Record<string, { completed: boolean; mistakes: number; timeSec: number }>;
  achievements: string[];
}

export interface SkillNodeData {
  id: string;
  title: string;
  icon: string;
  description: string;
  totalLessons: number;
  lessonsCompleted: number;
  crowns: number;
  unlocked: boolean;
  finished: boolean;
  activeLessonId: string | null;
  lessons: { id: string; title: string; completed: boolean; playable: boolean; unlocked: boolean }[];
}

export interface Unit {
  id: string;
  title: string;
  subtitle: string;
  color: string;
  colorDark: string;
  skills: SkillNodeData[];
}

export interface Course {
  id: string;
  language: string;
  languageCode: string;
  flag: string;
  units: Unit[];
}

export interface ExerciseBase {
  id: string;
  type: ExerciseType;
  prompt?: string;
  translation?: string;
  hint?: string;
  options?: { text: string; img?: string }[] | string[];
  wordBank?: string[];
  sentence?: string;
  lefts?: string[];
  rights?: string[];
  pairsCount?: number;
}

export type LessonMode = 'lesson' | 'practice' | 'legendary';

export interface Lesson {
  attemptId: string;
  id: string;
  title: string;
  mode: LessonMode;
  skill: { id: string; title: string; color: string; colorDark: string };
  exercises: ExerciseBase[];
  legendary: boolean;
}

export interface AnswerResult {
  correct: boolean;
  correctAnswer: any;
  hearts: number;
  translation: string | null;
  mistakes: number;
  outOfHearts: boolean;
}

export interface LessonCompletion {
  ok: boolean;
  user: User;
  xpEarned: number;
  skillCrowns: number;
  newAchievements: string[];
  mistakes: number;
  timeSec: number;
  accuracy: number;
}

export interface LeaderboardData {
  league: string;
  users: { id: string; name: string; avatar: string; xp: number; rank: number; isMe?: boolean }[];
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  ruleValue: number;
  progress: number;
  unlocked: boolean;
}
