namespace FichajeDeEmpresa.Shared.Contracts.Fichajes;

public class AdminFichajeHistoryResponseDto
{
    public bool IsSuccess { get; set; }

    public string Message { get; set; } = string.Empty;

    public List<AdminFichajeHistoryDayDto> Days { get; set; } = [];
}