// API 配置管理 - 使用 localStorage 存储

// API 协议类型
export enum ApiProtocol {
  VERTEX_AI = 'vertex_ai',
  OPENAI = 'openai',
}

export interface ApiConfig {
  protocol: ApiProtocol;
  apiKey: string;
  apiBase: string;
  contentModelId: string;
  imageModelId: string;
}

const STORAGE_KEY = 'api_config';

/**
 * 获取存储的 API 配置
 */
export function getApiConfig(): ApiConfig | null {
  if (typeof window === 'undefined') return null;
  
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return null;
  
  try {
    return JSON.parse(stored) as ApiConfig;
  } catch {
    return null;
  }
}

/**
 * 保存 API 配置到 localStorage
 */
export function saveApiConfig(config: ApiConfig): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

/**
 * 检查 API 配置是否完整
 */
export function isApiConfigured(): boolean {
  const config = getApiConfig();
  if (!config) return false;
  
  return !!(
    config.protocol &&
    config.apiKey &&
    config.apiBase &&
    config.contentModelId &&
    config.imageModelId
  );
}

/**
 * 清除 API 配置
 */
export function clearApiConfig(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
}
