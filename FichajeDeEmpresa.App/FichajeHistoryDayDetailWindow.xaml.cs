using System;
using System.Linq;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Documents;
using System.Windows.Media;
using FichajeDeEmpresa.Shared.Contracts.Fichajes;

namespace FichajeDeEmpresa.App;

public partial class FichajeHistoryDayDetailWindow : Window
{
    private readonly AdminFichajeHistoryDayDto _day;

    public FichajeHistoryDayDetailWindow(AdminFichajeHistoryDayDto day)
    {
        InitializeComponent();
        _day = day;

        Title = $"Detalle del día - {_day.Date:dd/MM/yyyy}";
        LoadData();
    }

    private void LoadData()
    {
        TitleTextBlock.Text = $"{_day.Date:dd/MM/yyyy} · {_day.FullName}";
        SubtitleTextBlock.Text = $"Usuario: {_day.UserName} · Movimientos: {_day.Movements.Count}";

        StatusValueTextBlock.Text = GetStatusText(_day);
        WorkedValueTextBlock.Text = FormatTime(_day.WorkedSeconds);

        var normalSeconds = Math.Max(0, _day.WorkedSeconds - _day.ExtraSeconds);
        NormalValueTextBlock.Text = FormatTime(normalSeconds);
        ExtraValueTextBlock.Text = FormatTime(_day.ExtraSeconds);

        LoadMovements();
    }

    private void LoadMovements()
    {
        MovementsPanel.Children.Clear();

        foreach (var movement in _day.Movements.OrderByDescending(m => m.Timestamp))
        {
            var border = new Border
            {
                CornerRadius = new CornerRadius(12),
                BorderThickness = new Thickness(1),
                Padding = new Thickness(14, 12, 14, 12),
                Margin = new Thickness(0, 0, 0, 12),
                HorizontalAlignment = HorizontalAlignment.Left
            };

            ApplyMovementColors(border, movement.Type, out var typeBrush, out var subtleBrush);

            var stack = new StackPanel();

            var header = new TextBlock
            {
                FontSize = 14,
                FontWeight = FontWeights.Bold,
                Foreground = GetBrush("TextPrimaryBrush", "#2A2116")
            };

            header.Inlines.Add(new Run($"{movement.Timestamp:HH:mm:ss} · "));
            header.Inlines.Add(new Run(movement.Type)
            {
                Foreground = typeBrush
            });

            stack.Children.Add(header);

            if (!string.IsNullOrWhiteSpace(movement.Comment))
            {
                stack.Children.Add(new TextBlock
                {
                    Margin = new Thickness(0, 8, 0, 0),
                    FontSize = 12,
                    Foreground = subtleBrush,
                    TextWrapping = TextWrapping.Wrap,
                    Text = $"Comentario: {movement.Comment}"
                });
            }

            border.Child = stack;
            MovementsPanel.Children.Add(border);
        }

        if (_day.Movements.Count == 0)
        {
            MovementsPanel.Children.Add(new Border
            {
                CornerRadius = new CornerRadius(12),
                BorderThickness = new Thickness(1),
                BorderBrush = GetBrush("BorderBrushSoft", "#E7DDC8"),
                Background = GetBrush("SoftCardBackgroundBrush", "#FBF7EE"),
                Padding = new Thickness(14),
                Child = new TextBlock
                {
                    Text = "No hay movimientos registrados en este día.",
                    FontSize = 13,
                    FontWeight = FontWeights.SemiBold,
                    Foreground = GetBrush("TextSecondaryBrush", "#6E624E")
                }
            });
        }
    }

    private void ApplyMovementColors(Border border, string movementType, out Brush strongBrush, out Brush subtleBrush)
    {
        switch (NormalizeType(movementType))
        {
            case "entrada":
                border.Background = GetBrush("SuccessBackgroundBrush", "#EAF7EE");
                border.BorderBrush = GetBrush("SuccessBorderBrush", "#B8DDBF");
                strongBrush = GetBrush("SuccessBrush", "#2F7D4A");
                subtleBrush = strongBrush;
                break;

            case "pausa":
            case "reanudar":
                border.Background = GetBrush("WarningBackgroundBrush", "#FFF4D9");
                border.BorderBrush = GetBrush("WarningBorderBrush", "#E9C66B");
                strongBrush = GetBrush("WarningBrush", "#A56A00");
                subtleBrush = strongBrush;
                break;

            case "salida":
                border.Background = GetBrush("DangerBackgroundBrush", "#FDECEC");
                border.BorderBrush = GetBrush("DangerBorderBrush", "#E8B5B5");
                strongBrush = GetBrush("DangerBrush", "#A33A3A");
                subtleBrush = strongBrush;
                break;

            default:
                border.Background = GetBrush("InfoBackgroundBrush", "#FFF8E1");
                border.BorderBrush = GetBrush("InfoBorderBrush", "#E8D089");
                strongBrush = GetBrush("InfoBrush", "#7B5B12");
                subtleBrush = strongBrush;
                break;
        }
    }

    private Brush GetBrush(string resourceKey, string fallbackHex)
    {
        if (TryFindResource(resourceKey) is Brush brush)
        {
            return brush;
        }

        return (Brush)new BrushConverter().ConvertFromString(fallbackHex)!;
    }

    private static string NormalizeType(string? value)
    {
        return (value ?? string.Empty).Trim().ToLowerInvariant();
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

    private static string FormatTime(int totalSeconds)
    {
        var time = TimeSpan.FromSeconds(totalSeconds);
        return $"{time:hh\\:mm\\:ss}";
    }
}