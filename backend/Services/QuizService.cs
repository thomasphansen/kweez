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
    
    // Language management
    Task<List<QuizLanguageDto>> GetQuizLanguagesAsync(Guid quizId);
    Task<QuizLanguageDto?> AddQuizLanguageAsync(Guid quizId, string languageCode);
    Task<bool> SetDefaultLanguageAsync(Guid quizId, string languageCode);
    Task<bool> DeleteQuizLanguageAsync(Guid quizId, string languageCode);
    
    // Translation management
    Task<QuizWithTranslationsDto?> GetQuizWithTranslationsAsync(Guid id);
    Task<QuestionWithTranslationsDto?> UpdateQuestionTranslationsAsync(Guid questionId, UpdateQuestionTranslationsRequest request);
    Task<QuestionWithTranslationsDto?> AddQuestionWithTranslationsAsync(Guid quizId, UpdateQuestionTranslationsRequest request);
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
            .Include(q => q.Languages)
            .OrderByDescending(q => q.CreatedAtUtc)
            .Select(q => new QuizDto(
                q.Id,
                q.Title,
                q.Description,
                q.Questions.Count,
                q.CreatedAtUtc,
                q.FixedJoinCode,
                q.Languages.Select(l => new QuizLanguageDto(l.Id, l.LanguageCode, l.IsDefault)).ToList()
            ))
            .ToListAsync();
    }

    public async Task<QuizDetailDto?> GetQuizByIdAsync(Guid id)
    {
        var quiz = await _db.Quizzes
            .Include(q => q.Questions.OrderBy(qu => qu.OrderIndex))
                .ThenInclude(q => q.Translations)
            .Include(q => q.Questions)
                .ThenInclude(q => q.AnswerOptions.OrderBy(a => a.OrderIndex))
                    .ThenInclude(a => a.Translations)
            .Include(q => q.Languages)
            .FirstOrDefaultAsync(q => q.Id == id);

        if (quiz == null) return null;

        // Get default language code
        var defaultLanguage = quiz.Languages.FirstOrDefault(l => l.IsDefault)?.LanguageCode ?? "en";

        return new QuizDetailDto(
            quiz.Id,
            quiz.Title,
            quiz.Description,
            quiz.CreatedAtUtc,
            quiz.Questions.Select(q => new QuestionDto(
                q.Id,
                q.Translations.FirstOrDefault(t => t.LanguageCode == defaultLanguage)?.Text ?? "",
                q.ImageUrl,
                q.OrderIndex,
                q.TimeLimitSeconds,
                q.AnswerOptions.Select(a => new AnswerOptionDto(
                    a.Id,
                    a.Translations.FirstOrDefault(t => t.LanguageCode == defaultLanguage)?.Text ?? "",
                    a.OrderIndex,
                    a.IsCorrect
                )).ToList()
            )).ToList(),
            quiz.FixedJoinCode,
            quiz.Languages.Select(l => new QuizLanguageDto(l.Id, l.LanguageCode, l.IsDefault)).ToList()
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
            CreatedAtUtc = DateTime.UtcNow,
            Languages = new List<QuizLanguage>
            {
                new QuizLanguage
                {
                    Id = Guid.NewGuid(),
                    LanguageCode = request.DefaultLanguage,
                    IsDefault = true,
                    CreatedAtUtc = DateTime.UtcNow
                }
            }
        };

        _db.Quizzes.Add(quiz);
        await _db.SaveChangesAsync();

        return new QuizDto(
            quiz.Id, 
            quiz.Title, 
            quiz.Description, 
            0, 
            quiz.CreatedAtUtc, 
            quiz.FixedJoinCode,
            quiz.Languages.Select(l => new QuizLanguageDto(l.Id, l.LanguageCode, l.IsDefault)).ToList()
        );
    }

    public async Task<QuizDto?> UpdateQuizAsync(Guid id, UpdateQuizRequest request)
    {
        var quiz = await _db.Quizzes
            .Include(q => q.Questions)
            .Include(q => q.Languages)
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

        return new QuizDto(
            quiz.Id, 
            quiz.Title, 
            quiz.Description, 
            quiz.Questions.Count, 
            quiz.CreatedAtUtc, 
            quiz.FixedJoinCode,
            quiz.Languages.Select(l => new QuizLanguageDto(l.Id, l.LanguageCode, l.IsDefault)).ToList()
        );
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
        // Get the default language for this quiz
        var defaultLanguage = await _db.QuizLanguages
            .Where(l => l.QuizId == quizId && l.IsDefault)
            .Select(l => l.LanguageCode)
            .FirstOrDefaultAsync() ?? "en";

        var maxOrder = await _db.Questions
            .Where(q => q.QuizId == quizId)
            .MaxAsync(q => (int?)q.OrderIndex) ?? -1;

        var questionId = Guid.NewGuid();
        var question = new Question
        {
            Id = questionId,
            QuizId = quizId,
            TimeLimitSeconds = request.TimeLimitSeconds,
            OrderIndex = maxOrder + 1,
            CreatedAtUtc = DateTime.UtcNow,
            Translations = new List<QuestionTranslation>
            {
                new QuestionTranslation
                {
                    Id = Guid.NewGuid(),
                    QuestionId = questionId,
                    LanguageCode = defaultLanguage,
                    Text = request.Text
                }
            },
            AnswerOptions = request.AnswerOptions.Select((a, i) => 
            {
                var answerId = Guid.NewGuid();
                return new AnswerOption
                {
                    Id = answerId,
                    IsCorrect = a.IsCorrect,
                    OrderIndex = i,
                    Translations = new List<AnswerOptionTranslation>
                    {
                        new AnswerOptionTranslation
                        {
                            Id = Guid.NewGuid(),
                            AnswerOptionId = answerId,
                            LanguageCode = defaultLanguage,
                            Text = a.Text
                        }
                    }
                };
            }).ToList()
        };

        _db.Questions.Add(question);
        await _db.SaveChangesAsync();

        return new QuestionDto(
            question.Id,
            request.Text,
            question.ImageUrl,
            question.OrderIndex,
            question.TimeLimitSeconds,
            question.AnswerOptions.Select((a, i) => new AnswerOptionDto(
                a.Id, request.AnswerOptions[i].Text, a.OrderIndex, a.IsCorrect
            )).ToList()
        );
    }

    public async Task<QuestionDto?> UpdateQuestionAsync(Guid questionId, UpdateQuestionRequest request)
    {
        var question = await _db.Questions
            .Include(q => q.AnswerOptions)
                .ThenInclude(a => a.Translations)
            .Include(q => q.Translations)
            .FirstOrDefaultAsync(q => q.Id == questionId);

        if (question == null) return null;

        // Get the quiz's default language
        var defaultLanguage = await _db.QuizLanguages
            .Where(l => l.QuizId == question.QuizId && l.IsDefault)
            .Select(l => l.LanguageCode)
            .FirstOrDefaultAsync() ?? "en";

        // Store the order index before any modifications
        var orderIndex = question.OrderIndex;

        // Remove old answer translations first (before removing answers)
        foreach (var answer in question.AnswerOptions)
        {
            _db.AnswerOptionTranslations.RemoveRange(answer.Translations);
        }
        await _db.SaveChangesAsync();

        // Remove old answers
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
        question = await _db.Questions
            .Include(q => q.Translations)
            .FirstOrDefaultAsync(q => q.Id == questionId);
        if (question == null) return null;
        
        // Update question text translation
        question.TimeLimitSeconds = request.TimeLimitSeconds;
        var questionTranslation = question.Translations.FirstOrDefault(t => t.LanguageCode == defaultLanguage);
        if (questionTranslation != null)
        {
            questionTranslation.Text = request.Text;
        }
        else
        {
            question.Translations.Add(new QuestionTranslation
            {
                Id = Guid.NewGuid(),
                QuestionId = questionId,
                LanguageCode = defaultLanguage,
                Text = request.Text
            });
        }
        
        // Add new answers with translations
        var newAnswers = request.AnswerOptions.Select((a, i) => 
        {
            var answerId = a.Id ?? Guid.NewGuid();
            return new AnswerOption
            {
                Id = answerId,
                QuestionId = questionId,
                IsCorrect = a.IsCorrect,
                OrderIndex = i,
                Translations = new List<AnswerOptionTranslation>
                {
                    new AnswerOptionTranslation
                    {
                        Id = Guid.NewGuid(),
                        AnswerOptionId = answerId,
                        LanguageCode = defaultLanguage,
                        Text = a.Text
                    }
                }
            };
        }).ToList();
        
        _db.AnswerOptions.AddRange(newAnswers);
        await _db.SaveChangesAsync();

        return new QuestionDto(
            question.Id,
            request.Text,
            question.ImageUrl,
            question.OrderIndex,
            question.TimeLimitSeconds,
            newAnswers.Select(a => new AnswerOptionDto(
                a.Id, 
                a.Translations.First().Text, 
                a.OrderIndex, 
                a.IsCorrect
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

    // Language management methods

    public async Task<List<QuizLanguageDto>> GetQuizLanguagesAsync(Guid quizId)
    {
        return await _db.QuizLanguages
            .Where(l => l.QuizId == quizId)
            .OrderByDescending(l => l.IsDefault)
            .ThenBy(l => l.LanguageCode)
            .Select(l => new QuizLanguageDto(l.Id, l.LanguageCode, l.IsDefault))
            .ToListAsync();
    }

    public async Task<QuizLanguageDto?> AddQuizLanguageAsync(Guid quizId, string languageCode)
    {
        // Check if quiz exists
        var quizExists = await _db.Quizzes.AnyAsync(q => q.Id == quizId);
        if (!quizExists) return null;

        // Check if language already exists for this quiz
        var exists = await _db.QuizLanguages.AnyAsync(l => l.QuizId == quizId && l.LanguageCode == languageCode);
        if (exists) return null;

        var language = new QuizLanguage
        {
            Id = Guid.NewGuid(),
            QuizId = quizId,
            LanguageCode = languageCode,
            IsDefault = false,
            CreatedAtUtc = DateTime.UtcNow
        };

        _db.QuizLanguages.Add(language);
        await _db.SaveChangesAsync();

        return new QuizLanguageDto(language.Id, language.LanguageCode, language.IsDefault);
    }

    public async Task<bool> SetDefaultLanguageAsync(Guid quizId, string languageCode)
    {
        var languages = await _db.QuizLanguages
            .Where(l => l.QuizId == quizId)
            .ToListAsync();

        if (languages.Count == 0) return false;

        var targetLanguage = languages.FirstOrDefault(l => l.LanguageCode == languageCode);
        if (targetLanguage == null) return false;

        // Unset current default and set new default
        foreach (var lang in languages)
        {
            lang.IsDefault = lang.LanguageCode == languageCode;
        }

        await _db.SaveChangesAsync();
        return true;
    }

    public async Task<bool> DeleteQuizLanguageAsync(Guid quizId, string languageCode)
    {
        var language = await _db.QuizLanguages
            .FirstOrDefaultAsync(l => l.QuizId == quizId && l.LanguageCode == languageCode);

        if (language == null) return false;

        // Cannot delete the default language
        if (language.IsDefault) return false;

        // Delete all translations for this language
        // Clear change tracker to avoid tracking conflicts, then query and delete fresh entities
        _db.ChangeTracker.Clear();
        
        var questionIds = await _db.Questions
            .Where(q => q.QuizId == quizId)
            .Select(q => q.Id)
            .ToListAsync();

        var questionTranslations = await _db.QuestionTranslations
            .Where(t => questionIds.Contains(t.QuestionId) && t.LanguageCode == languageCode)
            .ToListAsync();
        
        _db.QuestionTranslations.RemoveRange(questionTranslations);

        var answerOptionIds = await _db.AnswerOptions
            .Where(a => questionIds.Contains(a.QuestionId))
            .Select(a => a.Id)
            .ToListAsync();

        var answerTranslations = await _db.AnswerOptionTranslations
            .Where(t => answerOptionIds.Contains(t.AnswerOptionId) && t.LanguageCode == languageCode)
            .ToListAsync();
        
        _db.AnswerOptionTranslations.RemoveRange(answerTranslations);
        
        // Re-fetch language since we cleared tracker
        language = await _db.QuizLanguages.FirstOrDefaultAsync(l => l.QuizId == quizId && l.LanguageCode == languageCode);
        if (language != null)
        {
            _db.QuizLanguages.Remove(language);
        }
        
        await _db.SaveChangesAsync();
        return true;
    }

    // Translation management methods

    public async Task<QuizWithTranslationsDto?> GetQuizWithTranslationsAsync(Guid id)
    {
        var quiz = await _db.Quizzes
            .Include(q => q.Languages)
            .Include(q => q.Questions.OrderBy(qu => qu.OrderIndex))
                .ThenInclude(q => q.Translations)
            .Include(q => q.Questions)
                .ThenInclude(q => q.AnswerOptions.OrderBy(a => a.OrderIndex))
                    .ThenInclude(a => a.Translations)
            .FirstOrDefaultAsync(q => q.Id == id);

        if (quiz == null) return null;

        var questions = quiz.Questions.Select(q =>
        {
            var answerOptionIds = q.AnswerOptions.Select(a => a.Id).ToList();
            var correctAnswerIndex = q.AnswerOptions.ToList().FindIndex(a => a.IsCorrect);

            // Build translations dictionary
            var translations = new Dictionary<string, QuestionTranslationContentDto>();
            foreach (var lang in quiz.Languages)
            {
                var questionText = q.Translations
                    .FirstOrDefault(t => t.LanguageCode == lang.LanguageCode)?.Text ?? "";
                var answerTexts = q.AnswerOptions
                    .Select(a => a.Translations
                        .FirstOrDefault(t => t.LanguageCode == lang.LanguageCode)?.Text ?? "")
                    .ToList();
                translations[lang.LanguageCode] = new QuestionTranslationContentDto(questionText, answerTexts);
            }

            return new QuestionWithTranslationsDto(
                q.Id,
                q.ImageUrl,
                q.OrderIndex,
                q.TimeLimitSeconds,
                correctAnswerIndex,
                answerOptionIds,
                translations
            );
        }).ToList();

        return new QuizWithTranslationsDto(
            quiz.Id,
            quiz.Title,
            quiz.Description,
            quiz.CreatedAtUtc,
            quiz.FixedJoinCode,
            quiz.Languages.Select(l => new QuizLanguageDto(l.Id, l.LanguageCode, l.IsDefault)).ToList(),
            questions
        );
    }

    public async Task<QuestionWithTranslationsDto?> UpdateQuestionTranslationsAsync(Guid questionId, UpdateQuestionTranslationsRequest request)
    {
        var question = await _db.Questions
            .Include(q => q.Quiz)
                .ThenInclude(q => q.Languages)
            .Include(q => q.AnswerOptions.OrderBy(a => a.OrderIndex))
                .ThenInclude(a => a.Translations)
            .Include(q => q.Translations)
            .FirstOrDefaultAsync(q => q.Id == questionId);

        if (question == null) return null;

        // Update time limit
        question.TimeLimitSeconds = request.TimeLimitSeconds;

        // Update correct answer
        var answerOptions = question.AnswerOptions.ToList();
        for (int i = 0; i < answerOptions.Count; i++)
        {
            answerOptions[i].IsCorrect = i == request.CorrectAnswerIndex;
        }

        // Update translations for each language
        foreach (var (languageCode, content) in request.Translations)
        {
            // Update question translation
            var questionTranslation = question.Translations.FirstOrDefault(t => t.LanguageCode == languageCode);
            if (questionTranslation != null)
            {
                questionTranslation.Text = content.QuestionText;
            }
            else
            {
                // Add new translation directly to DbContext to avoid tracking issues
                var newTranslation = new QuestionTranslation
                {
                    Id = Guid.NewGuid(),
                    QuestionId = questionId,
                    LanguageCode = languageCode,
                    Text = content.QuestionText
                };
                _db.QuestionTranslations.Add(newTranslation);
                question.Translations.Add(newTranslation);
            }

            // Update answer translations
            for (int i = 0; i < answerOptions.Count && i < content.AnswerTexts.Count; i++)
            {
                var answerTranslation = answerOptions[i].Translations.FirstOrDefault(t => t.LanguageCode == languageCode);
                if (answerTranslation != null)
                {
                    answerTranslation.Text = content.AnswerTexts[i];
                }
                else
                {
                    // Add new translation directly to DbContext to avoid tracking issues
                    var newAnswerTranslation = new AnswerOptionTranslation
                    {
                        Id = Guid.NewGuid(),
                        AnswerOptionId = answerOptions[i].Id,
                        LanguageCode = languageCode,
                        Text = content.AnswerTexts[i]
                    };
                    _db.AnswerOptionTranslations.Add(newAnswerTranslation);
                    answerOptions[i].Translations.Add(newAnswerTranslation);
                }
            }
        }

        await _db.SaveChangesAsync();

        // Return updated question
        var answerOptionIds = answerOptions.Select(a => a.Id).ToList();
        var correctAnswerIndex = answerOptions.FindIndex(a => a.IsCorrect);

        var translations = new Dictionary<string, QuestionTranslationContentDto>();
        foreach (var lang in question.Quiz.Languages)
        {
            var questionText = question.Translations
                .FirstOrDefault(t => t.LanguageCode == lang.LanguageCode)?.Text ?? "";
            var answerTexts = answerOptions
                .Select(a => a.Translations
                    .FirstOrDefault(t => t.LanguageCode == lang.LanguageCode)?.Text ?? "")
                .ToList();
            translations[lang.LanguageCode] = new QuestionTranslationContentDto(questionText, answerTexts);
        }

        return new QuestionWithTranslationsDto(
            question.Id,
            question.ImageUrl,
            question.OrderIndex,
            question.TimeLimitSeconds,
            correctAnswerIndex,
            answerOptionIds,
            translations
        );
    }

    public async Task<QuestionWithTranslationsDto?> AddQuestionWithTranslationsAsync(Guid quizId, UpdateQuestionTranslationsRequest request)
    {
        var quiz = await _db.Quizzes
            .Include(q => q.Languages)
            .Include(q => q.Questions)
            .FirstOrDefaultAsync(q => q.Id == quizId);

        if (quiz == null) return null;

        var maxOrder = quiz.Questions.Any() ? quiz.Questions.Max(q => q.OrderIndex) : -1;

        var questionId = Guid.NewGuid();
        var question = new Question
        {
            Id = questionId,
            QuizId = quizId,
            TimeLimitSeconds = request.TimeLimitSeconds,
            OrderIndex = maxOrder + 1,
            CreatedAtUtc = DateTime.UtcNow,
            Translations = new List<QuestionTranslation>(),
            AnswerOptions = new List<AnswerOption>()
        };

        // Create 4 answer options
        var answerOptionIds = new List<Guid>();
        for (int i = 0; i < 4; i++)
        {
            var answerId = Guid.NewGuid();
            answerOptionIds.Add(answerId);
            question.AnswerOptions.Add(new AnswerOption
            {
                Id = answerId,
                QuestionId = questionId,
                OrderIndex = i,
                IsCorrect = i == request.CorrectAnswerIndex,
                Translations = new List<AnswerOptionTranslation>()
            });
        }

        // Add translations for each language
        var answerOptions = question.AnswerOptions.ToList();
        foreach (var (languageCode, content) in request.Translations)
        {
            question.Translations.Add(new QuestionTranslation
            {
                Id = Guid.NewGuid(),
                QuestionId = questionId,
                LanguageCode = languageCode,
                Text = content.QuestionText
            });

            for (int i = 0; i < answerOptions.Count && i < content.AnswerTexts.Count; i++)
            {
                answerOptions[i].Translations.Add(new AnswerOptionTranslation
                {
                    Id = Guid.NewGuid(),
                    AnswerOptionId = answerOptions[i].Id,
                    LanguageCode = languageCode,
                    Text = content.AnswerTexts[i]
                });
            }
        }

        _db.Questions.Add(question);
        await _db.SaveChangesAsync();

        // Build response
        var translations = new Dictionary<string, QuestionTranslationContentDto>();
        foreach (var lang in quiz.Languages)
        {
            var questionText = question.Translations
                .FirstOrDefault(t => t.LanguageCode == lang.LanguageCode)?.Text ?? "";
            var answerTexts = answerOptions
                .Select(a => a.Translations
                    .FirstOrDefault(t => t.LanguageCode == lang.LanguageCode)?.Text ?? "")
                .ToList();
            translations[lang.LanguageCode] = new QuestionTranslationContentDto(questionText, answerTexts);
        }

        return new QuestionWithTranslationsDto(
            question.Id,
            question.ImageUrl,
            question.OrderIndex,
            question.TimeLimitSeconds,
            request.CorrectAnswerIndex,
            answerOptionIds,
            translations
        );
    }
}
