using FichajeDeEmpresa.Shared.Contracts.Auth;
using FichajeDeEmpresa.Shared.Contracts.Users;

namespace FichajeDeEmpresa.Api.Services;

public interface IAuthService
{
    Task<LoginResponseDto> LoginAsync(LoginRequestDto request);

    Task<UserProfileDto?> GetUserByIdAsync(int userId);
}