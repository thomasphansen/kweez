import type { QuestionReleased, ActiveQuestion, AnswerChoice } from '../types'

export interface LocalizedQuestion {
  questionId: string
  text: string
  imageUrl?: string
  questionIndex: number
  totalQuestions: number
  timeLimitSeconds: number
  answers: AnswerChoice[]
}

/**
 * Pick the best language for quiz content based on UI language
 */
export function pickQuizLanguage(
  availableLanguages: string[],
  defaultLanguage: string,
  uiLanguage: string
): string {
  const baseUiLanguage = uiLanguage.split('-')[0] // Get base language (e.g., 'en' from 'en-US')
  if (availableLanguages.includes(baseUiLanguage)) {
    return baseUiLanguage
  }
  return defaultLanguage
}

/**
 * Localize a QuestionReleased to a LocalizedQuestion using the specified language
 */
export function localizeQuestion(
  question: QuestionReleased,
  language?: string
): LocalizedQuestion {
  const lang = language || question.defaultLanguage
  const translation = question.translations[lang] || question.translations[question.defaultLanguage]
  
  return {
    questionId: question.questionId,
    text: translation?.questionText || '',
    imageUrl: question.imageUrl,
    questionIndex: question.questionIndex,
    totalQuestions: question.totalQuestions,
    timeLimitSeconds: question.timeLimitSeconds,
    answers: question.answerIds.map((id, index) => ({
      id,
      text: translation?.answerTexts[index] || '',
      index,
    })),
  }
}

/**
 * Localize an ActiveQuestion to a LocalizedQuestion using the specified language
 */
export function localizeActiveQuestion(
  question: ActiveQuestion,
  _availableLanguages: string[],
  defaultLanguage: string,
  language?: string
): LocalizedQuestion {
  const lang = language || defaultLanguage
  const translation = question.translations[lang] || question.translations[defaultLanguage]
  
  return {
    questionId: question.questionId,
    text: translation?.questionText || '',
    imageUrl: question.imageUrl,
    questionIndex: question.questionIndex,
    totalQuestions: question.totalQuestions,
    timeLimitSeconds: question.remainingSeconds,
    answers: question.answerIds.map((id, index) => ({
      id,
      text: translation?.answerTexts[index] || '',
      index,
    })),
  }
}
