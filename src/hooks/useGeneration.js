import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { generationService } from '../lib/generationService';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
const USE_MOCK = localStorage.getItem('mock') === 'true';
const USE_DATABASE = true;

export default function useGeneration({
    sketchData,
    prompt,
    selectedStyle,
    creativity,
    geometryDetail,
    textureQuality,
    getStylePrompt,
    onUpdateSketchData,
    onProceedTo3D,
    onUpdateParams,
    onCloseCropModal,
    currentUser,
    incrementGenCount,
    onLoadExistingModels,
}) {
    const [loading, setLoading] = useState(false);
    const [generatedImages, setGeneratedImages] = useState([]);
    const [selectedVariantIndex, setSelectedVariantIndex] = useState(-1);
    const [confirmedImage, setConfirmedImage] = useState(null);
    const [generationStatus, setGenerationStatus] = useState({
        sketch: 'done', character: 'pending', model: 'pending'
    });
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState(null);
    const [showAuthModal, setShowAuthModal] = useState(false);
    const [showHistoryModal, setShowHistoryModal] = useState(false);

    const sketchDataRef = useRef(sketchData);
    const paramsRef = useRef({ prompt, selectedStyle, creativity, geometryDetail, textureQuality });
    const saveToHistoryRef = useRef(null);
    const continueGenerateRef = useRef(null);
    const batchIdRef = useRef(null);
    const generationIdRef = useRef(null);
    const abortControllerRef = useRef(null);
    const cancelRequestedRef = useRef(false);

    useEffect(() => { sketchDataRef.current = sketchData; }, [sketchData]);
    useEffect(() => {
        paramsRef.current = { prompt, selectedStyle, creativity, geometryDetail, textureQuality };
    }, [prompt, selectedStyle, creativity, geometryDetail, textureQuality]);

    const callGenerateAPI = useCallback(async (finalSketchData, signal) => {
        const { prompt: p, selectedStyle: s, creativity: c, geometryDetail: gd, textureQuality: tq } = paramsRef.current;

        let effectivePrompt = p;
        if (s) {
            const stylePrompt = getStylePrompt(s);
            if (stylePrompt) {
                effectivePrompt = p ? `${p}, ${stylePrompt}` : stylePrompt;
            }
        }

        if (USE_MOCK) {
            const { mockGenerate } = await import('../mock/mockApi');
            return await mockGenerate(effectivePrompt, s);
        }
        const blob = await (await fetch(finalSketchData)).blob();
        const file = new File([blob], 'sketch.png', { type: 'image/png' });
        const formData = new FormData();
        formData.append('sketch', file);
        formData.append('prompt', effectivePrompt);
        formData.append('creativity', c.toString());
        formData.append('geometry_detail', gd.toString());
        formData.append('texture_quality', tq.toString());
        const response = await fetch(`${API_URL}/generate`, {
            method: 'POST', body: formData, signal,
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `服务器错误：${response.status}`);
        }
        return await response.json();
    }, [getStylePrompt]);

    continueGenerateRef.current = useCallback(async (finalSketchData, originalSketchData) => {
        const controller = new AbortController();
        abortControllerRef.current = controller;
        cancelRequestedRef.current = false;
        setLoading(true);
        setError(null);
        setGenerationStatus({ sketch: 'done', character: 'active', model: 'pending' });
        setProgress(20);
        try {
            setProgress(40);
            const data = await callGenerateAPI(finalSketchData, controller.signal);
            if (cancelRequestedRef.current) return;
            setProgress(70);
            if (data.image_base64) {
                const imageUrl = `data:image/png;base64,${data.image_base64}`;
                setGeneratedImages([imageUrl]);
                setSelectedVariantIndex(0);
                const { prompt: p, selectedStyle: s, creativity: c, geometryDetail: gd, textureQuality: tq } = paramsRef.current;
                saveToHistoryRef.current(imageUrl, p, s, c, gd, tq, originalSketchData || finalSketchData);
                setGenerationStatus({ sketch: 'done', character: 'done', model: 'pending' });
                setProgress(100);
                setTimeout(() => setProgress(0), 2000);
                if (currentUser) incrementGenCount();
            } else {
                throw new Error('后端未返回图片数据');
            }
        } catch (err) {
            if (err.name === 'AbortError' || cancelRequestedRef.current) return;
            console.error('生成失败:', err);
            setError(err.message);
            setGenerationStatus({ sketch: 'done', character: 'error', model: 'pending' });
            setProgress(0);
        } finally {
            setLoading(false);
            abortControllerRef.current = null;
        }
    }, [callGenerateAPI, currentUser, incrementGenCount]);

    const handleCropConfirm = useCallback(async (croppedImageData, originalSketchData) => {
        onCloseCropModal();
        onUpdateSketchData(croppedImageData);
        setGeneratedImages([]);
        setSelectedVariantIndex(-1);
        setConfirmedImage(null);
        batchIdRef.current = Date.now();
        generationIdRef.current = null;
        if (USE_MOCK) {
            import('../mock/mockApi').then(m => { m.resetMockCount(); m.resetModelCount(); });
        }
        await continueGenerateRef.current(croppedImageData, originalSketchData);
    }, [onCloseCropModal, onUpdateSketchData]);

    const handleRegenerate = useCallback(async () => {
        const currentSketchData = sketchDataRef.current;
        if (!currentSketchData) return;
        const controller = new AbortController();
        abortControllerRef.current = controller;
        cancelRequestedRef.current = false;
        setLoading(true);
        setError(null);
        setGenerationStatus({ sketch: 'done', character: 'active', model: 'pending' });
        setProgress(20);
        try {
            setProgress(40);
            const data = await callGenerateAPI(currentSketchData, controller.signal);
            if (cancelRequestedRef.current) return;
            setProgress(70);
            if (data.image_base64) {
                const imageUrl = `data:image/png;base64,${data.image_base64}`;
                setGeneratedImages(prev => [...prev, imageUrl]);
                setSelectedVariantIndex(generatedImages.length);
                setConfirmedImage(null);
                const { prompt: p, selectedStyle: s, creativity: c, geometryDetail: gd, textureQuality: tq } = paramsRef.current;
                saveToHistoryRef.current(imageUrl, p, s, c, gd, tq, currentSketchData);
                setGenerationStatus({ sketch: 'done', character: 'done', model: 'pending' });
                setProgress(100);
                setTimeout(() => setProgress(0), 2000);
                if (currentUser) incrementGenCount();
            } else {
                throw new Error('后端未返回图片数据');
            }
        } catch (err) {
            if (err.name === 'AbortError' || cancelRequestedRef.current) return;
            console.error('重新生成失败:', err);
            setError(err.message);
            setGenerationStatus({ sketch: 'done', character: 'error', model: 'pending' });
            setProgress(0);
        } finally {
            setLoading(false);
            abortControllerRef.current = null;
        }
    }, [callGenerateAPI, currentUser, incrementGenCount, generatedImages.length]);

    const handleSelectVariant = useCallback((index) => {
        setSelectedVariantIndex(index);
        setConfirmedImage(null);
    }, []);

    const handleConfirm2D = useCallback(() => {
        if (selectedVariantIndex < 0) return;
        const image = generatedImages[selectedVariantIndex];
        setConfirmedImage(image);
        onProceedTo3D(image);
    }, [selectedVariantIndex, generatedImages, onProceedTo3D]);

    const handleProceedTo3D = useCallback(() => {
        if (selectedVariantIndex < 0) return;
        const image = generatedImages[selectedVariantIndex];
        setConfirmedImage(image);
        onProceedTo3D(image);
    }, [selectedVariantIndex, generatedImages, onProceedTo3D]);

    const handleDownload2D = useCallback(() => {
        if (selectedVariantIndex < 0 || !generatedImages[selectedVariantIndex]) {
            alert('没有可下载的图片，请先生成');
            return;
        }
        const link = document.createElement('a');
        link.download = '2d-character.png';
        link.href = generatedImages[selectedVariantIndex];
        link.click();
    }, [selectedVariantIndex, generatedImages]);

    saveToHistoryRef.current = useCallback((generatedImageUrl, prompt, style, creativity, geometryDetail, textureQuality, sketchData) => {
        const createThumbnail = (dataUrl, callback) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const size = 100;
                canvas.width = size;
                canvas.height = size;
                const ctx = canvas.getContext('2d');
                const minSide = Math.min(img.width, img.height);
                const sx = (img.width - minSide) / 2;
                const sy = (img.height - minSide) / 2;
                ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, size, size);
                callback(canvas.toDataURL('image/jpeg', 0.7));
            };
            img.src = dataUrl;
        };
        createThumbnail(generatedImageUrl, async (thumbnail) => {
            const currentBatchId = batchIdRef.current || Date.now();
            batchIdRef.current = currentBatchId;

            const variant = { 
                index: 0,
                full_image: generatedImageUrl, 
                thumbnail, 
                prompt, 
                style, 
                creativity, 
                geometry_detail: geometryDetail, 
                texture_quality: textureQuality,
                created_at: new Date().toISOString()
            };

            if (USE_DATABASE && currentUser?.id) {
                try {
                    if (!generationIdRef.current) {
                        const result = await generationService.saveGeneration(currentUser.id, {
                            batchId: currentBatchId,
                            prompt,
                            style,
                            creativity,
                            geometryDetail,
                            textureQuality,
                            sketchUrl: sketchData,
                            variants: [variant]
                        });
                        if (result.success) {
                            generationIdRef.current = result.data.id;
                            console.log('✅ 已保存到数据库:', result.data.id);
                        } else {
                            console.error('❌ 保存到数据库失败:', result.error);
                        }
                    } else {
                        const result = await generationService.addVariant(generationIdRef.current, variant);
                        if (result.success) {
                            console.log('✅ 已添加变体到数据库');
                        } else {
                            console.error('❌ 添加变体失败:', result.error);
                        }
                    }
                } catch (error) {
                    console.error('数据库操作失败:', error);
                }
            }

            const stored = localStorage.getItem('generateHistory');
            let history = stored ? JSON.parse(stored) : [];

            const existingIndex = history.findIndex(r => r.batchId === currentBatchId);
            if (existingIndex !== -1) {
                history[existingIndex].variants.push({
                    fullImage: generatedImageUrl,
                    thumbnail,
                    prompt,
                    style,
                    creativity,
                    geometryDetail,
                    textureQuality
                });
                history[existingIndex].updatedAt = new Date().toLocaleString();
            } else {
                const newBatch = {
                    batchId: currentBatchId,
                    createdAt: new Date().toLocaleString(),
                    isFavorite: false,
                    sketchData: sketchData,
                    variants: [{
                        fullImage: generatedImageUrl,
                        thumbnail,
                        prompt,
                        style,
                        creativity,
                        geometryDetail,
                        textureQuality
                    }],
                    models: [],
                };
                history.unshift(newBatch);
            }

            if (history.length > 50) history = history.slice(0, 50);
            try {
                localStorage.setItem('generateHistory', JSON.stringify(history));
            } catch (e) {
                console.warn('存储空间不足，尝试清理旧记录后重试');
                while (history.length > 1) {
                    history.pop();
                    try {
                        localStorage.setItem('generateHistory', JSON.stringify(history));
                        break;
                    } catch (inner) {
                        continue;
                    }
                }
            }
        });
    }, [currentUser]);

    const updateHistoryWith3D = useCallback(async (modelUrl) => {
        const currentBatchId = batchIdRef.current;
        if (!currentBatchId) return;

        if (USE_DATABASE && currentUser?.id && generationIdRef.current) {
            try {
                const result = await generationService.addModel(generationIdRef.current, {
                    modelUrl,
                    modelThumbnail: modelUrl
                });
                if (result.success) {
                    console.log('✅ 已保存3D模型到数据库');
                } else {
                    console.error('❌ 保存3D模型失败:', result.error);
                }
            } catch (error) {
                console.error('数据库操作失败:', error);
            }
        }

        const stored = localStorage.getItem('generateHistory');
        if (!stored) return;
        try {
            const history = JSON.parse(stored);
            const index = history.findIndex(r => r.batchId === currentBatchId);
            if (index !== -1) {
                const batch = history[index];
                if (!batch.models) batch.models = [];
                batch.models.push({
                    modelUrl: modelUrl,
                    modelThumbnail: modelUrl,
                    createdAt: new Date().toLocaleString(),
                });
                localStorage.setItem('generateHistory', JSON.stringify(history));
            }
        } catch (e) {}
    }, [currentUser]);

    const handleLoadRecord = useCallback((batchRecord) => {
        if (batchRecord.sketchData || batchRecord.sketch_url) {
            const sketchData = batchRecord.sketchData || batchRecord.sketch_url;
            onUpdateSketchData(sketchData);
            console.log('✅ 已加载草图');
        }

        if (batchRecord.variants && batchRecord.variants.length > 0) {
            const images = batchRecord.variants.map(v => v.fullImage || v.full_image);
            setGeneratedImages(images);
            setSelectedVariantIndex(0);
            setConfirmedImage(batchRecord.variants[0].fullImage || batchRecord.variants[0].full_image);

            const first = batchRecord.variants[0];
            onUpdateParams({
                prompt: first.prompt,
                selectedStyle: first.style,
                creativity: first.creativity,
                geometryDetail: first.geometryDetail || first.geometry_detail,
                textureQuality: first.textureQuality || first.texture_quality,
            });
        }

        if (onLoadExistingModels) {
            if (batchRecord.models && batchRecord.models.length > 0) {
                const models = batchRecord.models.map((m, i) => ({
                    id: m.createdAt ? Date.now() + i : Date.now() + i,
                    url: m.modelUrl || m.model_url,
                    name: `3D 模型 ${i + 1}`,
                    createdAt: m.createdAt || batchRecord.createdAt,
                }));
                onLoadExistingModels(models);
            } else {
                onLoadExistingModels([]);
            }
        }

        batchIdRef.current = Date.now();
    }, [onUpdateParams, onLoadExistingModels, onUpdateSketchData]);

    const handleDeleteVariant = useCallback((index) => {
        setGeneratedImages(prev => prev.filter((_, i) => i !== index));
        setSelectedVariantIndex(prev => {
            if (prev === index) return -1;
            if (prev > index) return prev - 1;
            return prev;
        });
        if (selectedVariantIndex === index) {
            setConfirmedImage(null);
        }
        const currentBatchId = batchIdRef.current;
        if (!currentBatchId) return;
        const stored = localStorage.getItem('generateHistory');
        if (!stored) return;
        try {
            const history = JSON.parse(stored);
            const batchIndex = history.findIndex(r => r.batchId === currentBatchId);
            if (batchIndex !== -1) {
                history[batchIndex].variants.splice(index, 1);
                localStorage.setItem('generateHistory', JSON.stringify(history));
            }
        } catch (e) {}
    }, [selectedVariantIndex]);

    const handleDeleteModelFromHistory = useCallback((index) => {
        const currentBatchId = batchIdRef.current;
        if (!currentBatchId) return;
        const stored = localStorage.getItem('generateHistory');
        if (!stored) return;
        try {
            const history = JSON.parse(stored);
            const batchIndex = history.findIndex(r => r.batchId === currentBatchId);
            if (batchIndex !== -1 && history[batchIndex].models) {
                history[batchIndex].models.splice(index, 1);
                localStorage.setItem('generateHistory', JSON.stringify(history));
            }
        } catch (e) {}
    }, []);

    const generatedImage = useMemo(() => {
        if (selectedVariantIndex >= 0 && selectedVariantIndex < generatedImages.length) {
            return generatedImages[selectedVariantIndex];
        }
        return null;
    }, [generatedImages, selectedVariantIndex]);

    const clearGeneration = useCallback(() => {
        setGeneratedImages([]);
        setSelectedVariantIndex(-1);
        setConfirmedImage(null);
        setError(null);
        setGenerationStatus({ sketch: 'done', character: 'pending', model: 'pending' });
        setProgress(0);
        batchIdRef.current = null;
    }, []);

    const handleCancelGeneration = useCallback(() => {
        cancelRequestedRef.current = true;
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
        }
        setLoading(false);
        setProgress(0);
        setGenerationStatus({ sketch: 'done', character: 'pending', model: 'pending' });
        setError(null);
    }, []);

    return {
        loading,
        generatedImages,
        generatedImage,
        selectedVariantIndex,
        confirmedImage,
        generationStatus,
        progress,
        error,
        showAuthModal,
        showHistoryModal,
        setShowAuthModal,
        setShowHistoryModal,
        handleCropConfirm,
        handleRegenerate,
        handleSelectVariant,
        handleConfirm2D,
        handleProceedTo3D,
        handleDownload2D,
        handleLoadRecord,
        updateHistoryWith3D,
        handleDeleteVariant,
        handleDeleteModelFromHistory,
        clearGeneration,
        handleCancelGeneration,
        setGeneratedImages,
        setSelectedVariantIndex,
        setConfirmedImage,
        setGenerationStatus,
        setProgress,
        setError,
    };
}
