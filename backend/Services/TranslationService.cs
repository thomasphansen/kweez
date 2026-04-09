using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;

namespace Kweez.Api.Services;

public interface ITranslationService
{
    /// <summary>
    /// Translates an array of texts from source language to target language.
    /// </summary>
    Task<string[]> TranslateAsync(string[] texts, string sourceLang, string targetLang);
    
    /// <summary>
    /// Returns true if the translation service is configured (API key is set).
    /// </summary>
    bool IsConfigured { get; }
}

public class TranslationService : ITranslationService
{
    private readonly HttpClient _httpClient;
    private readonly string? _apiKey;
    private readonly ILogger<TranslationService> _logger;
    
    // DeepL API endpoint (free tier uses different URL than pro)
    private const string DeepLFreeApiUrl = "https://api-free.deepl.com/v2/translate";
    private const string DeepLProApiUrl = "https://api.deepl.com/v2/translate";

    public TranslationService(IConfiguration configuration, ILogger<TranslationService> logger)
    {
        _apiKey = configuration["DeepL:ApiKey"];
        _logger = logger;
        _httpClient = new HttpClient();
    }

    public bool IsConfigured => !string.IsNullOrWhiteSpace(_apiKey);

    public async Task<string[]> TranslateAsync(string[] texts, string sourceLang, string targetLang)
    {
        if (!IsConfigured)
        {
            throw new InvalidOperationException("Translation service is not configured. Please set the DeepL API key.");
        }

        if (texts.Length == 0)
        {
            return [];
        }

        // Filter out empty texts but keep track of their positions
        var indexedTexts = texts
            .Select((text, index) => (text, index))
            .ToList();
        
        var nonEmptyTexts = indexedTexts
            .Where(t => !string.IsNullOrWhiteSpace(t.text))
            .ToList();

        if (nonEmptyTexts.Count == 0)
        {
            return texts; // Return original array if all empty
        }

        try
        {
            // Map language codes to DeepL format
            var sourceDeepL = MapToDeepLLanguage(sourceLang, isSource: true);
            var targetDeepL = MapToDeepLLanguage(targetLang, isSource: false);

            // Build form data for DeepL API
            var formData = new List<KeyValuePair<string, string>>
            {
                new("source_lang", sourceDeepL),
                new("target_lang", targetDeepL),
            };

            // Add each text as a separate "text" parameter (DeepL supports multiple)
            foreach (var (text, _) in nonEmptyTexts)
            {
                formData.Add(new KeyValuePair<string, string>("text", text));
            }

            var content = new FormUrlEncodedContent(formData);

            // Determine API URL based on API key format (free keys end with ":fx")
            var apiUrl = _apiKey!.EndsWith(":fx") ? DeepLFreeApiUrl : DeepLProApiUrl;

            // Create request with header-based authentication (required since Nov 2025)
            var request = new HttpRequestMessage(HttpMethod.Post, apiUrl)
            {
                Content = content
            };
            request.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("DeepL-Auth-Key", _apiKey);

            var response = await _httpClient.SendAsync(request);

            if (!response.IsSuccessStatusCode)
            {
                var errorBody = await response.Content.ReadAsStringAsync();
                _logger.LogError("DeepL API error: {StatusCode} - {Body}", response.StatusCode, errorBody);
                throw new HttpRequestException($"DeepL API returned {response.StatusCode}: {errorBody}");
            }

            var responseBody = await response.Content.ReadAsStringAsync();
            var result = JsonSerializer.Deserialize<DeepLResponse>(responseBody, new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            });

            if (result?.Translations == null || result.Translations.Count != nonEmptyTexts.Count)
            {
                throw new InvalidOperationException("Unexpected response format from DeepL API");
            }

            // Reconstruct the result array with translations in correct positions
            var translatedTexts = new string[texts.Length];
            for (int i = 0; i < texts.Length; i++)
            {
                translatedTexts[i] = texts[i]; // Default to original (for empty strings)
            }

            for (int i = 0; i < nonEmptyTexts.Count; i++)
            {
                var originalIndex = nonEmptyTexts[i].index;
                translatedTexts[originalIndex] = result.Translations[i].Text;
            }

            return translatedTexts;
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(ex, "Failed to call DeepL API");
            throw;
        }
        catch (JsonException ex)
        {
            _logger.LogError(ex, "Failed to parse DeepL API response");
            throw new InvalidOperationException("Failed to parse translation response", ex);
        }
    }

    /// <summary>
    /// Maps our language codes to DeepL's expected format.
    /// DeepL uses uppercase codes and some specific variants.
    /// </summary>
    private static string MapToDeepLLanguage(string langCode, bool isSource)
    {
        // DeepL language codes: https://developers.deepl.com/docs/resources/supported-languages
        return langCode.ToLowerInvariant() switch
        {
            "en" => "EN",
            "de" => "DE",
            "fr" => "FR",
            "es" => "ES",
            "pt" => isSource ? "PT" : "PT-PT", // Target requires variant (PT-PT or PT-BR)
            "da" => "DA",
            "nl" => "NL",
            "it" => "IT",
            "pl" => "PL",
            "ru" => "RU",
            "ja" => "JA",
            "zh" => "ZH",
            "ko" => "KO",
            "sv" => "SV",
            "nb" => "NB", // Norwegian Bokmål
            "fi" => "FI",
            "el" => "EL", // Greek
            "cs" => "CS", // Czech
            "ro" => "RO", // Romanian
            "hu" => "HU", // Hungarian
            "sk" => "SK", // Slovak
            "sl" => "SL", // Slovenian
            "bg" => "BG", // Bulgarian
            "et" => "ET", // Estonian
            "lv" => "LV", // Latvian
            "lt" => "LT", // Lithuanian
            "uk" => "UK", // Ukrainian
            "id" => "ID", // Indonesian
            "tr" => "TR", // Turkish
            _ => langCode.ToUpperInvariant()
        };
    }

    private class DeepLResponse
    {
        public List<DeepLTranslation> Translations { get; set; } = [];
    }

    private class DeepLTranslation
    {
        public string Text { get; set; } = "";
        public string DetectedSourceLanguage { get; set; } = "";
    }
}
