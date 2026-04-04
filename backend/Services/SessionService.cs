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
}

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
        do
        {
            joinCode = GenerateJoinCode();
        } while (await _db.QuizSessions.AnyAsync(s => s.JoinCode == joinCode));

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
            .ThenInclude(q => q.Questions)
            .Include(s => s.Participants)
            .FirstOrDefaultAsync(s => s.Id == sessionId);

        if (session == null) return null;

        return new SessionStateDto(
            session.Id,
            session.Status.ToString(),
            session.CurrentQuestionIndex,
            session.Quiz.Questions.Count,
            session.Participants.Select(p => new ParticipantDto(
                p.Id, p.Name, p.TotalScore, p.IsConnected
            )).ToList()
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
            .ThenInclude(q => q.AnswerOptions.OrderBy(a => a.OrderIndex))
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
            .ThenInclude(q => q.AnswerOptions.OrderBy(a => a.OrderIndex))
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
}
