let carrito = JSON.parse(localStorage.getItem("carrito")) || [];
let total = 0;

let lista = document.getElementById("listaResumen");
carrito.forEach((item, index) => {
    let subtotal = item.precio * item.cantidad;
    total += subtotal;
    lista.innerHTML += `
        <div class="fila-pedido">
            <span>${item.nombre} x${item.cantidad} — $${subtotal.toLocaleString('es-AR')}</span>
            <button class="btn-borrar" onclick="eliminarDelCarrito(${index})">🗑️</button>
        </div>
    `;
});
document.getElementById("totalFinal").innerHTML = "<strong>Total: $" + total.toLocaleString('es-AR') + "</strong>";

function eliminarDelCarrito(index) {
    carrito.splice(index, 1);
    localStorage.setItem("carrito", JSON.stringify(carrito));
    location.reload(); // Recarga la página para refrescar la lista y el total
}

async function finalizarCompra() {
    let nombre = document.getElementById("nombre").value.trim();
    let dni = document.getElementById("dni").value.trim();
    let curso = document.getElementById("curso").value.trim();
    let telefono = document.getElementById("telefono").value.trim();
    let pagoInput = document.querySelector('input[name="pago"]:checked');

    if (!nombre || !dni || !curso || !telefono || !pagoInput) {
        alert("Por favor, completa todos los datos del formulario antes de finalizar.");
        return;
    }

    if (carrito.length === 0) {
        alert("Tu carrito está vacío.");
        return;
    }

    let totalAcumulado = carrito.reduce((acc, item) => acc + (item.precio * item.cantidad), 0);

    const pedidoData = {
        cliente: {
            nombre: nombre,
            dni: dni,
            curso: curso,
            telefono: telefono,
            pago: pagoInput.value
        },
        productos: carrito,
        total: totalAcumulado
    };

    const esLocal = ["localhost", "127.0.0.1"].includes(window.location.hostname);
    const BASE_URL = esLocal
        ? "http://localhost:3000"
        : "https://express-js-on-vercel-self-omega-30.vercel.app";

    try {
        const respuesta = await fetch(`${BASE_URL}/api/pedidos`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(pedidoData)
        });

        const resultado = await respuesta.json();

        if (respuesta.ok) {
            alert(`¡Pedido #${resultado.idPedido} guardado con éxito! Gracias por tu compra.`);
            carrito = [];
            localStorage.removeItem("carrito");
            location.reload();
        } else {
            alert("Hubo un problema al procesar el pedido: " + resultado.error);
        }
    } catch (error) {
        console.error("Error en la petición:", error);
        alert("No se pudo conectar con el servidor para guardar la compra.");
    }
}
// ==========================================================
// CARGAR Y RENDERIZAR PEDIDOS EN EL PANEL DE EMPLEADOS
// ==========================================================
const API_PEDIDOS = `${BASE_URL}/api/pedidos`;

async function cargarPedidos() {
    const contenedor = document.getElementById("contenedor-pedidos");
    if (!contenedor) return;

    try {
        const respuesta = await fetch(API_PEDIDOS);
        if (!respuesta.ok) throw new Error("Error al obtener los pedidos");
        const pedidos = await respuesta.json();

        // Actualizar contadores visuales en la pestaña y estadísticas si existen
        const badgePedidos = document.querySelector('.tabs-nav button:nth-child(1) .badge');
        if (badgePedidos) badgePedidos.textContent = pedidos.length;

        renderPedidos(pedidos);
    } catch (error) {
        console.error("Error al cargar pedidos:", error);
        contenedor.innerHTML = `<p class="text-muted" style="text-align: center; padding: 20px;">No se pudieron cargar los pedidos del servidor.</p>`;
    }
}

function renderPedidos(pedidos) {
    const contenedor = document.getElementById("contenedor-pedidos");
    contenedor.innerHTML = "";

    if (pedidos.length === 0) {
        contenedor.innerHTML = `<p class="text-muted" style="text-align: center; padding: 20px;">No hay pedidos recibidos por el momento.</p>`;
        return;
    }

    pedidos.forEach((p) => {
        const fechaFormateada = p.fecha ? new Date(p.fecha).toLocaleDateString('es-AR') : "Reciente";
        
        let itemsHtml = "";
        if (p.productos && p.productos.length > 0) {
            p.productos.forEach(prod => {
                const subtotalItem = prod.cantidad * prod.precio_unitario;
                itemsHtml += `<li><span>${prod.cantidad}× ${prod.nombre_producto}</span> <span>$${Number(subtotalItem).toLocaleString('es-AR')}</span></li>`;
            });
        }

        const card = document.createElement("div");
        card.className = "order-card";
        card.style.marginBottom = "16px";
        card.innerHTML = `
            <div class="order-header">
                <div>
                    <span class="order-id text-gold">PED-${p.id}</span>
                    <span class="badge-status bg-gold">PENDIENTE</span>
                </div>
                <div class="order-actions">
                    <span class="order-total text-gold">$${Number(p.total).toLocaleString('es-AR')}</span>
                    <button class="btn-success">✓ RESOLVER</button>
                </div>
            </div>
            <div class="order-body">
                <h3>${p.cliente}</h3>
                <p class="order-date">${fechaFormateada} — Curso: ${p.curso || 'N/D'} — DNI: ${p.dni || 'N/D'}</p>
                <ul class="order-items">
                    ${itemsHtml}
                </ul>
                <p class="order-delivery">🏫 Pago: ${p.metodo === 2 ? 'Transferencia' : 'Efectivo'} — Tel: ${p.telefono || 'N/D'}</p>
            </div>
        `;
        contenedor.appendChild(card);
    });
}

// Ejecutar la carga de pedidos al iniciar la página de administración
cargarPedidos();