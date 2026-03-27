# Fórmulas Químicas — Sistema de Inventario

Sistema web completo para gestión de inventario de productos químicos de limpieza.

**Stack:** React + Vite + Tailwind CSS | Node.js + Express | MySQL (XAMPP)

---

## Requisitos previos

- [XAMPP](https://www.apachefriends.org/) con MySQL activo
- [Node.js](https://nodejs.org/) v18 o superior
- npm v9 o superior

---

## Instalación paso a paso

### 1. Clonar / descargar el proyecto

Coloca la carpeta en tu directorio deseado, por ejemplo `C:\inventarioFQ`.

### 2. Configurar la base de datos

1. Abre **XAMPP Control Panel** y arranca el servicio **MySQL**
2. Abre el navegador y ve a `http://localhost/phpmyadmin`
3. Haz clic en **Importar** (pestaña superior)
4. Selecciona el archivo `db/schema.sql`
5. Haz clic en **Continuar** — esto crea la base de datos `formulasquimicas` con todos los datos de prueba

### 3. Configurar el servidor (backend)

```bash
cd server
npm install
```

Verifica el archivo `server/.env` (ya viene configurado para XAMPP por defecto):

```env
PORT=5000
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=formulasquimicas
```

> Si tienes contraseña en MySQL, modifica `DB_PASSWORD` en el `.env`.

### 4. Instalar dependencias del cliente (frontend)

```bash
cd client
npm install
```

---

## Ejecutar el sistema

Necesitas **dos terminales** abiertas simultáneamente:

### Terminal 1 — Backend

```bash
cd server
npm run dev
```

Deberías ver:
```
🚀 Servidor corriendo en http://localhost:5000
✅ Conectado a MySQL - Base de datos: formulasquimicas
```

### Terminal 2 — Frontend

```bash
cd client
npm run dev
```

Deberías ver:
```
  VITE v5.x.x  ready in xxx ms
  ➜  Local:   http://localhost:5173/
```

### 5. Abrir la aplicación

Navega a **http://localhost:5173** en tu navegador.

---

## Módulos del sistema

| Módulo | Descripción |
|--------|-------------|
| **Dashboard** | Estadísticas generales, gráficas de entradas vs salidas, top 10 productos |
| **Categorías** | CRUD completo de categorías de productos |
| **Productos** | CRUD completo con búsqueda en tiempo real, importación desde Excel |
| **Entradas** | Registro de recepciones de mercancía con proveedor opcional |
| **Salidas** | Registro de entregas con campo cliente obligatorio |
| **Ajustes** | Correcciones de inventario con justificación obligatoria |
| **Historial** | Búsqueda y filtrado del historial completo de movimientos |
| **Alertas** | Productos con stock por debajo del mínimo establecido |
| **Reportes** | Exportación a Excel de inventario y movimientos |

---

## Importación de productos desde Excel

El archivo Excel debe tener las siguientes columnas (fila 1 = encabezados):

| Columna | Descripción | Requerido |
|---------|-------------|-----------|
| `codigo` | Código único del producto | ✅ |
| `nombre` | Nombre del producto | ✅ |
| `categoria` | Nombre de la categoría | No |
| `stock_actual` | Stock actual | No (default: 0) |
| `stock_minimo` | Stock mínimo | No (default: 0) |
| `unidad_medida` | Unidad (litro, kg, etc.) | No (default: unidad) |
| `descripcion` | Descripción del producto | No |

> Descarga la plantilla desde el botón **"Plantilla"** en la sección de Productos.

---

## Estructura del proyecto

```
inventarioFQ/
├── db/
│   └── schema.sql              # Base de datos con datos de prueba
├── server/
│   ├── controllers/            # Lógica de negocio
│   │   ├── categoriasController.js
│   │   ├── productosController.js
│   │   ├── movimientosController.js
│   │   ├── dashboardController.js
│   │   └── reportesController.js
│   ├── routes/                 # Rutas Express
│   │   ├── categorias.js
│   │   ├── productos.js
│   │   ├── movimientos.js
│   │   ├── dashboard.js
│   │   └── reportes.js
│   ├── db.js                   # Conexión MySQL
│   ├── index.js                # Servidor Express
│   ├── .env                    # Variables de entorno
│   └── package.json
└── client/
    ├── src/
    │   ├── components/
    │   │   ├── ui/             # Componentes reutilizables
    │   │   ├── Layout.jsx
    │   │   ├── Sidebar.jsx
    │   │   └── Header.jsx
    │   ├── context/
    │   │   ├── AlertContext.jsx
    │   │   └── ToastContext.jsx
    │   ├── lib/
    │   │   ├── api.js
    │   │   └── utils.js
    │   ├── pages/              # Páginas de la aplicación
    │   ├── App.jsx
    │   └── main.jsx
    ├── tailwind.config.js
    ├── vite.config.js
    └── package.json
```

---

## API Endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/categorias` | Listar categorías |
| POST | `/api/categorias` | Crear categoría |
| PUT | `/api/categorias/:id` | Actualizar categoría |
| DELETE | `/api/categorias/:id` | Eliminar categoría |
| GET | `/api/productos?search=&categoria=` | Listar productos |
| POST | `/api/productos` | Crear producto |
| PUT | `/api/productos/:id` | Actualizar producto |
| DELETE | `/api/productos/:id` | Eliminar producto |
| POST | `/api/productos/import` | Importar desde Excel |
| GET | `/api/movimientos?tipo=&search=&from=&to=` | Listar movimientos |
| POST | `/api/movimientos` | Registrar movimiento |
| GET | `/api/dashboard/stats` | Estadísticas del dashboard |
| GET | `/api/dashboard/chart-data` | Datos para la gráfica |
| GET | `/api/dashboard/top-salidas` | Top 10 más vendidos |
| GET | `/api/dashboard/menos-salidas` | Top 10 menos vendidos |
| GET | `/api/dashboard/alertas-count` | Conteo de alertas |
| GET | `/api/reportes/inventario` | Exportar inventario (.xlsx) |
| GET | `/api/reportes/movimientos?from=&to=&tipo=` | Exportar movimientos (.xlsx) |

---

## Solución de problemas

**❌ Error conectando a MySQL**
- Verifica que XAMPP esté corriendo y MySQL esté activo
- Confirma que la base de datos `formulasquimicas` fue importada correctamente
- Revisa las credenciales en `server/.env`

**❌ Puerto en uso**
- Cambia `PORT=5001` en `server/.env` si el puerto 5000 está ocupado
- Actualiza el proxy en `client/vite.config.js` con el nuevo puerto

**❌ Error en npm install**
- Asegúrate de tener Node.js v18+: `node --version`
- Elimina `node_modules` y vuelve a ejecutar `npm install`
