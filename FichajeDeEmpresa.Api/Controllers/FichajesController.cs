using FichajeDeEmpresa.Api.Services;
using FichajeDeEmpresa.Shared.Contracts.Fichajes;
using Microsoft.AspNetCore.Mvc;

namespace FichajeDeEmpresa.Api.Controllers;

[ApiController]
[Route("api/fichajes")]
public class FichajesController : ControllerBase
{
    private readonly IFichajeService _fichajeService;

    public FichajesController(IFichajeService fichajeService)
    {
        _fichajeService = fichajeService;
    }

    [HttpPost("entrada")]
    public async Task<ActionResult<FichajeOperationResponseDto>> RegisterEntryAsync([FromBody] RegisterFichajeRequestDto request)
    {
        var result = await _fichajeService.RegisterEntryAsync(request);

        if (!result.IsSuccess)
        {
            return BadRequest(result);
        }

        return Ok(result);
    }

    [HttpPost("pausa")]
    public async Task<ActionResult<FichajeOperationResponseDto>> RegisterPauseAsync([FromBody] RegisterFichajeRequestDto request)
    {
        var result = await _fichajeService.RegisterPauseAsync(request);

        if (!result.IsSuccess)
        {
            return BadRequest(result);
        }

        return Ok(result);
    }

    [HttpPost("reanudar")]
    public async Task<ActionResult<FichajeOperationResponseDto>> RegisterResumeAsync([FromBody] RegisterFichajeRequestDto request)
    {
        var result = await _fichajeService.RegisterResumeAsync(request);

        if (!result.IsSuccess)
        {
            return BadRequest(result);
        }

        return Ok(result);
    }

    [HttpPost("salida")]
    public async Task<ActionResult<FichajeOperationResponseDto>> RegisterExitAsync([FromBody] RegisterFichajeRequestDto request)
    {
        var result = await _fichajeService.RegisterExitAsync(request);

        if (!result.IsSuccess)
        {
            return BadRequest(result);
        }

        return Ok(result);
    }

    [HttpGet("resumen-hoy/{userId:int}")]
    public async Task<ActionResult<FichajeOperationResponseDto>> GetTodaySummaryAsync(int userId)
    {
        var result = await _fichajeService.GetTodaySummaryAsync(userId);

        if (!result.IsSuccess)
        {
            return BadRequest(result);
        }

        return Ok(result);
    }

    [HttpGet("historial")]
    public async Task<ActionResult<AdminFichajeHistoryResponseDto>> GetHistoryAsync(
        [FromQuery] int? userId,
        [FromQuery] DateTime? fromDate,
        [FromQuery] DateTime? toDate)
    {
        var result = await _fichajeService.GetHistoryAsync(userId, fromDate, toDate);

        if (!result.IsSuccess)
        {
            return BadRequest(result);
        }

        return Ok(result);
    }
}