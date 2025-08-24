const express = require('express');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const streamifier = require('streamifier');
const Video = require('../models/Video');
const auth = require('../middleware/auth');

const router = express.Router();

// Configurar Cloudinary com timeout aumentado
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    timeout: 120000 // 120 segundos timeout
});

// Configurar Multer para upload na memória
const storage = multer.memoryStorage();
const upload = multer({ 
    storage,
    limits: {
        fileSize: 500 * 1024 * 1024, // 500MB limite aumentado
        files: 10 // Máximo de 10 arquivos
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('video/')) {
            cb(null, true);
        } else {
            cb(new Error('Apenas arquivos de vídeo são permitidos!'), false);
        }
    }
});

// Upload de vídeos
router.post('/upload', auth, upload.array('videos', 10), async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ message: 'Nenhum arquivo enviado' });
        }
        
        console.log('Iniciando upload de', req.files.length, 'arquivos');
        
        const uploadPromises = req.files.map(file => {
            return new Promise((resolve, reject) => {
                const uploadStream = cloudinary.uploader.upload_stream(
                    {
                        resource_type: 'video',
                        folder: 'videos',
                        chunk_size: 6000000, // 6MB chunks para uploads grandes
                        timeout: 120000 // 120 segundos timeout
                    },
                    (error, result) => {
                        if (error) {
                            console.error('Erro no upload do Cloudinary:', error);
                            reject(error);
                        } else {
                            resolve({ result, file });
                        }
                    }
                );
                
                streamifier.createReadStream(file.buffer).pipe(uploadStream);
            });
        });
        
        const results = await Promise.all(uploadPromises);
        console.log('Uploads concluídos com sucesso');
        
        // Salvar informações no banco de dados
        const videoPromises = results.map(({ result, file }) => {
            const video = new Video({
                originalName: file.originalname,
                filename: result.public_id,
                url: result.secure_url,
                size: result.bytes,
                format: result.format,
                userId: req.user._id,
                publicId: result.public_id
            });
            
            return video.save();
        });
        
        const savedVideos = await Promise.all(videoPromises);
        console.log('Vídeos salvos no banco de dados');
        
        res.json({ 
            message: 'Vídeos enviados com sucesso!',
            videos: savedVideos 
        });
        
    } catch (error) {
        console.error('Erro no upload:', error);
        res.status(500).json({ 
            message: 'Erro no upload de vídeos',
            error: error.message 
        });
    }
});

// Listar vídeos do usuário
router.get('/', auth, async (req, res) => {
    try {
        const videos = await Video.find({ userId: req.user._id }).sort({ uploadDate: -1 });
        res.json(videos);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao carregar vídeos' });
    }
});

// Download de vídeo
router.get('/download/:id', auth, async (req, res) => {
    try {
        const video = await Video.findOne({ _id: req.params.id, userId: req.user._id });
        
        if (!video) {
            return res.status(404).json({ message: 'Vídeo não encontrado' });
        }
        
        let quality = req.query.quality || 'original';
        let downloadUrl = video.url;
        
        // Se não for a qualidade original, buscar a transformação correspondente
        if (quality !== 'original') {
            const parts = video.url.split('/upload/');
            const transformation = quality === 'high' ? 'q_80' : 
                                 quality === 'medium' ? 'q_60' : 'q_40';
            
            downloadUrl = `${parts[0]}/upload/${transformation}/${parts[1]}`;
        }
        
        // Configurar headers para download
        res.setHeader('Content-Disposition', `attachment; filename="${video.originalName}"`);
        res.setHeader('Content-Type', 'video/mp4');
        
        // Redirecionar para o URL do Cloudinary
        res.redirect(downloadUrl);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao baixar vídeo' });
    }
});

// Excluir vídeo
router.delete('/:id', auth, async (req, res) => {
    try {
        const video = await Video.findOne({ _id: req.params.id, userId: req.user._id });
        
        if (!video) {
            return res.status(404).json({ message: 'Vídeo não encontrado' });
        }
        
        // Excluir do Cloudinary
        await cloudinary.uploader.destroy(video.publicId, { resource_type: 'video' });
        
        // Excluir do banco de dados
        await Video.findByIdAndDelete(req.params.id);
        
        res.json({ message: 'Vídeo excluído com sucesso' });
    } catch (error) {
        res.status(500).json({ message: 'Erro ao excluir vídeo' });
    }
});

// Rota para testar conexão com Cloudinary
router.get('/test-cloudinary', async (req, res) => {
    try {
        // Testar credenciais do Cloudinary
        const result = await cloudinary.api.ping();
        res.json({ 
            message: 'Conexão com Cloudinary OK',
            cloudinary: result 
        });
    } catch (error) {
        res.status(500).json({ 
            message: 'Erro na conexão com Cloudinary',
            error: error.message 
        });
    }
});

module.exports = router;