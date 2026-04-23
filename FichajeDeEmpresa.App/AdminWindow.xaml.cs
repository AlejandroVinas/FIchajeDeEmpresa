using System;
using System.Windows;
using FichajeDeEmpresa.App.Configuration;
using FichajeDeEmpresa.Shared.Contracts.Auth;

namespace FichajeDeEmpresa.App;

public partial class AdminWindow : Window
{
    private readonly LoginResponseDto _loggedUser;

    public AdminWindow(LoginResponseDto loggedUser)
    {
        _loggedUser = loggedUser ?? throw new ArgumentNullException(nameof(loggedUser));

        InitializeComponent();
        WindowState = WindowState.Maximized;

        LoadBranding();
        Loaded += AdminWindow_Loaded;
    }

    private void AdminWindow_Loaded(object sender, RoutedEventArgs e)
    {
        WindowState = WindowState.Maximized;
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

    private void OpenUsersButton_Click(object sender, RoutedEventArgs e)
    {
        var window = new UsersWindow
        {
            Owner = this
        };

        window.ShowDialog();
    }

    private void OpenHistoryButton_Click(object sender, RoutedEventArgs e)
    {
        var window = new FichajeHistoryWindow
        {
            Owner = this
        };

        window.ShowDialog();
    }

    private void ChangeUserButton_Click(object sender, RoutedEventArgs e)
    {
        var loginWindow = new LoginWindow();

        Application.Current.MainWindow = loginWindow;
        loginWindow.Show();

        Close();
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