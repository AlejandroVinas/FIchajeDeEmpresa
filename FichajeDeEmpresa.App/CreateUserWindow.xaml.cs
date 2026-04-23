using System.Globalization;
using System.Windows;
using FichajeDeEmpresa.App.Services;
using FichajeDeEmpresa.Shared.Contracts.Users;

namespace FichajeDeEmpresa.App;

public partial class CreateUserWindow : Window
{
    private readonly ApiClient _apiClient = new();

    private bool _isBusy;

    public CreateUserWindow()
    {
        InitializeComponent();
        ConfigureDefaults();
        Loaded += CreateUserWindow_Loaded;
    }

    private void CreateUserWindow_Loaded(object sender, RoutedEventArgs e)
    {
        FullNameTextBox.Focus();
    }

    private void ConfigureDefaults()
    {
        RoleComboBox.ItemsSource = new[] { "Empleado", "Admin" };
        RoleComboBox.SelectedIndex = 0;
        ExpectedDailyHoursTextBox.Text = "8";
    }

    private async void CreateUserButton_Click(object sender, RoutedEventArgs e)
    {
        ShowMessage(string.Empty);

        if (!TryParseExpectedDailyHours(out var expectedDailyHours))
        {
            ShowMessage("Las horas diarias objetivo no son válidas.");
            return;
        }

        var request = new CreateUserRequestDto
        {
            FullName = FullNameTextBox.Text.Trim(),
            UserName = UserNameTextBox.Text.Trim(),
            Password = PasswordTextBox.Password,
            Role = RoleComboBox.SelectedItem as string ?? "Empleado",
            ExpectedDailyHours = expectedDailyHours
        };

        SetBusyState(true);

        var result = await _apiClient.CreateUserAsync(request);

        SetBusyState(false);

        if (!result.IsSuccess)
        {
            ShowMessage(result.Message);
            return;
        }

        DialogResult = true;
    }

    private void CloseButton_Click(object sender, RoutedEventArgs e)
    {
        Close();
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

    private void SetBusyState(bool isBusy)
    {
        _isBusy = isBusy;

        FullNameTextBox.IsEnabled = !isBusy;
        UserNameTextBox.IsEnabled = !isBusy;
        PasswordTextBox.IsEnabled = !isBusy;
        RoleComboBox.IsEnabled = !isBusy;
        ExpectedDailyHoursTextBox.IsEnabled = !isBusy;
        CreateUserButton.IsEnabled = !isBusy;
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
}