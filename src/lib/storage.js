// 用户隔离的 localStorage key 工具
// 不同用户的数据用不同 key 存储

export function getHistoryKey() {
    try {
        const raw = localStorage.getItem('currentUser');
        if (raw) {
            const user = JSON.parse(raw);
            if (user && user.id) {
                return `generateHistory_${user.id}`;
            }
        }
    } catch (e) {
        // ignore
    }
    return 'generateHistory'; // 未登录时用默认 key
}
