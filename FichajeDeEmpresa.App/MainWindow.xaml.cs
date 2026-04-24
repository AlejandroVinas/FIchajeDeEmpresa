using System;
using System.Collections.Generic;
using System.Linq;
using System.Windows;
using System.Windows.Media;
using System.Windows.Threading;
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
    private readonly DispatcherTimer _liveTimer;

    private readonly Brush _workingTextBrush = CreateBrush("#1E6B3A");
    private readonly Brush _workingBackgroundBrush = CreateBrush("#E8F7EE");
    private readonly Brush _workingBorderBrush = CreateBrush("#9BD3AE");

    private readonly Brush _pausedTextBrush = CreateBrush("#B45309");
    private readonly Brush _pausedBackgroundBrush = CreateBrush("#FFF7ED");
    private readonly Brush _pausedBorderBrush = CreateBrush("#F3C58D");

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
    private bool _isLoadingSummary;
    private DaySummaryDto _currentSummary = new();

    private int _workedSecondsAtLastSync;
    private DateTime _lastSyncLocalTime;
    private DateTime _lastAutoSyncUtc;
    private DateTime _loadedSummaryDate;

    public MainWindow(LoginResponseDto loggedUser)
    {
        _loggedUser = loggedUser ?? throw new ArgumentNullException(nameof(loggedUser));

        InitializeComponent();

        WindowState = WindowState.Maximized;

        _liveTimer = new DispatcherTimer
        {
            Interval = TimeSpan.FromSeconds(1)
        };
        _liveTimer.Tick += LiveTimer_Tick;

        LoadUserData();
        ShowMessage(string.Empty, false);

        Loaded += MainWindow_Loaded;
        Closed += MainWindow_Closed;
    }

    private async void MainWindow_Loaded(object sender, RoutedEventArgs e)
    {
        WindowState = WindowState.Maximized;
        _liveTimer.Start();
        await LoadTodaySummaryAsync(showError: true, showSuccess: false, useBusyState: true);
    }

    private void MainWindow_Closed(object? sender, EventArgs e)
    {
        _liveTimer.Stop();
    }

    private async void LiveTimer_Tick(object? sender, EventArgs e)
    {
        UpdateLiveMetrics();

        if (_loadedSummaryDate != DateTime.Today)
        {
            await LoadTodaySummaryAsync(showError: false, showSuccess: false, useBusyState: false);
            return;
        }

        if (_currentSummary.IsWorking &&
            DateTime.UtcNow - _lastAutoSyncUtc >= TimeSpan.FromSeconds(30))
        {
            await LoadTodaySummaryAsync(showError: false, showSuccess: false, useBusyState: false);
        }
    }

    private async void EntryButton_Click(object sender, RoutedEventArgs e)
    {
        await RegisterFichajeWithOptionalCommentAsync(UserFichajeAction.Entry);
    }

    private async void PauseResumeButton_Click(object sender, RoutedEventArgs e)
    {
        if (_currentSummary.IsPaused)
        {
            await RegisterFichajeWithOptionalCommentAsync(UserFichajeAction.Resume);
            return;
        }

        if (_currentSummary.IsWorking)
        {
            await RegisterFichajeWithOptionalCommentAsync(UserFichajeAction.Pause);
        }
    }

    private async void ExitButton_Click(object sender, RoutedEventArgs e)
    {
        await RegisterFichajeWithOptionalCommentAsync(UserFichajeAction.Exit);
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

    private async Task LoadTodaySummaryAsync(bool showError, bool showSuccess, bool useBusyState)
    {
        if (_isLoadingSummary)
        {
            return;
        }

        _isLoadingSummary = true;

        if (useBusyState)
        {
            SetBusyState(true);
        }

        var result = await _apiClient.GetTodaySummaryAsync(_loggedUser.UserId);

        if (useBusyState)
        {
            SetBusyState(false);
        }

        _isLoadingSummary = false;

        if (!result.IsSuccess || result.Summary is null)
        {
            if (showError)
            {
                ShowMessage(result.Message, true);
            }

            return;
        }

        ApplySummary(result.Summary);

        if (showSuccess && !string.IsNullOrWhiteSpace(result.Message))
        {
            ShowMessage(result.Message, false);
        }
    }

    private async Task RegisterFichajeWithOptionalCommentAsync(UserFichajeAction action)
    {
        var actionName = action switch
        {
            UserFichajeAction.Entry => "entrada",
            UserFichajeAction.Pause => "pausa",
            UserFichajeAction.Resume => "reanudar",
            UserFichajeAction.Exit => "salida",
            _ => "movimiento"
        };

        var dialog = new FichajeCommentWindow(actionName)
        {
            Owner = this
        };

        var dialogResult = dialog.ShowDialog();

        if (dialogResult != true)
        {
            return;
        }

        await RegisterFichajeAsync(action, dialog.CommentText);
    }

    private async Task RegisterFichajeAsync(UserFichajeAction action, string? comment)
    {
        ShowMessage(string.Empty, false);
        SetBusyState(true);

        var request = new RegisterFichajeRequestDto
        {
            UserId = _loggedUser.UserId,
            Comment = comment
        };

        FichajeOperationResponseDto result = action switch
        {
            UserFichajeAction.Entry => await _apiClient.RegisterEntryAsync(request),
            UserFichajeAction.Pause => await _apiClient.RegisterPauseAsync(request),
            UserFichajeAction.Resume => await _apiClient.RegisterResumeAsync(request),
            UserFichajeAction.Exit => await _apiClient.RegisterExitAsync(request),
            _ => new FichajeOperationResponseDto
            {
                IsSuccess = false,
                Message = "La acción indicada no es válida."
            }
        };

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
        _workedSecondsAtLastSync = summary.WorkedSecondsToday;
        _lastSyncLocalTime = DateTime.Now;
        _lastAutoSyncUtc = DateTime.UtcNow;
        _loadedSummaryDate = DateTime.Today;

        ApplyStatus(summary);
        UpdateLiveMetrics();

        MovementsListBox.ItemsSource = BuildMovementLines(summary);

        UpdateButtons();
    }

    private void UpdateLiveMetrics()
    {
        var workedSeconds = _workedSecondsAtLastSync;

        if (_currentSummary.IsWorking)
        {
            var extraSecondsSinceLastSync = (int)Math.Max(0, (DateTime.Now - _lastSyncLocalTime).TotalSeconds);
            workedSeconds += extraSecondsSinceLastSync;
        }

        var expectedDailySeconds = (int)Math.Max(0, Math.Round(_loggedUser.ExpectedDailyHours * 3600m));
        var extraSeconds = Math.Max(0, workedSeconds - expectedDailySeconds);

        WorkedTodayValueTextBlock.Text = FormatWorkedTime(workedSeconds);

        if (extraSeconds > 0)
        {
            ExtraHoursCardBorder.Visibility = Visibility.Visible;
            ExtraHoursValueTextBlock.Text = FormatWorkedTime(extraSeconds);
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
    }

    private void ApplyStatus(DaySummaryDto summary)
    {
        if (summary.IsWorking)
        {
            StatusBadgeTextBlock.Text = "TRABAJANDO";
            StatusBadgeTextBlock.Foreground = _workingTextBrush;
            StatusBadgeBorder.Background = _workingBackgroundBrush;
            StatusBadgeBorder.BorderBrush = _workingBorderBrush;
            return;
        }

        if (summary.IsPaused)
        {
            StatusBadgeTextBlock.Text = "EN PAUSA";
            StatusBadgeTextBlock.Foreground = _pausedTextBrush;
            StatusBadgeBorder.Background = _pausedBackgroundBrush;
            StatusBadgeBorder.BorderBrush = _pausedBorderBrush;
            return;
        }

        StatusBadgeTextBlock.Text = "FUERA";
        StatusBadgeTextBlock.Foreground = _outsideTextBrush;
        StatusBadgeBorder.Background = _outsideBackgroundBrush;
        StatusBadgeBorder.BorderBrush = _outsideBorderBrush;
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
        ChangeUserButton.IsEnabled = !isBusy;
        UpdateButtons();
    }

    private void UpdateButtons()
    {
        var isOutside = !_currentSummary.IsWorking && !_currentSummary.IsPaused;

        EntryButton.IsEnabled = !_isBusy && isOutside;
        PauseResumeButton.IsEnabled = !_isBusy && (_currentSummary.IsWorking || _currentSummary.IsPaused);
        ExitButton.IsEnabled = !_isBusy && (_currentSummary.IsWorking || _currentSummary.IsPaused);

        PauseResumeButton.Content = _currentSummary.IsPaused ? "Reanudar" : "Pausar";
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

    private enum UserFichajeAction
    {
        Entry,
        Pause,
        Resume,
        Exit
    }
}