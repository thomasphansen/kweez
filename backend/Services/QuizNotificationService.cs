using Kweez.Api.DTOs;
using Kweez.Api.Hubs;
using Microsoft.AspNetCore.SignalR;

namespace Kweez.Api.Services;

public interface IQuizNotificationService
{
    Task NotifyQuestionClosed(Guid sessionId, QuestionResultsDto results);
    Task NotifyQuizEnded(Guid sessionId, List<LeaderboardEntryDto> leaderboard);
}

public class QuizNotificationService : IQuizNotificationService
{
    private readonly IHubContext<QuizHub, IQuizHubClient> _hubContext;
    private readonly ILogger<QuizNotificationService> _logger;

    public QuizNotificationService(
        IHubContext<QuizHub, IQuizHubClient> hubContext,
        ILogger<QuizNotificationService> logger)
    {
        _hubContext = hubContext;
        _logger = logger;
    }

    public async Task NotifyQuestionClosed(Guid sessionId, QuestionResultsDto results)
    {
        await _hubContext.Clients.Group(sessionId.ToString()).QuestionClosed(results);
        await _hubContext.Clients.Group(sessionId.ToString()).LeaderboardUpdated(results.Leaderboard);
        _logger.LogInformation("Question {QuestionId} closed notification sent for session {SessionId}", 
            results.QuestionId, sessionId);
    }

    public async Task NotifyQuizEnded(Guid sessionId, List<LeaderboardEntryDto> leaderboard)
    {
        await _hubContext.Clients.Group(sessionId.ToString()).QuizEnded(leaderboard);
        _logger.LogInformation("Quiz ended notification sent for session {SessionId}", sessionId);
    }
}
