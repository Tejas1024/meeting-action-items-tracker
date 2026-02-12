import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  const checks = {
    backend: 'healthy',
    database: 'unknown',
    llm: 'unknown'
  };

  // Check database
  try {
    const supabase = createClient(
      process.env.VITE_SUPABASE_URL,
      process.env.VITE_SUPABASE_ANON_KEY
    );
    const { error } = await supabase.from('transcripts').select('id').limit(1);
    checks.database = error ? 'unhealthy' : 'healthy';
  } catch (e) {
    console.error('Database health check error:', e.message);
    checks.database = 'unhealthy';
  }

  // Check Gemini API with detailed error logging
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
      console.error('GEMINI_API_KEY environment variable is not set');
      checks.llm = 'unhealthy';
      return res.status(200).json(checks);
    }

    console.log('Testing Gemini API with key:', apiKey.substring(0, 10) + '...');
    
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [{ 
            parts: [{ text: 'test' }] 
          }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 10
          }
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API health check failed:', response.status, errorText);
      checks.llm = 'unhealthy';
    } else {
      console.log('Gemini API health check passed');
      checks.llm = 'healthy';
    }
  } catch (e) {
    console.error('Gemini API health check exception:', e.message);
    checks.llm = 'unhealthy';
  }

  res.status(200).json(checks);
}