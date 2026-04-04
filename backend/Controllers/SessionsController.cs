using Kweez.Api.DTOs;
using Kweez.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace Kweez.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class SessionsController : ControllerBase
{
    private readonly ISessionService _sessionService;

    public SessionsController(ISessionService sessionService)
    {
        _sessionService = sessionService;
    }

    [HttpGet]
    public async Task<ActionResult<List<SessionDto>>> GetActiveSessions()
    {
        var sessions = await _sessionService.GetActiveSessionsAsync();
        return Ok(sessions);
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<SessionDto>> GetById(Guid id)
    {
        var session = await _sessionService.GetSessionAsync(id);
        if (session == null) return NotFound();
        return Ok(session);
    }

    [HttpGet("code/{joinCode}")]
    public async Task<ActionResult<SessionDto>> GetByCode(string joinCode)
    {
        var session = await _sessionService.GetSessionByCodeAsync(joinCode);
        if (session == null) return NotFound();
        return Ok(session);
    }

    [HttpPost]
    public async Task<ActionResult<SessionDto>> Create(CreateSessionRequest request)
    {
        try
        {
            var session = await _sessionService.CreateSessionAsync(request.QuizId);
            return CreatedAtAction(nameof(GetById), new { id = session.Id }, session);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
    }

    [HttpPost("join")]
    public async Task<ActionResult<JoinSessionResponse>> Join([FromBody] JoinRequest request)
    {
        var result = await _sessionService.JoinSessionAsync(request.JoinCode, request.Name);
        if (result == null) 
            return BadRequest("Could not join session. Session may not exist or has already ended.");
        return Ok(result);
    }

    [HttpGet("{id:guid}/participants")]
    public async Task<ActionResult<List<ParticipantDto>>> GetParticipants(Guid id)
    {
        var participants = await _sessionService.GetParticipantsAsync(id);
        return Ok(participants);
    }

    [HttpGet("{id:guid}/leaderboard")]
    public async Task<ActionResult<List<LeaderboardEntryDto>>> GetLeaderboard(Guid id)
    {
        var leaderboard = await _sessionService.GetLeaderboardAsync(id);
        return Ok(leaderboard);
    }

    [HttpPost("{id:guid}/end")]
    public async Task<ActionResult> EndSession(Guid id)
    {
        var success = await _sessionService.EndSessionAsync(id);
        if (!success) return NotFound();
        return NoContent();
    }
}

public record JoinRequest(string JoinCode, string Name);
