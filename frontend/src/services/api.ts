import type { Quiz, QuizDetail, Session, JoinResponse, Participant, LeaderboardEntry } from '../types'

const API_URL = import.meta.env.VITE_API_URL || ''

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${url}`, {
    ...options,
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
  
  create: (data: { title: string; description?: string; useFixedJoinCode?: boolean }) =>
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
