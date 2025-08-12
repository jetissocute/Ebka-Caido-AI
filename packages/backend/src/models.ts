import type { SDK } from "caido:plugin";
import Anthropic from '@anthropic-ai/sdk';
import { getClaudeApiKey } from './database';

export const getAvailableModels = async (sdk: SDK) => {
  try {
    const claudeApiKey = await getClaudeApiKey(sdk);
    
    if (!claudeApiKey) {
      return { success: false, error: "API key not set" };
    }
    
    // Initialize Anthropic client
    const anthropic = new Anthropic({
      apiKey: claudeApiKey,
    });
    
    // Get available models
    const models = new Anthropic.Models(anthropic);
    const modelList = await models.list();
    // Filter and format models
    let availableModels = modelList.data
      .map((model: any) => ({
        id: model.id,
        name: model.name || model.id,
        description: model.description || ''
      }));
    availableModels.reverse();
    // TODO: remove this slice, once 1 model starts properly working
    availableModels = availableModels.slice(1, availableModels.length);

    sdk.console.log(`Found ${availableModels.length} available Claude models`);
    
    return {
      success: true,
      models: availableModels
    };
  } catch (error) {
    sdk.console.error('Error getting models:'+ error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

export const createAnthropicClient = async (sdk: SDK) => {
  const claudeApiKey = await getClaudeApiKey(sdk);
  
  if (!claudeApiKey) {
    throw new Error("Claude API key not set");
  }
  
  return new Anthropic({
    apiKey: claudeApiKey,
  });
};
