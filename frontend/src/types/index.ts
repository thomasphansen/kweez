// Quiz types
export interface QuizLanguage {
  id: string
  languageCode: string
  isDefault: boolean
}

export interface Quiz {
  id: string
  title: string
  description?: string
  questionCount: number
  createdAtUtc: string
  fixedJoinCode?: string
  languages: QuizLanguage[]
}

export interface QuizDetail {
  id: string
  title: string
  description?: string
  createdAtUtc: string
  questions: Question[]
  fixedJoinCode?: string
  languages: QuizLanguage[]
}

export interface Question {
  id: string
  text: string
  imageUrl?: string
  orderIndex: number
  timeLimitSeconds: number
  answerOptions: AnswerOption[]
}

export interface AnswerOption {
  id: string
  text: string
  orderIndex: number
  isCorrect: boolean
}

// Session types
export interface Session {
  id: string
  quizId: string
  quizTitle: string
  joinCode: string
  status: 'Waiting' | 'Active' | 'Finished'
  currentQuestionIndex?: number
  totalQuestions: number
  participantCount: number
  createdAtUtc: string
}

export interface SessionState {
  sessionId: string
  status: 'Waiting' | 'Active' | 'Finished'
  currentQuestionIndex?: number
  totalQuestions: number
  participants: Participant[]
  availableLanguages: string[]
  defaultLanguage: string
  activeQuestion?: ActiveQuestion
}

export interface ActiveQuestion {
  questionId: string
  imageUrl?: string
  questionIndex: number
  totalQuestions: number
  timeLimitSeconds: number
  remainingSeconds: number
  answerIds: string[]
  translations: Record<string, QuestionTranslationForPlayer>
}

export interface QuestionTranslationForPlayer {
  questionText: string
  answerTexts: string[]
}

export interface Participant {
  id: string
  name: string
  totalScore: number
  isConnected: boolean
}

export interface JoinResponse {
  participantId: string
  sessionId: string
  quizTitle: string
}

// Game types
export interface QuestionReleased {
  questionId: string
  imageUrl?: string
  questionIndex: number
  totalQuestions: number
  timeLimitSeconds: number
  answerIds: string[]
  translations: Record<string, QuestionTranslationForPlayer>
  availableLanguages: string[]
  defaultLanguage: string
}

export interface AnswerChoice {
  id: string
  text: string
  index: number
}

export interface AnswerSubmitted {
  selectedAnswerId: string
}

// Legacy - kept for compatibility
export interface AnswerResult {
  isCorrect: boolean
  score: number
  responseTimeMs: number
  correctAnswerId: string
}

export interface LeaderboardEntry {
  rank: number
  participantId: string
  name: string
  totalScore: number
  lastQuestionScore?: number
}

export interface QuestionResults {
  questionId: string
  questionIndex: number
  answerCounts: Record<string, number>
  correctAnswerId: string
  leaderboard: LeaderboardEntry[]
}

// Translation types for quiz editor
export interface QuestionTranslationContent {
  questionText: string
  answerTexts: string[]
}

export interface QuestionWithTranslations {
  id: string
  imageUrl?: string
  orderIndex: number
  timeLimitSeconds: number
  correctAnswerIndex: number
  answerOptionIds: string[]
  translations: Record<string, QuestionTranslationContent>
}

export interface QuizWithTranslations {
  id: string
  title: string
  description?: string
  createdAtUtc: string
  fixedJoinCode?: string
  languages: QuizLanguage[]
  questions: QuestionWithTranslations[]
}

export interface UpdateQuestionTranslationsRequest {
  timeLimitSeconds: number
  correctAnswerIndex: number
  translations: Record<string, QuestionTranslationContent>
}
