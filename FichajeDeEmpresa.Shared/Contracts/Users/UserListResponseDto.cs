namespace FichajeDeEmpresa.Shared.Contracts.Users;

public class UserListResponseDto
{
    public bool IsSuccess { get; set; }

    public string Message { get; set; } = string.Empty;

    public List<UserListItemDto> Users { get; set; } = [];
}