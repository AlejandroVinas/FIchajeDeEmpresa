const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const { PORT, CORS_ORIGINS } = require('./config');
const errorHandler = require('./middleware/errorHandler');
const logger = require('./utils/logger');

function isAllowedOrigin(origin) {
  if (!origin) return true;
  const desktopOrigins = new Set(['null', 'file://', 'http://localhost:5173', 'http://127.0.0.1:5173']);
  if (desktopOrigins.has(origin)) return true;
  return CORS_ORIGINS.includes(origin);
}

function createApp() {
  const app = express();

  if (process.env.TRUST_PROXY === 'true') app.set('trust proxy', 1);

  app.use(cors({
    origin: (origin, callback) => {
      if (isAllowedOrigin(origin)) return callback(null, true);
      callback(new Error(`Origen no permitido por CORS: ${origin}`));
    },
    credentials: true,
  }));

  app.use(express.json({ limit: '10mb' }));
  app.use(cookieParser());

  app.use((req, _res, next) => {
    logger.info({ method: req.method, url: req.url }, 'request');
    next();
  });

  app.get('/health', (_req, res) => {
    res.json({ ok: true, service: 'backend', version: '6.0.0', port: Number(process.env.PORT || PORT) });
  });

  app.use('/auth', require('./routes/auth'));
  app.use('/fichajes', require('./routes/fichajes'));
  app.use('/empleados', require('./routes/empleados'));
  app.use('/incidencias', require('./routes/incidencias'));
  app.use('/calendario', require('./routes/calendario'));
  app.use('/backups', require('./routes/backups'));
  app.use('/auditoria', require('./routes/auditoria'));
  app.use('/kiosco', require('./routes/kiosco'));
  app.use('/push', require('./routes/push'));

  app.use(errorHandler);
  return app;
}

function startBackend({ port = Number(process.env.PORT || PORT) } = {}) {
  const app = createApp();
  return new Promise((resolve, reject) => {
    const server = app.listen(port, '127.0.0.1', () => {
      const actualPort = server.address().port;
      logger.info(`Backend escuchando en http://127.0.0.1:${actualPort}`);
      resolve({ app, server, port: actualPort });
    });
    server.once('error', reject);
  });
}

if (require.main === module) {
  startBackend().catch((error) => {
    logger.error({ err: error }, 'No se pudo iniciar el backend');
    process.exit(1);
  });
}

module.exports = { createApp, startBackend };