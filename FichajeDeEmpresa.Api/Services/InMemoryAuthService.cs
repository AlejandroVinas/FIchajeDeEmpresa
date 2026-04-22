using FichajeDeEmpresa.Shared.Contracts.Auth;
using FichajeDeEmpresa.Shared.Contracts.Users;

namespace FichajeDeEmpresa.Api.Services;

public class InMemoryAuthService : IAuthService
{
    private readonly List<UserRecord> _users =
    [
        new UserRecord(1, "admin", "admin", "Administrador", "Admin", 8m),
        new UserRecord(2, "user", "user", "Usuario", "Empleado", 8m)
    ];

    public Task<LoginResponseDto> LoginAsync(LoginRequestDto request)
    {
        if (string.IsNullOrWhiteSpace(request.UserName) || string.IsNullOrWhiteSpace(request.Password))
        {
            return Task.FromResult(new LoginResponseDto
            {
                IsSuccess = false,
                Message = "Debes indicar usuario y contraseña."
            });
        }

        var user = _users.FirstOrDefault(u =>
            u.UserName.Equals(request.UserName.Trim(), StringComparison.OrdinalIgnoreCase) &&
            u.Password == request.Password);

        if (user is null)
        {
            return Task.FromResult(new LoginResponseDto
            {
                IsSuccess = false,
                Message = "Usuario o contraseña incorrectos."
            });
        }

        return Task.FromResult(new LoginResponseDto
        {
            IsSuccess = true,
            Message = "Login correcto.",
            UserId = user.UserId,
            FullName = user.FullName,
            Role = user.Role,
            ExpectedDailyHours = user.ExpectedDailyHours
        });
    }

    public Task<UserProfileDto?> GetUserByIdAsync(int userId)
    {
        var user = _users.FirstOrDefault(u => u.UserId == userId);

        if (user is null)
        {
            return Task.FromResult<UserProfileDto?>(null);
        }

        return Task.FromResult<UserProfileDto?>(new UserProfileDto
        {
            UserId = user.UserId,
            UserName = user.UserName,
            FullName = user.FullName,
            Role = user.Role,
            ExpectedDailyHours = user.ExpectedDailyHours
        });
    }

    private sealed record UserRecord(
        int UserId,
        string UserName,
        string Password,
        string FullName,
        string Role,
        decimal ExpectedDailyHours);
}