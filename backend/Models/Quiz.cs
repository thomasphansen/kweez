namespace Kweez.Api.Models;

public class Quiz
{
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAtUtc { get; set; }
    
    public ICollection<Question> Questions { get; set; } = new List<Question>();
    public ICollection<QuizSession> Sessions { get; set; } = new List<QuizSession>();
}
