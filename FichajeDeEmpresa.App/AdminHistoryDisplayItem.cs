namespace FichajeDeEmpresa.App;

public class AdminHistoryDisplayItem
{
    public string Title { get; set; } = string.Empty;

    public string Summary { get; set; } = string.Empty;

    public List<AdminHistoryMovementDisplayItem> Movements { get; set; } = [];
}

public class AdminHistoryMovementDisplayItem
{
    public string TimeText { get; set; } = string.Empty;

    public string TypeText { get; set; } = string.Empty;

    public string? CommentText { get; set; }
}