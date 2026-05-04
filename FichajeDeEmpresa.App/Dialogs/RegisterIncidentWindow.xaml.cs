using System;
using System.Windows;

namespace FichajeDeEmpresa.App.Dialogs;

public partial class RegisterIncidentWindow : Window
{
    public DateTime SelectedDate => IncidentDatePicker.SelectedDate?.Date ?? DateTime.Today;

    public string CommentText => CommentTextBox.Text.Trim();

    public RegisterIncidentWindow(string fullName, string userName)
    {
        InitializeComponent();

        SelectedUserTextBlock.Text = $"Empleado: {fullName} ({userName})";
        IncidentDatePicker.SelectedDate = DateTime.Today;
        Loaded += RegisterIncidentWindow_Loaded;
    }

    private void RegisterIncidentWindow_Loaded(object sender, RoutedEventArgs e)
    {
        CommentTextBox.Focus();
    }

    private void SaveButton_Click(object sender, RoutedEventArgs e)
    {
        if (!IncidentDatePicker.SelectedDate.HasValue)
        {
            ShowMessage("Debes indicar una fecha.");
            return;
        }

        if (string.IsNullOrWhiteSpace(CommentTextBox.Text))
        {
            ShowMessage("Debes escribir un comentario.");
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