using FichajeDeEmpresa.Shared.Contracts.Fichajes;

namespace FichajeDeEmpresa.Api.Services;

public class InMemoryFichajeService : IFichajeService
{
    private readonly List<FichajeRecord> _records = [];
    private readonly object _lock = new();

    public Task<FichajeOperationResponseDto> RegisterEntryAsync(RegisterFichajeRequestDto request)
    {
        if (request.UserId <= 0)
        {
            return Task.FromResult(new FichajeOperationResponseDto
            {
                IsSuccess = false,
                Message = "El usuario no es válido."
            });
        }

        lock (_lock)
        {
            var currentSummary = BuildTodaySummary(request.UserId, DateTime.Now);

            if (currentSummary.IsWorking)
            {
                return Task.FromResult(new FichajeOperationResponseDto
                {
                    IsSuccess = false,
                    Message = "No puedes fichar entrada porque ya estás trabajando.",
                    Summary = currentSummary
                });
            }

            _records.Add(new FichajeRecord(request.UserId, DateTime.Now, FichajeType.Entry));

            return Task.FromResult(new FichajeOperationResponseDto
            {
                IsSuccess = true,
                Message = "Entrada registrada correctamente.",
                Summary = BuildTodaySummary(request.UserId, DateTime.Now)
            });
        }
    }

    public Task<FichajeOperationResponseDto> RegisterExitAsync(RegisterFichajeRequestDto request)
    {
        if (request.UserId <= 0)
        {
            return Task.FromResult(new FichajeOperationResponseDto
            {
                IsSuccess = false,
                Message = "El usuario no es válido."
            });
        }

        lock (_lock)
        {
            var currentSummary = BuildTodaySummary(request.UserId, DateTime.Now);

            if (!currentSummary.IsWorking)
            {
                return Task.FromResult(new FichajeOperationResponseDto
                {
                    IsSuccess = false,
                    Message = "No puedes fichar salida porque ahora mismo no estás trabajando.",
                    Summary = currentSummary
                });
            }

            _records.Add(new FichajeRecord(request.UserId, DateTime.Now, FichajeType.Exit));

            return Task.FromResult(new FichajeOperationResponseDto
            {
                IsSuccess = true,
                Message = "Salida registrada correctamente.",
                Summary = BuildTodaySummary(request.UserId, DateTime.Now)
            });
        }
    }

    public Task<FichajeOperationResponseDto> GetTodaySummaryAsync(int userId)
    {
        if (userId <= 0)
        {
            return Task.FromResult(new FichajeOperationResponseDto
            {
                IsSuccess = false,
                Message = "El usuario no es válido."
            });
        }

        lock (_lock)
        {
            return Task.FromResult(new FichajeOperationResponseDto
            {
                IsSuccess = true,
                Message = "Resumen del día obtenido correctamente.",
                Summary = BuildTodaySummary(userId, DateTime.Now)
            });
        }
    }

    private DaySummaryDto BuildTodaySummary(int userId, DateTime now)
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