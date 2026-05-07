# LocalVibe

A hyperlocal event discovery app — think "what's happening near me this weekend?" but without the clutter of Facebook Events or the corporate feel of Eventbrite. Built for farmers markets, open mic nights, garage sales, and everything in between.

## What it does

- Shows events on an interactive map (Leaflet + OpenStreetMap)
- Auto-detects your location and loads nearby events
- Pulls real event data from Google via the SERP API so the map isn't empty on first load
- Lets organizers submit events with address autocomplete (Nominatim geocoding)
- RSVP system — mark events as "Going" or "Interested"
- Shows social context ("3 friends are going") based on followed users
- Recommendation engine — "For You" tab surfaces events matching your past RSVPs
- Featured/premium listings — organizers can highlight their event with a golden pin
- Filters by category, date range, radius, price, weekend-only, etc.

## Tech stack

- **Frontend**: React (Vite), Leaflet.js, Lucide icons
- **Backend**: Node.js, Express
- **Database**: MongoDB Atlas with 2dsphere geospatial indexes
- **APIs**: Nominatim (geocoding), SERP API (Google Events)

## Getting started

### Prerequisites

- Node.js 16+
- A MongoDB Atlas cluster (or local MongoDB instance)
- SERP API key — free tier at [serpapi.com](https://serpapi.com)

### Install

```bash
git clone <your-repo-url>
cd localvibe-project
npm install
npm install --prefix backend
npm install --prefix frontend
```

### Environment variables

Create `backend/.env`:

```
PORT=5000
MONGO_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/localvibe
SERP_API_KEY=your_key_here
CORS_ORIGIN=http://localhost:5173
```

### Seed the database

```bash
cd backend
node seed.js
```

This creates a few test users and pulls live events from Google for Ghaziabad/NCR, New York, and London so the map has data to show.

### Run locally

```bash
npm run dev
```

Backend: http://localhost:5000  
Frontend: http://localhost:5173

## API endpoints

| Method | Route | What it does |
|--------|-------|-------------|
| GET | /api/events | List events with filters (category, search, geo, dates) |
| GET | /api/events/nearby | Events within a radius |
| GET | /api/events/recommendations | Personalized recs based on past RSVPs |
| GET | /api/events/my-events | Events the user is "Going" to |
| POST | /api/events | Create a new event |
| POST | /api/events/sync | Trigger SERP sync for a location |
| PUT | /api/events/:id/rsvp | Mark "Going" |
| PUT | /api/events/:id/interested | Mark "Interested" |

## API key security

**Nominatim** — free, no key needed. Fair-use rate limit of 1 req/sec. In production you'd want to self-host or switch to a commercial geocoder.

**SERP API** — key lives in `backend/.env` which is gitignored. On Render/Railway, set it as an env var in the dashboard. You can restrict the key in your SerpApi settings.

**Map tiles** — OpenStreetMap tiles are free for dev. For production traffic, switch to Mapbox with a domain-restricted token.

## Mobile

The sidebar and map stack vertically on screens under 768px. Leaflet handles touch/pinch natively.

## Deployment

The repo includes a `render.yaml` for deploying both services on Render:

1. Push to GitHub
2. Create a Blueprint in Render pointing to this repo
3. Set the backend env vars (`MONGO_URI`, `SERP_API_KEY`, `CORS_ORIGIN`)
4. Set the frontend env var `VITE_API_BASE_URL` to your backend URL (e.g. `https://localvibe-backend.onrender.com/api/events`)
5. Redeploy both services

You can also deploy the frontend on Vercel and the backend on Render separately.
