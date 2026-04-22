using System.Windows;
using System.Windows.Input;

namespace FichajeDeEmpresa.App.Dialogs;

public partial class FichajeCommentWindow : Window
{
    public string? CommentText { get; private set; }

    public FichajeCommentWindow(string actionName)
    {
        InitializeComponent();

        var safeActionName = string.IsNullOrWhiteSpace(actionName)
            ? "fichaje"
            : actionName.Trim();

        Title = $"Comentario opcional - {safeActionName}";
        ActionTextBlock.Text =
            $"Vas a registrar una {safeActionName}. Si quieres, escribe un comentario antes de continuar.";
        ConfirmButton.Content = $"Fichar {safeActionName}";

        Loaded += FichajeCommentWindow_Loaded;
    }

    private void FichajeCommentWindow_Loaded(object sender, RoutedEventArgs e)
    {
        CommentTextBox.Focus();
        Keyboard.Focus(CommentTextBox);
        CommentTextBox.CaretIndex = CommentTextBox.Text.Length;
    }

    private void ConfirmButton_Click(object sender, RoutedEventArgs e)
    {
        var text = CommentTextBox.Text.Trim();
        CommentText = string.IsNullOrWhiteSpace(text) ? null : text;
        DialogResult = true;
    }
}