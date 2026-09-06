const { Pool, types } = require('pg');

const pool = new Pool({
  host: process.env.PGHOST,
  port: process.env.PGPORT,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE,
});

// Kirim tipe DATE (OID 1082) apa adanya sebagai string 'YYYY-MM-DD'
// agar tidak bergeser 1 hari karena konversi timezone UTC
types.setTypeParser(1082, (val) => val);

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
};