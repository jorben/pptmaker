'use client';

import React from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  RefreshCw, 
  Download, 
  Edit3, 
  Layout, 
  Settings,
  Image as ImageIcon 
} from 'lucide-react';
import type { Presentation, PresentationConfig } from '@/lib/types';
import { getApiHeaders } from '@/lib/api';

interface Props {
  presentation: Presentation;
  setPresentation: (presentation: Presentation) => void;
  activeSlideIndex: number;
  setActiveSlideIndex: (index: number) => void;
  config: PresentationConfig;
  t: any;
}

export const EditorStep: React.FC<Props> = ({ 
  presentation, 
  setPresentation, 
  activeSlideIndex, 
  setActiveSlideIndex, 
  config,
  t 
}) => {
  const activeSlide = presentation.slides[activeSlideIndex];

  const regenerateSlide = async (slideIndex: number) => {
    const newSlides = [...presentation.slides];
    const slide = newSlides[slideIndex];

    slide.status = 'generating';
    setPresentation({ ...presentation, slides: newSlides });

    try {
      const imageResponse = await fetch('/api/gemini', {
        method: 'POST',
        headers: getApiHeaders(),
        body: JSON.stringify({
          action: 'generate-image',
          payload: {
            prompt: JSON.stringify({
              slide: slide.content,
              deckTitle: presentation.title,
              config
            }),
            model: config.imageModel
          }
        })
      });

      const imageResult = await imageResponse.json();
      if (imageResult.success) {
        slide.status = 'completed';
        slide.imageUrl = imageResult.data.content;
      } else {
        slide.status = 'failed';
      }
    } catch (e: any) {
      slide.status = 'failed';
      if (e.message?.includes('location') || e.status === 400) {
        alert("Location not supported for image generation.");
      }
    }

    setPresentation({ ...presentation, slides: [...newSlides] });
  };

  const downloadPDF = () => {
    window.print();
  };

  return (
    <div className="flex h-full bg-slate-100 overflow-hidden">
      {/* Sidebar */}
      <div className="w-64 bg-white border-r border-slate-200 flex flex-col h-full print:hidden">
        <div className="p-4 border-b border-slate-100">
          <h3 className="font-bold text-slate-800 truncate">{presentation.title}</h3>
          <p className="text-xs text-slate-500">{presentation.slides.length} {t.slidesLabel}</p>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {presentation.slides.map((slide, idx) => (
            <div 
              key={slide.id}
              onClick={() => setActiveSlideIndex(idx)}
              className={`p-2 rounded-lg cursor-pointer border-2 transition-all group ${
                idx === activeSlideIndex ? 'border-indigo-600 bg-indigo-50' : 'border-transparent hover:bg-slate-50'
              }`}
            >
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-bold text-slate-400">#{slide.pageNumber}</span>
                {slide.status === 'completed' ? (
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                ) : slide.status === 'failed' ? (
                  <div className="w-2 h-2 rounded-full bg-red-500" />
                ) : (
                  <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
                )}
              </div>
              <div className="aspect-video bg-slate-200 rounded overflow-hidden relative">
                {slide.imageUrl ? (
                  <img src={slide.imageUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ImageIcon className="w-6 h-6 text-slate-400" />
                  </div>
                )}
              </div>
              <p className="text-xs text-slate-700 mt-2 truncate font-medium">{slide.content.title}</p>
            </div>
          ))}
        </div>
        <div className="p-4 border-t border-slate-200">
          <button 
            onClick={downloadPDF}
            className="w-full py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg flex items-center justify-center gap-2 text-sm font-medium"
          >
            <Download className="w-4 h-4" /> {t.exportPdf}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Toolbar */}
        <div className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 print:hidden">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setActiveSlideIndex(Math.max(0, activeSlideIndex - 1))}
              disabled={activeSlideIndex === 0}
              className="p-2 rounded hover:bg-slate-100 disabled:opacity-50"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="text-sm font-medium">{t.slideIndicator} {activeSlideIndex + 1} / {presentation.slides.length}</span>
            <button 
              onClick={() => setActiveSlideIndex(Math.min(presentation.slides.length - 1, activeSlideIndex + 1))}
              disabled={activeSlideIndex === presentation.slides.length - 1}
              className="p-2 rounded hover:bg-slate-100 disabled:opacity-50"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => regenerateSlide(activeSlideIndex)}
              disabled={activeSlide.status === 'generating'}
              className="px-4 py-2 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${activeSlide.status === 'generating' ? 'animate-spin' : ''}`} />
              {t.regenerateVisuals}
            </button>
          </div>
        </div>

        {/* Canvas */}
        <div className="flex-1 overflow-y-auto p-8 flex items-center justify-center bg-slate-100 print:hidden">
          <div className="w-full max-w-5xl aspect-[16/9] bg-white shadow-2xl rounded-lg overflow-hidden relative">
            {activeSlide.imageUrl ? (
              <img src={activeSlide.imageUrl} alt="Slide" className="w-full h-full object-contain" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-slate-100">
                <ImageIcon className="w-16 h-16 text-slate-300" />
              </div>
            )}

            {activeSlide.status === 'generating' && (
              <div className="absolute inset-0 bg-white/80 z-20 flex flex-col items-center justify-center">
                <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-indigo-900 font-medium">{t.designing}</p>
              </div>
            )}
          </div>
        </div>

        {/* Print View - All Slides */}
        <div className="hidden print:block">
          {presentation.slides.map((s, idx) => (
            <div 
              key={s.id} 
              className={`w-full h-screen flex items-center justify-center bg-white ${idx < presentation.slides.length - 1 ? 'page-break-after-always' : ''}`}
            >
              {s.imageUrl ? (
                <img src={s.imageUrl} className="max-w-full max-h-full object-contain" alt={`Slide ${s.pageNumber}`} />
              ) : (
                <div className="text-gray-400 text-2xl">Slide {s.pageNumber}</div>
              )}
            </div>
          ))}
        </div>

        {/* Editor Panel */}
        <div className="h-48 bg-white border-t border-slate-200 p-6 flex gap-6 overflow-hidden print:hidden">
          <div className="flex-1 flex flex-col">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2">
              <Edit3 className="w-3 h-3" /> {t.editorTitle}
            </label>
            <input 
              type="text" 
              value={activeSlide.content.title}
              onChange={(e) => {
                const newSlides = [...presentation.slides];
                newSlides[activeSlideIndex].content.title = e.target.value;
                setPresentation({...presentation, slides: newSlides});
              }}
              className="w-full p-2 border border-slate-200 rounded focus:border-indigo-500 font-bold text-lg"
            />
          </div>
          <div className="flex-[2] flex flex-col">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2">
              <Layout className="w-3 h-3" /> {t.editorBullets}
            </label>
            <textarea 
              value={activeSlide.content.bulletPoints.join('\n')}
              onChange={(e) => {
                const newSlides = [...presentation.slides];
                newSlides[activeSlideIndex].content.bulletPoints = e.target.value.split('\n');
                setPresentation({...presentation, slides: newSlides});
              }}
              className="w-full flex-1 p-2 border border-slate-200 rounded focus:border-indigo-500 resize-none font-medium"
            />
          </div>
          <div className="flex-1 flex flex-col">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2">
              <Settings className="w-3 h-3" /> {t.editorPrompt}
            </label>
            <textarea 
              value={activeSlide.content.visualDescription}
              onChange={(e) => {
                const newSlides = [...presentation.slides];
                newSlides[activeSlideIndex].content.visualDescription = e.target.value;
                setPresentation({...presentation, slides: newSlides});
              }}
              className="w-full flex-1 p-2 border border-slate-200 rounded focus:border-indigo-500 resize-none text-xs text-slate-600 bg-slate-50"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
