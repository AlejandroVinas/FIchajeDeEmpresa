namespace FichajeDeEmpresa.Api.Data.Entities;

public class FichajeRecordEntity
{
    public int Id { get; set; }

    public int UserId { get; set; }

    public DateTime Timestamp { get; set; }

    public string Type { get; set; } = string.Empty;

    public string? Comment { get; set; }

    public UserEntity? User { get; set; }
}