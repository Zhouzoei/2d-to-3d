import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useUser } from './UserContext';
import { generationService } from './lib/generationService';
import './HistoryModal.css';

function migrateOldRecord(record) {
    if (!record.variants) {
        // 旧版单图格式 → 新版
        record = {
            batchId: record.id || Date.now(),
            createdAt: record.createdAt,
            isFavorite: record.isFavorite || false,
            customName: record.customName || '',
            variants: [{
                fullImage: record.fullImage,
                thumbnail: record.thumbnail,
                positivePrompt: record.positivePrompt || record.prompt,
                negativePrompt: record.negativePrompt || '',
                style: record.style,
                adherenceToSketch: record.adherenceToSketch || record.creativity,
                steps: record.steps || 30,
                sketchType: record.sketchType || 'scribble',
            }],
            models: record.has3D ? [{
                modelUrl: record.modelThumbnail,
                modelThumbnail: record.modelThumbnail,
                createdAt: record.createdAt,
            }] : [],
            sketchData: record.sketchData,
        };
    }
    // 统一 variants 内字段为 camelCase
    if (record.variants) {
        record.variants = record.variants.map(v => ({
            fullImage: v.fullImage || v.full_image,
            thumbnail: v.thumbnail || v.full_image,
            positivePrompt: v.positivePrompt || v.positive_prompt || v.prompt || '',
            negativePrompt: v.negativePrompt || v.negative_prompt || '',
            style: v.style,
            adherenceToSketch: v.adherenceToSketch ?? v.adherence_to_sketch ?? v.creativity,
            steps: v.steps ?? 30,
            sketchType: v.sketchType || v.sketch_type || 'scribble',
        }));
    }
    return record;
}

function parseRecordTime(record) {
    const d = new Date(record.createdAt);
    return isNaN(d.getTime()) ? new Date(record.batchId) : d;
}

function getTimeCategory(record) {
    const date = parseRecordTime(record);
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(todayStart);
    weekStart.setDate(todayStart.getDate() - todayStart.getDay());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    if (date >= todayStart) return 'today';
    if (date >= weekStart) return 'week';
    if (date >= monthStart) return 'month';
    return 'earlier';
}

const TIME_FILTERS = [
    { key: 'all', label: '全部' },
    { key: 'today', label: '今天' },
    { key: 'week', label: '本周' },
    { key: 'month', label: '本月' },
    { key: 'earlier', label: '更早' },
];

const HistoryModal = ({ isOpen, onClose, onLoadRecord }) => {
    const [history, setHistory] = useState([]);
    const [filter, setFilter] = useState('all');
    const [timeFilter, setTimeFilter] = useState('all');
    const [searchText, setSearchText] = useState('');
    const [showClearConfirm, setShowClearConfirm] = useState(false);
    const [previewRecord, setPreviewRecord] = useState(null);
    const [editingRecordId, setEditingRecordId] = useState(null);
    const [editName, setEditName] = useState('');
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);
    const editInputRef = useRef(null);
    const clickTimerRef = useRef(null);
    const lastLoadTimeRef = useRef(0);
    const { incrementFavCount, currentUser } = useUser();

    useEffect(() => {
        if (isOpen) {
            setSearchText('');
            setPreviewRecord(null);
            setEditingRecordId(null);
            
            const now = Date.now();
            const timeSinceLastLoad = now - lastLoadTimeRef.current;
            
            if (timeSinceLastLoad < 3000 && history.length > 0) {
                console.log('📦 使用缓存的历史记录');
                return;
            }
            
            const loadHistory = async () => {
                setIsLoadingHistory(true);
                try {
                    if (currentUser?.id) {
                        console.log('📥 从数据库加载历史记录...');
                        const result = await generationService.getGenerations(currentUser.id, 50);
                        if (result.success) {
                            const records = result.data.map(dbRecord => ({
                                id: dbRecord.id,
                                batchId: dbRecord.batch_id,
                                createdAt: dbRecord.created_at,
                                updatedAt: dbRecord.updated_at,
                                isFavorite: dbRecord.is_favorite,
                                customName: dbRecord.custom_name || '',
                                sketchData: dbRecord.sketch_url,
                                variants: (dbRecord.variants || []).map(v => ({
                                    fullImage: v.full_image,
                                    thumbnail: v.thumbnail,
                                    positivePrompt: v.positive_prompt || v.prompt,
                                    negativePrompt: v.negative_prompt || '',
                                    style: v.style,
                                    adherenceToSketch: v.adherence_to_sketch || v.creativity,
                                    steps: v.steps || 30,
                                    sketchType: v.sketch_type || 'scribble',
                                })),
                                models: (dbRecord.models || []).map(m => ({
                                    modelUrl: m.model_url,
                                    modelThumbnail: m.model_thumbnail,
                                    createdAt: m.created_at,
                                })),
                            }));
                            records.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                            setHistory(records);
                            lastLoadTimeRef.current = now;
                            console.log(`✅ 已加载 ${records.length} 条历史记录`);
                        } else {
                            console.error('❌ 加载历史记录失败:', result.error);
                            setHistory([]);
                        }
                    } else {
                        const stored = localStorage.getItem('generateHistory');
                        if (stored) {
                            const records = JSON.parse(stored);
                            const migrated = records.map(migrateOldRecord);
                            // 按 batchId 去重（保留最新的）+ 同 sketchData 合并变体
                            const seenBatch = new Set();
                            const mergedBySketch = new Map();
                            for (const r of migrated) {
                                if (!seenBatch.has(r.batchId)) {
                                    seenBatch.add(r.batchId);
                                    const key = r.sketchData || `__noid_${r.batchId}`;
                                    if (mergedBySketch.has(key)) {
                                        const existing = mergedBySketch.get(key);
                                        const existingUrls = new Set(existing.variants.map(v => v.fullImage));
                                        for (const v of r.variants) {
                                            if (!existingUrls.has(v.fullImage)) {
                                                existing.variants.push(v);
                                                existingUrls.add(v.fullImage);
                                            }
                                        }
                                        if (r.models) {
                                            for (const m of r.models) existing.models.push(m);
                                        }
                                    } else {
                                        mergedBySketch.set(key, { ...r, variants: [...r.variants] });
                                    }
                                }
                            }
                            const cleaned = Array.from(mergedBySketch.values());
                            cleaned.sort((a, b) => b.batchId - a.batchId);
                            // 回写清理后的数据
                            localStorage.setItem('generateHistory', JSON.stringify(cleaned));
                            setHistory(cleaned);
                        } else {
                            setHistory([]);
                        }
                    }
                } finally {
                    setIsLoadingHistory(false);
                }
            };
            loadHistory();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, currentUser]);

    useEffect(() => {
        if (editingRecordId && editInputRef.current) {
            editInputRef.current.focus();
            editInputRef.current.select();
        }
    }, [editingRecordId]);

    const displayHistory = useMemo(() => {
        // 最终去重：确保同一 batchId 不会出现两次
        const seen = new Set();
        const deduped = history.filter(r => {
            if (seen.has(r.batchId)) return false;
            seen.add(r.batchId);
            return true;
        });

        let result = deduped;
        if (filter === 'favorite') {
            result = result.filter(r => r.isFavorite);
        }
        if (timeFilter !== 'all') {
            result = result.filter(r => getTimeCategory(r) === timeFilter);
        }
        if (searchText.trim()) {
            const kw = searchText.trim().toLowerCase();
            result = result.filter(r =>
                (r.customName && r.customName.toLowerCase().includes(kw)) ||
                r.variants.some(v =>
                    (v.prompt && v.prompt.toLowerCase().includes(kw)) ||
                    (v.style && v.style.toLowerCase().includes(kw))
                )
            );
        }
        return result;
    }, [history, filter, timeFilter, searchText]);

    const persistHistory = (newHistory) => {
        localStorage.setItem('generateHistory', JSON.stringify(newHistory));
    };

    const handleDelete = async (batchId, e) => {
        e.stopPropagation();
        
        const recordToDelete = history.find(record => record.batchId === batchId);
        
        if (recordToDelete?.id && currentUser?.id) {
            try {
                console.log('🗑️ 从数据库删除记录:', recordToDelete.id);
                const result = await generationService.deleteGeneration(recordToDelete.id);
                if (result.success) {
                    console.log('✅ 已从数据库删除');
                } else {
                    console.error('❌ 从数据库删除失败:', result.error);
                }
            } catch (error) {
                console.error('删除操作失败:', error);
            }
        }
        
        const newHistory = history.filter(record => record.batchId !== batchId);
        setHistory(newHistory);
        persistHistory(newHistory);
        if (previewRecord && previewRecord.batchId === batchId) {
            setPreviewRecord(null);
        }
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
        if (previewRecord && previewRecord.batchId === batchId) {
            setPreviewRecord(prev => ({ ...prev, isFavorite: !prev.isFavorite }));
        }
    };

    const handleCardClick = (record) => {
        if (clickTimerRef.current) {
            clearTimeout(clickTimerRef.current);
            clickTimerRef.current = null;
            return;
        }
        clickTimerRef.current = setTimeout(() => {
            clickTimerRef.current = null;
            setPreviewRecord(record);
        }, 250);
    };

    const handleLoadFromPreview = () => {
        if (previewRecord) {
            onLoadRecord(previewRecord);
            onClose();
        }
    };

    const confirmClearAll = async () => {
        if (currentUser?.id && history.length > 0) {
            try {
                console.log('🗑️ 清空所有数据库记录...');
                const deletePromises = history
                    .filter(record => record.id)
                    .map(record => generationService.deleteGeneration(record.id));
                
                const results = await Promise.all(deletePromises);
                const successCount = results.filter(r => r.success).length;
                console.log(`✅ 已从数据库删除 ${successCount} 条记录`);
            } catch (error) {
                console.error('清空数据库记录失败:', error);
            }
        }
        
        localStorage.removeItem('generateHistory');
        setHistory([]);
        setShowClearConfirm(false);
        setPreviewRecord(null);
    };

    const handleDoubleClickName = (record, e) => {
        e.stopPropagation();
        if (clickTimerRef.current) {
            clearTimeout(clickTimerRef.current);
            clickTimerRef.current = null;
        }
        setEditingRecordId(record.batchId);
        setEditName(record.customName || record.variants[0]?.prompt || '');
    };

    const handleRenameSubmit = () => {
        if (editingRecordId === null) return;
        const newHistory = history.map(record => {
            if (record.batchId === editingRecordId) {
                return { ...record, customName: editName.trim() || '' };
            }
            return record;
        });
        setHistory(newHistory);
        persistHistory(newHistory);
        if (previewRecord && previewRecord.batchId === editingRecordId) {
            setPreviewRecord(prev => ({ ...prev, customName: editName.trim() || '' }));
        }
        setEditingRecordId(null);
        setEditName('');
    };

    const handleRenameKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleRenameSubmit();
        } else if (e.key === 'Escape') {
            setEditingRecordId(null);
            setEditName('');
        }
    };

    const displayName = (record) => {
        if (record.customName) return record.customName;
        const first = record.variants[0];
        return first?.prompt || first?.style || '未命名';
    };

    if (!isOpen) return null;

    return (
        <div className="history-modal-overlay" onClick={onClose}>
            <div className="history-modal" onClick={(e) => e.stopPropagation()}>
                <div className="history-modal-content">
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
                            <select
                                className="history-time-select"
                                value={timeFilter}
                                onChange={(e) => setTimeFilter(e.target.value)}
                            >
                                {TIME_FILTERS.map(tf => (
                                    <option key={tf.key} value={tf.key}>{tf.label}</option>
                                ))}
                            </select>
                        </div>
                        <div className="history-search">
                            <input
                                type="text"
                                placeholder="搜索名称、prompt 或风格..."
                                value={searchText}
                                onChange={(e) => setSearchText(e.target.value)}
                            />
                        </div>
                        {history.length > 0 && (
                            <button className="history-clear-all" onClick={() => setShowClearConfirm(true)}>清空全部</button>
                        )}
                    </div>

                    <div className="history-gallery">
                    {isLoadingHistory ? (
                        <div className="history-loading">
                            <div className="history-loading-spinner"></div>
                            <p>加载中...</p>
                        </div>
                    ) : displayHistory.length === 0 ? (
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
                            const isEditing = editingRecordId === record.batchId;
                            return (
                                <div
                                    key={record.batchId}
                                    className="history-card"
                                    onClick={() => handleCardClick(record)}
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
                                        {isEditing ? (
                                            <input
                                                ref={editInputRef}
                                                className="history-card-rename-input"
                                                value={editName}
                                                onChange={(e) => setEditName(e.target.value)}
                                                onBlur={handleRenameSubmit}
                                                onKeyDown={handleRenameKeyDown}
                                                onClick={(e) => e.stopPropagation()}
                                            />
                                        ) : (
                                            <span
                                                className="history-card-style"
                                                onDoubleClick={(e) => handleDoubleClickName(record, e)}
                                                title="双击重命名"
                                            >{displayName(record)}</span>
                                        )}
                                        <span className="history-card-time">{record.createdAt}</span>
                                        <span className="history-card-badge-combo">
                                            2D × {variantCount}{modelCount > 0 ? ` · 3D × ${modelCount}` : ''}
                                        </span>
                                    </div>
                                </div>
                            );
                        })
                    )}
                    </div>

                </div>

                {previewRecord && (
                    <div className="preview-overlay" onClick={() => setPreviewRecord(null)}>
                        <div className="preview-panel" onClick={(e) => e.stopPropagation()}>
                            <div className="preview-panel-header">
                                <h3 className="preview-panel-title">
                                    {previewRecord.customName || previewRecord.variants[0]?.prompt || previewRecord.variants[0]?.style || '记录详情'}
                                </h3>
                                <button className="preview-panel-close" onClick={() => setPreviewRecord(null)}>✕</button>
                            </div>
                            <div className="preview-panel-body">
                                <div className="preview-main-image">
                                    <img src={previewRecord.variants[0]?.fullImage} alt="main" />
                                </div>
                                <div className="preview-sidebar">
                                    <div className="preview-info">
                                        <div className="preview-info-row">
                                            <span className="preview-info-label">创建时间</span>
                                            <span className="preview-info-value">{previewRecord.createdAt}</span>
                                        </div>
                                        <div className="preview-info-row">
                                            <span className="preview-info-label">风格</span>
                                            <span className="preview-info-value">{previewRecord.variants[0]?.style || '默认'}</span>
                                        </div>
                                        <div className="preview-info-row">
                                            <span className="preview-info-label">生成变体</span>
                                            <span className="preview-info-value">{previewRecord.variants.length} 张</span>
                                        </div>
                                        {previewRecord.models && previewRecord.models.length > 0 && (
                                            <div className="preview-info-row">
                                                <span className="preview-info-label">3D 模型</span>
                                                <span className="preview-info-value">{previewRecord.models.length} 个</span>
                                            </div>
                                        )}
                                        <div className="preview-info-row">
                                            <span className="preview-info-label">收藏</span>
                                            <span className="preview-info-value">{previewRecord.isFavorite ? '⭐ 已收藏' : '—'}</span>
                                        </div>
                                    </div>
                                    {previewRecord.variants.length > 1 && (
                                        <div className="preview-variants">
                                            <div className="preview-variants-label">所有 2D 变体</div>
                                            <div className="preview-variants-strip">
                                                {previewRecord.variants.map((v, i) => (
                                                    <div key={i} className="preview-variant-thumb">
                                                        <img src={v.thumbnail || v.fullImage} alt={`变体 ${i + 1}`} />
                                                        <span>{i + 1}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    {previewRecord.models && previewRecord.models.length > 0 && (
                                        <div className="preview-variants">
                                            <div className="preview-variants-label">3D 模型</div>
                                            <div className="preview-variants-strip">
                                                {previewRecord.models.map((m, i) => (
                                                    <div key={i} className="preview-variant-thumb preview-variant-thumb-3d">
                                                        <img src={m.modelThumbnail || m.modelUrl} alt={`3D ${i + 1}`} />
                                                        <span>3D</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="preview-panel-footer">
                                <button className="preview-btn preview-btn-cancel" onClick={() => setPreviewRecord(null)}>关闭</button>
                                <button className="preview-btn preview-btn-load" onClick={handleLoadFromPreview}>
                                    加载到画布
                                </button>
                            </div>
                        </div>
                    </div>
                )}

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
