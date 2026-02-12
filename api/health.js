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
    
    if (error) {
      console.error('Database error:', error.message);
    }
  } catch (e) {
    console.error('Database check failed:', e.message);
    checks.database = 'unhealthy';
  }

  // Check Gemini API
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
      console.error('GEMINI_API_KEY not set');
      checks.llm = 'unhealthy';
      return res.status(200).json(checks);
    }

    console.log('Testing Gemini API...');
    
    // CORRECT endpoint URL
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`;
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{ 
          parts: [{ text: 'Hello' }] 
        }]
      })
    });

    if (response.ok) {
      console.log('Gemini API: HEALTHY');
      checks.llm = 'healthy';
    } else {
      const errorText = await response.text();
      console.error('Gemini API failed:', response.status, errorText);
      checks.llm = 'unhealthy';
    }
  } catch (e) {
    console.error('Gemini check error:', e.message);
    checks.llm = 'unhealthy';
  }

  res.status(200).json(checks);
}