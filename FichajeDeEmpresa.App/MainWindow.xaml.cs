using System.Windows;
using System.Windows.Input;
using FichajeDeEmpresa.App.Services;
using FichajeDeEmpresa.Shared.Contracts.Auth;

namespace FichajeDeEmpresa.App;

public partial class MainWindow : Window
{
    private readonly ApiClient _apiClient = new();

    public MainWindow()
    {
        InitializeComponent();
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
        StatusTextBlock.Text = string.Empty;

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
            StatusTextBlock.Text = result.Message;
            return;
        }

        MessageBox.Show(
            $"Bienvenida/o {result.FullName}\n" +
            $"Rol: {result.Role}\n" +
            $"Horas diarias configuradas: {result.ExpectedDailyHours:0.##}",
            "Login correcto",
            MessageBoxButton.OK,
            MessageBoxImage.Information);

        StatusTextBlock.Text = result.Message;
    }

    private void SetBusyState(bool isBusy)
    {
        LoginButton.IsEnabled = !isBusy;
        UserNameTextBox.IsEnabled = !isBusy;
        PasswordBox.IsEnabled = !isBusy;

        LoginButton.Content = isBusy ? "Conectando..." : "Iniciar sesión";
    }
}