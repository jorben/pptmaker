// VertexAI Compatible API - 前端直接调用

import { getApiConfig, VertexApiConfig, ApiProtocol } from "./api";
import { PresentationConfig, SlideContent } from "./types";
import { planPresentationOpenAI, generateSlideImageOpenAI } from "./openai-api";
import {
  buildPlanningSystemPrompt,
  buildPlanningUserPrompt,
  getPlanningResponseSchema,
  buildImageGenerationPrompt,
} from "./prompts";

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
        inlineData?: {
          mimeType?: string;
          data?: string;
        };
      }>;
    };
  }>;
}

/**
 * 调用 VertexAI Compatible API
 * @param timeoutMs 超时时间（毫秒），默认 180 秒
 */
async function callVertexAPI(
  config: VertexApiConfig,
  model: string,
  requestBody: Record<string, unknown>,
  timeoutMs: number = 180000,
  onChunk?: (text: string) => void
): Promise<GeminiResponse> {
  let url = `${config.apiBase}/models/${model}:generateContent`;
  if (onChunk) {
    url = `${config.apiBase}/models/${model}:streamGenerateContent?alt=sse`;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": config.apiKey,
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
      referrerPolicy: "no-referrer",
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage =
        (errorData as { error?: { message?: string } })?.error?.message ||
        response.statusText;
      throw new Error(`API error: ${errorMessage}`);
    }

    if (onChunk && response.body) {
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullText = "";
      let buffer = "";
      
      // Accumulate full response structure to return compatible GeminiResponse
      const accumulatedResponse: GeminiResponse = {
        candidates: [{
          content: {
            parts: [{ text: "" }]
          }
        }]
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));
              const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
              if (text) {
                onChunk(text);
                fullText += text;
              }
            } catch {
              // Ignore
            }
          }
        }
      }

      if (accumulatedResponse.candidates?.[0]?.content?.parts?.[0]) {
        accumulatedResponse.candidates[0].content.parts[0].text = fullText;
      }
      return accumulatedResponse;
    }

    return response.json();
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`Request timeout after ${timeoutMs / 1000} seconds`);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * 从响应中提取文本
 */
function extractText(response: GeminiResponse): string {
  const text = response.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error("No text in response");
  }
  return text;
}

/**
 * 从响应中提取图片
 */
function extractImage(response: GeminiResponse): string | null {
  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData?.data) {
      const mimeType = part.inlineData.mimeType || "image/png";
      return `data:${mimeType};base64,${part.inlineData.data}`;
    }
  }
  return null;
}

/**
 * 规划演示文稿结构
 */
export async function planPresentation(
  document: string,
  presentationConfig: PresentationConfig,
  onChunk?: (text: string) => void
): Promise<{ title: string; slides: SlideContent[] }> {
  const apiConfig = getApiConfig();
  if (!apiConfig) {
    throw new Error("API not configured");
  }

  // 根据协议类型选择调用方式
  if (apiConfig.protocol === ApiProtocol.OPENAI) {
    return planPresentationOpenAI(apiConfig, document, presentationConfig, onChunk);
  }

  const systemInstruction = buildPlanningSystemPrompt(presentationConfig);

  const requestBody = {
    systemInstruction: {
      parts: [{ text: systemInstruction }],
    },
    contents: [
      {
        role: "user",
        parts: [{ text: buildPlanningUserPrompt(document) }],
      },
    ],
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: getPlanningResponseSchema(),
    },
  };

  const response = await callVertexAPI(
    apiConfig,
    apiConfig.contentModelId,
    requestBody,
    180000,
    onChunk
  );
  const text = extractText(response);
  return JSON.parse(text);
}

/**
 * 生成幻灯片图片
 */
export async function generateSlideImage(
  slide: SlideContent,
  deckTitle: string,
  presentationConfig: PresentationConfig
): Promise<string> {
  const apiConfig = getApiConfig();
  if (!apiConfig) {
    throw new Error("API not configured");
  }

  // 根据协议类型选择调用方式
  if (apiConfig.protocol === ApiProtocol.OPENAI) {
    return generateSlideImageOpenAI(apiConfig, slide, deckTitle, presentationConfig);
  }

  const fullPrompt = buildImageGenerationPrompt(slide, deckTitle, presentationConfig);

  const requestBody = {
    contents: [
      {
        parts: [{ text: fullPrompt }],
      },
    ],
    generationConfig: {
      responseModalities: ["IMAGE", "TEXT"],
    },
  };

  const response = await callVertexAPI(
    apiConfig,
    apiConfig.imageModelId,
    requestBody
  );
  const imageData = extractImage(response);

  if (!imageData) {
    throw new Error("No image generated");
  }

  return imageData;
}
