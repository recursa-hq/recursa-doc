import Anthropic from '@anthropic-ai/sdk';
import type {
  LLMRequest,
  LLMResponse,
  LLMConfig,
  StreamingCallback,
} from '../types/llm.js';

export const createLLMClient = (config: LLMConfig): LLMConfig => {
  if (!config.apiKey) {
    throw new Error('LLM API key is required');
  }

  if (!config.model) {
    throw new Error('LLM model is required');
  }

  return config;
};

export const generateCompletion = async (
  config: LLMConfig,
  request: LLMRequest,
  streamingCallback?: StreamingCallback
): Promise<LLMResponse> => {
  const client = new Anthropic({
    apiKey: config.apiKey,
    baseURL: config.baseUrl || 'https://openrouter.ai/api/v1',
  });

  try {
    const response = await client.messages.create({
      model: request.model,
      max_tokens: request.maxTokens || config.maxTokens || 4096,
      temperature: request.temperature || config.temperature || 0.7,
      messages: request.messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      })),
      stream: Boolean(streamingCallback),
    });

    if (streamingCallback) {
      for await (const chunk of response) {
        if (chunk.type === 'content_block_delta' && chunk.delta?.text) {
          streamingCallback(chunk.delta.text);
        }
      }
      return {
        content: '',
        model: request.model,
      };
    }

    const content = response.content[0];
    if (content.type === 'text') {
      const usage = response.usage;
      return {
        content: content.text,
        model: request.model,
        usage: usage
          ? {
              promptTokens: usage.input_tokens,
              completionTokens: usage.output_tokens,
              totalTokens: usage.input_tokens + usage.output_tokens,
            }
          : undefined,
      };
    }

    throw new Error('Unexpected response format from LLM');
  } catch (error) {
    throw new Error(`LLM request failed: ${error}`);
  }
};

export const streamCompletion = async (
  config: LLMConfig,
  request: LLMRequest,
  streamingCallback: StreamingCallback
): Promise<LLMResponse> => {
  return generateCompletion(config, request, streamingCallback);
};

export const validateLLMConfig = (
  config: Partial<LLMConfig>
): config is LLMConfig => {
  if (!config.apiKey || typeof config.apiKey !== 'string') {
    throw new Error('Invalid API key');
  }

  if (!config.model || typeof config.model !== 'string') {
    throw new Error('Invalid model configuration');
  }

  return true;
};

export const createSystemPrompt = (knowledgeGraphPath: string): string => {
  return `You are Recursa, a Git-Native AI agent. Your knowledge graph is located at: ${knowledgeGraphPath}

You operate in a Think-Act-Commit loop:
1. Think - Analyze the user's request and plan your approach
2. Act - Execute code using the mem API to interact with your knowledge graph
3. Commit - Use mem.commitChanges() to save your work

All mem API calls must be awaited. You can:
- Read, write, and modify files in your knowledge graph
- Query relationships between files
- Execute Git operations for versioning
- Search and analyze your knowledge graph

Respond with XML-like tags:
- <thinking> for your reasoning
- <typescript> for code to execute
- <reply> for your final response`;
};
