export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

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
        'HTTP-Referer': 'https://meeting-action-items-tracker.vercel.app',
        'X-Title': 'Meeting Tracker'
      },
      body: JSON.stringify({
        model: 'meta-llama/llama-3.2-3b-instruct:free',
        messages: [{
          role: 'user',
          content: `Extract action items from meeting transcript. Return ONLY JSON array: [{"task":"...","owner":"...","due_date":"..."}]

Transcript:
${transcript}`
        }]
      })
    });

    const responseText = await response.text();
    
    if (!response.ok) {
      console.error('API error:', responseText);
      return res.status(500).json({ error: 'API failed', details: responseText.substring(0, 200) });
    }

    const data = JSON.parse(responseText);
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      return res.status(200).json({ actionItems: [] });
    }

    let text = data.choices[0].message.content.trim()
      .replace(/```json\n?/gi, '').replace(/```\n?/g, '').trim();

    const jsonMatch = text.match(/\[[\s\S]*\]/);
    const actionItems = jsonMatch ? JSON.parse(jsonMatch[0]) : [];

    return res.status(200).json({ actionItems });

  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: error.message });
  }
}