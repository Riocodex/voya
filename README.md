# Voya — AI Map Assistant

Chat with an AI about places near you. Voya searches Google Places, sorts results by **true distance** from your GPS location, and shows them on a Mapbox map.

## Local development

```bash
npm install
npm install --prefix client
npm install --prefix server

# Copy .env.example to .env and add your API keys
cp .env.example .env

npm run dev
```

Open http://localhost:5173

## Deploy to the internet

Voya has **two parts** — you need both:

| Part | Host | What it does |
|------|------|--------------|
| **Frontend** (`client/`) | Vercel | React app + map |
| **Backend** (`server/`) | Render | API, Google Places, OpenAI |

Vercel alone won't work — it can't run the Express API server.

---

### Step 1 — Deploy the API on Render (free)

1. Push your code to GitHub (already at `Riocodex/voya`)
2. Go to [render.com](https://render.com) → **New → Blueprint** (or **Web Service**)
3. Connect your `voya` repo
4. If using Blueprint, Render reads `render.yaml` automatically
5. If manual setup:
   - **Root Directory:** `server`
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`
6. Add **Environment Variables** (same values as your `.env`):
   - `GOOGLE_PLACES_API_KEY`
   - `OPENAI_API_KEY`
   - `MAPBOX_TOKEN`
   - `NODE_ENV` = `production`
   - `CLIENT_URL` = leave blank for now, fill after Vercel deploy
7. Deploy and copy your API URL, e.g. `https://voya-api.onrender.com`

**Google API note:** Your key is restricted to your home IP. Render uses a different IP. In Google Cloud → Credentials → your key → change **Application restrictions** to **Don't restrict key** (keep **API restrictions** on Places API New only). Otherwise production searches will fail.

---

### Step 2 — Deploy the frontend on Vercel

1. Go to [vercel.com](https://vercel.com) → **Add New Project**
2. Import your `voya` GitHub repo
3. **Important settings:**
   - **Root Directory:** leave as repo root (uses root `vercel.json`)
   - **Framework Preset:** Vite (auto-detected)
   - **Build Command:** `npm run build --prefix client` (from root `vercel.json`)
   - **Output Directory:** `client/dist`
4. Add **Environment Variable:**
   - `VITE_API_URL` = your Render API URL, e.g. `https://voya-api.onrender.com`
   - No trailing slash
5. Deploy

Copy your Vercel URL, e.g. `https://voya.vercel.app`

---

### Step 3 — Link frontend and backend

1. In **Render** → your service → **Environment** → set:
   - `CLIENT_URL` = your Vercel URL (e.g. `https://voya.vercel.app`)
2. Redeploy Render (or it may auto-redeploy)

---

### Step 4 — Mapbox URL restriction (optional)

In Mapbox → Access tokens → your token → **URL restrictions** → add your Vercel domain.

---

## Verify deployment

1. Open `https://your-api.onrender.com/api/health` → should show `{"status":"ok","name":"voya"}`
2. Open your Vercel site → allow location → ask "closest restaurant?"

## Common Vercel errors

| Error | Fix |
|-------|-----|
| `No Output Directory named "dist" found` | Set Output Directory to `client/dist`, not `dist` |
| Build fails on root | Use root `vercel.json` or set Root Directory to `client` |
| Map loads but chat fails | Set `VITE_API_URL` to your Render API URL and redeploy Vercel |
| Places search fails in production | Update Google API key IP restriction (see Step 1) |

## API endpoints

- `GET /api/health`
- `GET /api/config`
- `GET /api/places/test?lat=&lng=&q=`
- `POST /api/chat`
