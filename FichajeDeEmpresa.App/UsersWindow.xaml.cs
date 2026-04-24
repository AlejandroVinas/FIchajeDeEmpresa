using System.Windows;
using System.Windows.Media;
using FichajeDeEmpresa.App.Services;
using FichajeDeEmpresa.Shared.Contracts.Users;

namespace FichajeDeEmpresa.App;

public partial class UsersWindow : Window
{
    private readonly ApiClient _apiClient = new();
    private bool _isBusy;

    public UsersWindow()
    {
        InitializeComponent();
        Loaded += UsersWindow_Loaded;
    }

    private async void UsersWindow_Loaded(object sender, RoutedEventArgs e)
    {
        await LoadUsersAsync();
    }

    private async void RefreshButton_Click(object sender, RoutedEventArgs e)
    {
        await LoadUsersAsync();
    }

    private async void OpenCreateUserButton_Click(object sender, RoutedEventArgs e)
    {
        var createWindow = new CreateUserWindow
        {
            Owner = this
        };

        createWindow.ShowDialog();
        await LoadUsersAsync();
    }

    private async void EditSelectedUserButton_Click(object sender, RoutedEventArgs e)
    {
        if (UsersListBox.SelectedItem is not UserSummaryDto selectedUser)
        {
            ShowMessage("Selecciona un usuario para editarlo.", true);
            return;
        }

        var editWindow = new EditUserWindow(selectedUser)
        {
            Owner = this
        };

        var result = editWindow.ShowDialog();

        if (result == true)
        {
            await LoadUsersAsync();
            ShowMessage("Usuario actualizado correctamente.", false);
        }
    }

    private async Task LoadUsersAsync()
    {
        SetBusyState(true);
        ShowMessage(string.Empty, false);

        var result = await _apiClient.GetUsersAsync();

        SetBusyState(false);

        if (!result.IsSuccess)
        {
            UsersListBox.ItemsSource = null;
            UsersCountTextBlock.Text = "Total usuarios: 0";
            EmptyStateBorder.Visibility = Visibility.Collapsed;
            ShowMessage(result.Message, true);
            return;
        }

        UsersListBox.ItemsSource = result.Users;
        UsersCountTextBlock.Text = $"Total usuarios: {result.Users.Count}";
        EmptyStateBorder.Visibility = result.Users.Count == 0 ? Visibility.Visible : Visibility.Collapsed;
    }

    private void SetBusyState(bool isBusy)
    {
        _isBusy = isBusy;
        RefreshButton.IsEnabled = !isBusy;
        OpenCreateUserButton.IsEnabled = !isBusy;
        EditSelectedUserButton.IsEnabled = !isBusy;
        UsersListBox.IsEnabled = !isBusy;
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
            MessageBorder.Background = GetBrush("DangerBackgroundBrush", "#FDECEC");
            MessageBorder.BorderBrush = GetBrush("DangerBorderBrush", "#E8B5B5");
            MessageTextBlock.Foreground = GetBrush("DangerBrush", "#A33A3A");
        }
        else
        {
            MessageBorder.Background = GetBrush("InfoBackgroundBrush", "#FFF8E1");
            MessageBorder.BorderBrush = GetBrush("InfoBorderBrush", "#E8D089");
            MessageTextBlock.Foreground = GetBrush("InfoBrush", "#7B5B12");
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