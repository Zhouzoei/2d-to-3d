import React, { useState, useRef, useEffect } from 'react';
import { useUser } from './UserContext';
import { supabase } from './lib/supabase';
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
    
    const [registerStep, setRegisterStep] = useState(1);
    const [regEmail, setRegEmail] = useState('');
    const [verifyCode, setVerifyCode] = useState('');
    const [regName, setRegName] = useState('');
    const [regPassword, setRegPassword] = useState('');
    const [countdown, setCountdown] = useState(0);
    const [sendingCode, setSendingCode] = useState(false);
    const [verifyingCode, setVerifyingCode] = useState(false);
    
    const [toast, setToast] = useState({ show: false, message: '', isError: false });
    const [pendingFlow, setPendingFlow] = useState(null); // 'register' | 'reset' | null
    const [showForgotPassword, setShowForgotPassword] = useState(false);
    const [resetStep, setResetStep] = useState(1);
    const [resetEmail, setResetEmail] = useState('');
    const [resetCode, setResetCode] = useState('');
    const [resetNewPw, setResetNewPw] = useState('');
    const [resetConfirmPw, setResetConfirmPw] = useState('');
    const [resetCountdown, setResetCountdown] = useState(0);
    const [sendingResetCode, setSendingResetCode] = useState(false);
    const [verifyingResetCode, setVerifyingResetCode] = useState(false);
    const [savingResetPw, setSavingResetPw] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editName, setEditName] = useState('');
    const [editAvatar, setEditAvatar] = useState(null);
    const [showPasswordChange, setShowPasswordChange] = useState(false);
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const fileInputRef = useRef(null);

    const { login, logout, currentUser, getUserStats, updateProfile, changePassword } = useUser();

    useEffect(() => {
        let timer;
        if (countdown > 0) {
            timer = setTimeout(() => setCountdown(countdown - 1), 1000);
        }
        return () => clearTimeout(timer);
    }, [countdown]);

    useEffect(() => {
        let timer;
        if (resetCountdown > 0) {
            timer = setTimeout(() => setResetCountdown(resetCountdown - 1), 1000);
        }
        return () => clearTimeout(timer);
    }, [resetCountdown]);

    const showToast = (message, isError = false) => {
        setToast({ show: true, message, isError });
        setTimeout(() => {
            setToast({ show: false, message: '', isError: false });
        }, 3000);
    };

    const handleLogin = async () => {
        if (!loginEmail || !loginPassword) {
            showToast('请填写邮箱和密码', true);
            return;
        }
        const result = await login(loginEmail, loginPassword);
        showToast(result.message, !result.success);
        if (result.success) {
            setTimeout(() => onClose(), 800);
        }
    };

    // 重置密码 Step 1：发送验证码
    const handleSendResetCode = async () => {
        if (!resetEmail) {
            showToast('请输入邮箱', true);
            return;
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(resetEmail)) {
            showToast('请输入有效的邮箱地址', true);
            return;
        }
        setSendingResetCode(true);
        setPendingFlow('reset');
        try {
            const { error } = await supabase.auth.signInWithOtp({
                email: resetEmail,
                options: { shouldCreateUser: false }
            });
            if (error) {
                if (error.message.includes('rate limit')) {
                    showToast('发送太频繁，请等待1分钟后再试', true);
                } else if (error.message.includes('not found') || error.message.includes('User')) {
                    showToast('该邮箱未注册', true);
                } else {
                    showToast(error.message, true);
                }
                setSendingResetCode(false);
                setPendingFlow(null);
                return;
            }
            showToast('验证码已发送到您的邮箱');
            setResetStep(2);
            setResetCountdown(60);
        } catch (error) {
            showToast('发送失败，请稍后重试', true);
            setPendingFlow(null);
        }
        setSendingResetCode(false);
    };

    // 重置密码 Step 2：验证码
    const handleVerifyResetCode = async () => {
        if (!resetCode) {
            showToast('请输入验证码', true);
            return;
        }
        setVerifyingResetCode(true);
        try {
            const { error } = await supabase.auth.verifyOtp({
                email: resetEmail,
                token: resetCode,
                type: 'email'
            });
            if (error) {
                showToast('验证码错误或已过期', true);
                setVerifyingResetCode(false);
                return;
            }
            showToast('验证成功！请设置新密码');
            setResetStep(3);
        } catch (error) {
            showToast('验证失败，请重试', true);
        }
        setVerifyingResetCode(false);
    };

    // 重置密码 Step 3：设置新密码
    const handleSaveResetPw = async () => {
        if (!resetNewPw || !resetConfirmPw) {
            showToast('请填写密码', true);
            return;
        }
        if (resetNewPw.length < 6) {
            showToast('密码至少需要 6 位', true);
            return;
        }
        if (resetNewPw !== resetConfirmPw) {
            showToast('两次输入的密码不一致', true);
            return;
        }
        setSavingResetPw(true);
        try {
            const { error } = await supabase.auth.updateUser({ password: resetNewPw });
            if (error) {
                showToast(error.message, true);
                setSavingResetPw(false);
                return;
            }
            showToast('密码已重置，请重新登录');
            // 验证码登录后，登出让用户用新密码登录
            await supabase.auth.signOut();
            setShowForgotPassword(false);
            setResetStep(1);
            setResetEmail('');
            setResetCode('');
            setResetNewPw('');
            setResetConfirmPw('');
            setPendingFlow(null);
        } catch (error) {
            showToast('重置失败，请稍后重试', true);
        }
        setSavingResetPw(false);
    };

    const handleSendCode = async () => {
        if (!regEmail) {
            showToast('请输入邮箱', true);
            return;
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(regEmail)) {
            showToast('请输入有效的邮箱地址', true);
            return;
        }

        setSendingCode(true);
        setPendingFlow('register');
        try {
            const { error } = await supabase.auth.signInWithOtp({
                email: regEmail,
                options: {
                    shouldCreateUser: true,
                    emailRedirectTo: window.location.origin
                }
            });

            if (error) {
                if (error.message.includes('rate limit')) {
                    showToast('发送太频繁，请等待1分钟后再试', true);
                } else if (error.message.includes('already')) {
                    showToast('该邮箱已注册，请直接登录', true);
                } else {
                    showToast(error.message, true);
                }
                setSendingCode(false);
                setPendingFlow(null);
                return;
            }

            showToast('验证码已发送到您的邮箱');
            setRegisterStep(2);
            setCountdown(60);
        } catch (error) {
            showToast('发送失败，请稍后重试', true);
            setPendingFlow(null);
        }
        setSendingCode(false);
    };

    const handleVerifyCode = async () => {
        if (!verifyCode) {
            showToast('请输入验证码', true);
            return;
        }

        setVerifyingCode(true);
        try {
            const { error } = await supabase.auth.verifyOtp({
                email: regEmail,
                token: verifyCode,
                type: 'magiclink'
            });

            if (error) {
                showToast('验证码错误或已过期', true);
                setVerifyingCode(false);
                return;
            }

            showToast('验证成功！请设置您的账户信息');
            setRegisterStep(3);
        } catch (error) {
            showToast('验证失败，请重试', true);
        }
        setVerifyingCode(false);
    };

    const handleCompleteRegister = async () => {
        if (!regName) {
            showToast('请输入用户名', true);
            return;
        }
        if (!regPassword) {
            showToast('请设置密码', true);
            return;
        }
        if (regPassword.length < 6) {
            showToast('密码至少需要6位', true);
            return;
        }

        try {
            const { error: updateError } = await supabase.auth.updateUser({
                password: regPassword,
                data: { name: regName }
            });

            if (updateError) {
                showToast(updateError.message, true);
                setPendingFlow(null);
                return;
            }

            showToast(`注册成功，欢迎 ${regName}！`);
            resetForm();
            onClose();
        } catch (error) {
            showToast('注册失败，请稍后重试', true);
            setPendingFlow(null);
        }
    };

    const resetForm = () => {
        setLoginEmail('');
        setLoginPassword('');
        setRegEmail('');
        setVerifyCode('');
        setRegName('');
        setRegPassword('');
        setRegisterStep(1);
        setCountdown(0);
        setActiveTab('login');
        setPendingFlow(null);
        setShowForgotPassword(false);
        setResetStep(1);
        setResetEmail('');
        setResetCode('');
        setResetNewPw('');
        setResetConfirmPw('');
        setResetCountdown(0);
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

    const handleSaveProfile = async () => {
        if (!editName.trim()) {
            showToast('昵称不能为空', true);
            return;
        }
        const result = await updateProfile(editName.trim(), editAvatar || undefined);
        if (result.success) {
            showToast(result.message);
            setIsEditing(false);
            setEditAvatar(null);
        } else {
            showToast(result.message, true);
        }
    };

    const handleChangePassword = async () => {
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
        const result = await changePassword(oldPassword, newPassword);
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

    if (currentUser && !pendingFlow) {
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
                                                    <div className="activity-prompt">{item.positivePrompt || item.prompt}</div>
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
                                <button className="logout-btn" onClick={async () => {
                                    await logout();
                                    handleClose();
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
                        onClick={() => { setActiveTab('login'); setRegisterStep(1); }}
                    >
                        登录
                    </div>
                    <div
                        className={`auth-tab ${activeTab === 'register' ? 'active' : ''}`}
                        onClick={() => { setActiveTab('register'); setRegisterStep(1); }}
                    >
                        注册
                    </div>
                </div>

                {activeTab === 'login' && !showForgotPassword ? (
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
                        <div className="forgot-password-row">
                            <button
                                className="forgot-password-link"
                                onClick={() => { setShowForgotPassword(true); setResetEmail(loginEmail); }}
                                type="button"
                            >忘记密码？</button>
                        </div>
                        <button className="auth-btn" onClick={handleLogin}>登录</button>
                    </div>
                ) : activeTab === 'login' && showForgotPassword ? (
                    <div className="auth-form">
                        {resetStep === 1 && (
                            <>
                                <div className="form-group">
                                    <label>重置密码</label>
                                    <div className="forgot-desc">输入注册邮箱，我们将发送验证码</div>
                                    <input
                                        type="email"
                                        placeholder="your@email.com"
                                        value={resetEmail}
                                        onChange={(e) => setResetEmail(e.target.value)}
                                        onKeyPress={(e) => e.key === 'Enter' && !sendingResetCode && handleSendResetCode()}
                                    />
                                </div>
                                <button className="auth-btn" onClick={handleSendResetCode} disabled={sendingResetCode}>
                                    {sendingResetCode ? '发送中...' : '发送验证码'}
                                </button>
                            </>
                        )}
                        {resetStep === 2 && (
                            <>
                                <div className="form-group">
                                    <label>验证码已发送至 {resetEmail}</label>
                                    <div className="forgot-desc">请在下方输入您收到的验证码</div>
                                    <input
                                        type="text"
                                        placeholder="请输入验证码"
                                        value={resetCode}
                                        onChange={(e) => setResetCode(e.target.value)}
                                        maxLength={10}
                                        onKeyPress={(e) => e.key === 'Enter' && !verifyingResetCode && handleVerifyResetCode()}
                                    />
                                    {resetCountdown > 0 && <div className="forgot-desc" style={{ marginTop: 6 }}>{resetCountdown}秒后可重新发送</div>}
                                </div>
                                <button className="auth-btn" onClick={handleVerifyResetCode} disabled={verifyingResetCode}>
                                    {verifyingResetCode ? '验证中...' : '验证'}
                                </button>
                            </>
                        )}
                        {resetStep === 3 && (
                            <>
                                <div className="form-group">
                                    <label>设置新密码</label>
                                    <div className="forgot-desc">请为您的账户设置一个新密码</div>
                                    <input
                                        type="password"
                                        placeholder="新密码（至少6位）"
                                        value={resetNewPw}
                                        onChange={(e) => setResetNewPw(e.target.value)}
                                    />
                                </div>
                                <div className="form-group">
                                    <input
                                        type="password"
                                        placeholder="确认新密码"
                                        value={resetConfirmPw}
                                        onChange={(e) => setResetConfirmPw(e.target.value)}
                                        onKeyPress={(e) => e.key === 'Enter' && !savingResetPw && handleSaveResetPw()}
                                    />
                                </div>
                                <button className="auth-btn" onClick={handleSaveResetPw} disabled={savingResetPw}>
                                    {savingResetPw ? '保存中...' : '重置密码'}
                                </button>
                            </>
                        )}
                        <button
                            className="forgot-back-btn"
                            onClick={() => { setShowForgotPassword(false); setResetStep(1); setPendingFlow(null); }}
                        >← 返回登录</button>
                    </div>
                ) : (
                    <div className="auth-form">
                        {registerStep === 1 && (
                            <>
                                <div className="form-group">
                                    <label>邮箱</label>
                                    <input
                                        type="email"
                                        placeholder="your@email.com"
                                        value={regEmail}
                                        onChange={(e) => setRegEmail(e.target.value)}
                                    />
                                </div>
                                <button 
                                    className="auth-btn" 
                                    onClick={handleSendCode}
                                    disabled={sendingCode}
                                >
                                    {sendingCode ? '发送中...' : '发送验证码'}
                                </button>
                            </>
                        )}

                        {registerStep === 2 && (
                            <>
                                <div className="form-group">
                                    <label>验证码已发送至 {regEmail}</label>
                                    <input
                                        type="text"
                                        placeholder="请输入验证码"
                                        value={verifyCode}
                                        onChange={(e) => setVerifyCode(e.target.value)}
                                        maxLength={10}
                                    />
                                </div>
                                <button 
                                    className="auth-btn" 
                                    onClick={handleVerifyCode}
                                    disabled={verifyingCode}
                                >
                                    {verifyingCode ? '验证中...' : '验证'}
                                </button>
                                <button 
                                    className="resend-btn"
                                    onClick={handleSendCode}
                                    disabled={countdown > 0 || sendingCode}
                                >
                                    {countdown > 0 ? `${countdown}秒后可重新发送` : '重新发送验证码'}
                                </button>
                            </>
                        )}

                        {registerStep === 3 && (
                            <>
                                <div className="form-group">
                                    <label>用户名</label>
                                    <input
                                        type="text"
                                        placeholder="请输入用户名"
                                        value={regName}
                                        onChange={(e) => setRegName(e.target.value)}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>设置密码</label>
                                    <input
                                        type="password"
                                        placeholder="至少6位"
                                        value={regPassword}
                                        onChange={(e) => setRegPassword(e.target.value)}
                                        onKeyPress={(e) => e.key === 'Enter' && handleCompleteRegister()}
                                    />
                                </div>
                                <button className="auth-btn" onClick={handleCompleteRegister}>完成注册</button>
                            </>
                        )}
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
