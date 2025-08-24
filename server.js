const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');

// Carregar variáveis de ambiente
dotenv.config();

// Importar rotas
const authRoutes = require('./routes/auth');
const videoRoutes = require('./routes/videos');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));
app.use(express.static('views'));

// Configurar MIME types corretamente
app.use((req, res, next) => {
    if (req.url.endsWith('.css')) {
        res.setHeader('Content-Type', 'text/css');
    } else if (req.url.endsWith('.js')) {
        res.setHeader('Content-Type', 'application/javascript');
    }
    next();
});

// Rota para favicon (evita erro 404)
app.get('/favicon.ico', (req, res) => {
    res.status(204).end();
});

// Rotas
app.use('/api/auth', authRoutes);
app.use('/api/videos', videoRoutes);

// Servir páginas
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'login.html'));
});

app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'dashboard.html'));
});

// Rota para teste básico
app.get('/api/test', (req, res) => {
    res.json({ message: 'API funcionando', timestamp: new Date() });
});

// Conexão com MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/videoapp', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(() => console.log('Conectado ao MongoDB com sucesso'))
.catch(err => {
    console.error('Erro ao conectar com MongoDB:', err);
    console.log('String de conexão usada:', process.env.MONGODB_URI);
});

// Verificar conexão
mongoose.connection.on('error', err => {
    console.error('Erro de conexão MongoDB:', err);
});

mongoose.connection.on('disconnected', () => {
    console.log('Desconectado do MongoDB');
});

mongoose.connection.on('connected', () => {
    console.log('Conectado ao MongoDB com sucesso');
});

// Middleware de tratamento de erro global
app.use((error, req, res, next) => {
    console.error('Erro não tratado:', error);
    res.status(500).json({ 
        message: 'Erro interno do servidor',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Ocorreu um erro interno'
    });
});

// Iniciar servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});