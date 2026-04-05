using Kweez.Api.Data;
using Kweez.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace Kweez.Api.Tests.Helpers;

public static class TestDbContextFactory
{
    public static KweezDbContext Create()
    {
        var options = new DbContextOptionsBuilder<KweezDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        var context = new KweezDbContext(options);
        context.Database.EnsureCreated();
        return context;
    }

    public static async Task<(Quiz quiz, QuizSession session, Participant participant)> SeedBasicSessionAsync(KweezDbContext db)
    {
        var quiz = new Quiz
        {
            Id = Guid.NewGuid(),
            Title = "Test Quiz",
            Description = "A test quiz",
            CreatedAtUtc = DateTime.UtcNow
        };

        var question = new Question
        {
            Id = Guid.NewGuid(),
            QuizId = quiz.Id,
            Text = "What is 2 + 2?",
            OrderIndex = 0,
            TimeLimitSeconds = 15
        };

        var correctAnswer = new AnswerOption
        {
            Id = Guid.NewGuid(),
            QuestionId = question.Id,
            Text = "4",
            OrderIndex = 0,
            IsCorrect = true
        };

        var wrongAnswer = new AnswerOption
        {
            Id = Guid.NewGuid(),
            QuestionId = question.Id,
            Text = "5",
            OrderIndex = 1,
            IsCorrect = false
        };

        question.AnswerOptions = new List<AnswerOption> { correctAnswer, wrongAnswer };
        quiz.Questions = new List<Question> { question };

        var session = new QuizSession
        {
            Id = Guid.NewGuid(),
            QuizId = quiz.Id,
            JoinCode = "ABC123",
            Status = SessionStatus.Active,
            CreatedAtUtc = DateTime.UtcNow,
            StartedAtUtc = DateTime.UtcNow,
            CurrentQuestionIndex = 0,
            CurrentQuestionReleasedAtUtc = DateTime.UtcNow
        };

        var participant = new Participant
        {
            Id = Guid.NewGuid(),
            SessionId = session.Id,
            Name = "Test Player",
            TotalScore = 0,
            JoinedAtUtc = DateTime.UtcNow,
            IsConnected = true
        };

        db.Quizzes.Add(quiz);
        db.Questions.Add(question);
        db.AnswerOptions.AddRange(correctAnswer, wrongAnswer);
        db.QuizSessions.Add(session);
        db.Participants.Add(participant);

        await db.SaveChangesAsync();

        return (quiz, session, participant);
    }

    public static async Task<Quiz> SeedQuizWithMultipleQuestionsAsync(KweezDbContext db, int questionCount = 3)
    {
        var quiz = new Quiz
        {
            Id = Guid.NewGuid(),
            Title = "Multi-Question Quiz",
            Description = "A quiz with multiple questions",
            CreatedAtUtc = DateTime.UtcNow,
            Questions = new List<Question>()
        };

        for (int i = 0; i < questionCount; i++)
        {
            var question = new Question
            {
                Id = Guid.NewGuid(),
                QuizId = quiz.Id,
                Text = $"Question {i + 1}?",
                OrderIndex = i,
                TimeLimitSeconds = 15,
                AnswerOptions = new List<AnswerOption>
                {
                    new() { Id = Guid.NewGuid(), Text = "Correct", OrderIndex = 0, IsCorrect = true },
                    new() { Id = Guid.NewGuid(), Text = "Wrong 1", OrderIndex = 1, IsCorrect = false },
                    new() { Id = Guid.NewGuid(), Text = "Wrong 2", OrderIndex = 2, IsCorrect = false },
                    new() { Id = Guid.NewGuid(), Text = "Wrong 3", OrderIndex = 3, IsCorrect = false }
                }
            };
            quiz.Questions.Add(question);
        }

        db.Quizzes.Add(quiz);
        await db.SaveChangesAsync();

        return quiz;
    }
}
