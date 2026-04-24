namespace FichajeDeEmpresa.Shared.Contracts.Users;

public class UserOperationResponseDto
{
    public bool IsSuccess { get; set; }

    public string Message { get; set; } = string.Empty;

    public UserSummaryDto? User { get; set; }
}