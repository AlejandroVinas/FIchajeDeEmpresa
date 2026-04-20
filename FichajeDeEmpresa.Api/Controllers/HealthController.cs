using Microsoft.AspNetCore.Mvc;

namespace FichajeDeEmpresa.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class HealthController : ControllerBase
{
    [HttpGet]
    public IActionResult Get()
    {
        return Ok(new
        {
            message = "API de Fichaje funcionando correctamente.",
            serverTime = DateTime.Now
        });
    }
}