import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockQuizHub } from '../../test/mocks'

// Note: We test the mock implementation here to ensure it works correctly
// The actual SignalR service would need integration tests with a real hub

describe('MockQuizHub', () => {
  let mockHub: ReturnType<typeof createMockQuizHub>

  beforeEach(() => {
    mockHub = createMockQuizHub()
  })

  describe('connection management', () => {
    it('should start disconnected', () => {
      expect(mockHub.connected).toBe(false)
    })

    it('should be connected after connect()', async () => {
      await mockHub.connect()
      expect(mockHub.connected).toBe(true)
      expect(mockHub.connect).toHaveBeenCalled()
    })

    it('should be disconnected after disconnect()', async () => {
      await mockHub.connect()
      await mockHub.disconnect()
      expect(mockHub.connected).toBe(false)
      expect(mockHub.disconnect).toHaveBeenCalled()
    })
  })

  describe('event subscription', () => {
    it('should register event listeners', () => {
      const callback = vi.fn()
      mockHub.on('QuestionReleased', callback)
      expect(mockHub.on).toHaveBeenCalledWith('QuestionReleased', callback)
    })

    it('should return an unsubscribe function', () => {
      const callback = vi.fn()
      const unsubscribe = mockHub.on('QuestionReleased', callback)
      expect(typeof unsubscribe).toBe('function')
    })

    it('should call registered listeners when event is emitted', () => {
      const callback = vi.fn()
      mockHub.on('SessionStarted', callback)
      
      mockHub._emit('SessionStarted')
      
      expect(callback).toHaveBeenCalled()
    })

    it('should pass event data to listeners', () => {
      const callback = vi.fn()
      mockHub.on('QuestionReleased', callback)
      
      const testQuestion = {
        questionId: 'q1',
        text: 'Test question?',
        questionIndex: 0,
        totalQuestions: 3,
        timeLimitSeconds: 15,
        answers: [
          { id: 'a1', text: 'Answer 1', index: 0 },
          { id: 'a2', text: 'Answer 2', index: 1 },
        ],
      }
      
      mockHub._emit('QuestionReleased', testQuestion)
      
      expect(callback).toHaveBeenCalledWith(testQuestion)
    })

    it('should not call listener after unsubscribe', () => {
      const callback = vi.fn()
      const unsubscribe = mockHub.on('SessionStarted', callback)
      
      unsubscribe()
      mockHub._emit('SessionStarted')
      
      expect(callback).not.toHaveBeenCalled()
    })

    it('should support multiple listeners for same event', () => {
      const callback1 = vi.fn()
      const callback2 = vi.fn()
      
      mockHub.on('SessionStarted', callback1)
      mockHub.on('SessionStarted', callback2)
      mockHub._emit('SessionStarted')
      
      expect(callback1).toHaveBeenCalled()
      expect(callback2).toHaveBeenCalled()
    })
  })

  describe('reconnection callbacks', () => {
    it('should call onReconnected callback', () => {
      const callback = vi.fn()
      mockHub.setOnReconnected(callback)
      
      mockHub._simulateReconnected()
      
      expect(callback).toHaveBeenCalled()
    })

    it('should call onReconnecting callback', () => {
      const callback = vi.fn()
      mockHub.setOnReconnecting(callback)
      
      mockHub._simulateReconnecting()
      
      expect(callback).toHaveBeenCalled()
    })

    it('should call onDisconnected callback', () => {
      const callback = vi.fn()
      mockHub.setOnDisconnected(callback)
      
      mockHub._simulateDisconnected()
      
      expect(callback).toHaveBeenCalled()
    })

    it('should handle null callbacks gracefully', () => {
      mockHub.setOnReconnected(null)
      mockHub.setOnReconnecting(null)
      mockHub.setOnDisconnected(null)
      
      // These should not throw
      expect(() => mockHub._simulateReconnected()).not.toThrow()
      expect(() => mockHub._simulateReconnecting()).not.toThrow()
      expect(() => mockHub._simulateDisconnected()).not.toThrow()
    })
  })

  describe('hub methods', () => {
    it('should track joinSession calls', async () => {
      await mockHub.joinSession('participant-123')
      expect(mockHub.joinSession).toHaveBeenCalledWith('participant-123')
    })

    it('should track submitAnswer calls', async () => {
      await mockHub.submitAnswer('p1', 'q1', 'a1')
      expect(mockHub.submitAnswer).toHaveBeenCalledWith('p1', 'q1', 'a1')
    })

    it('should track joinAsAdmin calls', async () => {
      await mockHub.joinAsAdmin('session-123')
      expect(mockHub.joinAsAdmin).toHaveBeenCalledWith('session-123')
    })

    it('should track startQuiz calls', async () => {
      await mockHub.startQuiz('session-123')
      expect(mockHub.startQuiz).toHaveBeenCalledWith('session-123')
    })

    it('should track releaseNextQuestion calls', async () => {
      await mockHub.releaseNextQuestion('session-123')
      expect(mockHub.releaseNextQuestion).toHaveBeenCalledWith('session-123')
    })

    it('should track forceCloseQuestion calls', async () => {
      await mockHub.forceCloseQuestion('session-123')
      expect(mockHub.forceCloseQuestion).toHaveBeenCalledWith('session-123')
    })

    it('should track endQuiz calls', async () => {
      await mockHub.endQuiz('session-123')
      expect(mockHub.endQuiz).toHaveBeenCalledWith('session-123')
    })
  })

  describe('test helpers', () => {
    it('should allow setting connected state directly', () => {
      expect(mockHub.connected).toBe(false)
      mockHub._setConnected(true)
      expect(mockHub.connected).toBe(true)
      mockHub._setConnected(false)
      expect(mockHub.connected).toBe(false)
    })

    it('should clear all listeners', () => {
      const callback = vi.fn()
      mockHub.on('SessionStarted', callback)
      
      mockHub._clearListeners()
      mockHub._emit('SessionStarted')
      
      expect(callback).not.toHaveBeenCalled()
    })
  })
})
