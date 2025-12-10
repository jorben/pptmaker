import React, { useState, useCallback, useRef, useEffect } from 'react';
import { AppStep, Presentation, Slide, PresentationConfig, SlideStyle, InputSource } from './types';
import { planPresentation, generateSlideImage } from './services/geminiService';
import { ApiKeyModal } from './components/ApiKeyModal';
import { ProgressBar } from './components/ProgressBar';
import { translations, Language } from './translations';
import { 
  FileText, 
  Settings, 
  Wand2, 
  Layout, 
  Download, 
  ChevronLeft, 
  ChevronRight, 
  RefreshCw,
  Image as ImageIcon,
  Edit3,
  Languages,
  X,
  File,
  CheckCircle,
  AlertCircle,
  Loader2,
  Clock,
  Cpu
} from 'lucide-react';

const INITIAL_CONFIG: PresentationConfig = {
  pageCount: 6,
  language: 'English',
  style: SlideStyle.MINIMAL,
  contentModel: 'gemini-2.5-flash',
  imageModel: 'gemini-2.5-flash-image',
};

// Types for Mammoth.js which is loaded globally via CDN
declare global {
  interface Window {
    mammoth: {
      extractRawText: (options: { arrayBuffer: ArrayBuffer }) => Promise<{ value: string; messages: any[] }>;
    };
  }
}

export default function App() {
  const [step, setStep] = useState<AppStep>(AppStep.API_KEY_CHECK);
  
  // Input State
  const [inputSource, setInputSource] = useState<InputSource>({ type: 'text', textContent: '' });
  
  // UI State
  const [uiLanguage, setUiLanguage] = useState<Language>('en');
  const t = translations[uiLanguage];
  
  const [config, setConfig] = useState<PresentationConfig>(INITIAL_CONFIG);
  const [presentation, setPresentation] = useState<Presentation | null>(null);
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  
  // Ref for auto-scrolling the progress list
  const progressListRef = useRef<HTMLDivElement>(null);

  // -- Handlers --

  const toggleLanguage = () => {
    setUiLanguage(prev => prev === 'en' ? 'zh' : 'en');
  };

  const handleKeySelected = () => {
    setStep(AppStep.INPUT);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 20MB Limit for inline data
    if (file.size > 20 * 1024 * 1024) {
      alert(uiLanguage === 'en' ? "File is too large (Max 20MB)" : "文件过大 (最大 20MB)");
      return;
    }

    // Reset current input
    setInputSource({ type: 'text', textContent: '' });

    if (file.type === 'application/pdf') {
       // Handle PDF: Read as base64 for Gemini multimodal
       const reader = new FileReader();
       reader.onload = (event) => {
         const base64String = (event.target?.result as string).split(',')[1];
         setInputSource({
           type: 'file',
           fileData: base64String,
           mimeType: 'application/pdf',
           fileName: file.name
         });
       };
       reader.readAsDataURL(file);
    } else if (file.name.endsWith('.docx')) {
       // Handle Word: Use Mammoth.js to extract text
       try {
         const arrayBuffer = await file.arrayBuffer();
         if (window.mammoth) {
            const result = await window.mammoth.extractRawText({ arrayBuffer });
            setInputSource({
              type: 'text',
              textContent: result.value,
              fileName: file.name
            });
         } else {
           alert("Word processor not loaded yet. Please try again in a moment.");
         }
       } catch (error) {
         console.error("Error parsing Word file", error);
         alert("Failed to read Word document.");
       }
    } else {
       // Handle Text/MD/JSON
       const text = await file.text();
       setInputSource({
         type: 'text',
         textContent: text,
         fileName: file.name
       });
    }
  };

  const clearFile = () => {
    setInputSource({ type: 'text', textContent: '' });
    // Clear the file input value
    const fileInput = document.getElementById('file-upload') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  };

  const startGeneration = async () => {
    // Validation
    if (inputSource.type === 'text' && !inputSource.textContent?.trim()) return;
    if (inputSource.type === 'file' && !inputSource.fileData) return;

    setStep(AppStep.PLANNING);
    setIsGenerating(true);
    setGenerationProgress(10);

    try {
      // 1. Plan Structure
      const plan = await planPresentation(inputSource, config);
      setGenerationProgress(30);

      const initialSlides: Slide[] = plan.slides.map((s, i) => ({
        id: crypto.randomUUID(),
        pageNumber: i + 1,
        content: s,
        status: 'pending',
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
        updatedSlides[i] = { ...updatedSlides[i], status: 'generating' };
        setPresentation({ title: plan.title, slides: [...updatedSlides] });
        
        // Auto scroll to latest item
        if (progressListRef.current) {
          const listNode = progressListRef.current;
          // Small timeout to allow render
          setTimeout(() => {
             listNode.scrollTop = listNode.scrollHeight;
          }, 100);
        }
        
        try {
          const imageUrl = await generateSlideImage(updatedSlides[i].content, plan.title, config);
          updatedSlides[i] = { 
            ...updatedSlides[i], 
            status: 'completed', 
            imageUrl 
          };
        } catch (err) {
          console.error(`Failed slide ${i + 1}`, err);
          updatedSlides[i] = { ...updatedSlides[i], status: 'failed' };
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
      if (error.message?.includes('location') || error.status === 400 || error.code === 400) {
        msg = uiLanguage === 'en' 
          ? "API Error: User location is not supported for this model. Please check your region settings."
          : "API 错误：您所在的地区不支持此模型。请检查您的网络设置。";
      } else if (error.message?.includes('timeout') || error.status === 504) {
        msg = "The request timed out. The document might be too long.";
      }
      
      alert(msg);
      setStep(AppStep.INPUT);
      setIsGenerating(false);
    }
  };

  const regenerateSlide = async (slideIndex: number) => {
    if (!presentation) return;
    
    const newSlides = [...presentation.slides];
    const slide = newSlides[slideIndex];
    
    slide.status = 'generating';
    setPresentation({ ...presentation, slides: newSlides });

    try {
      const imageUrl = await generateSlideImage(slide.content, presentation.title, config);
      slide.status = 'completed';
      slide.imageUrl = imageUrl;
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

  // -- Render Steps --

  const renderInputStep = () => (
    <div className="max-w-4xl mx-auto w-full p-6 animate-fade-in">
      <div className="text-center mb-10">
        <h1 className="text-4xl font-bold text-slate-900 mb-4 tracking-tight">{t.appTitle}</h1>
        <p className="text-lg text-slate-600">{t.subtitle}</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-8">
        <div className="mb-4 flex justify-between items-center">
          <label className="block text-sm font-medium text-slate-700">{t.sourceMaterial}</label>
          <div className="relative">
            <input 
              id="file-upload"
              type="file" 
              accept=".txt,.md,.json,.pdf,.docx" 
              onChange={handleFileUpload}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <button className="text-sm text-indigo-600 font-medium hover:text-indigo-700 flex items-center gap-1">
              <FileText className="w-4 h-4" /> {t.uploadBtn}
            </button>
          </div>
        </div>
        
        {/* File Preview or Text Area */}
        {inputSource.fileName ? (
          <div className="w-full h-64 flex flex-col items-center justify-center border-2 border-dashed border-indigo-200 rounded-lg bg-indigo-50 relative">
             <button 
                onClick={clearFile}
                className="absolute top-4 right-4 p-2 text-slate-400 hover:text-red-500 hover:bg-white rounded-full transition-colors"
                title={t.removeFile}
             >
               <X className="w-5 h-5" />
             </button>
             <File className="w-16 h-16 text-indigo-400 mb-4" />
             <p className="text-lg font-medium text-indigo-900">{t.fileUploaded}</p>
             <p className="text-slate-600">{inputSource.fileName}</p>
             {inputSource.type === 'file' && <p className="text-xs text-slate-400 mt-2">(PDF Analysis Mode)</p>}
             {inputSource.type === 'text' && inputSource.textContent && (
               <p className="text-xs text-slate-400 mt-2">({inputSource.textContent.length} {t.charCount})</p>
             )}
          </div>
        ) : (
          <div className="relative">
             <textarea
              value={inputSource.textContent || ''}
              onChange={(e) => setInputSource({ type: 'text', textContent: e.target.value })}
              placeholder={t.pastePlaceholder}
              className="w-full h-64 p-4 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none text-slate-800"
            />
            <div className="mt-2 text-right text-xs text-slate-400">
              {(inputSource.textContent || '').length} {t.charCount}
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-center">
        <button
          disabled={!inputSource.textContent && !inputSource.fileData}
          onClick={() => setStep(AppStep.CONFIG)}
          className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white text-lg font-semibold py-3 px-10 rounded-full transition-all shadow-lg hover:shadow-xl flex items-center gap-2"
        >
          {t.nextBtn} <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );

  const renderConfigStep = () => (
    <div className="max-w-4xl mx-auto w-full p-6 animate-fade-in">
       <button 
          onClick={() => setStep(AppStep.INPUT)}
          className="text-slate-500 hover:text-slate-800 mb-6 flex items-center gap-1"
        >
          <ChevronLeft className="w-4 h-4" /> {t.backBtn}
      </button>

      <h2 className="text-3xl font-bold text-slate-900 mb-8">{t.settingsTitle}</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        
        {/* Visual Style Selection */}
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

        {/* Model Selection */}
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

        {/* Additional Requirements */}
        <div className="col-span-2">
           <label className="block text-sm font-medium text-slate-700 mb-2">{t.additionalReqLabel}</label>
           <textarea
            placeholder={t.additionalReqPlaceholder}
            className="w-full p-3 border border-slate-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 h-24 resize-none"
            value={config.additionalPrompt || ''}
            onChange={(e) => setConfig({...config, additionalPrompt: e.target.value})}
           />
        </div>

        {/* Page Count */}
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

        {/* Language */}
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

  const renderLoading = () => {
    // Phase 1: Planning
    if (step === AppStep.PLANNING) {
      return (
        <div className="flex flex-col items-center justify-center h-full max-w-2xl mx-auto p-6 animate-fade-in">
           <div className="mb-8 relative">
             <div className="w-24 h-24 border-4 border-indigo-100 rounded-full animate-pulse"></div>
             <div className="absolute top-0 left-0 w-24 h-24 border-4 border-t-indigo-600 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
             <Wand2 className="w-8 h-8 text-indigo-600 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
           </div>
           <h2 className="text-2xl font-bold text-slate-900 mb-2">{t.loadingPlanning}</h2>
           <p className="text-slate-500 mb-8 text-center max-w-md mx-auto">
             {t.analyzingDoc}
             {/* Feedback for slow planning */}
             <span className="block mt-2 text-xs text-slate-400">
               {uiLanguage === 'en' 
                 ? "This may take a few moments for large documents..." 
                 : "大型文档可能需要一些时间..."}
             </span>
           </p>
           <ProgressBar progress={generationProgress} />
        </div>
      );
    }

    // Phase 2: Generating Images (Detailed View)
    if (step === AppStep.GENERATING && presentation) {
      return (
        <div className="flex flex-col h-full max-w-3xl mx-auto p-6 animate-fade-in w-full">
           <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-slate-900 mb-2">{t.loadingGenerating}</h2>
              <div className="w-full max-w-md mx-auto">
                 <ProgressBar progress={generationProgress} label={`${Math.round(generationProgress)}%`} />
              </div>
           </div>

           <div className="flex-1 overflow-hidden flex flex-col bg-white rounded-xl border border-slate-200 shadow-sm relative">
              <div ref={progressListRef} className="flex-1 overflow-y-auto p-2 scroll-smooth">
                 {presentation.slides.map((slide, i) => (
                    <div 
                      key={slide.id} 
                      className={`p-4 flex items-center gap-4 border-b border-slate-50 last:border-0 rounded-lg transition-colors ${
                        slide.status === 'generating' ? 'bg-indigo-50' : 'hover:bg-slate-50'
                      }`}
                    >
                       <div className={`flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full font-bold text-sm ${
                         slide.status === 'completed' ? 'bg-green-100 text-green-700' : 
                         slide.status === 'generating' ? 'bg-indigo-100 text-indigo-700' :
                         slide.status === 'failed' ? 'bg-red-100 text-red-700' :
                         'bg-slate-100 text-slate-500'
                       }`}>
                          {slide.pageNumber}
                       </div>
                       
                       <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium truncate ${
                             slide.status === 'completed' ? 'text-slate-900' : 
                             slide.status === 'generating' ? 'text-indigo-900' : 'text-slate-500'
                          }`}>
                            {slide.content.title || `Slide ${slide.pageNumber}`}
                          </p>
                          <p className="text-xs text-slate-400 truncate">
                            {slide.status === 'generating' ? t.designing : slide.content.visualDescription}
                          </p>
                       </div>

                       <div className="flex-shrink-0">
                          {slide.status === 'pending' && <Clock className="w-5 h-5 text-slate-300" />}
                          {slide.status === 'generating' && <Loader2 className="w-5 h-5 text-indigo-600 animate-spin" />}
                          {slide.status === 'completed' && <CheckCircle className="w-5 h-5 text-green-500" />}
                          {slide.status === 'failed' && <AlertCircle className="w-5 h-5 text-red-500" />}
                       </div>
                    </div>
                 ))}
              </div>
              {/* Fade overlay at bottom if overflowing */}
              <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-white to-transparent pointer-events-none"></div>
           </div>
        </div>
      );
    }
    
    return null;
  };

  const renderEditor = () => {
    if (!presentation) return null;
    const activeSlide = presentation.slides[activeSlideIndex];

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
           <div className="flex-1 overflow-y-auto p-8 flex justify-center bg-slate-100 print:bg-white print:p-0">
             <div className="w-full max-w-5xl aspect-video bg-white shadow-2xl rounded-lg overflow-hidden relative print:shadow-none print:w-full print:h-screen print:rounded-none">
                
                {/* Background Image */}
                {activeSlide.imageUrl && (
                  <img src={activeSlide.imageUrl} alt="Background" className="absolute inset-0 w-full h-full object-cover z-0" />
                )}

                {/* Content Overlay */}
                <div className="absolute inset-0 z-10 p-16 flex flex-col bg-black/10">
                   <div className="bg-white/90 backdrop-blur-sm p-8 rounded-xl shadow-lg max-w-3xl self-start mt-auto mb-16 ml-8">
                     <h1 className="text-4xl font-bold text-slate-900 mb-6">{activeSlide.content.title}</h1>
                     <ul className="space-y-3">
                        {activeSlide.content.bulletPoints.map((point, i) => (
                          <li key={i} className="flex items-start gap-2 text-lg text-slate-800">
                             <span className="mt-2 w-2 h-2 rounded-full bg-indigo-600 shrink-0"></span>
                             {point}
                          </li>
                        ))}
                     </ul>
                   </div>
                </div>

                {/* Loading State Overlay */}
                {activeSlide.status === 'generating' && (
                  <div className="absolute inset-0 bg-white/80 z-20 flex flex-col items-center justify-center">
                    <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4"></div>
                    <p className="text-indigo-900 font-medium">{t.designing}</p>
                  </div>
                )}
             </div>

             {/* Print View Loop */}
             <div className="hidden print:block absolute top-0 left-0 w-full">
                {presentation.slides.map((s, i) => (
                  <div key={s.id} className="w-full h-screen relative page-break-after-always overflow-hidden">
                      {s.imageUrl && <img src={s.imageUrl} className="absolute inset-0 w-full h-full object-cover" />}
                       <div className="absolute inset-0 z-10 p-16 flex flex-col">
                         <div className="bg-white/90 p-8 rounded-xl max-w-3xl mt-auto mb-16 ml-8 border border-gray-200">
                           <h1 className="text-4xl font-bold text-black mb-6">{s.content.title}</h1>
                           <ul className="space-y-3">
                              {s.content.bulletPoints.map((point, idx) => (
                                <li key={idx} className="flex items-start gap-2 text-xl text-black">
                                   <span className="mt-2 w-2 h-2 rounded-full bg-black shrink-0"></span>
                                   {point}
                                </li>
                              ))}
                           </ul>
                         </div>
                      </div>
                  </div>
                ))}
             </div>
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

  return (
    <div className="h-full flex flex-col">
      {step === AppStep.API_KEY_CHECK && <ApiKeyModal onKeySelected={handleKeySelected} />}
      
      {/* Header */}
      {step !== AppStep.EDITOR && step !== AppStep.API_KEY_CHECK && (
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 p-1.5 rounded-lg">
               <Layout className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-xl text-slate-900">PPTMaker AI</span>
          </div>
          <button 
            onClick={toggleLanguage}
            className="flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors px-3 py-1.5 rounded-full hover:bg-slate-100"
          >
            <Languages className="w-4 h-4" />
            {uiLanguage === 'en' ? '中文' : 'English'}
          </button>
        </header>
      )}

      {/* Main Area */}
      <main className="flex-1 bg-slate-50 overflow-hidden relative">
        {step === AppStep.INPUT && renderInputStep()}
        {step === AppStep.CONFIG && renderConfigStep()}
        {(step === AppStep.PLANNING || step === AppStep.GENERATING) && renderLoading()}
        {step === AppStep.EDITOR && renderEditor()}
      </main>

      <style>{`
        @media print {
          @page { margin: 0; size: landscape; }
          body { -webkit-print-color-adjust: exact; }
          .page-break-after-always { page-break-after: always; }
        }
      `}</style>
    </div>
  );
}