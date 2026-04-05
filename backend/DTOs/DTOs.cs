namespace Kweez.Api.DTOs;

// Quiz DTOs
public record QuizDto(
    Guid Id,
    string Title,
    string? Description,
    int QuestionCount,
    DateTime CreatedAtUtc,
    string? FixedJoinCode = null
);

public record QuizDetailDto(
    Guid Id,
    string Title,
    string? Description,
    DateTime CreatedAtUtc,
    List<QuestionDto> Questions,
    string? FixedJoinCode = null
);

public record CreateQuizRequest(
    string Title,
    string? Description,
    bool UseFixedJoinCode = false
);

public record UpdateQuizRequest(
    string Title,
    string? Description,
    bool? UseFixedJoinCode = null
);

// Question DTOs
public record QuestionDto(
    Guid Id,
    string Text,
    int OrderIndex,
    int TimeLimitSeconds,
    List<AnswerOptionDto> AnswerOptions
);

public record CreateQuestionRequest(
    string Text,
    int TimeLimitSeconds,
    List<CreateAnswerOptionRequest> AnswerOptions
);

public record UpdateQuestionRequest(
    string Text,
    int TimeLimitSeconds,
    List<UpdateAnswerOptionRequest> AnswerOptions
);

// Answer Option DTOs
public record AnswerOptionDto(
    Guid Id,
    string Text,
    int OrderIndex,
    bool IsCorrect
);

public record CreateAnswerOptionRequest(
    string Text,
    bool IsCorrect
);

public record UpdateAnswerOptionRequest(
    Guid? Id,
    string Text,
    bool IsCorrect
);

// Session DTOs
public record SessionDto(
    Guid Id,
    Guid QuizId,
    string QuizTitle,
    string JoinCode,
    string Status,
    int? CurrentQuestionIndex,
    int TotalQuestions,
    int ParticipantCount,
    DateTime CreatedAtUtc
);

public record CreateSessionRequest(
    Guid QuizId
);

public record SessionStateDto(
    Guid SessionId,
    string Status,
    int? CurrentQuestionIndex,
    int TotalQuestions,
    List<ParticipantDto> Participants,
    ActiveQuestionDto? ActiveQuestion = null
);

// Active question info for reconnecting players
public record ActiveQuestionDto(
    Guid QuestionId,
    string Text,
    int QuestionIndex,
    int TotalQuestions,
    int TimeLimitSeconds,
    int RemainingSeconds,
    List<AnswerChoiceDto> Answers
);

// Participant DTOs
public record ParticipantDto(
    Guid Id,
    string Name,
    int TotalScore,
    bool IsConnected
);

public record JoinSessionRequest(
    string Name
);

public record JoinSessionResponse(
    Guid ParticipantId,
    Guid SessionId,
    string QuizTitle
);

// Game DTOs (for SignalR)
public record QuestionReleasedDto(
    Guid QuestionId,
    string Text,
    int QuestionIndex,
    int TotalQuestions,
    int TimeLimitSeconds,
    List<AnswerChoiceDto> Answers
);

public record AnswerChoiceDto(
    Guid Id,
    string Text,
    int Index
);

public record SubmitAnswerRequest(
    Guid QuestionId,
    Guid AnswerOptionId
);

// Sent immediately when player submits/changes answer (no correct answer info)
public record AnswerSubmittedDto(
    Guid SelectedAnswerId
);

// Legacy - kept for compatibility but no longer sent during gameplay
public record AnswerResultDto(
    bool IsCorrect,
    int Score,
    long ResponseTimeMs,
    Guid CorrectAnswerId
);

public record LeaderboardEntryDto(
    int Rank,
    Guid ParticipantId,
    string Name,
    int TotalScore,
    int? LastQuestionScore
);

public record QuestionResultsDto(
    Guid QuestionId,
    int QuestionIndex,
    Dictionary<Guid, int> AnswerCounts,
    Guid CorrectAnswerId,
    List<LeaderboardEntryDto> Leaderboard
);
