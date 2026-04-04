using Kweez.Api.DTOs;
using Kweez.Api.Models;
using Kweez.Api.Services;
using Microsoft.AspNetCore.SignalR;

namespace Kweez.Api.Hubs;

public interface IQuizHubClient
{
    Task PlayerJoined(ParticipantDto participant);
    Task PlayerLeft(Guid participantId);
    Task SessionStarted();
    Task QuestionReleased(QuestionReleasedDto question);
    Task AnswerResult(AnswerResultDto result);
    Task QuestionClosed(QuestionResultsDto results);
    Task LeaderboardUpdated(List<LeaderboardEntryDto> leaderboard);
    Task QuizEnded(List<LeaderboardEntryDto> finalLeaderboard);
    Task SessionState(SessionStateDto state);
    Task Error(string message);
}

public class QuizHub : Hub<IQuizHubClient>
{
    private readonly ISessionService _sessionService;
    private readonly IScoringService _scoringService;
    private readonly ILogger<QuizHub> _logger;

    // Store session timing info (in production, use distributed cache)
    private static readonly Dictionary<Guid, DateTime> _questionReleaseTimes = new();

    public QuizHub(ISessionService sessionService, IScoringService scoringService, ILogger<QuizHub> logger)
    {
        _sessionService = sessionService;
        _scoringService = scoringService;
        _logger = logger;
    }

    // Player joins a session
    public async Task JoinSession(Guid participantId)
    {
        var participant = await _sessionService.GetParticipantAsync(participantId);
        if (participant == null)
        {
            await Clients.Caller.Error("Participant not found");
            return;
        }

        var sessionId = participant.SessionId;
        await Groups.AddToGroupAsync(Context.ConnectionId, sessionId.ToString());
        await Groups.AddToGroupAsync(Context.ConnectionId, $"participant-{participantId}");

        await _sessionService.UpdateParticipantConnectionAsync(participantId, Context.ConnectionId, true);

        // Notify others that player joined/reconnected
        await Clients.Group(sessionId.ToString()).PlayerJoined(new ParticipantDto(
            participant.Id,
            participant.Name,
            participant.TotalScore,
            true
        ));

        // Send current session state to the joining player
        var state = await _sessionService.GetSessionStateAsync(sessionId);
        if (state != null)
        {
            await Clients.Caller.SessionState(state);
        }

        _logger.LogInformation("Participant {Name} joined session {SessionId}", participant.Name, sessionId);
    }

    // Admin joins to control session
    public async Task JoinAsAdmin(Guid sessionId)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, sessionId.ToString());
        await Groups.AddToGroupAsync(Context.ConnectionId, $"admin-{sessionId}");

        var state = await _sessionService.GetSessionStateAsync(sessionId);
        if (state != null)
        {
            await Clients.Caller.SessionState(state);
        }

        _logger.LogInformation("Admin joined session {SessionId}", sessionId);
    }

    // Admin starts the quiz
    public async Task StartQuiz(Guid sessionId)
    {
        var success = await _sessionService.StartSessionAsync(sessionId);
        if (!success)
        {
            await Clients.Caller.Error("Could not start session");
            return;
        }

        await Clients.Group(sessionId.ToString()).SessionStarted();
        _logger.LogInformation("Quiz started for session {SessionId}", sessionId);
    }

    // Admin releases next question
    public async Task ReleaseNextQuestion(Guid sessionId)
    {
        var question = await _sessionService.ReleaseNextQuestionAsync(sessionId);
        if (question == null)
        {
            // No more questions - end the quiz
            await EndQuiz(sessionId);
            return;
        }

        var releaseTime = DateTime.UtcNow;
        _questionReleaseTimes[sessionId] = releaseTime;

        var session = await _sessionService.GetSessionAsync(sessionId);
        
        var dto = new QuestionReleasedDto(
            question.Id,
            question.Text,
            session?.CurrentQuestionIndex ?? 0,
            session?.TotalQuestions ?? 0,
            question.TimeLimitSeconds,
            question.AnswerOptions.Select((a, i) => new AnswerChoiceDto(a.Id, a.Text, i)).ToList()
        );

        await Clients.Group(sessionId.ToString()).QuestionReleased(dto);
        _logger.LogInformation("Question {Index} released for session {SessionId}", dto.QuestionIndex, sessionId);

        // Schedule automatic question close
        _ = Task.Run(async () =>
        {
            await Task.Delay(TimeSpan.FromSeconds(question.TimeLimitSeconds));
            await CloseQuestion(sessionId, question.Id);
        });
    }

    // Player submits answer
    public async Task SubmitAnswer(Guid participantId, SubmitAnswerRequest request)
    {
        var participant = await _sessionService.GetParticipantAsync(participantId);
        if (participant == null)
        {
            await Clients.Caller.Error("Participant not found");
            return;
        }

        var sessionId = participant.SessionId;
        if (!_questionReleaseTimes.TryGetValue(sessionId, out var releaseTime))
        {
            await Clients.Caller.Error("No active question");
            return;
        }

        var result = await _scoringService.SubmitAnswerAsync(
            participantId,
            request.QuestionId,
            request.AnswerOptionId,
            releaseTime
        );

        if (result == null)
        {
            await Clients.Caller.Error("Could not submit answer");
            return;
        }

        // Send result back to player
        await Clients.Caller.AnswerResult(result);

        _logger.LogInformation("Participant {ParticipantId} submitted answer for question {QuestionId}, correct: {IsCorrect}, score: {Score}",
            participantId, request.QuestionId, result.IsCorrect, result.Score);
    }

    // Close question and show results
    private async Task CloseQuestion(Guid sessionId, Guid questionId)
    {
        await _sessionService.CloseCurrentQuestionAsync(sessionId);
        _questionReleaseTimes.Remove(sessionId);

        var results = await _scoringService.GetQuestionResultsAsync(sessionId, questionId);
        if (results != null)
        {
            await Clients.Group(sessionId.ToString()).QuestionClosed(results);
            await Clients.Group(sessionId.ToString()).LeaderboardUpdated(results.Leaderboard);
        }

        _logger.LogInformation("Question {QuestionId} closed for session {SessionId}", questionId, sessionId);
    }

    // Admin manually closes question
    public async Task ForceCloseQuestion(Guid sessionId)
    {
        var question = await _sessionService.GetCurrentQuestionAsync(sessionId);
        if (question != null)
        {
            await CloseQuestion(sessionId, question.Id);
        }
    }

    // End the quiz
    public async Task EndQuiz(Guid sessionId)
    {
        await _sessionService.EndSessionAsync(sessionId);
        _questionReleaseTimes.Remove(sessionId);

        var leaderboard = await _sessionService.GetLeaderboardAsync(sessionId);
        await Clients.Group(sessionId.ToString()).QuizEnded(leaderboard);

        _logger.LogInformation("Quiz ended for session {SessionId}", sessionId);
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        _logger.LogInformation("Client disconnected: {ConnectionId}", Context.ConnectionId);
        await base.OnDisconnectedAsync(exception);
    }
}
