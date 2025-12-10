'use client';

import React from 'react';
import { ChevronLeft, Wand2, Cpu, Image as ImageIcon } from 'lucide-react';
import type { PresentationConfig, InputSource, Presentation, SlideContent, Slide } from '@/lib/types';
import { SlideStyle, AppStep } from '@/lib/types';
import type { Language } from '@/lib/translations';
import { getApiHeaders } from '@/lib/api';

interface Props {
  config: PresentationConfig;
  setConfig: (config: PresentationConfig) => void;
  setStep: (step: AppStep) => void;
  inputSource: InputSource;
  setPresentation: (presentation: Presentation | null) => void;
  setIsGenerating: (isGenerating: boolean) => void;
  setGenerationProgress: (progress: number) => void;
  t: any;
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
  t,
  uiLanguage 
}) => {
  const startGeneration = async () => {
    if (inputSource.type === 'text' && !inputSource.textContent?.trim()) return;
    if (inputSource.type === 'file' && !inputSource.fileData) return;

    setStep(AppStep.PLANNING);
    setIsGenerating(true);
    setGenerationProgress(10);

    try {
      // 1. Plan Structure via API
      const planResponse = await fetch('/api/gemini', {
        method: 'POST',
        headers: getApiHeaders(),
        body: JSON.stringify({
          action: 'plan-presentation',
          payload: {
            document: inputSource.textContent || inputSource.fileData,
            prompt: JSON.stringify(config),
            model: config.contentModel
          }
        })
      });

      const planResult = await planResponse.json();
      if (!planResult.success) {
        throw new Error(planResult.error || 'Failed to plan presentation');
      }

      const plan = JSON.parse(planResult.data.content);
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

      setStep(AppStep.GENERATING);

      // 2. Generate Images Sequentially
      const updatedSlides = [...initialSlides];
      const totalSlides = initialSlides.length;

      for (let i = 0; i < totalSlides; i++) {
        updatedSlides[i] = { ...updatedSlides[i], status: 'generating' as const };
        setPresentation({ title: plan.title, slides: [...updatedSlides] });

        try {
          const imageResponse = await fetch('/api/gemini', {
            method: 'POST',
            headers: getApiHeaders(),
            body: JSON.stringify({
              action: 'generate-image',
              payload: {
                prompt: JSON.stringify({
                  slide: updatedSlides[i].content,
                  deckTitle: plan.title,
                  config
                }),
                model: config.imageModel
              }
            })
          });

          const imageResult = await imageResponse.json();
          if (imageResult.success) {
            updatedSlides[i] = {
              ...updatedSlides[i],
              status: 'completed' as const,
              imageUrl: imageResult.data.content
            };
          } else {
            updatedSlides[i] = { ...updatedSlides[i], status: 'failed' as const };
          }
        } catch (err) {
          console.error(`Failed slide ${i + 1}`, err);
          updatedSlides[i] = { ...updatedSlides[i], status: 'failed' as const };
        }

        setPresentation({ title: plan.title, slides: [...updatedSlides] });

        const progressPerSlide = 70 / totalSlides;
        setGenerationProgress(30 + ((i + 1) * progressPerSlide));
      }

      setStep(AppStep.EDITOR);
      setIsGenerating(false);

    } catch (error: any) {
      console.error("Generation failed", error);

      let msg = "Failed to generate presentation. Please try again.";
      if (error.message?.includes('location') || error.status === 400) {
        msg = uiLanguage === 'en'
          ? "API Error: User location is not supported for this model."
          : "API 错误：您所在的地区不支持此模型。";
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
        className="text-slate-500 hover:text-slate-800 mb-6 flex items-center gap-1"
      >
        <ChevronLeft className="w-4 h-4" /> {t.backBtn}
      </button>

      <h2 className="text-3xl font-bold text-slate-900 mb-8">{t.settingsTitle}</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        <div className="col-span-2">
          <label className="block text-sm font-medium text-slate-700 mb-3">{t.visualStyle}</label>
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
                  ? 'border-indigo-600 bg-indigo-50' 
                  : 'border-slate-200 hover:border-indigo-300'
                }`}
              >
                <h3 className={`font-bold ${config.style === styleOption.id ? 'text-indigo-900' : 'text-slate-700'}`}>
                  {styleOption.title}
                </h3>
                <p className="text-sm text-slate-500 mt-1">{styleOption.desc}</p>
              </div>
            ))}
          </div>

          {config.style === SlideStyle.CUSTOM && (
            <div className="mt-4 animate-fade-in">
              <input
                type="text"
                placeholder={t.customPlaceholder}
                className="w-full p-3 border border-slate-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                value={config.customStyleDescription || ''}
                onChange={(e) => setConfig({...config, customStyleDescription: e.target.value})}
              />
            </div>
          )}
        </div>

        <div className="col-span-2 grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
              <Cpu className="w-4 h-4" /> {t.contentModelLabel}
            </label>
            <select 
              value={config.contentModel}
              onChange={(e) => setConfig({...config, contentModel: e.target.value})}
              className="w-full p-3 border border-slate-300 rounded-lg bg-white focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="gemini-2.5-flash">{t.contentModels.flash}</option>
              <option value="gemini-3-pro-preview">{t.contentModels.pro}</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
              <ImageIcon className="w-4 h-4" /> {t.imageModelLabel}
            </label>
            <select 
              value={config.imageModel}
              onChange={(e) => setConfig({...config, imageModel: e.target.value})}
              className="w-full p-3 border border-slate-300 rounded-lg bg-white focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="gemini-2.5-flash-image">{t.imageModels.flash}</option>
              <option value="gemini-3-pro-image-preview">{t.imageModels.pro}</option>
            </select>
          </div>
        </div>

        <div className="col-span-2">
          <label className="block text-sm font-medium text-slate-700 mb-2">{t.additionalReqLabel}</label>
          <textarea
            placeholder={t.additionalReqPlaceholder}
            className="w-full p-3 border border-slate-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 h-24 resize-none"
            value={config.additionalPrompt || ''}
            onChange={(e) => setConfig({...config, additionalPrompt: e.target.value})}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">{t.approxSlides}</label>
          <input 
            type="number" 
            min={1} 
            max={40}
            value={config.pageCount}
            onChange={(e) => setConfig({...config, pageCount: parseInt(e.target.value) || 5})}
            className="w-full p-3 border border-slate-300 rounded-lg"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">{t.outputLang}</label>
          <select 
            value={config.language}
            onChange={(e) => setConfig({...config, language: e.target.value as 'English' | 'Chinese'})}
            className="w-full p-3 border border-slate-300 rounded-lg bg-white"
          >
            <option value="English">English</option>
            <option value="Chinese">Simplified Chinese (简体中文)</option>
          </select>
        </div>
      </div>

      <div className="flex justify-center">
        <button
          onClick={startGeneration}
          className="bg-indigo-600 hover:bg-indigo-700 text-white text-lg font-semibold py-3 px-12 rounded-full transition-all shadow-lg hover:shadow-xl flex items-center gap-2"
        >
          <Wand2 className="w-5 h-5" /> {t.generateBtn}
        </button>
      </div>
    </div>
  );
};
