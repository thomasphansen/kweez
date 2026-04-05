// Quiz types
export interface Quiz {
  id: string
  title: string
  description?: string
  questionCount: number
  createdAtUtc: string
  fixedJoinCode?: string
}

export interface QuizDetail {
  id: string
  title: string
  description?: string
  createdAtUtc: string
  questions: Question[]
  fixedJoinCode?: string
}

export interface Question {
  id: string
  text: string
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
  activeQuestion?: ActiveQuestion
}

export interface ActiveQuestion {
  questionId: string
  text: string
  questionIndex: number
  totalQuestions: number
  timeLimitSeconds: number
  remainingSeconds: number
  answers: AnswerChoice[]
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
  text: string
  questionIndex: number
  totalQuestions: number
  timeLimitSeconds: number
  answers: AnswerChoice[]
}

export interface AnswerChoice {
  id: string
  text: string
  index: number
}

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
