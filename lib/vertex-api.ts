// VertexAI Compatible API - 前端直接调用

import { getApiConfig, VertexApiConfig } from "./api";
import { SlideStyle, PresentationConfig, SlideContent } from "./types";

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
  timeoutMs: number = 180000
): Promise<GeminiResponse> {
  const url = `${config.apiBase}/models/${model}:generateContent`;

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
  presentationConfig: PresentationConfig
): Promise<{ title: string; slides: SlideContent[] }> {
  const apiConfig = getApiConfig();
  if (!apiConfig) {
    throw new Error("API not configured");
  }

  const stylePrompt =
    presentationConfig.style === SlideStyle.CUSTOM
      ? `Custom Style: ${presentationConfig.customStyleDescription}`
      : `Style: ${
          presentationConfig.style === SlideStyle.MINIMAL
            ? "Minimalist, high impact, few words"
            : "Detailed, educational, comprehensive"
        }`;

  const additionalContext = presentationConfig.additionalPrompt
    ? `\nImportant Additional Instructions from User: ${presentationConfig.additionalPrompt}`
    : "";

  const systemInstruction = `
    You are an expert presentation designer. 
    Analyze the provided input (text or document) and split it into a ${presentationConfig.pageCount}-page presentation.
    Output Language: ${presentationConfig.language}.
    ${stylePrompt}
    ${additionalContext}

    Return a JSON object with a 'title' for the whole deck and an array of 'slides'.
    For each slide, provide:
    1. 'title': The slide headline.
    2. 'bulletPoints': 3-5 key points (text only).
    3. 'visualDescription': A highly detailed, artistic description of how the slide should look visually.
  `;

  const requestBody = {
    systemInstruction: {
      parts: [{ text: systemInstruction }],
    },
    contents: [
      {
        role: "user",
        parts: [{ text: `Input Text:\n${document.substring(0, 30000)}` }],
      },
    ],
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: {
        type: "OBJECT",
        properties: {
          title: { type: "STRING" },
          slides: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: {
                title: { type: "STRING" },
                bulletPoints: { type: "ARRAY", items: { type: "STRING" } },
                visualDescription: { type: "STRING" },
              },
              required: ["title", "bulletPoints", "visualDescription"],
            },
          },
        },
        required: ["title", "slides"],
      },
    },
  };

  const response = await callVertexAPI(
    apiConfig,
    apiConfig.contentModelId,
    requestBody
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

  const styleContext =
    presentationConfig.style === SlideStyle.CUSTOM
      ? presentationConfig.customStyleDescription
      : presentationConfig.style === SlideStyle.MINIMAL
      ? "Modern, clean, lots of whitespace, corporate memphis or swiss style"
      : "Professional, structured, grid layout, academic or technical style";

  const additionalContext = presentationConfig.additionalPrompt
    ? `\nAdditional Style Requirements: ${presentationConfig.additionalPrompt}`
    : "";

  const fullPrompt = `
    Design a professional presentation slide.
    
    Context:
    Presentation Title: ${deckTitle}
    Slide Title: ${slide.title}
    Style Guide: ${styleContext}
    ${additionalContext}
    
    Visual Instructions:
    ${slide.visualDescription}
    
    Important:
    - Create a high-quality slide design.
    - Ensure the layout has clear space for text overlay.
    - Aspect Ratio 16:9.
  `;

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
