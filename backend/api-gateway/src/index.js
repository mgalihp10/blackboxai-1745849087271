require('dotenv').config();
const express = require('express');
const axios = require('axios');

const app = express();
app.use(express.json());

const WHATSAPP_SERVICE_URL = process.env.WHATSAPP_SERVICE_URL || 'http://localhost:3001';
const DATABASE_SERVICE_URL = process.env.DATABASE_SERVICE_URL || 'http://localhost:3002';

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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`API Gateway running on port ${PORT}`);
});
