const express = require('express');
const cors = require('cors');
const { neon } = require('@neondatabase/serverless');
require('dotenv').config();


const app = express();

// middlewares
app.use(cors());
app.use(express.json());

// conexión a Neon usando la variable del .env
const sql = neon(process.env.DATABASE_URL);

// obtener productos desde Neon
app.get('/api/productos', async (req, res) => {
    try {
        const productos = await sql`
            SELECT 
                p."ID_producto" AS id,
                p."Nombre" AS nombre,
                p."Precio" AS precio,
                p."Descripcion" AS descripcion,
                p."Imagen" AS imagen,
                c."categoria" AS categoria
            FROM "Producto" p
            JOIN "Categoria" c ON p."ID_categoria" = c."ID_categoria"
        `;
        
        res.json(productos);
    } catch (error) {
        console.error('Error al consultar Neon:', error);
        res.status(500).json({ error: 'Error al obtener productos' });
    }
});

// Arrancar el servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Servidor backend corriendo en http://localhost:${PORT}`);
});