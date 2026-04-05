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
        var quizId = Guid.NewGuid();
        var quiz = new Quiz
        {
            Id = quizId,
            Title = "Test Quiz",
            Description = "A test quiz",
            CreatedAtUtc = DateTime.UtcNow,
            Languages = new List<QuizLanguage>
            {
                new QuizLanguage
                {
                    Id = Guid.NewGuid(),
                    QuizId = quizId,
                    LanguageCode = "en",
                    IsDefault = true,
                    CreatedAtUtc = DateTime.UtcNow
                }
            }
        };

        var questionId = Guid.NewGuid();
        var question = new Question
        {
            Id = questionId,
            QuizId = quiz.Id,
            OrderIndex = 0,
            TimeLimitSeconds = 15,
            Translations = new List<QuestionTranslation>
            {
                new QuestionTranslation
                {
                    Id = Guid.NewGuid(),
                    QuestionId = questionId,
                    LanguageCode = "en",
                    Text = "What is 2 + 2?"
                }
            }
        };

        var correctAnswerId = Guid.NewGuid();
        var correctAnswer = new AnswerOption
        {
            Id = correctAnswerId,
            QuestionId = question.Id,
            OrderIndex = 0,
            IsCorrect = true,
            Translations = new List<AnswerOptionTranslation>
            {
                new AnswerOptionTranslation
                {
                    Id = Guid.NewGuid(),
                    AnswerOptionId = correctAnswerId,
                    LanguageCode = "en",
                    Text = "4"
                }
            }
        };

        var wrongAnswerId = Guid.NewGuid();
        var wrongAnswer = new AnswerOption
        {
            Id = wrongAnswerId,
            QuestionId = question.Id,
            OrderIndex = 1,
            IsCorrect = false,
            Translations = new List<AnswerOptionTranslation>
            {
                new AnswerOptionTranslation
                {
                    Id = Guid.NewGuid(),
                    AnswerOptionId = wrongAnswerId,
                    LanguageCode = "en",
                    Text = "5"
                }
            }
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
        var quizId = Guid.NewGuid();
        var quiz = new Quiz
        {
            Id = quizId,
            Title = "Multi-Question Quiz",
            Description = "A quiz with multiple questions",
            CreatedAtUtc = DateTime.UtcNow,
            Questions = new List<Question>(),
            Languages = new List<QuizLanguage>
            {
                new QuizLanguage
                {
                    Id = Guid.NewGuid(),
                    QuizId = quizId,
                    LanguageCode = "en",
                    IsDefault = true,
                    CreatedAtUtc = DateTime.UtcNow
                }
            }
        };

        for (int i = 0; i < questionCount; i++)
        {
            var questionId = Guid.NewGuid();
            var question = new Question
            {
                Id = questionId,
                QuizId = quiz.Id,
                OrderIndex = i,
                TimeLimitSeconds = 15,
                Translations = new List<QuestionTranslation>
                {
                    new QuestionTranslation
                    {
                        Id = Guid.NewGuid(),
                        QuestionId = questionId,
                        LanguageCode = "en",
                        Text = $"Question {i + 1}?"
                    }
                },
                AnswerOptions = CreateAnswerOptions(questionId, "en")
            };
            quiz.Questions.Add(question);
        }

        db.Quizzes.Add(quiz);
        await db.SaveChangesAsync();

        return quiz;
    }

    private static List<AnswerOption> CreateAnswerOptions(Guid questionId, string languageCode)
    {
        var answers = new List<(string text, bool isCorrect)>
        {
            ("Correct", true),
            ("Wrong 1", false),
            ("Wrong 2", false),
            ("Wrong 3", false)
        };

        return answers.Select((a, i) =>
        {
            var answerId = Guid.NewGuid();
            return new AnswerOption
            {
                Id = answerId,
                QuestionId = questionId,
                OrderIndex = i,
                IsCorrect = a.isCorrect,
                Translations = new List<AnswerOptionTranslation>
                {
                    new AnswerOptionTranslation
                    {
                        Id = Guid.NewGuid(),
                        AnswerOptionId = answerId,
                        LanguageCode = languageCode,
                        Text = a.text
                    }
                }
            };
        }).ToList();
    }

    /// <summary>
    /// Creates a Quiz with a default language configured
    /// </summary>
    public static Quiz CreateQuizWithLanguage(string title = "Test Quiz", string? description = null, string languageCode = "en")
    {
        var quizId = Guid.NewGuid();
        return new Quiz
        {
            Id = quizId,
            Title = title,
            Description = description,
            CreatedAtUtc = DateTime.UtcNow,
            Languages = new List<QuizLanguage>
            {
                new QuizLanguage
                {
                    Id = Guid.NewGuid(),
                    QuizId = quizId,
                    LanguageCode = languageCode,
                    IsDefault = true,
                    CreatedAtUtc = DateTime.UtcNow
                }
            }
        };
    }
}
