using FichajeDeEmpresa.Api.Data;
using FichajeDeEmpresa.Api.Data.Entities;
using FichajeDeEmpresa.Shared.Contracts.Fichajes;
using Microsoft.EntityFrameworkCore;

namespace FichajeDeEmpresa.Api.Services;

public class InMemoryFichajeService : IFichajeService
{
    private readonly IDbContextFactory<AppDbContext> _dbContextFactory;

    public InMemoryFichajeService(IDbContextFactory<AppDbContext> dbContextFactory)
    {
        _dbContextFactory = dbContextFactory;
    }

    public Task<FichajeOperationResponseDto> RegisterEntryAsync(RegisterFichajeRequestDto request)
    {
        return RegisterMovementAsync(
            request,
            "Entrada",
            state => state == WorkingState.Outside,
            "No puedes fichar entrada porque tu jornada ya está iniciada.");
    }

    public Task<FichajeOperationResponseDto> RegisterPauseAsync(RegisterFichajeRequestDto request)
    {
        return RegisterMovementAsync(
            request,
            "Pausa",
            state => state == WorkingState.Working,
            "Solo puedes pausar una jornada que esté en curso.");
    }

    public Task<FichajeOperationResponseDto> RegisterResumeAsync(RegisterFichajeRequestDto request)
    {
        return RegisterMovementAsync(
            request,
            "Reanudar",
            state => state == WorkingState.Paused,
            "Solo puedes reanudar una jornada que esté en pausa.");
    }

    public Task<FichajeOperationResponseDto> RegisterExitAsync(RegisterFichajeRequestDto request)
    {
        return RegisterMovementAsync(
            request,
            "Salida",
            state => state == WorkingState.Working || state == WorkingState.Paused,
            "No puedes fichar salida porque no hay una jornada activa.");
    }

    public async Task<FichajeOperationResponseDto> GetTodaySummaryAsync(int userId)
    {
        await using var dbContext = await _dbContextFactory.CreateDbContextAsync();

        var user = await dbContext.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Id == userId);

        if (user is null)
        {
            return new FichajeOperationResponseDto
            {
                IsSuccess = false,
                Message = "No se ha encontrado el usuario."
            };
        }

        var today = DateTime.Today;
        var tomorrow = today.AddDays(1);

        var records = await dbContext.FichajeRecords
            .AsNoTracking()
            .Where(f => f.UserId == userId && f.Timestamp >= today && f.Timestamp < tomorrow)
            .OrderBy(f => f.Timestamp)
            .ToListAsync();

        var summary = BuildDaySummary(records, user.ExpectedDailyHours, today, DateTime.Now);

        return new FichajeOperationResponseDto
        {
            IsSuccess = true,
            Message = "Resumen obtenido correctamente.",
            Summary = summary
        };
    }

    public async Task<AdminFichajeHistoryResponseDto> GetHistoryAsync(int? userId, DateTime fromDate, DateTime toDate)
    {
        var from = fromDate.Date;
        var to = toDate.Date;

        if (from > to)
        {
            return new AdminFichajeHistoryResponseDto
            {
                IsSuccess = false,
                Message = "La fecha desde no puede ser mayor que la fecha hasta."
            };
        }

        var toExclusive = to.AddDays(1);

        await using var dbContext = await _dbContextFactory.CreateDbContextAsync();

        var query = dbContext.FichajeRecords
            .AsNoTracking()
            .Include(f => f.User)
            .Where(f => f.Timestamp >= from && f.Timestamp < toExclusive);

        if (userId.HasValue)
        {
            query = query.Where(f => f.UserId == userId.Value);
        }

        var records = await query
            .OrderBy(f => f.Timestamp)
            .ToListAsync();

        var days = records
            .GroupBy(f => new
            {
                f.UserId,
                Date = f.Timestamp.Date
            })
            .OrderByDescending(g => g.Key.Date)
            .ThenBy(g => g.First().User?.FullName)
            .Select(group =>
            {
                var user = group.First().User!;
                var dayDate = group.Key.Date;
                var endReference = dayDate == DateTime.Today ? DateTime.Now : dayDate.AddDays(1);

                var daySummary = BuildDaySummary(
                    group.OrderBy(x => x.Timestamp).ToList(),
                    user.ExpectedDailyHours,
                    dayDate,
                    endReference);

                return new AdminFichajeHistoryDayDto
                {
                    Date = dayDate,
                    UserId = user.Id,
                    FullName = user.FullName,
                    UserName = user.UserName,
                    WorkedSeconds = daySummary.WorkedSecondsToday,
                    ExtraSeconds = daySummary.ExtraSecondsToday,
                    IsWorking = daySummary.IsWorking,
                    IsPaused = daySummary.IsPaused,
                    Movements = daySummary.Movements
                };
            })
            .ToList();

        return new AdminFichajeHistoryResponseDto
        {
            IsSuccess = true,
            Message = "Historial obtenido correctamente.",
            Days = days
        };
    }

    private async Task<FichajeOperationResponseDto> RegisterMovementAsync(
        RegisterFichajeRequestDto request,
        string movementType,
        Func<WorkingState, bool> allowedState,
        string invalidStateMessage)
    {
        if (request.UserId <= 0)
        {
            return new FichajeOperationResponseDto
            {
                IsSuccess = false,
                Message = "El usuario indicado no es válido."
            };
        }

        await using var dbContext = await _dbContextFactory.CreateDbContextAsync();

        var user = await dbContext.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Id == request.UserId);

        if (user is null)
        {
            return new FichajeOperationResponseDto
            {
                IsSuccess = false,
                Message = "No se ha encontrado el usuario."
            };
        }

        if (!user.IsActive)
        {
            return new FichajeOperationResponseDto
            {
                IsSuccess = false,
                Message = "Este usuario está desactivado y no puede registrar fichajes."
            };
        }

        var today = DateTime.Today;
        var tomorrow = today.AddDays(1);

        var records = await dbContext.FichajeRecords
            .Where(f => f.UserId == request.UserId && f.Timestamp >= today && f.Timestamp < tomorrow)
            .OrderBy(f => f.Timestamp)
            .ToListAsync();

        var currentSummary = BuildDaySummary(records, user.ExpectedDailyHours, today, DateTime.Now);
        var currentState = GetWorkingState(currentSummary);

        if (!allowedState(currentState))
        {
            return new FichajeOperationResponseDto
            {
                IsSuccess = false,
                Message = invalidStateMessage,
                Summary = currentSummary
            };
        }

        var record = new FichajeRecordEntity
        {
            UserId = request.UserId,
            Timestamp = DateTime.Now,
            Type = movementType,
            Comment = NormalizeComment(request.Comment)
        };

        dbContext.FichajeRecords.Add(record);
        await dbContext.SaveChangesAsync();

        records.Add(record);

        var updatedSummary = BuildDaySummary(records, user.ExpectedDailyHours, today, DateTime.Now);

        return new FichajeOperationResponseDto
        {
            IsSuccess = true,
            Message = GetSuccessMessage(movementType),
            Summary = updatedSummary
        };
    }

    private static DaySummaryDto BuildDaySummary(
        IReadOnlyCollection<FichajeRecordEntity> records,
        decimal expectedDailyHours,
        DateTime dayDate,
        DateTime referenceTime)
    {
        var orderedRecords = records
            .OrderBy(r => r.Timestamp)
            .ToList();

        var movements = orderedRecords
            .Select(r => new FichajeMovementDto
            {
                Timestamp = r.Timestamp,
                Type = r.Type,
                Comment = r.Comment
            })
            .ToList();

        var workedSeconds = 0;
        DateTime? workingFrom = null;
        var state = WorkingState.Outside;

        foreach (var record in orderedRecords)
        {
            switch (NormalizeType(record.Type))
            {
                case "entrada":
                    if (state == WorkingState.Outside)
                    {
                        workingFrom = record.Timestamp;
                        state = WorkingState.Working;
                    }
                    break;

                case "pausa":
                    if (state == WorkingState.Working && workingFrom.HasValue)
                    {
                        workedSeconds += SafeSecondsBetween(workingFrom.Value, record.Timestamp);
                        workingFrom = null;
                        state = WorkingState.Paused;
                    }
                    break;

                case "reanudar":
                    if (state == WorkingState.Paused)
                    {
                        workingFrom = record.Timestamp;
                        state = WorkingState.Working;
                    }
                    break;

                case "salida":
                    if (state == WorkingState.Working && workingFrom.HasValue)
                    {
                        workedSeconds += SafeSecondsBetween(workingFrom.Value, record.Timestamp);
                        workingFrom = null;
                    }

                    state = WorkingState.Outside;
                    break;
            }
        }

        if (state == WorkingState.Working && workingFrom.HasValue)
        {
            workedSeconds += SafeSecondsBetween(workingFrom.Value, referenceTime);
        }

        var expectedSeconds = (int)Math.Round(expectedDailyHours * 3600m);
        var extraSeconds = Math.Max(0, workedSeconds - expectedSeconds);

        return new DaySummaryDto
        {
            IsWorking = state == WorkingState.Working,
            IsPaused = state == WorkingState.Paused,
            WorkedSecondsToday = workedSeconds,
            ExtraSecondsToday = extraSeconds,
            Movements = movements
        };
    }

    private static WorkingState GetWorkingState(DaySummaryDto summary)
    {
        if (summary.IsWorking)
        {
            return WorkingState.Working;
        }

        if (summary.IsPaused)
        {
            return WorkingState.Paused;
        }

        return WorkingState.Outside;
    }

    private static int SafeSecondsBetween(DateTime from, DateTime to)
    {
        if (to <= from)
        {
            return 0;
        }

        return (int)Math.Floor((to - from).TotalSeconds);
    }

    private static string? NormalizeComment(string? comment)
    {
        return string.IsNullOrWhiteSpace(comment) ? null : comment.Trim();
    }

    private static string NormalizeType(string type)
    {
        return type.Trim().ToLowerInvariant();
    }

    private static string GetSuccessMessage(string movementType)
    {
        return movementType switch
        {
            "Entrada" => "Entrada registrada correctamente.",
            "Pausa" => "Pausa registrada correctamente.",
            "Reanudar" => "Reanudación registrada correctamente.",
            "Salida" => "Salida registrada correctamente.",
            _ => "Movimiento registrado correctamente."
        };
    }

    private enum WorkingState
    {
        Outside,
        Working,
        Paused
    }
}