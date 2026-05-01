# LocalVibe 🗺️

**LocalVibe** is a hyperlocal event discovery platform — find farmers markets, open mic nights, concerts, and community events happening right near you.

---

## 🚀 Features

### Phase 1: Geospatial Backend
- MongoDB Atlas with **2dsphere indexes** for fast geospatial queries
- `$near` / `$geoWithin` queries — *"Find all events within 100km of me"*
- Event schema: `title`, `description`, `startDate`, `endDate`, `location (Address + Lat/Lng)`, `category`, `price`, `imageUrl`, `isFeatured`

### Phase 2: Mapping & Visualization
- **Leaflet.js** interactive map with OpenStreetMap tiles (dark mode)
- Event pins on the map — click a pin to open a styled popup with image + details
- **Featured events** show a larger golden marker
- User location auto-detected via `navigator.geolocation`

### Phase 3: Event Management & RSVP
- **Add Event form** with **address autocomplete** powered by Nominatim (OpenStreetMap)
- Converts selected address to accurate Lat/Lng coordinates
- Dual RSVP: **Going** (confirmed) + **Interested** (soft interest)
- Attendee list stored; shows *"X friends are going"* based on followed users

### Phase 4: Personalization & Monetization
- **Recommendation Engine**: *"For You"* tab — shows events matching your RSVP'd categories
- **Featured Listings**: `isFeatured: true` flag renders a larger, gold-highlighted map pin
- **Category & Date filters**: Filter by Music/Food/Art/Tech/Community + date range picker

### Live Event Data
- **SERP API (Google Events)** integration — real events near you fetched on every app start
- Events geocoded to actual lat/lng using Nominatim reverse geocoding
- Duplicate detection — same event is never stored twice

---

## 🛠️ Setup Instructions

### Prerequisites
- Node.js v16+
- MongoDB Atlas account (or local MongoDB)
- SerpApi key (free tier available at [serpapi.com](https://serpapi.com))

### 1. Clone & Install
```bash
git clone <your-repo-url>
cd localvibe-project
npm install           # installs concurrently at root
npm install --prefix backend
npm install --prefix frontend
```

### 2. Configure Environment
Create `backend/.env`:
```env
PORT=5000
MONGO_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/localvibe
SERP_API_KEY=your_serpapi_key_here
CORS_ORIGIN=http://localhost:5173
```

### 3. Seed Users + Live Events
```bash
cd backend
node seed.js
```
> Creates baseline users and fetches live events via SERP API for multiple locations.

### 4. Run
```bash
# From root:
npm run dev
# Backend runs on http://localhost:5000
# Frontend runs on http://localhost:5173
```

---

## 📡 API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/events` | Get all events (supports `?category=&search=&lat=&lng=&dateFrom=&dateTo=`) |
| `GET` | `/api/events/nearby` | Events within radius of coordinates |
| `GET` | `/api/events/recommendations` | Personalised recommendations |
| `GET` | `/api/events/my-events` | User's RSVP'd events |
| `POST`| `/api/events` | Create a new event |
| `POST`| `/api/events/sync` | Trigger SERP API sync for a location |
| `PUT` | `/api/events/:id/rsvp` | Mark as "Going" |
| `PUT` | `/api/events/:id/interested` | Mark as "Interested" |

---

## 🔑 API Key Management

### Nominatim (OpenStreetMap)
- **Free**, no key required
- Fair-use limit: 1 request/second
- In production: self-host or use a commercial geocoder (Mapbox, Google)

### SERP API (Google Events)
- Key stored in `backend/.env` — **never commit `.env` to Git**
- `.gitignore` already excludes `.env`
- In production (Render/Railway): set `SERP_API_KEY` as an environment variable in the dashboard
- Restrict key usage in SerpApi dashboard → *API Key Settings → Allowed domains/IPs*

### Leaflet / OpenStreetMap Tiles
- No key needed for development
- For production scale: use **Mapbox** tiles with a restricted token (domain whitelist in Mapbox dashboard → *Tokens → URL restrictions*)

---

## 📱 Mobile Support
The map and sidebar stack vertically on screens < 768px. Touch gestures are handled natively by Leaflet.

## 🚀 Deployment

### Render (recommended)
This repo includes a `render.yaml` blueprint for deploying both services.

1. Push latest code to GitHub.
2. In Render, create a new **Blueprint** and select this repository.
3. Render will provision:
   - `localvibe-backend` (Node web service)
   - `localvibe-frontend` (Static site)
4. Set backend environment variables:
   - `MONGO_URI`
   - `SERP_API_KEY`
   - `CORS_ORIGIN` = frontend URL (for example: `https://localvibe-frontend.onrender.com`)
5. Set frontend environment variable:
   - `VITE_API_BASE_URL` = `https://localvibe-backend.onrender.com/api/events`
6. Redeploy both services after setting vars.

### Alternate deployment
- **Frontend**: Deploy `frontend/` to Vercel
- **Backend**: Deploy `backend/` to Render
