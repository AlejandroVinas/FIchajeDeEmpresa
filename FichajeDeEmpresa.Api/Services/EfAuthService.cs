using FichajeDeEmpresa.Api.Data;
using FichajeDeEmpresa.Api.Data.Entities;
using FichajeDeEmpresa.Shared.Contracts.Auth;
using FichajeDeEmpresa.Shared.Contracts.Users;
using Microsoft.EntityFrameworkCore;

namespace FichajeDeEmpresa.Api.Services;

public class EfAuthService : IAuthService
{
    private readonly IDbContextFactory<AppDbContext> _dbContextFactory;

    public EfAuthService(IDbContextFactory<AppDbContext> dbContextFactory)
    {
        _dbContextFactory = dbContextFactory;
    }

    public async Task<LoginResponseDto> LoginAsync(LoginRequestDto request)
    {
        if (string.IsNullOrWhiteSpace(request.UserName) || string.IsNullOrWhiteSpace(request.Password))
        {
            return new LoginResponseDto
            {
                IsSuccess = false,
                Message = "Debes introducir usuario y contraseña."
            };
        }

        await using var dbContext = await _dbContextFactory.CreateDbContextAsync();

        var normalizedUserName = request.UserName.Trim();

        var user = await dbContext.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(u =>
                u.UserName.ToLower() == normalizedUserName.ToLower() &&
                u.Password == request.Password);

        if (user is null)
        {
            return new LoginResponseDto
            {
                IsSuccess = false,
                Message = "Usuario o contraseña incorrectos."
            };
        }

        if (!user.IsActive)
        {
            return new LoginResponseDto
            {
                IsSuccess = false,
                Message = "Este usuario está desactivado y no puede iniciar sesión."
            };
        }

        return new LoginResponseDto
        {
            IsSuccess = true,
            Message = "Inicio de sesión correcto.",
            UserId = user.Id,
            UserName = user.UserName,
            FullName = user.FullName,
            Role = user.Role,
            ExpectedDailyHours = user.ExpectedDailyHours
        };
    }

    public async Task<UserListResponseDto> GetAllUsersAsync()
    {
        await using var dbContext = await _dbContextFactory.CreateDbContextAsync();

        var users = await dbContext.Users
            .AsNoTracking()
            .OrderBy(u => u.FullName)
            .Select(u => new UserSummaryDto
            {
                UserId = u.Id,
                FullName = u.FullName,
                UserName = u.UserName,
                Role = u.Role,
                ExpectedDailyHours = u.ExpectedDailyHours,
                IsActive = u.IsActive
            })
            .ToListAsync();

        return new UserListResponseDto
        {
            IsSuccess = true,
            Message = "Usuarios obtenidos correctamente.",
            Users = users
        };
    }

    public async Task<UserOperationResponseDto> CreateUserAsync(CreateUserRequestDto request)
    {
        var validationMessage = ValidateCreateRequest(request);
        if (!string.IsNullOrWhiteSpace(validationMessage))
        {
            return new UserOperationResponseDto
            {
                IsSuccess = false,
                Message = validationMessage
            };
        }

        await using var dbContext = await _dbContextFactory.CreateDbContextAsync();

        var normalizedUserName = request.UserName.Trim();

        var exists = await dbContext.Users
            .AnyAsync(u => u.UserName.ToLower() == normalizedUserName.ToLower());

        if (exists)
        {
            return new UserOperationResponseDto
            {
                IsSuccess = false,
                Message = "Ya existe un usuario con ese nombre de usuario."
            };
        }

        var user = new UserEntity
        {
            FullName = request.FullName.Trim(),
            UserName = normalizedUserName,
            Password = request.Password,
            Role = NormalizeRole(request.Role),
            ExpectedDailyHours = request.ExpectedDailyHours,
            IsActive = true,
            CreatedAtUtc = DateTime.UtcNow
        };

        dbContext.Users.Add(user);
        await dbContext.SaveChangesAsync();

        return new UserOperationResponseDto
        {
            IsSuccess = true,
            Message = "Usuario creado correctamente.",
            User = MapUser(user)
        };
    }

    public async Task<UserOperationResponseDto> UpdateUserAsync(int userId, UpdateUserRequestDto request)
    {
        var validationMessage = ValidateUpdateRequest(request);
        if (!string.IsNullOrWhiteSpace(validationMessage))
        {
            return new UserOperationResponseDto
            {
                IsSuccess = false,
                Message = validationMessage
            };
        }

        await using var dbContext = await _dbContextFactory.CreateDbContextAsync();

        var user = await dbContext.Users.FirstOrDefaultAsync(u => u.Id == userId);

        if (user is null)
        {
            return new UserOperationResponseDto
            {
                IsSuccess = false,
                Message = "No se ha encontrado el usuario."
            };
        }

        var normalizedUserName = request.UserName.Trim();

        var exists = await dbContext.Users
            .AnyAsync(u => u.Id != userId && u.UserName.ToLower() == normalizedUserName.ToLower());

        if (exists)
        {
            return new UserOperationResponseDto
            {
                IsSuccess = false,
                Message = "Ya existe otro usuario con ese nombre de usuario."
            };
        }

        user.FullName = request.FullName.Trim();
        user.UserName = normalizedUserName;
        user.Role = NormalizeRole(request.Role);
        user.ExpectedDailyHours = request.ExpectedDailyHours;

        if (!string.IsNullOrWhiteSpace(request.Password))
        {
            user.Password = request.Password;
        }

        await dbContext.SaveChangesAsync();

        return new UserOperationResponseDto
        {
            IsSuccess = true,
            Message = "Usuario actualizado correctamente.",
            User = MapUser(user)
        };
    }

    public async Task<UserOperationResponseDto> SetUserActiveAsync(int userId, bool isActive)
    {
        await using var dbContext = await _dbContextFactory.CreateDbContextAsync();

        var user = await dbContext.Users.FirstOrDefaultAsync(u => u.Id == userId);

        if (user is null)
        {
            return new UserOperationResponseDto
            {
                IsSuccess = false,
                Message = "No se ha encontrado el usuario."
            };
        }

        if (user.IsActive == isActive)
        {
            return new UserOperationResponseDto
            {
                IsSuccess = true,
                Message = isActive ? "El usuario ya estaba activo." : "El usuario ya estaba desactivado.",
                User = MapUser(user)
            };
        }

        if (!isActive && string.Equals(user.Role, "Admin", StringComparison.OrdinalIgnoreCase))
        {
            var activeAdmins = await dbContext.Users.CountAsync(u => u.IsActive && u.Role == "Admin");

            if (activeAdmins <= 1)
            {
                return new UserOperationResponseDto
                {
                    IsSuccess = false,
                    Message = "No puedes desactivar al último administrador activo."
                };
            }
        }

        user.IsActive = isActive;
        await dbContext.SaveChangesAsync();

        return new UserOperationResponseDto
        {
            IsSuccess = true,
            Message = isActive ? "Usuario reactivado correctamente." : "Usuario desactivado correctamente.",
            User = MapUser(user)
        };
    }

    public async Task<UserOperationResponseDto> DeleteUserAsync(int userId)
    {
        await using var dbContext = await _dbContextFactory.CreateDbContextAsync();

        var user = await dbContext.Users.FirstOrDefaultAsync(u => u.Id == userId);

        if (user is null)
        {
            return new UserOperationResponseDto
            {
                IsSuccess = false,
                Message = "No se ha encontrado el usuario."
            };
        }

        if (string.Equals(user.Role, "Admin", StringComparison.OrdinalIgnoreCase))
        {
            var adminCount = await dbContext.Users.CountAsync(u => u.IsActive && u.Role == "Admin");

            if (user.IsActive && adminCount <= 1)
            {
                return new UserOperationResponseDto
                {
                    IsSuccess = false,
                    Message = "No puedes borrar al último administrador activo."
                };
            }
        }

        var hasFichajes = await dbContext.FichajeRecords.AnyAsync(f => f.UserId == userId);

        if (hasFichajes)
        {
            return new UserOperationResponseDto
            {
                IsSuccess = false,
                Message = "Este usuario tiene fichajes guardados. Debes desactivarlo en lugar de borrarlo."
            };
        }

        dbContext.Users.Remove(user);
        await dbContext.SaveChangesAsync();

        return new UserOperationResponseDto
        {
            IsSuccess = true,
            Message = "Usuario borrado correctamente."
        };
    }

    public async Task<UserSummaryDto?> GetUserByIdAsync(int userId)
    {
        await using var dbContext = await _dbContextFactory.CreateDbContextAsync();

        var user = await dbContext.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Id == userId);

        return user is null ? null : MapUser(user);
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

    private static UserSummaryDto MapUser(UserEntity user)
    {
        return new UserSummaryDto
        {
            UserId = user.Id,
            FullName = user.FullName,
            UserName = user.UserName,
            Role = user.Role,
            ExpectedDailyHours = user.ExpectedDailyHours,
            IsActive = user.IsActive
        };
    }
}