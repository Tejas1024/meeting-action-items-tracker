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
    console.log('Calling OpenRouter API...');
    
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'https://meeting-tracker.vercel.app',
        'X-Title': 'Meeting Tracker'
      },
      body: JSON.stringify({
        model: 'meta-llama/llama-3.2-3b-instruct:free',
        messages: [{
          role: 'user',
          content: `You are a helpful assistant. Extract action items from this meeting transcript.

Return ONLY a valid JSON array in this exact format (no markdown, no code blocks, no extra text):
[{"task":"description here","owner":"name or null","due_date":"date or null"}]

If no action items found, return: []

Meeting Transcript:
${transcript}`
        }]
      })
    });

    console.log('Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenRouter error response:', errorText);
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('Raw API response:', JSON.stringify(data));

    // Safely extract content
    let text = '';
    if (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) {
      text = data.choices[0].message.content;
    } else {
      console.error('Unexpected response structure:', JSON.stringify(data));
      // Return empty array instead of failing
      return res.status(200).json({ actionItems: [] });
    }

    console.log('Extracted text:', text);

    // Clean up the text
    text = text.trim()
      .replace(/```json\s*/gi, '')
      .replace(/```\s*/g, '')
      .trim();

    console.log('Cleaned text:', text);

    // Try to extract JSON array
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    
    if (!jsonMatch) {
      console.error('No JSON array found in response');
      return res.status(200).json({ actionItems: [] });
    }

    const actionItems = JSON.parse(jsonMatch[0]);
    console.log('Parsed action items:', JSON.stringify(actionItems));

    res.status(200).json({ actionItems });

  } catch (error) {
    console.error('Extraction error:', error.message, error.stack);
    res.status(500).json({ 
      error: 'Extraction failed',
      details: error.message 
    });
  }
}