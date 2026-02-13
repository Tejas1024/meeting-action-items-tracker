export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { transcript } = req.body;
  if (!transcript || transcript.trim().length < 10) {
    return res.status(400).json({ error: 'Transcript too short' });
  }

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'https://meeting-tracker.vercel.app',
        'X-Title': 'Meeting Tracker'
      },
      body: JSON.stringify({
        model: 'google/gemini-flash-1.5-8b',
        messages: [{
          role: 'user',
          content: `Extract action items from this transcript. Return ONLY a JSON array, no markdown:\n[{"task":"...", "owner":"...", "due_date":"..."}]\n\nTranscript:\n${transcript}`
        }]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenRouter error:', errorText);
      throw new Error('API request failed');
    }

    const data = await response.json();
    
    // OpenRouter returns: data.choices[0].message.content
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      console.error('Invalid response structure:', JSON.stringify(data));
      return res.status(200).json({ actionItems: [] });
    }

    let text = data.choices[0].message.content.trim();
    text = text.replace(/```json\n?/gi, '').replace(/```\n?/g, '').trim();
    
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    const actionItems = jsonMatch ? JSON.parse(jsonMatch[0]) : [];

    res.status(200).json({ actionItems });
  } catch (error) {
    console.error('Extract error:', error);
    res.status(500).json({ error: error.message });
  }
}