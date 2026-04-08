using System.Security.Claims;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authentication.Google;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Kweez.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly IConfiguration _configuration;
    private readonly ILogger<AuthController> _logger;

    public AuthController(IConfiguration configuration, ILogger<AuthController> logger)
    {
        _configuration = configuration;
        _logger = logger;
    }

    [HttpGet("login")]
    public IActionResult Login([FromQuery] string? returnUrl = null)
    {
        var redirectUrl = Url.Action(nameof(SigninComplete), "Auth", new { returnUrl });
        var properties = new AuthenticationProperties { RedirectUri = redirectUrl };
        return Challenge(properties, GoogleDefaults.AuthenticationScheme);
    }

    [HttpGet("signin-complete")]
    public async Task<IActionResult> SigninComplete([FromQuery] string? returnUrl = null)
    {
        var result = await HttpContext.AuthenticateAsync(CookieAuthenticationDefaults.AuthenticationScheme);
        
        if (!result.Succeeded)
        {
            _logger.LogWarning("Google authentication failed");
            return Redirect($"{GetFrontendUrl()}/admin/login?error=auth_failed");
        }

        var email = result.Principal?.FindFirst(ClaimTypes.Email)?.Value;
        var adminEmail = _configuration["Auth:AdminEmail"] ?? "thomasphansen@gmail.com";

        if (!string.Equals(email, adminEmail, StringComparison.OrdinalIgnoreCase))
        {
            _logger.LogWarning("Unauthorized login attempt from email: {Email}", email);
            await HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
            return Redirect($"{GetFrontendUrl()}/admin/login?error=access_denied");
        }

        _logger.LogInformation("Admin logged in: {Email}", email);
        
        var redirectTo = returnUrl ?? $"{GetFrontendUrl()}/admin";
        return Redirect(redirectTo);
    }

    [HttpGet("me")]
    [Authorize(Policy = "Admin")]
    public IActionResult GetCurrentUser()
    {
        var email = User.FindFirst(ClaimTypes.Email)?.Value;
        var name = User.FindFirst(ClaimTypes.Name)?.Value;
        var picture = User.FindFirst("picture")?.Value ?? User.FindFirst("urn:google:picture")?.Value;

        return Ok(new
        {
            email,
            name,
            picture
        });
    }

    [HttpPost("logout")]
    public async Task<IActionResult> Logout()
    {
        await HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
        return Ok(new { message = "Logged out successfully" });
    }

    [HttpGet("status")]
    public IActionResult GetStatus()
    {
        var isAuthenticated = User.Identity?.IsAuthenticated ?? false;
        
        if (!isAuthenticated)
        {
            return Ok(new { isAuthenticated = false, isAdmin = false });
        }

        var email = User.FindFirst(ClaimTypes.Email)?.Value;
        var adminEmail = _configuration["Auth:AdminEmail"] ?? "thomasphansen@gmail.com";
        var isAdmin = string.Equals(email, adminEmail, StringComparison.OrdinalIgnoreCase);

        return Ok(new
        {
            isAuthenticated,
            isAdmin,
            email = isAdmin ? email : null
        });
    }

    private string GetFrontendUrl()
    {
        return _configuration["FrontendUrl"] ?? "http://localhost:3000";
    }
}
