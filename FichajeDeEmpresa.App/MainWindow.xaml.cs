using System;
using System.Collections.Generic;
using System.Linq;
using System.Windows;
using System.Windows.Media;
using FichajeDeEmpresa.App.Configuration;
using FichajeDeEmpresa.App.Dialogs;
using FichajeDeEmpresa.App.Services;
using FichajeDeEmpresa.Shared.Contracts.Auth;
using FichajeDeEmpresa.Shared.Contracts.Fichajes;

namespace FichajeDeEmpresa.App;

public partial class MainWindow : Window
{
    private readonly LoginResponseDto _loggedUser;
    private readonly ApiClient _apiClient = new();

    private readonly Brush _workingTextBrush = CreateBrush("#1E6B3A");
    private readonly Brush _workingBackgroundBrush = CreateBrush("#E8F7EE");
    private readonly Brush _workingBorderBrush = CreateBrush("#9BD3AE");

    private readonly Brush _outsideTextBrush = CreateBrush("#A33A3A");
    private readonly Brush _outsideBackgroundBrush = CreateBrush("#FDECEC");
    private readonly Brush _outsideBorderBrush = CreateBrush("#F2B8B5");

    private readonly Brush _successMessageBackgroundBrush = CreateBrush("#EEF6FF");
    private readonly Brush _successMessageBorderBrush = CreateBrush("#BFD7FF");
    private readonly Brush _successMessageTextBrush = CreateBrush("#1D4F91");

    private readonly Brush _errorMessageBackgroundBrush = CreateBrush("#FDECEC");
    private readonly Brush _errorMessageBorderBrush = CreateBrush("#F2B8B5");
    private readonly Brush _errorMessageTextBrush = CreateBrush("#9F1239");

    private readonly Brush _defaultMetricBrush = CreateBrush("#17212B");
    private readonly Brush _extraMetricBrush = CreateBrush("#B26A00");

    private bool _isBusy;
    private DaySummaryDto _currentSummary = new();

    public MainWindow(LoginResponseDto loggedUser)
    {
        _loggedUser = loggedUser ?? throw new ArgumentNullException(nameof(loggedUser));

        InitializeComponent();

        WindowState = WindowState.Maximized;

        LoadUserData();
        ShowMessage(string.Empty, false);
        Loaded += MainWindow_Loaded;
    }

    private async void MainWindow_Loaded(object sender, RoutedEventArgs e)
    {
        WindowState = WindowState.Maximized;
        await LoadTodaySummaryAsync();
    }

    private async void EntryButton_Click(object sender, RoutedEventArgs e)
    {
        await RegisterFichajeWithOptionalCommentAsync(isEntry: true);
    }

    private async void ExitButton_Click(object sender, RoutedEventArgs e)
    {
        await RegisterFichajeWithOptionalCommentAsync(isEntry: false);
    }

    private async void RefreshButton_Click(object sender, RoutedEventArgs e)
    {
        await LoadTodaySummaryAsync();
    }

    private void ChangeUserButton_Click(object sender, RoutedEventArgs e)
    {
        var loginWindow = new LoginWindow();

        Application.Current.MainWindow = loginWindow;
        loginWindow.Show();

        Close();
    }

    private void LoadUserData()
    {
        Title = $"{BrandingConfiguration.CompanyLegalName} - Control de fichaje";

        HeaderCompanyNameTextBlock.Text = BrandingConfiguration.CompanyLegalName;
        HeaderBrandTextBlock.Text = BrandingConfiguration.BrandDisplayName;
        HeaderWelcomeMessageTextBlock.Text = BrandingConfiguration.MainWelcomeMessage;

        WelcomeTextBlock.Text = $"{GetGreetingForCurrentTime()}, {_loggedUser.FullName}";
        SessionUserNameTextBlock.Text = _loggedUser.FullName;
        SessionRoleTextBlock.Text = $"Rol: {_loggedUser.Role}";
        SessionDailyHoursTextBlock.Text = $"Jornada objetivo: {_loggedUser.ExpectedDailyHours:0.##} horas/día";

        DailyTargetValueTextBlock.Text = $"{_loggedUser.ExpectedDailyHours:0.##} horas/día";
    }

    private async Task LoadTodaySummaryAsync()
    {
        ShowMessage(string.Empty, false);
        SetBusyState(true);

        var result = await _apiClient.GetTodaySummaryAsync(_loggedUser.UserId);

        SetBusyState(false);

        if (!result.IsSuccess || result.Summary is null)
        {
            ShowMessage(result.Message, true);
            return;
        }

        ApplySummary(result.Summary);
        ShowMessage("Resumen del día cargado correctamente.", false);
    }

    private async Task RegisterFichajeWithOptionalCommentAsync(bool isEntry)
    {
        var actionName = isEntry ? "entrada" : "salida";

        var dialog = new FichajeCommentWindow(actionName)
        {
            Owner = this
        };

        var dialogResult = dialog.ShowDialog();

        if (dialogResult != true)
        {
            return;
        }

        await RegisterFichajeAsync(isEntry, dialog.CommentText);
    }

    private async Task RegisterFichajeAsync(bool isEntry, string? comment)
    {
        ShowMessage(string.Empty, false);
        SetBusyState(true);

        var request = new RegisterFichajeRequestDto
        {
            UserId = _loggedUser.UserId,
            Comment = comment
        };

        var result = isEntry
            ? await _apiClient.RegisterEntryAsync(request)
            : await _apiClient.RegisterExitAsync(request);

        SetBusyState(false);

        if (result.Summary is not null)
        {
            ApplySummary(result.Summary);
        }

        ShowMessage(result.Message, !result.IsSuccess);
    }

    private void ApplySummary(DaySummaryDto summary)
    {
        _currentSummary = summary;

        ApplyStatus(summary.IsWorking);

        WorkedTodayValueTextBlock.Text = FormatWorkedTime(summary.WorkedSecondsToday);
        NormalHoursValueTextBlock.Text = FormatWorkedTime(summary.NormalSecondsToday);

        if (summary.ExtraSecondsToday > 0)
        {
            ExtraHoursCardBorder.Visibility = Visibility.Visible;
            ExtraHoursValueTextBlock.Text = FormatWorkedTime(summary.ExtraSecondsToday);
            ExtraHoursValueTextBlock.Foreground = _extraMetricBrush;
            ExtraHoursHintTextBlock.Text = "Hay horas extra registradas hoy.";
            ExtraHoursHintTextBlock.Foreground = _extraMetricBrush;
        }
        else
        {
            ExtraHoursCardBorder.Visibility = Visibility.Collapsed;
            ExtraHoursValueTextBlock.Text = "00:00:00";
            ExtraHoursValueTextBlock.Foreground = _defaultMetricBrush;
        }

        MovementsListBox.ItemsSource = BuildMovementLines(summary);

        UpdateButtons();
    }

    private void ApplyStatus(bool isWorking)
    {
        if (isWorking)
        {
            StatusBadgeTextBlock.Text = "TRABAJANDO";
            StatusBadgeTextBlock.Foreground = _workingTextBrush;
            StatusBadgeBorder.Background = _workingBackgroundBrush;
            StatusBadgeBorder.BorderBrush = _workingBorderBrush;
        }
        else
        {
            StatusBadgeTextBlock.Text = "FUERA";
            StatusBadgeTextBlock.Foreground = _outsideTextBrush;
            StatusBadgeBorder.Background = _outsideBackgroundBrush;
            StatusBadgeBorder.BorderBrush = _outsideBorderBrush;
        }
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
            .Select(BuildMovementLine)
            .ToList();
    }

    private static string BuildMovementLine(FichajeMovementDto movement)
    {
        var baseText = $"{movement.Timestamp:HH:mm:ss} · {movement.Type}";

        if (string.IsNullOrWhiteSpace(movement.Comment))
        {
            return baseText;
        }

        return $"{baseText}\nComentario: {movement.Comment}";
    }

    private void SetBusyState(bool isBusy)
    {
        _isBusy = isBusy;
        RefreshButton.IsEnabled = !isBusy;
        ChangeUserButton.IsEnabled = !isBusy;
        UpdateButtons();
    }

    private void UpdateButtons()
    {
        EntryButton.IsEnabled = !_isBusy && !_currentSummary.IsWorking;
        ExitButton.IsEnabled = !_isBusy && _currentSummary.IsWorking;
    }

    private void ShowMessage(string message, bool isError)
    {
        if (string.IsNullOrWhiteSpace(message))
        {
            MessageBorder.Visibility = Visibility.Collapsed;
            MessageTextBlock.Text = string.Empty;
            return;
        }

        MessageBorder.Visibility = Visibility.Visible;
        MessageTextBlock.Text = message;

        if (isError)
        {
            MessageBorder.Background = _errorMessageBackgroundBrush;
            MessageBorder.BorderBrush = _errorMessageBorderBrush;
            MessageTextBlock.Foreground = _errorMessageTextBrush;
        }
        else
        {
            MessageBorder.Background = _successMessageBackgroundBrush;
            MessageBorder.BorderBrush = _successMessageBorderBrush;
            MessageTextBlock.Foreground = _successMessageTextBrush;
        }
    }

    private static string FormatWorkedTime(int workedSeconds)
    {
        var time = TimeSpan.FromSeconds(workedSeconds);
        return $"{time:hh\\:mm\\:ss}";
    }

    private static SolidColorBrush CreateBrush(string hexColor)
    {
        return (SolidColorBrush)new BrushConverter().ConvertFromString(hexColor)!;
    }

    private static string GetGreetingForCurrentTime()
    {
        var hour = DateTime.Now.Hour;

        if (hour < 14)
        {
            return "Buenos días";
        }

        if (hour < 21)
        {
            return "Buenas tardes";
        }

        return "Buenas noches";
    }
}