using System;
using System.Windows;
using FichajeDeEmpresa.Shared.Contracts.Auth;

namespace FichajeDeEmpresa.App;

public partial class MainWindow : Window
{
    private readonly LoginResponseDto _loggedUser;

    public MainWindow(LoginResponseDto loggedUser)
    {
        _loggedUser = loggedUser ?? throw new ArgumentNullException(nameof(loggedUser));

        InitializeComponent();
        LoadUserData();
    }

    private void LoadUserData()
    {
        WelcomeTextBlock.Text = $"Bienvenido/a, {_loggedUser.FullName}";
        UserIdValueTextBlock.Text = _loggedUser.UserId.ToString();
        FullNameValueTextBlock.Text = _loggedUser.FullName;
        RoleValueTextBlock.Text = _loggedUser.Role;
        ExpectedDailyHoursValueTextBlock.Text = $"{_loggedUser.ExpectedDailyHours:0.##} horas/día";
    }
}