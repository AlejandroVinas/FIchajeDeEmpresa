namespace FichajeDeEmpresa.Shared.Contracts.Users;

public class CreateUserRequestDto
{
    public string UserName { get; set; } = string.Empty;

    public string Password { get; set; } = string.Empty;

    public string FullName { get; set; } = string.Empty;

    public string Role { get; set; } = "Empleado";

    public decimal ExpectedDailyHours { get; set; }
}