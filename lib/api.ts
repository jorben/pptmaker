// API 调用 - 通过后端路由避免跨域问题

import { getApiConfig } from "./config";
import { PresentationConfig, SlideContent } from "./types";

/**
 * 规划演示文稿结构 - 调用后端 API (流式)
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

  const response = await fetch("/api/plan", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      document,
      presentationConfig,
      apiConfig,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMessage =
      (errorData as { error?: string })?.error || response.statusText;
    throw new Error(errorMessage);
  }

  // 处理流式响应
  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error("No response body");
  }

  const decoder = new TextDecoder();
  let buffer = "";
  let result: { title: string; slides: SlideContent[] } | null = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (line.startsWith("data: ")) {
        const data = line.slice(6);
        try {
          const parsed = JSON.parse(data);
          
          if (parsed.error) {
            throw new Error(parsed.error);
          }
          
          if (parsed.chunk && onChunk) {
            onChunk(parsed.chunk);
          }
          
          if (parsed.done && parsed.result) {
            result = parsed.result;
          }
        } catch (e) {
          // 如果是 JSON 解析错误，忽略；如果是业务错误，抛出
          if (e instanceof Error && e.message !== "Unexpected end of JSON input") {
            throw e;
          }
        }
      }
    }
  }

  if (!result) {
    throw new Error("No result received from stream");
  }

  return result;
}

/**
 * 生成幻灯片图片 - 调用后端 API
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

  const response = await fetch("/api/gen", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      slide,
      deckTitle,
      presentationConfig,
      apiConfig,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMessage =
      (errorData as { error?: string })?.error || response.statusText;
    throw new Error(errorMessage);
  }

  const data = await response.json();
  return data.imageData;
}
