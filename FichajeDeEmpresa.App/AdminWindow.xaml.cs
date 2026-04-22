using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Windows;
using System.Windows.Media;
using FichajeDeEmpresa.App.Configuration;
using FichajeDeEmpresa.App.Services;
using FichajeDeEmpresa.Shared.Contracts.Auth;
using FichajeDeEmpresa.Shared.Contracts.Fichajes;
using FichajeDeEmpresa.Shared.Contracts.Users;

namespace FichajeDeEmpresa.App;

public partial class AdminWindow : Window
{
    private readonly LoginResponseDto _loggedUser;
    private readonly ApiClient _apiClient = new();

    private readonly Brush _successMessageBackgroundBrush = CreateBrush("#EEF6FF");
    private readonly Brush _successMessageBorderBrush = CreateBrush("#BFD7FF");
    private readonly Brush _successMessageTextBrush = CreateBrush("#1D4F91");

    private readonly Brush _errorMessageBackgroundBrush = CreateBrush("#FDECEC");
    private readonly Brush _errorMessageBorderBrush = CreateBrush("#F2B8B5");
    private readonly Brush _errorMessageTextBrush = CreateBrush("#9F1239");

    private bool _isBusy;

    public AdminWindow(LoginResponseDto loggedUser)
    {
        _loggedUser = loggedUser ?? throw new ArgumentNullException(nameof(loggedUser));

        InitializeComponent();
        WindowState = WindowState.Maximized;

        LoadBranding();
        ConfigureFormDefaults();
        ConfigureHistoryDefaults();
        ShowMessage(string.Empty, false);

        Loaded += AdminWindow_Loaded;
    }

    private async void AdminWindow_Loaded(object sender, RoutedEventArgs e)
    {
        WindowState = WindowState.Maximized;
        await LoadUsersAsync();
        await LoadHistoryAsync();
    }

    private async void RefreshUsersButton_Click(object sender, RoutedEventArgs e)
    {
        await LoadUsersAsync();
    }

    private async void SearchHistoryButton_Click(object sender, RoutedEventArgs e)
    {
        await LoadHistoryAsync();
    }

    private async void CreateUserButton_Click(object sender, RoutedEventArgs e)
    {
        ShowMessage(string.Empty, false);

        if (!TryParseExpectedDailyHours(out var expectedDailyHours))
        {
            ShowMessage("Las horas diarias objetivo no son válidas.", true);
            return;
        }

        var role = RoleComboBox.SelectedItem as string ?? "Empleado";

        var request = new CreateUserRequestDto
        {
            FullName = FullNameTextBox.Text.Trim(),
            UserName = UserNameTextBox.Text.Trim(),
            Password = PasswordTextBox.Password,
            Role = role,
            ExpectedDailyHours = expectedDailyHours
        };

        SetBusyState(true);

        var result = await _apiClient.CreateUserAsync(request);

        SetBusyState(false);

        if (!result.IsSuccess)
        {
            ShowMessage(result.Message, true);
            return;
        }

        ClearForm();
        await LoadUsersAsync();
        ShowMessage(result.Message, false);
    }

    private void ChangeUserButton_Click(object sender, RoutedEventArgs e)
    {
        var loginWindow = new LoginWindow();

        Application.Current.MainWindow = loginWindow;
        loginWindow.Show();

        Close();
    }

    private void LoadBranding()
    {
        Title = $"{BrandingConfiguration.CompanyLegalName} - Administración";

        HeaderCompanyNameTextBlock.Text = BrandingConfiguration.CompanyLegalName;
        HeaderBrandTextBlock.Text = BrandingConfiguration.BrandDisplayName;
        WelcomeTextBlock.Text = $"{GetGreetingForCurrentTime()}, {_loggedUser.FullName}";
        SessionUserNameTextBlock.Text = _loggedUser.FullName;
        SessionRoleTextBlock.Text = $"Rol: {_loggedUser.Role}";
    }

    private void ConfigureFormDefaults()
    {
        RoleComboBox.ItemsSource = new[] { "Empleado", "Admin" };
        RoleComboBox.SelectedIndex = 0;
        ExpectedDailyHoursTextBox.Text = "8";
    }

    private void ConfigureHistoryDefaults()
    {
        FromDatePicker.SelectedDate = DateTime.Today.AddDays(-30);
        ToDatePicker.SelectedDate = DateTime.Today;

        HistoryUserComboBox.ItemsSource = new List<HistoryUserFilterItem>
        {
            new() { DisplayName = "Todos los usuarios", UserId = null }
        };

        HistoryUserComboBox.SelectedIndex = 0;
        HistorySummaryTextBlock.Text = "Sin resultados cargados todavía.";
    }

    private async Task LoadUsersAsync()
    {
        SetBusyState(true);

        var result = await _apiClient.GetUsersAsync();

        SetBusyState(false);

        if (!result.IsSuccess)
        {
            ShowMessage(result.Message, true);
            return;
        }

        UsersListBox.ItemsSource = result.Users;
        UsersCountTextBlock.Text = $"Total usuarios: {result.Users.Count}";

        var filterItems = new List<HistoryUserFilterItem>
        {
            new() { DisplayName = "Todos los usuarios", UserId = null }
        };

        filterItems.AddRange(result.Users.Select(u => new HistoryUserFilterItem
        {
            UserId = u.UserId,
            DisplayName = $"{u.FullName} ({u.UserName})"
        }));

        var selectedUserId = (HistoryUserComboBox.SelectedItem as HistoryUserFilterItem)?.UserId;

        HistoryUserComboBox.ItemsSource = filterItems;

        var selectedItem = filterItems.FirstOrDefault(i => i.UserId == selectedUserId)
                           ?? filterItems.First();

        HistoryUserComboBox.SelectedItem = selectedItem;
    }

    private async Task LoadHistoryAsync()
    {
        if (!FromDatePicker.SelectedDate.HasValue || !ToDatePicker.SelectedDate.HasValue)
        {
            ShowMessage("Debes indicar la fecha desde y la fecha hasta.", true);
            return;
        }

        var fromDate = FromDatePicker.SelectedDate.Value.Date;
        var toDate = ToDatePicker.SelectedDate.Value.Date;

        if (fromDate > toDate)
        {
            ShowMessage("La fecha desde no puede ser mayor que la fecha hasta.", true);
            return;
        }

        var selectedFilter = HistoryUserComboBox.SelectedItem as HistoryUserFilterItem;
        var selectedUserId = selectedFilter?.UserId;

        SetBusyState(true);

        var result = await _apiClient.GetFichajeHistoryAsync(selectedUserId, fromDate, toDate);

        SetBusyState(false);

        if (!result.IsSuccess)
        {
            ShowMessage(result.Message, true);
            return;
        }

        var displayItems = result.Days
            .Select(BuildHistoryDisplayItem)
            .ToList();

        HistoryListBox.ItemsSource = displayItems;

        var totalWorkedSeconds = result.Days.Sum(d => d.WorkedSeconds);
        var totalExtraSeconds = result.Days.Sum(d => d.ExtraSeconds);

        HistorySummaryTextBlock.Text =
            $"Resultados: {result.Days.Count} jornadas · " +
            $"Trabajado total: {FormatWorkedTime(totalWorkedSeconds)} · " +
            $"Horas extra totales: {FormatWorkedTime(totalExtraSeconds)}";
    }

    private static HistoryDisplayItem BuildHistoryDisplayItem(AdminFichajeHistoryDayDto day)
    {
        var summary =
            $"Usuario: {day.FullName} ({day.UserName}) · " +
            $"Fecha: {day.Date:dd/MM/yyyy} · " +
            $"Trabajado: {FormatWorkedTime(day.WorkedSeconds)} · " +
            $"Normales: {FormatWorkedTime(day.NormalSeconds)} · " +
            $"Extra: {FormatWorkedTime(day.ExtraSeconds)}";

        if (day.IsWorking)
        {
            summary += " · Jornada abierta";
        }

        var movementLines = day.Movements.Count == 0
            ? new List<string> { "No hay movimientos registrados en esta jornada." }
            : day.Movements.Select(BuildMovementLine).ToList();

        return new HistoryDisplayItem
        {
            Title = $"{day.Date:dd/MM/yyyy} · {day.FullName}",
            Summary = summary,
            MovementLines = movementLines
        };
    }

    private static string BuildMovementLine(FichajeMovementDto movement)
    {
        var text = $"{movement.Timestamp:HH:mm:ss} · {movement.Type}";

        if (!string.IsNullOrWhiteSpace(movement.Comment))
        {
            text += $" · Comentario: {movement.Comment}";
        }

        return text;
    }

    private bool TryParseExpectedDailyHours(out decimal expectedDailyHours)
    {
        var rawText = ExpectedDailyHoursTextBox.Text.Trim().Replace(',', '.');

        return decimal.TryParse(
            rawText,
            NumberStyles.Number,
            CultureInfo.InvariantCulture,
            out expectedDailyHours);
    }

    private void ClearForm()
    {
        FullNameTextBox.Text = string.Empty;
        UserNameTextBox.Text = string.Empty;
        PasswordTextBox.Password = string.Empty;
        RoleComboBox.SelectedIndex = 0;
        ExpectedDailyHoursTextBox.Text = "8";
        FullNameTextBox.Focus();
    }

    private void SetBusyState(bool isBusy)
    {
        _isBusy = isBusy;

        RefreshUsersButton.IsEnabled = !isBusy;
        ChangeUserButton.IsEnabled = !isBusy;
        CreateUserButton.IsEnabled = !isBusy;
        SearchHistoryButton.IsEnabled = !isBusy;

        FullNameTextBox.IsEnabled = !isBusy;
        UserNameTextBox.IsEnabled = !isBusy;
        PasswordTextBox.IsEnabled = !isBusy;
        RoleComboBox.IsEnabled = !isBusy;
        ExpectedDailyHoursTextBox.IsEnabled = !isBusy;

        HistoryUserComboBox.IsEnabled = !isBusy;
        FromDatePicker.IsEnabled = !isBusy;
        ToDatePicker.IsEnabled = !isBusy;
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

    private static SolidColorBrush CreateBrush(string hexColor)
    {
        return (SolidColorBrush)new BrushConverter().ConvertFromString(hexColor)!;
    }

    private sealed class HistoryUserFilterItem
    {
        public int? UserId { get; set; }

        public string DisplayName { get; set; } = string.Empty;
    }

    private sealed class HistoryDisplayItem
    {
        public string Title { get; set; } = string.Empty;

        public string Summary { get; set; } = string.Empty;

        public List<string> MovementLines { get; set; } = [];
    }
}