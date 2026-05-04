using System;
using System.Collections.Generic;
using System.Linq;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Media;
using ClosedXML.Excel;
using FichajeDeEmpresa.App.Services;
using FichajeDeEmpresa.Shared.Contracts.Fichajes;
using Microsoft.Win32;

namespace FichajeDeEmpresa.App;

public partial class FichajeHistoryWindow : Window
{
    private readonly ApiClient _apiClient = new();
    private readonly List<AdminHistoryDayListItem> _allHistoryItems = [];
    private bool _isBusy;

    public FichajeHistoryWindow()
    {
        InitializeComponent();
        ConfigureDefaults();
        Loaded += FichajeHistoryWindow_Loaded;
    }

    private async void FichajeHistoryWindow_Loaded(object sender, RoutedEventArgs e)
    {
        await LoadUsersForFilterAsync();
        await LoadHistoryAsync();
    }

    private void ConfigureDefaults()
    {
        FromDatePicker.SelectedDate = DateTime.Today.AddDays(-30);
        ToDatePicker.SelectedDate = DateTime.Today;

        HistoryUserComboBox.Items.Clear();
        HistoryUserComboBox.Items.Add(new ComboBoxItem
        {
            Content = "Todos los usuarios",
            Tag = null
        });

        HistoryUserComboBox.SelectedIndex = 0;
        HistorySummaryTextBlock.Text = "Sin resultados cargados todavía.";

        HistoryListBox.ItemsSource = null;
        HistoryListBox.Visibility = Visibility.Collapsed;
        EmptyStateBorder.Visibility = Visibility.Collapsed;
        ExportExcelButton.IsEnabled = false;

        ShowMessage(string.Empty, MessageTone.Info);
    }

    private async void SearchButton_Click(object sender, RoutedEventArgs e)
    {
        await LoadHistoryAsync();
    }

    private void ViewDetailButton_Click(object sender, RoutedEventArgs e)
    {
        if (sender is not Button button || button.Tag is not AdminFichajeHistoryDayDto day)
        {
            return;
        }

        var detailWindow = new FichajeHistoryDayDetailWindow(day)
        {
            Owner = this
        };

        detailWindow.ShowDialog();
    }

    private void ExportExcelButton_Click(object sender, RoutedEventArgs e)
    {
        if (_allHistoryItems.Count == 0)
        {
            ShowMessage("No hay resultados para exportar.", MessageTone.Warning);
            return;
        }

        try
        {
            var fileName = BuildDefaultFileName();

            var saveDialog = new SaveFileDialog
            {
                Title = "Guardar historial en Excel",
                Filter = "Archivo Excel (*.xlsx)|*.xlsx",
                DefaultExt = "xlsx",
                AddExtension = true,
                FileName = fileName
            };

            if (saveDialog.ShowDialog() != true)
            {
                return;
            }

            using var workbook = new XLWorkbook();

            BuildSummarySheet(workbook);
            BuildMovementsSheet(workbook);

            workbook.SaveAs(saveDialog.FileName);

            ShowMessage("Excel exportado correctamente.", MessageTone.Success);
        }
        catch (Exception ex)
        {
            ShowMessage($"No se pudo exportar el Excel. {ex.Message}", MessageTone.Error);
        }
    }

    private async Task LoadUsersForFilterAsync()
    {
        var selectedUserId = GetSelectedUserId();

        var result = await _apiClient.GetUsersAsync();

        if (!result.IsSuccess)
        {
            ShowMessage(result.Message, MessageTone.Error);
            return;
        }

        HistoryUserComboBox.Items.Clear();
        HistoryUserComboBox.Items.Add(new ComboBoxItem
        {
            Content = "Todos los usuarios",
            Tag = null
        });

        foreach (var user in result.Users)
        {
            HistoryUserComboBox.Items.Add(new ComboBoxItem
            {
                Content = $"{user.FullName} ({user.UserName})",
                Tag = user.UserId
            });
        }

        SelectUserInCombo(selectedUserId);
    }

    private async Task LoadHistoryAsync()
    {
        ShowMessage(string.Empty, MessageTone.Info);

        if (!FromDatePicker.SelectedDate.HasValue || !ToDatePicker.SelectedDate.HasValue)
        {
            ShowMessage("Debes indicar la fecha desde y la fecha hasta.", MessageTone.Error);
            return;
        }

        var fromDate = FromDatePicker.SelectedDate.Value.Date;
        var toDate = ToDatePicker.SelectedDate.Value.Date;

        if (fromDate > toDate)
        {
            ShowMessage("La fecha desde no puede ser mayor que la fecha hasta.", MessageTone.Error);
            return;
        }

        SetBusyState(true);

        var result = await _apiClient.GetFichajeHistoryAsync(GetSelectedUserId(), fromDate, toDate);

        SetBusyState(false);

        if (!result.IsSuccess)
        {
            _allHistoryItems.Clear();
            HistoryListBox.ItemsSource = null;
            HistoryListBox.Visibility = Visibility.Collapsed;
            EmptyStateBorder.Visibility = Visibility.Collapsed;
            ExportExcelButton.IsEnabled = false;
            HistorySummaryTextBlock.Text = "No se pudo cargar el historial.";
            ShowMessage(result.Message, MessageTone.Error);
            return;
        }

        _allHistoryItems.Clear();
        _allHistoryItems.AddRange(result.Days.Select(BuildDayListItem));

        var visibleItems = _allHistoryItems.ToList();

        HistoryListBox.ItemsSource = null;
        HistoryListBox.ItemsSource = visibleItems;

        var hasResults = visibleItems.Count > 0;

        HistoryListBox.Visibility = hasResults ? Visibility.Visible : Visibility.Collapsed;
        EmptyStateBorder.Visibility = hasResults ? Visibility.Collapsed : Visibility.Visible;
        ExportExcelButton.IsEnabled = hasResults;

        var totalWorkedSeconds = visibleItems.Sum(i => i.DayData.WorkedSeconds);
        var totalExtraSeconds = visibleItems.Sum(i => i.DayData.ExtraSeconds);

        HistorySummaryTextBlock.Text =
            $"Resultados: {visibleItems.Count} jornadas · Trabajado total: {FormatWorkedTime(totalWorkedSeconds)} · Horas extra totales: {FormatWorkedTime(totalExtraSeconds)}";
    }

    private void BuildSummarySheet(XLWorkbook workbook)
    {
        var sheet = workbook.Worksheets.Add("Resumen");

        sheet.Cell(1, 1).Value = "Fecha";
        sheet.Cell(1, 2).Value = "Usuario";
        sheet.Cell(1, 3).Value = "Nombre completo";
        sheet.Cell(1, 4).Value = "Estado";
        sheet.Cell(1, 5).Value = "Trabajado";
        sheet.Cell(1, 6).Value = "Normales";
        sheet.Cell(1, 7).Value = "Extra";
        sheet.Cell(1, 8).Value = "Movimientos";

        var row = 2;
        foreach (var item in _allHistoryItems.OrderBy(i => i.DayData.Date).ThenBy(i => i.DayData.UserName))
        {
            sheet.Cell(row, 1).Value = item.DayData.Date;
            sheet.Cell(row, 1).Style.DateFormat.Format = "dd/MM/yyyy";

            sheet.Cell(row, 2).Value = item.DayData.UserName;
            sheet.Cell(row, 3).Value = item.DayData.FullName;
            sheet.Cell(row, 4).Value = item.StatusText;
            sheet.Cell(row, 5).Value = FormatWorkedTime(item.DayData.WorkedSeconds);
            sheet.Cell(row, 6).Value = FormatWorkedTime(item.DayData.NormalSeconds);
            sheet.Cell(row, 7).Value = FormatWorkedTime(item.DayData.ExtraSeconds);
            sheet.Cell(row, 8).Value = item.DayData.Movements.Count;

            row++;
        }

        StyleSheet(sheet, 8, row - 1);
    }

    private void BuildMovementsSheet(XLWorkbook workbook)
    {
        var sheet = workbook.Worksheets.Add("Movimientos");

        sheet.Cell(1, 1).Value = "Fecha";
        sheet.Cell(1, 2).Value = "Usuario";
        sheet.Cell(1, 3).Value = "Nombre completo";
        sheet.Cell(1, 4).Value = "Hora";
        sheet.Cell(1, 5).Value = "Tipo";
        sheet.Cell(1, 6).Value = "Comentario";

        var row = 2;

        foreach (var item in _allHistoryItems.OrderBy(i => i.DayData.Date).ThenBy(i => i.DayData.UserName))
        {
            foreach (var movement in item.DayData.Movements.OrderBy(m => m.Timestamp))
            {
                sheet.Cell(row, 1).Value = item.DayData.Date;
                sheet.Cell(row, 1).Style.DateFormat.Format = "dd/MM/yyyy";

                sheet.Cell(row, 2).Value = item.DayData.UserName;
                sheet.Cell(row, 3).Value = item.DayData.FullName;
                sheet.Cell(row, 4).Value = movement.Timestamp;
                sheet.Cell(row, 4).Style.DateFormat.Format = "HH:mm:ss";
                sheet.Cell(row, 5).Value = movement.Type;
                sheet.Cell(row, 6).Value = movement.Comment ?? string.Empty;

                row++;
            }
        }

        StyleSheet(sheet, 6, row - 1);
    }

    private static void StyleSheet(IXLWorksheet sheet, int columnCount, int lastDataRow)
    {
        var headerRange = sheet.Range(1, 1, 1, columnCount);
        headerRange.Style.Font.Bold = true;
        headerRange.Style.Fill.BackgroundColor = XLColor.FromHtml("#F4E4A6");
        headerRange.Style.Border.BottomBorder = XLBorderStyleValues.Thin;

        if (lastDataRow >= 1)
        {
            var usedRange = sheet.Range(1, 1, Math.Max(lastDataRow, 1), columnCount);
            usedRange.SetAutoFilter();
        }

        sheet.SheetView.FreezeRows(1);
        sheet.Columns().AdjustToContents();
    }

    private string BuildDefaultFileName()
    {
        var from = FromDatePicker.SelectedDate?.ToString("yyyy-MM-dd") ?? "desde";
        var to = ToDatePicker.SelectedDate?.ToString("yyyy-MM-dd") ?? "hasta";

        if (HistoryUserComboBox.SelectedItem is ComboBoxItem item && item.Tag is int)
        {
            var userText = item.Content?.ToString() ?? "usuario";
            var userNamePart = userText.Split('(').LastOrDefault()?.Replace(")", "").Trim();

            if (!string.IsNullOrWhiteSpace(userNamePart))
            {
                return $"HistorialFichajes_{userNamePart}_{from}_{to}.xlsx";
            }
        }

        return $"HistorialFichajes_{from}_{to}.xlsx";
    }

    private static AdminHistoryDayListItem BuildDayListItem(AdminFichajeHistoryDayDto day)
    {
        return new AdminHistoryDayListItem
        {
            DateText = day.Date.ToString("dd/MM/yyyy"),
            UserText = $"{day.FullName} ({day.UserName})",
            WorkedText = FormatWorkedTime(day.WorkedSeconds),
            ExtraText = FormatWorkedTime(day.ExtraSeconds),
            StatusText = GetStatusText(day),
            MovementsText = $"{day.Movements.Count} movimientos",
            DayData = day
        };
    }

    private int? GetSelectedUserId()
    {
        if (HistoryUserComboBox.SelectedItem is ComboBoxItem item && item.Tag is int userId)
        {
            return userId;
        }

        return null;
    }

    private void SelectUserInCombo(int? userId)
    {
        foreach (var item in HistoryUserComboBox.Items)
        {
            if (item is not ComboBoxItem comboItem)
            {
                continue;
            }

            if (userId is null && comboItem.Tag is null)
            {
                HistoryUserComboBox.SelectedItem = comboItem;
                return;
            }

            if (comboItem.Tag is int comboUserId && comboUserId == userId)
            {
                HistoryUserComboBox.SelectedItem = comboItem;
                return;
            }
        }

        HistoryUserComboBox.SelectedIndex = 0;
    }

    private void SetBusyState(bool isBusy)
    {
        _isBusy = isBusy;
        HistoryUserComboBox.IsEnabled = !isBusy;
        FromDatePicker.IsEnabled = !isBusy;
        ToDatePicker.IsEnabled = !isBusy;
        SearchButton.IsEnabled = !isBusy;
        ExportExcelButton.IsEnabled = !isBusy && _allHistoryItems.Count > 0;
    }

    private void ShowMessage(string message, MessageTone tone)
    {
        if (string.IsNullOrWhiteSpace(message))
        {
            MessageBorder.Visibility = Visibility.Collapsed;
            MessageTextBlock.Text = string.Empty;
            return;
        }

        MessageBorder.Visibility = Visibility.Visible;
        MessageTextBlock.Text = message;

        switch (tone)
        {
            case MessageTone.Success:
                MessageBorder.Background = GetBrush("SuccessBackgroundBrush", "#EAF7EE");
                MessageBorder.BorderBrush = GetBrush("SuccessBorderBrush", "#B8DDBF");
                MessageTextBlock.Foreground = GetBrush("SuccessBrush", "#2F7D4A");
                break;

            case MessageTone.Warning:
                MessageBorder.Background = GetBrush("WarningBackgroundBrush", "#FFF4D9");
                MessageBorder.BorderBrush = GetBrush("WarningBorderBrush", "#E9C66B");
                MessageTextBlock.Foreground = GetBrush("WarningBrush", "#A56A00");
                break;

            case MessageTone.Error:
                MessageBorder.Background = GetBrush("DangerBackgroundBrush", "#FDECEC");
                MessageBorder.BorderBrush = GetBrush("DangerBorderBrush", "#E8B5B5");
                MessageTextBlock.Foreground = GetBrush("DangerBrush", "#A33A3A");
                break;

            default:
                MessageBorder.Background = GetBrush("InfoBackgroundBrush", "#FFF8E1");
                MessageBorder.BorderBrush = GetBrush("InfoBorderBrush", "#E8D089");
                MessageTextBlock.Foreground = GetBrush("InfoBrush", "#7B5B12");
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

        if (day.Movements.Any(m => NormalizeType(m.Type) == "incidencia"))
        {
            return "Incidencia";
        }

        return "Cerrado";
    }

    private static string NormalizeType(string? type)
    {
        return (type ?? string.Empty).Trim().ToLowerInvariant();
    }

    private static string FormatWorkedTime(int workedSeconds)
    {
        var time = TimeSpan.FromSeconds(workedSeconds);
        return $"{time:hh\\:mm\\:ss}";
    }

    private enum MessageTone
    {
        Info,
        Success,
        Warning,
        Error
    }
}