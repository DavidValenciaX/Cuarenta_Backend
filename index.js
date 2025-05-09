require('dotenv').config(); 
require('./app/config/data_base');

const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const express = require('express');
const routes = require('./app/routes/index_routes');
const os = require('os');
const cors = require('cors');

const app = express();

// Configura CORS antes de otras middlewares
app.use(cors({
  origin: '*', // Permite todas las origenes
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

app.use(express.json());

app.use('/uploads', express.static('public/uploads'));

// Configuración de swagger-jsdoc
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Stock IA API',
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
      { name: 'Purchase Returns', description: 'Gestión de devoluciones de compra' },
      { name: 'Inventory Transactions', description: 'Gestión del historial de movimientos de inventario' },
      { name: 'Status', description: 'Gestión de estados y categorías de estados' },
      { name: 'Measurements', description: 'Gestión de tipos de medidas y unidades de medida' },
      { name: 'AI Notifications', description: 'Gestión de notificaciones generadas por IA sobre inventario' }
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

function getServerIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const net of interfaces[name]) {
      // Solo IPs IPv4 que no sean internas
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return 'localhost';
}

const swaggerSpec = swaggerJsdoc(swaggerOptions);
// Montar Swagger UI
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

//Routa principal y rutas de index_routes
app.get('/', (req, res) => {
  res.send('Hola, bienvenido a Stock IA API!');
});

app.use(routes);

// Definir el puerto desde las variables de entorno o usar 3000 por defecto
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  const ip = getServerIP();
  console.log(`Server running on http://${ip}:${PORT}`);
  console.log(`Documentación: http://${ip}:${PORT}/docs`);
});
