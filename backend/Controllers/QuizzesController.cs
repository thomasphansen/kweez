using Kweez.Api.DTOs;
using Kweez.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Kweez.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Policy = "Admin")]
public class QuizzesController : ControllerBase
{
    private readonly IQuizService _quizService;
    private readonly IWebHostEnvironment _env;

    public QuizzesController(IQuizService quizService, IWebHostEnvironment env)
    {
        _quizService = quizService;
        _env = env;
    }

    [HttpGet]
    public async Task<ActionResult<List<QuizDto>>> GetAll()
    {
        var quizzes = await _quizService.GetAllQuizzesAsync();
        return Ok(quizzes);
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<QuizDetailDto>> GetById(Guid id)
    {
        var quiz = await _quizService.GetQuizByIdAsync(id);
        if (quiz == null) return NotFound();
        return Ok(quiz);
    }

    [HttpPost]
    public async Task<ActionResult<QuizDto>> Create(CreateQuizRequest request)
    {
        var quiz = await _quizService.CreateQuizAsync(request);
        return CreatedAtAction(nameof(GetById), new { id = quiz.Id }, quiz);
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<QuizDto>> Update(Guid id, UpdateQuizRequest request)
    {
        var quiz = await _quizService.UpdateQuizAsync(id, request);
        if (quiz == null) return NotFound();
        return Ok(quiz);
    }

    [HttpDelete("{id:guid}")]
    public async Task<ActionResult> Delete(Guid id)
    {
        var deleted = await _quizService.DeleteQuizAsync(id);
        if (!deleted) return NotFound();
        return NoContent();
    }

    [HttpPost("{quizId:guid}/questions")]
    public async Task<ActionResult<QuestionDto>> AddQuestion(Guid quizId, CreateQuestionRequest request)
    {
        try
        {
            var question = await _quizService.AddQuestionAsync(quizId, request);
            return CreatedAtAction(nameof(GetById), new { id = quizId }, question);
        }
        catch
        {
            return NotFound();
        }
    }

    [HttpPut("questions/{questionId:guid}")]
    public async Task<ActionResult<QuestionDto>> UpdateQuestion(Guid questionId, UpdateQuestionRequest request)
    {
        var question = await _quizService.UpdateQuestionAsync(questionId, request);
        if (question == null) return NotFound();
        return Ok(question);
    }

    [HttpDelete("questions/{questionId:guid}")]
    public async Task<ActionResult> DeleteQuestion(Guid questionId)
    {
        var deleted = await _quizService.DeleteQuestionAsync(questionId);
        if (!deleted) return NotFound();
        return NoContent();
    }

    [HttpPut("{quizId:guid}/questions/reorder")]
    public async Task<ActionResult> ReorderQuestions(Guid quizId, [FromBody] List<Guid> questionIds)
    {
        var success = await _quizService.ReorderQuestionsAsync(quizId, questionIds);
        if (!success) return BadRequest("Could not reorder questions");
        return NoContent();
    }

    [HttpPost("questions/{questionId:guid}/image")]
    public async Task<ActionResult<object>> UploadQuestionImage(Guid questionId, IFormFile file)
    {
        if (file == null || file.Length == 0)
            return BadRequest("No file provided");

        // Validate file type
        var allowedTypes = new[] { "image/jpeg", "image/png", "image/gif", "image/webp" };
        if (!allowedTypes.Contains(file.ContentType.ToLower()))
            return BadRequest("Invalid file type. Allowed: JPEG, PNG, GIF, WebP");

        // Validate file size (max 5MB)
        if (file.Length > 5 * 1024 * 1024)
            return BadRequest("File too large. Maximum size: 5MB");

        // Create uploads directory if it doesn't exist
        var uploadsDir = Path.Combine(_env.ContentRootPath, "uploads", "questions");
        Directory.CreateDirectory(uploadsDir);

        // Generate unique filename
        var extension = Path.GetExtension(file.FileName);
        var fileName = $"{questionId}_{Guid.NewGuid()}{extension}";
        var filePath = Path.Combine(uploadsDir, fileName);

        // Save file
        using (var stream = new FileStream(filePath, FileMode.Create))
        {
            await file.CopyToAsync(stream);
        }

        // Generate URL (relative to API)
        var imageUrl = $"/uploads/questions/{fileName}";

        // Update question with image URL
        var result = await _quizService.SetQuestionImageAsync(questionId, imageUrl);
        if (result == null)
        {
            // Clean up file if question not found
            System.IO.File.Delete(filePath);
            return NotFound();
        }

        return Ok(new { imageUrl });
    }

    [HttpDelete("questions/{questionId:guid}/image")]
    public async Task<ActionResult> DeleteQuestionImage(Guid questionId)
    {
        var deleted = await _quizService.DeleteQuestionImageAsync(questionId);
        if (!deleted) return NotFound();
        return NoContent();
    }

    // Language management endpoints

    [HttpGet("{quizId:guid}/languages")]
    public async Task<ActionResult<List<QuizLanguageDto>>> GetLanguages(Guid quizId)
    {
        var languages = await _quizService.GetQuizLanguagesAsync(quizId);
        return Ok(languages);
    }

    [HttpPost("{quizId:guid}/languages")]
    public async Task<ActionResult<QuizLanguageDto>> AddLanguage(Guid quizId, AddQuizLanguageRequest request)
    {
        var language = await _quizService.AddQuizLanguageAsync(quizId, request.LanguageCode);
        if (language == null) return BadRequest("Could not add language. Quiz not found or language already exists.");
        return CreatedAtAction(nameof(GetLanguages), new { quizId }, language);
    }

    [HttpPut("{quizId:guid}/languages/default")]
    public async Task<ActionResult> SetDefaultLanguage(Guid quizId, SetDefaultLanguageRequest request)
    {
        var success = await _quizService.SetDefaultLanguageAsync(quizId, request.LanguageCode);
        if (!success) return BadRequest("Could not set default language. Quiz or language not found.");
        return NoContent();
    }

    [HttpDelete("{quizId:guid}/languages/{languageCode}")]
    public async Task<ActionResult> DeleteLanguage(Guid quizId, string languageCode)
    {
        var deleted = await _quizService.DeleteQuizLanguageAsync(quizId, languageCode);
        if (!deleted) return BadRequest("Could not delete language. Language not found or is the default language.");
        return NoContent();
    }

    // Translation management endpoints

    [HttpGet("{id:guid}/translations")]
    public async Task<ActionResult<QuizWithTranslationsDto>> GetQuizWithTranslations(Guid id)
    {
        var quiz = await _quizService.GetQuizWithTranslationsAsync(id);
        if (quiz == null) return NotFound();
        return Ok(quiz);
    }

    [HttpPut("questions/{questionId:guid}/translations")]
    public async Task<ActionResult<QuestionWithTranslationsDto>> UpdateQuestionTranslations(
        Guid questionId, 
        UpdateQuestionTranslationsRequest request)
    {
        var question = await _quizService.UpdateQuestionTranslationsAsync(questionId, request);
        if (question == null) return NotFound();
        return Ok(question);
    }

    [HttpPost("{quizId:guid}/questions/translations")]
    public async Task<ActionResult<QuestionWithTranslationsDto>> AddQuestionWithTranslations(
        Guid quizId, 
        UpdateQuestionTranslationsRequest request)
    {
        var question = await _quizService.AddQuestionWithTranslationsAsync(quizId, request);
        if (question == null) return NotFound();
        return CreatedAtAction(nameof(GetQuizWithTranslations), new { id = quizId }, question);
    }
}
