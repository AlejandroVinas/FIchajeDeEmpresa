using FichajeDeEmpresa.Shared.Contracts.Auth;
using FichajeDeEmpresa.Shared.Contracts.Users;

namespace FichajeDeEmpresa.Api.Services;

public interface IAuthService
{
    Task<LoginResponseDto> LoginAsync(LoginRequestDto request);

    Task<UserListResponseDto> GetAllUsersAsync();

    Task<UserOperationResponseDto> CreateUserAsync(CreateUserRequestDto request);

    Task<UserOperationResponseDto> UpdateUserAsync(int userId, UpdateUserRequestDto request);

    Task<UserOperationResponseDto> SetUserActiveAsync(int userId, bool isActive);

    Task<UserOperationResponseDto> DeleteUserAsync(int userId);

    Task<UserSummaryDto?> GetUserByIdAsync(int userId);
}