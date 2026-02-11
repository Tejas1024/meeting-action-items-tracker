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

  // Check LLM
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-20250514',
        max_tokens: 10,
        messages: [{ role: 'user', content: 'test' }]
      })
    });
    checks.llm = response.ok ? 'healthy' : 'unhealthy';
  } catch (e) {
    checks.llm = 'unhealthy';
  }

  res.status(200).json(checks);
}