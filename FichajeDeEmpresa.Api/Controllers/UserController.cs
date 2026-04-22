using FichajeDeEmpresa.Api.Services;
using FichajeDeEmpresa.Shared.Contracts.Users;
using Microsoft.AspNetCore.Mvc;

namespace FichajeDeEmpresa.Api.Controllers;

[ApiController]
[Route("api/users")]
public class UsersController : ControllerBase
{
    private readonly IAuthService _authService;

    public UsersController(IAuthService authService)
    {
        _authService = authService;
    }

    [HttpGet]
    public async Task<ActionResult<UserListResponseDto>> GetAllAsync()
    {
        var result = await _authService.GetAllUsersAsync();
        return Ok(result);
    }

    [HttpPost]
    public async Task<ActionResult<UserOperationResponseDto>> CreateAsync([FromBody] CreateUserRequestDto request)
    {
        var result = await _authService.CreateUserAsync(request);

        if (!result.IsSuccess)
        {
            return BadRequest(result);
        }

        return Ok(result);
    }
}