namespace FichajeDeEmpresa.Shared.Contracts.Users;

public class UserOperationResponseDto
{
    public bool IsSuccess { get; set; }

    public string Message { get; set; } = string.Empty;

    public UserListItemDto? User { get; set; }
}