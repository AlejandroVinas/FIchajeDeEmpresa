using System.Globalization;
using System.Windows;
using FichajeDeEmpresa.App.Services;
using FichajeDeEmpresa.Shared.Contracts.Users;

namespace FichajeDeEmpresa.App;

public partial class EditUserWindow : Window
{
    private readonly ApiClient _apiClient = new();
    private readonly UserSummaryDto _user;

    public EditUserWindow(UserSummaryDto user)
    {
        _user = user;

        InitializeComponent();
        LoadUserData();
    }

    private void LoadUserData()
    {
        Title = $"Editar usuario - {_user.UserName}";

        RoleComboBox.Items.Clear();
        RoleComboBox.Items.Add("Admin");
        RoleComboBox.Items.Add("User");

        FullNameTextBox.Text = _user.FullName;
        UserNameTextBox.Text = _user.UserName;
        RoleComboBox.SelectedItem = string.Equals(_user.Role, "Admin", StringComparison.OrdinalIgnoreCase)
            ? "Admin"
            : "User";
        ExpectedDailyHoursTextBox.Text = _user.ExpectedDailyHours.ToString("0.##", CultureInfo.InvariantCulture);

        ShowMessage(string.Empty, false);
    }

    private async void SaveButton_Click(object sender, RoutedEventArgs e)
    {
        var fullName = FullNameTextBox.Text.Trim();
        var userName = UserNameTextBox.Text.Trim();
        var password = PasswordTextBox.Password;
        var role = RoleComboBox.SelectedItem?.ToString() ?? string.Empty;
        var expectedDailyHoursText = ExpectedDailyHoursTextBox.Text.Trim();

        if (string.IsNullOrWhiteSpace(fullName))
        {
            ShowMessage("Debes indicar el nombre completo.", true);
            return;
        }

        if (string.IsNullOrWhiteSpace(userName))
        {
            ShowMessage("Debes indicar el nombre de usuario.", true);
            return;
        }

        if (string.IsNullOrWhiteSpace(role))
        {
            ShowMessage("Debes indicar el rol.", true);
            return;
        }

        if (!decimal.TryParse(expectedDailyHoursText, NumberStyles.Number, CultureInfo.InvariantCulture, out var expectedDailyHours))
        {
            if (!decimal.TryParse(expectedDailyHoursText, out expectedDailyHours))
            {
                ShowMessage("Las horas diarias no tienen un formato válido.", true);
                return;
            }
        }

        if (expectedDailyHours <= 0)
        {
            ShowMessage("Las horas diarias deben ser mayores que cero.", true);
            return;
        }

        SetBusyState(true);
        ShowMessage(string.Empty, false);

        var result = await _apiClient.UpdateUserAsync(_user.UserId, new UpdateUserRequestDto
        {
            FullName = fullName,
            UserName = userName,
            Password = string.IsNullOrWhiteSpace(password) ? null : password,
            Role = role,
            ExpectedDailyHours = expectedDailyHours
        });

        SetBusyState(false);

        if (!result.IsSuccess)
        {
            ShowMessage(result.Message, true);
            return;
        }

        DialogResult = true;
        Close();
    }

    private void CloseButton_Click(object sender, RoutedEventArgs e)
    {
        Close();
    }

    private void SetBusyState(bool isBusy)
    {
        FullNameTextBox.IsEnabled = !isBusy;
        UserNameTextBox.IsEnabled = !isBusy;
        PasswordTextBox.IsEnabled = !isBusy;
        RoleComboBox.IsEnabled = !isBusy;
        ExpectedDailyHoursTextBox.IsEnabled = !isBusy;
        SaveButton.IsEnabled = !isBusy;
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
            MessageBorder.Background = (System.Windows.Media.Brush)FindResource("DangerBackgroundBrush");
            MessageBorder.BorderBrush = (System.Windows.Media.Brush)FindResource("DangerBorderBrush");
            MessageTextBlock.Foreground = (System.Windows.Media.Brush)FindResource("DangerBrush");
        }
        else
        {
            MessageBorder.Background = (System.Windows.Media.Brush)FindResource("InfoBackgroundBrush");
            MessageBorder.BorderBrush = (System.Windows.Media.Brush)FindResource("InfoBorderBrush");
            MessageTextBlock.Foreground = (System.Windows.Media.Brush)FindResource("InfoBrush");
        }
    }
}