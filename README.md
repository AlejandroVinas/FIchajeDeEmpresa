# FichajeDeEmpresa

Aplicación de escritorio para control de fichaje de horas en una empresa, pensada para varios equipos dentro de la red interna de la empresa.

## Objetivo del proyecto

El objetivo es construir una app de Windows donde cada trabajador pueda:

- iniciar sesión
- fichar entrada
- fichar salida
- ver su estado actual
- ver su tiempo trabajado del día
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
- la base de datos central más adelante

Tecnología:

- ASP.NET Core Web API
- SQL Server más adelante

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
- pantalla de login separada
- pantalla principal después del login
- autenticación de prueba en memoria
- fichaje de entrada
- fichaje de salida
- estado actual del usuario
- resumen del día
- cálculo de horas trabajadas
- cálculo de horas normales
- cálculo de horas extra

## Importante

En este momento **todavía no estamos usando base de datos real**.

Toda la información de usuarios y fichajes se está gestionando en memoria dentro de la API para validar primero el flujo completo antes de pasar a SQL Server.

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

## Flujo actual

Ahora mismo el flujo es este:

1. Se arranca la API
2. Se arranca la app WPF
3. El usuario inicia sesión
4. Se abre la pantalla principal
5. El usuario puede fichar entrada
6. El usuario puede fichar salida
7. La app muestra el estado actual y el resumen del día
8. La API calcula tiempo trabajado, horas normales y horas extra

## Endpoints disponibles actualmente

### `GET /api/health`

Sirve para comprobar que la API está viva.

### `POST /api/auth/login`

Recibe usuario y contraseña y devuelve el resultado del login.

### `POST /api/fichajes/entrada`

Registra la entrada del usuario.

### `POST /api/fichajes/salida`

Registra la salida del usuario.

### `GET /api/fichajes/resumen-hoy/{userId}`

Devuelve el resumen actual del día para el usuario indicado.

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