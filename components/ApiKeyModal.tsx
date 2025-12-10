'use client';

import React, { useEffect, useState } from 'react';
import { Key, Loader2, AlertCircle, ExternalLink } from 'lucide-react';

interface Props {
  onKeyConfigured: () => void;
}

export const ApiKeyModal: React.FC<Props> = ({ onKeyConfigured }) => {
  const [checking, setChecking] = useState(true);
  const [hasKey, setHasKey] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    // Check if server has API key configured
    const checkKey = async () => {
      try {
        const res = await fetch('/api/check-key');
        const data = await res.json();
        setHasKey(data.hasKey);
        if (data.hasKey) {
          onKeyConfigured();
        }
      } catch (err) {
        console.error('Failed to check API key:', err);
      } finally {
        setChecking(false);
      }
    };
    checkKey();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey.trim()) {
      setError('Please enter an API key');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/check-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: apiKey.trim() }),
      });
      
      const data = await res.json();
      
      if (data.success) {
        // Store in localStorage for client-side reference
        localStorage.setItem('gemini_api_key_temp', apiKey.trim());
        onKeyConfigured();
      } else {
        setError(data.error || 'Invalid API key');
      }
    } catch (err) {
      setError('Failed to validate API key');
    } finally {
      setSubmitting(false);
    }
  };

  if (checking) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl text-center">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Checking API configuration...</p>
        </div>
      </div>
    );
  }

  if (hasKey) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl">
        <div className="text-center mb-6">
          <div className="mx-auto bg-indigo-100 w-16 h-16 rounded-full flex items-center justify-center mb-4">
            <Key className="w-8 h-8 text-indigo-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Configure API Key</h2>
          <p className="text-gray-600 text-sm">
            Enter your Gemini API key to start generating presentations.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Gemini API Key
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="AIza..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              disabled={submitting}
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-3 rounded-lg">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting || !apiKey.trim()}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Validating...
              </>
            ) : (
              'Continue'
            )}
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-gray-100">
          <p className="text-xs text-gray-500 text-center mb-2">
            For persistent configuration, add to <code className="bg-gray-100 px-1 rounded">.env.local</code>:
          </p>
          <code className="block text-xs bg-gray-50 p-2 rounded text-gray-600 text-center">
            GEMINI_API_KEY=your_key_here
          </code>
          <a
            href="https://aistudio.google.com/apikey"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 text-xs text-indigo-600 hover:text-indigo-700 flex items-center justify-center gap-1"
          >
            Get an API key from Google AI Studio
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </div>
  );
};
