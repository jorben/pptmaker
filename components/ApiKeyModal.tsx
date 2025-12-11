'use client';

import React, { useEffect, useState } from 'react';
import { Key, Loader2, AlertCircle, Languages, X } from 'lucide-react';
import { translations, Language } from '@/lib/translations';
import { getApiConfig, saveApiConfig, isApiConfigured, ApiConfig, ApiProtocol } from '@/lib/config';

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
  forceEdit = false 
}) => {
  const [checking, setChecking] = useState(true);
  const [config, setConfig] = useState<ApiConfig>({
    protocol: ApiProtocol.VERTEX_AI,
    apiKey: '',
    apiBase: '',
    contentModelId: '',
    imageModelId: '',
  });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    // 检查 localStorage 中是否有配置
    const checkConfig = () => {
      const existingConfig = getApiConfig();
      if (existingConfig) {
        setConfig({
          ...existingConfig,
          protocol: existingConfig.protocol || ApiProtocol.VERTEX_AI,
        });
      }
      
      if (!forceEdit && isApiConfigured()) {
        onKeyConfigured();
      }
      setChecking(false);
    };
    
    checkConfig();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [forceEdit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

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
        <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl text-center">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">{t.checkingApi}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 overflow-y-auto py-8">
      <div className="bg-white rounded-2xl p-8 max-w-lg w-full shadow-2xl mx-4">
        {/* 顶部按钮栏 */}
        <div className="flex justify-end items-center gap-2 mb-4">
          <button
            onClick={() => onLanguageChange(uiLanguage === 'en' ? 'zh' : 'en')}
            className="flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors px-3 py-1.5 rounded-full hover:bg-slate-100"
          >
            <Languages className="w-4 h-4" />
            {uiLanguage === 'en' ? '中文' : 'English'}
          </button>
          
          {onCancel && (
            <button
              onClick={onCancel}
              className="p-2 rounded-full hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors"
              type="button"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        <div className="text-center mb-6">
          <div className="mx-auto bg-indigo-100 w-16 h-16 rounded-full flex items-center justify-center mb-4">
            <Key className="w-8 h-8 text-indigo-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">{t.configureApiKey}</h2>
          <p className="text-gray-600 text-sm">
            {t.vertexConfigRequired}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* API 协议选择 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t.apiProtocolLabel}
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setConfig({ ...config, protocol: ApiProtocol.VERTEX_AI })}
                className={`p-3 rounded-lg border-2 text-sm font-medium transition-all ${
                  config.protocol === ApiProtocol.VERTEX_AI
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                    : 'border-gray-200 hover:border-gray-300 text-gray-600'
                }`}
              >
                {t.protocolVertexAI}
              </button>
              <button
                type="button"
                onClick={() => setConfig({ ...config, protocol: ApiProtocol.OPENAI })}
                className={`p-3 rounded-lg border-2 text-sm font-medium transition-all ${
                  config.protocol === ApiProtocol.OPENAI
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                    : 'border-gray-200 hover:border-gray-300 text-gray-600'
                }`}
              >
                {t.protocolOpenAI}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t.apiKeyLabel}
            </label>
            <input
              type="password"
              value={config.apiKey}
              onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
              placeholder={config.protocol === ApiProtocol.OPENAI ? "sk-..." : "AIza..."}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              disabled={submitting}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t.apiBaseLabel}
            </label>
            <input
              type="text"
              value={config.apiBase}
              onChange={(e) => setConfig({ ...config, apiBase: e.target.value })}
              placeholder={config.protocol === ApiProtocol.OPENAI 
                ? "https://api.openai.com/v1" 
                : "https://generativelanguage.googleapis.com/v1beta"}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              disabled={submitting}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t.contentModelLabel}
            </label>
            <input
              type="text"
              value={config.contentModelId}
              onChange={(e) => setConfig({ ...config, contentModelId: e.target.value })}
              placeholder={config.protocol === ApiProtocol.OPENAI ? "gpt-4o" : "gemini-2.0-flash"}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              disabled={submitting}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t.imageModelLabel}
            </label>
            <input
              type="text"
              value={config.imageModelId}
              onChange={(e) => setConfig({ ...config, imageModelId: e.target.value })}
              placeholder={config.protocol === ApiProtocol.OPENAI ? "gpt-image-1" : "gemini-2.0-flash-exp"}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              disabled={submitting}
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-3 rounded-lg">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
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

        <div className="mt-6 pt-4 border-t border-gray-100">
          <p className="text-xs text-gray-500 text-center">
            {t.configStoredLocally}
          </p>
        </div>
      </div>
    </div>
  );
};
