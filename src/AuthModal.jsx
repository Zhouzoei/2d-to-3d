import React, { useState } from 'react';
import { useUser } from './UserContext';
import './AuthModal.css';

const AuthModal = ({ isOpen, onClose }) => {
    const [activeTab, setActiveTab] = useState('login');
    const [loginEmail, setLoginEmail] = useState('');
    const [loginPassword, setLoginPassword] = useState('');
    const [regName, setRegName] = useState('');
    const [regEmail, setRegEmail] = useState('');
    const [regPassword, setRegPassword] = useState('');
    const [toast, setToast] = useState({ show: false, message: '', isError: false });
    
    const { register, login, logout, currentUser, getUserStats } = useUser();

    const showToast = (message, isError = false) => {
        setToast({ show: true, message, isError });
        setTimeout(() => {
            setToast({ show: false, message: '', isError: false });
        }, 2000);
    };

    const handleLogin = () => {
        if (!loginEmail || !loginPassword) {
            showToast('请填写邮箱和密码', true);
            return;
        }
        const result = login(loginEmail, loginPassword);
        if (result.success) {
            showToast(result.message);
            onClose();
            resetForm();
        } else {
            showToast(result.message, true);
        }
    };

    const handleRegister = () => {
        if (!regName || !regEmail || !regPassword) {
            showToast('请填写完整信息', true);
            return;
        }
        if (regPassword.length < 6) {
            showToast('密码至少需要6位', true);
            return;
        }
        const result = register(regName, regEmail, regPassword);
        if (result.success) {
            showToast(result.message);
            onClose();
            resetForm();
        } else {
            showToast(result.message, true);
        }
    };

    const resetForm = () => {
        setLoginEmail('');
        setLoginPassword('');
        setRegName('');
        setRegEmail('');
        setRegPassword('');
        setActiveTab('login');
    };

    const handleClose = () => {
        resetForm();
        onClose();
    };

    if (!isOpen) return null;

    // 已登录状态显示用户面板
    if (currentUser) {
        const stats = getUserStats();
        const firstChar = currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U';
        
        return (
            <div className="auth-modal-overlay" onClick={handleClose}>
                <div className="auth-modal" onClick={(e) => e.stopPropagation()}>
                    <div className="auth-modal-header">
                        <h2>我的账户</h2>
                        <button className="auth-modal-close" onClick={handleClose}>✕</button>
                    </div>
                    <div className="user-panel">
                        <div className="user-info">
                            <div className="user-avatar-large">{firstChar}</div>
                            <div className="user-name-large">{currentUser.name || currentUser.email.split('@')[0]}</div>
                            <div className="user-email">{currentUser.email}</div>
                        </div>
                        <div className="user-stats">
                            <div className="stat-item">
                                <div className="stat-number">{stats.genCount}</div>
                                <div className="stat-label">生成次数</div>
                            </div>
                            <div className="stat-item">
                                <div className="stat-number">{stats.favCount}</div>
                                <div className="stat-label">收藏作品</div>
                            </div>
                        </div>
                        <button className="logout-btn" onClick={() => {
                            logout();
                            handleClose();
                            window.location.reload();
                        }}>退出登录</button>
                    </div>
                    {toast.show && (
                        <div className={`toast-message ${toast.isError ? 'error' : ''}`}>
                            {toast.message}
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="auth-modal-overlay" onClick={handleClose}>
            <div className="auth-modal" onClick={(e) => e.stopPropagation()}>
                <div className="auth-modal-header">
                    <h2>{activeTab === 'login' ? '欢迎回来' : '创建账户'}</h2>
                    <button className="auth-modal-close" onClick={handleClose}>✕</button>
                </div>
                
                <div className="auth-tabs">
                    <div 
                        className={`auth-tab ${activeTab === 'login' ? 'active' : ''}`}
                        onClick={() => setActiveTab('login')}
                    >
                        登录
                    </div>
                    <div 
                        className={`auth-tab ${activeTab === 'register' ? 'active' : ''}`}
                        onClick={() => setActiveTab('register')}
                    >
                        注册
                    </div>
                </div>

                {activeTab === 'login' ? (
                    <div className="auth-form">
                        <div className="form-group">
                            <label>邮箱</label>
                            <input 
                                type="email" 
                                placeholder="your@email.com"
                                value={loginEmail}
                                onChange={(e) => setLoginEmail(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
                            />
                        </div>
                        <div className="form-group">
                            <label>密码</label>
                            <input 
                                type="password" 
                                placeholder="请输入密码"
                                value={loginPassword}
                                onChange={(e) => setLoginPassword(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
                            />
                        </div>
                        <button className="auth-btn" onClick={handleLogin}>登录</button>
                    </div>
                ) : (
                    <div className="auth-form">
                        <div className="form-group">
                            <label>用户名</label>
                            <input 
                                type="text" 
                                placeholder="用户名"
                                value={regName}
                                onChange={(e) => setRegName(e.target.value)}
                            />
                        </div>
                        <div className="form-group">
                            <label>邮箱</label>
                            <input 
                                type="email" 
                                placeholder="your@email.com"
                                value={regEmail}
                                onChange={(e) => setRegEmail(e.target.value)}
                            />
                        </div>
                        <div className="form-group">
                            <label>密码</label>
                            <input 
                                type="password" 
                                placeholder="至少6位"
                                value={regPassword}
                                onChange={(e) => setRegPassword(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && handleRegister()}
                            />
                        </div>
                        <button className="auth-btn" onClick={handleRegister}>注册</button>
                    </div>
                )}

                {toast.show && (
                    <div className={`toast-message ${toast.isError ? 'error' : ''}`}>
                        {toast.message}
                    </div>
                )}
            </div>
        </div>
    );
};

export default AuthModal;