import React, { useEffect, useState } from 'react';
import { Key } from 'lucide-react';
// Import types to get Window.aistudio declaration
import '../types';

interface Props {
  onKeySelected: () => void;
}

// Check if running in AI Studio environment
const isAIStudio = typeof window !== 'undefined' && 'aistudio' in window;

export const ApiKeyModal: React.FC<Props> = ({ onKeySelected }) => {
  const [checking, setChecking] = useState(true);
  const [manualKey, setManualKey] = useState('');
  const [error, setError] = useState('');

  const checkKey = async () => {
    setChecking(true);
    try {
      // Check if API key is already configured via environment variable
      if (process.env.API_KEY || process.env.GEMINI_API_KEY) {
        onKeySelected();
        return;
      }

      // AI Studio environment
      if (isAIStudio && window.aistudio && await window.aistudio.hasSelectedApiKey()) {
        onKeySelected();
        return;
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
      if (isAIStudio && window.aistudio) {
        await window.aistudio.openSelectKey();
        onKeySelected();
      }
    } catch (e) {
      console.error("Error selecting key", e);
      checkKey();
    }
  };

  const handleManualKeySubmit = () => {
    if (!manualKey.trim()) {
      setError('Please enter an API key');
      return;
    }
    // Store the key in a way that geminiService can access it
    // We'll use a global variable since env vars can't be set at runtime
    (window as any).__GEMINI_API_KEY__ = manualKey.trim();
    onKeySelected();
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
          To generate high-quality slides with Gemini, please provide your API key.
        </p>
        
        {isAIStudio ? (
          // AI Studio environment - use their key selector
          <button
            onClick={handleSelectKey}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            Select API Key
          </button>
        ) : (
          // Local environment - manual input
          <div className="space-y-4">
            <div className="text-left">
              <input
                type="password"
                value={manualKey}
                onChange={(e) => {
                  setManualKey(e.target.value);
                  setError('');
                }}
                placeholder="Enter your Gemini API Key"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
              {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
            </div>
            <button
              onClick={handleManualKeySubmit}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              Continue
            </button>
            <p className="text-xs text-gray-500">
              Tip: You can also set <code className="bg-gray-100 px-1 rounded">GEMINI_API_KEY</code> in <code className="bg-gray-100 px-1 rounded">.env</code> file to skip this step.
            </p>
          </div>
        )}
        
        <p className="mt-4 text-xs text-gray-400">
          <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noreferrer" className="underline hover:text-indigo-500">
            Get API Key
          </a>
          {' | '}
          <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noreferrer" className="underline hover:text-indigo-500">
            Billing Documentation
          </a>
        </p>
      </div>
    </div>
  );
};
