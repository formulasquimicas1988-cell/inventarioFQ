const mysql = require('./server/node_modules/mysql2');
const fs    = require('fs');
const path  = require('path');

const sql = fs.readFileSync(path.join(__dirname, 'db/schema.sql'), 'utf8');

const conn = mysql.createConnection({
  host:               'gondola.proxy.rlwy.net',
  port:               29389,
  user:               'root',
  password:           'slYcJYrSAqhJJjWNEHaNXvzuOdAGFHBL',
  database:           'railway',
  multipleStatements: true,
});

conn.connect(err => {
  if (err) { console.error('Error conectando:', err.message); process.exit(1); }
  console.log('Conectado. Importando...');
  conn.query(sql, (err) => {
    if (err) { console.error('Error importando:', err.message); }
    else     { console.log('Base de datos importada correctamente!'); }
    conn.end();
  });
});
