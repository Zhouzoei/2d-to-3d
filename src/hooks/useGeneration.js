import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { generationService } from '../lib/generationService';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
const USE_MOCK = localStorage.getItem('mock') === 'true';
const USE_DATABASE = true;

export default function useGeneration({
    sketchData,
    positivePrompt,
    negativePrompt,
    selectedStyle,
    adherenceToSketch,
    steps,
    sketchType,
    seed,
    seedLocked,
    getStylePrompt,
    onUpdateSketchData,
    onProceedTo3D,
    onUpdateParams,
    onRandomizeSeed,
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
    const originalSketchRef = useRef(null);
    const paramsRef = useRef({ positivePrompt, negativePrompt, selectedStyle, adherenceToSketch, steps, sketchType, seed });
    const continueGenerateRef = useRef(null);
    const batchIdRef = useRef(null);
    const generationIdRef = useRef(null);
    const abortControllerRef = useRef(null);
    const cancelRequestedRef = useRef(false);

    useEffect(() => { sketchDataRef.current = sketchData; }, [sketchData]);
    useEffect(() => {
        paramsRef.current = { positivePrompt, negativePrompt, selectedStyle, adherenceToSketch, steps, sketchType, seed };
    }, [positivePrompt, negativePrompt, selectedStyle, adherenceToSketch, steps, sketchType, seed]);

    const callGenerateAPI = useCallback(async (finalSketchData, signal) => {
        const { positivePrompt: pp, negativePrompt: np, selectedStyle: s, adherenceToSketch: ats, steps: st, sketchType: skt, seed: sd } = paramsRef.current;

        // 映射逻辑：将 adherenceToSketch 转换为 controlnet_strength 和 denoise
        const controlnetStrength = ats * 0.5 + 0.35;  // 范围: 0.35 - 0.85
        const denoise = -ats * 0.25 + 0.6;  // 范围: 0.35 - 0.60

        let effectivePositivePrompt = pp;
        if (s) {
            const stylePrompt = getStylePrompt(s);
            if (stylePrompt) {
                effectivePositivePrompt = pp ? `${pp}, ${stylePrompt}` : stylePrompt;
            }
        }

        if (USE_MOCK) {
            const { mockGenerate } = await import('../mock/mockApi');
            return await mockGenerate(effectivePositivePrompt, s);
        }
        const blob = await (await fetch(finalSketchData)).blob();
        const file = new File([blob], 'sketch.png', { type: 'image/png' });
        const formData = new FormData();
        formData.append('sketch', file);
        formData.append('positive_prompt', effectivePositivePrompt);
        formData.append('negative_prompt', np || '');
        formData.append('controlnet_strength', controlnetStrength.toString());
        formData.append('denoise', denoise.toString());
        formData.append('steps', st.toString());
        formData.append('sketch_type', skt);
        formData.append('seed', sd.toString());
        const response = await fetch(`${API_URL}/generate`, {
            method: 'POST', body: formData, signal,
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `服务器错误：${response.status}`);
        }
        return await response.json();
    }, [getStylePrompt]);

    const extractImagesFromResponse = useCallback((data) => {
        if (data.images && Array.isArray(data.images)) {
            return data.images.map(b64 => `data:image/png;base64,${b64}`);
        }
        if (data.image_base64) {
            return [`data:image/png;base64,${data.image_base64}`];
        }
        return [];
    }, []);

    // 使用 useCallback 避免每次渲染重新创建，但在依赖数组中跳过 no-use-before-define
    const saveBatchToHistory = useCallback((imageUrls, positivePrompt, negativePrompt, style, adherenceToSketch, steps, sketchType, seed, sketchData) => {
        const capturedBatchId = batchIdRef.current || Date.now();
        batchIdRef.current = capturedBatchId;

        const saveBatch = () => {
            // 同步构建变体数据（直接存 fullImage 作为 thumbnail，浏览器 img 自动缩放）
            const allVariants = imageUrls.map(url => ({
                fullImage: url,
                thumbnail: url,
                positivePrompt,
                negativePrompt,
                style,
                adherenceToSketch,
                steps,
                sketchType
            }));

            // 数据库
            if (USE_DATABASE && currentUser?.id) {
                const variantsForDb = allVariants.map(v => ({
                    full_image: v.fullImage,
                    thumbnail: v.thumbnail,
                    positive_prompt: v.positivePrompt,
                    negative_prompt: v.negativePrompt,
                    style: v.style,
                    adherence_to_sketch: v.adherenceToSketch,
                    steps: v.steps,
                    sketch_type: v.sketchType,
                    seed,
                    created_at: new Date().toISOString()
                }));
                generationService.saveGeneration(currentUser.id, {
                    batchId: capturedBatchId,
                    positivePrompt,
                    negativePrompt,
                    style,
                    adherenceToSketch,
                    steps,
                    sketchType,
                    seed,
                    sketchUrl: sketchData,
                    variants: variantsForDb
                }).then(result => {
                    if (result.success) {
                        generationIdRef.current = result.data.id;
                        console.log('✅ 已保存到数据库:', result.data.id, `(${allVariants.length} 张)`);
                    } else {
                        console.error('❌ 保存到数据库失败:', result.error);
                    }
                }).catch(error => {
                    console.error('数据库操作失败:', error);
                });
            }

            // localStorage — 先移除同 batchId 的旧记录，再按 sketchData 合并
            const stored = localStorage.getItem('generateHistory');
            let history = stored ? JSON.parse(stored) : [];
            history = history.filter(r => r.batchId !== capturedBatchId);

            let matchIndex = -1;
            if (sketchData) {
                matchIndex = history.findIndex(r => r.sketchData === sketchData);
            }

            if (matchIndex !== -1) {
                for (const v of allVariants) {
                    const exists = history[matchIndex].variants.some(e => e.fullImage === v.fullImage);
                    if (!exists) history[matchIndex].variants.push(v);
                }
                history[matchIndex].updatedAt = new Date().toLocaleString();
            } else {
                history.unshift({
                    batchId: capturedBatchId,
                    createdAt: new Date().toLocaleString(),
                    isFavorite: false,
                    sketchData,
                    variants: allVariants,
                    models: [],
                });
            }

            if (history.length > 50) history = history.slice(0, 50);
            try {
                localStorage.setItem('generateHistory', JSON.stringify(history));
            } catch (e) {
                console.warn('存储空间不足，尝试清理旧记录后重试');
                while (history.length > 1) {
                    history.pop();
                    try { localStorage.setItem('generateHistory', JSON.stringify(history)); break; }
                    catch (inner) { continue; }
                }
            }
        };

        saveBatch();
    }, [currentUser]);

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
            const imageUrls = extractImagesFromResponse(data);
            if (imageUrls.length > 0) {
                setGeneratedImages(imageUrls);
                setSelectedVariantIndex(0);
                const { positivePrompt: pp, negativePrompt: np, selectedStyle: s, adherenceToSketch: ats, steps: st, sketchType: skt, seed: sd } = paramsRef.current;
                saveBatchToHistory(imageUrls, pp, np, s, ats, st, skt, sd, originalSketchData || originalSketchRef.current || finalSketchData);
                setGenerationStatus({ sketch: 'done', character: 'done', model: 'pending' });
                setProgress(100);
                setTimeout(() => setProgress(0), 2000);
                if (currentUser) incrementGenCount();
                // 如果 seed 未锁定，生成完成后随机化
                if (!seedLocked && onRandomizeSeed) {
                    onRandomizeSeed();
                }
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
    // eslint-disable-next-line no-use-before-define
    }, [callGenerateAPI, currentUser, incrementGenCount, seedLocked, onRandomizeSeed, extractImagesFromResponse, saveBatchToHistory]);

    const handleCropConfirm = useCallback(async (croppedImageData, originalSketchData) => {
        onCloseCropModal();
        onUpdateSketchData(croppedImageData);
        // 保存裁切前的原始草图用于历史记录
        if (originalSketchData) {
            originalSketchRef.current = originalSketchData;
        }
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
            const imageUrls = extractImagesFromResponse(data);
            if (imageUrls.length > 0) {
                setGeneratedImages(prev => [...prev, ...imageUrls]);
                setSelectedVariantIndex(generatedImages.length);
                setConfirmedImage(null);
                const { positivePrompt: pp, negativePrompt: np, selectedStyle: s, adherenceToSketch: ats, steps: st, sketchType: skt, seed: sd } = paramsRef.current;
                saveBatchToHistory(imageUrls, pp, np, s, ats, st, skt, sd, originalSketchRef.current || currentSketchData);
                setGenerationStatus({ sketch: 'done', character: 'done', model: 'pending' });
                setProgress(100);
                setTimeout(() => setProgress(0), 2000);
                if (currentUser) incrementGenCount();
                // 如果 seed 未锁定，生成完成后随机化
                if (!seedLocked && onRandomizeSeed) {
                    onRandomizeSeed();
                }
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
    // eslint-disable-next-line no-use-before-define
    }, [callGenerateAPI, currentUser, incrementGenCount, generatedImages.length, seedLocked, onRandomizeSeed, extractImagesFromResponse, saveBatchToHistory]);

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
                positivePrompt: first.positivePrompt || first.positive_prompt || first.prompt,
                negativePrompt: first.negativePrompt || first.negative_prompt || '',
                selectedStyle: first.style,
                adherenceToSketch: first.adherenceToSketch || first.adherence_to_sketch,
                steps: first.steps || 30,
                sketchType: first.sketchType || first.sketch_type || 'scribble',
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
