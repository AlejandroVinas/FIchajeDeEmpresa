# Fichaje V3.1 escritorio

V3.1 convierte el backend en un servidor embebido dentro de Electron.

## Cambios clave
- Electron usa `better-sqlite3` dentro de su propio runtime.
- Se elimina la dependencia de arrancar el backend con un Node externo.
- El panel React sigue funcionando en modo Vite (`npm run dev`) o empaquetado (`dist`).
- El backend de escritorio vive en `electron/backend`.
- El backend raíz (`backend`) se mantiene solo como compatibilidad/desarrollo opcional.

## Desarrollo
### 1. Panel
```powershell
cd admin_panel
npm install
npm run dev
```

### 2. App de escritorio
```powershell
cd electron
copy .env.example .env
npm install
npm run seed
npm run dev
```

## Build Windows
```powershell
cd electron
npm install
npm run build:win
```

## Dónde guarda datos
- Desarrollo: `electron/.runtime/fichajes.db`
- App instalada: carpeta `userData` de Electron
