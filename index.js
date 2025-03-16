const express = require('express');
const expressOasGenerator = require('express-oas-generator');

const app = express();

// Inicializar express-oas-generator ANTES de las rutas
expressOasGenerator.init(app, {});

app.get('/', (req, res) => {
  res.send('Hola mundo W_W');
});

app.get('/Hola', (req, res) => {
  res.send('Hola tú');
});

  
app.listen(3000, () => {
  console.log(`Server on port ${3000}`);
});
