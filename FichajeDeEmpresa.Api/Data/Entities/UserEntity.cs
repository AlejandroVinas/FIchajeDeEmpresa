namespace FichajeDeEmpresa.Api.Data.Entities;

public class UserEntity
{
    public int Id { get; set; }

    public string FullName { get; set; } = string.Empty;

    public string UserName { get; set; } = string.Empty;

    public string Password { get; set; } = string.Empty;

    public string Role { get; set; } = string.Empty;

    public decimal ExpectedDailyHours { get; set; }

    public bool IsActive { get; set; }

    public DateTime CreatedAtUtc { get; set; }

    public List<FichajeRecordEntity> FichajeRecords { get; set; } = [];
}