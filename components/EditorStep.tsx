"use client";

import React from "react";
import {
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Download,
  Edit3,
  Layout,
  Settings,
  Image as ImageIcon,
  Trash2,
} from "lucide-react";
import {
  AppStep,
  type Presentation,
  type PresentationConfig,
} from "@/lib/types";
import { generateSlideImage } from "@/lib/api";
import type { translations } from "@/lib/translations";

interface Props {
  presentation: Presentation;
  setPresentation: (presentation: Presentation) => void;
  activeSlideIndex: number;
  setActiveSlideIndex: (index: number) => void;
  config: PresentationConfig;
  t: (typeof translations)["en"];
  setStep: (step: AppStep) => void;
}

export const EditorStep: React.FC<Props> = ({
  presentation,
  setPresentation,
  activeSlideIndex,
  setActiveSlideIndex,
  config,
  t,
  setStep,
}) => {
  const activeSlide = presentation.slides[activeSlideIndex];

  const deleteSlide = (e: React.MouseEvent, index: number) => {
    e.stopPropagation();

    if (presentation.slides.length <= 1) {
      alert("Cannot delete the last slide");
      return;
    }

    // eslint-disable-next-line no-restricted-globals
    if (confirm("Are you sure you want to delete this slide?")) {
      const newSlides = [...presentation.slides];
      newSlides.splice(index, 1);

      // Re-index page numbers
      newSlides.forEach((slide, i) => {
        slide.pageNumber = i + 1;
      });

      setPresentation({ ...presentation, slides: newSlides });

      if (activeSlideIndex >= newSlides.length) {
        setActiveSlideIndex(Math.max(0, newSlides.length - 1));
      } else if (index < activeSlideIndex) {
        setActiveSlideIndex(activeSlideIndex - 1);
      }
    }
  };

  const regenerateSlide = async (slideIndex: number) => {
    const newSlides = [...presentation.slides];
    const slide = newSlides[slideIndex];

    slide.status = "generating";
    setPresentation({ ...presentation, slides: newSlides });

    try {
      const imageUrl = await generateSlideImage(
        slide.content,
        presentation.title,
        config
      );
      
      slide.status = "completed";
      slide.imageUrl = imageUrl;
    } catch (e: unknown) {
      slide.status = "failed";
      const err = e as { message?: string };
      if (err.message) {
        alert(`Error: ${err.message}`);
      }
    }

    setPresentation({ ...presentation, slides: [...newSlides] });
  };

  const downloadPDF = () => {
    const originalTitle = document.title;
    document.title = presentation.title || 'Presentation';
    window.print();
    // Restore original title after print dialog
    setTimeout(() => {
      document.title = originalTitle;
    }, 100);
  };

  return (
    <div className="flex h-full bg-muted overflow-hidden">
      {/* Sidebar */}
      <div className="w-64 bg-card border-r border-border flex flex-col h-full print:hidden">
        <div
          className="p-4 border-b border-border cursor-pointer hover:bg-muted transition-colors"
          onClick={() => setStep(AppStep.INPUT)}
        >
          <div className="flex items-center gap-2">
            <div className="bg-primary p-1.5 rounded-lg">
              <Layout className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg text-foreground">
              PPTMaker AI
            </span>
          </div>
        </div>

        <div className="p-4 border-b border-border">
          <h3 className="font-bold text-foreground truncate">
            {presentation.title}
          </h3>
          <p className="text-xs text-muted-foreground">
            {presentation.slides.length} {t.slidesLabel}
          </p>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {presentation.slides.map((slide, idx) => (
            <div
              key={slide.id}
              onClick={() => setActiveSlideIndex(idx)}
              className={`relative p-2 rounded-lg cursor-pointer border-2 transition-all group ${
                idx === activeSlideIndex
                  ? "border-primary bg-primary/10"
                  : "border-transparent hover:bg-muted"
              }`}
            >
              <button
                onClick={(e) => deleteSlide(e, idx)}
                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1.5 bg-destructive text-destructive-foreground rounded-md shadow-sm hover:bg-destructive/90 transition-all z-10"
                title={t.removeSlide}
              >
                <Trash2 className="w-3 h-3" />
              </button>
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-bold text-muted-foreground">
                  #{slide.pageNumber}
                </span>
                {slide.status === "completed" ? (
                  <div className="w-2 h-2 rounded-full bg-success" />
                ) : slide.status === "failed" ? (
                  <div className="w-2 h-2 rounded-full bg-destructive" />
                ) : (
                  <div className="w-2 h-2 rounded-full bg-warning animate-pulse" />
                )}
              </div>
              <div className="aspect-video bg-muted rounded overflow-hidden relative">
                {slide.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={slide.imageUrl}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ImageIcon className="w-6 h-6 text-muted-foreground" />
                  </div>
                )}
              </div>
              <p className="text-xs text-foreground mt-2 truncate font-medium">
                {slide.content.title}
              </p>
            </div>
          ))}
        </div>
        <div className="p-4 border-t border-border">
          <button
            onClick={downloadPDF}
            className="w-full py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg flex items-center justify-center gap-2 text-sm font-medium transition-colors shadow-sm"
          >
            <Download className="w-4 h-4" /> {t.exportPdf}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Toolbar */}
        <div className="h-16 bg-card border-b border-border flex items-center justify-between px-6 print:hidden">
          <div className="flex items-center gap-4">
            <button
              onClick={() =>
                setActiveSlideIndex(Math.max(0, activeSlideIndex - 1))
              }
              disabled={activeSlideIndex === 0}
              className="p-2 rounded hover:bg-muted disabled:opacity-50"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="text-sm font-medium">
              {t.slideIndicator} {activeSlideIndex + 1} /{" "}
              {presentation.slides.length}
            </span>
            <button
              onClick={() =>
                setActiveSlideIndex(
                  Math.min(presentation.slides.length - 1, activeSlideIndex + 1)
                )
              }
              disabled={activeSlideIndex === presentation.slides.length - 1}
              className="p-2 rounded hover:bg-muted disabled:opacity-50"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => regenerateSlide(activeSlideIndex)}
              disabled={activeSlide.status === "generating"}
              className="px-4 py-2 text-primary bg-primary/10 hover:bg-primary/20 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors disabled:opacity-50"
            >
              <RefreshCw
                className={`w-4 h-4 ${
                  activeSlide.status === "generating" ? "animate-spin" : ""
                }`}
              />
              {t.regenerateVisuals}
            </button>
          </div>
        </div>

        {/* Canvas */}
        <div className="flex-1 overflow-y-auto p-8 flex items-center justify-center bg-muted print:hidden">
          <div className="w-full max-w-5xl aspect-[16/9] bg-card shadow-2xl rounded-lg overflow-hidden relative">
            {activeSlide.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={activeSlide.imageUrl}
                alt="Slide"
                className="w-full h-full object-contain"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-muted">
                <ImageIcon className="w-16 h-16 text-muted-foreground/50" />
              </div>
            )}

            {activeSlide.status === "generating" && (
              <div className="absolute inset-0 bg-card/70 backdrop-blur-sm z-20 flex flex-col items-center justify-center transition-all duration-300">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-primary font-medium">{t.designing}</p>
              </div>
            )}
          </div>
        </div>

        {/* Print View - All Slides */}
        <div className="hidden print:block print-only">
          {presentation.slides.map((s) => (
            <div key={s.id} className="print-slide">
              {s.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={s.imageUrl}
                  className="max-w-full max-h-full object-contain"
                  alt={`Slide ${s.pageNumber}`}
                />
              ) : (
                <div className="text-muted-foreground text-2xl">
                  Slide {s.pageNumber}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Editor Panel */}
        <div className="h-48 bg-card border-t border-border p-6 flex gap-6 overflow-hidden print:hidden">
          <div className="flex-1 flex flex-col">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-2">
              <Edit3 className="w-3 h-3" /> {t.editorTitle}
            </label>
            <input
              type="text"
              value={activeSlide.content.title}
              onChange={(e) => {
                const newSlides = [...presentation.slides];
                newSlides[activeSlideIndex].content.title = e.target.value;
                setPresentation({ ...presentation, slides: newSlides });
              }}
              className="w-full p-2 border border-border rounded focus:border-primary font-bold text-lg"
            />
          </div>
          <div className="flex-[2] flex flex-col">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-2">
              <Layout className="w-3 h-3" /> {t.editorBullets}
            </label>
            <textarea
              value={activeSlide.content.bulletPoints.join("\n")}
              onChange={(e) => {
                const newSlides = [...presentation.slides];
                newSlides[activeSlideIndex].content.bulletPoints =
                  e.target.value.split("\n");
                setPresentation({ ...presentation, slides: newSlides });
              }}
              className="w-full flex-1 p-2 border border-border rounded focus:border-primary resize-none font-medium"
            />
          </div>
          <div className="flex-1 flex flex-col">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-2">
              <Settings className="w-3 h-3" /> {t.editorPrompt}
            </label>
            <textarea
              value={activeSlide.content.visualDescription}
              onChange={(e) => {
                const newSlides = [...presentation.slides];
                newSlides[activeSlideIndex].content.visualDescription =
                  e.target.value;
                setPresentation({ ...presentation, slides: newSlides });
              }}
              className="w-full flex-1 p-2 border border-border rounded focus:border-primary resize-none text-xs text-muted-foreground bg-muted"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
