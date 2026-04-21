using FichajeDeEmpresa.Api.Services;
using FichajeDeEmpresa.Shared.Contracts.Fichajes;
using Microsoft.AspNetCore.Mvc;

namespace FichajeDeEmpresa.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class FichajesController : ControllerBase
{
    private readonly IFichajeService _fichajeService;

    public FichajesController(IFichajeService fichajeService)
    {
        _fichajeService = fichajeService;
    }

    [HttpPost("entrada")]
    public async Task<ActionResult<FichajeOperationResponseDto>> RegisterEntry([FromBody] RegisterFichajeRequestDto request)
    {
        var result = await _fichajeService.RegisterEntryAsync(request);
        return Ok(result);
    }

    [HttpPost("salida")]
    public async Task<ActionResult<FichajeOperationResponseDto>> RegisterExit([FromBody] RegisterFichajeRequestDto request)
    {
        var result = await _fichajeService.RegisterExitAsync(request);
        return Ok(result);
    }

    [HttpGet("resumen-hoy/{userId:int}")]
    public async Task<ActionResult<FichajeOperationResponseDto>> GetTodaySummary(int userId)
    {
        var result = await _fichajeService.GetTodaySummaryAsync(userId);
        return Ok(result);
    }
}