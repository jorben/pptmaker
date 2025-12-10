export type Language = 'en' | 'zh';

export const translations = {
  en: {
    appTitle: "PPTMaker AI",
    subtitle: "Upload documents or paste text to generate professional slides instantly.",
    sourceMaterial: "Source Material",
    uploadBtn: "Upload File (PDF, Word, MD, TXT)",
    pastePlaceholder: "Paste your report, article, or outline here...",
    charCount: "characters",
    nextBtn: "Next: Customize Style",
    backBtn: "Back to Input",
    settingsTitle: "Presentation Settings",
    visualStyle: "Visual Style",
    styles: {
      minimal: { title: "Minimalist", desc: "Clean, high impact, less text." },
      detailed: { title: "Detailed", desc: "Educational, comprehensive layouts." },
      custom: { title: "Custom", desc: "Describe your own unique style." }
    },
    customPlaceholder: "e.g. Cyberpunk neon, or Soft pastel watercolors...",
    additionalReqLabel: "Additional Requirements",
    additionalReqPlaceholder: "e.g. Use a dark theme, strictly follow the document structure, include a summary slide...",
    approxSlides: "Approximate Slides",
    outputLang: "Output Language",
    modelsLabel: "AI Models",
    contentModelLabel: "Content Processing",
    imageModelLabel: "Image Generation",
    contentModels: {
      flash: "Gemini 2.5 Flash (Fast & Efficient)",
      pro: "Gemini 3.0 Pro (Complex Reasoning)"
    },
    imageModels: {
      flash: "Gemini 2.5 Flash Image (Fast)",
      pro: "Gemini 3.0 Pro Image (High Quality)"
    },
    generateBtn: "Generate Presentation",
    loadingPlanning: "Analyzing content and structuring narrative...",
    loadingGenerating: "Generating visual slides",
    slidesLabel: "slides",
    exportPdf: "Export PDF",
    slideIndicator: "Slide",
    regenerateVisuals: "Regenerate Visuals",
    editorTitle: "Slide Title",
    editorBullets: "Bullet Points",
    editorPrompt: "Visual Prompt (AI)",
    designing: "Designing Slide...",
    fileUploaded: "File uploaded:",
    removeFile: "Remove",
    analyzingDoc: "Analyzing document..."
  },
  zh: {
    appTitle: "PPTMaker AI",
    subtitle: "上传文档或粘贴文本，立即生成专业演示文稿。",
    sourceMaterial: "输入素材",
    uploadBtn: "上传文件 (PDF, Word, MD, TXT)",
    pastePlaceholder: "在此粘贴您的报告、文章或大纲...",
    charCount: "字符",
    nextBtn: "下一步：风格设置",
    backBtn: "返回输入",
    settingsTitle: "演示设置",
    visualStyle: "视觉风格",
    styles: {
      minimal: { title: "极简风格", desc: "干净、高冲击力、文字较少。" },
      detailed: { title: "详细展示", desc: "教育教学、内容详实、布局全面。" },
      custom: { title: "自定义", desc: "描述您独特的风格需求。" }
    },
    customPlaceholder: "例如：赛博朋克霓虹风，或婴儿派对的柔和水彩风...",
    additionalReqLabel: "补充需求",
    additionalReqPlaceholder: "例如：使用深色主题，严格遵循文档结构，包含总结页...",
    approxSlides: "预估页数",
    outputLang: "输出语言",
    modelsLabel: "AI 模型选择",
    contentModelLabel: "内容处理模型",
    imageModelLabel: "图片生成模型",
    contentModels: {
      flash: "Gemini 2.5 Flash (快速高效)",
      pro: "Gemini 3.0 Pro (复杂推理)"
    },
    imageModels: {
      flash: "Gemini 2.5 Flash Image (快速)",
      pro: "Gemini 3.0 Pro Image (高质量)"
    },
    generateBtn: "生成演示文稿",
    loadingPlanning: "正在分析内容并构建叙事结构...",
    loadingGenerating: "正在生成视觉页面",
    slidesLabel: "页",
    exportPdf: "导出 PDF",
    slideIndicator: "第",
    regenerateVisuals: "重新生成视觉图",
    editorTitle: "页面标题",
    editorBullets: "要点内容",
    editorPrompt: "AI 视觉提示词",
    designing: "正在设计页面...",
    fileUploaded: "已上传文件：",
    removeFile: "移除",
    analyzingDoc: "正在分析文档..."
  }
};