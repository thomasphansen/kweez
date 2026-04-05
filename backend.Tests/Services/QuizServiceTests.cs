using Kweez.Api.DTOs;
using Kweez.Api.Models;
using Kweez.Api.Services;
using Kweez.Api.Tests.Helpers;
using Xunit;

namespace Kweez.Api.Tests.Services;

public class QuizServiceTests
{
    #region GetAllQuizzesAsync Tests

    [Fact]
    public async Task GetAllQuizzesAsync_EmptyDatabase_ReturnsEmptyList()
    {
        // Arrange
        using var db = TestDbContextFactory.Create();
        var service = new QuizService(db);

        // Act
        var result = await service.GetAllQuizzesAsync();

        // Assert
        Assert.Empty(result);
    }

    [Fact]
    public async Task GetAllQuizzesAsync_WithQuizzes_ReturnsAllQuizzes()
    {
        // Arrange
        using var db = TestDbContextFactory.Create();
        var quiz1 = new Quiz
        {
            Id = Guid.NewGuid(),
            Title = "Quiz 1",
            Description = "First quiz",
            CreatedAtUtc = DateTime.UtcNow.AddDays(-1)
        };
        var quiz2 = new Quiz
        {
            Id = Guid.NewGuid(),
            Title = "Quiz 2",
            Description = "Second quiz",
            CreatedAtUtc = DateTime.UtcNow
        };
        db.Quizzes.AddRange(quiz1, quiz2);
        await db.SaveChangesAsync();

        var service = new QuizService(db);

        // Act
        var result = await service.GetAllQuizzesAsync();

        // Assert
        Assert.Equal(2, result.Count);
    }

    [Fact]
    public async Task GetAllQuizzesAsync_ReturnsQuizzesSortedByCreatedDateDescending()
    {
        // Arrange
        using var db = TestDbContextFactory.Create();
        var olderQuiz = new Quiz
        {
            Id = Guid.NewGuid(),
            Title = "Older Quiz",
            CreatedAtUtc = DateTime.UtcNow.AddDays(-5)
        };
        var newerQuiz = new Quiz
        {
            Id = Guid.NewGuid(),
            Title = "Newer Quiz",
            CreatedAtUtc = DateTime.UtcNow
        };
        db.Quizzes.AddRange(olderQuiz, newerQuiz);
        await db.SaveChangesAsync();

        var service = new QuizService(db);

        // Act
        var result = await service.GetAllQuizzesAsync();

        // Assert
        Assert.Equal("Newer Quiz", result[0].Title);
        Assert.Equal("Older Quiz", result[1].Title);
    }

    [Fact]
    public async Task GetAllQuizzesAsync_IncludesCorrectQuestionCount()
    {
        // Arrange
        using var db = TestDbContextFactory.Create();
        var quiz = await TestDbContextFactory.SeedQuizWithMultipleQuestionsAsync(db, 3);
        var service = new QuizService(db);

        // Act
        var result = await service.GetAllQuizzesAsync();

        // Assert
        Assert.Single(result);
        Assert.Equal(3, result[0].QuestionCount);
    }

    #endregion

    #region GetQuizByIdAsync Tests

    [Fact]
    public async Task GetQuizByIdAsync_NonExistentId_ReturnsNull()
    {
        // Arrange
        using var db = TestDbContextFactory.Create();
        var service = new QuizService(db);

        // Act
        var result = await service.GetQuizByIdAsync(Guid.NewGuid());

        // Assert
        Assert.Null(result);
    }

    [Fact]
    public async Task GetQuizByIdAsync_ExistingId_ReturnsQuizWithDetails()
    {
        // Arrange
        using var db = TestDbContextFactory.Create();
        var quiz = await TestDbContextFactory.SeedQuizWithMultipleQuestionsAsync(db, 2);
        var service = new QuizService(db);

        // Act
        var result = await service.GetQuizByIdAsync(quiz.Id);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(quiz.Id, result.Id);
        Assert.Equal(quiz.Title, result.Title);
        Assert.Equal(2, result.Questions.Count);
    }

    [Fact]
    public async Task GetQuizByIdAsync_ReturnsQuestionsInOrder()
    {
        // Arrange
        using var db = TestDbContextFactory.Create();
        var quiz = await TestDbContextFactory.SeedQuizWithMultipleQuestionsAsync(db, 3);
        var service = new QuizService(db);

        // Act
        var result = await service.GetQuizByIdAsync(quiz.Id);

        // Assert
        Assert.NotNull(result);
        for (int i = 0; i < result.Questions.Count; i++)
        {
            Assert.Equal(i, result.Questions[i].OrderIndex);
        }
    }

    [Fact]
    public async Task GetQuizByIdAsync_IncludesAnswerOptions()
    {
        // Arrange
        using var db = TestDbContextFactory.Create();
        var quiz = await TestDbContextFactory.SeedQuizWithMultipleQuestionsAsync(db, 1);
        var service = new QuizService(db);

        // Act
        var result = await service.GetQuizByIdAsync(quiz.Id);

        // Assert
        Assert.NotNull(result);
        Assert.Single(result.Questions);
        Assert.Equal(4, result.Questions[0].AnswerOptions.Count);
        Assert.Contains(result.Questions[0].AnswerOptions, a => a.IsCorrect);
    }

    #endregion

    #region CreateQuizAsync Tests

    [Fact]
    public async Task CreateQuizAsync_ValidRequest_CreatesQuiz()
    {
        // Arrange
        using var db = TestDbContextFactory.Create();
        var service = new QuizService(db);
        var request = new CreateQuizRequest("New Quiz", "Description");

        // Act
        var result = await service.CreateQuizAsync(request);

        // Assert
        Assert.NotEqual(Guid.Empty, result.Id);
        Assert.Equal("New Quiz", result.Title);
        Assert.Equal("Description", result.Description);
        Assert.Equal(0, result.QuestionCount);
    }

    [Fact]
    public async Task CreateQuizAsync_ValidRequest_PersistsToDatabase()
    {
        // Arrange
        using var db = TestDbContextFactory.Create();
        var service = new QuizService(db);
        var request = new CreateQuizRequest("Test Quiz", "Test Description");

        // Act
        var result = await service.CreateQuizAsync(request);

        // Assert
        var savedQuiz = await db.Quizzes.FindAsync(result.Id);
        Assert.NotNull(savedQuiz);
        Assert.Equal("Test Quiz", savedQuiz.Title);
    }

    [Fact]
    public async Task CreateQuizAsync_SetsCreatedAtUtc()
    {
        // Arrange
        using var db = TestDbContextFactory.Create();
        var service = new QuizService(db);
        var request = new CreateQuizRequest("Test Quiz", null);
        var before = DateTime.UtcNow;

        // Act
        var result = await service.CreateQuizAsync(request);

        // Assert
        var after = DateTime.UtcNow;
        Assert.InRange(result.CreatedAtUtc, before, after);
    }

    #endregion

    #region UpdateQuizAsync Tests

    [Fact]
    public async Task UpdateQuizAsync_NonExistentId_ReturnsNull()
    {
        // Arrange
        using var db = TestDbContextFactory.Create();
        var service = new QuizService(db);
        var request = new UpdateQuizRequest("Updated Title", "Updated Description");

        // Act
        var result = await service.UpdateQuizAsync(Guid.NewGuid(), request);

        // Assert
        Assert.Null(result);
    }

    [Fact]
    public async Task UpdateQuizAsync_ValidId_UpdatesQuiz()
    {
        // Arrange
        using var db = TestDbContextFactory.Create();
        var quiz = new Quiz
        {
            Id = Guid.NewGuid(),
            Title = "Original Title",
            Description = "Original Description",
            CreatedAtUtc = DateTime.UtcNow
        };
        db.Quizzes.Add(quiz);
        await db.SaveChangesAsync();

        var service = new QuizService(db);
        var request = new UpdateQuizRequest("Updated Title", "Updated Description");

        // Act
        var result = await service.UpdateQuizAsync(quiz.Id, request);

        // Assert
        Assert.NotNull(result);
        Assert.Equal("Updated Title", result.Title);
        Assert.Equal("Updated Description", result.Description);
    }

    [Fact]
    public async Task UpdateQuizAsync_ValidId_SetsUpdatedAtUtc()
    {
        // Arrange
        using var db = TestDbContextFactory.Create();
        var quiz = new Quiz
        {
            Id = Guid.NewGuid(),
            Title = "Original",
            CreatedAtUtc = DateTime.UtcNow.AddDays(-1)
        };
        db.Quizzes.Add(quiz);
        await db.SaveChangesAsync();

        var service = new QuizService(db);
        var before = DateTime.UtcNow;

        // Act
        await service.UpdateQuizAsync(quiz.Id, new UpdateQuizRequest("Updated", null));

        // Assert
        var after = DateTime.UtcNow;
        var updatedQuiz = await db.Quizzes.FindAsync(quiz.Id);
        Assert.NotNull(updatedQuiz?.UpdatedAtUtc);
        Assert.InRange(updatedQuiz.UpdatedAtUtc.Value, before, after);
    }

    [Fact]
    public async Task UpdateQuizAsync_PreservesQuestionCount()
    {
        // Arrange
        using var db = TestDbContextFactory.Create();
        var quiz = await TestDbContextFactory.SeedQuizWithMultipleQuestionsAsync(db, 3);
        var service = new QuizService(db);

        // Act
        var result = await service.UpdateQuizAsync(quiz.Id, new UpdateQuizRequest("New Title", null));

        // Assert
        Assert.NotNull(result);
        Assert.Equal(3, result.QuestionCount);
    }

    #endregion

    #region DeleteQuizAsync Tests

    [Fact]
    public async Task DeleteQuizAsync_NonExistentId_ReturnsFalse()
    {
        // Arrange
        using var db = TestDbContextFactory.Create();
        var service = new QuizService(db);

        // Act
        var result = await service.DeleteQuizAsync(Guid.NewGuid());

        // Assert
        Assert.False(result);
    }

    [Fact]
    public async Task DeleteQuizAsync_ExistingQuiz_ReturnsTrue()
    {
        // Arrange
        using var db = TestDbContextFactory.Create();
        var quiz = new Quiz
        {
            Id = Guid.NewGuid(),
            Title = "To Delete",
            CreatedAtUtc = DateTime.UtcNow
        };
        db.Quizzes.Add(quiz);
        await db.SaveChangesAsync();

        var service = new QuizService(db);

        // Act
        var result = await service.DeleteQuizAsync(quiz.Id);

        // Assert
        Assert.True(result);
    }

    [Fact]
    public async Task DeleteQuizAsync_RemovesQuizFromDatabase()
    {
        // Arrange
        using var db = TestDbContextFactory.Create();
        var quiz = new Quiz
        {
            Id = Guid.NewGuid(),
            Title = "To Delete",
            CreatedAtUtc = DateTime.UtcNow
        };
        db.Quizzes.Add(quiz);
        await db.SaveChangesAsync();

        var service = new QuizService(db);

        // Act
        await service.DeleteQuizAsync(quiz.Id);

        // Assert
        var deleted = await db.Quizzes.FindAsync(quiz.Id);
        Assert.Null(deleted);
    }

    [Fact]
    public async Task DeleteQuizAsync_CascadesDeleteToQuestionsAndAnswers()
    {
        // Arrange
        using var db = TestDbContextFactory.Create();
        var quiz = await TestDbContextFactory.SeedQuizWithMultipleQuestionsAsync(db, 2);
        var questionIds = quiz.Questions.Select(q => q.Id).ToList();
        var service = new QuizService(db);

        // Act
        await service.DeleteQuizAsync(quiz.Id);

        // Assert
        foreach (var questionId in questionIds)
        {
            var question = await db.Questions.FindAsync(questionId);
            Assert.Null(question);
        }
    }

    #endregion

    #region AddQuestionAsync Tests

    [Fact]
    public async Task AddQuestionAsync_ValidRequest_CreatesQuestion()
    {
        // Arrange
        using var db = TestDbContextFactory.Create();
        var quiz = TestDbContextFactory.CreateQuizWithLanguage("Test Quiz");
        db.Quizzes.Add(quiz);
        await db.SaveChangesAsync();

        var service = new QuizService(db);
        var request = new CreateQuestionRequest(
            "What is 2 + 2?",
            15,
            new List<CreateAnswerOptionRequest>
            {
                new("4", true),
                new("5", false),
                new("3", false),
                new("6", false)
            }
        );

        // Act
        var result = await service.AddQuestionAsync(quiz.Id, request);

        // Assert
        Assert.NotEqual(Guid.Empty, result.Id);
        Assert.Equal("What is 2 + 2?", result.Text);
        Assert.Equal(15, result.TimeLimitSeconds);
        Assert.Equal(4, result.AnswerOptions.Count);
    }

    [Fact]
    public async Task AddQuestionAsync_FirstQuestion_HasOrderIndexZero()
    {
        // Arrange
        using var db = TestDbContextFactory.Create();
        var quiz = TestDbContextFactory.CreateQuizWithLanguage("Test Quiz");
        db.Quizzes.Add(quiz);
        await db.SaveChangesAsync();

        var service = new QuizService(db);
        var request = new CreateQuestionRequest(
            "Question 1",
            15,
            new List<CreateAnswerOptionRequest>
            {
                new("A", true),
                new("B", false)
            }
        );

        // Act
        var result = await service.AddQuestionAsync(quiz.Id, request);

        // Assert
        Assert.Equal(0, result.OrderIndex);
    }

    [Fact]
    public async Task AddQuestionAsync_SubsequentQuestions_HaveIncrementingOrderIndex()
    {
        // Arrange
        using var db = TestDbContextFactory.Create();
        var quiz = await TestDbContextFactory.SeedQuizWithMultipleQuestionsAsync(db, 2);
        var service = new QuizService(db);
        var request = new CreateQuestionRequest(
            "New Question",
            15,
            new List<CreateAnswerOptionRequest>
            {
                new("A", true),
                new("B", false)
            }
        );

        // Act
        var result = await service.AddQuestionAsync(quiz.Id, request);

        // Assert
        Assert.Equal(2, result.OrderIndex);
    }

    [Fact]
    public async Task AddQuestionAsync_CreatesAnswerOptionsWithCorrectOrder()
    {
        // Arrange
        using var db = TestDbContextFactory.Create();
        var quiz = TestDbContextFactory.CreateQuizWithLanguage("Test Quiz");
        db.Quizzes.Add(quiz);
        await db.SaveChangesAsync();

        var service = new QuizService(db);
        var request = new CreateQuestionRequest(
            "Question",
            15,
            new List<CreateAnswerOptionRequest>
            {
                new("First", false),
                new("Second", true),
                new("Third", false),
                new("Fourth", false)
            }
        );

        // Act
        var result = await service.AddQuestionAsync(quiz.Id, request);

        // Assert
        for (int i = 0; i < result.AnswerOptions.Count; i++)
        {
            Assert.Equal(i, result.AnswerOptions[i].OrderIndex);
        }
    }

    #endregion

    #region UpdateQuestionAsync Tests

    [Fact]
    public async Task UpdateQuestionAsync_NonExistentId_ReturnsNull()
    {
        // Arrange
        using var db = TestDbContextFactory.Create();
        var service = new QuizService(db);
        var request = new UpdateQuestionRequest(
            "Updated",
            20,
            new List<UpdateAnswerOptionRequest> { new(null, "A", true) }
        );

        // Act
        var result = await service.UpdateQuestionAsync(Guid.NewGuid(), request);

        // Assert
        Assert.Null(result);
    }

    [Fact]
    public async Task UpdateQuestionAsync_ValidId_UpdatesQuestionText()
    {
        // Arrange
        using var db = TestDbContextFactory.Create();
        var quiz = await TestDbContextFactory.SeedQuizWithMultipleQuestionsAsync(db, 1);
        var questionId = quiz.Questions.First().Id;
        var service = new QuizService(db);

        var request = new UpdateQuestionRequest(
            "Updated Question Text",
            20,
            new List<UpdateAnswerOptionRequest>
            {
                new(null, "New Answer A", true),
                new(null, "New Answer B", false)
            }
        );

        // Act
        var result = await service.UpdateQuestionAsync(questionId, request);

        // Assert
        Assert.NotNull(result);
        Assert.Equal("Updated Question Text", result.Text);
        Assert.Equal(20, result.TimeLimitSeconds);
    }

    [Fact]
    public async Task UpdateQuestionAsync_ReplacesAllAnswerOptions()
    {
        // Arrange
        using var db = TestDbContextFactory.Create();
        var quiz = await TestDbContextFactory.SeedQuizWithMultipleQuestionsAsync(db, 1);
        var questionId = quiz.Questions.First().Id;
        var service = new QuizService(db);

        var request = new UpdateQuestionRequest(
            "Updated",
            15,
            new List<UpdateAnswerOptionRequest>
            {
                new(null, "Completely New A", true),
                new(null, "Completely New B", false)
            }
        );

        // Act
        var result = await service.UpdateQuestionAsync(questionId, request);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(2, result.AnswerOptions.Count);
        Assert.Contains(result.AnswerOptions, a => a.Text == "Completely New A");
        Assert.Contains(result.AnswerOptions, a => a.Text == "Completely New B");
    }

    [Fact]
    public async Task UpdateQuestionAsync_PreservesOrderIndex()
    {
        // Arrange
        using var db = TestDbContextFactory.Create();
        var quiz = await TestDbContextFactory.SeedQuizWithMultipleQuestionsAsync(db, 3);
        var secondQuestion = quiz.Questions.OrderBy(q => q.OrderIndex).Skip(1).First();
        var service = new QuizService(db);

        var request = new UpdateQuestionRequest(
            "Updated Second Question",
            15,
            new List<UpdateAnswerOptionRequest> { new(null, "A", true) }
        );

        // Act
        var result = await service.UpdateQuestionAsync(secondQuestion.Id, request);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(1, result.OrderIndex);
    }

    #endregion

    #region DeleteQuestionAsync Tests

    [Fact]
    public async Task DeleteQuestionAsync_NonExistentId_ReturnsFalse()
    {
        // Arrange
        using var db = TestDbContextFactory.Create();
        var service = new QuizService(db);

        // Act
        var result = await service.DeleteQuestionAsync(Guid.NewGuid());

        // Assert
        Assert.False(result);
    }

    [Fact]
    public async Task DeleteQuestionAsync_ExistingQuestion_ReturnsTrue()
    {
        // Arrange
        using var db = TestDbContextFactory.Create();
        var quiz = await TestDbContextFactory.SeedQuizWithMultipleQuestionsAsync(db, 1);
        var questionId = quiz.Questions.First().Id;
        var service = new QuizService(db);

        // Act
        var result = await service.DeleteQuestionAsync(questionId);

        // Assert
        Assert.True(result);
    }

    [Fact]
    public async Task DeleteQuestionAsync_RemovesQuestionFromDatabase()
    {
        // Arrange
        using var db = TestDbContextFactory.Create();
        var quiz = await TestDbContextFactory.SeedQuizWithMultipleQuestionsAsync(db, 2);
        var questionId = quiz.Questions.First().Id;
        var service = new QuizService(db);

        // Act
        await service.DeleteQuestionAsync(questionId);

        // Assert
        var deleted = await db.Questions.FindAsync(questionId);
        Assert.Null(deleted);
    }

    #endregion

    #region ReorderQuestionsAsync Tests

    [Fact]
    public async Task ReorderQuestionsAsync_InvalidQuestionIds_ReturnsFalse()
    {
        // Arrange
        using var db = TestDbContextFactory.Create();
        var quiz = await TestDbContextFactory.SeedQuizWithMultipleQuestionsAsync(db, 2);
        var service = new QuizService(db);

        // Act - try to reorder with non-existent ID
        var result = await service.ReorderQuestionsAsync(quiz.Id, new List<Guid> { Guid.NewGuid(), Guid.NewGuid() });

        // Assert
        Assert.False(result);
    }

    [Fact]
    public async Task ReorderQuestionsAsync_MismatchedCount_ReturnsFalse()
    {
        // Arrange
        using var db = TestDbContextFactory.Create();
        var quiz = await TestDbContextFactory.SeedQuizWithMultipleQuestionsAsync(db, 3);
        var service = new QuizService(db);

        // Only include 2 of 3 question IDs
        var partialIds = quiz.Questions.Take(2).Select(q => q.Id).ToList();

        // Act
        var result = await service.ReorderQuestionsAsync(quiz.Id, partialIds);

        // Assert
        Assert.False(result);
    }

    [Fact]
    public async Task ReorderQuestionsAsync_ValidReorder_ReturnsTrue()
    {
        // Arrange
        using var db = TestDbContextFactory.Create();
        var quiz = await TestDbContextFactory.SeedQuizWithMultipleQuestionsAsync(db, 3);
        var service = new QuizService(db);

        // Reverse the order
        var reversedIds = quiz.Questions.OrderBy(q => q.OrderIndex).Select(q => q.Id).Reverse().ToList();

        // Act
        var result = await service.ReorderQuestionsAsync(quiz.Id, reversedIds);

        // Assert
        Assert.True(result);
    }

    [Fact]
    public async Task ReorderQuestionsAsync_UpdatesOrderIndexes()
    {
        // Arrange
        using var db = TestDbContextFactory.Create();
        var quiz = await TestDbContextFactory.SeedQuizWithMultipleQuestionsAsync(db, 3);
        var service = new QuizService(db);

        var originalOrder = quiz.Questions.OrderBy(q => q.OrderIndex).Select(q => q.Id).ToList();
        var reversedOrder = originalOrder.AsEnumerable().Reverse().ToList();

        // Act
        await service.ReorderQuestionsAsync(quiz.Id, reversedOrder);

        // Assert
        var reorderedQuiz = await service.GetQuizByIdAsync(quiz.Id);
        Assert.NotNull(reorderedQuiz);

        for (int i = 0; i < reversedOrder.Count; i++)
        {
            var question = reorderedQuiz.Questions.First(q => q.Id == reversedOrder[i]);
            Assert.Equal(i, question.OrderIndex);
        }
    }

    #endregion

    #region Language Management Tests

    [Fact]
    public async Task AddQuizLanguageAsync_ValidLanguage_AddsLanguage()
    {
        // Arrange
        using var db = TestDbContextFactory.Create();
        var quiz = await TestDbContextFactory.SeedQuizWithMultipleQuestionsAsync(db, 1);
        var service = new QuizService(db);

        // Act
        var result = await service.AddQuizLanguageAsync(quiz.Id, "pt");

        // Assert
        Assert.NotNull(result);
        Assert.Equal("pt", result.LanguageCode);
        Assert.False(result.IsDefault);
    }

    [Fact]
    public async Task AddQuizLanguageAsync_DuplicateLanguage_ReturnsNull()
    {
        // Arrange
        using var db = TestDbContextFactory.Create();
        var quiz = await TestDbContextFactory.SeedQuizWithMultipleQuestionsAsync(db, 1);
        var service = new QuizService(db);

        // Act - try to add "en" which already exists as default
        var result = await service.AddQuizLanguageAsync(quiz.Id, "en");

        // Assert
        Assert.Null(result);
    }

    [Fact]
    public async Task DeleteQuizLanguageAsync_NonDefaultLanguage_DeletesLanguageAndTranslations()
    {
        // Arrange
        using var db = TestDbContextFactory.Create();
        var quiz = await TestDbContextFactory.SeedQuizWithMultipleQuestionsAsync(db, 1);
        var service = new QuizService(db);

        // Add a second language
        await service.AddQuizLanguageAsync(quiz.Id, "pt");

        // Add translations for the new language
        var question = quiz.Questions.First();
        await service.UpdateQuestionTranslationsAsync(question.Id, new UpdateQuestionTranslationsRequest(
            15,
            0,
            new Dictionary<string, QuestionTranslationContentDto>
            {
                ["en"] = new QuestionTranslationContentDto("English Question", new List<string> { "A", "B", "C", "D" }),
                ["pt"] = new QuestionTranslationContentDto("Portuguese Question", new List<string> { "A-pt", "B-pt", "C-pt", "D-pt" })
            }
        ));

        // Act
        var result = await service.DeleteQuizLanguageAsync(quiz.Id, "pt");

        // Assert
        Assert.True(result);

        // Verify translations were deleted
        var ptQuestionTranslations = db.QuestionTranslations.Where(t => t.LanguageCode == "pt").ToList();
        var ptAnswerTranslations = db.AnswerOptionTranslations.Where(t => t.LanguageCode == "pt").ToList();
        Assert.Empty(ptQuestionTranslations);
        Assert.Empty(ptAnswerTranslations);
    }

    [Fact]
    public async Task DeleteQuizLanguageAsync_DefaultLanguage_ReturnsFalse()
    {
        // Arrange
        using var db = TestDbContextFactory.Create();
        var quiz = await TestDbContextFactory.SeedQuizWithMultipleQuestionsAsync(db, 1);
        var service = new QuizService(db);

        // Act - try to delete the default language "en"
        var result = await service.DeleteQuizLanguageAsync(quiz.Id, "en");

        // Assert
        Assert.False(result);
    }

    #endregion

    #region Translation Management Tests

    [Fact]
    public async Task GetQuizWithTranslationsAsync_ReturnsAllLanguageTranslations()
    {
        // Arrange
        using var db = TestDbContextFactory.Create();
        var quiz = await TestDbContextFactory.SeedQuizWithMultipleQuestionsAsync(db, 2);
        var service = new QuizService(db);

        // Act
        var result = await service.GetQuizWithTranslationsAsync(quiz.Id);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(2, result.Questions.Count);
        Assert.Single(result.Languages);
        Assert.Contains("en", result.Questions[0].Translations.Keys);
    }

    [Fact]
    public async Task GetQuizWithTranslationsAsync_WithNewLanguage_ReturnsEmptyTranslationsForNewLanguage()
    {
        // Arrange
        using var db = TestDbContextFactory.Create();
        var quiz = await TestDbContextFactory.SeedQuizWithMultipleQuestionsAsync(db, 1);
        var service = new QuizService(db);

        // Add a new language (no translations exist yet)
        await service.AddQuizLanguageAsync(quiz.Id, "pt");

        // Act
        var result = await service.GetQuizWithTranslationsAsync(quiz.Id);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(2, result.Languages.Count);
        
        var question = result.Questions.First();
        Assert.Contains("en", question.Translations.Keys);
        Assert.Contains("pt", question.Translations.Keys);
        
        // Portuguese translations should be empty strings
        Assert.Equal("", question.Translations["pt"].QuestionText);
        Assert.All(question.Translations["pt"].AnswerTexts, text => Assert.Equal("", text));
    }

    [Fact]
    public async Task UpdateQuestionTranslationsAsync_ExistingQuestion_UpdatesTranslations()
    {
        // Arrange
        using var db = TestDbContextFactory.Create();
        var quiz = await TestDbContextFactory.SeedQuizWithMultipleQuestionsAsync(db, 1);
        var service = new QuizService(db);
        var questionId = quiz.Questions.First().Id;

        // Act
        var result = await service.UpdateQuestionTranslationsAsync(questionId, new UpdateQuestionTranslationsRequest(
            20,
            1,
            new Dictionary<string, QuestionTranslationContentDto>
            {
                ["en"] = new QuestionTranslationContentDto("Updated English Question", new List<string> { "A1", "B1", "C1", "D1" })
            }
        ));

        // Assert
        Assert.NotNull(result);
        Assert.Equal(20, result.TimeLimitSeconds);
        Assert.Equal(1, result.CorrectAnswerIndex);
        Assert.Equal("Updated English Question", result.Translations["en"].QuestionText);
        Assert.Equal("A1", result.Translations["en"].AnswerTexts[0]);
    }

    [Fact]
    public async Task UpdateQuestionTranslationsAsync_AddNewLanguageTranslation_CreatesTranslations()
    {
        // Arrange
        using var db = TestDbContextFactory.Create();
        var quiz = await TestDbContextFactory.SeedQuizWithMultipleQuestionsAsync(db, 1);
        var service = new QuizService(db);
        var questionId = quiz.Questions.First().Id;

        // Add a new language to the quiz
        await service.AddQuizLanguageAsync(quiz.Id, "pt");

        // Act - Update with translations for both languages (this is the bug scenario)
        var result = await service.UpdateQuestionTranslationsAsync(questionId, new UpdateQuestionTranslationsRequest(
            15,
            0,
            new Dictionary<string, QuestionTranslationContentDto>
            {
                ["en"] = new QuestionTranslationContentDto("English Question", new List<string> { "A", "B", "C", "D" }),
                ["pt"] = new QuestionTranslationContentDto("Pergunta em Português", new List<string> { "A-pt", "B-pt", "C-pt", "D-pt" })
            }
        ));

        // Assert
        Assert.NotNull(result);
        Assert.Contains("en", result.Translations.Keys);
        Assert.Contains("pt", result.Translations.Keys);
        Assert.Equal("English Question", result.Translations["en"].QuestionText);
        Assert.Equal("Pergunta em Português", result.Translations["pt"].QuestionText);
        Assert.Equal("A-pt", result.Translations["pt"].AnswerTexts[0]);
    }

    [Fact]
    public async Task UpdateQuestionTranslationsAsync_AddNewLanguageTranslation_PersistsToDatabase()
    {
        // Arrange
        using var db = TestDbContextFactory.Create();
        var quiz = await TestDbContextFactory.SeedQuizWithMultipleQuestionsAsync(db, 1);
        var service = new QuizService(db);
        var questionId = quiz.Questions.First().Id;

        // Add a new language to the quiz
        await service.AddQuizLanguageAsync(quiz.Id, "pt");

        // Act - Add translations for the new language
        await service.UpdateQuestionTranslationsAsync(questionId, new UpdateQuestionTranslationsRequest(
            15,
            0,
            new Dictionary<string, QuestionTranslationContentDto>
            {
                ["en"] = new QuestionTranslationContentDto("English", new List<string> { "A", "B", "C", "D" }),
                ["pt"] = new QuestionTranslationContentDto("Português", new List<string> { "A-pt", "B-pt", "C-pt", "D-pt" })
            }
        ));

        // Assert - Verify in database
        var ptQuestionTranslation = db.QuestionTranslations
            .FirstOrDefault(t => t.QuestionId == questionId && t.LanguageCode == "pt");
        Assert.NotNull(ptQuestionTranslation);
        Assert.Equal("Português", ptQuestionTranslation.Text);

        var ptAnswerTranslations = db.AnswerOptionTranslations
            .Where(t => t.LanguageCode == "pt")
            .ToList();
        Assert.Equal(4, ptAnswerTranslations.Count);
    }

    [Fact]
    public async Task UpdateQuestionTranslationsAsync_MultipleLanguages_AllTranslationsAreSaved()
    {
        // Arrange
        using var db = TestDbContextFactory.Create();
        var quiz = await TestDbContextFactory.SeedQuizWithMultipleQuestionsAsync(db, 1);
        var service = new QuizService(db);
        var questionId = quiz.Questions.First().Id;

        // Add multiple new languages
        await service.AddQuizLanguageAsync(quiz.Id, "pt");
        await service.AddQuizLanguageAsync(quiz.Id, "es");
        await service.AddQuizLanguageAsync(quiz.Id, "fr");

        // Act - Add translations for all languages
        var result = await service.UpdateQuestionTranslationsAsync(questionId, new UpdateQuestionTranslationsRequest(
            15,
            0,
            new Dictionary<string, QuestionTranslationContentDto>
            {
                ["en"] = new QuestionTranslationContentDto("English Question", new List<string> { "A", "B", "C", "D" }),
                ["pt"] = new QuestionTranslationContentDto("Pergunta", new List<string> { "A-pt", "B-pt", "C-pt", "D-pt" }),
                ["es"] = new QuestionTranslationContentDto("Pregunta", new List<string> { "A-es", "B-es", "C-es", "D-es" }),
                ["fr"] = new QuestionTranslationContentDto("Question", new List<string> { "A-fr", "B-fr", "C-fr", "D-fr" })
            }
        ));

        // Assert
        Assert.NotNull(result);
        Assert.Equal(4, result.Translations.Count);
        Assert.Equal("English Question", result.Translations["en"].QuestionText);
        Assert.Equal("Pergunta", result.Translations["pt"].QuestionText);
        Assert.Equal("Pregunta", result.Translations["es"].QuestionText);
        Assert.Equal("Question", result.Translations["fr"].QuestionText);
    }

    [Fact]
    public async Task AddQuestionWithTranslationsAsync_NewQuestion_CreatesQuestionWithAllTranslations()
    {
        // Arrange
        using var db = TestDbContextFactory.Create();
        var quiz = TestDbContextFactory.CreateQuizWithLanguage("Test Quiz");
        db.Quizzes.Add(quiz);
        await db.SaveChangesAsync();
        var service = new QuizService(db);

        // Add a second language
        await service.AddQuizLanguageAsync(quiz.Id, "pt");

        // Act
        var result = await service.AddQuestionWithTranslationsAsync(quiz.Id, new UpdateQuestionTranslationsRequest(
            20,
            2,
            new Dictionary<string, QuestionTranslationContentDto>
            {
                ["en"] = new QuestionTranslationContentDto("What is 2+2?", new List<string> { "3", "4", "5", "6" }),
                ["pt"] = new QuestionTranslationContentDto("Quanto é 2+2?", new List<string> { "3", "4", "5", "6" })
            }
        ));

        // Assert
        Assert.NotNull(result);
        Assert.NotEqual(Guid.Empty, result.Id);
        Assert.Equal(20, result.TimeLimitSeconds);
        Assert.Equal(2, result.CorrectAnswerIndex);
        Assert.Equal(4, result.AnswerOptionIds.Count);
        Assert.Equal("What is 2+2?", result.Translations["en"].QuestionText);
        Assert.Equal("Quanto é 2+2?", result.Translations["pt"].QuestionText);
    }

    [Fact]
    public async Task AddQuestionWithTranslationsAsync_NewQuestion_PersistsToDatabase()
    {
        // Arrange
        using var db = TestDbContextFactory.Create();
        var quiz = TestDbContextFactory.CreateQuizWithLanguage("Test Quiz");
        db.Quizzes.Add(quiz);
        await db.SaveChangesAsync();
        var service = new QuizService(db);

        await service.AddQuizLanguageAsync(quiz.Id, "pt");

        // Act
        var result = await service.AddQuestionWithTranslationsAsync(quiz.Id, new UpdateQuestionTranslationsRequest(
            15,
            0,
            new Dictionary<string, QuestionTranslationContentDto>
            {
                ["en"] = new QuestionTranslationContentDto("English Q", new List<string> { "A", "B", "C", "D" }),
                ["pt"] = new QuestionTranslationContentDto("Portuguese Q", new List<string> { "A", "B", "C", "D" })
            }
        ));

        // Assert - Verify in database
        Assert.NotNull(result);
        
        var savedQuestion = await db.Questions.FindAsync(result.Id);
        Assert.NotNull(savedQuestion);

        var questionTranslations = db.QuestionTranslations.Where(t => t.QuestionId == result.Id).ToList();
        Assert.Equal(2, questionTranslations.Count);
        Assert.Contains(questionTranslations, t => t.LanguageCode == "en");
        Assert.Contains(questionTranslations, t => t.LanguageCode == "pt");

        var answerTranslations = db.AnswerOptionTranslations
            .Where(t => result.AnswerOptionIds.Contains(t.AnswerOptionId))
            .ToList();
        Assert.Equal(8, answerTranslations.Count); // 4 answers × 2 languages
    }

    [Fact]
    public async Task UpdateQuestionTranslationsAsync_UpdateExistingAndAddNew_BothWork()
    {
        // Arrange
        using var db = TestDbContextFactory.Create();
        var quiz = await TestDbContextFactory.SeedQuizWithMultipleQuestionsAsync(db, 1);
        var service = new QuizService(db);
        var questionId = quiz.Questions.First().Id;

        // First update - just English
        await service.UpdateQuestionTranslationsAsync(questionId, new UpdateQuestionTranslationsRequest(
            15,
            0,
            new Dictionary<string, QuestionTranslationContentDto>
            {
                ["en"] = new QuestionTranslationContentDto("Initial English", new List<string> { "A", "B", "C", "D" })
            }
        ));

        // Add a new language
        await service.AddQuizLanguageAsync(quiz.Id, "pt");

        // Act - Update English and add Portuguese
        var result = await service.UpdateQuestionTranslationsAsync(questionId, new UpdateQuestionTranslationsRequest(
            20,
            1,
            new Dictionary<string, QuestionTranslationContentDto>
            {
                ["en"] = new QuestionTranslationContentDto("Updated English", new List<string> { "A1", "B1", "C1", "D1" }),
                ["pt"] = new QuestionTranslationContentDto("New Portuguese", new List<string> { "A-pt", "B-pt", "C-pt", "D-pt" })
            }
        ));

        // Assert
        Assert.NotNull(result);
        Assert.Equal("Updated English", result.Translations["en"].QuestionText);
        Assert.Equal("New Portuguese", result.Translations["pt"].QuestionText);
        Assert.Equal(20, result.TimeLimitSeconds);
        Assert.Equal(1, result.CorrectAnswerIndex);
    }

    [Fact]
    public async Task UpdateQuestionTranslationsAsync_NonExistentQuestion_ReturnsNull()
    {
        // Arrange
        using var db = TestDbContextFactory.Create();
        var service = new QuizService(db);

        // Act
        var result = await service.UpdateQuestionTranslationsAsync(Guid.NewGuid(), new UpdateQuestionTranslationsRequest(
            15,
            0,
            new Dictionary<string, QuestionTranslationContentDto>
            {
                ["en"] = new QuestionTranslationContentDto("Test", new List<string> { "A", "B", "C", "D" })
            }
        ));

        // Assert
        Assert.Null(result);
    }

    [Fact]
    public async Task AddQuestionWithTranslationsAsync_NonExistentQuiz_ReturnsNull()
    {
        // Arrange
        using var db = TestDbContextFactory.Create();
        var service = new QuizService(db);

        // Act
        var result = await service.AddQuestionWithTranslationsAsync(Guid.NewGuid(), new UpdateQuestionTranslationsRequest(
            15,
            0,
            new Dictionary<string, QuestionTranslationContentDto>
            {
                ["en"] = new QuestionTranslationContentDto("Test", new List<string> { "A", "B", "C", "D" })
            }
        ));

        // Assert
        Assert.Null(result);
    }

    #endregion
}
