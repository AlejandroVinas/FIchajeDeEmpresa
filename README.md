# FichajeDeEmpresa

Aplicación de escritorio para control de fichaje de horas en una empresa, pensada para varios equipos dentro de la red interna de la empresa.

## Objetivo del proyecto

El objetivo es construir una app de Windows donde cada trabajador pueda:

- iniciar sesión
- fichar entrada
- fichar salida
- ver sus horas trabajadas
- ver sus horas normales y horas extra

Además, el sistema tendrá una parte administrativa para gestionar usuarios, revisar fichajes y resolver incidencias.

## Arquitectura elegida

Hemos decidido usar una arquitectura cliente-servidor dentro de la empresa.

### Cliente

Cada trabajador tendrá instalada una app de escritorio en su equipo.

Tecnología:
- WPF
- C#
- .NET 8

### Servidor

Habrá un equipo dentro de la empresa que actuará como servidor.

Ese equipo alojará:
- una API en ASP.NET Core
- la base de datos central

Tecnología:
- ASP.NET Core Web API
- SQL Server (más adelante)

### Proyecto compartido

También hay un proyecto compartido con clases comunes entre la app y la API.

## Estructura de la solución

La solución está dividida en 3 proyectos:

### `FichajeDeEmpresa.App`

Aplicación de escritorio WPF que usarán los empleados y administradores.

### `FichajeDeEmpresa.Api`

Backend del sistema. Recibe peticiones de la app y centraliza la lógica del negocio.

### `FichajeDeEmpresa.Shared`

Proyecto compartido con DTOs y contratos comunes entre cliente y servidor.

## Estado actual del proyecto

Actualmente el proyecto ya tiene funcionando lo siguiente:

- solución con 3 proyectos
- app WPF compilando correctamente
- API compilando correctamente
- comunicación entre la app y la API
- pantalla de login
- autenticación de prueba en memoria
- usuarios de prueba para validar el flujo

### Importante

En este momento **todavía no estamos usando base de datos real**.

El login actual funciona con usuarios de prueba cargados en memoria dentro de la API. Esto se ha hecho así para validar primero la arquitectura y la comunicación entre proyectos antes de pasar a SQL Server.

## Usuarios de prueba actuales

Se pueden usar estos usuarios para probar el login:

- Usuario: `admin`
  Contraseña: `admin123`

- Usuario: `juan`
  Contraseña: `1234`

- Usuario: `maria`
  Contraseña: `1234`

## Horas diarias configuradas de prueba

Actualmente los usuarios de prueba tienen estas horas:

- `admin` -> 8 horas/día
- `juan` -> 8 horas/día
- `maria` -> 4 horas/día

Esto sirve para validar más adelante el cálculo de horas normales y horas extra.

## Flujo actual

Ahora mismo el flujo es este:

1. Se arranca la API
2. Se arranca la app WPF
3. El usuario introduce usuario y contraseña
4. La app llama al endpoint de login de la API
5. La API valida el usuario en memoria
6. Si el login es correcto, la app muestra un mensaje con los datos del usuario

## Endpoints disponibles actualmente

### `GET /api/health`

Sirve para comprobar que la API está viva.

### `POST /api/auth/login`

Recibe usuario y contraseña y devuelve el resultado del login.

## Requisitos para desarrollo

Para trabajar con el proyecto hace falta:

- Windows
- .NET 8 SDK
- VS Code
- extensión de C# para VS Code

## Cómo abrir el proyecto

Abrir la carpeta raíz del repositorio en VS Code.

## Cómo compilar la solución

Desde la raíz del proyecto ejecutar:

```powershell
dotnet build .\FIchajeDeEmpresa.sln
