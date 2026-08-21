// ==========================================
// . VARIABLES DE ESTADO DE LA PÁGINA DE PRODUCTO
// ==========================================
let productoActual = null;
let cantidadActual = 1;
let imagenesGaleria = [];
let indiceImagenActual = 0;

// ==========================================
// . AL CARGAR LA PÁGINA
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    cargarProducto();

    document.getElementById('prodPrev').addEventListener('click', () => {
        const nuevo = indiceImagenActual === 0 ? imagenesGaleria.length - 1 : indiceImagenActual - 1;
        mostrarImagen(nuevo);
    });

    document.getElementById('prodNext').addEventListener('click', () => {
        const nuevo = indiceImagenActual === imagenesGaleria.length - 1 ? 0 : indiceImagenActual + 1;
        mostrarImagen(nuevo);
    });
});

// ==========================================
// . MENÚ (mismo comportamiento que en merch.html)
// ==========================================
function toggleMenu() {
    document.getElementById("menu").classList.toggle("show");
}

// ==========================================
// . CARGA DEL PRODUCTO DESDE LA BASE DE DATOS (NEON)
// ==========================================
async function cargarProducto() {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    const contenedorInfo = document.querySelector('.prod-info');

    try {
        const respuesta = await fetch('http://localhost:3000/api/productos');
        const productos = await respuesta.json();

        // Si la URL no trae ?id=, mostramos el primer producto como referencia
        const producto = id
            ? productos.find(p => String(p.id) === String(id))
            : productos[0];

        if (!producto) {
            contenedorInfo.innerHTML = '<p class="prod-error">No encontramos este producto. <a href="merch.html">Volver al catálogo</a></p>';
            return;
        }

        productoActual = producto;
        renderizarProducto(producto);

    } catch (error) {
        console.error('Error al conectar con el servidor backend:', error);
        contenedorInfo.innerHTML = '<p class="prod-error">No pudimos cargar el producto. Probá de nuevo más tarde.</p>';
    }
}

// ==========================================
// . RENDERIZADO DE LA INFO Y LA GALERÍA
// ==========================================
function renderizarProducto(prod) {
    const imagenUrl = prod.imagen ? `imagenes/${prod.imagen}` : 'imagenes/default.jpeg';

    // Nota: solo tenemos una foto por producto en la base de datos.
    // Repetimos la misma imagen como placeholder para armar la galería de miniaturas.
    imagenesGaleria = [imagenUrl, imagenUrl, imagenUrl, imagenUrl];
    indiceImagenActual = 0;

    document.getElementById('prod-img-principal').src = imagenUrl;
    document.getElementById('prod-img-principal').alt = prod.nombre;
    document.getElementById('prod-nombre').innerText = prod.nombre;
    document.getElementById('prod-precio').innerText = `$${prod.precio ? prod.precio : 0}`;
    document.getElementById('prod-descripcion').innerText = prod.descripcion ? prod.descripcion : '';

    const thumbs = document.getElementById('prod-thumbs');
    thumbs.innerHTML = '';
    imagenesGaleria.forEach((src, i) => {
        const thumb = document.createElement('img');
        thumb.src = src;
        thumb.alt = `${prod.nombre} - vista ${i + 1}`;
        thumb.className = 'prod-thumb' + (i === 0 ? ' active' : '');
        thumb.addEventListener('click', () => mostrarImagen(i));
        thumbs.appendChild(thumb);
    });

    document.getElementById('btnAgregarProd').onclick = () => agregarAlCarritoProd(false);
    document.getElementById('btnComprarAhora').onclick = () => agregarAlCarritoProd(true);
}

function mostrarImagen(indice) {
    indiceImagenActual = indice;
    document.getElementById('prod-img-principal').src = imagenesGaleria[indice];
    document.querySelectorAll('.prod-thumb').forEach((t, i) => {
        t.classList.toggle('active', i === indice);
    });
}

// ==========================================
// . CANTIDAD
// ==========================================
function cambiarCantidadProd(cambio) {
    cantidadActual = Math.max(1, cantidadActual + cambio);
    document.getElementById('prod-cant').innerText = cantidadActual;
}

// ==========================================
// . CARRITO (misma estructura de datos que usa merch.html/compra.html)
// ==========================================
function agregarAlCarritoProd(comprarAhora) {
    if (!productoActual) return;

    let carrito = JSON.parse(localStorage.getItem('carrito')) || [];
    const imagenUrl = productoActual.imagen ? `imagenes/${productoActual.imagen}` : 'imagenes/default.jpeg';

    const index = carrito.findIndex(item => item.id === productoActual.id);
    if (index !== -1) {
        carrito[index].cantidad += cantidadActual;
    } else {
        carrito.push({
            id: productoActual.id,
            nombre: productoActual.nombre,
            precio: productoActual.precio || 0,
            imagen: imagenUrl,
            cantidad: cantidadActual
        });
    }

    localStorage.setItem('carrito', JSON.stringify(carrito));

    if (comprarAhora) {
        window.location.href = 'compra.html';
    } else {
        alert(`¡Se agregaron ${cantidadActual} unidad(es) de "${productoActual.nombre}" al carrito!`);
    }
}
