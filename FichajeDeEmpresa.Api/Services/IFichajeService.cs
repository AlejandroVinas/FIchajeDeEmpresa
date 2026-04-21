using FichajeDeEmpresa.Shared.Contracts.Fichajes;

namespace FichajeDeEmpresa.Api.Services;

public interface IFichajeService
{
    Task<FichajeOperationResponseDto> RegisterEntryAsync(RegisterFichajeRequestDto request);

    Task<FichajeOperationResponseDto> RegisterExitAsync(RegisterFichajeRequestDto request);

    Task<FichajeOperationResponseDto> GetTodaySummaryAsync(int userId);
}