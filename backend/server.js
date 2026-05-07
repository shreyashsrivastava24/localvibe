const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const eventRoutes = require('./routes/eventRoutes');
const { syncExternalEvents } = require('./utils/externalEvents');

const app = express();

// allow the frontend origin(s) — comma-separated in .env
const allowedOrigins = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

app.use(cors({
  origin(origin, cb) {
    // allow requests with no origin (curl, mobile, etc.)
    if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
      return cb(null, true);
    }
    return cb(new Error('Not allowed by CORS'));
  },
}));

app.use(express.json());

// routes
app.use('/api/events', eventRoutes);

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;

mongoose.connect(MONGO_URI)
  .then(async () => {
    console.log('Connected to MongoDB');
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

    // pull live events from Google for the default area on startup
    // coordinates roughly point to Greater Noida / NCR
    const DEFAULT_LAT = 28.4359;
    const DEFAULT_LNG = 77.3294;
    await syncExternalEvents(DEFAULT_LAT, DEFAULT_LNG);
  })
  .catch(err => console.error('Failed to connect to MongoDB:', err));
