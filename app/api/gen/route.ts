// 后端 API 路由 - 生成幻灯片图片
import { NextRequest, NextResponse } from "next/server";
import { ApiProtocol, ApiConfig } from "@/lib/config";
import { PresentationConfig, SlideContent } from "@/lib/types";
import { buildImageGenerationPrompt } from "@/lib/prompts";

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
 * 调用 VertexAI Compatible API
 */
async function callVertexAPI(
  config: ApiConfig,
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
 * 调用 OpenAI Compatible API - 用于图片生成
 */
async function callOpenAIImageAPI(
  config: ApiConfig,
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
 * 从 VertexAI 响应中提取图片
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      slide,
      deckTitle,
      presentationConfig,
      apiConfig,
    }: {
      slide: SlideContent;
      deckTitle: string;
      presentationConfig: PresentationConfig;
      apiConfig: ApiConfig;
    } = body;

    if (!slide || !deckTitle || !presentationConfig || !apiConfig) {
      return NextResponse.json(
        { error: "Missing required parameters" },
        { status: 400 }
      );
    }

    const fullPrompt = buildImageGenerationPrompt(
      slide,
      deckTitle,
      presentationConfig
    );

    let imageData: string;

    if (apiConfig.protocol === ApiProtocol.OPENAI) {
      // OpenAI 协议
      const response = await callOpenAIImageAPI(
        apiConfig,
        apiConfig.imageModelId,
        fullPrompt
      );

      const images = response.choices?.[0]?.message?.images;
      if (!images || images.length === 0) {
        throw new Error("No image generated");
      }

      imageData = images[0].image_url.url;
    } else {
      // VertexAI 协议
      const requestBody = {
        contents: [
          {
            role: "user",
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

      const extracted = extractImage(response);
      if (!extracted) {
        throw new Error("No image generated");
      }

      imageData = extracted;
    }

    return NextResponse.json({ imageData });
  } catch (error) {
    console.error("Generate image error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
