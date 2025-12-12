export interface Theme {
  name: {
    en: string;
    zh: string;
  };
  prompt: string;
  thumbnail: string;
}

export const THEMES: Theme[] = [
  {
    name: {
      en: "Luxurious Black and Gold Style",
      zh: "奢华黑金",
    },
    prompt:
      "Digital art style, luxury financial concept, A dark navy void background. Glowing gold data visualization charts and UI elements floating. Minimalist yet detailed, premium feel, tyndall effect, golden lighting, cinematic composition.",
    thumbnail: "/theme/luxurious_black_gold.png",
  },
  {
    name: {
      en: "Doraemon & Nobita Style",
      zh: "哆啦A梦和大雄",
    },
    prompt:
      "Japanese Anime, Cel-shading, 2D Illustration, Blueprint Blue or Dodger Blue Background, Technical Grid, Doraemon & Nobita vividly interpret plots and content using charts, diagrams, etc.",
    thumbnail: "/theme/doraemon_nobita2.png",
  },
  {
    name: {
      en: "Cyberpunk Style",
      zh: "赛博朋克",
    },
    prompt:
      "Digital art style, cyberpunk concept, a dark and futuristic background. Glowing neon lights and UI elements floating. Minimalist yet detailed, premium feel, tyndall effect, neon lighting, cinematic composition.",
    thumbnail: "/theme/cyberpunk.png",
  },
  {
    name: {
      en: "Cartoon Magical Forest",
      zh: "卡通魔法森林",
    },
    prompt:
      "Anthropomorphic animal characters wearing cute outfits, heartwarming children's picture book illustration style. Soft watercolor painting with ink outlines, hand-drawn texture. Background features a magical forest or natural setting, bright and pastel color palette, dominated by fresh greens, warm yellows, and earth tones. Whimsical atmosphere with details like small flowers, mushrooms, and plants scattered around. Soft natural lighting, high quality, a blend of Studio Ghibli vibes and Beatrix Potter style.",
    thumbnail: "/theme/cartoon_magical_forest.png",
  },
  {
    name: {
      en: "SChiikawa Style",
      zh: "吉伊卡哇",
    },
    prompt:
      "Chiikawa style illustration, by Nagano, cute small creatures, thick soft hand-drawn outlines, marker pen texture, pastel colors (white, soft pink, light blue), minimalist white background, Multiple small creatures as protagonists, combined with content to draw scenes and perform plots.",
    thumbnail: "/theme/schiikawa.png",
  },
  {
    name: {
      en: "Soft Pastel Watercolor Style",
      zh: "柔和水彩",
    },
    prompt:
      "Digital art style, soft pastel watercolor concept, a light and delicate background. Soft pastel colors and watercolor effects. Minimalist yet detailed, premium feel, tyndall effect, soft lighting, cinematic composition.",
    thumbnail: "/theme/soft_pastel_watercolor.png",
  },
  {
    name: {
      en: "Miniature 3D isometric",
      zh: "等距缩微3D卡通",
    },
    prompt:
      "A miniature 3D isometric cartoon scene. 45-degree top-down view. Text content is associated within the scene in the form of holographic information. Style: Soft, refined textures, realistic PBR materials (clay/matte plastic), and gentle studio lighting. High quality, intricate details, fresh and soothing atmosphere, C4D rendering style.",
    thumbnail: "/theme/3d_isometric.png",
  },
  {
    name: {
      en: "Corporate Memphis Style",
      zh: "企业孟菲斯",
    },
    prompt:
      "Digital art style, corporate Memphis concept, a clean and professional background. Minimalist yet detailed, premium feel, tyndall effect, soft lighting, cinematic composition.",
    thumbnail: "/theme/corporate_memphis.png",
  },
  {
    name: {
      en: "Liqud Glass",
      zh: "液态玻璃",
    },
    prompt:
      "Exploded view of a digital interface, layered glass plates stacked vertically, 3D infographic layout, liquid glass elements morphing between layers, holographic projection style, visual representation of deep tech analysis, frosted transparency with blurred background, refraction of light, futuristic blue and teal color palette, ultra-detailed",
    thumbnail: "/theme/liquid_glass.png",
  },
  {
    name: {
      en: "Flat Illustration Style",
      zh: "扁平插画",
    },
    prompt:
      "Flat hand-drawn illustration style, simple doodle line art with uneven ink outlines, minimalist character design without facial features. The color palette features mint green, soft teal, light pink, and white on a light grey background. Misaligned color fills, abstract geometric shapes, clean and modern corporate aesthetic, vector art style, infographic style, white space, friendly and approachable atmosphere. ",
    thumbnail: "/theme/flat_illustration.png",
  },
];
