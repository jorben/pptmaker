import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(timestamp: number): string {
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(timestamp);
}

/**
 * 清理 JSON 字符串，移除可能的 markdown 代码块包裹
 * @param text - 可能包含 markdown 代码块的 JSON 字符串
 * @returns 清理后的纯 JSON 字符串
 * @example
 * cleanJsonString('```json\n{"key": "value"}\n```') // => '{"key": "value"}'
 * cleanJsonString('{"key": "value"}') // => '{"key": "value"}'
 */
export function cleanJsonString(text: string): string {
  let cleaned = text.trim();
  
  // 移除 ```json 和 ``` 包裹
  const jsonCodeBlockRegex = /^```(?:json)?\s*\n?([\s\S]*?)\n?```$/;
  const match = cleaned.match(jsonCodeBlockRegex);
  if (match) {
    cleaned = match[1].trim();
  }
  
  return cleaned;
}
