const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();

// Login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        console.log('Tentativa de login:', email);
        
        // Verificar se o usuário existe
        const user = await User.findOne({ email });
        console.log('Usuário encontrado:', user);
        
        if (!user) {
            console.log('Usuário não encontrado');
            return res.status(400).json({ message: 'Credenciais inválidas' });
        }
        
        // Verificar senha
        const isPasswordValid = await user.correctPassword(password, user.password);
        console.log('Senha válida:', isPasswordValid);
        
        if (!isPasswordValid) {
            console.log('Senha inválida');
            return res.status(400).json({ message: 'Credenciais inválidas' });
        }
        
        // Gerar token JWT
        const token = jwt.sign(
            { id: user._id }, 
            process.env.JWT_SECRET || 'seu_jwt_secreto',
            { expiresIn: '7d' }
        );
        
        res.json({ 
            token, 
            user: { 
                id: user._id, 
                email: user.email 
            } 
        });
    } catch (error) {
        console.error('Erro no login:', error);
        res.status(500).json({ message: 'Erro no servidor' });
    }
});

// Verificar token
router.get('/verify', auth, async (req, res) => {
    res.json({ user: req.user });
});

// Criar usuário de demonstração (apenas para desenvolvimento)
router.post('/create-demo-user', async (req, res) => {
    try {
        // Verificar se o usuário já existe
        const existingUser = await User.findOne({ email: 'honnyfrontend@gmail.com' });
        if (existingUser) {
            return res.status(400).json({ message: 'Usuário já existe' });
        }
        
        // Criar usuário de demonstração
        const demoUser = new User({
            email: 'honnyfrontend@gmail.com',
            password: '123'
        });
        
        await demoUser.save();
        
        res.json({ message: 'Usuário de demonstração criado com sucesso' });
    } catch (error) {
        res.status(500).json({ message: 'Erro ao criar usuário de demonstração' });
    }
});

// Rota para debug - ver todos os usuários
router.get('/debug-users', async (req, res) => {
    try {
        const users = await User.find();
        console.log('Usuários no banco:', users);
        res.json(users);
    } catch (error) {
        console.error('Erro ao buscar usuários:', error);
        res.status(500).json({ message: 'Erro ao buscar usuários' });
    }
});

// Rota alternativa para criar usuário demo
router.get('/create-demo-manually', async (req, res) => {
    try {
        // Verificar se o usuário já existe
        const existingUser = await User.findOne({ email: 'honnyfrontend@gmail.com' });
        
        if (existingUser) {
            console.log('Usuário já existe:', existingUser);
            return res.json({ message: 'Usuário já existe', user: existingUser });
        }
        
        // Criar usuário de demonstração
        const demoUser = new User({
            email: 'honnyfrontend@gmail.com',
            password: '123'
        });
        
        await demoUser.save();
        console.log('Usuário criado com sucesso:', demoUser);
        
        res.json({ message: 'Usuário de demonstração criado com sucesso', user: demoUser });
    } catch (error) {
        console.error('Erro ao criar usuário demo:', error);
        res.status(500).json({ message: 'Erro ao criar usuário de demonstração', error: error.message });
    }
});

module.exports = router;