// OpenAI Compatible API - 前端直接调用

import { VertexApiConfig } from "./api";
import { PresentationConfig, SlideContent } from "./types";
import { cleanJsonString } from "./utils";
import {
  buildPlanningSystemPrompt,
  buildPlanningUserPrompt,
  getPlanningOutputFormatHint,
  buildImageGenerationPrompt,
} from "./prompts";

interface OpenAIMessage {
  role: "system" | "user" | "assistant";
  content: string | Array<{ type: string; text?: string; image_url?: { url: string } }>;
}

interface OpenAIImageInfo {
  image_url: {
    url: string;
  };
}

interface OpenAIResponse {
  choices?: Array<{
    message?: {
      content?: string;
      images?: OpenAIImageInfo[];
    };
  }>;
}

/**
 * 调用 OpenAI Compatible API (Chat Completions)
 */
async function callOpenAIChatAPI(
  config: VertexApiConfig,
  model: string,
  messages: OpenAIMessage[],
  responseFormat?: { type: string },
  timeoutMs: number = 180000,
  onChunk?: (text: string) => void
): Promise<OpenAIResponse> {
  const url = `${config.apiBase}/chat/completions`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const requestBody: Record<string, unknown> = {
      model,
      messages,
      stream: !!onChunk,
    };

    if (responseFormat) {
      requestBody.response_format = responseFormat;
    }

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
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

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ") && line !== "data: [DONE]") {
            try {
              const data = JSON.parse(line.slice(6));
              const content = data.choices?.[0]?.delta?.content || "";
              if (content) {
                onChunk(content);
                fullText += content;
              }
            } catch {
              // Ignore parse errors for partial chunks
            }
          }
        }
      }
      
      return {
        choices: [{ message: { content: fullText } }]
      };
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
 * 调用 OpenAI Compatible API (Chat Completions) - 用于图片生成
 */
async function callOpenAIImageAPI(
  config: VertexApiConfig,
  model: string,
  prompt: string,
  timeoutMs: number = 180000
): Promise<OpenAIResponse> {
  const url = `${config.apiBase}/chat/completions`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        modalities: ["image", "text"],
      }),
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
function extractText(response: OpenAIResponse): string {
  const text = response.choices?.[0]?.message?.content;
  if (!text) {
    throw new Error("No text in response");
  }
  return text;
}

/**
 * 规划演示文稿结构 (OpenAI)
 */
export async function planPresentationOpenAI(
  config: VertexApiConfig,
  document: string,
  presentationConfig: PresentationConfig,
  onChunk?: (text: string) => void
): Promise<{ title: string; slides: SlideContent[] }> {
  const systemPrompt = buildPlanningSystemPrompt(presentationConfig) + getPlanningOutputFormatHint();

  const messages: OpenAIMessage[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: buildPlanningUserPrompt(document) },
  ];

  const response = await callOpenAIChatAPI(
    config,
    config.contentModelId,
    messages,
    { type: "json_object" },
    180000,
    onChunk
  );
  const text = extractText(response);
  const cleanedText = cleanJsonString(text);
  return JSON.parse(cleanedText);
}

/**
 * 生成幻灯片图片 (OpenAI)
 */
export async function generateSlideImageOpenAI(
  config: VertexApiConfig,
  slide: SlideContent,
  deckTitle: string,
  presentationConfig: PresentationConfig
): Promise<string> {
  const fullPrompt = buildImageGenerationPrompt(slide, deckTitle, presentationConfig);

  const response = await callOpenAIImageAPI(
    config,
    config.imageModelId,
    fullPrompt
  );

  const images = response.choices?.[0]?.message?.images;
  if (!images || images.length === 0) {
    throw new Error("No image generated");
  }

  return images[0].image_url.url;
}
