const auth = require('./auth');

module.exports = function adminAuth(req, res, next) {
  auth(req, res, () => {
    if (req.usuario.role !== 'admin') {
      return res.status(403).json({ error: 'Solo administradores' });
    }
    next();
  });
};
