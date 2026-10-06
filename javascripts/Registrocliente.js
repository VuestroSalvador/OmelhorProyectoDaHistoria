const BASE_URL = window.location.hostname === "localhost"
    ? "http://localhost:3000"
    : "https://express-js-on-vercel-self-omega-30.vercel.app";

const form = document.getElementById("form-registro");
const btnSubmit = document.getElementById("btn-submit");
const errorMsg = document.getElementById("error");

form.addEventListener("submit", async (e) => {
    e.preventDefault();
    errorMsg.style.display = "none";

    const nombre = document.getElementById("nombre").value.trim();
    const apellido = document.getElementById("apellido").value.trim();
    const usuario = document.getElementById("usuario").value.trim();
    const mail = document.getElementById("mail").value.trim();
    const contrasena = document.getElementById("contrasena").value;

    btnSubmit.disabled = true;
    btnSubmit.textContent = "Creando cuenta...";

    try {
        const respuesta = await fetch(`${BASE_URL}/api/registro-cliente`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ nombre, apellido, usuario, mail, contrasena })
        });

        const resultado = await respuesta.json();

        if (resultado.exito) {
            // Cuenta creada — lo mandamos a loguearse con sus datos nuevos
            window.location.href = "loginCliente.html";
        } else {
            errorMsg.textContent = `❌ ${resultado.mensaje}`;
            errorMsg.style.display = "block";
        }
    } catch (error) {
        console.error("Error al conectar con el servidor", error);
        errorMsg.textContent = "❌ No se pudo conectar con el servidor. Intentá de nuevo.";
        errorMsg.style.display = "block";
    } finally {
        btnSubmit.disabled = false;
        btnSubmit.textContent = "+ Crear Cuenta";
    }
});