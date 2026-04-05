using FluentAssertions;
using Kweez.Api.Models;
using Kweez.Api.Services;
using Kweez.Api.Tests.Helpers;
using Xunit;

namespace Kweez.Api.Tests.Services;

public class SessionServiceTests
{
    #region CreateSessionAsync Tests

    [Fact]
    public async Task CreateSessionAsync_CreatesSessionWithUniqueJoinCode()
    {
        // Arrange
        using var db = TestDbContextFactory.Create();
        var quiz = await TestDbContextFactory.SeedQuizWithMultipleQuestionsAsync(db);
        var service = new SessionService(db);

        // Act
        var session = await service.CreateSessionAsync(quiz.Id);

        // Assert
        session.Should().NotBeNull();
        session.QuizId.Should().Be(quiz.Id);
        session.QuizTitle.Should().Be(quiz.Title);
        session.JoinCode.Should().HaveLength(6);
        session.Status.Should().Be("Waiting");
        session.TotalQuestions.Should().Be(3);
        session.ParticipantCount.Should().Be(0);
    }

    [Fact]
    public async Task CreateSessionAsync_WhenQuizNotFound_ThrowsException()
    {
        // Arrange
        using var db = TestDbContextFactory.Create();
        var service = new SessionService(db);

        // Act & Assert
        await Assert.ThrowsAsync<InvalidOperationException>(
            () => service.CreateSessionAsync(Guid.NewGuid())
        );
    }

    #endregion

    #region GetSessionAsync Tests

    [Fact]
    public async Task GetSessionAsync_ReturnsSessionWithCorrectData()
    {
        // Arrange
        using var db = TestDbContextFactory.Create();
        var (quiz, session, _) = await TestDbContextFactory.SeedBasicSessionAsync(db);
        var service = new SessionService(db);

        // Act
        var result = await service.GetSessionAsync(session.Id);

        // Assert
        result.Should().NotBeNull();
        result!.Id.Should().Be(session.Id);
        result.JoinCode.Should().Be(session.JoinCode);
        result.Status.Should().Be("Active");
    }

    [Fact]
    public async Task GetSessionAsync_WhenNotFound_ReturnsNull()
    {
        // Arrange
        using var db = TestDbContextFactory.Create();
        var service = new SessionService(db);

        // Act
        var result = await service.GetSessionAsync(Guid.NewGuid());

        // Assert
        result.Should().BeNull();
    }

    #endregion

    #region GetSessionByCodeAsync Tests

    [Fact]
    public async Task GetSessionByCodeAsync_ReturnsSession()
    {
        // Arrange
        using var db = TestDbContextFactory.Create();
        var (_, session, _) = await TestDbContextFactory.SeedBasicSessionAsync(db);
        var service = new SessionService(db);

        // Act
        var result = await service.GetSessionByCodeAsync(session.JoinCode);

        // Assert
        result.Should().NotBeNull();
        result!.Id.Should().Be(session.Id);
    }

    [Fact]
    public async Task GetSessionByCodeAsync_IsCaseInsensitive()
    {
        // Arrange
        using var db = TestDbContextFactory.Create();
        var (_, session, _) = await TestDbContextFactory.SeedBasicSessionAsync(db);
        var service = new SessionService(db);

        // Act
        var result = await service.GetSessionByCodeAsync(session.JoinCode.ToLower());

        // Assert
        result.Should().NotBeNull();
        result!.Id.Should().Be(session.Id);
    }

    #endregion

    #region JoinSessionAsync Tests

    [Fact]
    public async Task JoinSessionAsync_CreatesNewParticipant()
    {
        // Arrange
        using var db = TestDbContextFactory.Create();
        var quiz = await TestDbContextFactory.SeedQuizWithMultipleQuestionsAsync(db);
        var service = new SessionService(db);
        var session = await service.CreateSessionAsync(quiz.Id);

        // Act
        var result = await service.JoinSessionAsync(session.JoinCode, "Alice");

        // Assert
        result.Should().NotBeNull();
        result!.QuizTitle.Should().Be(quiz.Title);
        result.SessionId.Should().Be(session.Id);
        
        var participant = await db.Participants.FindAsync(result.ParticipantId);
        participant.Should().NotBeNull();
        participant!.Name.Should().Be("Alice");
    }

    [Fact]
    public async Task JoinSessionAsync_WhenNameExists_ReturnsExistingParticipant()
    {
        // Arrange
        using var db = TestDbContextFactory.Create();
        var (_, session, existingParticipant) = await TestDbContextFactory.SeedBasicSessionAsync(db);
        var service = new SessionService(db);

        // Act - Try to join with same name
        var result = await service.JoinSessionAsync(session.JoinCode, existingParticipant.Name);

        // Assert
        result.Should().NotBeNull();
        result!.ParticipantId.Should().Be(existingParticipant.Id); // Same participant
    }

    [Fact]
    public async Task JoinSessionAsync_WhenSessionFinished_ReturnsNull()
    {
        // Arrange
        using var db = TestDbContextFactory.Create();
        var (_, session, _) = await TestDbContextFactory.SeedBasicSessionAsync(db);
        session.Status = SessionStatus.Finished;
        await db.SaveChangesAsync();
        var service = new SessionService(db);

        // Act
        var result = await service.JoinSessionAsync(session.JoinCode, "NewPlayer");

        // Assert
        result.Should().BeNull();
    }

    [Fact]
    public async Task JoinSessionAsync_WhenInvalidCode_ReturnsNull()
    {
        // Arrange
        using var db = TestDbContextFactory.Create();
        var service = new SessionService(db);

        // Act
        var result = await service.JoinSessionAsync("INVALID", "Alice");

        // Assert
        result.Should().BeNull();
    }

    #endregion

    #region StartSessionAsync Tests

    [Fact]
    public async Task StartSessionAsync_WhenWaiting_StartsSession()
    {
        // Arrange
        using var db = TestDbContextFactory.Create();
        var quiz = await TestDbContextFactory.SeedQuizWithMultipleQuestionsAsync(db);
        var service = new SessionService(db);
        var sessionDto = await service.CreateSessionAsync(quiz.Id);

        // Act
        var result = await service.StartSessionAsync(sessionDto.Id);

        // Assert
        result.Should().BeTrue();
        
        var session = await db.QuizSessions.FindAsync(sessionDto.Id);
        session!.Status.Should().Be(SessionStatus.Active);
        session.StartedAtUtc.Should().NotBeNull();
        session.CurrentQuestionIndex.Should().Be(-1);
    }

    [Fact]
    public async Task StartSessionAsync_WhenAlreadyActive_ReturnsFalse()
    {
        // Arrange
        using var db = TestDbContextFactory.Create();
        var (_, session, _) = await TestDbContextFactory.SeedBasicSessionAsync(db);
        var service = new SessionService(db);

        // Act
        var result = await service.StartSessionAsync(session.Id);

        // Assert
        result.Should().BeFalse();
    }

    #endregion

    #region ReleaseNextQuestionAsync Tests

    [Fact]
    public async Task ReleaseNextQuestionAsync_ReturnsFirstQuestion()
    {
        // Arrange
        using var db = TestDbContextFactory.Create();
        var quiz = await TestDbContextFactory.SeedQuizWithMultipleQuestionsAsync(db);
        var service = new SessionService(db);
        var sessionDto = await service.CreateSessionAsync(quiz.Id);
        await service.StartSessionAsync(sessionDto.Id);

        // Act
        var question = await service.ReleaseNextQuestionAsync(sessionDto.Id);

        // Assert
        question.Should().NotBeNull();
        question!.Text.Should().Be("Question 1?");
        question.AnswerOptions.Should().HaveCount(4);

        var session = await db.QuizSessions.FindAsync(sessionDto.Id);
        session!.CurrentQuestionIndex.Should().Be(0);
        session.CurrentQuestionReleasedAtUtc.Should().NotBeNull();
    }

    [Fact]
    public async Task ReleaseNextQuestionAsync_IteratesThroughAllQuestions()
    {
        // Arrange
        using var db = TestDbContextFactory.Create();
        var quiz = await TestDbContextFactory.SeedQuizWithMultipleQuestionsAsync(db, 3);
        var service = new SessionService(db);
        var sessionDto = await service.CreateSessionAsync(quiz.Id);
        await service.StartSessionAsync(sessionDto.Id);

        // Act & Assert - Release all questions
        var q1 = await service.ReleaseNextQuestionAsync(sessionDto.Id);
        q1!.Text.Should().Be("Question 1?");

        var q2 = await service.ReleaseNextQuestionAsync(sessionDto.Id);
        q2!.Text.Should().Be("Question 2?");

        var q3 = await service.ReleaseNextQuestionAsync(sessionDto.Id);
        q3!.Text.Should().Be("Question 3?");

        var q4 = await service.ReleaseNextQuestionAsync(sessionDto.Id);
        q4.Should().BeNull(); // No more questions
    }

    #endregion

    #region EndSessionAsync Tests

    [Fact]
    public async Task EndSessionAsync_MarksSessionAsFinished()
    {
        // Arrange
        using var db = TestDbContextFactory.Create();
        var (_, session, _) = await TestDbContextFactory.SeedBasicSessionAsync(db);
        var service = new SessionService(db);

        // Act
        var result = await service.EndSessionAsync(session.Id);

        // Assert
        result.Should().BeTrue();
        
        var updatedSession = await db.QuizSessions.FindAsync(session.Id);
        updatedSession!.Status.Should().Be(SessionStatus.Finished);
        updatedSession.FinishedAtUtc.Should().NotBeNull();
    }

    #endregion

    #region GetLeaderboardAsync Tests

    [Fact]
    public async Task GetLeaderboardAsync_ReturnsSortedLeaderboard()
    {
        // Arrange
        using var db = TestDbContextFactory.Create();
        var (_, session, participant1) = await TestDbContextFactory.SeedBasicSessionAsync(db);
        
        // Add more participants with different scores
        var participant2 = new Participant
        {
            Id = Guid.NewGuid(),
            SessionId = session.Id,
            Name = "High Scorer",
            TotalScore = 5000,
            JoinedAtUtc = DateTime.UtcNow,
            IsConnected = true
        };
        var participant3 = new Participant
        {
            Id = Guid.NewGuid(),
            SessionId = session.Id,
            Name = "Mid Scorer",
            TotalScore = 2500,
            JoinedAtUtc = DateTime.UtcNow,
            IsConnected = true
        };
        db.Participants.AddRange(participant2, participant3);
        await db.SaveChangesAsync();

        var service = new SessionService(db);

        // Act
        var leaderboard = await service.GetLeaderboardAsync(session.Id);

        // Assert
        leaderboard.Should().HaveCount(3);
        leaderboard[0].Name.Should().Be("High Scorer");
        leaderboard[0].Rank.Should().Be(1);
        leaderboard[0].TotalScore.Should().Be(5000);
        
        leaderboard[1].Name.Should().Be("Mid Scorer");
        leaderboard[1].Rank.Should().Be(2);
        
        leaderboard[2].Name.Should().Be("Test Player");
        leaderboard[2].Rank.Should().Be(3);
    }

    #endregion

    #region HaveAllParticipantsAnsweredAsync Tests

    [Fact]
    public async Task HaveAllParticipantsAnsweredAsync_WhenAllAnswered_ReturnsTrue()
    {
        // Arrange
        using var db = TestDbContextFactory.Create();
        var (quiz, session, participant) = await TestDbContextFactory.SeedBasicSessionAsync(db);
        var question = quiz.Questions.First();
        var answer = question.AnswerOptions.First();

        // Add answer for the participant
        db.ParticipantAnswers.Add(new ParticipantAnswer
        {
            Id = Guid.NewGuid(),
            ParticipantId = participant.Id,
            QuestionId = question.Id,
            AnswerOptionId = answer.Id,
            SubmittedAtUtc = DateTime.UtcNow,
            ResponseTimeMs = 100,
            Score = 900
        });
        await db.SaveChangesAsync();

        var service = new SessionService(db);

        // Act
        var result = await service.HaveAllParticipantsAnsweredAsync(session.Id, question.Id);

        // Assert
        result.Should().BeTrue();
    }

    [Fact]
    public async Task HaveAllParticipantsAnsweredAsync_WhenSomeNotAnswered_ReturnsFalse()
    {
        // Arrange
        using var db = TestDbContextFactory.Create();
        var (quiz, session, participant1) = await TestDbContextFactory.SeedBasicSessionAsync(db);
        
        // Add second participant who hasn't answered
        var participant2 = new Participant
        {
            Id = Guid.NewGuid(),
            SessionId = session.Id,
            Name = "Player 2",
            TotalScore = 0,
            JoinedAtUtc = DateTime.UtcNow,
            IsConnected = true
        };
        db.Participants.Add(participant2);

        var question = quiz.Questions.First();
        var answer = question.AnswerOptions.First();

        // Only first participant answered
        db.ParticipantAnswers.Add(new ParticipantAnswer
        {
            Id = Guid.NewGuid(),
            ParticipantId = participant1.Id,
            QuestionId = question.Id,
            AnswerOptionId = answer.Id,
            SubmittedAtUtc = DateTime.UtcNow,
            ResponseTimeMs = 100,
            Score = 900
        });
        await db.SaveChangesAsync();

        var service = new SessionService(db);

        // Act
        var result = await service.HaveAllParticipantsAnsweredAsync(session.Id, question.Id);

        // Assert
        result.Should().BeFalse();
    }

    [Fact]
    public async Task HaveAllParticipantsAnsweredAsync_WhenNoParticipants_ReturnsFalse()
    {
        // Arrange
        using var db = TestDbContextFactory.Create();
        var quiz = await TestDbContextFactory.SeedQuizWithMultipleQuestionsAsync(db);
        var service = new SessionService(db);
        var sessionDto = await service.CreateSessionAsync(quiz.Id);

        // Act
        var result = await service.HaveAllParticipantsAnsweredAsync(sessionDto.Id, quiz.Questions.First().Id);

        // Assert
        result.Should().BeFalse();
    }

    #endregion

    #region GetSessionStateAsync Tests

    [Fact]
    public async Task GetSessionStateAsync_IncludesActiveQuestion_WhenQuestionInProgress()
    {
        // Arrange
        using var db = TestDbContextFactory.Create();
        var (quiz, session, _) = await TestDbContextFactory.SeedBasicSessionAsync(db);
        
        // Ensure question was released recently
        session.CurrentQuestionReleasedAtUtc = DateTime.UtcNow;
        await db.SaveChangesAsync();

        var service = new SessionService(db);

        // Act
        var state = await service.GetSessionStateAsync(session.Id);

        // Assert
        state.Should().NotBeNull();
        state!.ActiveQuestion.Should().NotBeNull();
        state.ActiveQuestion!.QuestionId.Should().Be(quiz.Questions.First().Id);
        state.ActiveQuestion.RemainingSeconds.Should().BeGreaterThan(0);
    }

    [Fact]
    public async Task GetSessionStateAsync_NoActiveQuestion_WhenTimeExpired()
    {
        // Arrange
        using var db = TestDbContextFactory.Create();
        var (quiz, session, _) = await TestDbContextFactory.SeedBasicSessionAsync(db);
        
        // Set question released long ago (expired)
        session.CurrentQuestionReleasedAtUtc = DateTime.UtcNow.AddMinutes(-5);
        await db.SaveChangesAsync();

        var service = new SessionService(db);

        // Act
        var state = await service.GetSessionStateAsync(session.Id);

        // Assert
        state.Should().NotBeNull();
        state!.ActiveQuestion.Should().BeNull();
    }

    #endregion
}
