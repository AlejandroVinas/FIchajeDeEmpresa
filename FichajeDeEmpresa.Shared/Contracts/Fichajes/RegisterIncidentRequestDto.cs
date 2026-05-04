namespace FichajeDeEmpresa.Shared.Contracts.Fichajes;

public class RegisterIncidentRequestDto
{
    public int UserId { get; set; }

    public DateTime Date { get; set; }

    public string Comment { get; set; } = string.Empty;
}