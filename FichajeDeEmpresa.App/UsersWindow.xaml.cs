using System.Collections.Generic;
using System.Linq;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Media;
using FichajeDeEmpresa.App.Services;
using FichajeDeEmpresa.Shared.Contracts.Users;

namespace FichajeDeEmpresa.App;

public partial class UsersWindow : Window
{
    private readonly ApiClient _apiClient = new();
    private readonly List<UserSummaryDto> _allUsers = [];
    private bool _isBusy;

    public UsersWindow()
    {
        InitializeComponent();
        Loaded += UsersWindow_Loaded;
    }

    private async void UsersWindow_Loaded(object sender, RoutedEventArgs e)
    {
        await LoadUsersAsync();
        UpdateActionButtons();
    }

    private async void RefreshButton_Click(object sender, RoutedEventArgs e)
    {
        await LoadUsersAsync();
    }

    private void SearchTextBox_TextChanged(object sender, TextChangedEventArgs e)
    {
        ApplyUserFilter();
    }

    private void UsersListBox_SelectionChanged(object sender, SelectionChangedEventArgs e)
    {
        UpdateActionButtons();
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

    private async void ToggleActiveUserButton_Click(object sender, RoutedEventArgs e)
    {
        if (UsersListBox.SelectedItem is not UserSummaryDto selectedUser)
        {
            ShowMessage("Selecciona un usuario.", true);
            return;
        }

        var result = selectedUser.IsActive
            ? MessageBox.Show(
                $"¿Quieres desactivar a '{selectedUser.FullName}'?",
                "Desactivar usuario",
                MessageBoxButton.YesNo,
                MessageBoxImage.Question)
            : MessageBox.Show(
                $"¿Quieres reactivar a '{selectedUser.FullName}'?",
                "Reactivar usuario",
                MessageBoxButton.YesNo,
                MessageBoxImage.Question);

        if (result != MessageBoxResult.Yes)
        {
            return;
        }

        SetBusyState(true);
        ShowMessage(string.Empty, false);

        var response = selectedUser.IsActive
            ? await _apiClient.DeactivateUserAsync(selectedUser.UserId)
            : await _apiClient.ActivateUserAsync(selectedUser.UserId);

        SetBusyState(false);

        if (!response.IsSuccess)
        {
            ShowMessage(response.Message, true);
            return;
        }

        await LoadUsersAsync();
        ShowMessage(response.Message, false);
    }

    private async void DeleteSelectedUserButton_Click(object sender, RoutedEventArgs e)
    {
        if (UsersListBox.SelectedItem is not UserSummaryDto selectedUser)
        {
            ShowMessage("Selecciona un usuario para borrarlo.", true);
            return;
        }

        var result = MessageBox.Show(
            $"¿Seguro que quieres borrar a '{selectedUser.FullName}'?\n\nEsta acción solo debería usarse para usuarios creados por error o sin historial.",
            "Borrar usuario",
            MessageBoxButton.YesNo,
            MessageBoxImage.Warning);

        if (result != MessageBoxResult.Yes)
        {
            return;
        }

        SetBusyState(true);
        ShowMessage(string.Empty, false);

        var response = await _apiClient.DeleteUserAsync(selectedUser.UserId);

        SetBusyState(false);

        if (!response.IsSuccess)
        {
            ShowMessage(response.Message, true);
            return;
        }

        await LoadUsersAsync();
        ShowMessage(response.Message, false);
    }

    private async Task LoadUsersAsync()
    {
        SetBusyState(true);
        ShowMessage(string.Empty, false);

        var result = await _apiClient.GetUsersAsync();

        SetBusyState(false);

        if (!result.IsSuccess)
        {
            _allUsers.Clear();
            UsersListBox.ItemsSource = null;
            UsersCountTextBlock.Text = "Total usuarios: 0";
            EmptyStateBorder.Visibility = Visibility.Collapsed;
            UpdateActionButtons();
            ShowMessage(result.Message, true);
            return;
        }

        _allUsers.Clear();
        _allUsers.AddRange(result.Users);
        ApplyUserFilter();
    }

    private void ApplyUserFilter()
    {
        var query = SearchTextBox.Text.Trim();

        var filteredUsers = string.IsNullOrWhiteSpace(query)
            ? _allUsers
                .Select(CloneForDisplay)
                .ToList()
            : _allUsers
                .Where(user =>
                    Contains(user.FullName, query) ||
                    Contains(user.UserName, query) ||
                    Contains(user.Role, query) ||
                    Contains(user.IsActive ? "Activo" : "Inactivo", query) ||
                    Contains(user.ExpectedDailyHours.ToString("0.##"), query))
                .Select(CloneForDisplay)
                .ToList();

        UsersListBox.ItemsSource = filteredUsers;
        EmptyStateBorder.Visibility = filteredUsers.Count == 0 ? Visibility.Visible : Visibility.Collapsed;

        UsersCountTextBlock.Text = string.IsNullOrWhiteSpace(query)
            ? $"Total usuarios: {_allUsers.Count}"
            : $"Mostrando {filteredUsers.Count} de {_allUsers.Count} usuarios";

        UpdateActionButtons();
    }

    private static UserSummaryDto CloneForDisplay(UserSummaryDto user)
    {
        return new UserSummaryDto
        {
            UserId = user.UserId,
            FullName = user.FullName,
            UserName = user.UserName,
            Role = user.Role,
            ExpectedDailyHours = user.ExpectedDailyHours,
            IsActive = user.IsActive
        };
    }

    private static bool Contains(string? source, string query)
    {
        return !string.IsNullOrWhiteSpace(source) &&
               source.Contains(query, System.StringComparison.OrdinalIgnoreCase);
    }

    private void UpdateActionButtons()
    {
        var selectedUser = UsersListBox.SelectedItem as UserSummaryDto;
        var hasSelection = selectedUser is not null;

        EditSelectedUserButton.IsEnabled = !_isBusy && hasSelection;
        DeleteSelectedUserButton.IsEnabled = !_isBusy && hasSelection;
        ToggleActiveUserButton.IsEnabled = !_isBusy && hasSelection;

        if (selectedUser is null)
        {
            ToggleActiveUserButton.Content = "Desactivar";
            return;
        }

        ToggleActiveUserButton.Content = selectedUser.IsActive ? "Desactivar" : "Reactivar";
    }

    private void SetBusyState(bool isBusy)
    {
        _isBusy = isBusy;
        RefreshButton.IsEnabled = !isBusy;
        OpenCreateUserButton.IsEnabled = !isBusy;
        SearchTextBox.IsEnabled = !isBusy;
        UsersListBox.IsEnabled = !isBusy;
        UpdateActionButtons();
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