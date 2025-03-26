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
    tags: [
      { name: 'Users', description: 'User management' },
      { name: 'Categories', description: 'CRUD de categorías del usuario autenticado' },
      { name: 'Products', description: 'CRUD de productos del usuario autenticado' },
      { name: 'Customers', description: 'CRUD de clientes asociados al usuario autenticado' },
      { name: 'Suppliers', description: 'CRUD de proveedores asociados al usuario autenticado' },
      { name: 'Sales Orders', description: 'Gestión de órdenes de venta' },
      { name: 'Purchase Orders', description: 'Gestión de órdenes de compra' },
      { name: 'Sales Returns', description: 'Gestión de devoluciones de venta' },
      { name: 'Status', description: 'Gestión de estados y categorías de estados' },
      { name: 'Measurements', description: 'Gestión de tipos de medidas y unidades de medida' }
    ],
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
