using FichajeDeEmpresa.Shared.Contracts.Auth;
using FichajeDeEmpresa.Shared.Contracts.Users;

namespace FichajeDeEmpresa.Api.Services;

public class InMemoryAuthService : IAuthService
{
    private readonly object _lock = new();
    private readonly List<UserRecord> _users =
    [
        new UserRecord(1, "Administrador", "admin", "admin", "Admin", 8m),
        new UserRecord(2, "Usuario", "user", "user", "User", 8m)
    ];

    private int _nextUserId = 3;

    public Task<LoginResponseDto> LoginAsync(LoginRequestDto request)
    {
        if (string.IsNullOrWhiteSpace(request.UserName) || string.IsNullOrWhiteSpace(request.Password))
        {
            return Task.FromResult(new LoginResponseDto
            {
                IsSuccess = false,
                Message = "Debes introducir usuario y contraseña."
            });
        }

        lock (_lock)
        {
            var user = _users.FirstOrDefault(u =>
                string.Equals(u.UserName, request.UserName.Trim(), StringComparison.OrdinalIgnoreCase) &&
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
                Message = "Inicio de sesión correcto.",
                UserId = user.UserId,
                UserName = user.UserName,
                FullName = user.FullName,
                Role = user.Role,
                ExpectedDailyHours = user.ExpectedDailyHours
            });
        }
    }

    public Task<UserListResponseDto> GetAllUsersAsync()
    {
        lock (_lock)
        {
            return Task.FromResult(new UserListResponseDto
            {
                IsSuccess = true,
                Message = "Usuarios obtenidos correctamente.",
                Users = _users
                    .OrderBy(u => u.FullName)
                    .Select(MapUser)
                    .ToList()
            });
        }
    }

    public Task<UserOperationResponseDto> CreateUserAsync(CreateUserRequestDto request)
    {
        var validationMessage = ValidateCreateRequest(request);
        if (!string.IsNullOrWhiteSpace(validationMessage))
        {
            return Task.FromResult(new UserOperationResponseDto
            {
                IsSuccess = false,
                Message = validationMessage
            });
        }

        lock (_lock)
        {
            if (_users.Any(u => string.Equals(u.UserName, request.UserName.Trim(), StringComparison.OrdinalIgnoreCase)))
            {
                return Task.FromResult(new UserOperationResponseDto
                {
                    IsSuccess = false,
                    Message = "Ya existe un usuario con ese nombre de usuario."
                });
            }

            var user = new UserRecord(
                _nextUserId++,
                request.FullName.Trim(),
                request.UserName.Trim(),
                request.Password,
                NormalizeRole(request.Role),
                request.ExpectedDailyHours);

            _users.Add(user);

            return Task.FromResult(new UserOperationResponseDto
            {
                IsSuccess = true,
                Message = "Usuario creado correctamente.",
                User = MapUser(user)
            });
        }
    }

    public Task<UserOperationResponseDto> UpdateUserAsync(int userId, UpdateUserRequestDto request)
    {
        var validationMessage = ValidateUpdateRequest(request);
        if (!string.IsNullOrWhiteSpace(validationMessage))
        {
            return Task.FromResult(new UserOperationResponseDto
            {
                IsSuccess = false,
                Message = validationMessage
            });
        }

        lock (_lock)
        {
            var index = _users.FindIndex(u => u.UserId == userId);

            if (index < 0)
            {
                return Task.FromResult(new UserOperationResponseDto
                {
                    IsSuccess = false,
                    Message = "No se ha encontrado el usuario."
                });
            }

            if (_users.Any(u =>
                    u.UserId != userId &&
                    string.Equals(u.UserName, request.UserName.Trim(), StringComparison.OrdinalIgnoreCase)))
            {
                return Task.FromResult(new UserOperationResponseDto
                {
                    IsSuccess = false,
                    Message = "Ya existe otro usuario con ese nombre de usuario."
                });
            }

            var current = _users[index];
            var updatedPassword = string.IsNullOrWhiteSpace(request.Password)
                ? current.Password
                : request.Password;

            var updated = new UserRecord(
                current.UserId,
                request.FullName.Trim(),
                request.UserName.Trim(),
                updatedPassword,
                NormalizeRole(request.Role),
                request.ExpectedDailyHours);

            _users[index] = updated;

            return Task.FromResult(new UserOperationResponseDto
            {
                IsSuccess = true,
                Message = "Usuario actualizado correctamente.",
                User = MapUser(updated)
            });
        }
    }

    public Task<UserSummaryDto?> GetUserByIdAsync(int userId)
    {
        lock (_lock)
        {
            var user = _users.FirstOrDefault(u => u.UserId == userId);
            return Task.FromResult(user is null ? null : MapUser(user));
        }
    }

    private static string? ValidateCreateRequest(CreateUserRequestDto request)
    {
        if (string.IsNullOrWhiteSpace(request.FullName))
        {
            return "Debes indicar el nombre completo.";
        }

        if (string.IsNullOrWhiteSpace(request.UserName))
        {
            return "Debes indicar el nombre de usuario.";
        }

        if (string.IsNullOrWhiteSpace(request.Password))
        {
            return "Debes indicar la contraseña.";
        }

        if (string.IsNullOrWhiteSpace(request.Role))
        {
            return "Debes indicar el rol.";
        }

        if (request.ExpectedDailyHours <= 0)
        {
            return "Las horas diarias deben ser mayores que cero.";
        }

        return null;
    }

    private static string? ValidateUpdateRequest(UpdateUserRequestDto request)
    {
        if (string.IsNullOrWhiteSpace(request.FullName))
        {
            return "Debes indicar el nombre completo.";
        }

        if (string.IsNullOrWhiteSpace(request.UserName))
        {
            return "Debes indicar el nombre de usuario.";
        }

        if (string.IsNullOrWhiteSpace(request.Role))
        {
            return "Debes indicar el rol.";
        }

        if (request.ExpectedDailyHours <= 0)
        {
            return "Las horas diarias deben ser mayores que cero.";
        }

        return null;
    }

    private static string NormalizeRole(string role)
    {
        return string.Equals(role?.Trim(), "Admin", StringComparison.OrdinalIgnoreCase)
            ? "Admin"
            : "User";
    }

    private static UserSummaryDto MapUser(UserRecord user)
    {
        return new UserSummaryDto
        {
            UserId = user.UserId,
            FullName = user.FullName,
            UserName = user.UserName,
            Role = user.Role,
            ExpectedDailyHours = user.ExpectedDailyHours
        };
    }

    private sealed record UserRecord(
        int UserId,
        string FullName,
        string UserName,
        string Password,
        string Role,
        decimal ExpectedDailyHours);
}