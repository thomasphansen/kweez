using Kweez.Api.Data;
using Kweez.Api.DTOs;
using Kweez.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace Kweez.Api.Services;

public interface ISessionService
{
    Task<SessionDto> CreateSessionAsync(Guid quizId);
    Task<SessionDto?> GetSessionAsync(Guid sessionId);
    Task<SessionDto?> GetSessionByCodeAsync(string joinCode);
    Task<List<SessionDto>> GetActiveSessionsAsync();
    Task<SessionStateDto?> GetSessionStateAsync(Guid sessionId);
    Task<JoinSessionResponse?> JoinSessionAsync(string joinCode, string playerName);
    Task<Participant?> GetParticipantAsync(Guid participantId);
    Task UpdateParticipantConnectionAsync(Guid participantId, string? connectionId, bool isConnected);
    Task<bool> StartSessionAsync(Guid sessionId);
    Task<Question?> ReleaseNextQuestionAsync(Guid sessionId);
    Task<Question?> GetCurrentQuestionAsync(Guid sessionId);
    Task CloseCurrentQuestionAsync(Guid sessionId);
    Task<bool> EndSessionAsync(Guid sessionId);
    Task<List<ParticipantDto>> GetParticipantsAsync(Guid sessionId);
    Task<List<LeaderboardEntryDto>> GetLeaderboardAsync(Guid sessionId, Guid? lastQuestionId = null);
    Task<bool> HaveAllParticipantsAnsweredAsync(Guid sessionId, Guid questionId);
    Task<string> GetDefaultLanguageAsync(Guid sessionId);
    Task<LanguageInfo> GetLanguageInfoAsync(Guid sessionId);
}

public record LanguageInfo(List<string> AvailableLanguages, string DefaultLanguage);

public class SessionService : ISessionService
{
    private readonly KweezDbContext _db;
    private static readonly Random _random = new();

    public SessionService(KweezDbContext db)
    {
        _db = db;
    }

    private static string GenerateJoinCode()
    {
        const string chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
        return new string(Enumerable.Range(0, 6).Select(_ => chars[_random.Next(chars.Length)]).ToArray());
    }

    public async Task<SessionDto> CreateSessionAsync(Guid quizId)
    {
        var quiz = await _db.Quizzes
            .Include(q => q.Questions)
            .FirstOrDefaultAsync(q => q.Id == quizId)
            ?? throw new InvalidOperationException("Quiz not found");

        string joinCode;
        
        if (!string.IsNullOrEmpty(quiz.FixedJoinCode))
        {
            // Use the fixed join code - end any existing sessions with this code
            var existingSessions = await _db.QuizSessions
                .Where(s => s.JoinCode == quiz.FixedJoinCode)
                .ToListAsync();
            
            foreach (var existingSession in existingSessions)
            {
                existingSession.Status = SessionStatus.Finished;
                existingSession.FinishedAtUtc = DateTime.UtcNow;
                // Clear the join code so we can reuse it (unique constraint)
                // Use a short unique code that fits in 10 chars: X + 9 chars from GUID
                existingSession.JoinCode = "X" + existingSession.Id.ToString("N")[..9].ToUpper();
            }
            
            if (existingSessions.Count > 0)
            {
                await _db.SaveChangesAsync();
            }
            
            joinCode = quiz.FixedJoinCode;
        }
        else
        {
            // Generate a new unique join code
            do
            {
                joinCode = GenerateJoinCode();
            } while (await _db.QuizSessions.AnyAsync(s => s.JoinCode == joinCode) ||
                     await _db.Quizzes.AnyAsync(q => q.FixedJoinCode == joinCode));
        }

        var session = new QuizSession
        {
            Id = Guid.NewGuid(),
            QuizId = quizId,
            JoinCode = joinCode,
            Status = SessionStatus.Waiting,
            CreatedAtUtc = DateTime.UtcNow
        };

        _db.QuizSessions.Add(session);
        await _db.SaveChangesAsync();

        return new SessionDto(
            session.Id,
            quiz.Id,
            quiz.Title,
            session.JoinCode,
            session.Status.ToString(),
            session.CurrentQuestionIndex,
            quiz.Questions.Count,
            0,
            session.CreatedAtUtc
        );
    }

    public async Task<SessionDto?> GetSessionAsync(Guid sessionId)
    {
        var session = await _db.QuizSessions
            .Include(s => s.Quiz)
            .ThenInclude(q => q.Questions)
            .Include(s => s.Participants)
            .FirstOrDefaultAsync(s => s.Id == sessionId);

        if (session == null) return null;

        return new SessionDto(
            session.Id,
            session.QuizId,
            session.Quiz.Title,
            session.JoinCode,
            session.Status.ToString(),
            session.CurrentQuestionIndex,
            session.Quiz.Questions.Count,
            session.Participants.Count,
            session.CreatedAtUtc
        );
    }

    public async Task<SessionDto?> GetSessionByCodeAsync(string joinCode)
    {
        var session = await _db.QuizSessions
            .Include(s => s.Quiz)
            .ThenInclude(q => q.Questions)
            .Include(s => s.Participants)
            .FirstOrDefaultAsync(s => s.JoinCode == joinCode.ToUpper());

        if (session == null) return null;

        return new SessionDto(
            session.Id,
            session.QuizId,
            session.Quiz.Title,
            session.JoinCode,
            session.Status.ToString(),
            session.CurrentQuestionIndex,
            session.Quiz.Questions.Count,
            session.Participants.Count,
            session.CreatedAtUtc
        );
    }

    public async Task<List<SessionDto>> GetActiveSessionsAsync()
    {
        return await _db.QuizSessions
            .Where(s => s.Status != SessionStatus.Finished)
            .Include(s => s.Quiz)
            .ThenInclude(q => q.Questions)
            .Include(s => s.Participants)
            .OrderByDescending(s => s.CreatedAtUtc)
            .Select(s => new SessionDto(
                s.Id,
                s.QuizId,
                s.Quiz.Title,
                s.JoinCode,
                s.Status.ToString(),
                s.CurrentQuestionIndex,
                s.Quiz.Questions.Count,
                s.Participants.Count,
                s.CreatedAtUtc
            ))
            .ToListAsync();
    }

    public async Task<SessionStateDto?> GetSessionStateAsync(Guid sessionId)
    {
        var session = await _db.QuizSessions
            .Include(s => s.Quiz)
                .ThenInclude(q => q.Languages)
            .Include(s => s.Quiz)
                .ThenInclude(q => q.Questions.OrderBy(qu => qu.OrderIndex))
                    .ThenInclude(q => q.Translations)
            .Include(s => s.Quiz)
                .ThenInclude(q => q.Questions)
                    .ThenInclude(q => q.AnswerOptions.OrderBy(a => a.OrderIndex))
                        .ThenInclude(a => a.Translations)
            .Include(s => s.Participants)
            .FirstOrDefaultAsync(s => s.Id == sessionId);

        if (session == null) return null;

        // Get language info for this quiz
        var availableLanguages = session.Quiz.Languages.Select(l => l.LanguageCode).ToList();
        var defaultLanguage = session.Quiz.Languages.FirstOrDefault(l => l.IsDefault)?.LanguageCode ?? "en";

        // Build active question info if there's a question in progress
        ActiveQuestionDto? activeQuestion = null;
        if (session.Status == SessionStatus.Active && 
            session.CurrentQuestionIndex.HasValue && 
            session.CurrentQuestionReleasedAtUtc.HasValue)
        {
            var questions = session.Quiz.Questions.ToList();
            if (session.CurrentQuestionIndex.Value < questions.Count)
            {
                var question = questions[session.CurrentQuestionIndex.Value];
                var elapsed = (DateTime.UtcNow - session.CurrentQuestionReleasedAtUtc.Value).TotalSeconds;
                var remaining = Math.Max(0, question.TimeLimitSeconds - (int)elapsed);
                
                // Only include if there's still time left
                if (remaining > 0)
                {
                    // Build translations dictionary for all languages
                    var translations = new Dictionary<string, QuestionTranslationForPlayerDto>();
                    foreach (var lang in availableLanguages)
                    {
                        var questionText = question.Translations.FirstOrDefault(t => t.LanguageCode == lang)?.Text ?? "";
                        var answerTexts = question.AnswerOptions
                            .Select(a => a.Translations.FirstOrDefault(t => t.LanguageCode == lang)?.Text ?? "")
                            .ToList();
                        translations[lang] = new QuestionTranslationForPlayerDto(questionText, answerTexts);
                    }
                    
                    activeQuestion = new ActiveQuestionDto(
                        question.Id,
                        question.ImageUrl,
                        session.CurrentQuestionIndex.Value,
                        questions.Count,
                        question.TimeLimitSeconds,
                        remaining,
                        question.AnswerOptions.Select(a => a.Id).ToList(),
                        translations
                    );
                }
            }
        }

        return new SessionStateDto(
            session.Id,
            session.Status.ToString(),
            session.CurrentQuestionIndex,
            session.Quiz.Questions.Count,
            session.Participants.Select(p => new ParticipantDto(
                p.Id, p.Name, p.TotalScore, p.IsConnected
            )).ToList(),
            availableLanguages,
            defaultLanguage,
            activeQuestion
        );
    }

    public async Task<JoinSessionResponse?> JoinSessionAsync(string joinCode, string playerName)
    {
        var session = await _db.QuizSessions
            .Include(s => s.Quiz)
            .Include(s => s.Participants)
            .FirstOrDefaultAsync(s => s.JoinCode == joinCode.ToUpper());

        if (session == null || session.Status == SessionStatus.Finished)
            return null;

        // Check if name already exists in this session
        var existingParticipant = session.Participants.FirstOrDefault(p => 
            p.Name.Equals(playerName, StringComparison.OrdinalIgnoreCase));
        
        if (existingParticipant != null)
        {
            // Allow reconnection
            existingParticipant.IsConnected = true;
            await _db.SaveChangesAsync();
            return new JoinSessionResponse(existingParticipant.Id, session.Id, session.Quiz.Title);
        }

        var participant = new Participant
        {
            Id = Guid.NewGuid(),
            SessionId = session.Id,
            Name = playerName,
            TotalScore = 0,
            JoinedAtUtc = DateTime.UtcNow,
            IsConnected = true
        };

        _db.Participants.Add(participant);
        await _db.SaveChangesAsync();

        return new JoinSessionResponse(participant.Id, session.Id, session.Quiz.Title);
    }

    public async Task<Participant?> GetParticipantAsync(Guid participantId)
    {
        return await _db.Participants
            .Include(p => p.Session)
            .FirstOrDefaultAsync(p => p.Id == participantId);
    }

    public async Task UpdateParticipantConnectionAsync(Guid participantId, string? connectionId, bool isConnected)
    {
        var participant = await _db.Participants.FindAsync(participantId);
        if (participant != null)
        {
            participant.ConnectionId = connectionId;
            participant.IsConnected = isConnected;
            await _db.SaveChangesAsync();
        }
    }

    public async Task<bool> StartSessionAsync(Guid sessionId)
    {
        var session = await _db.QuizSessions.FindAsync(sessionId);
        if (session == null || session.Status != SessionStatus.Waiting)
            return false;

        session.Status = SessionStatus.Active;
        session.StartedAtUtc = DateTime.UtcNow;
        session.CurrentQuestionIndex = -1; // Will be incremented to 0 on first question release

        await _db.SaveChangesAsync();
        return true;
    }

    public async Task<Question?> ReleaseNextQuestionAsync(Guid sessionId)
    {
        var session = await _db.QuizSessions
            .Include(s => s.Quiz)
                .ThenInclude(q => q.Questions.OrderBy(qu => qu.OrderIndex))
                    .ThenInclude(q => q.Translations)
            .Include(s => s.Quiz)
                .ThenInclude(q => q.Questions)
                    .ThenInclude(q => q.AnswerOptions.OrderBy(a => a.OrderIndex))
                        .ThenInclude(a => a.Translations)
            .FirstOrDefaultAsync(s => s.Id == sessionId);

        if (session == null || session.Status != SessionStatus.Active)
            return null;

        var nextIndex = (session.CurrentQuestionIndex ?? -1) + 1;
        var questions = session.Quiz.Questions.ToList();

        if (nextIndex >= questions.Count)
            return null;

        session.CurrentQuestionIndex = nextIndex;
        session.CurrentQuestionReleasedAtUtc = DateTime.UtcNow;

        await _db.SaveChangesAsync();

        return questions[nextIndex];
    }

    public async Task<Question?> GetCurrentQuestionAsync(Guid sessionId)
    {
        var session = await _db.QuizSessions
            .Include(s => s.Quiz)
                .ThenInclude(q => q.Questions.OrderBy(qu => qu.OrderIndex))
                    .ThenInclude(q => q.Translations)
            .Include(s => s.Quiz)
                .ThenInclude(q => q.Questions)
                    .ThenInclude(q => q.AnswerOptions.OrderBy(a => a.OrderIndex))
                        .ThenInclude(a => a.Translations)
            .FirstOrDefaultAsync(s => s.Id == sessionId);

        if (session?.CurrentQuestionIndex == null || session.CurrentQuestionIndex < 0)
            return null;

        var questions = session.Quiz.Questions.ToList();
        if (session.CurrentQuestionIndex >= questions.Count)
            return null;

        return questions[session.CurrentQuestionIndex.Value];
    }

    public async Task CloseCurrentQuestionAsync(Guid sessionId)
    {
        var session = await _db.QuizSessions.FindAsync(sessionId);
        if (session != null)
        {
            session.CurrentQuestionReleasedAtUtc = null;
            await _db.SaveChangesAsync();
        }
    }

    public async Task<bool> EndSessionAsync(Guid sessionId)
    {
        var session = await _db.QuizSessions.FindAsync(sessionId);
        if (session == null)
            return false;

        session.Status = SessionStatus.Finished;
        session.FinishedAtUtc = DateTime.UtcNow;
        session.CurrentQuestionReleasedAtUtc = null;

        await _db.SaveChangesAsync();
        return true;
    }

    public async Task<List<ParticipantDto>> GetParticipantsAsync(Guid sessionId)
    {
        return await _db.Participants
            .Where(p => p.SessionId == sessionId)
            .OrderByDescending(p => p.TotalScore)
            .ThenBy(p => p.JoinedAtUtc)
            .Select(p => new ParticipantDto(p.Id, p.Name, p.TotalScore, p.IsConnected))
            .ToListAsync();
    }

    public async Task<List<LeaderboardEntryDto>> GetLeaderboardAsync(Guid sessionId, Guid? lastQuestionId = null)
    {
        var participants = await _db.Participants
            .Where(p => p.SessionId == sessionId)
            .Include(p => p.Answers)
            .OrderByDescending(p => p.TotalScore)
            .ThenBy(p => p.JoinedAtUtc)
            .ToListAsync();

        return participants.Select((p, index) => new LeaderboardEntryDto(
            index + 1,
            p.Id,
            p.Name,
            p.TotalScore,
            lastQuestionId.HasValue 
                ? p.Answers.FirstOrDefault(a => a.QuestionId == lastQuestionId)?.Score 
                : null
        )).ToList();
    }

    public async Task<bool> HaveAllParticipantsAnsweredAsync(Guid sessionId, Guid questionId)
    {
        var participantCount = await _db.Participants
            .CountAsync(p => p.SessionId == sessionId);

        if (participantCount == 0)
            return false;

        var answerCount = await _db.ParticipantAnswers
            .CountAsync(a => a.QuestionId == questionId && 
                            a.Participant.SessionId == sessionId);

        return answerCount >= participantCount;
    }

    public async Task<string> GetDefaultLanguageAsync(Guid sessionId)
    {
        var session = await _db.QuizSessions
            .Include(s => s.Quiz)
                .ThenInclude(q => q.Languages)
            .FirstOrDefaultAsync(s => s.Id == sessionId);

        if (session == null)
            return "en";

        return session.Quiz.Languages.FirstOrDefault(l => l.IsDefault)?.LanguageCode ?? "en";
    }

    public async Task<LanguageInfo> GetLanguageInfoAsync(Guid sessionId)
    {
        var session = await _db.QuizSessions
            .Include(s => s.Quiz)
                .ThenInclude(q => q.Languages)
            .FirstOrDefaultAsync(s => s.Id == sessionId);

        if (session == null)
            return new LanguageInfo(new List<string> { "en" }, "en");

        var availableLanguages = session.Quiz.Languages.Select(l => l.LanguageCode).ToList();
        var defaultLanguage = session.Quiz.Languages.FirstOrDefault(l => l.IsDefault)?.LanguageCode ?? "en";
        
        return new LanguageInfo(availableLanguages, defaultLanguage);
    }
}
