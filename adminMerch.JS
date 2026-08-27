const API_PRODUCTOS = "http://localhost:3000/api/productos";
const API_CATEGORIAS = "http://localhost:3000/api/categorias";

let productos = [];
let editandoId = null;

// ---------- Autenticación ----------
window.addEventListener("DOMContentLoaded", function() {
    let usuario = localStorage.getItem("empleadoLogueado");
    if (!usuario) {
        window.location.href = "login.html";
        return;
    }
    let bienvenida = document.getElementById("bienvenidaAdmin");
    if (bienvenida) {
        bienvenida.innerText = usuario;
    }
});

function cerrarSesion() {
    localStorage.removeItem("empleadoLogueado");
    window.location.href = "login.html";
}

// ---------- Navegación por Pestañas (Tabs) ----------
function abrirTab(evt, tabId) {
    // Ocultar todos los contenidos de las pestañas
    const tabContents = document.getElementsByClassName("tab-content");
    for (let i = 0; i < tabContents.length; i++) {
        tabContents[i].style.display = "none";
        tabContents[i].classList.remove("active");
    }

    // Quitar la clase 'active' de todos los botones
    const tabBtns = document.getElementsByClassName("tab-btn");
    for (let i = 0; i < tabBtns.length; i++) {
        tabBtns[i].classList.remove("active");
    }

    // Mostrar el tab actual y añadir la clase active al botón pulsado
    document.getElementById(tabId).style.display = "block";
    document.getElementById(tabId).classList.add("active");
    evt.currentTarget.classList.add("active");
}

// ---------- Selectores del Formulario ----------
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
        grid.innerHTML = `<p class="catalogo-vacio text-muted" style="grid-column: 1 / -1; text-align: center;">No se pudo conectar con el servidor. ¿Está corriendo el backend (node server.js)?</p>`;
    }
}

// ---------- Renderizar catálogo adaptado al diseño oscuro ----------
function renderCatalogo() {
    grid.innerHTML = "";

    if (productos.length === 0) {
        grid.innerHTML = `<p class="catalogo-vacio text-muted" style="grid-column: 1 / -1; text-align: center;">Todavía no hay productos cargados.</p>`;
        return;
    }

    productos.forEach((producto) => {
        const card = document.createElement("article");
        card.className = "producto-card";

        const imagenUrl = producto.url_imagen 
                ? producto.url_imagen 
                : "imagenes/img.tecN°24.png";

        // Obtenemos el nombre de la categoría si está disponible para la etiqueta
        const categoriaTexto = selectCategoria.querySelector(`option[value="${producto.id_categoria}"]`) 
                               ? selectCategoria.querySelector(`option[value="${producto.id_categoria}"]`).textContent 
                               : "PRODUCTO";

        card.innerHTML = `
            <div class="producto-img" style="background-image: url('${imagenUrl}')">
                <span class="badge-cat">${categoriaTexto.toUpperCase()}</span>
            </div>
            <div class="producto-info">
                <h3>${producto.nombre}</h3>
                <p class="producto-desc">${producto.descripcion ?? ""}</p>
                
                <div class="producto-footer">
                    <span class="producto-precio">$${Number(producto.precio).toLocaleString("es-AR")}</span>
                    <span class="producto-stock text-muted">Stock: ${producto.stock ?? "-"}</span>
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
}

// ---------- Cargar datos en el formulario para editar ----------
function cargarEnFormulario(id) {
    const producto = productos.find(p => String(p.id) === String(id));
    if (!producto) return;

    inputNombre.value = producto.nombre;
    inputPrecio.value = producto.precio;
    inputDescripcion.value = producto.descripcion ?? "";
    inputStock.value = producto.stock ?? "";
    //adaptar a que se carguen imagenes y cordinar todas las imagenes con cloudinary
    // Solo si tenés "id_categoria" viniendo de tu API:
    if(producto.id_categoria) {
        selectCategoria.value = producto.id_categoria;
    }

    editandoId = id;
    btnSubmit.textContent = "Guardar Cambios";
    
    // Al editar nos aseguramos de estar en la pestaña catálogo
    document.querySelector('.tabs-nav button:nth-child(3)').click();
    
    form.scrollIntoView({ behavior: "smooth", block: "center" });
}


// ---------- Crear / editar ----------
form.addEventListener("submit", async (e) => {
    e.preventDefault();

    // 1. Instanciamos FormData para enviar texto + archivos físicamente
    const formData = new FormData();
    formData.append("nombre", inputNombre.value.trim());
    formData.append("precio", inputPrecio.value);
    formData.append("descripcion", inputDescripcion.value.trim());
    formData.append("stock", inputStock.value);
    formData.append("id_categoria", selectCategoria.value);

    // 2. Capturamos los archivos seleccionados en el input file
    const inputImagenes = document.getElementById("imagenes");
    if (inputImagenes && inputImagenes.files.length > 0) {
        for (let i = 0; i < inputImagenes.files.length; i++) {
            // 'imagenes' debe coincidir con upload.array('imagenes') en tu backend Express
            formData.append("imagenes", inputImagenes.files[i]);
        }
    }

    try {
        let respuesta;
        if (editandoId !== null) {
            // Edición de producto
            respuesta = await fetch(`${API_PRODUCTOS}/${editandoId}`, {
                method: "PUT",
                body: formData // NO agregar Headers de Content-Type acá
            });
        } else {
            // Creación de producto
            respuesta = await fetch(API_PRODUCTOS, {
                method: "POST",
                body: formData // NO agregar Headers de Content-Type acá
            });
        }

        if (!respuesta.ok) {
            const errorBackend = await respuesta.json();
            console.error("Detalle exacto del backend:", errorBackend);
            alert(`Error del servidor: ${errorBackend.error || 'No se pudo guardar'}`);
            return;
        }
        // 3. Reseteo del estado y de la interfaz
        editandoId = null;
        btnSubmit.textContent = "+ AGREGAR PRODUCTO";
        form.reset();
        await cargarProductos();
        
    } catch (error) {
        console.error(error);
        alert("No se pudo guardar el producto.");
    }
});

cargarCategorias();
cargarProductos();