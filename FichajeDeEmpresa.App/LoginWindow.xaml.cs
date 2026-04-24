using System;
using System.Windows;
using System.Windows.Media;
using FichajeDeEmpresa.App.Configuration;
using FichajeDeEmpresa.App.Services;
using FichajeDeEmpresa.Shared.Contracts.Auth;

namespace FichajeDeEmpresa.App;

public partial class LoginWindow : Window
{
    private readonly ApiClient _apiClient = new();

    public LoginWindow()
    {
        InitializeComponent();
        LoadBranding();
        ShowStatus(string.Empty, false);
    }

    private void LoadBranding()
    {
        Title = $"{BrandingConfiguration.CompanyLegalName} - Inicio de sesión";

        CompanyNameTextBlock.Text = BrandingConfiguration.CompanyLegalName;
        BrandNameTextBlock.Text = BrandingConfiguration.BrandDisplayName;
        WelcomeMessageTextBlock.Text = BrandingConfiguration.MainWelcomeMessage;
    }

    private async void LoginButton_Click(object sender, RoutedEventArgs e)
    {
        var userName = UserNameTextBox.Text.Trim();
        var password = PasswordBox.Password;

        if (string.IsNullOrWhiteSpace(userName))
        {
            ShowStatus("Debes introducir el usuario.", true);
            UserNameTextBox.Focus();
            return;
        }

        if (string.IsNullOrWhiteSpace(password))
        {
            ShowStatus("Debes introducir la contraseña.", true);
            PasswordBox.Focus();
            return;
        }

        SetBusyState(true);
        ShowStatus("Validando acceso...", false);

        var result = await _apiClient.LoginAsync(new LoginRequestDto
        {
            UserName = userName,
            Password = password
        });

        SetBusyState(false);

        if (!result.IsSuccess)
        {
            ShowStatus(result.Message, true);
            return;
        }

        ShowStatus("Acceso correcto.", false);

        Window nextWindow = string.Equals(result.Role, "Admin", StringComparison.OrdinalIgnoreCase)
            ? new AdminWindow(result)
            : new MainWindow(result);

        Application.Current.MainWindow = nextWindow;
        nextWindow.Show();
        Close();
    }

    private void SetBusyState(bool isBusy)
    {
        UserNameTextBox.IsEnabled = !isBusy;
        PasswordBox.IsEnabled = !isBusy;
        LoginButton.IsEnabled = !isBusy;
        LoginButton.Content = isBusy ? "Validando..." : "Iniciar sesión";
    }

    private void ShowStatus(string message, bool isError)
    {
        if (string.IsNullOrWhiteSpace(message))
        {
            StatusTextBlock.Text = string.Empty;
            StatusBorder.Visibility = Visibility.Collapsed;
            return;
        }

        StatusTextBlock.Text = message;
        StatusBorder.Visibility = Visibility.Visible;

        if (isError)
        {
            StatusBorder.Background = GetBrush("DangerBackgroundBrush", "#FDECEC");
            StatusBorder.BorderBrush = GetBrush("DangerBorderBrush", "#E8B5B5");
            StatusTextBlock.Foreground = GetBrush("DangerBrush", "#A33A3A");
        }
        else
        {
            StatusBorder.Background = GetBrush("InfoBackgroundBrush", "#FFF8E1");
            StatusBorder.BorderBrush = GetBrush("InfoBorderBrush", "#E8D089");
            StatusTextBlock.Foreground = GetBrush("InfoBrush", "#7B5B12");
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
}