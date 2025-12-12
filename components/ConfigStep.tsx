'use client';

import React from 'react';
import Image from 'next/image';
import { ChevronLeft, Wand2 } from 'lucide-react';
import type { PresentationConfig, InputSource, Presentation, SlideContent, Slide } from '@/lib/types';
import { SlideStyle, AppStep } from '@/lib/types';
import type { Language, translations } from '@/lib/translations';
import { planPresentation } from '@/lib/api';
import { THEMES } from '@/lib/themes';

interface Props {
  config: PresentationConfig;
  setConfig: (config: PresentationConfig) => void;
  setStep: (step: AppStep) => void;
  inputSource: InputSource;
  setPresentation: (presentation: Presentation | null) => void;
  setIsGenerating: (isGenerating: boolean) => void;
  setGenerationProgress: (progress: number) => void;
  setStreamingContent?: React.Dispatch<React.SetStateAction<string>>;
  t: typeof translations['en'];
  uiLanguage: Language;
}

export const ConfigStep: React.FC<Props> = ({ 
  config, 
  setConfig, 
  setStep, 
  inputSource,
  setPresentation,
  setIsGenerating,
  setGenerationProgress,
  setStreamingContent,
  t,
  uiLanguage 
}) => {
  const startGeneration = async () => {
    if (inputSource.type === 'text' && !inputSource.textContent?.trim()) return;
    if (inputSource.type === 'file' && !inputSource.fileData) return;

    setStep(AppStep.PLANNING);
    setIsGenerating(true);
    setGenerationProgress(10);
    if (setStreamingContent) setStreamingContent("");

    try {
      // 直接调用前端 API
      const document = inputSource.textContent || inputSource.fileData || '';
      const plan = await planPresentation(document, config, (chunk) => {
        if (setStreamingContent) {
          // 由于 Vertex AI 返回的 JSON 结构比较大，我们直接把收到的 chunk 追加进去可能意义不大
          // 但是如果是 streamGenerateContent，每次返回可能是局部文本
          // 对于 Vertex AI，我们之前实现的 onChunk 是传递 text content
          // 我们在这里做个简单的处理，只显示最后 100 个字符，或者显示累积的内容
          // 为了避免 UI 过于拥挤，我们只显示最后一段
          setStreamingContent(prev => {
             // 简单的追加，UI 层负责截断或滚动
             return prev + chunk;
          });
        }
      });
      
      setGenerationProgress(30);

      const initialSlides: Slide[] = plan.slides.map((s: SlideContent, i: number) => ({
        id: crypto.randomUUID(),
        pageNumber: i + 1,
        content: s,
        status: 'pending' as const,
      }));

      setPresentation({
        title: plan.title,
        slides: initialSlides
      });

      setGenerationProgress(100);
      setIsGenerating(false);
      setStep(AppStep.PLANNING_REVIEW);

    } catch (error: unknown) {
      console.error("Generation failed", error);

      let msg = "Failed to generate presentation. Please try again.";
      const err = error as { message?: string };
      if (err.message) {
        msg = uiLanguage === 'en'
          ? `API Error: ${err.message}`
          : `API 错误：${err.message}`;
      }

      alert(msg);
      setStep(AppStep.INPUT);
      setIsGenerating(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto w-full p-6 animate-fade-in">
      <button 
        onClick={() => setStep(AppStep.INPUT)}
        className="text-muted-foreground hover:text-foreground mb-6 flex items-center gap-1"
      >
        <ChevronLeft className="w-4 h-4" /> {t.backBtn}
      </button>

      <h2 className="text-3xl font-bold text-foreground mb-8">{t.settingsTitle}</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        <div className="col-span-2">
          <label className="block text-sm font-medium text-foreground mb-3">{t.visualStyle}</label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { id: SlideStyle.MINIMAL, ...t.styles.minimal },
              { id: SlideStyle.DETAILED, ...t.styles.detailed },
              { id: SlideStyle.CUSTOM, ...t.styles.custom },
            ].map((styleOption) => (
              <div 
                key={styleOption.id}
                onClick={() => setConfig({...config, style: styleOption.id as SlideStyle})}
                className={`cursor-pointer border-2 rounded-xl p-4 transition-all ${
                  config.style === styleOption.id 
                  ? 'border-primary bg-primary/10' 
                  : 'border-border hover:border-primary/50'
                }`}
              >
                <h3 className={`font-bold ${config.style === styleOption.id ? 'text-primary' : 'text-foreground'}`}>
                  {styleOption.title}
                </h3>
                <p className="text-sm text-muted-foreground mt-1">{styleOption.desc}</p>
              </div>
            ))}
          </div>

          {config.style === SlideStyle.CUSTOM && (
            <div className="mt-4 animate-fade-in">
              <input
                type="text"
                placeholder={t.customPlaceholder}
                className="w-full p-3 border border-input rounded-lg focus:ring-ring focus:border-primary"
                value={config.customStyleDescription || ''}
                onChange={(e) => setConfig({...config, customStyleDescription: e.target.value})}
              />
            </div>
          )}
        </div>

        <div className="col-span-2 grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">{t.approxSlides}</label>
            <select
              value={config.pageCount}
              onChange={(e) => setConfig({...config, pageCount: e.target.value === 'auto' ? 'auto' : parseInt(e.target.value)})}
              className="w-full p-3 border border-input rounded-lg bg-background"
            >
              <option value="auto">{t.autoSlides}</option>
              {Array.from({length: 30}, (_, i) => i + 1).map((num) => (
                <option key={num} value={num}>{num}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">{t.outputLang}</label>
            <select 
              value={config.language}
              onChange={(e) => setConfig({...config, language: e.target.value as 'English' | 'Chinese'})}
              className="w-full p-3 border border-input rounded-lg bg-background"
            >
              <option value="English">English</option>
              <option value="Chinese">Simplified Chinese (简体中文)</option>
            </select>
          </div>
        </div>

        <div className="col-span-2">
          <label className="block text-sm font-medium text-foreground mb-3">{t.presetThemeLabel}</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mb-6">
            {THEMES.map((theme, idx) => (
              <div
                key={idx}
                className="cursor-pointer group relative rounded-lg overflow-hidden border border-border hover:border-primary transition-all"
                onClick={() => {
                  const current = config.additionalPrompt || '';
                  const toAdd = theme.prompt;
                  if (!current.includes(toAdd)) {
                    const newValue = current ? `${current}\n${toAdd}` : toAdd;
                    setConfig({ ...config, additionalPrompt: newValue });
                  }
                }}
              >
                <div className="relative aspect-video w-full">
                  <Image
                    src={theme.thumbnail}
                    alt={theme.name[uiLanguage]}
                    fill
                    className="object-cover transition-transform group-hover:scale-105"
                  />
                </div>
                <div className="p-2 bg-card text-xs font-medium text-center truncate" title={theme.name[uiLanguage]}>
                  {theme.name[uiLanguage]}
                </div>
              </div>
            ))}
          </div>

          <label className="block text-sm font-medium text-foreground mb-2">{t.additionalReqLabel}</label>
          <textarea
            placeholder={t.additionalReqPlaceholder}
            className="w-full p-3 border border-input rounded-lg focus:ring-ring focus:border-primary h-24 resize-none"
            value={config.additionalPrompt || ''}
            onChange={(e) => setConfig({...config, additionalPrompt: e.target.value})}
          />
        </div>
      </div>

      <div className="flex justify-center">
        <button
          onClick={startGeneration}
          className="bg-primary hover:bg-primary/90 text-primary-foreground text-lg font-semibold py-3 px-12 rounded-full transition-all shadow-lg hover:shadow-xl flex items-center gap-2"
        >
          <Wand2 className="w-5 h-5" /> {t.generateBtn}
        </button>
      </div>
    </div>
  );
};
