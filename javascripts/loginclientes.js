const BASE_URL = window.location.hostname === "localhost"
    ? "http://localhost:3000"
    : "https://24shop-seven.vercel.app";

async function loginCliente() {
    let usuario = document.getElementById("usuario").value.trim();
    let contrasena = document.getElementById("contrasena").value.trim();

    try {
        // ✏️ EDITAR: confirmar el nombre real de esta ruta una vez que
        // exista en server.js (por ahora asumo /api/login-cliente,
        // en paralelo a /api/login que ya usan los empleados).
        let respuesta = await fetch(`${BASE_URL}/api/login-cliente`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ usuario, contrasena })
        });

        let resultado = await respuesta.json();

        if (resultado.exito) {
            localStorage.setItem("clienteLogueado", usuario);
            window.location.href = "compra.html";
        } else {
            document.getElementById("error").style.display = "block";
        }
    } catch (error) {
        console.error("Error al conectar con el servidor", error);
    }
}