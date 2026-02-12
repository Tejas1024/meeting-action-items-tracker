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

    console.log('Calling Gemini API...');
    
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

Extract all action items and return ONLY a valid JSON array with NO additional text, explanations, or markdown formatting.

Return format (nothing else):
[{"task": "description", "owner": "name or null", "due_date": "date or null"}]

If no action items are found, return exactly:
[]

Rules:
- task: The action item description (required)
- owner: Person responsible (use null if not mentioned)
- due_date: When it's due (use null if not mentioned)
- Return ONLY the JSON array
- No markdown code blocks
- No explanations
- No preamble

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
      console.error('Gemini API error response:', response.status, errorText);
      throw new Error(`Gemini API failed with status ${response.status}`);
    }

    const data = await response.json();
    console.log('Gemini API response:', JSON.stringify(data, null, 2));
    
    // Check if response has expected structure
    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
      console.error('Invalid Gemini response structure:', JSON.stringify(data));
      
      // Return empty array instead of throwing error
      return res.status(200).json({ actionItems: [] });
    }

    let text = data.candidates[0].content.parts[0].text.trim();
    console.log('Raw Gemini text:', text);
    
    // Clean up the response - remove markdown code blocks and extra text
    text = text.replace(/```json\n?/gi, '');
    text = text.replace(/```\n?/g, '');
    text = text.trim();
    
    // Try to extract JSON array using multiple methods
    let actionItems = [];
    
    // Method 1: Try to parse directly
    try {
      actionItems = JSON.parse(text);
      console.log('Method 1 (direct parse) succeeded');
    } catch (e) {
      console.log('Method 1 (direct parse) failed:', e.message);
      
      // Method 2: Extract JSON array using regex
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      
      if (jsonMatch) {
        try {
          actionItems = JSON.parse(jsonMatch[0]);
          console.log('Method 2 (regex extraction) succeeded');
        } catch (e2) {
          console.log('Method 2 (regex extraction) failed:', e2.message);
          
          // Method 3: Try to find first [ and last ]
          const firstBracket = text.indexOf('[');
          const lastBracket = text.lastIndexOf(']');
          
          if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
            const jsonText = text.substring(firstBracket, lastBracket + 1);
            try {
              actionItems = JSON.parse(jsonText);
              console.log('Method 3 (bracket extraction) succeeded');
            } catch (e3) {
              console.log('Method 3 (bracket extraction) failed:', e3.message);
              // Return empty array if all parsing methods fail
              console.log('All parsing methods failed, returning empty array');
              return res.status(200).json({ actionItems: [] });
            }
          } else {
            // No valid JSON found
            console.log('No JSON array found in response, returning empty array');
            return res.status(200).json({ actionItems: [] });
          }
        }
      } else {
        // No JSON array pattern found
        console.log('No JSON array pattern found, returning empty array');
        return res.status(200).json({ actionItems: [] });
      }
    }

    // Validate that we have an array
    if (!Array.isArray(actionItems)) {
      console.log('Parsed result is not an array, returning empty array');
      return res.status(200).json({ actionItems: [] });
    }

    // Validate and clean each action item
    const validatedItems = actionItems.map((item, index) => {
      if (typeof item !== 'object' || item === null) {
        console.log(`Item ${index} is not an object, skipping`);
        return null;
      }
      
      return {
        task: item.task || item.description || `Untitled task ${index + 1}`,
        owner: item.owner || null,
        due_date: item.due_date || item.dueDate || item.deadline || null
      };
    }).filter(item => item !== null);

    console.log('Validated items:', JSON.stringify(validatedItems, null, 2));

    res.status(200).json({ actionItems: validatedItems });
  } catch (error) {
    console.error('Extract error:', error.message);
    console.error('Stack trace:', error.stack);
    
    res.status(500).json({ 
      error: 'Failed to extract action items',
      details: error.message 
    });
  }
}