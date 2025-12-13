"use client";

import React, { useEffect, useState } from "react";
import { Key, Loader2, AlertCircle, Languages, X } from "lucide-react";
import { translations, Language } from "@/lib/translations";
import {
  getApiConfig,
  saveApiConfig,
  isApiConfigured,
  getProtocolConfig,
  ApiConfig,
  ApiProtocol,
  RequestMode,
} from "@/lib/config";

type Translation = typeof translations.en;

interface Props {
  onKeyConfigured: () => void;
  onCancel?: () => void;
  t: Translation;
  uiLanguage: Language;
  onLanguageChange: (lang: Language) => void;
  forceEdit?: boolean;
}

export const ApiKeyModal: React.FC<Props> = ({
  onKeyConfigured,
  onCancel,
  t,
  uiLanguage,
  onLanguageChange,
  forceEdit = false,
}) => {
  const [checking, setChecking] = useState(true);
  const [config, setConfig] = useState<ApiConfig>({
    protocol: ApiProtocol.VERTEX_AI,
    requestMode: RequestMode.CLIENT_DIRECT,
    apiKey: "",
    apiBase: "",
    contentModelId: "",
    imageModelId: "",
  });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // 检查 localStorage 中是否有配置
    const checkConfig = () => {
      const existingConfig = getApiConfig();
      if (existingConfig) {
        setConfig({
          ...existingConfig,
          protocol: existingConfig.protocol || ApiProtocol.VERTEX_AI,
          requestMode: existingConfig.requestMode || RequestMode.CLIENT_DIRECT,
        });
      }

      if (!forceEdit && isApiConfigured()) {
        onKeyConfigured();
      }
      setChecking(false);
      setIsInitialized(true);
    };

    checkConfig();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [forceEdit]);

  // 当协议切换时，自动加载该协议的配置（仅在初始化完成后）
  useEffect(() => {
    if (!isInitialized) return;

    const protocolConfig = getProtocolConfig(config.protocol);
    if (protocolConfig) {
      setConfig({
        protocol: config.protocol,
        ...protocolConfig,
      });
    } else {
      // 如果该协议没有保存的配置，使用默认值
      setConfig({
        protocol: config.protocol,
        requestMode: RequestMode.CLIENT_DIRECT,
        apiKey: "",
        apiBase: "",
        contentModelId: "",
        imageModelId: "",
      });
    }
  }, [config.protocol, isInitialized]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // 验证所有字段
    if (!config.apiKey.trim()) {
      setError(t.errorApiKeyRequired);
      return;
    }
    if (!config.apiBase.trim()) {
      setError(t.errorApiBaseRequired);
      return;
    }
    if (!config.contentModelId.trim()) {
      setError(t.errorContentModelRequired);
      return;
    }
    if (!config.imageModelId.trim()) {
      setError(t.errorImageModelRequired);
      return;
    }

    setSubmitting(true);

    try {
      // 保存到 localStorage
      saveApiConfig({
        protocol: config.protocol,
        requestMode: config.requestMode,
        apiKey: config.apiKey.trim(),
        apiBase: config.apiBase.trim(),
        contentModelId: config.contentModelId.trim(),
        imageModelId: config.imageModelId.trim(),
      });

      onKeyConfigured();
    } catch {
      setError(t.errorFailed);
    } finally {
      setSubmitting(false);
    }
  };

  if (checking) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="bg-card rounded-2xl p-8 max-w-md w-full shadow-2xl text-center">
          <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">{t.checkingApi}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 overflow-y-auto py-8">
      <div className="bg-card rounded-2xl p-6 max-w-lg w-full shadow-2xl mx-4">
        {/* 顶部按钮栏 */}
        <div className="flex justify-end items-center gap-2 mb-2">
          <button
            onClick={() => onLanguageChange(uiLanguage === "en" ? "zh" : "en")}
            className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-primary transition-colors px-2 py-1 rounded-full hover:bg-muted"
          >
            <Languages className="w-3.5 h-3.5" />
            {uiLanguage === "en" ? "中文" : "English"}
          </button>

          {onCancel && (
            <button
              onClick={onCancel}
              className="p-1.5 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              type="button"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex items-start gap-4 mb-6">
          <div className="bg-primary/10 w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0">
            <Key className="w-6 h-6 text-primary" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-bold text-foreground mb-1">
              {t.configureApiKey}
            </h2>
            <p className="text-muted-foreground text-xs leading-normal">
              {t.vertexConfigRequired}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              {t.apiProtocolLabel}
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() =>
                  setConfig({ ...config, protocol: ApiProtocol.VERTEX_AI })
                }
                className={`p-3 rounded-lg border-2 text-sm font-medium transition-all ${
                  config.protocol === ApiProtocol.VERTEX_AI
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border hover:border-input text-muted-foreground"
                }`}
              >
                {t.protocolVertexAI}
              </button>
              <button
                type="button"
                onClick={() =>
                  setConfig({ ...config, protocol: ApiProtocol.OPENAI })
                }
                className={`p-3 rounded-lg border-2 text-sm font-medium transition-all ${
                  config.protocol === ApiProtocol.OPENAI
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border hover:border-input text-muted-foreground"
                }`}
              >
                {t.protocolOpenAI}
              </button>
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium text-foreground">
                {t.apiKeyLabel}
              </label>
              <a
                href="https://zenmux.ai/invite/9H70CU"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary hover:text-primary/80 transition-colors underline"
              >
                {t.getApiKeyLink}
              </a>
            </div>
            <input
              type="password"
              value={config.apiKey}
              onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
              placeholder={
                config.protocol === ApiProtocol.OPENAI ? "sk-..." : "AIza..."
              }
              className="w-full px-4 py-3 border border-input rounded-lg focus:ring-2 focus:ring-ring focus:border-primary"
              disabled={submitting}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              {t.apiBaseLabel}
            </label>
            <input
              type="text"
              value={config.apiBase}
              onChange={(e) =>
                setConfig({ ...config, apiBase: e.target.value })
              }
              placeholder={
                config.protocol === ApiProtocol.OPENAI
                  ? "https://api.openai.com/v1"
                  : "https://generativelanguage.googleapis.com/v1beta"
              }
              className="w-full px-4 py-3 border border-input rounded-lg focus:ring-2 focus:ring-ring focus:border-primary"
              disabled={submitting}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              {t.contentModelLabel}
            </label>
            <input
              type="text"
              value={config.contentModelId}
              onChange={(e) =>
                setConfig({ ...config, contentModelId: e.target.value })
              }
              placeholder={
                config.protocol === ApiProtocol.OPENAI
                  ? "gpt-5.1"
                  : "gemini-3-pro-preview"
              }
              className="w-full px-4 py-3 border border-input rounded-lg focus:ring-2 focus:ring-ring focus:border-primary"
              disabled={submitting}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              {t.imageModelLabel}
            </label>
            <input
              type="text"
              value={config.imageModelId}
              onChange={(e) =>
                setConfig({ ...config, imageModelId: e.target.value })
              }
              placeholder={
                config.protocol === ApiProtocol.OPENAI
                  ? "gpt-5-image"
                  : "gemini-3-pro-image-preview"
              }
              className="w-full px-4 py-3 border border-input rounded-lg focus:ring-2 focus:ring-ring focus:border-primary"
              disabled={submitting}
            />
          </div>

          {/* 请求模式选择 */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              {t.requestModeLabel}
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() =>
                  setConfig({
                    ...config,
                    requestMode: RequestMode.CLIENT_DIRECT,
                  })
                }
                className={`flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-all ${
                  config.requestMode === RequestMode.CLIENT_DIRECT
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border hover:border-input text-muted-foreground"
                }`}
              >
                <span className="text-sm font-medium">
                  {t.requestModeClientDirect}
                </span>
                <span className="text-[10px] opacity-80 mt-1">
                  Browser Fetch
                </span>
              </button>
              <button
                type="button"
                onClick={() =>
                  setConfig({
                    ...config,
                    requestMode: RequestMode.SERVER_PROXY,
                  })
                }
                className={`flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-all ${
                  config.requestMode === RequestMode.SERVER_PROXY
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border hover:border-input text-muted-foreground"
                }`}
              >
                <span className="text-sm font-medium">
                  {t.requestModeServerProxy}
                </span>
                <span className="text-[10px] opacity-80 mt-1">API Route</span>
              </button>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 p-3 rounded-lg">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-primary hover:bg-primary/90 disabled:bg-muted text-primary-foreground font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {t.validating}
              </>
            ) : (
              t.continue
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
