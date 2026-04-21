using System;
using System.Net.Http;
using System.Net.Http.Json;
using System.Threading.Tasks;
using FichajeDeEmpresa.App.Configuration;
using FichajeDeEmpresa.Shared.Contracts.Auth;
using FichajeDeEmpresa.Shared.Contracts.Fichajes;

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
            using var response = await _httpClient.PostAsJsonAsync("api/auth/login", request);
            var result = await response.Content.ReadFromJsonAsync<LoginResponseDto>();

            if (result is null)
            {
                return new LoginResponseDto
                {
                    IsSuccess = false,
                    Message = "La API devolvió una respuesta vacía."
                };
            }

            return result;
        }
        catch (Exception ex)
        {
            return new LoginResponseDto
            {
                IsSuccess = false,
                Message = $"No se pudo conectar con el servidor: {ex.Message}"
            };
        }
    }

    public async Task<FichajeOperationResponseDto> RegisterEntryAsync(RegisterFichajeRequestDto request)
    {
        return await PostFichajeAsync("api/fichajes/entrada", request);
    }

    public async Task<FichajeOperationResponseDto> RegisterExitAsync(RegisterFichajeRequestDto request)
    {
        return await PostFichajeAsync("api/fichajes/salida", request);
    }

    public async Task<FichajeOperationResponseDto> GetTodaySummaryAsync(int userId)
    {
        try
        {
            using var response = await _httpClient.GetAsync($"api/fichajes/resumen-hoy/{userId}");
            var result = await response.Content.ReadFromJsonAsync<FichajeOperationResponseDto>();

            if (result is null)
            {
                return new FichajeOperationResponseDto
                {
                    IsSuccess = false,
                    Message = "La API devolvió una respuesta vacía."
                };
            }

            return result;
        }
        catch (Exception ex)
        {
            return new FichajeOperationResponseDto
            {
                IsSuccess = false,
                Message = $"No se pudo conectar con el servidor: {ex.Message}"
            };
        }
    }

    private async Task<FichajeOperationResponseDto> PostFichajeAsync(string url, RegisterFichajeRequestDto request)
    {
        try
        {
            using var response = await _httpClient.PostAsJsonAsync(url, request);
            var result = await response.Content.ReadFromJsonAsync<FichajeOperationResponseDto>();

            if (result is null)
            {
                return new FichajeOperationResponseDto
                {
                    IsSuccess = false,
                    Message = "La API devolvió una respuesta vacía."
                };
            }

            return result;
        }
        catch (Exception ex)
        {
            return new FichajeOperationResponseDto
            {
                IsSuccess = false,
                Message = $"No se pudo conectar con el servidor: {ex.Message}"
            };
        }
    }
}