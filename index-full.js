require('dotenv').config();
const { 
    Client, 
    GatewayIntentBits, 
    EmbedBuilder, 
    PermissionsBitField,
    MessageFlags
} = require('discord.js');
const fs = require('fs');
const path = require('path');
const express = require('express');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.GuildMembers
    ]
});

// Config
const configPath = path.join(__dirname, 'config.json');
let config = {};

const ADMIN_USERNAME = 'umut';
const ADMIN_PASSWORD = 'umutpapa001122u';

if (fs.existsSync(configPath)) {
    config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
} else {
    config = {
        server: {
            ip: 'play.example.com',
            port: 25565,
            maxPlayers: 100,
            playersOnline: 0
        },
        users: {},
        applications: [],
        punishments: [],
        products: [],
        announcements: [],
        roles: [],
        support_tickets: [],
        credits: {}
    };
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
}

function saveConfig() {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
}

// WEB DASHBOARD
const app = express();
app.use(express.static('public'));
app.use(express.json());

// Session storage (simple)
const sessions = {};

// Login endpointi
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    
    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
        const sessionId = Date.now().toString();
        sessions[sessionId] = { admin: true, username: username };
        res.json({ success: true, sessionId: sessionId });
    } else {
        // Normal user login
        if (config.users[username] && config.users[username].password === password) {
            const sessionId = Date.now().toString();
            sessions[sessionId] = { admin: false, username: username };
            res.json({ success: true, sessionId: sessionId });
        } else {
            res.json({ success: false, message: 'Hatalı kullanıcı adı veya şifre' });
        }
    }
});

// Register endpointi
app.post('/api/register', (req, res) => {
    const { username, password, email } = req.body;
    
    if (config.users[username]) {
        res.json({ success: false, message: 'Kullanıcı adı zaten alınmış' });
        return;
    }
    
    config.users[username] = {
        username: username,
        password: password,
        email: email,
        credits: 0,
        banned: false,
        roles: ['Oyuncu'],
        createdAt: new Date().toISOString()
    };
    saveConfig();
    res.json({ success: true, message: 'Kayıt başarılı!' });
});

// Logout
app.post('/api/logout', (req, res) => {
    const { sessionId } = req.body;
    delete sessions[sessionId];
    res.json({ success: true });
});

// Server info
app.get('/api/server-info', (req, res) => {
    res.json(config.server);
});

// Announcements
app.get('/api/announcements', (req, res) => {
    res.json(config.announcements);
});

// Dashboard HTML
app.get('/', (req, res) => {
    res.send(`
<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ShadowCore - Sunucu Yönetim Paneli</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            background: linear-gradient(135deg, #0a0e27 0%, #1a1a3e 100%);
            background-attachment: fixed;
            background-image: 
                url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800"><defs><filter id="blur"><feGaussianBlur in="SourceGraphic" stdDeviation="3"/></filter></defs><image href="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==" width="1200" height="800" opacity="0.15" filter="url(%23blur)"/></svg>'),
                linear-gradient(135deg, rgba(10, 14, 39, 0.95) 0%, rgba(26, 26, 62, 0.95) 100%);
            color: #e0e0e0;
            font-family: 'Inter', 'Segoe UI', sans-serif;
            min-height: 100vh;
            position: relative;
        }
        
        body::before {
            content: '';
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: 
                radial-gradient(circle at 20% 50%, rgba(124, 58, 237, 0.1) 0%, transparent 50%),
                radial-gradient(circle at 80% 80%, rgba(124, 58, 237, 0.08) 0%, transparent 50%);
            pointer-events: none;
            z-index: 0;
        }
        
        /* LOGIN PAGE */
        .login-page {
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            background: linear-gradient(135deg, rgba(10, 14, 39, 0.85) 0%, rgba(26, 26, 62, 0.85) 100%);
            position: relative;
            z-index: 10;
        }
        
        .login-page::before {
            content: '';
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: 
                radial-gradient(circle at 20% 50%, rgba(124, 58, 237, 0.1) 0%, transparent 50%),
                radial-gradient(circle at 80% 80%, rgba(124, 58, 237, 0.08) 0%, transparent 50%);
            pointer-events: none;
            z-index: -1;
        }
        
        .login-container {
            background: linear-gradient(135deg, #1a1a3e 0%, #2d2b6b 100%);
            border: 2px solid #7c3aed;
            border-radius: 15px;
            padding: 50px;
            width: 100%;
            max-width: 400px;
            text-align: center;
            box-shadow: 0 20px 60px rgba(124, 58, 237, 0.3);
        }
        
        .login-container h1 {
            color: #7c3aed;
            margin-bottom: 10px;
            font-size: 2rem;
        }
        
        .login-container p {
            color: #a0aec0;
            margin-bottom: 30px;
        }
        
        .login-tabs {
            display: flex;
            gap: 10px;
            margin-bottom: 20px;
            border-bottom: 1px solid #3d3b7f;
        }
        
        .login-tabs button {
            flex: 1;
            padding: 12px;
            background: none;
            border: none;
            color: #a0aec0;
            cursor: pointer;
            font-weight: 600;
            border-bottom: 2px solid transparent;
            transition: all 0.3s;
        }
        
        .login-tabs button.active {
            color: #7c3aed;
            border-bottom-color: #7c3aed;
        }
        
        .form-group {
            margin-bottom: 15px;
            text-align: left;
        }
        
        .form-group label {
            display: block;
            color: #a0aec0;
            font-size: 0.9rem;
            margin-bottom: 5px;
        }
        
        .form-group input {
            width: 100%;
            padding: 12px;
            background: #0a0e27;
            border: 1px solid #3d3b7f;
            color: #fff;
            border-radius: 6px;
            font-size: 1rem;
        }
        
        .form-group input::placeholder {
            color: #666;
        }
        
        .login-btn {
            width: 100%;
            padding: 12px;
            background: #7c3aed;
            color: white;
            border: none;
            border-radius: 6px;
            font-weight: 600;
            cursor: pointer;
            font-size: 1rem;
            transition: background 0.3s;
            margin-top: 10px;
        }
        
        .login-btn:hover {
            background: #6d28d9;
        }
        
        /* DASHBOARD */
        .dashboard {
            display: none;
        }
        
        .topbar {
            background: rgba(10, 14, 39, 0.95);
            border-bottom: 1px solid #2d2b6b;
            padding: 15px 30px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            position: sticky;
            top: 0;
            z-index: 100;
        }
        
        .topbar-brand {
            font-size: 1.5rem;
            font-weight: 800;
            color: #fff;
        }
        
        .topbar-brand span {
            color: #7c3aed;
        }
        
        .topbar-buttons {
            display: flex;
            gap: 15px;
        }
        
        .topbar-buttons button {
            padding: 8px 16px;
            background: #7c3aed;
            color: white;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-weight: 600;
        }
        
        .main-container {
            display: flex;
            min-height: calc(100vh - 60px);
        }
        
        .sidebar {
            width: 250px;
            background: #0f0e1e;
            border-right: 1px solid #2d2b6b;
            padding: 20px;
            overflow-y: auto;
        }
        
        .sidebar h3 {
            color: #7c3aed;
            font-size: 0.8rem;
            text-transform: uppercase;
            margin-top: 20px;
            margin-bottom: 10px;
            letter-spacing: 1px;
        }
        
        .sidebar a {
            display: block;
            color: #a0aec0;
            text-decoration: none;
            padding: 10px;
            border-radius: 6px;
            cursor: pointer;
            transition: all 0.3s;
            margin-bottom: 5px;
        }
        
        .sidebar a:hover, .sidebar a.active {
            background: #2d2b6b;
            color: #7c3aed;
        }
        
        .content {
            flex: 1;
            padding: 30px;
            overflow-y: auto;
        }
        
        .content > div {
            display: none;
        }
        
        .content > div.active {
            display: block;
        }
        
        .server-info {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            margin-bottom: 30px;
        }
        
        .info-card {
            background: linear-gradient(135deg, #1a1a3e 0%, #2d2b6b 100%);
            border: 1px solid #3d3b7f;
            border-radius: 10px;
            padding: 20px;
            text-align: center;
        }
        
        .info-card h3 {
            color: #a0aec0;
            font-size: 0.85rem;
            text-transform: uppercase;
            margin-bottom: 10px;
        }
        
        .info-card .value {
            font-size: 2rem;
            font-weight: bold;
            color: #7c3aed;
        }
        
        .section {
            background: linear-gradient(135deg, #1a1a3e 0%, #2d2b6b 100%);
            border: 1px solid #3d3b7f;
            border-radius: 10px;
            padding: 20px;
            margin-bottom: 20px;
        }
        
        .section h2 {
            color: #fff;
            margin-bottom: 15px;
        }
        
        .form-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
        }
        
        .form-input {
            padding: 10px;
            background: #0a0e27;
            border: 1px solid #3d3b7f;
            color: #fff;
            border-radius: 6px;
        }
        
        .btn {
            padding: 10px 20px;
            background: #7c3aed;
            color: white;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-weight: 600;
        }
        
        .btn:hover {
            background: #6d28d9;
        }
        
        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 15px;
        }
        
        table th {
            background: #0a0e27;
            color: #7c3aed;
            padding: 10px;
            text-align: left;
            border-bottom: 1px solid #3d3b7f;
        }
        
        table td {
            padding: 10px;
            border-bottom: 1px solid #3d3b7f;
            color: #a0aec0;
        }
        
        @media (max-width: 768px) {
            .sidebar {
                width: 100%;
                height: auto;
                border-right: none;
                border-bottom: 1px solid #2d2b6b;
                display: flex;
                flex-wrap: wrap;
            }
            
            .main-container {
                flex-direction: column;
            }
            
            .login-container {
                padding: 30px;
                max-width: 90%;
            }
        }
    </style>
</head>
<body>
    <!-- LOGIN PAGE -->
    <div class="login-page" id="loginPage">
        <div class="login-container">
            <h1>SHADOW<span>CORE</span></h1>
            <p>Sunucu Yönetim Paneli</p>
            
            <div class="login-tabs">
                <button class="tab-btn active" onclick="switchTab('login')">Giriş Yap</button>
                <button class="tab-btn" onclick="switchTab('register')">Kayıt Ol</button>
            </div>
            
            <!-- Login Form -->
            <div id="loginForm">
                <div class="form-group">
                    <label>Kullanıcı Adı</label>
                    <input type="text" id="loginUsername" placeholder="Kullanıcı adını gir">
                </div>
                <div class="form-group">
                    <label>Şifre</label>
                    <input type="password" id="loginPassword" placeholder="Şifreni gir">
                </div>
                <button class="login-btn" onclick="login()">Giriş Yap</button>
            </div>
            
            <!-- Register Form -->
            <div id="registerForm" style="display: none;">
                <div class="form-group">
                    <label>Kullanıcı Adı</label>
                    <input type="text" id="regUsername" placeholder="Kullanıcı adı">
                </div>
                <div class="form-group">
                    <label>E-Mail</label>
                    <input type="email" id="regEmail" placeholder="E-Mail adresin">
                </div>
                <div class="form-group">
                    <label>Şifre</label>
                    <input type="password" id="regPassword" placeholder="Şifre">
                </div>
                <button class="login-btn" onclick="register()">Kayıt Ol</button>
            </div>
        </div>
    </div>
    
    <!-- DASHBOARD -->
    <div class="dashboard" id="dashboard">
        <!-- Top Bar -->
        <div class="topbar">
            <div class="topbar-brand">SHADOW<span>CORE</span></div>
            <div class="topbar-buttons">
                <span id="username-display" style="color: #a0aec0; padding: 10px;"></span>
                <button onclick="logout()">Çıkış</button>
            </div>
        </div>
        
        <!-- Main Container -->
        <div class="main-container">
            <!-- Sidebar -->
            <div class="sidebar">
                <h3>Yönetim</h3>
                <a onclick="showTab('home')" class="active">📊 Ana Sayfa</a>
                <a onclick="showTab('applications')">📝 Başvurular</a>
                <a onclick="showTab('punishments')">⚖️ Cezalar</a>
                <a onclick="showTab('shop')">🛒 Mağaza</a>
                <a onclick="showTab('support')">💬 Destek</a>
                
                <h3 id="admin-section" style="display: none;">Admin Paneli</h3>
                <a onclick="showTab('products')" id="admin-products" style="display: none;">➕ Ürün Ekle</a>
                <a onclick="showTab('punish')" id="admin-punish" style="display: none;">🔨 Ceza Ver</a>
                <a onclick="showTab('roles')" id="admin-roles" style="display: none;">👑 Roller</a>
                <a onclick="showTab('announcements')" id="admin-announce" style="display: none;">📢 Duyuru</a>
            </div>
            
            <!-- Content -->
            <div class="content">
                <!-- Home -->
                <div id="home">
                    <h2>📊 Ana Sayfa</h2>
                    <div class="server-info" id="serverInfo"></div>
                    
                    <h3 style="color: #fff; margin-top: 30px; margin-bottom: 15px;">📢 Duyurular</h3>
                    <div id="announcements-list"></div>
                </div>
                
                <!-- Applications -->
                <div id="applications">
                    <div class="section">
                        <h2>📝 Başvurular</h2>
                        <table id="appTable">
                            <thead>
                                <tr><th>Kullanıcı</th><th>Durum</th><th>Tarih</th></tr>
                            </thead>
                            <tbody></tbody>
                        </table>
                    </div>
                </div>
                
                <!-- Punishments -->
                <div id="punishments">
                    <div class="section">
                        <h2>⚖️ Cezalar</h2>
                        <table id="punishTable">
                            <thead>
                                <tr><th>Kullanıcı</th><th>Ceza Türü</th><th>Neden</th><th>Tarih</th></tr>
                            </thead>
                            <tbody></tbody>
                        </table>
                    </div>
                </div>
                
                <!-- Shop -->
                <div id="shop">
                    <div class="section">
                        <h2>🛒 Mağaza</h2>
                        <div class="form-grid" id="shopProducts"></div>
                    </div>
                </div>
                
                <!-- Support -->
                <div id="support">
                    <div class="section">
                        <h2>💬 Destek Talepleri</h2>
                        <table id="supportTable">
                            <thead>
                                <tr><th>Kullanıcı</th><th>Konu</th><th>Durum</th></tr>
                            </thead>
                            <tbody></tbody>
                        </table>
                    </div>
                </div>
                
                <!-- Admin: Products -->
                <div id="products">
                    <div class="section">
                        <h2>➕ Ürün Ekle</h2>
                        <div class="form-grid">
                            <input type="text" class="form-input" id="prodName" placeholder="Ürün Adı">
                            <input type="text" class="form-input" id="prodImage" placeholder="Görsel Linki">
                            <input type="text" class="form-input" id="prodDesc" placeholder="Açıklama">
                            <input type="number" class="form-input" id="prodCredit" placeholder="Kredi">
                            <button class="btn" onclick="addProduct()">Ekle</button>
                        </div>
                    </div>
                </div>
                
                <!-- Admin: Punish -->
                <div id="punish">
                    <div class="section">
                        <h2>🔨 Ceza Ver</h2>
                        <div class="form-grid">
                            <input type="text" class="form-input" id="punishUser" placeholder="Kullanıcı Adı">
                            <select class="form-input" id="punishType">
                                <option>Timeout</option>
                                <option>Ban</option>
                            </select>
                            <input type="number" class="form-input" id="punishDuration" placeholder="Süre (dakika)">
                            <input type="text" class="form-input" id="punishReason" placeholder="Neden">
                            <button class="btn" onclick="givePunishment()">Ceza Ver</button>
                        </div>
                    </div>
                </div>
                
                <!-- Admin: Roles -->
                <div id="roles">
                    <div class="section">
                        <h2>👑 Roller</h2>
                        <div class="form-grid">
                            <input type="text" class="form-input" id="roleName" placeholder="Rol Adı">
                            <input type="color" class="form-input" id="roleColor" value="#7c3aed">
                            <button class="btn" onclick="addRole()">Rol Oluştur</button>
                        </div>
                        <table id="roleTable" style="margin-top: 20px;">
                            <thead>
                                <tr><th>Rol Adı</th><th>Renkle</th></tr>
                            </thead>
                            <tbody></tbody>
                        </table>
                    </div>
                </div>
                
                <!-- Admin: Announcements -->
                <div id="announcements">
                    <div class="section">
                        <h2>📢 Duyuru Yap</h2>
                        <div class="form-grid">
                            <input type="text" class="form-input" id="announceName" placeholder="Duyuru Adı">
                            <input type="text" class="form-input" id="announceImage" placeholder="Görsel Linki">
                            <textarea class="form-input" id="announceDesc" placeholder="Açıklama" rows="4"></textarea>
                            <button class="btn" onclick="makeAnnouncement()">Duyur</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
    
    <script>
        let currentUser = null;
        let sessionId = null;
        let isAdmin = false;
        
        function switchTab(tab) {
            document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
            document.getElementById('loginForm').style.display = tab === 'login' ? 'block' : 'none';
            document.getElementById('registerForm').style.display = tab === 'register' ? 'block' : 'none';
            event.target.classList.add('active');
        }
        
        async function login() {
            const username = document.getElementById('loginUsername').value;
            const password = document.getElementById('loginPassword').value;
            
            if (!username || !password) {
                alert('Tüm alanları doldurun!');
                return;
            }
            
            const res = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            
            const data = await res.json();
            if (data.success) {
                currentUser = username;
                sessionId = data.sessionId;
                isAdmin = username === 'umut';
                showDashboard();
            } else {
                alert(data.message || 'Giriş başarısız');
            }
        }
        
        async function register() {
            const username = document.getElementById('regUsername').value;
            const email = document.getElementById('regEmail').value;
            const password = document.getElementById('regPassword').value;
            
            if (!username || !email || !password) {
                alert('Tüm alanları doldurun!');
                return;
            }
            
            const res = await fetch('/api/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, email, password })
            });
            
            const data = await res.json();
            alert(data.message);
            if (data.success) {
                switchTab('login');
            }
        }
        
        function showDashboard() {
            document.getElementById('loginPage').style.display = 'none';
            document.getElementById('dashboard').style.display = 'block';
            document.getElementById('username-display').textContent = currentUser;
            
            if (isAdmin) {
                document.getElementById('admin-section').style.display = 'block';
                document.getElementById('admin-products').style.display = 'block';
                document.getElementById('admin-punish').style.display = 'block';
                document.getElementById('admin-roles').style.display = 'block';
                document.getElementById('admin-announce').style.display = 'block';
            }
            
            loadServerInfo();
            showTab('home');
        }
        
        async function loadServerInfo() {
            const res = await fetch('/api/server-info');
            const data = await res.json();
            
            document.getElementById('serverInfo').innerHTML = \`
                <div class="info-card">
                    <h3>🖥️ Sunucu IP</h3>
                    <div class="value">\${data.ip}</div>
                </div>
                <div class="info-card">
                    <h3>👥 Oyuncular</h3>
                    <div class="value">\${data.playersOnline} / \${data.maxPlayers}</div>
                </div>
            \`;
            
            const announcements = await fetch('/api/announcements');
            const annData = await announcements.json();
            document.getElementById('announcements-list').innerHTML = annData.map(a => \`
                <div class="section" style="margin-bottom: 10px;">
                    <h3 style="color: #7c3aed;">\${a.name}</h3>
                    <p>\${a.desc}</p>
                </div>
            \`).join('');
        }
        
        function showTab(tab) {
            document.querySelectorAll('.content > div').forEach(el => el.classList.remove('active'));
            document.querySelectorAll('.sidebar a').forEach(a => a.classList.remove('active'));
            document.getElementById(tab).classList.add('active');
            event?.target?.classList.add('active');
        }
        
        async function logout() {
            await fetch('/api/logout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessionId })
            });
            location.reload();
        }
        
        function addProduct() {
            alert('Ürün eklendi!');
        }
        
        function givePunishment() {
            alert('Ceza verildi!');
        }
        
        function addRole() {
            alert('Rol oluşturuldu!');
        }
        
        function makeAnnouncement() {
            alert('Duyuru yapıldı!');
        }
    </script>
</body>
</html>
    `);
});

// API endpoints
app.post('/api/add-product', (req, res) => {
    config.products.push(req.body);
    saveConfig();
    res.json({ success: true });
});

app.post('/api/give-punishment', (req, res) => {
    config.punishments.push(req.body);
    saveConfig();
    res.json({ success: true });
});

// Keep-alive
const http = require('http');
const PORT = process.env.PORT || 3001;

const server = http.createServer(app);
server.listen(PORT, () => {
    console.log(`✅ Web server başladı: http://localhost:${PORT}`);
});

// Bot
const token = process.env.DISCORD_TOKEN;
if (!token) {
    console.error('❌ DISCORD_TOKEN bulunamadı!');
    process.exit(1);
}

client.once('ready', () => {
    console.log(`✅ Bot başladı: ${client.user.tag}`);
});

client.login(token).catch(err => {
    console.error('❌ Bot hatası:', err.message);
});
