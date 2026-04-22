namespace FichajeDeEmpresa.Shared.Contracts.Users;

public class UserListItemDto
{
    public int UserId { get; set; }

    public string UserName { get; set; } = string.Empty;

    public string FullName { get; set; } = string.Empty;

    public string Role { get; set; } = string.Empty;

    public decimal ExpectedDailyHours { get; set; }
}