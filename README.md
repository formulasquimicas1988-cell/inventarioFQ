# Inventario Fórmulas Químicas

Sistema de gestión de inventario para Fórmulas Químicas. Permite registrar productos, categorías, entradas, salidas y ajustes de inventario, con reportes en Excel y alertas de stock crítico.

## Stack Tecnológico

- **Frontend:** React 18 + Vite + Tailwind CSS
- **Backend:** Node.js + Express
- **Base de datos:** MySQL
- **Deploy:** Railway

---

## Configuración Local (XAMPP + MySQL)

### Requisitos previos

- Node.js 18+
- XAMPP (MySQL) o MySQL Server instalado
- Git

### Pasos

1. **Clonar el repositorio**
   ```bash
   git clone <repo-url>
   cd inventarioFQ
   ```

2. **Crear la base de datos**
   - Inicia XAMPP y asegúrate de que MySQL esté corriendo
   - Abre phpMyAdmin o la consola MySQL
   - Ejecuta el esquema:
     ```bash
     mysql -u root -p < db/schema.sql
     ```
   - O copia y pega el contenido de `db/schema.sql` en phpMyAdmin > SQL

3. **Configurar el servidor**
   ```bash
   cd server
   cp .env.example .env
   ```
   Edita `.env` con tus credenciales:
   ```env
   DB_HOST=localhost
   DB_PORT=3306
   DB_USER=root
   DB_PASSWORD=
   DB_NAME=formulasquimicas
   PORT=3001
   NODE_ENV=development
   ```

4. **Instalar dependencias del servidor**
   ```bash
   cd server
   npm install
   ```

5. **Instalar dependencias del cliente**
   ```bash
   cd client
   npm install
   ```

---

## Comandos de Desarrollo

Desde la raíz del proyecto:

```bash
# Iniciar servidor backend (puerto 3001)
npm run dev:server

# Iniciar cliente frontend (puerto 5173)
npm run dev:client
```

Luego abre `http://localhost:5173` en tu navegador.

---

## Variables de Entorno

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `DB_HOST` | Host de MySQL | `localhost` |
| `DB_PORT` | Puerto de MySQL | `3306` |
| `DB_USER` | Usuario de MySQL | `root` |
| `DB_PASSWORD` | Contraseña de MySQL | *(vacío en XAMPP por defecto)* |
| `DB_NAME` | Nombre de la base de datos | `formulasquimicas` |
| `PORT` | Puerto del servidor Express | `3001` |
| `NODE_ENV` | Entorno | `development` o `production` |

---

## Deploy en Railway

### Paso 1: Crear el proyecto en Railway

1. Ve a [railway.app](https://railway.app) y crea una cuenta
2. Haz clic en "New Project"
3. Selecciona "Deploy from GitHub repo"
4. Conecta tu repositorio de GitHub

### Paso 2: Agregar plugin MySQL

1. En tu proyecto Railway, haz clic en "New" → "Database" → "MySQL"
2. Railway creará una base de datos MySQL y expondrá las variables de entorno automáticamente

### Paso 3: Ejecutar el esquema en Railway MySQL

1. En el plugin de MySQL en Railway, ve a la pestaña "Data"
2. Haz clic en "Connect" para obtener las credenciales de conexión
3. Usa un cliente MySQL (TablePlus, DBeaver, MySQL Workbench) con esas credenciales
4. Ejecuta el contenido de `db/schema.sql`

   O bien, usa el CLI de Railway:
   ```bash
   railway run mysql -h $MYSQLHOST -P $MYSQLPORT -u $MYSQLUSER -p$MYSQLPASSWORD $MYSQLDATABASE < db/schema.sql
   ```

### Paso 4: Configurar variables de entorno en Railway

En Railway, ve a tu servicio → "Variables" y agrega:

```
DB_HOST=${{MySQL.MYSQLHOST}}
DB_PORT=${{MySQL.MYSQLPORT}}
DB_USER=${{MySQL.MYSQLUSER}}
DB_PASSWORD=${{MySQL.MYSQLPASSWORD}}
DB_NAME=${{MySQL.MYSQLDATABASE}}
NODE_ENV=production
```

*Railway puede auto-referenciar las variables del plugin MySQL usando la sintaxis `${{MySQL.VARIABLE}}`.*

### Paso 5: Deploy

Railway detectará automáticamente el `railway.toml` y:
1. Ejecutará `npm run build` (instala dependencias del cliente y hace build de React)
2. Iniciará con `npm start` (corre `node server/index.js`)

El servidor sirve el frontend React como archivos estáticos en producción.

---

## Estructura del Proyecto

```
inventarioFQ/
├── db/
│   └── schema.sql          # Esquema MySQL con datos de ejemplo
├── server/
│   ├── controllers/        # Lógica de negocio
│   ├── routes/             # Rutas de la API
│   ├── db.js               # Pool de conexiones MySQL
│   ├── index.js            # Servidor Express
│   └── package.json
├── client/
│   ├── src/
│   │   ├── components/     # Componentes reutilizables
│   │   ├── context/        # Context API (Toast, Alertas)
│   │   ├── hooks/          # Custom hooks
│   │   ├── lib/            # Utilidades y API client
│   │   └── pages/          # Páginas de la aplicación
│   └── package.json
├── package.json            # Scripts raíz
└── railway.toml            # Configuración de deploy
```

---

## API Endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/dashboard/stats` | Estadísticas generales |
| GET | `/api/productos` | Lista de productos |
| POST | `/api/productos` | Crear producto |
| GET | `/api/categorias` | Lista de categorías |
| POST | `/api/movimientos/entrada` | Registrar entrada |
| POST | `/api/movimientos/salida` | Registrar salida |
| POST | `/api/movimientos/ajuste` | Registrar ajuste |
| GET | `/api/alertas/criticos` | Productos con stock crítico |
| GET | `/api/reportes/inventario` | Exportar inventario a Excel |
| GET | `/api/reportes/movimientos` | Exportar movimientos a Excel |
