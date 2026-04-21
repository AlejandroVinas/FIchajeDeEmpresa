require('dotenv').config();

module.exports = {
  PORT:                 process.env.PORT                  || 3000,
  JWT_SECRET:           process.env.JWT_SECRET,

  // Coordenadas de la sede donde se permite fichar (móvil)
  EMPRESA_LAT:          parseFloat(process.env.EMPRESA_LAT),
  EMPRESA_LON:          parseFloat(process.env.EMPRESA_LON),
  EMPRESA_RADIO_METROS: parseFloat(process.env.EMPRESA_RADIO_METROS) || 100,

  // IPs permitidas para fichaje desde escritorio (separadas por coma)
  EMPRESA_IPS: (process.env.EMPRESA_IPS || '').split(',').map(s => s.trim()).filter(Boolean),
};
