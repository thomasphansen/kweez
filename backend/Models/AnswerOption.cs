namespace Kweez.Api.Models;

public class AnswerOption
{
    public Guid Id { get; set; }
    public Guid QuestionId { get; set; }
    public bool IsCorrect { get; set; }
    public int OrderIndex { get; set; }
    
    public Question Question { get; set; } = null!;
    public ICollection<AnswerOptionTranslation> Translations { get; set; } = new List<AnswerOptionTranslation>();
}
