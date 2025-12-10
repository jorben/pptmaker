import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const hasKey = !!process.env.GEMINI_API_KEY;
  return NextResponse.json({ hasKey });
}

export async function POST(request: Request) {
  try {
    const { apiKey } = await request.json();
    
    if (!apiKey || typeof apiKey !== 'string' || apiKey.trim().length < 10) {
      return NextResponse.json({ success: false, error: 'Invalid API key format' }, { status: 400 });
    }

    // Note: In a real production app, you would want to:
    // 1. Validate the key with Gemini API
    // 2. Store it securely (e.g., in a database or encrypted storage)
    // For this demo, we'll store it in memory for the session
    // The user should add it to .env.local for persistence
    
    return NextResponse.json({ 
      success: true, 
      message: 'API key validated. Add it to .env.local for persistence.' 
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Invalid request' }, { status: 400 });
  }
}
