using FichajeDeEmpresa.Shared.Contracts.Auth;
using FichajeDeEmpresa.Shared.Contracts.Users;

namespace FichajeDeEmpresa.Api.Services;

public class InMemoryAuthService : IAuthService
{
    private readonly object _lock = new();

    private readonly List<UserRecord> _users =
    [
        new UserRecord
        {
            UserId = 1,
            UserName = "admin",
            Password = "admin",
            FullName = "Administrador",
            Role = "Admin",
            ExpectedDailyHours = 8m
        },
        new UserRecord
        {
            UserId = 2,
            UserName = "user",
            Password = "user",
            FullName = "Usuario",
            Role = "Empleado",
            ExpectedDailyHours = 8m
        }
    ];

    private int _nextUserId = 3;

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

        UserRecord? user;

        lock (_lock)
        {
            user = _users.FirstOrDefault(u =>
                u.UserName.Equals(request.UserName.Trim(), StringComparison.OrdinalIgnoreCase) &&
                u.Password == request.Password);
        }

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
        UserRecord? user;

        lock (_lock)
        {
            user = _users.FirstOrDefault(u => u.UserId == userId);
        }

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

    public Task<UserListResponseDto> GetAllUsersAsync()
    {
        List<UserListItemDto> users;

        lock (_lock)
        {
            users = _users
                .OrderBy(u => u.UserId)
                .Select(MapToListItem)
                .ToList();
        }

        return Task.FromResult(new UserListResponseDto
        {
            IsSuccess = true,
            Message = "Usuarios obtenidos correctamente.",
            Users = users
        });
    }

    public Task<UserOperationResponseDto> CreateUserAsync(CreateUserRequestDto request)
    {
        if (string.IsNullOrWhiteSpace(request.FullName))
        {
            return Task.FromResult(new UserOperationResponseDto
            {
                IsSuccess = false,
                Message = "Debes indicar el nombre completo."
            });
        }

        if (string.IsNullOrWhiteSpace(request.UserName))
        {
            return Task.FromResult(new UserOperationResponseDto
            {
                IsSuccess = false,
                Message = "Debes indicar el nombre de usuario."
            });
        }

        if (string.IsNullOrWhiteSpace(request.Password))
        {
            return Task.FromResult(new UserOperationResponseDto
            {
                IsSuccess = false,
                Message = "Debes indicar la contraseña."
            });
        }

        if (request.ExpectedDailyHours <= 0 || request.ExpectedDailyHours > 24)
        {
            return Task.FromResult(new UserOperationResponseDto
            {
                IsSuccess = false,
                Message = "Las horas diarias deben estar entre 0 y 24."
            });
        }

        var normalizedRole = NormalizeRole(request.Role);

        if (normalizedRole is null)
        {
            return Task.FromResult(new UserOperationResponseDto
            {
                IsSuccess = false,
                Message = "El rol indicado no es válido."
            });
        }

        var normalizedUserName = request.UserName.Trim();
        var normalizedFullName = request.FullName.Trim();

        lock (_lock)
        {
            var userExists = _users.Any(u =>
                u.UserName.Equals(normalizedUserName, StringComparison.OrdinalIgnoreCase));

            if (userExists)
            {
                return Task.FromResult(new UserOperationResponseDto
                {
                    IsSuccess = false,
                    Message = "Ya existe un usuario con ese nombre de usuario."
                });
            }

            var newUser = new UserRecord
            {
                UserId = _nextUserId++,
                UserName = normalizedUserName,
                Password = request.Password,
                FullName = normalizedFullName,
                Role = normalizedRole,
                ExpectedDailyHours = request.ExpectedDailyHours
            };

            _users.Add(newUser);

            return Task.FromResult(new UserOperationResponseDto
            {
                IsSuccess = true,
                Message = "Usuario creado correctamente.",
                User = MapToListItem(newUser)
            });
        }
    }

    private static string? NormalizeRole(string? role)
    {
        if (string.IsNullOrWhiteSpace(role))
        {
            return null;
        }

        var normalized = role.Trim();

        if (normalized.Equals("Admin", StringComparison.OrdinalIgnoreCase))
        {
            return "Admin";
        }

        if (normalized.Equals("Empleado", StringComparison.OrdinalIgnoreCase))
        {
            return "Empleado";
        }

        return null;
    }

    private static UserListItemDto MapToListItem(UserRecord user)
    {
        return new UserListItemDto
        {
            UserId = user.UserId,
            UserName = user.UserName,
            FullName = user.FullName,
            Role = user.Role,
            ExpectedDailyHours = user.ExpectedDailyHours
        };
    }

    private sealed class UserRecord
    {
        public int UserId { get; set; }

        public string UserName { get; set; } = string.Empty;

        public string Password { get; set; } = string.Empty;

        public string FullName { get; set; } = string.Empty;

        public string Role { get; set; } = string.Empty;

        public decimal ExpectedDailyHours { get; set; }
    }
}