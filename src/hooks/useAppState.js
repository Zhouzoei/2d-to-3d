import { useUser } from '../UserContext';
import useSketch from './useSketch';
import useGeneration from './useGeneration';
import use3D from './use3D';

export default function useAppState() {
    const { currentUser, incrementGenCount } = useUser();

    const sketch = useSketch({
        onClearAll: () => {
            gen.clearGeneration();
            model3d.clear3D();
            if (localStorage.getItem('mock') === 'true') {
                import('../mock/mockApi').then(m => { m.resetMockCount(); m.resetModelCount(); });
            }
        },
    });

    const gen = useGeneration({
        sketchData: sketch.sketchData,
        prompt: sketch.prompt,
        selectedStyle: sketch.selectedStyle,
        creativity: sketch.creativity,
        geometryDetail: sketch.geometryDetail,
        textureQuality: sketch.textureQuality,
        getStylePrompt: sketch.getStylePrompt,
        onUpdateSketchData: (data) => sketch.setSketchData(data),
        onProceedTo3D: (imageData) => model3d.start3DGeneration(imageData),
        onUpdateParams: (params) => {
            if (params.prompt !== undefined) sketch.setPrompt(params.prompt);
            if (params.selectedStyle !== undefined) sketch.setSelectedStyle(params.selectedStyle);
            if (params.creativity !== undefined) sketch.setCreativity(params.creativity);
            if (params.geometryDetail !== undefined) sketch.setGeometryDetail(params.geometryDetail);
            if (params.textureQuality !== undefined) sketch.setTextureQuality(params.textureQuality);
        },
        onCloseCropModal: () => sketch.setShowCropModal(false),
        currentUser,
        incrementGenCount,
        onLoadExistingModels: (models) => model3d.loadExistingModels(models),
    });

    const model3d = use3D({
        confirmedImage: gen.confirmedImage,
        onModelGenerationStart: () => gen.setGenerationStatus(prev => ({ ...prev, model: 'active' })),
        onModelGenerationComplete: () => gen.setGenerationStatus(prev => ({ ...prev, model: 'done' })),
        onModelGenerationError: () => gen.setGenerationStatus(prev => ({ ...prev, model: 'error' })),
        onProgress: (pct) => gen.setProgress(pct),
        on3DComplete: (modelThumbnail) => gen.updateHistoryWith3D(modelThumbnail),
        onDeleteModelFromHistory: (index) => gen.handleDeleteModelFromHistory(index),
    });

    return {
        showWelcome: sketch.showWelcome,
        showOnboarding: sketch.showOnboarding,
        showAuthModal: gen.showAuthModal,
        showCropModal: sketch.showCropModal,
        showHistoryModal: gen.showHistoryModal,
        tempSketchData: sketch.tempSketchData,

        sketchData: sketch.sketchData,
        prompt: sketch.prompt,
        loading: gen.loading,
        isDownloading: model3d.isDownloading,
        selectedStyle: sketch.selectedStyle,
        creativity: sketch.creativity,
        geometryDetail: sketch.geometryDetail,
        textureQuality: sketch.textureQuality,

        isEditMode: sketch.isEditMode,
        editingKey: sketch.editingKey,
        editingLabel: sketch.editingLabel,
        editingPrompt: sketch.editingPrompt,
        hasEdits: sketch.hasEdits,

        generatedImage: gen.generatedImage,
        generatedImages: gen.generatedImages,
        selectedVariantIndex: gen.selectedVariantIndex,
        confirmedImage: gen.confirmedImage,

        show3DPreview: model3d.show3DPreview,
        generatedModels: model3d.generatedModels,
        selectedModelIndex: model3d.selectedModelIndex,
        currentModelUrl: model3d.currentModelUrl,

        generationStatus: gen.generationStatus,
        progress: gen.progress,
        error: gen.error,

        setShowAuthModal: gen.setShowAuthModal,
        setShowCropModal: sketch.setShowCropModal,
        setShowHistoryModal: gen.setShowHistoryModal,

        setPrompt: sketch.setPrompt,
        setCreativity: sketch.setCreativity,
        setGeometryDetail: sketch.setGeometryDetail,
        setTextureQuality: sketch.setTextureQuality,

        handleEnterApp: sketch.handleEnterApp,
        handleOnboardingComplete: sketch.handleOnboardingComplete,
        handleOnboardingSkip: sketch.handleOnboardingSkip,

        handleSketchChange: sketch.handleSketchChange,
        handleGenerate: sketch.handleGenerate,
        handleCropConfirm: gen.handleCropConfirm,

        handleRegenerate: gen.handleRegenerate,
        handleSelectVariant: gen.handleSelectVariant,
        handleDeleteVariant: gen.handleDeleteVariant,
        handleConfirm2D: gen.handleConfirm2D,
        handleProceedTo3D: gen.handleProceedTo3D,

        handleRegenerate3D: model3d.handleRegenerate3D,
        handleSelectModel: model3d.handleSelectModel,
        handleDeleteModel: model3d.handleDeleteModel,

        handleDownload2D: gen.handleDownload2D,
        handleDownload3D: model3d.handleDownload3D,

        getTextureQualityText: sketch.getTextureQualityText,
        handleStyleClick: sketch.handleStyleClick,
        getStyleLabel: sketch.getStyleLabel,
        handleEditFieldChange: sketch.handleEditFieldChange,
        handleApplyEdit: sketch.handleApplyEdit,
        handleCancelEdit: sketch.handleCancelEdit,
        handleSavePresets: sketch.handleSavePresets,
        handleCancelEdits: sketch.handleCancelEdits,
        handleLoadRecord: gen.handleLoadRecord,
        handleCancelGeneration: gen.handleCancelGeneration,
        setShowWelcome: sketch.setShowWelcome,
        setShowOnboarding: sketch.setShowOnboarding,
    };
}
