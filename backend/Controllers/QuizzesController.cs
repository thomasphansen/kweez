using Kweez.Api.DTOs;
using Kweez.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace Kweez.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class QuizzesController : ControllerBase
{
    private readonly IQuizService _quizService;

    public QuizzesController(IQuizService quizService)
    {
        _quizService = quizService;
    }

    [HttpGet]
    public async Task<ActionResult<List<QuizDto>>> GetAll()
    {
        var quizzes = await _quizService.GetAllQuizzesAsync();
        return Ok(quizzes);
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<QuizDetailDto>> GetById(Guid id)
    {
        var quiz = await _quizService.GetQuizByIdAsync(id);
        if (quiz == null) return NotFound();
        return Ok(quiz);
    }

    [HttpPost]
    public async Task<ActionResult<QuizDto>> Create(CreateQuizRequest request)
    {
        var quiz = await _quizService.CreateQuizAsync(request);
        return CreatedAtAction(nameof(GetById), new { id = quiz.Id }, quiz);
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<QuizDto>> Update(Guid id, UpdateQuizRequest request)
    {
        var quiz = await _quizService.UpdateQuizAsync(id, request);
        if (quiz == null) return NotFound();
        return Ok(quiz);
    }

    [HttpDelete("{id:guid}")]
    public async Task<ActionResult> Delete(Guid id)
    {
        var deleted = await _quizService.DeleteQuizAsync(id);
        if (!deleted) return NotFound();
        return NoContent();
    }

    [HttpPost("{quizId:guid}/questions")]
    public async Task<ActionResult<QuestionDto>> AddQuestion(Guid quizId, CreateQuestionRequest request)
    {
        try
        {
            var question = await _quizService.AddQuestionAsync(quizId, request);
            return CreatedAtAction(nameof(GetById), new { id = quizId }, question);
        }
        catch
        {
            return NotFound();
        }
    }

    [HttpPut("questions/{questionId:guid}")]
    public async Task<ActionResult<QuestionDto>> UpdateQuestion(Guid questionId, UpdateQuestionRequest request)
    {
        var question = await _quizService.UpdateQuestionAsync(questionId, request);
        if (question == null) return NotFound();
        return Ok(question);
    }

    [HttpDelete("questions/{questionId:guid}")]
    public async Task<ActionResult> DeleteQuestion(Guid questionId)
    {
        var deleted = await _quizService.DeleteQuestionAsync(questionId);
        if (!deleted) return NotFound();
        return NoContent();
    }

    [HttpPut("{quizId:guid}/questions/reorder")]
    public async Task<ActionResult> ReorderQuestions(Guid quizId, [FromBody] List<Guid> questionIds)
    {
        var success = await _quizService.ReorderQuestionsAsync(quizId, questionIds);
        if (!success) return BadRequest("Could not reorder questions");
        return NoContent();
    }
}
