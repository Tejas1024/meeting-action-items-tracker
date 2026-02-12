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
      console.error('GEMINI_API_KEY not found in environment variables');
      throw new Error('GEMINI_API_KEY not configured');
    }

    console.log('Starting Gemini API call...');
    console.log('API Key present:', apiKey ? 'YES' : 'NO');
    console.log('API Key starts with:', apiKey ? apiKey.substring(0, 10) : 'N/A');

    // CORRECT Gemini API call format
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`;
    
    const requestBody = {
      contents: [{
        parts: [{
          text: `Extract action items from this meeting transcript. Return ONLY a valid JSON array, no other text.

Format: [{"task": "description", "owner": "person name or null", "due_date": "date or null"}]

If no action items exist, return: []

Meeting transcript:
${transcript}`
        }]
      }]
    };

    console.log('Making request to:', apiUrl.replace(apiKey, 'API_KEY_HIDDEN'));
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });

    console.log('Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error:', errorText);
      
      // Return empty array instead of crashing
      return res.status(200).json({ 
        actionItems: [],
        warning: 'API call failed but returning empty array to prevent crash'
      });
    }

    const data = await response.json();
    console.log('Gemini response received');

    // Parse the response
    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
      console.log('No candidates in response, returning empty array');
      return res.status(200).json({ actionItems: [] });
    }

    let text = data.candidates[0].content.parts[0].text.trim();
    console.log('Raw response text:', text.substring(0, 200));

    // Remove markdown formatting
    text = text.replace(/```json\n?/gi, '');
    text = text.replace(/```\n?/g, '');
    text = text.trim();

    // Extract JSON array
    let actionItems = [];
    
    try {
      // Try direct parsing first
      actionItems = JSON.parse(text);
    } catch (e1) {
      console.log('Direct parse failed, trying regex...');
      
      // Try regex extraction
      const match = text.match(/\[[\s\S]*\]/);
      if (match) {
        try {
          actionItems = JSON.parse(match[0]);
        } catch (e2) {
          console.log('Regex parse failed, returning empty array');
          return res.status(200).json({ actionItems: [] });
        }
      } else {
        console.log('No JSON found, returning empty array');
        return res.status(200).json({ actionItems: [] });
      }
    }

    // Validate array
    if (!Array.isArray(actionItems)) {
      console.log('Result not array, returning empty');
      return res.status(200).json({ actionItems: [] });
    }

    // Clean up items
    const cleanedItems = actionItems.map(item => ({
      task: item.task || item.description || 'Untitled',
      owner: item.owner || null,
      due_date: item.due_date || item.dueDate || null
    }));

    console.log('Returning', cleanedItems.length, 'action items');
    
    res.status(200).json({ actionItems: cleanedItems });

  } catch (error) {
    console.error('Fatal error in extract.js:', error);
    console.error('Stack:', error.stack);
    
    // Return error details for debugging
    res.status(500).json({ 
      error: 'Failed to extract action items',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}