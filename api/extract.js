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
    // Use OpenRouter with Gemini
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'https://meeting-action-items-tracker.vercel.app',
        'X-Title': 'Meeting Action Items Tracker'
      },
      body: JSON.stringify({
        model: 'google/gemini-2.0-flash-exp:free',
        messages: [{
          role: 'user',
          content: `You are an AI that extracts action items from meeting transcripts.

Extract all action items and return ONLY a valid JSON array. No markdown, no code blocks, no explanation.

Format: [{"task": "description", "owner": "name or null", "due_date": "date or null"}]

If no action items, return: []

Meeting Transcript:
${transcript}`
        }]
      })
    });

    const responseText = await response.text();
    
    if (!response.ok) {
      console.error('OpenRouter API error:', response.status, responseText);
      return res.status(500).json({ 
        error: 'API request failed',
        details: responseText.substring(0, 200)
      });
    }

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      console.error('Failed to parse response:', responseText);
      return res.status(500).json({ error: 'Invalid API response' });
    }

    // Extract the message content
    let text = '';
    
    if (data.choices && data.choices[0] && data.choices[0].message) {
      text = data.choices[0].message.content;
    } else if (data.error) {
      console.error('API returned error:', data.error);
      return res.status(500).json({ error: data.error.message || 'API error' });
    } else {
      console.error('Unexpected response structure:', JSON.stringify(data).substring(0, 200));
      return res.status(500).json({ error: 'Unexpected response format' });
    }

    // Clean the response
    text = text.trim()
      .replace(/```json\n?/gi, '')
      .replace(/```\n?/g, '')
      .trim();

    // Extract JSON array
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    
    if (!jsonMatch) {
      console.log('No JSON array found in response:', text.substring(0, 200));
      // Return empty array instead of error
      return res.status(200).json({ actionItems: [] });
    }

    let actionItems;
    try {
      actionItems = JSON.parse(jsonMatch[0]);
    } catch (e) {
      console.error('Failed to parse extracted JSON:', jsonMatch[0]);
      return res.status(200).json({ actionItems: [] });
    }

    return res.status(200).json({ actionItems });

  } catch (error) {
    console.error('Fatal error in extract:', error);
    return res.status(500).json({ 
      error: 'Extraction failed',
      details: error.message 
    });
  }
}