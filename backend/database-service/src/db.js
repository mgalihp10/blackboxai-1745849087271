require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://whatsapp_user:whatsapp_pass@localhost:5432/whatsapp_db'
});

const createTables = async () => {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS numbers (
        id SERIAL PRIMARY KEY,
        number VARCHAR(20) UNIQUE NOT NULL,
        config JSONB,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        number_id INTEGER REFERENCES numbers(id),
        from_number VARCHAR(20),
        to_number VARCHAR(20),
        message TEXT,
        message_id VARCHAR(100),
        direction VARCHAR(10), -- 'inbound' or 'outbound'
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
  } finally {
    client.release();
  }
};

module.exports = {
  query: (text, params) => pool.query(text, params),
  createTables
};
