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
                p."Stock" AS stock,
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
app.post('/api/pedidos', async (req, res) => {
    const { cliente, productos, total } = req.body;

    if (!cliente || !productos || productos.length === 0) {
        return res.status(400).json({ error: 'Faltan datos del cliente o productos.' });
    }

    try {
        // 1. Mapear el medio de pago recibido al ID_Metodo correspondiente
        let idMetodoPago = 1; // Por defecto 1 (efectivo)
        if (cliente.pago && cliente.pago.toLowerCase().includes('transferencia')) {
            idMetodoPago = 2; // ID para transferencia
        }

        // 2. Estado inicial por defecto: 1 (pendiente de pago)
        let idEstadoInicial = 1;

        // 3. Insertar el pedido
        const [nuevoPedido] = await sql`
            INSERT INTO "Pedido" (
                "Fecha", 
                "ID_estado", 
                "ID_metodo", 
                "Total", 
                "nombre_cliente", 
                "DNI", 
                "Curso", 
                "Telefono"
            ) VALUES (
                NOW(), 
                ${idEstadoInicial}, 
                ${idMetodoPago}, 
                ${total}, 
                ${cliente.nombre}, 
                ${cliente.dni}, 
                ${cliente.curso}, 
                ${cliente.telefono}
            )
            RETURNING "ID_pedido"
        `;

        const idPedidoGenerado = nuevoPedido.ID_pedido;

        // 4. Insertar cada producto del carrito en Detalle_pedido (si manejas esa tabla)
        for (const prod of productos) {
            await sql`
                INSERT INTO "Detalle_pedido" (
                    "ID_pedido", 
                    "ID_producto", 
                    "Cantidad", 
                    "Precio_unitario"
                ) VALUES (
                    ${idPedidoGenerado}, 
                    ${prod.id}, 
                    ${prod.cantidad}, 
                    ${prod.precio}
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


// crear un producto nuevo
app.post('/api/productos', async (req, res) => {
    try {
        const { nombre, precio, descripcion, stock, id_categoria, imagen } = req.body;
        const imagenFinal = imagen ?? null;
        
        const resultado = await sql`
            INSERT INTO "Producto" ("Nombre", "Precio", "Descripcion", "Stock", "ID_categoria", "Imagen")
            VALUES (${nombre}, ${precio}, ${descripcion}, ${stock}, ${id_categoria}, ${imagen})
            RETURNING 
                "ID_producto" AS id,
                "Nombre" AS nombre,
                "Precio" AS precio,
                "Descripcion" AS descripcion,
                "Stock" AS stock,
                "Imagen" AS imagen
        `;

        res.status(201).json(resultado[0]);
    } catch (error) {
        console.error('Error al crear producto:', error);
        res.status(500).json({ error: 'Error al crear producto' });
    }
});

// editar un producto existente
app.put('/api/productos/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { nombre, precio, descripcion, stock } = req.body;

        const resultado = await sql`
            UPDATE "Producto"
            SET 
                "Nombre" = ${nombre},
                "Precio" = ${precio},
                "Descripcion" = ${descripcion},
                "Stock" = ${stock}
            WHERE "ID_producto" = ${id}
            RETURNING 
                "ID_producto" AS id,
                "Nombre" AS nombre,
                "Precio" AS precio,
                "Descripcion" AS descripcion,
                "Stock" AS stock,
                "Imagen" AS imagen
        `;

        if (resultado.length === 0) {
            return res.status(404).json({ error: 'Producto no encontrado' });
        }

        res.json(resultado[0]);
    } catch (error) {
        console.error('Error al editar producto:', error);
        res.status(500).json({ error: 'Error al editar producto' });
    }
});

// obtener categorías desde Neon (para el selector del formulario)
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
// Arrancar el servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Servidor backend corriendo en http://localhost:${PORT}`);
});