import type { Quiz, QuizDetail, Session, JoinResponse, Participant, LeaderboardEntry, QuizLanguage, QuizWithTranslations, QuestionWithTranslations, UpdateQuestionTranslationsRequest } from '../types'

const API_URL = import.meta.env.VITE_API_URL || ''

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${url}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(error || `HTTP ${response.status}`)
  }

  if (response.status === 204) {
    return undefined as T
  }

  return response.json()
}

// Quiz API
export const quizApi = {
  getAll: () => fetchJson<Quiz[]>('/api/quizzes'),
  
  getById: (id: string) => fetchJson<QuizDetail>(`/api/quizzes/${id}`),
  
  create: (data: { title: string; description?: string; useFixedJoinCode?: boolean; defaultLanguage: string }) =>
    fetchJson<Quiz>('/api/quizzes', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  
  update: (id: string, data: { title: string; description?: string; useFixedJoinCode?: boolean }) =>
    fetchJson<Quiz>(`/api/quizzes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  
  delete: (id: string) =>
    fetchJson<void>(`/api/quizzes/${id}`, { method: 'DELETE' }),
  
  addQuestion: (quizId: string, data: {
    text: string
    timeLimitSeconds: number
    answerOptions: { text: string; isCorrect: boolean }[]
  }) =>
    fetchJson(`/api/quizzes/${quizId}/questions`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  
  updateQuestion: (questionId: string, data: {
    text: string
    timeLimitSeconds: number
    answerOptions: { id?: string; text: string; isCorrect: boolean }[]
  }) =>
    fetchJson(`/api/quizzes/questions/${questionId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  
  deleteQuestion: (questionId: string) =>
    fetchJson<void>(`/api/quizzes/questions/${questionId}`, { method: 'DELETE' }),

  uploadQuestionImage: async (questionId: string, file: File): Promise<{ imageUrl: string }> => {
    const formData = new FormData()
    formData.append('file', file)

    const response = await fetch(`${API_URL}/api/quizzes/questions/${questionId}/image`, {
      method: 'POST',
      body: formData,
      credentials: 'include',
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(error || `HTTP ${response.status}`)
    }

    return response.json()
  },

  deleteQuestionImage: (questionId: string) =>
    fetchJson<void>(`/api/quizzes/questions/${questionId}/image`, { method: 'DELETE' }),

  // Language management
  getLanguages: (quizId: string) =>
    fetchJson<QuizLanguage[]>(`/api/quizzes/${quizId}/languages`),

  addLanguage: (quizId: string, languageCode: string) =>
    fetchJson<QuizLanguage>(`/api/quizzes/${quizId}/languages`, {
      method: 'POST',
      body: JSON.stringify({ languageCode }),
    }),

  setDefaultLanguage: (quizId: string, languageCode: string) =>
    fetchJson<void>(`/api/quizzes/${quizId}/languages/default`, {
      method: 'PUT',
      body: JSON.stringify({ languageCode }),
    }),

  deleteLanguage: (quizId: string, languageCode: string) =>
    fetchJson<void>(`/api/quizzes/${quizId}/languages/${languageCode}`, { method: 'DELETE' }),

  // Translation management
  getWithTranslations: (id: string) =>
    fetchJson<QuizWithTranslations>(`/api/quizzes/${id}/translations`),

  updateQuestionTranslations: (questionId: string, data: UpdateQuestionTranslationsRequest) =>
    fetchJson<QuestionWithTranslations>(`/api/quizzes/questions/${questionId}/translations`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  addQuestionWithTranslations: (quizId: string, data: UpdateQuestionTranslationsRequest) =>
    fetchJson<QuestionWithTranslations>(`/api/quizzes/${quizId}/questions/translations`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  reorderQuestions: (quizId: string, questionIds: string[]) =>
    fetchJson<void>(`/api/quizzes/${quizId}/questions/reorder`, {
      method: 'PUT',
      body: JSON.stringify(questionIds),
    }),
}

// Session API
export const sessionApi = {
  getActive: () => fetchJson<Session[]>('/api/sessions'),
  
  getById: (id: string) => fetchJson<Session>(`/api/sessions/${id}`),
  
  getByCode: (code: string) => fetchJson<Session>(`/api/sessions/code/${code}`),
  
  create: (quizId: string) =>
    fetchJson<Session>('/api/sessions', {
      method: 'POST',
      body: JSON.stringify({ quizId }),
    }),
  
  join: (joinCode: string, name: string) =>
    fetchJson<JoinResponse>('/api/sessions/join', {
      method: 'POST',
      body: JSON.stringify({ joinCode, name }),
    }),
  
  getParticipants: (sessionId: string) =>
    fetchJson<Participant[]>(`/api/sessions/${sessionId}/participants`),
  
  getLeaderboard: (sessionId: string) =>
    fetchJson<LeaderboardEntry[]>(`/api/sessions/${sessionId}/leaderboard`),
  
  end: (sessionId: string) =>
    fetchJson<void>(`/api/sessions/${sessionId}/end`, { method: 'POST' }),
}

// Auth API
export interface AuthUser {
  email: string
  name: string
  picture?: string
}

export interface AuthStatus {
  isAuthenticated: boolean
  isAdmin: boolean
  email?: string
}

export const authApi = {
  getStatus: () => fetchJson<AuthStatus>('/api/auth/status'),
  
  getMe: () => fetchJson<AuthUser>('/api/auth/me'),
  
  logout: () => fetchJson<{ message: string }>('/api/auth/logout', { method: 'POST' }),
  
  getLoginUrl: () => `${API_URL}/api/auth/login`,
}

// Translation API
export interface TranslationStatus {
  configured: boolean
}

export interface TranslateResponse {
  translations: string[]
}

export interface QuestionToTranslate {
  questionId: string
  questionText: string
  answerTexts: string[]
}

export interface QuestionTranslationResult {
  questionId: string
  questionText: string
  answerTexts: string[]
  success: boolean
  error?: string
}

export interface TranslateBulkResponse {
  results: QuestionTranslationResult[]
  totalCount: number
  successCount: number
  errors: string[]
}

export const translationApi = {
  getStatus: () => fetchJson<TranslationStatus>('/api/translation/status'),
  
  translate: (texts: string[], sourceLang: string, targetLang: string) =>
    fetchJson<TranslateResponse>('/api/translation/translate', {
      method: 'POST',
      body: JSON.stringify({ texts, sourceLang, targetLang }),
    }),
  
  translateBulk: (questions: QuestionToTranslate[], sourceLang: string, targetLang: string) =>
    fetchJson<TranslateBulkResponse>('/api/translation/translate-bulk', {
      method: 'POST',
      body: JSON.stringify({ questions, sourceLang, targetLang }),
    }),
}
