using System;
using System.Collections.Generic;
using System.Linq;
using System.Windows;
using FichajeDeEmpresa.Shared.Contracts.Fichajes;

namespace FichajeDeEmpresa.App;

public partial class FichajeHistoryDayDetailWindow : Window
{
    private readonly AdminFichajeHistoryDayDto _day;

    public FichajeHistoryDayDetailWindow(AdminFichajeHistoryDayDto day)
    {
        _day = day ?? throw new ArgumentNullException(nameof(day));

        InitializeComponent();
        LoadDayData();
    }

    private void LoadDayData()
    {
        Title = $"Detalle del día - {_day.Date:dd/MM/yyyy}";

        HeaderTitleTextBlock.Text = $"{_day.Date:dd/MM/yyyy} · {_day.FullName}";
        HeaderSubTitleTextBlock.Text =
            $"Usuario: {_day.UserName} · Movimientos: {_day.Movements.Count}";

        StatusValueTextBlock.Text = GetStatusText(_day);
        WorkedValueTextBlock.Text = FormatWorkedTime(_day.WorkedSeconds);
        NormalValueTextBlock.Text = FormatWorkedTime(_day.NormalSeconds);
        ExtraValueTextBlock.Text = FormatWorkedTime(_day.ExtraSeconds);

        List<string> movementLines = _day.Movements.Count == 0
            ? new List<string> { "No hay movimientos registrados en esta jornada." }
            : _day.Movements
                .OrderByDescending(m => m.Timestamp)
                .Select(BuildMovementLine)
                .ToList();

        MovementsListBox.ItemsSource = movementLines;
    }

    private void CloseButton_Click(object sender, RoutedEventArgs e)
    {
        Close();
    }

    private static string BuildMovementLine(FichajeMovementDto movement)
    {
        var line = $"{movement.Timestamp:HH:mm:ss} · {movement.Type}";

        if (!string.IsNullOrWhiteSpace(movement.Comment))
        {
            line += $"\nComentario: {movement.Comment}";
        }

        return line;
    }

    private static string GetStatusText(AdminFichajeHistoryDayDto day)
    {
        if (day.IsWorking)
        {
            return "Trabajando";
        }

        if (day.IsPaused)
        {
            return "En pausa";
        }

        return "Cerrado";
    }

    private static string FormatWorkedTime(int workedSeconds)
    {
        var time = TimeSpan.FromSeconds(workedSeconds);
        return $"{time:hh\\:mm\\:ss}";
    }
}