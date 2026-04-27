# Fichaje V3 Escritorio

Esta versión integra:

- Backend Node/Express con SQLite
- Panel de administración React/Vite
- App de escritorio con Electron

## Desarrollo

### 1. Backend
```powershell
cd backend
npm install
npm run seed
npm run dev
```

### 2. Panel web
```powershell
cd admin_panel
npm install
npm run dev
```

### 3. Electron
```powershell
cd electron
npm install
npm run dev
```

## Modo escritorio recomendado

Para usar la app de escritorio, arranca primero el panel con Vite y luego Electron:

```powershell
cd admin_panel
npm install
npm run dev
```

En otra terminal:

```powershell
cd electron
npm install
npm run dev
```

Electron levantará el backend automáticamente.

## Build Windows
```powershell
cd admin_panel
npm install
npm run build
```

```powershell
cd ../electron
npm install
npm run build:win
```
