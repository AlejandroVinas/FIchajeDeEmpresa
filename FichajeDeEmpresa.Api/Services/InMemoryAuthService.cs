using FichajeDeEmpresa.Shared.Contracts.Auth;

namespace FichajeDeEmpresa.Api.Services;

public class InMemoryAuthService : IAuthService
{
    private readonly List<TestUser> _users =
    [
        new TestUser(1, "admin", "admin123", "Administrador General", "Admin", 8m),
        new TestUser(2, "juan", "1234", "Juan Pérez", "Empleado", 8m),
        new TestUser(3, "maria", "1234", "María López", "Empleado", 4m)
    ];

    public Task<LoginResponseDto> LoginAsync(LoginRequestDto request)
    {
        if (string.IsNullOrWhiteSpace(request.UserName) || string.IsNullOrWhiteSpace(request.Password))
        {
            return Task.FromResult(new LoginResponseDto
            {
                IsSuccess = false,
                Message = "Debes escribir usuario y contraseña."
            });
        }

        var user = _users.FirstOrDefault(u =>
            string.Equals(u.UserName, request.UserName.Trim(), StringComparison.OrdinalIgnoreCase));

        if (user is null || user.Password != request.Password)
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
            UserId = user.Id,
            FullName = user.FullName,
            Role = user.Role,
            ExpectedDailyHours = user.ExpectedDailyHours
        });
    }

    private sealed record TestUser(
        int Id,
        string UserName,
        string Password,
        string FullName,
        string Role,
        decimal ExpectedDailyHours);
}