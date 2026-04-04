namespace Kweez.Api.Models;

public class Participant
{
    public Guid Id { get; set; }
    public Guid SessionId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? ConnectionId { get; set; }
    public int TotalScore { get; set; }
    public DateTime JoinedAtUtc { get; set; } = DateTime.UtcNow;
    public bool IsConnected { get; set; } = true;
    
    public QuizSession Session { get; set; } = null!;
    public ICollection<ParticipantAnswer> Answers { get; set; } = new List<ParticipantAnswer>();
}
