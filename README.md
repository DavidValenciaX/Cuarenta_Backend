# Stock IA API

Sistema de gestión de inventario inteligente con notificaciones basadas en IA.

## Descripción

Stock IA API es una solución completa para la gestión de inventario que integra inteligencia artificial para proporcionar notificaciones y recomendaciones sobre el estado del inventario. La API permite gestionar usuarios, productos, categorías, clientes, proveedores, órdenes de compra, ventas y devoluciones.

## Base de Conocimiento: Sistema de Gestión de Inventarios "Stock IA"

### Conceptos Generales

1. **Alcance del Usuario**: Toda la información y operaciones dentro del sistema están asociadas a un usuario específico. Los usuarios solo pueden acceder y gestionar sus propios datos (productos, pedidos, clientes, proveedores, etc.).
2. **Transacciones Atómicas**: Las operaciones críticas de base de datos (como la creación de pedidos con múltiples productos o la actualización de inventario) se manejan dentro de transacciones. Esto asegura que si una parte de la operación falla, toda la operación se revierte, manteniendo la integridad de los datos.
3. **Normalización de Nombres**: Algunos campos de texto, como los nombres de productos, pueden ser normalizados (ej. eliminando espacios extra, convirtiendo a un formato estándar) para asegurar la consistencia de los datos y facilitar las búsquedas.
4. **Gestión de Errores**: El sistema utiliza un formato de respuesta estándar para los errores de API, usualmente indicando un código de estado HTTP (ej. 400, 404, 500) y un mensaje descriptivo del error.
5. **Carga de Imágenes**: Ciertos elementos, como los productos, permiten la asociación de imágenes. Las imágenes se almacenan en el servidor y se accede a ellas a través de una URL específica (ej. `/uploads/products/[nombre_archivo_imagen]`).

### Gestión de Usuarios

#### Conceptos Clave - Gestión de Usuarios

1. **Usuario**: Entidad que interactúa con el sistema. Cada usuario tiene sus propios datos aislados.
2. **Autenticación**: El acceso a las funcionalidades del sistema requiere autenticación, generalmente mediante un token (JWT) que se envía en las cabeceras de las solicitudes.

#### Procesos - Gestión de Usuarios

1. **Registro y Confirmación**: Los usuarios pueden registrarse y necesitarán confirmar su cuenta, usualmente a través de un token enviado por correo electrónico.
2. **Inicio de Sesión**: Permite a los usuarios acceder al sistema.
3. **Restablecimiento de Contraseña**: Si un usuario olvida su contraseña, puede solicitar un restablecimiento, que típicamente involucra un token enviado a su correo.
4. **Actualización de Contraseña**: Los usuarios autenticados pueden cambiar su contraseña.

### Gestión de Productos

#### Conceptos Clave - Gestión de Productos

1. **Producto**: Representa un artículo físico o servicio que se gestiona en el inventario.
    * Atributos Principales: Nombre, descripción, precio unitario de venta (`unitPrice`), costo unitario (`unitCost`), categoría, unidad de medida, cantidad en stock (`quantity`), código de barras (`barcode`), URL de imagen.
2. **Regla Precio vs. Costo**:
    * El `unitPrice` de un producto siempre debe ser estrictamente mayor que su `unitCost`.
    * Mensaje de Error Estándar: "El precio unitario debe ser mayor al costo unitario".
    * Al crear/actualizar una Orden de Compra, si el costo de un ítem es mayor o igual al precio de venta actual del producto, el sistema puede ajustar automáticamente el precio de venta del producto (ej. `nuevoPrecio = nuevoCosto * 1.2`) antes de actualizar el costo del producto.
    * Mensaje de Error (Constraint DB): "El costo unitario no puede ser mayor o igual al precio unitario del producto. Actualice el precio del producto antes de aumentar el costo."
3. **Unicidad de Identificadores**:
    * **Nombre del Producto**: Debe ser único para cada usuario.
        * Mensaje de Error (409 Conflict): "Ya existe un producto con ese nombre".
    * **Código de Barras**: Si se proporciona, debe ser único para cada usuario.
        * Mensaje de Error (409 Conflict): "Código de barras ya registrado".
4. **Stock Inicial**: Al crear un producto, la cantidad en inventario por defecto es cero. Si se especifica una `quantity` mayor a cero durante la creación, se registra una transacción de inventario de tipo `ADJUSTMENT` para reflejar esta entrada inicial.
5. **Imagen del Producto**: Se puede asociar una imagen. La URL se almacena y sigue el formato `/uploads/products/[nombre_del_archivo]`.

#### Procesos - Gestión de Productos

1. **Crear Producto**:
    * Parámetros Requeridos: `name`, `unitPrice`, `unitCost`, `categoryId`, `unitOfMeasureId`.
    * Parámetros Opcionales: `description`, `image` (archivo binario), `quantity` (para stock inicial), `barcode`.
    * Validaciones Clave: Precio > Costo, unicidad de nombre y código de barras, existencia de la categoría asociada.
2. **Actualizar Producto**:
    * Permite modificar la mayoría de los atributos del producto.
    * Si la `quantity` en stock cambia como parte de la actualización, se registra una transacción de inventario de tipo `ADJUSTMENT`.
    * Se aplican las mismas validaciones de unicidad y relación precio/costo que en la creación.
3. **Actualizar Stock de Producto (Función Dedicada)**:
    * Modifica únicamente la `quantity` en stock de un producto existente.
    * Parámetro Requerido: `quantity` (la nueva cantidad total en stock).
    * El sistema calcula la diferencia con el stock anterior y registra una transacción de inventario (`ADJUSTMENT` para incrementos o `LOSS` para decrementos si la nueva cantidad es menor).
4. **Listar Productos**: Obtiene un listado de todos los productos pertenecientes al usuario autenticado.
5. **Obtener Producto Específico**: Recupera los detalles de un producto por su ID.
6. **Eliminar Producto**: Borra un producto del sistema. Esta acción es irreversible.
7. **Buscar Productos**:
    * Permite la búsqueda por nombre (coincidencia parcial) o código de barras (coincidencia exacta).
    * Parámetro Requerido: `query` (término de búsqueda, longitud entre 1 y 100 caracteres).

#### Mensajes de Error Comunes en Productos

* `400 Bad Request`: "El precio unitario debe ser mayor al costo unitario".
* `400 Bad Request`: "La cantidad es requerida" (para actualización de stock).
* `400 Bad Request`: "La cantidad debe ser un número positivo" (para actualización de stock).
* `404 Not Found`: "Categoría no encontrada" (si la `categoryId` proporcionada no existe).
* `404 Not Found`: "Producto no encontrado".
* `409 Conflict`: "Ya existe un producto con ese nombre".
* `409 Conflict`: "Código de barras ya registrado".

### Gestión de Categorías

#### Conceptos Clave - Gestión de Categorías

1. **Categoría**: Una forma de agrupar o clasificar productos (ej. "Electrónicos", "Ropa", "Alimentos"). Cada categoría es creada y gestionada por un usuario.

#### Procesos - Gestión de Categorías

1. **Crear Categoría**: Añade una nueva categoría para el usuario.
2. **Listar Categorías**: Muestra todas las categorías del usuario.
3. **Obtener Categoría**: Muestra los detalles de una categoría específica.
4. **Actualizar Categoría**: Modifica los datos de una categoría existente.
5. **Eliminar Categoría**: Borra una categoría. (Considerar si hay productos asociados y cómo se maneja).

### Gestión de Proveedores

#### Conceptos Clave - Gestión de Proveedores

1. **Proveedor**: Entidad o empresa que suministra productos al negocio del usuario. Cada proveedor está asociado a un usuario.
    * Atributos: Nombre, email, teléfono, dirección.

#### Procesos - Gestión de Proveedores

1. **Crear Proveedor**: Registra un nuevo proveedor para el usuario.
2. **Listar Proveedores**: Muestra todos los proveedores del usuario.
3. **Obtener Proveedor**: Muestra los detalles de un proveedor específico por su ID.
4. **Actualizar Proveedor**: Modifica los datos de un proveedor existente.
5. **Eliminar Proveedor**: Borra un proveedor.

#### Mensajes de Error Comunes en Proveedores

* `404 Not Found`: "Proveedor no encontrado".

### Gestión de Clientes

#### Conceptos Clave - Gestión de Clientes

1. **Cliente**: Entidad o persona a la que el negocio del usuario vende productos. Cada cliente está asociado a un usuario.
    * Atributos: Nombre, email, teléfono, dirección.

#### Procesos - Gestión de Clientes

1. **Crear Cliente**: Registra un nuevo cliente para el usuario.
2. **Listar Clientes**: Muestra todos los clientes del usuario.
3. **Obtener Cliente**: Muestra los detalles de un cliente específico.
4. **Actualizar Cliente**: Modifica los datos de un cliente existente.
5. **Eliminar Cliente**: Borra un cliente.

### Gestión de Órdenes de Compra (OC)

#### Conceptos Clave - Gestión de Órdenes de Compra

1. **Orden de Compra**: Documento formal emitido por el usuario a un [`Proveedor`](#gestión-de-proveedores) para solicitar la compra de productos.
2. **Ítems de OC**: Detalle de cada producto solicitado en la OC, incluyendo `productId`, `quantity` y `unitCost` (costo al que se compra el producto en esta OC).
3. **Estado de OC**: Indica la fase en la que se encuentra la OC.
    * `pendiente`: La OC ha sido creada pero aún no se ha procesado para afectar el inventario.
    * `confirmada`: La OC ha sido aprobada y los productos se consideran recibidos. El stock de los productos incluidos aumenta.

#### Procesos - Gestión de Órdenes de Compra

1. **Crear Orden de Compra**:
    * Parámetros Requeridos: `supplierId`, `statusId`, `items` (array de `{productId, quantity, unitCost}`).
    * Parámetros Opcionales: `purchaseOrderDate` (fecha de la OC), `notes`.
    * Validaciones:
        * El `supplierId` debe corresponder a un proveedor existente del usuario. Mensaje (404): "Proveedor no encontrado o no pertenece al usuario".
        * Cada `productId` en `items` debe corresponder a un producto existente del usuario. Mensaje (404): `Producto con ID {productId} no encontrado o no pertenece al usuario`.
    * **Actualización de Inventario**: Si la OC se crea con estado "confirmada" (o se actualiza a este estado), el stock de cada producto en la OC aumenta. Se registra una transacción de inventario de tipo `CONFIRMED_PURCHASE_ORDER`.
    * **Actualización de Costo de Producto**: Si el `unitCost` de un ítem en la OC es superior al `unitCost` actual del producto en su ficha, el `unitCost` del producto se actualiza. Si este nuevo costo es mayor o igual al precio de venta del producto, el precio de venta del producto también puede ser ajustado automáticamente (ej. `nuevoPrecioVenta = nuevoCosto * 1.2`).
2. **Actualizar Orden de Compra**:
    * **Regla de Negocio**: Una OC con estado "confirmada" no puede ser modificada. Mensaje de Error: "No se puede modificar una orden de compra confirmada".
    * Permite cambiar detalles generales, ítems y el estado (si no estaba "confirmada").
    * La lógica de actualización de inventario y costos de producto se aplica si la OC cambia de "pendiente" a "confirmada".
3. **Listar Órdenes de Compra**: Muestra todas las OC del usuario.
4. **Obtener Orden de Compra**: Muestra los detalles de una OC específica, incluyendo sus ítems.
5. **Eliminar Orden de Compra**:
    * Si la OC estaba en estado "confirmada", la eliminación revierte el aumento de stock de los productos. Se registra una transacción de inventario de tipo `CANCELLED_PURCHASE_ORDER`.

### Gestión de Órdenes de Venta (OV)

#### Conceptos Clave - Gestión de Órdenes de Venta

1. **Orden de Venta**: Documento generado para un [`Cliente`](#gestión-de-clientes) que detalla los productos vendidos o a ser vendidos.
2. **Ítems de OV**: Detalle de cada producto en la OV, incluyendo `productId`, `quantity` y `unitPrice` (precio al que se vende el producto en esta OV).
3. **Estado de OV**: Indica la fase en la que se encuentra la OV.
    * `pendiente`: La OV ha sido creada pero aún no se ha procesado para afectar el inventario.
    * `confirmada`: La OV ha sido aprobada y los productos se consideran despachados o comprometidos. El stock de los productos incluidos disminuye.

#### Procesos - Gestión de Órdenes de Venta

1. **Crear Orden de Venta**:
    * Parámetros Requeridos: `customerId`, `statusId`, `items` (array de `{productId, quantity, unitPrice}`).
    * Parámetros Opcionales: `salesOrderDate` (fecha de la OV), `notes`.
    * Validaciones:
        * El `customerId` debe corresponder a un cliente existente del usuario.
        * Cada `productId` en `items` debe corresponder a un producto existente del usuario. Mensaje (404): `Producto con ID {productId} no encontrado o no pertenece al usuario`.
        * Debe haber suficiente stock disponible para cada producto en la OV. Mensaje (400): `Producto con ID {productId} no tiene suficiente stock disponible`.
    * **Actualización de Inventario**: Si la OV se crea con estado "confirmada" (o se actualiza a este estado), el stock de cada producto en la OV disminuye. Se registra una transacción de inventario de tipo `CONFIRMED_SALES_ORDER`.
2. **Actualizar Orden de Venta**:
    * **Regla de Negocio**: Una OV con estado "confirmada" no puede ser modificada. Mensaje de Error: "No se puede modificar una orden de venta confirmada".
    * Permite cambiar detalles generales, ítems y el estado (si no estaba "confirmada").
    * **Validación de Stock**: Si se aumentan cantidades o se añaden productos y la OV pasa a "confirmada", se vuelve a verificar el stock disponible. Error: `Producto con ID {productId} no tiene suficiente stock disponible para el incremento solicitado`.
    * La lógica de actualización de inventario se aplica si la OV cambia de "pendiente" a "confirmada".
3. **Listar Órdenes de Venta**: Muestra todas las OV del usuario.
4. **Obtener Orden de Venta**: Muestra los detalles de una OV específica, incluyendo sus ítems.
5. **Eliminar Orden de Venta**:
    * Si la OV estaba en estado "confirmada", la eliminación revierte la disminución de stock de los productos. Se registra una transacción de inventario de tipo `CANCELLED_SALES_ORDER`.

#### Mensajes de Error Comunes en Órdenes de Venta

* `404 Not Found`: "Orden de venta no encontrada".

### Gestión de Devoluciones de Compra

#### Conceptos Clave - Gestión de Devoluciones de Compra

1. **Devolución de Compra**: Proceso donde el usuario retorna productos a un [`Proveedor`](#gestión-de-proveedores), generalmente asociados a una [`Orden de Compra`](#gestión-de-órdenes-de-compra-oc) previa.
2. **Impacto en Inventario**: Al crear una devolución de compra, el stock de los productos devueltos disminuye en el inventario del usuario (ya que se envían físicamente al proveedor).

#### Procesos - Gestión de Devoluciones de Compra

1. **Crear Devolución de Compra**:
    * Parámetros Requeridos: `purchaseOrderId` (ID de la OC original de donde provienen los productos), `items` (array de `{productId, quantity}`).
    * Parámetros Opcionales: `returnDate` (fecha de la devolución), `notes`.
    * Validaciones:
        * La `purchaseOrderId` debe ser válida y pertenecer al usuario. Mensaje (404): "Orden de compra no encontrada o no pertenece al usuario".
        * Cada `productId` debe existir. Mensaje (404): `Producto con ID {productId} no encontrado o no pertenece al usuario`.
        * La `quantity` debe ser mayor a cero. Mensaje (400): "Cantidad inválida".
        * Debe haber suficiente stock del producto en el inventario del usuario para ser devuelto. Mensaje (400): `Inventario insuficiente para el producto {product.name}`.
        * Un producto no puede estar duplicado en la misma devolución. Error: `El producto {productId} ya está incluido en esta devolución`.
    * **Actualización de Inventario**: El stock de cada producto devuelto disminuye. Se registra una transacción de inventario de tipo `PURCHASE_RETURN`.
2. **Actualizar Devolución de Compra**:
    * Permite modificar notas, fecha y los ítems. Se aplican validaciones similares a la creación.
3. **Listar Devoluciones de Compra**: Muestra todas las devoluciones de compra del usuario.
4. **Obtener Devolución de Compra**: Muestra los detalles de una devolución específica.
5. **Eliminar Devolución de Compra**:
    * Implica que la devolución no se concretó.
    * **Actualización de Inventario**: El stock de los productos que iban a ser devueltos aumenta (vuelven al inventario del usuario). Se registra una transacción de inventario (lógicamente `CANCELLED_PURCHASE_RETURN`, aunque el código puede usar `ADJUSTMENT`).

#### Mensajes de Error Comunes en Devoluciones de Compra

* `400 Bad Request`: "Orden de compra y al menos un producto son requeridos".
* `404 Not Found`: "Devolución de compra no encontrada".

### Gestión de Devoluciones de Venta

#### Conceptos Clave - Gestión de Devoluciones de Venta

1. **Devolución de Venta**: Proceso donde un [`Cliente`](#gestión-de-clientes) retorna productos al negocio del usuario, generalmente asociados a una [`Orden de Venta`](#gestión-de-órdenes-de-venta-ov) previa.
2. **Ítems de Devolución de Venta**: Cada producto devuelto, especificando `productId`, `quantity` y un `statusId` que indica el estado del producto recibido (ej. "aceptado", "en revisión", "dañado").
3. **Impacto en Inventario**:
    * Si el estado del ítem es "aceptado", el producto reingresa al stock disponible del usuario.
    * Si el estado es "en revisión" o "dañado", el producto no reingresa automáticamente al stock disponible.

#### Procesos - Gestión de Devoluciones de Venta

1. **Crear Devolución de Venta**:
    * Parámetros Requeridos: `salesOrderId` (ID de la OV original), `items` (array de `{productId, quantity, statusId}`).
    * Parámetros Opcionales: `returnDate`, `notes`.
    * Validaciones:
        * La `salesOrderId` debe ser válida y pertenecer al usuario. Mensaje (404): "Orden de venta no encontrada o no pertenece al usuario".
        * Cada `productId` debe existir. Mensaje (404): `Producto con ID {productId} no encontrado o no pertenece al usuario`.
        * La `quantity` debe ser mayor a cero. Mensaje (400): "Cantidad inválida".
        * La cantidad a devolver de un producto no puede exceder la cantidad vendida en la OV original, menos lo ya devuelto para ese producto en otras devoluciones de la misma OV. Error: `La cantidad de devolución para el producto {productId} excede la cantidad disponible para devolver. Máximo: {availableToReturn}`.
        * Un producto no puede estar duplicado en la misma devolución. Error: `El producto {productId} ya está incluido en esta devolución`.
    * **Actualización de Inventario**: Si el `statusId` de un ítem corresponde a "aceptado", el stock de ese producto aumenta. Se registra una transacción de inventario de tipo `SALE_RETURN`.
2. **Actualizar Devolución de Venta**:
    * Permite modificar notas, fecha, ítems y sus estados.
    * **Validaciones de Transición de Estado**:
        * No se permite cambiar el estado de "aceptado" a "en revisión" o "dañado".
        * No se permite cambiar el estado de "dañado" a "en revisión" o "aceptado".
    * La lógica de actualización de inventario se aplica según los cambios en cantidades y estados (ej. si un ítem cambia de "en revisión" a "aceptado", el stock aumenta).
3. **Listar Devoluciones de Venta**: Muestra todas las devoluciones de venta del usuario.
4. **Obtener Devolución de Venta**: Muestra los detalles de una devolución específica, incluyendo sus ítems y sus estados.
5. **Eliminar Devolución de Venta**:
    * Si un ítem devuelto tenía estado "aceptado" (y había reingresado al stock), su eliminación revierte este reingreso (el stock disminuye). Se registra una transacción de inventario de tipo `CANCELLED_SALE_RETURN`.

#### Mensajes de Error Comunes en Devoluciones de Venta

* `400 Bad Request`: "Orden de venta y al menos un producto son requeridos".
* `404 Not Found`: "Devolución de venta no encontrada".

### Gestión de Transacciones de Inventario

#### Conceptos Clave - Gestión de Transacciones de Inventario

1. **Transacción de Inventario**: Un registro auditable de cada movimiento de stock para un producto. Documenta la `quantity` afectada (positiva para entradas, negativa para salidas), el `transaction_type_id`, y los niveles de `previous_stock` y `new_stock`.
2. **Tipos de Transacción de Inventario**:
    * `CONFIRMED_PURCHASE_ORDER (1)`: Entrada de stock por OC confirmada.
    * `CANCELLED_PURCHASE_ORDER (2)`: Salida de stock por cancelación de OC que estaba confirmada.
    * `CONFIRMED_SALES_ORDER (3)`: Salida de stock por OV confirmada.
    * `CANCELLED_SALES_ORDER (4)`: Entrada de stock por cancelación de OV que estaba confirmada.
    * `SALE_RETURN (5)`: Entrada de stock por devolución de venta (ítem en estado "aceptado").
    * `CANCELLED_SALE_RETURN (6)`: Salida de stock por cancelación de una devolución de venta (ítem que estaba "aceptado").
    * `PURCHASE_RETURN (7)`: Salida de stock por devolución de compra a proveedor.
    * `CANCELLED_PURCHASE_RETURN (8)`: Entrada de stock por cancelación de una devolución de compra (lógicamente).
    * `ADJUSTMENT (9)`: Movimiento manual de stock (entrada/salida), stock inicial al crear producto, o cambio de cantidad al actualizar producto.
    * `LOSS (10)`: Salida de stock por ajuste manual de pérdida (ej. producto dañado, vencido).

#### Procesos - Gestión de Transacciones de Inventario

1. **Registro Automático**: Las transacciones se registran automáticamente cuando las operaciones correspondientes (confirmar/cancelar pedidos, procesar devoluciones, ajustar stock) se completan exitosamente.
2. **Consultar Historial por Producto**:
    * Permite ver todas las transacciones de inventario para un `productId` específico del usuario.
    * Mensaje (404): "Producto no encontrado" si el producto no existe o no pertenece al usuario.
3. **Consultar Historial General del Usuario**:
    * Permite ver todas las transacciones de inventario del usuario, con opción de paginación.
    * Parámetros de Paginación (query string): `limit` (cantidad de registros por página, defecto 100), `offset` (número de registros a omitir, defecto 0).

### Gestión de Estados del Sistema

#### Conceptos Clave - Gestión de Estados del Sistema

1. **Estado (`status_types`)**: Valores predefinidos que se utilizan para describir la condición o etapa de diferentes entidades dentro del sistema.
2. **Categoría de Estado (`status_categories`)**: Agrupación lógica para los estados, permitiendo que diferentes entidades tengan sus propios conjuntos de estados relevantes (ej. "ai_notification", "sales_return_item_status", "order_status").

#### Ejemplos de Uso

* **Órdenes de Compra/Venta**: "pendiente", "confirmada", "cancelada".
* **Ítems de Devolución de Venta**: "aceptado", "en revisión", "dañado", "rechazado".
* **Notificaciones de IA**: "leída", "no leída" (implícito).

### Gestión de Medidas

#### Conceptos Clave - Gestión de Medidas

1. **Tipo de Medida**: Una categoría general para la medición de productos (ej. "Peso", "Volumen", "Longitud", "Cantidad").
2. **Unidad de Medida**: Una unidad específica dentro de un Tipo de Medida.
    * Atributos: `id`, `name` (ej. "Kilogramo", "Unidad"), `symbol` (ej. "kg", "ud.").

#### Procesos - Gestión de Medidas

1. **Listar Tipos de Medida y sus Unidades**: El sistema provee una forma de obtener todos los tipos de medida disponibles y las unidades de medida asociadas a cada uno. Esta información es estática o gestionada administrativamente.
2. **Asociación a Productos**: Al crear o actualizar un [`Producto`](#gestión-de-productos), se le asigna una `unitOfMeasureId` de la lista disponible.

### Notificaciones de IA

#### Conceptos Clave - Notificaciones de IA

1. **Notificación de IA**: Mensajes o alertas generadas por el sistema, específicamente por la funcionalidad "Compra con IA". Compra con IA utiliza Prophet, un modelo de inteligencia artificial desarrollado por Meta, que analiza tus órdenes de venta para ofrecerte un diagnóstico preciso. Te indica cuándo un producto podría agotarse, la cantidad de unidades que deberías comprar y el momento óptimo para realizar la compra. Estas notificaciones pueden incluir alertas de stock bajo, sugerencias de reposición y predicciones de demanda.
2. **Estado de Notificación**: Indica si una notificación ha sido vista o procesada por el usuario (ej. "leída").

#### Procesos - Notificaciones de IA

1. **Listar Notificaciones**: Obtiene todas las notificaciones generadas para el usuario autenticado. La lista suele incluir el nombre del producto relacionado (si aplica) y el estado de la notificación. Se ordenan por fecha de creación (más recientes primero).
2. **Marcar como Leída**: Permite al usuario marcar una notificación específica como "leída", actualizando su estado en el sistema.
3. **Eliminar Notificación**: Permite al usuario borrar una notificación.
    * Mensaje de Error: "Notification not found or unauthorized" (si la notificación no existe o no pertenece al usuario).

## Características principales

* Gestión de usuarios con autenticación JWT
* Gestión de productos y categorías
* Administración de clientes y proveedores
* Control de órdenes de compra y venta
* Seguimiento de devoluciones
* Notificaciones inteligentes con **Compra con IA** (basadas en Prophet de Meta para predicción de demanda y escasez)
* Historial completo de transacciones de inventario
* Documentación integrada con Swagger

## Tecnologías utilizadas

* **Node.js**: Entorno de ejecución
* **Express**: Marco de aplicación web
* **PostgreSQL**: Base de datos relacional
* **JWT**: Autenticación con tokens
* **Swagger**: Documentación de API
* **Multer**: Gestión de cargas de archivos
* **Nodemailer**: Envío de correos electrónicos

## Requisitos previos

* Node.js (versión recomendada: 18.x o superior)
* PostgreSQL (versión recomendada: 14.x o superior)
* Variables de entorno configuradas (ver .env.example)

## Instalación

1. Clonar el repositorio:

   ```bash
   git clone https://github.com/tu-usuario/stock-ia.git
   cd stock-ia
   ```

2. Instalar dependencias:

   ```bash
   npm install
   ```

3. Configurar el archivo .env con tus variables de entorno.

4. Iniciar el servidor:

   ```bash
   npm run dev   # Para desarrollo con nodemon
   npm start     # Para producción
   ```

## Estructura del proyecto

```bash
index.js                        # Punto de entrada de la aplicación
app/
  ├── config/                   # Configuración de la base de datos
  ├── controllers/              # Controladores de la API
  ├── middlewares/              # Middlewares de autenticación y carga de archivos
  ├── models/                   # Modelos de datos
  ├── routes/                   # Definición de rutas
  ├── utils/                    # Utilidades (email, tokens, etc.)
  └── validators/               # Validadores de entrada
public/
  └── uploads/                  # Archivos subidos por los usuarios
```

## API Endpoints

La API cuenta con los siguientes grupos de endpoints:

* **Usuarios**: Gestión de usuarios y autenticación
* **Categorías**: CRUD de categorías del usuario autenticado
* **Productos**: CRUD de productos del usuario autenticado
* **Clientes**: CRUD de clientes asociados al usuario
* **Proveedores**: CRUD de proveedores asociados al usuario
* **Órdenes de venta**: Gestión de ventas
* **Órdenes de compra**: Gestión de compras
* **Devoluciones**: Gestión de devoluciones de ventas y compras
* **Transacciones de inventario**: Historial de movimientos
* **Notificaciones IA**: Gestión de alertas y recomendaciones automáticas

Para una documentación completa de los endpoints, consulte la documentación Swagger en:

```bash
http://localhost:3000/docs
```

## Desarrollo

Para ejecutar el servidor en modo desarrollo con recarga automática:

```bash
npm run dev
```

## Contribución

1. Haz un fork del proyecto
2. Crea una nueva rama (`git checkout -b feature/nueva-funcionalidad`)
3. Haz commit de tus cambios (`git commit -m 'Añade nueva funcionalidad'`)
4. Haz push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Abre un Pull Request

## Licencia

Este proyecto está licenciado bajo la Licencia MIT.

## Contacto

Para cualquier consulta o sugerencia, por favor contacta al equipo de desarrollo.
