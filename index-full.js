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
            name: 'ShadowCore MC',
            ip: 'play.shadowcore.com',
            port: 25565,
            maxPlayers: 100,
            playersOnline: 45,
            version: '1.21.11',
            maintenance: false,
            maintenanceMessage: 'Sunucu bakımda...'
        },
        users: {},
        applications: [],
        punishments: [],
        products: [
            { name: 'VIP', price: 50, description: 'VIP yetkisi', image: 'https://via.placeholder.com/200x150' },
            { name: 'MVP', price: 100, description: 'MVP yetkisi', image: 'https://via.placeholder.com/200x150' }
        ],
        announcements: [
            { title: 'Sunucu Açıldı!', content: 'Yeni sunucumuz açıldı!', date: new Date().toISOString() }
        ],
        roles: ['Oyuncu', 'VIP', 'MVP', 'Moderatör', 'Admin'],
        support_tickets: [],
        stats: {
            totalUsers: 0,
            totalApplications: 0,
            totalPunishments: 0
        }
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

// Session storage
const sessions = {};
// API Routes
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    
    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
        const sessionId = Date.now().toString();
        sessions[sessionId] = { admin: true, username: username };
        res.json({ success: true, sessionId: sessionId, admin: true });
    } else if (config.users[username] && config.users[username].password === password) {
        const sessionId = Date.now().toString();
        sessions[sessionId] = { admin: false, username: username };
        res.json({ success: true, sessionId: sessionId, admin: false });
    } else {
        res.json({ success: false, message: 'Hatalı kullanıcı adı veya şifre' });
    }
});

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
    config.stats.totalUsers++;
    saveConfig();
    res.json({ success: true, message: 'Kayıt başarılı!' });
});

// Server info
app.get('/api/server-info', (req, res) => {
    res.json(config.server);
});

// Announcements
app.get('/api/announcements', (req, res) => {
    res.json(config.announcements);
});

// Applications
app.post('/api/apply', (req, res) => {
    const { username, position, reason } = req.body;
    config.applications.push({
        id: Date.now(),
        username,
        position,
        reason,
        status: 'Beklemede',
        date: new Date().toISOString()
    });
    config.stats.totalApplications++;
    saveConfig();
    res.json({ success: true, message: 'Başvurunuz alınmıştır!' });
});

app.get('/api/applications', (req, res) => {
    res.json(config.applications);
});
// Admin endpoints
app.post('/api/admin/maintenance', (req, res) => {
    const { maintenance, message } = req.body;
    config.server.maintenance = maintenance;
    if (message) config.server.maintenanceMessage = message;
    saveConfig();
    res.json({ success: true });
});

app.post('/api/admin/server-settings', (req, res) => {
    const { name, ip, port, maxPlayers, playersOnline, version } = req.body;
    
    config.server.name = name || config.server.name;
    config.server.ip = ip || config.server.ip;
    config.server.port = port || config.server.port;
    config.server.maxPlayers = maxPlayers || config.server.maxPlayers;
    config.server.playersOnline = playersOnline || config.server.playersOnline;
    config.server.version = version || config.server.version;
    
    saveConfig();
    res.json({ success: true });
});

app.post('/api/admin/announcement', (req, res) => {
    const { title, content } = req.body;
    config.announcements.unshift({
        id: Date.now(),
        title,
        content,
        date: new Date().toISOString()
    });
    saveConfig();
    res.json({ success: true });
});

app.post('/api/admin/application-status', (req, res) => {
    const { appId, status } = req.body;
    const app = config.applications.find(a => a.id === parseInt(appId));
    if (app) {
        app.status = status;
        saveConfig();
        res.json({ success: true });
    } else {
        res.json({ success: false, message: 'Başvuru bulunamadı' });
    }
});

app.get('/api/products', (req, res) => {
    res.json(config.products);
});

app.get('/api/stats', (req, res) => {
    res.json(config.stats);
});
// Dashboard HTML
app.get('/', (req, res) => {
    res.send(`
<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ShadowCore - Minecraft Sunucusu</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            background: linear-gradient(135deg, #0a0e27 0%, #1a1a3e 100%);
            background-attachment: fixed;
            color: #e0e0e0;
            font-family: 'Inter', 'Segoe UI', sans-serif;
            min-height: 100vh;
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
        
        /* MAINTENANCE BANNER */
        .maintenance-banner {
            background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%);
            color: white;
            text-align: center;
            padding: 15px;
            font-weight: bold;
            position: relative;
            z-index: 1000;
        }
        
        /* TOP NAVIGATION */
        .navbar {
            background: rgba(10, 14, 39, 0.95);
            border-bottom: 1px solid #2d2b6b;
            padding: 15px 30px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            position: sticky;
            top: 0;
            z-index: 100;
            backdrop-filter: blur(10px);
        }
        
        .navbar-brand {
            font-size: 1.5rem;
            font-weight: 800;
            color: #fff;
            letter-spacing: 2px;
        }
        
        .navbar-brand span {
            color: #7c3aed;
        }
        
        .nav-menu {
            display: flex;
            gap: 30px;
            align-items: center;
            list-style: none;
        }
        
        .nav-menu a {
            color: #a0aec0;
            text-decoration: none;
            font-size: 0.95rem;
            transition: color 0.3s;
            cursor: pointer;
            padding: 8px 16px;
            border-radius: 6px;
            transition: all 0.3s;
        }
        
        .nav-menu a:hover, .nav-menu a.active {
            color: #7c3aed;
            background: rgba(124, 58, 237, 0.1);
        }
        
        .login-buttons {
            display: flex;
            gap: 10px;
        }
        
        .btn {
            padding: 8px 16px;
            background: #7c3aed;
            color: white;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-weight: 600;
            transition: all 0.3s;
            text-decoration: none;
        }
        
        .btn:hover {
            background: #6d28d9;
            transform: translateY(-2px);
        }
        /* LOGIN MODAL */
        .login-modal {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.8);
            display: none;
            justify-content: center;
            align-items: center;
            z-index: 2000;
        }
        
        .login-modal.active {
            display: flex;
        }
        
        .modal-content {
            background: linear-gradient(135deg, #1a1a3e 0%, #2d2b6b 100%);
            border: 2px solid #7c3aed;
            border-radius: 15px;
            padding: 40px;
            width: 100%;
            max-width: 400px;
            text-align: center;
            position: relative;
        }
        
        .close-btn {
            position: absolute;
            top: 15px;
            right: 20px;
            background: none;
            border: none;
            color: #fff;
            font-size: 1.5rem;
            cursor: pointer;
        }
        
        .modal-tabs {
            display: flex;
            gap: 10px;
            margin-bottom: 20px;
            border-bottom: 1px solid #3d3b7f;
        }
        
        .modal-tabs button {
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
        
        .modal-tabs button.active {
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
        
        .form-input {
            width: 100%;
            padding: 12px;
            background: #0a0e27;
            border: 1px solid #3d3b7f;
            color: #fff;
            border-radius: 6px;
            font-size: 1rem;
        }
        
        /* HERO SECTION */
        .hero-section {
            text-align: center;
            padding: 100px 30px;
            background: linear-gradient(135deg, rgba(124, 58, 237, 0.05) 0%, rgba(59, 130, 246, 0.05) 100%);
            border-bottom: 1px solid #3d3b7f;
            position: relative;
            z-index: 1;
        }
        
        .hero-badge {
            display: inline-block;
            background: rgba(124, 58, 237, 0.2);
            border: 1px solid #7c3aed;
            color: #7c3aed;
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 0.85rem;
            font-weight: 600;
            margin-bottom: 20px;
        }
        
        .hero-title {
            font-size: 3.5rem;
            font-weight: 900;
            color: #fff;
            margin-bottom: 15px;
            letter-spacing: -1px;
        }
        
        .hero-subtitle {
            font-size: 1.2rem;
            color: #a0aec0;
            margin-bottom: 40px;
        }
        .hero-buttons {
            display: flex;
            gap: 15px;
            justify-content: center;
            margin-bottom: 50px;
            flex-wrap: wrap;
        }
        
        .btn-primary {
            padding: 12px 30px;
            background: rgba(124, 58, 237, 0.1);
            border: 1px solid #7c3aed;
            color: #fff;
            border-radius: 8px;
            cursor: pointer;
            font-weight: 600;
            transition: all 0.3s;
            font-size: 1rem;
        }
        
        .btn-secondary {
            padding: 12px 30px;
            background: #7c3aed;
            border: none;
            color: #fff;
            border-radius: 8px;
            cursor: pointer;
            font-weight: 600;
            transition: all 0.3s;
            font-size: 1rem;
        }
        
        .hero-stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 20px;
            max-width: 600px;
            margin: 0 auto;
        }
        
        .hero-stat {
            background: rgba(124, 58, 237, 0.1);
            border: 1px solid #3d3b7f;
            border-radius: 10px;
            padding: 20px;
            transition: all 0.3s;
        }
        
        .stat-value {
            font-size: 1.8rem;
            font-weight: bold;
            color: #7c3aed;
            margin-bottom: 5px;
        }
        
        .stat-label {
            font-size: 0.85rem;
            color: #a0aec0;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        
        /* MAIN CONTENT */
        .main-content {
            display: none;
            padding: 50px 30px;
            max-width: 1200px;
            margin: 0 auto;
            position: relative;
            z-index: 1;
        }
        
        .main-content.active {
            display: block;
        }
        
        .section {
            background: linear-gradient(135deg, #1a1a3e 0%, #2d2b6b 100%);
            border: 1px solid #3d3b7f;
            border-radius: 10px;
            padding: 30px;
            margin-bottom: 30px;
        }
        
        .section h2 {
            color: #fff;
            margin-bottom: 20px;
            font-size: 1.5rem;
        }
        
        .grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
        }
        
        .card {
            background: #0a0e27;
            border: 1px solid #3d3b7f;
            border-radius: 8px;
            padding: 20px;
            transition: all 0.3s;
        }
        
        .card:hover {
            transform: translateY(-5px);
            border-color: #7c3aed;
        }
        /* ADMIN DASHBOARD */
        .admin-dashboard {
            display: none;
            background: #0a0e27;
            min-height: 100vh;
            padding-top: 0;
        }
        
        .admin-sidebar {
            width: 250px;
            background: #1a1a3e;
            border-right: 1px solid #2d2b6b;
            position: fixed;
            top: 0;
            left: 0;
            height: 100vh;
            padding: 20px;
            overflow-y: auto;
            z-index: 10;
        }
        
        .admin-content {
            margin-left: 250px;
            padding: 30px;
        }
        
        .admin-sidebar h3 {
            color: #7c3aed;
            font-size: 0.8rem;
            text-transform: uppercase;
            margin: 20px 0 10px 0;
            letter-spacing: 1px;
        }
        
        .admin-sidebar a {
            display: block;
            color: #a0aec0;
            text-decoration: none;
            padding: 10px;
            border-radius: 6px;
            cursor: pointer;
            transition: all 0.3s;
            margin-bottom: 5px;
        }
        
        .admin-sidebar a:hover, .admin-sidebar a.active {
            background: #2d2b6b;
            color: #7c3aed;
        }
        
        .admin-section {
            display: none;
        }
        
        .admin-section.active {
            display: block;
        }
        
        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
            background: #1a1a3e;
            border-radius: 8px;
            overflow: hidden;
        }
        
        table th {
            background: #0a0e27;
            color: #7c3aed;
            padding: 15px;
            text-align: left;
            border-bottom: 1px solid #3d3b7f;
        }
        
        table td {
            padding: 15px;
            border-bottom: 1px solid #3d3b7f;
            color: #a0aec0;
        }
        
        .status-badge {
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 0.8rem;
            font-weight: 600;
        }
        
        .status-pending { background: rgba(251, 191, 36, 0.2); color: #f59e0b; }
        .status-approved { background: rgba(16, 185, 129, 0.2); color: #10b981; }
        .status-rejected { background: rgba(239, 68, 68, 0.2); color: #ef4444; }
        
        @media (max-width: 768px) {
            .navbar {
                padding: 15px 20px;
            }
            
            .nav-menu {
                gap: 15px;
            }
            
            .hero-title {
                font-size: 2.5rem;
            }
            
            .hero-stats {
                grid-template-columns: 1fr;
            }
            
            .admin-sidebar {
                width: 100%;
                height: auto;
                position: relative;
            }
            
            .admin-content {
                margin-left: 0;
            }
        }
    </style>
</head>
<body id="mainBody">
    <!-- MAINTENANCE BANNER -->
    <div id="maintenanceBanner" class="maintenance-banner" style="display: none;">
        🔧 Sunucu bakımda! Lütfen daha sonra tekrar deneyiniz.
    </div>
    
    <!-- NAVIGATION -->
    <nav class="navbar">
        <div class="navbar-brand">SHADOW<span>CORE</span></div>
        <ul class="nav-menu">
            <li><a href="#" onclick="showSection('home')" class="active">🏠 Ana Sayfa</a></li>
            <li><a href="#" onclick="showSection('announcements')">📢 Duyurular</a></li>
            <li><a href="#" onclick="showSection('applications')">📝 Başvurular</a></li>
            <li><a href="#" onclick="showSection('shop')">🛒 Mağaza</a></li>
        </ul>
        <div class="login-buttons" id="loginButtons">
            <button class="btn" onclick="openLoginModal('login')">Giriş Yap</button>
            <button class="btn" onclick="openLoginModal('register')">Kayıt Ol</button>
        </div>
        <div class="login-buttons" id="userButtons" style="display: none;">
            <span id="usernameDisplay" style="color: #a0aec0; margin-right: 15px;"></span>
            <button class="btn" onclick="logout()">Çıkış</button>
        </div>
    </nav>
    
    <!-- LOGIN MODAL -->
    <div class="login-modal" id="loginModal">
        <div class="modal-content">
            <button class="close-btn" onclick="closeLoginModal()">✕</button>
            <h2 style="color: #7c3aed; margin-bottom: 20px;">SHADOWCORE</h2>
            
            <div class="modal-tabs">
                <button class="tab-btn active" onclick="switchModalTab('login')">Giriş Yap</button>
                <button class="tab-btn" onclick="switchModalTab('register')">Kayıt Ol</button>
            </div>
            
            <!-- Login Form -->
            <div id="loginForm">
                <div class="form-group">
                    <label>Kullanıcı Adı</label>
                    <input type="text" class="form-input" id="loginUsername" placeholder="Kullanıcı adını gir">
                </div>
                <div class="form-group">
                    <label>Şifre</label>
                    <input type="password" class="form-input" id="loginPassword" placeholder="Şifreni gir">
                </div>
                <button class="btn" onclick="login()" style="width: 100%; margin-top: 10px;">Giriş Yap</button>
            </div>
            
            <!-- Register Form -->
            <div id="registerForm" style="display: none;">
                <div class="form-group">
                    <label>Kullanıcı Adı</label>
                    <input type="text" class="form-input" id="regUsername" placeholder="Kullanıcı adı">
                </div>
                <div class="form-group">
                    <label>E-Mail</label>
                    <input type="email" class="form-input" id="regEmail" placeholder="E-Mail adresin">
                </div>
                <div class="form-group">
                    <label>Şifre</label>
                    <input type="password" class="form-input" id="regPassword" placeholder="Şifre">
                </div>
                <button class="btn" onclick="register()" style="width: 100%; margin-top: 10px;">Kayıt Ol</button>
            </div>
        </div>
    </div>
    <!-- HOME SECTION -->
    <div id="homeSection">
        <div class="hero-section">
            <div class="hero-badge" id="serverStatus">🎮 SUNUCU AKTİF</div>
            <h1 class="hero-title" id="serverName">ShadowCore Minecraft Sunucusu</h1>
            <p class="hero-subtitle">Türkiye'nin en iyi Minecraft sunucusunda maceraya hazır mısın?</p>
            
            <div class="hero-buttons">
                <button class="btn-primary" id="serverIPBtn">📋 play.shadowcore.com</button>
                <button class="btn-secondary">▶️ OYNA</button>
            </div>
            
            <div class="hero-stats" id="heroStats">
                <div class="hero-stat">
                    <div class="stat-value" id="playersOnline">45</div>
                    <div class="stat-label">Çevrimiçi</div>
                </div>
                <div class="hero-stat">
                    <div class="stat-value">12ms</div>
                    <div class="stat-label">Ping</div>
                </div>
                <div class="hero-stat">
                    <div class="stat-value" id="serverVersion">1.21.11</div>
                    <div class="stat-label">Sürüm</div>
                </div>
            </div>
        </div>
    </div>
    
    <!-- ANNOUNCEMENTS SECTION -->
    <div class="main-content" id="announcementsSection">
        <div class="section">
            <h2>📢 Duyurular</h2>
            <div id="announcementsList"></div>
        </div>
    </div>
    
    <!-- APPLICATIONS SECTION -->
    <div class="main-content" id="applicationsSection">
        <div class="section">
            <h2>📝 Başvuru Yap</h2>
            <div style="display: grid; gap: 15px; max-width: 500px;">
                <input type="text" class="form-input" id="appUsername" placeholder="Minecraft Kullanıcı Adın">
                <select class="form-input" id="appPosition">
                    <option value="">Pozisyon Seç</option>
                    <option value="Moderatör">Moderatör</option>
                    <option value="Builder">Builder</option>
                    <option value="Helper">Helper</option>
                </select>
                <textarea class="form-input" id="appReason" placeholder="Neden bu pozisyona uygun olduğunuzu açıklayın..." rows="5"></textarea>
                <button class="btn" onclick="submitApplication()">Başvuru Gönder</button>
            </div>
        </div>
    </div>
    
    <!-- SHOP SECTION -->
    <div class="main-content" id="shopSection">
        <div class="section">
            <h2>🛒 Mağaza</h2>
            <div class="grid" id="shopProducts"></div>
        </div>
    </div>
    <!-- ADMIN DASHBOARD -->
    <div class="admin-dashboard" id="adminDashboard">
        <div class="admin-sidebar">
            <h2 style="color: #7c3aed; margin-bottom: 30px;">Admin Panel</h2>
            <h3>Sunucu</h3>
            <a onclick="showAdminSection('serverSettings')" class="active">⚙️ Sunucu Ayarları</a>
            <a onclick="showAdminSection('maintenance')">🔧 Bakım Modu</a>
            
            <h3>İçerik</h3>
            <a onclick="showAdminSection('announcements')">📢 Duyurular</a>
            <a onclick="showAdminSection('applications')">📝 Başvurular</a>
            
            <h3>Yönetim</h3>
            <a onclick="showAdminSection('users')">👥 Kullanıcılar</a>
            <a onclick="showAdminSection('statistics')">📊 İstatistikler</a>
        </div>
        
        <div class="admin-content">
            <!-- Server Settings -->
            <div class="admin-section active" id="serverSettings">
                <h2>⚙️ Sunucu Ayarları</h2>
                <div class="section">
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
                        <input type="text" class="form-input" id="adminServerName" placeholder="Sunucu Adı">
                        <input type="text" class="form-input" id="adminServerIP" placeholder="Sunucu IP">
                        <input type="number" class="form-input" id="adminServerPort" placeholder="Port">
                        <input type="number" class="form-input" id="adminMaxPlayers" placeholder="Max Oyuncu">
                        <input type="number" class="form-input" id="adminPlayersOnline" placeholder="Çevrimiçi">
                        <input type="text" class="form-input" id="adminServerVersion" placeholder="Sürüm">
                        <button class="btn" onclick="saveServerSettings()">Kaydet</button>
                    </div>
                </div>
            </div>
            
            <!-- Maintenance -->
            <div class="admin-section" id="maintenance">
                <h2>🔧 Bakım Modu</h2>
                <div class="section">
                    <div style="display: flex; gap: 15px; align-items: center; margin-bottom: 20px;">
                        <label style="color: #a0aec0;">
                            <input type="checkbox" id="maintenanceToggle"> Bakım Modunu Aktif Et
                        </label>
                    </div>
                    <textarea class="form-input" id="maintenanceMessage" placeholder="Bakım mesajı..." rows="3"></textarea>
                    <button class="btn" onclick="toggleMaintenance()" style="margin-top: 15px;">Kaydet</button>
                </div>
            </div>
            
            <!-- Admin Announcements -->
            <div class="admin-section" id="announcements">
                <h2>📢 Duyuru Yönetimi</h2>
                <div class="section">
                    <div style="display: grid; gap: 15px; max-width: 500px; margin-bottom: 30px;">
                        <input type="text" class="form-input" id="announcementTitle" placeholder="Duyuru Başlığı">
                        <textarea class="form-input" id="announcementContent" placeholder="Duyuru İçeriği..." rows="4"></textarea>
                        <button class="btn" onclick="addAnnouncement()">Duyuru Ekle</button>
                    </div>
                </div>
            </div>
            <!-- Admin Applications -->
            <div class="admin-section" id="applications">
                <h2>📝 Başvuru Yönetimi</h2>
                <div class="section">
                    <table id="applicationsTable">
                        <thead>
                            <tr>
                                <th>Kullanıcı</th>
                                <th>Pozisyon</th>
                                <th>Durum</th>
                                <th>Tarih</th>
                                <th>İşlemler</th>
                            </tr>
                        </thead>
                        <tbody></tbody>
                    </table>
                </div>
            </div>
            
            <!-- Users -->
            <div class="admin-section" id="users">
                <h2>👥 Kullanıcı Yönetimi</h2>
                <div class="section">
                    <table id="usersTable">
                        <thead>
                            <tr>
                                <th>Kullanıcı Adı</th>
                                <th>E-Mail</th>
                                <th>Roller</th>
                                <th>Kayıt Tarihi</th>
                            </tr>
                        </thead>
                        <tbody></tbody>
                    </table>
                </div>
            </div>
            
            <!-- Statistics -->
            <div class="admin-section" id="statistics">
                <h2>📊 İstatistikler</h2>
                <div class="section">
                    <div class="grid">
                        <div class="card">
                            <h3 style="color: #7c3aed;">Toplam Kullanıcılar</h3>
                            <div style="font-size: 2rem; font-weight: bold; color: #fff; margin-top: 10px;" id="totalUsers">0</div>
                        </div>
                        <div class="card">
                            <h3 style="color: #7c3aed;">Toplam Başvurular</h3>
                            <div style="font-size: 2rem; font-weight: bold; color: #fff; margin-top: 10px;" id="totalApplications">0</div>
                        </div>
                        <div class="card">
                            <h3 style="color: #7c3aed;">Çevrimiçi Oyuncular</h3>
                            <div style="font-size: 2rem; font-weight: bold; color: #fff; margin-top: 10px;" id="onlinePlayers">0</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
    <script>
        let currentUser = null;
        let isAdmin = false;
        let sessionId = null;
        
        // Initialize
        document.addEventListener('DOMContentLoaded', function() {
            loadServerInfo();
            loadAnnouncements();
            loadProducts();
            
            // Copy IP to clipboard
            document.getElementById('serverIPBtn').addEventListener('click', function() {
                navigator.clipboard.writeText(this.textContent.replace('📋 ', ''));
                alert('IP kopyalandı!');
            });
        });
        
        // Navigation
        function showSection(section) {
            document.querySelectorAll('.main-content, #homeSection').forEach(el => el.classList.remove('active'));
            document.querySelectorAll('.nav-menu a').forEach(a => a.classList.remove('active'));
            
            if (section === 'home') {
                document.getElementById('homeSection').style.display = 'block';
            } else {
                document.getElementById(section + 'Section').classList.add('active');
            }
            
            event.target.classList.add('active');
        }
        
        // Login Modal
        function openLoginModal(tab) {
            document.getElementById('loginModal').classList.add('active');
            switchModalTab(tab);
        }
        
        function closeLoginModal() {
            document.getElementById('loginModal').classList.remove('active');
        }
        
        function switchModalTab(tab) {
            document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
            document.getElementById('loginForm').style.display = tab === 'login' ? 'block' : 'none';
            document.getElementById('registerForm').style.display = tab === 'register' ? 'block' : 'none';
            
            if (tab === 'login') {
                document.querySelectorAll('.tab-btn')[0].classList.add('active');
            } else {
                document.querySelectorAll('.tab-btn')[1].classList.add('active');
            }
        }
        
        // Auth Functions
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
                isAdmin = data.admin;
                sessionId = data.sessionId;
                
                document.getElementById('loginButtons').style.display = 'none';
                document.getElementById('userButtons').style.display = 'flex';
                document.getElementById('usernameDisplay').textContent = username + (isAdmin ? ' (Admin)' : '');
                
                closeLoginModal();
                
                if (isAdmin) {
                    showAdminDashboard();
                }
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
                switchModalTab('login');
            }
        }
        
        function logout() {
            currentUser = null;
            isAdmin = false;
            sessionId = null;
            
            document.getElementById('loginButtons').style.display = 'flex';
            document.getElementById('userButtons').style.display = 'none';
            document.getElementById('adminDashboard').style.display = 'none';
            document.getElementById('homeSection').style.display = 'block';
            
            alert('Çıkış yapıldı!');
        }
        
        // Load Server Info
        async function loadServerInfo() {
            const res = await fetch('/api/server-info');
            const data = await res.json();
            
            document.getElementById('serverName').textContent = data.name;
            document.getElementById('serverIPBtn').textContent = '📋 ' + data.ip;
            document.getElementById('playersOnline').textContent = data.playersOnline;
            document.getElementById('serverVersion').textContent = data.version;
            
            if (data.maintenance) {
                const banner = document.getElementById('maintenanceBanner');
                banner.style.display = 'block';
                banner.textContent = '🔧 ' + data.maintenanceMessage;
                document.getElementById('heroStats').style.opacity = '0.5';
            }
        }
        
        // Load Announcements
        async function loadAnnouncements() {
            const res = await fetch('/api/announcements');
            const data = await res.json();
            
            const html = data.map(a => \`
                <div class="card">
                    <h3 style="color: #7c3aed;">\${a.title}</h3>
                    <p style="margin-top: 10px;">\${a.content}</p>
                    <small style="color: #666;">
                        \${new Date(a.date).toLocaleDateString('tr-TR')}
                    </small>
                </div>
            \`).join('');
            
            document.getElementById('announcementsList').innerHTML = html;
        }
        
        // Load Products
        async function loadProducts() {
            const res = await fetch('/api/products');
            const data = await res.json();
            
            const html = data.map(p => \`
                <div class="card">
                    <h3 style="color: #7c3aed;">\${p.name}</h3>
                    <p style="margin-top: 10px;">\${p.description}</p>
                    <div style="color: #10b981; font-weight: bold; margin-top: 10px;">₺\${p.price}</div>
                    <button class="btn" style="width: 100%; margin-top: 10px;">Satın Al</button>
                </div>
            \`).join('');
            
            document.getElementById('shopProducts').innerHTML = html;
        }
        
        // Submit Application
        async function submitApplication() {
            const username = document.getElementById('appUsername').value;
            const position = document.getElementById('appPosition').value;
            const reason = document.getElementById('appReason').value;
            
            if (!username || !position || !reason) {
                alert('Tüm alanları doldurun!');
                return;
            }
            
            const res = await fetch('/api/apply', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, position, reason })
            });
            
            const data = await res.json();
            alert(data.message);
            if (data.success) {
                document.getElementById('appUsername').value = '';
                document.getElementById('appPosition').value = '';
                document.getElementById('appReason').value = '';
            }
        }
        
        // Admin Functions
        function showAdminDashboard() {
            document.getElementById('homeSection').style.display = 'none';
            document.querySelectorAll('.main-content').forEach(el => el.classList.remove('active'));
            document.getElementById('adminDashboard').style.display = 'flex';
            loadAdminData();
        }
        
        function showAdminSection(section) {
            document.querySelectorAll('.admin-section').forEach(el => el.classList.remove('active'));
            document.querySelectorAll('.admin-sidebar a').forEach(a => a.classList.remove('active'));
            
            document.getElementById(section).classList.add('active');
            event.target.classList.add('active');
        }
        
        async function loadAdminData() {
            const serverRes = await fetch('/api/server-info');
            const serverData = await serverRes.json();
            
            document.getElementById('adminServerName').value = serverData.name;
            document.getElementById('adminServerIP').value = serverData.ip;
            document.getElementById('adminServerPort').value = serverData.port;
            document.getElementById('adminMaxPlayers').value = serverData.maxPlayers;
            document.getElementById('adminPlayersOnline').value = serverData.playersOnline;
            document.getElementById('adminServerVersion').value = serverData.version;
            
            document.getElementById('maintenanceToggle').checked = serverData.maintenance;
            document.getElementById('maintenanceMessage').value = serverData.maintenanceMessage;
            
            // Load applications table
            const appRes = await fetch('/api/applications');
            const apps = await appRes.json();
            
            const appHtml = apps.map(a => \`
                <tr>
                    <td>\${a.username}</td>
                    <td>\${a.position}</td>
                    <td><span class="status-badge status-\${a.status.toLowerCase().replace(' ', '_')}">\${a.status}</span></td>
                    <td>\${new Date(a.date).toLocaleDateString('tr-TR')}</td>
                    <td>
                        <button class="btn" style="padding: 5px 10px; font-size: 0.8rem; margin-right: 5px;" onclick="updateApplicationStatus(\${a.id}, 'Onaylandı')">✓</button>
                        <button class="btn" style="padding: 5px 10px; font-size: 0.8rem; background: #ef4444;" onclick="updateApplicationStatus(\${a.id}, 'Reddedildi')">✕</button>
                    </td>
                </tr>
            \`).join('');
            
            document.getElementById('applicationsTable').querySelector('tbody').innerHTML = appHtml;
            
            // Load users table
            const usersHtml = Object.values(config.users || {}).map(u => \`
                <tr>
                    <td>\${u.username}</td>
                    <td>\${u.email}</td>
                    <td>\${u.roles.join(', ')}</td>
                    <td>\${new Date(u.createdAt).toLocaleDateString('tr-TR')}</td>
                </tr>
            \`).join('');
            
            // Load stats
            const statsRes = await fetch('/api/stats');
            const stats = await statsRes.json();
            
            document.getElementById('totalUsers').textContent = stats.totalUsers;
            document.getElementById('totalApplications').textContent = stats.totalApplications;
            document.getElementById('onlinePlayers').textContent = serverData.playersOnline;
        }
        
        async function saveServerSettings() {
            const name = document.getElementById('adminServerName').value;
            const ip = document.getElementById('adminServerIP').value;
            const port = document.getElementById('adminServerPort').value;
            const maxPlayers = document.getElementById('adminMaxPlayers').value;
            const playersOnline = document.getElementById('adminPlayersOnline').value;
            const version = document.getElementById('adminServerVersion').value;
            
            const res = await fetch('/api/admin/server-settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, ip, port, maxPlayers, playersOnline, version })
            });
            
            const data = await res.json();
            if (data.success) {
                alert('✅ Sunucu ayarları kaydedildi!');
                loadServerInfo();
            }
        }
        
        async function toggleMaintenance() {
            const maintenance = document.getElementById('maintenanceToggle').checked;
            const message = document.getElementById('maintenanceMessage').value;
            
            const res = await fetch('/api/admin/maintenance', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ maintenance, message })
            });
            
            const data = await res.json();
            if (data.success) {
                alert('✅ Bakım modu güncellendi!');
                loadServerInfo();
            }
        }
        
        async function addAnnouncement() {
            const title = document.getElementById('announcementTitle').value;
            const content = document.getElementById('announcementContent').value;
            
            if (!title || !content) {
                alert('Tüm alanları doldurun!');
                return;
            }
            
            const res = await fetch('/api/admin/announcement', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title, content })
            });
            
            const data = await res.json();
            if (data.success) {
                alert('✅ Duyuru eklendi!');
                document.getElementById('announcementTitle').value = '';
                document.getElementById('announcementContent').value = '';
                loadAnnouncements();
            }
        }
        
        async function updateApplicationStatus(appId, status) {
            const res = await fetch('/api/admin/application-status', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ appId, status })
            });
            
            const data = await res.json();
            if (data.success) {
                alert('✅ Başvuru durumu güncellendi!');
                loadAdminData();
            }
        }
    </script>
</body>
</html>
    `);
});

// Keep-alive
const http = require('http');
const PORT = process.env.PORT || 3001;

const server = http.createServer(app);
server.listen(PORT, () => {
    console.log(`✅ Minecraft Sunucu Sitesi başladı: http://localhost:${PORT}`);
});

// Discord Bot
const token = process.env.DISCORD_TOKEN;
if (token) {
    client.once('ready', () => {
        console.log(`✅ Discord Bot başladı: ${client.user.tag}`);
    });
    
    client.login(token).catch(err => {
        console.error('❌ Bot hatası:', err.message);
    });
}