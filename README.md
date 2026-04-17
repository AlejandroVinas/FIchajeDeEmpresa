<<<<<<< HEAD
# Sistema de Fichaje por Ubicación

Stack: Node.js + Express + SQLite | Flutter (Android / iOS / Escritorio) | HTML Panel Admin

---

## Estructura

```
fichaje/
├── backend/          → API REST Node.js + Express
├── flutter_app/      → App móvil y escritorio (Flutter)
└── admin_panel/      → Panel web de administración (HTML + JS)
```

---

## 1. Backend

### Configuración

```bash
cd backend
cp .env.example .env
```

Editar `.env`:
- `JWT_SECRET` → cadena aleatoria larga (mín. 32 chars)
- `EMPRESA_LAT` / `EMPRESA_LON` → coordenadas GPS reales de la empresa
- `EMPRESA_RADIO_METROS` → radio permitido en metros (ej: 100)
- `EMPRESA_IPS` → IP pública de la oficina para fichaje desde escritorio
- `VAPID_EMAIL` → email del administrador
- `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` → generar con:

```bash
npm run vapid
```

### Instalación y arranque

```bash
npm install
node seed.js      # crea el primer admin (editar email/pass antes)
node server.js
```

### Con Docker

```bash
docker compose up -d --build
docker compose exec backend node seed.js
```

---

## 2. Flutter App

### Configuración

Editar `lib/config.dart`:
- `apiUrl` → URL real del backend (ej: `http://192.168.1.100:3000`)
- `empresaLat` / `empresaLon` / `radioMetros` → mismos valores que el backend

### Permisos

- **Android**: el `AndroidManifest.xml` incluido ya tiene los permisos necesarios.
- **iOS**: el `Info.plist` incluido tiene las claves de ubicación.
  Integrar las claves dentro del `<dict>` del Info.plist generado por Flutter.

### Instalación y compilación

```bash
cd flutter_app
flutter pub get

# Desarrollo
flutter run

# Producción
flutter build apk          # Android
flutter build ios          # iOS (requiere Mac + Xcode)
flutter build linux        # Linux escritorio
flutter build windows      # Windows escritorio
```

### Flujo de firma digital (Ed25519)

1. El empleado instala la app → se generan claves automáticamente
2. El empleado pulsa **"Ver mi clave pública"** y copia el valor base64
3. El admin pega esa clave al crear la cuenta del empleado en el panel
4. Cada fichaje se firma en el dispositivo antes de enviarse al servidor

---

## 3. Panel de Administración

Abrir `admin_panel/index.html` en un navegador.

> ⚠️ Para las notificaciones push el panel debe servirse por HTTPS o localhost.
> En producción: colocar los ficheros `index.html` y `sw.js` en un servidor web.

Editar la constante `API` al inicio del `<script>` con la URL real del backend.

### Funcionalidades

- Crear / eliminar empleados
- Subir / actualizar clave pública Ed25519 de cada empleado
- Ver todos los fichajes con ✅/❌ de firma digital
- Filtrar por empleado, tipo (entrada/salida) y rango de fechas
- Exportar CSV (respeta los filtros activos)
- Paginación configurable
- Notificaciones push en tiempo real cuando alguien ficha

---

## API — Resumen de endpoints

| Método | Ruta                          | Auth    | Descripción                        |
|--------|-------------------------------|---------|------------------------------------|
| POST   | /auth/login                   | —       | Login empleado o admin             |
| GET    | /empleados                    | Admin   | Listar empleados                   |
| POST   | /empleados                    | Admin   | Crear empleado                     |
| PUT    | /empleados/:id/clave-publica  | Admin   | Actualizar clave pública           |
| DELETE | /empleados/:id                | Admin   | Eliminar empleado                  |
| POST   | /fichajes                     | Empleado| Registrar fichaje                  |
| GET    | /fichajes                     | Admin   | Listar fichajes (filtros + pagina) |
| GET    | /fichajes/empleado/:id        | Admin   | Fichajes de un empleado            |
| GET    | /fichajes/exportar.csv        | Admin   | Exportar CSV                       |
| GET    | /push/vapid-public-key        | Admin   | Clave pública VAPID                |
| POST   | /push/suscribir               | Admin   | Registrar suscripción push         |
| DELETE | /push/suscribir               | Admin   | Cancelar suscripción push          |

# FIchajeDeEmpresa
**Victor**
c4013a1 (tu mensaje)
