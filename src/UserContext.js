import React, { createContext, useState, useContext, useEffect } from 'react';

const UserContext = createContext();

export const useUser = () => useContext(UserContext);

export const UserProvider = ({ children }) => {
    const [currentUser, setCurrentUser] = useState(null);
    const [users, setUsers] = useState([]);
    const [userStats, setUserStats] = useState({});

    // 初始化加载 localStorage 数据
    useEffect(() => {
        const storedUsers = localStorage.getItem('users');
        const storedCurrentUser = localStorage.getItem('currentUser');
        const storedUserStats = localStorage.getItem('userStats');

        if (storedUsers) setUsers(JSON.parse(storedUsers));
        if (storedCurrentUser) setCurrentUser(JSON.parse(storedCurrentUser));
        if (storedUserStats) setUserStats(JSON.parse(storedUserStats));
    }, []);

    // 保存用户列表
    const saveUsers = (newUsers) => {
        setUsers(newUsers);
        localStorage.setItem('users', JSON.stringify(newUsers));
    };

    // 保存当前用户
    const saveCurrentUser = (user) => {
        setCurrentUser(user);
        if (user) {
            localStorage.setItem('currentUser', JSON.stringify(user));
        } else {
            localStorage.removeItem('currentUser');
        }
    };

    // 保存统计数据
    const saveUserStats = (stats) => {
        setUserStats(stats);
        localStorage.setItem('userStats', JSON.stringify(stats));
    };

    // 简单哈希函数（前端 demo 使用，生产环境应使用 bcrypt + HTTPS）
    const hashPassword = (password) => {
        let hash = 0;
        for (let i = 0; i < password.length; i++) {
            const char = password.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return 'h_' + Math.abs(hash).toString(36);
    };

    // 注册
    const register = (name, email, password) => {
        if (users.find(u => u.email === email)) {
            return { success: false, message: '该邮箱已注册' };
        }
        
        if (password.length < 6) {
            return { success: false, message: '密码至少需要6位' };
        }

        const newUser = { name, email, passwordHash: hashPassword(password) };
        const newUsers = [...users, newUser];
        saveUsers(newUsers);
        
        const loginUser = { name, email };
        saveCurrentUser(loginUser);
        
        const newStats = { ...userStats, [email]: { genCount: 0, favCount: 0 } };
        saveUserStats(newStats);
        
        return { success: true, message: `注册成功，欢迎 ${name}！` };
    };

    // 登录
    const login = (email, password) => {
        const hashedInput = hashPassword(password);
        const user = users.find(u => u.email === email && u.passwordHash === hashedInput);
        if (user) {
            const loginUser = { name: user.name, email: user.email };
            saveCurrentUser(loginUser);
            return { success: true, message: `欢迎回来，${user.name || user.email.split('@')[0]}！` };
        }
        return { success: false, message: '邮箱或密码错误' };
    };

    // 退出登录
    const logout = () => {
        saveCurrentUser(null);
        return { success: true, message: '已退出登录' };
    };

    // 增加生成次数
    const incrementGenCount = () => {
        if (currentUser) {
            const email = currentUser.email;
            const currentStats = userStats[email] || { genCount: 0, favCount: 0 };
            const newStats = {
                ...userStats,
                [email]: { ...currentStats, genCount: currentStats.genCount + 1 }
            };
            saveUserStats(newStats);
        }
    };

    // 增加收藏次数
    const incrementFavCount = () => {
        if (currentUser) {
            const email = currentUser.email;
            const currentStats = userStats[email] || { genCount: 0, favCount: 0 };
            const newStats = {
                ...userStats,
                [email]: { ...currentStats, favCount: currentStats.favCount + 1 }
            };
            saveUserStats(newStats);
        }
    };

    // 获取当前用户统计
    const getUserStats = () => {
        if (currentUser) {
            const stats = userStats[currentUser.email] || { genCount: 0, favCount: 0 };
            const stored = localStorage.getItem('generateHistory');
            let realFavCount = 0;
            if (stored) {
                try {
                    const history = JSON.parse(stored);
                    realFavCount = history.filter(r => r.isFavorite).length;
                } catch (e) {}
            }
            return { genCount: stats.genCount, favCount: realFavCount };
        }
        return { genCount: 0, favCount: 0 };
    };

    return (
        <UserContext.Provider value={{
            currentUser,
            users,
            userStats,
            register,
            login,
            logout,
            incrementGenCount,
            incrementFavCount,
            getUserStats
        }}>
            {children}
        </UserContext.Provider>
    );
};