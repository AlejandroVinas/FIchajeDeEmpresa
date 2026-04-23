const express      = require('express');
const cors         = require('cors');
const cookieParser = require('cookie-parser');
const { PORT, CORS_ORIGINS } = require('./config');
const errorHandler = require('./middleware/errorHandler');
const logger       = require('./utils/logger');

const app = express();

// ── Configuración de proxy inverso ────────────────────────────────────────────
// Activa si el backend está detrás de nginx/caddy/etc.
// Permite leer la IP real del cliente desde X-Forwarded-For del primer proxy.
// Si NO hay proxy delante, mantener en false para ignorar ese header.
if (process.env.TRUST_PROXY === 'true') {
  app.set('trust proxy', 1);
}

// ── CORS ─────────────────────────────────────────────────────────────────────
// Solo acepta peticiones de los orígenes definidos en CORS_ORIGINS.
// credentials:true es necesario para que el navegador envíe cookies httpOnly.
app.use(cors({
  origin: (origin, callback) => {
    // Permitir peticiones sin origen (ej: curl, Postman, app Flutter)
    if (!origin) return callback(null, true);
    if (CORS_ORIGINS.includes(origin)) return callback(null, true);
    callback(new Error(`Origen no permitido por CORS: ${origin}`));
  },
  credentials: true,
}));

app.use(express.json());
app.use(cookieParser());

// ── Logging de requests ───────────────────────────────────────────────────────
app.use((req, _res, next) => {
  logger.info({ method: req.method, url: req.url }, 'request');
  next();
});

// ── Rutas ─────────────────────────────────────────────────────────────────────
app.use('/auth',      require('./routes/auth'));
app.use('/fichajes',  require('./routes/fichajes'));
app.use('/empleados', require('./routes/empleados'));
app.use('/push',      require('./routes/push'));

// ── Manejador global de errores (debe ser el último middleware) ────────────────
app.use(errorHandler);

app.listen(PORT, () =>
  logger.info(`Backend escuchando en http://localhost:${PORT}`)
);
