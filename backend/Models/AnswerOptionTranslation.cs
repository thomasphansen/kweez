namespace Kweez.Api.Models;

public class AnswerOptionTranslation
{
    public Guid Id { get; set; }
    public Guid AnswerOptionId { get; set; }
    public string LanguageCode { get; set; } = string.Empty;
    public string Text { get; set; } = string.Empty;
    
    public AnswerOption AnswerOption { get; set; } = null!;
}
