import React, { useState, useEffect } from 'react';
import { useUser } from './UserContext';
import './HistoryModal.css';

const HistoryModal = ({ isOpen, onClose, onLoadRecord }) => {
    const [history, setHistory] = useState([]);
    const [filter, setFilter] = useState('all');
    const [showClearConfirm, setShowClearConfirm] = useState(false);
    const { incrementFavCount } = useUser();

    useEffect(() => {
        if (isOpen) {
            loadHistory();
        }
    }, [isOpen]);

    const loadHistory = () => {
        const stored = localStorage.getItem('generateHistory');
        if (stored) {
            const records = JSON.parse(stored);
            records.sort((a, b) => b.id - a.id);
            setHistory(records);
        } else {
            setHistory([]);
        }
    };

    const handleDelete = (id, e) => {
        e.stopPropagation();
        const newHistory = history.filter(record => record.id !== id);
        setHistory(newHistory);
        localStorage.setItem('generateHistory', JSON.stringify(newHistory));
    };

    const handleFavorite = (id, e) => {
        e.stopPropagation();
        const newHistory = history.map(record => {
            if (record.id === id) {
                const newFav = !record.isFavorite;
                if (newFav && incrementFavCount) incrementFavCount();
                return { ...record, isFavorite: newFav };
            }
            return record;
        });
        setHistory(newHistory);
        localStorage.setItem('generateHistory', JSON.stringify(newHistory));
    };

    const handleLoadRecord = (record) => {
        onLoadRecord(record);
        onClose();
    };

    const handleClearAll = () => {
        setShowClearConfirm(true);
    };

    const confirmClearAll = () => {
        localStorage.removeItem('generateHistory');
        setHistory([]);
        setShowClearConfirm(false);
    };

    const displayHistory = filter === 'favorite'
        ? history.filter(r => r.isFavorite)
        : history;

    if (!isOpen) return null;

    return (
        <div className="history-modal-overlay" onClick={onClose}>
            <div className="history-modal" onClick={(e) => e.stopPropagation()}>
                <div className="history-modal-header">
                    <h2>生成记录</h2>
                    <button className="history-modal-close" onClick={onClose}>✕</button>
                </div>

                <div className="history-toolbar">
                    <div className="history-tabs">
                        <button
                            className={`history-tab ${filter === 'all' ? 'active' : ''}`}
                            onClick={() => setFilter('all')}
                        >
                            全部 ({history.length})
                        </button>
                        <button
                            className={`history-tab ${filter === 'favorite' ? 'active' : ''}`}
                            onClick={() => setFilter('favorite')}
                        >
                            收藏 ({history.filter(r => r.isFavorite).length})
                        </button>
                    </div>
                    {history.length > 0 && (
                        <button className="history-clear-all" onClick={handleClearAll}>
                            清空全部
                        </button>
                    )}
                </div>

                <div className="history-list">
                    {displayHistory.length === 0 ? (
                        <div className="history-empty">
                            <span>📭</span>
                            <p>暂无生成记录</p>
                            <p className="history-empty-hint">生成角色后，记录会显示在这里</p>
                        </div>
                    ) : (
                        displayHistory.map(record => (
                            <div
                                key={record.id}
                                className="history-item"
                                onClick={() => handleLoadRecord(record)}
                            >
                                <div className="history-item-thumb">
                                    <img src={record.thumbnail} alt={record.style} />
                                </div>
                                <div className="history-item-info">
                                    <div className="history-item-style">{record.style}</div>
                                    <div className="history-item-prompt">{record.prompt.substring(0, 40)}...</div>
                                    <div className="history-item-time">{record.createdAt}</div>
                                </div>
                                <div className="history-item-actions">
                                    <button
                                        className={`history-fav-btn ${record.isFavorite ? 'active' : ''}`}
                                        onClick={(e) => handleFavorite(record.id, e)}
                                        title={record.isFavorite ? '取消收藏' : '收藏'}
                                    >
                                        {record.isFavorite ? '★' : '☆'}
                                    </button>
                                    <button
                                        className="history-delete-btn"
                                        onClick={(e) => handleDelete(record.id, e)}
                                        title="删除"
                                    >
                                        ✕
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {showClearConfirm && (
                    <div className="clear-overlay" onClick={() => setShowClearConfirm(false)}>
                        <div className="clear-confirm" onClick={(e) => e.stopPropagation()}>
                            <div className="clear-confirm-icon">⚠️</div>
                            <div className="clear-confirm-title">确认清空</div>
                            <div className="clear-confirm-desc">此操作将永久删除所有生成记录，无法恢复。</div>
                            <div className="clear-confirm-actions">
                                <button
                                    className="clear-confirm-cancel"
                                    onClick={() => setShowClearConfirm(false)}
                                >
                                    取消
                                </button>
                                <button
                                    className="clear-confirm-delete"
                                    onClick={confirmClearAll}
                                >
                                    确认清空
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default HistoryModal;
