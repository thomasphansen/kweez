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
                q.CreatedAtUtc
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
                q.OrderIndex,
                q.TimeLimitSeconds,
                q.AnswerOptions.Select(a => new AnswerOptionDto(
                    a.Id,
                    a.Text,
                    a.OrderIndex,
                    a.IsCorrect
                )).ToList()
            )).ToList()
        );
    }

    public async Task<QuizDto> CreateQuizAsync(CreateQuizRequest request)
    {
        var quiz = new Quiz
        {
            Id = Guid.NewGuid(),
            Title = request.Title,
            Description = request.Description,
            CreatedAtUtc = DateTime.UtcNow
        };

        _db.Quizzes.Add(quiz);
        await _db.SaveChangesAsync();

        return new QuizDto(quiz.Id, quiz.Title, quiz.Description, 0, quiz.CreatedAtUtc);
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

        await _db.SaveChangesAsync();

        return new QuizDto(quiz.Id, quiz.Title, quiz.Description, quiz.Questions.Count, quiz.CreatedAtUtc);
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
}
