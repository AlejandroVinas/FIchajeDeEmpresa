using System;
using System.Net.Http;
using System.Net.Http.Json;
using FichajeDeEmpresa.App.Configuration;
using FichajeDeEmpresa.Shared.Contracts.Auth;
using FichajeDeEmpresa.Shared.Contracts.Fichajes;
using FichajeDeEmpresa.Shared.Contracts.Users;

namespace FichajeDeEmpresa.App.Services;

public class ApiClient
{
    private readonly HttpClient _httpClient;

    public ApiClient()
    {
        _httpClient = new HttpClient
        {
            BaseAddress = new Uri(AppConfiguration.ApiBaseUrl)
        };
    }

    public async Task<LoginResponseDto> LoginAsync(LoginRequestDto request)
    {
        try
        {
            var response = await _httpClient.PostAsJsonAsync("api/auth/login", request);
            var result = await response.Content.ReadFromJsonAsync<LoginResponseDto>();

            return result ?? new LoginResponseDto
            {
                IsSuccess = false,
                Message = "La API no devolvió una respuesta válida."
            };
        }
        catch (Exception ex)
        {
            return new LoginResponseDto
            {
                IsSuccess = false,
                Message = $"No se pudo conectar con la API. {ex.Message}"
            };
        }
    }

    public async Task<FichajeOperationResponseDto> RegisterEntryAsync(RegisterFichajeRequestDto request)
    {
        return await PostFichajeAsync("api/fichajes/entrada", request);
    }

    public async Task<FichajeOperationResponseDto> RegisterPauseAsync(RegisterFichajeRequestDto request)
    {
        return await PostFichajeAsync("api/fichajes/pausa", request);
    }

    public async Task<FichajeOperationResponseDto> RegisterResumeAsync(RegisterFichajeRequestDto request)
    {
        return await PostFichajeAsync("api/fichajes/reanudar", request);
    }

    public async Task<FichajeOperationResponseDto> RegisterExitAsync(RegisterFichajeRequestDto request)
    {
        return await PostFichajeAsync("api/fichajes/salida", request);
    }

    public async Task<FichajeOperationResponseDto> GetTodaySummaryAsync(int userId)
    {
        try
        {
            var result = await _httpClient.GetFromJsonAsync<FichajeOperationResponseDto>($"api/fichajes/resumen-hoy/{userId}");

            return result ?? new FichajeOperationResponseDto
            {
                IsSuccess = false,
                Message = "La API no devolvió una respuesta válida."
            };
        }
        catch (Exception ex)
        {
            return new FichajeOperationResponseDto
            {
                IsSuccess = false,
                Message = $"No se pudo conectar con la API. {ex.Message}"
            };
        }
    }

    public async Task<AdminFichajeHistoryResponseDto> GetFichajeHistoryAsync(int? userId, DateTime fromDate, DateTime toDate)
    {
        try
        {
            var query = $"api/fichajes/historial?fromDate={fromDate:yyyy-MM-dd}&toDate={toDate:yyyy-MM-dd}";

            if (userId.HasValue)
            {
                query += $"&userId={userId.Value}";
            }

            var response = await _httpClient.GetAsync(query);
            var result = await response.Content.ReadFromJsonAsync<AdminFichajeHistoryResponseDto>();

            if (result is null)
            {
                return new AdminFichajeHistoryResponseDto
                {
                    IsSuccess = false,
                    Message = "La API no devolvió una respuesta válida."
                };
            }

            if (!response.IsSuccessStatusCode)
            {
                result.IsSuccess = false;

                if (string.IsNullOrWhiteSpace(result.Message))
                {
                    result.Message = "No se pudo obtener el historial de fichajes.";
                }
            }

            return result;
        }
        catch (Exception ex)
        {
            return new AdminFichajeHistoryResponseDto
            {
                IsSuccess = false,
                Message = $"No se pudo conectar con la API. {ex.Message}"
            };
        }
    }

    public async Task<UserListResponseDto> GetUsersAsync()
    {
        try
        {
            var response = await _httpClient.GetAsync("api/users");
            var result = await response.Content.ReadFromJsonAsync<UserListResponseDto>();

            if (result is null)
            {
                return new UserListResponseDto
                {
                    IsSuccess = false,
                    Message = "La API no devolvió una respuesta válida."
                };
            }

            if (!response.IsSuccessStatusCode)
            {
                result.IsSuccess = false;

                if (string.IsNullOrWhiteSpace(result.Message))
                {
                    result.Message = "No se pudo obtener la lista de usuarios.";
                }
            }

            return result;
        }
        catch (Exception ex)
        {
            return new UserListResponseDto
            {
                IsSuccess = false,
                Message = $"No se pudo conectar con la API. {ex.Message}"
            };
        }
    }

    public async Task<UserOperationResponseDto> CreateUserAsync(CreateUserRequestDto request)
    {
        try
        {
            var response = await _httpClient.PostAsJsonAsync("api/users", request);
            var result = await response.Content.ReadFromJsonAsync<UserOperationResponseDto>();

            if (result is null)
            {
                return new UserOperationResponseDto
                {
                    IsSuccess = false,
                    Message = "La API no devolvió una respuesta válida."
                };
            }

            if (!response.IsSuccessStatusCode)
            {
                result.IsSuccess = false;

                if (string.IsNullOrWhiteSpace(result.Message))
                {
                    result.Message = "No se pudo crear el usuario.";
                }
            }

            return result;
        }
        catch (Exception ex)
        {
            return new UserOperationResponseDto
            {
                IsSuccess = false,
                Message = $"No se pudo conectar con la API. {ex.Message}"
            };
        }
    }

    public async Task<UserOperationResponseDto> UpdateUserAsync(int userId, UpdateUserRequestDto request)
    {
        try
        {
            var response = await _httpClient.PutAsJsonAsync($"api/users/{userId}", request);
            var result = await response.Content.ReadFromJsonAsync<UserOperationResponseDto>();

            if (result is null)
            {
                return new UserOperationResponseDto
                {
                    IsSuccess = false,
                    Message = "La API no devolvió una respuesta válida."
                };
            }

            if (!response.IsSuccessStatusCode)
            {
                result.IsSuccess = false;

                if (string.IsNullOrWhiteSpace(result.Message))
                {
                    result.Message = "No se pudo actualizar el usuario.";
                }
            }

            return result;
        }
        catch (Exception ex)
        {
            return new UserOperationResponseDto
            {
                IsSuccess = false,
                Message = $"No se pudo conectar con la API. {ex.Message}"
            };
        }
    }

    private async Task<FichajeOperationResponseDto> PostFichajeAsync(string url, RegisterFichajeRequestDto request)
    {
        try
        {
            var response = await _httpClient.PostAsJsonAsync(url, request);
            var result = await response.Content.ReadFromJsonAsync<FichajeOperationResponseDto>();

            return result ?? new FichajeOperationResponseDto
            {
                IsSuccess = false,
                Message = "La API no devolvió una respuesta válida."
            };
        }
        catch (Exception ex)
        {
            return new FichajeOperationResponseDto
            {
                IsSuccess = false,
                Message = $"No se pudo conectar con la API. {ex.Message}"
            };
        }
    }
}