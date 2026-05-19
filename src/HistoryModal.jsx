import React, { useState, useEffect, useMemo } from 'react';
import { useUser } from './UserContext';
import './HistoryModal.css';

function migrateOldRecord(record) {
    if (record.variants) return record;
    return {
        batchId: record.id || Date.now(),
        createdAt: record.createdAt,
        isFavorite: record.isFavorite || false,
        variants: [{
            fullImage: record.fullImage,
            thumbnail: record.thumbnail,
            prompt: record.prompt,
            style: record.style,
            creativity: record.creativity,
            geometryDetail: record.geometryDetail,
            textureQuality: record.textureQuality,
        }],
        models: record.has3D ? [{
            modelUrl: record.modelThumbnail,
            modelThumbnail: record.modelThumbnail,
            createdAt: record.createdAt,
        }] : [],
    };
}

const HistoryModal = ({ isOpen, onClose, onLoadRecord }) => {
    const [history, setHistory] = useState([]);
    const [filter, setFilter] = useState('all');
    const [searchText, setSearchText] = useState('');
    const [showClearConfirm, setShowClearConfirm] = useState(false);
    const { incrementFavCount } = useUser();

    useEffect(() => {
        if (isOpen) {
            const stored = localStorage.getItem('generateHistory');
            if (stored) {
                const records = JSON.parse(stored);
                const migrated = records.map(migrateOldRecord);
                migrated.sort((a, b) => b.batchId - a.batchId);
                setHistory(migrated);
            } else {
                setHistory([]);
            }
            setSearchText('');
        }
    }, [isOpen]);

    const displayHistory = useMemo(() => {
        let result = history;
        if (filter === 'favorite') {
            result = result.filter(r => r.isFavorite);
        }
        if (searchText.trim()) {
            const kw = searchText.trim().toLowerCase();
            result = result.filter(r =>
                r.variants.some(v =>
                    (v.prompt && v.prompt.toLowerCase().includes(kw)) ||
                    (v.style && v.style.toLowerCase().includes(kw))
                )
            );
        }
        return result;
    }, [history, filter, searchText]);

    const persistHistory = (newHistory) => {
        localStorage.setItem('generateHistory', JSON.stringify(newHistory));
    };

    const handleDelete = (batchId, e) => {
        e.stopPropagation();
        const newHistory = history.filter(record => record.batchId !== batchId);
        setHistory(newHistory);
        persistHistory(newHistory);
    };

    const handleFavorite = (batchId, e) => {
        e.stopPropagation();
        const newHistory = history.map(record => {
            if (record.batchId === batchId) {
                const newFav = !record.isFavorite;
                if (newFav && incrementFavCount) incrementFavCount();
                return { ...record, isFavorite: newFav };
            }
            return record;
        });
        setHistory(newHistory);
        persistHistory(newHistory);
    };

    const handleLoadRecord = (record) => {
        onLoadRecord(record);
        onClose();
    };

    const confirmClearAll = () => {
        localStorage.removeItem('generateHistory');
        setHistory([]);
        setShowClearConfirm(false);
    };

    if (!isOpen) return null;

    return (
        <div className="history-modal-overlay" onClick={onClose}>
            <div className="history-modal" onClick={(e) => e.stopPropagation()}>
                <div className="history-modal-header">
                    <h2>生成记录</h2>
                    <button className="history-modal-close" onClick={onClose}>✕</button>
                </div>

                <div className="history-toolbar">
                    <div className="history-toolbar-left">
                        <div className="history-tabs">
                            <button
                                className={`history-tab ${filter === 'all' ? 'active' : ''}`}
                                onClick={() => setFilter('all')}
                            >全部 ({history.length})</button>
                            <button
                                className={`history-tab ${filter === 'favorite' ? 'active' : ''}`}
                                onClick={() => setFilter('favorite')}
                            >收藏 ({history.filter(r => r.isFavorite).length})</button>
                        </div>
                    </div>
                    <div className="history-search">
                        <input
                            type="text"
                            placeholder="搜索 prompt 或风格..."
                            value={searchText}
                            onChange={(e) => setSearchText(e.target.value)}
                        />
                    </div>
                    {history.length > 0 && (
                        <button className="history-clear-all" onClick={() => setShowClearConfirm(true)}>清空全部</button>
                    )}
                </div>

                <div className="history-gallery">
                    {displayHistory.length === 0 ? (
                        <div className="history-empty">
                            <span>📭</span>
                            <p>{searchText ? '未找到匹配记录' : '暂无生成记录'}</p>
                            <p className="history-empty-hint">生成角色后，记录会显示在这里</p>
                        </div>
                    ) : (
                        displayHistory.map(record => {
                            const firstVariant = record.variants[0];
                            const variantCount = record.variants.length;
                            const modelCount = record.models ? record.models.length : 0;
                            return (
                                <div
                                    key={record.batchId}
                                    className="history-card"
                                    onClick={() => handleLoadRecord(record)}
                                >
                                    <div className="history-card-thumb">
                                        <img src={firstVariant.thumbnail || firstVariant.fullImage} alt={firstVariant.style} />
                                        <div className="history-card-actions">
                                            <button
                                                className={`history-fav-btn ${record.isFavorite ? 'active' : ''}`}
                                                onClick={(e) => handleFavorite(record.batchId, e)}
                                            >{record.isFavorite ? '★' : '☆'}</button>
                                            <button
                                                className="history-del-btn"
                                                onClick={(e) => handleDelete(record.batchId, e)}
                                            >✕</button>
                                        </div>
                                    </div>
                                    <div className="history-card-info">
                                        <span className="history-card-style">{firstVariant.prompt || firstVariant.style || '未命名'}</span>
                                        <div className="history-card-meta">
                                            <span className="history-card-time">{record.createdAt}</span>
                                            <span className="history-card-badge-combo">
                                                2D × {variantCount}{modelCount > 0 ? ` · 3D × ${modelCount}` : ''}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                {showClearConfirm && (
                    <div className="clear-overlay" onClick={() => setShowClearConfirm(false)}>
                        <div className="clear-confirm" onClick={(e) => e.stopPropagation()}>
                            <div className="clear-confirm-icon">⚠️</div>
                            <div className="clear-confirm-title">确认清空</div>
                            <div className="clear-confirm-desc">此操作将永久删除所有生成记录，无法恢复。</div>
                            <div className="clear-confirm-actions">
                                <button className="clear-confirm-cancel" onClick={() => setShowClearConfirm(false)}>取消</button>
                                <button className="clear-confirm-delete" onClick={confirmClearAll}>确认清空</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default HistoryModal;
