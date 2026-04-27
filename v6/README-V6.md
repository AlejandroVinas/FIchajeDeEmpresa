# Fichaje V6

V6 parte de V5 y aÃ±ade las mejoras que quedaron pendientes:

- Roles ampliados: administrador, supervisor y empleado.
- Modo kiosko con PIN para fichar sin iniciar sesion completa.
- Incidencias: olvido de fichaje, correcciones, ausencias, bajas, vacaciones, permisos y retrasos.
- Calendario laboral: festivos, dias especiales y horas objetivo.
- Copias de seguridad manuales de la base de datos local.
- Auditoria de cambios importantes.
- Cambio de contraseÃ±a desde el perfil.
- Deteccion de fichajes incompletos en dashboard.
- Correcciones manuales de fichaje desde backend.
- Electron + Vite configurado con rutas relativas y HashRouter.
- Escritura de archivos sin BOM para evitar errores de Vite/electron-builder.

## Ejecutar

```powershell
cd "C:\Users\aleja\OneDrive\Escritorio\Empresa\FIchajeDeEmpresa\v6\electron"
npm run dev
```

## Login inicial

Email: `admin@empresa.com`

ContraseÃ±a: `Admin12345!`

PIN kiosko inicial del admin: `123456`