const axios = require('axios');
const Event = require('../models/Event');

// Geocode a real address string to lat/lng using Nominatim
const geocodeAddress = async (addressStr) => {
  try {
    const res = await axios.get('https://nominatim.openstreetmap.org/search', {
      params: { format: 'json', q: addressStr, limit: 1 },
      headers: { 'User-Agent': 'LocalVibe/1.0' },
      timeout: 5000,
    });
    if (res.data && res.data.length > 0) {
      return { lat: parseFloat(res.data[0].lat), lng: parseFloat(res.data[0].lon) };
    }
  } catch {}
  return null;
};

// Reverse geocode lat/lng to city name
const getCityName = async (lat, lng) => {
  try {
    const res = await axios.get('https://nominatim.openstreetmap.org/reverse', {
      params: { format: 'json', lat, lon: lng },
      headers: { 'User-Agent': 'LocalVibe/1.0' },
      timeout: 5000,
    });
    const addr = res.data?.address || {};
    return addr.city || addr.town || addr.suburb || addr.county || 'India';
  } catch {}
  return 'India';
};

// Map event title/description to our category enum
const mapCategory = (title = '', description = '') => {
  const t = (title + ' ' + description).toLowerCase();
  if (t.match(/music|concert|festival|jazz|band|live perform|gig|singer|dj/)) return 'Music';
  if (t.match(/food|market|farmers|cuisine|chef|cook|taste|restaurant|dinner|brunch/)) return 'Food';
  if (t.match(/art|gallery|exhibition|paint|draw|craft|photography|film|cinema|theatre|dance|drama/)) return 'Art';
  if (t.match(/tech|startup|hack|developer|ai|digital|coding|web|software/)) return 'Tech';
  if (t.match(/community|open mic|neighbour|volunteer|local|social|charity|fundrais/)) return 'Community';
  return 'Other';
};

// Pick a relevant Unsplash thumbnail by category
const getFallbackImage = (category) => {
  const imgs = {
    Music: 'https://images.unsplash.com/photo-1514525253361-bee8718a300c?auto=format&fit=crop&q=80&w=800',
    Food: 'https://images.unsplash.com/photo-1488459716781-31db52582fe9?auto=format&fit=crop&q=80&w=800',
    Art: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?auto=format&fit=crop&q=80&w=800',
    Tech: 'https://images.unsplash.com/photo-1540317580384-e5d43616b9aa?auto=format&fit=crop&q=80&w=800',
    Community: 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&q=80&w=800',
    Other: 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?auto=format&fit=crop&q=80&w=800',
  };
  return imgs[category] || imgs.Other;
};

// Parse SERP date like "May 5, 2026 at 7:00 PM" or "Thursday, May 1"
const parseSerpDate = (dateStr) => {
  if (!dateStr) return null;
  try {
    const cleaned = dateStr
      .replace(' at ', ' ')
      .replace(/^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),?\s*/i, '');
    const d = new Date(cleaned + (cleaned.includes('2026') ? '' : ', 2026'));
    return isNaN(d.getTime()) ? null : d;
  } catch { return null; }
};

const syncExternalEvents = async (lat, lng) => {
  try {
    const apiKey = process.env.SERP_API_KEY;
    if (!apiKey) { console.warn('[LocalVibe] No SERP_API_KEY set.'); return; }

    const city = await getCityName(lat, lng);
    console.log(`[LocalVibe] Fetching real events for "${city}" from Google via SERP API...`);

    const response = await axios.get('https://serpapi.com/search.json', {
      params: { engine: 'google_events', q: `events in ${city}`, hl: 'en', gl: 'in', api_key: apiKey },
      timeout: 15000,
    });

    const results = response.data.events_results || [];
    console.log(`[LocalVibe] Google Events returned ${results.length} real events.`);

    let saved = 0;
    for (const e of results) {
      // Skip duplicates
      if (await Event.findOne({ title: e.title })) continue;

      const category = mapCategory(e.title, e.description);

      // Build the address string from SERP data
      const addressParts = Array.isArray(e.address) ? e.address : (e.address ? [e.address] : []);
      const addressStr = addressParts.join(', ') || city;

      // Geocode the real address to get accurate lat/lng
      let coords = await geocodeAddress(addressStr);
      if (!coords) {
        // Fallback: place it near user with tiny offset so each pin is distinct
        coords = { lat: lat + (Math.random() - 0.5) * 0.02, lng: lng + (Math.random() - 0.5) * 0.02 };
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

    console.log(`[LocalVibe] Saved ${saved} real events from SERP API.`);
    return saved;
  } catch (err) {
    console.error('[LocalVibe] SERP sync error:', err.response?.data?.error || err.message);
    return 0;
  }
};

module.exports = { syncExternalEvents };
