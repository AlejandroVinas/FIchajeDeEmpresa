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

            _records.Add(new FichajeRecord(
                request.UserId,
                DateTime.Now,
                FichajeType.Entry,
                NormalizeComment(request.Comment)));

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

            _records.Add(new FichajeRecord(
                request.UserId,
                DateTime.Now,
                FichajeType.Exit,
                NormalizeComment(request.Comment)));

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

    public async Task<AdminFichajeHistoryResponseDto> GetHistoryAsync(int? userId, DateTime? fromDate, DateTime? toDate)
    {
        var startDate = (fromDate ?? DateTime.Today.AddDays(-30)).Date;
        var endDate = (toDate ?? DateTime.Today).Date;

        if (startDate > endDate)
        {
            return new AdminFichajeHistoryResponseDto
            {
                IsSuccess = false,
                Message = "La fecha desde no puede ser mayor que la fecha hasta."
            };
        }

        var usersResult = await _authService.GetAllUsersAsync();

        if (!usersResult.IsSuccess)
        {
            return new AdminFichajeHistoryResponseDto
            {
                IsSuccess = false,
                Message = "No se ha podido obtener la lista de usuarios."
            };
        }

        var usersById = usersResult.Users.ToDictionary(u => u.UserId);

        if (userId.HasValue && !usersById.ContainsKey(userId.Value))
        {
            return new AdminFichajeHistoryResponseDto
            {
                IsSuccess = false,
                Message = "El usuario indicado no existe."
            };
        }

        lock (_lock)
        {
            var filteredRecords = _records
                .Where(r => r.Timestamp.Date >= startDate && r.Timestamp.Date <= endDate);

            if (userId.HasValue)
            {
                filteredRecords = filteredRecords.Where(r => r.UserId == userId.Value);
            }

            var dayGroups = filteredRecords
                .GroupBy(r => new { r.UserId, Date = r.Timestamp.Date })
                .OrderByDescending(g => g.Key.Date)
                .ThenBy(g => g.Key.UserId)
                .ToList();

            var resultDays = new List<AdminFichajeHistoryDayDto>();

            foreach (var group in dayGroups)
            {
                if (!usersById.TryGetValue(group.Key.UserId, out var user))
                {
                    continue;
                }

                var dayRecords = group
                    .OrderBy(r => r.Timestamp)
                    .ToList();

                var workedSeconds = CalculateWorkedSecondsForDate(
                    dayRecords,
                    user.ExpectedDailyHours,
                    group.Key.Date,
                    DateTime.Now);

                var expectedDailySeconds = (int)Math.Max(0, Math.Round(user.ExpectedDailyHours * 3600m));
                var normalSeconds = Math.Min(workedSeconds, expectedDailySeconds);
                var extraSeconds = Math.Max(0, workedSeconds - expectedDailySeconds);

                var lastRecord = dayRecords.LastOrDefault();
                var isWorking = lastRecord?.Type == FichajeType.Entry;

                var movements = dayRecords
                    .OrderByDescending(r => r.Timestamp)
                    .Select(r => new FichajeMovementDto
                    {
                        Type = r.Type == FichajeType.Entry ? "Entrada" : "Salida",
                        Timestamp = r.Timestamp,
                        Comment = r.Comment
                    })
                    .ToList();

                resultDays.Add(new AdminFichajeHistoryDayDto
                {
                    UserId = user.UserId,
                    UserName = user.UserName,
                    FullName = user.FullName,
                    Date = group.Key.Date,
                    WorkedSeconds = workedSeconds,
                    NormalSeconds = normalSeconds,
                    ExtraSeconds = extraSeconds,
                    IsWorking = isWorking,
                    Movements = movements
                });
            }

            return new AdminFichajeHistoryResponseDto
            {
                IsSuccess = true,
                Message = "Historial obtenido correctamente.",
                Days = resultDays
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

        var workedSeconds = CalculateWorkedSecondsForDate(todayRecords, expectedDailyHours, now.Date, now);

        var expectedDailySeconds = (int)Math.Max(0, Math.Round(expectedDailyHours * 3600m));
        var normalSeconds = Math.Min(workedSeconds, expectedDailySeconds);
        var extraSeconds = Math.Max(0, workedSeconds - expectedDailySeconds);

        var movements = todayRecords
            .OrderByDescending(r => r.Timestamp)
            .Select(r => new FichajeMovementDto
            {
                Type = r.Type == FichajeType.Entry ? "Entrada" : "Salida",
                Timestamp = r.Timestamp,
                Comment = r.Comment
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

    private static int CalculateWorkedSecondsForDate(
        List<FichajeRecord> records,
        decimal expectedDailyHours,
        DateTime date,
        DateTime now)
    {
        var totalSeconds = 0;
        DateTime? openEntry = null;

        foreach (var record in records.OrderBy(r => r.Timestamp))
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
            var closingMoment = date.Date == now.Date
                ? now
                : date.Date.AddDays(1).AddSeconds(-1);

            var seconds = (int)Math.Max(0, (closingMoment - openEntry.Value).TotalSeconds);
            totalSeconds += seconds;
        }

        return totalSeconds;
    }

    private static string? NormalizeComment(string? comment)
    {
        return string.IsNullOrWhiteSpace(comment)
            ? null
            : comment.Trim();
    }

    private sealed record FichajeRecord(int UserId, DateTime Timestamp, FichajeType Type, string? Comment);

    private enum FichajeType
    {
        Entry,
        Exit
    }
}