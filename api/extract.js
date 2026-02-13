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
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{
          role: 'user',
          content: `Extract action items from this meeting transcript. Return ONLY a JSON array, no other text:
[{"task": "description", "owner": "name or null", "due_date": "date or null"}]

Transcript:
${transcript}`
        }],
        temperature: 0.1,
        max_tokens: 1024
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Groq API error:', errorText);
      return res.status(500).json({ error: 'API failed' });
    }

    const data = await response.json();
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