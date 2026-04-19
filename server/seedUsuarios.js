/**
 * Script para crear los usuarios iniciales.
 * Ejecutar UNA sola vez: node seedUsuarios.js
 *
 * Roles disponibles: 'admin', 'caja', 'almacen'
 * Por defecto todos son 'almacen'. Ajustar según necesidad.
 */
require('dotenv').config();
const bcrypt = require('bcrypt');
const pool = require('./db');

const USUARIOS = [
  { nombre: 'Angel',      rol: 'almacen' },
  { nombre: 'Daniel',     rol: 'admin'   },
  { nombre: 'Juan Carlos',rol: 'almacen' },
  { nombre: 'Luis',       rol: 'almacen' },
  { nombre: 'Rafael',     rol: 'almacen' },
  { nombre: 'Nita',       rol: 'caja'    },
  { nombre: 'Paty',       rol: 'caja'    },
  { nombre: 'Moises',     rol: 'almacen' },
  { nombre: 'Allan',      rol: 'almacen' },
  { nombre: 'David',      rol: 'almacen' },
];

const PASSWORD = '1988';

async function seed() {
  try {
    console.log('Verificando tabla usuarios...');

    // Asegurar que la columna rol existe en caso de base existente
    try {
      await pool.query(`ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS rol ENUM('admin','caja','almacen') NOT NULL DEFAULT 'almacen'`);
      console.log('  Columna rol verificada.');
    } catch (e) {
      // MySQL 5.7 no soporta IF NOT EXISTS en ALTER — ignorar si ya existe
      if (!e.message.includes('Duplicate column')) console.warn('  Aviso al agregar rol:', e.message);
    }

    const hash = await bcrypt.hash(PASSWORD, 10);
    console.log(`Contraseña "${PASSWORD}" encriptada.`);

    for (const { nombre, rol } of USUARIOS) {
      const [existing] = await pool.query('SELECT id FROM usuarios WHERE nombre = ?', [nombre]);
      if (existing.length > 0) {
        // Actualizar rol si el usuario ya existe
        await pool.query('UPDATE usuarios SET rol = ? WHERE nombre = ?', [rol, nombre]);
        console.log(`  ⚠️  "${nombre}" ya existe — rol actualizado a '${rol}'.`);
        continue;
      }
      await pool.query(
        'INSERT INTO usuarios (nombre, password_hash, rol) VALUES (?, ?, ?)',
        [nombre, hash, rol]
      );
      console.log(`  ✅ "${nombre}" creado (rol: ${rol}).`);
    }

    console.log('\n✅ Usuarios listos.');
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

seed();
