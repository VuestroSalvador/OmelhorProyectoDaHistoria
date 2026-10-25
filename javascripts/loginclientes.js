const esLocal = ["localhost", "127.0.0.1"].includes(window.location.hostname);

const BASE_URL = esLocal
    ? "http://localhost:3000"
    : "https://express-js-on-vercel-self-omega-30.vercel.app";

async function loginCliente() {
    let usuario = document.getElementById("usuario").value.trim();
    let contrasena = document.getElementById("contrasena").value.trim();

    if (!usuario || !contrasena) {
        document.getElementById("error").textContent = "❌ Completá todos los campos.";
        document.getElementById("error").style.display = "block";
        return;
    }

    try {
        let respuesta = await fetch(`${BASE_URL}/api/login-cliente`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ usuario, contrasena })
        });

        let resultado = await respuesta.json();

        if (resultado.exito) {
            // Guardamos el objeto completo del cliente y su carrito en el localStorage
            localStorage.setItem("clienteLogueado", JSON.stringify(resultado.cliente));
            localStorage.setItem("carrito", JSON.stringify(resultado.cliente.carrito));

            // Redirigimos a la tienda
            window.location.href = "../Frontend/merch.html"; 
        } else {
            document.getElementById("error").textContent = `❌ ${resultado.mensaje}`;
            document.getElementById("error").style.display = "block";
        }
    } catch (error) {
        console.error("Error al conectar con el servidor", error);
        document.getElementById("error").textContent = "❌ Error al conectar con el servidor.";
        document.getElementById("error").style.display = "block";
    }
}