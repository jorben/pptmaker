// AI Studio global interface (only available in AI Studio environment)
declare global {
  interface Window {
    aistudio?: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
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
  MINIMAL = 'MINIMAL', // To-the-point, high impact
  DETAILED = 'DETAILED', // Educational, text-heavy
  CUSTOM = 'CUSTOM' // User defined
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
  additionalPrompt?: string; // Supplementary requirements from user
  contentModel: string;
  imageModel: string;
}

export interface SlideContent {
  title: string;
  bulletPoints: string[];
  visualDescription: string; // The instruction for the image model
}

export interface Slide {
  id: string;
  pageNumber: number;
  content: SlideContent;
  status: 'pending' | 'generating' | 'completed' | 'failed';
  imageUrl?: string;
  promptUsed?: string; // The actual prompt sent to image model
}

export interface Presentation {
  title: string;
  slides: Slide[];
}