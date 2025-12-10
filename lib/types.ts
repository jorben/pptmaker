// AI Studio global interface (only available in AI Studio environment)
declare global {
  interface Window {
    aistudio?: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    };
    mammoth?: {
      extractRawText: (options: { arrayBuffer: ArrayBuffer }) => Promise<{ value: string; messages: any[] }>;
    };
  }
}

export enum AppStep {
  API_KEY_CHECK = 'API_KEY_CHECK',
  INPUT = 'INPUT',
  CONFIG = 'CONFIG',
  PLANNING = 'PLANNING',
  GENERATING = 'GENERATING',
  EDITOR = 'EDITOR'
}

export enum SlideStyle {
  MINIMAL = 'MINIMAL',
  DETAILED = 'DETAILED',
  CUSTOM = 'CUSTOM'
}

export interface InputSource {
  type: 'text' | 'file';
  textContent?: string;
  fileData?: string; // base64
  mimeType?: string;
  fileName?: string;
}

export interface PresentationConfig {
  pageCount: number;
  language: 'Chinese' | 'English';
  style: SlideStyle;
  customStyleDescription?: string;
  additionalPrompt?: string;
  contentModel: string;
  imageModel: string;
}

export interface SlideContent {
  title: string;
  bulletPoints: string[];
  visualDescription: string;
}

export interface Slide {
  id: string;
  pageNumber: number;
  content: SlideContent;
  status: 'pending' | 'generating' | 'completed' | 'failed';
  imageUrl?: string;
  promptUsed?: string;
}

export interface Presentation {
  title: string;
  slides: Slide[];
}

// Gemini API types
export interface GeminiRequest {
  action: 'plan-presentation' | 'generate-image' | 'optimize-content';
  payload: {
    prompt?: string;
    document?: string;
    model?: string;
    options?: Record<string, unknown>;
  };
}

export interface GeminiResponse {
  success: boolean;
  data?: {
    content: string;
    metadata?: Record<string, unknown>;
  };
  error?: string;
}

export interface DocumentContent {
  text: string;
  html?: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

