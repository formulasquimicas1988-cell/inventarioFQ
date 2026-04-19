require('dotenv').config();
const mysql = require('mysql2/promise');

// Support both custom DB_ vars (local) and Railway's MYSQL* vars
const pool = mysql.createPool({
  host:     process.env.DB_HOST     || process.env.MYSQLHOST,
  port:     parseInt(process.env.DB_PORT || process.env.MYSQLPORT) || 3306,
  user:     process.env.DB_USER     || process.env.MYSQLUSER,
  password: process.env.DB_PASSWORD || process.env.MYSQLPASSWORD,
  database: process.env.DB_NAME     || process.env.MYSQLDATABASE,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  timezone: 'local', // sigue process.env.TZ = 'America/Tegucigalpa'
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
});

pool.getConnection()
  .then(conn => {
    console.log('✅ MySQL connected to', process.env.DB_HOST || process.env.MYSQLHOST);
    conn.release();
  })
  .catch(err => console.error('❌ MySQL connection error:', err.message));

module.exports = pool;
