const isLocal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
const BASE_URL = isLocal
    ? "http://localhost:3000"
    : "https://express-js-on-vercel-self-omega-30.vercel.app";

const API_PRODUCTOS = `${BASE_URL}/api/productos`;
const API_CATEGORIAS = `${BASE_URL}/api/categorias`;
const API_IMAGENES = `${BASE_URL}/api/imagenes`;
const API_PEDIDOS = `${BASE_URL}/api/pedidos`;

let productos = [];
let editandoId = null;
let productoImagenesId = null;

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
    const tabContents = document.getElementsByClassName("tab-content");
    for (let i = 0; i < tabContents.length; i++) {
        tabContents[i].style.display = "none";
        tabContents[i].classList.remove("active");
    }

    const tabBtns = document.getElementsByClassName("tab-btn");
    for (let i = 0; i < tabBtns.length; i++) {
        tabBtns[i].classList.remove("active");
    }

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

const formCategoria = document.getElementById("form-categoria");
const selectGestionCategoria = document.getElementById("select-gestion-categoria");
const inputNombreCategoria = document.getElementById("nombre-categoria");
const btnSubmitCategoria = document.getElementById("btn-submit-categoria");
const btnEliminarCategoria = document.getElementById("btn-eliminar-categoria");
let listaCategorias = [];

// ---------- Cargar categorías en ambos selectores ----------
async function cargarCategorias() {
    try {
        const respuesta = await fetch(API_CATEGORIAS);
        if (!respuesta.ok) throw new Error("Error al obtener categorías");
        listaCategorias = await respuesta.json();

        selectCategoria.innerHTML = '<option value="" disabled selected>Seleccionar categoría</option>';
        selectGestionCategoria.innerHTML = '';

        listaCategorias.forEach((cat) => {
            const optionProd = document.createElement("option");
            optionProd.value = cat.id;
            optionProd.textContent = cat.nombre;
            selectCategoria.appendChild(optionProd);

            const optionGest = document.createElement("option");
            optionGest.value = cat.id;
            optionGest.textContent = cat.nombre;
            selectGestionCategoria.appendChild(optionGest);
        });

        const optionNueva = document.createElement("option");
        optionNueva.value = "NUEVA";
        optionNueva.textContent = "+ Agregar categoría";
        selectGestionCategoria.appendChild(optionNueva);

        selectGestionCategoria.value = "NUEVA";
        resetearFormCategoria();

    } catch (error) {
        console.error("Error al cargar categorías:", error);
    }
}

if (selectGestionCategoria) {
    selectGestionCategoria.addEventListener("change", () => {
        const valor = selectGestionCategoria.value;
        if (valor === "NUEVA") {
            resetearFormCategoria();
        } else {
            const catSeleccionada = listaCategorias.find(c => String(c.id) === String(valor));
            if (catSeleccionada) {
                inputNombreCategoria.value = catSeleccionada.nombre;
                btnSubmitCategoria.textContent = "Guardar Cambios";
                btnEliminarCategoria.style.display = "inline-block";
            }
        }
    });
}

function resetearFormCategoria() {
    inputNombreCategoria.value = "";
    btnSubmitCategoria.textContent = "+ CREAR CATEGORÍA";
    btnEliminarCategoria.style.display = "none";
}

// ---------- Crear / Editar Categoría ----------
if (formCategoria) {
    formCategoria.addEventListener("submit", async (e) => {
        e.preventDefault();
        const nombreCat = inputNombreCategoria.value.trim();
        const modo = selectGestionCategoria.value;

        if (!nombreCat) return;

        try {
            let respuesta;
            if (modo === "NUEVA") {
                respuesta = await fetch(API_CATEGORIAS, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ nombre: nombreCat })
                });
            } else {
                respuesta = await fetch(`${API_CATEGORIAS}/${modo}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ nombre: nombreCat })
                });
            }

            const data = await respuesta.json();
            if (!respuesta.ok) {
                alert(`Error: ${data.error || "No se pudo procesar la categoría"}`);
                return;
            }

            alert(data.mensaje || "Categoría guardada exitosamente");
            await cargarCategorias();
            await cargarProductos();

        } catch (error) {
            console.error(error);
            alert("Ocurrió un error al guardar la categoría.");
        }
    });
}

// ---------- Eliminar Categoría ----------
if (btnEliminarCategoria) {
    btnEliminarCategoria.addEventListener("click", async () => {
        const idCat = selectGestionCategoria.value;
        if (idCat === "NUEVA") return;

        if (!confirm("¿Seguro que querés eliminar esta categoría?")) return;

        try {
            const respuesta = await fetch(`${API_CATEGORIAS}/${idCat}`, {
                method: "DELETE"
            });
            const data = await respuesta.json();

            if (!respuesta.ok) {
                alert(`No se pudo eliminar: ${data.error}`);
                return;
            }

            alert("Categoría eliminada correctamente");
            await cargarCategorias();
            await cargarProductos();

        } catch (error) {
            console.error(error);
            alert("Error al intentar eliminar la categoría.");
        }
    });
}

// ---------- Traer productos desde el backend ----------
async function cargarProductos() {
    try {
        const respuesta = await fetch(`${API_PRODUCTOS}?todos=true`);
        if (!respuesta.ok) throw new Error("Error al obtener productos");
        productos = await respuesta.json();
        renderCatalogo();
    } catch (error) {
        console.error(error);
        if (grid) {
            grid.innerHTML = `<p class="catalogo-vacio text-muted" style="grid-column: 1 / -1; text-align: center;">No se pudo conectar con el servidor.</p>`;
        }
    }
}

// ---------- Renderizar catálogo ----------
function renderCatalogo() {
    if (!grid) return;
    grid.innerHTML = "";

    if (productos.length === 0) {
        grid.innerHTML = `<p class="catalogo-vacio text-muted" style="grid-column: 1 / -1; text-align: center;">Todavía no hay productos cargados.</p>`;
        return;
    }

    productos.forEach((producto) => {
        const card = document.createElement("article");
        const estaOculto = producto.visible === false;
        card.className = "producto-card" + (estaOculto ? " oculto" : "");

        const imagenUrl = producto.url_imagen 
                ? producto.url_imagen 
                : "imagenes/img.tecN°24.png";

        const categoriaTexto = selectCategoria.querySelector(`option[value="${producto.id_categoria}"]`) 
                               ? selectCategoria.querySelector(`option[value="${producto.id_categoria}"]`).textContent 
                               : "PRODUCTO";

        card.innerHTML = `
            <div class="producto-img" style="background-image: url('${imagenUrl}')">
                <span class="badge-cat">${categoriaTexto.toUpperCase()}</span>
                ${estaOculto ? '<span class="badge-oculto">🚫 OCULTO</span>' : ''}
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
                    <button class="btn-imagenes" data-id="${producto.id}">🖼 Gestionar imágenes</button>
                    <button class="btn-ocultar${estaOculto ? ' activo' : ''}" data-id="${producto.id}" data-visible-actual="${!estaOculto}">
                        ${estaOculto ? '👁 Mostrar' : '🚫 Ocultar'}
                    </button>
                </div>
            </div>
        `;
        grid.appendChild(card);
    });

    document.querySelectorAll(".btn-editar").forEach(btn => {
        btn.addEventListener("click", () => cargarEnFormulario(btn.dataset.id));
    });

    document.querySelectorAll(".btn-ocultar").forEach(btn => {
        btn.addEventListener("click", () => toggleVisibilidadProducto(btn));
    });

    document.querySelectorAll(".btn-imagenes").forEach(btn => {
        btn.addEventListener("click", () => abrirModalImagenes(btn.dataset.id));
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
    if (producto.id_categoria) {
        selectCategoria.value = producto.id_categoria;
    }

    editandoId = id;
    btnSubmit.textContent = "Guardar Cambios";

    const inputImagenesForm = document.getElementById("imagenes");
    if (inputImagenesForm) inputImagenesForm.required = false;

    document.querySelector('.tabs-nav button:nth-child(3)').click();
    form.scrollIntoView({ behavior: "smooth", block: "center" });
}

// ---------- Crear / editar producto ----------
if (form) {
    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const formData = new FormData();
        formData.append("nombre", inputNombre.value.trim());
        formData.append("precio", inputPrecio.value);
        formData.append("descripcion", inputDescripcion.value.trim());
        formData.append("stock", inputStock.value);
        formData.append("id_categoria", selectCategoria.value);

        const inputImagenes = document.getElementById("imagenes");
        if (inputImagenes && inputImagenes.files.length > 0) {
            for (let i = 0; i < inputImagenes.files.length; i++) {
                formData.append("imagenes", inputImagenes.files[i]);
            }
        }

        try {
            let respuesta;
            if (editandoId !== null) {
                respuesta = await fetch(`${API_PRODUCTOS}/${editandoId}`, {
                    method: "PUT",
                    body: formData
                });
            } else {
                respuesta = await fetch(API_PRODUCTOS, {
                    method: "POST",
                    body: formData
                });
            }

            if (!respuesta.ok) {
                const errorBackend = await respuesta.json();
                console.error("Detalle exacto del backend:", errorBackend);
                alert(`Error del servidor: ${errorBackend.error || 'No se pudo guardar'}`);
                return;
            }

            editandoId = null;
            btnSubmit.textContent = "+ AGREGAR PRODUCTO";
            form.reset();
            if (inputImagenes) inputImagenes.required = true;
            await cargarProductos();
            
        } catch (error) {
            console.error(error);
            alert("No se pudo guardar el producto.");
        }
    });
}

// ==========================================================
// Cargar y renderizar Pedidos
// ==========================================================
async function cargarPedidos() {
    const contenedor = document.getElementById("contenedor-pedidos");
    if (!contenedor) return;

    try {
        const respuesta = await fetch(API_PEDIDOS);
        if (!respuesta.ok) throw new Error("Error al obtener los pedidos");
        const pedidos = await respuesta.json();

        // Actualiza el indicador visual de la pestaña
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
    if (!contenedor) return;
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

// ---------- Inicialización ----------
cargarCategorias();
cargarProductos();
cargarPedidos();

const inputImagenesInicial = document.getElementById("imagenes");
if (inputImagenesInicial) inputImagenesInicial.required = true;

// ==========================================================
// MODAL "GESTIONAR IMÁGENES"
// ==========================================================
const modalOverlay = document.getElementById("modal-imagenes-overlay");
const modalGrid = document.getElementById("modal-imagenes-grid");
const modalVacio = document.getElementById("modal-imagenes-vacio");
const modalTitulo = document.getElementById("modal-imagenes-titulo");
let inputAgregarImagenes = document.getElementById("input-agregar-imagenes");
const modalAgregarZona = document.getElementById("modal-agregar-zona");
const MAX_IMAGENES_POR_PRODUCTO = 6;
let cantidadImagenesModal = 0;

async function abrirModalImagenes(idProducto) {
    productoImagenesId = idProducto;
    const producto = productos.find(p => String(p.id) === String(idProducto));
    modalTitulo.textContent = producto ? `Gestionar imágenes — ${producto.nombre}` : "Gestionar imágenes";

    modalOverlay.classList.add("show");
    await cargarImagenesDelModal();
}

function cerrarModalImagenes() {
    modalOverlay.classList.remove("show");
    productoImagenesId = null;
    if (inputAgregarImagenes) inputAgregarImagenes.value = "";
}

async function cargarImagenesDelModal() {
    if (!productoImagenesId) return;

    modalGrid.innerHTML = "";
    modalVacio.style.display = "none";

    try {
        const respuesta = await fetch(`${API_PRODUCTOS}/${productoImagenesId}/imagenes`);
        if (!respuesta.ok) throw new Error("No se pudieron obtener las imágenes");
        const imagenes = await respuesta.json();

        cantidadImagenesModal = imagenes.length;
        actualizarZonaAgregar();

        if (imagenes.length === 0) {
            modalVacio.style.display = "block";
            return;
        }

        imagenes.forEach((img) => {
            const item = document.createElement("div");
            item.className = "modal-img-item";
            item.innerHTML = `
                <img src="${img.url_imagen}" alt="Imagen del producto">
                <div class="modal-img-acciones">
                    <button class="btn-reemplazar-img" data-img-id="${img.id}">Reemplazar</button>
                    <button class="btn-eliminar-img" data-img-id="${img.id}">Eliminar</button>
                </div>
                <input type="file" accept="image/*" data-reemplazo-de="${img.id}" style="display:none;">
            `;
            modalGrid.appendChild(item);
        });

        modalGrid.querySelectorAll(".btn-reemplazar-img").forEach((btn) => {
            btn.addEventListener("click", () => {
                const inputOculto = modalGrid.querySelector(`input[data-reemplazo-de="${btn.dataset.imgId}"]`);
                inputOculto.click();
            });
        });

        modalGrid.querySelectorAll('input[type="file"][data-reemplazo-de]').forEach((input) => {
            input.addEventListener("change", () => reemplazarImagen(input.dataset.reemplazoDe, input));
        });

        modalGrid.querySelectorAll(".btn-eliminar-img").forEach((btn) => {
            btn.addEventListener("click", () => eliminarImagen(btn.dataset.imgId));
        });

    } catch (error) {
        console.error(error);
        modalGrid.innerHTML = `<p style="color:#ff8080; font-size:13px;">No se pudieron cargar las imágenes.</p>`;
    }
}

async function reemplazarImagen(idImagen, inputFile) {
    if (!inputFile.files || inputFile.files.length === 0) return;

    const formData = new FormData();
    formData.append("imagen", inputFile.files[0]);

    try {
        const respuesta = await fetch(`${API_IMAGENES}/${idImagen}`, {
            method: "PUT",
            body: formData
        });

        if (!respuesta.ok) {
            const errorBackend = await respuesta.json();
            alert(`No se pudo reemplazar la imagen: ${errorBackend.error || "error desconocido"}`);
            return;
        }

        await cargarImagenesDelModal();
        await cargarProductos();
    } catch (error) {
        console.error(error);
        alert("No se pudo reemplazar la imagen.");
    }
}

async function agregarImagenes() {
    if (!productoImagenesId) return;
    if (!inputAgregarImagenes.files || inputAgregarImagenes.files.length === 0) {
        alert("Elegí al menos una imagen para agregar.");
        return;
    }

    const disponibles = MAX_IMAGENES_POR_PRODUCTO - cantidadImagenesModal;
    if (inputAgregarImagenes.files.length > disponibles) {
        alert(`Este producto ya tiene ${cantidadImagenesModal} de ${MAX_IMAGENES_POR_PRODUCTO} imágenes permitidas. Podés agregar hasta ${disponibles} más.`);
        return;
    }

    const formData = new FormData();
    for (let i = 0; i < inputAgregarImagenes.files.length; i++) {
        formData.append("imagenes", inputAgregarImagenes.files[i]);
    }

    try {
        const respuesta = await fetch(`${API_PRODUCTOS}/${productoImagenesId}/imagenes`, {
            method: "POST",
            body: formData
        });

        if (!respuesta.ok) {
            const errorBackend = await respuesta.json();
            alert(`No se pudieron agregar las imágenes: ${errorBackend.error || "error desconocido"}`);
            return;
        }

        inputAgregarImagenes.value = "";
        await cargarImagenesDelModal();
        await cargarProductos();
    } catch (error) {
        console.error(error);
        alert("No se pudieron agregar las imágenes.");
    }
}

async function eliminarImagen(idImagen) {
    if (!confirm("¿Eliminar esta imagen? No se puede deshacer.")) return;

    try {
        const respuesta = await fetch(`${API_IMAGENES}/${idImagen}`, { method: "DELETE" });
        if (!respuesta.ok) {
            const errorBackend = await respuesta.json();
            alert(`No se pudo eliminar: ${errorBackend.error || "error desconocido"}`);
            return;
        }
        await cargarImagenesDelModal();
        await cargarProductos();
    } catch (error) {
        console.error(error);
        alert("No se pudo eliminar la imagen.");
    }
}

async function toggleVisibilidadProducto(btn) {
    const id = btn.dataset.id;
    const visibleActual = btn.dataset.visibleActual === "true";
    const nuevoValorVisible = !visibleActual;

    btn.disabled = true;

    try {
        const respuesta = await fetch(`${API_PRODUCTOS}/${id}/visibilidad`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ visible: nuevoValorVisible })
        });

        if (!respuesta.ok) {
            let detalle = "error desconocido";
            try { detalle = (await respuesta.json()).error || detalle; } catch (e) {}
            alert(`No se pudo actualizar: ${detalle}`);
            btn.disabled = false;
            return;
        }

        await cargarProductos();
    } catch (error) {
        console.error(error);
        alert("No se pudo actualizar la visibilidad del producto.");
        btn.disabled = false;
    }
}

function actualizarZonaAgregar() {
    if (!modalAgregarZona) return;

    if (cantidadImagenesModal >= MAX_IMAGENES_POR_PRODUCTO) {
        modalAgregarZona.innerHTML = `<p style="color:#9aa4bd; font-size:12px;">Este producto ya tiene el máximo de ${MAX_IMAGENES_POR_PRODUCTO} imágenes. Eliminá una para poder agregar otra.</p>`;
    } else {
        const disponibles = MAX_IMAGENES_POR_PRODUCTO - cantidadImagenesModal;
        modalAgregarZona.innerHTML = `
            <label>+ AÑADIR IMAGEN (hasta ${disponibles} más, máximo ${MAX_IMAGENES_POR_PRODUCTO} en total)</label>
            <input type="file" id="input-agregar-imagenes" accept="image/*" multiple>
            <button id="btn-agregar-imagenes" onclick="agregarImagenes()">+ Añadir imagen</button>
        `;
        inputAgregarImagenes = document.getElementById("input-agregar-imagenes");
    }
}