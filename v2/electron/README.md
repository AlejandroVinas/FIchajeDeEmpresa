# Fichaje Desktop — Electron

Aplicación de escritorio que empaqueta el backend Node.js y el panel React
en un único ejecutable instalable. No requiere conocimientos técnicos para usarla.

---

## Estructura

```
electron/
├── src/
│   ├── main.js            → Proceso principal de Electron
│   ├── preload.js         → Puente seguro entre Electron y el panel React
│   ├── backendLauncher.js → Lanza el backend como proceso hijo
│   └── portFinder.js      → Encuentra un puerto TCP libre automáticamente
├── assets/
│   ├── splash.html        → Pantalla de carga mientras arranca el servidor
│   ├── icon.png           → Icono de la app (Linux / splash)
│   ├── icon.ico           → Icono de la app (Windows)
│   └── icon.icns          → Icono de la app (macOS)
└── package.json           → Configuración de Electron + electron-builder
```

---

## Prerrequisitos de desarrollo

- Node.js 20+
- npm 10+
- Para build en Windows: ejecutar en Windows o usar Wine en Linux
- Para build en macOS: ejecutar en macOS (requisito de Apple)
- Para build en Linux: cualquier plataforma

---

## Primeros pasos — Desarrollo

```bash
# 1. Instalar dependencias del panel React
cd ../admin_panel
npm install

# 2. Arrancar el panel en modo dev (Vite en puerto 5173)
npm run dev

# 3. En otra terminal, instalar dependencias de Electron
cd ../electron
npm install

# 4. Arrancar Electron en modo dev
npm run dev
```

En modo desarrollo Electron carga el panel desde `http://localhost:5173` (Vite).
El backend arranca embebido en un proceso hijo con puerto dinámico.

---

## Build — Generar instaladores

```bash
cd electron
npm install

# Windows (.exe instalador NSIS)
npm run build:win

# macOS (.dmg)
npm run build:mac

# Linux (.AppImage)
npm run build:linux

# Los tres a la vez
npm run build:all
```

Los instaladores se generan en `electron/dist/`.

---

## Configuración en producción

Al instalar la app por primera vez, se crea automáticamente un fichero `.env`
en la carpeta de datos del usuario con los valores por defecto del `.env.example`.

**La base de datos se guarda en:**
- Windows: `%APPDATA%\Fichaje\fichajes.db`
- macOS:   `~/Library/Application Support/Fichaje/fichajes.db`
- Linux:   `~/.config/Fichaje/fichajes.db`

**El administrador debe editar el `.env` antes del primer uso real:**
- Windows: `%APPDATA%\Fichaje\.env`
- macOS:   `~/Library/Application Support/Fichaje/.env`
- Linux:   `~/.config/Fichaje/.env`

Variables mínimas a configurar:
```
JWT_SECRET=cadena_aleatoria_de_al_menos_32_caracteres
JWT_REFRESH_SECRET=otra_cadena_diferente_de_al_menos_32_caracteres
EMPRESA_LAT=40.416775
EMPRESA_LON=-3.703790
EMPRESA_RADIO_METROS=100
EMPRESA_IPS=192.168.1.0/24
SEED_EMAIL=admin@empresa.com
SEED_PASSWORD=contraseña_segura
SEED_NOMBRE=Administrador
```

---

## Crear el primer administrador

Después de instalar y configurar el `.env`, ejecutar UNA vez:

```bash
# Windows (en la carpeta de instalación)
fichaje.exe --seed

# O directamente con node si se tiene el backend accesible:
node backend/seed.js
```

> En versiones futuras este paso se integrará en un asistente de configuración
> dentro de la propia app.

---

## Flujo de datos en producción

```
Usuario abre Fichaje.exe
        ↓
Electron busca puerto libre (ej: 47321)
        ↓
Electron lanza backend/server.js como proceso hijo en ese puerto
        ↓
Splash screen hasta que el backend confirma que escucha
        ↓
Electron carga panel_dist/index.html
        ↓
El panel React pregunta a Electron el puerto vía contextBridge
        ↓
Todas las peticiones van a http://127.0.0.1:47321
```

La app Flutter del empleado sigue apuntando a la IP/dominio del servidor
donde esté desplegado el backend (sin cambios respecto a V1).
