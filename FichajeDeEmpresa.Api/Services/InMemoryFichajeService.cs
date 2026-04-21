using FichajeDeEmpresa.Shared.Contracts.Fichajes;

namespace FichajeDeEmpresa.Api.Services;

public class InMemoryFichajeService : IFichajeService
{
    private readonly IAuthService _authService;
    private readonly List<FichajeRecord> _records = [];
    private readonly object _lock = new();

    public InMemoryFichajeService(IAuthService authService)
    {
        _authService = authService;
    }

    public async Task<FichajeOperationResponseDto> RegisterEntryAsync(RegisterFichajeRequestDto request)
    {
        if (request.UserId <= 0)
        {
            return new FichajeOperationResponseDto
            {
                IsSuccess = false,
                Message = "El usuario no es válido."
            };
        }

        var user = await _authService.GetUserByIdAsync(request.UserId);

        if (user is null)
        {
            return new FichajeOperationResponseDto
            {
                IsSuccess = false,
                Message = "No se ha encontrado el usuario."
            };
        }

        lock (_lock)
        {
            var currentSummary = BuildTodaySummary(request.UserId, user.ExpectedDailyHours, DateTime.Now);

            if (currentSummary.IsWorking)
            {
                return new FichajeOperationResponseDto
                {
                    IsSuccess = false,
                    Message = "No puedes fichar entrada porque ya estás trabajando.",
                    Summary = currentSummary
                };
            }

            _records.Add(new FichajeRecord(request.UserId, DateTime.Now, FichajeType.Entry));

            return new FichajeOperationResponseDto
            {
                IsSuccess = true,
                Message = "Entrada registrada correctamente.",
                Summary = BuildTodaySummary(request.UserId, user.ExpectedDailyHours, DateTime.Now)
            };
        }
    }

    public async Task<FichajeOperationResponseDto> RegisterExitAsync(RegisterFichajeRequestDto request)
    {
        if (request.UserId <= 0)
        {
            return new FichajeOperationResponseDto
            {
                IsSuccess = false,
                Message = "El usuario no es válido."
            };
        }

        var user = await _authService.GetUserByIdAsync(request.UserId);

        if (user is null)
        {
            return new FichajeOperationResponseDto
            {
                IsSuccess = false,
                Message = "No se ha encontrado el usuario."
            };
        }

        lock (_lock)
        {
            var currentSummary = BuildTodaySummary(request.UserId, user.ExpectedDailyHours, DateTime.Now);

            if (!currentSummary.IsWorking)
            {
                return new FichajeOperationResponseDto
                {
                    IsSuccess = false,
                    Message = "No puedes fichar salida porque ahora mismo no estás trabajando.",
                    Summary = currentSummary
                };
            }

            _records.Add(new FichajeRecord(request.UserId, DateTime.Now, FichajeType.Exit));

            return new FichajeOperationResponseDto
            {
                IsSuccess = true,
                Message = "Salida registrada correctamente.",
                Summary = BuildTodaySummary(request.UserId, user.ExpectedDailyHours, DateTime.Now)
            };
        }
    }

    public async Task<FichajeOperationResponseDto> GetTodaySummaryAsync(int userId)
    {
        if (userId <= 0)
        {
            return new FichajeOperationResponseDto
            {
                IsSuccess = false,
                Message = "El usuario no es válido."
            };
        }

        var user = await _authService.GetUserByIdAsync(userId);

        if (user is null)
        {
            return new FichajeOperationResponseDto
            {
                IsSuccess = false,
                Message = "No se ha encontrado el usuario."
            };
        }

        lock (_lock)
        {
            return new FichajeOperationResponseDto
            {
                IsSuccess = true,
                Message = "Resumen del día obtenido correctamente.",
                Summary = BuildTodaySummary(userId, user.ExpectedDailyHours, DateTime.Now)
            };
        }
    }

    private DaySummaryDto BuildTodaySummary(int userId, decimal expectedDailyHours, DateTime now)
    {
        var todayRecords = _records
            .Where(r => r.UserId == userId && r.Timestamp.Date == now.Date)
            .OrderBy(r => r.Timestamp)
            .ToList();

        var lastRecord = todayRecords.LastOrDefault();
        var isWorking = lastRecord?.Type == FichajeType.Entry;

        var lastEntry = todayRecords.LastOrDefault(r => r.Type == FichajeType.Entry)?.Timestamp;
        var lastExit = todayRecords.LastOrDefault(r => r.Type == FichajeType.Exit)?.Timestamp;

        var workedSeconds = CalculateWorkedSeconds(todayRecords, now);

        var expectedDailySeconds = (int)Math.Max(0, Math.Round(expectedDailyHours * 3600m));
        var normalSeconds = Math.Min(workedSeconds, expectedDailySeconds);
        var extraSeconds = Math.Max(0, workedSeconds - expectedDailySeconds);

        var movements = todayRecords
            .OrderByDescending(r => r.Timestamp)
            .Select(r => new FichajeMovementDto
            {
                Type = r.Type == FichajeType.Entry ? "Entrada" : "Salida",
                Timestamp = r.Timestamp
            })
            .ToList();

        return new DaySummaryDto
        {
            UserId = userId,
            IsWorking = isWorking,
            LastEntryTime = lastEntry,
            LastExitTime = lastExit,
            WorkedSecondsToday = workedSeconds,
            NormalSecondsToday = normalSeconds,
            ExtraSecondsToday = extraSeconds,
            Movements = movements
        };
    }

    private static int CalculateWorkedSeconds(List<FichajeRecord> records, DateTime now)
    {
        var totalSeconds = 0;
        DateTime? openEntry = null;

        foreach (var record in records)
        {
            if (record.Type == FichajeType.Entry)
            {
                if (openEntry is null)
                {
                    openEntry = record.Timestamp;
                }

                continue;
            }

            if (record.Type == FichajeType.Exit && openEntry is not null)
            {
                var seconds = (int)Math.Max(0, (record.Timestamp - openEntry.Value).TotalSeconds);
                totalSeconds += seconds;
                openEntry = null;
            }
        }

        if (openEntry is not null)
        {
            var seconds = (int)Math.Max(0, (now - openEntry.Value).TotalSeconds);
            totalSeconds += seconds;
        }

        return totalSeconds;
    }

    private sealed record FichajeRecord(int UserId, DateTime Timestamp, FichajeType Type);

    private enum FichajeType
    {
        Entry,
        Exit
    }
}