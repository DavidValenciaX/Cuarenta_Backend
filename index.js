require('dotenv').config(); 
require('./app/config/data_base');

const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const express = require('express');
const routes = require('./app/routes/index_routes'); 

const app = express();
app.use(express.json());

// Configuración de swagger-jsdoc
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Cuarenta API',
      version: '1.0.0',
      description: 'Documentation of the API'
    },
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT' 
        }
      }
    }
  },
  apis: ['./app/routes/*.js'], 
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
// Montar Swagger UI
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));



//Routa principal y rutas de index_routes
app.get('/', (req, res) => {
  res.send('Hola, bienvenido a Cuarenta');
});

app.use(routes);


// Definir el puerto desde las variables de entorno o usar 3000 por defecto
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`API: http://localhost:${PORT}`);
  console.log(`Documentación: http://localhost:${PORT}/docs`);

});
