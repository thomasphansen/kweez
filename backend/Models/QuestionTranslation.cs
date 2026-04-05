namespace Kweez.Api.Models;

public class QuestionTranslation
{
    public Guid Id { get; set; }
    public Guid QuestionId { get; set; }
    public string LanguageCode { get; set; } = string.Empty;
    public string Text { get; set; } = string.Empty;
    
    public Question Question { get; set; } = null!;
}
