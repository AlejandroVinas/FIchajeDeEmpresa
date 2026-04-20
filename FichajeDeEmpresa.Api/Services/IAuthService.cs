using FichajeDeEmpresa.Shared.Contracts.Auth;

namespace FichajeDeEmpresa.Api.Services;

public interface IAuthService
{
    Task<LoginResponseDto> LoginAsync(LoginRequestDto request);
}