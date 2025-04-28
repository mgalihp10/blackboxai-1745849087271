require('dotenv').config();
const express = require('express');
const axios = require('axios');
const https = require('https');
const fs = require('fs');

const app = express();
app.use(express.json());

const WHATSAPP_SERVICE_URL = process.env.WHATSAPP_SERVICE_URL || 'http://localhost:3001';
const DATABASE_SERVICE_URL = process.env.DATABASE_SERVICE_URL || 'http://localhost:3002';

const PORT = process.env.PORT || 3000;
const SSL_KEY_PATH = process.env.SSL_KEY_PATH || './ssl/key.pem';
const SSL_CERT_PATH = process.env.SSL_CERT_PATH || './ssl/cert.pem';

let server;

try {
  const key = fs.readFileSync(SSL_KEY_PATH);
  const cert = fs.readFileSync(SSL_CERT_PATH);
  server = https.createServer({ key, cert }, app);
  server.listen(PORT, () => {
    console.log(`API Gateway running with SSL on port ${PORT}`);
  });
} catch (err) {
  console.warn('SSL certificates not found or invalid, falling back to HTTP');
  server = app.listen(PORT, () => {
    console.log(`API Gateway running on port ${PORT}`);
  });
}

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Connect WhatsApp number
app.post('/connect', async (req, res) => {
  try {
    const response = await axios.post(`${WHATSAPP_SERVICE_URL}/connect`, req.body);
    res.json(response.data);
  } catch (error) {
    res.status(error.response?.status || 500).json({ error: error.message });
  }
});

// Send message
app.post('/send', async (req, res) => {
  try {
    const response = await axios.post(`${WHATSAPP_SERVICE_URL}/send`, req.body);
    res.json(response.data);
  } catch (error) {
    res.status(error.response?.status || 500).json({ error: error.message });
  }
});

// Numbers APIs proxy
app.post('/numbers', async (req, res) => {
  try {
    const response = await axios.post(`${DATABASE_SERVICE_URL}/numbers`, req.body);
    res.json(response.data);
  } catch (error) {
    res.status(error.response?.status || 500).json({ error: error.message });
  }
});

app.get('/numbers', async (req, res) => {
  try {
    const response = await axios.get(`${DATABASE_SERVICE_URL}/numbers`);
    res.json(response.data);
  } catch (error) {
    res.status(error.response?.status || 500).json({ error: error.message });
  }
});

// Messages APIs proxy
app.post('/messages', async (req, res) => {
  try {
    const response = await axios.post(`${DATABASE_SERVICE_URL}/messages`, req.body);
    res.json(response.data);
  } catch (error) {
    res.status(error.response?.status || 500).json({ error: error.message });
  }
});

app.get('/messages', async (req, res) => {
  try {
    const response = await axios.get(`${DATABASE_SERVICE_URL}/messages`, { params: req.query });
    res.json(response.data);
  } catch (error) {
    res.status(error.response?.status || 500).json({ error: error.message });
  }
});
