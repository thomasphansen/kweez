namespace Kweez.Api.Models;

/// <summary>
/// Represents a language that a quiz supports.
/// Each quiz must have at least one language, with one marked as default.
/// </summary>
public class QuizLanguage
{
    public Guid Id { get; set; }
    public Guid QuizId { get; set; }
    
    /// <summary>
    /// ISO 639-1 language code (e.g., "en", "pt", "es")
    /// </summary>
    public string LanguageCode { get; set; } = string.Empty;
    
    /// <summary>
    /// Whether this is the default language for the quiz.
    /// Each quiz must have exactly one default language.
    /// </summary>
    public bool IsDefault { get; set; }
    
    /// <summary>
    /// When this language was added to the quiz.
    /// </summary>
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    
    // Navigation property
    public Quiz Quiz { get; set; } = null!;
}
