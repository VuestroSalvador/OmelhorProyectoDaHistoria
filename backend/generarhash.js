const bcrypt = require('bcrypt');
const contrasenaOriginal = "45370696";

// El número 10 es el "salt rounds", indica qué tan complejo será el cifrado
bcrypt.hash(contrasenaOriginal, 10, (err, hash) => {
    if (err) throw err;
    console.log("Tu contraseña cifrada (hash) es:");
    console.log(hash);
});