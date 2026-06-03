import { supabase } from './supabase';

export const generationService = {
  async saveGeneration(userId, generationData) {
    try {
      const { data, error } = await supabase
        .from('generations')
        .insert({
          user_id: userId,
          batch_id: generationData.batchId,
          custom_name: generationData.customName || '',
          is_favorite: false,
          sketch_url: generationData.sketchUrl || null,
          positive_prompt: generationData.positivePrompt,
          negative_prompt: generationData.negativePrompt || '',
          style: generationData.style,
          steps: generationData.steps,
          sketch_type: generationData.sketchType,
          seed: generationData.seed,
          variants: generationData.variants || [],
          models: []
        })
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('保存生成记录失败:', error);
      return { success: false, error: error.message };
    }
  },

  async addVariant(generationId, variant) {
    try {
      const { data: current, error: fetchError } = await supabase
        .from('generations')
        .select('variants')
        .eq('id', generationId)
        .single();

      if (fetchError) throw fetchError;

      const updatedVariants = [...(current.variants || []), variant];

      const { data, error } = await supabase
        .from('generations')
        .update({ variants: updatedVariants })
        .eq('id', generationId)
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('添加变体失败:', error);
      return { success: false, error: error.message };
    }
  },

  async addVariants(generationId, newVariants) {
    try {
      const { data: current, error: fetchError } = await supabase
        .from('generations')
        .select('variants')
        .eq('id', generationId)
        .single();

      if (fetchError) throw fetchError;

      const updatedVariants = [...(current.variants || []), ...newVariants];

      const { data, error } = await supabase
        .from('generations')
        .update({ variants: updatedVariants })
        .eq('id', generationId)
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('添加多个变体失败:', error);
      return { success: false, error: error.message };
    }
  },

  async confirmVariant(generationId, variantIndex) {
    try {
      const { data, error } = await supabase
        .from('generations')
        .update({ confirmed_variant_index: variantIndex })
        .eq('id', generationId)
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('确认变体失败:', error);
      return { success: false, error: error.message };
    }
  },

  async addModel(generationId, modelData) {
    try {
      const { data: current, error: fetchError } = await supabase
        .from('generations')
        .select('models')
        .eq('id', generationId)
        .single();

      if (fetchError) throw fetchError;

      const updatedModels = [...(current.models || []), {
        model_url: modelData.modelUrl,
        model_thumbnail: modelData.modelThumbnail,
        created_at: new Date().toISOString()
      }];

      const { data, error } = await supabase
        .from('generations')
        .update({ models: updatedModels })
        .eq('id', generationId)
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('添加模型失败:', error);
      return { success: false, error: error.message };
    }
  },

  async getGenerations(userId, limit = 50) {
    try {
      const { data, error } = await supabase
        .from('generations')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('获取生成记录失败:', error);
      return { success: false, error: error.message };
    }
  },

  async getGeneration(generationId) {
    try {
      const { data, error } = await supabase
        .from('generations')
        .select('*')
        .eq('id', generationId)
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('获取生成记录失败:', error);
      return { success: false, error: error.message };
    }
  },

  async toggleFavorite(generationId, isFavorite) {
    try {
      const { data, error } = await supabase
        .from('generations')
        .update({ is_favorite: isFavorite })
        .eq('id', generationId)
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('切换收藏失败:', error);
      return { success: false, error: error.message };
    }
  },

  async updateCustomName(generationId, customName) {
    try {
      const { data, error } = await supabase
        .from('generations')
        .update({ custom_name: customName })
        .eq('id', generationId)
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('更新名称失败:', error);
      return { success: false, error: error.message };
    }
  },

  async deleteGeneration(generationId) {
    try {
      const { error } = await supabase
        .from('generations')
        .delete()
        .eq('id', generationId);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('删除生成记录失败:', error);
      return { success: false, error: error.message };
    }
  }
};

export const storageService = {
  async uploadImage(imageBase64, userId, fileName) {
    try {
      let base64Data = imageBase64;
      if (imageBase64.includes(',')) {
        base64Data = imageBase64.split(',')[1];
      }

      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'image/png' });

      const path = `${userId}/${fileName}`;

      const { error } = await supabase.storage
        .from('images')
        .upload(path, blob, {
          cacheControl: '3600',
          upsert: true
        });

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('images')
        .getPublicUrl(path);

      return { success: true, url: publicUrl };
    } catch (error) {
      console.error('上传图片失败:', error);
      return { success: false, error: error.message };
    }
  },

  async uploadModel(modelBase64, userId, fileName) {
    try {
      let base64Data = modelBase64;
      if (modelBase64.includes(',')) {
        base64Data = modelBase64.split(',')[1];
      }

      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'application/octet-stream' });

      const path = `${userId}/${fileName}`;

      const { error } = await supabase.storage
        .from('models')
        .upload(path, blob, {
          cacheControl: '3600',
          upsert: true
        });

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('models')
        .getPublicUrl(path);

      return { success: true, url: publicUrl };
    } catch (error) {
      console.error('上传模型失败:', error);
      return { success: false, error: error.message };
    }
  }
};
