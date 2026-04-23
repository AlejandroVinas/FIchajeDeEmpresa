const pino = require('pino');

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  // En desarrollo: salida legible por humanos. En producción: JSON puro.
  transport: process.env.NODE_ENV !== 'production'
    ? { target: 'pino-pretty', options: { colorize: true, translateTime: 'HH:MM:ss' } }
    : undefined,
});

module.exports = logger;
