// ChatGPT Invite Portal - Frontend JavaScript
class InvitePortal {
    constructor() {
        this.init();
    }

    init() {
        this.bindEvents();
        this.checkSystemStatus();
        this.loadConfiguration();
    }

    bindEvents() {
        // Form submission
        const form = document.getElementById('inviteForm');
        form.addEventListener('submit', (e) => this.handleSubmit(e));

        // Clear form button
        const clearBtn = document.getElementById('clearBtn');
        clearBtn.addEventListener('click', () => this.clearForm());

        // Real-time email validation
        const emailsTextarea = document.getElementById('emails');
        emailsTextarea.addEventListener('input', () => this.validateEmails());

        // Auto-resize textarea
        emailsTextarea.addEventListener('input', () => this.autoResizeTextarea(emailsTextarea));
    }

    async checkSystemStatus() {
        try {
            const response = await fetch('/health');
            const data = await response.json();
            
            this.updateConnectionStatus(response.ok);
            this.updateTokenStatus(data.token_configured);
        } catch (error) {
            console.error('Health check failed:', error);
            this.updateConnectionStatus(false);
            this.updateTokenStatus(false);
        }
    }

    async loadConfiguration() {
        try {
            const response = await fetch('/api/config');
            const config = await response.json();
            
            this.populateRoleOptions(config.available_roles);
        } catch (error) {
            console.error('Failed to load configuration:', error);
            this.showToast('配置加载失败', 'error');
        }
    }

    updateConnectionStatus(connected) {
        const statusElement = document.getElementById('connectionStatus');
        statusElement.textContent = connected ? '已连接' : '连接失败';
        statusElement.className = `status-value ${connected ? 'connected' : 'disconnected'}`;
    }

    updateTokenStatus(configured) {
        const statusElement = document.getElementById('tokenStatus');
        statusElement.textContent = configured ? '已配置' : '未配置';
        statusElement.className = `status-value ${configured ? 'configured' : 'not-configured'}`;
        
        if (!configured) {
            this.showToast('警告：Bearer Token 未配置，邀请功能将无法使用', 'error');
        }
    }

    populateRoleOptions(roles) {
        const roleSelect = document.getElementById('role');
        roleSelect.innerHTML = '';
        
        const roleMap = {
            'standard-user': '标准用户',
            'admin': '管理员',
            'viewer': '查看者'
        };

        roles.forEach(role => {
            const option = document.createElement('option');
            option.value = role;
            option.textContent = roleMap[role] || role;
            if (role === 'standard-user') {
                option.selected = true;
            }
            roleSelect.appendChild(option);
        });
    }

    validateEmails() {
        const emailsTextarea = document.getElementById('emails');
        const emails = this.parseEmails(emailsTextarea.value);
        
        // Visual feedback for email validation
        const validEmails = emails.filter(email => this.isValidEmail(email));
        const invalidEmails = emails.filter(email => !this.isValidEmail(email) && email.trim() !== '');
        
        // Update textarea border color based on validation
        if (invalidEmails.length > 0) {
            emailsTextarea.style.borderColor = '#e74c3c';
        } else if (validEmails.length > 0) {
            emailsTextarea.style.borderColor = '#27ae60';
        } else {
            emailsTextarea.style.borderColor = '#e1e8ed';
        }
    }

    parseEmails(emailString) {
        return emailString
            .split(/[,\n\r]+/)
            .map(email => email.trim())
            .filter(email => email.length > 0);
    }

    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    autoResizeTextarea(textarea) {
        textarea.style.height = 'auto';
        textarea.style.height = Math.max(120, textarea.scrollHeight) + 'px';
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
            const response = await fetch('/api/invite', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData)
            });

            const result = await response.json();
            
            if (response.ok && result.success) {
                this.showResults(result, 'success');
                this.showToast('邀请发送成功！', 'success');
                this.clearForm();
            } else {
                this.showResults(result, 'error');
                this.showToast(result.error || '邀请发送失败', 'error');
            }
        } catch (error) {
            console.error('Request failed:', error);
            this.showToast('网络请求失败，请检查连接', 'error');
            this.showResults({ error: error.message }, 'error');
        } finally {
            this.showLoading(false);
            this.setSubmitButtonState(false);
        }
    }

    getFormData() {
        const emailsValue = document.getElementById('emails').value;
        const role = document.getElementById('role').value;
        const resend = document.getElementById('resend').checked;

        return {
            emails: this.parseEmails(emailsValue),
            role: role,
            resend: resend
        };
    }

    validateFormData(formData) {
        // Check if emails are provided
        if (!formData.emails || formData.emails.length === 0) {
            this.showToast('请输入至少一个邮箱地址', 'error');
            document.getElementById('emails').focus();
            return false;
        }

        // Validate email formats
        const invalidEmails = formData.emails.filter(email => !this.isValidEmail(email));
        if (invalidEmails.length > 0) {
            this.showToast(`以下邮箱格式不正确：${invalidEmails.join(', ')}`, 'error');
            document.getElementById('emails').focus();
            return false;
        }

        // Check for duplicate emails
        const uniqueEmails = [...new Set(formData.emails)];
        if (uniqueEmails.length !== formData.emails.length) {
            this.showToast('检测到重复的邮箱地址，已自动去重', 'info');
            formData.emails = uniqueEmails;
        }

        return true;
    }

    showResults(result, type) {
        const resultsSection = document.getElementById('resultsSection');
        const resultsContent = document.getElementById('resultsContent');
        
        resultsContent.className = `results-content result-${type}`;
        
        let html = '';
        
        if (type === 'success') {
            html = `
                <div class="result-item">
                    <strong>✅ 邀请发送成功</strong>
                    <p>状态码: ${result.status_code}</p>
                    <p>已发送邀请给 ${result.data?.email_addresses?.length || 0} 个邮箱地址</p>
                </div>
            `;
            
            if (result.data && typeof result.data === 'object') {
                html += `
                    <div class="result-item">
                        <strong>API 响应详情:</strong>
                        <pre style="background: #f8f9fa; padding: 10px; border-radius: 4px; margin-top: 8px; overflow-x: auto; font-size: 0.9rem;">${JSON.stringify(result.data, null, 2)}</pre>
                    </div>
                `;
            }
        } else {
            html = `
                <div class="result-item">
                    <strong>❌ 邀请发送失败</strong>
                    <p>错误信息: ${result.error || '未知错误'}</p>
                    ${result.status_code ? `<p>状态码: ${result.status_code}</p>` : ''}
                </div>
            `;
            
            if (result.data) {
                html += `
                    <div class="result-item">
                        <strong>错误详情:</strong>
                        <pre style="background: #f8f9fa; padding: 10px; border-radius: 4px; margin-top: 8px; overflow-x: auto; font-size: 0.9rem;">${JSON.stringify(result.data, null, 2)}</pre>
                    </div>
                `;
            }
        }
        
        resultsContent.innerHTML = html;
        resultsSection.style.display = 'block';
        
        // Scroll to results
        resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    showLoading(show) {
        const loadingOverlay = document.getElementById('loadingOverlay');
        loadingOverlay.style.display = show ? 'flex' : 'none';
    }

    setSubmitButtonState(disabled) {
        const submitBtn = document.getElementById('submitBtn');
        submitBtn.disabled = disabled;
        
        if (disabled) {
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 发送中...';
        } else {
            submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> 发送邀请';
        }
    }

    clearForm() {
        document.getElementById('inviteForm').reset();
        document.getElementById('emails').style.borderColor = '#e1e8ed';
        document.getElementById('emails').style.height = '120px';
        document.getElementById('resultsSection').style.display = 'none';
        this.showToast('表单已清空', 'info');
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

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new InvitePortal();
});

// Add some utility functions for better UX
document.addEventListener('keydown', (e) => {
    // Ctrl+Enter to submit form
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        const form = document.getElementById('inviteForm');
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

// Add paste event handler for better email input experience
document.getElementById('emails')?.addEventListener('paste', (e) => {
    setTimeout(() => {
        const textarea = e.target;
        // Auto-format pasted content
        let content = textarea.value;
        
        // Replace various separators with commas
        content = content.replace(/[;\s\n\r\t]+/g, ', ');
        
        // Remove duplicate commas
        content = content.replace(/,+/g, ',');
        
        // Clean up leading/trailing commas
        content = content.replace(/^,+|,+$/g, '');
        
        textarea.value = content;
        
        // Trigger validation
        textarea.dispatchEvent(new Event('input'));
    }, 10);
});