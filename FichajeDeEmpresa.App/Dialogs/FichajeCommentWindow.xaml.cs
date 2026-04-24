using System.Windows;
using System.Windows.Input;

namespace FichajeDeEmpresa.App.Dialogs;

public partial class FichajeCommentWindow : Window
{
    public string? CommentText { get; private set; }

    public FichajeCommentWindow(string actionName)
    {
        InitializeComponent();

        var normalizedAction = NormalizeAction(actionName);

        Title = normalizedAction.WindowTitle;
        ActionTextBlock.Text = normalizedAction.Description;
        ConfirmButton.Content = normalizedAction.ButtonText;

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

    private static CommentWindowTexts NormalizeAction(string actionName)
    {
        var value = actionName?.Trim().ToLowerInvariant() ?? string.Empty;

        return value switch
        {
            "entrada" => new CommentWindowTexts
            {
                WindowTitle = "Comentario opcional - entrada",
                Description = "Vas a registrar una entrada. Si quieres, escribe un comentario antes de continuar.",
                ButtonText = "Fichar entrada"
            },
            "pausa" => new CommentWindowTexts
            {
                WindowTitle = "Comentario opcional - pausa",
                Description = "Vas a registrar una pausa. Si quieres, escribe un comentario antes de continuar.",
                ButtonText = "Registrar pausa"
            },
            "reanudar" => new CommentWindowTexts
            {
                WindowTitle = "Comentario opcional - reanudar",
                Description = "Vas a reanudar la jornada. Si quieres, escribe un comentario antes de continuar.",
                ButtonText = "Reanudar jornada"
            },
            "salida" => new CommentWindowTexts
            {
                WindowTitle = "Comentario opcional - salida",
                Description = "Vas a registrar una salida. Si quieres, escribe un comentario antes de continuar.",
                ButtonText = "Fichar salida"
            },
            _ => new CommentWindowTexts
            {
                WindowTitle = "Comentario opcional",
                Description = "Si quieres, escribe un comentario antes de continuar.",
                ButtonText = "Continuar"
            }
        };
    }

    private sealed class CommentWindowTexts
    {
        public string WindowTitle { get; set; } = string.Empty;

        public string Description { get; set; } = string.Empty;

        public string ButtonText { get; set; } = string.Empty;
    }
}