if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}
const express = require('express');
const cors = require('cors');
const { neon } = require('@neondatabase/serverless');
const { Pool } = require('pg');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

const app = express();

// 1. MIDDLEWARES PRINCIPALES (Siempre arriba de las rutas)
app.use(cors());
app.use(express.json());

// 2. CONEXIONES A BASE DE DATOS
const connectionString = process.env.DATABASE_URL;
console.log('¿Existe DATABASE_URL?:', !!process.env.DATABASE_URL);

if (!connectionString) {
  throw new Error("CRÍTICO: La variable DATABASE_URL no está llegando al proceso.");
}
const pool = new Pool({
    connectionString
});

const sql = neon(connectionString);

// 3. CONFIGURACIÓN DE CLOUDINARY Y MULTER
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true 
});

const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'productos_et24',
        allowed_formats: ['jpg', 'png', 'jpeg', 'webp']
    }
});

const upload = multer({ storage: storage });

// 4. RUTAS DE LA API

// Obetner productos
app.get('/api/productos', async (req, res) => {
    try {
        const resultado = await pool.query(`
            SELECT 
                p."ID_producto" AS id,
                p."Nombre" AS nombre,
                p."Precio" AS precio,
                p."Descripcion" AS descripcion,
                p."Stock" AS stock,
                p."ID_categoria" AS id_categoria,
                c."categoria" AS categoria,
                COALESCE(img.url_imagen, p."Imagen") AS url_imagen
            FROM "Producto" p
            LEFT JOIN "Categoria" c ON p."ID_categoria" = c."ID_categoria"
            LEFT JOIN (
                SELECT DISTINCT ON ("ID_producto") "ID_producto", url_imagen 
                FROM imagenes_producto 
                ORDER BY "ID_producto", orden ASC
            ) img ON p."ID_producto" = img."ID_producto"
            ORDER BY p."ID_producto" DESC
        `);
        
        res.json(resultado.rows);
    } catch (error) {
        console.error('Error al consultar Neon:', error);
        res.status(500).json({ error: 'Error al obtener productos' });
    }
});

// Crear un producto nuevo
app.post('/api/productos', upload.array('imagenes', 5), async (req, res) => {
    try {
        const { nombre, precio, descripcion, stock, id_categoria } = req.body;

        // Inserción en la tabla principal "Producto"
        const resProd = await pool.query(
            `INSERT INTO "Producto" ("Nombre", "Precio", "Descripcion", "Stock", "ID_categoria") 
             VALUES ($1, $2, $3, $4, $5) RETURNING "ID_producto"`,
            [nombre, precio, descripcion, stock, id_categoria]
        );
        const productoId = resProd.rows[0].ID_producto;

        // Guardar imágenes en la tabla "imagenes_producto" si se adjuntaron fotos
        if (req.files && req.files.length > 0) {
            for (let i = 0; i < req.files.length; i++) {
                const urlCloudinary = req.files[i].path;
                await pool.query(
                    `INSERT INTO imagenes_producto ("ID_producto", url_imagen, orden) 
                     VALUES ($1, $2, $3)`,
                    [productoId, urlCloudinary, i + 1]
                );
            }
        }

        res.status(201).json({ mensaje: 'Producto e imágenes subidos correctamente', id: productoId });
    } catch (error) {
        console.error("🔴 Error detallado en POST /api/productos:", error);
        res.status(500).json({ error: error.message || 'Error al guardar el producto' });
    }
});

// Editar un producto existente
app.put('/api/productos/:id', upload.array('imagenes', 5), async (req, res) => {
    const { id } = req.params;
    const { nombre, precio, descripcion, stock, id_categoria } = req.body;

    try {
        await pool.query(
            `UPDATE "Producto" 
             SET "Nombre" = $1, "Precio" = $2, "Descripcion" = $3, "Stock" = $4, "ID_categoria" = $5 
             WHERE "ID_producto" = $6`,
            [nombre, precio, descripcion, stock, id_categoria, id]
        );

        if (req.files && req.files.length > 0) {
            // 1. Borrar imágenes anteriores asociadas a este producto
            await pool.query('DELETE FROM imagenes_producto WHERE "ID_producto" = $1', [id]);

            // 2. Insertar las nuevas
            for (let i = 0; i < req.files.length; i++) {
                const urlCloudinary = req.files[i].path;
                await pool.query(
                    `INSERT INTO imagenes_producto ("ID_producto", url_imagen, orden) 
                    VALUES ($1, $2, $3)`,
                    [id, urlCloudinary, i + 1]
                );
            }
        }

        res.json({ mensaje: 'Producto actualizado con éxito' });
    } catch (error) {
        console.error('Error detallado en el servidor:', error);
        res.status(500).json({ error: error.message });
    }
});

// Obtener categorías para el selector
app.get('/api/categorias', async (req, res) => {
    try {
        const categorias = await sql`
            SELECT 
                "ID_categoria" AS id,
                "categoria" AS nombre
            FROM "Categoria"
            ORDER BY "categoria"
        `;
        res.json(categorias);
    } catch (error) {
        console.error('Error al consultar categorías:', error);
        res.status(500).json({ error: 'Error al obtener categorías' });
    }
});

// Registrar pedido
app.post('/api/pedidos', async (req, res) => {
    const { cliente, productos, total } = req.body;

    if (!cliente || !productos || productos.length === 0) {
        return res.status(400).json({ error: 'Faltan datos del cliente o productos.' });
    }

    try {
        let idMetodoPago = 1; 
        if (cliente.pago && cliente.pago.toLowerCase().includes('transferencia')) {
            idMetodoPago = 2; 
        }

        let idEstadoInicial = 1;

        const [nuevoPedido] = await sql`
            INSERT INTO "Pedido" (
                "Fecha", "ID_estado", "ID_metodo", "Total", 
                "nombre_cliente", "DNI", "Curso", "Telefono"
            ) VALUES (
                NOW(), ${idEstadoInicial}, ${idMetodoPago}, ${total}, 
                ${cliente.nombre}, ${cliente.dni}, ${cliente.curso}, ${cliente.telefono}
            )
            RETURNING "ID_pedido"
        `;

        const idPedidoGenerado = nuevoPedido.ID_pedido;

        for (const prod of productos) {
            await sql`
                INSERT INTO "Detalle_pedido" (
                    "ID_pedido", "ID_producto", "Cantidad", "Precio_unitario"
                ) VALUES (
                    ${idPedidoGenerado}, ${prod.id}, ${prod.cantidad}, ${prod.precio}
                )
            `;
        }

        res.status(201).json({ 
            mensaje: 'Pedido creado exitosamente', 
            idPedido: idPedidoGenerado 
        });

    } catch (error) {
        console.error('Error al registrar pedido:', error);
        res.status(500).json({ error: 'Error interno al procesar la compra: ' + error.message });
    }
});

// ==========================================================
// RUTAS NUEVAS — Gestión individual de imágenes por producto
// (no tocan ni reemplazan las rutas de arriba)
// ==========================================================

// Listar todas las imágenes de un producto puntual
app.get('/api/productos/:id/imagenes', async (req, res) => {
    const { id } = req.params;
    try {
        const resultado = await pool.query(
            'SELECT id, url_imagen, orden FROM imagenes_producto WHERE "ID_producto" = $1 ORDER BY orden ASC',
            [id]
        );
        res.json(resultado.rows);
    } catch (error) {
        console.error('Error al obtener imágenes del producto:', error);
        res.status(500).json({ error: 'Error al obtener imágenes del producto' });
    }
});

// Agregar una o más imágenes NUEVAS a un producto, SIN borrar las existentes
app.post('/api/productos/:id/imagenes', upload.array('imagenes', 5), async (req, res) => {
    const { id } = req.params;
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: 'No se recibió ninguna imagen.' });
        }

        // Calculamos el próximo número de orden para no pisar las que ya existen
        const ordenResultado = await pool.query(
            'SELECT COALESCE(MAX(orden), 0) AS max_orden FROM imagenes_producto WHERE "ID_producto" = $1',
            [id]
        );
        let siguienteOrden = ordenResultado.rows[0].max_orden;

        const nuevasImagenes = [];
        for (const file of req.files) {
            siguienteOrden += 1;
            const urlCloudinary = file.path;
            const insertado = await pool.query(
                `INSERT INTO imagenes_producto ("ID_producto", url_imagen, orden) 
                 VALUES ($1, $2, $3) RETURNING id, url_imagen, orden`,
                [id, urlCloudinary, siguienteOrden]
            );
            nuevasImagenes.push(insertado.rows[0]);
        }

        res.status(201).json({ mensaje: 'Imágenes agregadas correctamente', imagenes: nuevasImagenes });
    } catch (error) {
        console.error('Error al agregar imágenes:', error);
        res.status(500).json({ error: error.message || 'Error al agregar imágenes' });
    }
});

// Reemplazar UNA imagen puntual por su propio id (no afecta a las demás del producto)
app.put('/api/imagenes/:idImagen', upload.single('imagen'), async (req, res) => {
    const { idImagen } = req.params;
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No se recibió ninguna imagen nueva.' });
        }
        const urlCloudinary = req.file.path;
        const actualizado = await pool.query(
            `UPDATE imagenes_producto SET url_imagen = $1 WHERE id = $2 
             RETURNING id, "ID_producto", url_imagen, orden`,
            [urlCloudinary, idImagen]
        );

        if (actualizado.rows.length === 0) {
            return res.status(404).json({ error: 'No se encontró esa imagen.' });
        }

        res.json({ mensaje: 'Imagen reemplazada correctamente', imagen: actualizado.rows[0] });
    } catch (error) {
        console.error('Error al reemplazar imagen:', error);
        res.status(500).json({ error: error.message || 'Error al reemplazar imagen' });
    }
});

// Eliminar UNA imagen puntual por su propio id
app.delete('/api/imagenes/:idImagen', async (req, res) => {
    const { idImagen } = req.params;
    try {
        const eliminado = await pool.query(
            'DELETE FROM imagenes_producto WHERE id = $1 RETURNING id',
            [idImagen]
        );

        if (eliminado.rows.length === 0) {
            return res.status(404).json({ error: 'No se encontró esa imagen.' });
        }

        res.json({ mensaje: 'Imagen eliminada correctamente' });
    } catch (error) {
        console.error('Error al eliminar imagen:', error);
        res.status(500).json({ error: error.message || 'Error al eliminar imagen' });
    }
});

// 5. INICIALIZAR EL SERVIDOR
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Servidor backend corriendo en http://localhost:${PORT}`);
});
module.exports = app
