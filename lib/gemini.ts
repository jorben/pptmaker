import { GoogleGenerativeAI } from '@google/genai';

if (!process.env.GEMINI_API_KEY) {
  throw new Error('Missing GEMINI_API_KEY environment variable');
}

// 初始化 Google Generative AI SDK
export const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// 默认使用 Gemini 2.0 Flash
export const DEFAULT_MODEL = 'gemini-2.0-flash-exp';

// 获取模型实例
export function getModel(modelName: string = DEFAULT_MODEL) {
  return genAI.getGenerativeModel({ model: modelName });
}

// 流式生成内容
export async function* streamGenerateContent(
  prompt: string,
  modelName: string = DEFAULT_MODEL
) {
  const model = getModel(modelName);
  const result = await model.generateContentStream(prompt);

  for await (const chunk of result.stream) {
    const text = chunk.text();
    if (text) {
      yield text;
    }
  }
}

// 非流式生成内容
export async function generateContent(
  prompt: string,
  modelName: string = DEFAULT_MODEL
): Promise<string> {
  const model = getModel(modelName);
  const result = await model.generateContent(prompt);
  return result.response.text();
}
