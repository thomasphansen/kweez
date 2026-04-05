namespace Kweez.Api.Models;

public class Quiz
{
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAtUtc { get; set; }
    
    /// <summary>
    /// Optional fixed join code for this quiz. When set, all sessions for this quiz
    /// will use this code, allowing QR codes to be printed in advance.
    /// </summary>
    public string? FixedJoinCode { get; set; }
    
    public ICollection<Question> Questions { get; set; } = new List<Question>();
    public ICollection<QuizSession> Sessions { get; set; } = new List<QuizSession>();
    public ICollection<QuizLanguage> Languages { get; set; } = new List<QuizLanguage>();
}
