namespace Kweez.Api.Models;

public class Question
{
    public Guid Id { get; set; }
    public Guid QuizId { get; set; }
    public string Text { get; set; } = string.Empty;
    public int OrderIndex { get; set; }
    public int TimeLimitSeconds { get; set; } = 15;
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    
    public Quiz Quiz { get; set; } = null!;
    public ICollection<AnswerOption> AnswerOptions { get; set; } = new List<AnswerOption>();
}
