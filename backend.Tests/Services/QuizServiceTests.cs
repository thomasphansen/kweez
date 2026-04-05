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
}
