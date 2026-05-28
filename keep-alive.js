// Discord Bot 7/24 Çalıştırma - Keep Alive Server
const http = require('http');
const express = require('express');

const app = express();
const PORT = process.env.PORT || 3000;

// Basit bir web sunucusu
app.get('/', (req, res) => {
    res.json({
        status: 'online',
        service: 'Discord Free Games Bot',
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
    });
});

app.get('/health', (req, res) => {
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

app.get('/ping', (req, res) => {
    res.send('pong');
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

// Sunucuyu başlat
const server = app.listen(PORT, () => {
    console.log(`✅ Keep-alive server started on port ${PORT}`);
    console.log(`🌐 Health check: http://localhost:${PORT}/health`);
    console.log(`📡 Ping endpoint: http://localhost:${PORT}/ping`);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('Shutting down keep-alive server...');
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});

// Her 10 dakikada bir console'a mesaj yaz (uptime kontrolü)
setInterval(() => {
    const hours = Math.floor(process.uptime() / 3600);
    const minutes = Math.floor((process.uptime() % 3600) / 60);
    const seconds = Math.floor(process.uptime() % 60);
    
    console.log(`🕒 Uptime: ${hours}h ${minutes}m ${seconds}s`);
}, 600000); // 10 dakika

module.exports = server;