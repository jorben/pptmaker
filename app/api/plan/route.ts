// 后端 API 路由 - 规划演示文稿 (流式传输)
import { NextRequest } from "next/server";
import { ApiProtocol, ApiConfig } from "@/lib/config";
import { PresentationConfig } from "@/lib/types";
import { cleanJsonString } from "@/lib/utils";
import {
  buildPlanningSystemPrompt,
  buildPlanningUserPrompt,
  getPlanningResponseSchema,
  getPlanningOutputFormatHint,
} from "@/lib/prompts";

/**
 * 流式调用 VertexAI Compatible API
 */
async function streamVertexAPI(
  config: ApiConfig,
  model: string,
  requestBody: Record<string, unknown>,
  timeoutMs: number = 180000
): Promise<Response> {
  const url = `${config.apiBase}/models/${model}:streamGenerateContent?alt=sse`;

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

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage =
        (errorData as { error?: { message?: string } })?.error?.message ||
        response.statusText;
      throw new Error(`API error: ${errorMessage}`);
    }

    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`Request timeout after ${timeoutMs / 1000} seconds`);
    }
    throw error;
  }
}

/**
 * 流式调用 OpenAI Compatible API
 */
async function streamOpenAIChatAPI(
  config: ApiConfig,
  model: string,
  messages: Array<{ role: string; content: string }>,
  responseFormat?: { type: string },
  timeoutMs: number = 180000
): Promise<Response> {
  const url = `${config.apiBase}/chat/completions`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const requestBody: Record<string, unknown> = {
      model,
      messages,
      stream: true,
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
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage =
        (errorData as { error?: { message?: string } })?.error?.message ||
        response.statusText;
      throw new Error(`API error: ${errorMessage}`);
    }

    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`Request timeout after ${timeoutMs / 1000} seconds`);
    }
    throw error;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      document,
      presentationConfig,
      apiConfig,
    }: {
      document: string;
      presentationConfig: PresentationConfig;
      apiConfig: ApiConfig;
    } = body;

    if (!document || !presentationConfig || !apiConfig) {
      return new Response(JSON.stringify({ error: "Missing required parameters" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 创建 TransformStream 来处理流式响应
    const encoder = new TextEncoder();
    const stream = new TransformStream();
    const writer = stream.writable.getWriter();

    // 异步处理流式响应
    (async () => {
      let fullText = "";

      try {
        if (apiConfig.protocol === ApiProtocol.OPENAI) {
          // OpenAI 协议流式处理
          const systemPrompt =
            buildPlanningSystemPrompt(presentationConfig) +
            getPlanningOutputFormatHint();

          const messages = [
            { role: "system", content: systemPrompt },
            { role: "user", content: buildPlanningUserPrompt(document) },
          ];

          const response = await streamOpenAIChatAPI(
            apiConfig,
            apiConfig.contentModelId,
            messages,
            { type: "json_object" }
          );

          const reader = response.body?.getReader();
          if (!reader) throw new Error("No response body");

          const decoder = new TextDecoder();
          let buffer = "";

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
              if (line.startsWith("data: ")) {
                const data = line.slice(6);
                if (data === "[DONE]") continue;

                try {
                  const parsed = JSON.parse(data);
                  const content = parsed.choices?.[0]?.delta?.content;
                  if (content) {
                    fullText += content;
                    // 发送增量内容
                    await writer.write(
                      encoder.encode(`data: ${JSON.stringify({ chunk: content })}\n\n`)
                    );
                  }
                } catch {
                  // 忽略解析错误
                }
              }
            }
          }
        } else {
          // VertexAI 协议流式处理
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

          const response = await streamVertexAPI(
            apiConfig,
            apiConfig.contentModelId,
            requestBody
          );

          const reader = response.body?.getReader();
          if (!reader) throw new Error("No response body");

          const decoder = new TextDecoder();
          let buffer = "";

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
                  const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
                  if (text) {
                    fullText += text;
                    // 发送增量内容
                    await writer.write(
                      encoder.encode(`data: ${JSON.stringify({ chunk: text })}\n\n`)
                    );
                  }
                } catch {
                  // 忽略解析错误
                }
              }
            }
          }
        }

        // 解析完整的 JSON 并发送最终结果
        const cleanedText = cleanJsonString(fullText);
        const result = JSON.parse(cleanedText);
        await writer.write(
          encoder.encode(`data: ${JSON.stringify({ done: true, result })}\n\n`)
        );
      } catch (error) {
        console.error("Plan presentation error:", error);
        await writer.write(
          encoder.encode(
            `data: ${JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" })}\n\n`
          )
        );
      } finally {
        await writer.close();
      }
    })();

    return new Response(stream.readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Plan presentation error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
