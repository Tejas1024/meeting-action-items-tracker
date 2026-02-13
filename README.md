# Meeting Action Items Tracker

🔗 **Live App:**  https://meeting-action-items-tracker.vercel.app?_vercel_share=ltETlFAh6IB05matnPjhXo2eQxjZy0KQ


🔗 **GitHub:** https://github.com/Tejas1024

## Overview
AI-powered web application that automatically extracts action items from meeting transcripts using Claude AI, with full CRUD capabilities and transcript history.

## Tech Stack
- **Frontend:** React 18 + Vite + Tailwind CSS
- **Backend:** Vercel Serverless Functions (Node.js)
- **Database:** Supabase (PostgreSQL)
- **AI/LLM:** Groq API
- **Hosting:** Vercel

## Features Implemented ✅

### Core Requirements
- ✅ Paste meeting transcript (text input)
- ✅ AI extraction of action items with task, owner, and due date
- ✅ Edit action items (click on task/owner/due date to edit inline)
- ✅ Add new action items manually
- ✅ Delete action items
- ✅ Mark items as done/undone (checkbox)
- ✅ View last 5 transcripts in history
- ✅ Click history item to load its action items

### Additional Features
- ✅ Filter action items by status (All/Open/Done)
- ✅ System health check page (backend/database/LLM status)
- ✅ Input validation (minimum 10 characters)
- ✅ Error handling with user-friendly messages
- ✅ Responsive design (mobile-friendly)
- ✅ Real-time UI updates
- ✅ Click-to-edit functionality for all fields

### Home Page
Clear 3-step process with instructions and example placeholder text.

### Status Page
Live health monitoring of:
- Backend server
- Supabase database connection
- Claude API connection

## Features NOT Implemented
- Tags/categories for action items
- Export functionality (PDF/CSV)
- User authentication
- Email notifications
- Calendar integration

## Database Schema

### Table: `transcripts`
```sql
id          UUID PRIMARY KEY
content     TEXT NOT NULL
created_at  TIMESTAMP DEFAULT NOW()
```

### Table: `action_items`
```sql
id              UUID PRIMARY KEY
transcript_id   UUID REFERENCES transcripts(id)
task            TEXT NOT NULL
owner           TEXT
due_date        TEXT
is_done         BOOLEAN DEFAULT FALSE
created_at      TIMESTAMP DEFAULT NOW()
```

## Local Development

### Prerequisites
- Node.js 18+
- Supabase account
- Anthropic API key

### Setup
1. Clone the repository
```bash
git clone https://github.com/Tejas1024/meeting-action-items-tracker.git
cd meeting-action-items-tracker
```

2. Install dependencies
```bash
npm install
```

3. Create `.env.local` file
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
GROQ_API_KEY=your_api_key
```

4. Set up Supabase tables (run in Supabase SQL Editor)
```sql
-- See database schema above
CREATE TABLE transcripts (...);
CREATE TABLE action_items (...);
```

5. Run development server
```bash
npm run dev
```

**Note:** API routes (`/api/*`) only work when deployed to Vercel. For local testing of API routes, use `vercel dev` instead.

## Deployment

### Deploy to Vercel
1. Push code to GitHub
2. Import project in Vercel
3. Add environment variables in Vercel dashboard
4. Deploy

Auto-deploys on push to `main` branch.

## Project Structure
```
meeting-tracker/
├── api/                      # Vercel serverless functions
│   ├── extract.js           # Claude API integration
│   ├── health.js            # System health checks
├── src/
│   ├── components/          # React components (all in App.jsx)
│   ├── lib/
│   │   └── supabase.js      # Supabase client
│   ├── App.jsx              # Main application
│   ├── main.jsx
│   └── index.css            # Tailwind styles
├── .env.example             # Environment variables template
├── vercel.json              # Vercel configuration
└── package.json
```

## Environment Variables
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Supabase anonymous key
- GROQ_API_KEY  - GROQ_API API key (keep secret!)

## API Routes

### POST `/api/extract`
Extracts action items from transcript using Claude API.

**Request:**
```json
{
  "transcript": "Meeting text here..."
}
```

**Response:**
```json
{
  "actionItems": [
    {
      "task": "Complete Q1 report",
      "owner": "John",
      "due_date": "Friday"
    }
  ]
}
```

### GET `/api/health`
System health check.

**Response:**
```json
{
  "backend": "healthy",
  "database": "healthy",
  "llm": "healthy"
}
```

## Testing
1. Go to Status page - verify all systems healthy
2. Paste sample transcript on Home page
3. Click "Extract Action Items"
4. Verify action items extracted correctly
5. Test all CRUD operations (edit/delete/add/mark done)
6. Test filters (All/Open/Done)
7. Go to History - verify transcript saved
8. Click history item - verify action items load

## Known Limitations
- AI extraction accuracy depends on transcript quality
- Owner/due date detection works best with clear formatting
- Claude API has rate limits (500 requests/day on free tier)
- Supabase free tier: 500MB storage, 2GB bandwidth

## Browser Support
- Chrome/Edge (recommended)
- Firefox
- Safari
- Mobile browsers

## License
MIT

## Author
[TejasGowda T R]
[tejaspavithra2002@gmail.com]
 
