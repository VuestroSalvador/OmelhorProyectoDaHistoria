// ==========================================
// 1. VARIABLES GLOBALES
// ==========================================
let carrito = JSON.parse(localStorage.getItem('carrito')) || [];

// ==========================================
// 2. AL CARGAR LA PÁGINA
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    cargarProductos();     // Trae los productos de Neon
    actualizarContador();  // Actualiza el número del botón "Ver carrito"
});

// ==========================================
// 3. FUNCIONES DE INTERFAZ (Menú y Buscador)
// ==========================================
function toggleMenu() {
    document.getElementById("menu").classList.toggle("show");
}

function buscar() {
    let input = document.getElementById("buscador").value.toLowerCase();
    let cards = document.getElementsByClassName("card");
    for (let i = 0; i < cards.length; i++) {
        let texto = cards[i].innerText.toLowerCase();
        cards[i].style.display = texto.includes(input) ? "block" : "none";
    }
}

// ==========================================
// 4. FUNCIONES DEL CARRITO
// ==========================================
function cambiarCantidad(btn, cambio) {
    const spanCant = btn.parentElement.querySelector('.cant');
    let cantidad = parseInt(spanCant.innerText) + cambio;
    if (cantidad < 1) cantidad = 1;
    spanCant.innerText = cantidad;
}

function agregarAlCarrito(id, nombre, precio, imagen, btn) {
    const card = btn.closest('.card');
    const cantidad = parseInt(card.querySelector('.cant').innerText);

    const index = carrito.findIndex(item => item.id === id);

    if (index !== -1) {
        carrito[index].cantidad += cantidad;
    } else {
        carrito.push({ id, nombre, precio, imagen, cantidad });
    }

    localStorage.setItem('carrito', JSON.stringify(carrito));
    actualizarContador();
    alert(`¡Se agregaron ${cantidad} unidad(es) de "${nombre}" al carrito!`);
}

function actualizarContador() {
    const contador = document.getElementById('contador-carrito');
    if (contador) {
        const totalItems = carrito.reduce((acc, item) => acc + item.cantidad, 0);
        contador.innerText = totalItems;
    }
}

// ==========================================
// 5. CARGA DINÁMICA DESDE LA BASE DE DATOS (NEON)
// ==========================================
async function cargarProductos() {
    try {
        const respuesta = await fetch('http://localhost:3000/api/productos');
        const productos = await respuesta.json();

        const contenedores = {
            'indumentaria': document.getElementById('contenedor-indumentaria'),
            'tazas': document.getElementById('contenedor-tazas'),
            'componentes': document.getElementById('contenedor-componentes')
        };

        productos.forEach(prod => {
            const cat = prod.categoria ? prod.categoria.toLowerCase() : '';
            const imagenUrl = prod.imagen ? `imagenes/${prod.imagen}` : 'imagenes/default.jpeg';

            const card = `
                <div class="card">
                    <img src="${imagenUrl}" alt="${prod.nombre}">
                    <h2>${prod.nombre}</h2>
                    <p>${prod.descripcion ? prod.descripcion : ''}</p>
                    <span class="precio">$${prod.precio ? prod.precio : 0}</span>
                    
                    <div class="cantidad-contenedor">
                        <button class="btn-cant" onclick="cambiarCantidad(this, -1)">−</button>
                        <span class="cant">1</span>
                        <button class="btn-cant" onclick="cambiarCantidad(this, 1)">+</button>
                    </div>

                    <button class="btn-comprar" onclick="agregarAlCarrito('${prod.id}', '${prod.nombre}', ${prod.precio || 0}, '${imagenUrl}', this)">
                        Agregar al carrito
                    </button>
                </div>
            `;

            if (contenedores[cat]) {
                contenedores[cat].innerHTML += card;
            }
        });
    } catch (error) {
        console.error('Error al conectar con el servidor backend:', error);
    }
}