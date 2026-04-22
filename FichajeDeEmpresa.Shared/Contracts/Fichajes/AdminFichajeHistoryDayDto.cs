namespace FichajeDeEmpresa.Shared.Contracts.Fichajes;

public class AdminFichajeHistoryDayDto
{
    public int UserId { get; set; }

    public string UserName { get; set; } = string.Empty;

    public string FullName { get; set; } = string.Empty;

    public DateTime Date { get; set; }

    public int WorkedSeconds { get; set; }

    public int NormalSeconds { get; set; }

    public int ExtraSeconds { get; set; }

    public bool IsWorking { get; set; }

    public List<FichajeMovementDto> Movements { get; set; } = [];
}