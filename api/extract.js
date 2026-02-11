export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { transcript } = req.body;

  if (!transcript || transcript.trim().length < 10) {
    return res.status(400).json({ error: 'Transcript must be at least 10 characters' });
  }

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
        max_tokens: 1024,
        messages: [{
          role: 'user',
          content: `Extract action items from this meeting transcript. Return ONLY a JSON array with this exact format: [{"task": "description", "owner": "name or null", "due_date": "date or null"}]. If no action items found, return []. Do not include any other text or explanation.

Transcript:
${transcript}`
        }]
      })
    });

    if (!response.ok) {
      throw new Error('Claude API request failed');
    }

    const data = await response.json();
    const text = data.content[0].text.trim();
    
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    const actionItems = jsonMatch ? JSON.parse(jsonMatch[0]) : [];

    res.status(200).json({ actionItems });
  } catch (error) {
    console.error('Extract error:', error);
    res.status(500).json({ error: 'Failed to extract action items: ' + error.message });
  }
}