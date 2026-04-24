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
    public async Task<ActionResult<UserListResponseDto>> GetUsersAsync()
    {
        var result = await _authService.GetAllUsersAsync();

        if (!result.IsSuccess)
        {
            return BadRequest(result);
        }

        return Ok(result);
    }

    [HttpPost]
    public async Task<ActionResult<UserOperationResponseDto>> CreateUserAsync([FromBody] CreateUserRequestDto request)
    {
        var result = await _authService.CreateUserAsync(request);

        if (!result.IsSuccess)
        {
            return BadRequest(result);
        }

        return Ok(result);
    }

    [HttpPut("{userId:int}")]
    public async Task<ActionResult<UserOperationResponseDto>> UpdateUserAsync(int userId, [FromBody] UpdateUserRequestDto request)
    {
        var result = await _authService.UpdateUserAsync(userId, request);

        if (!result.IsSuccess)
        {
            return BadRequest(result);
        }

        return Ok(result);
    }
}