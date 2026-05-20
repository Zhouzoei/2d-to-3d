import React, { useState, useRef } from 'react';
import { useUser } from './UserContext';
import './AuthModal.css';

const STYLE_LABELS = {
    'anime': '日系动漫',
    'fantasy': '奇幻史诗',
    'sci-fi': '科幻机械',
    'cute': '可爱萌系',
    'realistic': '写实厚涂',
    'custom': '自定义',
};

const AuthModal = ({ isOpen, onClose, setShowWelcome, setShowOnboarding }) => {
    const [activeTab, setActiveTab] = useState('login');
    const [loginEmail, setLoginEmail] = useState('');
    const [loginPassword, setLoginPassword] = useState('');
    const [regName, setRegName] = useState('');
    const [regEmail, setRegEmail] = useState('');
    const [regPassword, setRegPassword] = useState('');
    const [toast, setToast] = useState({ show: false, message: '', isError: false });
    const [isEditing, setIsEditing] = useState(false);
    const [editName, setEditName] = useState('');
    const [editAvatar, setEditAvatar] = useState(null);
    const [showPasswordChange, setShowPasswordChange] = useState(false);
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const fileInputRef = useRef(null);

    const { register, login, logout, currentUser, getUserStats, updateProfile, changePassword } = useUser();

    const showToast = (message, isError = false) => {
        setToast({ show: true, message, isError });
        setTimeout(() => {
            setToast({ show: false, message: '', isError: false });
        }, 2500);
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
        setIsEditing(false);
        setEditName('');
        setEditAvatar(null);
        setShowPasswordChange(false);
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
        onClose();
    };

    const handleStartEdit = () => {
        setEditName(currentUser?.name || '');
        setEditAvatar(null);
        setShowPasswordChange(false);
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setIsEditing(true);
    };

    const handleCancelEdit = () => {
        setIsEditing(false);
        setEditName('');
        setEditAvatar(null);
        setShowPasswordChange(false);
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
    };

    const handleSaveProfile = () => {
        if (!editName.trim()) {
            showToast('昵称不能为空', true);
            return;
        }
        const result = updateProfile(editName.trim(), editAvatar || undefined);
        if (result.success) {
            showToast(result.message);
            setIsEditing(false);
            setEditAvatar(null);
        } else {
            showToast(result.message, true);
        }
    };

    const handleChangePassword = () => {
        if (!oldPassword) {
            showToast('请输入当前密码', true);
            return;
        }
        if (!newPassword) {
            showToast('请输入新密码', true);
            return;
        }
        if (newPassword.length < 6) {
            showToast('新密码至少需要6位', true);
            return;
        }
        if (newPassword !== confirmPassword) {
            showToast('两次输入的新密码不一致', true);
            return;
        }
        const result = changePassword(oldPassword, newPassword);
        if (result.success) {
            showToast(result.message);
            setShowPasswordChange(false);
            setOldPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } else {
            showToast(result.message, true);
        }
    };

    const handleAvatarSelect = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (file.size > 2 * 1024 * 1024) {
            showToast('头像图片不能超过 2MB', true);
            return;
        }
        const reader = new FileReader();
        reader.onload = (ev) => {
            setEditAvatar(ev.target.result);
        };
        reader.readAsDataURL(file);
    };

    const relativeTime = (dateStr) => {
        if (!dateStr) return '';
        const now = new Date();
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return dateStr;
        const diffMs = now - date;
        const diffMin = Math.floor(diffMs / 60000);
        if (diffMin < 1) return '刚刚';
        if (diffMin < 60) return `${diffMin}分钟前`;
        const diffHour = Math.floor(diffMin / 60);
        if (diffHour < 24) return `${diffHour}小时前`;
        const diffDay = Math.floor(diffHour / 24);
        if (diffDay < 7) return `${diffDay}天前`;
        return dateStr;
    };

    if (!isOpen) return null;

    // --- 已登录：用户面板 ---
    if (currentUser) {
        const stats = getUserStats();
        const hasAvatar = stats.avatar || editAvatar;
        const avatarUrl = editAvatar || stats.avatar;
        const firstChar = currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U';

        return (
            <div className="auth-modal-overlay" onClick={handleClose}>
                <div className="auth-modal" onClick={(e) => e.stopPropagation()}>
                    <div className="auth-modal-header">
                        <h2>{isEditing ? '编辑资料' : '我的账户'}</h2>
                        <button className="auth-modal-close" onClick={handleClose}>✕</button>
                    </div>

                    {isEditing ? (
                        <div className="user-panel">
                            <div className="user-info">
                                <div className="user-avatar-large edit-avatar" onClick={() => fileInputRef.current?.click()}>
                                    {hasAvatar ? (
                                        <img src={avatarUrl} alt="avatar" className="avatar-img" />
                                    ) : (
                                        firstChar
                                    )}
                                    <div className="avatar-edit-overlay">
                                        <span>更换</span>
                                    </div>
                                </div>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/png,image/jpeg,image/webp"
                                    style={{ display: 'none' }}
                                    onChange={handleAvatarSelect}
                                />
                                <div className="form-group" style={{ marginTop: '12px' }}>
                                    <label>昵称</label>
                                    <input
                                        type="text"
                                        value={editName}
                                        onChange={(e) => setEditName(e.target.value)}
                                        placeholder="输入昵称"
                                        onKeyPress={(e) => e.key === 'Enter' && handleSaveProfile()}
                                    />
                                </div>
                            </div>
                            <button
                                className="password-toggle-btn"
                                onClick={() => {
                                    setShowPasswordChange(!showPasswordChange);
                                    setOldPassword('');
                                    setNewPassword('');
                                    setConfirmPassword('');
                                }}
                            >
                                {showPasswordChange ? '取消修改密码' : '修改密码'}
                            </button>
                            {showPasswordChange && (
                                <div className="password-change-form">
                                    <div className="form-group">
                                        <label>当前密码</label>
                                        <input
                                            type="password"
                                            placeholder="输入当前密码"
                                            value={oldPassword}
                                            onChange={(e) => setOldPassword(e.target.value)}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>新密码</label>
                                        <input
                                            type="password"
                                            placeholder="至少6位"
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>确认新密码</label>
                                        <input
                                            type="password"
                                            placeholder="再次输入新密码"
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            onKeyPress={(e) => e.key === 'Enter' && handleChangePassword()}
                                        />
                                    </div>
                                    <button className="password-save-btn" onClick={handleChangePassword}>确认修改</button>
                                </div>
                            )}
                            <div className="edit-actions-row">
                                <button className="edit-cancel-btn" onClick={handleCancelEdit}>取消</button>
                                <button className="edit-save-btn" onClick={handleSaveProfile}>保存</button>
                            </div>
                        </div>
                    ) : (
                        <div className="user-panel">
                            <div className="user-info">
                                <div className="user-avatar-large">
                                    {stats.avatar ? (
                                        <img src={stats.avatar} alt="avatar" className="avatar-img" />
                                    ) : (
                                        firstChar
                                    )}
                                </div>
                                <div className="user-name-large">{currentUser.name || currentUser.email.split('@')[0]}</div>
                                <div className="user-email">{currentUser.email}</div>
                            </div>

                            <div className="user-stats-row">
                                <div className="stat-item">
                                    <div className="stat-number">{stats.genCount}</div>
                                    <div className="stat-label">生成</div>
                                </div>
                                <div className="stat-item">
                                    <div className="stat-number">{stats.favCount}</div>
                                    <div className="stat-label">收藏</div>
                                </div>
                                <div className="stat-item">
                                    <div className="stat-number streak-number">🔥 {stats.streak}</div>
                                    <div className="stat-label">连续天数</div>
                                </div>
                            </div>

                            {stats.styleDistribution.length > 0 && (
                                <div className="user-section">
                                    <div className="section-title">常用风格</div>
                                    <div className="style-distribution">
                                        {stats.styleDistribution.map(([style, count]) => {
                                            const maxCount = stats.styleDistribution[0][1];
                                            const pct = Math.round((count / maxCount) * 100);
                                            const label = STYLE_LABELS[style] || style;
                                            return (
                                                <div key={style} className="style-bar-row">
                                                    <span className="style-bar-label">{label}</span>
                                                    <div className="style-bar-track">
                                                        <div
                                                            className="style-bar-fill"
                                                            style={{ width: `${pct}%` }}
                                                        />
                                                    </div>
                                                    <span className="style-bar-count">{count}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {stats.recentActivity.length > 0 && (
                                <div className="user-section">
                                    <div className="section-title">最近动态</div>
                                    <div className="activity-timeline">
                                        {stats.recentActivity.map((item) => (
                                            <div key={item.batchId} className="activity-item">
                                                <div className="activity-thumb">
                                                    {item.thumbnail ? (
                                                        <img src={item.thumbnail} alt="" />
                                                    ) : (
                                                        <span className="activity-thumb-placeholder">🎨</span>
                                                    )}
                                                </div>
                                                <div className="activity-info">
                                                    <div className="activity-prompt">{item.prompt}</div>
                                                    <div className="activity-meta">
                                                        <span>{relativeTime(item.createdAt)}</span>
                                                        {item.has3D && <span className="activity-badge-3d">3D</span>}
                                                        {item.isFavorite && <span className="activity-badge-fav">⭐</span>}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="user-actions">
                                <button className="edit-profile-btn" onClick={handleStartEdit}>编辑资料</button>
                                <button className="logout-btn" onClick={() => {
                                    logout();
                                    handleClose();
                                    window.location.reload();
                                }}>退出登录</button>
                            </div>
                            <button className="restart-guide-btn" onClick={() => {
                                localStorage.removeItem('hasSeenWelcome');
                                localStorage.removeItem('hasSeenOnboarding');
                                handleClose();
                                setShowWelcome(true);
                                setTimeout(() => setShowOnboarding(true), 100);
                            }}>重新开始指引</button>
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
    }

    // --- 未登录：登录/注册 ---
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
