namespace Kweez.Api.Models;

public enum SessionStatus
{
    Waiting,    // Players can join, quiz not started
    Active,     // Quiz in progress
    Finished    // Quiz completed
}

public class QuizSession
{
    public Guid Id { get; set; }
    public Guid QuizId { get; set; }
    public string JoinCode { get; set; } = string.Empty;
    public SessionStatus Status { get; set; } = SessionStatus.Waiting;
    public int? CurrentQuestionIndex { get; set; }
    public DateTime? CurrentQuestionReleasedAtUtc { get; set; }
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    public DateTime? StartedAtUtc { get; set; }
    public DateTime? FinishedAtUtc { get; set; }
    
    public Quiz Quiz { get; set; } = null!;
    public ICollection<Participant> Participants { get; set; } = new List<Participant>();
}
