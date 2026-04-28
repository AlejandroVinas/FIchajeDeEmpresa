using System.Windows;

namespace FichajeDeEmpresa.App.Dialogs;

public partial class ConfirmDeleteUserWindow : Window
{
    public ConfirmDeleteUserWindow(string fullName, string userName)
    {
        InitializeComponent();
        UserInfoTextBlock.Text = $"Usuario: {fullName} ({userName})";
        DeleteKeywordTextBox.Focus();
        DeleteKeywordTextBox.SelectAll();
    }

    private void ConfirmButton_Click(object sender, RoutedEventArgs e)
    {
        var keyword = DeleteKeywordTextBox.Text.Trim();

        if (!string.Equals(keyword, "BORRAR", System.StringComparison.OrdinalIgnoreCase))
        {
            ShowMessage("Debes escribir BORRAR para confirmar.");
            return;
        }

        DialogResult = true;
        Close();
    }

    private void CancelButton_Click(object sender, RoutedEventArgs e)
    {
        DialogResult = false;
        Close();
    }

    private void ShowMessage(string message)
    {
        MessageBorder.Visibility = Visibility.Visible;
        MessageTextBlock.Text = message;
    }
}