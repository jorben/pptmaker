'use client';

import React from 'react';
import { ChevronLeft, Play, Plus, Trash2 } from 'lucide-react';
import { Presentation, AppStep, Slide, SlideContent, PresentationConfig } from '@/lib/types';
import { generateSlideImage } from '@/lib/api';
import type { translations } from '@/lib/translations';

interface Props {
  presentation: Presentation;
  setPresentation: (presentation: Presentation) => void;
  setStep: (step: AppStep) => void;
  config: PresentationConfig;
  setIsGenerating: (isGenerating: boolean) => void;
  setGenerationProgress: (progress: number) => void;
  t: typeof translations['en'];
  uiLanguage: 'en' | 'zh';
}

export const PlanningReviewStep: React.FC<Props> = ({
  presentation,
  setPresentation,
  setStep,
  config,
  setIsGenerating,
  setGenerationProgress,
  t,
  uiLanguage
}) => {

  const handleUpdateSlide = (index: number, field: keyof SlideContent, value: string | string[]) => {
    const newSlides = [...presentation.slides];
    newSlides[index] = {
      ...newSlides[index],
      content: {
        ...newSlides[index].content,
        [field]: value
      }
    };
    setPresentation({ ...presentation, slides: newSlides });
  };

  const handleAddSlide = () => {
    const newSlide: Slide = {
      id: crypto.randomUUID(),
      pageNumber: presentation.slides.length + 1,
      content: {
        title: uiLanguage === 'en' ? 'New Slide' : '新页面',
        bulletPoints: [],
        visualDescription: ''
      },
      status: 'pending'
    };
    setPresentation({
      ...presentation,
      slides: [...presentation.slides, newSlide]
    });
  };

  const handleRemoveSlide = (index: number) => {
    const newSlides = presentation.slides.filter((_, i) => i !== index);
    // Re-index page numbers
    const reindexedSlides = newSlides.map((slide, i) => ({
      ...slide,
      pageNumber: i + 1
    }));
    setPresentation({ ...presentation, slides: reindexedSlides });
  };

  const startImageGeneration = async () => {
    setStep(AppStep.GENERATING);
    setIsGenerating(true);
    setGenerationProgress(30); // Start from 30% as planning is done

    const totalSlides = presentation.slides.length;
    const updatedSlides = [...presentation.slides];

    try {
        for (let i = 0; i < totalSlides; i++) {
            updatedSlides[i] = { ...updatedSlides[i], status: 'generating' as const };
            setPresentation({ ...presentation, slides: [...updatedSlides] });
    
            try {
              const imageUrl = await generateSlideImage(
                updatedSlides[i].content,
                presentation.title,
                config
              );
              
              updatedSlides[i] = {
                ...updatedSlides[i],
                status: 'completed' as const,
                imageUrl
              };
            } catch (err) {
              console.error(`Failed slide ${i + 1}`, err);
              updatedSlides[i] = { ...updatedSlides[i], status: 'failed' as const };
            }
    
            setPresentation({ ...presentation, slides: [...updatedSlides] });
    
            const progressPerSlide = 70 / totalSlides;
            setGenerationProgress(30 + ((i + 1) * progressPerSlide));
        }

        setStep(AppStep.EDITOR);
        setIsGenerating(false);

    } catch (error) {
        console.error("Image generation process failed", error);
        setIsGenerating(false);
        setStep(AppStep.EDITOR); 
    }
  };

  return (
    <div className="max-w-5xl mx-auto w-full p-6 animate-fade-in pb-24">
       <div className="flex items-center justify-between mb-8">
        <div>
            <button 
                onClick={() => setStep(AppStep.CONFIG)}
                className="text-slate-500 hover:text-slate-800 mb-2 flex items-center gap-1"
            >
                <ChevronLeft className="w-4 h-4" /> {t.backToConfig}
            </button>
            <h2 className="text-3xl font-bold text-slate-900">{t.reviewTitle}</h2>
            <p className="text-slate-500 mt-1">{t.reviewSubtitle}</p>
        </div>
        <button
            onClick={startImageGeneration}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 px-6 rounded-lg transition-all shadow-md hover:shadow-lg flex items-center gap-2"
        >
            <Play className="w-4 h-4" /> {t.confirmAndGenerate}
        </button>
      </div>

      <div className="space-y-6">
        {presentation.slides.map((slide, index) => (
            <div key={slide.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 relative group">
                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                     <button 
                        onClick={() => handleRemoveSlide(index)}
                        className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                        title={t.removeSlide}
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
                
                <div className="flex gap-4">
                    <div className="flex-shrink-0 w-8 h-8 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center font-bold text-sm mt-1">
                        {slide.pageNumber}
                    </div>
                    <div className="flex-grow space-y-4">
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                                {t.slideTitle}
                            </label>
                            <input 
                                type="text"
                                value={slide.content.title}
                                onChange={(e) => handleUpdateSlide(index, 'title', e.target.value)}
                                className="w-full text-lg font-bold text-slate-900 border-b border-transparent hover:border-slate-300 focus:border-indigo-500 focus:outline-none transition-colors py-1"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                                {t.bulletPoints}
                            </label>
                            <textarea
                                value={slide.content.bulletPoints.join('\n')}
                                onChange={(e) => handleUpdateSlide(index, 'bulletPoints', e.target.value.split('\n'))}
                                className="w-full text-sm text-slate-700 border rounded-md border-slate-200 p-2 focus:border-indigo-500 focus:outline-none min-h-[100px]"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                                {t.visualDesc}
                            </label>
                            <textarea
                                value={slide.content.visualDescription}
                                onChange={(e) => handleUpdateSlide(index, 'visualDescription', e.target.value)}
                                className="w-full text-sm text-slate-600 italic bg-slate-50 border border-slate-200 rounded-md p-2 focus:border-indigo-500 focus:outline-none min-h-[60px]"
                            />
                        </div>
                    </div>
                </div>
            </div>
        ))}

        <button
            onClick={handleAddSlide}
            className="w-full py-4 border-2 border-dashed border-slate-300 rounded-xl text-slate-500 hover:border-indigo-400 hover:text-indigo-600 transition-all flex items-center justify-center gap-2 font-medium"
        >
            <Plus className="w-5 h-5" /> {t.addSlide}
        </button>
      </div>
    </div>
  );
};
