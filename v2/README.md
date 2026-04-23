# Sistema de Fichaje V2

Stack: Node.js + Express + SQLite | Flutter (sin cambios en V2) | React + Vite + Tailwind

---

## Cambios respecto a V1

### Backend
| Área | Cambio |
|---|---|
| Seguridad | JWT en cookies `httpOnly + SameSite=Strict` para el panel |
| Seguridad | Rate limiting en `/auth/login`: 10 intentos / 15 min por IP |
| Seguridad | CORS restringido a orígenes definidos en `CORS_ORIGINS` |
| Seguridad | `X-Forwarded-For` solo se procesa si `TRUST_PROXY=true` |
| Seguridad | `seed.js` lee credenciales de `.env`, falla si no están definidas |
| Auth | Access token: 15 min. Refresh token: 7 días. Endpoint `/auth/refresh` |
| Auth | `/auth/logout` limpia ambas cookies |
| Observabilidad | Logging estructurado con `pino` (pretty en dev, JSON en producción) |
| Arquitectura | Middleware global de errores — nunca expone stack trace al cliente |
| Flutter | **Sin cambios** — sigue usando Bearer token en secure storage |

### Panel admin
- Reescrito en **React + Vite + Tailwind CSS**
- Autenticación por cookies `httpOnly` (el token nunca es accesible desde JS)
- Refresh token silencioso y automático
- Rutas: `/fichajes` y `/empleados`

---

## 1. Backend

```bash
cd backend
cp .env.example .env
# Editar .env con los valores reales
npm install
node seed.js
node server.js
```

### Variables de entorno nuevas en V2

| Variable | Descripción |
|---|---|
| `JWT_REFRESH_SECRET` | Secreto para firmar refresh tokens (distinto de `JWT_SECRET`) |
| `CORS_ORIGINS` | Orígenes permitidos separados por coma. Ej: `http://localhost:5173` |
| `TRUST_PROXY` | `true` si el backend está detrás de nginx/caddy/etc. |
| `SEED_EMAIL` | Email del primer admin (reemplaza el valor hardcodeado de V1) |
| `SEED_PASSWORD` | Contraseña del primer admin |
| `SEED_NOMBRE` | Nombre del primer admin |

---

## 2. Panel admin (React)

```bash
cd admin_panel
npm install
npm run dev       # desarrollo — http://localhost:5173
npm run build     # producción — genera dist/
```

En desarrollo el proxy de Vite redirige `/api/*` al backend en `localhost:3000`.

En producción servir `dist/` con cualquier servidor estático (nginx, caddy, etc.)
y añadir el dominio del panel a `CORS_ORIGINS` en el `.env` del backend.

---

## 3. Flutter (sin cambios)

La app Flutter no se modifica en V2. Sigue usando:
- `flutter_secure_storage` para el token
- Header `Authorization: Bearer <token>` en cada petición

El middleware `auth.js` del backend acepta tanto cookie como Bearer header.

---

## Estructura de ficheros nuevos / modificados

```
V2/
├── backend/
│   ├── server.js                  ← CORS, trust proxy, cookie-parser, error handler
│   ├── config.js                  ← + CORS_ORIGINS, JWT_REFRESH_SECRET
│   ├── seed.js                    ← lee credenciales de .env
│   ├── .env.example               ← variables nuevas documentadas
│   ├── package.json               ← + cookie-parser, express-rate-limit, pino
│   ├── middleware/
│   │   ├── auth.js                ← acepta cookie O Bearer header
│   │   └── errorHandler.js        ← nuevo: handler global de errores
│   ├── routes/
│   │   └── auth.js                ← rate limit, cookies, refresh, logout
│   └── utils/
│       ├── ip.js                  ← usa req.ip respetando trust proxy
│       └── logger.js              ← nuevo: pino estructurado
│
└── admin_panel/                   ← reescritura completa en React
    ├── index.html
    ├── package.json
    ├── vite.config.js
    ├── tailwind.config.js
    ├── postcss.config.js
    ├── public/
    │   └── sw.js                  ← service worker push (portado)
    └── src/
        ├── main.jsx
        ├── App.jsx                ← router + guard de ruta
        ├── index.css              ← Tailwind + clases globales reutilizables
        ├── api/
        │   └── client.js          ← fetch con refresh automático y credentials
        ├── context/
        │   └── AuthContext.jsx    ← estado de sesión global
        ├── hooks/
        │   └── useApi.js          ← hook genérico para peticiones
        ├── components/
        │   ├── Layout.jsx         ← header, nav, push notifications
        │   ├── Pagination.jsx     ← paginación reutilizable
        │   ├── CrearEmpleadoForm.jsx
        │   ├── EmpleadosTable.jsx
        │   ├── FichajesFilter.jsx
        │   └── FichajesTable.jsx
        └── pages/
            ├── LoginPage.jsx
            ├── FichajesPage.jsx
            └── EmpleadosPage.jsx
```
