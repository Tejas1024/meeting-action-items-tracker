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
    checks.database = 'unhealthy';
  }

  // Check Gemini API
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'test' }] }]
        })
      }
    );
    checks.llm = response.ok ? 'healthy' : 'unhealthy';
  } catch (e) {
    checks.llm = 'unhealthy';
  }

  res.status(200).json(checks);
}