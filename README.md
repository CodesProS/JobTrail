# JobTrail 🗂️

> Chrome extension that auto-extracts job postings from any job board using AI and tracks your applications in one click. No copy-pasting.

---

## What it does

- Click the extension on any job posting → it scrapes the page → AI fills in company, role, location, pay, and notes automatically
- Full pipeline tracking: **Applied → Phone Screen → Interview → Offer / Rejected / Ghosted**
- Stats dashboard: total applications, active, interviews, offers
- Works on LinkedIn, Greenhouse, Lever, Ashby, Workday, Indeed, Handshake, and more

---

## Tech Stack

- 🧩 **Chrome Extension** — Manifest V3, content scripts, service worker, popup UI
- ⚙️ **Backend** — Node.js + Express, repository pattern
- 🗄️ **Database** — PostgreSQL (Supabase)
- 🔐 **Auth** — JWT from scratch using Node's `crypto` module — no libraries
- 🤖 **AI** — Groq API (Llama 3.1) for job data extraction, server-side only
- 🐳 **Deploy** — Docker → Render

---

## Architecture

```
extension/
├── manifest.json       # Manifest V3
├── popup.html/js       # Auth screen + dashboard + job form
├── content.js          # Page scraper (runs on job board pages)
└── background.js       # Service worker — token storage + API proxy

backend/
├── server.js
└── src/
    ├── routes/         # auth.js, jobs.js
    ├── middleware/      # JWT auth, error handler
    ├── repositories/   # userRepository, jobRepository
    ├── services/        # Groq AI extraction
    ├── utils/           # Raw JWT sign/verify
    └── config/          # DB pool, env validation
```

---

## Setup

```bash
# Backend
cd backend
cp .env.example .env   # fill in DATABASE_URL, JWT_SECRET, GROQ_API_KEY
npm install
node scripts/migrate.js
npm run dev
```

Load the extension: `chrome://extensions` → Developer mode → Load unpacked → select `extension/`

---

## API

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/register` | Create account |
| POST | `/auth/login` | Login, returns JWT |
| POST | `/jobs/extract` | AI extracts job from page text |
| GET | `/jobs` | List all applications |
| POST | `/jobs` | Save application |
| PATCH | `/jobs/:id` | Update application |
| DELETE | `/jobs/:id` | Delete application |
