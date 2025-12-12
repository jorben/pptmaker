'use client';

import React from 'react';
import { Wand2, Clock, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import type { Presentation } from '@/lib/types';
import { AppStep } from '@/lib/types';
import type { Language, translations } from '@/lib/translations';
import { ProgressBar } from './ProgressBar';

interface Props {
  step: AppStep;
  presentation: Presentation | null;
  generationProgress: number;
  streamingContent?: string;
  t: typeof translations['en'];
  uiLanguage: Language;
}

export const LoadingStep: React.FC<Props> = ({ step, presentation, generationProgress, streamingContent, t, uiLanguage }) => {

  // Phase 1: Planning
  if (step === AppStep.PLANNING) {
    return (
      <div className="flex flex-col items-center justify-center h-full max-w-2xl mx-auto p-6 animate-fade-in">
        <div className="mb-8 relative">
          <div className="w-24 h-24 border-4 border-primary/20 rounded-full animate-pulse"></div>
          <div className="absolute top-0 left-0 w-24 h-24 border-4 border-t-primary border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
          <Wand2 className="w-8 h-8 text-primary absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-2">{t.loadingPlanning}</h2>
        <p className="text-muted-foreground mb-8 text-center max-w-md mx-auto">
          {t.analyzingDoc}
          <span className="block mt-2 text-xs text-muted-foreground/70">
            {uiLanguage === 'en' 
              ? "This may take a few moments for large documents..." 
              : "大型文档可能需要一些时间..."}
          </span>
        </p>
        <ProgressBar progress={generationProgress} />
        
        {/* Streaming Content Window */}
        <div className="mt-8 w-full max-w-lg mx-auto px-4">
           <p 
             className="text-xs text-muted-foreground/70 text-center font-mono whitespace-nowrap overflow-hidden"
             style={{ 
               maskImage: 'linear-gradient(to right, transparent, black 15%, black 85%, transparent)',
               WebkitMaskImage: 'linear-gradient(to right, transparent, black 15%, black 85%, transparent)' 
             }}
           >
             {streamingContent ? streamingContent.slice(-120) : "..."}
           </p>
        </div>
      </div>
    );
  }

  // Phase 2: Generating Images
  if (step === AppStep.GENERATING && presentation) {
    const completedCount = presentation.slides.filter(s => s.status === 'completed').length;
    const totalCount = presentation.slides.length;
    
    return (
      <div className="flex flex-col max-w-3xl mx-auto p-6 animate-fade-in w-full min-h-[80vh]">
        <div className="text-center mb-6 sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 py-4 border-b border-border/50">
          <h2 className="text-2xl font-bold text-foreground mb-2">{t.loadingGenerating}</h2>
          <div className="w-full max-w-md mx-auto">
            <ProgressBar 
              progress={generationProgress} 
              label={`${completedCount} / ${totalCount} ${t.slidesLabel}`} 
            />
            <p className="text-xs text-muted-foreground mt-2">{t.generatingHint}</p>
          </div>
        </div>

        <div className="flex flex-col relative bg-transparent space-y-3 pb-20">
            {presentation.slides.map((slide) => (
              <div 
                key={slide.id} 
                className={`p-4 flex items-center gap-4 rounded-xl border transition-all duration-300 ${
                  slide.status === 'generating' 
                    ? 'bg-primary/5 border-primary/20 shadow-[0_0_15px_rgba(var(--primary),0.1)]' 
                    : slide.status === 'completed' 
                      ? 'bg-card border-border/40' 
                      : 'bg-card/50 border-transparent opacity-60'
                }`}
              >
                <div className={`flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-full font-bold text-sm border shadow-sm ${
                  slide.status === 'completed' ? 'bg-success/10 border-success/30 text-success' : 
                  slide.status === 'generating' ? 'bg-primary/10 border-primary/30 text-primary animate-pulse' :
                  slide.status === 'failed' ? 'bg-destructive/10 border-destructive/30 text-destructive' :
                  'bg-muted/50 border-border text-muted-foreground'
                }`}>
                  {slide.pageNumber}
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className={`text-base font-semibold truncate mb-1 ${
                    slide.status === 'completed' ? 'text-foreground' : 
                    slide.status === 'generating' ? 'text-primary' : 'text-muted-foreground'
                  }`}>
                    {slide.content.title || `Slide ${slide.pageNumber}`}
                  </p>
                  <p className="text-xs text-muted-foreground/80 truncate font-mono">
                    {slide.status === 'generating' ? (
                        <span className="flex items-center gap-2">
                             {t.designing} <span className="animate-pulse">...</span>
                        </span>
                    ) : slide.content.visualDescription}
                  </p>
                </div>

                <div className={`flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-full ${
                     slide.status === 'generating' ? 'bg-primary/10' : 
                     slide.status === 'completed' ? 'bg-success/10' : 
                     'bg-transparent'
                }`}>
                  {slide.status === 'pending' && <Clock className="w-5 h-5 text-muted-foreground/30" />}
                  {slide.status === 'generating' && <Loader2 className="w-5 h-5 text-primary animate-spin" />}
                  {slide.status === 'completed' && <CheckCircle className="w-5 h-5 text-success" />}
                  {slide.status === 'failed' && <AlertCircle className="w-5 h-5 text-destructive" />}
                </div>
              </div>
            ))}
        </div>
      </div>
    );
  }

  return null;
};
