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

// Arrancar el servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Servidor backend corriendo en http://localhost:${PORT}`);
});