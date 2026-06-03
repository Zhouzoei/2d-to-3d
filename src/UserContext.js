import React, { createContext, useState, useContext, useEffect } from 'react';
import { supabase } from './lib/supabase';
import { getHistoryKey } from './lib/storage';

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
    const [userStats, setUserStats] = useState({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const storedUserStats = localStorage.getItem('userStats');
        if (storedUserStats) setUserStats(JSON.parse(storedUserStats));

        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                if (session && session.user) {
                    const user = {
                        id: session.user.id,
                        email: session.user.email,
                        name: session.user.user_metadata?.name || session.user.email.split('@')[0],
                        avatar: session.user.user_metadata?.avatar
                    };
                    setCurrentUser(user);
                    
                    if (event === 'SIGNED_IN') {
                        localStorage.setItem('currentUser', JSON.stringify(user));
                    }
                } else {
                    setCurrentUser(null);
                    localStorage.removeItem('currentUser');
                }
                setLoading(false);
            }
        );

        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session && session.user) {
                const user = {
                    id: session.user.id,
                    email: session.user.email,
                    name: session.user.user_metadata?.name || session.user.email.split('@')[0],
                    avatar: session.user.user_metadata?.avatar
                };
                setCurrentUser(user);
            }
            setLoading(false);
        });

        return () => subscription.unsubscribe();
    }, []);

    const saveUserStats = (stats) => {
        setUserStats(stats);
        localStorage.setItem('userStats', JSON.stringify(stats));
    };

    const register = async (name, email, password) => {
        try {
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: { name }
                }
            });

            if (error) {
                if (error.message.includes('already registered')) {
                    return { success: false, message: '该邮箱已注册' };
                }
                return { success: false, message: error.message };
            }

            if (data.user && !data.session) {
                return { success: true, message: '验证邮件已发送，请查收邮箱并点击验证链接' };
            }

            return { success: true, message: `注册成功，欢迎 ${name}！` };
        } catch (error) {
            return { success: false, message: '注册失败，请稍后重试' };
        }
    };

    const login = async (email, password) => {
        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password
            });

            if (error) {
                if (error.message.includes('Invalid login credentials')) {
                    return { success: false, message: '邮箱或密码错误' };
                }
                if (error.message.includes('Email not confirmed')) {
                    return { success: false, message: '请先验证邮箱' };
                }
                return { success: false, message: error.message };
            }

            if (data.user) {
                const name = data.user.user_metadata?.name || email.split('@')[0];
                return { success: true, message: `欢迎回来，${name}！` };
            }

            return { success: false, message: '登录失败' };
        } catch (error) {
            return { success: false, message: '登录失败，请稍后重试' };
        }
    };

    const logout = async () => {
        try {
            const { error } = await supabase.auth.signOut();
            if (error) {
                return { success: false, message: error.message };
            }
            setCurrentUser(null);
            localStorage.removeItem('currentUser');
            return { success: true, message: '已退出登录' };
        } catch (error) {
            return { success: false, message: '退出失败，请稍后重试' };
        }
    };

    const updateProfile = async (name, avatar) => {
        if (!currentUser) return { success: false, message: '未登录' };

        try {
            const { error } = await supabase.auth.updateUser({
                data: { name, avatar }
            });

            if (error) {
                return { success: false, message: error.message };
            }

            const updatedUser = { ...currentUser, name, avatar };
            setCurrentUser(updatedUser);
            localStorage.setItem('currentUser', JSON.stringify(updatedUser));

            const email = currentUser.email;
            const currentStats = userStats[email] || { genCount: 0, favCount: 0, streak: 0, lastActiveDate: null };
            const newStats = {
                ...userStats,
                [email]: { ...currentStats, avatar }
            };
            saveUserStats(newStats);

            return { success: true, message: '资料已更新' };
        } catch (error) {
            return { success: false, message: '更新失败，请稍后重试' };
        }
    };

    const changePassword = async (oldPassword, newPassword) => {
        if (!currentUser) return { success: false, message: '未登录' };

        try {
            const { error: signInError } = await supabase.auth.signInWithPassword({
                email: currentUser.email,
                password: oldPassword
            });

            if (signInError) {
                return { success: false, message: '当前密码错误' };
            }

            if (newPassword.length < 6) {
                return { success: false, message: '新密码至少需要6位' };
            }

            const { error } = await supabase.auth.updateUser({
                password: newPassword
            });

            if (error) {
                return { success: false, message: error.message };
            }

            return { success: true, message: '密码已修改' };
        } catch (error) {
            return { success: false, message: '修改失败，请稍后重试' };
        }
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
            const stored = localStorage.getItem(getHistoryKey());
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
                            prompt: record.customName || first?.positivePrompt || first?.prompt || first?.style || '未命名',
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
            userStats,
            loading,
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
