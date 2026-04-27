using System;
using System.Collections.Generic;
using System.Linq;
using System.Windows;
using System.Windows.Controls;
using FichajeDeEmpresa.App.Services;
using FichajeDeEmpresa.Shared.Contracts.Fichajes;

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

    private async Task LoadUsersForFilterAsync()
    {
        var selectedUserId = GetSelectedUserId();

        var result = await _apiClient.GetUsersAsync();

        if (!result.IsSuccess)
        {
            ShowMessage(result.Message);
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
        ShowMessage(string.Empty);

        if (!FromDatePicker.SelectedDate.HasValue || !ToDatePicker.SelectedDate.HasValue)
        {
            ShowMessage("Debes indicar la fecha desde y la fecha hasta.");
            return;
        }

        var fromDate = FromDatePicker.SelectedDate.Value.Date;
        var toDate = ToDatePicker.SelectedDate.Value.Date;

        if (fromDate > toDate)
        {
            ShowMessage("La fecha desde no puede ser mayor que la fecha hasta.");
            return;
        }

        SetBusyState(true);

        var result = await _apiClient.GetFichajeHistoryAsync(GetSelectedUserId(), fromDate, toDate);

        SetBusyState(false);

        if (!result.IsSuccess)
        {
            _allHistoryItems.Clear();
            HistoryListBox.ItemsSource = null;
            EmptyStateBorder.Visibility = Visibility.Collapsed;
            ShowMessage(result.Message);
            return;
        }

        _allHistoryItems.Clear();
        _allHistoryItems.AddRange(result.Days.Select(BuildDayListItem));

        HistoryListBox.ItemsSource = _allHistoryItems;
        EmptyStateBorder.Visibility = _allHistoryItems.Count == 0 ? Visibility.Visible : Visibility.Collapsed;

        var totalWorkedSeconds = _allHistoryItems.Sum(i => i.DayData.WorkedSeconds);
        var totalExtraSeconds = _allHistoryItems.Sum(i => i.DayData.ExtraSeconds);

        HistorySummaryTextBlock.Text =
            $"Resultados: {_allHistoryItems.Count} jornadas · Trabajado total: {FormatWorkedTime(totalWorkedSeconds)} · Horas extra totales: {FormatWorkedTime(totalExtraSeconds)}";
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
    }

    private void ShowMessage(string message)
    {
        if (string.IsNullOrWhiteSpace(message))
        {
            MessageBorder.Visibility = Visibility.Collapsed;
            MessageTextBlock.Text = string.Empty;
            return;
        }

        MessageBorder.Visibility = Visibility.Visible;
        MessageTextBlock.Text = message;
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