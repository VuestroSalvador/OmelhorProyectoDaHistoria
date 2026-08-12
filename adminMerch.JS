const API_PRODUCTOS = "http://localhost:3000/api/productos";
const API_CATEGORIAS = "http://localhost:3000/api/categorias";

let productos = [];
let editandoId = null;

const grid = document.getElementById("catalogo-grid");
const form = document.getElementById("form-producto");
const btnSubmit = document.getElementById("btn-submit");

const inputNombre = document.getElementById("nombre");
const inputPrecio = document.getElementById("precio");
const inputDescripcion = document.getElementById("descripcion");
const inputStock = document.getElementById("stock");
const selectCategoria = document.getElementById("categoria");

// ---------- Cargar categorías en el selector ----------
async function cargarCategorias() {
    try {
        const respuesta = await fetch(API_CATEGORIAS);
        if (!respuesta.ok) throw new Error("Error al obtener categorías");
        const categorias = await respuesta.json();

        categorias.forEach((cat) => {
            const option = document.createElement("option");
            option.value = cat.id;
            option.textContent = cat.nombre;
            selectCategoria.appendChild(option);
        });
    } catch (error) {
        console.error(error);
    }
}

// ---------- Traer productos desde el backend ----------
async function cargarProductos() {
    try {
        const respuesta = await fetch(API_PRODUCTOS);
        if (!respuesta.ok) throw new Error("Error al obtener productos");
        productos = await respuesta.json();
        renderCatalogo();
    } catch (error) {
        console.error(error);
        grid.innerHTML = `<p class="catalogo-vacio">No se pudo conectar con el servidor. ¿Está corriendo el backend (node server.js)?</p>`;
    }
}

// ---------- Renderizar catálogo ----------
function renderCatalogo() {
    grid.innerHTML = "";

    if (productos.length === 0) {
        grid.innerHTML = `<p class="catalogo-vacio">Todavía no hay productos cargados.</p>`;
        return;
    }

    productos.forEach((producto) => {
        const card = document.createElement("article");
        card.className = "producto-card";
        card.innerHTML = `
            <div class="producto-img" style="background-image: url('${producto.imagen || "imagenes/img.tecN24.png"}')"></div>
            <div class="producto-info">
                <h3>${producto.nombre}</h3>
                <p class="producto-desc">${producto.descripcion ?? ""}</p>
                <div class="producto-footer">
                    <span class="producto-precio">$${Number(producto.precio).toLocaleString("es-AR")}</span>
                    <span class="producto-stock">Stock: ${producto.stock ?? "-"}</span>
                </div>
                <div class="producto-acciones">
                    <button class="btn-editar" data-id="${producto.id}">Editar</button>
                    <button class="btn-eliminar" data-id="${producto.id}" disabled title="Eliminar no disponible por el momento">Eliminar</button>
                </div>
            </div>
        `;
        grid.appendChild(card);
    });

    document.querySelectorAll(".btn-editar").forEach(btn => {
        btn.addEventListener("click", () => cargarEnFormulario(btn.dataset.id));
    });

    // El botón "Eliminar" queda deshabilitado a propósito: no está implementado.
}

// ---------- Cargar datos en el formulario para editar ----------
function cargarEnFormulario(id) {
    const producto = productos.find(p => String(p.id) === String(id));
    if (!producto) return;

    inputNombre.value = producto.nombre;
    inputPrecio.value = producto.precio;
    inputDescripcion.value = producto.descripcion ?? "";
    inputStock.value = producto.stock ?? "";
    // La categoría no viene con id en el GET actual, así que no se precarga
    // en el selector; si necesitás precargarla, agregá "ID_categoria AS id_categoria"
    // al SELECT de /api/productos en server.js.

    editandoId = id;
    btnSubmit.textContent = "Guardar Cambios";
    form.scrollIntoView({ behavior: "smooth", block: "center" });
}

// ---------- Crear / editar ----------
form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const datosProducto = {
        nombre: inputNombre.value.trim(),
        precio: inputPrecio.value,
        descripcion: inputDescripcion.value.trim(),
        stock: inputStock.value,
        id_categoria: selectCategoria.value,
    };

    try {
        let respuesta;
        if (editandoId !== null) {
            respuesta = await fetch(`${API_PRODUCTOS}/${editandoId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(datosProducto),
            });
        } else {
            respuesta = await fetch(API_PRODUCTOS, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(datosProducto),
            });
        }

        if (!respuesta.ok) throw new Error("Error al guardar el producto");

        editandoId = null;
        btnSubmit.textContent = "Confirmar Producto";
        form.reset();
        await cargarProductos();
    } catch (error) {
        console.error(error);
        alert("No se pudo guardar el producto.");
    }
});

cargarCategorias();
cargarProductos();