// ---------- Menú responsive (hamburguesa) ----------
const navToggle = document.getElementById("nav-toggle");
const navLinks = document.getElementById("nav-links");

navToggle.addEventListener("click", () => {
    navLinks.classList.toggle("open");
});

// Cierra el menú al elegir una opción (útil en mobile)
document.querySelectorAll(".nav-link").forEach((link) => {
    link.addEventListener("click", () => {
        navLinks.classList.remove("open");
    });
});

// ---------- Sombra en la navbar al scrollear ----------
const navbar = document.getElementById("navbar");

window.addEventListener("scroll", () => {
    if (window.scrollY > 10) {
        navbar.classList.add("scrolled");
    } else {
        navbar.classList.remove("scrolled");
    }
});

// ---------- Animación de aparición al hacer scroll ----------
const elementosReveal = document.querySelectorAll(".reveal");

const observer = new IntersectionObserver(
    (entradas) => {
        entradas.forEach((entrada) => {
            if (entrada.isIntersecting) {
                entrada.target.classList.add("visible");
                observer.unobserve(entrada.target);
            }
        });
    },
    { threshold: 0.2 }
);

elementosReveal.forEach((el) => observer.observe(el));

// ---------- Contador animado de estadísticas ----------
const numeros = document.querySelectorAll(".stat-num");

function animarNumero(elemento) {
    const destino = Number(elemento.dataset.count);
    const duracion = 1200;
    const inicio = performance.now();

    function paso(ahora) {
        const progreso = Math.min((ahora - inicio) / duracion, 1);
        elemento.textContent = Math.floor(progreso * destino);
        if (progreso < 1) {
            requestAnimationFrame(paso);
        } else {
            elemento.textContent = destino;
        }
    }

    requestAnimationFrame(paso);
}

const statsObserver = new IntersectionObserver(
    (entradas) => {
        entradas.forEach((entrada) => {
            if (entrada.isIntersecting) {
                animarNumero(entrada.target);
                statsObserver.unobserve(entrada.target);
            }
        });
    },
    { threshold: 0.5 }
);

numeros.forEach((num) => statsObserver.observe(num));