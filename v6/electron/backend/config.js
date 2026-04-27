const path = require('path');
const dotenv = require('dotenv');

const defaultEnvPath = process.env.DOTENV_CONFIG_PATH || path.join(__dirname, '..', '.env');
dotenv.config({ path: defaultEnvPath });

module.exports = {
  PORT: process.env.PORT || 3000,
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET,
  CORS_ORIGINS: (process.env.CORS_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  EMPRESA_LAT: parseFloat(process.env.EMPRESA_LAT),
  EMPRESA_LON: parseFloat(process.env.EMPRESA_LON),
  EMPRESA_RADIO_METROS: parseFloat(process.env.EMPRESA_RADIO_METROS) || 100,
  EMPRESA_IPS: (process.env.EMPRESA_IPS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
};
