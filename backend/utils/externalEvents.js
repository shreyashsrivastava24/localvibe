const axios = require('axios');
const Event = require('../models/Event');

// geocode a street address to lat/lng using the free Nominatim API
async function geocodeAddress(addressStr) {
  try {
    const res = await axios.get('https://nominatim.openstreetmap.org/search', {
      params: { format: 'json', q: addressStr, limit: 1 },
      headers: { 'User-Agent': 'LocalVibe/1.0' },
      timeout: 5000,
    });
    if (res.data && res.data.length > 0) {
      return { lat: parseFloat(res.data[0].lat), lng: parseFloat(res.data[0].lon) };
    }
  } catch (_) { /* nominatim can be flaky, just return null */ }
  return null;
}

// reverse-geocode to get a human-readable city name
async function getCityName(lat, lng) {
  try {
    const res = await axios.get('https://nominatim.openstreetmap.org/reverse', {
      params: { format: 'json', lat, lon: lng },
      headers: { 'User-Agent': 'LocalVibe/1.0' },
      timeout: 5000,
    });
    const addr = res.data?.address || {};
    return addr.city || addr.town || addr.suburb || addr.county || 'India';
  } catch (_) { /* */ }
  return 'India';
}

// try to figure out a category from the event title / description
function mapCategory(title = '', description = '') {
  const text = (title + ' ' + description).toLowerCase();
  if (/music|concert|festival|jazz|band|live perform|gig|singer|dj/.test(text)) return 'Music';
  if (/food|market|farmers|cuisine|chef|cook|taste|restaurant|dinner|brunch/.test(text)) return 'Food';
  if (/art|gallery|exhibition|paint|draw|craft|photography|film|cinema|theatre|dance|drama/.test(text)) return 'Art';
  if (/tech|startup|hack|developer|ai|digital|coding|web|software/.test(text)) return 'Tech';
  if (/community|open mic|neighbour|volunteer|local|social|charity|fundrais/.test(text)) return 'Community';
  return 'Other';
}

// decent looking fallback images from unsplash for each category
const CATEGORY_IMAGES = {
  Music: 'https://images.unsplash.com/photo-1514525253361-bee8718a300c?auto=format&fit=crop&q=80&w=800',
  Food: 'https://images.unsplash.com/photo-1488459716781-31db52582fe9?auto=format&fit=crop&q=80&w=800',
  Art: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?auto=format&fit=crop&q=80&w=800',
  Tech: 'https://images.unsplash.com/photo-1540317580384-e5d43616b9aa?auto=format&fit=crop&q=80&w=800',
  Community: 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&q=80&w=800',
  Other: 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?auto=format&fit=crop&q=80&w=800',
};

function getFallbackImage(category) {
  return CATEGORY_IMAGES[category] || CATEGORY_IMAGES.Other;
}

// SERP dates come in weird formats like "May 5, 2026 at 7:00 PM" or "Thursday, May 1"
function parseSerpDate(dateStr) {
  if (!dateStr) return null;
  try {
    const cleaned = dateStr
      .replace(' at ', ' ')
      .replace(/^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),?\s*/i, '');
    const d = new Date(cleaned + (cleaned.includes('2026') ? '' : ', 2026'));
    return isNaN(d.getTime()) ? null : d;
  } catch (_) { return null; }
}

/**
 * Pull real events from Google via the SERP API for a given lat/lng.
 * We geocode the location to get the city name, search for events there,
 * then store them in our DB (skipping duplicates).
 */
async function syncExternalEvents(lat, lng) {
  try {
    const apiKey = process.env.SERP_API_KEY;
    if (!apiKey) {
      console.warn('[sync] No SERP_API_KEY set — skipping external event fetch.');
      return 0;
    }

    const city = await getCityName(lat, lng);
    console.log(`[sync] Fetching events for "${city}" from Google...`);

    const response = await axios.get('https://serpapi.com/search.json', {
      params: { engine: 'google_events', q: `events in ${city}`, hl: 'en', gl: 'in', api_key: apiKey },
      timeout: 15000,
    });

    const results = response.data.events_results || [];
    console.log(`[sync] Got ${results.length} results from SERP.`);

    let saved = 0;
    for (const e of results) {
      // skip if we already have this event
      if (await Event.findOne({ title: e.title })) continue;

      const category = mapCategory(e.title, e.description);

      // build address string from whatever SERP gives us
      const addressParts = Array.isArray(e.address) ? e.address : (e.address ? [e.address] : []);
      const addressStr = addressParts.join(', ') || city;

      // try to geocode the real address; if that fails, scatter near the user
      let coords = await geocodeAddress(addressStr);
      if (!coords) {
        coords = {
          lat: lat + (Math.random() - 0.5) * 0.02,
          lng: lng + (Math.random() - 0.5) * 0.02,
        };
      }

      const startDate = parseSerpDate(e.date?.start_date || e.date?.when) || new Date(Date.now() + 86400000);
      const endDate = parseSerpDate(e.date?.end_date) || new Date(startDate.getTime() + 3 * 3600000);

      await new Event({
        title: e.title,
        description: e.description || `${e.title} — happening in ${city}.`,
        startDate,
        endDate,
        location: {
          type: 'Point',
          coordinates: [coords.lng, coords.lat],
          address: addressStr,
        },
        category,
        price: 0,
        imageUrl: (e.thumbnail && e.thumbnail.startsWith('http')) ? e.thumbnail : getFallbackImage(category),
        isFeatured: Boolean(e.thumbnail),
        attendees: 0,
      }).save();
      saved++;
    }

    console.log(`[sync] Saved ${saved} new events.`);
    return saved;
  } catch (err) {
    console.error('[sync] Error:', err.response?.data?.error || err.message);
    return 0;
  }
}

module.exports = { syncExternalEvents };
