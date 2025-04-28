require('dotenv').config();
const express = require('express');
const { Client, LocalAuth } = require('whatsapp-web.js');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.json());

const clients = new Map(); // Map to hold multiple WhatsApp clients keyed by number/session id

// Endpoint to initialize a WhatsApp client session for a number
app.post('/connect', (req, res) => {
  const { number } = req.body;
  if (!number) {
    return res.status(400).json({ error: 'Number is required' });
  }
  if (clients.has(number)) {
    return res.status(400).json({ error: 'Client already connected' });
  }

  const client = new Client({
    authStrategy: new LocalAuth({ clientId: number }),
    puppeteer: { headless: true }
  });

  client.on('qr', (qr) => {
    console.log(`QR for ${number}:`, qr);
    // Could emit QR via socket or save to DB
  });

  client.on('ready', () => {
    console.log(`Client ready for ${number}`);
  });

  client.on('message', message => {
    console.log(`Message from ${number}:`, message.body);
    // Handle incoming messages, save to DB or emit events
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
    res.json({ message: 'Message sent', id: sentMessage.id._serialized });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`WhatsApp service running on port ${PORT}`);
});
