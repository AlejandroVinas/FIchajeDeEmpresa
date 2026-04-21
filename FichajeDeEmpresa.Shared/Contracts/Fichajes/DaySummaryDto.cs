namespace FichajeDeEmpresa.Shared.Contracts.Fichajes;

public class DaySummaryDto
{
    public int UserId { get; set; }

    public bool IsWorking { get; set; }

    public DateTime? LastEntryTime { get; set; }

    public DateTime? LastExitTime { get; set; }

    public int WorkedSecondsToday { get; set; }

    public int NormalSecondsToday { get; set; }

    public int ExtraSecondsToday { get; set; }

    public List<FichajeMovementDto> Movements { get; set; } = [];
}