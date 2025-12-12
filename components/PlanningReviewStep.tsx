"use client";

import React from "react";
import { ChevronLeft, Play, Plus, Trash2 } from "lucide-react";
import {
  Presentation,
  AppStep,
  Slide,
  SlideContent,
  PresentationConfig,
} from "@/lib/types";
import { generateSlideImage } from "@/lib/api";
import { savePresentationToHistory } from "@/lib/db";
import type { translations } from "@/lib/translations";

interface Props {
  presentation: Presentation;
  setPresentation: (presentation: Presentation) => void;
  setStep: (step: AppStep) => void;
  config: PresentationConfig;
  setIsGenerating: (isGenerating: boolean) => void;
  setGenerationProgress: (progress: number) => void;
  currentHistoryId: string | null;
  setCurrentHistoryId: (id: string | null) => void;
  t: (typeof translations)["en"];
  uiLanguage: "en" | "zh";
}

export const PlanningReviewStep: React.FC<Props> = ({
  presentation,
  setPresentation,
  setStep,
  config,
  setIsGenerating,
  setGenerationProgress,
  currentHistoryId,
  setCurrentHistoryId,
  t,
  uiLanguage,
}) => {
  const handleUpdateSlide = (
    index: number,
    field: keyof SlideContent,
    value: string | string[]
  ) => {
    const newSlides = [...presentation.slides];
    newSlides[index] = {
      ...newSlides[index],
      content: {
        ...newSlides[index].content,
        [field]: value,
      },
    };
    setPresentation({ ...presentation, slides: newSlides });
  };

  const handleAddSlide = () => {
    const newSlide: Slide = {
      id: crypto.randomUUID(),
      pageNumber: presentation.slides.length + 1,
      content: {
        title: uiLanguage === "en" ? "New Slide" : "新页面",
        bulletPoints: [],
        visualDescription: "",
      },
      status: "pending",
    };
    setPresentation({
      ...presentation,
      slides: [...presentation.slides, newSlide],
    });
  };

  const handleRemoveSlide = (index: number) => {
    const newSlides = presentation.slides.filter((_, i) => i !== index);
    // Re-index page numbers
    const reindexedSlides = newSlides.map((slide, i) => ({
      ...slide,
      pageNumber: i + 1,
    }));
    setPresentation({ ...presentation, slides: reindexedSlides });
  };

  const startImageGeneration = async () => {
    setStep(AppStep.GENERATING);
    setIsGenerating(true);
    setGenerationProgress(30); // Start from 30% as planning is done

    const totalSlides = presentation.slides.length;
    const updatedSlides = [...presentation.slides];

    // Create history record at the start
    let historyId = currentHistoryId;
    if (!historyId) {
      try {
        historyId = await savePresentationToHistory(
          { ...presentation, slides: updatedSlides },
          config
        );
        setCurrentHistoryId(historyId);
      } catch (err) {
        console.error("Failed to create history record:", err);
      }
    }

    try {
      for (let i = 0; i < totalSlides; i++) {
        updatedSlides[i] = {
          ...updatedSlides[i],
          status: "generating" as const,
        };
        setPresentation({ ...presentation, slides: [...updatedSlides] });

        try {
          const imageUrl = await generateSlideImage(
            updatedSlides[i].content,
            presentation.title,
            config
          );

          updatedSlides[i] = {
            ...updatedSlides[i],
            status: "completed" as const,
            imageUrl,
          };
        } catch (err) {
          console.error(`Failed slide ${i + 1}`, err);
          updatedSlides[i] = { ...updatedSlides[i], status: "failed" as const };
        }

        const updatedPresentation = {
          ...presentation,
          slides: [...updatedSlides],
        };
        setPresentation(updatedPresentation);

        // Update history record after each slide is generated
        if (historyId) {
          try {
            await savePresentationToHistory(
              updatedPresentation,
              config,
              historyId
            );
          } catch (err) {
            console.error("Failed to update history record:", err);
          }
        }

        const progressPerSlide = 70 / totalSlides;
        setGenerationProgress(30 + (i + 1) * progressPerSlide);
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
            className="text-muted-foreground hover:text-foreground mb-2 flex items-center gap-1"
          >
            <ChevronLeft className="w-4 h-4" /> {t.backToConfig}
          </button>
          <h2 className="text-3xl font-bold text-foreground">
            {t.reviewTitle}
          </h2>
          <p className="text-muted-foreground mt-1">{t.reviewSubtitle}</p>
        </div>
        <button
          onClick={startImageGeneration}
          className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-2.5 px-6 rounded-lg transition-all shadow-md hover:shadow-lg flex items-center gap-2"
        >
          <Play className="w-4 h-4" /> {t.confirmAndGenerate}
        </button>
      </div>

      <div className="space-y-6">
        {presentation.slides.map((slide, index) => (
          <div
            key={slide.id}
            className="bg-card rounded-xl border border-border shadow-sm p-6 relative group"
          >
            <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => handleRemoveSlide(index)}
                className="p-2 text-muted-foreground hover:text-destructive transition-colors"
                title={t.removeSlide}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-primary/10 border-2 border-primary/20 text-primary rounded-full flex items-center justify-center font-bold text-sm mt-1">
                {slide.pageNumber}
              </div>
              <div className="flex-grow space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                    {t.slideTitle}
                  </label>
                  <input
                    type="text"
                    value={slide.content.title}
                    onChange={(e) =>
                      handleUpdateSlide(index, "title", e.target.value)
                    }
                    className="w-full text-lg font-bold text-foreground border-b border-transparent hover:border-input focus:border-primary focus:outline-none transition-colors py-1"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                    {t.bulletPoints}
                  </label>
                  <textarea
                    value={slide.content.bulletPoints.join("\n")}
                    onChange={(e) =>
                      handleUpdateSlide(
                        index,
                        "bulletPoints",
                        e.target.value.split("\n")
                      )
                    }
                    className="w-full text-sm text-foreground border rounded-md border-border p-2 focus:border-primary focus:outline-none min-h-[100px]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                    {t.visualDesc}
                  </label>
                  <textarea
                    value={slide.content.visualDescription}
                    onChange={(e) =>
                      handleUpdateSlide(
                        index,
                        "visualDescription",
                        e.target.value
                      )
                    }
                    className="w-full text-sm text-muted-foreground italic bg-muted border border-border rounded-md p-2 focus:border-primary focus:outline-none min-h-[60px]"
                  />
                </div>
              </div>
            </div>
          </div>
        ))}

        <button
          onClick={handleAddSlide}
          className="w-full py-4 border-2 border-dashed border-input rounded-xl text-muted-foreground hover:border-primary hover:text-primary transition-all flex items-center justify-center gap-2 font-medium"
        >
          <Plus className="w-5 h-5" /> {t.addSlide}
        </button>

        <div className="flex justify-center mt-8">
          <button
            onClick={startImageGeneration}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-3 px-8 rounded-lg transition-all shadow-md hover:shadow-lg flex items-center gap-2"
          >
            <Play className="w-4 h-4" /> {t.confirmAndGenerate}
          </button>
        </div>
      </div>
    </div>
  );
};
