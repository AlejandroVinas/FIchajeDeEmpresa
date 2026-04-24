using FichajeDeEmpresa.Shared.Contracts.Fichajes;

namespace FichajeDeEmpresa.App;

public class AdminHistoryDayListItem
{
    public string DateText { get; set; } = string.Empty;

    public string UserText { get; set; } = string.Empty;

    public string WorkedText { get; set; } = string.Empty;

    public string ExtraText { get; set; } = string.Empty;

    public string StatusText { get; set; } = string.Empty;

    public string MovementsText { get; set; } = string.Empty;

    public AdminFichajeHistoryDayDto DayData { get; set; } = new();
}