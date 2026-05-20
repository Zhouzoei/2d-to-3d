import React, { createContext, useState, useContext, useEffect } from 'react';

const UserContext = createContext();

export const useUser = () => useContext(UserContext);

function getTodayStr() {
    return new Date().toISOString().split('T')[0];
}

function getYesterdayStr(today) {
    const d = new Date(today);
    d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
}

export const UserProvider = ({ children }) => {
    const [currentUser, setCurrentUser] = useState(null);
    const [users, setUsers] = useState([]);
    const [userStats, setUserStats] = useState({});

    useEffect(() => {
        const storedUsers = localStorage.getItem('users');
        const storedCurrentUser = localStorage.getItem('currentUser');
        const storedUserStats = localStorage.getItem('userStats');

        if (storedUsers) setUsers(JSON.parse(storedUsers));
        if (storedCurrentUser) setCurrentUser(JSON.parse(storedCurrentUser));
        if (storedUserStats) setUserStats(JSON.parse(storedUserStats));
    }, []);

    const saveUsers = (newUsers) => {
        setUsers(newUsers);
        localStorage.setItem('users', JSON.stringify(newUsers));
    };

    const saveCurrentUser = (user) => {
        setCurrentUser(user);
        if (user) {
            localStorage.setItem('currentUser', JSON.stringify(user));
        } else {
            localStorage.removeItem('currentUser');
        }
    };

    const saveUserStats = (stats) => {
        setUserStats(stats);
        localStorage.setItem('userStats', JSON.stringify(stats));
    };

    const hashPassword = (password) => {
        let hash = 0;
        for (let i = 0; i < password.length; i++) {
            const char = password.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return 'h_' + Math.abs(hash).toString(36);
    };

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

        const newStats = {
            ...userStats,
            [email]: { genCount: 0, favCount: 0, streak: 0, lastActiveDate: null, avatar: null }
        };
        saveUserStats(newStats);

        return { success: true, message: `注册成功，欢迎 ${name}！` };
    };

    const login = (email, password) => {
        const hashedInput = hashPassword(password);
        const user = users.find(u => u.email === email && u.passwordHash === hashedInput);
        if (user) {
            const loginUser = { name: user.name, email: user.email, avatar: userStats[email]?.avatar };
            saveCurrentUser(loginUser);
            return { success: true, message: `欢迎回来，${user.name || user.email.split('@')[0]}！` };
        }
        return { success: false, message: '邮箱或密码错误' };
    };

    const logout = () => {
        saveCurrentUser(null);
        return { success: true, message: '已退出登录' };
    };

    const updateProfile = (name, avatar) => {
        if (!currentUser) return { success: false, message: '未登录' };
        const email = currentUser.email;

        const newUsers = users.map(u => {
            if (u.email === email) {
                return { ...u, name };
            }
            return u;
        });
        saveUsers(newUsers);

        const updatedUser = { ...currentUser, name, avatar };
        saveCurrentUser(updatedUser);

        const currentStats = userStats[email] || { genCount: 0, favCount: 0, streak: 0, lastActiveDate: null };
        const newStats = {
            ...userStats,
            [email]: { ...currentStats, avatar }
        };
        saveUserStats(newStats);

        return { success: true, message: '资料已更新' };
    };

    const changePassword = (oldPassword, newPassword) => {
        if (!currentUser) return { success: false, message: '未登录' };
        const email = currentUser.email;
        const user = users.find(u => u.email === email);

        if (!user) return { success: false, message: '用户不存在' };

        if (user.passwordHash !== hashPassword(oldPassword)) {
            return { success: false, message: '当前密码错误' };
        }

        if (newPassword.length < 6) {
            return { success: false, message: '新密码至少需要6位' };
        }

        const newUsers = users.map(u => {
            if (u.email === email) {
                return { ...u, passwordHash: hashPassword(newPassword) };
            }
            return u;
        });
        saveUsers(newUsers);

        return { success: true, message: '密码已修改' };
    };

    const incrementGenCount = () => {
        if (currentUser) {
            const email = currentUser.email;
            const currentStats = userStats[email] || { genCount: 0, favCount: 0, streak: 0, lastActiveDate: null };
            const today = getTodayStr();
            let streak = currentStats.streak || 0;
            const lastDate = currentStats.lastActiveDate;

            if (lastDate === today) {
            } else if (lastDate === getYesterdayStr(today)) {
                streak += 1;
            } else {
                streak = 1;
            }

            const newStats = {
                ...userStats,
                [email]: {
                    ...currentStats,
                    genCount: (currentStats.genCount || 0) + 1,
                    streak,
                    lastActiveDate: today
                }
            };
            saveUserStats(newStats);
        }
    };

    const incrementFavCount = () => {
        if (currentUser) {
            const email = currentUser.email;
            const currentStats = userStats[email] || { genCount: 0, favCount: 0, streak: 0, lastActiveDate: null };
            const newStats = {
                ...userStats,
                [email]: { ...currentStats, favCount: (currentStats.favCount || 0) + 1 }
            };
            saveUserStats(newStats);
        }
    };

    const getUserStats = () => {
        if (currentUser) {
            const stats = userStats[currentUser.email] || { genCount: 0, favCount: 0, streak: 0, lastActiveDate: null, avatar: null };
            const stored = localStorage.getItem('generateHistory');
            let realFavCount = 0;
            const styleDistribution = {};
            let recentActivity = [];

            if (stored) {
                try {
                    const history = JSON.parse(stored);
                    realFavCount = history.filter(r => r.isFavorite).length;

                    history.forEach(record => {
                        if (record.variants) {
                            record.variants.forEach(v => {
                                if (v.style) {
                                    styleDistribution[v.style] = (styleDistribution[v.style] || 0) + 1;
                                }
                            });
                        }
                    });

                    recentActivity = history.slice(0, 3).map(record => {
                        const first = record.variants[0];
                        return {
                            batchId: record.batchId,
                            createdAt: record.createdAt,
                            prompt: record.customName || first?.prompt || first?.style || '未命名',
                            has3D: record.models && record.models.length > 0,
                            isFavorite: record.isFavorite,
                            thumbnail: first?.thumbnail || first?.fullImage
                        };
                    });
                } catch (e) {}
            }

            const sortedStyles = Object.entries(styleDistribution)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 6);

            return {
                genCount: stats.genCount || 0,
                favCount: realFavCount,
                streak: stats.streak || 0,
                lastActiveDate: stats.lastActiveDate,
                avatar: stats.avatar || currentUser.avatar,
                styleDistribution: sortedStyles,
                recentActivity
            };
        }
        return { genCount: 0, favCount: 0, streak: 0, styleDistribution: [], recentActivity: [] };
    };

    return (
        <UserContext.Provider value={{
            currentUser,
            users,
            userStats,
            register,
            login,
            logout,
            updateProfile,
            changePassword,
            incrementGenCount,
            incrementFavCount,
            getUserStats
        }}>
            {children}
        </UserContext.Provider>
    );
};
