let currentVideoId = null;

document.addEventListener('DOMContentLoaded', function() {
    checkAuth();
    loadVideos();
    setupUploadForm();
});

// Verificar autenticação
async function checkAuth() {
    const token = localStorage.getItem('token');
    
    if (!token) {
        window.location.href = '/';
        return;
    }
    
    try {
        const response = await fetch('/api/auth/verify', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            localStorage.removeItem('token');
            window.location.href = '/';
        }
    } catch (error) {
        localStorage.removeItem('token');
        window.location.href = '/';
    }
}

// Configurar formulário de upload
function setupUploadForm() {
    const fileInput = document.getElementById('fileInput');
    const fileNames = document.getElementById('file-names');
    const uploadForm = document.getElementById('uploadForm');
    const uploadProgress = document.getElementById('uploadProgress');
    const progressBar = document.querySelector('.progress');
    const progressText = document.querySelector('.progress-text');
    
    fileInput.addEventListener('change', function() {
        if (this.files.length === 0) {
            fileNames.textContent = 'Nenhum arquivo selecionado.';
        } else {
            const names = Array.from(this.files).map(file => file.name).join(', ');
            fileNames.textContent = names;
        }
    });
    
    uploadForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        if (fileInput.files.length === 0) {
            alert('Por favor, selecione pelo menos um vídeo.');
            return;
        }
        
        const formData = new FormData();
        for (let i = 0; i < fileInput.files.length; i++) {
            formData.append('videos', fileInput.files[i]);
        }
        
        // Mostrar barra de progresso
        uploadProgress.style.display = 'block';
        progressBar.style.width = '0%';
        progressText.textContent = '0%';
        
        try {
            const token = localStorage.getItem('token');
            
            const response = await fetch('/api/videos/upload', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });
            
            if (response.ok) {
                // Upload concluído com sucesso
                progressBar.style.width = '100%';
                progressText.textContent = '100%';
                
                setTimeout(() => {
                    uploadProgress.style.display = 'none';
                    fileInput.value = '';
                    fileNames.textContent = 'Nenhum arquivo selecionado.';
                    loadVideos(); // Recarregar a lista de vídeos
                }, 1000);
            } else {
                const error = await response.json();
                alert('Erro no upload: ' + error.message);
                uploadProgress.style.display = 'none';
            }
        } catch (error) {
            alert('Erro de conexão: ' + error.message);
            uploadProgress.style.display = 'none';
        }
    });
}

// Carregar vídeos do usuário
async function loadVideos() {
    const videoGallery = document.getElementById('video-gallery');
    videoGallery.innerHTML = '<p class="empty-message">Carregando vídeos...</p>';
    
    try {
        const token = localStorage.getItem('token');
        
        const response = await fetch('/api/videos', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            const videos = await response.json();
            
            if (videos.length === 0) {
                videoGallery.innerHTML = '<p class="empty-message">Nenhum vídeo encontrado. Faça upload de seus vídeos.</p>';
                return;
            }
            
            let html = '';
            videos.forEach(video => {
                html += `
                <div class="video-card">
                    <div class="video-thumbnail">
                        <video>
                            <source src="${video.url}" type="video/mp4">
                            Seu navegador não suporta o elemento de vídeo.
                        </video>
                    </div>
                    <div class="video-info">
                        <div class="video-title">${video.originalName}</div>
                        <div class="video-details">
                            <span>${formatFileSize(video.size)}</span>
                            <span>${formatDate(video.uploadDate)}</span>
                        </div>
                        <div class="video-actions">
                            <button class="action-btn download-btn" onclick="showDownloadModal('${video._id}')">
                                <i class="fas fa-download"></i> Download
                            </button>
                            <button class="action-btn delete-btn" onclick="deleteVideo('${video._id}')">
                                <i class="fas fa-trash"></i> Excluir
                            </button>
                        </div>
                    </div>
                </div>
                `;
            });
            
            videoGallery.innerHTML = html;
        } else {
            videoGallery.innerHTML = '<p class="empty-message">Erro ao carregar vídeos.</p>';
        }
    } catch (error) {
        videoGallery.innerHTML = '<p class="empty-message">Erro de conexão.</p>';
    }
}

// Mostrar modal de download
function showDownloadModal(videoId) {
    currentVideoId = videoId;
    document.getElementById('downloadModal').style.display = 'block';
}

// Fechar modal
function closeModal() {
    document.getElementById('downloadModal').style.display = 'none';
    currentVideoId = null;
}

// Download de vídeo
async function downloadVideo(quality) {
    if (!currentVideoId) return;
    
    try {
        const token = localStorage.getItem('token');
        
        const response = await fetch(`/api/videos/download/${currentVideoId}?quality=${quality}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            
            // Obter o nome do arquivo do header Content-Disposition
            const contentDisposition = response.headers.get('Content-Disposition');
            let filename = 'video.mp4';
            if (contentDisposition) {
                const filenameMatch = contentDisposition.match(/filename="?(.+)"?/);
                if (filenameMatch.length === 2) filename = filenameMatch[1];
            }
            
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } else {
            alert('Erro ao baixar o vídeo.');
        }
    } catch (error) {
        alert('Erro de conexão: ' + error.message);
    }
    
    closeModal();
}

// Excluir vídeo
async function deleteVideo(videoId) {
    if (!confirm('Tem certeza que deseja excluir este vídeo?')) return;
    
    try {
        const token = localStorage.getItem('token');
        
        const response = await fetch(`/api/videos/${videoId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            loadVideos(); // Recarregar a lista de vídeos
        } else {
            alert('Erro ao excluir o vídeo.');
        }
    } catch (error) {
        alert('Erro de conexão: ' + error.message);
    }
}

// Logout
function logout() {
    localStorage.removeItem('token');
    window.location.href = '/';
}

// Funções auxiliares
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
}

// Fechar modal clicando fora dele
window.onclick = function(event) {
    const modal = document.getElementById('downloadModal');
    if (event.target === modal) {
        closeModal();
    }
};