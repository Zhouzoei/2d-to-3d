import { useState, useCallback, useRef } from 'react';
import STYLE_PRESETS from '../config/stylePresets';

const EXPIRE_DAYS = 7;

function loadEditedPresets() {
    try {
        const stored = localStorage.getItem('editedPresets');
        if (stored) return JSON.parse(stored);
    } catch (e) {}
    return {};
}

function saveEditedPresets(data) {
    localStorage.setItem('editedPresets', JSON.stringify(data));
}

export default function useSketch({ onClearAll }) {
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

    const [showCropModal, setShowCropModal] = useState(false);
    const [tempSketchData, setTempSketchData] = useState(null);

    const [sketchData, setSketchData] = useState(null);
    const [prompt, setPrompt] = useState('');
    const [selectedStyle, setSelectedStyle] = useState('');
    const [creativity, setCreativity] = useState(0.7);
    const [geometryDetail, setGeometryDetail] = useState(0.8);
    const [textureQuality, setTextureQuality] = useState(0.9);

    const [editedPresets, setEditedPresets] = useState(() => loadEditedPresets());
    const [editingKey, setEditingKey] = useState(null);
    const [editingLabel, setEditingLabel] = useState('');
    const [editingPrompt, setEditingPrompt] = useState('');

    const originalPresetsRef = useRef(null);

    const isEditMode = selectedStyle === '自定义';

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
        onClearAll();
    }, [onClearAll]);

    const handleGenerate = useCallback(() => {
        if (!sketchData) { alert('请先绘制草图'); return; }
        if (!prompt.trim()) { alert('请输入文字描述'); return; }
        setTempSketchData(sketchData);
        setShowCropModal(true);
    }, [sketchData, prompt]);

    const handleStyleClick = useCallback((styleKey) => {
        if (styleKey === '自定义') {
            if (isEditMode) {
                setSelectedStyle('');
                setEditingKey(null);
            } else {
                originalPresetsRef.current = JSON.parse(JSON.stringify(STYLE_PRESETS.slice(0, 5)));
                setSelectedStyle('自定义');
                setEditingKey(null);
            }
            return;
        }
        if (isEditMode) {
            const basePreset = STYLE_PRESETS.find(s => s.key === styleKey);
            if (!basePreset) return;
            setEditingKey(styleKey);
            setEditingLabel(editedPresets[styleKey]?.label ?? basePreset.label);
            setEditingPrompt(editedPresets[styleKey]?.prompt ?? basePreset.prompt);
            return;
        }
        setSelectedStyle(styleKey === selectedStyle ? '' : styleKey);
    }, [selectedStyle, isEditMode, editedPresets]);

    const handleEditFieldChange = useCallback((field, value) => {
        if (field === 'label') setEditingLabel(value);
        else setEditingPrompt(value);
    }, []);

    const handleApplyEdit = useCallback(() => {
        if (!editingKey) return;
        if (!editingLabel.trim()) return;
        setEditedPresets(prev => ({
            ...prev,
            [editingKey]: { label: editingLabel.trim(), prompt: editingPrompt.trim() }
        }));
        setEditingKey(null);
    }, [editingKey, editingLabel, editingPrompt]);

    const handleCancelEdit = useCallback(() => {
        setEditingKey(null);
    }, []);

    const handleSavePresets = useCallback(() => {
        saveEditedPresets(editedPresets);
        setSelectedStyle('');
        setEditingKey(null);
    }, [editedPresets]);

    const handleCancelEdits = useCallback(() => {
        setEditedPresets({});
        saveEditedPresets({});
        setSelectedStyle('');
        setEditingKey(null);
    }, []);

    const getStyleLabel = useCallback((styleKey) => {
        if (styleKey === '自定义') return '自定义';
        return editedPresets[styleKey]?.label ?? STYLE_PRESETS.find(s => s.key === styleKey)?.label ?? styleKey;
    }, [editedPresets]);

    const getStylePrompt = useCallback((styleKey) => {
        if (editedPresets[styleKey]) return editedPresets[styleKey].prompt;
        const preset = STYLE_PRESETS.find(s => s.key === styleKey);
        return preset ? preset.prompt : '';
    }, [editedPresets]);

    const hasEdits = Object.keys(editedPresets).length > 0;

    const getTextureQualityText = useCallback((val) => {
        if (val >= 0.7) return '高';
        if (val >= 0.4) return '中';
        return '低';
    }, []);

    return {
        showWelcome,
        showOnboarding,
        showCropModal,
        tempSketchData,
        sketchData,
        prompt,
        selectedStyle,
        creativity,
        geometryDetail,
        textureQuality,
        isEditMode,
        editingKey,
        editingLabel,
        editingPrompt,
        hasEdits,
        handleEnterApp,
        setShowWelcome,
        setShowOnboarding,
        setShowCropModal,
        setTempSketchData,
        setSketchData,
        setPrompt,
        setSelectedStyle,
        setCreativity,
        setGeometryDetail,
        setTextureQuality,
        handleOnboardingComplete,
        handleOnboardingSkip,
        handleSketchChange,
        handleGenerate,
        handleStyleClick,
        handleEditFieldChange,
        handleApplyEdit,
        handleCancelEdit,
        handleSavePresets,
        handleCancelEdits,
        getStyleLabel,
        getStylePrompt,
        getTextureQualityText,
    };
}
