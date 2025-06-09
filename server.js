/* ---------- IMPORT ---------- */
require('dotenv').config();
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const { Pool } = require('pg');

const clientRoutes = require('./routes/clients');
const knowledgeRoutes = require('./routes/knowledge');
const chatbotRoutes = require('./routes/chatbot');

/* ---------- APP ---------- */
const app = express();
const port = process.env.PORT || 3000;

// Configurazione più robusta per il parsing JSON
app.use(express.json());
// Middleware per intercettare errori di parsing JSON
app.use((err, req, res, next) => {
    if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
        return res.status(400).json({ result: 'JSON_NON_VALIDO' });
    }
    next();
});
app.use(cookieParser());

// Configurazione CORS
const allowedOriginsEnv = process.env.CORS_ORIGINS;
const allowedOrigins = allowedOriginsEnv ? allowedOriginsEnv.split(',').map(o => o.trim()) : '*';
app.use(cors({
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key', 'X-API-KEY'],
    exposedHeaders: ['*', 'Authorization']
}));

/* ---------- LOGIN ---------- */
app.post('/api/login', async (req, res) => {
  const ok = await bcrypt.compare(req.body.password || '', process.env.ADMIN_PASSWORD);
  if (!ok) return res.status(401).json({ error: 'Bad credentials' });

    const token = jwt.sign({ role: 'admin' }, process.env.JWT_SECRET, { expiresIn: '30d' });
  res.cookie('crmToken', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'Lax',
    path: '/',
    maxAge: 30 * 24 * 60 * 60 * 1000
  }).sendStatus(204);
});

// Logout route
app.post('/api/logout', (req, res) => {
    res.clearCookie('crmToken', {
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'Lax'
    }).sendStatus(204);
});

/* ---------- MIDDLEWARE ---------- */
function checkAuth(req, res, next) {
  try {
        const token = req.cookies.crmToken;
        if (!token) throw new Error('No token');
        jwt.verify(token, process.env.JWT_SECRET);
        next();
    } catch (err) {
        res.redirect('/login.html');
  }
}

/* ---------- PAGINE HTML PROTETTE ---------- */
app.get(['/', '/index.html', '/knowledge.html'], checkAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'public',
    req.path === '/' ? 'index.html' : req.path));
});

// Serve login page without auth
app.get('/login.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

/* ---------- STATIC ---------- */
app.use(express.static(path.join(__dirname, 'public')));

/* ---------- API PROTETTE ---------- */
app.use('/api', (req, res, next) => {
    // Skip auth check for login/logout and chatbot routes
    if (req.path === '/login' || req.path === '/logout' || req.path.startsWith('/chatbot/')) {
        return next();
    }
    
    try {
        const token = req.cookies.crmToken;
        if (!token) throw new Error('No token');
        jwt.verify(token, process.env.JWT_SECRET);
        next();
    } catch (err) {
        res.status(401).json({ error: 'Unauthorized' });
    }
});

/* ---------- SQLITE SETUP ---------- */
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
});

async function query(text, params) {
    const client = await pool.connect();
    try {
        const res = await client.query(text, params);
        return res;
    } finally {
        client.release();
    }
}

app.use("/api", chatbotRoutes(query));
app.use("/api", clientRoutes(query));
app.use("/api", knowledgeRoutes(query));

if (require.main === module) {
  app.listen(port, () => {
    console.log(`Server avviato su http://localhost:${port}`);
  });
} else {
  module.exports = app;
}
