export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { transcript } = req.body;
  if (!transcript || transcript.trim().length < 10) {
    return res.status(400).json({ error: 'Transcript must be at least 10 characters' });
  }

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'google/gemini-flash-1.5',
        messages: [{
          role: 'user',
          content: `Extract action items from this meeting transcript. Return ONLY a JSON array: [{"task": "...", "owner": "...", "due_date": "..."}]. No markdown, no explanation.\n\nTranscript:\n${transcript}`
        }]
      })
    });

    const data = await response.json();
    const text = data.choices[0].message.content.trim()
      .replace(/```json\n?/gi, '').replace(/```\n?/g, '').trim();
    
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    const actionItems = jsonMatch ? JSON.parse(jsonMatch[0]) : [];

    res.status(200).json({ actionItems });
  } catch (error) {
    res.status(500).json({ error: 'Extraction failed: ' + error.message });
  }
}