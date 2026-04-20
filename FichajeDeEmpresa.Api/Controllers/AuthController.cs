using FichajeDeEmpresa.Api.Services;
using FichajeDeEmpresa.Shared.Contracts.Auth;
using Microsoft.AspNetCore.Mvc;

namespace FichajeDeEmpresa.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _authService;

    public AuthController(IAuthService authService)
    {
        _authService = authService;
    }

    [HttpPost("login")]
    public async Task<ActionResult<LoginResponseDto>> Login([FromBody] LoginRequestDto request)
    {
        var result = await _authService.LoginAsync(request);

        if (!result.IsSuccess)
        {
            return Unauthorized(result);
        }

        return Ok(result);
    }
}