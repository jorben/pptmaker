import type { Metadata } from 'next';
import Script from 'next/script';
import './globals.css';

export const metadata: Metadata = {
  title: 'PPTMaker AI - Gemini Slice Maker',
  description: 'AI-powered presentation planning and content generation with Gemini',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <head>
        <Script 
          src="https://cdn.jsdelivr.net/npm/mammoth@1.8.0/mammoth.browser.min.js"
          strategy="beforeInteractive"
        />
      </head>
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
