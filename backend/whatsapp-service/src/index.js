require('dotenv').config();
const express = require('express');
const { Client, LocalAuth } = require('whatsapp-web.js');
const https = require('https');
const fs = require('fs');
const socketIo = require('socket.io');
const db = require('../../backend/database-service/src/db');

const app = express();

const SSL_KEY_PATH = process.env.SSL_KEY_PATH || './ssl/key.pem';
const SSL_CERT_PATH = process.env.SSL_CERT_PATH || './ssl/cert.pem';

let server;

try {
  const key = fs.readFileSync(SSL_KEY_PATH);
  const cert = fs.readFileSync(SSL_CERT_PATH);
  server = https.createServer({ key, cert }, app);
  console.log('WhatsApp service running with SSL');
} catch (err) {
  console.warn('SSL certificates not found or invalid, falling back to HTTP');
  server = require('http').createServer(app);
  console.log('WhatsApp service running without SSL');
}

const io = socketIo(server);

app.use(express.json());

const clients = new Map(); // Map to hold multiple WhatsApp clients keyed by number/session id

// Endpoint to initialize a WhatsApp client session for a number
app.post('/connect', async (req, res) => {
  const { number } = req.body;
  if (!number) {
    return res.status(400).json({ error: 'Number is required' });
  }
  if (clients.has(number)) {
    return res.status(400).json({ error: 'Client already connected' });
  }

  try {
    // Store or update the number in the database
    const result = await db.query(
      'INSERT INTO numbers (number) VALUES ($1) ON CONFLICT (number) DO NOTHING RETURNING *',
      [number]
    );
    if (result.rowCount === 0) {
      // Number already exists, fetch it
      const existing = await db.query('SELECT * FROM numbers WHERE number = $1', [number]);
      if (existing.rowCount === 0) {
        return res.status(500).json({ error: 'Failed to retrieve number from DB' });
      }
    }
  } catch (error) {
    return res.status(500).json({ error: 'Database error: ' + error.message });
  }

  const client = new Client({
    authStrategy: new LocalAuth({ clientId: number }),
    puppeteer: { headless: true }
  });

  client.on('qr', async (qr) => {
    console.log(`QR for ${number}:`, qr);
    // Save QR code to DB for this number
    try {
      const numberResult = await db.query('SELECT id FROM numbers WHERE number = $1', [number]);
      if (numberResult.rowCount > 0) {
        const number_id = numberResult.rows[0].id;
        await db.query(
          'UPDATE numbers SET config = jsonb_set(coalesce(config, \'{}\'::jsonb), \'{qr}\', to_jsonb($1::text), true) WHERE id = $2',
          [qr, number_id]
        );
      }
    } catch (error) {
      console.error('Error saving QR code to DB:', error);
    }
  });

  client.on('ready', async () => {
    console.log(`Client ready for ${number}`);
    // Clear QR code from DB on ready
    try {
      const numberResult = await db.query('SELECT id FROM numbers WHERE number = $1', [number]);
      if (numberResult.rowCount > 0) {
        const number_id = numberResult.rows[0].id;
        await db.query(
          'UPDATE numbers SET config = config - \'qr\' WHERE id = $1',
          [number_id]
        );
      }
    } catch (error) {
      console.error('Error clearing QR code from DB:', error);
    }
  });

  client.on('message', async message => {
    console.log(`Message from ${number}:`, message.body);
    try {
      // Get number_id from DB
      const numberResult = await db.query('SELECT id FROM numbers WHERE number = $1', [number]);
      if (numberResult.rowCount === 0) {
        console.error(`Number ${number} not found in DB`);
        return;
      }
      const number_id = numberResult.rows[0].id;

      // Save message to DB
      await db.query(
        'INSERT INTO messages (number_id, from_number, to_number, message, message_id, direction) VALUES ($1, $2, $3, $4, $5, $6)',
        [number_id, message.from, message.to, message.body, message.id._serialized, 'inbound']
      );
    } catch (error) {
      console.error('Error saving message to DB:', error);
    }
  });

  client.initialize();
  clients.set(number, client);

  res.json({ message: `Client initializing for ${number}` });
});

// Endpoint to send message
app.post('/send', async (req, res) => {
  const { number, to, message } = req.body;
  if (!number || !to || !message) {
    return res.status(400).json({ error: 'number, to and message are required' });
  }
  const client = clients.get(number);
  if (!client) {
    return res.status(404).json({ error: 'Client not connected' });
  }
  try {
    const chatId = to.includes('@c.us') ? to : `${to}@c.us`;
    const sentMessage = await client.sendMessage(chatId, message);

    // Save outbound message to DB
    try {
      const numberResult = await db.query('SELECT id FROM numbers WHERE number = $1', [number]);
      if (numberResult.rowCount > 0) {
        const number_id = numberResult.rows[0].id;
        await db.query(
          'INSERT INTO messages (number_id, from_number, to_number, message, message_id, direction) VALUES ($1, $2, $3, $4, $5, $6)',
          [number_id, number, to, message, sentMessage.id._serialized, 'outbound']
        );
      }
    } catch (dbError) {
      console.error('Error saving outbound message to DB:', dbError);
    }

    res.json({ message: 'Message sent', id: sentMessage.id._serialized });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`WhatsApp service running on port ${PORT}`);
});
