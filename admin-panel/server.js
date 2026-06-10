require('dotenv').config();
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key';

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// Database setup
const db = new sqlite3.Database('./admin.db', (err) => {
    if (err) console.error('❌ Database Error:', err.message);
    else console.log('✅ Database connected');
});

// Create tables
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS stocks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        amount INTEGER NOT NULL,
        credits INTEGER NOT NULL,
        image_url TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
    
    db.run(`CREATE TABLE IF NOT EXISTS promo_codes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        code TEXT UNIQUE NOT NULL,
        reward_type TEXT NOT NULL,
        reward_value TEXT NOT NULL,
        expires_at DATETIME,
        used INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
    
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        username TEXT NOT NULL,
        password TEXT NOT NULL,
        discord_id TEXT UNIQUE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
    
    db.run(`CREATE TABLE IF NOT EXISTS announcements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
});

// Authentication middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) return res.sendStatus(401);
    
    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};

// ========== API ROUTES ==========

// Login
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    
    // Hardcoded admin credentials
    if (username === 'umut' && password === 'umutpapa001122u') {
        const token = jwt.sign({ username: 'umut', role: 'admin' }, JWT_SECRET, { expiresIn: '24h' });
        return res.json({ success: true, token });
    }
    
    res.status(401).json({ success: false, message: 'Invalid credentials' });
});

// Register
app.post('/api/register', (req, res) => {
    const { name, email, password } = req.body;
    
    if (!name || !email || !password) {
        return res.status(400).json({ success: false, message: 'Tüm alanları doldurun!' });
    }
    
    if (password.length < 8) {
        return res.status(400).json({ success: false, message: 'Şifre en az 8 karakter olmalı!' });
    }
    
    // Check password strength
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*]/.test(password);
    
    if (!hasUpperCase || !hasLowerCase || !hasNumbers) {
        return res.status(400).json({ 
            success: false, 
            message: 'Şifre büyük harf, küçük harf ve rakam içermelidir!' 
        });
    }
    
    // Hash password
    const hashedPassword = bcrypt.hashSync(password, 10);
    
    db.run(
        'INSERT INTO users (email, username, password) VALUES (?, ?, ?)',
        [email, name, hashedPassword],
        function(err) {
            if (err) {
                if (err.message.includes('UNIQUE')) {
                    return res.status(400).json({ success: false, message: 'Bu e-posta zaten kullanılıyor!' });
                }
                return res.status(500).json({ error: err.message });
            }
            res.json({ success: true, message: 'Kayıt başarılı!' });
        }
    );
});

// Stocks - Get all
app.get('/api/stocks', authenticateToken, (req, res) => {
    db.all('SELECT * FROM stocks', [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Public stocks (for homepage)
app.get('/api/public/stocks', (req, res) => {
    db.all('SELECT id, name, amount, credits FROM stocks', [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows || []);
    });
});

// Stocks - Add
app.post('/api/stocks', authenticateToken, (req, res) => {
    const { name, amount, credits, image_url } = req.body;
    
    db.run(
        'INSERT INTO stocks (name, amount, credits, image_url) VALUES (?, ?, ?, ?)',
        [name, amount, credits, image_url],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true, id: this.lastID });
        }
    );
});

// Stocks - Update
app.put('/api/stocks/:id', authenticateToken, (req, res) => {
    const { name, amount, credits, image_url } = req.body;
    const { id } = req.params;
    
    db.run(
        'UPDATE stocks SET name=?, amount=?, credits=?, image_url=? WHERE id=?',
        [name, amount, credits, image_url, id],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true });
        }
    );
});

// Stocks - Delete
app.delete('/api/stocks/:id', authenticateToken, (req, res) => {
    const { id } = req.params;
    
    db.run('DELETE FROM stocks WHERE id=?', [id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

// Promo codes - Get all
app.get('/api/promos', authenticateToken, (req, res) => {
    db.all('SELECT * FROM promo_codes', [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Promo codes - Add
app.post('/api/promos', authenticateToken, (req, res) => {
    const { code, reward_type, reward_value, expires_at } = req.body;
    
    db.run(
        'INSERT INTO promo_codes (code, reward_type, reward_value, expires_at) VALUES (?, ?, ?, ?)',
        [code, reward_type, reward_value, expires_at || null],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true, id: this.lastID });
        }
    );
});

// Promo codes - Delete
app.delete('/api/promos/:id', authenticateToken, (req, res) => {
    const { id } = req.params;
    
    db.run('DELETE FROM promo_codes WHERE id=?', [id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

// Users - Get all
app.get('/api/users', authenticateToken, (req, res) => {
    db.all('SELECT * FROM users', [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Dashboard stats
app.get('/api/dashboard', authenticateToken, (req, res) => {
    db.serialize(() => {
        let stats = {};
        
        db.get('SELECT COUNT(*) as count FROM stocks', [], (err, row) => {
            stats.stocks = row?.count || 0;
        });
        
        db.get('SELECT COUNT(*) as count FROM users', [], (err, row) => {
            stats.users = row?.count || 0;
            res.json(stats);
        });
    });
});

// Announcements - Add
app.post('/api/announcements', authenticateToken, (req, res) => {
    const { title, content } = req.body;
    
    db.run(
        'INSERT INTO announcements (title, content) VALUES (?, ?)',
        [title, content],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true, id: this.lastID });
        }
    );
});

// Announcements - Get all
app.get('/api/announcements', authenticateToken, (req, res) => {
    db.all('SELECT * FROM announcements ORDER BY created_at DESC', [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Shipments - Add
app.post('/api/shipments', authenticateToken, (req, res) => {
    const { email, product, details } = req.body;
    
    // Burada normalde Discord DM gönderme işlemi olur
    console.log(`📦 Shipment sent to ${email}: ${product} - ${details}`);
    
    res.json({ success: true, message: 'Ürün kullanıcıya gönderildi!' });
});

// Servers info
app.get('/api/servers', (req, res) => {
    // Demo sunucu bilgileri - gerçekte Discord bot'tan alınır
    const servers = [
        { name: 'Gaming Community', memberCount: 1234, status: 'active' },
        { name: 'Support Server', memberCount: 567, status: 'active' },
        { name: 'Test Server', memberCount: 12, status: 'active' }
    ];
    res.json(servers);
});

// Send message to all servers
app.post('/api/servers/message', authenticateToken, (req, res) => {
    const { message } = req.body;
    
    // Burada Discord bot'a mesaj gönderme işlemi olur
    console.log(`📢 Broadcasting message to all servers: ${message}`);
    
    res.json({ success: true, message: 'Mesaj tüm sunuculara gönderildi!' });
});

// Serve HTML
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'home.html'));
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Eğer standalone çalıştırılıyorsa
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`✅ Admin Panel running on http://localhost:${PORT}`);
    });
}

module.exports = { app, db };
