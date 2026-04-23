const net = require('net');

/**
 * Devuelve una promesa que resuelve con un puerto TCP libre en la máquina local.
 * Prueba desde `startPort` hacia arriba hasta encontrar uno disponible.
 */
function findFreePort(startPort = 47321) {
  return new Promise((resolve, reject) => {
    const server = net.createServer();

    server.unref(); // No bloquea el cierre de la app si queda abierto

    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        // Puerto ocupado → probar el siguiente
        resolve(findFreePort(startPort + 1));
      } else {
        reject(err);
      }
    });

    server.listen(startPort, '127.0.0.1', () => {
      const { port } = server.address();
      server.close(() => resolve(port));
    });
  });
}

module.exports = { findFreePort };
