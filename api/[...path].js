// Vercel detecta cualquier archivo dentro de /api como una función.
// El nombre [...path].js es un "catch-all": captura TODAS las rutas
// que empiecen con /api/ (ej: /api/productos, /api/login, /api/categorias)
// y se las pasa tal cual a tu app de Express, que ya sabe qué hacer con cada una.

const app = require('../backend/server.js');

module.exports = app;