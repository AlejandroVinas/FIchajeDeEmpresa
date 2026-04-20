using System;
using System.Net.Http;
using System.Net.Http.Json;
using System.Threading.Tasks;
using FichajeDeEmpresa.App.Configuration;
using FichajeDeEmpresa.Shared.Contracts.Auth;

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
}