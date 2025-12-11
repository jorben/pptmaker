"use client";

import React, { useState } from "react";
import { Layout, Languages } from "lucide-react";
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

const INITIAL_CONFIG: PresentationConfig = {
  pageCount: 6,
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

  const t = translations[uiLanguage];

  const toggleLanguage = () => {
    setUiLanguage((prev) => (prev === "en" ? "zh" : "en"));
  };

  const handleKeyConfigured = () => {
    setStep(AppStep.INPUT);
  };

  return (
    <div className="h-screen flex flex-col">
      {step === AppStep.API_KEY_CHECK && (
        <ApiKeyModal onKeyConfigured={handleKeyConfigured} t={t} />
      )}

      {step !== AppStep.EDITOR && step !== AppStep.API_KEY_CHECK && (
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 p-1.5 rounded-lg">
              <Layout className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-xl text-slate-900">
              PPTMaker AI
            </span>
          </div>
          <button
            onClick={toggleLanguage}
            className="flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors px-3 py-1.5 rounded-full hover:bg-slate-100"
          >
            <Languages className="w-4 h-4" />
            {uiLanguage === "en" ? "中文" : "English"}
          </button>
        </header>
      )}

      <main className="flex-1 bg-slate-50 overflow-y-auto relative">
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
            t={t}
            uiLanguage={uiLanguage}
          />
        )}
        {(step === AppStep.PLANNING || step === AppStep.GENERATING) && (
          <LoadingStep
            step={step}
            presentation={presentation}
            generationProgress={generationProgress}
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
