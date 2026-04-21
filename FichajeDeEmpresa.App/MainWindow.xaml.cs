using System;
using System.Collections.Generic;
using System.Linq;
using System.Windows;
using System.Windows.Media;
using FichajeDeEmpresa.App.Services;
using FichajeDeEmpresa.Shared.Contracts.Auth;
using FichajeDeEmpresa.Shared.Contracts.Fichajes;

namespace FichajeDeEmpresa.App;

public partial class MainWindow : Window
{
    private readonly LoginResponseDto _loggedUser;
    private readonly ApiClient _apiClient = new();

    private bool _isBusy;
    private DaySummaryDto _currentSummary = new();

    public MainWindow(LoginResponseDto loggedUser)
    {
        _loggedUser = loggedUser ?? throw new ArgumentNullException(nameof(loggedUser));

        InitializeComponent();
        LoadUserData();
        Loaded += MainWindow_Loaded;
    }

    private async void MainWindow_Loaded(object sender, RoutedEventArgs e)
    {
        await LoadTodaySummaryAsync();
    }

    private async void EntryButton_Click(object sender, RoutedEventArgs e)
    {
        await RegisterFichajeAsync(isEntry: true);
    }

    private async void ExitButton_Click(object sender, RoutedEventArgs e)
    {
        await RegisterFichajeAsync(isEntry: false);
    }

    private async void RefreshButton_Click(object sender, RoutedEventArgs e)
    {
        await LoadTodaySummaryAsync();
    }

    private void LoadUserData()
    {
        WelcomeTextBlock.Text = $"Bienvenido/a, {_loggedUser.FullName}";
        UserIdValueTextBlock.Text = _loggedUser.UserId.ToString();
        FullNameValueTextBlock.Text = _loggedUser.FullName;
        RoleValueTextBlock.Text = _loggedUser.Role;
        ExpectedDailyHoursValueTextBlock.Text = $"{_loggedUser.ExpectedDailyHours:0.##} horas/día";
    }

    private async Task LoadTodaySummaryAsync()
    {
        ShowMessage(string.Empty, isError: false);
        SetBusyState(true);

        var result = await _apiClient.GetTodaySummaryAsync(_loggedUser.UserId);

        SetBusyState(false);

        if (!result.IsSuccess || result.Summary is null)
        {
            ShowMessage(result.Message, isError: true);
            return;
        }

        ApplySummary(result.Summary);
        ShowMessage("Resumen del día cargado correctamente.", isError: false);
    }

    private async Task RegisterFichajeAsync(bool isEntry)
    {
        ShowMessage(string.Empty, isError: false);
        SetBusyState(true);

        var request = new RegisterFichajeRequestDto
        {
            UserId = _loggedUser.UserId
        };

        var result = isEntry
            ? await _apiClient.RegisterEntryAsync(request)
            : await _apiClient.RegisterExitAsync(request);

        SetBusyState(false);

        if (result.Summary is not null)
        {
            ApplySummary(result.Summary);
        }

        ShowMessage(result.Message, isError: !result.IsSuccess);
    }

    private void ApplySummary(DaySummaryDto summary)
    {
        _currentSummary = summary;

        CurrentStatusValueTextBlock.Text = summary.IsWorking ? "Trabajando" : "Fuera";
        CurrentStatusValueTextBlock.Foreground = summary.IsWorking ? Brushes.DarkGreen : Brushes.DarkRed;

        LastEntryValueTextBlock.Text = summary.LastEntryTime.HasValue
            ? summary.LastEntryTime.Value.ToString("dd/MM/yyyy HH:mm:ss")
            : "Todavía no hay entrada registrada hoy.";

        LastExitValueTextBlock.Text = summary.LastExitTime.HasValue
            ? summary.LastExitTime.Value.ToString("dd/MM/yyyy HH:mm:ss")
            : "Todavía no hay salida registrada hoy.";

        WorkedTodayValueTextBlock.Text = FormatWorkedTime(summary.WorkedSecondsToday);

        MovementsListBox.ItemsSource = BuildMovementLines(summary);

        UpdateButtons();
    }

    private List<string> BuildMovementLines(DaySummaryDto summary)
    {
        if (summary.Movements.Count == 0)
        {
            return
            [
                "Todavía no hay fichajes registrados hoy."
            ];
        }

        return summary.Movements
            .Select(m => $"{m.Timestamp:HH:mm:ss} - {m.Type}")
            .ToList();
    }

    private void SetBusyState(bool isBusy)
    {
        _isBusy = isBusy;
        UpdateButtons();
        RefreshButton.IsEnabled = !isBusy;
    }

    private void UpdateButtons()
    {
        EntryButton.IsEnabled = !_isBusy && !_currentSummary.IsWorking;
        ExitButton.IsEnabled = !_isBusy && _currentSummary.IsWorking;
    }

    private void ShowMessage(string message, bool isError)
    {
        MessageTextBlock.Text = message;
        MessageTextBlock.Foreground = isError ? Brushes.DarkRed : Brushes.DarkGreen;
    }

    private static string FormatWorkedTime(int workedSeconds)
    {
        var time = TimeSpan.FromSeconds(workedSeconds);
        return $"{time:hh\\:mm\\:ss}";
    }
}