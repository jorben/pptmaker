"use client";

import React, { useState, useEffect } from "react";
import { Layout, Languages, Settings, Github, History } from "lucide-react";
import { AppStep } from "@/lib/types";
import type {
  Presentation,
  PresentationConfig,
  InputSource,
} from "@/lib/types";
import { SlideStyle } from "@/lib/types";
import { ApiKeyModal } from "@/components/ApiKeyModal";
import { translations, Language } from "@/lib/translations";
import { InputStep } from "@/components/InputStep";
import { ConfigStep } from "@/components/ConfigStep";
import { PlanningReviewStep } from "@/components/PlanningReviewStep";
import { LoadingStep } from "@/components/LoadingStep";
import { EditorStep } from "@/components/EditorStep";
import { HistoryDrawer } from "@/components/HistoryDrawer";
import { savePresentationToHistory } from "@/lib/db";

const INITIAL_CONFIG: PresentationConfig = {
  pageCount: "auto",
  language: "English",
  style: SlideStyle.MINIMAL,
  contentModel: "gemini-2.5-flash",
  imageModel: "gemini-2.5-flash-image",
};

export default function HomePage() {
  const [step, setStep] = useState<AppStep>(AppStep.API_KEY_CHECK);
  const [inputSource, setInputSource] = useState<InputSource>({
    type: "text",
    textContent: "",
  });
  const [uiLanguage, setUiLanguage] = useState<Language>("en");
  const [config, setConfig] = useState<PresentationConfig>(INITIAL_CONFIG);
  const [presentation, setPresentation] = useState<Presentation | null>(null);
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const [, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [streamingContent, setStreamingContent] = useState("");
  const [showApiModal, setShowApiModal] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [currentHistoryId, setCurrentHistoryId] = useState<string | null>(null);

  useEffect(() => {
    const savedLang = localStorage.getItem("ppt-maker-lang") as Language;
    if (savedLang && (savedLang === "en" || savedLang === "zh")) {
      setUiLanguage(savedLang);
    }
  }, []);

  const handleLanguageChange = (lang: Language) => {
    setUiLanguage(lang);
    localStorage.setItem("ppt-maker-lang", lang);
  };

  const t = translations[uiLanguage];

  const toggleLanguage = () => {
    handleLanguageChange(uiLanguage === "en" ? "zh" : "en");
  };

  const handleKeyConfigured = () => {
    setStep(AppStep.INPUT);
  };

  const handleHistorySelect = (
    selectedPresentation: Presentation,
    selectedConfig: PresentationConfig,
    historyId: string
  ) => {
    setPresentation(selectedPresentation);
    setConfig(selectedConfig);
    setCurrentHistoryId(historyId);
    setActiveSlideIndex(0);
    setStep(AppStep.EDITOR);
    setShowHistory(false);
  };

  // Save to history when entering editor step from generation (not from history restore)
  useEffect(() => {
    if (step === AppStep.EDITOR && presentation && !currentHistoryId) {
      savePresentationToHistory(presentation, config)
        .then((id) => {
          setCurrentHistoryId(id);
        })
        .catch((err) => console.error("Failed to save history:", err));
    }
  }, [step, presentation, currentHistoryId, config]);

  // Update history when presentation changes in editor
  useEffect(() => {
    if (step === AppStep.EDITOR && presentation && currentHistoryId) {
      const timeoutId = setTimeout(() => {
        savePresentationToHistory(presentation, config, currentHistoryId).catch(
          (err) => console.error("Failed to update history:", err)
        );
      }, 1000); // Debounce updates

      return () => clearTimeout(timeoutId);
    }
  }, [presentation, config, currentHistoryId, step]);

  // Reset history ID when starting new presentation
  useEffect(() => {
    if (step === AppStep.INPUT) {
      setCurrentHistoryId(null);
    }
  }, [step]);

  return (
    <div className="h-screen flex flex-col">
      {step === AppStep.API_KEY_CHECK && (
        <ApiKeyModal
          onKeyConfigured={handleKeyConfigured}
          t={t}
          uiLanguage={uiLanguage}
          onLanguageChange={handleLanguageChange}
        />
      )}

      {step !== AppStep.EDITOR && step !== AppStep.API_KEY_CHECK && (
        <header className="h-16 bg-card border-b border-border flex items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <div className="bg-primary p-1.5 rounded-lg">
              <Layout className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-xl text-foreground">
              PPTMaker AI
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowHistory(true)}
              className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-primary transition-colors px-3 py-1.5 rounded-full hover:bg-muted"
              title={t.history}
            >
              <History className="w-4 h-4" />
              <span className="hidden sm:inline">{t.history}</span>
            </button>
            <button
              onClick={() => setShowApiModal(true)}
              className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-primary transition-colors px-3 py-1.5 rounded-full hover:bg-muted"
              title={t.configureApiKey}
            >
              <Settings className="w-4 h-4" />
              <span className="hidden sm:inline">API</span>
            </button>
            <button
              onClick={toggleLanguage}
              className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-primary transition-colors px-3 py-1.5 rounded-full hover:bg-muted"
            >
              <Languages className="w-4 h-4" />
              {uiLanguage === "en" ? "中文" : "English"}
            </button>
            <a
              href="https://github.com/jorben/pptmaker"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-primary transition-colors px-3 py-1.5 rounded-full hover:bg-muted"
              title="GitHub"
            >
              <Github className="w-4 h-4" />
            </a>
          </div>
        </header>
      )}

      <main className="flex-1 bg-muted overflow-y-auto relative">
        {step === AppStep.INPUT && (
          <InputStep
            inputSource={inputSource}
            setInputSource={setInputSource}
            setStep={setStep}
            t={t}
            uiLanguage={uiLanguage}
          />
        )}
        {step === AppStep.CONFIG && (
          <ConfigStep
            config={config}
            setConfig={setConfig}
            setStep={setStep}
            inputSource={inputSource}
            setPresentation={setPresentation}
            setIsGenerating={setIsGenerating}
            setGenerationProgress={setGenerationProgress}
            setStreamingContent={setStreamingContent}
            t={t}
            uiLanguage={uiLanguage}
          />
        )}
        {step === AppStep.PLANNING_REVIEW && presentation && (
          <PlanningReviewStep
            presentation={presentation}
            setPresentation={setPresentation}
            setStep={setStep}
            config={config}
            setIsGenerating={setIsGenerating}
            setGenerationProgress={setGenerationProgress}
            currentHistoryId={currentHistoryId}
            setCurrentHistoryId={setCurrentHistoryId}
            t={t}
            uiLanguage={uiLanguage}
          />
        )}
        {(step === AppStep.PLANNING || step === AppStep.GENERATING) && (
          <LoadingStep
            step={step}
            presentation={presentation}
            generationProgress={generationProgress}
            streamingContent={streamingContent}
            t={t}
            uiLanguage={uiLanguage}
          />
        )}
        {step === AppStep.EDITOR && presentation && (
          <EditorStep
            presentation={presentation}
            setPresentation={setPresentation}
            activeSlideIndex={activeSlideIndex}
            setActiveSlideIndex={setActiveSlideIndex}
            config={config}
            t={t}
            setStep={setStep}
          />
        )}
      </main>

      <footer className="py-2 text-center text-xs text-muted-foreground bg-card border-t border-border print:hidden">
        Powered by{" "}
        <a
          href="https://github.com/jorben/pptmaker"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-primary transition-colors"
        >
          PPTMaker
        </a>
      </footer>

      {showApiModal && (
        <ApiKeyModal
          onKeyConfigured={() => setShowApiModal(false)}
          onCancel={() => setShowApiModal(false)}
          t={t}
          uiLanguage={uiLanguage}
          onLanguageChange={handleLanguageChange}
          forceEdit={true}
        />
      )}

      <HistoryDrawer
        isOpen={showHistory}
        onClose={() => setShowHistory(false)}
        onSelect={handleHistorySelect}
        t={t}
      />

      <style jsx global>{`
        @media print {
          @page {
            margin: 0;
            size: 16in 9in landscape;
          }
          html,
          body,
          #__next {
            width: auto !important;
            height: auto !important;
            margin: 0;
            padding: 0;
            overflow: visible !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .h-screen {
            height: auto !important;
          }
          .overflow-hidden {
            overflow: visible !important;
          }
          .flex-1 {
            flex: none !important;
          }
        }
      `}</style>
    </div>
  );
}
