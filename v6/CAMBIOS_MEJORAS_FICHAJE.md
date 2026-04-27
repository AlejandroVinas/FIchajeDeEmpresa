# Cambios añadidos — mejoras de fichaje

Esta versión añade las mejoras pedidas sobre la V3:

1. Al crear empleados ahora se puede asignar:
   - Horas por jornada.
   - Hora de entrada.
   - Hora de salida.
   - Horas semanales.

2. El empleado puede fichar:
   - Entrada.
   - Salida.
   - La app impide fichar dos entradas seguidas o una salida sin entrada abierta.

3. Se añade resumen semanal:
   - Horas trabajadas.
   - Horas semanales asignadas.
   - Horas extra realizadas.
   - Estado actual: dentro/fuera.

4. El administrador puede ver:
   - Jornada y horario de cada empleado.
   - Resumen semanal por empleado.
   - Estado de empleados trabajando ahora.
   - CSV de fichajes con datos de jornada.

5. Electron queda configurado para abrirse automáticamente al iniciar sesión.

## Archivos principales modificados

- `admin_panel/src/components/CrearEmpleadoForm.jsx`
- `admin_panel/src/components/EmpleadosTable.jsx`
- `admin_panel/src/components/FichajeEmpleadoCard.jsx`
- `admin_panel/src/components/FichajesTable.jsx`
- `admin_panel/src/pages/DashboardPage.jsx`
- `admin_panel/src/pages/FichajesPage.jsx`
- `admin_panel/src/components/Layout.jsx`
- `admin_panel/src/App.jsx`
- `admin_panel/src/context/AuthContext.jsx`
- `electron/backend/db.js`
- `electron/backend/routes/auth.js`
- `electron/backend/routes/empleados.js`
- `electron/backend/routes/fichajes.js`
- `electron/src/main.js`
- `electron/src/preload.js`

También se han actualizado los equivalentes de `backend/` para mantener sincronizadas las dos copias del backend.

## Cómo probar

Desde `v3/electron`:

```powershell
npm run build:panel
npm run dev
```

Después:

1. Entra como administrador.
2. Crea un empleado con jornada, horario y horas semanales.
3. Cierra sesión.
4. Entra como empleado.
5. Pulsa `Fichar entrada`.
6. Comprueba que ya no permite otra entrada.
7. Pulsa `Fichar salida`.
8. Comprueba el resumen semanal y horas extra.
