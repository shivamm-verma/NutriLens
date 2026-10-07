# NutriLens

Visual food, calorie and portion estimation. Upload a photo of any dish (Indian, regional or international) and NutriLens uses Google Gemini (`gemini-3.8-flash`, with automatic fallback to any Flash model your key can use) to identify it, estimate the portion weight, and calculate calories, carbs, protein, fat and fiber.

**Stack:** FastAPI, google-genai, Pillow (backend) | React, Vite, Tailwind CSS, Axios, Lucide (frontend, JavaScript)

## Features
- Apple-style layout with a Coolors-style palette strip: colours are pulled from your meal photo, click a band to copy its hex
- Self-healing model selection: if a model returns 404 for your key, NutriLens tries the next one and caches the one that works
- Dish identification with confidence score and alternative guesses
- Portion estimation (grams, serving size, visual reasoning)
- Nutrition for that portion, plus a macro split bar and a 1-10 balance score
- Per-item breakdown (rice, dal, roti, etc.)
- Portion slider (0.25x-3x) that recalculates everything instantly
- Optional hint box ("homemade", "2 rotis") for better accuracy
- Today's meal log with daily calorie goal, saved in your browser, CSV export
- Drag and drop, file picker, or camera capture on mobile
- Live backend and API key status banner

## Project structure
```
food-calorie-classifier/
├── backend/            FastAPI app (app/main.py, app/model.py), Dockerfile, .env
├── frontend/           React + Vite + Tailwind app, Dockerfile, nginx.conf
└── docker-compose.yml  Run both with one command
```

## Run locally

### 1. Get a Gemini API key
Create a free key at https://aistudio.google.com/apikey

### 2. Backend (Terminal 1)
Requires Python 3.11+.
```bash
cd backend
python -m venv .venv
# Windows:  .venv\Scripts\activate
# macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
```
Open `backend/.env` and replace the placeholder:
```
GEMINI_API_KEY=your_real_key_here
```
Start the server:
```bash
python -m uvicorn app.main:app --reload --port 8000
```
Check http://localhost:8000/api/health. It should show `"api_key_configured": true`. Interactive API docs are at http://localhost:8000/docs.

### 3. Frontend (Terminal 2)
Requires Node 18+.
```bash
cd frontend
npm install
npm run dev
```
Open http://localhost:5173. The Vite dev server proxies `/api` to `http://127.0.0.1:8000`, so no extra config is needed.

## Run with Docker
```bash
# put your key in backend/.env first
docker compose up --build
```
Open http://localhost:8080 (Nginx serves the UI and forwards `/api` to the backend). The API is also on http://localhost:8000.

## API
`POST /api/analyze` (multipart form): `file` (image, max 10 MB), `hint` (optional text). Returns:
```json
{
  "label": "Dish Name",
  "confidence": 95,
  "description": "...",
  "portion_estimation": {"estimated_weight_grams": 300, "portion_size": "...", "visual_reasoning": "..."},
  "nutrition": {"calories": 350, "carbs": 40, "protein": 12, "fat": 15, "fiber": 5},
  "items": [{"name": "Rice", "grams": 150, "calories": 180}],
  "cuisine": "...", "tags": [], "alternatives": [], "health_score": 7, "health_notes": "..."
}
```
`GET /api/health` returns status, model name and whether the API key is set.

## Troubleshooting
| Problem | Fix |
|---|---|
| Banner says backend isn't reachable | Start the backend on port 8000 (step 2) |
| Banner says GEMINI_API_KEY missing | Edit `backend/.env`, then restart uvicorn |
| "No usable Gemini model found" | Key has no Flash model access; check the key at aistudio.google.com or set `GEMINI_MODEL` in `backend/.env` |
| "Gemini rejected the API key" | Key is wrong or expired; create a new one |
| "Rate limit reached" | Free tier limit; wait a minute |
| pip fails building wheels on Windows | Requirements are unpinned on purpose; upgrade pip: `python -m pip install -U pip` |
| Frontend on another host | Set `VITE_API_URL=https://your-api` in `frontend/.env` before building |

## Notes
Estimates are made from a photo and can be off by 20% or more. They are not medical advice. Set `GEMINI_MODEL` in `backend/.env` to try another Gemini model.
