# Development Prompts Log

This document contains all prompts used during development. Responses and API keys are excluded.

---

## Phase 1: Project Planning

### Prompt 1.1: Initial Architecture
```
I need to build a meeting action items tracker web app with:
- Paste transcript → extract action items using AI
- CRUD operations on action items
- History of last 5 transcripts
- Must be deployed and live

Recommend tech stack that:
- Uses free hosting
- Integrates LLM API
- Can be built in 4-6 hours
- Aligns with AI-first development role
```

### Prompt 1.2: Hosting Options
```
Compare these free hosting options for a React + API routes app:
- Vercel
- Netlify
- Render
- Railway

Prioritize: reliability, serverless functions support, no sleep/downtime
```

---

## Phase 2: Database Design

### Prompt 2.1: Schema Design
```
Design a PostgreSQL schema for:
- Storing meeting transcripts
- Storing action items (task, owner, due_date, is_done)
- Each action item belongs to one transcript
- Need to query last 5 transcripts efficiently

Include foreign keys, indexes, and constraints.
```

### Prompt 2.2: Supabase Setup
```
Write the SQL to create these tables in Supabase:
1. transcripts table with UUID id, text content, timestamp
2. action_items table with UUID id, foreign key to transcript, task text, optional owner/due_date, boolean is_done
3. Add indexes for performance on created_at and transcript_id
```

---

## Phase 3: LLM Integration

### Prompt 3.1: API Route Structure
```
Write a Vercel serverless function (Node.js) that:
1. Receives POST request with transcript text
2. Calls Anthropic Claude API to extract action items
3. Returns JSON array of {task, owner, due_date}
4. Handles errors properly
5. Uses environment variables for API key
```

### Prompt 3.2: Prompt Engineering
```
Create a prompt for Claude API to extract action items from meeting transcripts.
Requirements:
- Return ONLY valid JSON (no markdown, no explanation)
- Format: [{"task": "...", "owner": "..." or null, "due_date": "..." or null}]
- Handle cases where owner/due_date not mentioned
- Return empty array if no action items found
```

### Prompt 3.3: Prompt Optimization
```
My extraction prompt sometimes returns markdown code blocks around the JSON.
Fix the prompt to guarantee pure JSON output.
Also add regex fallback parsing in case Claude adds text before/after the array.
```

---

## Phase 4: Frontend Development

### Prompt 4.1: React Component Structure
```
Create a React component for a meeting tracker with:
- State for: current view (home/actions/history/status), transcript text, action items, filter
- Views: Home (textarea + extract button), Actions (list with checkboxes), History (last 5), Status (health checks)
- Use Tailwind CSS for styling
- Handle loading states
```

### Prompt 4.2: CRUD Operations
```
Add Supabase integration to React app for:
- Creating transcript and action items
- Reading last 5 transcripts
- Updating action item is_done status
- Deleting action items
- Use proper error handling
```

### Prompt 4.3: Edit Functionality
```
Implement inline editing for action items:
- Click on task text to edit task
- Click on owner to edit owner
- Click on due_date to edit due date
Use browser prompt() for simplicity
Update Supabase after edit
```

### Prompt 4.4: Filter Feature
```
Add filter buttons (All/Open/Done) for action items.
- All: show everything
- Open: show only is_done = false
- Done: show only is_done = true
Show count in each filter button
```

---

## Phase 5: Health Check

### Prompt 5.1: Status Page API
```
Create /api/health endpoint that checks:
1. Backend is running (always return healthy)
2. Supabase connection (try SELECT query)
3. Claude API connection (try minimal API call)

Return JSON: {backend: "healthy/unhealthy", database: "...", llm: "..."}
```

### Prompt 5.2: Status Page UI
```
Create a React component that:
- Calls /api/health on mount
- Displays three status boxes (Backend, Database, LLM)
- Green background if healthy, red if unhealthy
- Shows "Loading..." while fetching
```

---

## Phase 6: Styling & UX

### Prompt 6.1: Responsive Layout
```
Improve Tailwind CSS for:
- Mobile responsive (320px to 1920px)
- Gradient background
- Card-style boxes with shadows
- Hover effects on buttons
- Better spacing and typography
```

### Prompt 6.2: Loading States
```
Add loading indicators for:
- Extract button (show "⏳ Extracting..." when loading)
- Disable button while loading
- Show spinner or text feedback
```

### Prompt 6.3: Error Handling UX
```
Add error display:
- Red banner at top of page
- Show error message from API or Supabase
- Clear error when changing views
- User-friendly error messages (not raw errors)
```

---

## Phase 7: Documentation

### Prompt 7.1: README Structure
```
Write a comprehensive README.md for a meeting tracker app including:
- Overview & features
- Tech stack
- Setup instructions
- Database schema
- API documentation
- Deployment guide
- Known limitations
```

### Prompt 7.2: AI Usage Documentation
```
Create AI_NOTES.md explaining:
- What I used AI for vs what I coded manually
- Why I chose Claude API (Haiku model)
- How I tested AI-generated code
- Prompt engineering iterations
- Time breakdown (AI vs manual work)
```

---

## Phase 8: Deployment

### Prompt 8.1: Vercel Configuration
```
Create vercel.json for:
- Routing API requests to /api folder
- Ensure serverless functions deploy correctly
```

### Prompt 8.2: Environment Variables
```
List all environment variables needed for deployment:
- Supabase URL and key
- Anthropic API key
- Explain which ones are client-side (VITE_) vs server-side
```

### Prompt 8.3: GitHub Deployment
```
What files should be in .gitignore for this project?
Ensure no API keys leak to GitHub.
Include .env, .env.local, node_modules, dist.
```

---

## Phase 9: Testing & Debugging

### Prompt 9.1: Sample Test Data
```
Generate 3 realistic meeting transcripts for testing with:
- Clear action items
- Named people (owners)
- Mentioned dates/deadlines
- Mix of explicit and implicit tasks
```

### Prompt 9.2: Edge Case Testing
```
What edge cases should I test for the transcript extraction?
- Empty input
- Very long transcript (10,000+ chars)
- No action items
- Special characters
- Multiple languages
```

---

## Phase 10: Final Polish

### Prompt 10.1: Code Review Checklist
```
Create a checklist for reviewing this codebase before submission:
- Security (no exposed keys)
- Error handling completeness
- Code cleanliness
- Documentation quality
- Feature completeness vs requirements
```

### Prompt 10.2: Submission Email Template
```
Write a professional email template for submitting:
- Which project chosen (A or B)
- Live link
- GitHub link
Keep it concise and professional
```

---

## Total Prompts Used: 24
## Development Time: ~2 hours
## AI Tools: Claude (Anthropic), GitHub Copilot
