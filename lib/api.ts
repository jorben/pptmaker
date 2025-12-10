// API utilities for making requests with proper headers

export function getApiHeaders(): HeadersInit {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  
  // Check for temporary API key stored in localStorage
  if (typeof window !== 'undefined') {
    const tempKey = localStorage.getItem('gemini_api_key_temp');
    if (tempKey) {
      headers['x-api-key'] = tempKey;
    }
  }
  
  return headers;
}

export async function apiRequest(action: string, payload: any) {
  const response = await fetch('/api/gemini', {
    method: 'POST',
    headers: getApiHeaders(),
    body: JSON.stringify({ action, payload }),
  });
  
  return response.json();
}
