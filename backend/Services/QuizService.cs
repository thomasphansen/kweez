using Kweez.Api.Data;
using Kweez.Api.DTOs;
using Kweez.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace Kweez.Api.Services;

public interface IQuizService
{
    Task<List<QuizDto>> GetAllQuizzesAsync();
    Task<QuizDetailDto?> GetQuizByIdAsync(Guid id);
    Task<QuizDto> CreateQuizAsync(CreateQuizRequest request);
    Task<QuizDto?> UpdateQuizAsync(Guid id, UpdateQuizRequest request);
    Task<bool> DeleteQuizAsync(Guid id);
    Task<QuestionDto> AddQuestionAsync(Guid quizId, CreateQuestionRequest request);
    Task<QuestionDto?> UpdateQuestionAsync(Guid questionId, UpdateQuestionRequest request);
    Task<bool> DeleteQuestionAsync(Guid questionId);
    Task<bool> ReorderQuestionsAsync(Guid quizId, List<Guid> questionIds);
    Task<string?> SetQuestionImageAsync(Guid questionId, string imageUrl);
    Task<bool> DeleteQuestionImageAsync(Guid questionId);
}

public class QuizService : IQuizService
{
    private readonly KweezDbContext _db;

    public QuizService(KweezDbContext db)
    {
        _db = db;
    }

    public async Task<List<QuizDto>> GetAllQuizzesAsync()
    {
        return await _db.Quizzes
            .OrderByDescending(q => q.CreatedAtUtc)
            .Select(q => new QuizDto(
                q.Id,
                q.Title,
                q.Description,
                q.Questions.Count,
                q.CreatedAtUtc,
                q.FixedJoinCode
            ))
            .ToListAsync();
    }

    public async Task<QuizDetailDto?> GetQuizByIdAsync(Guid id)
    {
        var quiz = await _db.Quizzes
            .Include(q => q.Questions.OrderBy(qu => qu.OrderIndex))
            .ThenInclude(q => q.AnswerOptions.OrderBy(a => a.OrderIndex))
            .FirstOrDefaultAsync(q => q.Id == id);

        if (quiz == null) return null;

        return new QuizDetailDto(
            quiz.Id,
            quiz.Title,
            quiz.Description,
            quiz.CreatedAtUtc,
            quiz.Questions.Select(q => new QuestionDto(
                q.Id,
                q.Text,
                q.ImageUrl,
                q.OrderIndex,
                q.TimeLimitSeconds,
                q.AnswerOptions.Select(a => new AnswerOptionDto(
                    a.Id,
                    a.Text,
                    a.OrderIndex,
                    a.IsCorrect
                )).ToList()
            )).ToList(),
            quiz.FixedJoinCode
        );
    }

    private static string GenerateJoinCode()
    {
        const string chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
        var random = new Random();
        return new string(Enumerable.Range(0, 6).Select(_ => chars[random.Next(chars.Length)]).ToArray());
    }

    public async Task<QuizDto> CreateQuizAsync(CreateQuizRequest request)
    {
        string? fixedJoinCode = null;
        
        if (request.UseFixedJoinCode)
        {
            // Generate a unique fixed join code
            do
            {
                fixedJoinCode = GenerateJoinCode();
            } while (await _db.Quizzes.AnyAsync(q => q.FixedJoinCode == fixedJoinCode) ||
                     await _db.QuizSessions.AnyAsync(s => s.JoinCode == fixedJoinCode));
        }
        
        var quiz = new Quiz
        {
            Id = Guid.NewGuid(),
            Title = request.Title,
            Description = request.Description,
            FixedJoinCode = fixedJoinCode,
            CreatedAtUtc = DateTime.UtcNow
        };

        _db.Quizzes.Add(quiz);
        await _db.SaveChangesAsync();

        return new QuizDto(quiz.Id, quiz.Title, quiz.Description, 0, quiz.CreatedAtUtc, quiz.FixedJoinCode);
    }

    public async Task<QuizDto?> UpdateQuizAsync(Guid id, UpdateQuizRequest request)
    {
        var quiz = await _db.Quizzes
            .Include(q => q.Questions)
            .FirstOrDefaultAsync(q => q.Id == id);

        if (quiz == null) return null;

        quiz.Title = request.Title;
        quiz.Description = request.Description;
        quiz.UpdatedAtUtc = DateTime.UtcNow;
        
        // Handle fixed join code toggle
        if (request.UseFixedJoinCode.HasValue)
        {
            if (request.UseFixedJoinCode.Value && quiz.FixedJoinCode == null)
            {
                // Enable fixed join code - generate a new one
                string fixedJoinCode;
                do
                {
                    fixedJoinCode = GenerateJoinCode();
                } while (await _db.Quizzes.AnyAsync(q => q.FixedJoinCode == fixedJoinCode && q.Id != id) ||
                         await _db.QuizSessions.AnyAsync(s => s.JoinCode == fixedJoinCode));
                quiz.FixedJoinCode = fixedJoinCode;
            }
            else if (!request.UseFixedJoinCode.Value)
            {
                // Disable fixed join code
                quiz.FixedJoinCode = null;
            }
        }

        await _db.SaveChangesAsync();

        return new QuizDto(quiz.Id, quiz.Title, quiz.Description, quiz.Questions.Count, quiz.CreatedAtUtc, quiz.FixedJoinCode);
    }

    public async Task<bool> DeleteQuizAsync(Guid id)
    {
        var quiz = await _db.Quizzes
            .Include(q => q.Questions)
            .Include(q => q.Sessions)
                .ThenInclude(s => s.Participants)
                    .ThenInclude(p => p.Answers)
            .FirstOrDefaultAsync(q => q.Id == id);
            
        if (quiz == null) return false;

        // Delete participant answers first (they have Restrict delete behavior)
        foreach (var session in quiz.Sessions)
        {
            foreach (var participant in session.Participants)
            {
                _db.ParticipantAnswers.RemoveRange(participant.Answers);
            }
        }

        _db.Quizzes.Remove(quiz);
        await _db.SaveChangesAsync();
        return true;
    }

    public async Task<QuestionDto> AddQuestionAsync(Guid quizId, CreateQuestionRequest request)
    {
        var maxOrder = await _db.Questions
            .Where(q => q.QuizId == quizId)
            .MaxAsync(q => (int?)q.OrderIndex) ?? -1;

        var question = new Question
        {
            Id = Guid.NewGuid(),
            QuizId = quizId,
            Text = request.Text,
            TimeLimitSeconds = request.TimeLimitSeconds,
            OrderIndex = maxOrder + 1,
            CreatedAtUtc = DateTime.UtcNow,
            AnswerOptions = request.AnswerOptions.Select((a, i) => new AnswerOption
            {
                Id = Guid.NewGuid(),
                Text = a.Text,
                IsCorrect = a.IsCorrect,
                OrderIndex = i
            }).ToList()
        };

        _db.Questions.Add(question);
        await _db.SaveChangesAsync();

        return new QuestionDto(
            question.Id,
            question.Text,
            question.ImageUrl,
            question.OrderIndex,
            question.TimeLimitSeconds,
            question.AnswerOptions.Select(a => new AnswerOptionDto(
                a.Id, a.Text, a.OrderIndex, a.IsCorrect
            )).ToList()
        );
    }

    public async Task<QuestionDto?> UpdateQuestionAsync(Guid questionId, UpdateQuestionRequest request)
    {
        var question = await _db.Questions
            .Include(q => q.AnswerOptions)
            .FirstOrDefaultAsync(q => q.Id == questionId);

        if (question == null) return null;

        // Store the order index before any modifications
        var orderIndex = question.OrderIndex;

        // Remove old answers first
        var oldAnswerIds = question.AnswerOptions.Select(a => a.Id).ToList();
        foreach (var answerId in oldAnswerIds)
        {
            var answer = await _db.AnswerOptions.FindAsync(answerId);
            if (answer != null)
            {
                _db.AnswerOptions.Remove(answer);
            }
        }
        await _db.SaveChangesAsync();
        
        // Reload question to get fresh state
        question = await _db.Questions.FindAsync(questionId);
        if (question == null) return null;
        
        // Update question properties
        question.Text = request.Text;
        question.TimeLimitSeconds = request.TimeLimitSeconds;
        
        // Add new answers
        var newAnswers = request.AnswerOptions.Select((a, i) => new AnswerOption
        {
            Id = a.Id ?? Guid.NewGuid(),
            QuestionId = questionId,
            Text = a.Text,
            IsCorrect = a.IsCorrect,
            OrderIndex = i
        }).ToList();
        
        _db.AnswerOptions.AddRange(newAnswers);
        await _db.SaveChangesAsync();

        return new QuestionDto(
            question.Id,
            question.Text,
            question.ImageUrl,
            question.OrderIndex,
            question.TimeLimitSeconds,
            newAnswers.Select(a => new AnswerOptionDto(
                a.Id, a.Text, a.OrderIndex, a.IsCorrect
            )).ToList()
        );
    }

    public async Task<bool> DeleteQuestionAsync(Guid questionId)
    {
        var question = await _db.Questions.FindAsync(questionId);
        if (question == null) return false;

        _db.Questions.Remove(question);
        await _db.SaveChangesAsync();
        return true;
    }

    public async Task<bool> ReorderQuestionsAsync(Guid quizId, List<Guid> questionIds)
    {
        var questions = await _db.Questions
            .Where(q => q.QuizId == quizId)
            .ToListAsync();

        if (questions.Count != questionIds.Count) return false;

        for (int i = 0; i < questionIds.Count; i++)
        {
            var question = questions.FirstOrDefault(q => q.Id == questionIds[i]);
            if (question == null) return false;
            question.OrderIndex = i;
        }

        await _db.SaveChangesAsync();
        return true;
    }

    public async Task<string?> SetQuestionImageAsync(Guid questionId, string imageUrl)
    {
        var question = await _db.Questions.FindAsync(questionId);
        if (question == null) return null;

        question.ImageUrl = imageUrl;
        await _db.SaveChangesAsync();
        return imageUrl;
    }

    public async Task<bool> DeleteQuestionImageAsync(Guid questionId)
    {
        var question = await _db.Questions.FindAsync(questionId);
        if (question == null) return false;

        question.ImageUrl = null;
        await _db.SaveChangesAsync();
        return true;
    }
}
