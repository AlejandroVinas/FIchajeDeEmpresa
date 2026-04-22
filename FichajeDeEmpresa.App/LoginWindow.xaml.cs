using System;
using System.Windows;
using System.Windows.Input;
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
        ApplyBranding();
        Loaded += LoginWindow_Loaded;
    }

    private void ApplyBranding()
    {
        Title = $"{BrandingConfiguration.CompanyLegalName} - Inicio de sesión";
        CompanyNameTextBlock.Text = BrandingConfiguration.CompanyLegalName;
        BrandNameTextBlock.Text = BrandingConfiguration.BrandDisplayName;
        WelcomeMessageTextBlock.Text = BrandingConfiguration.LoginWelcomeMessage;
    }

    private void LoginWindow_Loaded(object sender, RoutedEventArgs e)
    {
        UserNameTextBox.Focus();
    }

    private async void LoginButton_Click(object sender, RoutedEventArgs e)
    {
        await ExecuteLoginAsync();
    }

    private async void PasswordBox_KeyDown(object sender, KeyEventArgs e)
    {
        if (e.Key == Key.Enter)
        {
            await ExecuteLoginAsync();
        }
    }

    private async Task ExecuteLoginAsync()
    {
        ShowStatus(string.Empty, false);

        var request = new LoginRequestDto
        {
            UserName = UserNameTextBox.Text.Trim(),
            Password = PasswordBox.Password
        };

        SetBusyState(true);

        var result = await _apiClient.LoginAsync(request);

        SetBusyState(false);

        if (!result.IsSuccess)
        {
            ShowStatus(result.Message, true);
            return;
        }

        Window nextWindow = IsAdminRole(result.Role)
            ? new AdminWindow(result)
            : new MainWindow(result);

        Application.Current.MainWindow = nextWindow;
        nextWindow.Show();

        Close();
    }

    private void SetBusyState(bool isBusy)
    {
        LoginButton.IsEnabled = !isBusy;
        UserNameTextBox.IsEnabled = !isBusy;
        PasswordBox.IsEnabled = !isBusy;

        LoginButton.Content = isBusy ? "Conectando..." : "Iniciar sesión";
    }

    private void ShowStatus(string message, bool isError)
    {
        if (string.IsNullOrWhiteSpace(message))
        {
            StatusBorder.Visibility = Visibility.Collapsed;
            StatusTextBlock.Text = string.Empty;
            return;
        }

        StatusBorder.Visibility = Visibility.Visible;
        StatusTextBlock.Text = message;

        if (isError)
        {
            StatusBorder.Background = (System.Windows.Media.Brush)new System.Windows.Media.BrushConverter().ConvertFromString("#FDECEC")!;
            StatusBorder.BorderBrush = (System.Windows.Media.Brush)new System.Windows.Media.BrushConverter().ConvertFromString("#F2B8B5")!;
            StatusTextBlock.Foreground = (System.Windows.Media.Brush)new System.Windows.Media.BrushConverter().ConvertFromString("#9F1239")!;
        }
        else
        {
            StatusBorder.Background = (System.Windows.Media.Brush)new System.Windows.Media.BrushConverter().ConvertFromString("#EEF6FF")!;
            StatusBorder.BorderBrush = (System.Windows.Media.Brush)new System.Windows.Media.BrushConverter().ConvertFromString("#BFD7FF")!;
            StatusTextBlock.Foreground = (System.Windows.Media.Brush)new System.Windows.Media.BrushConverter().ConvertFromString("#1D4F91")!;
        }
    }

    private static bool IsAdminRole(string? role)
    {
        return !string.IsNullOrWhiteSpace(role) &&
               role.Equals("Admin", StringComparison.OrdinalIgnoreCase);
    }
}