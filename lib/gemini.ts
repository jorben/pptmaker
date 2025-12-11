const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta';

if (!process.env.GEMINI_API_KEY) {
  throw new Error('Missing GEMINI_API_KEY environment variable');
}

const apiKey = process.env.GEMINI_API_KEY;

// 默认使用 Gemini 2.0 Flash
export const DEFAULT_MODEL = 'gemini-2.0-flash-exp';

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
}

// 流式生成内容
export async function* streamGenerateContent(
  prompt: string,
  modelName: string = DEFAULT_MODEL
) {
  const url = `${GEMINI_API_BASE}/models/${modelName}:streamGenerateContent?alt=sse&key=${apiKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMessage = (errorData as { error?: { message?: string } })?.error?.message || response.statusText;
    throw new Error(`Gemini API error: ${errorMessage}`);
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('No response body');
  }

  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const jsonStr = line.slice(6);
        if (jsonStr.trim()) {
          try {
            const data = JSON.parse(jsonStr) as GeminiResponse;
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
            if (text) {
              yield text;
            }
          } catch {
            // Skip invalid JSON
          }
        }
      }
    }
  }
}

// 非流式生成内容
export async function generateContent(
  prompt: string,
  modelName: string = DEFAULT_MODEL
): Promise<string> {
  const url = `${GEMINI_API_BASE}/models/${modelName}:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMessage = (errorData as { error?: { message?: string } })?.error?.message || response.statusText;
    throw new Error(`Gemini API error: ${errorMessage}`);
  }

  const data = (await response.json()) as GeminiResponse;
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}
