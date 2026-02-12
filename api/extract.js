export default async function handler(req, res) {
  // CORS headers
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
    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY not configured');
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `You are an AI assistant that extracts action items from meeting transcripts.

Extract all action items and return ONLY a valid JSON array. No other text, no markdown, no code blocks.

Format: [{"task": "description", "owner": "name or null", "due_date": "date or null"}]

If no action items found, return: []

Meeting Transcript:
${transcript}`
            }]
          }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 2048,
          }
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error:', response.status, errorText);
      throw new Error(`Gemini API failed: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
      console.error('Invalid Gemini response:', JSON.stringify(data));
      throw new Error('Invalid response from Gemini API');
    }

    let text = data.candidates[0].content.parts[0].text.trim();
    
    // Remove markdown code blocks
    text = text.replace(/```json\n?/gi, '').replace(/```\n?/g, '').trim();
    
    // Extract JSON array
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    
    if (!jsonMatch) {
      console.error('No JSON array found in response:', text);
      // Return empty array if no action items
      return res.status(200).json({ actionItems: [] });
    }

    const actionItems = JSON.parse(jsonMatch[0]);

    res.status(200).json({ actionItems });
  } catch (error) {
    console.error('Extract error:', error.message);
    res.status(500).json({ 
      error: 'Failed to extract action items',
      details: error.message 
    });
  }
}