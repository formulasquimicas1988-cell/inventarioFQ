const mysql = require('mysql2/promise');
require('dotenv').config();

console.log('[DB] Config:', {
  host:     process.env.DB_HOST     || '(no DB_HOST)',
  port:     process.env.DB_PORT     || '(no DB_PORT)',
  user:     process.env.DB_USER     || '(no DB_USER)',
  database: process.env.DB_NAME     || '(no DB_NAME)',
  password: process.env.DB_PASSWORD ? '(set)' : '(no DB_PASSWORD)',
  NODE_ENV: process.env.NODE_ENV    || '(no NODE_ENV)',
});

const pool = mysql.createPool({
  host:               process.env.DB_HOST,
  port:               parseInt(process.env.DB_PORT) || 3306,
  user:               process.env.DB_USER,
  password:           process.env.DB_PASSWORD,
  database:           process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit:    10,
  queueLimit:         0,
  timezone:           'local',
});

// Verificar conexión al iniciar
pool.getConnection()
  .then(conn => {
    console.log(`✅ Conectado a MySQL - ${process.env.DB_HOST}/${process.env.DB_NAME}`);
    conn.release();
  })
  .catch(err => {
    console.error('❌ Error conectando a MySQL:', err.message);
  });

module.exports = pool;
