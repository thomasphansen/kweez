using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Kweez.Api.Services;

namespace Kweez.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class TranslationController : ControllerBase
{
    private readonly ITranslationService _translationService;
    private readonly ILogger<TranslationController> _logger;

    public TranslationController(ITranslationService translationService, ILogger<TranslationController> logger)
    {
        _translationService = translationService;
        _logger = logger;
    }

    /// <summary>
    /// Check if the translation service is configured.
    /// </summary>
    [HttpGet("status")]
    [Authorize(Policy = "Admin")]
    public ActionResult<TranslationStatusResponse> GetStatus()
    {
        return Ok(new TranslationStatusResponse
        {
            Configured = _translationService.IsConfigured
        });
    }

    /// <summary>
    /// Translate an array of texts from source language to target language.
    /// </summary>
    [HttpPost("translate")]
    [Authorize(Policy = "Admin")]
    public async Task<ActionResult<TranslateResponse>> Translate([FromBody] TranslateRequest request)
    {
        if (!_translationService.IsConfigured)
        {
            return StatusCode(503, new { error = "Translation service is not configured. Please set the DeepL API key." });
        }

        if (request.Texts == null || request.Texts.Length == 0)
        {
            return BadRequest(new { error = "No texts provided for translation." });
        }

        if (string.IsNullOrWhiteSpace(request.SourceLang) || string.IsNullOrWhiteSpace(request.TargetLang))
        {
            return BadRequest(new { error = "Source and target languages are required." });
        }

        try
        {
            _logger.LogInformation(
                "Translating {Count} texts from {Source} to {Target}",
                request.Texts.Length, request.SourceLang, request.TargetLang);

            var translations = await _translationService.TranslateAsync(
                request.Texts,
                request.SourceLang,
                request.TargetLang);

            return Ok(new TranslateResponse
            {
                Translations = translations
            });
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(ex, "Translation API request failed");
            return StatusCode(502, new { error = "Translation service request failed. Please try again later." });
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogError(ex, "Translation service error");
            return StatusCode(500, new { error = ex.Message });
        }
    }

    /// <summary>
    /// Translate multiple questions in bulk. Each question contains a question text and answer texts.
    /// </summary>
    [HttpPost("translate-bulk")]
    [Authorize(Policy = "Admin")]
    public async Task<ActionResult<TranslateBulkResponse>> TranslateBulk([FromBody] TranslateBulkRequest request)
    {
        if (!_translationService.IsConfigured)
        {
            return StatusCode(503, new { error = "Translation service is not configured. Please set the DeepL API key." });
        }

        if (request.Questions == null || request.Questions.Count == 0)
        {
            return BadRequest(new { error = "No questions provided for translation." });
        }

        if (string.IsNullOrWhiteSpace(request.SourceLang) || string.IsNullOrWhiteSpace(request.TargetLang))
        {
            return BadRequest(new { error = "Source and target languages are required." });
        }

        var results = new List<QuestionTranslationResult>();
        var errors = new List<string>();

        foreach (var (question, index) in request.Questions.Select((q, i) => (q, i)))
        {
            try
            {
                // Combine question text and answers into one array for efficient API call
                var textsToTranslate = new[] { question.QuestionText }
                    .Concat(question.AnswerTexts ?? [])
                    .ToArray();

                var translations = await _translationService.TranslateAsync(
                    textsToTranslate,
                    request.SourceLang,
                    request.TargetLang);

                results.Add(new QuestionTranslationResult
                {
                    QuestionId = question.QuestionId,
                    QuestionText = translations[0],
                    AnswerTexts = translations.Skip(1).ToArray(),
                    Success = true
                });

                // Add small delay between questions to avoid rate limiting
                if (index < request.Questions.Count - 1)
                {
                    await Task.Delay(100);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to translate question {QuestionId}", question.QuestionId);
                errors.Add($"Question '{question.QuestionId}': {ex.Message}");
                results.Add(new QuestionTranslationResult
                {
                    QuestionId = question.QuestionId,
                    QuestionText = question.QuestionText,
                    AnswerTexts = question.AnswerTexts ?? [],
                    Success = false,
                    Error = ex.Message
                });
            }
        }

        return Ok(new TranslateBulkResponse
        {
            Results = results,
            TotalCount = request.Questions.Count,
            SuccessCount = results.Count(r => r.Success),
            Errors = errors
        });
    }
}

// Request/Response DTOs

public class TranslationStatusResponse
{
    public bool Configured { get; set; }
}

public class TranslateRequest
{
    public string[] Texts { get; set; } = [];
    public string SourceLang { get; set; } = "";
    public string TargetLang { get; set; } = "";
}

public class TranslateResponse
{
    public string[] Translations { get; set; } = [];
}

public class TranslateBulkRequest
{
    public string SourceLang { get; set; } = "";
    public string TargetLang { get; set; } = "";
    public List<QuestionToTranslate> Questions { get; set; } = [];
}

public class QuestionToTranslate
{
    public string QuestionId { get; set; } = "";
    public string QuestionText { get; set; } = "";
    public string[] AnswerTexts { get; set; } = [];
}

public class TranslateBulkResponse
{
    public List<QuestionTranslationResult> Results { get; set; } = [];
    public int TotalCount { get; set; }
    public int SuccessCount { get; set; }
    public List<string> Errors { get; set; } = [];
}

public class QuestionTranslationResult
{
    public string QuestionId { get; set; } = "";
    public string QuestionText { get; set; } = "";
    public string[] AnswerTexts { get; set; } = [];
    public bool Success { get; set; }
    public string? Error { get; set; }
}
