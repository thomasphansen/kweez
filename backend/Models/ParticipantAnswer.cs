namespace Kweez.Api.Models;

public class ParticipantAnswer
{
    public Guid Id { get; set; }
    public Guid ParticipantId { get; set; }
    public Guid QuestionId { get; set; }
    public Guid AnswerOptionId { get; set; }
    public DateTime SubmittedAtUtc { get; set; } = DateTime.UtcNow;
    public int Score { get; set; }
    public long ResponseTimeMs { get; set; }
    
    public Participant Participant { get; set; } = null!;
    public Question Question { get; set; } = null!;
    public AnswerOption AnswerOption { get; set; } = null!;
}
