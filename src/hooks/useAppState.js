import { useState, useCallback, useMemo, useRef } from 'react';
import { useUser } from '../UserContext';
import STYLE_PRESETS from '../config/stylePresets';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
const EXPIRE_DAYS = 7;

// Mock 模式：localStorage 设置 mock=true 启用，无需后端
const USE_MOCK = localStorage.getItem('mock') === 'true';

export default function useAppState() {
    const { currentUser, incrementGenCount } = useUser();

    const [showAuthModal, setShowAuthModal] = useState(false);
    const [showCropModal, setShowCropModal] = useState(false);
    const [tempSketchData, setTempSketchData] = useState(null);
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [showWelcome, setShowWelcome] = useState(() => {
        const lastVisit = localStorage.getItem('lastVisit');
        const hasSeenWelcome = localStorage.getItem('hasSeenWelcome');
        if (!hasSeenWelcome) return true;
        if (lastVisit) {
            const daysSinceLastVisit = (Date.now() - parseInt(lastVisit)) / (1000 * 60 * 60 * 24);
            if (daysSinceLastVisit >= EXPIRE_DAYS) {
                localStorage.removeItem('hasSeenWelcome');
                localStorage.removeItem('hasSeenOnboarding');
                return true;
            }
        }
        return false;
    });
    const [showOnboarding, setShowOnboarding] = useState(() => {
        const hasSeenOnboarding = localStorage.getItem('hasSeenOnboarding');
        const lastVisit = localStorage.getItem('lastVisit');
        if (showWelcome) return false;
        if (!hasSeenOnboarding) return true;
        if (lastVisit) {
            const daysSinceLastVisit = (Date.now() - parseInt(lastVisit)) / (1000 * 60 * 60 * 24);
            if (daysSinceLastVisit >= EXPIRE_DAYS) {
                localStorage.removeItem('hasSeenOnboarding');
                return true;
            }
        }
        return false;
    });

    const [sketchData, setSketchData] = useState(null);
    const [prompt, setPrompt] = useState('');
    const [loading, setLoading] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [selectedStyle, setSelectedStyle] = useState('奇幻');
    const [creativity, setCreativity] = useState(0.7);
    const [geometryDetail, setGeometryDetail] = useState(0.8);
    const [textureQuality, setTextureQuality] = useState(0.9);

    const [genMode, setGenMode] = useState('2d');
    const [generatedImages, setGeneratedImages] = useState([]);
    const [selectedVariantIndex, setSelectedVariantIndex] = useState(-1);
    const [confirmedImage, setConfirmedImage] = useState(null);
    const [show3DPreview, setShow3DPreview] = useState(false);
    const [modelUrl, setModelUrl] = useState(null);
    const [generatedModels, setGeneratedModels] = useState([]);
    const [selectedModelIndex, setSelectedModelIndex] = useState(-1);
    const [generationStatus, setGenerationStatus] = useState({
        sketch: 'done', character: 'pending', model: 'pending'
    });
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState(null);

    const testModelUrl = '/assets/3d-character.obj';

    const continueGenerateRef = useRef(null);
    const saveToHistoryRef = useRef(null);
    const run3DGenerationRef = useRef(null);

    const generatedImage = useMemo(() => {
        if (selectedVariantIndex >= 0 && selectedVariantIndex < generatedImages.length) {
            return generatedImages[selectedVariantIndex];
        }
        return null;
    }, [generatedImages, selectedVariantIndex]);

    const currentModelUrl = useMemo(() => {
        if (selectedModelIndex >= 0 && selectedModelIndex < generatedModels.length) {
            return generatedModels[selectedModelIndex].url;
        }
        return modelUrl || testModelUrl;
    }, [modelUrl, testModelUrl, generatedModels, selectedModelIndex]);

    const handleEnterApp = useCallback(() => {
        setShowWelcome(false);
        localStorage.setItem('hasSeenWelcome', 'true');
        localStorage.setItem('lastVisit', Date.now().toString());
        const hasSeenOnboarding = localStorage.getItem('hasSeenOnboarding');
        if (!hasSeenOnboarding) setShowOnboarding(true);
    }, []);

    const handleOnboardingComplete = useCallback(() => {
        setShowOnboarding(false);
        localStorage.setItem('hasSeenOnboarding', 'true');
    }, []);

    const handleOnboardingSkip = useCallback(() => {
        setShowOnboarding(false);
        localStorage.setItem('hasSeenOnboarding', 'true');
    }, []);

    const handleSketchChange = useCallback((dataURL) => {
        setSketchData(dataURL);
        setGeneratedImages([]);
        setSelectedVariantIndex(-1);
        setConfirmedImage(null);
        setShow3DPreview(false);
        setModelUrl(null);
        setGeneratedModels([]);
        setSelectedModelIndex(-1);
        setError(null);
        setGenerationStatus({ sketch: 'done', character: 'pending', model: 'pending' });
        setProgress(0);
        if (USE_MOCK) {
            import('../mock/mockApi').then(m => { m.resetMockCount(); m.resetModelCount(); });
        }
    }, []);

    const handleGenerate = useCallback(() => {
        if (!sketchData) { alert('请先绘制草图'); return; }
        if (!prompt.trim()) { alert('请输入文字描述'); return; }
        setTempSketchData(sketchData);
        setShowCropModal(true);
    }, [sketchData, prompt]);

    const handleCropConfirm = useCallback(async (croppedImageData) => {
        setShowCropModal(false);
        setSketchData(croppedImageData);
        setGeneratedImages([]);
        setSelectedVariantIndex(-1);
        setConfirmedImage(null);
        setShow3DPreview(false);
        setModelUrl(null);
        setGeneratedModels([]);
        setSelectedModelIndex(-1);
        if (USE_MOCK) {
            import('../mock/mockApi').then(m => { m.resetMockCount(); m.resetModelCount(); });
        }
        await continueGenerateRef.current(croppedImageData);
    }, []);

    const callGenerateAPI = useCallback(async (finalSketchData) => {
        if (USE_MOCK) {
            const { mockGenerate } = await import('../mock/mockApi');
            return await mockGenerate(prompt, selectedStyle);
        }
        const blob = await (await fetch(finalSketchData)).blob();
        const file = new File([blob], 'sketch.png', { type: 'image/png' });
        const formData = new FormData();
        formData.append('sketch', file);
        formData.append('prompt', prompt);
        formData.append('creativity', creativity.toString());
        formData.append('geometry_detail', geometryDetail.toString());
        formData.append('texture_quality', textureQuality.toString());
        const response = await fetch(`${API_URL}/generate`, {
            method: 'POST', body: formData,
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `服务器错误：${response.status}`);
        }
        return await response.json();
    }, [prompt, creativity, geometryDetail, textureQuality, selectedStyle]);

    continueGenerateRef.current = useCallback(async (finalSketchData) => {
        setLoading(true);
        setError(null);
        setGenerationStatus({ sketch: 'done', character: 'active', model: 'pending' });
        setProgress(20);
        try {
            setProgress(40);
            const data = await callGenerateAPI(finalSketchData);
            setProgress(70);
            if (data.image_base64) {
                const imageUrl = `data:image/png;base64,${data.image_base64}`;
                setGeneratedImages([imageUrl]);
                setSelectedVariantIndex(0);
                saveToHistoryRef.current(imageUrl, prompt, selectedStyle, creativity, geometryDetail, textureQuality);
                setGenerationStatus({ sketch: 'done', character: 'done', model: 'pending' });
                setProgress(100);
                setTimeout(() => setProgress(0), 2000);
                if (currentUser) incrementGenCount();
            } else {
                throw new Error('后端未返回图片数据');
            }
        } catch (err) {
            console.error('生成失败:', err);
            setError(err.message);
            setGenerationStatus({ sketch: 'done', character: 'error', model: 'pending' });
            setProgress(0);
        } finally {
            setLoading(false);
        }
    }, [callGenerateAPI, currentUser, incrementGenCount, prompt, selectedStyle, creativity, geometryDetail, textureQuality]);

    const handleRegenerate = useCallback(async () => {
        if (!sketchData) return;
        setLoading(true);
        setError(null);
        setGenerationStatus({ sketch: 'done', character: 'active', model: 'pending' });
        setProgress(20);
        try {
            setProgress(40);
            const data = await callGenerateAPI(sketchData);
            setProgress(70);
            if (data.image_base64) {
                const imageUrl = `data:image/png;base64,${data.image_base64}`;
                setGeneratedImages(prev => [...prev, imageUrl]);
                setSelectedVariantIndex(generatedImages.length);
                setConfirmedImage(null);
                saveToHistoryRef.current(imageUrl, prompt, selectedStyle, creativity, geometryDetail, textureQuality);
                setGenerationStatus({ sketch: 'done', character: 'done', model: 'pending' });
                setProgress(100);
                setTimeout(() => setProgress(0), 2000);
                if (currentUser) incrementGenCount();
            } else {
                throw new Error('后端未返回图片数据');
            }
        } catch (err) {
            console.error('重新生成失败:', err);
            setError(err.message);
            setGenerationStatus({ sketch: 'done', character: 'error', model: 'pending' });
            setProgress(0);
        } finally {
            setLoading(false);
        }
    }, [sketchData, callGenerateAPI, generatedImages.length, currentUser, incrementGenCount, prompt, selectedStyle, creativity, geometryDetail, textureQuality]);

    const handleSelectVariant = useCallback((index) => {
        setSelectedVariantIndex(index);
        setConfirmedImage(null);
    }, []);

    const handleConfirm2D = useCallback(() => {
        if (selectedVariantIndex < 0) return;
        const image = generatedImages[selectedVariantIndex];
        setConfirmedImage(image);
        run3DGenerationRef.current(image);
    }, [selectedVariantIndex, generatedImages]);

    const handleProceedTo3D = useCallback(() => {
        if (selectedVariantIndex < 0) return;
        const image = generatedImages[selectedVariantIndex];
        setConfirmedImage(image);
        run3DGenerationRef.current(image);
    }, [selectedVariantIndex, generatedImages]);

    run3DGenerationRef.current = useCallback(async (confirmedImageData) => {
        setShow3DPreview(true);
        setGenerationStatus(prev => ({ ...prev, model: 'active' }));
        setProgress(50);

        let modelUrl;
        if (USE_MOCK) {
            const { mockGenerate3D } = await import('../mock/mockApi');
            const result = await mockGenerate3D();
            modelUrl = result.modelUrl;
        } else if (confirmedImageData) {
            const blob = await (await fetch(confirmedImageData)).blob();
            const file = new File([blob], 'character.png', { type: 'image/png' });
            const formData = new FormData();
            formData.append('image', file);
            const response = await fetch(`${API_URL}/generate-3d`, {
                method: 'POST', body: formData,
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `3D服务器错误：${response.status}`);
            }
            const data = await response.json();
            modelUrl = data.modelUrl || testModelUrl;
        } else {
            modelUrl = testModelUrl;
        }

        const newModel = {
            id: Date.now(),
            url: modelUrl,
            name: `3D 模型 ${generatedModels.length + 1}`,
            createdAt: new Date().toLocaleString(),
        };
        setGeneratedModels(prev => [...prev, newModel]);
        setSelectedModelIndex(generatedModels.length);
        setGenerationStatus(prev => ({ ...prev, model: 'done' }));
        setProgress(100);
        setTimeout(() => setProgress(0), 2000);
    }, [generatedModels.length, testModelUrl]);

    const handleRegenerate3D = useCallback(() => {
        if (!confirmedImage) return;
        run3DGenerationRef.current(confirmedImage);
    }, [confirmedImage]);

    const handleSelectModel = useCallback((index) => {
        setSelectedModelIndex(index);
    }, []);

    const handleDownload2D = useCallback(() => {
        if (!generatedImage) { alert('没有可下载的图片，请先生成'); return; }
        const link = document.createElement('a');
        link.download = '2d-character.png';
        link.href = generatedImage;
        link.click();
    }, [generatedImage]);

    const downloadFile = useCallback(async (url, filename) => {
        try {
            const response = await fetch(url);
            const blob = await response.blob();
            const link = document.createElement('a');
            const objectUrl = URL.createObjectURL(blob);
            link.href = objectUrl;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(objectUrl);
            return true;
        } catch (error) {
            console.error(`下载 ${filename} 失败:`, error);
            return false;
        }
    }, []);

    const handleDownload3D = useCallback(async () => {
        setIsDownloading(true);
        try {
            await downloadFile('/assets/3d-character.obj', '3d-character.obj');
            await downloadFile('/assets/3d-character.mtl', '3d-character.mtl');
            await downloadFile('/assets/3d-character.BMP', '3d-character.BMP');
            alert('3D 模型下载完成！');
        } catch (error) {
            console.error('下载失败:', error);
            alert('下载失败');
        } finally {
            setIsDownloading(false);
        }
    }, [downloadFile]);

    const getTextureQualityText = useCallback((val) => {
        if (val >= 0.7) return '高';
        if (val >= 0.4) return '中';
        return '低';
    }, []);

    const handleStyleClick = useCallback((style) => {
        setSelectedStyle(style);
        const preset = STYLE_PRESETS.find(s => s.key === style);
        if (preset && preset.prompt) setPrompt(preset.prompt);
    }, []);

    saveToHistoryRef.current = useCallback((generatedImageUrl, prompt, style, creativity, geometryDetail, textureQuality) => {
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
        createThumbnail(generatedImageUrl, (thumbnail) => {
            const newRecord = {
                id: Date.now(),
                createdAt: new Date().toLocaleString(),
                thumbnail, fullImage: generatedImageUrl,
                prompt, style, creativity, geometryDetail, textureQuality,
                isFavorite: false
            };
            const stored = localStorage.getItem('generateHistory');
            let history = stored ? JSON.parse(stored) : [];
            history.unshift(newRecord);
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
    }, []);

    const handleLoadRecord = useCallback((record) => {
        if (record.fullImage) {
            setGeneratedImages([record.fullImage]);
            setSelectedVariantIndex(0);
            setConfirmedImage(null);
        }
        if (record.prompt) setPrompt(record.prompt);
        if (record.style) setSelectedStyle(record.style);
        if (record.creativity !== undefined) setCreativity(record.creativity);
        if (record.geometryDetail !== undefined) setGeometryDetail(record.geometryDetail);
        if (record.textureQuality !== undefined) setTextureQuality(record.textureQuality);
    }, []);

    return {
        showWelcome, showOnboarding, showAuthModal, showCropModal, showHistoryModal,
        tempSketchData, sketchData, prompt, loading, isDownloading, selectedStyle,
        creativity, geometryDetail, textureQuality, generatedImage, generatedImages,
        selectedVariantIndex, confirmedImage, show3DPreview, genMode,
        generatedModels, selectedModelIndex,
        generationStatus, progress, error, currentModelUrl,
        setShowAuthModal, setShowCropModal, setShowHistoryModal,
        setPrompt, setCreativity, setGeometryDetail, setTextureQuality,
        setGenMode,
        handleEnterApp, handleOnboardingComplete, handleOnboardingSkip,
        handleSketchChange, handleGenerate, handleCropConfirm,
        handleRegenerate, handleSelectVariant, handleConfirm2D, handleProceedTo3D,
        handleRegenerate3D, handleSelectModel,
        handleDownload2D, handleDownload3D, getTextureQualityText,
        handleStyleClick, handleLoadRecord,
    };
}