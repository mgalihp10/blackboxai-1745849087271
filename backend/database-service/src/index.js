require('dotenv').config();
const express = require('express');
const db = require('./db');

const app = express();
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Create tables on startup
db.createTables().then(() => {
  console.log('Database tables ensured');
}).catch(err => {
  console.error('Error creating tables', err);
  process.exit(1);
});

// Numbers APIs
app.post('/numbers', async (req, res) => {
  const { number, config } = req.body;
  if (!number) {
    return res.status(400).json({ error: 'Number is required' });
  }
  try {
    const result = await db.query(
      'INSERT INTO numbers (number, config) VALUES ($1, $2) ON CONFLICT (number) DO UPDATE SET config = EXCLUDED.config RETURNING *',
      [number, config || {}]
    );
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/numbers', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM numbers ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Messages APIs
app.post('/messages', async (req, res) => {
  const { number_id, from_number, to_number, message, message_id, direction } = req.body;
  if (!number_id || !message || !direction) {
    return res.status(400).json({ error: 'number_id, message and direction are required' });
  }
  try {
    const result = await db.query(
      'INSERT INTO messages (number_id, from_number, to_number, message, message_id, direction) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [number_id, from_number, to_number, message, message_id, direction]
    );
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/messages', async (req, res) => {
  const { number_id } = req.query;
  try {
    let query = 'SELECT * FROM messages';
    let params = [];
    if (number_id) {
      query += ' WHERE number_id = $1';
      params.push(number_id);
    }
    query += ' ORDER BY created_at DESC';
    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
  console.log(`Database service running on port ${PORT}`);
});
