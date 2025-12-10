import {
  GoogleGenAI,
  Type,
  Schema,
  GenerateContentResponse,
} from "@google/genai";
import {
  Slide,
  SlideContent,
  PresentationConfig,
  SlideStyle,
  InputSource,
} from "../types";

// Helper to get client with current key
const getClient = () => {
  // Priority: 1. Runtime key (manual input) 2. Environment variable
  const apiKey = (window as any).__GEMINI_API_KEY__ || process.env.GEMINI_API_KEY || process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key not found. Please provide a valid Gemini API key.");
  }
  return new GoogleGenAI({ apiKey });
};

// Retry helper for robustness against timeouts (499) and server busy states
const retry = async <T>(
  fn: () => Promise<T>,
  retries = 2,
  delay = 2000
): Promise<T> => {
  try {
    return await fn();
  } catch (error: any) {
    // Do not retry on 400 (Bad Request/Precondition) as it indicates permanent issues like Location Not Supported or Bad Request
    if (error.status === 400 || error.code === 400) {
      throw error;
    }

    const isRetryable =
      error.status === 499 ||
      error.status === 503 ||
      error.status === 504 ||
      error.message?.includes("cancelled") ||
      error.message?.includes("timeout") ||
      error.message?.includes("fetch failed");

    if (retries > 0 && isRetryable) {
      console.warn(
        `Operation failed with ${
          error.status || error.message
        }. Retrying... (${retries} attempts left)`
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
      return retry(fn, retries - 1, delay * 2);
    }
    throw error;
  }
};

// 1. Plan the Presentation (Split text or document into slides)
export const planPresentation = async (
  input: InputSource,
  config: PresentationConfig
): Promise<{ title: string; slides: SlideContent[] }> => {
  const ai = getClient();

  const stylePrompt =
    config.style === SlideStyle.CUSTOM
      ? `Custom Style: ${config.customStyleDescription}`
      : `Style: ${
          config.style === SlideStyle.MINIMAL
            ? "Minimalist, high impact, few words"
            : "Detailed, educational, comprehensive"
        }`;

  const additionalContext = config.additionalPrompt
    ? `\nImportant Additional Instructions from User: ${config.additionalPrompt}`
    : "";

  const systemInstruction = `
    You are an expert presentation designer. 
    Analyze the provided input (text or document) and split it into a ${config.pageCount}-page presentation.
    Output Language: ${config.language}.
    ${stylePrompt}
    ${additionalContext}

    Return a JSON object with a 'title' for the whole deck and an array of 'slides'.
    For each slide, provide:
    1. 'title': The slide headline.
    2. 'bulletPoints': 3-5 key points (text only).
    3. 'visualDescription': A highly detailed, artistic description of how the slide should look visually. 
       Describe the layout, colors, background, and any diagrams or images. 
       Include the text placement instructions in this description so the image generator knows where to put whitespace.
       Do NOT ask for real text rendering in the image, just the visual composition.
  `;

  const responseSchema: Schema = {
    type: Type.OBJECT,
    properties: {
      title: { type: Type.STRING },
      slides: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            bulletPoints: { type: Type.ARRAY, items: { type: Type.STRING } },
            visualDescription: { type: Type.STRING },
          },
          required: ["title", "bulletPoints", "visualDescription"],
        },
      },
    },
    required: ["title", "slides"],
  };

  let contentParts: any[] = [];

  if (input.type === "file" && input.fileData && input.mimeType) {
    // Multimodal input (PDF)
    contentParts = [
      {
        inlineData: {
          mimeType: input.mimeType,
          data: input.fileData,
        },
      },
      {
        text: "Analyze this document and generate the presentation structure based on the system instructions.",
      },
    ];
  } else {
    // Text input
    const textContent = input.textContent || "";
    contentParts = [
      {
        text: `Input Text:\n${textContent.substring(0, 30000)}`, // Truncate for safety
      },
    ];
  }

  // Wrapped in retry to handle 499/Timeouts
  const response = await retry(() =>
    ai.models.generateContent({
      model: config.contentModel || "gemini-2.5-flash",
      contents: {
        role: "user",
        parts: contentParts,
      },
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: responseSchema,
      },
    })
  );

  if (!response.text) throw new Error("No response from AI");
  return JSON.parse(response.text);
};

// 2. Generate Slide Image
export const generateSlideImage = async (
  slide: SlideContent,
  deckTitle: string,
  config: PresentationConfig
): Promise<string> => {
  const ai = getClient();

  const styleContext =
    config.style === SlideStyle.CUSTOM
      ? config.customStyleDescription
      : config.style === SlideStyle.MINIMAL
      ? "Modern, clean, lots of whitespace, corporate memphis or swiss style"
      : "Professional, structured, grid layout, academic or technical style";

  const additionalContext = config.additionalPrompt
    ? `\nAdditional Style Requirements: ${config.additionalPrompt}`
    : "";

  // Constructing a prompt for the Image generation model
  const prompt = `
    Design a professional presentation slide.
    
    Context:
    Presentation Title: ${deckTitle}
    Slide Title: ${slide.title}
    Style Guide: ${styleContext}
    ${additionalContext}
    
    Visual Instructions:
    ${slide.visualDescription}
    
    Important:
    - Create a high-quality slide design.
    - Ensure the layout has clear space for text overlay (which will be added later), or artistically integrate the headline "${slide.title}".
    - The image should look like a finished PowerPoint slide background and diagram.
    - Aspect Ratio 16:9.
  `;

  const modelName = config.imageModel || "gemini-2.5-flash-image";
  const imageConfig: any = {
    aspectRatio: "16:9",
  };

  // Only add imageSize for Pro models, as Flash models do not support it
  if (modelName.includes("pro")) {
    imageConfig.imageSize = "2K";
  }

  // Wrapped in retry
  const response = await retry(() =>
    ai.models.generateContent({
      model: modelName,
      contents: {
        parts: [{ text: prompt }],
      },
      config: {
        imageConfig: imageConfig,
      },
    })
  );

  // Extract image
  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }

  throw new Error("No image generated");
};
