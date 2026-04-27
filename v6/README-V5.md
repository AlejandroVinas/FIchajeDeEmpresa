# Fichaje V5

Cambios principales incluidos:

- Copia limpia desde V4.
- Correccion definitiva de Electron + Vite usando `base: './'`.
- Cambio de `BrowserRouter` a `HashRouter` para funcionar con `loadFile`.
- Seed idempotente: si el admin ya existe, no falla.
- Empleados: crear, editar, eliminar, cambiar rol, horario, jornada, horas semanales y contraseÃ±a.
- Fichajes: filtros por fecha desde/hasta y exportacion CSV.
- Configuracion: activar/desactivar inicio automatico con Windows desde el panel.
- Version del paquete actualizada a 5.0.0.

## Ejecutar

```powershell
cd "C:\Users\aleja\OneDrive\Escritorio\Empresa\FIchajeDeEmpresa\v5\electron"
npm run dev
```

## Login inicial

Email: `admin@empresa.com`

ContraseÃ±a: `Admin12345!`
