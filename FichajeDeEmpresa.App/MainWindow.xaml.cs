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
        ShowMessage(string.Empty, MessageTone.Info);

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
        CurrentSituationTextBlock.Text = "Todavía no has empezado tu jornada.";
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
                ShowMessage(result.Message, MessageTone.Error);
            }

            return;
        }

        ApplySummary(result.Summary);

        if (showSuccess && !string.IsNullOrWhiteSpace(result.Message))
        {
            ShowMessage("Resumen actualizado correctamente.", MessageTone.Info);
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
        ShowMessage(string.Empty, MessageTone.Info);
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

        if (!result.IsSuccess)
        {
            ShowMessage(result.Message, MessageTone.Error);
            return;
        }

        ShowMessage(GetFriendlyActionMessage(action), GetToneForAction(action));
    }

    private void ApplySummary(DaySummaryDto summary)
    {
        _currentSummary = summary;
        _workedSecondsAtLastSync = summary.WorkedSecondsToday;
        _lastSyncLocalTime = DateTime.Now;
        _lastAutoSyncUtc = DateTime.UtcNow;
        _loadedSummaryDate = DateTime.Today;

        ApplyStatus(summary);
        UpdateCurrentSituation(summary);
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
            ExtraHoursHintTextBlock.Text = "Hoy has generado horas extra.";
        }
        else
        {
            ExtraHoursCardBorder.Visibility = Visibility.Collapsed;
            ExtraHoursValueTextBlock.Text = "00:00:00";
            ExtraHoursHintTextBlock.Text = "Hoy has generado horas extra.";
        }
    }

    private void UpdateCurrentSituation(DaySummaryDto summary)
    {
        if (summary.Movements.Count == 0)
        {
            CurrentSituationTextBlock.Text = "Todavía no has empezado tu jornada.";
            return;
        }

        if (summary.IsWorking)
        {
            CurrentSituationTextBlock.Text = "Tu jornada está en curso.";
            return;
        }

        if (summary.IsPaused)
        {
            CurrentSituationTextBlock.Text = "Tu jornada está en pausa.";
            return;
        }

        if (summary.ExtraSecondsToday > 0)
        {
            CurrentSituationTextBlock.Text = "Tu jornada de hoy está cerrada y has generado horas extra.";
            return;
        }

        CurrentSituationTextBlock.Text = "Tu jornada de hoy está cerrada.";
    }

    private void ApplyStatus(DaySummaryDto summary)
    {
        if (summary.IsWorking)
        {
            StatusBadgeTextBlock.Text = "TRABAJANDO";
            StatusBadgeTextBlock.Foreground = GetBrush("SuccessBrush", "#2F7D4A");
            StatusBadgeBorder.Background = GetBrush("SuccessBackgroundBrush", "#EAF7EE");
            StatusBadgeBorder.BorderBrush = GetBrush("SuccessBorderBrush", "#B8DDBF");
            return;
        }

        if (summary.IsPaused)
        {
            StatusBadgeTextBlock.Text = "EN PAUSA";
            StatusBadgeTextBlock.Foreground = GetBrush("WarningBrush", "#A56A00");
            StatusBadgeBorder.Background = GetBrush("WarningBackgroundBrush", "#FFF4D9");
            StatusBadgeBorder.BorderBrush = GetBrush("WarningBorderBrush", "#E9C66B");
            return;
        }

        StatusBadgeTextBlock.Text = "FUERA";
        StatusBadgeTextBlock.Foreground = GetBrush("DangerBrush", "#A33A3A");
        StatusBadgeBorder.Background = GetBrush("DangerBackgroundBrush", "#FDECEC");
        StatusBadgeBorder.BorderBrush = GetBrush("DangerBorderBrush", "#E8B5B5");
    }

    private List<string> BuildMovementLines(DaySummaryDto summary)
    {
        if (summary.Movements.Count == 0)
        {
            return
            [
                "Aún no has registrado movimientos hoy."
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

    private static string GetFriendlyActionMessage(UserFichajeAction action)
    {
        return action switch
        {
            UserFichajeAction.Entry => "Has iniciado tu jornada correctamente.",
            UserFichajeAction.Pause => "Has pausado tu jornada.",
            UserFichajeAction.Resume => "Has reanudado tu jornada.",
            UserFichajeAction.Exit => "Has finalizado tu jornada correctamente.",
            _ => "Acción realizada correctamente."
        };
    }

    private static MessageTone GetToneForAction(UserFichajeAction action)
    {
        return action switch
        {
            UserFichajeAction.Pause => MessageTone.Warning,
            UserFichajeAction.Entry => MessageTone.Success,
            UserFichajeAction.Resume => MessageTone.Success,
            UserFichajeAction.Exit => MessageTone.Success,
            _ => MessageTone.Info
        };
    }

    private static string FormatWorkedTime(int workedSeconds)
    {
        var time = TimeSpan.FromSeconds(workedSeconds);
        return $"{time:hh\\:mm\\:ss}";
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

    private enum MessageTone
    {
        Info,
        Success,
        Warning,
        Error
    }
}