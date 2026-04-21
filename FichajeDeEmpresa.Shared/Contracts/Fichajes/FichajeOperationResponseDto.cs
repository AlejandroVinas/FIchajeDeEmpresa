namespace FichajeDeEmpresa.Shared.Contracts.Fichajes;

public class FichajeOperationResponseDto
{
    public bool IsSuccess { get; set; }

    public string Message { get; set; } = string.Empty;

    public DaySummaryDto? Summary { get; set; }
}