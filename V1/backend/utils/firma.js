const crypto = require('crypto');

// Prefijo SPKI fijo para claves Ed25519 (12 bytes)
// Permite importar la clave pública raw de 32 bytes en Node.js nativo
const SPKI_PREFIX = Buffer.from('302a300506032b6570032100', 'hex');

function importarClavePublica(claveBase64) {
  const raw = Buffer.from(claveBase64, 'base64');
  if (raw.length !== 32) throw new Error('Clave pública inválida: debe ser 32 bytes Ed25519');
  const spki = Buffer.concat([SPKI_PREFIX, raw]);
  return crypto.createPublicKey({ key: spki, format: 'der', type: 'spki' });
}

/**
 * Verifica la firma Ed25519 de un fichaje.
 * Payload firmado (mismo orden en Flutter y Node):
 *   "empleadoId|tipo|timestamp|lat|lon"
 *   lat y lon son cadena vacía si no aplican (escritorio)
 */
function verificarFirma({ empleadoId, tipo, timestamp, lat, lon, firmaBase64, clavePublicaBase64 }) {
  try {
    const payload = `${empleadoId}|${tipo}|${timestamp}|${lat ?? ''}|${lon ?? ''}`;
    const clave   = importarClavePublica(clavePublicaBase64);
    const firma   = Buffer.from(firmaBase64, 'base64');

    const verify = crypto.createVerify('Ed25519');
    verify.update(Buffer.from(payload, 'utf8'));
    return verify.verify(clave, firma);
  } catch {
    return false;
  }
}

module.exports = { verificarFirma };
