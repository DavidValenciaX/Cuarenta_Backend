const crypto = require('crypto');

function generateToken() {
  const caracteres = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let codigo = '';

  for (let i = 0; i < 5; i++) {
    const randomIndex = crypto.randomInt(0, caracteres.length);
    codigo += caracteres[randomIndex];
  }

  return codigo;
}

module.exports = { generateToken };

// Ejemplo de uso
const confirmationTokenHash = generateToken();
console.log(confirmationTokenHash);
