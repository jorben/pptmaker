// 统一管理 Prompt 模板

import { SlideStyle, PresentationConfig, SlideContent } from "./types";

/**
 * 获取风格描述
 */
export function getStylePrompt(config: PresentationConfig): string {
  if (config.style === SlideStyle.CUSTOM) {
    return `Custom Style: ${config.customStyleDescription}`;
  }
  return `Style: ${
    config.style === SlideStyle.MINIMAL
      ? "Minimalist, high impact, few words"
      : "Content detailed, educational, comprehensive information"
  }`;
}

/**
 * 获取附加上下文
 */
export function getAdditionalContext(
  config: PresentationConfig,
  prefix: string = "Important Additional Instructions from User"
): string {
  if (!config.additionalPrompt) {
    return "";
  }
  return `\n${prefix}: ${config.additionalPrompt}`;
}

/**
 * 获取视觉风格上下文
 */
export function getStyleContext(config: PresentationConfig): string {
  if (config.style === SlideStyle.CUSTOM) {
    return config.customStyleDescription || "";
  }
  return config.style === SlideStyle.MINIMAL
    ? "Modern, clean, lots of whitespace, corporate memphis or swiss style"
    : "Professional, structured, grid layout, academic or technical style";
}

/**
 * 构建规划演示文稿的系统提示词
 */
export function buildPlanningSystemPrompt(config: PresentationConfig): string {
  const stylePrompt = getStylePrompt(config);
  const additionalContext = getAdditionalContext(config);

  const pageCountInstruction =
    config.pageCount === "auto"
      ? "Determine the optimal number of slides based on the content's complexity and structure. Use your judgment to create an appropriate number of slides that best presents the material."
      : `Split it into a ${config.pageCount}-page presentation.`;

  return `You are an expert presentation designer. 
Analyze the provided input (text or document) and ${pageCountInstruction}
Presentation contents language: ${config.language}.
${stylePrompt}
${additionalContext}
Maintain consistent styles (including color schemes, themes, and roles) across multiple pages.

Return a JSON object with a 'title' for the whole deck and an array of 'slides'.
For each slide, provide:
1. 'title': The slide headline.
2. 'bulletPoints': 3-5 key points (text only).
3. 'visualDescription': A highly detailed, artistic description of how the slide should look visually, Vividly interpret the plot and content through graphic elements such as infographics, layered diagrams, structural diagrams, comparison charts, storyboard frames, maps, timelines, and charts.`;
}

/**
 * 构建规划演示文稿的用户输入
 */
export function buildPlanningUserPrompt(document: string): string {
  return `Input Text:\n${document.substring(0, 128000)}`;
}

/**
 * 构建规划演示文稿的 JSON Schema（用于 VertexAI）
 */
export function getPlanningResponseSchema() {
  return {
    type: "OBJECT",
    properties: {
      title: { type: "STRING" },
      slides: {
        type: "ARRAY",
        items: {
          type: "OBJECT",
          properties: {
            title: { type: "STRING" },
            bulletPoints: { type: "ARRAY", items: { type: "STRING" } },
            visualDescription: { type: "STRING" },
          },
          required: ["title", "bulletPoints", "visualDescription"],
        },
      },
    },
    required: ["title", "slides"],
  };
}

/**
 * 构建规划演示文稿的 JSON 输出格式说明（用于 OpenAI）
 */
export function getPlanningOutputFormatHint(): string {
  return `
Output format:
{
  "title": "Presentation Title",
  "slides": [
    {
      "title": "Slide Title",
      "bulletPoints": ["Point 1", "Point 2", "Point 3"],
      "visualDescription": "Description of the visual design"
    }
  ]
}`;
}

/**
 * 构建生成幻灯片图片的提示词
 */
export function buildImageGenerationPrompt(
  slide: SlideContent,
  deckTitle: string,
  config: PresentationConfig
): string {
  const styleContext = getStyleContext(config);
  const additionalContext = getAdditionalContext(
    config,
    "Additional Style Requirements"
  );

  return `Design a professional presentation slide.

Context:
Slide Title: ${slide.title}
Slide Bullet Points: ${slide.bulletPoints.join(", ")}
Style Guide: ${styleContext}
${additionalContext}

Visual Instructions:
${slide.visualDescription}

IMPORTANT TEXT RENDERING RULES:
- DO NOT include labels such as "Presentation Title", "Slide Title", or "Bullet Points".

DESIGN REQUIREMENTS:
- Create a high-quality slide design.
- Aspect Ratio 16:9.
- Design vivid graphics, matching scenes, appropriate structure to complement simplified text.`;
}
