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
      zh: "奢华黑金风"
    },
    prompt: "Digital art style, luxury financial concept, A dark navy void background. Glowing gold data visualization charts and UI elements floating. Minimalist yet detailed, premium feel, tyndall effect, golden lighting, cinematic composition.",
    thumbnail: "/theme/luxurious_black_gold.png"
  }
];
