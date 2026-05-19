import { useState, useCallback, useMemo, useRef, useEffect } from 'react';

const USE_MOCK = localStorage.getItem('mock') === 'true';
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

export default function use3D({
    confirmedImage,
    onModelGenerationStart,
    onModelGenerationComplete,
    onModelGenerationError,
    onProgress,
    on3DComplete,
    onDeleteModelFromHistory,
}) {
    const testModelUrl = '/assets/3d-character.obj';

    const [show3DPreview, setShow3DPreview] = useState(false);
    const [modelUrl, setModelUrl] = useState(null);
    const [generatedModels, setGeneratedModels] = useState([]);
    const [selectedModelIndex, setSelectedModelIndex] = useState(-1);
    const [isDownloading, setIsDownloading] = useState(false);

    const confirmedImageRef = useRef(confirmedImage);
    useEffect(() => { confirmedImageRef.current = confirmedImage; }, [confirmedImage]);

    const currentModelUrl = useMemo(() => {
        if (selectedModelIndex >= 0 && selectedModelIndex < generatedModels.length) {
            return generatedModels[selectedModelIndex].url;
        }
        return modelUrl || testModelUrl;
    }, [modelUrl, testModelUrl, generatedModels, selectedModelIndex]);

    const start3DGeneration = useCallback(async (imageData) => {
        setShow3DPreview(true);
        if (onModelGenerationStart) onModelGenerationStart();
        if (onProgress) onProgress(50);

        try {
            let resultUrl;
            if (USE_MOCK) {
                const { mockGenerate3D } = await import('../mock/mockApi');
                const result = await mockGenerate3D();
                resultUrl = result.modelUrl;
            } else if (imageData) {
                const blob = await (await fetch(imageData)).blob();
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
                resultUrl = data.modelUrl || testModelUrl;
            } else {
                resultUrl = testModelUrl;
            }

            const newModel = {
                id: Date.now(),
                url: resultUrl,
                name: `3D 模型 ${generatedModels.length + 1}`,
                createdAt: new Date().toLocaleString(),
            };
            setGeneratedModels(prev => [...prev, newModel]);
            setSelectedModelIndex(generatedModels.length);
            if (onModelGenerationComplete) onModelGenerationComplete();
            if (onProgress) onProgress(100);
            if (on3DComplete && resultUrl) on3DComplete(resultUrl);
            setTimeout(() => { if (onProgress) onProgress(0); }, 2000);
        } catch (err) {
            console.error('3D生成失败:', err);
            if (onModelGenerationError) onModelGenerationError();
            if (onProgress) onProgress(0);
        }
    }, [generatedModels.length, testModelUrl, onModelGenerationStart, onModelGenerationComplete, onModelGenerationError, onProgress, on3DComplete]);

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

    const handleRegenerate3D = useCallback(() => {
        if (!confirmedImageRef.current) return;
        start3DGeneration(confirmedImageRef.current);
    }, [start3DGeneration]);

    const handleSelectModel = useCallback((index) => {
        setSelectedModelIndex(index);
    }, []);

    const handleDeleteModel = useCallback((index) => {
        setGeneratedModels(prev => prev.filter((_, i) => i !== index));
        setSelectedModelIndex(prev => {
            if (prev === index) return -1;
            if (prev > index) return prev - 1;
            return prev;
        });
        if (onDeleteModelFromHistory) onDeleteModelFromHistory(index);
    }, [onDeleteModelFromHistory]);

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

    const clear3D = useCallback(() => {
        setShow3DPreview(false);
        setModelUrl(null);
        setGeneratedModels([]);
        setSelectedModelIndex(-1);
    }, []);

    const loadExistingModels = useCallback((models) => {
        if (models && models.length > 0) {
            setGeneratedModels(models);
            setSelectedModelIndex(0);
            setShow3DPreview(true);
        } else {
            setGeneratedModels([]);
            setSelectedModelIndex(-1);
            setShow3DPreview(false);
        }
    }, []);

    return {
        show3DPreview,
        modelUrl,
        generatedModels,
        selectedModelIndex,
        currentModelUrl,
        isDownloading,
        setShow3DPreview,
        setModelUrl,
        setGeneratedModels,
        setSelectedModelIndex,
        start3DGeneration,
        handleRegenerate3D,
        handleSelectModel,
        handleDeleteModel,
        handleDownload3D,
        clear3D,
        loadExistingModels,
    };
}
