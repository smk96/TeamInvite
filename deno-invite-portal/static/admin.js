// ChatGPT Invite Portal - Admin Panel JavaScript
class AdminPanel {
    constructor() {
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadCurrentConfig();
    }

    bindEvents() {
        // Form submission
        const form = document.getElementById('configForm');
        form.addEventListener('submit', (e) => this.handleSubmit(e));

        // Show/hide token toggle
        this.addTokenVisibilityToggle();
    }

    addTokenVisibilityToggle() {
        const tokenInput = document.getElementById('bearerToken');
        const inputGroup = tokenInput.parentElement;
        
        // Create toggle button
        const toggleBtn = document.createElement('button');
        toggleBtn.type = 'button';
        toggleBtn.className = 'token-toggle-btn';
        toggleBtn.innerHTML = '<i class="fas fa-eye"></i>';
        toggleBtn.style.cssText = `
            position: absolute;
            right: 12px;
            top: 50%;
            transform: translateY(-50%);
            background: none;
            border: none;
            color: #666;
            cursor: pointer;
            font-size: 1rem;
            padding: 4px;
            border-radius: 4px;
            transition: color 0.3s ease;
        `;
        
        // Style the input group to be relative
        inputGroup.style.position = 'relative';
        tokenInput.style.paddingRight = '45px';
        
        // Add toggle functionality
        toggleBtn.addEventListener('click', () => {
            if (tokenInput.type === 'password') {
                tokenInput.type = 'text';
                toggleBtn.innerHTML = '<i class="fas fa-eye-slash"></i>';
                toggleBtn.style.color = '#667eea';
            } else {
                tokenInput.type = 'password';
                toggleBtn.innerHTML = '<i class="fas fa-eye"></i>';
                toggleBtn.style.color = '#666';
            }
        });
        
        toggleBtn.addEventListener('mouseenter', () => {
            if (tokenInput.type === 'password') {
                toggleBtn.style.color = '#667eea';
            }
        });
        
        toggleBtn.addEventListener('mouseleave', () => {
            if (tokenInput.type === 'password') {
                toggleBtn.style.color = '#666';
            }
        });
        
        inputGroup.appendChild(toggleBtn);
    }

    async loadCurrentConfig() {
        try {
            const response = await fetch('/api/admin/config');
            const config = await response.json();
            
            this.updateConfigDisplay(config);
        } catch (error) {
            console.error('Failed to load configuration:', error);
            this.showToast('配置加载失败', 'error');
        }
    }

    updateConfigDisplay(config) {
        // Update token status
        const tokenStatus = document.getElementById('tokenStatus');
        if (config.token_configured) {
            tokenStatus.textContent = config.token_preview || '已配置';
            tokenStatus.className = 'config-value configured';
        } else {
            tokenStatus.textContent = '未配置';
            tokenStatus.className = 'config-value not-configured';
        }

        // Update account ID
        const accountIdDisplay = document.getElementById('accountIdDisplay');
        accountIdDisplay.textContent = config.account_id || '未设置';
        accountIdDisplay.className = 'config-value';

        // Update environment token status
        const envTokenStatus = document.getElementById('envTokenStatus');
        if (config.env_token_configured) {
            envTokenStatus.textContent = '已在环境变量中配置';
            envTokenStatus.className = 'config-value configured';
        } else {
            envTokenStatus.textContent = '未在环境变量中配置';
            envTokenStatus.className = 'config-value not-configured';
        }

        // Update runtime status
        const runtimeStatus = document.getElementById('runtimeStatus');
        if (config.token_configured && !config.env_token_configured) {
            runtimeStatus.textContent = '使用运行时配置';
            runtimeStatus.className = 'config-value configured';
        } else if (config.env_token_configured) {
            runtimeStatus.textContent = '使用环境变量';
            runtimeStatus.className = 'config-value configured';
        } else {
            runtimeStatus.textContent = '未配置';
            runtimeStatus.className = 'config-value not-configured';
        }

        // Pre-fill form if needed
        if (config.account_id && config.account_id !== config.env_account_id) {
            document.getElementById('accountId').value = config.account_id;
        }
    }

    async handleSubmit(event) {
        event.preventDefault();
        
        const formData = this.getFormData();
        
        // Validate form data
        if (!this.validateFormData(formData)) {
            return;
        }

        this.showLoading(true);
        this.setSubmitButtonState(true);

        try {
            const response = await fetch('/api/admin/config', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData)
            });

            const result = await response.json();
            
            if (response.ok && result.success) {
                this.showToast('配置保存成功！', 'success');
                
                // Reload configuration display
                setTimeout(() => {
                    this.loadCurrentConfig();
                }, 500);
                
                // Clear sensitive form data
                document.getElementById('bearerToken').value = '';
            } else {
                this.showToast(result.error || '配置保存失败', 'error');
            }
        } catch (error) {
            console.error('Request failed:', error);
            this.showToast('网络请求失败，请检查连接', 'error');
        } finally {
            this.showLoading(false);
            this.setSubmitButtonState(false);
        }
    }

    getFormData() {
        const bearerTokenElement = document.getElementById('bearerToken');
        const accountIdElement = document.getElementById('accountId');
        
        const bearerToken = bearerTokenElement ? bearerTokenElement.value.trim() : '';
        const accountId = accountIdElement ? accountIdElement.value.trim() : '';

        const data = {};
        
        if (bearerToken) {
            data.token = bearerToken;
        }
        
        if (accountId) {
            data.account_id = accountId;
        }

        return data;
    }

    validateFormData(formData) {
        // Check if at least one field is provided
        if (!formData.token && !formData.account_id) {
            this.showToast('请至少填写一个配置项', 'error');
            return false;
        }

        // Validate token format if provided
        if (formData.token) {
            // Basic token format validation
            if (formData.token.length < 10) {
                this.showToast('Bearer Token 格式不正确，长度过短', 'error');
                document.getElementById('bearerToken').focus();
                return false;
            }
            
            // Check if it looks like a valid token (basic check)
            if (!formData.token.match(/^[A-Za-z0-9\-_\.]+$/)) {
                this.showToast('Bearer Token 包含无效字符', 'error');
                document.getElementById('bearerToken').focus();
                return false;
            }
        }

        // Validate account ID format if provided
        if (formData.account_id) {
            // Basic UUID format check
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            if (!uuidRegex.test(formData.account_id)) {
                this.showToast('账户 ID 格式不正确，应为 UUID 格式', 'error');
                document.getElementById('accountId').focus();
                return false;
            }
        }

        return true;
    }

    showLoading(show) {
        const loadingOverlay = document.getElementById('loadingOverlay');
        loadingOverlay.style.display = show ? 'flex' : 'none';
    }

    setSubmitButtonState(disabled) {
        const submitBtn = document.getElementById('saveBtn');
        submitBtn.disabled = disabled;
        
        if (disabled) {
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 保存中...';
        } else {
            submitBtn.innerHTML = '<i class="fas fa-save"></i> 保存配置';
        }
    }

    showToast(message, type = 'info') {
        const toast = document.getElementById('toast');
        const toastIcon = toast.querySelector('.toast-icon');
        const toastMessage = toast.querySelector('.toast-message');
        
        // Set icon based on type
        const icons = {
            success: 'fas fa-check-circle',
            error: 'fas fa-exclamation-circle',
            info: 'fas fa-info-circle'
        };
        
        toastIcon.className = `toast-icon ${icons[type]}`;
        toastMessage.textContent = message;
        toast.className = `toast ${type}`;
        
        // Show toast
        toast.classList.add('show');
        
        // Hide toast after 5 seconds
        setTimeout(() => {
            toast.classList.remove('show');
        }, 5000);
    }
}

// Initialize the admin panel when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new AdminPanel();
});

// Add keyboard shortcuts
document.addEventListener('keydown', (e) => {
    // Ctrl+S to save configuration
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        const form = document.getElementById('configForm');
        if (form) {
            form.dispatchEvent(new Event('submit'));
        }
    }
    
    // Escape to close toast
    if (e.key === 'Escape') {
        const toast = document.getElementById('toast');
        if (toast.classList.contains('show')) {
            toast.classList.remove('show');
        }
    }
});

// Add auto-save functionality (optional)
let autoSaveTimeout;
document.addEventListener('input', (e) => {
    if (e.target.matches('#bearerToken, #accountId')) {
        // Clear previous timeout
        clearTimeout(autoSaveTimeout);
        
        // Set new timeout for auto-save indication
        autoSaveTimeout = setTimeout(() => {
            // Could add visual indication that changes are pending
            console.log('Changes pending...');
        }, 1000);
    }
});

// Add paste event handler for token input
document.getElementById('bearerToken')?.addEventListener('paste', (e) => {
    setTimeout(() => {
        const input = e.target;
        let value = input.value.trim();
        
        // Clean up common token prefixes
        if (value.startsWith('Bearer ')) {
            value = value.substring(7);
        }
        
        input.value = value;
    }, 10);
});

// Add copy functionality for account ID
document.getElementById('accountId')?.addEventListener('dblclick', (e) => {
    const input = e.target;
    if (input.value) {
        input.select();
        try {
            document.execCommand('copy');
            // Could show a small tooltip here
        } catch (err) {
            console.log('Copy failed');
        }
    }
});
