import React, { useEffect, useState } from 'react';
import { Key } from 'lucide-react';

interface Props {
  onKeySelected: () => void;
}

export const ApiKeyModal: React.FC<Props> = ({ onKeySelected }) => {
  const [checking, setChecking] = useState(true);

  const checkKey = async () => {
    setChecking(true);
    try {
      if (window.aistudio && await window.aistudio.hasSelectedApiKey()) {
        onKeySelected();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    checkKey();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSelectKey = async () => {
    try {
      if (window.aistudio) {
        await window.aistudio.openSelectKey();
        // As per documentation/guidelines, assume success immediately after opening the dialog
        // to mitigate race conditions where hasSelectedApiKey might lag.
        onKeySelected();
      }
    } catch (e) {
      console.error("Error selecting key", e);
      // Fallback check
      checkKey();
    }
  };

  if (checking) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl text-center">
        <div className="mx-auto bg-indigo-100 w-16 h-16 rounded-full flex items-center justify-center mb-6">
          <Key className="w-8 h-8 text-indigo-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">API Key Required</h2>
        <p className="text-gray-600 mb-6">
          To generate high-quality slides with Gemini 3 Pro Image, please select a paid API key.
        </p>
        
        <button
          onClick={handleSelectKey}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          Select API Key
        </button>
        
        <p className="mt-4 text-xs text-gray-400">
          <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noreferrer" className="underline hover:text-indigo-500">
            Billing Documentation
          </a>
        </p>
      </div>
    </div>
  );
};
