import { describe, it, expect } from 'vitest'
import {
  pickQuizLanguage,
  localizeQuestion,
  localizeActiveQuestion,
} from '../questionLocalization'
import type { QuestionReleased, ActiveQuestion } from '../../types'

describe('questionLocalization', () => {
  describe('pickQuizLanguage', () => {
    it('should return UI language when available in quiz', () => {
      const result = pickQuizLanguage(['en', 'pt', 'es'], 'en', 'pt')
      expect(result).toBe('pt')
    })

    it('should return default language when UI language not available', () => {
      const result = pickQuizLanguage(['en', 'es'], 'en', 'pt')
      expect(result).toBe('en')
    })

    it('should handle UI language with region code (e.g., pt-BR)', () => {
      const result = pickQuizLanguage(['en', 'pt', 'es'], 'en', 'pt-BR')
      expect(result).toBe('pt')
    })

    it('should return default when UI language region variant not available', () => {
      const result = pickQuizLanguage(['en', 'es'], 'en', 'pt-BR')
      expect(result).toBe('en')
    })

    it('should handle single available language', () => {
      const result = pickQuizLanguage(['en'], 'en', 'de')
      expect(result).toBe('en')
    })

    it('should handle empty available languages gracefully', () => {
      const result = pickQuizLanguage([], 'en', 'pt')
      expect(result).toBe('en')
    })
  })

  describe('localizeQuestion', () => {
    const createTestQuestionReleased = (overrides: Partial<QuestionReleased> = {}): QuestionReleased => ({
      questionId: 'q1',
      questionIndex: 0,
      totalQuestions: 3,
      timeLimitSeconds: 15,
      answerIds: ['a1', 'a2', 'a3', 'a4'],
      translations: {
        en: {
          questionText: 'What is 2 + 2?',
          answerTexts: ['3', '4', '5', '6'],
        },
        pt: {
          questionText: 'Quanto é 2 + 2?',
          answerTexts: ['3', '4', '5', '6'],
        },
      },
      availableLanguages: ['en', 'pt'],
      defaultLanguage: 'en',
      ...overrides,
    })

    it('should localize question using specified language', () => {
      const question = createTestQuestionReleased()
      const result = localizeQuestion(question, 'pt')

      expect(result.questionId).toBe('q1')
      expect(result.text).toBe('Quanto é 2 + 2?')
      expect(result.questionIndex).toBe(0)
      expect(result.totalQuestions).toBe(3)
      expect(result.timeLimitSeconds).toBe(15)
      expect(result.answers).toHaveLength(4)
      expect(result.answers[0]).toEqual({ id: 'a1', text: '3', index: 0 })
    })

    it('should use default language when no language specified', () => {
      const question = createTestQuestionReleased()
      const result = localizeQuestion(question)

      expect(result.text).toBe('What is 2 + 2?')
    })

    it('should fall back to default language when specified language not found', () => {
      const question = createTestQuestionReleased()
      const result = localizeQuestion(question, 'de')

      expect(result.text).toBe('What is 2 + 2?')
    })

    it('should preserve imageUrl', () => {
      const question = createTestQuestionReleased({ imageUrl: '/images/math.png' })
      const result = localizeQuestion(question)

      expect(result.imageUrl).toBe('/images/math.png')
    })

    it('should handle missing translations gracefully', () => {
      const question = createTestQuestionReleased({
        translations: {},
      })
      const result = localizeQuestion(question)

      expect(result.text).toBe('')
      expect(result.answers[0].text).toBe('')
    })

    it('should map answer IDs correctly to localized answers', () => {
      const question = createTestQuestionReleased({
        answerIds: ['x1', 'x2', 'x3', 'x4'],
      })
      const result = localizeQuestion(question)

      expect(result.answers[0].id).toBe('x1')
      expect(result.answers[1].id).toBe('x2')
      expect(result.answers[2].id).toBe('x3')
      expect(result.answers[3].id).toBe('x4')
    })
  })

  describe('localizeActiveQuestion', () => {
    const createTestActiveQuestion = (overrides: Partial<ActiveQuestion> = {}): ActiveQuestion => ({
      questionId: 'q1',
      questionIndex: 0,
      totalQuestions: 3,
      timeLimitSeconds: 15,
      remainingSeconds: 10,
      answerIds: ['a1', 'a2', 'a3', 'a4'],
      translations: {
        en: {
          questionText: 'What is 2 + 2?',
          answerTexts: ['3', '4', '5', '6'],
        },
        pt: {
          questionText: 'Quanto é 2 + 2?',
          answerTexts: ['3', '4', '5', '6'],
        },
      },
      ...overrides,
    })

    it('should localize active question using specified language', () => {
      const question = createTestActiveQuestion()
      const result = localizeActiveQuestion(question, ['en', 'pt'], 'en', 'pt')

      expect(result.text).toBe('Quanto é 2 + 2?')
    })

    it('should use remaining seconds as time limit for localized question', () => {
      const question = createTestActiveQuestion({ remainingSeconds: 7 })
      const result = localizeActiveQuestion(question, ['en', 'pt'], 'en')

      expect(result.timeLimitSeconds).toBe(7)
    })

    it('should use default language when no language specified', () => {
      const question = createTestActiveQuestion()
      const result = localizeActiveQuestion(question, ['en', 'pt'], 'en')

      expect(result.text).toBe('What is 2 + 2?')
    })

    it('should fall back to default language when specified language not found', () => {
      const question = createTestActiveQuestion()
      const result = localizeActiveQuestion(question, ['en', 'pt'], 'en', 'de')

      expect(result.text).toBe('What is 2 + 2?')
    })

    it('should preserve imageUrl', () => {
      const question = createTestActiveQuestion({ imageUrl: '/images/math.png' })
      const result = localizeActiveQuestion(question, ['en'], 'en')

      expect(result.imageUrl).toBe('/images/math.png')
    })
  })
})
