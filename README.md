# Voya — AI Map Assistant

Chat with an AI about places near you. Voya searches Google Places, sorts results by **true distance** from your GPS location, and shows them on a Mapbox map.

## Setup

1. Copy `.env.example` to `.env` and fill in your API keys:
   - `GOOGLE_PLACES_API_KEY` — Places API (New)
   - `OPENAI_API_KEY` — OpenAI API key
   - `MAPBOX_TOKEN` — Mapbox public token

2. Install dependencies:

```bash
npm install
npm install --prefix client
npm install --prefix server
```

3. Run dev servers (client on :5173, API on :3001):

```bash
npm run dev
```

4. Open http://localhost:5173 and allow location access.

## API endpoints

- `GET /api/health` — health check
- `GET /api/config` — returns Mapbox token for client
- `GET /api/places/test?lat=&lng=&q=` — debug place search
- `POST /api/chat` — AI chat with place search

## Deploy

**Client (Vercel):** deploy `client/` with build command `npm run build`, output `dist`.

**Server (Railway/Render):** deploy `server/` with start command `npm run start`. Set all env vars from `.env`.

Set the client proxy or `VITE_API_URL` to point at your deployed server in production.
