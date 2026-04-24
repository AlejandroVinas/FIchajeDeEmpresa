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
        return await RegisterMovementAsync(
            request,
            MovementType.Entry,
            WorkStatus.Outside,
            "Entrada registrada correctamente.",
            "No puedes fichar entrada porque ya has iniciado la jornada o estás en pausa.");
    }

    public async Task<FichajeOperationResponseDto> RegisterPauseAsync(RegisterFichajeRequestDto request)
    {
        return await RegisterMovementAsync(
            request,
            MovementType.Pause,
            WorkStatus.Working,
            "Pausa registrada correctamente.",
            "Solo puedes pausar si ahora mismo estás trabajando.");
    }

    public async Task<FichajeOperationResponseDto> RegisterResumeAsync(RegisterFichajeRequestDto request)
    {
        return await RegisterMovementAsync(
            request,
            MovementType.Resume,
            WorkStatus.Paused,
            "Reanudación registrada correctamente.",
            "Solo puedes reanudar si ahora mismo estás en pausa.");
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
            var todayRecords = GetOrderedRecordsForDate(request.UserId, DateTime.Today);
            var currentStatus = GetCurrentStatus(todayRecords);

            if (currentStatus == WorkStatus.Outside)
            {
                return new FichajeOperationResponseDto
                {
                    IsSuccess = false,
                    Message = "No puedes fichar salida porque ahora mismo no has iniciado la jornada.",
                    Summary = BuildDaySummary(request.UserId, user.ExpectedDailyHours, DateTime.Today, DateTime.Now)
                };
            }

            _records.Add(new FichajeRecord(
                request.UserId,
                DateTime.Now,
                MovementType.Exit,
                NormalizeComment(request.Comment)));

            return new FichajeOperationResponseDto
            {
                IsSuccess = true,
                Message = "Salida registrada correctamente.",
                Summary = BuildDaySummary(request.UserId, user.ExpectedDailyHours, DateTime.Today, DateTime.Now)
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
                Summary = BuildDaySummary(userId, user.ExpectedDailyHours, DateTime.Today, DateTime.Now)
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

                var orderedRecords = group
                    .OrderBy(r => r.Timestamp)
                    .ToList();

                var currentStatus = GetCurrentStatus(orderedRecords);
                var workedSeconds = CalculateWorkedSecondsForDate(orderedRecords, group.Key.Date, DateTime.Now);

                var expectedDailySeconds = (int)Math.Max(0, Math.Round(user.ExpectedDailyHours * 3600m));
                var normalSeconds = Math.Min(workedSeconds, expectedDailySeconds);
                var extraSeconds = Math.Max(0, workedSeconds - expectedDailySeconds);

                resultDays.Add(new AdminFichajeHistoryDayDto
                {
                    UserId = user.UserId,
                    UserName = user.UserName,
                    FullName = user.FullName,
                    Date = group.Key.Date,
                    WorkedSeconds = workedSeconds,
                    NormalSeconds = normalSeconds,
                    ExtraSeconds = extraSeconds,
                    IsWorking = currentStatus == WorkStatus.Working,
                    IsPaused = currentStatus == WorkStatus.Paused,
                    Movements = orderedRecords
                        .OrderByDescending(r => r.Timestamp)
                        .Select(MapMovement)
                        .ToList()
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

    private async Task<FichajeOperationResponseDto> RegisterMovementAsync(
        RegisterFichajeRequestDto request,
        MovementType movementType,
        WorkStatus requiredStatus,
        string successMessage,
        string invalidStatusMessage)
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
            var todayRecords = GetOrderedRecordsForDate(request.UserId, DateTime.Today);
            var currentStatus = GetCurrentStatus(todayRecords);

            if (currentStatus != requiredStatus)
            {
                return new FichajeOperationResponseDto
                {
                    IsSuccess = false,
                    Message = invalidStatusMessage,
                    Summary = BuildDaySummary(request.UserId, user.ExpectedDailyHours, DateTime.Today, DateTime.Now)
                };
            }

            _records.Add(new FichajeRecord(
                request.UserId,
                DateTime.Now,
                movementType,
                NormalizeComment(request.Comment)));

            return new FichajeOperationResponseDto
            {
                IsSuccess = true,
                Message = successMessage,
                Summary = BuildDaySummary(request.UserId, user.ExpectedDailyHours, DateTime.Today, DateTime.Now)
            };
        }
    }

    private DaySummaryDto BuildDaySummary(int userId, decimal expectedDailyHours, DateTime date, DateTime now)
    {
        var orderedRecords = GetOrderedRecordsForDate(userId, date);
        var currentStatus = GetCurrentStatus(orderedRecords);

        var workedSeconds = CalculateWorkedSecondsForDate(orderedRecords, date, now);
        var expectedDailySeconds = (int)Math.Max(0, Math.Round(expectedDailyHours * 3600m));
        var normalSeconds = Math.Min(workedSeconds, expectedDailySeconds);
        var extraSeconds = Math.Max(0, workedSeconds - expectedDailySeconds);

        var lastStart = orderedRecords
            .Where(r => r.Type is MovementType.Entry or MovementType.Resume)
            .Select(r => (DateTime?)r.Timestamp)
            .LastOrDefault();

        var lastStop = orderedRecords
            .Where(r => r.Type is MovementType.Pause or MovementType.Exit)
            .Select(r => (DateTime?)r.Timestamp)
            .LastOrDefault();

        return new DaySummaryDto
        {
            UserId = userId,
            IsWorking = currentStatus == WorkStatus.Working,
            IsPaused = currentStatus == WorkStatus.Paused,
            LastEntryTime = lastStart,
            LastExitTime = lastStop,
            WorkedSecondsToday = workedSeconds,
            NormalSecondsToday = normalSeconds,
            ExtraSecondsToday = extraSeconds,
            Movements = orderedRecords
                .OrderByDescending(r => r.Timestamp)
                .Select(MapMovement)
                .ToList()
        };
    }

    private List<FichajeRecord> GetOrderedRecordsForDate(int userId, DateTime date)
    {
        return _records
            .Where(r => r.UserId == userId && r.Timestamp.Date == date.Date)
            .OrderBy(r => r.Timestamp)
            .ToList();
    }

    private static WorkStatus GetCurrentStatus(IEnumerable<FichajeRecord> records)
    {
        var status = WorkStatus.Outside;

        foreach (var record in records.OrderBy(r => r.Timestamp))
        {
            switch (record.Type)
            {
                case MovementType.Entry:
                    status = WorkStatus.Working;
                    break;

                case MovementType.Pause:
                    if (status == WorkStatus.Working)
                    {
                        status = WorkStatus.Paused;
                    }
                    break;

                case MovementType.Resume:
                    if (status == WorkStatus.Paused)
                    {
                        status = WorkStatus.Working;
                    }
                    break;

                case MovementType.Exit:
                    status = WorkStatus.Outside;
                    break;
            }
        }

        return status;
    }

    private static int CalculateWorkedSecondsForDate(List<FichajeRecord> orderedRecords, DateTime date, DateTime now)
    {
        var totalSeconds = 0;
        DateTime? openStart = null;
        var status = WorkStatus.Outside;

        foreach (var record in orderedRecords.OrderBy(r => r.Timestamp))
        {
            switch (record.Type)
            {
                case MovementType.Entry:
                    if (status == WorkStatus.Outside)
                    {
                        openStart = record.Timestamp;
                        status = WorkStatus.Working;
                    }
                    break;

                case MovementType.Resume:
                    if (status == WorkStatus.Paused)
                    {
                        openStart = record.Timestamp;
                        status = WorkStatus.Working;
                    }
                    break;

                case MovementType.Pause:
                    if (status == WorkStatus.Working && openStart is not null)
                    {
                        totalSeconds += (int)Math.Max(0, (record.Timestamp - openStart.Value).TotalSeconds);
                        openStart = null;
                        status = WorkStatus.Paused;
                    }
                    break;

                case MovementType.Exit:
                    if (status == WorkStatus.Working && openStart is not null)
                    {
                        totalSeconds += (int)Math.Max(0, (record.Timestamp - openStart.Value).TotalSeconds);
                        openStart = null;
                    }

                    if (status is WorkStatus.Working or WorkStatus.Paused)
                    {
                        status = WorkStatus.Outside;
                    }
                    break;
            }
        }

        if (status == WorkStatus.Working && openStart is not null)
        {
            var closingMoment = date.Date == now.Date
                ? now
                : date.Date.AddDays(1).AddSeconds(-1);

            totalSeconds += (int)Math.Max(0, (closingMoment - openStart.Value).TotalSeconds);
        }

        return totalSeconds;
    }

    private static FichajeMovementDto MapMovement(FichajeRecord record)
    {
        return new FichajeMovementDto
        {
            Type = record.Type switch
            {
                MovementType.Entry => "Entrada",
                MovementType.Pause => "Pausa",
                MovementType.Resume => "Reanudación",
                MovementType.Exit => "Salida",
                _ => "Movimiento"
            },
            Timestamp = record.Timestamp,
            Comment = record.Comment
        };
    }

    private static string? NormalizeComment(string? comment)
    {
        return string.IsNullOrWhiteSpace(comment)
            ? null
            : comment.Trim();
    }

    private sealed record FichajeRecord(int UserId, DateTime Timestamp, MovementType Type, string? Comment);

    private enum MovementType
    {
        Entry,
        Pause,
        Resume,
        Exit
    }

    private enum WorkStatus
    {
        Outside,
        Working,
        Paused
    }
}