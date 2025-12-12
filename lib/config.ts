// API 配置管理 - 使用 localStorage 存储，按协议类型分别存储

// API 协议类型
export enum ApiProtocol {
  VERTEX_AI = "vertex_ai",
  OPENAI = "openai",
}

// 请求模式
export enum RequestMode {
  CLIENT_DIRECT = "client_direct",
  SERVER_PROXY = "server_proxy",
}

export interface ApiConfig {
  protocol: ApiProtocol;
  requestMode: RequestMode;
  apiKey: string;
  apiBase: string;
  contentModelId: string;
  imageModelId: string;
}

// 协议特定配置（不包含 protocol 字段）
export interface ProtocolConfig {
  requestMode: RequestMode;
  apiKey: string;
  apiBase: string;
  contentModelId: string;
  imageModelId: string;
}

// 所有协议的配置存储
interface AllProtocolConfigs {
  [ApiProtocol.VERTEX_AI]?: ProtocolConfig;
  [ApiProtocol.OPENAI]?: ProtocolConfig;
  currentProtocol?: ApiProtocol;
}

const STORAGE_KEY = "api_configs_v2"; // 新版本存储键
const LEGACY_STORAGE_KEY = "api_config"; // 旧版本存储键

/**
 * 迁移旧版本配置到新版本
 */
function migrateLegacyConfig(): void {
  if (typeof window === "undefined") return;

  const legacyConfig = localStorage.getItem(LEGACY_STORAGE_KEY);
  if (!legacyConfig) return;

  try {
    const oldConfig = JSON.parse(legacyConfig) as ApiConfig;
    const newConfigs: AllProtocolConfigs = {
      currentProtocol: oldConfig.protocol,
      [oldConfig.protocol]: {
        requestMode: oldConfig.requestMode,
        apiKey: oldConfig.apiKey,
        apiBase: oldConfig.apiBase,
        contentModelId: oldConfig.contentModelId,
        imageModelId: oldConfig.imageModelId,
      },
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newConfigs));
    localStorage.removeItem(LEGACY_STORAGE_KEY);
  } catch (error) {
    console.error("Failed to migrate legacy config:", error);
  }
}

/**
 * 获取所有协议的配置
 */
function getAllConfigs(): AllProtocolConfigs {
  if (typeof window === "undefined") return {};

  // 尝试迁移旧配置
  migrateLegacyConfig();

  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return {};

  try {
    return JSON.parse(stored) as AllProtocolConfigs;
  } catch {
    return {};
  }
}

/**
 * 保存所有协议的配置
 */
function saveAllConfigs(configs: AllProtocolConfigs): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(configs));
}

/**
 * 获取当前激活的协议
 */
export function getCurrentProtocol(): ApiProtocol {
  const configs = getAllConfigs();
  return configs.currentProtocol || ApiProtocol.VERTEX_AI;
}

/**
 * 获取指定协议的配置
 */
export function getProtocolConfig(
  protocol: ApiProtocol
): ProtocolConfig | null {
  const configs = getAllConfigs();
  return configs[protocol] || null;
}

/**
 * 获取当前激活协议的完整配置
 */
export function getApiConfig(): ApiConfig | null {
  const currentProtocol = getCurrentProtocol();
  const protocolConfig = getProtocolConfig(currentProtocol);

  if (!protocolConfig) return null;

  return {
    protocol: currentProtocol,
    ...protocolConfig,
  };
}

/**
 * 保存指定协议的配置
 */
export function saveProtocolConfig(
  protocol: ApiProtocol,
  config: ProtocolConfig
): void {
  if (typeof window === "undefined") return;

  const configs = getAllConfigs();
  configs[protocol] = config;
  configs.currentProtocol = protocol; // 保存时自动切换到该协议
  saveAllConfigs(configs);
}

/**
 * 保存 API 配置（兼容旧接口）
 */
export function saveApiConfig(config: ApiConfig): void {
  const { protocol, ...protocolConfig } = config;
  saveProtocolConfig(protocol, protocolConfig);
}

/**
 * 切换当前使用的协议
 */
export function switchProtocol(protocol: ApiProtocol): void {
  if (typeof window === "undefined") return;

  const configs = getAllConfigs();
  configs.currentProtocol = protocol;
  saveAllConfigs(configs);
}

/**
 * 检查指定协议的配置是否完整
 */
export function isProtocolConfigured(protocol: ApiProtocol): boolean {
  const config = getProtocolConfig(protocol);
  if (!config) return false;

  return !!(
    config.requestMode &&
    config.apiKey &&
    config.apiBase &&
    config.contentModelId &&
    config.imageModelId
  );
}

/**
 * 检查当前激活协议的配置是否完整
 */
export function isApiConfigured(): boolean {
  const currentProtocol = getCurrentProtocol();
  return isProtocolConfigured(currentProtocol);
}

/**
 * 清除指定协议的配置
 */
export function clearProtocolConfig(protocol: ApiProtocol): void {
  if (typeof window === "undefined") return;

  const configs = getAllConfigs();
  delete configs[protocol];
  saveAllConfigs(configs);
}

/**
 * 清除所有配置
 */
export function clearApiConfig(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}
