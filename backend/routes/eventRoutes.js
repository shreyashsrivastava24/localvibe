const express = require('express');
const router = express.Router();
const Event = require('../models/Event');
const User = require('../models/User');
const { syncExternalEvents } = require('../utils/externalEvents');

// keep track of which lat/lng areas we've already synced so we don't
// hammer the SERP API on every single request
const syncedLocations = new Set();

// simple auth — in dev we just grab the first user (me) from the db.
// TODO: swap this out for proper JWT when we add login/signup
const localAuth = async (req, res, next) => {
  try {
    let user = await User.findOne({ email: 'shreyashsrivastava744@gmail.com' });
    if (!user) {
      user = new User({
        name: 'Shreyash Srivastava',
        email: 'shreyashsrivastava744@gmail.com',
        role: 'student',
        interestedCategories: ['Music', 'Tech']
      });
      await user.save();
    }
    req.user = user;
    next();
  } catch (err) {
    res.status(500).json({ message: 'Auth error' });
  }
};

// trigger SERP sync for a given lat/lng — called by the frontend on load
router.post('/sync', async (req, res) => {
  try {
    const { lat, lng } = req.body;
    if (!lat || !lng) return res.status(400).json({ message: 'lat and lng required' });

    // round to 1 decimal so nearby coordinates share the same key
    const key = `${Math.round(lat * 10) / 10},${Math.round(lng * 10) / 10}`;
    if (syncedLocations.has(key)) {
      return res.json({ message: 'Already synced for this area', synced: false });
    }

    syncedLocations.add(key);
    await syncExternalEvents(lat, lng);
    res.json({ message: 'Sync complete', synced: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Sync failed' });
  }
});

// get events — supports category, search, geo, date, and quick-filter params
router.get('/', localAuth, async (req, res) => {
  try {
    const {
      category,
      search,
      lat,
      lng,
      radius = 100000,
      dateFrom,
      dateTo,
      freeOnly,
      featuredOnly,
      weekendOnly,
    } = req.query;
    let query = {};

    if (category && category !== 'All') query.category = category;
    if (search) query.title = { $regex: search, $options: 'i' };

    // date range
    if (dateFrom || dateTo) {
      query.startDate = {};
      if (dateFrom) query.startDate.$gte = new Date(dateFrom);
      if (dateTo) query.startDate.$lte = new Date(dateTo + 'T23:59:59');
    }

    if (freeOnly === 'true') {
      query.price = 0;
    }
    if (featuredOnly === 'true') {
      query.isFeatured = true;
    }
    if (weekendOnly === 'true') {
      // figure out the coming Sat-Sun window
      const now = new Date();
      const day = now.getDay();
      const daysUntilSaturday = (6 - day + 7) % 7;
      const saturdayStart = new Date(now);
      saturdayStart.setDate(now.getDate() + daysUntilSaturday);
      saturdayStart.setHours(0, 0, 0, 0);

      const sundayEnd = new Date(saturdayStart);
      sundayEnd.setDate(saturdayStart.getDate() + 1);
      sundayEnd.setHours(23, 59, 59, 999);

      query.startDate = query.startDate || {};
      query.startDate.$gte = query.startDate.$gte && query.startDate.$gte > saturdayStart
        ? query.startDate.$gte
        : saturdayStart;
      query.startDate.$lte = query.startDate.$lte && query.startDate.$lte < sundayEnd
        ? query.startDate.$lte
        : sundayEnd;
    }

    // geo filter
    if (lat && lng) {
      query.location = {
        $near: {
          $geometry: { type: 'Point', coordinates: [parseFloat(lng), parseFloat(lat)] },
          $maxDistance: parseInt(radius),
        },
      };
    }

    const events = await Event.find(query).sort({ isFeatured: -1, startDate: 1 });

    // attach social info — how many of my friends are attending each event
    const enrichedEvents = events.map(event => {
      const friendAttendees = event.attendeeList.filter(id =>
        req.user.followedUsers.some(friendId => friendId.equals(id))
      );
      return {
        ...event.toObject(),
        friendsAttending: friendAttendees.length,
        isRsvpd: req.user.rsvpEvents.map(id => id.toString()).includes(event._id.toString()),
        isInterested: (req.user.interestedEvents || []).map(id => id.toString()).includes(event._id.toString()),
      };
    });

    res.json(enrichedEvents);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// simple nearby endpoint (no auth needed)
router.get('/nearby', async (req, res) => {
  try {
    const { lat, lng, radius = 100000 } = req.query;
    if (!lat || !lng) return res.status(400).json({ message: 'Location required' });

    const events = await Event.find({
      location: {
        $near: {
          $geometry: { type: 'Point', coordinates: [parseFloat(lng), parseFloat(lat)] },
          $maxDistance: parseInt(radius),
        },
      },
    });
    res.json(events);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// recommendations based on what categories the user has RSVP'd to before
router.get('/recommendations', localAuth, async (req, res) => {
  try {
    const events = await Event.find({
      category: { $in: req.user.interestedCategories },
      _id: { $nin: req.user.rsvpEvents },
    }).limit(8);
    res.json(events);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// events the current user RSVP'd to
router.get('/my-events', localAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate('rsvpEvents');
    res.json(user.rsvpEvents);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// create a new event
router.post('/', async (req, res) => {
  try {
    const { title, description, startDate, endDate, address, lat, lng, category, price, imageUrl, isFeatured } = req.body;
    const parsedLat = Number(lat);
    const parsedLng = Number(lng);

    if (!title || !description || !startDate || !endDate || !address) {
      return res.status(400).json({ message: 'Missing required fields' });
    }
    if (Number.isNaN(parsedLat) || Number.isNaN(parsedLng)) {
      return res.status(400).json({ message: 'Valid lat/lng are required' });
    }
    if (new Date(endDate) < new Date(startDate)) {
      return res.status(400).json({ message: 'End date must be on or after start date' });
    }

    const newEvent = new Event({
      title, description, startDate, endDate, category, price, imageUrl, isFeatured,
      location: { type: 'Point', coordinates: [parsedLng, parsedLat], address },
    });
    const savedEvent = await newEvent.save();
    res.status(201).json(savedEvent);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// mark "Going"
router.put('/:id/rsvp', localAuth, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: 'Event not found' });

    if (req.user.rsvpEvents.map(id => id.toString()).includes(event._id.toString())) {
      return res.status(400).json({ message: "Already RSVP'd" });
    }

    event.attendees += 1;
    event.attendeeList.push(req.user._id);
    await event.save();

    req.user.rsvpEvents.push(event._id);
    // also update their category preferences so recommendations improve over time
    if (!req.user.interestedCategories.includes(event.category)) {
      req.user.interestedCategories.push(event.category);
    }
    await req.user.save();

    res.json(event);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// mark "Interested" (soft bookmark, doesn't count as attending)
router.put('/:id/interested', localAuth, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: 'Event not found' });

    const alreadyInterested = (req.user.interestedEvents || []).map(id => id.toString()).includes(event._id.toString());
    if (alreadyInterested) {
      return res.status(400).json({ message: 'Already marked as interested' });
    }

    req.user.interestedEvents = req.user.interestedEvents || [];
    req.user.interestedEvents.push(event._id);
    if (!req.user.interestedCategories.includes(event.category)) {
      req.user.interestedCategories.push(event.category);
    }
    await req.user.save();
    res.json({ message: 'Marked as interested', event });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
