using FluentAssertions;
using Kweez.Api.Models;
using Kweez.Api.Services;
using Kweez.Api.Tests.Helpers;
using Xunit;

namespace Kweez.Api.Tests.Services;

public class ScoringServiceTests
{
    #region CalculateScore Tests

    [Fact]
    public void CalculateScore_WhenIncorrect_ReturnsZero()
    {
        // Arrange
        using var db = TestDbContextFactory.Create();
        var service = new ScoringService(db);

        // Act
        var score = service.CalculateScore(100, isCorrect: false);

        // Assert
        score.Should().Be(0);
    }

    [Fact]
    public void CalculateScore_WhenCorrectAndInstant_ReturnsMaxScore()
    {
        // Arrange
        using var db = TestDbContextFactory.Create();
        var service = new ScoringService(db);

        // Act
        var score = service.CalculateScore(0, isCorrect: true);

        // Assert
        score.Should().Be(1000);
    }

    [Theory]
    [InlineData(1000, 940)]   // 1 second = 1000ms * 0.06 = 60 points lost
    [InlineData(5000, 700)]   // 5 seconds = 5000ms * 0.06 = 300 points lost
    [InlineData(10000, 400)]  // 10 seconds = 10000ms * 0.06 = 600 points lost
    [InlineData(15000, 100)]  // 15 seconds = 15000ms * 0.06 = 900 points lost
    public void CalculateScore_WhenCorrect_DecaysOverTime(long responseTimeMs, int expectedScore)
    {
        // Arrange
        using var db = TestDbContextFactory.Create();
        var service = new ScoringService(db);

        // Act
        var score = service.CalculateScore(responseTimeMs, isCorrect: true);

        // Assert
        score.Should().Be(expectedScore);
    }

    [Fact]
    public void CalculateScore_WhenVeryLateAnswer_ReturnsZero()
    {
        // Arrange
        using var db = TestDbContextFactory.Create();
        var service = new ScoringService(db);

        // Act - After ~16.67 seconds, score would go negative, so should be 0
        var score = service.CalculateScore(20000, isCorrect: true);

        // Assert
        score.Should().Be(0);
    }

    #endregion

    #region SubmitAnswerAsync Tests

    [Fact]
    public async Task SubmitAnswerAsync_WhenFirstAnswer_ReturnsSelectedAnswerId()
    {
        // Arrange
        using var db = TestDbContextFactory.Create();
        var (quiz, session, participant) = await TestDbContextFactory.SeedBasicSessionAsync(db);
        var service = new ScoringService(db);

        var question = quiz.Questions.First();
        var correctAnswer = question.AnswerOptions.First(a => a.IsCorrect);
        var questionReleasedAt = DateTime.UtcNow.AddMilliseconds(-500);

        // Act
        var result = await service.SubmitAnswerAsync(
            participant.Id,
            question.Id,
            correctAnswer.Id,
            questionReleasedAt
        );

        // Assert
        result.Should().NotBeNull();
        result!.SelectedAnswerId.Should().Be(correctAnswer.Id);

        // Verify answer was stored
        var storedAnswer = db.ParticipantAnswers.First(a => a.ParticipantId == participant.Id);
        storedAnswer.AnswerOptionId.Should().Be(correctAnswer.Id);
        storedAnswer.Score.Should().Be(0); // Score not calculated yet
    }

    [Fact]
    public async Task SubmitAnswerAsync_WhenChangingAnswer_UpdatesStoredAnswerAndTime()
    {
        // Arrange
        using var db = TestDbContextFactory.Create();
        var (quiz, session, participant) = await TestDbContextFactory.SeedBasicSessionAsync(db);
        var service = new ScoringService(db);

        var question = quiz.Questions.First();
        var correctAnswer = question.AnswerOptions.First(a => a.IsCorrect);
        var wrongAnswer = question.AnswerOptions.First(a => !a.IsCorrect);
        var questionReleasedAt = DateTime.UtcNow.AddSeconds(-5); // Released 5 seconds ago

        // Submit first answer (wrong) - should record ~5000ms response time
        await service.SubmitAnswerAsync(participant.Id, question.Id, wrongAnswer.Id, questionReleasedAt);
        var originalAnswer = db.ParticipantAnswers.First(a => a.ParticipantId == participant.Id);
        var originalResponseTime = originalAnswer.ResponseTimeMs;
        originalResponseTime.Should().BeGreaterThan(4000); // ~5 seconds

        // Wait a bit more
        await Task.Delay(200);

        // Act - Change to correct answer (response time should now be ~5.2 seconds)
        var result = await service.SubmitAnswerAsync(
            participant.Id,
            question.Id,
            correctAnswer.Id,
            questionReleasedAt
        );

        // Assert
        result.Should().NotBeNull();
        result!.SelectedAnswerId.Should().Be(correctAnswer.Id);

        // Verify answer was updated (not duplicated)
        var answers = db.ParticipantAnswers.Where(a => a.ParticipantId == participant.Id && a.QuestionId == question.Id).ToList();
        answers.Should().HaveCount(1);
        answers[0].AnswerOptionId.Should().Be(correctAnswer.Id);
        
        // Verify response time was updated to the new click time
        await db.Entry(originalAnswer).ReloadAsync();
        originalAnswer.ResponseTimeMs.Should().BeGreaterThan(originalResponseTime);
    }

    [Fact]
    public async Task SubmitAnswerAsync_WhenClickingSameAnswer_KeepsOriginalTime()
    {
        // Arrange
        using var db = TestDbContextFactory.Create();
        var (quiz, session, participant) = await TestDbContextFactory.SeedBasicSessionAsync(db);
        var service = new ScoringService(db);

        var question = quiz.Questions.First();
        var correctAnswer = question.AnswerOptions.First(a => a.IsCorrect);
        var questionReleasedAt = DateTime.UtcNow.AddSeconds(-2);

        // Submit first answer
        await service.SubmitAnswerAsync(participant.Id, question.Id, correctAnswer.Id, questionReleasedAt);
        var originalAnswer = db.ParticipantAnswers.First(a => a.ParticipantId == participant.Id);
        var originalResponseTime = originalAnswer.ResponseTimeMs;

        // Wait a bit
        await Task.Delay(100);

        // Act - Click same answer again
        var result = await service.SubmitAnswerAsync(
            participant.Id,
            question.Id,
            correctAnswer.Id,
            questionReleasedAt
        );

        // Assert
        result.Should().NotBeNull();
        result!.SelectedAnswerId.Should().Be(correctAnswer.Id);

        // Verify response time was NOT updated
        await db.Entry(originalAnswer).ReloadAsync();
        originalAnswer.ResponseTimeMs.Should().Be(originalResponseTime);
    }

    [Fact]
    public async Task SubmitAnswerAsync_WhenParticipantNotFound_ReturnsNull()
    {
        // Arrange
        using var db = TestDbContextFactory.Create();
        var service = new ScoringService(db);

        // Act
        var result = await service.SubmitAnswerAsync(
            Guid.NewGuid(), // Non-existent participant
            Guid.NewGuid(),
            Guid.NewGuid(),
            DateTime.UtcNow
        );

        // Assert
        result.Should().BeNull();
    }

    [Fact]
    public async Task SubmitAnswerAsync_WhenAnswerOptionNotFound_ReturnsNull()
    {
        // Arrange
        using var db = TestDbContextFactory.Create();
        var (quiz, session, participant) = await TestDbContextFactory.SeedBasicSessionAsync(db);
        var service = new ScoringService(db);

        var question = quiz.Questions.First();

        // Act
        var result = await service.SubmitAnswerAsync(
            participant.Id,
            question.Id,
            Guid.NewGuid(), // Non-existent answer option
            DateTime.UtcNow
        );

        // Assert
        result.Should().BeNull();
    }

    #endregion

    #region GetQuestionResultsAsync Tests

    [Fact]
    public async Task GetQuestionResultsAsync_CalculatesScoresAndUpdatesParticipants()
    {
        // Arrange
        using var db = TestDbContextFactory.Create();
        var (quiz, session, participant) = await TestDbContextFactory.SeedBasicSessionAsync(db);
        var service = new ScoringService(db);

        var question = quiz.Questions.First();
        var correctAnswer = question.AnswerOptions.First(a => a.IsCorrect);
        var questionReleasedAt = DateTime.UtcNow.AddMilliseconds(-500); // 500ms ago

        // Submit answer (score not calculated yet)
        await service.SubmitAnswerAsync(participant.Id, question.Id, correctAnswer.Id, questionReleasedAt);
        
        // Verify score is 0 before question closes
        var answerBefore = db.ParticipantAnswers.First(a => a.ParticipantId == participant.Id);
        answerBefore.Score.Should().Be(0);

        // Act - Close question (get results)
        var results = await service.GetQuestionResultsAsync(session.Id, question.Id);

        // Assert - Score should now be calculated
        results.Should().NotBeNull();
        await db.Entry(answerBefore).ReloadAsync();
        answerBefore.Score.Should().BeGreaterThan(900); // Fast correct answer

        var updatedParticipant = await db.Participants.FindAsync(participant.Id);
        updatedParticipant!.TotalScore.Should().Be(answerBefore.Score);
    }

    [Fact]
    public async Task GetQuestionResultsAsync_ReturnsCorrectAnswerCounts()
    {
        // Arrange
        using var db = TestDbContextFactory.Create();
        var (quiz, session, participant1) = await TestDbContextFactory.SeedBasicSessionAsync(db);
        
        // Add more participants
        var participant2 = new Participant
        {
            Id = Guid.NewGuid(),
            SessionId = session.Id,
            Name = "Player 2",
            TotalScore = 0,
            JoinedAtUtc = DateTime.UtcNow,
            IsConnected = true
        };
        var participant3 = new Participant
        {
            Id = Guid.NewGuid(),
            SessionId = session.Id,
            Name = "Player 3",
            TotalScore = 0,
            JoinedAtUtc = DateTime.UtcNow,
            IsConnected = true
        };
        db.Participants.AddRange(participant2, participant3);
        await db.SaveChangesAsync();

        var service = new ScoringService(db);
        var question = quiz.Questions.First();
        var correctAnswer = question.AnswerOptions.First(a => a.IsCorrect);
        var wrongAnswer = question.AnswerOptions.First(a => !a.IsCorrect);
        var questionReleasedAt = DateTime.UtcNow;

        // Submit answers - 2 correct, 1 wrong
        await service.SubmitAnswerAsync(participant1.Id, question.Id, correctAnswer.Id, questionReleasedAt);
        await service.SubmitAnswerAsync(participant2.Id, question.Id, correctAnswer.Id, questionReleasedAt);
        await service.SubmitAnswerAsync(participant3.Id, question.Id, wrongAnswer.Id, questionReleasedAt);

        // Act
        var results = await service.GetQuestionResultsAsync(session.Id, question.Id);

        // Assert
        results.Should().NotBeNull();
        results!.QuestionId.Should().Be(question.Id);
        results.CorrectAnswerId.Should().Be(correctAnswer.Id);
        results.AnswerCounts[correctAnswer.Id].Should().Be(2);
        results.AnswerCounts[wrongAnswer.Id].Should().Be(1);
    }

    [Fact]
    public async Task GetQuestionResultsAsync_ReturnsLeaderboardSortedByScore()
    {
        // Arrange
        using var db = TestDbContextFactory.Create();
        var (quiz, session, participant1) = await TestDbContextFactory.SeedBasicSessionAsync(db);
        
        var participant2 = new Participant
        {
            Id = Guid.NewGuid(),
            SessionId = session.Id,
            Name = "Player 2",
            TotalScore = 0,
            JoinedAtUtc = DateTime.UtcNow.AddSeconds(1), // Joined later
            IsConnected = true
        };
        db.Participants.Add(participant2);
        await db.SaveChangesAsync();

        var service = new ScoringService(db);
        var question = quiz.Questions.First();
        var correctAnswer = question.AnswerOptions.First(a => a.IsCorrect);
        var wrongAnswer = question.AnswerOptions.First(a => !a.IsCorrect);

        // Participant 1 answers wrong (0 points)
        await service.SubmitAnswerAsync(participant1.Id, question.Id, wrongAnswer.Id, DateTime.UtcNow);
        // Participant 2 answers correct (high points)
        await service.SubmitAnswerAsync(participant2.Id, question.Id, correctAnswer.Id, DateTime.UtcNow);

        // Act
        var results = await service.GetQuestionResultsAsync(session.Id, question.Id);

        // Assert
        results.Should().NotBeNull();
        results!.Leaderboard.Should().HaveCount(2);
        results.Leaderboard[0].Name.Should().Be("Player 2"); // Higher score first
        results.Leaderboard[0].Rank.Should().Be(1);
        results.Leaderboard[1].Name.Should().Be("Test Player");
        results.Leaderboard[1].Rank.Should().Be(2);
    }

    [Fact]
    public async Task GetQuestionResultsAsync_WhenAnswerChanged_UsesLastAnswerForResult()
    {
        // Arrange
        using var db = TestDbContextFactory.Create();
        var (quiz, session, participant) = await TestDbContextFactory.SeedBasicSessionAsync(db);
        var service = new ScoringService(db);

        var question = quiz.Questions.First();
        var correctAnswer = question.AnswerOptions.First(a => a.IsCorrect);
        var wrongAnswer = question.AnswerOptions.First(a => !a.IsCorrect);
        var questionReleasedAt = DateTime.UtcNow;

        // First submit wrong answer, then change to correct
        await service.SubmitAnswerAsync(participant.Id, question.Id, wrongAnswer.Id, questionReleasedAt);
        await service.SubmitAnswerAsync(participant.Id, question.Id, correctAnswer.Id, questionReleasedAt);

        // Act
        var results = await service.GetQuestionResultsAsync(session.Id, question.Id);

        // Assert - Should count as correct (last answer)
        results.Should().NotBeNull();
        results!.AnswerCounts[correctAnswer.Id].Should().Be(1);
        results.AnswerCounts[wrongAnswer.Id].Should().Be(0);

        var updatedParticipant = await db.Participants.FindAsync(participant.Id);
        updatedParticipant!.TotalScore.Should().BeGreaterThan(0); // Got points for correct answer
    }

    [Fact]
    public async Task GetQuestionResultsAsync_WhenSessionNotFound_ReturnsNull()
    {
        // Arrange
        using var db = TestDbContextFactory.Create();
        var service = new ScoringService(db);

        // Act
        var results = await service.GetQuestionResultsAsync(Guid.NewGuid(), Guid.NewGuid());

        // Assert
        results.Should().BeNull();
    }

    #endregion
}
