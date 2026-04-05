using Kweez.Api.Data;
using Kweez.Api.DTOs;
using Kweez.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace Kweez.Api.Services;

public interface IScoringService
{
    int CalculateScore(long responseTimeMs, bool isCorrect);
    Task<AnswerSubmittedDto?> SubmitAnswerAsync(Guid participantId, Guid questionId, Guid answerOptionId, DateTime questionReleasedAtUtc);
    Task<QuestionResultsDto?> GetQuestionResultsAsync(Guid sessionId, Guid questionId);
}

public class ScoringService : IScoringService
{
    private readonly KweezDbContext _db;
    private const int MaxScore = 1000;
    private const double ScoreDecayRate = 0.06; // Points lost per millisecond

    public ScoringService(KweezDbContext db)
    {
        _db = db;
    }

    public int CalculateScore(long responseTimeMs, bool isCorrect)
    {
        if (!isCorrect) return 0;
        
        // score = max(0, 1000 - elapsed_ms * 0.06)
        var score = MaxScore - (int)(responseTimeMs * ScoreDecayRate);
        return Math.Max(0, score);
    }

    public async Task<AnswerSubmittedDto?> SubmitAnswerAsync(
        Guid participantId, 
        Guid questionId, 
        Guid answerOptionId,
        DateTime questionReleasedAtUtc)
    {
        var participant = await _db.Participants.FindAsync(participantId);
        if (participant == null) return null;

        var answerOption = await _db.AnswerOptions
            .Include(a => a.Question)
            .ThenInclude(q => q.AnswerOptions)
            .FirstOrDefaultAsync(a => a.Id == answerOptionId);

        if (answerOption == null || answerOption.QuestionId != questionId)
            return null;

        var submittedAt = DateTime.UtcNow;
        var responseTimeMs = (long)(submittedAt - questionReleasedAtUtc).TotalMilliseconds;

        // Check if already answered this question
        var existingAnswer = await _db.ParticipantAnswers
            .FirstOrDefaultAsync(a => a.ParticipantId == participantId && a.QuestionId == questionId);
        
        if (existingAnswer != null)
        {
            // Player is changing their answer
            if (existingAnswer.AnswerOptionId == answerOptionId)
            {
                // Same answer clicked again - ignore (keep original time)
                return new AnswerSubmittedDto(answerOptionId);
            }
            
            // Different answer - update the answer AND the response time
            // (the time of the final answer is used for scoring)
            existingAnswer.AnswerOptionId = answerOptionId;
            existingAnswer.SubmittedAtUtc = submittedAt;
            existingAnswer.ResponseTimeMs = responseTimeMs;
            await _db.SaveChangesAsync();
            
            return new AnswerSubmittedDto(answerOptionId);
        }

        // First answer for this question
        var answer = new ParticipantAnswer
        {
            Id = Guid.NewGuid(),
            ParticipantId = participantId,
            QuestionId = questionId,
            AnswerOptionId = answerOptionId,
            SubmittedAtUtc = submittedAt,
            ResponseTimeMs = responseTimeMs,
            Score = 0 // Score will be calculated when question closes
        };

        _db.ParticipantAnswers.Add(answer);
        await _db.SaveChangesAsync();

        return new AnswerSubmittedDto(answerOptionId);
    }

    public async Task<QuestionResultsDto?> GetQuestionResultsAsync(Guid sessionId, Guid questionId)
    {
        var session = await _db.QuizSessions
            .Include(s => s.Participants)
            .ThenInclude(p => p.Answers.Where(a => a.QuestionId == questionId))
            .FirstOrDefaultAsync(s => s.Id == sessionId);

        if (session == null) return null;

        var question = await _db.Questions
            .Include(q => q.AnswerOptions)
            .FirstOrDefaultAsync(q => q.Id == questionId);

        if (question == null) return null;

        var correctAnswerId = question.AnswerOptions.First(a => a.IsCorrect).Id;

        // Calculate scores now that question is closed (based on final answer)
        foreach (var participant in session.Participants)
        {
            var answer = participant.Answers.FirstOrDefault();
            if (answer != null)
            {
                var isCorrect = answer.AnswerOptionId == correctAnswerId;
                var score = CalculateScore(answer.ResponseTimeMs, isCorrect);
                
                // Update the stored score
                answer.Score = score;
                participant.TotalScore += score;
            }
        }
        await _db.SaveChangesAsync();

        // Count answers per option
        var answerCounts = question.AnswerOptions.ToDictionary(
            a => a.Id,
            a => session.Participants.Count(p => p.Answers.Any(ans => ans.AnswerOptionId == a.Id))
        );

        // Build leaderboard
        var leaderboard = session.Participants
            .OrderByDescending(p => p.TotalScore)
            .ThenBy(p => p.JoinedAtUtc)
            .Select((p, index) => new LeaderboardEntryDto(
                index + 1,
                p.Id,
                p.Name,
                p.TotalScore,
                p.Answers.FirstOrDefault()?.Score
            ))
            .ToList();

        var questionIndex = await _db.Questions
            .Where(q => q.QuizId == question.QuizId && q.OrderIndex <= question.OrderIndex)
            .CountAsync() - 1;

        return new QuestionResultsDto(
            questionId,
            questionIndex,
            answerCounts,
            correctAnswerId,
            leaderboard
        );
    }
}
