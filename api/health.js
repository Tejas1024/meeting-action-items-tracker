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

  // Check Groq
  try {
    const response = await fetch('https://api.groq.com/openai/v1/models', {
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
      }
    });
    checks.llm = response.ok ? 'healthy' : 'unhealthy';
  } catch (e) {
    checks.llm = 'unhealthy';
  }

  res.status(200).json(checks);
}