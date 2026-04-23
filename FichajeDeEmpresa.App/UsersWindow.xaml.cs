using System.Windows;
using System.Windows.Media;
using FichajeDeEmpresa.App.Services;

namespace FichajeDeEmpresa.App;

public partial class UsersWindow : Window
{
    private readonly ApiClient _apiClient = new();

    private readonly Brush _successMessageBackgroundBrush = CreateBrush("#EEF6FF");
    private readonly Brush _successMessageBorderBrush = CreateBrush("#BFD7FF");
    private readonly Brush _successMessageTextBrush = CreateBrush("#1D4F91");

    private readonly Brush _errorMessageBackgroundBrush = CreateBrush("#FDECEC");
    private readonly Brush _errorMessageBorderBrush = CreateBrush("#F2B8B5");
    private readonly Brush _errorMessageTextBrush = CreateBrush("#9F1239");

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
        var window = new CreateUserWindow
        {
            Owner = this
        };

        var result = window.ShowDialog();

        if (result == true)
        {
            await LoadUsersAsync();
            ShowMessage("Usuario creado correctamente.", false);
        }
    }

    private async Task LoadUsersAsync()
    {
        ShowMessage(string.Empty, false);
        SetBusyState(true);

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

    private static SolidColorBrush CreateBrush(string hexColor)
    {
        return (SolidColorBrush)new BrushConverter().ConvertFromString(hexColor)!;
    }
}