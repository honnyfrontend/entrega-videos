document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    const errorMessage = document.getElementById('errorMessage');
    
    // Preencher automaticamente as credenciais de demonstração
    document.getElementById('email').value = 'honnyfrontend@gmail.com';
    document.getElementById('password').value = '123';
    
    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        
        // Mostrar loading no botão
        const submitBtn = loginForm.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Entrando...';
        submitBtn.disabled = true;
        
        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                // Login bem-sucedido
                localStorage.setItem('token', data.token);
                window.location.href = '/dashboard';
            } else {
                // Exibir mensagem de erro
                errorMessage.textContent = data.message || 'Erro ao fazer login. Verifique se o usuário demo foi criado.';
                errorMessage.style.display = 'block';
                
                // Esconder a mensagem de erro após 5 segundos
                setTimeout(() => {
                    errorMessage.style.display = 'none';
                }, 5000);
            }
        } catch (error) {
            errorMessage.textContent = 'Erro de conexão. Verifique se o servidor está rodando.';
            errorMessage.style.display = 'block';
            
            setTimeout(() => {
                errorMessage.style.display = 'none';
            }, 5000);
        } finally {
            // Restaurar botão
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    });
});