namespace FichajeDeEmpresa.Shared.Contracts.Users;

public class UpdateUserRequestDto
{
    public string FullName { get; set; } = string.Empty;

    public string UserName { get; set; } = string.Empty;

    public string? Password { get; set; }

    public string Role { get; set; } = string.Empty;

    public decimal ExpectedDailyHours { get; set; }
}